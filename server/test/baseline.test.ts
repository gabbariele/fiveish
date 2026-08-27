import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { PriceIndex } from '../src/deals/baseline.js';
import { makeHotel, makeOffer, tempStore, testDestination } from './helpers.js';

const { store, cleanup } = tempStore();
after(cleanup);

describe('prezzo di riferimento', () => {
  it('usa lo storico quando ha abbastanza rilevazioni', () => {
    const hotel = makeHotel({ id: 'con-storico' });
    const prices = [500, 520, 480, 510, 495, 505, 515, 490, 500, 5000];
    prices.forEach((price, i) => {
      // Date di arrivo diverse dentro lo stesso mese: e' cosi' che si accumula
      // lo storico, una notte alla volta.
      store.recordObservation(hotel.id, `2026-06-${String(i + 1).padStart(2, '0')}`, price);
    });
    const index = new PriceIndex(store);
    const baseline = index.baselineFor(hotel, testDestination, makeOffer({ hotelId: hotel.id }));

    assert.equal(baseline.method, 'storico');
    assert.equal(baseline.confidence, 'alta');
    // Il 5000 e' un errore di listino: la mediana troncata non deve seguirlo.
    assert.ok(baseline.nightly > 480 && baseline.nightly < 530, `mediana anomala: ${baseline.nightly}`);
  });

  it('ripiega sul profilo noto quando lo storico e vuoto', () => {
    const hotel = makeHotel({ id: 'solo-profilo' });
    const index = new PriceIndex(store);
    const baseline = index.baselineFor(hotel, testDestination, makeOffer({ hotelId: hotel.id }));
    assert.equal(baseline.method, 'profilo');
    assert.equal(baseline.nightly, 500);
  });

  it('ripiega sui concorrenti quando non sa nulla della struttura', () => {
    const hotel = makeHotel({ id: 'sconosciuto', priceProfile: undefined });
    const index = new PriceIndex(store);
    for (const [i, price] of [400, 450, 500, 550].entries()) {
      const peer = makeHotel({ id: `peer-${i}` });
      index.observe(peer, testDestination, makeOffer({ hotelId: peer.id, nightlyPrice: price }));
    }
    const baseline = index.baselineFor(hotel, testDestination, makeOffer({ hotelId: hotel.id }));
    assert.equal(baseline.method, 'concorrenti');
    assert.equal(baseline.confidence, 'bassa');
    assert.ok(baseline.nightly > 400 && baseline.nightly < 600);
  });

  it('non produce sconto quando non ha alcun riferimento', () => {
    const hotel = makeHotel({ id: 'isolato', priceProfile: undefined });
    const index = new PriceIndex(store);
    const offer = makeOffer({ hotelId: hotel.id, nightlyPrice: 333 });
    const baseline = index.baselineFor(hotel, testDestination, offer);
    assert.equal(baseline.nightly, 333, 'senza dati il riferimento e il prezzo stesso');
  });

  it('tiene conto del posizionamento quando confronta con i concorrenti', () => {
    const index = new PriceIndex(store);
    for (const [i, price] of [400, 450, 500, 550].entries()) {
      const peer = makeHotel({ id: `p2-${i}`, guestRating: 9.0 });
      index.observe(peer, testDestination, makeOffer({ hotelId: peer.id, nightlyPrice: price }));
    }
    const eccellente = makeHotel({ id: 'top', guestRating: 9.8, priceProfile: undefined });
    const modesto = makeHotel({ id: 'base', guestRating: 8.4, priceProfile: undefined });
    const a = index.baselineFor(eccellente, testDestination, makeOffer({ hotelId: 'top' }));
    const b = index.baselineFor(modesto, testDestination, makeOffer({ hotelId: 'base' }));
    assert.ok(a.nightly > b.nightly, 'la struttura piu amata ha un riferimento piu alto');
  });

  it('conosce il minimo mai visto, ma solo con rilevazioni sufficienti', () => {
    const index = new PriceIndex(store);
    assert.equal(index.historicalLow('mai-visto', '06'), 0);
    [300, 250, 400].forEach((price, i) => {
      store.recordObservation('con-minimo', `2026-06-2${i}`, price);
    });
    assert.equal(new PriceIndex(store).historicalLow('con-minimo', '06'), 250);
  });

  it('colloca il prezzo dentro il mercato locale', () => {
    const index = new PriceIndex(store);
    for (const [i, price] of [200, 400, 600, 800].entries()) {
      const peer = makeHotel({ id: `p3-${i}` });
      index.observe(peer, testDestination, makeOffer({ hotelId: peer.id, nightlyPrice: price }));
    }
    assert.equal(index.peerRank(testDestination.id, '06', 150), 0);
    assert.equal(index.peerRank(testDestination.id, '06', 900), 1);
    assert.equal(index.peerRank(testDestination.id, '06', 500), 0.5);
  });
});
