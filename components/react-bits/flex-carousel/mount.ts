import { Mesh, Plane, Program, Renderer, RenderTarget, Texture, Triangle } from 'ogl';
import { cardFragment, cardVertex, lensFragment, lensVertex } from './shaders';

type Cover = { src: string; width: number; height: number };
type Callbacks = {
  onChange: (index: number) => void;
  onSelect: (index: number, event: PointerEvent) => void;
  onContextLost: () => void;
};
type Layout = { cardHeight: number; widths: number[]; centers: number[]; loop: number };
type Drawing = {
  index: number;
  offset: number;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
};

// The Liquid preset from FlexCarousel. Its lens is fixed at the center of the viewport.
const preset = {
  width: 0.74,
  height: 1.18,
  tilt: (62 * Math.PI) / 180,
  bend: 0.42,
  reach: 0.38,
  dispersion: 0.45,
  squeeze: 0.2,
};
const gap = 12;
const pixelBudget = 4.5e6;
const introDuration = 2.1;
const swirlStrength = 0.35;
const wrap = (value: number, size: number) =>
  ((((value + size / 2) % size) + size) % size) - size / 2;
const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function measureLayout(width: number, height: number, aspects: number[]): Layout {
  const cardHeight = Math.max(24, Math.min(height * 0.5, (width * 0.88) / Math.max(...aspects)));
  const widths = aspects.map((aspect) => aspect * cardHeight);
  let cursor = 0;
  const centers = widths.map((cardWidth) => {
    const center = cursor + cardWidth / 2;
    cursor += cardWidth + gap;
    return center;
  });
  return { cardHeight, widths, centers, loop: cursor };
}

function nearest(layout: Layout, position: number) {
  let index = 0;
  let distance = Infinity;
  for (let i = 0; i < layout.centers.length; i++) {
    const offset = Math.abs(wrap(layout.centers[i] - position, layout.loop));
    if (offset < distance) {
      index = i;
      distance = offset;
    }
  }
  return index;
}

function remap(from: Layout, to: Layout, position: number) {
  const index = nearest(from, position);
  const offset = wrap(position - from.centers[index], from.loop);
  const cycles = Math.round((position - offset - from.centers[index]) / from.loop);
  return cycles * to.loop + to.centers[index] + (offset * to.widths[index]) / from.widths[index];
}

function measureLens(width: number, height: number) {
  const halfWidth = Math.max(1, (preset.width * width) / 2);
  const halfHeight = Math.max(1, (preset.height * width) / 2);
  const inner = Math.max(4, (preset.reach * (halfWidth + halfHeight)) / 2);
  return {
    halfWidth,
    halfHeight,
    inner,
    outer: inner * 1.6,
    flow: Math.min(preset.bend * (halfWidth + halfHeight) * 0.45, height * 0.42),
  };
}

// The lens samples a shifted pixel. Use that same coordinate to select the visible artwork.
function samplePoint(
  x: number,
  y: number,
  width: number,
  height: number,
  { halfWidth, halfHeight, inner, outer, flow }: ReturnType<typeof measureLens>,
  strength: number,
) {
  const relX = x - width / 2;
  const relY = height / 2 - y;
  const ca = Math.cos(preset.tilt);
  const sa = Math.sin(preset.tilt);
  const localX = ca * relX + sa * relY;
  const localY = -sa * relX + ca * relY;
  const kx = Math.max(Math.abs(localX) / halfWidth, 1e-5);
  const ky = Math.max(Math.abs(localY) / halfHeight, 1e-5);
  const nd = Math.hypot(kx, ky);
  const gx = (kx * Math.sign(localX)) / (halfWidth * nd);
  const gy = (ky * Math.sign(localY)) / (halfHeight * nd);
  const length = Math.max(Math.hypot(gx, gy), 1e-6);
  const edge = (nd - 1) / length;
  const alongX = -(sa * gx + ca * gy) / length;
  const alongY = (ca * gx - sa * gy) / length;
  const t = clamp01((edge + inner) / (inner + outer));
  const ramp = t * t * t * (t * (t * 6 - 15) + 10);
  const slope = 16 * t * t * (1 - t) * (1 - t);
  const reach = clamp01((Math.abs(relX / (width / 2)) - 0.02) / 0.28);
  const side = reach * reach * (3 - 2 * reach) * Math.sign(relX);
  const lift = ramp * side * flow * strength;
  const swirl = alongY * side * slope * flow * strength * swirlStrength;
  return [x - alongX * swirl, y + lift + alongY * swirl];
}

