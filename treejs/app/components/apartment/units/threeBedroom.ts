import * as THREE from 'three';
import { Kit } from '../kit';
import {
  FACE, sofa, coffeeTable, rug, tvUnit, diningSet, bed, wardrobe, kitchenRun, fridge,
  toilet, vanity, shower, bathTiles, plant, planter, balcony, chandelier, headboardWall, nicheShelves,
} from '../furniture';
import { drawRecordedPlan } from '../paperPlan';
import type { ApartmentDef } from '../types';
import { finish, shell } from './shell';

// ============================================================
// TYPE C — THREE BEDROOM
// Measured from public/floorplan-3bed.png (≈ 1 px = 19 mm, scaled from
// the bed and door widths). Plan axes: X west → east, Z north → south.
//
//   Primary bedroom  X -0.66–2.85 Z 0.00–3.95  (corner glazing)
//   Bath 1           X 2.97–4.60  Z 0.00–2.80
//   Bedroom 2        X 4.72–7.25  Z 0.00–2.80
//   Bath 2           X 7.37–8.75  Z 0.00–2.80
//   Bedroom 3        X 8.87–11.00 Z 0.00–2.80
//   Corridor         X 2.97–9.55  Z 2.92–3.80
//   Living / dining  X 0.00–6.64  Z 4.07–7.30  (glazing to a slim balcony)
//   Galley kitchen   X 6.76–9.55  Z 3.92–6.00
//   Maid's room, WC  east side, entry hall along the south wall
// ============================================================

const EXT = 0.2;
const INT = 0.12;

