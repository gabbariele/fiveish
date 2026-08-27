import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Gemini, GeminiUnavailable } from '../src/ai/gemini.js';
import { parseQuery, sanitize } from '../src/search/parse.js';

const NOW = new Date('2026-05-01T00:00:00.000Z');

/** Finto client Gemini: restituisce quello che gli si dice, o esplode. */
function stubGemini(answer: unknown | Error): Gemini {
  const client = new Gemini('chiave-finta', 'modello-finto');
  client.generateJson = async () => {
    if (answer instanceof Error) throw answer;
    return answer as never;
  };
  return client;
}

describe('validazione dell uscita del modello', () => {
  it('accetta i valori che esistono davvero nel catalogo', () => {
    const clean = sanitize(
      {
        destinationId: 'capri',
        region: 'Toscana',
        kind: 'mare',
        maxNightly: 450,
        refundableOnly: true,
        sort: 'prezzo',
        from: '2026-07-01',
        to: '2026-07-31',
      },
      NOW,
    );
    assert.deepEqual(clean, {
      destinationId: 'capri',
      region: 'Toscana',
      kind: 'mare',
      maxNightly: 450,
      refundableOnly: true,
      sort: 'prezzo',
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('scarta destinazioni, regioni e categorie inventate', () => {
    const clean = sanitize(
      { destinationId: 'montecarlo', region: 'Provenza', kind: 'deserto', sort: 'a-caso' },
      NOW,
    );
    assert.deepEqual(clean, {});
  });

  it('rifiuta le date passate e le finestre al contrario', () => {
    assert.equal(sanitize({ from: '2020-01-01' }, NOW).from, undefined);
    const rovesciata = sanitize({ from: '2026-08-01', to: '2026-06-01' }, NOW);
    assert.equal(rovesciata.from, '2026-08-01');
    assert.equal(rovesciata.to, undefined);
  });

  it('non lascia che il modello abbassi la soglia del motore', () => {
    assert.equal(sanitize({ minScore: 10 }, NOW).minScore, undefined);
    assert.equal(sanitize({ minScore: 90 }, NOW).minScore, 90);
  });

  it('rifiuta prezzi e durate fuori scala', () => {
    assert.equal(sanitize({ maxNightly: 3 }, NOW).maxNightly, undefined);
    assert.equal(sanitize({ maxNightly: 99999 }, NOW).maxNightly, undefined);
    assert.equal(sanitize({ minNights: 400 }, NOW).minNights, undefined);
  });

  it('scarta una durata minima piu grande della massima', () => {
    const clean = sanitize({ minNights: 7, maxNights: 2 }, NOW);
    assert.equal(clean.minNights, 7);
    assert.equal(clean.maxNights, undefined);
  });
});

describe('interpretazione della richiesta', () => {
  it('usa le regole quando Gemini non e configurato', async () => {
    const parsed = await parseQuery('un weekend a Capri sotto i 500', {
      now: NOW,
      gemini: new Gemini('', 'modello-finto'),
    });
    assert.equal(parsed.source, 'regole');
    assert.equal(parsed.filters.destinationId, 'capri');
    assert.equal(parsed.filters.maxNightly, 500);
    assert.ok(parsed.interpretazione.length > 0);
  });

  it('sovrappone la lettura del modello a quella delle regole', async () => {
    const parsed = await parseQuery('qualcosa di bello vicino a Milano in autunno', {
      now: NOW,
      gemini: stubGemini({
        destinationId: 'lago-di-como',
        from: '2026-10-01',
        to: '2026-11-30',
        interpretazione: 'Lago di Como in autunno',
      }),
    });
    assert.equal(parsed.source, 'gemini');
    assert.equal(parsed.filters.destinationId, 'lago-di-como');
    assert.equal(parsed.filters.from, '2026-10-01');
    assert.equal(parsed.interpretazione, 'Lago di Como in autunno');
  });

  it('tiene i filtri delle regole sui campi che il modello lascia vuoti', async () => {
    const parsed = await parseQuery('un weekend a Capri sotto i 500', {
      now: NOW,
      gemini: stubGemini({ kind: 'mare', interpretazione: 'Mare' }),
    });
    assert.equal(parsed.filters.destinationId, 'capri', 'la regola non deve andare persa');
    assert.equal(parsed.filters.maxNightly, 500);
    assert.equal(parsed.filters.kind, 'mare');
  });

  it('ignora un modello che risponde con sciocchezze', async () => {
    const parsed = await parseQuery('tre notti a Roma', {
      now: NOW,
      gemini: stubGemini({ destinationId: 'atlantide', maxNightly: -5, interpretazione: 'Roma' }),
    });
    assert.equal(parsed.filters.destinationId, 'roma');
    assert.equal(parsed.filters.maxNightly, undefined);
  });

  it('prosegue a regole quando il modello non risponde', async () => {
    const parsed = await parseQuery('un weekend a Capri sotto i 500', {
      now: NOW,
      gemini: stubGemini(new GeminiUnavailable('timeout')),
    });
    assert.equal(parsed.source, 'regole');
    assert.equal(parsed.filters.destinationId, 'capri');
    assert.match(parsed.avviso ?? '', /timeout/);
  });
});
