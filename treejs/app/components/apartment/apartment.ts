import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { Kit, WALL_H } from './kit';
import { FLOOR_TILE, BATH_TILE, SPLASH_TILE } from './textures';

// ============================================================
// APARTMENT MODEL
// Measured from public/floorplan.png (≈ 1 px = 13.7 mm).
// Plan axes: X west → east, Z north → south. Interior 6.5 × 6.6 m.
//
//   Bedroom   X 0.00–4.04  Z 0.00–3.09   (bed against the north wall)
//   Bathroom  X 4.16–6.50  Z 0.00–1.94
//   Hall      X 4.16–6.50  Z 2.06–3.09
//   Living    X 0.00–6.50  Z 3.21–6.60   (kitchen in the south-east)
//   Balconies X -1.50–-0.20 along the west glazing, split at Z 3.2
// ============================================================

export const APARTMENT_CENTER = new THREE.Vector3(2.6, 0, 3.3);

const EXT = 0.2; // exterior wall thickness
const INT = 0.12; // interior wall thickness

export function buildApartment(kit: Kit) {
  const root = new THREE.Group();
  root.name = 'apartment';

  structure(kit, root);
  living(kit, root);
  kitchen(kit, root);
  bedroom(kit, root);
  bathroom(kit, root);
  hall(kit, root);
  balconies(kit, root);
  contactShadows(kit, root);

  // Everything inside is static: compute matrices once. The root stays
  // dynamic so the intro can extrude the model out of the paper plan.
  root.traverse((o) => {
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
  root.matrixAutoUpdate = true;
  root.updateMatrixWorld(true);
  return root;
}

// ------------------------------------------------------------
// Soft contact shadows under furniture (static ambient occlusion)
// ------------------------------------------------------------
function contactShadows(kit: Kit, root: THREE.Group) {
  const rect: [number, number, number, number, number][] = [
    // living
    [0.25, 3.0, 5.7, 6.58, 0.55], [0.25, 1.12, 4.8, 5.7, 0.55], [0.35, 2.85, 3.21, 3.6, 0.22],
    // kitchen
    [4.65, 6.5, 6.0, 6.6, 0.4], [5.9, 6.5, 4.6, 6.0, 0.4], [4.2, 4.88, 4.22, 5.48, 0.5],
    // bedroom
    [1.0, 2.84, 0.0, 2.25, 0.55], [0.5, 0.94, 0.06, 0.46, 0.45], [2.9, 3.34, 0.06, 0.46, 0.45],
    [3.48, 4.04, 0.04, 2.0, 0.45], [1.35, 2.5, 2.34, 2.66, 0.4],
    // bathroom
    [4.16, 4.66, 0.85, 1.65, 0.28], [5.1, 5.75, 0.0, 0.18, 0.4], [5.85, 6.48, 0.04, 0.55, 0.4],
    // balconies
    [-1.06, -0.64, 0.68, 1.08, 0.35], [-1.06, -0.64, 1.82, 2.22, 0.35], [-1.3, -0.45, 4.55, 5.35, 0.45],
  ];
  for (const [x0, x1, z0, z1, k] of rect) kit.contactShadow(root, x0, x1, z0, z1, k);

  const round: [number, number, number, number][] = [
    // [x, z, radius, strength]
    [2.05, 4.65, 0.55, 0.5], [3.25, 3.5, 0.24, 0.45], [3.3, 6.3, 0.16, 0.45], [0.62, 4.42, 0.17, 0.4],
    [3.97, 4.55, 0.19, 0.4], [3.97, 5.15, 0.19, 0.4], [0.4, 1.15, 0.17, 0.4], [5.43, 0.44, 0.22, 0.4],
    [-0.85, 1.45, 0.3, 0.45], [-0.8, 0.2, 0.2, 0.45], [-0.45, 2.75, 0.15, 0.45], [-0.8, 6.45, 0.2, 0.45],
    [-0.5, 3.6, 0.18, 0.45],
  ];
  for (const [x, z, r, k] of round) kit.contactShadow(root, x - r, x + r, z - r, z + r, k, true);
}

// ------------------------------------------------------------
// Shell: slab, floors, walls, glazing, ceiling, doors
// ------------------------------------------------------------
function structure(kit: Kit, root: THREE.Group) {
  const m = kit.m;

  kit.block(root, -1.5, 6.7, -0.3, -0.002, -0.2, 6.8, m.concrete);
  kit.floor(root, 0, 6.5, 0, 6.6, 0, m.oakFloor, FLOOR_TILE);
  kit.floor(root, 4.16, 6.5, 0, 1.94, 0.002, m.bathTile, BATH_TILE);
  kit.floor(root, -1.5, -0.2, -0.2, 6.8, 0, m.deck, 1.6);

  // Exterior walls
  kit.wall(root, 'x', -EXT / 2, EXT, -EXT, 6.5 + EXT); // north
  kit.wall(root, 'x', 6.6 + EXT / 2, EXT, -EXT, 6.5 + EXT); // south
  kit.wall(root, 'z', 6.5 + EXT / 2, EXT, 0, 6.6, [{ a: 3.45, b: 4.35, top: 2.1 }]); // east, entry door
  kit.wall(root, 'z', -EXT / 2, EXT, 0, 6.6, [ // west, full-height glazing
    { a: 0.3, b: 3.0, top: 2.4 },
    { a: 3.4, b: 6.3, top: 2.4 },
  ]);
  kit.glazingZ(root, -EXT / 2, 0.3, 3.0, 2.4, 3, 2); // bedroom, south panel slid open
  kit.glazingZ(root, -EXT / 2, 3.4, 6.3, 2.4, 3, 0); // living, north panel slid open

  // Interior walls
  kit.wall(root, 'x', 3.15, INT, 0, 6.5, [{ a: 4.4, b: 5.4, top: 2.3 }]); // living | bedroom + hall
  kit.wall(root, 'z', 4.1, INT, 0, 3.09, [{ a: 2.2, b: 3.0, top: 2.1 }]); // bedroom | bath + hall
  kit.wall(root, 'x', 2.0, INT, 4.16, 6.5, [{ a: 4.85, b: 5.6, top: 2.1 }]); // bath | hall (pocket door)
  kit.doorTrim(root, 'x', 3.15, INT, 4.4, 5.4, 2.3);
  kit.doorTrim(root, 'z', 4.1, INT, 2.2, 3.0, 2.1);
  kit.doorTrim(root, 'x', 2.0, INT, 4.85, 5.6, 2.1);
  kit.doorTrim(root, 'z', 6.5 + EXT / 2, EXT, 3.45, 4.35, 2.1);

  // Ceiling faces down only: invisible from above (dollhouse view),
  // but it still casts the roof shadow so sunlight enters via the glazing.
  kit.floor(root, 0, 6.5, 0, 6.6, WALL_H, m.ceiling, 4, { down: true, cast: true, name: 'ceiling' });

  // Bedroom door, hinged on the south jamb and folded back towards the partition
  kit.block(root, 3.26, 4.03, 0.01, 2.08, 2.94, 2.98, m.trim);
  for (const z of [2.925, 2.995]) {
    kit.block(root, 3.3, 3.42, 0.99, 1.01, z - 0.008, z + 0.008, m.blackMetal);
  }

  // Entry door (closed)
  kit.block(root, 6.52, 6.56, 0, 2.08, 3.47, 4.33, m.walnut);
  kit.block(root, 6.49, 6.51, 0.99, 1.01, 4.1, 4.24, m.blackMetal);

  // Downlights
  for (const [x, z] of [[1.0, 4.2], [2.6, 4.2], [1.0, 5.7], [2.6, 5.7], [5.3, 6.0], [6.0, 4.0], [5.3, 2.55], [5.2, 1.0], [6.1, 1.3]]) {
    kit.downlight(root, x, z);
  }
}

// ------------------------------------------------------------
// Living room
// ------------------------------------------------------------
function living(kit: Kit, root: THREE.Group) {
  const m = kit.m;

  kit.rblock(root, 0.6, 3.3, 0, 0.012, 3.95, 6.0, 0.005, m.rugLiving, { cast: false });

  // L-shaped sofa, back to the south wall, chaise along the glazing
  const S = m.sofa;
  kit.block(root, 0.25, 3.0, 0.06, 0.24, 5.72, 6.55, S);
  kit.block(root, 0.25, 1.12, 0.06, 0.24, 4.8, 5.72, S);
  for (const [x, z] of [[0.3, 4.85], [1.07, 4.85], [0.3, 6.5], [2.95, 6.5], [2.95, 5.77]]) {
    kit.block(root, x - 0.03, x + 0.03, 0, 0.06, z - 0.03, z + 0.03, m.blackMetal);
  }
  kit.rblock(root, 0.25, 3.0, 0.06, 0.76, 6.42, 6.58, 0.05, S); // back
  kit.rblock(root, 2.8, 3.0, 0.06, 0.6, 5.7, 6.58, 0.06, S); // right arm
  kit.rblock(root, 0.25, 0.42, 0.06, 0.6, 4.8, 6.58, 0.06, S); // left arm
  kit.rblock(root, 0.42, 1.12, 0.24, 0.46, 4.82, 6.4, 0.07, S); // chaise cushion
  kit.rblock(root, 1.13, 1.96, 0.24, 0.46, 5.74, 6.4, 0.07, S);
  kit.rblock(root, 1.97, 2.79, 0.24, 0.46, 5.74, 6.4, 0.07, S);
  for (const [a, b] of [[0.42, 1.12], [1.13, 1.96], [1.97, 2.79]]) {
    kit.rbox(root, b - a, 0.44, 0.2, 0.08, S, (a + b) / 2, 0.67, 6.3, { rotX: 0.15 });
  }
  kit.rbox(root, 0.44, 0.44, 0.13, 0.06, m.pillowSage, 0.75, 0.66, 6.1, { rotX: 0.3, rotY: 0.2 });
  kit.rbox(root, 0.42, 0.42, 0.13, 0.06, m.pillowCream, 1.62, 0.66, 6.1, { rotX: 0.3, rotY: -0.1 });
  kit.rbox(root, 0.44, 0.44, 0.13, 0.06, m.pillowRust, 2.5, 0.66, 6.1, { rotX: 0.3, rotY: 0.15 });
  kit.rblock(root, 0.48, 1.06, 0.46, 0.49, 4.95, 5.4, 0.012, m.throwRust);

  // Oval coffee table
  const top = kit.cyl(root, 0.65, 0.65, 0.035, m.oak, 2.05, 0.4, 4.65, { segments: 64 });
  top.scale.z = 0.55;
  const base = kit.cyl(root, 0.42, 0.42, 0.38, m.walnut, 2.05, 0.19, 4.65, { segments: 48 });
  base.scale.z = 0.5;
  kit.block(root, 1.7, 1.98, 0.4175, 0.445, 4.52, 4.72, m.bookD);
  kit.block(root, 1.72, 1.95, 0.445, 0.47, 4.54, 4.7, m.bookB);
  kit.lathe(root, 'vase', [[0, 0], [0.05, 0], [0.07, 0.06], [0.05, 0.16], [0.03, 0.2], [0.035, 0.22], [0, 0.22]], m.ceramic, 2.42, 0.4175, 4.7);

  // Floating media unit + TV on the partition wall
  kit.block(root, 0.35, 2.85, 0.22, 0.6, 3.21, 3.6, m.walnut);
  for (let i = 0; i < 4; i++) {
    const a = 0.35 + i * 0.625;
    kit.block(root, a + 0.004, a + 0.621, 0.224, 0.596, 3.6, 3.612, m.walnut);
  }
  kit.rblock(root, 0.88, 2.33, 0.93, 1.75, 3.215, 3.245, 0.01, m.screen);
  kit.block(root, 0.55, 0.85, 0.6, 0.64, 3.3, 3.5, m.bookC);
  kit.block(root, 0.57, 0.83, 0.64, 0.67, 3.32, 3.48, m.bookA);
  kit.plant(root, 2.6, 0.6, 3.42, 'bush', 0.26, 4, m.potStone);

  // Plants
  kit.plant(root, 3.25, 0, 3.5, 'fiddle', 1.35, 7);
  kit.plant(root, 3.3, 0, 6.3, 'snake', 0.9, 12, m.potBlack);

  // Arc floor lamp over the coffee table
  kit.cyl(root, 0.17, 0.17, 0.04, m.quartz, 0.62, 0.02, 4.42);
  kit.tube(root, new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.62, 0.04, 4.42), new THREE.Vector3(0.7, 2.4, 4.5), new THREE.Vector3(1.75, 1.9, 4.62),
  ), 0.012, m.brass);
  kit.dome(root, 0.17, m.pendant, 1.75, 1.72, 4.62);
  kit.sphere(root, 0.04, m.bulb, 1.75, 1.74, 4.62, undefined, { cast: false });
  kit.pointLight(root, 1.75, 1.6, 4.62, '#ffc98a', 1.2, true);

  // Art above the sofa
  kit.art(root, 'x', 6.6, -1, 1.6, 1.58, 1.1, 0.75, m.artA, m.oak);

  // Sheer curtains drawn back at the glazing
  kit.curtain(root, 0.09, 5.88, 6.28, 2.38);

  kit.pointLight(root, 1.8, 2.0, 4.9, '#ffd6a5', 3.5);
}