export function mountLiquidCarousel(
  surface: HTMLDivElement,
  container: HTMLDivElement,
  covers: readonly Cover[],
  initialIndex: number,
  callbacks: Callbacks,
) {
  const canvas = document.createElement('canvas');
  const attributes = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false };
  if (!canvas.getContext('webgl2', attributes)) return null;

  const renderer = new Renderer({ canvas, ...attributes });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  canvas.style.display = 'block';
  canvas.setAttribute('aria-hidden', 'true');

  const placeholder = new Texture(gl);
  const cardUniforms = {
    tMap: { value: placeholder },
    uRect: { value: [0, 0, 1, 1] },
    uResolution: { value: [1, 1] },
    uSize: { value: [1, 1] },
    uImage: { value: [1, 1] },
    uRadius: { value: 0 },
    uAlpha: { value: 1 },
    uReady: { value: 0 },
    uShift: { value: 0 },
    uDpr: { value: 1 },
    uPlaceholder: { value: [0.5, 0.5, 0.5] },
  };
  const cardProgram = new Program(gl, {
    vertex: cardVertex,
    fragment: cardFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: cardUniforms,
  });
  cardProgram.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const target = new RenderTarget(gl, {
    width: 2,
    height: 2,
    depth: false,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
    magFilter: gl.LINEAR,
  });
  const lensUniforms = {
    tScene: { value: target.texture },
    uResolution: { value: [1, 1] },
    uSceneSize: { value: [1, 1] },
    uDpr: { value: 1 },
    uCenter: { value: [0, 0] },
    uHalf: { value: [1, 1] },
    uAngle: { value: preset.tilt },
    uExponent: { value: 2 },
    uInner: { value: 60 },
    uOuter: { value: 80 },
    uFlow: { value: 0 },
    uSwirl: { value: swirlStrength },
    uCurl: { value: 0 },
    uDispersion: { value: preset.dispersion * 0.12 },
    uStrength: { value: 0 },
    uSceneAlpha: { value: 1 },
  };
  const lensProgram = new Program(gl, {
    vertex: lensVertex,
    fragment: lensFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: lensUniforms,
  });
  if (
    ![cardProgram, lensProgram].every(({ program }) =>
      gl.getProgramParameter(program, gl.LINK_STATUS),
    )
  ) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
  const cardMesh = new Mesh(gl, { geometry: new Plane(gl), program: cardProgram });
  const lensMesh = new Mesh(gl, { geometry: new Triangle(gl), program: lensProgram });

  const aspects = covers.map((cover) => cover.width / cover.height);
  let width = Math.max(1, container.clientWidth);
  let height = Math.max(1, container.clientHeight);
  let layout = measureLayout(width, height, aspects);
  let lens = measureLens(width, height);
  let canvasHeight = height;
  let sceneInset = 0;
  let active = initialIndex;
  let position = layout.centers[active];
  let lastPosition = position;
  let goal = position;
  let velocity = 0;
  let energy = 0;
  let wheelAt = -Infinity;
  let raf = 0;
  let last = performance.now();
  let alive = true;
  let visible = true;
  let dirty = true;
  let intro = 0;
  let lastDraws: Drawing[] = [];
  const loadStartedAt = performance.now();
  const pointer = {
    id: -1,
    startX: 0,
    startY: 0,
    startPosition: 0,
    x: 0,
    dragging: false,
    samples: [] as { x: number; t: number }[],
  };

  const anisotropy = renderer.getExtension('EXT_texture_filter_anisotropic') ? 8 : 0;
  const slots = covers.map((cover) => {
    const texture = new Texture(gl, {
      generateMipmaps: true,
      minFilter: gl.LINEAR_MIPMAP_LINEAR,
      magFilter: gl.LINEAR,
      anisotropy,
    });
    const image = new Image();
    const slot = { texture, image, loaded: false, failed: false, ready: 0, color: [0.5, 0.5, 0.5] };
    image.decoding = 'async';
    image.onload = () => {
      if (!alive) return;
      texture.image = image;
      texture.update();
      const probe = document.createElement('canvas');
      probe.width = probe.height = 8;
      const context = probe.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(image, 0, 0, 8, 8);
        const pixels = context.getImageData(0, 0, 8, 8).data;
        const color = [0, 0, 0];
        for (let i = 0; i < pixels.length; i += 4) {
          color[0] += pixels[i];
          color[1] += pixels[i + 1];
          color[2] += pixels[i + 2];
        }
        slot.color = color.map((channel) => channel / (64 * 255));
      }
      slot.loaded = true;
      dirty = true;
      start();
    };
    image.onerror = () => {
      slot.failed = true;
      start();
    };
    image.src = cover.src;
    return slot;
  });

  function syncSize() {
    lens = measureLens(width, height);
    // The lift and vertical swirl peak at different points. Together they stay below 1.1 * flow.
    const verticalDrift = lens.flow * (1.1 + lensUniforms.uDispersion.value / 2);
    const bleed = Math.max(0, Math.ceil((layout.cardHeight - height) / 2 + verticalDrift + 4));
    // Horizontal swirl is proportional to along.x * along.y, whose magnitude is at most 0.5.
    sceneInset = Math.ceil(lens.flow * swirlStrength * 0.5 + 4);
    const sceneWidth = width + 2 * sceneInset;
    canvasHeight = height + 2 * bleed;
    surface.style.insetBlock = `${-bleed}px`;
    renderer.dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(pixelBudget / (sceneWidth * canvasHeight)),
    );
    renderer.setSize(width, canvasHeight);
    target.setSize(
      Math.max(2, Math.round(sceneWidth * renderer.dpr)),
      Math.max(2, Math.round(canvasHeight * renderer.dpr)),
    );
    lensUniforms.uResolution.value = [width, canvasHeight];
    cardUniforms.uResolution.value = lensUniforms.uSceneSize.value = [sceneWidth, canvasHeight];
    cardUniforms.uDpr.value = lensUniforms.uDpr.value = renderer.dpr;
    lensUniforms.uCenter.value = [width / 2, canvasHeight / 2];
    lensUniforms.uHalf.value = [lens.halfWidth, lens.halfHeight];
    lensUniforms.uInner.value = lens.inner;
    lensUniforms.uOuter.value = lens.outer;
    lensUniforms.uFlow.value = lens.flow;
    container.style.setProperty('--flex-carousel-half', `${layout.cardHeight / 2}px`);
    dirty = true;
  }

  function snapPoint(at: number) {
    return at + wrap(layout.centers[nearest(layout, at)] - at, layout.loop);
  }

  function goTo(index: number) {
    goal += wrap(layout.centers[index] - goal, layout.loop);
    intro = 1;
    wheelAt = -Infinity;
    dirty = true;
    start();
  }

  function step(delta: number) {
    const current = nearest(layout, goal);
    const next = (current + delta + slots.length) % slots.length;
    goTo(next);
  }

  function draw() {
    const draws: Drawing[] = [];
    const shrink = 1 - preset.squeeze * energy;
    const homeX = width / 2;
    const homeY = canvasHeight / 2;
    const riseDistance = (height - layout.cardHeight) / 2;
    for (let index = 0; index < slots.length; index++) {
      const cardWidth = layout.widths[index];
      const relative = wrap(layout.centers[index] - position, layout.loop);
      for (let cycle = -3; cycle <= 3; cycle++) {
        const offset = relative + cycle * layout.loop;
        const x = homeX + offset;
        const delay = Math.min(Math.abs(offset) / (width * 0.6), 1) * 0.34;
        const local = intro >= 1 ? 1 : clamp01((intro - delay) / 0.6);
        const alpha = clamp01(local * 4);
        const rise = Math.pow(1 - local, 5) * riseDistance;
        const scale = shrink * (0.5 + 0.5 * easeInOut((local - 0.18) / 0.82));
        const drawnWidth = cardWidth * scale;
        if (
          alpha <= 0.001 ||
          x + drawnWidth / 2 < -sceneInset ||
          x - drawnWidth / 2 > width + sceneInset
        )
          continue;
        draws.push({
          index,
          offset,
          x,
          y: homeY + rise,
          width: drawnWidth,
          height: layout.cardHeight * scale,
          alpha,
        });
      }
    }
    draws.sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset));
    let first = true;
    for (const card of draws) {
      const slot = slots[card.index];
      cardUniforms.tMap.value = slot.texture;
      cardUniforms.uRect.value = [card.x + sceneInset, card.y, card.width + 2, card.height + 2];
      cardUniforms.uSize.value = [card.width, card.height];
      cardUniforms.uImage.value = [covers[card.index].width, covers[card.index].height];
      cardUniforms.uAlpha.value = card.alpha;
      cardUniforms.uReady.value = slot.ready;
      cardUniforms.uShift.value = Math.max(-1, Math.min(1, card.offset / (width * 0.75)));
      cardUniforms.uPlaceholder.value = slot.color;
      renderer.render({ scene: cardMesh, target, clear: first });
      first = false;
    }
    if (first) {
      renderer.bindFramebuffer(target);
      gl.viewport(0, 0, target.width, target.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    renderer.bindFramebuffer();
    target.texture.bind();
    gl.generateMipmap(gl.TEXTURE_2D);
    lensUniforms.uStrength.value = easeInOut((intro - 0.3) / 0.65);
    renderer.render({ scene: lensMesh });
    lastDraws = draws;
  }

  function frame(now: number) {
    raf = 0;
    if (!alive || !visible || document.hidden) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    let animating = pointer.dragging;

    if (
      intro < 1 &&
      (slots.every((slot) => slot.loaded || slot.failed) || now - loadStartedAt > 3500)
    ) {
      intro = Math.min(1, intro + dt / introDuration);
      animating = true;
    }
    if (wheelAt !== -Infinity && now - wheelAt > 150) {
      goal = snapPoint(goal);
      wheelAt = -Infinity;
    }
    if (!pointer.dragging) {
      const stiffness = wheelAt === -Infinity ? 55 : 80;
      const damping = 2 * Math.sqrt(stiffness);
      const steps = Math.ceil(dt / (1 / 240));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        velocity += (stiffness * (goal - position) - damping * velocity) * h;
        position += velocity * h;
      }
      if (Math.abs(goal - position) < 0.05 && Math.abs(velocity) < 0.5) {
        position = goal;
        velocity = 0;
      } else {
        animating = true;
      }
    }
    const energyTarget = Math.min(Math.abs(position - lastPosition) / dt / 2600, 1);
    energy += (energyTarget - energy) * (1 - Math.exp(-dt / (energyTarget > energy ? 0.07 : 0.35)));
    if (energy > 0.001) animating = true;
    if (Math.abs(position) > layout.loop * 8) {
      const shift = Math.round(position / layout.loop) * layout.loop;
      position -= shift;
      goal -= shift;
      pointer.startPosition -= shift;
    }
    lastPosition = position;
    const current = nearest(layout, position);
    if (current !== active) {
      active = current;
      callbacks.onChange(active);
    }
    for (const slot of slots) {
      if (slot.loaded && slot.ready < 1) {
        slot.ready = Math.min(1, slot.ready + dt / 0.45);
        animating = true;
      }
    }
    if (dirty || animating) {
      dirty = false;
      draw();
    }
    if (animating || intro < 1 || wheelAt !== -Infinity || pointer.id !== -1) {
      raf = requestAnimationFrame(frame);
    }
  }

  function start() {
    if (raf || !alive || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function localPoint(event: PointerEvent) {
    const bounds = surface.getBoundingClientRect();
    return [event.clientX - bounds.left, event.clientY - bounds.top];
  }

  function hitTest(x: number, y: number) {
    const [sampleX, sampleY] = samplePoint(
      x,
      y,
      width,
      canvasHeight,
      lens,
      lensUniforms.uStrength.value,
    );
    for (let i = lastDraws.length - 1; i >= 0; i--) {
      const card = lastDraws[i];
      if (
        Math.abs(card.x - sampleX) <= card.width / 2 &&
        Math.abs(card.y - sampleY) <= card.height / 2
      ) {
        return card;
      }
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    const [x, y] = localPoint(event);
    intro = 1;
    wheelAt = -Infinity;
    pointer.id = event.pointerId;
    pointer.startX = pointer.x = x;
    pointer.startY = y;
    pointer.startPosition = position;
    pointer.samples = [{ x, t: performance.now() }];
    if (Math.abs(velocity) > 40) {
      goal = position;
      velocity = 0;
    }
    dirty = true;
    start();
  }

  function onPointerMove(event: PointerEvent) {
    const [x, y] = localPoint(event);
    pointer.x = x;
    surface.style.cursor = !pointer.dragging && hitTest(x, y) ? 'pointer' : '';
    if (pointer.id !== event.pointerId) return;
    const dx = x - pointer.startX;
    const dy = y - pointer.startY;
    const slop = event.pointerType === 'touch' ? 10 : 5;
    if (!pointer.dragging) {
      if (event.pointerType === 'touch' && Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx)) {
        pointer.id = -1;
        return;
      }
      if (Math.abs(dx) <= slop) return;
      pointer.dragging = true;
      pointer.startX = x;
      pointer.startPosition = position;
      surface.setPointerCapture(event.pointerId);
      container.setAttribute('data-dragging', '');
      surface.style.cursor = '';
    }
    position = pointer.startPosition - (x - pointer.startX);
    goal = position;
    velocity = 0;
    const now = performance.now();
    pointer.samples.push({ x, t: now });
    while (pointer.samples.length > 2 && now - pointer.samples[0].t > 100) pointer.samples.shift();
    dirty = true;
    start();
  }

  function onPointerUp(event: PointerEvent) {
    if (pointer.id !== event.pointerId) return;
    pointer.id = -1;
    container.removeAttribute('data-dragging');
    if (!pointer.dragging) {
      const [x, y] = localPoint(event);
      const hit = hitTest(x, y);
      if (hit) callbacks.onSelect(hit.index, event);
      return;
    }
    pointer.dragging = false;
    const first = pointer.samples[0];
    const last = pointer.samples.at(-1);
    if (last && last.t > first.t && performance.now() - last.t < 70) {
      velocity = -((last.x - first.x) / (last.t - first.t)) * 1000;
    }
    goal = snapPoint(position + velocity * 0.32);
    if (Math.abs(velocity) > 400 && Math.abs(goal - position) < 1) step(velocity > 0 ? 1 : -1);
    start();
  }

  function onPointerCancel(event: PointerEvent) {
    if (pointer.id !== event.pointerId) return;
    pointer.id = -1;
    pointer.dragging = false;
    container.removeAttribute('data-dragging');
    goal = snapPoint(position);
    start();
  }

  function onPointerLeave(event: PointerEvent) {
    surface.style.cursor = '';
    if (!pointer.dragging) onPointerCancel(event);
  }

  function onLostPointerCapture(event: PointerEvent) {
    if (event.target === surface) onPointerCancel(event);
  }

  function onWheel(event: WheelEvent) {
    if (event.ctrlKey) return;
    const dx =
      event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY)
        ? event.deltaY
        : event.deltaX;
    if (!dx || (!event.shiftKey && Math.abs(dx) <= Math.abs(event.deltaY))) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    goal += Math.max(-120, Math.min(120, dx * unit)) * 1.25;
    intro = 1;
    wheelAt = performance.now();
    dirty = true;
    start();
  }

  const resizeObserver = new ResizeObserver(() => {
    const previous = layout;
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    layout = measureLayout(width, height, aspects);
    position = remap(previous, layout, position);
    lastPosition = position;
    goal = remap(previous, layout, goal);
    pointer.startPosition = position + (pointer.x - pointer.startX);
    syncSize();
    start();
  });
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  });

  function onContextLost() {
    destroy();
    callbacks.onContextLost();
  }

  function destroy() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('pointermove', onPointerMove);
    surface.removeEventListener('pointerup', onPointerUp);
    surface.removeEventListener('pointercancel', onPointerCancel);
    surface.removeEventListener('pointerleave', onPointerLeave);
    surface.removeEventListener('lostpointercapture', onLostPointerCapture);
    surface.removeEventListener('wheel', onWheel);
    document.removeEventListener('visibilitychange', start);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    for (const { texture, image } of slots) {
      image.onload = image.onerror = null;
      gl.deleteTexture(texture.texture);
    }
    cardMesh.geometry.remove();
    lensMesh.geometry.remove();
    cardProgram.remove();
    lensProgram.remove();
    gl.deleteTexture(placeholder.texture);
    gl.deleteTexture(target.texture.texture);
    gl.deleteFramebuffer(target.buffer);
    if (!gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
    container.style.setProperty('--flex-carousel-half', '25%');
    container.removeAttribute('data-dragging');
    surface.style.cursor = '';
    surface.style.removeProperty('inset-block');
    canvas.remove();
  }

  surface.append(canvas);
  syncSize();
  resizeObserver.observe(container);
  intersectionObserver.observe(surface);
  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointermove', onPointerMove);
  surface.addEventListener('pointerup', onPointerUp);
  surface.addEventListener('pointercancel', onPointerCancel);
  surface.addEventListener('pointerleave', onPointerLeave);
  surface.addEventListener('lostpointercapture', onLostPointerCapture);
  surface.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', onContextLost);
  start();
  return { goTo, step, destroy };
}
