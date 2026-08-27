import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyFilters, parseFilters } from '../src/deals/filter.js';
import type { Deal } from '../src/types.js';
import { makeHotel, makeOffer, testDestination } from './helpers.js';

function deal(overrides: {
  score: number;
  nightly: number;
  discount: number;
  checkIn: string;
  region?: string;
  refundable?: boolean;
}): Deal {
  return {
    offer: makeOffer({
      nightlyPrice: overrides.nightly,
      checkIn: overrides.checkIn,
      refundable: overrides.refundable ?? true,
    }),
    hotel: makeHotel(),
    destination: { ...testDestination, region: overrides.region ?? 'Regione Test' },
    score: overrides.score,
    breakdown: { sconto: 0, prezzoAssoluto: 0, qualita: 0, condizioni: 0, rarita: 0 },
    baseline: { nightly: 500, method: 'profilo', confidence: 'media', samples: 0 },
    discountPct: overrides.discount,
    savings: 100,
    reasons: [],
    firstSeenAt: '2026-05-01T00:00:00.000Z',
  };
}

const deals: Deal[] = [
  deal({ score: 90, nightly: 400, discount: 0.4, checkIn: '2026-07-10' }),
  deal({ score: 75, nightly: 200, discount: 0.6, checkIn: '2026-06-05', region: 'Toscana' }),
  deal({ score: 80, nightly: 300, discount: 0.35, checkIn: '2026-08-20', refundable: false }),
];

describe('filtri', () => {
  it('ordina per punteggio come impostazione predefinita', () => {
    assert.deepEqual(applyFilters(deals, {}).map((d) => d.score), [90, 80, 75]);
  });

  it('ordina per prezzo, sconto e data', () => {
    assert.deepEqual(applyFilters(deals, { sort: 'prezzo' }).map((d) => d.offer.nightlyPrice), [200, 300, 400]);
    assert.deepEqual(applyFilters(deals, { sort: 'sconto' }).map((d) => d.discountPct), [0.6, 0.4, 0.35]);
    assert.deepEqual(applyFilters(deals, { sort: 'checkin' }).map((d) => d.offer.checkIn), [
      '2026-06-05',
      '2026-07-10',
      '2026-08-20',
    ]);
  });

  it('applica tetto di prezzo, punteggio minimo e regione', () => {
    assert.equal(applyFilters(deals, { maxNightly: 250 }).length, 1);
    assert.equal(applyFilters(deals, { minScore: 80 }).length, 2);
    assert.equal(applyFilters(deals, { region: 'Toscana' }).length, 1);
  });

  it('filtra per finestra di date e cancellazione gratuita', () => {
    assert.equal(applyFilters(deals, { from: '2026-07-01' }).length, 2);
    assert.equal(applyFilters(deals, { to: '2026-06-30' }).length, 1);
    assert.equal(applyFilters(deals, { refundableOnly: true }).length, 2);
  });

  it('rispetta il limite', () => {
    assert.equal(applyFilters(deals, { limit: 2 }).length, 2);
  });

  it('interpreta i parametri di query e ignora quelli senza senso', () => {
    const filters = parseFilters({
      region: 'Lazio',
      maxNightly: '350',
      refundableOnly: 'true',
      sort: 'prezzo',
      kind: 'mare',
      destinationId: '',
      minScore: 'abc',
    });
    assert.deepEqual(filters, {
      region: 'Lazio',
      maxNightly: 350,
      refundableOnly: true,
      sort: 'prezzo',
      kind: 'mare',
    });
  });

  it('scarta valori di ordinamento e categoria non ammessi', () => {
    const filters = parseFilters({ sort: 'a-caso', kind: 'deserto' });
    assert.equal(filters.sort, undefined);
    assert.equal(filters.kind, undefined);
  });
});
