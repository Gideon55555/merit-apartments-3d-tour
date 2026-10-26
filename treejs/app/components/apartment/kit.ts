import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Materials } from './materials';
import { seededRandom } from './textures';
import { cushionGeometry, drapeGeometry, pillowGeometry } from './soft';

// ============================================================
// GEOMETRY KIT
// Small helpers for building the apartment from bounds in metres.
// Coordinates follow the floor plan: X runs west → east, Z runs
// north → south (top of the plan is north), Y is up. The interior
// spans X 0 → 6.5 and Z 0 → 6.6.
// ============================================================

export const WALL_H = 2.7;

/** Resolves when the browser is idle (or after a short delay) */
const idle = () => new Promise<void>((resolve) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 2500 });
  else setTimeout(resolve, 800);
});

export interface MeshOpts {
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  cast?: boolean;
  receive?: boolean;
  /** Exclude from the ambient-occlusion pass (glass, curtains, sky). */
  noAO?: boolean;
  name?: string;
}

export interface Opening {
  a: number;
  b: number;
  /** Sill height (0 for doors and full-height glazing) */
  bottom?: number;
  /** Head height */
  top: number;
}

export type Axis = 'x' | 'z';
type P2 = [number, number];
type R4 = [number, number, number, number];

/**
 * 2D linework recorded while the model is built, so the paper plan is
 * drawn from exactly the same data as the 3D apartment. All in plan
 * metres (x, z).
 */
export type PlanOp =
  | { k: 'wall'; r: R4 }
  | { k: 'floor'; kind: 'boards' | 'tiles' | 'deck'; r: R4 }
  | { k: 'box'; r: R4; round: number; dashed: boolean; fill: boolean }
  | { k: 'circle'; c: P2; r: number; dashed: boolean; fill: boolean }
  | { k: 'ellipse'; c: P2; rx: number; rz: number }
  | { k: 'line'; a: P2; b: P2; heavy: boolean; dashed: boolean }
  | { k: 'arc'; c: P2; r: number; a0: number; a1: number }
  | { k: 'plant'; c: P2; r: number }
  | { k: 'glazing'; along: Axis; line: number; a: number; b: number; panels: number; open?: number }
  | { k: 'window'; along: Axis; line: number; thick: number; a: number; b: number };

/** Cardinal direction in plan space */
export type Dir = 'n' | 's' | 'e' | 'w';
const DIR_VEC: Record<Dir, P2> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

interface Xform { x: number; z: number; rot: number }

export class Kit {
  readonly noAO: THREE.Object3D[] = [];
  readonly lights: THREE.Light[] = [];
  /** Plan linework recorded while building (see PlanOp) */
  readonly plan: PlanOp[] = [];
  private xforms: Xform[] = [];
  /** Extra objects that own GPU resources (e.g. mirrors) */
  readonly disposables: { dispose(): void }[] = [];
  private geos = new Map<string, THREE.BufferGeometry>();
  private owned: THREE.BufferGeometry[] = [];
  private capMats: THREE.Material[];

  constructor(readonly m: Materials, readonly lowTier: boolean) {
    const p = m.plaster;
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    this.capMats = [p, p, m.wallCap, p, p, p];
  }

