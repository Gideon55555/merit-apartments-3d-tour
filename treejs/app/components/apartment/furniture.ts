import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { Kit, WALL_H } from './kit';
import { BATH_TILE, SPLASH_TILE } from './textures';

// ============================================================
// FURNITURE LIBRARY
// Each piece is built in local space with its back at z = 0 (against a
// wall where relevant) and its front facing +Z, then placed with
// kit.place(x, z, rot). Every piece also records its paper-plan symbol
// and a soft contact shadow, so model and drawing always agree.
//
// Rotation: 0 = front faces south (+Z), Math.PI = north,
// Math.PI / 2 = east, -Math.PI / 2 = west.
// ============================================================

type Parent = THREE.Object3D;
export const FACE = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 } as const;

// ------------------------------------------------------------
// Living
// ------------------------------------------------------------

/** L-shaped sofa. Origin: centre of the back edge. */
export function sofa(kit: Kit, p: Parent, x: number, z: number, rot: number, o: { length?: number; chaise?: 'left' | 'right' | null; chaiseLength?: number } = {}) {
  const L = o.length ?? 2.75;
  const d = 0.88;
  const cl = o.chaiseLength ?? 1.75;
  const S = kit.m.sofa;
  kit.place(p, x, z, rot, (g) => {
    const x0 = -L / 2;
    const x1 = L / 2;
    kit.block(g, x0, x1, 0.06, 0.24, 0.03, d - 0.03, S);
    kit.rblock(g, x0, x1, 0.06, 0.76, 0, 0.16, 0.05, S);
    const left = o.chaise === 'left';
    const right = o.chaise === 'right';
    kit.rblock(g, x0, x0 + 0.17, 0.06, 0.6, 0, left ? cl : d, 0.06, S);
    kit.rblock(g, x1 - 0.17, x1, 0.06, 0.6, 0, right ? cl : d, 0.06, S);
    // Seat + back cushions
    const ix0 = x0 + 0.17;
    const ix1 = x1 - 0.17;
    const n = Math.max(2, Math.round((ix1 - ix0) / 0.85));
    const cw = (ix1 - ix0) / n;
    for (let i = 0; i < n; i++) {
      const a = ix0 + i * cw + 0.005;
      const b = a + cw - 0.01;
      kit.rblock(g, a, b, 0.24, 0.46, 0.16, d - 0.02, 0.07, S);
      kit.rbox(g, b - a, 0.44, 0.2, 0.08, S, (a + b) / 2, 0.67, 0.27, { rotX: -0.15 });
      if (i > 0) kit.planLine(a, 0.16, a, d - 0.02);
    }
    // Chaise extension
    if (o.chaise) {
      const cx0 = left ? x0 + 0.17 : x1 - 0.87;
      const cx1 = left ? x0 + 0.87 : x1 - 0.17;
      kit.block(g, cx0, cx1, 0.06, 0.24, d - 0.03, cl, S);
      kit.rblock(g, cx0 + 0.005, cx1 - 0.005, 0.24, 0.46, d - 0.02, cl - 0.02, 0.07, S);
      kit.rblock(g, cx0 + 0.06, cx1 - 0.06, 0.46, 0.49, cl - 0.5, cl - 0.12, 0.012, kit.m.throwRust);
      kit.planBox(left ? x0 : x1 - 0.87, d, left ? x0 + 0.87 : x1, cl, { round: 0.05 });
      kit.contactShadow(g, cx0, cx1, d, cl, 0.5);
    }
    const pills = [kit.m.pillowSage, kit.m.pillowCream, kit.m.pillowRust];
    for (let i = 0; i < Math.min(3, n + 1); i++) {
      const px = x0 + 0.5 + (i * (L - 1.0)) / 2;
      kit.rbox(g, 0.44, 0.44, 0.13, 0.06, pills[i], px, 0.66, 0.48, { rotX: -0.3, rotY: (i - 1) * 0.15 });
    }
    kit.planBox(x0, 0, x1, d, { round: 0.05 });
    kit.planBox(x0, 0, x1, 0.16, { round: 0.03 });
    kit.contactShadow(g, x0, x1, 0, d, 0.55);
  });
}