function build(kit: Kit) {
  const root = new THREE.Group();
  root.name = 'apartment';
  const m = kit.m;

  shell(kit, root, {
    slab: [-0.86, -0.65, 11.2, 7.95],
    wood: [[-0.66, 0, 11.0, 3.92], [0, 3.92, 11.0, 7.3]],
    tiles: [[2.97, 0, 4.6, 2.8], [7.37, 0, 8.75, 2.8], [9.75, 6.12, 11.0, 7.3]],
  });

  // --- Exterior walls ---
  kit.wall(root, 'x', -EXT / 2, EXT, -0.86, 11.2, [
    { a: 3.4, b: 4.1, bottom: 1.5, top: 2.2 },
    { a: 5.2, b: 6.6, bottom: 0.85, top: 2.4 },
    { a: 7.7, b: 8.3, bottom: 1.5, top: 2.2 },
    { a: 9.1, b: 10.5, bottom: 0.85, top: 2.4 },
  ]);
  kit.wall(root, 'x', 7.3 + EXT / 2, EXT, -0.86, 11.2, [
    { a: 0.4, b: 2.2, bottom: 0.85, top: 2.4 },
    { a: 8.5, b: 9.4, top: 2.1 },
  ]);
  kit.wall(root, 'z', 11.0 + EXT / 2, EXT, 0, 7.3, [
    { a: 0.6, b: 2.2, bottom: 0.9, top: 2.3 },
    { a: 3.3, b: 3.9, bottom: 1.5, top: 2.2 },
  ]);
  kit.wall(root, 'z', -0.66 - EXT / 2, EXT, 0, 4.07, [{ a: 0.5, b: 3.4, top: 2.4 }]);
  kit.glazing(root, 'z', -0.66 - EXT / 2, 0.5, 3.4, 2.4, 3);
  kit.wall(root, 'z', -EXT / 2, EXT, 4.07, 7.3, [{ a: 4.3, b: 7.1, top: 2.4 }]);
  kit.glazing(root, 'z', -EXT / 2, 4.3, 7.1, 2.4, 3, 0);

  // --- Interior walls ---
  kit.wall(root, 'x', 4.01, INT, -0.86, 2.97); // primary | living
  kit.wall(root, 'z', 2.91, INT, 0, 3.95, [{ a: 3.05, b: 3.85, top: 2.1 }]);
  kit.wall(root, 'z', 4.66, INT, 0, 2.8);
  kit.wall(root, 'z', 7.31, INT, 0, 2.8);
  kit.wall(root, 'z', 8.81, INT, 0, 2.8);
  kit.wall(root, 'x', 2.86, INT, 2.97, 11.0, [
    { a: 3.2, b: 3.9, top: 2.1 }, { a: 6.35, b: 7.1, top: 2.1 }, { a: 7.5, b: 8.2, top: 2.1 }, { a: 8.88, b: 9.53, top: 2.1 },
  ]);
  kit.wall(root, 'x', 3.86, INT, 2.97, 9.67, [{ a: 5.0, b: 6.6, top: 2.4 }]); // corridor | living + kitchen
  kit.wall(root, 'z', 6.7, INT, 3.92, 6.0, [{ a: 4.7, b: 5.5, top: 2.1 }]);
  kit.wall(root, 'x', 6.06, INT, 6.64, 11.0); // kitchen | hall + WC
  kit.wall(root, 'z', 9.61, INT, 2.92, 6.0, [{ a: 4.6, b: 5.35, top: 2.1 }]);
  kit.wall(root, 'x', 4.81, INT, 9.67, 11.0, [{ a: 9.75, b: 10.45, top: 2.1 }]);
  kit.wall(root, 'z', 9.69, INT, 6.12, 7.3, [{ a: 6.35, b: 7.0, top: 2.1 }]);
  for (const [a, b] of [[3.2, 3.9], [6.35, 7.1], [7.5, 8.2], [8.88, 9.53]]) kit.doorTrim(root, 'x', 2.86, INT, a, b, 2.1);
  kit.doorTrim(root, 'z', 2.91, INT, 3.05, 3.85, 2.1);
  kit.doorTrim(root, 'x', 3.86, INT, 5.0, 6.6, 2.4);
  kit.doorTrim(root, 'z', 6.7, INT, 4.7, 5.5, 2.1);
  kit.doorTrim(root, 'z', 9.61, INT, 4.6, 5.35, 2.1);
  kit.doorTrim(root, 'x', 4.81, INT, 9.75, 10.45, 2.1);
  kit.doorTrim(root, 'z', 9.69, INT, 6.35, 7.0, 2.1);
  kit.doorTrim(root, 'x', 7.4, EXT, 8.5, 9.4, 2.1);

  // --- Doors ---
  kit.door(root, [2.85, 3.07], 0.76, 's', 'w');
  kit.door(root, [3.22, 2.8], 0.66, 'e', 'n');
  kit.door(root, [7.08, 2.8], 0.71, 'w', 'n');
  kit.door(root, [7.52, 2.8], 0.66, 'e', 'n');
  kit.door(root, [8.9, 2.8], 0.61, 'e', 'n');
  kit.door(root, [9.77, 4.75], 0.66, 'e', 'n');
  kit.door(root, [9.75, 6.37], 0.61, 's', 'e');
  kit.door(root, [6.76, 4.72], 0.76, 's', 'e');
  kit.door(root, [9.38, 7.3], 0.86, 'w', 'n', m.walnut);

  // --- Living & dining ---
  rug(kit, root, 0.5, 4.6, 3.4, 6.9, m.rugLiving);
  sofa(kit, root, 1.6, 7.3, FACE.n, { length: 2.6, chaise: 'right', chaiseLength: 1.75 });
  coffeeTable(kit, root, 2.0, 5.38);
  tvUnit(kit, root, 1.6, 4.07, FACE.s, 2.0);
  diningSet(kit, root, 4.11, 5.32, FACE.s, 1.4, 0.85, 2);
  chandelier(kit, root, 2.0, 2.25, 5.38);
  kit.cove(root, 0, 4.07, 6.64, 7.3);
  kit.art(root, 'x', 3.92, 1, 4.0, 1.55, 1.0, 0.7, m.artA, m.oak);
  kit.curtain(root, 0.09, 6.68, 7.08, 2.38);
  plant(kit, root, 0.32, 4.55, 'snake', 0.9, 71, m.potBlack);
  plant(kit, root, 3.1, 4.42, 'fiddle', 1.4, 72);
  plant(kit, root, 3.25, 6.95, 'bush', 0.55, 73, m.potStone);
  planter(kit, root, 0.4, 7.5, 2.2, 7.95, 81);
  kit.pointLight(root, 1.8, 2.0, 5.6, '#ffd6a5', 3.2);
  kit.pointLight(root, 4.4, 2.0, 5.4, '#ffd6a5', 2.6);

  // --- Galley kitchen ---
  fridge(kit, root, 7.07, 3.92, FACE.s);
  kitchenRun(kit, root, 8.465, 3.92, FACE.s, 2.17, { hob: 0.45, hood: true, uppers: [-1.0, 0.0] });
  kitchenRun(kit, root, 8.155, 6.0, FACE.n, 2.79, { sink: -0.95, uppers: [-1.35, 0.6] });
  kit.pointLight(root, 8.2, 2.0, 4.95, '#ffe0bd', 2.8);

  // --- Corridor, passage, entry hall ---
  kit.art(root, 'x', 2.92, 1, 5.6, 1.5, 0.55, 0.7, m.artC, m.blackMetal);
  plant(kit, root, 6.95, 6.5, 'bush', 0.6, 74, m.potStone);
  rug(kit, root, 7.6, 6.3, 9.3, 7.15, m.rugBedroom);
  kit.pointLight(root, 6.0, 2.0, 3.35, '#ffd6a5', 1.6, true);
  kit.pointLight(root, 8.2, 2.0, 6.7, '#ffd6a5', 1.4, true);

  // --- Primary bedroom ---
  rug(kit, root, 0.0, 1.2, 2.2, 3.2, m.rugBedroom);
  headboardWall(kit, root, 1.1, 0, FACE.s, 1.2);
  bed(kit, root, 1.1, 0.035, FACE.s);
  kit.cove(root, -0.66, 0, 2.85, 3.95);
  wardrobe(kit, root, 2.85, 1.7, FACE.w, 2.2);
  plant(kit, root, -0.35, 3.45, 'bush', 0.55, 75, m.potStone);
  kit.curtain(root, -0.57, 0.55, 0.95, 2.38);
  kit.pointLight(root, 1.1, 2.0, 1.9, '#ffd6a5', 3);

  // --- Bath 1 ---
  bathTiles(kit, root, [2.97, 0, 4.6, 2.8], [{ side: 's', a: 3.2, b: 3.9 }]);
  shower(kit, root, [2.97, 0, 4.0, 0.85], { along: 'x', at: 0.85, from: 2.97, to: 3.7 }, [3.45, 0.4]);
  toilet(kit, root, 4.6, 1.5, FACE.w);
  nicheShelves(kit, root, 4.6, 1.5, FACE.w, 0.5);
  vanity(kit, root, 4.6, 2.3, FACE.w, { width: 0.7 });
  kit.pointLight(root, 3.8, 2.0, 1.4, '#fff0de', 2.0, true);

  // --- Bedroom 2 ---
  headboardWall(kit, root, 4.72, 1.25, FACE.e, 1.0);
  bed(kit, root, 4.755, 1.25, FACE.e, { width: 1.4, throwMat: m.pillowSage });
  kit.cove(root, 4.72, 0, 7.25, 2.8);
  kit.pointLight(root, 6.0, 2.0, 1.4, '#ffd6a5', 2.6);

  // --- Bath 2 ---
  bathTiles(kit, root, [7.37, 0, 8.75, 2.8], [{ side: 's', a: 7.5, b: 8.2 }]);
  shower(kit, root, [7.37, 0, 8.3, 0.85], { along: 'x', at: 0.85, from: 7.9, to: 8.3 }, [7.85, 0.4]);
  toilet(kit, root, 8.75, 1.5, FACE.w);
  nicheShelves(kit, root, 8.75, 1.5, FACE.w, 0.5);
  vanity(kit, root, 8.75, 2.3, FACE.w, { reflect: true, width: 0.7 });
  kit.pointLight(root, 8.05, 2.0, 1.4, '#fff0de', 2.2);

  // --- Bedroom 3 ---
  bed(kit, root, 10.15, 0, FACE.s, { width: 1.4, nightstands: false, throwMat: m.pillowCharcoal });
  kit.cove(root, 8.87, 0, 11.0, 2.8);
  wardrobe(kit, root, 8.87, 0.95, FACE.e, 1.6, 0.55);
  kit.curtain(root, 10.91, 0.65, 1.0, 2.25);
  kit.pointLight(root, 10.0, 2.0, 1.5, '#ffd6a5', 2.4);
  planter(kit, root, 9.1, -0.65, 10.5, -0.2, 83);

  // --- Maid's room (compact single bed against the east wall) + WC ---
  bed(kit, root, 10.55, 2.92, FACE.s, { width: 0.85, length: 1.66, nightstands: false, throwMat: m.pillowCharcoal });
  kit.art(root, 'x', 2.92, 1, 9.95, 1.5, 0.35, 0.45, m.artB, m.oak);
  kit.pointLight(root, 10.3, 2.0, 3.8, '#ffd6a5', 1.4, true);
  bathTiles(kit, root, [9.75, 6.12, 11.0, 7.3], [{ side: 'w', a: 6.35, b: 7.0 }]);
  toilet(kit, root, 11.0, 6.92, FACE.w);
  vanity(kit, root, 10.62, 6.12, FACE.s, { width: 0.45 });

  // --- Balcony ---
  balcony(kit, root, [-0.86, 4.07, -0.2, 7.3], ['w', 's']);
  plant(kit, root, -0.53, 4.5, 'bush', 0.5, 76, m.potStone);
  plant(kit, root, -0.53, 5.7, 'snake', 0.75, 77, m.potBlack);
  plant(kit, root, -0.53, 6.85, 'bush', 0.5, 78, m.potTerracotta);

  // Downlights
  for (const [x, z] of [[1.1, 1.4], [1.1, 3.0], [3.8, 1.6], [6.0, 1.0], [8.05, 1.4], [10.0, 1.2], [4.0, 3.35], [7.0, 3.35], [8.2, 4.95], [1.5, 5.7], [5.2, 6.6], [8.2, 6.7], [10.3, 3.8], [10.3, 6.7]]) {
    kit.downlight(root, x, z);
  }
  return finish(root);
}

