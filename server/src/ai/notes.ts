import { getDestination } from '../data/destinations.js';
import type { Store } from '../store/store.js';
import { GeminiUnavailable, gemini as defaultGemini, type Gemini } from './gemini.js';

const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

export interface DestinationNote {
  destinationId: string;
  month: string;
  text: string;
  /** Vera quando la nota arriva dalla cache invece che da una nuova chiamata. */
  cached: boolean;
}

const SYSTEM = [
  'Scrivi due frasi in italiano su cosa aspettarsi in una localita italiana in un dato mese.',
  'Parla solo di clima, affluenza e atmosfera della stagione.',
  'Non citare eventi con date precise, non fare nomi di hotel, non indicare prezzi, non promettere nulla.',
  'Tono sobrio e concreto, da guida, non da brochure. Niente superlativi pubblicitari.',
  'Massimo 45 parole in tutto.',
].join('\n');

/**
 * Due righe di contesto sulla meta nel mese dell'offerta: perche' andarci
 * adesso, o perche' costa meno adesso. E' un contorno, non un dato: se Gemini
 * non e' configurato la funzione restituisce `null` e l'interfaccia non mostra
 * nulla, senza buchi ne segnaposto.
 *
 * Ogni nota vale per una coppia destinazione+mese e viene scritta una volta
 * sola: sono al massimo qualche centinaio di frasi, e non cambiano di ora in ora.
 */
export async function destinationNote(
  destinationId: string,
  month: string,
  store: Store,
  client: Gemini = defaultGemini,
): Promise<DestinationNote | null> {
  const destination = getDestination(destinationId);
  if (!destination) return null;

  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return null;

  const cached = store.getNote(destinationId, month);
  if (cached) return { destinationId, month, text: cached, cached: true };

  if (!client.configured) return null;

  try {
    const text = await client.generate(
      `Localita: ${destination.name} (${destination.region}, Italia). Mese: ${monthName}.`,
      { system: SYSTEM, temperature: 0.4, maxOutputTokens: 200 },
    );
    const clean = text.trim().replace(/\s+/g, ' ').slice(0, 400);
    if (!clean) return null;
    store.setNote(destinationId, month, clean);
    return { destinationId, month, text: clean, cached: false };
  } catch (error) {
    if (error instanceof GeminiUnavailable) return null;
    throw error;
  }
}
