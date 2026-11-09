import { useEffect, useState } from 'react';
import type { Passage } from '@lego/shared';
import { LevelControl } from './components/LevelControl';
import { Reader } from './components/Reader';
import { ReadingOrderView } from './components/ReadingOrderView';
import { useAssistanceLevel } from './hooks/useAssistanceLevel';
import { loadPassage } from './lib/loadPassage';
import type { TokenKey } from './lib/model';

export interface AppProps {
  initialPassage?: { passage: Passage; demo: boolean };
}

export function App({ initialPassage }: AppProps = {}) {
  const [loaded, setLoaded] = useState<{ passage: Passage; demo: boolean } | null>(
    initialPassage ?? null,
  );
  const [level, setLevel] = useAssistanceLevel();
  const [readingOrder, setReadingOrder] = useState(false);
  const [active, setActive] = useState<TokenKey | null>(null);

  useEffect(() => {
    if (initialPassage !== undefined) return; // supplied directly (tests)
    let cancelled = false;
    void loadPassage().then((result) => {
      if (!cancelled) setLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [initialPassage]);

  if (loaded === null) {
    return (
      <div className="app">
        <p className="app__loading">loading passage…</p>
      </div>
    );
  }

  const { passage, demo } = loaded;

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">{passage.title}</h1>
        <p className="header__work">
          {passage.work}, book {passage.book}
        </p>
        {demo && <p className="header__demo">demo passage (corpus not yet imported)</p>}
        <div className="header__controls">
          <LevelControl level={level} onChange={setLevel} />
          <button
            type="button"
            className="order-toggle"
            aria-pressed={readingOrder}
            onClick={() => {
              setReadingOrder((value) => !value);
              setActive(null);
            }}
          >
            Reading order
          </button>
        </div>
      </header>

      <main className="main">
        {readingOrder ? (
          <ReadingOrderView
            passage={passage}
            level={level}
            active={active}
            onActiveChange={setActive}
          />
        ) : (
          <Reader passage={passage} level={level} active={active} onActiveChange={setActive} />
        )}
      </main>

      <footer className="footer">
        <p>
          Text: {passage.source.name} · {passage.source.license}
        </p>
        <p>
          <a href={passage.source.url}>{passage.source.url}</a>
        </p>
      </footer>
    </div>
  );
}
