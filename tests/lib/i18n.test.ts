import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE, DICTS, LOCALES, LOCALE_NAMES,
  fmt, getDict, isLocale, type Dict,
} from '@/lib/i18n';
import { getPresets } from '@/lib/presets';

describe('isLocale', () => {
  it.each(LOCALES)('accepts %s', (locale) => {
    expect(isLocale(locale)).toBe(true);
  });

  it.each(['de', '', 'EN', 'en-GB'])('rejects %s', (value) => {
    expect(isLocale(value)).toBe(false);
  });
});

describe('fmt', () => {
  it('fills a placeholder', () => {
    expect(fmt('line {n}', { n: 3 })).toBe('line 3');
  });

  it('fills every occurrence', () => {
    expect(fmt('{a} and {a}', { a: 'x' })).toBe('x and x');
  });

  it('leaves an unknown placeholder visible rather than printing undefined', () => {
    expect(fmt('{a} {b}', { a: 1 })).toBe('1 {b}');
  });

  it('returns a string with no placeholders untouched', () => {
    expect(fmt('plain', {})).toBe('plain');
  });
});

describe('getDict', () => {
  it.each(LOCALES)('returns the %s dictionary', (locale) => {
    expect(getDict(locale)).toBe(DICTS[locale]);
  });

  it('has a name for every locale', () => {
    expect(Object.keys(LOCALE_NAMES).sort()).toEqual([...LOCALES].sort());
  });

  it('has a default that is a real locale', () => {
    expect(isLocale(DEFAULT_LOCALE)).toBe(true);
  });
});

/** Walk both dictionaries together so a key added to one and not the other fails. */
function compare(a: unknown, b: unknown, path: string, missing: string[]) {
  if (typeof a === 'object' && a !== null) {
    const keysA = Object.keys(a as object).sort();
    const keysB = Object.keys(b as object).sort();
    if (keysA.join() !== keysB.join()) missing.push(path || '(root)');
    for (const k of keysA) {
      compare((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k, missing);
    }
    return;
  }
  if (typeof a !== typeof b || (typeof a === 'string' && !a)) missing.push(path);
}

describe('the dictionaries agree', () => {
  it('has the same shape in every locale, with nothing empty', () => {
    const missing: string[] = [];
    compare(DICTS.en, DICTS.ko, '', missing);
    expect(missing).toEqual([]);
  });

  it('carries no em dashes, which the project bans', () => {
    const flat = (d: Dict) => JSON.stringify(d);
    for (const locale of LOCALES) expect(flat(DICTS[locale])).not.toContain('—');
  });
});

describe('presets', () => {
  it.each(LOCALES)('gives %s a set of starting points', (locale) => {
    const presets = getPresets(locale);
    expect(presets.length).toBeGreaterThan(0);
    for (const p of presets) {
      expect(p.name).toBeTruthy();
      expect(p.hint).toBeTruthy();
      expect(p.tape).toBeTruthy();
    }
  });

  it('offers the same set in every locale', () => {
    const counts = LOCALES.map((l) => getPresets(l).length);
    expect(new Set(counts).size).toBe(1);
  });
});
