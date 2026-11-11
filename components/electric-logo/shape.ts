// The supplied ElectricLogo effect traces the alpha silhouette into two textures.
export const glowCellSize = 4;
const FAR = 1e20;

// Compute the squared Euclidean distance transform along one axis.
function transformLine(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number,
) {
  let k = 0;
  v[0] = 0;
  z[0] = -FAR;
  z[1] = FAR;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = FAR;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

function transformGrid(grid: Float32Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    transformLine(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    transformLine(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
}

function blurLine(
  src: Float32Array,
  dst: Float32Array,
  offset: number,
  stride: number,
  n: number,
  r: number,
) {
  const scale = 1 / (2 * r + 1);
  let sum = 0;
  for (let i = 0; i <= r && i < n; i++) sum += src[offset + i * stride];
  for (let i = 0; i < n; i++) {
    dst[offset + i * stride] = sum * scale;
    if (i + r + 1 < n) sum += src[offset + (i + r + 1) * stride];
    if (i - r >= 0) sum -= src[offset + (i - r) * stride];
  }
}

function blurGrid(grid: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) blurLine(grid, tmp, y * w, 1, w, r);
    for (let x = 0; x < w; x++) blurLine(tmp, grid, x, w, h, r);
  }
}

function sampleField(shape: LogoShape, x: number, y: number) {
  const { field, width, height } = shape;
  const cx = Math.min(Math.max(x, 0.5), width - 0.5);
  const cy = Math.min(Math.max(y, 0.5), height - 0.5);
  const x0 = Math.min(Math.floor(cx - 0.5), width - 2);
  const y0 = Math.min(Math.floor(cy - 0.5), height - 2);
  const tx = cx - 0.5 - x0;
  const ty = cy - 0.5 - y0;
  const i = y0 * width + x0;
  const top = field[i] + (field[i + 1] - field[i]) * tx;
  const bottom = field[i + width] + (field[i + width + 1] - field[i + width]) * tx;
  return top + (bottom - top) * ty + Math.hypot(x - cx, y - cy);
}

export function traceLogo(image: HTMLImageElement) {
  const logoWidth = image.naturalWidth;
  const logoHeight = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = logoWidth;
  canvas.height = logoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, logoWidth, logoHeight).data;

  const pad = Math.ceil(Math.max(logoWidth, logoHeight) * 0.25) + 2;
  const width = logoWidth + pad * 2;
  const height = logoHeight + pad * 2;
  const outer = new Float32Array(width * height);
  const inner = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x - pad;
      const sy = y - pad;
      const a =
        sx >= 0 && sy >= 0 && sx < logoWidth && sy < logoHeight
          ? pixels[(sy * logoWidth + sx) * 4 + 3] / 255
          : 0;
      const i = y * width + x;
      if (a >= 1) {
        outer[i] = 0;
        inner[i] = FAR;
      } else if (a <= 0) {
        outer[i] = FAR;
        inner[i] = 0;
      } else {
        const e = 0.5 - a;
        outer[i] = e > 0 ? e * e : 0;
        inner[i] = e < 0 ? e * e : 0;
      }
    }
  }
  transformGrid(outer, width, height);
  transformGrid(inner, width, height);

  const field = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) field[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);

  const points = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const d = field[i];
      if (d > 0) continue;
      if (field[i - 1] <= 0 && field[i + 1] <= 0 && field[i - width] <= 0 && field[i + width] <= 0)
        continue;
      const gx = field[i + 1] - field[i - 1];
      const gy = field[i + width] - field[i - width];
      const len = Math.hypot(gx, gy) || 1;
      points.push(x + 0.5 - (d * gx) / len, y + 0.5 - (d * gy) / len);
    }
  }
  const stride = Math.max(1, Math.ceil(points.length / 2 / 3000)) * 2;
  const edges = [];
  for (let i = 0; i < points.length; i += stride) edges.push(points[i], points[i + 1]);

  const size = Math.max(logoWidth, logoHeight);
  const glowPad = Math.ceil((size * 0.7) / glowCellSize);
  const glowWidth = Math.ceil(logoWidth / glowCellSize) + glowPad * 2;
  const glowHeight = Math.ceil(logoHeight / glowCellSize) + glowPad * 2;
  const tight = new Float32Array(glowWidth * glowHeight);
  for (let y = 0; y < height; y++) {
    const gy = Math.floor((y - pad) / glowCellSize) + glowPad;
    for (let x = 0; x < width; x++) {
      const gx = Math.floor((x - pad) / glowCellSize) + glowPad;
      tight[gy * glowWidth + gx] +=
        Math.exp(-Math.abs(field[y * width + x]) / 1.5) / (glowCellSize * glowCellSize);
    }
  }
  const wide = tight.slice();
  const tightRadius = Math.max(1, Math.round((size * 0.035) / glowCellSize));
  const wideRadius = Math.max(2, Math.round((size * 0.13) / glowCellSize));
  blurGrid(tight, glowWidth, glowHeight, tightRadius);
  blurGrid(wide, glowWidth, glowHeight, wideRadius);
  const tightNorm =
    (Math.sqrt(2 * Math.PI * (tightRadius * tightRadius + tightRadius)) * glowCellSize) / 3;
  const wideNorm =
    (Math.sqrt(2 * Math.PI * (wideRadius * wideRadius + wideRadius)) * glowCellSize) / 3;
  const glow = new Float32Array(glowWidth * glowHeight * 2);
  for (let i = 0; i < glowWidth * glowHeight; i++) {
    glow[i * 2] = tight[i] * tightNorm;
    glow[i * 2 + 1] = wide[i] * wideNorm;
  }

  return {
    field,
    edges,
    width,
    height,
    pad,
    logoWidth,
    logoHeight,
    glow,
    glowWidth,
    glowHeight,
    glowOffset: pad - glowPad * glowCellSize,
  };
}

