import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARD_PRESETS } from '@/lib/card-presets';
import { getArticleCardDesign } from '@/lib/article-card-design';

describe('article card design', () => {
  it.each(['code', 'cs', 'ai', 'vlog', 'talk', 'web'] as const)(
    'maps the %s photo family to its art',
    (card) => {
      const design = getArticleCardDesign({ card });
      expect(design.family).toBe(card);
      expect(design.image).toBe(`/cards/articles/${card}.webp`);
      expect(design).toEqual(getArticleCardDesign({ card }));
      expect(existsSync(resolve('public', 'cards', 'articles', `${card}.webp`))).toBe(true);
    },
  );

  it('gives every card preset a family with a photo', () => {
    for (const preset of CARD_PRESETS) {
      const { family } = getArticleCardDesign({ card: preset });
      expect(existsSync(resolve('public', 'cards', 'articles', `${family}.webp`))).toBe(true);
    }
  });

  it('matches legacy card presets to the nearest photo family', () => {
    expect(getArticleCardDesign({ card: 'network' }).family).toBe('web');
    expect(getArticleCardDesign({ card: 'timeline' }).family).toBe('talk');
  });
});
