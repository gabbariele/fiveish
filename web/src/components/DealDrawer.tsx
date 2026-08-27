import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { boardLabel, count, longDate, money, percent } from '../lib/format';
import type { Deal, ScoreBreakdown } from '../lib/types';

interface Props {
  deal: Deal;
  onClose: () => void;
}

const COMPONENT_LABEL: Record<keyof ScoreBreakdown, string> = {
  sconto: 'Sconto sul prezzo reale',
  prezzoAssoluto: 'Convenienza sulla piazza',
  qualita: 'Qualità della struttura',
  condizioni: 'Condizioni della tariffa',
  rarita: 'Rarità dell’occasione',
};

/** Peso di ogni componente. La rarita non e in media: si somma come bonus. */
const WEIGHTS: Record<keyof ScoreBreakdown, string> = {
  sconto: 'peso 45%',
  prezzoAssoluto: 'peso 22%',
  qualita: 'peso 16%',
  condizioni: 'peso 17%',
  rarita: 'bonus fino a +8',
};

const BASELINE_EXPLAIN: Record<Deal['baseline']['method'], string> = {
  storico: 'mediana dei prezzi che abbiamo rilevato per questa struttura nello stesso mese',
  profilo: 'mediana mensile nota per questa struttura',
  concorrenti: 'mediana degli altri 5 stelle della stessa zona nello stesso periodo',
};

export function DealDrawer({ deal, onClose }: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { offer, hotel, destination, baseline } = deal;
  const search = encodeURIComponent(`${hotel.name} ${destination.name}`);

  // Due righe sulla meta in quel mese. Se l'AI non e configurata non arriva
  // nulla e la sezione semplicemente non compare: meglio del segnaposto.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setNote(null);
    void api.note(destination.id, offer.checkIn.slice(5, 7)).then((result) => {
      if (!cancelled && result) setNote(result.text);
    });
    return () => {
      cancelled = true;
    };
  }, [destination.id, offer.checkIn]);

  return (
    <>
      <button className="drawer-backdrop" onClick={onClose} aria-label="Chiudi il dettaglio" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={hotel.name}>
        <button className="btn btn--ghost btn--small drawer__close" onClick={onClose}>
          Chiudi
        </button>

        <div className="card__place">
          {destination.name} · {destination.region}
        </div>
        <h2>{hotel.name}</h2>
        <div className="card__stars">★★★★★</div>

        <div className="card__price">
          <span className="price__now">{money(offer.nightlyPrice)}</span>
          <span className="price__unit">a notte</span>
          <span className="price__was">{money(baseline.nightly)}</span>
          <span className="badge badge--discount">−{percent(deal.discountPct)}</span>
        </div>
        <p style={{ color: 'var(--text-dim)', marginTop: 6 }}>
          {money(offer.totalPrice)} per {offer.nights}{' '}
          {offer.nights === 1 ? 'notte' : 'notti'} · risparmio stimato {money(deal.savings)}
        </p>

        <section>
          <h3>Perché è un affare</h3>
          <ul className="reasons">
            {deal.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        {note && (
          <section>
            <h3>{destination.name} in questo periodo</h3>
            <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: 14 }}>{note}</p>
          </section>
        )}

        <section>
          <h3>Come nasce il punteggio {deal.score}/100</h3>
          {(Object.keys(COMPONENT_LABEL) as Array<keyof ScoreBreakdown>).map((key) => (
            <div className="bar" key={key}>
              <div className="bar__head">
                <span>
                  {COMPONENT_LABEL[key]}{' '}
                  <span style={{ color: 'var(--text-faint)' }}>· {WEIGHTS[key]}</span>
                </span>
                <span>{Math.round(deal.breakdown[key])}</span>
              </div>
              <div className="bar__track">
                <div className="bar__fill" style={{ width: `${Math.round(deal.breakdown[key])}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section>
          <h3>Il soggiorno</h3>
          <dl className="kv">
            <dt>Arrivo</dt>
            <dd>{longDate(offer.checkIn)}</dd>
            <dt>Partenza</dt>
            <dd>{longDate(offer.checkOut)}</dd>
            <dt>Camera</dt>
            <dd>{offer.roomName}</dd>
            <dt>Trattamento</dt>
            <dd>{boardLabel(offer.board)}</dd>
            <dt>Cancellazione</dt>
            <dd>{offer.refundable ? 'Gratuita' : 'Non rimborsabile'}</dd>
            <dt>Ospiti</dt>
            <dd>{offer.guests}</dd>
            {offer.roomsLeft !== undefined && (
              <>
                <dt>Disponibilità</dt>
                <dd>
                  {offer.roomsLeft} {offer.roomsLeft === 1 ? 'camera' : 'camere'}
                </dd>
              </>
            )}
          </dl>
        </section>

        <section>
          <h3>Il prezzo di riferimento</h3>
          <dl className="kv">
            <dt>Prezzo normale</dt>
            <dd>{money(baseline.nightly)} a notte</dd>
            <dt>Calcolato su</dt>
            <dd style={{ textAlign: 'right', maxWidth: 300 }}>{BASELINE_EXPLAIN[baseline.method]}</dd>
            <dt>Rilevazioni</dt>
            <dd>{count(baseline.samples)}</dd>
            <dt>Affidabilità</dt>
            <dd>{baseline.confidence}</dd>
          </dl>
          {offer.advertisedBasePrice !== undefined && (
            <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 12 }}>
              Il venditore dichiara un prezzo pieno di {money(offer.advertisedBasePrice)}. Non lo
              usiamo: lo sconto qui sopra è calcolato sul prezzo di riferimento che abbiamo
              ricostruito noi.
            </p>
          )}
        </section>

        <section>
          <h3>La struttura</h3>
          <dl className="kv">
            <dt>Voto ospiti</dt>
            <dd>
              {hotel.guestRating.toFixed(1)}/10
              {hotel.reviewCount > 0 && ` · ${count(hotel.reviewCount)} recensioni`}
            </dd>
            {hotel.amenities.length > 0 && (
              <>
                <dt>Servizi</dt>
                <dd style={{ textAlign: 'right', maxWidth: 300 }}>{hotel.amenities.join(' · ')}</dd>
              </>
            )}
          </dl>
        </section>

        <section>
          {offer.deepLink ? (
            <a className="btn btn--gold" href={offer.deepLink} target="_blank" rel="noreferrer">
              Vai alla tariffa
            </a>
          ) : (
            <a
              className="btn btn--gold"
              href={`https://www.google.com/search?q=${search}`}
              target="_blank"
              rel="noreferrer"
            >
              Cerca la struttura
            </a>
          )}
          <p style={{ color: 'var(--text-faint)', fontSize: 12.5, marginTop: 12 }}>
            Rilevato da “{offer.source}”. Verifica sempre disponibilità e condizioni prima di
            prenotare: le tariffe migliori durano poco.
          </p>
        </section>
      </aside>
    </>
  );
}
