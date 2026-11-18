'use client';

import { type CSSProperties, useEffect, useRef } from 'react';
import './PageBackdrop.css';

/*
 * Sub-page hero backdrop, after Linear's hairline grid and Aceternity UI's
 * Background Beams and Card Spotlight: one soft accent glow from the top, a
 * masked grid with light running along its lines, and a brighter grid that
 * follows the pointer. List rows below get a matching pointer-tracked glow.
 * Everything is CSS; the script only feeds coordinates.
 */

// Grid columns are counted from the centre line; negative is left of centre.
const verticalBeams = [
  { col: -6, duration: 10, delay: 0.6 },
  { col: 3, duration: 12, delay: 4.2 },
  { col: 8, duration: 11, delay: 7.4 },
];
const horizontalBeams = [{ row: 4, duration: 16, delay: 2.4 }];

const cardSelector = '.directory-row, .category-posts a, .repo-file-row';

export default function PageBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let pointerX = -1000;
    let pointerY = -1000;
    let card: HTMLElement | null = null;

    const apply = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      const y = pointerY - box.top;
      root.style.setProperty('--pb-x', `${pointerX - box.left}px`);
      root.style.setProperty('--pb-y', `${y}px`);
      root.toggleAttribute('data-pointer', y >= 0 && y < box.height);
      if (card) {
        const cardBox = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${pointerX - cardBox.left}px`);
        card.style.setProperty('--spot-y', `${pointerY - cardBox.top}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const move = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      card =
        event.target instanceof Element ? event.target.closest<HTMLElement>(cardSelector) : null;
      schedule();
    };
    const leave = () => root.removeAttribute('data-pointer');

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', schedule);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div ref={ref} className="page-backdrop" aria-hidden="true">
      <div className="page-backdrop__field">
        <div className="page-backdrop__grid" />
        <div className="page-backdrop__grid page-backdrop__grid--lit" />
        {verticalBeams.map(({ col, duration, delay }) => (
          <span
            key={`v${col}`}
            className="page-backdrop__beam"
            style={
              {
                '--col': col,
                '--beam-duration': `${duration}s`,
                '--beam-delay': `${delay}s`,
              } as CSSProperties
            }
          />
        ))}
        {horizontalBeams.map(({ row, duration, delay }) => (
          <span
            key={`h${row}`}
            className="page-backdrop__beam page-backdrop__beam--x"
            style={
              {
                '--row': row,
                '--beam-duration': `${duration}s`,
                '--beam-delay': `${delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