/** Oval coffee table. Origin: centre. */
export function coffeeTable(kit: Kit, p: Parent, x: number, z: number, rot = 0, rx = 0.62, rz = 0.35) {
  kit.place(p, x, z, rot, (g) => {
    const top = kit.cyl(g, rx, rx, 0.035, kit.m.oak, 0, 0.4, 0, { segments: 64 });
    top.scale.z = rz / rx;
    const base = kit.cyl(g, rx * 0.65, rx * 0.65, 0.38, kit.m.walnut, 0, 0.19, 0, { segments: 48 });
    base.scale.z = (rz * 0.6) / (rx * 0.65);
    kit.block(g, -0.3, -0.05, 0.4175, 0.445, -0.1, 0.1, kit.m.bookD);
    kit.block(g, -0.28, -0.07, 0.445, 0.47, -0.08, 0.08, kit.m.bookB);
    kit.lathe(g, 'vase', [[0, 0], [0.05, 0], [0.07, 0.06], [0.05, 0.16], [0.03, 0.2], [0.035, 0.22], [0, 0.22]], kit.m.ceramic, rx * 0.5, 0.4175, 0.02);
    kit.planEllipse(0, 0, rx, rz);
    kit.contactShadow(g, -rx * 0.85, rx * 0.85, -rz * 0.85, rz * 0.85, 0.5, true);
  });
}

/** Flat-woven rug from plan bounds */
export function rug(kit: Kit, p: Parent, x0: number, z0: number, x1: number, z1: number, mat: THREE.Material) {
  kit.rblock(p, x0, x1, 0, 0.012, z0, z1, 0.005, mat, { cast: false });
  kit.planBox(x0, z0, x1, z1, { round: 0.01, dashed: true, fill: false });
}

/** Floating media unit with a wall-mounted TV. Origin: wall face, centre. */
export function tvUnit(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 2.4) {
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0.22, 0.6, 0, 0.39, kit.m.walnut);
    const n = Math.max(2, Math.round(w / 0.62));
    const fw = w / n;
    for (let i = 0; i < n; i++) {
      const a = -w / 2 + i * fw;
      kit.block(g, a + 0.004, a + fw - 0.004, 0.224, 0.596, 0.39, 0.402, kit.m.walnut);
    }
    const tw = Math.min(1.45, w * 0.6);
    kit.rblock(g, -tw / 2, tw / 2, 0.93, 0.93 + tw * 0.565, 0.005, 0.035, 0.01, kit.m.screen);
    kit.block(g, -w / 2 + 0.2, -w / 2 + 0.5, 0.6, 0.64, 0.09, 0.29, kit.m.bookC);
    kit.plant(g, w / 2 - 0.25, 0.6, 0.21, 'bush', 0.26, 4, kit.m.potStone);
    kit.planBox(-w / 2, 0, w / 2, 0.39, { round: 0.01 });
    kit.planLine(-tw / 2, 0.03, tw / 2, 0.03, { heavy: true });
    kit.contactShadow(g, -w / 2, w / 2, 0, 0.39, 0.22);
  });
}

/** Dining table with chairs on both long sides. Origin: centre; long axis = local X. */
export function diningSet(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 1.4, d = 0.8, perSide = 2) {
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0.72, 0.755, -d / 2, d / 2, kit.m.oak);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      kit.block(g, lx * (w / 2 - 0.08) - 0.025, lx * (w / 2 - 0.08) + 0.025, 0, 0.72, lz * (d / 2 - 0.08) - 0.025, lz * (d / 2 - 0.08) + 0.025, kit.m.walnut);
    }
    kit.planBox(-w / 2, -d / 2, w / 2, d / 2, { round: 0.01 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < perSide; i++) {
        const cx = -w / 2 + (w / perSide) * (i + 0.5);
        const cz = side * (d / 2 + 0.12);
        chair(kit, g, cx, cz, side > 0 ? Math.PI : 0);
      }
    }
    kit.contactShadow(g, -w / 2, w / 2, -d / 2 - 0.3, d / 2 + 0.3, 0.45);
  });
}

/** Dining chair; origin: seat centre, facing +Z */
function chair(kit: Kit, p: Parent, x: number, z: number, rot: number) {
  kit.place(p, x, z, rot, (g) => {
    kit.rblock(g, -0.21, 0.21, 0.44, 0.47, -0.2, 0.2, 0.01, kit.m.oak);
    kit.rbox(g, 0.42, 0.32, 0.025, 0.01, kit.m.oak, 0, 0.75, -0.21, { rotX: -0.12 });
    for (const [dx, dz] of [[0.18, 0.17], [-0.18, 0.17], [0.18, -0.19], [-0.18, -0.19]]) {
      kit.cyl(g, 0.011, 0.011, dz < 0 ? 0.9 : 0.45, kit.m.blackMetal, dx, dz < 0 ? 0.45 : 0.225, dz, { segments: 8 });
    }
    kit.planBox(-0.21, -0.22, 0.21, 0.2, { round: 0.03 });
  });
}

