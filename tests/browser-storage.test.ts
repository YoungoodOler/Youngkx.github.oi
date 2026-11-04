import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredValue, writeStoredValue } from '@/lib/browser-storage';

afterEach(() => vi.unstubAllGlobals());

describe('optional browser storage', () => {
  it('works when persistence is available, including empty strings and removal', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    vi.stubGlobal('window', { sessionStorage: storage });
    expect(readStoredValue('sessionStorage', 'token')).toBeNull();
    writeStoredValue('sessionStorage', 'token', 'value');
    expect(readStoredValue('sessionStorage', 'token')).toBe('value');
    writeStoredValue('sessionStorage', 'token', '');
    expect(readStoredValue('sessionStorage', 'token')).toBe('');
    writeStoredValue('sessionStorage', 'token', null);
    expect(readStoredValue('sessionStorage', 'token')).toBeNull();
  });

  it.each(['localStorage', 'sessionStorage'] as const)(
    'tolerates a blocked %s property',
    (storage) => {
      vi.stubGlobal(
        'window',
        Object.defineProperty({}, storage, {
          get() {
            throw new DOMException('Blocked', 'SecurityError');
          },
        }),
      );
      expect(readStoredValue(storage, 'key')).toBeNull();
      expect(() => writeStoredValue(storage, 'key', 'value')).not.toThrow();
      expect(() => writeStoredValue(storage, 'key', null)).not.toThrow();
    },
  );

  it('tolerates quota failures without clearing the previous value', () => {
    const removeItem = vi.fn();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'old',
        setItem: () => {
          throw new DOMException('Full', 'QuotaExceededError');
        },
        removeItem,
      },
    });
    expect(() => writeStoredValue('localStorage', 'theme', 'dark')).not.toThrow();
    expect(readStoredValue('localStorage', 'theme')).toBe('old');
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('is safe during server rendering', () => {
    vi.stubGlobal('window', undefined);
    expect(readStoredValue('localStorage', 'theme')).toBeNull();
    expect(() => writeStoredValue('sessionStorage', 'token', null)).not.toThrow();
  });
});
