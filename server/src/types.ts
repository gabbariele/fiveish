/**
 * Modello dati di fiveish.
 *
 * Il vincolo non negoziabile del prodotto: un hotel entra nel sistema solo se
 * ha 5 stelle ufficiali, e un'offerta viene mostrata solo se il motore la
 * giudica davvero eccezionale. Tutto il resto viene scartato a monte.
 */

export type Currency = 'EUR';

export type DestinationKind = 'citta' | 'mare' | 'montagna' | 'lago' | 'borgo';

export interface Destination {
  id: string;
  name: string;
  region: string;
  /** Codice citta IATA usato dai provider (es. Amadeus). */
  cityCode: string;
  kind: DestinationKind;
  lat: number;
  lon: number;
}

export type BoardType =
  | 'solo-pernottamento'
  | 'colazione'
  | 'mezza-pensione'
  | 'pensione-completa'
  | 'all-inclusive';

export interface Hotel {
  id: string;
  name: string;
  destinationId: string;
  /** Sempre 5. Il tipo lo rende esplicito: qui dentro non entra altro. */
  stars: 5;
  /** Voto medio ospiti su scala 0-10. */
  guestRating: number;
  reviewCount: number;
  amenities: string[];
  /** Prezzo mediano storico a notte per mese (chiave "01".."12"), in EUR. */
  priceProfile?: Record<string, number>;
  website?: string;
}

/** Quello che un provider ci restituisce, prima di qualsiasi giudizio. */
export interface Offer {
  id: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  roomName: string;
  board: BoardType;
  refundable: boolean;
  totalPrice: number;
  nightlyPrice: number;
  currency: Currency;
  roomsLeft?: number;
  /** Prezzo "barrato" dichiarato dal venditore. Registrato ma mai creduto. */
  advertisedBasePrice?: number;
  source: string;
  deepLink?: string;
  observedAt: string;
}

export type BaselineMethod = 'storico' | 'concorrenti' | 'profilo';
export type Confidence = 'alta' | 'media' | 'bassa';

/** Il prezzo "normale" per quell'hotel in quel periodo, calcolato da noi. */
export interface Baseline {
  nightly: number;
  method: BaselineMethod;
  confidence: Confidence;
  samples: number;
}

export interface ScoreBreakdown {
  /** Quanto e' sotto il suo prezzo normale. */
  sconto: number;
  /** Quanto e' economico in assoluto rispetto ai 5 stelle di quella zona. */
  prezzoAssoluto: number;
  /** Qualita' della struttura (voto ospiti, volume recensioni). */
  qualita: number;
  /** Condizioni: cancellazione gratuita, colazione, pensione. */
  condizioni: number;
  /** Rarita': poche camere, finestra breve, prezzo mai visto cosi' basso. */
  rarita: number;
}

export interface Deal {
  offer: Offer;
  hotel: Hotel;
  destination: Destination;
  score: number;
  breakdown: ScoreBreakdown;
  baseline: Baseline;
  /** Sconto reale sul nostro prezzo di riferimento (0-1). */
  discountPct: number;
  /** Risparmio in EUR sull'intero soggiorno. */
  savings: number;
  /** Motivi leggibili per cui questa e' un'occasione. */
  reasons: string[];
  firstSeenAt: string;
}

export interface DealFilters {
  destinationId?: string;
  region?: string;
  kind?: DestinationKind;
  maxNightly?: number;
  minScore?: number;
  minNights?: number;
  maxNights?: number;
  from?: string;
  to?: string;
  refundableOnly?: boolean;
  sort?: 'score' | 'prezzo' | 'sconto' | 'checkin';
  limit?: number;
}

export interface SearchWindow {
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface ProviderQuery {
  destination: Destination;
  window: SearchWindow;
}

export interface PriceProvider {
  readonly name: string;
  /** Diagnostica: e' configurato e utilizzabile? */
  isReady(): Promise<{ ready: boolean; reason?: string }>;
  /** Restituisce SOLO offerte di hotel 5 stelle. */
  search(query: ProviderQuery): Promise<{ hotels: Hotel[]; offers: Offer[] }>;
}

export interface Watch {
  id: string;
  label: string;
  filters: DealFilters;
  createdAt: string;
  lastNotifiedAt?: string;
  notifiedDealIds: string[];
}

export interface ScanSummary {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  provider: string;
  queries: number;
  offersSeen: number;
  hotelsSeen: number;
  dealsFound: number;
  newDeals: number;
  errors: string[];
}
