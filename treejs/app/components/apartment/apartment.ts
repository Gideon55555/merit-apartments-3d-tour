import * as THREE from 'three';
import { Kit, WALL_H } from './kit';
import { PLANT_MODEL, FACE, coffeeTable, wardrobe, stool, toilet, vanity, shower, chandelier, sconce, slats, glassBlocks } from './furniture';
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
    [1.0, 2.84, 0.0, 2.25, 0.55], [0.5, 0.94, 0.06, 0.46, 0.25], [2.9, 3.34, 0.06, 0.46, 0.25],
    // living: media unit, shelving
    [2.95, 3.5, 3.21, 3.6, 0.4],
    // balconies
    [-1.06, -0.64, 0.68, 1.08, 0.35], [-1.06, -0.64, 1.82, 2.22, 0.35], [-1.3, -0.45, 4.55, 5.35, 0.45],
  ];
  for (const [x0, x1, z0, z1, k] of rect) kit.contactShadow(root, x0, x1, z0, z1, k);

  const round: [number, number, number, number][] = [
    // [x, z, radius, strength]
    [3.3, 6.3, 0.22, 0.45], [0.4, 1.15, 0.17, 0.4],
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
  kit.floor(root, 4.16, 6.5, 0, 1.94, 0.002, m.oakFloor, FLOOR_TILE);
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
  kit.block(root, 3.26, 4.03, 0.01, 2.08, 2.94, 2.98, m.doorDark);
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

  // Wall-to-wall-style carpet under the seating
  kit.rblock(root, 0.45, 3.4, 0, 0.012, 3.9, 6.45, 0.005, m.rugLiving, { cast: false });

  // Curved-edge cream L-sofa, back to the south wall, chaise along the glazing
  const S = m.sofa;
  // Upholstered plinth, set just above the floor
  kit.cushionBlock(root, 0.25, 3.0, 0.04, 0.26, 5.72, 6.56, 0.06, S, { puff: 0.008 });
  kit.cushionBlock(root, 0.25, 1.12, 0.04, 0.26, 4.8, 5.74, 0.06, S, { puff: 0.008 });
  // Back and arms
  kit.cushionBlock(root, 0.25, 3.0, 0.04, 0.8, 6.38, 6.58, 0.09, S, { puff: 0.012 });
  kit.cushionBlock(root, 2.78, 3.0, 0.04, 0.62, 5.7, 6.58, 0.1, S, { puff: 0.015 });
  kit.cushionBlock(root, 0.25, 0.45, 0.04, 0.62, 4.8, 6.58, 0.1, S, { puff: 0.015 });
  // Plush seat cushions
  kit.cushionBlock(root, 0.45, 1.12, 0.25, 0.48, 4.82, 6.38, 0.08, S, { puff: 0.04 });
  kit.cushionBlock(root, 1.13, 1.955, 0.25, 0.48, 5.74, 6.38, 0.08, S, { puff: 0.04 });
  kit.cushionBlock(root, 1.965, 2.78, 0.25, 0.48, 5.74, 6.38, 0.08, S, { puff: 0.04 });
  // Loose back cushions leaning against the back
  for (const [a, b] of [[0.45, 1.12], [1.13, 1.955], [1.965, 2.78]]) {
    kit.cushion(root, b - a, 0.46, 0.2, 0.09, S, (a + b) / 2, 0.7, 6.27, { rotX: 0.16, puff: 0.03 });
  }
  // Throw pillows
  kit.pillow(root, 0.46, 0.46, 0.17, m.pillowSage, 0.78, 0.7, 6.08, { rotX: 0.32, rotY: 0.18 });
  kit.pillow(root, 0.42, 0.42, 0.16, m.pillowCream, 1.62, 0.69, 6.08, { rotX: 0.3, rotY: -0.1 });
  kit.pillow(root, 0.46, 0.46, 0.17, m.pillowRust, 2.5, 0.7, 6.08, { rotX: 0.32, rotY: 0.15 });
  kit.pillow(root, 0.4, 0.4, 0.15, m.pillowCream, 0.62, 0.66, 5.05, { rotX: -0.25, rotY: Math.PI / 2 + 0.2 });

  coffeeTable(kit, root, 2.05, 4.65, 0, 0.62, 0.36);

  // Marble feature wall: book-matched slabs over a black slatted band
  kit.panel(root, 'x', 0.3, 2.9, 0.95, 2.52, 3.212, 1, m.marbleWall, 1.3);
  for (const x of [1.17, 2.03]) kit.block(root, x - 0.003, x + 0.003, 0.95, 2.52, 3.212, 3.216, m.doorDark, { cast: false });
  slats(kit, root, 'x', 3.21, 1, 0.3, 2.9, 0.58, 0.95);
  // Low black media unit with an LED-lit edge
  kit.block(root, 0.35, 2.85, 0.14, 0.56, 3.21, 3.62, m.doorDark);
  kit.block(root, 0.45, 2.75, 0.115, 0.125, 3.3, 3.58, m.ledStrip, { cast: false });
  kit.rblock(root, 0.88, 2.33, 1.12, 1.94, 3.215, 3.245, 0.01, m.screen);
  kit.block(root, 0.55, 0.85, 0.56, 0.6, 3.3, 3.5, m.bookD);
  kit.block(root, 0.57, 0.83, 0.6, 0.63, 3.32, 3.48, m.bookA);
  kit.tableLamp(root, 2.55, 0.56, 3.42);

  // Tall black shelving with lit shelves
  kit.block(root, 2.95, 2.98, 0, 2.52, 3.21, 3.6, m.doorDark);
  kit.block(root, 3.47, 3.5, 0, 2.52, 3.21, 3.6, m.doorDark);
  kit.block(root, 2.95, 3.5, 0, 2.52, 3.21, 3.23, m.doorDark);
  for (const y of [0.0, 0.55, 1.1, 1.65, 2.2, 2.5]) {
    kit.block(root, 2.98, 3.47, y, y + 0.025, 3.23, 3.6, m.doorDark);
    if (y > 0 && y < 2.5) kit.block(root, 3.0, 3.45, y - 0.012, y - 0.004, 3.5, 3.58, m.ledStrip, { cast: false });
  }
  kit.block(root, 3.02, 3.2, 0.575, 0.82, 3.3, 3.5, m.bookC);
  kit.block(root, 3.22, 3.4, 1.125, 1.3, 3.3, 3.5, m.bookB);
  kit.block(root, 3.05, 3.35, 1.675, 1.72, 3.3, 3.52, m.bookD);
  kit.art(root, 'x', 3.24, 1, 3.22, 2.0, 0.34, 0.6, m.artB, m.doorDark);

  // Glass-block screen beside the shelving (stops short of the walkway)
  glassBlocks(kit, root, 'z', 3.56, 3.62, 3.8, 2.5);

  // Starburst chandelier over the coffee table
  chandelier(kit, root, 1.95, 2.25, 4.75);

  // Palm by the sofa end, heavy linen drapes at both ends of the glazing
  kit.model(root, PLANT_MODEL, 3.3, 0, 6.3, 1.15, 0.6);
  kit.curtain(root, 0.09, 5.88, 6.28, 2.38);
  kit.curtain(root, 0.09, 3.45, 3.82, 2.38);

  // Cove ceiling with hidden LED
  kit.cove(root, 0, 3.21, 6.5, 6.6);

  kit.pointLight(root, 1.8, 2.0, 4.9, '#ffd6a5', 3);
}

