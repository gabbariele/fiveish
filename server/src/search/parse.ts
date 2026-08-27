import { config } from '../config.js';
import { destinations, regions } from '../data/destinations.js';
import { GeminiUnavailable, gemini as defaultGemini, type Gemini } from '../ai/gemini.js';
import type { DealFilters } from '../types.js';
import { parseNatural } from './natural.js';

export interface ParsedQuery {
  filters: DealFilters;
  /** Da dove arriva l'interpretazione: utile in diagnostica e nella UI. */
  source: 'gemini' | 'regole';
  /** Frase breve che rilegge la richiesta a chi l'ha scritta. */
  interpretazione: string;
  /** Presente quando Gemini era configurato ma non ha risposto. */
  avviso?: string;
}

const KINDS = ['citta', 'mare', 'montagna', 'lago', 'borgo'] as const;
const SORTS = ['score', 'prezzo', 'sconto', 'checkin'] as const;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    destinationId: { type: 'STRING', nullable: true },
    region: { type: 'STRING', nullable: true },
    kind: { type: 'STRING', nullable: true },
    maxNightly: { type: 'NUMBER', nullable: true },
    minScore: { type: 'NUMBER', nullable: true },
    minNights: { type: 'NUMBER', nullable: true },
    maxNights: { type: 'NUMBER', nullable: true },
    from: { type: 'STRING', nullable: true },
    to: { type: 'STRING', nullable: true },
    refundableOnly: { type: 'BOOLEAN', nullable: true },
    sort: { type: 'STRING', nullable: true },
    interpretazione: { type: 'STRING' },
  },
  required: ['interpretazione'],
} as const;

interface GeminiFilters extends Partial<Record<keyof DealFilters, unknown>> {
  interpretazione?: unknown;
}

function systemPrompt(today: string): string {
  const mete = destinations.map((d) => `${d.id} (${d.name}, ${d.region})`).join('; ');
  return [
    'Traduci in filtri di ricerca una richiesta scritta in italiano da chi cerca un hotel 5 stelle in Italia.',
    'Rispondi solo con i campi che la richiesta indica davvero: lascia null tutto il resto, non inventare preferenze.',
    `Oggi è ${today}. Le date vanno espresse come YYYY-MM-DD e devono essere future.`,
    `destinationId può valere solo uno di questi: ${mete}.`,
    `region può valere solo una di queste: ${regions.join('; ')}.`,
    `kind può valere solo: ${KINDS.join(', ')}.`,
    'maxNightly è il tetto di spesa per notte in euro. minScore va da 72 a 100 e sale solo se la richiesta chiede esplicitamente offerte eccezionali.',
    `sort può valere solo: ${SORTS.join(', ')}.`,
    'interpretazione è una frase breve in italiano che rilegge la richiesta, al massimo 15 parole.',
  ].join('\n');
}

/** Ripulisce l'uscita del modello: passa solo cio' che esiste davvero nel catalogo. */
export function sanitize(candidate: GeminiFilters, now = new Date()): DealFilters {
  const clean: DealFilters = {};
  const today = now.toISOString().slice(0, 10);

  if (typeof candidate.destinationId === 'string' && destinations.some((d) => d.id === candidate.destinationId)) {
    clean.destinationId = candidate.destinationId;
  }
  if (typeof candidate.region === 'string' && regions.includes(candidate.region)) {
    clean.region = candidate.region;
  }
  if (typeof candidate.kind === 'string' && (KINDS as readonly string[]).includes(candidate.kind)) {
    clean.kind = candidate.kind as DealFilters['kind'];
  }
  if (typeof candidate.sort === 'string' && (SORTS as readonly string[]).includes(candidate.sort)) {
    clean.sort = candidate.sort as DealFilters['sort'];
  }

  const inRange = (value: unknown, min: number, max: number): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? Math.round(value)
      : undefined;

  const maxNightly = inRange(candidate.maxNightly, 50, 5000);
  if (maxNightly !== undefined) clean.maxNightly = maxNightly;
  // Il modello non puo' abbassare la soglia del motore, solo alzarla.
  const minScore = inRange(candidate.minScore, config.deals.minScore, 100);
  if (minScore !== undefined) clean.minScore = minScore;
  const minNights = inRange(candidate.minNights, 1, 30);
  if (minNights !== undefined) clean.minNights = minNights;
  const maxNights = inRange(candidate.maxNights, 1, 30);
  if (maxNights !== undefined) clean.maxNights = maxNights;
  if (clean.minNights !== undefined && clean.maxNights !== undefined && clean.minNights > clean.maxNights) {
    delete clean.maxNights;
  }

  const isDate = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;
  if (isDate(candidate.from)) clean.from = candidate.from;
  if (isDate(candidate.to)) clean.to = candidate.to;
  if (clean.from && clean.to && clean.from > clean.to) delete clean.to;

  if (candidate.refundableOnly === true) clean.refundableOnly = true;

  return clean;
}

/**
 * Interpreta una richiesta scritta a mano.
 *
 * Le regole girano sempre: sono la base e la rete di sicurezza. Se Gemini e'
 * configurato, la sua lettura viene sovrapposta — ma solo dopo essere passata
 * per `sanitize`, che scarta destinazioni inesistenti, date passate e soglie
 * fuori scala. Un modello che sbaglia peggiora il risultato di poco; un modello
 * di cui ci si fida alla cieca lo rompe.
 */
export async function parseQuery(
  text: string,
  options: { now?: Date; gemini?: Gemini } = {},
): Promise<ParsedQuery> {
  const now = options.now ?? new Date();
  const client = options.gemini ?? defaultGemini;
  const rules = parseNatural(text, now);

  const fallback = (avviso?: string): ParsedQuery => ({
    filters: rules.filters,
    source: 'regole',
    interpretazione:
      rules.matched.length > 0
        ? `Cerco: ${rules.matched.join(', ')}.`
        : 'Non ho riconosciuto criteri precisi: mostro tutte le super offerte.',
    ...(avviso ? { avviso } : {}),
  });

  if (!client.configured) return fallback();

  try {
    const answer = await client.generateJson<GeminiFilters>(text, SCHEMA as unknown as Record<string, unknown>, {
      system: systemPrompt(now.toISOString().slice(0, 10)),
      temperature: 0,
      maxOutputTokens: 400,
    });

    const filters = { ...rules.filters, ...sanitize(answer, now) };
    const interpretazione =
      typeof answer.interpretazione === 'string' && answer.interpretazione.trim()
        ? answer.interpretazione.trim().slice(0, 160)
        : fallback().interpretazione;

    return { filters, source: 'gemini', interpretazione };
  } catch (error) {
    // Gemini e' un aiuto, non un pilastro: se non risponde si prosegue a regole.
    const reason = error instanceof GeminiUnavailable ? error.message : String(error);
    return fallback(`Interpretazione assistita non disponibile (${reason}). Ho usato le regole.`);
  }
}
