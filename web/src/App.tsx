import { useCallback, useEffect, useMemo, useState } from 'react';
import { DealCard } from './components/DealCard';
import { DealDrawer } from './components/DealDrawer';
import { FilterBar } from './components/FilterBar';
import { Masthead } from './components/Masthead';
import { WatchPanel } from './components/WatchPanel';
import { api } from './lib/api';
import type { Deal, DestinationsResponse, Filters, Health, Stats, Watch } from './lib/types';

/** Un'offerta e' "nuova" se l'abbiamo vista per la prima volta nelle ultime 24 ore. */
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [catalog, setCatalog] = useState<DestinationsResponse | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [filters, setFilters] = useState<Filters>({ sort: 'score' });
  const [selected, setSelected] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeals = useCallback(async (current: Filters) => {
    const response = await api.deals(current);
    setDeals(response.deals);
    setTotal(response.total);
  }, []);

  const loadSidecars = useCallback(async () => {
    const [nextHealth, nextStats, nextWatches] = await Promise.all([
      api.health(),
      api.stats(),
      api.watches(),
    ]);
    setHealth(nextHealth);
    setStats(nextStats);
    setWatches(nextWatches.watches);
  }, []);

  // Primo caricamento: catalogo delle mete piu' tutto il resto.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const destinations = await api.destinations();
        if (cancelled) return;
        setCatalog(destinations);
        await Promise.all([loadDeals({ sort: 'score' }), loadSidecars()]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDeals, loadSidecars]);

  // Ogni cambio di filtro rilegge dal server: e' lui a conoscere tutte le offerte.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        await loadDeals(filters);
        if (!cancelled) setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, loading]);

  const updateFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      for (const key of Object.keys(next) as Array<keyof Filters>) {
        if (next[key] === undefined) delete next[key];
      }
      return next;
    });
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      await api.scan();
      await Promise.all([loadDeals(filters), loadSidecars()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }, [filters, loadDeals, loadSidecars]);

  const createWatch = useCallback(
    async (label: string) => {
      await api.addWatch(label, filters);
      const next = await api.watches();
      setWatches(next.watches);
    },
    [filters],
  );

  const removeWatch = useCallback(async (id: string) => {
    await api.removeWatch(id);
    const next = await api.watches();
    setWatches(next.watches);
  }, []);

  const freshIds = useMemo(() => {
    const cutoff = Date.now() - NEW_WINDOW_MS;
    return new Set(deals.filter((d) => new Date(d.firstSeenAt).getTime() > cutoff).map((d) => d.id));
  }, [deals]);

  const minScoreFloor = health?.soglie.punteggioMinimo ?? 72;
  const neverScanned = health?.scansione.ultima === null;

  return (
    <div className="app">
      <Masthead health={health} stats={stats} scanning={scanning} onScan={() => void runScan()} />

      <FilterBar
        filters={filters}
        onChange={updateFilters}
        catalog={catalog}
        shown={deals.length}
        total={total}
        minScoreFloor={minScoreFloor}
      />

      <main className="results">
        <div className="wrap">
          {error && (
            <p className="notice notice--error">
              <span aria-hidden="true">!</span>
              <span>{error}</span>
            </p>
          )}

          {loading ? (
            <div className="grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="empty">
              <div className="empty__mark">★</div>
              <h2>{neverScanned ? 'Nessuna scansione ancora' : 'Nessuna occasione, per ora'}</h2>
              <p>
                {neverScanned
                  ? 'Avvia la prima ricerca: interroghiamo tutte le destinazioni e teniamo solo quello che vale.'
                  : total > 0
                    ? 'Con questi filtri non resta nulla. Allarga le date o alza il tetto di prezzo.'
                    : 'Nessuna tariffa ha superato la soglia. Meglio una lista vuota che una piena di finti sconti.'}
              </p>
            </div>
          ) : (
            <div className="grid">
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isNew={freshIds.has(deal.id)}
                  onOpen={setSelected}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <WatchPanel
        watches={watches}
        currentFilters={filters}
        onCreate={createWatch}
        onRemove={removeWatch}
      />

      <footer className="footer">
        <div className="wrap">
          fiveish · solo 5 stelle, solo super offerte. I prezzi cambiano di continuo: verifica
          sempre la tariffa sul sito della struttura prima di prenotare.
        </div>
      </footer>

      {selected && <DealDrawer deal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
