import type * as THREE from 'three';
import type { Kit } from './kit';

// ============================================================
// APARTMENT DEFINITION
// Everything that differs between unit types lives in one of these:
// the 3D model, the paper plan, the camera route and the copy. The
// renderer, scrolling and UI are shared by every unit.
// ============================================================

export type V3 = [number, number, number];

export interface CameraKey {
  u: number;
  pos: V3;
  target: V3;
  /** Vertical FOV in degrees at a 16:9 aspect */
  fov: number;
  /** Horizontal image shift (NDC) to keep the subject clear of the copy on wide screens */
  shift: number;
  /** Upward image shift on portrait screens, where the copy sits at the bottom (default 0.18) */
  lift?: number;
}

export interface SceneCopy {
  id: string;
  title: string;
  description: string;
  area?: string;
  position: 'left' | 'right';
  isFinal?: boolean;
}

export interface PlanLabel {
  x: number;
  z: number;
  name: string;
  area?: string;
  rotate?: boolean;
}

/** Plan-space rectangle: x0, z0, x1, z1 (metres) */
export type Rect = [number, number, number, number];

export interface PaperSpec {
  /** Sheet bounds in plan metres */
  sheet: Rect;
  labels: PlanLabel[];
  /** Dimension lines: ax, az, bx, bz, text */
  dims: [number, number, number, number, string][];
  north: [number, number];
  scaleBar: [number, number];
  titleBlock: Rect;
  titleLines: [string, string];
  /** Draws the plan linework (walls, furniture) in plan metres */
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface ApartmentDef {
  slug: string;
  /** e.g. "One Bedroom" */
  name: string;
  shortName: string;
  path: string;
  /** Original floor-plan image, shown when WebGL is unavailable */
  planImage: { src: string; width: number; height: number };
  /** Footprint including balconies, used for lighting, shadows and the site */
  bounds: Rect;
  /** Builds the model; the kit records plan linework as a side effect */
  build(kit: Kit): THREE.Group;
  paper(kit: Kit): PaperSpec;
  keys: CameraKey[];
  /** Unit ranges where each scene's copy is fully visible (one per scene) */
  holds: [number, number][];
  scenes: SceneCopy[];
  stats: [string, string][];
}
