import * as THREE from 'three';
import { seededRandom } from './textures';
import type { PlanOp } from './kit';
import type { PaperSpec } from './types';

// ============================================================
// PAPER PLAN INTRO
// The tour opens on a printed architectural drawing lying exactly over
// the model. The plan is vector linework drawn from the same data as the
// 3D model (so it stays crisp at any size), with room labels,
// dimensions, a scale bar and a title block. As the visitor scrolls the
// sheet fades and the model rises out of it (ApartmentScene).
// ============================================================

/** Height of the sheet: just above the wall tops */
const SHEET_Y = 2.9;
const PX_PER_M = 240;
/** Sheet bounds of the plan being drawn (set by drawSheet) */
let SHEET = { x0: 0, x1: 1, z0: 0, z1: 1 };
/** Canvas supersampling for crisp linework and text */
const RES = 1.5;

const INK = '#23352e';
const INK_SOFT = 'rgba(35, 53, 46, 0.7)';
/** Canvas font stack; picks up the self-hosted Inter (next/font) at draw time */
let FONT = "'Helvetica Neue', Arial, sans-serif";

const px = (x: number) => (x - SHEET.x0) * PX_PER_M;
const py = (z: number) => (z - SHEET.z0) * PX_PER_M;

function label(ctx: CanvasRenderingContext2D, x: number, z: number, name: string, area?: string, rotate = false) {
  ctx.save();
  ctx.translate(px(x), py(z));
  if (rotate) ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = `600 30px ${FONT}`;
  ctx.letterSpacing = '5px';
  // Paper-coloured backing keeps labels legible over linework
  const tw = ctx.measureText(name).width + 24;
  ctx.fillStyle = 'rgba(244, 240, 232, 0.88)';
  ctx.fillRect(-tw / 2, -30, tw, area ? 76 : 42);
  ctx.fillStyle = INK;
  ctx.fillText(name, 0, 0);
  if (area) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = `400 24px ${FONT}`;
    ctx.letterSpacing = '2px';
    ctx.fillText(area, 0, 34);
  }
  ctx.restore();
}

