import { config } from '../config.js';
import type {
  Baseline,
  Deal,
  Destination,
  Hotel,
  Offer,
  ScoreBreakdown,
} from '../types.js';
import type { PriceIndex } from './baseline.js';
import { clamp } from './stats.js';

/**
 * Pesi delle quattro componenti stabili del giudizio. Somma = 100.
 * La rarita' non e' qui dentro di proposito: e' un segnale che c'e' o non c'e',
 * e mediarlo penalizzerebbe ogni offerta che semplicemente non e' in scadenza.
 * Entra dopo, come bonus.
 */
export const WEIGHTS = {
  sconto: 45,
  prezzoAssoluto: 22,
  qualita: 16,
  condizioni: 17,
} as const;

/** Quanto puo' aggiungere al massimo la rarita', sopra il punteggio di base. */
export const RARITY_BONUS = 8;

const BOARD_POINTS: Record<Offer['board'], number> = {
  'solo-pernottamento': 0,
  colazione: 25,
  'mezza-pensione': 40,
  'pensione-completa': 50,
  'all-inclusive': 50,
};

const BOARD_LABEL: Record<Offer['board'], string> = {
  'solo-pernottamento': 'solo pernottamento',
  colazione: 'colazione inclusa',
  'mezza-pensione': 'mezza pensione',
  'pensione-completa': 'pensione completa',
  'all-inclusive': 'all inclusive',
};

/**
 * Sconto -> punti. Curva a rendimenti decrescenti: i primi 5 punti percentuali
 * non contano (sono rumore di listino), poi si sale in fretta e si satura.
 * 30% ~ 56 punti, 50% ~ 78, 65% ~ 88.
 */
export function discountScore(discountPct: number): number {
  const effective = Math.max(0, discountPct - 0.05);
  return clamp(100 * (1 - Math.exp(-effective / 0.3)), 0, 100);
}

/** Quanto e' economico rispetto agli altri 5 stelle della stessa zona e mese. */
export function absoluteScore(peerRank: number): number {
  // peerRank 0 = il piu' economico della piazza -> 100 punti.
  return clamp((1 - peerRank) * 100, 0, 100);
}

/**
 * Qualita' percepita. Il filtro 5 stelle e' gia' passato, quindi il pavimento
 * non e' zero: anche il piu' anonimo dei cinque stelle parte da 30. Da 8.0 a
 * 9.6 di voto ospiti si copre tutto il resto della scala. Poche recensioni
 * tirano il risultato verso il centro: semplicemente non sappiamo abbastanza.
 */
export function qualityScore(guestRating: number, reviewCount: number): number {
  const raw = 30 + clamp((guestRating - 8.0) / (9.6 - 8.0), 0, 1) * 70;
  const trust = clamp(Math.log10(reviewCount + 1) / 3.2, 0, 1);
  return raw * trust + 50 * (1 - trust);
}

export function conditionsScore(offer: Offer): number {
  let points = 10;
  if (offer.refundable) points += 45;
  points += BOARD_POINTS[offer.board];
  return clamp(points, 0, 100);
}

export function rarityScore(params: {
  roomsLeft?: number;
  nightly: number;
  historicalLow: number;
  daysToCheckIn: number;
}): number {
  let points = 0;
  if (params.roomsLeft !== undefined && params.roomsLeft <= 2) points += 40;
  else if (params.roomsLeft !== undefined && params.roomsLeft <= 4) points += 20;
  if (params.historicalLow > 0 && params.nightly < params.historicalLow) points += 40;
  if (params.daysToCheckIn <= 21) points += 20;
  return clamp(points, 0, 100);
}

export function combine(breakdown: ScoreBreakdown): number {
  const base =
    (breakdown.sconto * WEIGHTS.sconto +
      breakdown.prezzoAssoluto * WEIGHTS.prezzoAssoluto +
      breakdown.qualita * WEIGHTS.qualita +
      breakdown.condizioni * WEIGHTS.condizioni) /
    100;
  const bonus = (breakdown.rarita / 100) * RARITY_BONUS;
  return Math.round(clamp(base + bonus, 0, 100));
}

export interface EvaluateOptions {
  minScore?: number;
  minDiscount?: number;
  maxNightlyPrice?: number;
  now?: Date;
}

export interface Evaluation {
  deal: Deal | null;
  /** Perche' e' stata scartata. Utile in diagnostica e nei test. */
  rejectedFor?: string;
}

function daysBetween(from: Date, isoDate: string): number {
  const target = new Date(`${isoDate}T12:00:00Z`).getTime();
  return Math.round((target - from.getTime()) / 86_400_000);
}

