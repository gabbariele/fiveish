import type { Destination } from '../types.js';

/**
 * Le piazze italiane dove esiste davvero un'offerta 5 stelle.
 * `cityCode` e' il codice citta IATA richiesto dai provider di prezzi.
 */
export const destinations: Destination[] = [
  { id: 'roma', name: 'Roma', region: 'Lazio', cityCode: 'ROM', kind: 'citta', lat: 41.9028, lon: 12.4964 },
  { id: 'milano', name: 'Milano', region: 'Lombardia', cityCode: 'MIL', kind: 'citta', lat: 45.4642, lon: 9.19 },
  { id: 'firenze', name: 'Firenze', region: 'Toscana', cityCode: 'FLR', kind: 'citta', lat: 43.7696, lon: 11.2558 },
  { id: 'venezia', name: 'Venezia', region: 'Veneto', cityCode: 'VCE', kind: 'citta', lat: 45.4408, lon: 12.3155 },
  { id: 'napoli', name: 'Napoli', region: 'Campania', cityCode: 'NAP', kind: 'citta', lat: 40.8518, lon: 14.2681 },
  { id: 'torino', name: 'Torino', region: 'Piemonte', cityCode: 'TRN', kind: 'citta', lat: 45.0703, lon: 7.6869 },
  { id: 'bologna', name: 'Bologna', region: 'Emilia-Romagna', cityCode: 'BLQ', kind: 'citta', lat: 44.4949, lon: 11.3426 },
  { id: 'verona', name: 'Verona', region: 'Veneto', cityCode: 'VRN', kind: 'citta', lat: 45.4384, lon: 10.9916 },
  { id: 'palermo', name: 'Palermo', region: 'Sicilia', cityCode: 'PMO', kind: 'citta', lat: 38.1157, lon: 13.3615 },
  { id: 'genova', name: 'Genova', region: 'Liguria', cityCode: 'GOA', kind: 'citta', lat: 44.4056, lon: 8.9463 },

  { id: 'costiera-amalfitana', name: 'Costiera Amalfitana', region: 'Campania', cityCode: 'NAP', kind: 'mare', lat: 40.634, lon: 14.602 },
  { id: 'capri', name: 'Capri', region: 'Campania', cityCode: 'NAP', kind: 'mare', lat: 40.5532, lon: 14.2222 },
  { id: 'taormina', name: 'Taormina', region: 'Sicilia', cityCode: 'CTA', kind: 'mare', lat: 37.8516, lon: 15.2853 },
  { id: 'portofino', name: 'Portofino', region: 'Liguria', cityCode: 'GOA', kind: 'mare', lat: 44.3032, lon: 9.2094 },
  { id: 'costa-smeralda', name: 'Costa Smeralda', region: 'Sardegna', cityCode: 'OLB', kind: 'mare', lat: 41.1266, lon: 9.5205 },
  { id: 'forte-dei-marmi', name: 'Forte dei Marmi', region: 'Toscana', cityCode: 'PSA', kind: 'mare', lat: 43.9584, lon: 10.1707 },
  { id: 'puglia-costa', name: 'Puglia costiera', region: 'Puglia', cityCode: 'BRI', kind: 'mare', lat: 40.6, lon: 17.6 },

  { id: 'cortina', name: "Cortina d'Ampezzo", region: 'Veneto', cityCode: 'VCE', kind: 'montagna', lat: 46.5405, lon: 12.1357 },
  { id: 'madonna-di-campiglio', name: 'Madonna di Campiglio', region: 'Trentino-Alto Adige', cityCode: 'VRN', kind: 'montagna', lat: 46.2288, lon: 10.8262 },
  { id: 'courmayeur', name: 'Courmayeur', region: "Valle d'Aosta", cityCode: 'TRN', kind: 'montagna', lat: 45.7918, lon: 6.9714 },
  { id: 'merano', name: 'Merano', region: 'Trentino-Alto Adige', cityCode: 'VRN', kind: 'montagna', lat: 46.6713, lon: 11.1594 },

  { id: 'lago-di-como', name: 'Lago di Como', region: 'Lombardia', cityCode: 'MIL', kind: 'lago', lat: 45.9847, lon: 9.2578 },
  { id: 'lago-di-garda', name: 'Lago di Garda', region: 'Lombardia', cityCode: 'VRN', kind: 'lago', lat: 45.5, lon: 10.65 },
  { id: 'lago-maggiore', name: 'Lago Maggiore', region: 'Piemonte', cityCode: 'MXP', kind: 'lago', lat: 45.8804, lon: 8.5372 },

  { id: 'val-dorcia', name: "Val d'Orcia", region: 'Toscana', cityCode: 'FLR', kind: 'borgo', lat: 43.0596, lon: 11.6106 },
  { id: 'chianti', name: 'Chianti', region: 'Toscana', cityCode: 'FLR', kind: 'borgo', lat: 43.4667, lon: 11.3 },
  { id: 'matera', name: 'Matera', region: 'Basilicata', cityCode: 'BRI', kind: 'borgo', lat: 40.6664, lon: 16.6043 },
  { id: 'assisi', name: 'Assisi', region: 'Umbria', cityCode: 'PEG', kind: 'borgo', lat: 43.0707, lon: 12.6196 },
];

const byId = new Map(destinations.map((d) => [d.id, d]));

export function getDestination(id: string): Destination | undefined {
  return byId.get(id);
}

export const regions = [...new Set(destinations.map((d) => d.region))].sort((a, b) =>
  a.localeCompare(b, 'it'),
);
