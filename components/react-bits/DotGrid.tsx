'use client';

import { useEffect, useRef } from 'react';
import type { mountDotGrid, DotGridSettings } from './dot-grid/mount';
import type { mountDotGridFallback } from './dot-grid/fallback';
import './DotGrid.css';

export default function DotGrid({
  baseColor = '#3a3446',
  activeColor = '#ffffff',
  shape = 'circle',
  dotSize = 5,
  gap = 18,
  proximity = 140,
  strength = 0.5,
  bounce = 0.3,
  tension = 0.4,
  returnDuration = 1.4,
  shockRadius = 320,
  shockStrength = 5,
  swell = 0.4,
  stretch = 0.2,
  glow = 0.25,
  fade = 0.5,
  intro = true,
  opacity = 1,
  mouseInteraction = true,
  clickShock = true,
}: Partial<DotGridSettings>) {
  const regionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const region = regionRef.current;
    const canvas = canvasRef.current;
    if (!region || !canvas) return;

    let engine: ReturnType<typeof mountDotGrid>;
    let visible = false;
    let disposed = false;
    let loading = false;
    let mountFallback: typeof mountDotGridFallback | undefined;
    const options = {
      baseColor,
      activeColor,
      shape,
      dotSize,
      gap,
      proximity,
      strength,
      bounce,
      tension,
      returnDuration,
      shockRadius,
      shockStrength,
      swell,
      stretch,
      glow,
      fade,
      intro,
      opacity,
      mouseInteraction,
      clickShock,
    };
    const switchToFallback = () => {
      if (disposed) return;
      engine?.dispose();
      engine = mountFallback?.(region, options);
      engine?.setVisible(visible);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      engine?.setVisible(visible);
      if (!visible || engine || loading) return;
      loading = true;
      void Promise.all([import('./dot-grid/mount'), import('./dot-grid/fallback')])
        .then(([renderer, fallback]) => {
          if (disposed || !visible) return;
          mountFallback = fallback.mountDotGridFallback;
          engine = renderer.mountDotGrid(region, canvas, options);
          if (engine) engine.setVisible(true);
          else switchToFallback();
        })
        .catch(() => switchToFallback())
        .finally(() => {
          loading = false;
        });
    });
    observer.observe(region);
    canvas.addEventListener('webglcontextlost', switchToFallback);

    return () => {
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', switchToFallback);
      engine?.dispose();
      delete region.dataset.dotGrid;
    };
  }, [
    baseColor,
    activeColor,
    shape,
    dotSize,
    gap,
    proximity,
    strength,
    bounce,
    tension,
    returnDuration,
    shockRadius,
    shockStrength,
    swell,
    stretch,
    glow,
    fade,
    intro,
    opacity,
    mouseInteraction,
    clickShock,
  ]);

  return (
    <div ref={regionRef} className="dot-grid" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
