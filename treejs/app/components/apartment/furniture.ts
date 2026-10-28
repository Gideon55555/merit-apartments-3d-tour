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
      kit.cushionBlock(g, a, b, 0.24, 0.47, 0.16, d - 0.02, 0.08, S, { puff: 0.04 });
      kit.cushion(g, b - a, 0.46, 0.2, 0.09, S, (a + b) / 2, 0.69, 0.27, { rotX: -0.16, puff: 0.03 });
      if (i > 0) kit.planLine(a, 0.16, a, d - 0.02);
    }
    // Chaise extension
    if (o.chaise) {
      const cx0 = left ? x0 + 0.17 : x1 - 0.87;
      const cx1 = left ? x0 + 0.87 : x1 - 0.17;
      kit.block(g, cx0, cx1, 0.06, 0.24, d - 0.03, cl, S);
      kit.cushionBlock(g, cx0 + 0.005, cx1 - 0.005, 0.24, 0.47, d - 0.02, cl - 0.02, 0.08, S, { puff: 0.04 });
      kit.planBox(left ? x0 : x1 - 0.87, d, left ? x0 + 0.87 : x1, cl, { round: 0.05 });
      kit.contactShadow(g, cx0, cx1, d, cl, 0.5);
    }
    const pills = [kit.m.pillowSage, kit.m.pillowCream, kit.m.pillowRust];
    for (let i = 0; i < Math.min(3, n + 1); i++) {
      const px = x0 + 0.5 + (i * (L - 1.0)) / 2;
      kit.pillow(g, 0.45, 0.45, 0.17, pills[i], px, 0.69, 0.47, { rotX: -0.32, rotY: (i - 1) * 0.15 });
    }
    kit.planBox(x0, 0, x1, d, { round: 0.05 });
    kit.planBox(x0, 0, x1, 0.16, { round: 0.03 });
    kit.contactShadow(g, x0, x1, 0, d, 0.55);
  });
}

/** Sculptural layered marble coffee table with a walnut tray. Origin: centre. */
export function coffeeTable(kit: Kit, p: Parent, x: number, z: number, rot = 0, rx = 0.62, rz = 0.35) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    // Low marble plinth, walnut spacer blocks, then the offset upper slab
    kit.rblock(g, -rx, rx, 0.02, 0.2, -rz, rz, 0.12, m.quartz);
    kit.block(g, -rx * 0.55, -rx * 0.15, 0.2, 0.3, -rz * 0.5, rz * 0.3, m.walnut);
    kit.block(g, rx * 0.2, rx * 0.6, 0.2, 0.3, -rz * 0.3, rz * 0.5, m.walnut);
    kit.rblock(g, -rx * 0.85, rx * 0.7, 0.3, 0.36, -rz * 0.8, rz * 0.75, 0.1, m.quartz);
    // Tea tray
    kit.rblock(g, -0.2, 0.12, 0.36, 0.38, -0.12, 0.12, 0.02, m.walnut);
    kit.lathe(g, 'teapot', [[0, 0], [0.05, 0], [0.065, 0.04], [0.055, 0.09], [0.02, 0.11], [0, 0.11]], m.ceramic, -0.07, 0.38, 0);
    for (const [cx, cz] of [[0.05, -0.06], [0.06, 0.05], [-0.15, 0.06]]) kit.cyl(g, 0.025, 0.022, 0.05, m.ceramic, cx, 0.405, cz, { segments: 16 });
    kit.planBox(-rx, -rz, rx, rz, { round: 0.12 });
    kit.planBox(-rx * 0.85, -rz * 0.8, rx * 0.7, rz * 0.75, { round: 0.1, fill: false });
    kit.contactShadow(g, -rx, rx, -rz, rz, 0.5);
  });
}

/** Flat-woven rug from plan bounds */
export function rug(kit: Kit, p: Parent, x0: number, z0: number, x1: number, z1: number, mat: THREE.Material) {
  kit.rblock(p, x0, x1, 0, 0.012, z0, z1, 0.005, mat, { cast: false });
  kit.planBox(x0, z0, x1, z1, { round: 0.01, dashed: true, fill: false });
}

