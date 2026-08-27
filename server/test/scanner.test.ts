import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { getDestination } from '../src/data/destinations.js';
import { SampleProvider } from '../src/providers/sample.js';
import { Scanner } from '../src/scan/scanner.js';
import { buildWindows } from '../src/scan/windows.js';
import { tempStore } from './helpers.js';

const { store, cleanup } = tempStore();
after(cleanup);

const firenze = getDestination('firenze');
assert.ok(firenze, 'la destinazione di prova deve esistere');

const NOW = new Date('2026-05-01T00:00:00.000Z');
const windows = buildWindows({ now: NOW, count: 6, horizonDays: 120 });

describe('scansione', () => {
  it('promuove solo una minoranza delle tariffe viste', async () => {
    const scanner = new Scanner(new SampleProvider(), store);
    const { summary, deals } = await scanner.run({ destinations: [firenze], windows, now: NOW });

    assert.ok(summary.offersSeen > 20, 'il provider deve restituire abbastanza tariffe');
    assert.ok(deals.length > 0, 'qualche occasione ci deve essere');
    assert.ok(
      deals.length < summary.offersSeen / 4,
      `selezione troppo generosa: ${deals.length} su ${summary.offersSeen}`,
    );
    assert.equal(summary.newDeals, deals.length, 'alla prima passata e tutto nuovo');
  });

  it('non misura lo sconto contro i prezzi della scansione stessa', async () => {
    const { store: fresh, cleanup: cleanFresh } = tempStore();
    try {
      const scanner = new Scanner(new SampleProvider(), fresh);
      const { deals } = await scanner.run({ destinations: [firenze], windows, now: NOW });

      for (const deal of deals) {
        assert.equal(
          deal.baseline.method,
          'profilo',
          `il riferimento di ${deal.hotel.name} si e contaminato con i prezzi appena visti`,
        );
      }
      // Le rilevazioni vengono comunque salvate, ma dopo il giudizio.
      assert.ok(fresh.historySize() > 0, 'lo storico deve crescere a fine scansione');
    } finally {
      cleanFresh();
    }
  });

  it('tiene la tariffa migliore quando lo stesso hotel ha piu varianti', async () => {
    const { store: fresh, cleanup: cleanFresh } = tempStore();
    try {
      const scanner = new Scanner(new SampleProvider(), fresh);
      const { deals } = await scanner.run({ destinations: [firenze], windows, now: NOW });
      const keys = deals.map((d) => `${d.hotel.id}|${d.offer.checkIn}|${d.offer.checkOut}`);
      assert.equal(new Set(keys).size, keys.length, 'una sola offerta per hotel e finestra');
    } finally {
      cleanFresh();
    }
  });

  it('registra gli errori del provider senza fermare la scansione', async () => {
    const rotto = new SampleProvider();
    let chiamate = 0;
    rotto.search = async (query) => {
      chiamate += 1;
      if (chiamate === 1) throw new Error('provider non raggiungibile');
      return new SampleProvider().search(query);
    };

    const { store: fresh, cleanup: cleanFresh } = tempStore();
    try {
      const { summary } = await new Scanner(rotto, fresh).run({
        destinations: [firenze],
        windows,
        now: NOW,
      });
      assert.equal(summary.errors.length, 1);
      assert.match(summary.errors[0] ?? '', /non raggiungibile/);
      assert.ok(summary.offersSeen > 0, 'le altre finestre devono essere state interrogate');
    } finally {
      cleanFresh();
    }
  });
});