// ------------------------------------------------------------
// Kitchen (south-east corner) + breakfast bar
// ------------------------------------------------------------
function kitchen(kit: Kit, root: THREE.Group) {
  const m = kit.m;

  // South run: X 4.65–6.5, Z 6.0–6.6
  kit.block(root, 4.7, 6.5, 0, 0.1, 6.08, 6.6, m.sageDark);
  kit.block(root, 4.65, 6.5, 0.1, 0.88, 6.02, 6.6, m.sage);
  const southFronts: [number, number, number, number][] = [
    [4.66, 5.06, 0.11, 0.87], [5.08, 5.48, 0.11, 0.48], [5.08, 5.48, 0.5, 0.87], [5.5, 5.88, 0.11, 0.87],
  ];
  for (const [x0, x1, y0, y1] of southFronts) {
    kit.block(root, x0, x1, y0, y1, 6.0, 6.02, m.sage);
    kit.block(root, x0 + 0.08, x1 - 0.08, y1 - 0.06, y1 - 0.045, 5.985, 6.0, m.brass, { cast: false });
  }
  kit.block(root, 4.63, 6.5, 0.88, 0.92, 5.98, 6.6, m.quartz);

  // East run: X 5.9–6.5, Z 5.25–6.0
  kit.block(root, 5.98, 6.5, 0, 0.1, 5.25, 6.0, m.sageDark);
  kit.block(root, 5.92, 6.5, 0.1, 0.88, 5.25, 6.02, m.sage);
  kit.block(root, 5.9, 5.92, 0.11, 0.87, 5.27, 5.98, m.sage);
  kit.block(root, 5.885, 5.9, 0.81, 0.825, 5.4, 5.85, m.brass, { cast: false });
  kit.block(root, 5.88, 6.5, 0.88, 0.92, 5.25, 5.98, m.quartz);

  // Integrated fridge-freezer column
  kit.block(root, 5.92, 6.5, 0, 2.25, 4.6, 5.25, m.sage);
  kit.block(root, 5.9, 5.92, 0.02, 1.4, 4.62, 5.235, m.sage);
  kit.block(root, 5.9, 5.92, 1.42, 2.23, 4.62, 5.235, m.sage);
  kit.block(root, 5.88, 5.9, 0.95, 1.35, 4.66, 4.68, m.brass, { cast: false });
  kit.block(root, 5.88, 5.9, 1.47, 1.8, 4.66, 4.68, m.brass, { cast: false });

  // Wall cabinets with under-cabinet LED
  kit.block(root, 4.65, 5.88, 1.5, 2.25, 6.25, 6.6, m.sage);
  kit.block(root, 4.66, 5.26, 1.51, 2.24, 6.23, 6.25, m.sage);
  kit.block(root, 5.28, 5.87, 1.51, 2.24, 6.23, 6.25, m.sage);
  kit.block(root, 4.7, 5.83, 1.49, 1.5, 6.3, 6.34, m.ledStrip, { cast: false });

  // Backsplash
  kit.panel(root, 'x', 4.65, 6.5, 0.92, 1.5, 6.598, -1, m.backsplash, SPLASH_TILE);
  kit.panel(root, 'z', 5.25, 6.6, 0.92, 1.5, 6.498, -1, m.backsplash, SPLASH_TILE);

  // Open shelf with jars
  kit.block(root, 6.22, 6.5, 1.55, 1.58, 5.3, 5.95, m.oak);
  for (const [z, h] of [[5.4, 0.16], [5.55, 0.12], [5.7, 0.2]]) {
    kit.cyl(root, 0.045, 0.045, h, m.glass, 6.38, 1.58 + h / 2, z, { noAO: true, cast: false });
  }

  // Induction hob
  kit.block(root, 4.9, 5.48, 0.92, 0.926, 6.05, 6.5, m.cooktop);
  for (const [x, z] of [[5.05, 6.16], [5.33, 6.16], [5.05, 6.39], [5.33, 6.39]]) {
    kit.torus(root, 0.08, 0.003, m.cooktopRing, x, 0.927, z, Math.PI * 2, { rotX: Math.PI / 2, cast: false });
  }

  // Sink + arched brass tap
  kit.block(root, 5.95, 6.4, 0.92, 0.923, 6.08, 6.45, m.steelDark, { cast: false });
  kit.cyl(root, 0.015, 0.018, 0.3, m.brass, 6.17, 1.07, 6.52, { segments: 16 });
  kit.torus(root, 0.1, 0.012, m.brass, 6.17, 1.22, 6.42, Math.PI, { rotY: Math.PI / 2 });

  // Countertop props
  kit.lathe(root, 'kettle', [[0, 0], [0.09, 0], [0.1, 0.08], [0.085, 0.17], [0.03, 0.2], [0, 0.2]], m.appliance, 5.66, 0.92, 6.35);
  kit.rblock(root, 5.55, 5.85, 0.92, 0.94, 6.08, 6.32, 0.008, m.oak);
  kit.plant(root, 6.3, 0.92, 5.45, 'bush', 0.22, 17, m.potTerracotta);

  // Breakfast bar
  kit.block(root, 4.37, 4.8, 0, 0.1, 4.3, 5.4, m.sageDark);
  kit.block(root, 4.32, 4.85, 0.1, 0.9, 4.27, 5.43, m.sage);
  kit.block(root, 4.85, 4.87, 0.11, 0.89, 4.29, 4.84, m.sage);
  kit.block(root, 4.85, 4.87, 0.11, 0.89, 4.86, 5.41, m.sage);
  kit.block(root, 4.12, 4.88, 0.9, 0.94, 4.22, 5.48, m.quartz);
  kit.lathe(root, 'bowl', [[0, 0], [0.06, 0], [0.12, 0.05], [0.13, 0.07], [0, 0.03]], m.ceramic, 4.55, 0.94, 5.0);
  for (const [dx, dz] of [[0, 0], [0.06, 0.04], [-0.04, 0.05]]) {
    kit.sphere(root, 0.035, m.fruit, 4.55 + dx, 0.99, 5.0 + dz);
  }

  // Counter stools
  for (const z of [4.55, 5.15]) {
    kit.cyl(root, 0.18, 0.17, 0.04, m.oak, 3.97, 0.66, z);
    for (const [dx, dz] of [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]]) {
      kit.cyl(root, 0.012, 0.012, 0.64, m.blackMetal, 3.97 + dx, 0.32, z + dz, { segments: 8 });
    }
    kit.torus(root, 0.155, 0.008, m.blackMetal, 3.97, 0.25, z, Math.PI * 2, { rotX: Math.PI / 2 });
  }

  // Brass pendants over the bar
  for (const z of [4.6, 5.1]) {
    kit.cyl(root, 0.004, 0.004, 0.62, m.blackMetal, 4.5, 2.39, z, { segments: 6, cast: false });
    kit.dome(root, 0.13, m.pendant, 4.5, 1.95, z);
    kit.sphere(root, 0.035, m.bulb, 4.5, 1.97, z, undefined, { cast: false });
  }
  kit.pointLight(root, 4.5, 1.85, 4.85, '#ffc98a', 1.5, true);
  kit.pointLight(root, 5.3, 2.0, 5.2, '#ffe0bd', 3);
}