/**
 * TV feature wall: book-matched marble slabs with a walnut strip, a
 * floating walnut-and-cream console and a wall-mounted TV.
 * Origin: wall face, centre; faces +Z.
 */
export function tvUnit(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 2.4) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    const mw = w + 0.4;
    kit.panel(g, 'x', -mw / 2, mw / 2, 0.55, 2.5, 0.003, 1, m.marbleWall, 1.3);
    for (const sx of [-mw / 6, mw / 6]) kit.block(g, sx - 0.003, sx + 0.003, 0.55, 2.5, 0.003, 0.007, m.doorDark, { cast: false });
    kit.block(g, -mw / 2 - 0.2, -mw / 2, 0, 2.5, 0, 0.02, m.walnut);
    // Floating console: walnut top over cream drawer fronts
    kit.block(g, -w / 2, w / 2, 0.22, 0.48, 0.02, 0.4, m.trim);
    const n = Math.max(2, Math.round(w / 0.62));
    const fw = w / n;
    for (let i = 0; i < n; i++) {
      const a = -w / 2 + i * fw;
      kit.block(g, a + 0.004, a + fw - 0.004, 0.225, 0.475, 0.4, 0.41, m.trim);
    }
    kit.block(g, -w / 2 - 0.02, w / 2 + 0.02, 0.48, 0.52, 0.02, 0.42, m.walnut);
    const tw = Math.min(1.45, w * 0.6);
    kit.rblock(g, -tw / 2, tw / 2, 1.0, 1.0 + tw * 0.565, 0.006, 0.036, 0.01, m.screen);
    kit.block(g, -w / 2 + 0.2, -w / 2 + 0.5, 0.52, 0.56, 0.1, 0.3, m.bookC);
    kit.lathe(g, 'vaseTall', [[0, 0], [0.05, 0], [0.07, 0.08], [0.06, 0.24], [0.035, 0.32], [0.04, 0.34], [0, 0.34]], m.ceramic, w / 2 - 0.25, 0.52, 0.22);
    kit.planBox(-w / 2, 0.02, w / 2, 0.42, { round: 0.01 });
    kit.planLine(-tw / 2, 0.03, tw / 2, 0.03, { heavy: true });
    kit.contactShadow(g, -w / 2, w / 2, 0, 0.42, 0.18);
  });
}

/** Dining table with chairs on both long sides. Origin: centre; long axis = local X. */
export function diningSet(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 1.4, d = 0.8, perSide = 2) {
  kit.place(p, x, z, rot, (g) => {
    kit.rblock(g, -w / 2, w / 2, 0.72, 0.76, -d / 2, d / 2, 0.01, kit.m.quartz);
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

/** Upholstered dining chair (cream, walnut legs); origin: seat centre, facing +Z */
function chair(kit: Kit, p: Parent, x: number, z: number, rot: number) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.cushionBlock(g, -0.21, 0.21, 0.42, 0.5, -0.2, 0.2, 0.05, m.pillowCream, { puff: 0.015 });
    kit.cushion(g, 0.4, 0.36, 0.06, 0.03, m.pillowCream, 0, 0.72, -0.2, { rotX: -0.1, puff: 0.012 });
    for (const [dx, dz] of [[0.17, 0.16], [-0.17, 0.16], [0.17, -0.17], [-0.17, -0.17]]) {
      kit.cyl(g, 0.014, 0.011, 0.43, m.walnut, dx, 0.215, dz, { segments: 8 });
    }
    kit.planBox(-0.21, -0.23, 0.21, 0.2, { round: 0.04 });
  });
}

// ------------------------------------------------------------
// Bedroom
// ------------------------------------------------------------

