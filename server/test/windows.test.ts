import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildWindows } from '../src/scan/windows.js';

const NOW = new Date('2026-05-01T00:00:00.000Z');

describe('finestre di ricerca', () => {
  it('genera finestre distinte dentro l orizzonte richiesto', () => {
    const windows = buildWindows({ now: NOW, count: 6, horizonDays: 120 });
    assert.ok(windows.length >= 5);
    const keys = new Set(windows.map((w) => `${w.checkIn}|${w.checkOut}`));
    assert.equal(keys.size, windows.length, 'nessuna finestra duplicata');

    for (const window of windows) {
      assert.ok(window.checkIn > '2026-05-01', 'sempre nel futuro');
      assert.ok(window.checkIn < '2026-09-10', 'entro l orizzonte, con un margine');
      assert.ok(window.checkOut > window.checkIn);
    }
  });

  it('alterna weekend, pause infrasettimanali e settimane piene', () => {
    const windows = buildWindows({ now: NOW, count: 6, horizonDays: 180 });
    const durate = new Set(
      windows.map(
        (w) =>
          (Date.parse(`${w.checkOut}T12:00:00Z`) - Date.parse(`${w.checkIn}T12:00:00Z`)) /
          86_400_000,
      ),
    );
    assert.deepEqual([...durate].sort((a, b) => a - b), [2, 3, 7]);
  });

  it('non guarda mai a ridosso di oggi', () => {
    const windows = buildWindows({ now: NOW, count: 12, horizonDays: 30 });
    for (const window of windows) {
      const days = (Date.parse(`${window.checkIn}T12:00:00Z`) - NOW.getTime()) / 86_400_000;
      assert.ok(days >= 3, `finestra troppo vicina: ${window.checkIn}`);
    }
  });
});
