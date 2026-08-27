import { kindLabel } from '../lib/format';
import type { DestinationKind, DestinationsResponse, Filters } from '../lib/types';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  catalog: DestinationsResponse | null;
  shown: number;
  total: number;
  minScoreFloor: number;
}

const PRICE_STEPS = [200, 300, 400, 600, 900];

export function FilterBar({ filters, onChange, catalog, shown, total, minScoreFloor }: Props) {
  const destinations = (catalog?.destinations ?? []).filter(
    (d) => !filters.region || d.region === filters.region,
  );

  return (
    <div className="filters">
      <div className="wrap">
        <div className="chips" style={{ marginBottom: 12 }}>
          <button
            className="chip"
            aria-pressed={!filters.kind}
            onClick={() => onChange({ kind: undefined })}
          >
            Tutte le mete
          </button>
          {(catalog?.kinds ?? []).map((kind: DestinationKind) => (
            <button
              key={kind}
              className="chip"
              aria-pressed={filters.kind === kind}
              onClick={() => onChange({ kind: filters.kind === kind ? undefined : kind })}
            >
              {kindLabel(kind)}
            </button>
          ))}
        </div>

        <div className="filters__row">
          <label className="field field--wide">
            <span className="field__label">Regione</span>
            <select
              value={filters.region ?? ''}
              onChange={(e) =>
                onChange({ region: e.target.value || undefined, destinationId: undefined })
              }
            >
              <option value="">Tutta Italia</option>
              {(catalog?.regions ?? []).map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--wide">
            <span className="field__label">Destinazione</span>
            <select
              value={filters.destinationId ?? ''}
              onChange={(e) => onChange({ destinationId: e.target.value || undefined })}
            >
              <option value="">Ovunque</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Max a notte</span>
            <select
              value={filters.maxNightly ?? ''}
              onChange={(e) =>
                onChange({ maxNightly: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">Nessun limite</option>
              {PRICE_STEPS.map((step) => (
                <option key={step} value={step}>
                  fino a {step} €
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Da</span>
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => onChange({ from: e.target.value || undefined })}
            />
          </label>

          <label className="field">
            <span className="field__label">A</span>
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => onChange({ to: e.target.value || undefined })}
            />
          </label>

          <label className="field">
            <span className="field__label">Punteggio minimo</span>
            <select
              value={filters.minScore ?? ''}
              onChange={(e) =>
                onChange({ minScore: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">Tutte ({minScoreFloor}+)</option>
              <option value="80">Da 80 in su</option>
              <option value="85">Da 85 in su</option>
              <option value="90">Solo eccezionali (90+)</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">Ordina per</span>
            <select
              value={filters.sort ?? 'score'}
              onChange={(e) => onChange({ sort: e.target.value as Filters['sort'] })}
            >
              <option value="score">Punteggio</option>
              <option value="sconto">Sconto</option>
              <option value="prezzo">Prezzo</option>
              <option value="checkin">Data di arrivo</option>
            </select>
          </label>

          <button
            className="chip"
            aria-pressed={filters.refundableOnly === true}
            onClick={() => onChange({ refundableOnly: filters.refundableOnly ? undefined : true })}
            style={{ marginBottom: 2 }}
          >
            Solo cancellazione gratuita
          </button>
        </div>

        <div className="filters__meta">
          <span>
            {shown} {shown === 1 ? 'offerta mostrata' : 'offerte mostrate'} su {total} selezionate
            dal motore
          </span>
          <span>Nulla scende sotto {minScoreFloor} punti: sotto quella soglia non è un affare.</span>
        </div>
      </div>
    </div>
  );
}
