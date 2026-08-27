import type { Destination, Hotel } from '../types.js';
import { getDestination } from './destinations.js';
import { seasonality } from './seasonality.js';

interface HotelSeed {
  id: string;
  name: string;
  destinationId: string;
  guestRating: number;
  reviewCount: number;
  /** Mediana annua del prezzo a notte, camera doppia, in EUR. */
  basePrice: number;
  amenities: string[];
  website?: string;
}

/**
 * Anagrafica dimostrativa: strutture 5 stelle italiane realmente esistenti.
 * I nomi sono reali, i prezzi no: `basePrice` e' una stima d'ordine di grandezza
 * che serve a far girare il motore offline. Con PROVIDER=amadeus questa lista
 * viene ignorata e l'anagrafica arriva dal provider.
 */
const seeds: HotelSeed[] = [
  // --- Roma ---
  { id: 'roma-de-russie', name: 'Hotel de Russie', destinationId: 'roma', guestRating: 9.3, reviewCount: 1840, basePrice: 820, amenities: ['spa', 'giardino', 'ristorante stellato'] },
  { id: 'roma-eden', name: 'Hotel Eden', destinationId: 'roma', guestRating: 9.4, reviewCount: 1210, basePrice: 890, amenities: ['rooftop', 'spa', 'ristorante stellato'] },
  { id: 'roma-st-regis', name: 'The St. Regis Rome', destinationId: 'roma', guestRating: 9.1, reviewCount: 2050, basePrice: 700, amenities: ['maggiordomo', 'bar storico'] },
  { id: 'roma-palazzo-manfredi', name: 'Palazzo Manfredi', destinationId: 'roma', guestRating: 9.2, reviewCount: 980, basePrice: 640, amenities: ['vista Colosseo', 'ristorante stellato'] },
  { id: 'roma-vilon', name: 'Hotel Vilòn', destinationId: 'roma', guestRating: 9.5, reviewCount: 620, basePrice: 610, amenities: ['boutique', 'giardino segreto'] },
  { id: 'roma-villa-agrippina', name: 'Villa Agrippina Gran Meliá', destinationId: 'roma', guestRating: 9.0, reviewCount: 1730, basePrice: 520, amenities: ['piscina', 'spa', 'parco'] },
  { id: 'roma-splendide-royal', name: 'Hotel Splendide Royal', destinationId: 'roma', guestRating: 8.9, reviewCount: 1120, basePrice: 480, amenities: ['rooftop', 'ristorante panoramico'] },
  { id: 'roma-sofitel-borghese', name: 'Sofitel Rome Villa Borghese', destinationId: 'roma', guestRating: 8.8, reviewCount: 2410, basePrice: 430, amenities: ['rooftop', 'vista Villa Borghese'] },

  // --- Milano ---
  { id: 'milano-bulgari', name: 'Bulgari Hotel Milano', destinationId: 'milano', guestRating: 9.4, reviewCount: 890, basePrice: 1150, amenities: ['spa', 'giardino privato'] },
  { id: 'milano-park-hyatt', name: 'Park Hyatt Milano', destinationId: 'milano', guestRating: 9.2, reviewCount: 1560, basePrice: 780, amenities: ['spa', 'Duomo a 50 m'] },
  { id: 'milano-mandarin', name: 'Mandarin Oriental Milan', destinationId: 'milano', guestRating: 9.3, reviewCount: 1040, basePrice: 820, amenities: ['spa', 'ristorante stellato'] },
  { id: 'milano-armani', name: 'Armani Hotel Milano', destinationId: 'milano', guestRating: 9.1, reviewCount: 970, basePrice: 760, amenities: ['spa', 'design'] },
  { id: 'milano-principe-savoia', name: 'Hotel Principe di Savoia', destinationId: 'milano', guestRating: 9.0, reviewCount: 3200, basePrice: 590, amenities: ['spa', 'piscina', 'storico'] },
  { id: 'milano-palazzo-parigi', name: 'Palazzo Parigi Hotel & Grand Spa', destinationId: 'milano', guestRating: 8.9, reviewCount: 1280, basePrice: 540, amenities: ['spa', 'giardino'] },
  { id: 'milano-chateau-monfort', name: 'Château Monfort', destinationId: 'milano', guestRating: 9.0, reviewCount: 1420, basePrice: 400, amenities: ['spa', 'boutique'] },

  // --- Firenze ---
  { id: 'firenze-four-seasons', name: 'Four Seasons Hotel Firenze', destinationId: 'firenze', guestRating: 9.4, reviewCount: 1680, basePrice: 950, amenities: ['parco storico', 'piscina', 'spa'] },
  { id: 'firenze-st-regis', name: 'The St. Regis Florence', destinationId: 'firenze', guestRating: 9.1, reviewCount: 1490, basePrice: 720, amenities: ['vista Arno', 'maggiordomo'] },
  { id: 'firenze-savoy', name: 'Hotel Savoy', destinationId: 'firenze', guestRating: 9.2, reviewCount: 1350, basePrice: 690, amenities: ['piazza della Repubblica', 'spa'] },
  { id: 'firenze-portrait', name: 'Portrait Firenze', destinationId: 'firenze', guestRating: 9.5, reviewCount: 740, basePrice: 780, amenities: ['vista Ponte Vecchio', 'suite'] },
  { id: 'firenze-villa-cora', name: 'Villa Cora', destinationId: 'firenze', guestRating: 9.1, reviewCount: 1180, basePrice: 560, amenities: ['piscina', 'parco', 'spa'] },
  { id: 'firenze-salviatino', name: 'Il Salviatino', destinationId: 'firenze', guestRating: 9.0, reviewCount: 860, basePrice: 610, amenities: ['collina di Fiesole', 'piscina'] },
  { id: 'firenze-helvetia-bristol', name: 'Helvetia & Bristol Firenze', destinationId: 'firenze', guestRating: 9.2, reviewCount: 1090, basePrice: 620, amenities: ['spa', 'storico'] },

  // --- Venezia ---
  { id: 'venezia-gritti', name: 'The Gritti Palace', destinationId: 'venezia', guestRating: 9.3, reviewCount: 1620, basePrice: 980, amenities: ['Canal Grande', 'terrazza'] },
  { id: 'venezia-danieli', name: 'Hotel Danieli', destinationId: 'venezia', guestRating: 9.0, reviewCount: 2870, basePrice: 860, amenities: ['storico', 'rooftop'] },
  { id: 'venezia-aman', name: 'Aman Venice', destinationId: 'venezia', guestRating: 9.5, reviewCount: 410, basePrice: 1600, amenities: ['palazzo del XVI secolo', 'giardini'] },
  { id: 'venezia-sagredo', name: "Ca' Sagredo Hotel", destinationId: 'venezia', guestRating: 8.9, reviewCount: 1740, basePrice: 520, amenities: ['museo', 'Canal Grande'] },
  { id: 'venezia-baglioni-luna', name: 'Baglioni Hotel Luna', destinationId: 'venezia', guestRating: 9.0, reviewCount: 1930, basePrice: 590, amenities: ['San Marco', 'sala Marco Polo'] },
  { id: 'venezia-metropole', name: 'Hotel Metropole Venezia', destinationId: 'venezia', guestRating: 9.1, reviewCount: 1280, basePrice: 540, amenities: ['giardino', 'collezione d\'arte'] },
  { id: 'venezia-jw-marriott', name: 'JW Marriott Venice Resort & Spa', destinationId: 'venezia', guestRating: 9.0, reviewCount: 2260, basePrice: 620, amenities: ['isola privata', 'piscina', 'spa'] },

  // --- Napoli ---
  { id: 'napoli-vesuvio', name: 'Grand Hotel Vesuvio', destinationId: 'napoli', guestRating: 9.0, reviewCount: 2140, basePrice: 380, amenities: ['vista golfo', 'rooftop'] },
  { id: 'napoli-romeo', name: 'Romeo Hotel', destinationId: 'napoli', guestRating: 9.1, reviewCount: 1560, basePrice: 420, amenities: ['spa', 'ristorante stellato'] },
  { id: 'napoli-parkers', name: "Grand Hotel Parker's", destinationId: 'napoli', guestRating: 8.9, reviewCount: 1310, basePrice: 340, amenities: ['vista panoramica', 'storico'] },

  // --- Torino ---
  { id: 'torino-principi-piemonte', name: 'Principi di Piemonte', destinationId: 'torino', guestRating: 8.9, reviewCount: 1870, basePrice: 300, amenities: ['spa', 'centro storico'] },
  { id: 'torino-sitea', name: 'Grand Hotel Sitea', destinationId: 'torino', guestRating: 9.0, reviewCount: 1240, basePrice: 280, amenities: ['ristorante Carignano', 'storico'] },

  // --- Bologna / Verona / Palermo / Genova ---
  { id: 'bologna-majestic', name: 'Grand Hotel Majestic già Baglioni', destinationId: 'bologna', guestRating: 9.0, reviewCount: 1420, basePrice: 380, amenities: ['storico', 'centro'] },
  { id: 'bologna-varignana', name: 'Palazzo di Varignana', destinationId: 'bologna', guestRating: 9.1, reviewCount: 2380, basePrice: 320, amenities: ['piscine', 'spa', 'colline'] },
  { id: 'verona-due-torri', name: 'Due Torri Hotel', destinationId: 'verona', guestRating: 9.0, reviewCount: 1650, basePrice: 340, amenities: ['storico', 'rooftop'] },
  { id: 'verona-byblos', name: 'Byblos Art Hotel Villa Amistà', destinationId: 'verona', guestRating: 9.1, reviewCount: 780, basePrice: 400, amenities: ['arte contemporanea', 'piscina'] },
  { id: 'palermo-villa-igiea', name: 'Villa Igiea, a Rocco Forte Hotel', destinationId: 'palermo', guestRating: 9.3, reviewCount: 1120, basePrice: 560, amenities: ['piscina', 'parco', 'vista mare'] },
  { id: 'palermo-wagner', name: 'Grand Hotel Wagner', destinationId: 'palermo', guestRating: 8.9, reviewCount: 1340, basePrice: 260, amenities: ['storico', 'centro'] },
  { id: 'genova-savoia', name: 'Grand Hotel Savoia', destinationId: 'genova', guestRating: 8.8, reviewCount: 1580, basePrice: 240, amenities: ['spa', 'stazione Principe'] },
  { id: 'genova-melia', name: 'Meliá Genova', destinationId: 'genova', guestRating: 8.9, reviewCount: 1460, basePrice: 250, amenities: ['spa', 'design'] },

  // --- Costiera Amalfitana ---
  { id: 'amalfi-le-sirenuse', name: 'Le Sirenuse', destinationId: 'costiera-amalfitana', guestRating: 9.5, reviewCount: 1080, basePrice: 1250, amenities: ['Positano', 'piscina', 'ristorante stellato'] },
  { id: 'amalfi-san-pietro', name: 'Il San Pietro di Positano', destinationId: 'costiera-amalfitana', guestRating: 9.6, reviewCount: 690, basePrice: 1350, amenities: ['spiaggia privata', 'ascensore nella roccia'] },
  { id: 'amalfi-santa-caterina', name: 'Hotel Santa Caterina', destinationId: 'costiera-amalfitana', guestRating: 9.4, reviewCount: 940, basePrice: 980, amenities: ['Amalfi', 'piscina a mare'] },
  { id: 'amalfi-palazzo-avino', name: 'Palazzo Avino', destinationId: 'costiera-amalfitana', guestRating: 9.3, reviewCount: 820, basePrice: 880, amenities: ['Ravello', 'beach club'] },
  { id: 'amalfi-caruso', name: 'Caruso, A Belmond Hotel', destinationId: 'costiera-amalfitana', guestRating: 9.5, reviewCount: 760, basePrice: 1180, amenities: ['Ravello', 'piscina a sfioro'] },
  { id: 'amalfi-monastero-santa-rosa', name: 'Monastero Santa Rosa Hotel & Spa', destinationId: 'costiera-amalfitana', guestRating: 9.5, reviewCount: 520, basePrice: 1050, amenities: ['ex monastero', 'spa'] },

  // --- Capri ---
  { id: 'capri-palace', name: 'Capri Palace Jumeirah', destinationId: 'capri', guestRating: 9.2, reviewCount: 1140, basePrice: 900, amenities: ['spa medica', 'piscina'] },
  { id: 'capri-jk-place', name: 'JK Place Capri', destinationId: 'capri', guestRating: 9.5, reviewCount: 480, basePrice: 1200, amenities: ['vista mare', 'boutique'] },
  { id: 'capri-punta-tragara', name: 'Hotel Punta Tragara', destinationId: 'capri', guestRating: 9.3, reviewCount: 720, basePrice: 950, amenities: ['vista Faraglioni', 'piscine'] },
  { id: 'capri-quisisana', name: 'Grand Hotel Quisisana', destinationId: 'capri', guestRating: 9.0, reviewCount: 1360, basePrice: 850, amenities: ['storico', 'spa'] },

  // --- Taormina ---
  { id: 'taormina-san-domenico', name: 'San Domenico Palace, Four Seasons', destinationId: 'taormina', guestRating: 9.5, reviewCount: 690, basePrice: 1150, amenities: ['ex convento', 'piscina a sfioro'] },
  { id: 'taormina-timeo', name: 'Grand Hotel Timeo, A Belmond Hotel', destinationId: 'taormina', guestRating: 9.4, reviewCount: 880, basePrice: 950, amenities: ['vista Etna', 'teatro greco'] },
  { id: 'taormina-villa-santandrea', name: "Villa Sant'Andrea, A Belmond Hotel", destinationId: 'taormina', guestRating: 9.3, reviewCount: 760, basePrice: 820, amenities: ['spiaggia privata', 'Mazzarò'] },
  { id: 'taormina-metropole', name: 'Hotel Metropole Taormina', destinationId: 'taormina', guestRating: 9.1, reviewCount: 540, basePrice: 620, amenities: ['boutique', 'rooftop'] },

  // --- Portofino / Forte dei Marmi / Costa Smeralda / Puglia ---
  { id: 'portofino-splendido', name: 'Splendido, A Belmond Hotel', destinationId: 'portofino', guestRating: 9.4, reviewCount: 620, basePrice: 1450, amenities: ['piscina panoramica', 'parco'] },
  { id: 'portofino-splendido-mare', name: 'Splendido Mare, A Belmond Hotel', destinationId: 'portofino', guestRating: 9.3, reviewCount: 410, basePrice: 1250, amenities: ['piazzetta', 'fronte porto'] },
  { id: 'forte-principe', name: 'Principe Forte dei Marmi', destinationId: 'forte-dei-marmi', guestRating: 9.3, reviewCount: 640, basePrice: 780, amenities: ['spa', 'spiaggia privata'] },
  { id: 'forte-augustus', name: 'Augustus Hotel & Resort', destinationId: 'forte-dei-marmi', guestRating: 9.1, reviewCount: 830, basePrice: 640, amenities: ['parco', 'tunnel per la spiaggia'] },
  { id: 'forte-byron', name: 'Hotel Byron', destinationId: 'forte-dei-marmi', guestRating: 9.2, reviewCount: 520, basePrice: 690, amenities: ['ristorante stellato', 'piscina'] },
  { id: 'smeralda-cala-di-volpe', name: 'Hotel Cala di Volpe', destinationId: 'costa-smeralda', guestRating: 9.2, reviewCount: 720, basePrice: 1700, amenities: ['piscina olimpica', 'porticciolo'] },
  { id: 'smeralda-romazzino', name: 'Hotel Romazzino', destinationId: 'costa-smeralda', guestRating: 9.1, reviewCount: 610, basePrice: 1350, amenities: ['spiaggia', 'giardini'] },
  { id: 'smeralda-pitrizza', name: 'Hotel Pitrizza', destinationId: 'costa-smeralda', guestRating: 9.4, reviewCount: 380, basePrice: 1600, amenities: ['ville private', 'piscina scavata nella roccia'] },
  { id: 'smeralda-cervo', name: 'Cervo Hotel, Costa Smeralda Resort', destinationId: 'costa-smeralda', guestRating: 8.9, reviewCount: 940, basePrice: 780, amenities: ['Porto Cervo', 'piscina'] },
  { id: 'puglia-borgo-egnazia', name: 'Borgo Egnazia', destinationId: 'puglia-costa', guestRating: 9.3, reviewCount: 2180, basePrice: 720, amenities: ['golf', 'spa', 'beach club'] },
  { id: 'puglia-san-domenico', name: 'Masseria San Domenico', destinationId: 'puglia-costa', guestRating: 9.1, reviewCount: 980, basePrice: 560, amenities: ['talassoterapia', 'uliveto'] },
  { id: 'puglia-torre-maizza', name: 'Masseria Torre Maizza, Rocco Forte', destinationId: 'puglia-costa', guestRating: 9.3, reviewCount: 740, basePrice: 680, amenities: ['spa', 'golf', 'beach club'] },

  // --- Montagna ---
  { id: 'cortina-cristallo', name: 'Cristallo, a Luxury Collection Resort', destinationId: 'cortina', guestRating: 9.2, reviewCount: 1080, basePrice: 780, amenities: ['spa', 'vista Dolomiti'] },
  { id: 'cortina-savoia', name: 'Grand Hotel Savoia Cortina', destinationId: 'cortina', guestRating: 9.0, reviewCount: 920, basePrice: 620, amenities: ['spa', 'centro'] },
  { id: 'cortina-rosapetra', name: 'Rosapetra Spa Resort', destinationId: 'cortina', guestRating: 9.3, reviewCount: 640, basePrice: 660, amenities: ['spa', 'ristorante stellato'] },
  { id: 'campiglio-lefay-dolomiti', name: 'Lefay Resort & SPA Dolomiti', destinationId: 'madonna-di-campiglio', guestRating: 9.4, reviewCount: 890, basePrice: 720, amenities: ['spa 5000 mq', 'pensione'] },
  { id: 'campiglio-chalet-del-sogno', name: 'Chalet del Sogno', destinationId: 'madonna-di-campiglio', guestRating: 9.2, reviewCount: 380, basePrice: 580, amenities: ['ski-in ski-out', 'suite'] },
  { id: 'courmayeur-royal-golf', name: 'Grand Hotel Royal e Golf', destinationId: 'courmayeur', guestRating: 9.0, reviewCount: 1120, basePrice: 520, amenities: ['spa', 'vista Monte Bianco'] },
  { id: 'courmayeur-le-massif', name: 'Le Massif Courmayeur', destinationId: 'courmayeur', guestRating: 9.3, reviewCount: 720, basePrice: 640, amenities: ['ski room', 'spa'] },
  { id: 'merano-villa-eden', name: 'Villa Eden Leading Park Retreat', destinationId: 'merano', guestRating: 9.2, reviewCount: 460, basePrice: 620, amenities: ['medical spa', 'parco'] },
  { id: 'merano-castel-fragsburg', name: 'Castel Fragsburg', destinationId: 'merano', guestRating: 9.5, reviewCount: 340, basePrice: 580, amenities: ['Relais & Châteaux', 'vista valle'] },

  // --- Laghi ---
  { id: 'como-tremezzo', name: 'Grand Hotel Tremezzo', destinationId: 'lago-di-como', guestRating: 9.4, reviewCount: 1340, basePrice: 1100, amenities: ['piscina galleggiante', 'spa'] },
  { id: 'como-villa-deste', name: "Villa d'Este", destinationId: 'lago-di-como', guestRating: 9.3, reviewCount: 1160, basePrice: 1250, amenities: ['parco storico', 'piscina sul lago'] },
  { id: 'como-passalacqua', name: 'Passalacqua', destinationId: 'lago-di-como', guestRating: 9.7, reviewCount: 290, basePrice: 1800, amenities: ['villa settecentesca', 'giardini terrazzati'] },
  { id: 'como-mandarin', name: 'Mandarin Oriental, Lago di Como', destinationId: 'lago-di-como', guestRating: 9.4, reviewCount: 620, basePrice: 1150, amenities: ['spa', 'piscina sul lago'] },
  { id: 'como-victoria-menaggio', name: 'Grand Hotel Victoria Concept & Spa', destinationId: 'lago-di-como', guestRating: 9.2, reviewCount: 780, basePrice: 680, amenities: ['spa', 'Menaggio'] },
  { id: 'garda-lefay', name: 'Lefay Resort & SPA Lago di Garda', destinationId: 'lago-di-garda', guestRating: 9.4, reviewCount: 1620, basePrice: 640, amenities: ['spa', 'mezza pensione inclusa'] },
  { id: 'garda-fasano', name: 'Grand Hotel Fasano', destinationId: 'lago-di-garda', guestRating: 9.2, reviewCount: 1080, basePrice: 520, amenities: ['parco', 'spiaggia privata'] },
  { id: 'garda-villa-feltrinelli', name: 'Grand Hotel a Villa Feltrinelli', destinationId: 'lago-di-garda', guestRating: 9.6, reviewCount: 310, basePrice: 1500, amenities: ['villa storica', 'ristorante stellato'] },
  { id: 'maggiore-borromees', name: 'Grand Hotel des Iles Borromées', destinationId: 'lago-maggiore', guestRating: 9.1, reviewCount: 1420, basePrice: 480, amenities: ['spa', 'vista isole'] },
  { id: 'maggiore-villa-aminta', name: 'Villa e Palazzo Aminta', destinationId: 'lago-maggiore', guestRating: 9.2, reviewCount: 890, basePrice: 520, amenities: ['piscina', 'spiaggia privata'] },

  // --- Borghi ---
  { id: 'orcia-castiglion-del-bosco', name: 'Rosewood Castiglion del Bosco', destinationId: 'val-dorcia', guestRating: 9.6, reviewCount: 520, basePrice: 1400, amenities: ['tenuta 2000 ettari', 'golf', 'cantina'] },
  { id: 'orcia-adler-thermae', name: 'ADLER Spa Resort THERMAE', destinationId: 'val-dorcia', guestRating: 9.3, reviewCount: 1840, basePrice: 620, amenities: ['terme naturali', 'pensione'] },
  { id: 'orcia-borgo-santo-pietro', name: 'Borgo Santo Pietro', destinationId: 'val-dorcia', guestRating: 9.5, reviewCount: 610, basePrice: 980, amenities: ['fattoria', 'ristorante stellato'] },
  { id: 'chianti-castello-del-nero', name: 'COMO Castello Del Nero', destinationId: 'chianti', guestRating: 9.4, reviewCount: 680, basePrice: 880, amenities: ['castello del XII secolo', 'spa'] },
  { id: 'chianti-castello-di-casole', name: 'Castello di Casole, A Belmond Hotel', destinationId: 'chianti', guestRating: 9.5, reviewCount: 540, basePrice: 950, amenities: ['tenuta', 'piscina panoramica'] },
  { id: 'matera-palazzo-gattini', name: 'Palazzo Gattini Luxury Hotel', destinationId: 'matera', guestRating: 9.1, reviewCount: 940, basePrice: 380, amenities: ['spa nella roccia', 'vista Sassi'] },
  { id: 'matera-aquatio', name: 'Aquatio Cave Luxury Hotel & SPA', destinationId: 'matera', guestRating: 9.2, reviewCount: 720, basePrice: 340, amenities: ['grotte', 'spa'] },
  { id: 'assisi-nun', name: 'Nun Assisi Relais & Spa Museum', destinationId: 'assisi', guestRating: 9.3, reviewCount: 680, basePrice: 420, amenities: ['ex monastero', 'spa nelle terme romane'] },
  { id: 'assisi-borgo-dei-conti', name: 'Borgo dei Conti Resort', destinationId: 'assisi', guestRating: 9.2, reviewCount: 590, basePrice: 400, amenities: ['parco', 'piscina'] },
];