/** Architectural dimension line with end ticks and a centred figure */
function dimension(ctx: CanvasRenderingContext2D, ax: number, az: number, bx: number, bz: number, text: string) {
  const [x0, y0, x1, y1] = [px(ax), py(az), px(bx), py(bz)];
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  for (const [x, y] of [[x0, y0], [x1, y1]]) {
    ctx.moveTo(x - 10, y + 10);
    ctx.lineTo(x + 10, y - 10);
  }
  ctx.stroke();
  ctx.save();
  ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
  if (Math.abs(x1 - x0) < Math.abs(y1 - y0)) ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(-52, -18, 104, 36);
  ctx.fillStyle = INK;
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

// ------------------------------------------------------------
// Vector floor plan, drawn in plan metres
// ------------------------------------------------------------
const WALL = '#1d3a31';
const LINE = 'rgba(35, 53, 46, 0.78)';
const FILL = 'rgba(35, 53, 46, 0.055)';
const HATCH = 'rgba(35, 53, 46, 0.13)';
const PAPER = '#f4f0e8';

/** Hand-drawn linework for the 1-bedroom (drawn in plan metres) */
export function drawOneBedroomPlan(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const thin = 0.006;
  const med = 0.011;

  const line = (x0: number, z0: number, x1: number, z1: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, z0);
    ctx.lineTo(x1, z1);
    ctx.stroke();
  };
  const box = (x0: number, z0: number, x1: number, z1: number, r = 0.02, fill = true) => {
    ctx.beginPath();
    ctx.roundRect(x0, z0, x1 - x0, z1 - z0, r);
    if (fill) ctx.fill();
    ctx.stroke();
  };
  const circle = (x: number, z: number, r: number, fill = true) => {
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    if (fill) ctx.fill();
    ctx.stroke();
  };
  const ellipse = (x: number, z: number, rx: number, rz: number) => {
    ctx.beginPath();
    ctx.ellipse(x, z, rx, rz, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  const dashed = (on: boolean) => ctx.setLineDash(on ? [0.05, 0.035] : []);
  const plant = (x: number, z: number, r: number) => {
    circle(x, z, r * 0.45);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * r * 0.6, z + Math.sin(a) * r * 0.6, r * 0.42, r * 0.17, a, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // --- Floor finishes ---
  ctx.strokeStyle = HATCH;
  ctx.lineWidth = 0.004;
  const boards = (x0: number, x1: number, z0: number, z1: number) => {
    for (let z = z0 + 0.2; z < z1 - 0.01; z += 0.2) line(x0, z, x1, z);
  };
  boards(0, 4.04, 0, 3.09);
  boards(0, 6.5, 3.21, 6.6);
  boards(4.16, 6.5, 2.06, 3.09);
  for (let x = 4.16 + 0.6; x < 6.5; x += 0.6) line(x, 0, x, 1.94);
  for (let z = 0.3; z < 1.94; z += 0.3) line(4.16, z, 6.5, z);
  for (let x = -1.5 + 0.13; x < -0.2; x += 0.13) line(x, -0.2, x, 6.8);

  // --- Furniture ---
  ctx.fillStyle = FILL;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = thin;

  // Living
  dashed(true);
  box(0.6, 3.95, 3.3, 6.0, 0.01, false);
  dashed(false);
  box(0.25, 5.7, 3.0, 6.58, 0.05);
  box(0.25, 4.8, 1.12, 5.72, 0.05);
  box(0.25, 6.42, 3.0, 6.58, 0.03);
  box(2.8, 5.7, 3.0, 6.58, 0.04);
  box(0.25, 4.8, 0.42, 6.58, 0.04);
  line(1.125, 5.74, 1.125, 6.4);
  line(1.965, 5.74, 1.965, 6.4);
  box(0.53, 6.0, 0.97, 6.18, 0.04);
  box(1.41, 6.0, 1.83, 6.18, 0.04);
  box(2.28, 6.0, 2.72, 6.18, 0.04);
  ellipse(2.05, 4.65, 0.65, 0.36);
  box(0.35, 3.21, 2.85, 3.6, 0.01);
  ctx.lineWidth = med;
  line(0.88, 3.24, 2.33, 3.24);
  ctx.lineWidth = thin;
  circle(0.62, 4.42, 0.17);
  dashed(true);
  ctx.beginPath();
  ctx.moveTo(0.62, 4.42);
  ctx.quadraticCurveTo(0.7, 4.5, 1.75, 4.62);
  ctx.stroke();
  dashed(false);
  circle(1.75, 4.62, 0.17);
  plant(3.25, 3.5, 0.32);
  plant(3.3, 6.3, 0.2);
  plant(2.6, 3.42, 0.14);

  // Kitchen
  box(4.63, 5.98, 6.5, 6.6, 0.01);
  box(5.88, 5.25, 6.5, 5.98, 0.01);
  box(5.9, 4.6, 6.5, 5.25, 0.01);
  line(5.9, 4.6, 6.5, 5.25);
  line(5.9, 5.25, 6.5, 4.6);
  box(4.9, 6.05, 5.48, 6.5, 0.02);
  for (const [x, z] of [[5.05, 6.16], [5.33, 6.16], [5.05, 6.39], [5.33, 6.39]]) circle(x, z, 0.08, false);
  box(5.95, 6.08, 6.4, 6.45, 0.04);
  circle(6.17, 6.27, 0.02, false);
  dashed(true);
  box(4.65, 6.25, 5.88, 6.6, 0.01, false);
  dashed(false);
  box(4.12, 4.22, 4.88, 5.48, 0.01);
  circle(3.97, 4.55, 0.18);
  circle(3.97, 5.15, 0.18);
  plant(6.3, 5.45, 0.14);

  // Bedroom
  dashed(true);
  box(0.7, 1.25, 3.15, 2.95, 0.01, false);
  dashed(false);
  box(1.0, 0, 2.84, 0.12, 0.03);
  box(1.08, 0.12, 2.76, 2.22, 0.04);
  box(1.17, 0.18, 1.83, 0.6, 0.06);
  box(2.01, 0.18, 2.67, 0.6, 0.06);
  line(1.08, 0.78, 2.76, 0.78);
  line(1.08, 1.02, 2.76, 1.02);
  box(1.06, 1.75, 2.78, 2.08, 0.01);
  box(0.5, 0.06, 0.94, 0.46, 0.02);
  box(2.9, 0.06, 3.34, 0.46, 0.02);
  circle(0.72, 0.24, 0.11, false);
  circle(3.12, 0.24, 0.11, false);
  box(3.48, 0.04, 4.04, 2.0, 0.01);
  line(3.48, 0.695, 4.04, 0.695);
  line(3.48, 1.345, 4.04, 1.345);
  dashed(true);
  line(3.76, 0.1, 3.76, 1.94);
  dashed(false);
  box(1.35, 2.34, 2.5, 2.66, 0.04);
  plant(0.4, 1.15, 0.3);

  // Bathroom
  box(5.1, 0, 5.75, 0.18, 0.01);
  ellipse(5.43, 0.44, 0.17, 0.25);
  box(4.16, 0.83, 4.68, 1.67, 0.01);
  ellipse(4.43, 1.22, 0.16, 0.18);
  ctx.lineWidth = med;
  line(4.19, 0.9, 4.19, 1.54);
  line(5.75, 0.68, 5.75, 1.3);
  ctx.lineWidth = thin;
  dashed(true);
  box(5.75, 0.68, 6.5, 1.94, 0.01, false);
  circle(6.15, 1.3, 0.15, false);
  dashed(false);
  line(5.85, 1.86, 6.4, 1.86);
  box(5.85, 0.04, 6.48, 0.55, 0.01);
  line(5.85, 0.3, 6.48, 0.3);
  line(4.3, 1.9, 4.75, 1.9);

  // Balconies
  ctx.lineWidth = med;
  line(-1.47, -0.2, -1.47, 6.8);
  line(-1.47, -0.185, -0.2, -0.185);
  line(-1.47, 6.785, -0.2, 6.785);
  ctx.lineWidth = thin;
  box(-1.44, 3.17, -0.2, 3.23, 0.005);
  circle(-0.85, 1.45, 0.3);
  box(-1.06, 0.68, -0.64, 1.08, 0.03);
  box(-1.06, 1.82, -0.64, 2.22, 0.03);
  box(-1.3, 4.55, -0.45, 5.35, 0.04);
  line(-1.3, 5.2, -0.45, 5.2);
  plant(-0.8, 0.2, 0.32);
  plant(-0.45, 2.75, 0.17);
  plant(-0.5, 3.6, 0.28);
  plant(-0.8, 6.45, 0.32);

  // --- Doors: leaves, swings, and the bathroom pocket door ---
  ctx.lineWidth = med;
  line(4.04, 2.98, 3.24, 2.98);
  line(6.5, 3.45, 5.62, 3.45);
  ctx.lineWidth = thin;
  ctx.beginPath();
  ctx.arc(4.04, 3.0, 0.8, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6.5, 3.45, 0.88, Math.PI / 2, Math.PI);
  ctx.stroke();
  dashed(true);
  line(5.6, 2.0, 6.35, 2.0);
  dashed(false);

  // --- West glazing (sliding doors) ---
  for (const [a, b] of [[0.3, 3.0], [3.4, 6.3]]) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(-0.2, a, 0.2, b - a);
    ctx.lineWidth = thin;
    line(-0.2, a, -0.2, b);
    line(0, a, 0, b);
    ctx.lineWidth = med;
    line(-0.12, a, -0.12, b);
    const pw = (b - a) / 3;
    for (let i = 1; i < 3; i++) line(-0.16, a + i * pw, -0.08, a + i * pw);
  }
  ctx.lineWidth = thin;
  line(-0.06, 1.2, -0.06, 2.1);
  line(-0.06, 4.37, -0.06, 5.33);

  // --- Walls (solid poché) ---
  ctx.fillStyle = WALL;
  const walls: [number, number, number, number][] = [
    [-0.2, -0.2, 6.7, 0], [-0.2, 6.6, 6.7, 6.8], [6.5, 0, 6.7, 3.45], [6.5, 4.35, 6.7, 6.6],
    [-0.2, 0, 0, 0.3], [-0.2, 3.0, 0, 3.4], [-0.2, 6.3, 0, 6.6],
    [0, 3.09, 4.4, 3.21], [5.4, 3.09, 6.5, 3.21],
    [4.04, 0, 4.16, 2.2], [4.04, 3.0, 4.16, 3.09],
    [4.16, 1.94, 4.85, 2.06], [5.6, 1.94, 6.5, 2.06],
  ];
  for (const [x0, z0, x1, z1] of walls) ctx.fillRect(x0, z0, x1 - x0, z1 - z0);

  ctx.restore();
}

/**
 * Draws linework recorded by the kit while the model was built
 * (in plan metres): floor finishes, then furniture, doors and glazing,
 * with solid walls on top.
 */
export function drawRecordedPlan(ops: PlanOp[]) {
  return (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const thin = 0.006;
    const med = 0.011;
    const line = (x0: number, z0: number, x1: number, z1: number) => {
      ctx.beginPath();
      ctx.moveTo(x0, z0);
      ctx.lineTo(x1, z1);
      ctx.stroke();
    };
    const dashed = (on: boolean) => ctx.setLineDash(on ? [0.05, 0.035] : []);

    // Floor finishes
    ctx.strokeStyle = HATCH;
    ctx.lineWidth = 0.004;
    for (const op of ops) {
      if (op.k !== 'floor') continue;
      const [x0, z0, x1, z1] = op.r;
      if (op.kind === 'boards') for (let z = z0 + 0.2; z < z1 - 0.01; z += 0.2) line(x0, z, x1, z);
      if (op.kind === 'deck') for (let x = x0 + 0.13; x < x1 - 0.01; x += 0.13) line(x, z0, x, z1);
      if (op.kind === 'tiles') {
        for (let x = x0 + 0.6; x < x1 - 0.01; x += 0.6) line(x, z0, x, z1);
        for (let z = z0 + 0.3; z < z1 - 0.01; z += 0.3) line(x0, z, x1, z);
      }
    }

    // Furniture, doors, fixtures
    ctx.fillStyle = FILL;
    ctx.strokeStyle = LINE;
    for (const op of ops) {
      ctx.lineWidth = thin;
      dashed(false);
      switch (op.k) {
        case 'box': {
          const [x0, z0, x1, z1] = op.r;
          dashed(op.dashed);
          ctx.beginPath();
          ctx.roundRect(x0, z0, x1 - x0, z1 - z0, Math.min(op.round, (x1 - x0) / 2, (z1 - z0) / 2));
          if (op.fill) ctx.fill();
          ctx.stroke();
          break;
        }
        case 'circle':
          dashed(op.dashed);
          ctx.beginPath();
          ctx.arc(op.c[0], op.c[1], op.r, 0, Math.PI * 2);
          if (op.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(op.c[0], op.c[1], op.rx, op.rz, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'line':
          ctx.lineWidth = op.heavy ? med : thin;
          dashed(op.dashed);
          line(op.a[0], op.a[1], op.b[0], op.b[1]);
          break;
        case 'arc':
          ctx.beginPath();
          ctx.arc(op.c[0], op.c[1], op.r, op.a0, op.a1);
          ctx.stroke();
          break;
        case 'plant': {
          const [x, z] = op.c;
          const r = op.r;
          ctx.beginPath();
          ctx.arc(x, z, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + 0.3;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(a) * r * 0.6, z + Math.sin(a) * r * 0.6, r * 0.42, r * 0.17, a, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
        default:
          break;
      }
    }
    dashed(false);

    // Glazing and windows
    for (const op of ops) {
      if (op.k === 'glazing') {
        const { along, line: l, a, b, panels } = op;
        const seg = (v0: number, v1: number, u: number) => (along === 'z' ? line(l + u, v0, l + u, v1) : line(v0, l + u, v1, l + u));
        ctx.fillStyle = PAPER;
        if (along === 'z') ctx.fillRect(l - 0.1, a, 0.2, b - a);
        else ctx.fillRect(a, l - 0.1, b - a, 0.2);
        ctx.lineWidth = thin;
        seg(a, b, -0.1);
        seg(a, b, 0.1);
        ctx.lineWidth = med;
        seg(a, b, -0.02);
        const pw = (b - a) / panels;
        for (let i = 1; i < panels; i++) {
          const v = a + i * pw;
          if (along === 'z') line(l - 0.06, v, l + 0.02, v);
          else line(v, l - 0.06, v, l + 0.02);
        }
        if (op.open !== undefined) {
          ctx.lineWidth = thin;
          const n = op.open > 0 ? op.open - 1 : op.open + 1;
          seg(a + n * pw, a + (n + 1) * pw, 0.04);
        }
      }
      if (op.k === 'window') {
        const { along, line: l, thick, a, b } = op;
        ctx.fillStyle = PAPER;
        if (along === 'z') ctx.fillRect(l - thick / 2, a, thick, b - a);
        else ctx.fillRect(a, l - thick / 2, b - a, thick);
        ctx.lineWidth = thin;
        for (const u of [-thick / 2, 0, thick / 2]) {
          if (along === 'z') line(l + u, a, l + u, b);
          else line(a, l + u, b, l + u);
        }
      }
    }

    // Walls (solid poché)
    ctx.fillStyle = WALL;
    for (const op of ops) {
      if (op.k !== 'wall') continue;
      const [x0, z0, x1, z1] = op.r;
      ctx.fillRect(x0, z0, x1 - x0, z1 - z0);
    }
    ctx.restore();
  };
}

function drawSheet(spec: PaperSpec) {
  const [sx0, sz0, sx1, sz1] = spec.sheet;
  SHEET = { x0: sx0, x1: sx1, z0: sz0, z1: sz1 };
  const w = Math.round((SHEET.x1 - SHEET.x0) * PX_PER_M);
  const h = Math.round((SHEET.z1 - SHEET.z0) * PX_PER_M);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * RES);
  canvas.height = Math.round(h * RES);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(RES, RES);
  const rand = seededRandom(101);

  // Paper with faint fibres and a soft vignette
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    ctx.strokeStyle = `rgba(120, 105, 80, ${0.02 + rand() * 0.04})`;
    ctx.lineWidth = 1;
    const x = rand() * w;
    const y = rand() * h;
    const a = rand() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
    ctx.stroke();
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(90,70,40,0.12)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Drawing frame
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 50, w - 100, h - 100);

  // Plan linework in metres
  ctx.save();
  ctx.translate(-SHEET.x0 * PX_PER_M, -SHEET.z0 * PX_PER_M);
  ctx.scale(PX_PER_M, PX_PER_M);
  spec.draw(ctx);
  ctx.restore();

  // Room labels
  for (const l of spec.labels) label(ctx, l.x, l.z, l.name, l.area, l.rotate);

  // Overall dimensions
  for (const [ax, az, bx, bz, t] of spec.dims) dimension(ctx, ax, az, bx, bz, t);

  // North arrow
  const nx = px(spec.north[0]);
  const ny = py(spec.north[1]);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(nx, ny, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nx, ny - 32);
  ctx.lineTo(nx + 14, ny + 18);
  ctx.lineTo(nx, ny + 8);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny - 48);

  // Scale bar (metres)
  const sx = px(spec.scaleBar[0]);
  const sy = py(spec.scaleBar[1]);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? INK : '#f4f0e8';
    ctx.fillRect(sx + i * PX_PER_M, sy, PX_PER_M, 14);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, sy, PX_PER_M * 3, 14);
  ctx.fillStyle = INK;
  ctx.font = `500 22px ${FONT}`;
  ctx.textAlign = 'center';
  for (let i = 0; i <= 3; i++) ctx.fillText(`${i}`, sx + i * PX_PER_M, sy - 10);
  ctx.textAlign = 'left';
  ctx.fillText('m', sx + PX_PER_M * 3 + 14, sy + 13);

  // Title block
  const tx0 = px(spec.titleBlock[0]);
  const ty0 = py(spec.titleBlock[1]);
  const tx1 = px(spec.titleBlock[2]);
  const ty1 = py(spec.titleBlock[3]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(tx0, ty0, tx1 - tx0, ty1 - ty0);
  ctx.beginPath();
  ctx.moveTo(tx0 + 420, ty0);
  ctx.lineTo(tx0 + 420, ty1);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.font = `700 34px ${FONT}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('MERIT', tx0 + 28, ty0 + 58);
  ctx.fillText('PROPERTIES', tx0 + 28, ty0 + 102);
  ctx.letterSpacing = '2px';
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText(spec.titleLines[0], tx0 + 450, ty0 + 44);
  ctx.font = `400 23px ${FONT}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(spec.titleLines[1], tx0 + 450, ty0 + 82);
  ctx.fillText('FLOOR PLAN · SCALE 1:50', tx0 + 450, ty0 + 118);
  ctx.letterSpacing = '0px';

  return canvas;
}

/** Soft blurred rectangle used as the sheet's drop shadow */
function shadowCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fillRect(40, 40, 176, 176);
  return c;
}

export async function createPaperPlan(spec: PaperSpec, anisotropy: number) {
  await document.fonts?.ready.catch(() => undefined);
  const inter = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim();
  if (inter) FONT = `${inter}, 'Helvetica Neue', Arial, sans-serif`;

  const canvas = drawSheet(spec);
  const group = new THREE.Group();
  group.name = 'paper-plan';
  const w = SHEET.x1 - SHEET.x0;
  const d = SHEET.z1 - SHEET.z0;
  const cx = (SHEET.x0 + SHEET.x1) / 2;
  const cz = (SHEET.z0 + SHEET.z1) / 2;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  const sheetGeo = new THREE.PlaneGeometry(w, d);
  const sheetMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const sheet = new THREE.Mesh(sheetGeo, sheetMat);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(cx, SHEET_Y, cz);
  sheet.renderOrder = 10;

  const shadowTex = new THREE.CanvasTexture(shadowCanvas());
  const shadowGeo = new THREE.PlaneGeometry(w * 1.12, d * 1.14);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: 0.55 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx + 0.12, SHEET_Y - 0.02, cz + 0.18);
  shadow.renderOrder = 9;

  group.add(shadow, sheet);

  return {
    group,
    meshes: [sheet, shadow] as THREE.Object3D[],
    /** 1 = fully visible paper, 0 = gone */
    setOpacity(o: number) {
      sheetMat.opacity = o;
      shadowMat.opacity = 0.55 * o;
      group.visible = o > 0.001;
    },
    dispose() {
      tex.dispose();
      shadowTex.dispose();
      sheetGeo.dispose();
      shadowGeo.dispose();
      sheetMat.dispose();
      shadowMat.dispose();
    },
  };
}