/** Bed with upholstered headboard and nightstands. Origin: headboard wall, centre; foot points +Z. */
export function bed(kit: Kit, p: Parent, x: number, z: number, rot: number, o: { width?: number; length?: number; nightstands?: boolean; throwMat?: THREE.Material } = {}) {
  const w = o.width ?? 1.6;
  const l = o.length ?? 2.1;
  const single = w < 1.1;
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    // Channel-tufted headboard
    const hw = w + 0.16;
    const nc = Math.round(hw / 0.3);
    for (let i = 0; i < nc; i++) {
      const a = -hw / 2 + (i * hw) / nc;
      kit.cushionBlock(g, a + 0.004, a + hw / nc - 0.004, 0.12, 1.12, 0, 0.12, 0.05, m.headboard, { puff: 0.018 });
    }
    // Walnut frame, plush mattress, duvet draped over and rolled back
    kit.rblock(g, -w / 2, w / 2, 0.08, 0.32, 0.12, l + 0.1, 0.03, m.walnut);
    kit.cushionBlock(g, -w / 2 + 0.04, w / 2 - 0.04, 0.32, 0.56, 0.14, l + 0.06, 0.06, m.linen, { puff: 0.02 });
    kit.drape(g, w + 0.02, l - 0.7, 0.24, Math.round(w * 37), m.duvet, 0, 0.585, 0.78, { wrinkle: 0.007 });
    kit.cushionBlock(g, -w / 2 - 0.01, w / 2 + 0.01, 0.57, 0.67, 0.72, 0.98, 0.05, m.duvet, { puff: 0.02 });
    // Sleeping pillows flat, decorative pillows leaning on them
    if (single) {
      kit.pillow(g, w - 0.18, 0.44, 0.17, m.linen, 0, 0.66, 0.4, { rotX: -Math.PI / 2 });
      kit.pillow(g, 0.46, 0.38, 0.15, m.pillowSage, 0, 0.84, 0.62, { rotX: -0.35, rotY: 0.08 });
    } else {
      const pw = Math.min(0.66, w / 2 - 0.08);
      kit.pillow(g, pw, 0.44, 0.17, m.linen, -w / 4 - 0.02, 0.66, 0.4, { rotX: -Math.PI / 2 });
      kit.pillow(g, pw, 0.44, 0.17, m.linen, w / 4 + 0.02, 0.66, 0.4, { rotX: -Math.PI / 2 });
      kit.pillow(g, 0.5, 0.42, 0.16, m.pillowCharcoal, -0.3, 0.86, 0.62, { rotX: -0.35, rotY: -0.06 });
      kit.pillow(g, 0.48, 0.4, 0.16, m.pillowSage, 0.3, 0.85, 0.64, { rotX: -0.35, rotY: 0.1 });
    }
    // Throw over the foot
    const t = o.throwMat ?? m.throwRust;
    kit.drape(g, w + 0.08, 0.42, 0.28, Math.round(w * 53), t, 0, 0.65, l - 0.32, { wrinkle: 0.01 });

    kit.planBox(-w / 2 - 0.08, 0, w / 2 + 0.08, 0.12, { round: 0.03 });
    kit.planBox(-w / 2, 0.12, w / 2, l + 0.12, { round: 0.04 });
    if (single) {
      kit.planBox(-w / 2 + 0.09, 0.18, w / 2 - 0.09, 0.6, { round: 0.06 });
    } else {
      kit.planBox(-w / 2 + 0.09, 0.18, -0.03, 0.6, { round: 0.06 });
      kit.planBox(0.03, 0.18, w / 2 - 0.09, 0.6, { round: 0.06 });
    }
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

/** Black-framed wardrobe with smoked glass doors and a lit interior. Origin: back wall, centre; doors face +Z. */
export function wardrobe(kit: Kit, p: Parent, x: number, z: number, rot: number, w: number, d = 0.58) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    const x0 = -w / 2;
    const x1 = w / 2;
    // Carcass
    kit.block(g, x0, x1, 0, 0.02, 0, d, m.doorDark);
    kit.block(g, x0, x1, 2.38, 2.4, 0, d, m.doorDark);
    kit.block(g, x0, x0 + 0.02, 0, 2.4, 0, d, m.doorDark);
    kit.block(g, x1 - 0.02, x1, 0, 2.4, 0, d, m.doorDark);
    kit.block(g, x0, x1, 0, 2.4, 0, 0.02, m.trim);
    // Interior: shelf, rail with garments, drawers, LED strip under the top
    kit.block(g, x0 + 0.02, x1 - 0.02, 1.95, 1.97, 0.02, d - 0.04, m.doorDark);
    kit.cyl(g, 0.01, 0.01, w - 0.06, m.chrome, 0, 1.85, d / 2, { rotZ: Math.PI / 2, segments: 8, cast: false });
    const n = Math.max(3, Math.round(w / 0.09));
    for (let i = 0; i < n; i++) {
      const gx = x0 + 0.08 + (i * (w - 0.16)) / (n - 1);
      const mat = i % 3 === 0 ? m.pillowCharcoal : i % 3 === 1 ? m.linen : m.pillowCream;
      kit.block(g, gx - 0.02, gx + 0.02, 1.0 + (i % 2) * 0.12, 1.83, d / 2 - 0.2, d / 2 + 0.2, mat, { cast: false });
    }
    kit.block(g, x0 + 0.02, x1 - 0.02, 0.02, 0.62, 0.02, d - 0.04, m.taupe);
    kit.block(g, x0 + 0.05, x1 - 0.05, 2.35, 2.36, 0.05, d - 0.08, m.ledStrip, { cast: false });
    // Smoked glass doors in slim frames
    const nd = Math.max(2, Math.round(w / 0.55));
    const dw = w / nd;
    for (let i = 0; i < nd; i++) {
      const a = x0 + i * dw;
      kit.block(g, a + 0.01, a + dw - 0.01, 0.03, 2.37, d - 0.012, d - 0.004, m.smokedGlass, { cast: false, noAO: true });
      kit.block(g, a + 0.005, a + 0.025, 0.03, 2.37, d - 0.02, d, m.brass, { cast: false });
      if (i > 0) kit.planLine(a, 0, a, d);
    }
    kit.pointLight(g, 0, 2.2, d / 2, '#ffd9a8', 0.5, true);
    kit.planBox(x0, 0, x1, d, { round: 0.01 });
    kit.planLine(x0 + 0.06, d / 2, x1 - 0.06, d / 2, { dashed: true });
    kit.contactShadow(g, x0, x1, 0, d, 0.45);
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
export function kitchenRun(kit: Kit, p: Parent, x: number, z: number, rot: number, w: number, o: { hob?: number; sink?: number; uppers?: [number, number]; flat?: boolean; hood?: boolean } = {}) {
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
      if (o.flat) {
        // Handleless flat front with a dark edge line
        kit.block(g, a + 0.003, a + fw - 0.003, 0.11, 0.86, 0.58, 0.6, m.sage);
        kit.block(g, a + 0.003, a + fw - 0.003, 0.86, 0.875, 0.575, 0.598, m.doorDark, { cast: false });
      } else {
        kit.shaker(g, 'x', 0.58, 1, a, a + fw, 0.11, 0.87, m.sage);
        kit.sphere(g, 0.016, m.blackMetal, a + fw / 2, 0.79, 0.615);
      }
    }
    kit.block(g, x0 - 0.02, x1 + 0.02, 0.88, 0.92, 0, 0.62, o.flat ? m.blackMarble : m.quartz);
    if (o.flat) kit.panel(g, 'x', x0, x1, 0.92, 1.5, 0.002, 1, m.marbleWall, 1.3);
    else kit.panel(g, 'x', x0, x1, 0.92, 1.5, 0.002, 1, m.backsplash, SPLASH_TILE);
    kit.planBox(x0, 0, x1, 0.62, { round: 0.01 });

    if (o.hob !== undefined) {
      const h = o.hob;
      kit.block(g, h - 0.29, h + 0.29, 0.92, 0.926, 0.08, 0.53, m.cooktop);
      for (const [dx, dz] of [[-0.14, 0.19], [0.14, 0.19], [-0.14, 0.42], [0.14, 0.42]]) {
        kit.torus(g, 0.08, 0.003, m.cooktopRing, h + dx, 0.927, dz, Math.PI * 2, { rotX: Math.PI / 2, cast: false });
        kit.planCircle(h + dx, dz, 0.08, { fill: false });
      }
      kit.planBox(h - 0.29, 0.08, h + 0.29, 0.53, { round: 0.02, fill: false });
      if (o.hood) {
        // Black canopy hood over the hob
        kit.block(g, h - 0.36, h + 0.36, 1.55, 1.62, 0, 0.5, m.doorDark);
        kit.block(g, h - 0.34, h + 0.34, 1.53, 1.55, 0.03, 0.47, m.steelDark, { cast: false });
        kit.block(g, h - 0.15, h + 0.15, 1.62, 2.25, 0, 0.3, m.doorDark);
      }
    }
    if (o.sink !== undefined) {
      const s = o.sink;
      kit.block(g, s - 0.23, s + 0.23, 0.92, 0.923, 0.12, 0.5, m.steelDark, { cast: false });
      kit.cyl(g, 0.015, 0.018, 0.3, m.blackMetal, s, 1.07, 0.06, { segments: 16 });
      kit.torus(g, 0.1, 0.012, m.blackMetal, s, 1.22, 0.16, Math.PI, { rotY: Math.PI / 2 });
      kit.planBox(s - 0.23, 0.12, s + 0.23, 0.5, { round: 0.04 });
    }
    if (o.uppers) {
      const [u0, u1] = o.uppers;
      kit.block(g, u0, u1, 1.5, 2.25, 0, 0.35, m.sage);
      const un = Math.max(1, Math.round((u1 - u0) / 0.6));
      const uw = (u1 - u0) / un;
      for (let i = 0; i < un; i++) {
        if (o.flat) kit.block(g, u0 + i * uw + 0.003, u0 + (i + 1) * uw - 0.003, 1.5, 2.25, 0.35, 0.37, m.sage);
        else kit.shaker(g, 'x', 0.35, 1, u0 + i * uw, u0 + (i + 1) * uw, 1.5, 2.25, m.sage);
      }
      kit.block(g, u0 + 0.05, u1 - 0.05, 1.49, 1.5, 0.04, 0.08, m.ledStrip, { cast: false });
      kit.planBox(u0, 0, u1, 0.35, { round: 0.01, dashed: true, fill: false });
    }
    kit.contactShadow(g, x0, x1, 0, 0.6, 0.4);
  });
}

