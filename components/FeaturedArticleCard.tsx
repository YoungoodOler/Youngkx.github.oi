'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { PointerEvent } from 'react';
import type { ArticleSummary } from '@/lib/articles';
import { getArticleCardDesign } from '@/lib/article-card-design';
import styles from './FeaturedArticleCard.module.css';

const familyCredits: Record<string, string> = {
  code: 'Code',
  cs: 'CS',
  ai: 'AI',
  vlog: 'Vlog',
  talk: 'Talk',
  web: 'Web',
};

function tilt(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch') return;
  const card = event.currentTarget;
  const { left, top, width, height } = card.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - left) / width));
  const y = Math.min(1, Math.max(0, (event.clientY - top) / height));
  card.style.setProperty('--tilt', `rotateX(${(0.5 - y) * 9}deg) rotateY(${(x - 0.5) * 12}deg)`);
}

function resetTilt(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty('--tilt');
}

export default function FeaturedArticleCard({ post }: { post: ArticleSummary }) {
  const { family, image } = getArticleCardDesign(post);

  return (
    <article
      className={`article-card ${styles.card}`}
      data-family={family}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      <Link className={styles.spread} href={post.href}>
        <div className={styles.copy}>
          <div className={styles.kicker}>
            <span className={styles.issue}>No.{post.number}</span>
            <span className={styles.tag}>{post.tagLabel}</span>
            <time className={styles.date} dateTime={post.date}>
              {post.dateLabel}
            </time>
          </div>
          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <span className={styles.folio} aria-hidden="true">
            {post.number}
          </span>
        </div>
        <div className={styles.art} aria-hidden="true">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 680px) 100vw, 55vw"
            className={styles.photo}
          />
          <span className={styles.tint} />
          <span className={styles.screen} />
          <span className={styles.credit}>{familyCredits[family]} · Field Note</span>
        </div>
      </Link>
    </article>
  );
}
