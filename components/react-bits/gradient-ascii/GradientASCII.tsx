'use client';

import { useEffect, useRef } from 'react';
import { BLUR, COMPOSITE, FIELD, HALO, VERTEX } from './shaders';

type Theme = 'dark' | 'light';

const characters = ' =+xX0S8#@';
const atlasCellWidth = 60;
const atlasCellHeight = 100;
const cellSize = 18;
const introDuration = 2.4;
const frameInterval = 1000 / 30;
const maxPixels = 1_500_000;
const trailLimit = 24;
const trailLife = 0.7;
const trailStep = 0.015;
const clickLimit = 4;
const clickLife = 1.2;

const styles = {
  dark: {
    colors: ['#1e3fd8', '#f6f8ff', '#a5d8ff', '#38bdf8'],
    gradientOpacity: 0.34,
    glyphOpacity: 0.73,
  },
  light: {
    colors: ['#4564ad', '#b6c8f4', '#9dc3ec', '#a3d7ed'],
    gradientOpacity: 0.27,
    glyphOpacity: 0.52,
  },
};

type Program = {
  handle: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

type InputPoint = { x: number; y: number; at: number };

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function link(gl: WebGL2RenderingContext, vertex: WebGLShader, source: string): Program | null {
  const fragment = compile(gl, gl.FRAGMENT_SHADER, source);
  if (!fragment) return null;
  const handle = gl.createProgram();
  if (handle) {
    gl.attachShader(handle, vertex);
    gl.attachShader(handle, fragment);
    gl.linkProgram(handle);
  }
  gl.deleteShader(fragment);
  return handle ? { handle, uniforms: {} } : null;
}

function readUniforms(gl: WebGL2RenderingContext, program: Program) {
  if (!gl.getProgramParameter(program.handle, gl.LINK_STATUS)) return false;
  const count = gl.getProgramParameter(program.handle, gl.ACTIVE_UNIFORMS);
  for (let index = 0; index < count; index++) {
    const info = gl.getActiveUniform(program.handle, index);
    if (info) {
      program.uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(
        program.handle,
        info.name,
      );
    }
  }
  return true;
}

function createTarget(gl: WebGL2RenderingContext, count: number) {
  const framebuffer = gl.createFramebuffer();
  const textures = Array.from({ length: count }, () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  });
  return { framebuffer, textures, width: 0, height: 0 };
}

type Target = ReturnType<typeof createTarget>;

function sizeTarget(gl: WebGL2RenderingContext, target: Target, width: number, height: number) {
  if (target.width === width && target.height === height) return true;
  if (!target.framebuffer || target.textures.some((texture) => !texture)) return false;

  gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
  const attachments = target.textures.map((texture, index) => {
    const attachment = gl.COLOR_ATTACHMENT0 + index;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, texture, 0);
    return attachment;
  });
  gl.drawBuffers(attachments);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  target.width = width;
  target.height = height;
  return complete;
}

