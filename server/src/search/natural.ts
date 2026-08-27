import { destinations, regions } from '../data/destinations.js';
import type { DealFilters, DestinationKind } from '../types.js';

/**
 * Interprete deterministico dell'italiano parlato. Non capisce tutto, ma quello
 * che capisce lo capisce sempre allo stesso modo, gratis e in un millisecondo.
 *
 * Serve a due cose: funzionare quando Gemini non c'e', e fare da rete di
 * sicurezza quando c'e' — i campi che il modello restituisce vengono comunque
 * validati contro questo stesso catalogo.
 */

const MONTHS: Record<string, number> = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};

/**
 * Nomi con cui la gente chiama davvero i posti, oltre a quelli ufficiali.
 *
 * Qui dentro non entrano i nomi delle regioni: "Toscana" o "Puglia" devono
 * finire nel filtro regione, che copre tutte le mete che contengono, non
 * essere dirottati su un singolo borgo.
 */
const ALIASES: Record<string, string> = {
  positano: 'costiera-amalfitana',
  amalfi: 'costiera-amalfitana',
  ravello: 'costiera-amalfitana',
  'costiera amalfitana': 'costiera-amalfitana',
  costiera: 'costiera-amalfitana',
  como: 'lago-di-como',
  bellagio: 'lago-di-como',
  'lago di como': 'lago-di-como',
  garda: 'lago-di-garda',
  'lago di garda': 'lago-di-garda',
  sirmione: 'lago-di-garda',
  'lago maggiore': 'lago-maggiore',
  stresa: 'lago-maggiore',
  cortina: 'cortina',
  ampezzo: 'cortina',
  campiglio: 'madonna-di-campiglio',
  'madonna di campiglio': 'madonna-di-campiglio',
  courmayeur: 'courmayeur',
  merano: 'merano',
  'porto cervo': 'costa-smeralda',
  'costa smeralda': 'costa-smeralda',
  'forte dei marmi': 'forte-dei-marmi',
  versilia: 'forte-dei-marmi',
  portofino: 'portofino',
  capri: 'capri',
  taormina: 'taormina',
  ostuni: 'puglia-costa',
  savelletri: 'puglia-costa',
  matera: 'matera',
  assisi: 'assisi',
  chianti: 'chianti',
  "val d'orcia": 'val-dorcia',
  'val dorcia': 'val-dorcia',
  montalcino: 'val-dorcia',
};

const KIND_WORDS: Array<{ kind: DestinationKind; parole: string[] }> = [
  { kind: 'mare', parole: ['mare', 'spiaggia', 'spiagge', 'costa', 'balneare'] },
  { kind: 'montagna', parole: ['montagna', 'sci', 'neve', 'dolomiti', 'alpi', 'settimana bianca'] },
  { kind: 'lago', parole: ['lago', 'laghi'] },
  { kind: 'borgo', parole: ['borgo', 'borghi', 'campagna', 'collina', 'colline', 'relais'] },
  { kind: 'citta', parole: ['citta', 'città', 'centro storico', 'arte'] },
];

/** Toglie accenti e punteggiatura: "città" e "citta" devono pesare uguale. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Cerca una sequenza di parole intere dentro un'altra.
 *
 * Il confronto per sottostringa qui non va: "cancellazione" contiene "lazio",
 * e chi chiede la cancellazione gratuita si ritroverebbe a cercare nel Lazio.
 */
function includesPhrase(haystack: readonly string[], phrase: string): boolean {
  const needle = words(phrase);
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    if (needle.every((word, j) => haystack[i + j] === word)) return true;
  }
  return false;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOf(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface NaturalParse {
  filters: DealFilters;
  /** Cosa e' stato riconosciuto, per poterlo mostrare a chi ha scritto. */
  matched: string[];
}

export function parseNatural(text: string, now = new Date()): NaturalParse {
  const raw = normalize(text);
  const tokens = words(raw);
  const filters: DealFilters = {};
  const matched: string[] = [];

  // --- Tetto di prezzo ---
  // "sotto i 400", "max 300 euro", "meno di 500 a notte", "entro 250"
  const priceMatch =
    raw.match(/(?:sotto|meno di|max|massimo|entro|fino a|non piu di)\s*(?:i|e|a)?\s*(\d{2,5})/) ??
    raw.match(/(\d{2,5})\s*(?:euro|eur)\s*(?:a|per)?\s*notte/);
  if (priceMatch?.[1]) {
    const value = Number(priceMatch[1]);
    if (value >= 50 && value <= 5000) {
      filters.maxNightly = value;
      matched.push(`massimo ${value} € a notte`);
    }
  }

  // --- Destinazione, poi regione ---
  const normalizedAliases = Object.entries(ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, destinationId] of normalizedAliases) {
    if (includesPhrase(tokens, alias)) {
      filters.destinationId = destinationId;
      matched.push(alias);
      break;
    }
  }
  if (!filters.destinationId) {
    const byName = destinations
      .slice()
      .sort((a, b) => b.name.length - a.name.length)
      .find((d) => includesPhrase(tokens, d.name));
    if (byName) {
      filters.destinationId = byName.id;
      matched.push(byName.name);
    }
  }
  if (!filters.destinationId) {
    const region = regions.find((r) => includesPhrase(tokens, r));
    if (region) {
      filters.region = region;
      matched.push(region);
    }
  }

  // --- Tipo di meta ---
  for (const { kind, parole } of KIND_WORDS) {
    if (parole.some((parola) => includesPhrase(tokens, parola))) {
      filters.kind = kind;
      matched.push(kind);
      break;
    }
  }

  // --- Periodo ---
  const monthEntry = Object.entries(MONTHS).find(([name]) => includesPhrase(tokens, name));
  if (monthEntry) {
    const [name, month] = monthEntry;
    const year = now.getUTCFullYear() + (month < now.getUTCMonth() + 1 ? 1 : 0);
    filters.from = isoDate(year, month, 1);
    filters.to = isoDate(year, month, lastDayOf(year, month));
    matched.push(name);
  }

  // --- Durata ---
  if (/\bweek ?end\b|\bfine settimana\b/.test(raw)) {
    filters.maxNights = 3;
    matched.push('weekend');
  } else if (/\bsettimana\b|\b7 notti\b|\buna settimana\b/.test(raw)) {
    filters.minNights = 5;
    matched.push('una settimana');
  }

  // --- Condizioni ---
  if (/cancellazione gratuita|rimborsabil|annullabil/.test(raw)) {
    filters.refundableOnly = true;
    matched.push('cancellazione gratuita');
  }

  // --- Livello di selezione ---
  if (/eccezional|imperdibil|il meglio|top|pazzesc|clamoros/.test(raw)) {
    filters.minScore = 85;
    matched.push('solo le eccezionali');
  }

  // --- Ordinamento ---
  if (/piu economic|meno car|prezzo piu basso|spendere meno/.test(raw)) {
    filters.sort = 'prezzo';
    matched.push('dalle più economiche');
  } else if (/sconto piu alto|piu scontat|maggiore sconto/.test(raw)) {
    filters.sort = 'sconto';
    matched.push('dallo sconto più alto');
  }

  return { filters, matched };
}
