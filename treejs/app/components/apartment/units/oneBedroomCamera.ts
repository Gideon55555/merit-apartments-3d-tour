import type { CameraKey } from '../types';

// Route: paper plan → descend into the living room → kitchen → through
// the hall into the bedroom → back out into the bathroom → crane up
// through the roof → exterior balcony view → final aerial.

export const ONE_BED_KEYS: CameraKey[] = [
  // 01 Overview — straight down onto the paper plan, tilting as the model rises
  { u: 0.0, pos: [2.35, 22.5, 3.35], target: [2.35, 0, 3.35], fov: 40, shift: 0.22 },
  { u: 1.0, pos: [2.6, 12.8, 4.9], target: [2.6, 0, 3.3], fov: 40, shift: 0.22 },
  // Descend over the kitchen into the living room
  { u: 1.8, pos: [5.6, 5.4, 6.0], target: [2.6, 0.4, 4.6], fov: 44, shift: 0.12 },
  { u: 2.5, pos: [5.3, 2.5, 3.9], target: [2.0, 0.8, 5.0], fov: 52, shift: 0.2 },
  // 02 Living & dining — from beside the hall opening, across to the sofa and glazing
  { u: 3.1, pos: [5.2, 1.6, 3.45], target: [1.3, 0.75, 5.4], fov: 54, shift: 0.22 },
  { u: 4.1, pos: [4.85, 1.58, 3.5], target: [1.2, 0.8, 5.35], fov: 54, shift: 0.22 },
  // Pan across the sofa wall while crossing the room
  { u: 4.6, pos: [3.9, 1.6, 3.95], target: [3.0, 0.9, 6.6], fov: 54, shift: 0 },
  // 03 Kitchen
  { u: 5.1, pos: [2.4, 1.65, 4.1], target: [5.9, 0.95, 5.85], fov: 50, shift: -0.22 },
  { u: 6.1, pos: [2.75, 1.6, 4.12], target: [5.95, 0.95, 5.8], fov: 50, shift: -0.22 },
  // Through the opening into the hall, then the bedroom door
  { u: 7.0, pos: [4.9, 1.6, 3.8], target: [4.95, 1.3, 1.4], fov: 55, shift: 0 },
  { u: 7.5, pos: [4.85, 1.6, 2.75], target: [2.6, 1.2, 2.4], fov: 55, shift: 0 },
  { u: 8.0, pos: [3.95, 1.6, 2.62], target: [1.6, 0.85, 1.3], fov: 58, shift: 0.1 },
  // 04 Bedroom — from the corner by the door
  { u: 8.4, pos: [3.72, 1.72, 2.72], target: [1.1, 0.8, 0.55], fov: 62, shift: 0.2 },
  { u: 9.4, pos: [3.52, 1.66, 2.76], target: [0.95, 0.8, 0.6], fov: 62, shift: 0.2 },
  // Turn round and head back to the hall
  { u: 9.8, pos: [3.75, 1.6, 2.7], target: [3.7, 1.0, 0.3], fov: 58, shift: 0 },
  { u: 10.3, pos: [4.1, 1.6, 2.62], target: [6.4, 1.3, 2.5], fov: 58, shift: 0 },
  { u: 10.8, pos: [5.25, 1.6, 2.6], target: [5.0, 1.0, 0.2], fov: 60, shift: 0 },
  // 05 Bathroom — in the pocket-door opening
  { u: 11.3, pos: [5.42, 1.62, 1.92], target: [5.3, 1.05, 0.1], fov: 66, shift: -0.18 },
  { u: 12.3, pos: [5.36, 1.58, 1.8], target: [5.2, 1.05, 0.1], fov: 66, shift: -0.18 },
  // Crane straight up through the roof and fly round to the facade
  { u: 12.9, pos: [5.2, 3.6, 1.6], target: [4.4, 0, 1.2], fov: 55, shift: 0 },
  { u: 13.7, pos: [1.6, 5.6, 4.8], target: [0.4, 0.6, 2.9], fov: 50, shift: 0.1 },
  { u: 14.4, pos: [-2.9, 3.6, 5.6], target: [-0.6, 1.0, 3.3], fov: 50, shift: 0.2 },
  // 06 Balconies — exterior, looking back into the apartment
  { u: 15.0, pos: [-4.7, 2.3, 4.3], target: [-0.5, 1.0, 3.0], fov: 52, shift: 0.22 },
  { u: 16.0, pos: [-4.5, 2.5, 2.9], target: [-0.5, 1.0, 3.2], fov: 52, shift: 0.22 },
  // Rise to the final aerial
  { u: 16.8, pos: [-5.6, 5.5, 7.5], target: [1.5, 0.5, 3.6], fov: 45, shift: 0 },
  // 07 Final
  { u: 17.6, pos: [-5.0, 8.6, 10.6], target: [2.6, 0.3, 3.3], fov: 40, shift: -0.25, lift: 0.5 },
  { u: 18.7, pos: [-3.0, 9.4, 11.8], target: [2.8, 0.3, 3.3], fov: 40, shift: -0.25, lift: 0.5 },
];

/** Unit ranges where each scene's copy is fully visible (camera "holds") */
export const ONE_BED_HOLDS: [number, number][] = [
  [0, 1], [3.1, 4.1], [5.1, 6.1], [8.4, 9.4], [11.3, 12.3], [15.0, 16.0], [17.6, 18.7],
];
