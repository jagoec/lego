import { useCallback, useState } from 'react';

const STORAGE_KEY = 'lego:paradigmPanel';

interface PanelPrefs {
  /** the header "Tables" toggle — feature on/off */
  enabled: boolean;
  /** whether the panel is currently shown (persisted across reloads) */
  open: boolean;
}

const DEFAULT_PREFS: PanelPrefs = { enabled: true, open: false };

function readPrefs(): PanelPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_PREFS;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return DEFAULT_PREFS;
    const candidate = value as Partial<PanelPrefs>;
    return {
      enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : DEFAULT_PREFS.enabled,
      open: typeof candidate.open === 'boolean' ? candidate.open : DEFAULT_PREFS.open,
    };
  } catch {
    return DEFAULT_PREFS; // junk in storage, or storage unavailable
  }
}

function storePrefs(prefs: PanelPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Persistence is best-effort.
  }
}

export interface ParadigmPanelState {
  enabled: boolean;
  open: boolean;
  setEnabled: (enabled: boolean) => void;
  setOpen: (open: boolean) => void;
}

/**
 * Paradigm-panel preferences (feature enabled + panel open), persisted to
 * localStorage as JSON. The panel auto-opens once on the first hovered
 * word that has a table (App drives that); after the user closes it, it
 * stays closed until reopened via the stored preference.
 */
export function useParadigmPanel(): ParadigmPanelState {
  const [prefs, setPrefs] = useState<PanelPrefs>(readPrefs);

  const update = useCallback((patch: Partial<PanelPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      storePrefs(next);
      return next;
    });
  }, []);

  const setEnabled = useCallback((enabled: boolean) => update({ enabled }), [update]);
  const setOpen = useCallback((open: boolean) => update({ open }), [update]);

  return { enabled: prefs.enabled, open: prefs.open, setEnabled, setOpen };
}
