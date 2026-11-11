import { FRAGMENT, VERTEX } from './shaders';

export type DotGridSettings = {
  baseColor: string;
  activeColor: string;
  shape: 'circle' | 'square';
  dotSize: number;
  gap: number;
  proximity: number;
  strength: number;
  bounce: number;
  tension: number;
  returnDuration: number;
  shockRadius: number;
  shockStrength: number;
  swell: number;
  stretch: number;
  glow: number;
  fade: number;
  intro: boolean;
  opacity: number;
  mouseInteraction: boolean;
  clickShock: boolean;
};

const toRgb = (color: string) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!match) return [1, 1, 1];
  const hex = match[1].length === 3 ? match[1].replace(/./g, (digit) => digit + digit) : match[1];
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
};

const smootherstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export const pointerIdleMs = 850;
export const restingOpacity = 0.22;
const revealThreshold = 0.003;
const floatsPerInstance = 7;
const instanceStride = floatsPerInstance * Float32Array.BYTES_PER_ELEMENT;

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

export function mountDotGrid(
  region: HTMLDivElement,
  canvas: HTMLCanvasElement,
  settings: DotGridSettings,
) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) return;
  const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;

  const program = gl.createProgram();
  if (!program) return;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (vertex) gl.attachShader(program, vertex);
  if (fragment) gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return;
  }

  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const name of [
    'uResolution',
    'uRegionSize',
    'uSliceTop',
    'uRegionTop',
    'uSize',
    'uSwell',
    'uStretch',
    'uGlow',
    'uBase',
    'uActive',
    'uOpacity',
    'uFade',
    'uShape',
  ]) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  const vao = gl.createVertexArray();
  const cornerBuffer = gl.createBuffer();
  const instanceBuffer = gl.createBuffer();
  if (!vao || !cornerBuffer || !instanceBuffer) {
    gl.deleteVertexArray(vao);
    gl.deleteBuffer(cornerBuffer);
    gl.deleteBuffer(instanceBuffer);
    gl.deleteProgram(program);
    return;
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, instanceStride, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, instanceStride, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(program);

  const base = toRgb(settings.baseColor);
  const accent = toRgb(settings.activeColor);
  gl.uniform3f(uniforms.uBase, base[0], base[1], base[2]);
  gl.uniform3f(uniforms.uActive, accent[0], accent[1], accent[2]);
  gl.uniform1f(uniforms.uSize, Math.max(0.5, settings.dotSize));
  gl.uniform1f(uniforms.uSwell, Math.max(0, settings.swell));
  gl.uniform1f(uniforms.uStretch, Math.max(0, settings.stretch));
  gl.uniform1f(uniforms.uGlow, Math.max(0, settings.glow));
  gl.uniform1f(uniforms.uOpacity, Math.min(1, Math.max(0, settings.opacity)));
  gl.uniform1f(uniforms.uFade, Math.min(1, Math.max(0, settings.fade)));
  gl.uniform1i(uniforms.uShape, settings.shape === 'square' ? 1 : 0);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const view = { width: 0, height: 0, regionTop: 0, sliceHeight: 0, sliceTop: 0 };
  const grid = { count: 0, cols: 1, rows: 1, cell: 1 };
  let rest = new Float32Array(0);
  let offset = new Float32Array(0);
  let velocity = new Float32Array(0);
  let force = new Float32Array(0);
  let next = new Float32Array(0);
  let wave = new Float32Array(0);
  let energy = new Float32Array(0);
  let instances = new Float32Array(0);
  const pointer = {
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    vx: 0,
    vy: 0,
    time: 0,
    inside: false,
    resting: false,
    presence: 0,
  };
  type Shock = {
    x: number;
    y: number;
    start: number;
    scale: number;
    range: number;
    travel: number;
    dirX: number;
    dirY: number;
    directional: boolean;
    cone: number;
    lean: number;
    widthScale: number;
  };
  const shocks: Shock[] = [];
  const stroke = {
    pending: false,
    fast: 700,
    stop: 260,
    idle: 140,
    last: 0,
    dirX: 0,
    dirY: 0,
    x: 0,
    y: 0,
    peak: 0,
    timer: 0,
  };
  let visible = false;
  let positionDirty = true;
  let hasDrawn = false;
  let idleTimer = 0;
  let raf = 0;
  let last = 0;

  const rebuild = () => {
    const { dotSize: size, gap: spacing } = settings;
    const cell = Math.max(2, size + spacing);
    const cols = Math.max(1, Math.floor((view.width + spacing) / cell));
    const rows = Math.max(1, Math.floor((view.sliceHeight + spacing) / cell));
    const startX = (view.width - (cols * cell - spacing)) / 2 + size / 2;
    const startY = (view.sliceHeight - (rows * cell - spacing)) / 2 + size / 2;
    const count = cols * rows;
    rest = new Float32Array(count * 2);
    offset = new Float32Array(count * 2);
    velocity = new Float32Array(count * 2);
    force = new Float32Array(count * 2);
    next = new Float32Array(count * 2);
    wave = new Float32Array(count * 4);
    energy = new Float32Array(count);
    instances = new Float32Array(count * floatsPerInstance);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = (row * cols + col) * 2;
        rest[index] = startX + col * cell;
        rest[index + 1] = startY + row * cell;
      }
    }
    Object.assign(grid, { count, cols, rows, cell });
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instances.byteLength, gl.DYNAMIC_DRAW);
  };

  const resize = () => {
    const { width, height } = region.getBoundingClientRect();
    const sliceHeight = canvas.getBoundingClientRect().height;
    if (width <= 0 || height <= 0 || sliceHeight <= 0) return;
    const ratio = Math.min(
      window.devicePixelRatio || 1,
      2,
      maxViewport[0] / width,
      maxViewport[1] / sliceHeight,
    );
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(sliceHeight * ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const dimensionsChanged = view.width !== width || view.sliceHeight !== sliceHeight;
    Object.assign(view, { width, height, sliceHeight });
    if (dimensionsChanged) rebuild();
    positionDirty = true;
    wake();
  };

  const step = (dt: number, now: number) => {
    const s = settings;
    const zeta = 1 - 0.85 * Math.min(1, Math.max(0, s.bounce));
    const omega = 4 / (zeta * Math.max(0.2, s.returnDuration));
    const stiffness = omega * omega;
    const damping = 2 * zeta * omega;
    const radius = Math.max(1, s.proximity);
    const speed = Math.hypot(pointer.vx, pointer.vy);
    const drive =
      s.mouseInteraction && pointer.inside ? 6500 * Math.tanh(speed / 900) * s.strength : 0;
    const dirX = speed > 0.001 ? pointer.vx / speed : 0;
    const dirY = speed > 0.001 ? pointer.vy / speed : 0;
    const active = shocks.map((shock) => {
      const front = ((now - shock.start) / 1000) * shock.travel;
      const power = smootherstep(1 - front / Math.max(1, shock.range));
      return {
        ...shock,
        front,
        amplitude: power * s.shockStrength * grid.cell * 0.24 * shock.scale,
      };
    });
    const coupling = (Math.max(0, s.tension) * 900) ** 2 / (grid.cell * grid.cell);
    const viscosity = Math.sqrt(coupling) * 0.06;
    const limit = Math.sqrt(stiffness + 8 * coupling) + damping + 8 * viscosity;
    const steps = Math.min(24, Math.max(1, Math.ceil(dt / Math.min(1 / 120, 1.2 / limit))));
    const h = dt / steps;
    for (let i = 0; i < grid.count; i++) {
      const index = i * 2;
      const rx = rest[index];
      const ry = rest[index + 1];
      let ax = 0;
      let ay = 0;
      if (drive > 0) {
        const ex = rx + offset[index] - pointer.x;
        const ey = ry + offset[index + 1] - pointer.y;
        const distance = Math.hypot(ex, ey);
        if (distance < radius) {
          const weight = smootherstep(1 - distance / radius) * drive;
          const nx = distance > 0.001 ? ex / distance : 0;
          const ny = distance > 0.001 ? ey / distance : 0;
          ax += weight * (dirX + nx * 0.6);
          ay += weight * (dirY + ny * 0.6);
        }
      }
      let wx = 0;
      let wy = 0;
      let wvx = 0;
      let wvy = 0;
      for (const shock of active) {
        if (shock.amplitude <= 0) continue;
        const ex = rx - shock.x;
        const ey = ry - shock.y;
        const distance = Math.hypot(ex, ey);
        if (distance <= 0.001 || distance > shock.range) continue;
        const nx = ex / distance;
        const ny = ey / distance;
        const ahead = shock.directional ? nx * shock.dirX + ny * shock.dirY : 0;
        const band = grid.cell * shock.widthScale;
        const front = shock.front * (1 + shock.cone * ahead);
        const u = (distance - front) / band;
        if (Math.abs(u) >= 3) continue;
        const profile = Math.exp(-u * u);
        const aim = shock.directional ? 0.35 + 0.65 * smootherstep(ahead * 0.5 + 0.5) : 1;
        const push = shock.amplitude * profile * aim;
        const rate = ((shock.amplitude * 2 * u * profile * aim) / band) * shock.travel;
        const biasX = nx + shock.dirX * shock.lean;
        const biasY = ny + shock.dirY * shock.lean;
        wx += biasX * push;
        wy += biasY * push;
        wvx += biasX * rate;
        wvy += biasY * rate;
        ax += nx * push * stiffness * 0.35;
        ay += ny * push * stiffness * 0.35;
      }
      force[index] = ax;
      force[index + 1] = ay;
      const target = i * 4;
      wave[target] = wx;
      wave[target + 1] = wy;
      wave[target + 2] = wvx;
      wave[target + 3] = wvy;
    }
    const { cols, rows } = grid;
    const stride = cols * 2;
    for (let n = 0; n < steps; n++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = (row * cols + col) * 2;
          let ax = force[index] - stiffness * offset[index] - damping * velocity[index];
          let ay = force[index + 1] - stiffness * offset[index + 1] - damping * velocity[index + 1];
          if (coupling > 0) {
            let lx = -4 * offset[index];
            let ly = -4 * offset[index + 1];
            let mx = -4 * velocity[index];
            let my = -4 * velocity[index + 1];
            if (col > 0) {
              lx += offset[index - 2];
              ly += offset[index - 1];
              mx += velocity[index - 2];
              my += velocity[index - 1];
            }
            if (col < cols - 1) {
              lx += offset[index + 2];
              ly += offset[index + 3];
              mx += velocity[index + 2];
              my += velocity[index + 3];
            }
            if (row > 0) {
              lx += offset[index - stride];
              ly += offset[index - stride + 1];
              mx += velocity[index - stride];
              my += velocity[index - stride + 1];
            }
            if (row < rows - 1) {
              lx += offset[index + stride];
              ly += offset[index + stride + 1];
              mx += velocity[index + stride];
              my += velocity[index + stride + 1];
            }
            ax += coupling * lx + viscosity * mx;
            ay += coupling * ly + viscosity * my;
          }
          next[index] = velocity[index] + ax * h;
          next[index + 1] = velocity[index + 1] + ay * h;
        }
      }
      for (let i = 0; i < offset.length; i++) {
        velocity[i] = next[i];
        offset[i] += velocity[i] * h;
      }
    }
    for (let i = 0; i < grid.count; i++) {
      const index = i * 2;
      const target = i * 4;
      energy[i] = Math.min(
        1.5,
        (Math.hypot(velocity[index] + wave[target + 2], velocity[index + 1] + wave[target + 3]) /
          380) *
          0.85 +
          (Math.hypot(offset[index] + wave[target], offset[index + 1] + wave[target + 1]) /
            (grid.cell * 2.2)) *
            0.35 +
          (Math.hypot(wave[target], wave[target + 1]) / grid.cell) * 0.55,
      );
    }
    for (let i = shocks.length - 1; i >= 0; i--) {
      if (active[i].front >= active[i].range) shocks.splice(i, 1);
    }
    const decay = 1 - Math.exp(-dt / 0.08);
    pointer.vx -= pointer.vx * decay;
    pointer.vy -= pointer.vy * decay;
    const target = presenceTarget();
    const fadeTime = target > pointer.presence ? 0.09 : 0.18;
    pointer.presence += (target - pointer.presence) * (1 - Math.exp(-dt / fadeTime));
    if (target === 1 && !s.intro) pointer.presence = 1;
  };

  const render = () => {
    const radius = Math.max(1, settings.proximity);
    // The grid uses viewport coordinates. Only its clip and fade follow the section.
    const firstRow = Math.max(0, Math.floor(view.sliceTop / grid.cell) - 4);
    const lastRow = Math.min(
      grid.rows,
      Math.ceil((view.sliceTop + view.sliceHeight) / grid.cell) + 4,
    );
    const first = firstRow * grid.cols;
    const end = lastRow * grid.cols;
    let target = 0;
    for (let i = first; i < end; i++) {
      const index = i * 2;
      const source = i * 4;
      const x = rest[index] + offset[index] + wave[source];
      const y = rest[index + 1] + offset[index + 1] + wave[source + 1];
      const distance = Math.hypot(x - pointer.x, y - pointer.y);
      const hover = smootherstep(1 - distance / radius) * pointer.presence;
      const shock = Math.hypot(wave[source], wave[source + 1]) / grid.cell;
      const reveal = Math.min(1, Math.max(hover, shock));
      if (reveal <= revealThreshold) continue;
      instances[target] = x;
      instances[target + 1] = y;
      instances[target + 2] = velocity[index] + wave[source + 2];
      instances[target + 3] = velocity[index + 1] + wave[source + 3];
      instances[target + 4] = Math.max(energy[i], hover * 0.68);
      instances[target + 5] = settings.intro && !reduced ? 0.8 + 0.2 * reveal : 1;
      instances[target + 6] = reveal;
      target += floatsPerInstance;
    }
    if (!target) return;
    gl.uniform2f(uniforms.uResolution, view.width, view.sliceHeight);
    gl.uniform2f(uniforms.uRegionSize, view.width, view.height);
    gl.uniform1f(uniforms.uSliceTop, view.sliceTop);
    gl.uniform1f(uniforms.uRegionTop, view.regionTop);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances, 0, target);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, target / floatsPerInstance);
    gl.bindVertexArray(null);
  };

  const presenceTarget = () => {
    if (!pointer.inside) return 0;
    return pointer.resting ? restingOpacity : 1;
  };

  const settled = () => {
    if (shocks.length) return false;
    if (Math.abs(pointer.vx) + Math.abs(pointer.vy) > 1) return false;
    if (Math.abs(presenceTarget() - pointer.presence) > revealThreshold) return false;
    for (let i = 0; i < offset.length; i++) {
      if (Math.abs(offset[i]) > 0.02 || Math.abs(velocity[i]) > 0.5) return false;
    }
    return true;
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    if (positionDirty) {
      const rect = region.getBoundingClientRect();
      view.regionTop = rect.top;
      view.sliceTop = canvas.getBoundingClientRect().top;
      if (pointer.time) {
        pointer.x = pointer.clientX - rect.left;
        pointer.inside = contains(rect, pointer.clientX, pointer.y);
      }
      positionDirty = false;
    }
    if (!hasDrawn && !pointer.inside && !shocks.length) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (reduced) pointer.presence = presenceTarget();
    else step(dt, now);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    hasDrawn = pointer.inside || pointer.presence > revealThreshold || shocks.length > 0;
    if (!hasDrawn) {
      offset.fill(0);
      velocity.fill(0);
      wave.fill(0);
      energy.fill(0);
      pointer.presence = 0;
      return;
    }
    render();
    if (!reduced && !settled()) raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (raf || !visible || document.hidden || (!hasDrawn && !pointer.time && !shocks.length))
      return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const contains = (rect: DOMRect, x: number, y: number) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  const onLeave = () => {
    window.clearTimeout(idleTimer);
    pointer.inside = false;
    pointer.time = 0;
    pointer.vx = 0;
    pointer.vy = 0;
    stroke.pending = false;
    stroke.peak = 0;
    window.clearTimeout(stroke.timer);
    stroke.timer = 0;
    wake();
  };

  const fireStroke = () => {
    window.clearTimeout(stroke.timer);
    stroke.timer = 0;
    if (!stroke.pending) return;
    stroke.pending = false;
    const now = performance.now();
    const peak = stroke.peak;
    stroke.peak = 0;
    if (now - stroke.last < 180) return;
    stroke.last = now;
    const kick = smootherstep((peak - stroke.fast) / 3600);
    shocks.push({
      x: stroke.x,
      y: stroke.y,
      start: now,
      scale: 0.3 + 0.3 * kick,
      range: settings.shockRadius * (2.0 + 0.4 * kick),
      travel: 420,
      dirX: stroke.dirX,
      dirY: stroke.dirY,
      directional: true,
      cone: 0.25,
      lean: 0.35,
      widthScale: 1.6,
    });
    while (shocks.length > 6) shocks.shift();
    wake();
  };

  const showAt = (event: PointerEvent, x: number, y: number) => {
    const time = event.timeStamp || performance.now();
    if (!reduced && pointer.inside && pointer.time) {
      const elapsed = Math.max(4, time - pointer.time) / 1000;
      const vx = (event.clientX - pointer.clientX) / elapsed;
      const vy = (event.clientY - pointer.clientY) / elapsed;
      const speed = Math.hypot(vx, vy);
      pointer.vx += (vx - pointer.vx) * 0.6;
      pointer.vy += (vy - pointer.vy) * 0.6;
      if (speed >= stroke.stop * 1.7) {
        stroke.dirX = vx / speed;
        stroke.dirY = vy / speed;
      }
      if (speed >= stroke.fast) {
        stroke.pending = true;
        stroke.peak = Math.max(stroke.peak, speed);
        stroke.x = x;
        stroke.y = y;
        window.clearTimeout(stroke.timer);
        stroke.timer = window.setTimeout(fireStroke, stroke.idle);
      } else if (stroke.pending) {
        stroke.x = x;
        stroke.y = y;
        if (speed <= stroke.stop) fireStroke();
      }
    }
    pointer.x = x;
    pointer.y = y;
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;
    pointer.time = time;
    pointer.inside = true;
    pointer.resting = false;
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (event.pointerType === 'touch') onLeave();
      else {
        pointer.resting = true;
        wake();
      }
    }, pointerIdleMs);
    wake();
  };

  const onMove = (event: PointerEvent) => {
    if (!visible || !settings.mouseInteraction || event.pointerType === 'touch') return;
    const rect = region.getBoundingClientRect();
    if (contains(rect, event.clientX, event.clientY)) {
      showAt(event, event.clientX - rect.left, event.clientY);
    } else if (pointer.inside) onLeave();
  };

  const onOut = (event: PointerEvent) => {
    if (!event.relatedTarget && event.pointerType !== 'touch') onLeave();
  };

  const onDown = (event: PointerEvent) => {
    if (!visible || !settings.clickShock || event.button !== 0) return;
    const rect = region.getBoundingClientRect();
    if (!contains(rect, event.clientX, event.clientY)) return;
    const x = event.clientX - rect.left;
    const y = event.clientY;
    if (reduced) {
      showAt(event, x, y);
      return;
    }
    shocks.push({
      x,
      y,
      start: performance.now(),
      scale: 1,
      range: settings.shockRadius,
      travel: 650,
      dirX: 0,
      dirY: 0,
      directional: false,
      cone: 0,
      lean: 0,
      widthScale: 1.4,
    });
    if (shocks.length > 6) shocks.shift();
    wake();
  };

  const onScroll = () => {
    positionDirty = true;
    wake();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerout', onOut);
  window.addEventListener('blur', onLeave);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resizeObserver.observe(region);

  const onVisibility = () => {
    if (document.hidden) {
      onLeave();
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      wake();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  region.dataset.dotGrid = 'interactive';

  return {
    setVisible: (isVisible: boolean) => {
      visible = isVisible;
      if (visible) onScroll();
      else onLeave();
    },
    dispose: () => {
      window.clearTimeout(idleTimer);
      window.clearTimeout(stroke.timer);
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteBuffer(cornerBuffer);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}