  // ----------------------------------------------------------
  // Placement: build an item in local space (front facing +Z) and drop
  // it into the plan at (x, z) rotated by a multiple of 90°. Plan
  // linework recorded inside is transformed the same way.
  // ----------------------------------------------------------
  place(parent: THREE.Object3D, x: number, z: number, rot: number, build: (g: THREE.Group) => void) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    parent.add(g);
    this.xforms.push({ x, z, rot });
    build(g);
    this.xforms.pop();
    return g;
  }

  /** Local → plan coordinates through the current placement stack */
  private tp(lx: number, lz: number): P2 {
    let x = lx;
    let z = lz;
    for (let i = this.xforms.length - 1; i >= 0; i--) {
      const { x: tx, z: tz, rot } = this.xforms[i];
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const nx = c * x + s * z;
      const nz = -s * x + c * z;
      x = nx + tx;
      z = nz + tz;
    }
    return [x, z];
  }

  private tr(x0: number, z0: number, x1: number, z1: number): R4 {
    const a = this.tp(x0, z0);
    const b = this.tp(x1, z1);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  }

  /** Total placement rotation (for ellipses and arcs) */
  private trot() {
    return this.xforms.reduce((s, x) => s + x.rot, 0);
  }

  planBox(x0: number, z0: number, x1: number, z1: number, o: { round?: number; dashed?: boolean; fill?: boolean } = {}) {
    this.plan.push({ k: 'box', r: this.tr(x0, z0, x1, z1), round: o.round ?? 0.02, dashed: o.dashed ?? false, fill: o.fill ?? true });
  }

  planCircle(x: number, z: number, r: number, o: { dashed?: boolean; fill?: boolean } = {}) {
    this.plan.push({ k: 'circle', c: this.tp(x, z), r, dashed: o.dashed ?? false, fill: o.fill ?? true });
  }

  planEllipse(x: number, z: number, rx: number, rz: number) {
    const quarter = Math.round(this.trot() / (Math.PI / 2)) % 2 !== 0;
    this.plan.push({ k: 'ellipse', c: this.tp(x, z), rx: quarter ? rz : rx, rz: quarter ? rx : rz });
  }

  planLine(x0: number, z0: number, x1: number, z1: number, o: { heavy?: boolean; dashed?: boolean } = {}) {
    this.plan.push({ k: 'line', a: this.tp(x0, z0), b: this.tp(x1, z1), heavy: o.heavy ?? false, dashed: o.dashed ?? false });
  }

  planPlant(x: number, z: number, r: number) {
    this.plan.push({ k: 'plant', c: this.tp(x, z), r });
  }

  planFloor(kind: 'boards' | 'tiles' | 'deck', r: R4) {
    this.plan.push({ k: 'floor', kind, r });
  }

  private cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
    let g = this.geos.get(key) as T | undefined;
    if (!g) {
      g = make();
      this.geos.set(key, g);
    }
    return g;
  }

  private own<T extends THREE.BufferGeometry>(g: T): T {
    this.owned.push(g);
    return g;
  }

  mesh(
    parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[],
    x: number, y: number, z: number, o: MeshOpts = {}
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (o.rotX || o.rotY || o.rotZ) mesh.rotation.set(o.rotX ?? 0, o.rotY ?? 0, o.rotZ ?? 0);
    mesh.castShadow = o.cast ?? true;
    mesh.receiveShadow = o.receive ?? true;
    if (o.name) mesh.name = o.name;
    if (o.noAO) this.noAO.push(mesh);
    parent.add(mesh);
    return mesh;
  }

  /** Box centred at (x, y, z) */
  box(parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number, o?: MeshOpts) {
    const g = this.cached(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  /** Axis-aligned box from bounds */
  block(parent: THREE.Object3D, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: THREE.Material | THREE.Material[], o?: MeshOpts) {
    return this.box(parent, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o);
  }

  /** Called when an async asset (glTF model) lands, so the scene redraws and re-shadows */
  onAsync: () => void = () => undefined;
  private models = new Map<string, Promise<THREE.Object3D>>();
  private loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  /**
   * Place a glTF model (loaded once, cloned per use) standing on (x, y, z),
   * scaled to the given height. It appears when loaded.
   */
  model(parent: THREE.Object3D, url: string, x: number, y: number, z: number, height: number, rotY = 0) {
    let pending = this.models.get(url);
    if (!pending) {
      // Fetch after the first frames so it never competes with the initial load
      pending = idle().then(() => this.loader.loadAsync(url)).then((gltf) => {
        gltf.scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.disposables.push(mesh.geometry);
            const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
            for (const mt of mats) {
              this.disposables.push(mt);
              for (const t of [mt.map, mt.normalMap, mt.roughnessMap, mt.metalnessMap, mt.aoMap]) if (t) this.disposables.push(t);
            }
          }
        });
        return gltf.scene;
      });
      this.models.set(url, pending);
    }
    pending.then((src) => {
      const obj = src.clone(true);
      const box = new THREE.Box3().setFromObject(src);
      const s = height / Math.max(0.001, box.max.y - box.min.y);
      obj.scale.setScalar(s);
      obj.rotation.y = rotY;
      const cx = (box.min.x + box.max.x) / 2;
      const cz = (box.min.z + box.max.z) / 2;
      obj.position.set(x - cx * s, y - box.min.y * s, z - cz * s);
      parent.add(obj);
      obj.updateMatrixWorld(true);
      this.onAsync();
    }).catch(() => undefined);
  }

  /** Plush cushion centred at (x, y, z): domed top, bowed sides */
  cushion(parent: THREE.Object3D, w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts & { puff?: number }) {
    const puff = o?.puff ?? Math.min(0.04, h * 0.18);
    const g = this.cached(`cu${w}|${h}|${d}|${r}|${puff}`, () => cushionGeometry(w, h, d, r, puff));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  cushionBlock(parent: THREE.Object3D, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number, mat: THREE.Material, o?: MeshOpts & { puff?: number }) {
    return this.cushion(parent, x1 - x0, y1 - y0, z1 - z0, r, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o);
  }

  /** Throw pillow standing in its local XY plane (rotate to lean it) */
  pillow(parent: THREE.Object3D, w: number, h: number, t: number, mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts) {
    const g = this.cached(`pi${w}|${h}|${t}`, () => pillowGeometry(w, h, t));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  /** Cloth draped over a top surface; see drapeGeometry for the origin */
  drape(parent: THREE.Object3D, w: number, l: number, drop: number, seed: number, mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts & { wrinkle?: number }) {
    const g = this.own(drapeGeometry(w, l, drop, seed, o?.wrinkle));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  /** Rounded box centred at (x, y, z) — cushions, mattresses, appliances */
  rbox(parent: THREE.Object3D, w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts) {
    const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    const g = this.cached(`r${w}|${h}|${d}|${radius}`, () => new RoundedBoxGeometry(w, h, d, 4, radius));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  rblock(parent: THREE.Object3D, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number, mat: THREE.Material, o?: MeshOpts) {
    return this.rbox(parent, x1 - x0, y1 - y0, z1 - z0, r, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o);
  }

  cyl(parent: THREE.Object3D, rTop: number, rBottom: number, h: number, mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts & { segments?: number; open?: boolean }) {
    const seg = o?.segments ?? 32;
    const g = this.cached(`c${rTop}|${rBottom}|${h}|${seg}|${o?.open ?? false}`,
      () => new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, o?.open ?? false));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  sphere(parent: THREE.Object3D, r: number, mat: THREE.Material, x: number, y: number, z: number, scale?: [number, number, number], o?: MeshOpts) {
    const g = this.cached(`s${r}`, () => new THREE.SphereGeometry(r, 32, 20));
    const mesh = this.mesh(parent, g, mat, x, y, z, o);
    if (scale) mesh.scale.set(...scale);
    return mesh;
  }

  lathe(parent: THREE.Object3D, key: string, points: [number, number][], mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts) {
    const g = this.cached(`l${key}`, () => new THREE.LatheGeometry(points.map(([r, h]) => new THREE.Vector2(r, h)), 40));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  /** Upper hemisphere (opens downward) — pendant shades, flush lights */
  dome(parent: THREE.Object3D, r: number, mat: THREE.Material, x: number, y: number, z: number, o?: MeshOpts) {
    const g = this.cached(`d${r}`, () => new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  tube(parent: THREE.Object3D, curve: THREE.Curve<THREE.Vector3>, radius: number, mat: THREE.Material, o?: MeshOpts) {
    const g = this.own(new THREE.TubeGeometry(curve, 48, radius, 10, false));
    return this.mesh(parent, g, mat, 0, 0, 0, o);
  }

  torus(parent: THREE.Object3D, r: number, tube: number, mat: THREE.Material, x: number, y: number, z: number, arc = Math.PI * 2, o?: MeshOpts) {
    const g = this.cached(`t${r}|${tube}|${arc}`, () => new THREE.TorusGeometry(r, tube, 12, 48, arc));
    return this.mesh(parent, g, mat, x, y, z, o);
  }

  /**
   * Horizontal plane facing up (or down) with UVs in world metres, so
   * textures line up across neighbouring rooms.
   */
  floor(parent: THREE.Object3D, x0: number, x1: number, z0: number, z1: number, y: number, mat: THREE.Material, tile: number, o: MeshOpts & { down?: boolean } = {}) {
    const g = this.own(new THREE.PlaneGeometry(x1 - x0, z1 - z0));
    const mesh = this.mesh(parent, g, mat, (x0 + x1) / 2, y, (z0 + z1) / 2, {
      ...o, rotX: o.down ? Math.PI / 2 : -Math.PI / 2, cast: o.cast ?? false,
    });
    this.worldUV(mesh, (p) => [p.x / tile, -p.z / tile]);
    return mesh;
  }

  /**
   * Vertical plane. along='x' spans X at Z=at; along='z' spans Z at X=at.
   * facing is the sign of the normal on the fixed axis.
   */
  panel(parent: THREE.Object3D, along: Axis, a0: number, a1: number, y0: number, y1: number, at: number, facing: 1 | -1, mat: THREE.Material, tile = 1, o: MeshOpts = {}) {
    const g = this.own(new THREE.PlaneGeometry(a1 - a0, y1 - y0));
    const mid = (a0 + a1) / 2;
    const cy = (y0 + y1) / 2;
    const rotY = along === 'x' ? (facing === 1 ? 0 : Math.PI) : (facing === 1 ? Math.PI / 2 : -Math.PI / 2);
    const mesh = along === 'x'
      ? this.mesh(parent, g, mat, mid, cy, at, { ...o, rotY, cast: o.cast ?? false })
      : this.mesh(parent, g, mat, at, cy, mid, { ...o, rotY, cast: o.cast ?? false });
    this.worldUV(mesh, (p) => [(along === 'x' ? p.x : p.z) / tile, p.y / tile]);
    return mesh;
  }

  private worldUV(mesh: THREE.Mesh, project: (p: THREE.Vector3) => [number, number]) {
    mesh.updateMatrix();
    const pos = mesh.geometry.attributes.position;
    const uv = mesh.geometry.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrix);
      const [u, w] = project(v);
      uv.setXY(i, u, w);
    }
    uv.needsUpdate = true;
  }

  /**
   * A straight wall with door/window openings. along='x' runs along X
   * at Z=line; along='z' runs along Z at X=line. Wall tops get the
   * brand-green cap so the dollhouse view reads like the floor plan.
   */
  wall(parent: THREE.Object3D, along: Axis, line: number, thick: number, from: number, to: number, openings: Opening[] = []) {
    const piece = (a: number, b: number, y0: number, y1: number) => {
      if (b - a < 0.001 || y1 - y0 < 0.001) return;
      const mats = y1 >= WALL_H - 0.001 ? this.capMats : this.m.plaster;
      if (along === 'x') this.block(parent, a, b, y0, y1, line - thick / 2, line + thick / 2, mats);
      else this.block(parent, line - thick / 2, line + thick / 2, y0, y1, a, b, mats);
      // Skirting boards on both faces of full-height runs
      if (y0 === 0 && y1 >= WALL_H - 0.001) {
        const t = thick / 2;
        const sk = { cast: false };
        if (along === 'x') {
          this.block(parent, a, b, 0, 0.08, line - t - 0.012, line - t, this.m.doorDark, sk);
          this.block(parent, a, b, 0, 0.08, line + t, line + t + 0.012, this.m.doorDark, sk);
        } else {
          this.block(parent, line - t - 0.012, line - t, 0, 0.08, a, b, this.m.doorDark, sk);
          this.block(parent, line + t, line + t + 0.012, 0, 0.08, a, b, this.m.doorDark, sk);
        }
      }
    };
    // Plan: full-height runs are solid poché, sill openings are windows
    const record = (a: number, b: number) => {
      if (b - a < 0.001) return;
      this.plan.push({ k: 'wall', r: along === 'x' ? [a, line - thick / 2, b, line + thick / 2] : [line - thick / 2, a, line + thick / 2, b] });
    };
    let cursor = from;
    for (const op of [...openings].sort((p, q) => p.a - q.a)) {
      piece(cursor, op.a, 0, WALL_H);
      record(cursor, op.a);
      piece(op.a, op.b, 0, op.bottom ?? 0);
      piece(op.a, op.b, op.top, WALL_H);
      if ((op.bottom ?? 0) > 0) {
        this.plan.push({ k: 'window', along, line, thick, a: op.a, b: op.b });
        this.windowFrame(parent, along, line, thick, op.a, op.b, op.bottom ?? 0, op.top);
      }
      cursor = op.b;
    }
    piece(cursor, to, 0, WALL_H);
    record(cursor, to);
  }

  /** Glazed window in a sill opening: slim frame, glass, stone sill */
  private windowFrame(parent: THREE.Object3D, along: Axis, line: number, thick: number, a: number, b: number, sill: number, head: number) {
    const f = this.m.frameMetal;
    const box = (u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material, o?: MeshOpts) => {
      if (along === 'x') this.block(parent, u0, u1, y0, y1, line + v0, line + v1, mat, o);
      else this.block(parent, line + v0, line + v1, y0, y1, u0, u1, mat, o);
    };
    box(a, b, sill, sill + 0.04, -0.035, 0.035, f);
    box(a, b, head - 0.04, head, -0.035, 0.035, f);
    box(a, a + 0.04, sill, head, -0.035, 0.035, f);
    box(b - 0.04, b, sill, head, -0.035, 0.035, f);
    box(a + 0.04, b - 0.04, sill + 0.04, head - 0.04, -0.004, 0.004, this.m.glass, { cast: false, receive: false, noAO: true });
    box(a, b, sill - 0.03, sill, -thick / 2 - 0.03, thick / 2 + 0.03, this.m.quartz);
  }

  /**
   * Interior door: leaf shown open at 90°. `closed` is the direction the
   * leaf points from the hinge when shut (along the wall), `open` the
   * direction it points when open (into the room).
   */
  door(parent: THREE.Object3D, hinge: P2, width: number, closed: Dir, open: Dir, mat: THREE.Material = this.m.doorDark) {
    const [hx, hz] = hinge;
    const [ox, oz] = DIR_VEC[open];
    const [cx, cz] = DIR_VEC[closed];
    const ex = hx + ox * width;
    const ez = hz + oz * width;
    // Leaf: thin box from the hinge along the open direction, set off by
    // half its thickness towards the closed side so it sits on the jamb
    const t = 0.04;
    const sx = cx * t * 0.5;
    const sz = cz * t * 0.5;
    if (ox !== 0) this.block(parent, Math.min(hx, ex), Math.max(hx, ex), 0.01, 2.07, hz + sz - t / 2, hz + sz + t / 2, mat);
    else this.block(parent, hx + sx - t / 2, hx + sx + t / 2, 0.01, 2.07, Math.min(hz, ez), Math.max(hz, ez), mat);
    // Lever handles near the free edge, both faces
    const hxh = hx + ox * (width - 0.08);
    const hzh = hz + oz * (width - 0.08);
    for (const side of [-1, 1]) {
      const px = hxh + (ox === 0 ? side * 0.035 : 0);
      const pz = hzh + (oz === 0 ? side * 0.035 : 0);
      if (ox !== 0) this.block(parent, px - 0.06, px + 0.06, 0.99, 1.01, pz + sz - 0.008, pz + sz + 0.008, this.m.blackMetal, { cast: false });
      else this.block(parent, px + sx - 0.008, px + sx + 0.008, 0.99, 1.01, pz - 0.06, pz + 0.06, this.m.blackMetal, { cast: false });
    }
    // Plan: leaf + swing arc between the open and closed positions
    this.plan.push({ k: 'line', a: [hx, hz], b: [ex, ez], heavy: true, dashed: false });
    const a0 = Math.atan2(oz, ox);
    let a1 = Math.atan2(cz, cx);
    if (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    if (a0 - a1 > Math.PI) a1 += Math.PI * 2;
    this.plan.push({ k: 'arc', c: [hx, hz], r: width, a0: Math.min(a0, a1), a1: Math.max(a0, a1) });
  }

  /**
   * Shaker cabinet front on a carcass face: a thin door slab with a raised
   * frame around a recessed centre panel. along='x' runs along X with the
   * face at Z=at; along='z' runs along Z with the face at X=at. facing is
   * the sign of the normal pointing into the room.
   */
  shaker(parent: THREE.Object3D, along: Axis, at: number, facing: 1 | -1, a0: number, a1: number, y0: number, y1: number, mat: THREE.Material) {
    const g = 0.003; // gap between fronts
    const rail = Math.min(0.065, (a1 - a0) / 5, (y1 - y0) / 5);
    const put = (u0: number, u1: number, v0: number, v1: number, d0: number, d1: number) => {
      const p0 = at + facing * d0;
      const p1 = at + facing * d1;
      if (along === 'x') this.block(parent, u0, u1, v0, v1, Math.min(p0, p1), Math.max(p0, p1), mat);
      else this.block(parent, Math.min(p0, p1), Math.max(p0, p1), v0, v1, u0, u1, mat);
    };
    put(a0 + g, a1 - g, y0 + g, y1 - g, 0, 0.012); // recessed panel
    put(a0 + g, a1 - g, y1 - g - rail, y1 - g, 0.012, 0.02); // top rail
    put(a0 + g, a1 - g, y0 + g, y0 + g + rail, 0.012, 0.02); // bottom rail
    put(a0 + g, a0 + g + rail, y0 + g + rail, y1 - g - rail, 0.012, 0.02); // stiles
    put(a1 - g - rail, a1 - g, y0 + g + rail, y1 - g - rail, 0.012, 0.02);
  }

  /** Painted timber lining + architrave around a door opening */
  doorTrim(parent: THREE.Object3D, along: Axis, line: number, thick: number, a: number, b: number, head: number) {
    const t = thick / 2 + 0.012;
    const m = this.m.doorDark;
    if (along === 'x') {
      this.block(parent, a - 0.06, a + 0.02, 0, head, line - t, line + t, m);
      this.block(parent, b - 0.02, b + 0.06, 0, head, line - t, line + t, m);
      this.block(parent, a - 0.06, b + 0.06, head - 0.02, head + 0.06, line - t, line + t, m);
    } else {
      this.block(parent, line - t, line + t, 0, head, a - 0.06, a + 0.02, m);
      this.block(parent, line - t, line + t, 0, head, b - 0.02, b + 0.06, m);
      this.block(parent, line - t, line + t, head - 0.02, head + 0.06, a - 0.06, b + 0.06, m);
    }
  }

  /**
   * Floor-to-head aluminium glazing along Z at X=line, split into equal
   * panels. The panel at `openPanel` is slid behind its neighbour.
   */
  glazingZ(parent: THREE.Object3D, line: number, from: number, to: number, head: number, panels: number, openPanel?: number) {
    this.glazing(parent, 'z', line, from, to, head, panels, openPanel);
  }

  /**
   * Floor-to-head sliding glazing in a wall opening. along='z' runs along
   * Z at X=line; along='x' runs along X at Z=line. `inside` is the sign of
   * the interior side on the fixed axis (where the slid panel stacks).
   */
  glazing(parent: THREE.Object3D, along: Axis, line: number, from: number, to: number, head: number, panels: number, openPanel?: number, inside: 1 | -1 = 1) {
    const f = this.m.frameMetal;
    const fd = 0.07; // frame depth
    const pw = (to - from) / panels;
    // u runs along the opening, v across it
    const box = (u0: number, u1: number, y0: number, y1: number, v0: number, v1: number, mat: THREE.Material, o?: MeshOpts) => {
      if (along === 'z') this.block(parent, line + v0, line + v1, y0, y1, u0, u1, mat, o);
      else this.block(parent, u0, u1, y0, y1, line + v0, line + v1, mat, o);
    };
    const pane = (u0: number, u1: number, v: number) =>
      box(u0, u1, 0.04, head - 0.05, v - 0.004, v + 0.004, this.m.glass, { cast: false, receive: false, noAO: true });
    box(from, to, 0, 0.04, -fd / 2, fd / 2, f);
    box(from, to, head - 0.05, head, -fd / 2, fd / 2, f);
    box(from, from + 0.05, 0, head, -fd / 2, fd / 2, f);
    box(to - 0.05, to, 0, head, -fd / 2, fd / 2, f);
    for (let i = 0; i < panels; i++) {
      const a = from + i * pw;
      const b = a + pw;
      if (i > 0) box(a - 0.025, a + 0.025, 0, head, -fd / 2, fd / 2, f);
      if (i === openPanel) continue;
      pane(a + 0.03, b - 0.03, 0);
    }
    if (openPanel !== undefined) {
      // Slid panel stacked just inside its neighbour
      const n = openPanel > 0 ? openPanel - 1 : openPanel + 1;
      const a = from + n * pw;
      const off = inside * 0.045;
      pane(a + 0.03, a + pw - 0.03, off);
      box(a + pw - 0.06, a + pw - 0.02, 0.04, head - 0.05, off - 0.02, off + 0.02, f);
    }
    this.plan.push({ k: 'glazing', along, line, a: from, b: to, panels, open: openPanel });
  }

  /** Sheer curtain with soft folds, hanging along Z at X=x */
  curtain(parent: THREE.Object3D, x: number, z0: number, z1: number, top: number) {
    const w = z1 - z0;
    const folds = Math.max(3, Math.round(w / 0.07));
    const g = this.own(new THREE.PlaneGeometry(w, top - 0.02, folds * 8, 1));
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / w + 0.5;
      pos.setZ(i, Math.sin(u * folds * Math.PI * 2) * 0.035);
    }
    g.computeVertexNormals();
    this.mesh(parent, g, this.m.curtain, x, top / 2 + 0.01, (z0 + z1) / 2, { rotY: Math.PI / 2, cast: false, noAO: true });
    this.block(parent, x - 0.015, x + 0.015, top, top + 0.025, z0 - 0.05, z1 + 0.05, this.m.blackMetal, { cast: false });
  }

  /** Framed artwork on a wall. along='x' hangs on a Z wall face. */
  art(parent: THREE.Object3D, along: Axis, at: number, facing: 1 | -1, center: number, y: number, w: number, h: number, mat: THREE.Material, frame: THREE.Material) {
    const d = 0.03;
    const off = at + (facing * d) / 2;
    if (along === 'x') this.block(parent, center - w / 2, center + w / 2, y - h / 2, y + h / 2, off - d / 2, off + d / 2, frame);
    else this.block(parent, off - d / 2, off + d / 2, y - h / 2, y + h / 2, center - w / 2, center + w / 2, frame);
    const canvas = this.panel(parent, along, center - w / 2 + 0.04, center + w / 2 - 0.04, y - h / 2 + 0.04, y + h / 2 - 0.04,
      at + facing * (d + 0.001), facing, mat, 1, { cast: false });
    // Artwork maps 0..1 across the canvas rather than in world metres
    const uv = canvas.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, i % 2, i < 2 ? 1 : 0);
    uv.needsUpdate = true;
  }

  /**
   * Soft contact shadow on the floor under furniture — cheap, static
   * ambient occlusion that works on every GPU tier.
   */
  contactShadow(parent: THREE.Object3D, x0: number, x1: number, z0: number, z1: number, strength = 0.45, round = false, y = 0.015) {
    const tex = round ? this.shadowTex('round') : this.shadowTex('rect');
    const key = `${round}|${strength}`;
    let mat = this.shadowMats.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: strength, depthWrite: false, toneMapped: false });
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -2;
      this.shadowMats.set(key, mat);
    }
    const g = this.cached('shadowPlane', () => new THREE.PlaneGeometry(1, 1));
    const pad = round ? 0.5 : 0.35;
    const w = (x1 - x0) * (1 + pad) + 0.12;
    const d = (z1 - z0) * (1 + pad) + 0.12;
    const mesh = this.mesh(parent, g, mat, (x0 + x1) / 2, y, (z0 + z1) / 2, { rotX: -Math.PI / 2, cast: false, receive: false, noAO: true });
    mesh.scale.set(w, d, 1);
    mesh.renderOrder = 1;
    return mesh;
  }

  private shadowTexs = new Map<string, THREE.Texture>();
  private shadowMats = new Map<string, THREE.Material>();

  private shadowTex(kind: 'rect' | 'round') {
    let t = this.shadowTexs.get(kind);
    if (!t) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d')!;
      if (kind === 'round') {
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
        g.addColorStop(0, 'rgba(0,0,0,0.9)');
        g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      } else {
        ctx.filter = 'blur(9px)';
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(22, 22, 84, 84);
      }
      t = new THREE.CanvasTexture(c);
      this.shadowTexs.set(kind, t);
    }
    return t;
  }

  /**
   * Dropped perimeter ceiling with a hidden LED strip, as in the design
   * renders. Built from downward / inward-facing planes only, so it
   * disappears in the dollhouse view from above.
   */
  cove(parent: THREE.Object3D, x0: number, z0: number, x1: number, z1: number, depth = 0.32, drop = 0.18) {
    const y = WALL_H - drop;
    const m = this.m;
    const band = (bx0: number, bz0: number, bx1: number, bz1: number) =>
      this.floor(parent, bx0, bx1, bz0, bz1, y, m.ceiling, 4, { down: true, cast: false });
    band(x0, z0, x1, z0 + depth);
    band(x0, z1 - depth, x1, z1);
    band(x0, z0 + depth, x0 + depth, z1 - depth);
    band(x1 - depth, z0 + depth, x1, z1 - depth);
    // Inner faces + glowing strip just below the ceiling
    const ix0 = x0 + depth;
    const iz0 = z0 + depth;
    const ix1 = x1 - depth;
    const iz1 = z1 - depth;
    const face = (along: Axis, a0: number, a1: number, at: number, facing: 1 | -1) => {
      this.panel(parent, along, a0, a1, y, WALL_H, at, facing, m.ceiling, 4, { cast: false });
      this.panel(parent, along, a0, a1, WALL_H - 0.035, WALL_H - 0.01, at + facing * 0.002, facing, m.ledStrip, 4, { cast: false, receive: false });
    };
    face('x', ix0, ix1, iz0, 1);
    face('x', ix0, ix1, iz1, -1);
    face('z', iz0, iz1, ix0, 1);
    face('z', iz0, iz1, ix1, -1);
  }

  pointLight(parent: THREE.Object3D, x: number, y: number, z: number, color: THREE.ColorRepresentation, intensity: number, optional = false) {
    if (optional && this.lowTier) return;
    const light = new THREE.PointLight(color, intensity, 0, 2);
    light.position.set(x, y, z);
    parent.add(light);
    this.lights.push(light);
  }

  downlight(parent: THREE.Object3D, x: number, z: number) {
    const g = this.cached('downlight', () => new THREE.CircleGeometry(0.045, 24));
    this.mesh(parent, g, this.m.downlight, x, WALL_H - 0.002, z, { rotX: Math.PI / 2, cast: false, receive: false });
    this.torus(parent, 0.05, 0.006, this.m.trim, x, WALL_H - 0.004, z, Math.PI * 2, { rotX: Math.PI / 2, cast: false });
  }

  tableLamp(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.sphere(parent, 0.08, this.m.ceramic, x, y + 0.08, z, [1, 1.1, 1]);
    this.cyl(parent, 0.008, 0.008, 0.14, this.m.brass, x, y + 0.22, z, { segments: 8 });
    this.cyl(parent, 0.1, 0.13, 0.17, this.m.lampShade, x, y + 0.35, z, { open: true, cast: false });
    this.pointLight(parent, x, y + 0.33, z, '#ffc98a', 0.6, true);
  }

  /**
   * Potted plant. 'fiddle' = upright stems with broad leaves,
   * 'bush' = rounded leafy mass, 'snake' = tall upright blades.
   */
  plant(parent: THREE.Object3D, x: number, y: number, z: number, kind: 'fiddle' | 'bush' | 'snake', height: number, seed: number, pot: THREE.Material = this.m.potTerracotta) {
    const rand = seededRandom(seed);
    const potR = kind === 'fiddle' ? 0.17 : kind === 'snake' ? 0.13 : Math.max(0.08, height * 0.22);
    const potH = potR * 1.5;
    this.lathe(parent, `pot${potR}`, [
      [0, 0], [potR * 0.75, 0], [potR * 0.92, potH * 0.6], [potR, potH * 0.96], [potR * 1.04, potH], [potR * 0.95, potH],
      [potR * 0.9, potH * 0.85], [0, potH * 0.85],
    ], pot, x, y, z);
    this.cyl(parent, potR * 0.9, potR * 0.9, 0.01, this.m.soil, x, y + potH * 0.86, z, { cast: false });

    const base = y + potH * 0.85;
    const leafCount = kind === 'fiddle' ? 46 : kind === 'bush' ? 90 : 16;
    const [lw, ll] = kind === 'fiddle' ? [0.17, 0.24] : kind === 'bush' ? [0.07, 0.12] : [0.07, height * 0.75];
    const leafGeo = this.cached(`leaf${lw}|${ll}`, () => leafGeometry(lw, ll));
    const leaves = new THREE.InstancedMesh(leafGeo, rand() > 0.5 ? this.m.leaf : this.m.leafLight, leafCount);
    leaves.castShadow = true;
    leaves.receiveShadow = true;

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const qRoll = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    if (kind === 'fiddle') {
      const stems = 3;
      for (let i = 0; i < stems; i++) {
        const lean = (rand() - 0.5) * 0.25;
        const ang = (i / stems) * Math.PI * 2;
        const sh = height * (0.75 + rand() * 0.25);
        const stem = this.cyl(parent, 0.008, 0.012, sh, this.m.stem, x + Math.cos(ang) * 0.03, base + sh / 2, z + Math.sin(ang) * 0.03, { segments: 6 });
        stem.rotation.set(Math.sin(ang) * lean, 0, -Math.cos(ang) * lean);
      }
    }

    for (let i = 0; i < leafCount; i++) {
      const az = rand() * Math.PI * 2;
      let tilt: number;
      if (kind === 'fiddle') {
        const t = 0.25 + (i / leafCount) * 0.75;
        p.set(x + Math.cos(az) * 0.05, base + height * t, z + Math.sin(az) * 0.05);
        tilt = 0.5 + rand() * 0.6 - t * 0.2;
        s.setScalar(0.75 + rand() * 0.4 + (1 - t) * 0.2);
      } else if (kind === 'bush') {
        const r = height * 0.45 * Math.sqrt(rand());
        const h = rand();
        p.set(x + Math.cos(az) * r, base + 0.02 + h * height * 0.7, z + Math.sin(az) * r);
        tilt = 0.4 + (r / (height * 0.45)) * 0.9 + rand() * 0.3;
        s.setScalar(0.8 + rand() * 0.5);
      } else {
        p.set(x + Math.cos(az) * potR * 0.5 * rand(), base, z + Math.sin(az) * potR * 0.5 * rand());
        tilt = 0.05 + rand() * 0.22;
        s.set(1, 0.7 + rand() * 0.45, 1);
      }
      e.set(tilt, az, 0, 'YXZ');
      q.setFromEuler(e);
      qRoll.setFromAxisAngle(up, rand() * Math.PI);
      q.multiply(qRoll);
      m4.compose(p, q, s);
      leaves.setMatrixAt(i, m4);
    }
    leaves.computeBoundingBox();
    leaves.computeBoundingSphere();
    parent.add(leaves);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.shadowTexs.forEach((t) => t.dispose());
    this.shadowMats.forEach((m) => m.dispose());
    this.geos.forEach((g) => g.dispose());
    this.owned.forEach((g) => g.dispose());
    this.geos.clear();
    this.owned.length = 0;
  }
}

/** Teardrop leaf with a folded midrib, pointing +Y from its base */
function leafGeometry(w: number, l: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(w * 0.62, l * 0.35, 0, l);
  shape.quadraticCurveTo(-w * 0.62, l * 0.35, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 6);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    pos.setZ(i, Math.abs(px) * 0.35 - (py / l) * (py / l) * l * 0.18);
  }
  g.computeVertexNormals();
  return g;
}
