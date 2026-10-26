import * as THREE from 'three';
import { Kit } from '../kit';
import {
  FACE, sofa, coffeeTable, rug, tvUnit, diningSet, bed, wardrobe, bench, kitchenRun, fridge,
  toilet, vanity, bathtub, bathTiles, plant, planter, balcony, chandelier, headboardWall, nicheShelves,
} from '../furniture';
import { drawRecordedPlan } from '../paperPlan';
import type { ApartmentDef } from '../types';
import { finish, shell } from './shell';

// ============================================================
// TYPE B — TWO BEDROOM
// Measured from public/floorplan-2bed.png (≈ 1 px = 15 mm, scaled from
// the bed and door widths). Plan axes: X west → east, Z north → south.
//
//   Living / dining  X 0.00–5.70  Z 0.00–3.30  (glazing to a slim balcony)
//   Kitchen          X 5.82–8.45  Z 0.00–2.45
//   Hall             X 4.40–8.45  Z 2.57–3.72  (entry on the east wall)
//   Lobby            X 2.62–5.70  Z 3.42–4.85
//   Primary bedroom  X -0.70–2.50 Z 3.42–7.40
//   Ensuites         X 2.62–4.10 / 4.22–5.70, Z 4.97–7.40
//   Bedroom 2        X 5.82–8.45  Z 3.84–7.40
// ============================================================

const EXT = 0.2;
const INT = 0.12;

