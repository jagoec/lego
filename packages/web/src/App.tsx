import { useEffect, useMemo, useRef, useState } from 'react';
import type { Passage } from '@lego/shared';
import { LevelControl } from './components/LevelControl';
import { ParadigmPanel } from './components/ParadigmPanel';
import { Reader } from './components/Reader';
import { ReadingOrderView } from './components/ReadingOrderView';
import { useAssistanceLevel } from './hooks/useAssistanceLevel';
import { useParadigmPanel } from './hooks/useParadigmPanel';
import { loadPassage } from './lib/loadPassage';
import { cls } from './lib/cls';
import { paradigmForActive, type ParadigmState } from './paradigms';
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
  const panel = useParadigmPanel();
  const autoOpened = useRef(false);

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

  // Paradigm state for the hovered/focused word (idle while loading).
  const paradigmState = useMemo<ParadigmState>(
    () => (loaded === null ? { kind: 'idle' } : paradigmForActive(loaded.passage, active)),
    [loaded, active],
  );

  // The panel auto-opens once, on the first hovered word that has a
  // table; after the user closes it, hover-sync updates content but
  // never reopens it.
  useEffect(() => {
    if (!panel.enabled || panel.open || autoOpened.current) return;
    if (paradigmState.kind === 'table') {
      autoOpened.current = true;
      panel.setOpen(true);
    }
  }, [panel.enabled, panel.open, panel.setOpen, paradigmState]);

  if (loaded === null) {
    return (
      <div className="app">
        <p className="app__loading">loading passage…</p>
      </div>
    );
  }

  const { passage, demo } = loaded;

  return (
    <div className={cls('app', panel.enabled && panel.open && 'app--panel')}>
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
          <button
            type="button"
            className="order-toggle"
            aria-pressed={panel.enabled}
            onClick={() => {
              panel.setEnabled(!panel.enabled);
            }}
          >
            Tables
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

      <ParadigmPanel
        state={paradigmState}
        open={panel.enabled && panel.open}
        onClose={() => {
          panel.setOpen(false);
        }}
      />
    </div>
  );
}
