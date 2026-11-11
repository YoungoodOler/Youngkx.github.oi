'use client';

import { useEffect, useRef } from 'react';

const labelFont = '10px ui-monospace, monospace';
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const approach = (value: number, target: number, dt: number, seconds: number) =>
  value + (target - value) * (1 - Math.exp(-dt / seconds));
const spring = 320;
const damping = 2 * Math.sqrt(spring) * (1 - 0.4 * 0.96);

type Point = { x: number; y: number };
type GlyphMotion = Point & { vx: number; vy: number; outline: number };
type Selection = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  alpha: number;
  index: number;
};

function smoothstep(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

// Use the supplied TechText metrics and spring motion in the homepage heading.
function measure(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  w: number,
  h: number,
) {
  const font = (size: number) => `400 ${size}px ${family}`;
  ctx.font = font(110);
  const initial = ctx.measureText(text);
  const size =
    110 *
    Math.min(
      1,
      (w * 0.89) / initial.width,
      (h * 0.64) / (initial.actualBoundingBoxAscent + initial.actualBoundingBoxDescent),
    );
  ctx.font = font(size);
  const metrics = ctx.measureText(text);
  const left = (w - metrics.width) / 2;
  const baseline = (h + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
  const top = baseline - metrics.actualBoundingBoxAscent;
  const bottom = baseline + metrics.actualBoundingBoxDescent;
  const xHeight = baseline - ctx.measureText('x').actualBoundingBoxAscent;
  const capHeight = baseline - ctx.measureText('H').actualBoundingBoxAscent;
  let prefix = '';
  const glyphs = Array.from(text).flatMap((char) => {
    prefix += char;
    if (!char.trim()) return [];
    const m = ctx.measureText(char);
    const x = left + ctx.measureText(prefix).width - m.width;
    return [
      {
        char,
        x,
        left: x - m.actualBoundingBoxLeft,
        right: x + m.actualBoundingBoxRight,
        top: baseline - m.actualBoundingBoxAscent,
        bottom: baseline + m.actualBoundingBoxDescent,
      },
    ];
  });
  return {
    font: font(size),
    left,
    right: left + metrics.width,
    top,
    bottom,
    baseline,
    glyphs,
    lines: [capHeight, xHeight, baseline, bottom],
    bands: [
      [xHeight, baseline, true],
      [capHeight, xHeight, true],
      [top - 2, capHeight, true],
      [baseline, bottom + 2, false],
    ] as const,
  };
}

type Layout = ReturnType<typeof measure>;
type Glyph = Layout['glyphs'][number];

function glyphAt(view: Layout, glyphMotion: GlyphMotion[], point: Point, padding: number) {
  let nearest = -1;
  let distance = padding;
  for (const [index, glyph] of view.glyphs.entries()) {
    const offset = glyphMotion[index];
    if (point.y < glyph.top + offset.y - padding || point.y > glyph.bottom + offset.y + padding) {
      continue;
    }
    const gap = Math.max(glyph.left + offset.x - point.x, point.x - glyph.right - offset.x, 0);
    if (gap < distance) {
      distance = gap;
      nearest = index;
    }
  }
  return nearest;
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  box: Selection,
  glyph: Glyph,
  offset: Point,
  accent: string,
) {
  const w = box.right - box.left;
  const h = box.bottom - box.top;
  const moved = Math.hypot(offset.x, offset.y) > 1;
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  if (moved) {
    const x = (glyph.left + glyph.right) / 2;
    const y = (glyph.top + glyph.bottom) / 2;
    ctx.setLineDash([3, 4]);
    ctx.globalAlpha = box.alpha * 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + offset.x, y + offset.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  ctx.globalAlpha = box.alpha * 0.5;
  ctx.strokeRect(box.left, box.top, w, h);
  ctx.globalAlpha = box.alpha * 0.95;
  for (const x of [box.left, box.right]) {
    for (const y of [box.top, box.bottom]) ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  ctx.globalAlpha = box.alpha * 0.75;
  ctx.font = labelFont;
  const signed = (value: number) => {
    const rounded = Math.round(value);
    return rounded > 0 ? `+${rounded}` : String(rounded);
  };
  const label = moved
    ? `${signed(offset.x)}, ${signed(-offset.y)}`
    : `${glyph.char}  ${Math.round(glyph.right - glyph.left)} × ${Math.round(glyph.bottom - glyph.top)}`;
  ctx.fillText(label, box.left, box.top - 6);
  ctx.globalAlpha = 1;
}

export default function TechText({
  id,
  text,
  theme,
}: {
  id: string;
  text: string;
  theme: 'dark' | 'light';
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    wakeRef.current();
  }, [theme]);

  useEffect(() => {
    const heading = headingRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!heading || !canvas || !ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listeners = new AbortController();
    let visible = false;
    let frame = 0;
    let start = 0;
    let lastPaint = 0;
    let ratio = 1;
    let layout: Layout | undefined;
    let pointer: Point | undefined;
    let dragging: { index: number; pointerId: number; grab: Point } | undefined;
    let introducing = true;
    const glyphMotion: GlyphMotion[] = Array.from(text)
      .filter((char) => char.trim())
      .map(() => ({ x: 0, y: 0, vx: 0, vy: 0, outline: 0 }));
    const selection: Selection = { left: 0, top: 0, right: 0, bottom: 0, alpha: 0, index: -1 };

    const showStaticTitle = () => {
      heading.removeAttribute('data-tech-text');
      if (dragging && heading.hasPointerCapture(dragging.pointerId)) {
        heading.releasePointerCapture(dragging.pointerId);
      }
      dragging = undefined;
      pointer = undefined;
      selection.alpha = 0;
      selection.index = -1;
      heading.style.cursor = '';
      for (const offset of glyphMotion)
        offset.x = offset.y = offset.vx = offset.vy = offset.outline = 0;
    };

    const wake = () => {
      if (visible && !frame && !motion.matches && !listeners.signal.aborted) {
        frame = requestAnimationFrame(draw);
      }
    };
    wakeRef.current = wake;

    const draw = (now: number) => {
      frame = 0;
      if (!visible) return;
      if (motion.matches) {
        showStaticTitle();
        return;
      }
      if (!pointer && now - lastPaint < 32) {
        wake();
        return;
      }
      const dt = lastPaint ? Math.min((now - lastPaint) / 1000, 0.032) : 1 / 60;
      lastPaint = now;
      const bounds = heading.getBoundingClientRect();
      const surface = canvas.getBoundingClientRect();
      const { width, height } = bounds;
      if (!width || !height || !surface.width || !surface.height) return;
      const style = getComputedStyle(heading);
      if (!layout) {
        ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(2_500_000 / (surface.width * surface.height)),
        );
        canvas.width = Math.round(surface.width * ratio);
        canvas.height = Math.round(surface.height * ratio);
        layout = measure(ctx, text, style.fontFamily, width, height);
      }
      const view = layout;
      if (!start) start = now;
      const progress = clamp((now - start) / 1250);
      const sweep = 0.5 - 0.5 * Math.cos((now - start - 1250) * 0.00045);
      introducing = progress < 1;
      let settling = false;
      for (const [index, offset] of glyphMotion.entries()) {
        if (dragging?.index === index && pointer) {
          offset.x = approach(offset.x, pointer.x - dragging.grab.x, dt, 0.03);
          offset.y = approach(offset.y, pointer.y - dragging.grab.y, dt, 0.03);
          offset.vx = 0;
          offset.vy = 0;
        } else if (
          Math.hypot(offset.x, offset.y) > 0.05 ||
          Math.hypot(offset.vx, offset.vy) > 0.5
        ) {
          offset.vx += (-spring * offset.x - damping * offset.vx) * dt;
          offset.vy += (-spring * offset.y - damping * offset.vy) * dt;
          offset.x += offset.vx * dt;
          offset.y += offset.vy * dt;
          settling = true;
        } else {
          offset.x = offset.y = offset.vx = offset.vy = 0;
        }
      }

      const inspection = pointer ?? {
        x: view.left + (view.right - view.left) * sweep,
        y: (view.top + view.bottom) / 2,
      };
      const focus = introducing
        ? -1
        : (dragging?.index ?? glyphAt(view, glyphMotion, inspection, 12));
      if (focus >= 0) {
        const glyph = view.glyphs[focus];
        const offset = glyphMotion[focus];
        const duration = dragging ? 0.02 : 0.08;
        const left = glyph.left + offset.x - 6;
        const right = glyph.right + offset.x + 6;
        const top = glyph.top + offset.y - 6;
        const bottom = glyph.bottom + offset.y + 6;
        const entering = selection.index < 0 || selection.alpha < 0.02;
        selection.left = entering ? left : approach(selection.left, left, dt, duration);
        selection.right = entering ? right : approach(selection.right, right, dt, duration);
        selection.top = entering ? top : approach(selection.top, top, dt, duration);
        selection.bottom = entering ? bottom : approach(selection.bottom, bottom, dt, duration);
        selection.index = focus;
        settling ||=
          Math.abs(selection.left - left) +
            Math.abs(selection.top - top) +
            Math.abs(selection.right - right) +
            Math.abs(selection.bottom - bottom) >
          0.2;
      }
      const alpha = focus >= 0 ? 1 : 0;
      selection.alpha = approach(selection.alpha, alpha, dt, 0.1);
      settling ||= Math.abs(selection.alpha - alpha) > 0.01;
      for (const [index, offset] of glyphMotion.entries()) {
        const outline = index === focus && !dragging ? 1 : 0;
        offset.outline = approach(offset.outline, outline, dt, 0.09);
        if (Math.abs(offset.outline - outline) > 0.005) settling = true;
        else offset.outline = outline;
      }

      const accent = style.getPropertyValue('--accent').trim() || style.color;
      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        (bounds.left - surface.left) * ratio,
        (bounds.top - surface.top) * ratio,
      );
      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = 1;
      const guide = focus >= 0 && !dragging ? 0.45 : 0.62 * (1 - smoothstep(0.72, 1, progress));
      if (guide > 0) {
        const left = Math.max(4, view.left - 12);
        const right = Math.min(width - 4, view.right + 12);
        ctx.globalAlpha = guide;
        view.lines.forEach((y, index) => {
          const end =
            left + (right - left) * smoothstep(0.03 * index, 0.25 + 0.04 * index, progress);
          ctx.beginPath();
          ctx.moveTo(left, Math.round(y) + 0.5);
          ctx.lineTo(end, Math.round(y) + 0.5);
          ctx.stroke();
          ctx.fillRect(end - 1, y - 1, 2, 2);
        });
      }
      ctx.globalAlpha = 1;
      ctx.font = view.font;
      ctx.fillStyle = style.color;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 1.4;
      ctx.lineJoin = 'round';
      ctx.textBaseline = 'alphabetic';
      ctx.setLineDash([3, 2]);
      for (const [index, glyph] of view.glyphs.entries()) {
        const moved = Math.hypot(glyphMotion[index].x, glyphMotion[index].y);
        if (moved <= 1) continue;
        ctx.globalAlpha = Math.min(1, moved / 24) * 0.55;
        ctx.strokeText(glyph.char, glyph.x, view.baseline);
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const [index, glyph] of view.glyphs.entries()) {
        if (!introducing) {
          const offset = glyphMotion[index];
          const outline = index === dragging?.index ? 0 : offset.outline;
          ctx.globalAlpha = 1 - outline;
          ctx.fillText(glyph.char, glyph.x + offset.x, view.baseline + offset.y);
          if (outline > 0) {
            ctx.setLineDash([3, 2]);
            ctx.globalAlpha = outline;
            ctx.strokeText(glyph.char, glyph.x + offset.x, view.baseline + offset.y);
            ctx.setLineDash([]);
          }
          ctx.globalAlpha = 1;
          continue;
        }
        ctx.setLineDash([3, 2]);
        ctx.globalAlpha = smoothstep(0.03, 0.25, progress);
        ctx.strokeText(glyph.char, glyph.x, view.baseline);
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
        const fill = clamp((progress - 0.19 - (0.28 * index) / view.glyphs.length) / 0.47);
        ctx.save();
        ctx.beginPath();
        view.bands.forEach(([top, bottom, up], band) => {
          const amount = (bottom - top) * smoothstep(band * 0.15, 0.55 + band * 0.15, fill);
          if (amount > 0)
            ctx.rect(
              glyph.left - 1,
              up ? bottom - amount : top,
              glyph.right - glyph.left + 2,
              amount,
            );
        });
        ctx.clip();
        ctx.fillText(glyph.char, glyph.x, view.baseline);
        ctx.restore();
      }
      if (selection.index >= 0 && selection.alpha > 0.01) {
        ctx.lineWidth = 1;
        drawSelection(
          ctx,
          selection,
          view.glyphs[selection.index],
          glyphMotion[selection.index],
          accent,
        );
      }
      const cursor = dragging
        ? 'grabbing'
        : pointer && glyphAt(view, glyphMotion, pointer, 4) >= 0
          ? 'grab'
          : '';
      if (heading.style.cursor !== cursor) heading.style.cursor = cursor;
      if (!heading.hasAttribute('data-tech-text')) heading.dataset.techText = '';
      if (introducing || dragging || settling || !pointer) wake();
    };

    const resize = () => {
      layout = undefined;
      wake();
    };
    const size = new ResizeObserver(resize);
    size.observe(heading);
    size.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      wake();
    });
    intersection.observe(heading);
    const events = { signal: listeners.signal };
    motion.addEventListener(
      'change',
      () => {
        if (motion.matches) showStaticTitle();
        wake();
      },
      events,
    );
    const locate = (event: PointerEvent) => {
      const rect = heading.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onMove = (event: PointerEvent) => {
      if (dragging ? event.pointerId !== dragging.pointerId : event.pointerType === 'touch') return;
      pointer = locate(event);
      wake();
    };
    heading.addEventListener('pointermove', onMove, events);
    heading.addEventListener('pointerenter', onMove, events);
    heading.addEventListener(
      'pointerdown',
      (event) => {
        if (
          motion.matches ||
          introducing ||
          !layout ||
          dragging ||
          !event.isPrimary ||
          event.button !== 0
        )
          return;
        const point = locate(event);
        const index = glyphAt(layout, glyphMotion, point, 4);
        if (index < 0) return;
        const offset = glyphMotion[index];
        dragging = {
          index,
          pointerId: event.pointerId,
          grab: { x: point.x - offset.x, y: point.y - offset.y },
        };
        pointer = point;
        heading.setPointerCapture(event.pointerId);
        wake();
      },
      events,
    );
    const release = (event: PointerEvent) => {
      if (dragging?.pointerId !== event.pointerId) return;
      dragging = undefined;
      if (heading.hasPointerCapture(event.pointerId))
        heading.releasePointerCapture(event.pointerId);
      const point = locate(event);
      pointer =
        event.type === 'pointerup' &&
        event.pointerType !== 'touch' &&
        point.x >= 0 &&
        point.x <= heading.clientWidth &&
        point.y >= 0 &&
        point.y <= heading.clientHeight
          ? point
          : undefined;
      wake();
    };
    heading.addEventListener('pointerup', release, events);
    heading.addEventListener('pointercancel', release, events);
    heading.addEventListener('lostpointercapture', release, events);
    heading.addEventListener(
      'pointerleave',
      () => {
        if (dragging) return;
        pointer = undefined;
        wake();
      },
      events,
    );
    document.fonts?.ready.then(resize);
    return () => {
      listeners.abort();
      cancelAnimationFrame(frame);
      size.disconnect();
      intersection.disconnect();
      heading.removeAttribute('data-tech-text');
      heading.style.cursor = '';
      wakeRef.current = () => {};
    };
  }, [text]);

  return (
    <h1 id={id} ref={headingRef} className="tech-text">
      <span>{text}</span>
      <canvas ref={canvasRef} aria-hidden="true" />
    </h1>
  );
}
