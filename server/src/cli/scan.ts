/**
 * Scansione una tantum da riga di comando: utile in cron, in CI o per
 * riempire lo storico prima di avviare il server.
 *
 *   npm run scan            -> tutte le destinazioni
 *   npm run scan -- roma    -> solo Roma
 */
import { deliverAlerts } from '../alerts/notify.js';
import { config } from '../config.js';
import { destinations, getDestination } from '../data/destinations.js';
import { createProvider } from '../providers/index.js';
import { Scanner } from '../scan/scanner.js';
import { Store } from '../store/store.js';

const wanted = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const selected =
  wanted.length > 0
    ? wanted.map(getDestination).filter((d): d is NonNullable<typeof d> => d !== undefined)
    : destinations;

if (wanted.length > 0 && selected.length !== wanted.length) {
  const known = destinations.map((d) => d.id).join(', ');
  console.error(`Destinazione sconosciuta. Valori validi: ${known}`);
  process.exit(1);
}

const provider = createProvider();
const status = await provider.isReady();
if (!status.ready) {
  console.error(`Provider "${provider.name}" non utilizzabile: ${status.reason}`);
  process.exit(1);
}

const store = new Store(config.dataDir);
const scanner = new Scanner(provider, store);

console.log(`Scansione di ${selected.length} destinazioni con provider "${provider.name}"...`);
const { summary, deals, newDeals } = await scanner.run({ destinations: selected });

console.log(
  `\n${summary.offersSeen} tariffe viste su ${summary.hotelsSeen} hotel in ${(summary.durationMs / 1000).toFixed(1)}s`,
);
console.log(`${summary.dealsFound} super offerte (${summary.newDeals} mai viste prima)\n`);

for (const deal of deals.slice(0, 15)) {
  const price = Math.round(deal.offer.nightlyPrice).toLocaleString('it-IT');
  const discount = (deal.discountPct * 100).toFixed(0);
  console.log(
    `[${String(deal.score).padStart(3)}] ${deal.hotel.name} — ${deal.destination.name}\n` +
      `      ${deal.offer.checkIn} → ${deal.offer.checkOut} · ${price} €/notte · -${discount}% · risparmio ${deal.savings.toLocaleString('it-IT')} €\n` +
      `      ${deal.reasons[0] ?? ''}`,
  );
}

if (summary.errors.length > 0) {
  console.log(`\n${summary.errors.length} query in errore. Prima: ${summary.errors[0]}`);
}

await deliverAlerts(store, newDeals, (m) => console.log(`\n${m}`));
store.flush();
