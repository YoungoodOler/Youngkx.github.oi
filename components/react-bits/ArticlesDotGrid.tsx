'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import './ArticlesDotGrid.css';

const DotGrid = dynamic(() => import('./DotGrid'), { ssr: false });

// The homepage preset and idle reveal are from React Bits Hero.jsx at e12c221.
// See dot-grid/LICENSE.md for the upstream license.
const dotSize = 2.6;
const gap = 22;
const radius = 360;
const idleDelay = 2600;
const cell = dotSize + gap;
const whiteTint = 0.22;
const layerStyle = {
  '--dot-grid-tint': `rgb(255 255 255 / ${whiteTint})`,
  '--dot-grid-dot': `${dotSize / 2 + 0.15}px`,
  '--dot-grid-radius': `${radius}px`,
  '--dot-grid-cell': `${cell}px`,
} as CSSProperties;

export default function ArticlesDotGrid() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const gridRef = useRef({ width: 0, originX: 0, originY: 0 });
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [idle, setIdle] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const onUnavailable = useCallback(() => setUnavailable(true), []);
  const showGhost = visible && (idle || !hover || unavailable);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateHover = () => setHover(media.matches);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    updateHover();
    media.addEventListener('change', updateHover);
    observer.observe(viewport);
    return () => {
      media.removeEventListener('change', updateHover);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const frame = frameRef.current;
    if (!viewport || !frame) return;
    const layout = () => {
      const { clientWidth: width, clientHeight: height } = viewport;
      const cols = Math.max(1, Math.floor((width + gap) / cell));
      const rows = Math.max(1, Math.floor((height + gap) / cell));
      const originX = (width - cols * cell) / 2;
      const originY = (height - rows * cell) / 2;
      gridRef.current = { width, originX, originY };
      frame.style.backgroundPosition = `${originX}px ${originY}px`;
    };
    const observer = new ResizeObserver(layout);
    layout();
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const frame = frameRef.current;
    if (!viewport || !frame || !visible || !hover || unavailable) return;
    let timer = 0;
    let resting = true;
    const wide = window.matchMedia('(min-width: 2160px)');
    const rest = () => {
      window.clearTimeout(timer);
      resting = true;
      setIdle(true);
      frame.style.removeProperty('--hole-x');
      frame.style.removeProperty('--hole-y');
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const bounds = viewport.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (x < 0 || x > bounds.width || y < 0 || y > bounds.height) return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (resting) {
        resting = false;
        setIdle(false);
      }
      if (wide.matches) {
        frame.style.setProperty('--hole-x', `${x.toFixed(1)}px`);
        frame.style.setProperty('--hole-y', `${y.toFixed(1)}px`);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(rest, idleDelay);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      rest();
      pointerRef.current = null;
      window.removeEventListener('pointermove', move);
    };
  }, [visible, hover, unavailable]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const spot = spotRef.current;
    const dots = dotsRef.current;
    if (!viewport || !spot || !dots || !showGhost) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wrap = (value: number) => ((value % cell) + cell) % cell;
    const bounds = viewport.getBoundingClientRect();
    const band = Math.min(400, bounds.height);
    const start = pointerRef.current;
    const from =
      start && start.y - bounds.top < band + radius * 0.5
        ? { x: start.x - bounds.left, y: start.y - bounds.top }
        : null;
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - began) / 1000;
      const { width, originX, originY } = gridRef.current;
      const x =
        width * 0.58 +
        width * 0.36 * (0.62 * Math.sin(t * 0.16 + 0.4) + 0.38 * Math.sin(t * 0.07 + 2.2));
      const y =
        band * 0.52 +
        band * 0.3 * (0.6 * Math.sin(t * 0.12 + 1.1) + 0.4 * Math.sin(t * 0.05 + 0.3));
      const progress = Math.min(1, t / 3.2);
      const blend = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
      const left = (from && !reduced ? from.x + (x - from.x) * blend : x) - radius;
      const top = (from && !reduced ? from.y + (y - from.y) * blend : y) - radius;
      spot.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      dots.style.transform = `translate3d(${(wrap(originX - left) - cell).toFixed(1)}px, ${(wrap(originY - top) - cell).toFixed(1)}px, 0)`;
      if (!reduced) frame = requestAnimationFrame(tick);
    };
    tick(began);
    return () => cancelAnimationFrame(frame);
  }, [showGhost]);

  return (
    <div className="dot-grid" aria-hidden="true">
      <div ref={viewportRef} className="articles-dot-grid__viewport" style={layerStyle}>
        {visible && hover && !unavailable && (
          <DotGrid
            dpr={Math.min(window.devicePixelRatio || 1, 1.5)}
            dotSize={dotSize}
            gap={gap}
            activeAlpha={whiteTint}
            proximity={radius}
            strength={1.15}
            bounce={0.7}
            tension={0.35}
            swell={1.4}
            stretch={0.5}
            glow={0.15}
            opacity={0.55}
            shockRadius={380}
            shockStrength={4}
            intro={false}
            mouseInteraction={!idle}
            onUnavailable={onUnavailable}
          />
        )}
        <div ref={frameRef} className="articles-dot-grid__frame" />
        <div className="articles-dot-grid__ghost" data-on={showGhost ? '' : undefined}>
          <div ref={spotRef} className="articles-dot-grid__spot">
            <div ref={dotsRef} className="articles-dot-grid__dots" />
          </div>
        </div>
      </div>
    </div>
  );
}
