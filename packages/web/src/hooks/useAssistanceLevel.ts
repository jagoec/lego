import { useCallback, useState } from 'react';
import type { AssistanceLevel } from '@lego/shared';

const STORAGE_KEY = 'lego:assistanceLevel';

const VALID: AssistanceLevel[] = [1, 2, 3, 4];
const DEFAULT_LEVEL: AssistanceLevel = 1;

function readStoredLevel(): AssistanceLevel {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = Number(raw);
    return (VALID as readonly number[]).includes(value) ? (value as AssistanceLevel) : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL; // storage unavailable (private mode, SSR, …)
  }
}

function storeLevel(level: AssistanceLevel): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    // Persistence is best-effort.
  }
}

/**
 * Assistance level 1–4, persisted to localStorage.
 */
export function useAssistanceLevel(): [
  level: AssistanceLevel,
  setLevel: (level: AssistanceLevel) => void,
] {
  const [level, setLevelState] = useState<AssistanceLevel>(readStoredLevel);
  const setLevel = useCallback((next: AssistanceLevel) => {
    setLevelState(next);
    storeLevel(next);
  }, []);
  return [level, setLevel];
}