export const threeBedroom: ApartmentDef = {
  slug: 'three-bedroom',
  name: 'Three Bedroom',
  shortName: '3 Bed',
  path: '/3-bedroom',
  planImage: { src: '/floorplan-3bed.png', width: 640, height: 419 },
  bounds: [-0.86, -0.65, 11.2, 7.95],
  build,
  paper: (kit) => ({
    sheet: [-2.7, -1.75, 13.05, 9.0],
    labels: [
      { x: 1.1, z: 2.95, name: 'PRIMARY BEDROOM', area: '17 m²' },
      { x: 3.5, z: 1.75, name: 'BATH' },
      { x: 5.95, z: 2.45, name: 'BEDROOM 2', area: '12 m²' },
      { x: 7.78, z: 1.75, name: 'BATH' },
      { x: 10.1, z: 2.55, name: 'BEDROOM 3', area: '11 m²' },
      { x: 4.6, z: 6.75, name: 'LIVING / DINING', area: '29 m²' },
      { x: 8.15, z: 5.08, name: 'KITCHEN', area: '10 m²' },
      { x: 9.95, z: 4.4, name: 'MAID', area: '6 m²' },
      { x: 10.0, z: 6.95, name: 'WC' },
      { x: 8.1, z: 6.85, name: 'HALL' },
      { x: -0.53, z: 5.7, name: 'BALCONY', rotate: true },
    ],
    dims: [[-0.86, -1.1, 11.2, -1.1, '12.06'], [11.75, -0.2, 11.75, 7.5, '7.70']],
    north: [-2.05, -1.15],
    scaleBar: [-2.2, 8.5],
    titleBlock: [8.4, 8.2, 12.85, 8.82],
    titleLines: ['TYPE C — THREE BEDROOM APARTMENT', '105 m² NET · 130 m² GROSS (INCL. PARKING)'],
    draw: drawRecordedPlan(kit.plan),
  }),
  keys: [
    // 01 Overview — paper plan, tilting as the model rises
    { u: 0.0, pos: [5.17, 28.0, 3.62], target: [5.17, 0, 3.62], fov: 40, shift: 0.22 },
    { u: 1.0, pos: [5.2, 17.0, 6.2], target: [5.2, 0, 3.7], fov: 40, shift: 0.22 },
    // Descend over the entry hall into the living room
    { u: 1.8, pos: [7.6, 6.0, 6.8], target: [3.5, 0.4, 5.2], fov: 46, shift: 0.12 },
    { u: 2.5, pos: [6.6, 2.6, 6.5], target: [2.5, 0.8, 5.5], fov: 52, shift: 0.2 },
    // 02 Living & dining — from the entry, across the dining table to the sofa
    { u: 3.1, pos: [6.3, 1.62, 6.55], target: [0.8, 0.8, 5.5], fov: 56, shift: 0.22 },
    { u: 4.1, pos: [5.95, 1.6, 6.6], target: [0.7, 0.8, 5.45], fov: 56, shift: 0.22 },
    // Turn (via north) to the kitchen door
    { u: 4.45, pos: [6.05, 1.62, 5.9], target: [5.8, 1.2, 3.0], fov: 58, shift: 0 },
    { u: 4.8, pos: [6.1, 1.62, 5.15], target: [9.0, 1.1, 5.0], fov: 58, shift: 0 },
    // 03 Galley kitchen
    { u: 5.4, pos: [7.2, 1.62, 5.1], target: [9.4, 0.95, 4.6], fov: 62, shift: -0.2 },
    { u: 6.4, pos: [7.4, 1.6, 5.05], target: [9.45, 0.95, 4.55], fov: 62, shift: -0.2 },
    // Back through the living room, into the corridor, to the primary bedroom
    { u: 6.9, pos: [6.1, 1.62, 5.1], target: [5.6, 1.2, 2.5], fov: 58, shift: 0 },
    { u: 7.4, pos: [5.85, 1.62, 4.3], target: [4.0, 1.2, 2.2], fov: 58, shift: 0 },
    { u: 7.65, pos: [5.5, 1.62, 3.45], target: [2.5, 1.2, 3.3], fov: 58, shift: 0 },
    { u: 7.9, pos: [4.4, 1.62, 3.4], target: [1.5, 1.0, 3.3], fov: 58, shift: 0 },
    { u: 8.3, pos: [3.2, 1.62, 3.45], target: [0.8, 0.9, 1.4], fov: 60, shift: 0.1 },
    // 04 Primary bedroom
    { u: 8.7, pos: [2.35, 1.7, 3.5], target: [0.4, 0.75, 0.9], fov: 62, shift: 0.2 },
    { u: 9.7, pos: [2.15, 1.66, 3.55], target: [0.3, 0.75, 0.95], fov: 62, shift: 0.2 },
    // Back along the corridor to bedroom 2
    { u: 10.3, pos: [2.7, 1.62, 3.5], target: [5.0, 1.2, 3.3], fov: 58, shift: 0 },
    { u: 10.9, pos: [4.6, 1.62, 3.35], target: [7.0, 1.2, 2.2], fov: 58, shift: 0 },
    { u: 11.4, pos: [6.7, 1.62, 3.35], target: [6.6, 1.0, 0.6], fov: 60, shift: 0 },
    // 05 Bedroom 2
    { u: 11.9, pos: [6.7, 1.7, 2.4], target: [4.9, 0.7, 0.85], fov: 64, shift: 0.2 },
    { u: 12.9, pos: [6.75, 1.66, 2.5], target: [4.85, 0.7, 0.9], fov: 64, shift: 0.2 },
    // Next door to bath 2
    { u: 13.15, pos: [6.72, 1.62, 2.95], target: [6.4, 1.2, 5.6], fov: 60, shift: 0 },
    { u: 13.4, pos: [6.75, 1.62, 3.35], target: [9.6, 1.2, 3.3], fov: 60, shift: 0 },
    { u: 13.9, pos: [7.85, 1.62, 3.35], target: [8.0, 1.0, 0.6], fov: 62, shift: 0 },
    // 06 Bathroom
    { u: 14.4, pos: [7.9, 1.62, 2.45], target: [8.25, 0.95, 0.45], fov: 68, shift: -0.18 },
    { u: 15.4, pos: [7.85, 1.58, 2.3], target: [8.2, 0.95, 0.4], fov: 68, shift: -0.18 },
    // Crane up and out to the final aerial
    { u: 16.0, pos: [7.8, 3.6, 2.2], target: [7.0, 0, 2.0], fov: 56, shift: 0 },
    { u: 16.9, pos: [3.0, 8.0, 11.0], target: [5.17, 0.3, 3.7], fov: 45, shift: 0 },
    // 07 Final
    { u: 17.8, pos: [-6.0, 12.0, 15.0], target: [5.17, 0.3, 3.7], fov: 40, shift: -0.25, lift: 0.5 },
    { u: 18.9, pos: [-4.0, 12.8, 16.2], target: [5.4, 0.3, 3.7], fov: 40, shift: -0.25, lift: 0.5 },
  ],
  holds: [[0, 1], [3.1, 4.1], [5.4, 6.4], [8.7, 9.7], [11.9, 12.9], [14.4, 15.4], [17.8, 18.9]],
  stats: [['105 m²', 'Net Area'], ['130 m²', 'Gross incl. Parking'], ['3', 'Bedrooms'], ['2', 'Bathrooms'], ['1', 'Maid’s Room']],
  scenes: [
    {
      id: 'overview',
      title: 'Space for the Whole Family',
      description: 'A generous three-bedroom apartment with a master en-suite, a maid’s room, a separate kitchen and private parking.',
      area: '105 m² net · 130 m² gross incl. parking',
      position: 'left',
    },
    {
      id: 'living-dining',
      title: 'The Heart of the Home',
      description: 'A wide living and dining room with full-height glazing and room for everyone at the table.',
      area: '29 m² · Living & Dining',
      position: 'left',
    },
    {
      id: 'kitchen',
      title: 'A Proper Galley Kitchen',
      description: 'A separate galley kitchen with counters on both sides and a full-height fridge.',
      area: '10 m² · Kitchen',
      position: 'right',
    },
    {
      id: 'primary-bedroom',
      title: 'The Primary Suite',
      description: 'A corner bedroom with full-height glazing, a wall of wardrobes and its own en-suite bathroom.',
      area: '17 m² · Master Bedroom',
      position: 'left',
    },
    {
      id: 'bedrooms',
      title: 'Two More Bedrooms',
      description: 'Two further bedrooms for children, guests or a study, each with its own window.',
      area: '12 m² + 11 m² · Bedrooms',
      position: 'left',
    },
    {
      id: 'bathrooms',
      title: 'Two Full Bathrooms',
      description: 'A master en-suite and a common bathroom, both with walk-in showers and stone-look tiling.',
      area: '9 m² + 7 m² · Bathrooms',
      position: 'right',
    },
    {
      id: 'final',
      title: 'A Home That Grows With You',
      description: 'Discover a home where thoughtful planning meets modern living.',
      position: 'right',
      isFinal: true,
    },
  ],
};
