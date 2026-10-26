import * as THREE from 'three';

// ============================================================
// PROCEDURAL TEXTURES
// Everything is drawn onto canvases at runtime so the tour needs no
// image assets. All generators are seeded, so the apartment looks the
// same on every load.
// ============================================================

export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, anisotropy: number, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

// Fine per-pixel noise so flat colours don't look like CG
function addNoise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, rand: () => number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Wavy grain lines along the x axis inside a rectangle
function drawGrain(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  rand: () => number, density: number, color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const lines = Math.round(h * density);
  for (let i = 0; i < lines; i++) {
    const baseY = y + rand() * h;
    const amp = 0.5 + rand() * 2.5;
    const freq = 0.004 + rand() * 0.01;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.04 + rand() * 0.12;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    for (let px = x; px <= x + w; px += 8) {
      const py = baseY + Math.sin(px * freq + phase) * amp;
      if (px === x) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Oak plank floor. One texture tile covers FLOOR_TILE metres. */
export const FLOOR_TILE = 2.4;
export function oakFloorTexture(anisotropy: number) {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seededRandom(11);
  const rows = 12; // 0.2 m planks
  const rowH = size / rows;
  const pxPerM = size / FLOOR_TILE;

  ctx.fillStyle = '#6b5038';
  ctx.fillRect(0, 0, size, size);

  for (let r = 0; r < rows; r++) {
    let x = -rand() * size;
    while (x < size) {
      const len = (0.9 + rand() * 0.9) * pxPerM;
      const l = 56 + rand() * 12;
      const s = 34 + rand() * 10;
      const hue = 29 + rand() * 6;
      // Draw the plank twice when it wraps so the texture tiles seamlessly
      for (const offset of [0, size]) {
        const px = x + offset;
        if (px > size || px + len < 0) continue;
        const y = r * rowH;
        const grad = ctx.createLinearGradient(px, y, px + len, y + rowH);
        grad.addColorStop(0, hsl(hue, s, l));
        grad.addColorStop(0.5, hsl(hue + 1, s + 2, l - 3));
        grad.addColorStop(1, hsl(hue - 1, s, l + 1));
        ctx.fillStyle = grad;
        ctx.fillRect(px + 1, y + 1, len - 2, rowH - 2);
        drawGrain(ctx, px, y, len, rowH, rand, 0.45, '#5a3d22');
        if (rand() < 0.25) {
          ctx.fillStyle = 'rgba(80, 52, 28, 0.35)';
          ctx.beginPath();
          ctx.ellipse(px + rand() * len, y + rowH * (0.3 + rand() * 0.4), 4 + rand() * 6, 2 + rand() * 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      x += len;
    }
  }
  addNoise(ctx, size, size, 10, rand);
  return toTexture(canvas, anisotropy);
}

/** Furniture wood grain. Light oak; tint the material colour for walnut. */
export function woodGrainTexture(anisotropy: number) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seededRandom(23);
  ctx.fillStyle = '#c49a6c';
  ctx.fillRect(0, 0, size, size);
  drawGrain(ctx, 0, 0, size, size, rand, 0.9, '#7a5534');
  drawGrain(ctx, 0, 0, size, size, rand, 0.25, '#e8c9a0');
  addNoise(ctx, size, size, 8, rand);
  return toTexture(canvas, anisotropy);
}

interface TileOptions {
  seed: number;
  tilesX: number;
  tilesY: number;
  base: [number, number, number]; // hsl
  variation: number;
  grout: string;
  grout_px: number;
  mottle: number;
}

/** Generic grid of tiles with per-tile tone variation and grout lines. */
function tileTexture(o: TileOptions, anisotropy: number) {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seededRandom(o.seed);
  ctx.fillStyle = o.grout;
  ctx.fillRect(0, 0, size, size);
  const tw = size / o.tilesX;
  const th = size / o.tilesY;
  for (let ty = 0; ty < o.tilesY; ty++) {
    for (let tx = 0; tx < o.tilesX; tx++) {
      const [h, s, l] = o.base;
      const dl = (rand() - 0.5) * o.variation;
      const x = tx * tw + o.grout_px / 2;
      const y = ty * th + o.grout_px / 2;
      const w = tw - o.grout_px;
      const hh = th - o.grout_px;
      ctx.fillStyle = hsl(h, s, l + dl);
      ctx.fillRect(x, y, w, hh);
      // Soft mottling for a stone-like surface
      for (let i = 0; i < o.mottle; i++) {
        ctx.fillStyle = hsl(h, s, l + dl + (rand() - 0.5) * 6, 0.12);
        ctx.beginPath();
        ctx.arc(x + rand() * w, y + rand() * hh, 8 + rand() * 40, 0, Math.PI * 2);
        ctx.fill();
      }
      // Slight edge darkening
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, hh - 2);
    }
  }
  addNoise(ctx, size, size, 6, rand);
  return toTexture(canvas, anisotropy);
}

/**
 * Large-format marble-look porcelain (60 × 120 cm) in pale warm grey,
 * as in the design renders. One texture tile = FLOOR_TILE (2.4 m).
 */
export function porcelainFloorTexture(anisotropy: number) {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seededRandom(19);
  const tw = size / 4;
  const th = size / 2;
  ctx.fillStyle = '#cfcac3';
  ctx.fillRect(0, 0, size, size);
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const x = tx * tw + 1;
      const y = ty * th + 1;
      const w = tw - 2;
      const h = th - 2;
      ctx.fillStyle = hsl(32, 9, 82 + (rand() - 0.5) * 2.5);
      ctx.fillRect(x, y, w, h);
      // Soft clouding
      for (let i = 0; i < 25; i++) {
        ctx.fillStyle = hsl(30, 6, 84 + rand() * 6, 0.1);
        ctx.beginPath();
        ctx.ellipse(x + rand() * w, y + rand() * h, 20 + rand() * 60, 10 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      // Fine grey veins, clipped to the tile
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.filter = 'blur(0.8px)';
      for (let v = 0; v < 2; v++) {
        ctx.strokeStyle = `rgba(120, 112, 102, ${0.05 + rand() * 0.08})`;
        ctx.lineWidth = 0.5 + rand() * 1.0;
        ctx.beginPath();
        let vx = x + rand() * w;
        let vy = y;
        ctx.moveTo(vx, vy);
        while (vy < y + h) {
          const nx = vx + (rand() - 0.5) * 70;
          const ny = vy + 30 + rand() * 50;
          ctx.quadraticCurveTo(vx + (rand() - 0.5) * 50, (vy + ny) / 2, nx, ny);
          vx = nx;
          vy = ny;
        }
        ctx.stroke();
      }
      ctx.filter = 'none';
      ctx.restore();
    }
  }
  addNoise(ctx, size, size, 4, rand);
  return toTexture(canvas, anisotropy);
}

/** Large-format warm stone tiles (60 × 30 cm). One texture tile = 1.2 m. */
export const BATH_TILE = 1.2;
export function bathTileTexture(anisotropy: number) {
  return tileTexture({
    seed: 5, tilesX: 2, tilesY: 4,
    base: [36, 12, 82], variation: 3,
    grout: '#cfc8bd', grout_px: 3, mottle: 40,
  }, anisotropy);
}

/** Handmade-look vertical stacked backsplash tiles. One texture tile = 0.6 m. */
export const SPLASH_TILE = 0.6;
export function backsplashTexture(anisotropy: number) {
  return tileTexture({
    seed: 9, tilesX: 8, tilesY: 2,
    base: [48, 18, 90], variation: 5,
    grout: '#d6d0c4', grout_px: 3, mottle: 6,
  }, anisotropy);
}

/** Neutral weave; multiply with the material colour. */
export function fabricTexture(anisotropy: number) {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seededRandom(31);
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size; i += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rand() * 0.05})`;
    ctx.fillRect(0, i, size, 1);
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rand() * 0.05})`;
    ctx.fillRect(i, 0, 1, size);
  }
  addNoise(ctx, size, size, 18, rand);
  return toTexture(canvas, anisotropy);
}

/** White quartz with soft grey veining. */
export function marbleTexture(anisotropy: number) {
  const w = 1024;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = seededRandom(47);
  ctx.fillStyle = '#efece6';
  ctx.fillRect(0, 0, w, h);
  ctx.filter = 'blur(1.5px)';
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = `rgba(120, 118, 112, ${0.08 + rand() * 0.18})`;
    ctx.lineWidth = 0.6 + rand() * 2.5;
    ctx.beginPath();
    let x = rand() * w;
    let y = rand() * h;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      const nx = x + (rand() - 0.3) * 260;
      const ny = y + (rand() - 0.5) * 160;
      ctx.quadraticCurveTo(x + (rand() - 0.5) * 120, y + (rand() - 0.5) * 120, nx, ny);
      x = nx;
      y = ny;
    }
    ctx.stroke();
  }
  ctx.filter = 'none';
  addNoise(ctx, w, h, 5, rand);
  return toTexture(canvas, anisotropy);
}

