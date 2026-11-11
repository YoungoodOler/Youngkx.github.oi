import { pointerIdleMs, restingOpacity, type DotGridSettings } from './mount';

export function mountDotGridFallback(region: HTMLDivElement, settings: DotGridSettings) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const style = region.style;
  const properties = {
    '--dot-grid-dot': `${settings.dotSize / 2}px`,
    '--dot-grid-cell': `${settings.dotSize + settings.gap}px`,
    '--dot-grid-color': `color-mix(in srgb, ${settings.baseColor}, ${settings.activeColor} 48%)`,
    '--dot-grid-opacity': String(settings.opacity),
    '--dot-grid-resting-opacity': String(settings.opacity * restingOpacity),
    '--dot-grid-radius': `${settings.proximity}px`,
  };
  for (const [name, value] of Object.entries(properties)) style.setProperty(name, value);
  region.dataset.dotGrid = 'fallback';
  let visible = false;
  let idleTimer = 0;
  let point: { x: number; y: number } | undefined;

  const hide = () => {
    window.clearTimeout(idleTimer);
    delete region.dataset.dotGridReveal;
    point = undefined;
  };

  const position = () => {
    if (!point) return false;
    const rect = region.getBoundingClientRect();
    const x = point.x - rect.left;
    const y = point.y - rect.top;
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      hide();
      return false;
    }
    style.setProperty('--dot-grid-x', `${x}px`);
    style.setProperty('--dot-grid-y', `${y}px`);
    return true;
  };

  const reveal = (event: PointerEvent, radius: number) => {
    if (!visible) return;
    point = { x: event.clientX, y: event.clientY };
    if (!position()) return;
    const touch = event.pointerType === 'touch';
    style.setProperty('--dot-grid-radius', `${radius}px`);
    region.dataset.dotGridReveal = 'active';
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (touch) hide();
      else region.dataset.dotGridReveal = 'resting';
    }, pointerIdleMs);
  };

  const onMove = (event: PointerEvent) => {
    if (settings.mouseInteraction && event.pointerType !== 'touch')
      reveal(event, settings.proximity);
  };
  const onDown = (event: PointerEvent) => {
    if (settings.clickShock && event.button === 0) {
      reveal(event, reduced ? settings.proximity : settings.shockRadius);
    }
  };
  const onOut = (event: PointerEvent) => {
    if (!event.relatedTarget && event.pointerType !== 'touch') hide();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerout', onOut);
  window.addEventListener('scroll', position, { passive: true });
  window.addEventListener('blur', hide);

  return {
    setVisible: (isVisible: boolean) => {
      visible = isVisible;
      if (!visible) hide();
    },
    dispose: () => {
      hide();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('scroll', position);
      window.removeEventListener('blur', hide);
      for (const name of [...Object.keys(properties), '--dot-grid-x', '--dot-grid-y']) {
        style.removeProperty(name);
      }
    },
  };
}
