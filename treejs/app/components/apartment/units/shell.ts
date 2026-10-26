import * as THREE from 'three';
import { Kit, WALL_H } from '../kit';
import { BATH_TILE, FLOOR_TILE } from '../textures';
import type { Rect } from '../types';

/**
 * Slab, floor finishes and ceilings for a unit. Rects must not overlap
 * within each list (coplanar ceilings would z-fight).
 */
export function shell(kit: Kit, root: THREE.Group, o: { slab: Rect; wood: Rect[]; tiles: Rect[] }) {
  const m = kit.m;
  const [sx0, sz0, sx1, sz1] = o.slab;
  kit.block(root, sx0, sx1, -0.3, -0.002, sz0, sz1, m.concrete);
  for (const [x0, z0, x1, z1] of o.wood) {
    kit.floor(root, x0, x1, z0, z1, 0, m.oakFloor, FLOOR_TILE);
    kit.planFloor('boards', [x0, z0, x1, z1]);
    // Ceiling faces down only: invisible from above (dollhouse view), but
    // it still casts the roof shadow so sunlight enters via the glazing
    kit.floor(root, x0, x1, z0, z1, WALL_H, m.ceiling, 4, { down: true, cast: true, name: 'ceiling' });
  }
  for (const [x0, z0, x1, z1] of o.tiles) {
    kit.floor(root, x0, x1, z0, z1, 0.002, m.bathTile, BATH_TILE);
    kit.planFloor('tiles', [x0, z0, x1, z1]);
  }
}

/** Finish a built unit: static matrices, dynamic root for the intro */
export function finish(root: THREE.Group) {
  root.traverse((o) => {
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
  root.matrixAutoUpdate = true;
  root.updateMatrixWorld(true);
  return root;
}
