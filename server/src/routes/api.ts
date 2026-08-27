import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { deliverAlerts } from '../alerts/notify.js';
import { config } from '../config.js';
import { destinations, regions } from '../data/destinations.js';
import { applyFilters, parseFilters } from '../deals/filter.js';
import type { Scanner } from '../scan/scanner.js';
import type { Store } from '../store/store.js';
import { dealKey } from '../store/store.js';
import type { Deal, DealFilters, Watch } from '../types.js';

export interface ApiContext {
  store: Store;
  scanner: Scanner;
  providerName: string;
  providerStatus: () => Promise<{ ready: boolean; reason?: string }>;
  /** Avvia una scansione garantendo che non ne giri piu' di una alla volta. */
  runScan: () => Promise<{ started: boolean; summary?: unknown }>;
}

function idOf(deal: Deal): string {
  return dealKey(deal.hotel.id, deal.offer.checkIn, deal.offer.checkOut);
}

export async function registerApi(app: FastifyInstance, ctx: ApiContext): Promise<void> {
  app.get('/api/health', async () => {
    const status = await ctx.providerStatus();
    return {
      ok: true,
      provider: { name: ctx.providerName, ...status },
      soglie: {
        punteggioMinimo: config.deals.minScore,
        scontoMinimo: config.deals.minDiscount,
        prezzoMassimoNotte: config.deals.maxNightlyPrice,
      },
      scansione: {
        intervalloMinuti: config.scan.intervalMinutes,
        ultima: ctx.store.getLastScan() ?? null,
      },
      offerteInMemoria: ctx.store.getDeals().length,
      rilevazioniStorico: ctx.store.historySize(),
      avvisiAttivi: ctx.store.getWatches().length,
    };
  });

  app.get('/api/destinations', async () => ({
    destinations,
    regions,
    kinds: ['citta', 'mare', 'montagna', 'lago', 'borgo'],
  }));

  app.get('/api/deals', async (request) => {
    const filters = parseFilters(request.query as Record<string, unknown>);
    const all = ctx.store.getDeals();
    const filtered = applyFilters(all, filters);
    return {
      total: all.length,
      count: filtered.length,
      filters,
      lastScan: ctx.store.getLastScan() ?? null,
      deals: filtered.map((deal) => ({ id: idOf(deal), ...deal })),
    };
  });

  app.get<{ Params: { id: string } }>('/api/deals/:id', async (request, reply) => {
    const id = decodeURIComponent(request.params.id);
    const deal = ctx.store.getDeals().find((d) => idOf(d) === id);
    if (!deal) return reply.code(404).send({ error: 'Offerta non trovata o non piu disponibile' });
    return { id, ...deal };
  });

  /** Numeri d'insieme per la testata della UI. */
  app.get('/api/stats', async () => {
    const deals = ctx.store.getDeals();
    if (deals.length === 0) {
      return { deals: 0, risparmioTotale: 0, scontoMedio: 0, perRegione: [], migliore: null };
    }
    const perRegione = new Map<string, number>();
    let savings = 0;
    let discount = 0;
    for (const deal of deals) {
      perRegione.set(deal.destination.region, (perRegione.get(deal.destination.region) ?? 0) + 1);
      savings += deal.savings;
      discount += deal.discountPct;
    }
    const best = deals.reduce((a, b) => (b.score > a.score ? b : a));
    return {
      deals: deals.length,
      risparmioTotale: Math.round(savings),
      scontoMedio: discount / deals.length,
      perRegione: [...perRegione.entries()]
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count),
      migliore: { id: idOf(best), ...best },
    };
  });

  app.post('/api/scan', async (_request, reply) => {
    const result = await ctx.runScan();
    if (!result.started) {
      return reply.code(409).send({ error: 'Una scansione e gia in corso' });
    }
    return result.summary;
  });

  // --- Avvisi salvati ---

  app.get('/api/watches', async () => ({ watches: ctx.store.getWatches() }));

  app.post<{ Body: { label?: string; filters?: DealFilters } }>('/api/watches', async (request, reply) => {
    const body = request.body ?? {};
    const label = (body.label ?? '').trim();
    if (!label) return reply.code(400).send({ error: 'Serve un nome per l avviso' });

    const watch: Watch = {
      id: randomUUID(),
      label: label.slice(0, 80),
      filters: body.filters ?? {},
      createdAt: new Date().toISOString(),
      notifiedDealIds: [],
    };
    ctx.store.addWatch(watch);
    return reply.code(201).send(watch);
  });

  app.delete<{ Params: { id: string } }>('/api/watches/:id', async (request, reply) => {
    const removed = ctx.store.removeWatch(request.params.id);
    if (!removed) return reply.code(404).send({ error: 'Avviso non trovato' });
    return { ok: true };
  });

  /** Rilancia gli avvisi sulle offerte attuali, senza aspettare la prossima scansione. */
  app.post('/api/watches/test', async () => {
    const deliveries = await deliverAlerts(ctx.store, ctx.store.getDeals(), (m) => app.log.info(m));
    return { deliveries: deliveries.map((d) => ({ ...d, deals: d.deals.length })) };
  });
}