// ------------------------------------------------------------
// Kitchen (south-east corner) + breakfast bar
// ------------------------------------------------------------
function kitchen(kit: Kit, root: THREE.Group) {
  const m = kit.m;

  // South run: X 4.65–6.5, Z 6.0–6.6
  kit.block(root, 4.7, 6.5, 0, 0.1, 6.08, 6.6, m.sageDark);
  // Carcass, stepped down under the sink basin
  kit.block(root, 4.65, 5.95, 0.1, 0.88, 6.02, 6.6, m.sage);
  kit.block(root, 6.4, 6.5, 0.1, 0.88, 6.02, 6.6, m.sage);
  kit.block(root, 5.95, 6.4, 0.1, 0.69, 6.02, 6.6, m.sage);
  kit.block(root, 5.95, 6.4, 0.69, 0.88, 6.02, 6.08, m.sage);
  kit.block(root, 5.95, 6.4, 0.69, 0.88, 6.45, 6.6, m.sage);
  // Shaker fronts; the built-in oven sits under the hob
  const southFronts: [number, number, number, number][] = [
    [4.65, 4.9, 0.11, 0.87], [5.48, 5.88, 0.11, 0.87], [4.9, 5.48, 0.74, 0.87],
  ];
  for (const [x0, x1, y0, y1] of southFronts) {
    kit.shaker(root, 'x', 6.02, -1, x0, x1, y0, y1, m.sage);
    kit.block(root, x0 + 0.06, x1 - 0.06, y1 - 0.07, y1 - 0.055, 5.98, 5.995, m.blackMetal, { cast: false });
  }
  kit.block(root, 4.91, 5.47, 0.12, 0.72, 6.0, 6.02, m.cooktop);
  kit.block(root, 4.96, 5.42, 0.3, 0.62, 5.997, 6.0, m.screen, { cast: false });
  kit.cyl(root, 0.01, 0.01, 0.44, m.chrome, 5.19, 0.67, 5.975, { rotZ: Math.PI / 2, segments: 10, cast: false });
  kit.block(root, 4.63, 5.95, 0.88, 0.92, 5.98, 6.6, m.quartz);
  kit.block(root, 6.4, 6.5, 0.88, 0.92, 5.98, 6.6, m.quartz);
  kit.block(root, 5.95, 6.4, 0.88, 0.92, 5.98, 6.08, m.quartz);
  kit.block(root, 5.95, 6.4, 0.88, 0.92, 6.45, 6.6, m.quartz);

  // East run: X 5.9–6.5, Z 5.25–6.0
  kit.block(root, 5.98, 6.5, 0, 0.1, 5.25, 6.0, m.sageDark);
  kit.block(root, 5.92, 6.5, 0.1, 0.88, 5.25, 6.02, m.sage);
  kit.shaker(root, 'z', 5.92, -1, 5.27, 5.98, 0.11, 0.87, m.sage);
  kit.block(root, 5.885, 5.9, 0.81, 0.825, 5.4, 5.85, m.blackMetal, { cast: false });
  kit.block(root, 5.88, 6.5, 0.88, 0.92, 5.25, 5.98, m.quartz);

  // Black fridge-freezer column with steel bar handles
  kit.block(root, 5.92, 6.5, 0, 2.25, 4.6, 5.25, m.doorDark);
  kit.rblock(root, 5.9, 5.93, 0.02, 1.4, 4.62, 5.235, 0.008, m.screen);
  kit.rblock(root, 5.9, 5.93, 1.42, 2.23, 4.62, 5.235, 0.008, m.screen);
  kit.cyl(root, 0.012, 0.012, 0.42, m.chrome, 5.875, 1.15, 4.68, { segments: 10, cast: false });
  kit.cyl(root, 0.012, 0.012, 0.32, m.chrome, 5.875, 1.64, 4.68, { segments: 10, cast: false });

  // Wall cabinets with under-cabinet LED
  kit.block(root, 4.65, 5.88, 1.5, 2.25, 6.25, 6.6, m.sage);
  kit.shaker(root, 'x', 6.25, -1, 4.65, 5.265, 1.5, 2.25, m.sage);
  kit.shaker(root, 'x', 6.25, -1, 5.265, 5.88, 1.5, 2.25, m.sage);
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

  // Sink + arched black tap
  kit.block(root, 5.95, 6.4, 0.7, 0.71, 6.08, 6.45, m.steelDark, { cast: false });
  kit.block(root, 5.95, 5.96, 0.7, 0.92, 6.08, 6.45, m.appliance, { cast: false });
  kit.block(root, 6.39, 6.4, 0.7, 0.92, 6.08, 6.45, m.appliance, { cast: false });
  kit.block(root, 5.95, 6.4, 0.7, 0.92, 6.08, 6.09, m.appliance, { cast: false });
  kit.block(root, 5.95, 6.4, 0.7, 0.92, 6.44, 6.45, m.appliance, { cast: false });
  kit.cyl(root, 0.02, 0.02, 0.005, m.chrome, 6.17, 0.712, 6.27, { cast: false });
  kit.cyl(root, 0.015, 0.018, 0.3, m.blackMetal, 6.17, 1.07, 6.52, { segments: 16 });
  kit.torus(root, 0.1, 0.012, m.blackMetal, 6.17, 1.22, 6.42, Math.PI, { rotY: Math.PI / 2 });

  // Countertop props
  kit.lathe(root, 'kettle', [[0, 0], [0.09, 0], [0.1, 0.08], [0.085, 0.17], [0.03, 0.2], [0, 0.2]], m.appliance, 5.66, 0.92, 6.35);
  kit.rblock(root, 5.55, 5.85, 0.92, 0.94, 6.08, 6.32, 0.008, m.oak);
  kit.plant(root, 6.3, 0.92, 5.45, 'bush', 0.22, 17, m.potTerracotta);

  // Breakfast bar
  kit.block(root, 4.37, 4.8, 0, 0.1, 4.3, 5.4, m.sageDark);
  kit.block(root, 4.32, 4.85, 0.1, 0.9, 4.27, 5.43, m.walnut);
  kit.block(root, 4.85, 4.87, 0.11, 0.89, 4.29, 4.84, m.walnut);
  kit.block(root, 4.85, 4.87, 0.11, 0.89, 4.86, 5.41, m.walnut);
  kit.block(root, 4.12, 4.88, 0.9, 0.94, 4.22, 5.48, m.quartz);
  kit.lathe(root, 'bowl', [[0, 0], [0.06, 0], [0.12, 0.05], [0.13, 0.07], [0, 0.03]], m.ceramic, 4.55, 0.94, 5.0);
  for (const [dx, dz] of [[0, 0], [0.06, 0.04], [-0.04, 0.05]]) {
    kit.sphere(root, 0.035, m.fruit, 4.55 + dx, 0.99, 5.0 + dz);
  }

  // Upholstered counter chairs facing the bar
  for (const z of [4.55, 5.15]) stool(kit, root, 3.97, z, FACE.e);
  kit.pointLight(root, 5.3, 2.0, 5.2, '#ffe0bd', 3);
}

