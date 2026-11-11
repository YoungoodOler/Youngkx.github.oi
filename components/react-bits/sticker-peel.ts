import { Geometry, Mesh, Program, Renderer, Texture } from 'ogl';
import { loadLogoShape } from '../electric-logo/shape';

// The supplied StickerPeel curl, fitted to the fixed navigation link.
const VERTEX = `#version 300 es
in vec2 aGrid;
uniform vec2 uCanvas;
uniform vec2 uMesh;
uniform vec2 uCenter;
uniform vec2 uDir;
uniform float uFold;
uniform float uRadius;
out vec2 vUv;
out vec3 vNormal;
out float vCurl;
const float PI = 3.14159265;

void main() {
  vec2 local = (aGrid - 0.5) * uMesh;
  float s = dot(local, uDir);
  float d = uFold - s;
  vec3 normal = vec3(0.0, 0.0, 1.0);
  float z = 0.0;
  vec2 p = local;
  if (d > 0.0) {
    float theta = d / uRadius;
    float along = uFold + d - PI * uRadius;
    z = 2.0 * uRadius;
    normal = vec3(0.0, 0.0, -1.0);
    if (theta < PI) {
      along = uFold - uRadius * sin(theta);
      z = uRadius * (1.0 - cos(theta));
      normal = vec3(uDir * sin(theta), cos(theta));
    }
    p += (along - s) * uDir;
  }
  vNormal = normal;
  vUv = aGrid;
  vCurl = z;
  vec2 screen = uCenter + p;
  gl_Position = vec4(screen.x / uCanvas.x * 2.0 - 1.0, 1.0 - screen.y / uCanvas.y * 2.0, -z / 100.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uField;
uniform float uSampleScale;
uniform vec3 uInk;
uniform vec3 uBack;
in vec2 vUv;
in vec3 vNormal;
in float vCurl;
out vec4 outColor;

void main() {
  float distanceToEdge = texture(uField, vUv).r;
  float edgeWidth = max(0.6, fwidth(distanceToEdge) * 0.55 * uSampleScale);
  float alpha = 1.0 - smoothstep(-edgeWidth, edgeWidth, distanceToEdge);
  if (alpha < 0.004) discard;
  bool front = vNormal.z >= 0.0;
  vec3 n = normalize(front ? vNormal : -vNormal);
  vec3 key = normalize(vec3(-0.45, -0.6, 0.66));
  float shade = 0.70 + 0.30 * max(dot(n, key), 0.0);
  float glint = pow(max(dot(n, normalize(key + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);
  vec3 color = (front ? uInk : uBack) * mix(1.0, shade, smoothstep(0.0, 2.0, vCurl));
  color += glint * smoothstep(0.0, 4.0, vCurl) * 0.3;
  outColor = vec4(min(color, vec3(1.0)) * alpha, alpha);
}`;

const gridSize = 48;
const positions = new Float32Array((gridSize + 1) ** 2 * 2);
const indices = new Uint16Array(gridSize ** 2 * 6);
for (let y = 0; y <= gridSize; y += 1) {
  for (let x = 0; x <= gridSize; x += 1) {
    const vertex = y * (gridSize + 1) + x;
    positions.set([x / gridSize, y / gridSize], vertex * 2);
    if (x === gridSize || y === gridSize) continue;
    const nextRow = vertex + gridSize + 1;
    indices.set(
      [vertex, vertex + 1, nextRow + 1, vertex, nextRow + 1, nextRow],
      (y * gridSize + x) * 6,
    );
  }
}

const inks = { dark: [0.91, 0.93, 0.97], light: [0.13, 0.15, 0.2] };