function buildReasons(params: {
  discountPct: number;
  baseline: Baseline;
  offer: Offer;
  hotel: Hotel;
  destination: Destination;
  peerRank: number;
  historicalLow: number;
  daysToCheckIn: number;
}): string[] {
  const { offer, hotel, baseline, destination } = params;
  const reasons: string[] = [];
  const pct = Math.round(params.discountPct * 100);

  const source =
    baseline.method === 'storico'
      ? `il suo prezzo abituale a ${monthName(offer.checkIn)}`
      : baseline.method === 'profilo'
        ? `la mediana nota per questa struttura a ${monthName(offer.checkIn)}`
        : `gli altri 5 stelle a ${destination.name} nello stesso periodo`;
  reasons.push(`${pct}% sotto ${source} (${Math.round(baseline.nightly)} €/notte).`);

  if (params.peerRank <= 0.15) {
    reasons.push(`È fra i 5 stelle più economici di ${destination.name} in quelle date.`);
  }
  if (params.historicalLow > 0 && offer.nightlyPrice < params.historicalLow) {
    reasons.push(`Prezzo mai visto così basso da quando lo seguiamo (minimo precedente ${Math.round(params.historicalLow)} €).`);
  }
  if (offer.roomsLeft !== undefined && offer.roomsLeft <= 2) {
    reasons.push(`Restano ${offer.roomsLeft} camere a questa tariffa.`);
  }
  if (offer.refundable) reasons.push('Cancellazione gratuita.');
  if (offer.board !== 'solo-pernottamento') reasons.push(`Tariffa con ${BOARD_LABEL[offer.board]}.`);
  if (hotel.guestRating >= 9.3) {
    reasons.push(`Voto ospiti ${hotel.guestRating.toFixed(1)} su ${hotel.reviewCount.toLocaleString('it-IT')} recensioni.`);
  }
  if (params.daysToCheckIn <= 21) reasons.push('Partenza ravvicinata: tariffa last minute.');

  // Se il venditore sbandiera uno sconto piu' grande di quello vero, lo diciamo.
  if (offer.advertisedBasePrice && offer.advertisedBasePrice > baseline.nightly * 1.2) {
    const claimed = Math.round((1 - offer.nightlyPrice / offer.advertisedBasePrice) * 100);
    reasons.push(
      `Attenzione: lo sconto dichiarato dal venditore è del ${claimed}%, ma sul prezzo reale è del ${pct}%.`,
    );
  }
  if (baseline.confidence === 'bassa') {
    reasons.push('Prezzo di riferimento stimato: poche rilevazioni storiche su questa struttura.');
  }
  return reasons;
}

const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function monthName(isoDate: string): string {
  return MONTHS[Number(isoDate.slice(5, 7)) - 1] ?? '';
}

/**
 * Applica il giudizio a una singola offerta. Restituisce `null` per tutto
 * cio' che non e' un affare: e' il caso normale, non un errore.
 */
export function evaluate(
  offer: Offer,
  hotel: Hotel,
  destination: Destination,
  index: PriceIndex,
  options: EvaluateOptions = {},
): Evaluation {
  const minScore = options.minScore ?? config.deals.minScore;
  const minDiscount = options.minDiscount ?? config.deals.minDiscount;
  const maxNightly = options.maxNightlyPrice ?? config.deals.maxNightlyPrice;
  const now = options.now ?? new Date();

  // Vincolo di prodotto, non un filtro fra tanti: qui entrano solo i 5 stelle.
  if (hotel.stars !== 5) return { deal: null, rejectedFor: 'non e un 5 stelle' };
  if (!(offer.nightlyPrice > 0)) return { deal: null, rejectedFor: 'prezzo non valido' };
  if (offer.nightlyPrice > maxNightly) {
    return { deal: null, rejectedFor: `oltre il tetto di ${maxNightly} €/notte` };
  }

  const baseline = index.baselineFor(hotel, destination, offer);
  const discountPct = baseline.nightly > 0 ? 1 - offer.nightlyPrice / baseline.nightly : 0;

  // Con un riferimento debole alziamo l'asticella invece di indovinare.
  const uncertain = baseline.confidence === 'bassa';
  const discountGate = uncertain ? minDiscount + 0.12 : minDiscount;
  const scoreGate = uncertain ? minScore + 6 : minScore;

  if (discountPct < discountGate) {
    return {
      deal: null,
      rejectedFor: `sconto ${(discountPct * 100).toFixed(0)}% sotto la soglia ${(discountGate * 100).toFixed(0)}%`,
    };
  }

  const month = offer.checkIn.slice(5, 7);
  const peerRank = index.peerRank(destination.id, month, offer.nightlyPrice);
  const historicalLow = index.historicalLow(hotel.id, month);
  const daysToCheckIn = daysBetween(now, offer.checkIn);

  const breakdown: ScoreBreakdown = {
    sconto: discountScore(discountPct),
    prezzoAssoluto: absoluteScore(peerRank),
    qualita: qualityScore(hotel.guestRating, hotel.reviewCount),
    condizioni: conditionsScore(offer),
    rarita: rarityScore({
      ...(offer.roomsLeft !== undefined ? { roomsLeft: offer.roomsLeft } : {}),
      nightly: offer.nightlyPrice,
      historicalLow,
      daysToCheckIn,
    }),
  };

  const score = combine(breakdown);
  if (score < scoreGate) {
    return { deal: null, rejectedFor: `punteggio ${score} sotto la soglia ${scoreGate}` };
  }

  const savings = Math.round((baseline.nightly - offer.nightlyPrice) * offer.nights);

  return {
    deal: {
      offer,
      hotel,
      destination,
      score,
      breakdown,
      baseline,
      discountPct,
      savings,
      reasons: buildReasons({
        discountPct,
        baseline,
        offer,
        hotel,
        destination,
        peerRank,
        historicalLow,
        daysToCheckIn,
      }),
      firstSeenAt: offer.observedAt,
    },
  };
}