// ------------------------------------------------------------
// Bedroom
// ------------------------------------------------------------

/** Bed with upholstered headboard and nightstands. Origin: headboard wall, centre; foot points +Z. */
export function bed(kit: Kit, p: Parent, x: number, z: number, rot: number, o: { width?: number; nightstands?: boolean; throwMat?: THREE.Material } = {}) {
  const w = o.width ?? 1.6;
  const l = 2.1;
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.rblock(g, -w / 2 - 0.08, w / 2 + 0.08, 0, 1.15, 0, 0.12, 0.05, m.headboard);
    kit.rblock(g, -w / 2, w / 2, 0.08, 0.32, 0.12, l + 0.1, 0.03, m.headboard);
    kit.rblock(g, -w / 2 + 0.04, w / 2 - 0.04, 0.32, 0.56, 0.14, l + 0.06, 0.06, m.linen);
    kit.rblock(g, -w / 2, w / 2, 0.4, 0.62, 0.78, l + 0.12, 0.06, m.duvet);
    kit.rblock(g, -w / 2, w / 2, 0.6, 0.67, 0.78, 1.02, 0.03, m.duvet);
    const pw = Math.min(0.66, w / 2 - 0.08);
    kit.rbox(g, pw, 0.16, 0.42, 0.07, m.linen, -w / 4 - 0.02, 0.64, 0.38);
    kit.rbox(g, pw, 0.16, 0.42, 0.07, m.linen, w / 4 + 0.02, 0.64, 0.38);
    kit.rbox(g, 0.5, 0.42, 0.12, 0.06, m.pillowSage, -0.3, 0.84, 0.66, { rotX: -0.35 });
    kit.rbox(g, 0.48, 0.4, 0.12, 0.06, m.pillowRust, 0.3, 0.83, 0.68, { rotX: -0.35, rotY: 0.1 });
    const t = o.throwMat ?? m.throwRust;
    kit.rblock(g, -w / 2 - 0.02, w / 2 + 0.02, 0.62, 0.65, l - 0.35, l - 0.02, 0.012, t);
    kit.rblock(g, -w / 2 - 0.02, w / 2 + 0.02, 0.3, 0.65, l + 0.1, l + 0.13, 0.012, t);

    kit.planBox(-w / 2 - 0.08, 0, w / 2 + 0.08, 0.12, { round: 0.03 });
    kit.planBox(-w / 2, 0.12, w / 2, l + 0.12, { round: 0.04 });
    kit.planBox(-w / 2 + 0.09, 0.18, -0.03, 0.6, { round: 0.06 });
    kit.planBox(0.03, 0.18, w / 2 - 0.09, 0.6, { round: 0.06 });
    kit.planLine(-w / 2, 0.78, w / 2, 0.78);
    kit.planLine(-w / 2, 1.02, w / 2, 1.02);
    kit.planBox(-w / 2 - 0.02, l - 0.35, w / 2 + 0.02, l - 0.02, { round: 0.01 });
    kit.contactShadow(g, -w / 2 - 0.08, w / 2 + 0.08, 0, l + 0.13, 0.55);

    if (o.nightstands !== false) {
      for (const side of [-1, 1]) {
        const nx = side * (w / 2 + 0.36);
        kit.rblock(g, nx - 0.22, nx + 0.22, 0, 0.52, 0.06, 0.46, 0.01, m.oak);
        kit.block(g, nx - 0.2, nx + 0.2, 0.3, 0.302, 0.46, 0.465, m.walnut);
        kit.sphere(g, 0.012, m.brass, nx, 0.4, 0.47);
        kit.tableLamp(g, nx, 0.52, 0.24);
        kit.planBox(nx - 0.22, 0.06, nx + 0.22, 0.46, { round: 0.02 });
        kit.planCircle(nx, 0.24, 0.11, { fill: false });
        kit.contactShadow(g, nx - 0.22, nx + 0.22, 0.06, 0.46, 0.45);
      }
    }
  });
}

