import type { ArticleSummary } from './articles';
import type { CardPreset } from './card-presets';

const photoFamilies = {
  code: 'code',
  cs: 'cs',
  ai: 'ai',
  vlog: 'vlog',
  talk: 'talk',
  web: 'web',
  network: 'web',
  timeline: 'talk',
} as const satisfies Record<CardPreset, string>;

// Every spread prints the same way round: flat type plate left, photo right.
export function getArticleCardDesign({ card }: Pick<ArticleSummary, 'card'>) {
  const family = photoFamilies[card];
  return {
    family,
    image: `/cards/articles/${family}.webp`,
  };
}
