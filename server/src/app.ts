import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { deliverAlerts } from './alerts/notify.js';
import { config } from './config.js';
import { createProvider } from './providers/index.js';
import { registerApi } from './routes/api.js';
import { Scanner } from './scan/scanner.js';
import { Store } from './store/store.js';
import type { PriceProvider, ScanSummary } from './types.js';

export interface App {
  server: FastifyInstance;
  store: Store;
  scanner: Scanner;
  provider: PriceProvider;
  runScan: () => Promise<{ started: boolean; summary?: ScanSummary }>;
  stopScheduler: () => void;
}

export interface BuildOptions {
  provider?: PriceProvider;
  dataDir?: string;
  /** Spegne il log. Lo usano i test, che non devono dipendere dall'ambiente. */
  quiet?: boolean;
}

export async function buildApp(options: BuildOptions = {}): Promise<App> {
  const provider = options.provider ?? createProvider();
  const store = new Store(options.dataDir ?? config.dataDir);
  const scanner = new Scanner(provider, store);

  const server = Fastify({
    logger: {
      level: options.quiet ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
      transport: process.stdout.isTTY
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
    },
  });

  await server.register(cors, {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
  });

  let scanning = false;
  const runScan = async (): Promise<{ started: boolean; summary?: ScanSummary }> => {
    if (scanning) return { started: false };
    scanning = true;
    try {
      server.log.info(`Scansione avviata (provider: ${provider.name})`);
      const { summary, newDeals } = await scanner.run();
      server.log.info(
        `Scansione conclusa in ${(summary.durationMs / 1000).toFixed(1)}s: ${summary.dealsFound} offerte (${summary.newDeals} nuove) su ${summary.offersSeen} tariffe viste`,
      );
      if (summary.errors.length > 0) {
        server.log.warn(`${summary.errors.length} query in errore, es.: ${summary.errors[0]}`);
      }
      await deliverAlerts(store, newDeals, (m) => server.log.info(m));
      return { started: true, summary };
    } finally {
      scanning = false;
    }
  };

  await registerApi(server, {
    store,
    scanner,
    providerName: provider.name,
    providerStatus: () => provider.isReady(),
    runScan,
  });

  // La UI compilata, quando c'e'. In sviluppo la serve Vite sulla 5173.
  if (existsSync(join(config.webDist, 'index.html'))) {
    await server.register(fastifyStatic, { root: config.webDist });
    server.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.code(404).send({ error: 'Endpoint inesistente' });
      }
      return reply.sendFile('index.html');
    });
  }

  let timer: NodeJS.Timeout | undefined;
  if (config.scan.intervalMinutes > 0) {
    timer = setInterval(() => {
      void runScan().catch((error) => server.log.error(error));
    }, config.scan.intervalMinutes * 60_000);
    timer.unref?.();
  }

  return {
    server,
    store,
    scanner,
    provider,
    runScan,
    stopScheduler: () => {
      if (timer) clearInterval(timer);
    },
  };
}
