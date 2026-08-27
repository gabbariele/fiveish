/** Copia lato client del modello esposto dall'API. */

export type DestinationKind = 'citta' | 'mare' | 'montagna' | 'lago' | 'borgo';

export interface Destination {
  id: string;
  name: string;
  region: string;
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
  stars: 5;
  guestRating: number;
  reviewCount: number;
  amenities: string[];
  website?: string;
}

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
  currency: string;
  roomsLeft?: number;
  advertisedBasePrice?: number;
  source: string;
  deepLink?: string;
  observedAt: string;
}

export interface Baseline {
  nightly: number;
  method: 'storico' | 'concorrenti' | 'profilo';
  confidence: 'alta' | 'media' | 'bassa';
  samples: number;
}

export interface ScoreBreakdown {
  sconto: number;
  prezzoAssoluto: number;
  qualita: number;
  condizioni: number;
  rarita: number;
}

export interface Deal {
  id: string;
  offer: Offer;
  hotel: Hotel;
  destination: Destination;
  score: number;
  breakdown: ScoreBreakdown;
  baseline: Baseline;
  discountPct: number;
  savings: number;
  reasons: string[];
  firstSeenAt: string;
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

export interface Health {
  ok: boolean;
  provider: { name: string; ready: boolean; reason?: string };
  soglie: { punteggioMinimo: number; scontoMinimo: number; prezzoMassimoNotte: number };
  scansione: { intervalloMinuti: number; ultima: ScanSummary | null };
  offerteInMemoria: number;
  rilevazioniStorico: number;
  avvisiAttivi: number;
}

export interface Stats {
  deals: number;
  risparmioTotale: number;
  scontoMedio: number;
  perRegione: Array<{ region: string; count: number }>;
  migliore: Deal | null;
}

export interface Watch {
  id: string;
  label: string;
  filters: Filters;
  createdAt: string;
  lastNotifiedAt?: string;
  notifiedDealIds: string[];
}

export interface Filters {
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

export interface DealsResponse {
  total: number;
  count: number;
  filters: Filters;
  lastScan: ScanSummary | null;
  deals: Deal[];
}

export interface DestinationsResponse {
  destinations: Destination[];
  regions: string[];
  kinds: DestinationKind[];
}