function build(kit: Kit) {
  const root = new THREE.Group();
  root.name = 'apartment';
  const m = kit.m;

  shell(kit, root, {
    slab: [-0.95, -0.65, 8.65, 8.05],
    wood: [[0, 0, 8.45, 3.42], [-0.7, 3.42, 8.45, 7.4]],
    tiles: [[2.62, 4.97, 4.1, 7.4], [4.22, 4.97, 5.7, 7.4]],
  });

  // --- Exterior walls ---
  kit.wall(root, 'x', -EXT / 2, EXT, -0.2, 8.65, [
    { a: 0.4, b: 2.35, bottom: 0.85, top: 2.4 },
    { a: 6.75, b: 8.05, bottom: 1.05, top: 2.2 },
  ]);
  kit.wall(root, 'x', 7.4 + EXT / 2, EXT, -0.9, 8.65);
  kit.wall(root, 'z', 8.45 + EXT / 2, EXT, 0, 7.4, [
    { a: 2.75, b: 3.65, top: 2.1 },
    { a: 5.2, b: 6.4, bottom: 0.9, top: 2.3 },
  ]);
  kit.wall(root, 'z', -EXT / 2, EXT, 0, 3.3, [{ a: 0.2, b: 3.1, top: 2.4 }]);
  kit.glazing(root, 'z', -EXT / 2, 0.2, 3.1, 2.4, 3, 0);
  kit.wall(root, 'z', -0.7 - EXT / 2, EXT, 3.3, 7.4, [{ a: 4.9, b: 6.9, top: 2.4 }]);
  kit.glazing(root, 'z', -0.7 - EXT / 2, 4.9, 6.9, 2.4, 2);

  // --- Interior walls ---
  kit.wall(root, 'x', 3.36, INT, -0.9, 4.4); // living | primary bedroom + lobby
  kit.wall(root, 'z', 5.76, INT, 0, 2.45); // living | kitchen
  kit.wall(root, 'x', 2.51, INT, 5.7, 8.45, [{ a: 5.9, b: 6.7, top: 2.1 }]); // kitchen | hall
  kit.wall(root, 'x', 3.78, INT, 5.62, 8.45); // hall | bedroom 2
  kit.wall(root, 'z', 2.56, INT, 3.42, 7.4, [{ a: 3.6, b: 4.4, top: 2.1 }, { a: 5.05, b: 5.75, top: 2.1 }]);
  kit.wall(root, 'x', 4.91, INT, 2.62, 5.7); // lobby | ensuites
  kit.wall(root, 'z', 4.16, INT, 4.97, 7.4); // ensuite | ensuite
  kit.wall(root, 'z', 5.76, INT, 3.84, 7.4, [{ a: 4.0, b: 4.75, top: 2.1 }, { a: 5.05, b: 5.75, top: 2.1 }]);
  kit.doorTrim(root, 'x', 2.51, INT, 5.9, 6.7, 2.1);
  kit.doorTrim(root, 'z', 8.55, EXT, 2.75, 3.65, 2.1);
  kit.doorTrim(root, 'z', 2.56, INT, 3.6, 4.4, 2.1);
  kit.doorTrim(root, 'z', 2.56, INT, 5.05, 5.75, 2.1);
  kit.doorTrim(root, 'z', 5.76, INT, 4.0, 4.75, 2.1);
  kit.doorTrim(root, 'z', 5.76, INT, 5.05, 5.75, 2.1);

  // --- Doors ---
  kit.door(root, [5.92, 2.45], 0.76, 'e', 'n');
  kit.door(root, [8.45, 2.77], 0.86, 's', 'w', m.walnut);
  kit.door(root, [2.5, 3.62], 0.76, 's', 'w');
  kit.door(root, [2.62, 5.07], 0.66, 's', 'e');
  kit.door(root, [5.82, 4.02], 0.71, 's', 'e');
  kit.door(root, [5.7, 5.07], 0.66, 's', 'w');

  // --- Living & dining ---
  rug(kit, root, 0.5, 0.85, 3.3, 2.85, m.rugLiving);
  sofa(kit, root, 1.75, 0.02, FACE.s, { length: 2.45, chaise: 'left', chaiseLength: 1.6 });
  coffeeTable(kit, root, 2.13, 1.98);
  diningSet(kit, root, 3.95, 1.67, FACE.e, 1.4, 0.85, 2);
  chandelier(kit, root, 2.13, 2.25, 1.98);
  kit.cove(root, 0, 0, 5.7, 3.3);
  tvUnit(kit, root, 1.75, 3.3, FACE.n, 1.9);
  kit.art(root, 'z', 5.7, -1, 1.2, 1.55, 1.0, 0.7, m.artA, m.oak);
  kit.curtain(root, 0.09, 2.65, 3.05, 2.38);
  plant(kit, root, 3.25, 0.3, 'bush', 0.6, 51, m.potStone);
  plant(kit, root, 5.4, 0.3, 'fiddle', 1.4, 52);
  plant(kit, root, 0.35, 2.95, 'snake', 0.9, 53, m.potBlack);
  plant(kit, root, 3.25, 2.95, 'bush', 0.55, 54, m.potStone);
  planter(kit, root, 0.4, -0.65, 2.35, -0.2, 61);
  kit.pointLight(root, 1.8, 2.0, 1.6, '#ffd6a5', 3.2);
  kit.pointLight(root, 4.2, 2.0, 1.7, '#ffd6a5', 2.6);

  // --- Kitchen ---
  fridge(kit, root, 6.13, 0, FACE.s);
  kitchenRun(kit, root, 7.475, 0, FACE.s, 1.95, { hob: 0.45, flat: true });
  kitchenRun(kit, root, 8.45, 1.36, FACE.w, 1.48, { sink: 0.1, uppers: [-0.7, 0.7], flat: true });
  plant(kit, root, 6.9, 2.15, 'snake', 0.7, 55, m.potTerracotta);
  kit.pointLight(root, 7.1, 2.0, 1.2, '#ffe0bd', 2.8);

  // --- Hall + lobby ---
  plant(kit, root, 8.18, 3.52, 'fiddle', 1.3, 56);
  rug(kit, root, 7.4, 2.82, 8.35, 3.62, m.rugBedroom);
  kit.art(root, 'x', 3.72, -1, 7.0, 1.5, 0.6, 0.75, m.artC, m.blackMetal);
  kit.pointLight(root, 6.9, 2.0, 3.15, '#ffd6a5', 1.4, true);
  kit.pointLight(root, 4.1, 2.0, 4.15, '#ffd6a5', 1.4, true);

  // --- Primary bedroom ---
  rug(kit, root, -0.3, 4.45, 2.1, 6.75, m.rugBedroom);
  headboardWall(kit, root, 0.85, 7.4, FACE.n, 1.2);
  bed(kit, root, 0.85, 7.365, FACE.n);
  kit.cove(root, -0.7, 3.42, 2.5, 7.4);
  wardrobe(kit, root, 0.45, 3.42, FACE.s, 2.1);
  bench(kit, root, 0.85, 4.78, 0);
  plant(kit, root, -0.42, 4.6, 'bush', 0.55, 57, m.potStone);
  kit.curtain(root, -0.61, 4.95, 5.35, 2.38);
  kit.art(root, 'z', 2.5, -1, 6.45, 1.55, 0.6, 0.8, m.artB, m.oak);
  kit.pointLight(root, 0.9, 2.0, 5.6, '#ffd6a5', 3);

  // --- Ensuites (mirror images) ---
  bathTiles(kit, root, [2.62, 4.97, 4.1, 7.4], [{ side: 'w', a: 5.05, b: 5.75 }]);
  vanity(kit, root, 4.1, 5.48, FACE.w, { reflect: true, width: 0.75 });
  toilet(kit, root, 4.1, 6.22, FACE.w);
  nicheShelves(kit, root, 4.1, 6.22, FACE.w, 0.5);
  bathtub(kit, root, 3.36, 7.4, FACE.n, 1.46);
  kit.pointLight(root, 3.36, 2.0, 5.9, '#fff0de', 2.2);
  bathTiles(kit, root, [4.22, 4.97, 5.7, 7.4], [{ side: 'e', a: 5.05, b: 5.75 }]);
  vanity(kit, root, 4.22, 5.48, FACE.e, { width: 0.75 });
  toilet(kit, root, 4.22, 6.22, FACE.e);
  nicheShelves(kit, root, 4.22, 6.22, FACE.e, 0.5);
  bathtub(kit, root, 4.96, 7.4, FACE.n, 1.46);
  kit.pointLight(root, 4.96, 2.0, 5.9, '#fff0de', 2.2, true);

  // --- Bedroom 2 ---
  rug(kit, root, 6.2, 4.9, 8.1, 6.9, m.rugLiving);
  headboardWall(kit, root, 7.14, 7.4, FACE.n, 1.1);
  bed(kit, root, 7.14, 7.365, FACE.n, { width: 1.4, throwMat: m.pillowSage });
  kit.cove(root, 5.82, 3.84, 8.45, 7.4);
  wardrobe(kit, root, 7.55, 3.84, FACE.s, 1.7);
  plant(kit, root, 6.1, 4.95, 'snake', 0.8, 58, m.potBlack);
  kit.curtain(root, 8.36, 5.25, 5.6, 2.25);
  kit.pointLight(root, 7.1, 2.0, 5.6, '#ffd6a5', 2.8);

  // --- Balcony ---
  balcony(kit, root, [-0.95, -0.2, -0.2, 3.3], ['w', 'n']);
  plant(kit, root, -0.58, 0.4, 'bush', 0.6, 59, m.potStone);
  plant(kit, root, -0.58, 1.65, 'snake', 0.8, 60, m.potBlack);
  plant(kit, root, -0.58, 2.85, 'bush', 0.55, 63, m.potTerracotta);

  // Downlights
  for (const [x, z] of [[1.0, 1.2], [2.6, 1.2], [6.4, 1.2], [7.6, 1.6], [5.2, 3.1], [7.6, 3.15], [0.9, 4.6], [0.9, 6.2], [3.36, 5.4], [4.96, 5.4], [7.1, 4.7], [7.1, 6.2]]) {
    kit.downlight(root, x, z);
  }
  return finish(root);
}