/** Built-in wardrobe. Origin: back wall, centre; doors face +Z. */
export function wardrobe(kit: Kit, p: Parent, x: number, z: number, rot: number, w: number, d = 0.58) {
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0, 2.4, 0, d - 0.02, kit.m.trim);
    const n = Math.max(2, Math.round(w / 0.62));
    const dw = w / n;
    for (let i = 0; i < n; i++) {
      const a = -w / 2 + i * dw;
      kit.block(g, a + 0.005, a + dw - 0.005, 0.02, 2.38, d - 0.02, d, kit.m.oak);
      const hx = i % 2 === 0 ? a + dw - 0.06 : a + 0.045;
      kit.block(g, hx, hx + 0.015, 0.95, 1.45, d, d + 0.02, kit.m.blackMetal, { cast: false });
      if (i > 0) kit.planLine(a, 0, a, d);
    }
    kit.planBox(-w / 2, 0, w / 2, d, { round: 0.01 });
    kit.planLine(-w / 2 + 0.06, d / 2, w / 2 - 0.06, d / 2, { dashed: true });
    kit.contactShadow(g, -w / 2, w / 2, 0, d, 0.45);
  });
}

/** Desk with a chair. Origin: back wall, centre. */
export function desk(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 1.2) {
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0.72, 0.75, 0, 0.55, kit.m.oak);
    kit.block(g, -w / 2, -w / 2 + 0.03, 0, 0.72, 0.02, 0.53, kit.m.oak);
    kit.block(g, w / 2 - 0.03, w / 2, 0, 0.72, 0.02, 0.53, kit.m.oak);
    kit.tableLamp(g, w / 2 - 0.2, 0.75, 0.2);
    kit.block(g, -w / 2 + 0.15, -w / 2 + 0.45, 0.75, 0.78, 0.15, 0.36, kit.m.bookB);
    kit.planBox(-w / 2, 0, w / 2, 0.55, { round: 0.01 });
    chair(kit, g, 0, 0.75, Math.PI);
    kit.contactShadow(g, -w / 2, w / 2, 0, 0.55, 0.35);
  });
}

/** Upholstered bench. Origin: centre. */
export function bench(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 1.15) {
  kit.place(p, x, z, rot, (g) => {
    kit.rblock(g, -w / 2, w / 2, 0.06, 0.45, -0.16, 0.16, 0.04, kit.m.headboard);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.block(g, sx * (w / 2 - 0.05) - 0.015, sx * (w / 2 - 0.05) + 0.015, 0, 0.06, sz * 0.12 - 0.015, sz * 0.12 + 0.015, kit.m.blackMetal);
    kit.planBox(-w / 2, -0.16, w / 2, 0.16, { round: 0.04 });
    kit.contactShadow(g, -w / 2, w / 2, -0.16, 0.16, 0.4);
  });
}

// ------------------------------------------------------------
// Kitchen
// ------------------------------------------------------------

/**
 * Straight kitchen run against a wall. Origin: wall face, centre.
 * hob / sink are local X centres; uppers adds wall cabinets.
 */
