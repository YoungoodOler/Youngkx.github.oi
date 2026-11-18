'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { ArticleSummary, CategorySummary } from '@/lib/articles';
import styles from './TopicCard.module.css';

export type TopicCardCategory = Pick<CategorySummary, 'id' | 'title' | 'description'> & {
  posts: Pick<ArticleSummary, 'href' | 'title'>[];
};

export default function TopicCard({
  category,
  index,
}: {
  category: TopicCardCategory;
  index: number;
}) {
  const { id, title, description, posts } = category;
  const [flipped, setFlipped] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  const titleId = `topic-${id}-title`;
  const countId = `topic-${id}-count`;
  const backId = `topic-${id}-articles`;

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (flipped ? closeButtonRef : openButtonRef).current?.focus({ preventScroll: true });
  }, [flipped]);

  function flip(next: boolean) {
    moveFocus.current = true;
    setFlipped(next);
  }

  function tilt(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    const card = event.currentTarget;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - left) / width));
    const y = Math.min(1, Math.max(0, (event.clientY - top) / height));
    // Same gentle tilt as the featured article cards.
    card.style.setProperty('--tilt', `rotateX(${(0.5 - y) * 9}deg) rotateY(${(x - 0.5) * 12}deg)`);
  }

  function resetTilt(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.removeProperty('--tilt');
  }

  return (
    <article
      className={styles.card}
      data-topic={id}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
      onKeyDown={(event) => {
        if (flipped && event.key === 'Escape') flip(false);
      }}
    >
      <div className={styles.tilt}>
        <div className={styles.flip} data-flipped={flipped}>
          <div className={styles.face} inert={flipped} aria-hidden={flipped}>
            <div className={styles.surface} aria-hidden="true">
              <div className={styles.photo} />
            </div>
            <div className={styles.front}>
              <div className={styles.kicker} aria-hidden="true">
                <span className={styles.issue}>No.{String(index).padStart(2, '0')}</span>
                <span>Topic</span>
              </div>
              <h3 className={styles.title} id={titleId}>
                {title}
              </h3>
              <p className={styles.description}>{description}</p>
              <span className={styles.count} id={countId}>
                {posts.length} 篇文章
              </span>
            </div>
            <button
              ref={openButtonRef}
              type="button"
              className={styles.open}
              aria-expanded={flipped}
              aria-controls={backId}
              aria-labelledby={titleId}
              aria-describedby={countId}
              onClick={() => flip(true)}
            >
              <span className={styles.icon} aria-hidden="true">
                ↻
              </span>
            </button>
          </div>

          <div
            className={`${styles.face} ${styles.backFace}`}
            id={backId}
            inert={!flipped}
            aria-hidden={!flipped}
          >
            <div className={styles.surface} />
            <div className={styles.back}>
              <h3 className={styles.backTitle}>{title}</h3>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.close}
                aria-label={`翻回 ${title} 的正面`}
                onClick={() => flip(false)}
              >
                <span className={styles.icon} aria-hidden="true">
                  ↺
                </span>
              </button>
              <ul className={styles.articles} aria-label={`${title} 的文章`}>
                {posts.map((post) => (
                  <li key={post.href}>
                    <Link href={post.href} prefetch={false}>
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