// ------------------------------------------------------------
// Bedroom
// ------------------------------------------------------------
function bedroom(kit: Kit, root: THREE.Group) {
  const m = kit.m;

  kit.rblock(root, 0.7, 3.15, 0, 0.012, 1.25, 2.95, 0.005, m.rugBedroom, { cast: false });

  // Queen bed, headboard on the north wall
  kit.rblock(root, 1.0, 2.84, 0, 1.15, 0, 0.12, 0.05, m.headboard);
  kit.rblock(root, 1.08, 2.76, 0.08, 0.32, 0.12, 2.22, 0.03, m.headboard);
  kit.rblock(root, 1.12, 2.72, 0.32, 0.56, 0.14, 2.18, 0.06, m.linen);
  kit.rblock(root, 1.08, 2.76, 0.4, 0.62, 0.78, 2.24, 0.06, m.duvet);
  kit.rblock(root, 1.08, 2.76, 0.6, 0.67, 0.78, 1.02, 0.03, m.duvet);
  kit.rbox(root, 0.66, 0.16, 0.42, 0.07, m.linen, 1.5, 0.64, 0.38);
  kit.rbox(root, 0.66, 0.16, 0.42, 0.07, m.linen, 2.34, 0.64, 0.38);
  kit.rbox(root, 0.5, 0.42, 0.12, 0.06, m.pillowSage, 1.62, 0.84, 0.66, { rotX: -0.35 });
  kit.rbox(root, 0.48, 0.4, 0.12, 0.06, m.pillowRust, 2.22, 0.83, 0.68, { rotX: -0.35, rotY: 0.1 });
  kit.rblock(root, 1.06, 2.78, 0.62, 0.65, 1.75, 2.08, 0.012, m.throwRust);
  kit.rblock(root, 1.06, 2.78, 0.3, 0.65, 2.22, 2.25, 0.012, m.throwRust);

  // Bench at the foot of the bed
  kit.rblock(root, 1.35, 2.5, 0.06, 0.45, 2.34, 2.66, 0.04, m.headboard);
  for (const x of [1.4, 2.45]) for (const z of [2.38, 2.62]) kit.block(root, x - 0.015, x + 0.015, 0, 0.06, z - 0.015, z + 0.015, m.blackMetal);

  // Nightstands with lamps
  for (const x of [0.72, 3.12]) {
    kit.rblock(root, x - 0.22, x + 0.22, 0, 0.52, 0.06, 0.46, 0.01, m.oak);
    kit.block(root, x - 0.2, x + 0.2, 0.3, 0.302, 0.46, 0.465, m.walnut);
    kit.sphere(root, 0.012, m.brass, x, 0.4, 0.47);
    kit.tableLamp(root, x, 0.52, 0.24);
  }
  kit.block(root, 0.58, 0.8, 0.52, 0.55, 0.15, 0.32, m.bookC);

  // Wardrobe against the bathroom wall
  kit.block(root, 3.48, 4.04, 0, 2.4, 0.04, 2.0, m.trim);
  for (const [z0, z1] of [[0.05, 0.69], [0.7, 1.34], [1.35, 1.99]]) {
    kit.block(root, 3.46, 3.48, 0.02, 2.38, z0, z1, m.oak);
    kit.block(root, 3.44, 3.46, 0.95, 1.45, z1 - 0.06, z1 - 0.045, m.blackMetal, { cast: false });
  }

  // Art pair above the headboard
  kit.art(root, 'x', 0, 1, 1.5, 1.68, 0.5, 0.65, m.artB, m.oak);
  kit.art(root, 'x', 0, 1, 2.34, 1.68, 0.5, 0.65, m.artC, m.oak);

  kit.plant(root, 0.4, 0, 1.15, 'bush', 0.6, 21, m.potStone);
  kit.curtain(root, 0.09, 0.32, 0.75, 2.38);

  // Flush ceiling light
  kit.sphere(root, 0.22, m.lampShade, 1.92, WALL_H, 1.5, [1, 0.22, 1], { cast: false });
  kit.pointLight(root, 1.92, 2.0, 1.8, '#ffd6a5', 3);
}