export function kitchenRun(kit: Kit, p: Parent, x: number, z: number, rot: number, w: number, o: { hob?: number; sink?: number; uppers?: [number, number] } = {}) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    const x0 = -w / 2;
    const x1 = w / 2;
    kit.block(g, x0, x1, 0, 0.1, 0, 0.54, m.sageDark);
    kit.block(g, x0, x1, 0.1, 0.88, 0, 0.58, m.sage);
    const n = Math.max(1, Math.round(w / 0.55));
    const fw = w / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * fw;
      kit.block(g, a + 0.005, a + fw - 0.005, 0.11, 0.87, 0.58, 0.6, m.sage);
      kit.block(g, a + 0.08, a + fw - 0.08, 0.81, 0.825, 0.6, 0.615, m.brass, { cast: false });
    }
    kit.block(g, x0 - 0.02, x1 + 0.02, 0.88, 0.92, 0, 0.62, m.quartz);
    kit.panel(g, 'x', x0, x1, 0.92, 1.5, 0.002, 1, m.backsplash, SPLASH_TILE);
    kit.planBox(x0, 0, x1, 0.62, { round: 0.01 });

    if (o.hob !== undefined) {
      const h = o.hob;
      kit.block(g, h - 0.29, h + 0.29, 0.92, 0.926, 0.08, 0.53, m.cooktop);
      for (const [dx, dz] of [[-0.14, 0.19], [0.14, 0.19], [-0.14, 0.42], [0.14, 0.42]]) {
        kit.torus(g, 0.08, 0.003, m.cooktopRing, h + dx, 0.927, dz, Math.PI * 2, { rotX: Math.PI / 2, cast: false });
        kit.planCircle(h + dx, dz, 0.08, { fill: false });
      }
      kit.planBox(h - 0.29, 0.08, h + 0.29, 0.53, { round: 0.02, fill: false });
    }
    if (o.sink !== undefined) {
      const s = o.sink;
      kit.block(g, s - 0.23, s + 0.23, 0.92, 0.923, 0.12, 0.5, m.steelDark, { cast: false });
      kit.cyl(g, 0.015, 0.018, 0.3, m.brass, s, 1.07, 0.06, { segments: 16 });
      kit.torus(g, 0.1, 0.012, m.brass, s, 1.22, 0.16, Math.PI, { rotY: Math.PI / 2 });
      kit.planBox(s - 0.23, 0.12, s + 0.23, 0.5, { round: 0.04 });
    }
    if (o.uppers) {
      const [u0, u1] = o.uppers;
      kit.block(g, u0, u1, 1.5, 2.25, 0, 0.35, m.sage);
      const un = Math.max(1, Math.round((u1 - u0) / 0.6));
      const uw = (u1 - u0) / un;
      for (let i = 0; i < un; i++) kit.block(g, u0 + i * uw + 0.005, u0 + (i + 1) * uw - 0.005, 1.51, 2.24, 0.35, 0.37, m.sage);
      kit.block(g, u0 + 0.05, u1 - 0.05, 1.49, 1.5, 0.04, 0.08, m.ledStrip, { cast: false });
      kit.planBox(u0, 0, u1, 0.35, { round: 0.01, dashed: true, fill: false });
    }
    kit.contactShadow(g, x0, x1, 0, 0.6, 0.4);
  });
}

/** Integrated fridge-freezer column. Origin: wall face, centre. */
export function fridge(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 0.62) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0, 2.25, 0, 0.6, m.sage);
    kit.block(g, -w / 2 + 0.01, w / 2 - 0.01, 0.02, 1.4, 0.6, 0.62, m.sage);
    kit.block(g, -w / 2 + 0.01, w / 2 - 0.01, 1.42, 2.23, 0.6, 0.62, m.sage);
    kit.block(g, w / 2 - 0.07, w / 2 - 0.055, 0.95, 1.35, 0.62, 0.64, m.brass, { cast: false });
    kit.block(g, w / 2 - 0.07, w / 2 - 0.055, 1.47, 1.8, 0.62, 0.64, m.brass, { cast: false });
    kit.planBox(-w / 2, 0, w / 2, 0.62, { round: 0.01 });
    kit.planLine(-w / 2, 0, w / 2, 0.62);
    kit.planLine(w / 2, 0, -w / 2, 0.62);
    kit.contactShadow(g, -w / 2, w / 2, 0, 0.62, 0.4);
  });
}

/** Counter-height stool; origin: centre */
export function stool(kit: Kit, p: Parent, x: number, z: number) {
  kit.cyl(p, 0.18, 0.17, 0.04, kit.m.oak, x, 0.66, z);
  for (const [dx, dz] of [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]]) {
    kit.cyl(p, 0.012, 0.012, 0.64, kit.m.blackMetal, x + dx, 0.32, z + dz, { segments: 8 });
  }
  kit.torus(p, 0.155, 0.008, kit.m.blackMetal, x, 0.25, z, Math.PI * 2, { rotX: Math.PI / 2 });
  kit.planCircle(x, z, 0.18);
  kit.contactShadow(p, x - 0.19, x + 0.19, z - 0.19, z + 0.19, 0.4, true);
}

/** Brass pendant lights hanging from the ceiling; positions in plan */
export function pendants(kit: Kit, p: Parent, points: [number, number][], drop = 1.95) {
  for (const [x, z] of points) {
    const cord = WALL_H - (drop + 0.13);
    kit.cyl(p, 0.004, 0.004, cord, kit.m.blackMetal, x, drop + 0.13 + cord / 2, z, { segments: 6, cast: false });
    kit.dome(p, 0.13, kit.m.pendant, x, drop, z);
    kit.sphere(p, 0.035, kit.m.bulb, x, drop + 0.02, z, undefined, { cast: false });
  }
  const cx = points.reduce((s, q) => s + q[0], 0) / points.length;
  const cz = points.reduce((s, q) => s + q[1], 0) / points.length;
  kit.pointLight(p, cx, drop - 0.1, cz, '#ffc98a', 1.5, true);
}

