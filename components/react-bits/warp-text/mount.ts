import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import { fragment, vertex } from './shaders';

const LENS_MODES = { bulge: 0, pinch: 1, swirl: 2 } as const;
const INTRO_MS = 1600;
const RIPPLE_LIFE = 1.6;
const MAX_CLICKS = 4;

export type WarpTextOptions = {
  warpStrength: number;
  warpScale: number;
  speed: number;
  lens: keyof typeof LENS_MODES;
  pointerInfluence: number;
  pointerStrength: number;
  refraction: number;
  chromatic: number;
  idleDrift: number;
  ripple: boolean;
  clickRipple: boolean;
  intro: boolean;
};

export function mountWarpText(
  container: HTMLSpanElement,
  label: HTMLSpanElement,
  options: WarpTextOptions,
) {
  const canvas = document.createElement('canvas');
  const attributes = { alpha: true, depth: false, premultipliedAlpha: true };
  if (!canvas.getContext('webgl2', attributes)) return;

  const renderer = new Renderer({ canvas, ...attributes });
  const gl = renderer.gl;
  const raster = document.createElement('canvas');
  const ctx = raster.getContext('2d');
  if (!ctx) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return;
  }

  const texture = new Texture(gl, {
    generateMipmaps: false,
    premultiplyAlpha: true,
    minFilter: gl.LINEAR,
  });
  const geometry = new Triangle(gl);
  // OGL expects a plain array for uniforms declared as arrays in GLSL.
  const clicks = new Array<number>(MAX_CLICKS * 4).fill(0);
  const uniforms = {
    uTextTexture: { value: texture },
    uResolution: { value: new Float32Array([1, 1]) },
    uPointer: { value: new Float32Array([0.5, 0.5]) },
    uPointerActive: { value: 0 },
    uTime: { value: 0 },
    uWarpStrength: { value: options.warpStrength },
    uWarpScale: { value: options.warpScale },
    uSpeed: { value: options.speed },
    uPointerInfluence: { value: options.pointerInfluence },
    uPointerStrength: { value: options.pointerStrength },
    uRefraction: { value: options.refraction },
    uChromatic: { value: options.chromatic },
    uRipple: { value: Number(options.ripple) },
    uLens: { value: LENS_MODES[options.lens] },
    uIntro: { value: 0 },
    uReveal: { value: 0 },
    uBackdrop: { value: 0 },
    uClicks: { value: clicks },
  };
  const program = new Program(gl, {
    vertex,
    fragment,
    depthTest: false,
    depthWrite: false,
    uniforms,
  });
  if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
    program.remove();
    geometry.remove();
    gl.deleteTexture(texture.texture);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return;
  }

  const mesh = new Mesh(gl, { geometry, program });
  const pointer = { x: 0.5, y: 0.5, engaged: false };
  const drift = Math.min(Math.max(options.idleDrift, 0), 1);
  const lines = (label.textContent ?? '').split('\n');
  let clickSlot = 0;
  let visible = false;
  let ready = false;
  let disposed = false;
  let raf = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let nextColorCheck = 0;
  let ink = '';
  let introProgress = options.intro ? 0 : 1;

  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!ctx || !width || !height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.dpr = dpr;
    renderer.setSize(width, height);
    uniforms.uResolution.value.set([gl.drawingBufferWidth, gl.drawingBufferHeight]);
    raster.width = canvas.width;
    raster.height = canvas.height;

    const style = getComputedStyle(label);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 0.9;
    const spacing = parseFloat(style.letterSpacing) || 0;
    ink = style.color;
    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    uniforms.uBackdrop.value = Number(0.2126 * r + 0.7152 * g + 0.0722 * b < 127.5);
    ctx.clearRect(0, 0, 1, 1);

    const glyphs = lines.map((line) =>
      Array.from(line, (char) => ({ char, advance: ctx.measureText(char).width + spacing })),
    );
    const widths = glyphs.map((line) =>
      line.length ? line.reduce((sum, glyph) => sum + glyph.advance, 0) - spacing : 0,
    );
    const fit = Math.min(
      1,
      (width * 0.86) / Math.max(1, ...widths),
      (height * 0.78) / (lineHeight * lines.length),
    );
    ctx.setTransform(dpr * fit, 0, 0, dpr * fit, raster.width / 2, raster.height / 2);
    ctx.textBaseline = 'middle';
    glyphs.forEach((line, index) => {
      let x = -widths[index] / 2;
      const y = (index - (lines.length - 1) / 2) * lineHeight;
      for (const { char, advance } of line) {
        ctx.fillText(char, x, y);
        x += advance;
      }
    });

    texture.image = raster;
    texture.needsUpdate = true;
    ready = true;
  }

  function frame(now: number) {
    const delta = lastFrame ? Math.min(now - lastFrame, 50) : 16;
    lastFrame = now;
    elapsed += delta / 1000;
    if (ready) {
      if (now >= nextColorCheck) {
        nextColorCheck = now + 250;
        if (getComputedStyle(label).color !== ink) resize();
      }
      introProgress = Math.min(1, introProgress + delta / INTRO_MS);
      const reveal = Math.min(1, introProgress / 0.45);
      uniforms.uIntro.value = (1 - introProgress) ** 3;
      uniforms.uReveal.value = reveal * reveal * (3 - 2 * reveal);
      uniforms.uTime.value = elapsed;

      const idleX = 0.5 + Math.sin(elapsed * 0.33) * (0.08 + drift * 0.2);
      const idleY = 0.5 + Math.cos(elapsed * 0.27) * (0.06 + drift * 0.2);
      const follow = 1 - Math.exp(-delta / (pointer.engaged ? 130 : 470));
      const targetX = pointer.engaged ? pointer.x : idleX;
      const targetY = pointer.engaged ? pointer.y : idleY;
      const position = uniforms.uPointer.value;
      position[0] += (targetX - position[0]) * follow;
      position[1] += (targetY - position[1]) * follow;
      const strength = uniforms.uPointerActive;
      strength.value +=
        ((pointer.engaged ? 1 : drift) - strength.value) * (1 - Math.exp(-delta / 270));

      for (let i = 0; i < clicks.length; i += 4) {
        if (!clicks[i + 3]) continue;
        clicks[i + 2] += delta / 1000;
        if (clicks[i + 2] > RIPPLE_LIFE) clicks[i + 3] = 0;
      }

      renderer.render({ scene: mesh });
      if (!disposed && !container.hasAttribute('data-warp-text')) {
        container.setAttribute('data-warp-text', '');
      }
    }
    if (!disposed) raf = requestAnimationFrame(frame);
  }

  function updatePlayback() {
    if (!disposed && visible && !document.hidden) {
      if (!raf) raf = requestAnimationFrame(frame);
      return;
    }
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
  }

  function movePointer(event: PointerEvent) {
    if (event.pointerType === 'touch') return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = (event.clientX - rect.left) / rect.width;
    pointer.y = 1 - (event.clientY - rect.top) / rect.height;
    pointer.engaged = true;
  }

  function leavePointer() {
    pointer.engaged = false;
  }

  function startRipple(event: PointerEvent) {
    if (!options.clickRipple || event.button !== 0) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const offset = clickSlot * 4;
    clicks[offset] = (event.clientX - rect.left) / rect.width;
    clicks[offset + 1] = 1 - (event.clientY - rect.top) / rect.height;
    clicks[offset + 2] = 0;
    clicks[offset + 3] = 1;
    clickSlot = (clickSlot + 1) % MAX_CLICKS;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    updatePlayback();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', updatePlayback);
    container.removeEventListener('pointermove', movePointer);
    container.removeEventListener('pointerleave', leavePointer);
    container.removeEventListener('pointerdown', startRipple);
    canvas.removeEventListener('webglcontextlost', dispose);
    container.removeAttribute('data-warp-text');
    canvas.remove();
    if (!gl.isContextLost()) {
      program.remove();
      geometry.remove();
      gl.deleteTexture(texture.texture);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  const resizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  });
  resizeObserver.observe(container);
  visibilityObserver.observe(container);
  document.addEventListener('visibilitychange', updatePlayback);
  container.addEventListener('pointermove', movePointer);
  container.addEventListener('pointerleave', leavePointer);
  container.addEventListener('pointerdown', startRipple);
  canvas.addEventListener('webglcontextlost', dispose);
  resize();

  return dispose;
}
