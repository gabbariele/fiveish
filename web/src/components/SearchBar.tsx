import { useState } from 'react';
import type { ParsedQuery } from '../lib/types';

interface Props {
  onSearch: (text: string) => Promise<void>;
  onClear: () => void;
  parsed: ParsedQuery | null;
  busy: boolean;
  aiReady: boolean;
}

const ESEMPI = [
  'un weekend sul lago di Como sotto i 400 euro',
  'una settimana al mare in Puglia a settembre',
  'Roma a novembre con cancellazione gratuita',
];

export function SearchBar({ onSearch, onClear, parsed, busy, aiReady }: Props) {
  const [text, setText] = useState('');

  const submit = async () => {
    const query = text.trim();
    if (!query || busy) return;
    await onSearch(query);
  };

  const clear = () => {
    setText('');
    onClear();
  };

  return (
    <div className="search">
      <div className="search__row">
        <input
          className="search__input"
          value={text}
          placeholder="Scrivi cosa cerchi: «un weekend sul lago a novembre sotto i 400 €»"
          aria-label="Cerca a parole tue"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
            if (e.key === 'Escape') clear();
          }}
        />
        <button className="btn btn--gold" onClick={() => void submit()} disabled={!text.trim() || busy}>
          {busy ? 'Interpreto…' : 'Cerca'}
        </button>
        {parsed && (
          <button className="btn btn--ghost" onClick={clear}>
            Azzera
          </button>
        )}
      </div>

      {!parsed && (
        <div className="search__hints">
          <span>Prova con:</span>
          {ESEMPI.map((esempio) => (
            <button
              key={esempio}
              className="chip chip--quiet"
              onClick={() => {
                setText(esempio);
                void onSearch(esempio);
              }}
            >
              {esempio}
            </button>
          ))}
        </div>
      )}

      {parsed && (
        <div className="search__read">
          <span className="search__badge">
            {parsed.source === 'gemini' ? 'letta da Gemini' : 'letta a regole'}
          </span>
          <span>{parsed.interpretazione}</span>
          {parsed.avviso && <span className="search__warn">{parsed.avviso}</span>}
        </div>
      )}

      {!aiReady && !parsed && (
        <p className="search__note">
          La ricerca a parole tue funziona anche così, con le regole incorporate. Con una chiave
          Gemini in <code>.env</code> capisce le frasi più libere.
        </p>
      )}
    </div>
  );
}
