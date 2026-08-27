const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const numbers = new Intl.NumberFormat('it-IT');

export const money = (value: number): string => euro.format(Math.round(value));
export const count = (value: number): string => numbers.format(value);
export const percent = (value: number): string => `${Math.round(value * 100)}%`;

const BOARD_LABEL: Record<string, string> = {
  'solo-pernottamento': 'Solo pernottamento',
  colazione: 'Colazione inclusa',
  'mezza-pensione': 'Mezza pensione',
  'pensione-completa': 'Pensione completa',
  'all-inclusive': 'All inclusive',
};

export const boardLabel = (board: string): string => BOARD_LABEL[board] ?? board;

const KIND_LABEL: Record<string, string> = {
  citta: 'Città',
  mare: 'Mare',
  montagna: 'Montagna',
  lago: 'Lago',
  borgo: 'Borghi',
};

export const kindLabel = (kind: string): string => KIND_LABEL[kind] ?? kind;

const dayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const full = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

const parse = (iso: string): Date => new Date(`${iso}T12:00:00Z`);

export const shortDate = (iso: string): string => dayMonth.format(parse(iso));
export const longDate = (iso: string): string => full.format(parse(iso));

export function stayLabel(checkIn: string, checkOut: string, nights: number): string {
  return `${shortDate(checkIn)} → ${shortDate(checkOut)} · ${nights} ${nights === 1 ? 'notte' : 'notti'}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'adesso';
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
}

/** Quanto manca al check-in, per marcare le partenze imminenti. */
export function daysUntil(iso: string): number {
  return Math.round((parse(iso).getTime() - Date.now()) / 86_400_000);
}