function paintAtlas(gl: WebGL2RenderingContext, texture: WebGLTexture, font: string) {
  const atlas = document.createElement('canvas');
  atlas.width = atlasCellWidth * characters.length;
  atlas.height = atlasCellHeight;
  const context = atlas.getContext('2d');
  if (!context) return;

  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#fff';
  for (let index = 0; index < characters.length; index++) {
    context.fillText(characters[index], (index + 0.5) * atlasCellWidth, atlasCellHeight / 2 + 3);
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function toLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function toOklab(color: string) {
  const rgb = Number.parseInt(color.slice(1), 16);
  const r = toLinear(rgb >> 16);
  const g = toLinear((rgb >> 8) & 255);
  const b = toLinear(rgb & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const ramps = {
  dark: new Float32Array(styles.dark.colors.flatMap(toOklab)),
  light: new Float32Array(styles.light.colors.flatMap(toOklab)),
};

function mountGradientASCII(
  canvas: HTMLCanvasElement,
  readTheme: () => Theme,
  onReady: () => void,
) {
  const context = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!context) return;
  const gl = context;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  if (!vertex) return;

  const field = link(gl, vertex, FIELD);
  const halo = link(gl, vertex, HALO);
  const blur = link(gl, vertex, BLUR);
  const composite = link(gl, vertex, COMPOSITE);
  gl.deleteShader(vertex);
  if (!field || !halo || !blur || !composite) {
    for (const program of [field, halo, blur, composite]) {
      if (program) gl.deleteProgram(program.handle);
    }
    return;
  }

  const programs = [field, halo, blur, composite];
  const vao = gl.createVertexArray();
  const fieldTarget = createTarget(gl, 2);
  const haloA = createTarget(gl, 1);
  const haloB = createTarget(gl, 1);
  const atlas = gl.createTexture();
  const font = `300 78px ${getComputedStyle(canvas).fontFamily}`;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const trail: InputPoint[] = [];
  const clicks: InputPoint[] = [];
  const trailData = new Float32Array(trailLimit * 4);
  const clickData = new Float32Array(clickLimit * 4);
  const observer = new ResizeObserver(() => {
    needsResize = true;
    wake();
  });

  let raf = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let aspect = 1;
  let pixelRatio = 1;
  let needsResize = true;
  let ready = false;
  let entered = false;
  let disposed = false;
  let visible = true;
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  });

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    aspect = width / height;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1, Math.sqrt(maxPixels / (width * height)));
    const bufferWidth = Math.max(1, Math.round(width * pixelRatio));
    const bufferHeight = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
    if (canvas.height !== bufferHeight) canvas.height = bufferHeight;
    const haloWidth = Math.max(1, Math.round(bufferWidth / 4));
    const haloHeight = Math.max(1, Math.round(bufferHeight / 4));
    needsResize = false;
    return (
      sizeTarget(gl, fieldTarget, Math.ceil(bufferWidth / 2), Math.ceil(bufferHeight / 2)) &&
      sizeTarget(gl, haloA, haloWidth, haloHeight) &&
      sizeTarget(gl, haloB, haloWidth, haloHeight)
    );
  }

  function bindTexture(unit: number, texture: WebGLTexture | null) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  function bindGlyphs(program: Program, theme: Theme, reduce: boolean) {
    const { uniforms: u } = program;
    const cellHeight = cellSize * pixelRatio;
    const cellWidth = (cellHeight * atlasCellWidth) / atlasCellHeight;
    bindTexture(0, fieldTarget.textures[0]);
    bindTexture(1, fieldTarget.textures[1]);
    bindTexture(2, atlas);
    gl.uniform1i(u.uField, 0);
    gl.uniform1i(u.uAux, 1);
    gl.uniform1i(u.uAtlas, 2);
    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform2f(u.uCell, cellWidth, cellHeight);
    gl.uniform2f(
      u.uOffset,
      (canvas.width - Math.ceil(canvas.width / cellWidth) * cellWidth) / 2,
      (canvas.height - Math.ceil(canvas.height / cellHeight) * cellHeight) / 2,
    );
    gl.uniform2f(u.uAtlasGrid, characters.length, 1);
    gl.uniform1f(u.uCount, characters.length);
    gl.uniform1f(u.uOpacity, styles[theme].glyphOpacity);
    gl.uniform1f(u.uFlicker, reduce ? 0 : 0.2);
    gl.uniform1f(u.uGlyphTime, elapsed);
    gl.uniform1f(u.uLight, theme === 'light' ? 1 : 0);
  }

  const draw = (reduce: boolean) => {
    const theme = readTheme();
    const frameSeed = reduce ? 0 : Math.floor(elapsed * 24) % 97;
    gl.bindVertexArray(vao);

    // Render the color gradient and pointer interaction to separate textures.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTarget.framebuffer);
    gl.viewport(0, 0, fieldTarget.width, fieldTarget.height);
    gl.useProgram(field.handle);
    const { uniforms: f } = field;
    gl.uniform1f(f.uAspect, aspect);
    gl.uniform1f(f.uTime, elapsed * 0.5);
    gl.uniform3fv(f.uRamp, ramps[theme]);
    gl.uniform4fv(f.uTrail, trailData);
    gl.uniform1f(f.uRadius, 0.1);
    gl.uniform4fv(f.uClicks, clickData);
    gl.uniform1f(f.uIntro, reduce ? 1 : Math.min(1, elapsed / introDuration));
    gl.uniform1f(f.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Blur a smaller glyph render, then composite it with the sharp glyphs.
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
    gl.viewport(0, 0, haloA.width, haloA.height);
    gl.useProgram(halo.handle);
    bindGlyphs(halo, theme, reduce);
    gl.uniform2f(
      halo.uniforms.uDownscale,
      canvas.width / haloA.width,
      canvas.height / haloA.height,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(blur.handle);
    gl.uniform1i(blur.uniforms.uSource, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloB.framebuffer);
    bindTexture(0, haloA.textures[0]);
    gl.uniform2f(blur.uniforms.uStep, 1 / haloA.width, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
    bindTexture(0, haloB.textures[0]);
    gl.uniform2f(blur.uniforms.uStep, 0, 1 / haloA.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(composite.handle);
    bindGlyphs(composite, theme, reduce);
    bindTexture(3, haloA.textures[0]);
    const { uniforms: c } = composite;
    gl.uniform1i(c.uHalo, 3);
    gl.uniform1f(c.uGlow, 0.2);
    gl.uniform1f(c.uGradient, styles[theme].gradientOpacity);
    gl.uniform1f(c.uGrain, 0.08);
    gl.uniform1f(c.uFrame, frameSeed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  function locate(event: PointerEvent): InputPoint | undefined {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    return { x: (x - 0.5) * (rect.width / rect.height), y: 0.5 - y, at: performance.now() };
  }

  function onMove(event: PointerEvent) {
    if (motionPreference.matches || event.pointerType === 'touch') return;
    const point = locate(event);
    if (!point) return;
    const head = trail[0];
    if (head) {
      const gap = Math.hypot(point.x - head.x, point.y - head.y);
      if (gap < trailStep) return;
      if (point.at - head.at < 100) {
        const steps = Math.min(6, Math.floor(gap / (trailStep * 2)));
        for (let index = 1; index <= steps; index++) {
          const mix = index / (steps + 1);
          trail.unshift({
            x: head.x + (point.x - head.x) * mix,
            y: head.y + (point.y - head.y) * mix,
            at: point.at,
          });
        }
      }
    }
    trail.unshift(point);
    trail.length = Math.min(trail.length, trailLimit);
    wake();
  }

  function onDown(event: PointerEvent) {
    if (motionPreference.matches || event.button !== 0) return;
    const point = locate(event);
    if (!point) return;
    clicks.unshift(point);
    if (clicks.length > clickLimit) clicks.pop();
    wake();
  }

  function updateInput(now: number) {
    trailData.fill(0);
    for (let index = 0; index < trail.length; index++) {
      const point = trail[index];
      const age = Math.max(0, (now - point.at) / 1000);
      if (age >= trailLife) {
        trail.length = index;
        break;
      }
      const offset = index * 4;
      trailData[offset] = point.x;
      trailData[offset + 1] = point.y;
      trailData[offset + 2] = (1 - age / trailLife) ** 2;
    }

    clickData.fill(0);
    for (let index = 0; index < clicks.length; index++) {
      const point = clicks[index];
      const age = Math.max(0, (now - point.at) / 1000);
      if (age >= clickLife) {
        clicks.length = index;
        break;
      }
      const offset = index * 4;
      clickData[offset] = point.x;
      clickData[offset + 1] = point.y;
      clickData[offset + 2] = age;
      clickData[offset + 3] = Math.min(1, age / 0.08) * (1 - age / clickLife) ** 2;
    }
  }

  function frame(now: number) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    if (!ready) {
      if (
        parallel &&
        programs.some(
          (program) => !gl.getProgramParameter(program.handle, parallel.COMPLETION_STATUS_KHR),
        )
      ) {
        wake();
        return;
      }
      if (!programs.every((program) => readUniforms(gl, program))) {
        dispose();
        onReady();
        return;
      }
      ready = true;
    }

    const reduce = motionPreference.matches;
    if (!reduce && lastFrame && now - lastFrame < frameInterval - 1) {
      wake();
      return;
    }
    if (needsResize && !resize()) {
      dispose();
      onReady();
      return;
    }
    if (!reduce) elapsed += lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 1 / 30;
    lastFrame = now;
    updateInput(now);
    draw(reduce);
    if (!entered && (reduce || elapsed >= introDuration)) {
      entered = true;
      onReady();
    }
    if (!reduce) wake();
  }

  function wake() {
    if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function syncMotion() {
    cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    trail.length = 0;
    clicks.length = 0;
    if (motionPreference.matches) elapsed = Math.max(elapsed, introDuration);
    wake();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    listeners.abort();
    observer.disconnect();
    intersection.disconnect();
    for (const target of [fieldTarget, haloA, haloB]) {
      for (const texture of target.textures) gl.deleteTexture(texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
    for (const program of programs) gl.deleteProgram(program.handle);
    gl.deleteTexture(atlas);
    gl.deleteVertexArray(vao);
    if (!canvas.isConnected && !gl.isContextLost()) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  if (!atlas || !vao) {
    dispose();
    return;
  }
  paintAtlas(gl, atlas, font);
  document.fonts?.load(font, characters).then(
    () => {
      if (disposed) return;
      paintAtlas(gl, atlas, font);
      wake();
    },
    () => {},
  );

  const { signal } = listeners;
  observer.observe(canvas);
  intersection.observe(canvas);
  window.addEventListener('pointermove', onMove, { signal, passive: true });
  window.addEventListener('pointerdown', onDown, { signal, passive: true });
  document.addEventListener('visibilitychange', syncMotion, { signal });
  motionPreference.addEventListener('change', syncMotion, { signal });
  canvas.addEventListener(
    'webglcontextlost',
    () => {
      dispose();
      onReady();
    },
    { signal },
  );
  wake();

  return { wake, dispose };
}

export default function GradientASCII({ theme, onReady }: { theme: Theme; onReady: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  const rendererRef = useRef<ReturnType<typeof mountGradientASCII>>(undefined);

  useEffect(() => {
    themeRef.current = theme;
    rendererRef.current?.wake();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = mountGradientASCII(canvas, () => themeRef.current, onReady);
    if (!renderer) onReady();
    rendererRef.current = renderer;
    return () => {
      renderer?.dispose();
      rendererRef.current = undefined;
    };
  }, [onReady]);

  return <canvas ref={canvasRef} />;
}
