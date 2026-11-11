'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { WarpTextOptions } from './warp-text/mount';
import './WarpText.css';

type WarpTextProps = Partial<WarpTextOptions> & {
  text: string;
  fontSize?: number | string;
  fontWeight?: CSSProperties['fontWeight'];
  fontFamily?: CSSProperties['fontFamily'];
  letterSpacing?: CSSProperties['letterSpacing'];
  lineHeight?: CSSProperties['lineHeight'];
  style?: CSSProperties;
};

export default function WarpText({
  text,
  fontSize = 116,
  fontWeight = 800,
  fontFamily = 'inherit',
  letterSpacing = '-0.06em',
  lineHeight = 0.9,
  style,
  warpStrength = 0.08,
  warpScale = 1.7,
  speed = 0.55,
  lens = 'bulge',
  pointerInfluence = 0.42,
  pointerStrength = 0.38,
  refraction = 0.018,
  chromatic = 0.35,
  idleDrift = 0.2,
  ripple = true,
  clickRipple = true,
  intro = true,
}: WarpTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const label = labelRef.current;
    if (!container || !label) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let version = 0;
    let dispose: (() => void) | undefined;

    const update = () => {
      const attempt = ++version;
      if (reducedMotion.matches) {
        dispose?.();
        dispose = undefined;
        return;
      }
      if (!inView || dispose) return;

      void Promise.all([import('./warp-text/mount'), document.fonts.ready])
        .then(([{ mountWarpText }]) => {
          if (attempt !== version) return;
          dispose = mountWarpText(container, label, {
            warpStrength,
            warpScale,
            speed,
            lens,
            pointerInfluence,
            pointerStrength,
            refraction,
            chromatic,
            idleDrift,
            ripple,
            clickRipple,
            intro,
          });
        })
        .catch(() => {
          // The heading text remains visible when the renderer cannot be loaded.
        });
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(container);
    reducedMotion.addEventListener('change', update);

    return () => {
      version++;
      observer.disconnect();
      reducedMotion.removeEventListener('change', update);
      dispose?.();
    };
  }, [
    text,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    warpStrength,
    warpScale,
    speed,
    lens,
    pointerInfluence,
    pointerStrength,
    refraction,
    chromatic,
    idleDrift,
    ripple,
    clickRipple,
    intro,
  ]);

  return (
    <span ref={containerRef} className="warp-text" style={style}>
      <span
        ref={labelRef}
        className="warp-text__label"
        style={{ fontSize, fontWeight, fontFamily, letterSpacing, lineHeight }}
      >
        {text}
      </span>
    </span>
  );
}