// ------------------------------------------------------------
// Bathroom
// ------------------------------------------------------------

/** Wall-hung WC with concealed cistern. Origin: wall face, centre. */
export function toilet(kit: Kit, p: Parent, x: number, z: number, rot: number) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -0.32, 0.32, 0, 1.1, 0, 0.18, m.sage);
    kit.block(g, -0.34, 0.34, 1.1, 1.13, 0, 0.2, m.quartz);
    kit.rblock(g, -0.1, 0.1, 0.86, 1.0, 0.18, 0.19, 0.008, m.ceramic);
    kit.sphere(g, 0.2, m.ceramic, 0, 0.38, 0.44, [0.9, 0.55, 1.3]);
    kit.rbox(g, 0.36, 0.03, 0.46, 0.012, m.ceramic, 0, 0.5, 0.45);
    kit.planBox(-0.32, 0, 0.32, 0.18, { round: 0.01 });
    kit.planEllipse(0, 0.44, 0.17, 0.25);
    kit.contactShadow(g, -0.22, 0.22, 0.18, 0.7, 0.4, true);
  });
}

/**
 * Floating vanity with vessel basin and round backlit mirror.
 * Origin: wall face, centre. reflect: real planar reflection (one per
 * visible bathroom is plenty; others get a plain mirror).
 */
export function vanity(kit: Kit, p: Parent, x: number, z: number, rot: number, o: { width?: number; reflect?: boolean } = {}) {
  const m = kit.m;
  const w = o.width ?? 0.8;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0.45, 0.83, 0.01, 0.5, m.oak);
    kit.block(g, -w / 2 - 0.01, w / 2 + 0.01, 0.83, 0.86, 0, 0.52, m.quartz);
    kit.lathe(g, 'basin', [[0, 0], [0.12, 0.005], [0.17, 0.04], [0.19, 0.1], [0.18, 0.12], [0.17, 0.11], [0.165, 0.05], [0, 0.035]], m.ceramic, 0, 0.86, 0.27);
    kit.cyl(g, 0.012, 0.012, 0.18, m.blackMetal, 0, 1.08, 0.09, { rotX: Math.PI / 2, segments: 12 });
    kit.torus(g, 0.36, 0.014, m.mirrorGlow, 0, 1.62, 0.008, Math.PI * 2, { cast: false });
    kit.cyl(g, 0.355, 0.355, 0.01, m.trim, 0, 1.62, 0.005, { rotX: Math.PI / 2, segments: 64, cast: false });
    if (o.reflect) {
      const res = kit.lowTier ? 512 : 1024;
      const mirror = new Reflector(new THREE.CircleGeometry(0.35, 64), {
        textureWidth: res, textureHeight: res, color: 0xe6e6e6, clipBias: 0.003, multisample: kit.lowTier ? 0 : 4,
      });
      mirror.position.set(0, 1.62, 0.012);
      g.add(mirror);
      kit.noAO.push(mirror);
      kit.disposables.push(mirror);
    } else {
      kit.cyl(g, 0.35, 0.35, 0.012, m.chrome, 0, 1.62, 0.012, { rotX: Math.PI / 2, segments: 64, cast: false });
    }
    kit.planBox(-w / 2 - 0.01, 0, w / 2 + 0.01, 0.52, { round: 0.01 });
    kit.planEllipse(0, 0.27, 0.16, 0.18);
    kit.planLine(-0.32, 0.02, 0.32, 0.02, { heavy: true });
    kit.contactShadow(g, -w / 2, w / 2, 0, 0.5, 0.28);
  });
}