// ------------------------------------------------------------
// Bathroom
// ------------------------------------------------------------
function bathroom(kit: Kit, root: THREE.Group) {
  const m = kit.m;
  const T = m.bathTile;

  // Wall tiling to 2.2 m
  kit.panel(root, 'x', 4.16, 6.5, 0, 2.2, 0.002, 1, T, BATH_TILE);
  kit.panel(root, 'z', 0, 1.94, 0, 2.2, 6.498, -1, T, BATH_TILE);
  kit.panel(root, 'z', 0, 1.94, 0, 2.2, 4.162, 1, T, BATH_TILE);
  kit.panel(root, 'x', 4.16, 4.79, 0, 2.2, 1.938, -1, T, BATH_TILE);
  kit.panel(root, 'x', 5.66, 6.5, 0, 2.2, 1.938, -1, T, BATH_TILE);

  // Wall-hung WC with concealed cistern
  kit.block(root, 5.1, 5.75, 0, 1.1, 0.0, 0.18, m.sage);
  kit.block(root, 5.08, 5.77, 1.1, 1.13, 0.0, 0.2, m.quartz);
  kit.rblock(root, 5.33, 5.53, 0.86, 1.0, 0.18, 0.19, 0.008, m.ceramic);
  kit.sphere(root, 0.2, m.ceramic, 5.43, 0.38, 0.44, [0.9, 0.55, 1.3]);
  kit.rbox(root, 0.36, 0.03, 0.46, 0.012, m.ceramic, 5.43, 0.5, 0.45);

  // Floating oak vanity, vessel basin, round backlit mirror
  kit.block(root, 4.17, 4.66, 0.45, 0.83, 0.85, 1.65, m.oak);
  kit.block(root, 4.16, 4.68, 0.83, 0.86, 0.83, 1.67, m.quartz);
  kit.lathe(root, 'basin', [[0, 0], [0.12, 0.005], [0.17, 0.04], [0.19, 0.1], [0.18, 0.12], [0.17, 0.11], [0.165, 0.05], [0, 0.035]], m.ceramic, 4.43, 0.86, 1.22);
  kit.cyl(root, 0.012, 0.012, 0.18, m.blackMetal, 4.25, 1.08, 1.22, { rotZ: Math.PI / 2, segments: 12 });
  kit.torus(root, 0.36, 0.014, m.mirrorGlow, 4.168, 1.62, 1.22, Math.PI * 2, { rotY: Math.PI / 2, cast: false });
  kit.cyl(root, 0.355, 0.355, 0.01, m.trim, 4.169, 1.62, 1.22, { rotZ: Math.PI / 2, segments: 64, cast: false });
  // Real planar reflection; only re-renders while it faces the camera
  const res = 1024;
  const mirror = new Reflector(new THREE.CircleGeometry(0.35, 64), {
    textureWidth: res, textureHeight: res, color: 0xe6e6e6, clipBias: 0.003, multisample: kit.lowTier ? 0 : 4,
  });
  mirror.position.set(4.176, 1.62, 1.22);
  mirror.rotation.y = Math.PI / 2;
  root.add(mirror);
  kit.noAO.push(mirror);
  kit.disposables.push(mirror);
  kit.plant(root, 4.3, 0.86, 1.56, 'snake', 0.3, 33, m.potStone);

  // Towel rail by the door
  kit.block(root, 4.3, 4.75, 1.2, 1.215, 1.885, 1.9, m.blackMetal);
  kit.rblock(root, 4.34, 4.71, 0.78, 1.22, 1.87, 1.9, 0.01, m.towel);

  // Walk-in shower
  kit.block(root, 5.745, 5.755, 0.0, 2.0, 0.68, 1.3, m.glass, { cast: false, receive: false, noAO: true });
  kit.block(root, 5.74, 5.76, 1.98, 2.0, 0.68, 1.3, m.blackMetal);
  kit.block(root, 5.74, 5.76, 0, 2.0, 0.66, 0.69, m.blackMetal);
  kit.cyl(root, 0.15, 0.15, 0.012, m.blackMetal, 6.15, 2.25, 1.3);
  kit.block(root, 6.15, 6.5, 2.265, 2.285, 1.29, 1.31, m.blackMetal);
  kit.cyl(root, 0.06, 0.06, 0.02, m.blackMetal, 6.49, 1.1, 1.3, { rotZ: Math.PI / 2 });
  kit.block(root, 5.85, 6.4, 0.003, 0.006, 1.84, 1.88, m.steelDark, { cast: false });

  // Open oak shelving with folded towels
  kit.block(root, 5.85, 5.87, 0, 1.6, 0.04, 0.55, m.oak);
  kit.block(root, 6.46, 6.48, 0, 1.6, 0.04, 0.55, m.oak);
  for (const y of [0.05, 0.55, 1.05, 1.58]) kit.block(root, 5.87, 6.46, y - 0.02, y, 0.04, 0.55, m.oak);
  kit.rblock(root, 5.95, 6.38, 0.55, 0.7, 0.12, 0.45, 0.03, m.towel);
  kit.rblock(root, 5.95, 6.38, 1.05, 1.18, 0.12, 0.45, 0.03, m.towel);
  kit.lathe(root, 'basket', [[0, 0], [0.16, 0], [0.18, 0.22], [0.17, 0.22], [0.15, 0.02], [0, 0.02]], m.potTerracotta, 6.16, 0.05, 0.3);

  kit.pointLight(root, 5.2, 2.0, 1.0, '#fff0de', 2.5);
}