export async function mountStickerPeel(
  link: HTMLAnchorElement,
  theme: () => keyof typeof inks,
  signal: AbortSignal,
) {
  if (signal.aborted) return;
  const tracedLogo = await loadLogoShape();
  if (!tracedLogo || signal.aborted) return;
  const shape = tracedLogo;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const options = { alpha: true, premultipliedAlpha: true, antialias: false, depth: true };
  const context = canvas.getContext('webgl2', options) as WebGL2RenderingContext | null;
  if (!context) return;
  const listeners = new AbortController();
  const observer = new ResizeObserver(resize);
  let frame = 0;
  let last = 0;
  let peel = 0;
  let velocity = 0;
  let hovering = false;
  let focused = false;
  let pressedPointer: number | undefined;
  let peelUntil = 0;
  let angle = Math.PI / 4;
  let targetAngle = angle;
  let fit = 1;

  function stop() {
    listeners.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    link.removeAttribute('data-sticker-peel');
    canvas.remove();
    if (context && !context.isContextLost()) {
      context.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  const events = { signal: listeners.signal };
  signal.addEventListener('abort', stop, events);
  canvas.addEventListener('webglcontextlost', stop, events);
  const renderer = new Renderer({ canvas, ...options });
  const gl = renderer.gl;
  const texture = new Texture(gl, {
    image: shape.field,
    width: shape.width,
    height: shape.height,
    internalFormat: context.R16F,
    format: context.RED,
    type: context.FLOAT,
    minFilter: context.LINEAR,
    magFilter: context.LINEAR,
    generateMipmaps: false,
    flipY: false,
    unpackAlignment: 1,
  });
  const dir = [Math.SQRT1_2, Math.SQRT1_2];
  const uniforms = {
    uField: { value: texture },
    uSampleScale: { value: 1 },
    uCanvas: { value: [1, 1] },
    uMesh: { value: [1, 1] },
    uCenter: { value: [0.5, 0.5] },
    uDir: { value: dir },
    uFold: { value: 0 },
    uRadius: { value: 4 },
    uInk: { value: inks[theme()] },
    uBack: { value: [0.58, 0.53, 0.72] },
  };
  const program = new Program(gl, {
    vertex: VERTEX,
    fragment: FRAGMENT,
    uniforms,
    cullFace: false,
    transparent: true,
  });
  if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
    stop();
    return;
  }
  const geometry = new Geometry(gl, {
    aGrid: { size: 2, data: positions },
    index: { size: 1, data: indices },
  });
  const mesh = new Mesh(gl, { geometry, program });

  function resize() {
    const width = link.clientWidth;
    const height = link.clientHeight;
    fit = Math.min(width / shape.logoWidth, height / shape.logoHeight) * 0.76;
    // Supersample this small surface even on standard-density displays.
    const pixelRatio = window.devicePixelRatio || 1;
    renderer.dpr = Math.max(3, Math.min(pixelRatio, 4));
    uniforms.uSampleScale.value = Math.max(1, renderer.dpr / pixelRatio);
    renderer.setSize(width, height);
    uniforms.uCanvas.value = [width, height];
    uniforms.uCenter.value = [width / 2, height / 2];
    uniforms.uMesh.value = [shape.width * fit, shape.height * fit];
    wake();
  }

  function draw(now: number) {
    frame = 0;
    const dt = last ? Math.min(0.025, (now - last) / 1000) : 1 / 60;
    last = now;
    const held = now < peelUntil;
    const target = pressedPointer !== undefined || held ? 0.42 : hovering || focused ? 0.28 : 0;
    const omega = 21;
    velocity += (omega ** 2 * (target - peel) - 1.5 * omega * velocity) * dt;
    peel += velocity * dt;
    const turn = Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle));
    angle += Math.abs(turn) < 0.008 ? turn : turn * (1 - Math.exp(-dt / 0.05));
    const moving = Math.abs(target - peel) > 0.001 || Math.abs(velocity) > 0.005;
    if (!moving) peel = target;
    dir[0] = Math.cos(angle);
    dir[1] = Math.sin(angle);
    const [w, h] = uniforms.uMesh.value;
    let near = Infinity;
    let far = -Infinity;
    for (let i = 0; i < shape.edges.length; i += 2) {
      const dot =
        (shape.edges[i] * fit - w / 2) * dir[0] + (shape.edges[i + 1] * fit - h / 2) * dir[1];
      near = Math.min(near, dot);
      far = Math.max(far, dot);
    }
    uniforms.uFold.value = near - 0.5 + (far - near) * Math.max(0, peel);
    uniforms.uInk.value = inks[theme()];
    renderer.render({ scene: mesh, frustumCull: false });
    if (!link.hasAttribute('data-sticker-peel')) {
      if (gl.getError() !== gl.NO_ERROR) {
        stop();
        return;
      }
      link.dataset.stickerPeel = '';
    }
    if (moving || held || (peel > 0 && Math.abs(turn) >= 0.008)) wake();
    else last = 0;
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function aim(event: PointerEvent) {
    const rect = link.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    if (Math.hypot(x, y) > 0.11) {
      targetAngle = Math.atan2(-y, -x);
      if (peel < 0.005) angle = targetAngle;
    }
    wake();
  }

  link.addEventListener(
    'pointerenter',
    (event) => {
      hovering = event.pointerType !== 'touch';
      if (hovering) aim(event);
    },
    events,
  );
  link.addEventListener(
    'pointermove',
    (event) => {
      if (hovering || pressedPointer === event.pointerId) aim(event);
    },
    events,
  );
  link.addEventListener(
    'pointerleave',
    () => {
      hovering = false;
      wake();
    },
    events,
  );
  link.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      pressedPointer = event.pointerId;
      peelUntil = performance.now() + 130;
      aim(event);
    },
    events,
  );
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pressedPointer) return;
    pressedPointer = undefined;
    wake();
  };
  window.addEventListener('pointerup', release, events);
  window.addEventListener('pointercancel', release, events);
  link.addEventListener(
    'focus',
    () => {
      focused = link.matches(':focus-visible');
      wake();
    },
    events,
  );
  link.addEventListener(
    'blur',
    () => {
      focused = false;
      wake();
    },
    events,
  );
  link.addEventListener('sticker-palette-change', wake, events);
  link.append(canvas);
  resize();
  observer.observe(link);
}
