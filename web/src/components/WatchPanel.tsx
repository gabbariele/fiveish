import { useState } from 'react';
import { kindLabel, money } from '../lib/format';
import type { Filters, Watch } from '../lib/types';

interface Props {
  watches: Watch[];
  currentFilters: Filters;
  onCreate: (label: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function describe(filters: Filters): string {
  const parts: string[] = [];
  if (filters.destinationId) parts.push(filters.destinationId.replace(/-/g, ' '));
  else if (filters.region) parts.push(filters.region);
  if (filters.kind) parts.push(kindLabel(filters.kind).toLowerCase());
  if (filters.maxNightly) parts.push(`max ${money(filters.maxNightly)}/notte`);
  if (filters.minScore) parts.push(`punteggio ${filters.minScore}+`);
  if (filters.refundableOnly) parts.push('cancellazione gratuita');
  if (filters.from || filters.to) parts.push(`${filters.from ?? '…'} → ${filters.to ?? '…'}`);
  return parts.length > 0 ? parts.join(' · ') : 'tutte le super offerte';
}

export function WatchPanel({ watches, currentFilters, onCreate, onRemove }: Props) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const name = label.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await onCreate(name);
      setLabel('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="watches">
      <div className="wrap">
        <h3 className="field__label" style={{ fontSize: 12 }}>
          Avvisami quando esce un’occasione
        </h3>
        <p style={{ color: 'var(--text-dim)', margin: '6px 0 0', fontSize: 14, maxWidth: '62ch' }}>
          Salva i filtri che hai impostato adesso. A ogni scansione ti segnaliamo solo le offerte
          nuove che li rispettano — una volta sola, senza ripetizioni.
        </p>

        <div className="filters__row" style={{ marginTop: 14 }}>
          <label className="field field--wide">
            <span className="field__label">Nome dell’avviso</span>
            <input
              value={label}
              placeholder="es. Weekend in Toscana sotto i 300 €"
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create();
              }}
              style={{ minWidth: 300 }}
            />
          </label>
          <button className="btn" onClick={() => void create()} disabled={!label.trim() || busy}>
            Salva con i filtri attuali
          </button>
          <span className="filters__meta" style={{ margin: 0 }}>
            {describe(currentFilters)}
          </span>
        </div>

        {watches.length > 0 && (
          <ul className="watch-list">
            {watches.map((watch) => (
              <li className="watch" key={watch.id}>
                <span>
                  <span className="watch__label">{watch.label}</span>
                  <br />
                  <span className="watch__filters">{describe(watch.filters)}</span>
                </span>
                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => void onRemove(watch.id)}
                >
                  Elimina
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
