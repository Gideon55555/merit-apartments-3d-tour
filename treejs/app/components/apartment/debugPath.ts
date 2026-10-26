import * as THREE from 'three';
import type { CameraRig } from './cameraPath';

// Dev-only (?debug): samples the camera path and reports how close the
// camera comes to geometry, and how fast the view direction turns.

export function reportPath(scene: THREE.Scene, rig: CameraRig) {
  const boxes: { box: THREE.Box3; label: string }[] = [];
  // Measure against the fully risen model (the intro starts it flattened)
  const apartment = scene.getObjectByName('apartment');
  const savedScale = apartment?.scale.y ?? 1;
  if (apartment) {
    apartment.scale.y = 1;
    apartment.updateMatrixWorld(true);
  }
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.name === 'ceiling' || o.parent?.name === 'trees') return;
    const geo = mesh.geometry;
    if (geo.type === 'PlaneGeometry' || geo.type === 'CircleGeometry' || geo.type === 'SphereGeometry' && geo.boundingSphere && geo.boundingSphere.radius > 50) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.max.y < 0.05 || box.min.y < -0.25 && box.max.y < 0.01) return;
    const c = box.getCenter(new THREE.Vector3());
    boxes.push({ box, label: `${geo.type} @ ${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}` });
  });

  if (apartment) {
    apartment.scale.y = savedScale;
    apartment.updateMatrixWorld(true);
  }

  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const prevDir = new THREE.Vector3();
  const lines: string[] = [];
  let maxTurn = 0;
  let maxTurnU = 0;
  let minTarget = Infinity;
  let minTargetU = 0;
  const step = 0.01;

  for (let u = 0; u <= rig.total + 1e-6; u += step) {
    rig.sample(u, pos, target);
    let min = Infinity;
    let label = '';
    for (const b of boxes) {
      const d = b.box.distanceToPoint(pos);
      if (d < min) {
        min = d;
        label = b.label;
      }
    }
    if (min < 0.15) lines.push(`u=${u.toFixed(2)} cam=${pos.toArray().map((v) => v.toFixed(2))} clearance=${min.toFixed(3)} near ${label}`);
    const td = pos.distanceTo(target);
    if (td < minTarget) {
      minTarget = td;
      minTargetU = u;
    }
    dir.subVectors(target, pos).normalize();
    if (u > 0) {
      const turn = THREE.MathUtils.radToDeg(dir.angleTo(prevDir)) / step;
      if (turn > maxTurn) {
        maxTurn = turn;
        maxTurnU = u;
      }
    }
    prevDir.copy(dir);
  }

  const report = [
    `boxes=${boxes.length}`,
    `max turn rate=${maxTurn.toFixed(1)} deg/unit at u=${maxTurnU.toFixed(2)}`,
    `min target distance=${minTarget.toFixed(2)} at u=${minTargetU.toFixed(2)}`,
    `close calls (<0.15m): ${lines.length}`,
    ...lines,
  ].join('\n');
  const pre = document.createElement('pre');
  pre.id = 'path-report';
  pre.textContent = report;
  pre.style.cssText = 'position:fixed;left:0;bottom:0;z-index:9999;max-height:40vh;overflow:auto;background:#000c;color:#0f0;font-size:11px;margin:0;padding:8px';
  document.body.appendChild(pre);
  console.info(report);
}
