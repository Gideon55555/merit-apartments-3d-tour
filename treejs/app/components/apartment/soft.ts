import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seededRandom } from './textures';

// ============================================================
// SOFT FURNISHINGS
// Geometry for upholstery and textiles: plush cushions that dome in the
// middle, pillows with pinched corners, and cloth that drapes over a
// mattress and hangs down its sides with soft wrinkles.
// ============================================================

/** Rounded box whose top domes up (and sides bow out) like a filled cushion */
export function cushionGeometry(w: number, h: number, d: number, r: number, puff = 0.035) {
  const g = new RoundedBoxGeometry(w, h, d, 6, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const nx = Math.min(1, Math.abs((2 * v.x) / w));
    const nz = Math.min(1, Math.abs((2 * v.z) / d));
    const ny = (2 * v.y) / h; // -1 bottom .. 1 top
    const dome = (1 - nx * nx) * (1 - nz * nz);
    if (ny > 0) v.y += puff * dome * ny;
    // Sides bow out slightly at mid-height
    const belly = (1 - ny * ny) * puff * 0.35;
    v.x += Math.sign(v.x) * belly * (1 - nz * nz) * nx;
    v.z += Math.sign(v.z) * belly * (1 - nx * nx) * nz;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Throw pillow lying in the XY plane (thickness along Z), corners pinched */
export function pillowGeometry(w: number, h: number, t: number) {
  const box = new THREE.BoxGeometry(w, h, t, 20, 20, 2);
  const pos = box.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const nx = (2 * v.x) / w;
    const ny = (2 * v.y) / h;
    // Full thickness in the middle, thin at the seams, thinnest at corners
    const f = Math.sqrt(Math.max(0, 1 - nx * nx)) * Math.sqrt(Math.max(0, 1 - ny * ny));
    v.z *= 0.12 + 0.88 * f;
    // Edges pull in a touch so the outline curves like a stuffed case
    v.x *= 1 - 0.04 * ny * ny;
    v.y *= 1 - 0.04 * nx * nx;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  box.deleteAttribute('normal');
  const g = mergeVertices(box, 1e-4);
  box.dispose();
  g.computeVertexNormals();
  return g;
}

/**
 * Cloth draped over a box top (width w along X, length l along Z),
 * hanging `drop` metres down the two long sides and the foot end (+Z).
 * Origin: centre of the head edge of the top surface (y = 0 is the top).
 */
export function drapeGeometry(w: number, l: number, drop: number, seed: number, wrinkle = 0.012) {
  const rand = seededRandom(seed);
  const segX = 48;
  const segZ = 56;
  const W = w + drop * 2;
  const L = l + drop;
  const g = new THREE.PlaneGeometry(W, L, segX, segZ);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, L / 2);
  const pos = g.attributes.position;
  // A few random low-frequency waves give natural creases
  const waves = Array.from({ length: 5 }, () => ({ fx: 4 + rand() * 9, fz: 3 + rand() * 8, p: rand() * 6.28, a: wrinkle * (0.4 + rand()) }));
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = v.x;
    let y = 0;
    let z = v.z;
    const ax = Math.abs(x);
    // Sides: past the edge the cloth turns down and hangs
    if (ax > w / 2) {
      const over = ax - w / 2;
      const bend = Math.min(over, 0.06);
      x = Math.sign(x) * (w / 2 + bend * 0.6 + Math.max(0, over - 0.06) * 0.08);
      y -= over;
    }
    if (z > l) {
      const over = z - l;
      z = l + Math.min(over, 0.06) * 0.6 + Math.max(0, over - 0.06) * 0.08;
      y -= over;
    }
    // Hanging cloth can't drop below the mattress side: clamp
    y = Math.max(y, -drop);
    let n = 0;
    for (const wv of waves) n += Math.sin(v.x * wv.fx + v.z * wv.fz + wv.p) * wv.a;
    // Wrinkles mostly on the hanging parts and towards the foot
    const hang = Math.min(1, -y / 0.05);
    y += n * (0.35 + 0.4 * (v.z / L));
    x += Math.sign(x) * n * 0.6 * hang;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Fine woven normal map for upholstery (neutral blue = flat) */
export function weaveNormalTexture(anisotropy: number) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = seededRandom(91);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Over-under weave: alternating warp/weft bumps plus fibre noise
      const warp = Math.sin((x / size) * Math.PI * 2 * 48) * 0.5 + 0.5;
      const weft = Math.sin((y / size) * Math.PI * 2 * 48) * 0.5 + 0.5;
      const cell = (Math.floor((x / size) * 48) + Math.floor((y / size) * 48)) % 2;
      height[y * size + x] = (cell ? warp : weft) * 0.7 + rand() * 0.3;
    }
  }
  const h = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 2;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.anisotropy = anisotropy;
  return t;
}
