import { config } from './config.js';
import { buildApp } from './app.js';

const app = await buildApp();

const status = await app.provider.isReady();
if (!status.ready) {
  app.server.log.warn(
    `Provider "${app.provider.name}" non pronto: ${status.reason ?? 'motivo sconosciuto'}`,
  );
} else if (status.reason) {
  app.server.log.info(status.reason);
}

await app.server.listen({ port: config.port, host: config.host });
app.server.log.info(`fiveish in ascolto su http://localhost:${config.port}`);

if (config.scan.onBoot) {
  // Non blocca l'avvio: la UI e' subito raggiungibile, le offerte arrivano appena pronte.
  void app.runScan().catch((error) => app.server.log.error(error));
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.stopScheduler();
    app.store.flush();
    void app.server.close().then(() => process.exit(0));
  });
}
