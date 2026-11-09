import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

/**
 * jsdom keeps `localStorage` behind a proper origin and (in recent
 * versions) off the window's own keys, so vitest's global shim can miss
 * it. If it is unavailable here, install a minimal in-memory Storage —
 * the app code only needs get/set/clear semantics.
 */
function ensureLocalStorage(): void {
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
  } catch {
    storage = undefined; // opaque origin → SecurityError
  }
  if (storage === undefined) {
    const map = new Map<string, string>();
    const polyfill: Storage = {
      get length() {
        return map.size;
      },
      clear() {
        map.clear();
      },
      getItem(key) {
        return map.get(key) ?? null;
      },
      key(index) {
        return [...map.keys()][index] ?? null;
      },
      removeItem(key) {
        map.delete(key);
      },
      setItem(key, value) {
        map.set(key, value);
      },
    };
    Object.defineProperty(window, 'localStorage', { value: polyfill, configurable: true });
  }
}

ensureLocalStorage();

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