export const twoBedroom: ApartmentDef = {
  slug: 'two-bedroom',
  name: 'Two Bedroom',
  shortName: '2 Bed',
  path: '/2-bedroom',
  planImage: { src: '/floorplan-2bed.png', width: 640, height: 546 },
  bounds: [-0.95, -0.65, 8.65, 8.05],
  build,
  paper: (kit) => ({
    sheet: [-2.6, -1.7, 10.3, 8.95],
    labels: [
      { x: 2.15, z: 2.62, name: 'LIVING / DINING', area: '19 m²' },
      { x: 7.05, z: 1.55, name: 'KITCHEN', area: '6 m²' },
      { x: 7.25, z: 3.27, name: 'HALL' },
      { x: 0.85, z: 4.38, name: 'PRIMARY BEDROOM', area: '13 m²' },
      { x: 7.1, z: 4.72, name: 'BEDROOM 2', area: '9 m²' },
      { x: 3.0, z: 6.05, name: 'ENSUITE' },
      { x: 5.0, z: 6.05, name: 'ENSUITE' },
      { x: -0.58, z: 2.2, name: 'BALCONY', rotate: true },
    ],
    dims: [[-0.9, -1.05, 8.65, -1.05, '9.55'], [9.15, -0.2, 9.15, 7.6, '7.80']],
    north: [-2.0, -1.15],
    scaleBar: [-2.15, 8.45],
    titleBlock: [5.3, 8.2, 9.95, 8.8],
    titleLines: ['TYPE B — TWO BEDROOM APARTMENT', '64 m² NET · 72 m² GROSS · 2 ENSUITES'],
    draw: drawRecordedPlan(kit.plan),
  }),
  keys: [
    // 01 Overview — paper plan, tilting as the model rises
    { u: 0.0, pos: [3.85, 26.5, 3.62], target: [3.85, 0, 3.62], fov: 40, shift: 0.22 },
    { u: 1.0, pos: [3.9, 15.5, 6.0], target: [3.9, 0, 3.7], fov: 40, shift: 0.22 },
    // Descend over the hall into the living room
    { u: 1.8, pos: [6.5, 6.0, 5.2], target: [3.0, 0.4, 2.2], fov: 46, shift: 0.12 },
    { u: 2.5, pos: [5.6, 2.6, 3.3], target: [2.2, 0.8, 1.6], fov: 52, shift: 0.2 },
    // 02 Living & dining — from the hall, across the dining table to the sofa
    { u: 3.1, pos: [5.3, 1.6, 3.05], target: [1.0, 0.75, 0.9], fov: 56, shift: 0.22 },
    { u: 4.1, pos: [4.95, 1.58, 3.0], target: [0.9, 0.8, 0.95], fov: 56, shift: 0.22 },
    // Turn north to the kitchen door
    { u: 4.8, pos: [6.3, 1.6, 3.05], target: [6.5, 1.2, 0.6], fov: 58, shift: 0 },
    // 03 Kitchen
    { u: 5.6, pos: [6.3, 1.62, 2.1], target: [7.9, 0.95, 0.5], fov: 64, shift: -0.18 },
    { u: 6.6, pos: [6.25, 1.6, 2.2], target: [7.85, 0.95, 0.6], fov: 64, shift: -0.18 },
    // Back out of the kitchen (turning via the north-west so the view
    // never swings through the camera), round the hall corner, into the lobby
    { u: 6.95, pos: [6.3, 1.6, 2.55], target: [5.0, 1.2, 0.9], fov: 60, shift: 0 },
    { u: 7.3, pos: [6.3, 1.6, 3.1], target: [3.4, 1.2, 2.8], fov: 58, shift: 0 },
    { u: 7.65, pos: [5.25, 1.6, 3.35], target: [3.4, 1.2, 4.4], fov: 58, shift: 0 },
    { u: 8.0, pos: [4.7, 1.6, 4.0], target: [2.0, 1.2, 4.0], fov: 58, shift: 0 },
    { u: 8.35, pos: [2.9, 1.6, 4.0], target: [0.6, 0.9, 5.9], fov: 60, shift: 0.1 },
    // 04 Primary bedroom
    { u: 8.8, pos: [1.95, 1.68, 4.1], target: [0.4, 0.7, 6.6], fov: 62, shift: 0.2 },
    { u: 9.8, pos: [1.75, 1.64, 4.15], target: [0.3, 0.7, 6.7], fov: 62, shift: 0.2 },
    // Across to the ensuite door (turning via the south)
    { u: 10.05, pos: [1.65, 1.6, 4.6], target: [1.2, 1.0, 7.6], fov: 62, shift: 0 },
    { u: 10.3, pos: [1.6, 1.6, 5.0], target: [4.6, 1.2, 5.6], fov: 62, shift: 0 },
    { u: 10.8, pos: [2.25, 1.62, 5.42], target: [4.0, 1.0, 6.2], fov: 64, shift: 0 },
    // 05 Ensuite
    { u: 11.2, pos: [2.85, 1.62, 5.5], target: [4.0, 0.95, 6.8], fov: 68, shift: -0.18 },
    { u: 12.2, pos: [2.9, 1.58, 5.6], target: [3.95, 0.95, 6.85], fov: 68, shift: -0.18 },
    // Crane up through the roof and over to bedroom 2
    { u: 12.7, pos: [2.95, 3.6, 5.6], target: [3.4, 0, 6.0], fov: 58, shift: 0 },
    { u: 13.4, pos: [6.0, 4.5, 4.6], target: [7.2, 0.5, 6.0], fov: 56, shift: 0.1 },
    // 06 Bedroom 2
    { u: 14.0, pos: [6.2, 1.72, 4.45], target: [7.5, 0.7, 6.9], fov: 62, shift: 0.2 },
    { u: 15.0, pos: [6.3, 1.68, 4.6], target: [7.6, 0.7, 6.95], fov: 62, shift: 0.2 },
    // Rise out to the final aerial
    { u: 15.7, pos: [6.4, 4.2, 5.5], target: [5.0, 0.4, 4.5], fov: 52, shift: 0 },
    { u: 16.5, pos: [1.0, 7.5, 10.5], target: [3.85, 0.3, 3.9], fov: 45, shift: 0 },
    // 07 Final
    { u: 17.4, pos: [-5.5, 10.5, 13.0], target: [3.85, 0.3, 3.7], fov: 40, shift: -0.25, lift: 0.5 },
    { u: 18.5, pos: [-3.5, 11.2, 14.2], target: [4.05, 0.3, 3.7], fov: 40, shift: -0.25, lift: 0.5 },
  ],
  holds: [[0, 1], [3.1, 4.1], [5.6, 6.6], [8.8, 9.8], [11.2, 12.2], [14.0, 15.0], [17.4, 18.5]],
  stats: [['64 m²', 'Net Area'], ['72 m²', 'Gross Area'], ['2', 'Bedrooms'], ['2', 'Bathrooms'], ['1', 'Balcony']],
  scenes: [
    {
      id: 'overview',
      title: 'Room to Grow',
      description: 'A thoughtfully planned two-bedroom apartment, with an ensuite for every bedroom.',
      area: '64 m² net · 72 m² gross',
      position: 'left',
    },
    {
      id: 'living-dining',
      title: 'Open Living, Made for Gathering',
      description: 'A bright open-plan living and dining room with full-height glazing onto the balcony.',
      area: '19 m² · Living & Dining',
      position: 'left',
    },
    {
      id: 'kitchen',
      title: 'A Kitchen That Works as Hard as You Do',
      description: 'A separate kitchen with generous counter space, a full-height fridge and plenty of storage.',
      area: '6 m² · Kitchen',
      position: 'right',
    },
    {
      id: 'primary-bedroom',
      title: 'A Primary Bedroom to Unwind In',
      description: 'Full-height glazing, a wall of wardrobes and a private ensuite just steps away.',
      area: '13 m² · Primary Bedroom',
      position: 'left',
    },
    {
      id: 'ensuites',
      title: 'Two Ensuites, No Compromises',
      description: 'Each bedroom has its own bathroom with a full-size bath and a floating oak vanity.',
      area: '2 × 4 m² · Ensuites',
      position: 'right',
    },
    {
      id: 'bedroom-2',
      title: 'A Second Bedroom With Its Own Character',
      description: 'Ideal for family, guests or a home office, with its own wardrobe and ensuite.',
      area: '9 m² · Bedroom',
      position: 'left',
    },
    {
      id: 'final',
      title: 'Space for Every Chapter',
      description: 'Discover a home where thoughtful planning meets modern living.',
      position: 'right',
      isFinal: true,
    },
  ],
};
