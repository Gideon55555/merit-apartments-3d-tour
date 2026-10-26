import * as THREE from 'three';
import type { CameraKey } from './types';

// ============================================================
// CAMERA PATH
// The whole tour is one continuous centripetal Catmull-Rom spline for
// the camera position and another for the look-at target. Scroll is
// measured in "units"; each key pins a pose to a unit value. Arc length
// is mapped to units with a monotone cubic (PCHIP), so the camera eases
// into each room, drifts slowly while the copy is on screen, and never
// changes speed abruptly or moves backwards. Each unit type supplies
// its own keys (see units/).
// ============================================================

// ------------------------------------------------------------
// Monotone cubic Hermite interpolation (Fritsch–Carlson)
// ------------------------------------------------------------
class Pchip {
  private m: number[];

  constructor(private xs: number[], private ys: number[]) {
    const n = xs.length;
    const h: number[] = [];
    const d: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      h[i] = xs[i + 1] - xs[i];
      d[i] = (ys[i + 1] - ys[i]) / h[i];
    }
    this.m = new Array(n).fill(0);
    this.m[0] = d[0];
    this.m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) continue;
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      this.m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }

  at(x: number) {
    const { xs, ys, m } = this;
    const n = xs.length;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
      + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  }
}

const ARC_DIVISIONS_PER_KEY = 80;

class ArcTrack {
  private curve: THREE.CatmullRomCurve3;
  private map: Pchip;
  private total: number;

  constructor(points: THREE.Vector3[], us: number[]) {
    this.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const divisions = (points.length - 1) * ARC_DIVISIONS_PER_KEY;
    this.curve.arcLengthDivisions = divisions;
    const lengths = this.curve.getLengths(divisions);
    this.total = lengths[divisions];
    const s = points.map((_, i) => lengths[i * ARC_DIVISIONS_PER_KEY]);
    this.map = new Pchip(us, s);
  }

  at(u: number, out: THREE.Vector3) {
    const s = THREE.MathUtils.clamp(this.map.at(u) / this.total, 0, 1);
    return this.curve.getPointAt(s, out);
  }
}

export interface CameraSample {
  fov: number;
  shift: number;
  lift: number;
}

export class CameraRig {
  private pos: ArcTrack;
  private target: ArcTrack;
  private fov: Pchip;
  private shift: Pchip;
  private lift: Pchip;

  readonly total: number;

  constructor(keys: CameraKey[]) {
    const us = keys.map((k) => k.u);
    this.total = us[us.length - 1];
    this.pos = new ArcTrack(keys.map((k) => new THREE.Vector3(...k.pos)), us);
    this.target = new ArcTrack(keys.map((k) => new THREE.Vector3(...k.target)), us);
    this.fov = new Pchip(us, keys.map((k) => k.fov));
    this.shift = new Pchip(us, keys.map((k) => k.shift));
    this.lift = new Pchip(us, keys.map((k) => k.lift ?? 0.18));
  }

  sample(u: number, outPos: THREE.Vector3, outTarget: THREE.Vector3): CameraSample {
    this.pos.at(u, outPos);
    this.target.at(u, outTarget);
    return { fov: this.fov.at(u), shift: this.shift.at(u), lift: this.lift.at(u) };
  }
}

/** Index of the scene whose hold is nearest to u */
export function sceneAt(holds: [number, number][], u: number) {
  let best = 0;
  let bestDist = Infinity;
  holds.forEach(([a, b], i) => {
    const dist = u < a ? a - u : u > b ? u - b : 0;
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  });
  return best;
}

/** Scroll target (in units) for jumping to a scene */
export function sceneAnchor(holds: [number, number][], index: number) {
  if (index === 0) return 0;
  if (index === holds.length - 1) return holds[index][1];
  const [a, b] = holds[index];
  return (a + b) / 2;
}
