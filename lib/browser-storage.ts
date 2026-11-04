type BrowserStorage = 'localStorage' | 'sessionStorage';

export const managementTokenKey = 'youngkx-links-token';

// Storage can be blocked by browser policy, or unavailable during server rendering.
// Persistence is optional; the current page must continue to work without it.
export function readStoredValue(storage: BrowserStorage, key: string): string | null {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredValue(storage: BrowserStorage, key: string, value: string | null) {
  try {
    if (value === null) window[storage].removeItem(key);
    else window[storage].setItem(key, value);
  } catch {
    // The caller keeps its state in memory when persistence is unavailable.
  }
}