/** Walk-in shower: tray outline, glass screen along one edge, rain head */
export function shower(kit: Kit, p: Parent, rect: [number, number, number, number], glass: { along: 'x' | 'z'; at: number; from: number; to: number }, head: [number, number]) {
  const m = kit.m;
  const [x0, z0, x1, z1] = rect;
  if (glass.along === 'z') {
    kit.block(p, glass.at - 0.005, glass.at + 0.005, 0, 2.0, glass.from, glass.to, m.glass, { cast: false, receive: false, noAO: true });
    kit.block(p, glass.at - 0.01, glass.at + 0.01, 1.98, 2.0, glass.from, glass.to, m.blackMetal);
  } else {
    kit.block(p, glass.from, glass.to, 0, 2.0, glass.at - 0.005, glass.at + 0.005, m.glass, { cast: false, receive: false, noAO: true });
    kit.block(p, glass.from, glass.to, 1.98, 2.0, glass.at - 0.01, glass.at + 0.01, m.blackMetal);
  }
  kit.cyl(p, 0.15, 0.15, 0.012, m.blackMetal, head[0], 2.25, head[1]);
  kit.block(p, (x0 + x1) / 2 - 0.25, (x0 + x1) / 2 + 0.25, 0.003, 0.006, z1 - 0.06, z1 - 0.03, m.steelDark, { cast: false });
  kit.planBox(x0, z0, x1, z1, { round: 0.01, dashed: true, fill: false });
  kit.planCircle(head[0], head[1], 0.15, { dashed: true, fill: false });
  if (glass.along === 'z') kit.planLine(glass.at, glass.from, glass.at, glass.to, { heavy: true });
  else kit.planLine(glass.from, glass.at, glass.to, glass.at, { heavy: true });
}

/** Built-in bath. Origin: back wall, centre; long axis local X. */
export function bathtub(kit: Kit, p: Parent, x: number, z: number, rot: number, l = 1.6, w = 0.72) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -l / 2, l / 2, 0, 0.55, 0, w, m.bathTile);
    kit.rblock(g, -l / 2 + 0.01, l / 2 - 0.01, 0.55, 0.58, 0.01, w - 0.01, 0.02, m.ceramic);
    kit.rblock(g, -l / 2 + 0.08, l / 2 - 0.08, 0.3, 0.585, 0.08, w - 0.08, 0.12, m.ceramic);
    kit.cyl(g, 0.012, 0.012, 0.16, m.blackMetal, l / 2 - 0.2, 0.75, 0.05, { rotX: Math.PI / 2, segments: 12 });
    kit.planBox(-l / 2, 0, l / 2, w, { round: 0.02 });
    kit.planBox(-l / 2 + 0.08, 0.08, l / 2 - 0.08, w - 0.08, { round: 0.12, fill: false });
    kit.contactShadow(g, -l / 2, l / 2, 0, w, 0.35);
  });
}

/** Tile the inner faces of a bathroom up to 2.2 m (plan rect, skipping door gaps) */
export function bathTiles(kit: Kit, p: Parent, r: [number, number, number, number], gaps: { side: 'n' | 's' | 'e' | 'w'; a: number; b: number }[] = []) {
  const [x0, z0, x1, z1] = r;
  const T = kit.m.bathTile;
  const run = (side: 'n' | 's' | 'e' | 'w', from: number, to: number) => {
    const cuts = gaps.filter((g) => g.side === side).sort((a, b) => a.a - b.a);
    let c = from;
    const seg = (a: number, b: number) => {
      if (b - a < 0.02) return;
      if (side === 'n') kit.panel(p, 'x', a, b, 0, 2.2, z0 + 0.002, 1, T, BATH_TILE);
      if (side === 's') kit.panel(p, 'x', a, b, 0, 2.2, z1 - 0.002, -1, T, BATH_TILE);
      if (side === 'w') kit.panel(p, 'z', a, b, 0, 2.2, x0 + 0.002, 1, T, BATH_TILE);
      if (side === 'e') kit.panel(p, 'z', a, b, 0, 2.2, x1 - 0.002, -1, T, BATH_TILE);
    };
    for (const g of cuts) {
      seg(c, g.a);
      c = g.b;
    }
    seg(c, to);
  };
  run('n', x0, x1);
  run('s', x0, x1);
  run('w', z0, z1);
  run('e', z0, z1);
}

// ------------------------------------------------------------
// Plants, balconies, misc
// ------------------------------------------------------------

/** Potted plant with plan symbol and contact shadow */
export function plant(kit: Kit, p: Parent, x: number, z: number, kind: 'fiddle' | 'bush' | 'snake', h: number, seed: number, pot?: THREE.Material, y = 0) {
  kit.plant(p, x, y, z, kind, h, seed, pot);
  const r = kind === 'fiddle' ? 0.3 : kind === 'snake' ? 0.17 : Math.max(0.14, h * 0.42);
  kit.planPlant(x, z, r);
  if (y === 0) kit.contactShadow(p, x - r * 0.6, x + r * 0.6, z - r * 0.6, z + r * 0.6, 0.45, true);
}