/** Black fridge-freezer with smoked glass doors and steel bar handles. Origin: wall face, centre. */
export function fridge(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 0.62) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0, 2.25, 0, 0.6, m.doorDark);
    kit.rblock(g, -w / 2 + 0.01, w / 2 - 0.01, 0.02, 1.4, 0.59, 0.63, 0.008, m.screen);
    kit.rblock(g, -w / 2 + 0.01, w / 2 - 0.01, 1.42, 2.23, 0.59, 0.63, 0.008, m.screen);
    kit.cyl(g, 0.012, 0.012, 0.42, m.chrome, w / 2 - 0.06, 1.15, 0.655, { segments: 10, cast: false });
    kit.cyl(g, 0.012, 0.012, 0.32, m.chrome, w / 2 - 0.06, 1.64, 0.655, { segments: 10, cast: false });
    kit.planBox(-w / 2, 0, w / 2, 0.63, { round: 0.01 });
    kit.planLine(-w / 2, 0, w / 2, 0.63);
    kit.planLine(w / 2, 0, -w / 2, 0.63);
    kit.contactShadow(g, -w / 2, w / 2, 0, 0.63, 0.4);
  });
}

/** Upholstered counter chair (cream seat and back, walnut legs); origin: centre, facing +X */
export function stool(kit: Kit, p: Parent, x: number, z: number, rot = -Math.PI / 2) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.rblock(g, -0.2, 0.2, 0.62, 0.7, -0.19, 0.19, 0.05, m.pillowCream);
    kit.rbox(g, 0.36, 0.2, 0.05, 0.025, m.pillowCream, 0, 0.88, -0.19, { rotX: -0.12 });
    for (const [dx, dz] of [[0.15, 0.14], [-0.15, 0.14], [0.15, -0.14], [-0.15, -0.14]]) {
      kit.cyl(g, 0.014, 0.012, 0.62, m.walnut, dx, 0.31, dz, { segments: 8 });
    }
    kit.block(g, -0.15, 0.15, 0.25, 0.27, 0.13, 0.15, m.walnut, { cast: false });
    kit.planBox(-0.2, -0.21, 0.2, 0.19, { round: 0.06 });
    kit.contactShadow(g, -0.2, 0.2, -0.19, 0.19, 0.4, true);
  });
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

