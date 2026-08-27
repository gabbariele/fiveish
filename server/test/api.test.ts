import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { buildApp, type App } from '../src/app.js';
import { config } from '../src/config.js';
import { destinations } from '../src/data/destinations.js';
import { SampleProvider } from '../src/providers/sample.js';
import type { Deal, ScanSummary } from '../src/types.js';

let app: App;
let dir: string;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'fiveish-api-'));
  app = await buildApp({ provider: new SampleProvider(), dataDir: dir });
  await app.server.ready();
});

after(async () => {
  app.stopScheduler();
  await app.server.close();
  rmSync(dir, { recursive: true, force: true });
});

const json = async <T>(url: string, method = 'GET', payload?: unknown): Promise<T> => {
  const response = await app.server.inject({
    method: method as 'GET',
    url,
    ...(payload !== undefined ? { payload } : {}),
  });
  return response.json() as T;
};

describe('API', () => {
  it('espone lo stato del sistema', async () => {
    const health = await json<{ ok: boolean; provider: { name: string; ready: boolean } }>(
      '/api/health',
    );
    assert.equal(health.ok, true);
    assert.equal(health.provider.name, 'sample');
    assert.equal(health.provider.ready, true);
  });

  it('elenca tutte le destinazioni italiane coperte', async () => {
    const body = await json<{ destinations: unknown[]; regions: string[] }>('/api/destinations');
    assert.equal(body.destinations.length, destinations.length);
    assert.ok(body.regions.includes('Toscana'));
  });

  it('esegue una scansione e trova occasioni', async () => {
    const summary = await json<ScanSummary>('/api/scan', 'POST');
    assert.ok(summary.offersSeen > 100, 'la scansione deve esaminare molte tariffe');
    assert.ok(summary.dealsFound > 0, 'con questo dataset qualche occasione ci deve essere');
    // Il punto del prodotto: quasi tutto viene scartato.
    assert.ok(
      summary.dealsFound < summary.offersSeen * 0.15,
      `troppe offerte promosse: ${summary.dealsFound}/${summary.offersSeen}`,
    );
    assert.deepEqual(summary.errors, []);
  });

  it('pubblica solo hotel a 5 stelle sopra le soglie', async () => {
    const body = await json<{ deals: Deal[]; total: number }>('/api/deals');
    assert.ok(body.deals.length > 0);
    for (const deal of body.deals) {
      assert.equal(deal.hotel.stars, 5, `${deal.hotel.name} non e un 5 stelle`);
      assert.ok(deal.score >= config.deals.minScore, `punteggio troppo basso: ${deal.score}`);
      assert.ok(deal.discountPct >= config.deals.minDiscount, 'sconto sotto la soglia');
      assert.ok(deal.offer.nightlyPrice <= config.deals.maxNightlyPrice);
      assert.ok(deal.reasons.length > 0, 'ogni offerta deve spiegarsi');
      assert.ok(deal.savings > 0);
    }
  });

  it('ordina per punteggio decrescente', async () => {
    const body = await json<{ deals: Deal[] }>('/api/deals');
    const scores = body.deals.map((d) => d.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  });

  it('applica i filtri passati in query string', async () => {
    const all = await json<{ deals: Deal[] }>('/api/deals');
    const cap = 400;
    const filtered = await json<{ deals: Deal[] }>(`/api/deals?maxNightly=${cap}&sort=prezzo`);
    assert.ok(filtered.deals.length <= all.deals.length);
    for (const deal of filtered.deals) assert.ok(deal.offer.nightlyPrice <= cap);

    const prices = filtered.deals.map((d) => d.offer.nightlyPrice);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  it('restituisce il dettaglio di una singola offerta', async () => {
    const body = await json<{ deals: Deal[] }>('/api/deals?limit=1');
    const first = body.deals[0];
    assert.ok(first);
    const detail = await json<Deal>(`/api/deals/${encodeURIComponent(first.id)}`);
    assert.equal(detail.hotel.name, first.hotel.name);

    const missing = await app.server.inject({ method: 'GET', url: '/api/deals/non-esiste' });
    assert.equal(missing.statusCode, 404);
  });

  it('riassume i numeri per la testata', async () => {
    const stats = await json<{ deals: number; risparmioTotale: number; perRegione: unknown[] }>(
      '/api/stats',
    );
    assert.ok(stats.deals > 0);
    assert.ok(stats.risparmioTotale > 0);
    assert.ok(stats.perRegione.length > 0);
  });

  it('gestisce il ciclo di vita degli avvisi', async () => {
    const created = await app.server.inject({
      method: 'POST',
      url: '/api/watches',
      payload: { label: 'Toscana economica', filters: { region: 'Toscana', maxNightly: 400 } },
    });
    assert.equal(created.statusCode, 201);
    const watch = created.json() as { id: string; label: string };
    assert.equal(watch.label, 'Toscana economica');

    const list = await json<{ watches: unknown[] }>('/api/watches');
    assert.equal(list.watches.length, 1);

    const removed = await app.server.inject({ method: 'DELETE', url: `/api/watches/${watch.id}` });
    assert.equal(removed.statusCode, 200);
    assert.equal((await json<{ watches: unknown[] }>('/api/watches')).watches.length, 0);
  });

  it('rifiuta un avviso senza nome', async () => {
    const response = await app.server.inject({
      method: 'POST',
      url: '/api/watches',
      payload: { filters: {} },
    });
    assert.equal(response.statusCode, 400);
  });

  it('cerca a frase libera e restituisce gia i risultati', async () => {
    const body = await json<{
      source: string;
      interpretazione: string;
      filters: { maxNightly?: number };
      deals: Deal[];
      total: number;
    }>('/api/search', 'POST', { text: 'qualcosa sotto i 400 euro a notte' });

    // Senza GEMINI_API_KEY nei test, l'interpretazione resta quella a regole.
    assert.equal(body.source, 'regole');
    assert.equal(body.filters.maxNightly, 400);
    assert.ok(body.interpretazione.length > 0);
    for (const deal of body.deals) assert.ok(deal.offer.nightlyPrice <= 400);
    assert.ok(body.deals.length <= body.total);
  });

  it('rifiuta una ricerca vuota o smisurata', async () => {
    const vuota = await app.server.inject({ method: 'POST', url: '/api/search', payload: { text: '  ' } });
    assert.equal(vuota.statusCode, 400);

    const lunga = await app.server.inject({
      method: 'POST',
      url: '/api/search',
      payload: { text: 'a'.repeat(501) },
    });
    assert.equal(lunga.statusCode, 400);
  });

  it('non mostra note sulle destinazioni quando l AI non e configurata', async () => {
    const mancante = await app.server.inject({
      method: 'GET',
      url: '/api/destinations/roma/note?month=11',
    });
    assert.equal(mancante.statusCode, 404);

    const meseAssurdo = await app.server.inject({
      method: 'GET',
      url: '/api/destinations/roma/note?month=13',
    });
    assert.equal(meseAssurdo.statusCode, 400);
  });

  it('dichiara lo stato delle funzioni assistite', async () => {
    const health = await json<{ ai: { ready: boolean; modello: string | null; note: number } }>(
      '/api/health',
    );
    assert.equal(health.ai.ready, false);
    assert.equal(health.ai.modello, null);
    assert.equal(health.ai.note, 0);
  });

  it('risponde 404 sugli endpoint inesistenti', async () => {
    const response = await app.server.inject({ method: 'GET', url: '/api/inventato' });
    assert.equal(response.statusCode, 404);
  });

  it('una seconda scansione non ripropone come nuovo cio che ha gia visto', async () => {
    const second = await json<ScanSummary>('/api/scan', 'POST');
    assert.ok(second.dealsFound > 0);
    // Qualche movimento e' fisiologico: dopo la prima passata il prezzo di
    // riferimento si appoggia allo storico appena raccolto e qualche offerta
    // entra o esce. Quello che non deve succedere e' che sia tutto "nuovo".
    assert.ok(
      second.newDeals <= second.dealsFound * 0.2,
      `troppe offerte segnalate come nuove: ${second.newDeals}/${second.dealsFound}`,
    );
  });
});
