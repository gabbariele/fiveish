import type { Deal, DealFilters } from '../types.js';

/** Applica i filtri della UI a un elenco di offerte gia' selezionate dal motore. */
export function applyFilters(deals: Deal[], filters: DealFilters): Deal[] {
  let result = deals.filter((deal) => {
    if (filters.destinationId && deal.destination.id !== filters.destinationId) return false;
    if (filters.region && deal.destination.region !== filters.region) return false;
    if (filters.kind && deal.destination.kind !== filters.kind) return false;
    if (filters.maxNightly !== undefined && deal.offer.nightlyPrice > filters.maxNightly) return false;
    if (filters.minScore !== undefined && deal.score < filters.minScore) return false;
    if (filters.minNights !== undefined && deal.offer.nights < filters.minNights) return false;
    if (filters.maxNights !== undefined && deal.offer.nights > filters.maxNights) return false;
    if (filters.from && deal.offer.checkIn < filters.from) return false;
    if (filters.to && deal.offer.checkIn > filters.to) return false;
    if (filters.refundableOnly && !deal.offer.refundable) return false;
    return true;
  });

  const sort = filters.sort ?? 'score';
  result = [...result].sort((a, b) => {
    switch (sort) {
      case 'prezzo':
        return a.offer.nightlyPrice - b.offer.nightlyPrice;
      case 'sconto':
        return b.discountPct - a.discountPct;
      case 'checkin':
        return a.offer.checkIn.localeCompare(b.offer.checkIn);
      default:
        return b.score - a.score;
    }
  });

  if (filters.limit !== undefined && filters.limit > 0) result = result.slice(0, filters.limit);
  return result;
}

/** Traduce i parametri di query HTTP (tutti stringhe) in filtri tipati. */
export function parseFilters(query: Record<string, unknown>): DealFilters {
  const str = (key: string): string | undefined => {
    const value = query[key];
    return typeof value === 'string' && value !== '' ? value : undefined;
  };
  const int = (key: string): number | undefined => {
    const value = Number(query[key]);
    return Number.isFinite(value) ? value : undefined;
  };
  const flag = (key: string): boolean | undefined => {
    const value = str(key);
    if (value === undefined) return undefined;
    return ['1', 'true', 'si', 'yes'].includes(value.toLowerCase());
  };

  const sortRaw = str('sort');
  const sort =
    sortRaw === 'prezzo' || sortRaw === 'sconto' || sortRaw === 'checkin' || sortRaw === 'score'
      ? sortRaw
      : undefined;

  const kindRaw = str('kind');
  const kind =
    kindRaw === 'citta' || kindRaw === 'mare' || kindRaw === 'montagna' || kindRaw === 'lago' || kindRaw === 'borgo'
      ? kindRaw
      : undefined;

  const filters: DealFilters = {};
  const destinationId = str('destinationId');
  if (destinationId) filters.destinationId = destinationId;
  const region = str('region');
  if (region) filters.region = region;
  if (kind) filters.kind = kind;
  const maxNightly = int('maxNightly');
  if (maxNightly !== undefined) filters.maxNightly = maxNightly;
  const minScore = int('minScore');
  if (minScore !== undefined) filters.minScore = minScore;
  const minNights = int('minNights');
  if (minNights !== undefined) filters.minNights = minNights;
  const maxNights = int('maxNights');
  if (maxNights !== undefined) filters.maxNights = maxNights;
  const from = str('from');
  if (from) filters.from = from;
  const to = str('to');
  if (to) filters.to = to;
  const refundableOnly = flag('refundableOnly');
  if (refundableOnly) filters.refundableOnly = true;
  if (sort) filters.sort = sort;
  const limit = int('limit');
  if (limit !== undefined) filters.limit = limit;
  return filters;
}
