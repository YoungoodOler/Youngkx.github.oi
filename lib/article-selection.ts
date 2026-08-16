import type { ArticleSummary } from './articles';

export function selectLatestArticle(posts: readonly ArticleSummary[]) {
  let latest: ArticleSummary | undefined;

  for (const post of posts) {
    if (
      !latest ||
      post.date > latest.date ||
      (post.date === latest.date && post.title.localeCompare(latest.title, 'zh-CN') < 0)
    ) {
      latest = post;
    }
  }

  return latest;
}
