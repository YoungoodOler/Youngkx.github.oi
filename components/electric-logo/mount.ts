import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import { arcCount, fragment, vertex } from './shader';
import { loadLogoShape, spawnArc } from './shape';

type Theme = 'dark' | 'light';
const palettes = {
  dark: { line: [0.93, 0.78, 1], glow: [0.68, 0.43, 1], ink: 0 },
  light: { line: [0.2, 0.09, 0.35], glow: [0.52, 0.33, 0.72], ink: 1 },
};
const speed = 2.3;
const cursorRadius = 20;
const logoScale = 0.76;

export async function mountElectricLogo(
  container: HTMLElement,
  readTheme: () => Theme,
  signal: AbortSignal,
  onReady: () => void,
) {
  if (signal.aborted) return;
  const tracedLogo = await loadLogoShape();
  if (!tracedLogo || signal.aborted) return;
  const shape = tracedLogo;

  const canvas = document.createElement('canvas');
  const options = {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power' as const,
  };
  const context = canvas.getContext('webgl2', options) as WebGL2RenderingContext | null;
  if (!context) return;

  const listeners = new AbortController();
  const observer = new ResizeObserver(resize);
  let frameId = 0;
  let entered = false;
  const stop = () => {
    cancelAnimationFrame(frameId);
    observer.disconnect();
    listeners.abort();
    container.removeAttribute('data-electric-logo');
    canvas.remove();
    if (!context.isContextLost()) context.getExtension('WEBGL_lose_context')?.loseContext();
    if (!entered && !signal.aborted) onReady();
  };
  signal.addEventListener('abort', stop, { signal: listeners.signal });
  canvas.addEventListener('webglcontextlost', stop, { signal: listeners.signal });

  const renderer = new Renderer({ canvas, ...options });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const textureOptions = {
    type: gl.FLOAT,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    generateMipmaps: false,
    flipY: false,
    unpackAlignment: 1,
  };
  const field = new Texture(gl, {
    ...textureOptions,
    image: shape.field,
    width: shape.width,
    height: shape.height,
    internalFormat: context.R16F,
    format: context.RED,
  });
  const glow = new Texture(gl, {
    ...textureOptions,
    image: shape.glow,
    width: shape.glowWidth,
    height: shape.glowHeight,
    internalFormat: context.RG16F,
    format: context.RG,
  });
  const arcEnds = new Float32Array(arcCount * 4);
  const arcShape = new Float32Array(arcCount * 4);
  const hoverUniform = [0, 0, 0];
  const palette = palettes[readTheme()];
  const uniforms = {
    tField: { value: field },
    tGlow: { value: glow },
    uMap: { value: [0, 0, 1, shape.glowOffset] },
    uSize: { value: [shape.width, shape.height, shape.glowWidth, shape.glowHeight] },
    uResolution: { value: [1, 1] },
    uUnit: { value: 1 },
    uTime: { value: 0 },
    uPresence: { value: 0 },
    uHover: { value: hoverUniform },
    uHoverRadius: { value: cursorRadius },
    uPulse: { value: [0, 0, 0, 0] },
    uPulseBoost: { value: 0 },
    uFlash: { value: 0 },
    uColor: { value: palette.line.slice() },
    uGlowColor: { value: palette.glow.slice() },
    uInk: { value: palette.ink },
    uArcEnds: { value: arcEnds },
    uArcShape: { value: arcShape },
  };
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
    stop();
    return;
  }
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  let fit = 1;
  let left = 0;
  let top = 0;
  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.dpr = Math.min(
      window.devicePixelRatio || 1,
      1.5,
      Math.sqrt(160_000 / (width * height)),
    );
    renderer.setSize(width, height);
    fit = logoScale * Math.min(width / shape.logoWidth, height / shape.logoHeight);
    left = width / 2 - (shape.pad + shape.logoWidth / 2) * fit;
    top = height / 2 - (shape.pad + shape.logoHeight / 2) * fit;
    uniforms.uMap.value = [left, top, fit, shape.glowOffset];
    uniforms.uUnit.value = (Math.max(shape.logoWidth, shape.logoHeight) * fit) / 100;
    uniforms.uHoverRadius.value = Math.max(cursorRadius, width * 0.22);
    uniforms.uResolution.value = [width, height];
  }

  const pointer = { x: 0, y: 0, over: false };
  const hover = { x: 0, y: 0, vx: 0, vy: 0, power: 0 };
  const sparks: NonNullable<ReturnType<typeof spawnArc>>[] = [];
  let pulse: { x: number; y: number; start: number } | undefined;
  let burst = false;
  let last = performance.now();
  let elapsed = 0;
  let ready = false;

  const onMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.over = event.pointerType !== 'touch';
  };
  const onDown = (event: PointerEvent) => {
    onMove(event);
    pulse = { x: pointer.x, y: pointer.y, start: performance.now() };
    burst = true;
  };
  const onLeave = () => {
    pointer.over = false;
  };
  const listenerOptions = { signal: listeners.signal, passive: true };
  container.addEventListener('pointermove', onMove, listenerOptions);
  container.addEventListener('pointerdown', onDown, listenerOptions);
  container.addEventListener('pointerleave', onLeave, listenerOptions);
  container.addEventListener('pointercancel', onLeave, listenerOptions);

  const render = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;
    const time = elapsed * speed;
    const progress = Math.min(1, elapsed / 0.65);
    const presence = progress * progress * (3 - 2 * progress);
    if (pointer.over && hover.power < 0.01) {
      hover.x = pointer.x;
      hover.y = pointer.y;
      hover.vx = 0;
      hover.vy = 0;
    }
    hover.vx += ((pointer.x - hover.x) * 120 - hover.vx * 19) * dt;
    hover.vy += ((pointer.y - hover.y) * 120 - hover.vy * 19) * dt;
    hover.x += hover.vx * dt;
    hover.y += hover.vy * dt;
    hover.power += (Number(pointer.over) - hover.power) * (1 - Math.exp(-dt / 0.25));
    hoverUniform[0] = hover.x;
    hoverUniform[1] = hover.y;
    hoverUniform[2] = hover.power * 0.75;

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      if (time - sparks[i].born > sparks[i].life) sparks.splice(i, 1);
    }
    const focused = burst || Math.random() < dt * speed * hover.power * 3;
    if (sparks.length < arcCount && (focused || Math.random() < dt * speed)) {
      const spot = burst ? pointer : hover;
      const spark = spawnArc(
        shape,
        time,
        focused
          ? {
              x: (spot.x - left) / fit,
              y: (spot.y - top) / fit,
              radius: uniforms.uHoverRadius.value / fit,
            }
          : undefined,
      );
      if (spark) sparks.push(spark);
    }
    burst = false;

    for (let i = 0; i < arcCount; i += 1) {
      const offset = i * 4;
      const spark = sparks[i];
      if (!spark) {
        arcShape[offset + 1] = 0;
        continue;
      }
      arcEnds[offset] = left + spark.ax * fit;
      arcEnds[offset + 1] = top + spark.ay * fit;
      arcEnds[offset + 2] = left + spark.bx * fit;
      arcEnds[offset + 3] = top + spark.by * fit;
      arcShape[offset] = spark.bow * fit;
      arcShape[offset + 1] = Math.sin((Math.PI * (time - spark.born)) / spark.life) * presence;
      arcShape[offset + 2] = spark.seed;
    }

    const pulseAge = pulse ? (now - pulse.start) / 1000 : 0;
    if (pulse && pulseAge > 2) pulse = undefined;
    uniforms.uPulse.value = pulse ? [pulse.x, pulse.y, pulseAge, 1] : [0, 0, 0, 0];
    uniforms.uPulseBoost.value = pulse ? Math.exp(-pulseAge * 1.7) : 0;
    uniforms.uFlash.value = pulse ? Math.exp(-pulseAge * 7) : 0;
    uniforms.uTime.value = time;
    uniforms.uPresence.value = presence;
    const next = palettes[readTheme()];
    const mix = 1 - Math.exp(-dt / 0.25);
    for (let i = 0; i < 3; i += 1) {
      uniforms.uColor.value[i] += (next.line[i] - uniforms.uColor.value[i]) * mix;
      uniforms.uGlowColor.value[i] += (next.glow[i] - uniforms.uGlowColor.value[i]) * mix;
    }
    uniforms.uInk.value += (next.ink - uniforms.uInk.value) * mix;

    renderer.render({ scene: mesh });
    if (!ready) {
      if (gl.getError() !== gl.NO_ERROR) {
        stop();
        return;
      }
      ready = true;
      container.dataset.electricLogo = '';
    }
    if (!entered && progress === 1) {
      entered = true;
      onReady();
    }
    frameId = requestAnimationFrame(render);
  };

  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);
  resize();
  observer.observe(container);
  frameId = requestAnimationFrame(render);
  return true;
}
