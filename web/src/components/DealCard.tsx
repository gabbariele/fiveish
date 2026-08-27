import { boardLabel, daysUntil, money, percent, stayLabel } from '../lib/format';
import type { Deal } from '../lib/types';

interface Props {
  deal: Deal;
  isNew: boolean;
  onOpen: (deal: Deal) => void;
}

export function DealCard({ deal, isNew, onOpen }: Props) {
  const { offer, hotel, destination } = deal;
  const days = daysUntil(offer.checkIn);
  const urgent = days <= 21;
  const scarce = offer.roomsLeft !== undefined && offer.roomsLeft <= 2;

  return (
    <button
      className={`card${deal.score >= 85 ? ' card--top' : ''}`}
      onClick={() => onOpen(deal)}
      aria-label={`${hotel.name} a ${destination.name}, ${money(offer.nightlyPrice)} a notte`}
    >
      <div className="card__head">
        <div>
          <div className="card__place">
            {destination.name} · {destination.region}
          </div>
          <h3 className="card__name">{hotel.name}</h3>
          <div className="card__stars" aria-label="5 stelle">
            ★★★★★
          </div>
        </div>
        <div className="score">
          <div className="score__value">{deal.score}</div>
          <div className="score__label">punti</div>
        </div>
      </div>

      <div className="card__price">
        <span className="price__now">{money(offer.nightlyPrice)}</span>
        <span className="price__unit">a notte</span>
        <span className="price__was">{money(deal.baseline.nightly)}</span>
        <span className="badge badge--discount">−{percent(deal.discountPct)}</span>
      </div>

      <div className="card__meta">
        <span>{stayLabel(offer.checkIn, offer.checkOut, offer.nights)}</span>
        <span>{boardLabel(offer.board)}</span>
      </div>

      <p className="card__reason">{deal.reasons[0]}</p>

      <div className="card__foot">
        <span className="card__savings">Risparmi {money(deal.savings)} sul soggiorno</span>
        <span className="card__flags">
          {isNew && <span className="badge badge--new">Novità</span>}
          {scarce && <span className="badge badge--urgent">{offer.roomsLeft} camere</span>}
          {!scarce && urgent && <span className="badge badge--urgent">fra {days} gg</span>}
        </span>
      </div>
    </button>
  );
}
