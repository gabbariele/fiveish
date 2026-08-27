import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Store, dealKey } from '../src/store/store.js';
import { tempStore } from './helpers.js';

const { store, dir, cleanup } = tempStore();
after(cleanup);

describe('storico prezzi', () => {
  it('non conta due volte la stessa notte riscansionata', () => {
    for (let i = 0; i < 10; i += 1) {
      store.recordObservation('hotel-a', '2026-06-12', 400 + i);
    }
    assert.deepEqual(store.observations('hotel-a', '06'), [409], 'una notte, una rilevazione');
    assert.equal(store.historySize(), 1);
  });

  it('tiene separate le notti diverse e i mesi diversi', () => {
    store.recordObservation('hotel-b', '2026-06-12', 300);
    store.recordObservation('hotel-b', '2026-06-19', 350);
    store.recordObservation('hotel-b', '2026-07-03', 800);
    assert.deepEqual(store.observations('hotel-b', '06').sort((a, b) => a - b), [300, 350]);
    assert.deepEqual(store.observations('hotel-b', '07'), [800]);
    assert.equal(store.allObservations('hotel-b').length, 3);
  });

  it('ignora i prezzi assurdi', () => {
    store.recordObservation('hotel-c', '2026-06-12', 0);
    store.recordObservation('hotel-c', '2026-06-13', -50);
    store.recordObservation('hotel-c', '2026-06-14', Number.NaN);
    assert.equal(store.allObservations('hotel-c').length, 0);
  });

  it('ricorda quando ha visto un offerta la prima volta', () => {
    const key = dealKey('hotel-d', '2026-06-12', '2026-06-14');
    assert.equal(store.isKnown(key), false);
    const first = store.markFirstSeen(key, '2026-05-01T00:00:00.000Z');
    assert.equal(store.isKnown(key), true);
    const second = store.markFirstSeen(key, '2026-05-09T00:00:00.000Z');
    assert.equal(second, first, 'la prima volta resta la prima volta');
  });

  it('sopravvive a un riavvio', () => {
    store.recordObservation('hotel-e', '2026-06-12', 275);
    store.addWatch({
      id: 'w1',
      label: 'Prova',
      filters: { region: 'Toscana' },
      createdAt: '2026-05-01T00:00:00.000Z',
      notifiedDealIds: [],
    });
    store.flush();

    // Un secondo Store sulla stessa cartella deve rileggere tutto da disco.
    const riaperto = new Store(dir);
    assert.deepEqual(riaperto.observations('hotel-e', '06'), [275]);
    assert.equal(riaperto.getWatches().length, 1);
    assert.equal(riaperto.getWatches()[0]?.label, 'Prova');
  });
});
