import { count, money, percent, relativeTime } from '../lib/format';
import type { Health, Stats } from '../lib/types';

interface Props {
  health: Health | null;
  stats: Stats | null;
  scanning: boolean;
  onScan: () => void;
}

export function Masthead({ health, stats, scanning, onScan }: Props) {
  const lastScan = health?.scansione.ultima ?? null;
  const isSample = health?.provider.name === 'sample';

  return (
    <header className="masthead">
      <div className="wrap">
        <div className="masthead__row">
          <div>
            <div className="logo">
              <span className="logo__mark">★</span>
              <span className="logo__name">fiveish</span>
            </div>
            <p className="logo__claim">
              Solo hotel 5 stelle in Italia, solo tariffe davvero eccezionali. Lo sconto è
              calcolato sul prezzo reale della struttura, non su quello barrato dal venditore.
            </p>
          </div>

          <div className="masthead__actions">
            {lastScan && (
              <span className="filters__meta" style={{ margin: 0 }}>
                Ultima scansione {relativeTime(lastScan.finishedAt)}
              </span>
            )}
            <button className="btn btn--gold" onClick={onScan} disabled={scanning}>
              {scanning ? 'Scansione in corso…' : 'Cerca offerte adesso'}
            </button>
          </div>
        </div>

        <div className="stats">
          <div>
            <div className="stat__value">{count(stats?.deals ?? 0)}</div>
            <div className="stat__label">super offerte</div>
          </div>
          <div>
            <div className="stat__value">
              {stats && stats.deals > 0 ? percent(stats.scontoMedio) : '—'}
            </div>
            <div className="stat__label">sconto medio</div>
          </div>
          <div>
            <div className="stat__value">
              {stats && stats.deals > 0 ? money(stats.risparmioTotale) : '—'}
            </div>
            <div className="stat__label">risparmio complessivo</div>
          </div>
          <div>
            <div className="stat__value">{count(lastScan?.offersSeen ?? 0)}</div>
            <div className="stat__label">tariffe esaminate</div>
          </div>
          <div>
            <div className="stat__value">{count(health?.rilevazioniStorico ?? 0)}</div>
            <div className="stat__label">rilevazioni storiche</div>
          </div>
        </div>

        {isSample && (
          <p className="notice">
            <span aria-hidden="true">★</span>
            <span>
              <strong>Dati dimostrativi.</strong> Gli hotel sono reali, i prezzi sono simulati per
              far girare il motore senza chiavi API. Per le tariffe live imposta{' '}
              <code>PROVIDER=amadeus</code> nel file <code>.env</code> con le tue credenziali.
            </span>
          </p>
        )}
        {health && !health.provider.ready && (
          <p className="notice notice--error">
            <span aria-hidden="true">!</span>
            <span>
              <strong>Provider “{health.provider.name}” non pronto.</strong>{' '}
              {health.provider.reason}
            </span>
          </p>
        )}
      </div>
    </header>
  );
}