/** Wall-hung taupe WC with concealed cistern and black flush plate. Origin: wall face, centre. */
export function toilet(kit: Kit, p: Parent, x: number, z: number, rot: number) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -0.32, 0.32, 0, 1.1, 0, 0.18, m.bathTile);
    kit.block(g, -0.34, 0.34, 1.1, 1.13, 0, 0.2, m.taupe);
    kit.rblock(g, -0.1, 0.1, 0.86, 1.0, 0.18, 0.19, 0.008, m.blackMetal);
    kit.rblock(g, -0.18, 0.18, 0.26, 0.47, 0.18, 0.72, 0.07, m.taupe);
    kit.rblock(g, -0.185, 0.185, 0.47, 0.5, 0.18, 0.73, 0.03, m.taupe);
    kit.planBox(-0.32, 0, 0.32, 0.18, { round: 0.01 });
    kit.planBox(-0.18, 0.18, 0.18, 0.73, { round: 0.08 });
    kit.contactShadow(g, -0.22, 0.22, 0.18, 0.72, 0.4, true);
  });
}

/**
 * Floating taupe solid-surface vanity with an integrated basin, black wall
 * tap and a mirror cabinet lit from below. Origin: wall face,
 * centre. reflect: real planar reflection in the mirror (one per visible
 * bathroom is plenty; others get a plain mirror).
 */