/** Woven wool rug with a subtle border. */
export function rugTexture(anisotropy: number, tone: [number, number, number], seed: number) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = seededRandom(seed);
  const [h, s, l] = tone;
  ctx.fillStyle = hsl(h, s, l);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = hsl(h, s, l + (rand() - 0.5) * 10, 0.25);
    ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 4, 1 + rand() * 2);
  }
  ctx.strokeStyle = hsl(h, s + 6, l - 14, 0.8);
  ctx.lineWidth = 6;
  ctx.strokeRect(26, 26, size - 52, size - 52);
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, size - 80, size - 80);
  addNoise(ctx, size, size, 14, rand);
  const tex = toTexture(canvas, anisotropy);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/** Abstract artwork in warm, earthy tones. */
export function artworkTexture(anisotropy: number, seed: number) {
  const w = 512;
  const h = 640;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = seededRandom(seed);
  const palette = ['#c0673f', '#d9a35c', '#7f8f75', '#2f3a35', '#e7d6bd', '#a65a3a'];
  ctx.fillStyle = '#ece3d4';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.globalAlpha = 0.75 + rand() * 0.25;
    ctx.beginPath();
    const kind = rand();
    if (kind < 0.45) {
      ctx.arc(rand() * w, rand() * h, 40 + rand() * 140, 0, Math.PI * (1 + rand()));
    } else if (kind < 0.75) {
      ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 120, 60 + rand() * 160, rand() * Math.PI, 0, Math.PI * 2);
    } else {
      ctx.rect(rand() * w * 0.7, rand() * h * 0.7, 40 + rand() * 160, 20 + rand() * 60);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#2f3a35';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rand() * w, 0);
  ctx.bezierCurveTo(rand() * w, h * 0.3, rand() * w, h * 0.7, rand() * w, h);
  ctx.stroke();
  addNoise(ctx, w, h, 12, rand);
  const tex = toTexture(canvas, anisotropy);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