// ------------------------------------------------------------
// Bedroom
// ------------------------------------------------------------
function bedroom(kit: Kit, root: THREE.Group) {
  const m = kit.m;

  // Headboard wall: white lacquer panels framed by dark timber, with sconces
  kit.block(root, 1.2, 2.64, 0, 2.52, 0.0, 0.03, m.trim);
  for (const x of [1.68, 2.16]) kit.block(root, x - 0.004, x + 0.004, 0, 2.52, 0.03, 0.034, m.doorDark, { cast: false });
  kit.block(root, 0.72, 1.2, 0, 2.52, 0.0, 0.035, m.darkWood);
  kit.block(root, 2.64, 3.12, 0, 2.52, 0.0, 0.035, m.darkWood);
  sconce(kit, root, 'x', 0.035, 1, 0.96, 1.45);
  sconce(kit, root, 'x', 0.035, 1, 2.88, 1.45);

  // Queen bed: low upholstered headboard, grey duvet, houndstooth throw
  // Channel-tufted headboard
  for (let i = 0; i < 6; i++) {
    const a = 1.0 + i * 0.307;
    kit.cushionBlock(root, a + 0.004, a + 0.303, 0.12, 1.05, 0.035, 0.15, 0.05, m.headboard, { puff: 0.018 });
  }
  kit.rblock(root, 1.08, 2.76, 0.08, 0.32, 0.15, 2.22, 0.03, m.walnut);
  kit.cushionBlock(root, 1.12, 2.72, 0.32, 0.56, 0.17, 2.18, 0.06, m.linen, { puff: 0.02 });
  // Duvet draped over the mattress, rolled back at the head
  kit.drape(root, 1.62, 1.42, 0.24, 41, m.duvet, 1.92, 0.585, 0.78, { wrinkle: 0.007 });
  kit.cushionBlock(root, 1.1, 2.74, 0.57, 0.67, 0.72, 0.98, 0.05, m.duvet, { puff: 0.02 });
  // Sleeping pillows lying flat, decorative pillows leaning on them
  kit.pillow(root, 0.66, 0.44, 0.17, m.linen, 1.5, 0.66, 0.42, { rotX: -Math.PI / 2 });
  kit.pillow(root, 0.66, 0.44, 0.17, m.linen, 2.34, 0.66, 0.42, { rotX: -Math.PI / 2 });
  kit.pillow(root, 0.5, 0.42, 0.16, m.pillowCharcoal, 1.6, 0.86, 0.62, { rotX: -0.35, rotY: -0.06 });
  kit.pillow(root, 0.5, 0.42, 0.16, m.pillowCharcoal, 2.24, 0.86, 0.64, { rotX: -0.35, rotY: 0.08 });
  // Houndstooth-tone throw over the foot
  kit.drape(root, 1.68, 0.42, 0.28, 43, m.throwRust, 1.92, 0.65, 1.78, { wrinkle: 0.01 });

  // Floating walnut nightstands
  for (const x of [0.72, 3.12]) {
    kit.rblock(root, x - 0.22, x + 0.22, 0.32, 0.5, 0.04, 0.42, 0.01, m.walnut);
  }
  kit.plant(root, 3.05, 0.5, 0.22, 'bush', 0.2, 31, m.ceramic);
  kit.block(root, 0.58, 0.8, 0.5, 0.53, 0.12, 0.3, m.bookC);

  // Black-framed wardrobe with smoked glass, against the bathroom wall
  wardrobe(kit, root, 4.04, 1.02, FACE.w, 1.96, 0.56);

  kit.model(root, PLANT_MODEL, 0.42, 0, 1.15, 0.85, 2.1);
  kit.curtain(root, 0.09, 0.32, 0.75, 2.38);

  kit.cove(root, 0, 0, 4.04, 3.09);
  kit.pointLight(root, 1.92, 2.0, 1.8, '#ffd6a5', 2.6);
}