export function vanity(kit: Kit, p: Parent, x: number, z: number, rot: number, o: { width?: number; reflect?: boolean } = {}) {
  const m = kit.m;
  const w = o.width ?? 0.8;
  kit.place(p, x, z, rot, (g) => {
    // Two-tier solid-surface unit with a recessed basin
    kit.rblock(g, -w / 2, w / 2, 0.68, 0.86, 0, 0.5, 0.02, m.taupe);
    kit.rblock(g, -w / 2, w / 2, 0.42, 0.56, 0, 0.46, 0.02, m.taupe);
    kit.rblock(g, -w / 2 + 0.08, w / 2 - 0.08, 0.861, 0.866, 0.1, 0.42, 0.04, m.sageDark, { cast: false });
    // Wall tap
    kit.cyl(g, 0.012, 0.012, 0.16, m.blackMetal, 0, 1.0, 0.08, { rotX: Math.PI / 2, segments: 12 });
    kit.cyl(g, 0.025, 0.025, 0.02, m.blackMetal, 0, 1.0, 0.01, { rotX: Math.PI / 2, segments: 16 });
    // Mirror cabinet with LED strip below
    const mw = Math.min(0.62, w - 0.1);
    kit.block(g, -mw / 2 - 0.02, mw / 2 + 0.02, 1.2, 1.92, 0, 0.12, m.trim);
    kit.block(g, -mw / 2, mw / 2, 1.19, 1.2, 0.02, 0.1, m.ledStrip, { cast: false });
    if (o.reflect) {
      const res = kit.lowTier ? 512 : 1024;
      const mirror = new Reflector(new THREE.PlaneGeometry(mw, 0.68), {
        textureWidth: res, textureHeight: Math.round(res * 1.1), color: 0xe6e6e6, clipBias: 0.003, multisample: kit.lowTier ? 0 : 4,
      });
      mirror.position.set(0, 1.56, 0.122);
      g.add(mirror);
      kit.noAO.push(mirror);
      kit.disposables.push(mirror);
    } else {
      kit.block(g, -mw / 2, mw / 2, 1.22, 1.9, 0.12, 0.124, m.chrome, { cast: false });
    }
    kit.planBox(-w / 2, 0, w / 2, 0.5, { round: 0.02 });
    kit.planBox(-w / 2 + 0.08, 0.1, w / 2 - 0.08, 0.42, { round: 0.04, fill: false });
    kit.planLine(-mw / 2, 0.12, mw / 2, 0.12, { heavy: true });
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

/** Realistic potted plant (Poly Haven potted_plant_02, CC0), meshopt + WebP compressed to ~630 KB */
export const PLANT_MODEL = '/models/potted-plant.glb';

/** Potted plant with plan symbol and contact shadow. Larger floor plants use the scanned model. */
export function plant(kit: Kit, p: Parent, x: number, z: number, kind: 'fiddle' | 'bush' | 'snake', h: number, seed: number, pot?: THREE.Material, y = 0) {
  if (kind !== 'snake' && y === 0 && h >= 0.55 && !kit.lite) kit.model(p, PLANT_MODEL, x, 0, z, h * 1.1, seed);
  else kit.plant(p, x, y, z, kind, h, seed, pot);
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

// ------------------------------------------------------------
// Feature pieces from the design renders
// ------------------------------------------------------------

/** Starburst chandelier: black rods with warm bulb tips. Position in plan; y = hub height. */
export function chandelier(kit: Kit, p: Parent, x: number, y: number, z: number, seed = 7) {
  const m = kit.m;
  const rand = (() => { let t = seed; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; })();
  kit.cyl(p, 0.004, 0.004, WALL_H - y, m.blackMetal, x, (WALL_H + y) / 2, z, { segments: 6, cast: false });
  kit.sphere(p, 0.045, m.blackMetal, x, y, z);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  for (let i = 0; i < 26; i++) {
    const az = (i / 26) * Math.PI * 2 + rand() * 0.3;
    const el = (rand() - 0.45) * 1.1;
    const len = 0.32 + rand() * 0.2;
    dir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    const rod = kit.cyl(p, 0.004, 0.004, len, m.blackMetal, x + dir.x * len / 2, y + dir.y * len / 2, z + dir.z * len / 2, { segments: 5, cast: false });
    rod.quaternion.setFromUnitVectors(up, dir);
    kit.sphere(p, 0.016, m.bulb, x + dir.x * len, y + dir.y * len, z + dir.z * len, undefined, { cast: false });
  }
  kit.pointLight(p, x, y - 0.15, z, '#ffd6a5', 2.2);
  kit.planCircle(x, z, 0.5, { dashed: true, fill: false });
}

/** Black twin-cylinder wall sconce on a wall face (along: wall axis, facing: normal sign) */
export function sconce(kit: Kit, p: Parent, along: 'x' | 'z', at: number, facing: 1 | -1, u: number, y = 1.5) {
  const m = kit.m;
  const off = (d: number) => at + facing * d;
  const put = (w: number, h: number, dep: number, mat: THREE.Material, cy: number, dz: number) => {
    if (along === 'x') kit.box(p, w, h, dep, mat, u, cy, off(dz), { cast: false });
    else kit.box(p, dep, h, w, mat, off(dz), cy, u, { cast: false });
  };
  put(0.07, 0.07, 0.02, m.blackMetal, y, 0.01);
  put(0.012, 0.42, 0.012, m.blackMetal, y, 0.045);
  put(0.03, 0.07, 0.03, m.bulb, y + 0.21, 0.045);
  put(0.03, 0.07, 0.03, m.bulb, y - 0.21, 0.045);
  if (along === 'x') kit.pointLight(p, u, y, off(0.15), '#ffcf96', 0.5, true);
  else kit.pointLight(p, off(0.15), y, u, '#ffcf96', 0.5, true);
}

/** Black slatted panel (TV wall plinth band, headboard accents) on a wall face */
export function slats(kit: Kit, p: Parent, along: 'x' | 'z', at: number, facing: 1 | -1, a0: number, a1: number, y0: number, y1: number) {
  const step = 0.06;
  for (let u = a0 + 0.015; u < a1 - 0.015; u += step) {
    const c = at + facing * 0.02;
    if (along === 'x') kit.block(p, u - 0.016, u + 0.016, y0, y1, Math.min(at, c), Math.max(at, c), kit.m.doorDark, { cast: false });
    else kit.block(p, Math.min(at, c), Math.max(at, c), y0, y1, u - 0.016, u + 0.016, kit.m.doorDark, { cast: false });
  }
}

/** Glass-block partition with bronze joints; along X or Z between a0..a1 at the given line */
export function glassBlocks(kit: Kit, p: Parent, along: 'x' | 'z', line: number, a0: number, a1: number, h = 2.5) {
  const m = kit.m;
  const t = 0.1;
  if (along === 'z') kit.block(p, line - t / 2, line + t / 2, 0, h, a0, a1, m.glassBlock, { cast: false, noAO: true });
  else kit.block(p, a0, a1, 0, h, line - t / 2, line + t / 2, m.glassBlock, { cast: false, noAO: true });
  const joint = (u0: number, u1: number, y0: number, y1: number) => {
    if (along === 'z') kit.block(p, line - t / 2 - 0.002, line + t / 2 + 0.002, y0, y1, u0, u1, m.brass, { cast: false });
    else kit.block(p, u0, u1, y0, y1, line - t / 2 - 0.002, line + t / 2 + 0.002, m.brass, { cast: false });
  };
  const size = 0.19;
  for (let y = 0; y <= h + 0.001; y += size) joint(a0, a1, y, y + 0.005);
  for (let u = a0; u <= a1 + 0.001; u += size) joint(u, u + 0.005, 0, h);
  kit.planBox(along === 'z' ? line - t / 2 : a0, along === 'z' ? a0 : line - t / 2, along === 'z' ? line + t / 2 : a1, along === 'z' ? a1 : line + t / 2, { round: 0 });
}

/**
 * Headboard feature wall from the renders: white lacquer panels between
 * dark timber panels, with a black twin sconce on each side.
 * Origin: wall face, centre; faces +Z. w = width of the white section.
 */
export function headboardWall(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 1.5) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 0, 2.5, 0, 0.03, m.trim);
    for (let i = 1; i < 3; i++) {
      const sx = -w / 2 + (i * w) / 3;
      kit.block(g, sx - 0.004, sx + 0.004, 0, 2.5, 0.03, 0.034, m.doorDark, { cast: false });
    }
    kit.block(g, -w / 2 - 0.48, -w / 2, 0, 2.5, 0, 0.035, m.darkWood);
    kit.block(g, w / 2, w / 2 + 0.48, 0, 2.5, 0, 0.035, m.darkWood);
    sconce(kit, g, 'x', 0.035, 1, -w / 2 - 0.24, 1.45);
    sconce(kit, g, 'x', 0.035, 1, w / 2 + 0.24, 1.45);
  });
}

/** Lit open niche shelves in taupe (bathrooms). Origin: wall face, centre; faces +Z. */
export function nicheShelves(kit: Kit, p: Parent, x: number, z: number, rot: number, w = 0.52) {
  const m = kit.m;
  kit.place(p, x, z, rot, (g) => {
    kit.block(g, -w / 2, w / 2, 1.3, 2.15, 0, 0.24, m.taupe);
    for (const y of [1.55, 1.85]) {
      kit.block(g, -w / 2 + 0.02, w / 2 - 0.02, y - 0.015, y, 0.02, 0.24, m.taupe);
      kit.block(g, -w / 2 + 0.04, w / 2 - 0.04, y - 0.025, y - 0.017, 0.18, 0.22, m.ledStrip, { cast: false });
    }
    kit.cyl(g, 0.03, 0.03, 0.16, m.screen, -0.12, 1.63, 0.12, { segments: 12 });
    kit.cyl(g, 0.03, 0.03, 0.18, m.screen, -0.02, 1.64, 0.12, { segments: 12 });
    kit.plant(g, 0.12, 1.85, 0.12, 'snake', 0.22, 33, m.glass);
  });
}