export type LogoShape = NonNullable<ReturnType<typeof traceLogo>>;

let logoShape: Promise<LogoShape | null> | undefined;

export function loadLogoShape() {
  logoShape ??= (async () => {
    const image = new Image();
    image.src = '/youngkx-logo.webp';
    await image.decode();
    return traceLogo(image);
  })().catch((error: unknown) => {
    logoShape = undefined;
    throw error;
  });
  return logoShape;
}

type Focus = { x: number; y: number; radius: number };

export function spawnArc(shape: LogoShape, time: number, focus?: Focus) {
  const { edges, logoWidth, logoHeight } = shape;
  const count = edges.length / 2;
  if (count < 2) return null;
  const size = Math.max(logoWidth, logoHeight);
  let i = Math.floor(Math.random() * count);
  if (focus) {
    let found = false;
    for (let attempt = 0; attempt < 40 && !found; attempt++) {
      const j = Math.floor(Math.random() * count);
      if (Math.hypot(edges[j * 2] - focus.x, edges[j * 2 + 1] - focus.y) < focus.radius) {
        i = j;
        found = true;
      }
    }
    if (!found) return null;
  }
  const ax = edges[i * 2];
  const ay = edges[i * 2 + 1];
  for (let attempt = 0; attempt < 24; attempt++) {
    const j = Math.floor(Math.random() * count);
    const bx = edges[j * 2];
    const by = edges[j * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < size * 0.08 || len > size * 0.3) continue;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const bow = len * (0.2 + Math.random() * 0.3);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const left = sampleField(shape, mx + nx * bow, my + ny * bow);
    const right = sampleField(shape, mx - nx * bow, my - ny * bow);
    if (Math.max(left, right) <= 0) continue;
    return {
      ax,
      ay,
      bx,
      by,
      bow: left >= right ? bow : -bow,
      seed: 1 + Math.random() * 60,
      born: time,
      life: 0.35 + Math.random() * 0.45,
    };
  }
  return null;
}