/** Concrete planter box with greenery (window boxes / balcony ends) */
export function planter(kit: Kit, p: Parent, x0: number, z0: number, x1: number, z1: number, seed: number) {
  kit.block(p, x0, x1, 0, 0.45, z0, z1, kit.m.potStone);
  kit.block(p, x0 + 0.04, x1 - 0.04, 0.4, 0.44, z0 + 0.04, z1 - 0.04, kit.m.soil);
  const n = Math.max(1, Math.round(Math.max(x1 - x0, z1 - z0) / 0.5));
  const long = x1 - x0 > z1 - z0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const px = long ? x0 + (x1 - x0) * t : (x0 + x1) / 2;
    const pz = long ? (z0 + z1) / 2 : z0 + (z1 - z0) * t;
    kit.plant(p, px, 0.3, pz, 'bush', 0.42, seed + i, kit.m.soil);
    kit.planPlant(px, pz, 0.18);
  }
  kit.planBox(x0, z0, x1, z1, { round: 0.01 });
}

/** Glass balustrade along the open edges of a balcony rect */
export function balcony(kit: Kit, p: Parent, r: [number, number, number, number], edges: ('n' | 's' | 'e' | 'w')[]) {
  const [x0, z0, x1, z1] = r;
  const m = kit.m;
  const glass = { cast: false, receive: false, noAO: true };
  kit.floor(p, x0, x1, z0, z1, 0, m.deck, 1.6);
  kit.planFloor('deck', r);
  for (const e of edges) {
    if (e === 'w' || e === 'e') {
      const x = e === 'w' ? x0 + 0.03 : x1 - 0.03;
      kit.block(p, x - 0.008, x + 0.008, 0.05, 1.02, z0, z1, m.glass, glass);
      kit.block(p, x - 0.03, x + 0.03, 1.02, 1.06, z0, z1, m.frameMetal);
      kit.block(p, x - 0.03, x + 0.03, 0, 0.06, z0, z1, m.frameMetal);
      kit.planLine(x, z0, x, z1, { heavy: true });
    } else {
      const z = e === 'n' ? z0 + 0.03 : z1 - 0.03;
      kit.block(p, x0, x1, 0.05, 1.02, z - 0.008, z + 0.008, m.glass, glass);
      kit.block(p, x0, x1, 1.02, 1.06, z - 0.03, z + 0.03, m.frameMetal);
      kit.block(p, x0, x1, 0, 0.06, z - 0.03, z + 0.03, m.frameMetal);
      kit.planLine(x0, z, x1, z, { heavy: true });
    }
  }
}

/** Outdoor lounge chair; origin: centre, back towards -Z */
export function lounger(kit: Kit, p: Parent, x: number, z: number, rot: number) {
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -0.42, 0.42, 0.12, 0.18, -0.4, 0.4, kit.m.walnut);
    for (const [lx, lz] of [[-0.37, -0.35], [0.37, -0.35], [-0.37, 0.35], [0.37, 0.35]]) kit.block(g, lx - 0.025, lx + 0.025, 0, 0.12, lz - 0.025, lz + 0.025, kit.m.walnut);
    kit.rblock(g, -0.4, 0.4, 0.18, 0.32, -0.38, 0.38, 0.05, kit.m.pillowCream);
    kit.rbox(g, 0.8, 0.5, 0.12, 0.05, kit.m.pillowCream, 0, 0.5, -0.41, { rotX: -0.4 });
    kit.planBox(-0.42, -0.45, 0.42, 0.4, { round: 0.04 });
    kit.contactShadow(g, -0.42, 0.42, -0.4, 0.4, 0.45);
  });
}

/** Round bistro table with two chairs; origin: table centre */
export function bistroSet(kit: Kit, p: Parent, x: number, z: number, rot: number) {
  kit.place(p, x, z, rot, (g) => {
    kit.cyl(g, 0.3, 0.3, 0.025, kit.m.oak, 0, 0.72, 0);
    kit.cyl(g, 0.02, 0.02, 0.7, kit.m.blackMetal, 0, 0.36, 0, { segments: 12 });
    kit.cyl(g, 0.2, 0.2, 0.015, kit.m.blackMetal, 0, 0.008, 0);
    kit.planCircle(0, 0, 0.3);
    chair(kit, g, 0, -0.55, 0);
    chair(kit, g, 0, 0.55, Math.PI);
    kit.contactShadow(g, -0.3, 0.3, -0.3, 0.3, 0.45, true);
  });
}
