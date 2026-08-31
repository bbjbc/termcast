import { describe, expect, it } from 'vitest';

import {
  advanceFor, advanceOf, cellWidth, cells, ellipsize, textWidth, wrapText,
  LATIN_EM, WIDE_EM,
} from '@/lib/metrics';

const cp = (ch: string) => ch.codePointAt(0)!;

describe('cells', () => {
  it('counts latin, digits and punctuation as one', () => {
    for (const ch of 'aZ9 .-_/') expect(cells(cp(ch))).toBe(1);
  });

  // One from each range the function lists, so a dropped range fails here
  it.each([
    ['hangul jamo', 'ᄀ'],
    ['cjk symbols', '〄'],
    ['hiragana', 'あ'],
    ['cjk extension A', '㐀'],
    ['cjk unified', '한'.normalize() && '漢'],
    ['yi syllables', 'ꀀ'],
    ['hangul syllable', '가'],
    ['cjk compatibility', '豈'],
    ['cjk compat forms', '︰'],
    ['fullwidth', 'Ａ'],
    ['fullwidth signs', '￠'],
    ['emoji', '🚀'],
    ['plane 2 ideograph', '𠀀'],
  ])('counts %s as two', (_label, ch) => {
    expect(cells(cp(ch))).toBe(2);
  });

  it('counts characters just outside a wide range as one', () => {
    expect(cells(0x10ff)).toBe(1);   // below hangul jamo
    expect(cells(0xd7a4)).toBe(1);   // above hangul syllables
    expect(cells(0x1f2ff)).toBe(1);  // below the emoji block
  });
});

describe('cellWidth', () => {
  it('sums the cells of every character', () => {
    expect(cellWidth('abc')).toBe(3);
    expect(cellWidth('한글')).toBe(4);
    expect(cellWidth('a한')).toBe(3);
    expect(cellWidth('')).toBe(0);
  });
});

describe('advanceOf', () => {
  const adv = advanceOf(6, 10);

  it('gives a narrow character the latin advance', () => {
    expect(adv('a')).toBe(6);
  });

  it('gives a wide character the wide advance, not twice the latin one', () => {
    expect(adv('한')).toBe(10);
  });
});

describe('advanceFor', () => {
  it('derives both advances from the font size', () => {
    const adv = advanceFor(20);
    expect(adv('a')).toBeCloseTo(20 * LATIN_EM, 10);
    expect(adv('한')).toBeCloseTo(20 * WIDE_EM, 10);
  });
});

describe('textWidth', () => {
  const adv = advanceOf(6, 10);

  it('adds up mixed widths', () => {
    expect(textWidth('ab한', adv)).toBe(22);
  });

  it('is zero for an empty string', () => {
    expect(textWidth('', adv)).toBe(0);
  });
});

describe('ellipsize', () => {
  const adv = advanceOf(10, 20);

  it('returns the string untouched when it fits', () => {
    expect(ellipsize('abc', 30, adv)).toBe('abc');
  });

  it('returns it untouched when it fills the width exactly', () => {
    expect(ellipsize('abc', 30, adv)).toBe('abc');
  });

  it('trims and marks what it cut', () => {
    // room for four characters, one of which the ellipsis takes
    expect(ellipsize('abcdef', 40, adv)).toBe('abc…');
  });

  it('drops wide characters whole rather than half', () => {
    // 45 leaves 35 after the ellipsis: one wide character fits, two do not
    expect(ellipsize('한글판', 45, adv)).toBe('한…');
  });

  it('gives back nothing when even the ellipsis will not fit', () => {
    expect(ellipsize('abc', 5, adv)).toBe('');
  });

  it('gives back the ellipsis alone when only it fits', () => {
    expect(ellipsize('abc', 10, adv)).toBe('…');
  });
});

describe('wrapText', () => {
  const adv = advanceOf(10, 20);
  const flat = (n: number) => () => n;

  it('leaves a short line alone', () => {
    expect(wrapText('abc', adv, flat(100))).toEqual(['abc']);
  });

  it('returns one empty piece for an empty string', () => {
    expect(wrapText('', adv, flat(100))).toEqual(['']);
  });

  it('breaks at the character, not at the word', () => {
    expect(wrapText('abcdef', adv, flat(30))).toEqual(['abc', 'def']);
  });

  it('fills a row exactly rather than breaking one character early', () => {
    // Three characters of 10 into a width of exactly 30
    expect(wrapText('abcd', adv, flat(30))).toEqual(['abc', 'd']);
  });

  it('tolerates the float error of summed em fractions', () => {
    // 0.6 * 20 does not land on 12 exactly, which used to wrap the last one off
    const real = advanceFor(20);
    const width = 20 * (20 * LATIN_EM);
    expect(wrapText('a'.repeat(20), real, flat(width))).toEqual(['a'.repeat(20)]);
  });

  it('gives the first row a different width when a prompt sits in front', () => {
    expect(wrapText('abcdef', adv, (row) => (row === 0 ? 20 : 30)))
      .toEqual(['ab', 'cde', 'f']);
  });

  it('never splits a wide character across rows', () => {
    expect(wrapText('한글', adv, flat(30))).toEqual(['한', '글']);
  });

  it('still advances by one character when the row cannot hold even that', () => {
    expect(wrapText('ab', adv, flat(1))).toEqual(['a', 'b']);
  });
});