// ------------------------------------------------------------
// Hall + entry
// ------------------------------------------------------------
function hall(kit: Kit, root: THREE.Group) {
  const m = kit.m;
  kit.art(root, 'z', 6.5, -1, 2.57, 1.5, 0.5, 0.65, m.artA, m.blackMetal);
  kit.rblock(root, 6.0, 6.45, 0, 0.012, 3.55, 4.25, 0.005, m.rugBedroom, { cast: false });
  kit.pointLight(root, 5.3, 2.0, 2.6, '#ffd6a5', 1.2, true);
}

// ------------------------------------------------------------
// Balconies along the west glazing
// ------------------------------------------------------------
function balconies(kit: Kit, root: THREE.Group) {
  const m = kit.m;
  const glass = { cast: false, receive: false, noAO: true };

  // Frameless glass balustrade with a slim top rail
  kit.block(root, -1.48, -1.465, 0.05, 1.02, -0.18, 6.78, m.glass, glass);
  kit.block(root, -1.5, -1.44, 1.02, 1.06, -0.2, 6.8, m.frameMetal);
  kit.block(root, -1.5, -1.44, 0, 0.06, -0.2, 6.8, m.frameMetal);
  for (const z of [-0.185, 6.785]) {
    kit.block(root, -1.44, -0.2, 0.05, 1.02, z - 0.007, z + 0.007, m.glass, glass);
    kit.block(root, -1.44, -0.2, 1.02, 1.06, z - 0.02, z + 0.02, m.frameMetal);
  }

  // Slatted privacy screen between the two balconies
  for (let x = -1.42; x < -0.22; x += 0.075) kit.block(root, x, x + 0.04, 0, 1.9, 3.17, 3.23, m.oak);
  kit.block(root, -1.44, -0.2, 1.9, 1.94, 3.16, 3.24, m.frameMetal);

  // Bedroom balcony: bistro set
  kit.cyl(root, 0.3, 0.3, 0.025, m.oak, -0.85, 0.72, 1.45);
  kit.cyl(root, 0.02, 0.02, 0.7, m.blackMetal, -0.85, 0.36, 1.45, { segments: 12 });
  kit.cyl(root, 0.2, 0.2, 0.015, m.blackMetal, -0.85, 0.008, 1.45);
  for (const [z, rot] of [[0.88, 0], [2.02, Math.PI]] as [number, number][]) {
    const chair = new THREE.Group();
    chair.position.set(-0.85, 0, z);
    chair.rotation.y = rot;
    kit.rblock(chair, -0.21, 0.21, 0.44, 0.47, -0.2, 0.2, 0.01, m.oak);
    kit.rbox(chair, 0.42, 0.3, 0.025, 0.01, m.oak, 0, 0.75, -0.21, { rotX: -0.12 });
    for (const [dx, dz] of [[0.18, 0.17], [-0.18, 0.17], [0.18, -0.19], [-0.18, -0.19]]) {
      kit.cyl(chair, 0.011, 0.011, dz < 0 ? 0.9 : 0.45, m.blackMetal, dx, dz < 0 ? 0.45 : 0.225, dz, { segments: 8 });
    }
    root.add(chair);
  }
  kit.plant(root, -0.8, 0, 0.2, 'bush', 0.75, 41, m.potStone);
  kit.plant(root, -0.45, 0, 2.75, 'snake', 0.8, 43, m.potBlack);

  // Living balcony: lounge chair
  kit.block(root, -1.3, -0.45, 0.12, 0.18, 4.55, 5.35, m.walnut);
  for (const [x, z] of [[-1.25, 4.6], [-0.5, 4.6], [-1.25, 5.3], [-0.5, 5.3]]) kit.block(root, x - 0.025, x + 0.025, 0, 0.12, z - 0.025, z + 0.025, m.walnut);
  kit.rblock(root, -1.28, -0.47, 0.18, 0.32, 4.57, 5.33, 0.05, m.pillowCream);
  kit.rbox(root, 0.8, 0.5, 0.12, 0.05, m.pillowCream, -0.875, 0.5, 5.36, { rotX: 0.4 });
  kit.plant(root, -0.8, 0, 6.45, 'bush', 0.75, 44, m.potStone);
  kit.plant(root, -0.5, 0, 3.6, 'fiddle', 0.9, 45, m.potTerracotta);
}