// ------------------------------------------------------------
// Bathroom
// ------------------------------------------------------------
function bathroom(kit: Kit, root: THREE.Group) {
  const m = kit.m;
  const T = m.bathTile;

  // Large-format warm stone to 2.2 m
  kit.panel(root, 'x', 4.16, 6.5, 0, 2.2, 0.002, 1, T, BATH_TILE);
  kit.panel(root, 'z', 0, 1.94, 0, 2.2, 6.498, -1, T, BATH_TILE);
  kit.panel(root, 'z', 0, 1.94, 0, 2.2, 4.162, 1, T, BATH_TILE);
  kit.panel(root, 'x', 4.16, 4.79, 0, 2.2, 1.938, -1, T, BATH_TILE);
  kit.panel(root, 'x', 5.66, 6.5, 0, 2.2, 1.938, -1, T, BATH_TILE);

  // Walk-in shower to the left of the door, vanity ahead, WC to the right
  shower(kit, root, [4.16, 0, 5.0, 1.25], { along: 'z', at: 5.0, from: 0, to: 1.0 }, [4.58, 0.6]);
  kit.block(root, 4.3, 4.85, 1.2, 1.215, 1.0, 1.015, m.blackMetal);
  kit.rblock(root, 4.36, 4.8, 0.72, 1.22, 1.0, 1.03, 0.01, m.towel);
  vanity(kit, root, 5.5, 0, FACE.s, { width: 0.75, reflect: true });
  toilet(kit, root, 6.12, 0, FACE.s);

  // Lit open niche shelves above the WC
  kit.block(root, 5.86, 6.38, 1.3, 2.15, 0.0, 0.24, m.taupe);
  for (const y of [1.55, 1.85]) {
    kit.block(root, 5.88, 6.36, y - 0.015, y, 0.02, 0.24, m.taupe);
    kit.block(root, 5.9, 6.34, y - 0.025, y - 0.017, 0.18, 0.22, m.ledStrip, { cast: false });
  }
  kit.cyl(root, 0.03, 0.03, 0.16, m.screen, 5.98, 1.63, 0.12, { segments: 12 });
  kit.cyl(root, 0.03, 0.03, 0.18, m.screen, 6.08, 1.64, 0.12, { segments: 12 });
  kit.plant(root, 6.22, 1.85, 0.12, 'snake', 0.22, 33, m.glass);

  kit.pointLight(root, 5.3, 2.0, 1.0, '#fff0de', 2.5);
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
