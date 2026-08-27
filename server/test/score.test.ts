import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { PriceIndex } from '../src/deals/baseline.js';
import {
  absoluteScore,
  combine,
  conditionsScore,
  discountScore,
  evaluate,
  qualityScore,
  rarityScore,
} from '../src/deals/score.js';
import { NOW, makeHotel, makeOffer, tempStore, testDestination } from './helpers.js';

const { store, cleanup } = tempStore();
after(cleanup);

const index = (): PriceIndex => new PriceIndex(store);

describe('componenti del punteggio', () => {
  it('lo sconto cresce ma satura', () => {
    assert.ok(discountScore(0.05) < 1);
    assert.ok(discountScore(0.3) > discountScore(0.2));
    assert.ok(discountScore(0.6) > discountScore(0.5));
    assert.ok(discountScore(0.9) <= 100);
    // Oltre una certa soglia lo sconto in piu' aggiunge poco: la curva e' concava.
    assert.ok(discountScore(0.6) - discountScore(0.5) < discountScore(0.2) - discountScore(0.1));
  });

  it('premia chi costa meno degli altri della stessa piazza', () => {
    assert.equal(absoluteScore(0), 100);
    assert.equal(absoluteScore(1), 0);
    assert.ok(absoluteScore(0.1) > absoluteScore(0.5));
  });

  it('pesa il voto ospiti tenendo conto di quante recensioni ci sono', () => {
    const tante = qualityScore(9.5, 2000);
    const poche = qualityScore(9.5, 3);
    assert.ok(tante > poche, 'poche recensioni devono tirare il voto verso il centro');
    assert.ok(qualityScore(8.0, 2000) < qualityScore(9.0, 2000));
  });

  it('valorizza cancellazione gratuita e trattamento', () => {
    const base = conditionsScore(makeOffer({ refundable: false, board: 'solo-pernottamento' }));
    const pieno = conditionsScore(makeOffer({ refundable: true, board: 'pensione-completa' }));
    assert.ok(pieno > base);
    assert.ok(pieno <= 100);
  });

  it('segnala la rarita solo quando ce n e motivo', () => {
    assert.equal(rarityScore({ nightly: 200, historicalLow: 0, daysToCheckIn: 90 }), 0);
    assert.ok(
      rarityScore({ roomsLeft: 1, nightly: 150, historicalLow: 200, daysToCheckIn: 10 }) >= 90,
    );
  });

  it('la somma pesata resta nel range 0-100', () => {
    const pieno = combine({ sconto: 100, prezzoAssoluto: 100, qualita: 100, condizioni: 100, rarita: 100 });
    assert.equal(pieno, 100);
    assert.equal(combine({ sconto: 0, prezzoAssoluto: 0, qualita: 0, condizioni: 0, rarita: 0 }), 0);
  });
});

describe('selezione delle offerte', () => {
  it('accetta un 5 stelle molto scontato', () => {
    const hotel = makeHotel();
    const offer = makeOffer({ nightlyPrice: 240 });
    const { deal } = evaluate(offer, hotel, testDestination, index(), { now: NOW });
    assert.ok(deal, 'un 52% di sconto su un 5 stelle deve passare');
    assert.ok(deal.discountPct > 0.5);
    assert.equal(deal.baseline.nightly, 500);
    assert.ok(deal.reasons.length > 0);
  });

  it('scarta qualunque struttura che non sia 5 stelle', () => {
    const hotel = { ...makeHotel(), stars: 4 } as unknown as ReturnType<typeof makeHotel>;
    const { deal, rejectedFor } = evaluate(makeOffer({ nightlyPrice: 100 }), hotel, testDestination, index(), {
      now: NOW,
    });
    assert.equal(deal, null);
    assert.match(rejectedFor ?? '', /5 stelle/);
  });

  it('scarta uno sconto modesto per quanto costoso sia l hotel', () => {
    const { deal, rejectedFor } = evaluate(
      makeOffer({ nightlyPrice: 420 }),
      makeHotel(),
      testDestination,
      index(),
      { now: NOW },
    );
    assert.equal(deal, null);
    assert.match(rejectedFor ?? '', /sconto/);
  });

  it('rifiuta le tariffe oltre il tetto di prezzo anche se scontatissime', () => {
    const hotel = makeHotel({ priceProfile: { '06': 6000 } });
    const { deal, rejectedFor } = evaluate(
      makeOffer({ nightlyPrice: 1500 }),
      hotel,
      testDestination,
      index(),
      { now: NOW },
    );
    assert.equal(deal, null);
    assert.match(rejectedFor ?? '', /tetto/);
  });

  it('non inventa uno sconto quando non ha un riferimento', () => {
    const hotel = makeHotel({ priceProfile: undefined });
    const { deal } = evaluate(makeOffer({ nightlyPrice: 90 }), hotel, testDestination, index(), {
      now: NOW,
    });
    assert.equal(deal, null, 'senza prezzo di riferimento non si puo parlare di affare');
  });

  it('ignora il prezzo barrato dichiarato dal venditore', () => {
    const hotel = makeHotel();
    const conBarrato = makeOffer({ nightlyPrice: 240, advertisedBasePrice: 1400 });
    const senzaBarrato = makeOffer({ nightlyPrice: 240 });
    const a = evaluate(conBarrato, hotel, testDestination, index(), { now: NOW }).deal;
    const b = evaluate(senzaBarrato, hotel, testDestination, index(), { now: NOW }).deal;
    assert.ok(a && b);
    assert.equal(a.score, b.score, 'il prezzo barrato non deve spostare il punteggio');
    assert.equal(a.baseline.nightly, b.baseline.nightly);
    assert.ok(
      a.reasons.some((r) => r.includes('sconto dichiarato')),
      'ma va segnalato come gonfiato',
    );
  });

  it('calcola il risparmio sull intero soggiorno', () => {
    const { deal } = evaluate(
      makeOffer({ nightlyPrice: 240, nights: 3, checkOut: '2026-06-15' }),
      makeHotel(),
      testDestination,
      index(),
      { now: NOW },
    );
    assert.ok(deal);
    assert.equal(deal.savings, (500 - 240) * 3);
  });
});
