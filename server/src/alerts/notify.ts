import { config } from '../config.js';
import { applyFilters } from '../deals/filter.js';
import type { Store } from '../store/store.js';
import { dealKey } from '../store/store.js';
import type { Deal, Watch } from '../types.js';

export interface AlertDelivery {
  watchId: string;
  label: string;
  deals: Deal[];
  delivered: boolean;
  error?: string;
}

function line(deal: Deal): string {
  const price = Math.round(deal.offer.nightlyPrice).toLocaleString('it-IT');
  const discount = Math.round(deal.discountPct * 100);
  return `• ${deal.hotel.name} — ${deal.destination.name} · ${deal.offer.checkIn} → ${deal.offer.checkOut} · ${price} €/notte (-${discount}%, punteggio ${deal.score})`;
}

export function formatAlert(watch: Watch, deals: Deal[]): string {
  const head = `fiveish — ${deals.length} nuova/e super offerta/e per "${watch.label}"`;
  return [head, ...deals.slice(0, 10).map(line)].join('\n');
}

/**
 * Recapita gli avvisi. Il webhook e' volutamente generico (`{ text }`):
 * funziona con Slack, Mattermost, n8n, Zapier e qualunque endpoint proprio.
 * Senza webhook configurato, l'avviso resta comunque registrato nell'app.
 */
export async function deliverAlerts(
  store: Store,
  newDeals: Deal[],
  log: (message: string) => void = () => {},
): Promise<AlertDelivery[]> {
  const deliveries: AlertDelivery[] = [];
  if (newDeals.length === 0) return deliveries;

  for (const watch of store.getWatches()) {
    const matching = applyFilters(newDeals, watch.filters).filter(
      (deal) => !watch.notifiedDealIds.includes(keyOf(deal)),
    );
    if (matching.length === 0) continue;

    const delivery: AlertDelivery = {
      watchId: watch.id,
      label: watch.label,
      deals: matching,
      delivered: false,
    };

    if (config.alerts.webhookUrl) {
      try {
        const response = await fetch(config.alerts.webhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: formatAlert(watch, matching) }),
        });
        delivery.delivered = response.ok;
        if (!response.ok) delivery.error = `HTTP ${response.status}`;
      } catch (error) {
        delivery.error = error instanceof Error ? error.message : String(error);
      }
    } else {
      log(formatAlert(watch, matching));
      delivery.delivered = true;
    }

    // Ricordiamo cosa e' gia' stato segnalato: nessuno vuole lo stesso avviso due volte.
    const ids = [...watch.notifiedDealIds, ...matching.map(keyOf)];
    store.updateWatch(watch.id, {
      notifiedDealIds: ids.slice(-500),
      lastNotifiedAt: new Date().toISOString(),
    });
    deliveries.push(delivery);
  }

  return deliveries;
}

function keyOf(deal: Deal): string {
  return dealKey(deal.hotel.id, deal.offer.checkIn, deal.offer.checkOut);
}