/** Costruisce la mediana storica mese per mese applicando la curva stagionale. */
function buildPriceProfile(basePrice: number, destination: Destination): Record<string, number> {
  const curve = seasonality[destination.kind];
  const profile: Record<string, number> = {};
  for (let month = 0; month < 12; month += 1) {
    const key = String(month + 1).padStart(2, '0');
    profile[key] = Math.round(basePrice * (curve[month] ?? 1));
  }
  return profile;
}

export const sampleHotels: Hotel[] = seeds.map((seed) => {
  const destination = getDestination(seed.destinationId);
  if (!destination) {
    throw new Error(`Destinazione sconosciuta "${seed.destinationId}" per l'hotel ${seed.id}`);
  }
  return {
    id: seed.id,
    name: seed.name,
    destinationId: seed.destinationId,
    stars: 5,
    guestRating: seed.guestRating,
    reviewCount: seed.reviewCount,
    amenities: seed.amenities,
    priceProfile: buildPriceProfile(seed.basePrice, destination),
    ...(seed.website ? { website: seed.website } : {}),
  } satisfies Hotel;
});

export const sampleHotelsByDestination = new Map<string, Hotel[]>();
for (const hotel of sampleHotels) {
  const list = sampleHotelsByDestination.get(hotel.destinationId) ?? [];
  list.push(hotel);
  sampleHotelsByDestination.set(hotel.destinationId, list);
}
