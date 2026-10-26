import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seededRandom } from './textures';

// ============================================================
// ENVIRONMENT & LIGHTING
// Late-afternoon sun from the west, so warm light pours through the
// balcony glazing. Image-based lighting provides soft bounce light
// and reflections; the sky dome and fog tie the horizon together.
// ============================================================

const SKY_TOP = new THREE.Color('#5d7891');
const SKY_HORIZON = new THREE.Color('#e9cfae');
const SKY_BOTTOM = new THREE.Color('#2a2622');
// Sun direction (towards the sun): west-south-west, ~33° elevation
export const SUN_DIR = new THREE.Vector3(-9, 6.5, 3.5).normalize();

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // pin to the far plane
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  uniform vec3 bottom;
  uniform vec3 sunDir;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0
      ? mix(horizon, top, pow(smoothstep(0.0, 1.0, h), 0.55))
      : mix(horizon, bottom, smoothstep(0.0, -0.12, h));
    float s = max(dot(d, sunDir), 0.0);
    col += vec3(1.0, 0.78, 0.5) * (pow(s, 6.0) * 0.35 + pow(s, 800.0) * 6.0);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function setupEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer, bounds: [number, number, number, number]) {
  // Image-based lighting
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.38;

  // Sky dome (follows the camera so it reads as infinitely far)
  const skyGeo = new THREE.SphereGeometry(100, 48, 24);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    uniforms: {
      top: { value: SKY_TOP },
      horizon: { value: SKY_HORIZON },
      bottom: { value: SKY_BOTTOM },
      sunDir: { value: SUN_DIR },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  scene.fog = new THREE.Fog(SKY_HORIZON.clone().lerp(SKY_BOTTOM, 0.35), 22, 80);

  // Ground
  const groundGeo = new THREE.CircleGeometry(95, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: '#4a443d', roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  const [bx0, bz0, bx1, bz1] = bounds;
  const center = new THREE.Vector3((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
  const radius = Math.hypot(bx1 - bx0, bz1 - bz0) / 2;

  const trees = buildTrees(center, radius);
  scene.add(trees.group);

  // Sun — static, so the shadow map is rendered once. The frustum is
  // shifted east to catch the long shadow the building casts.
  const sun = new THREE.DirectionalLight('#ffd7a8', 4.2);
  const focus = center.clone().add(new THREE.Vector3(1.5, 0, 0));
  sun.position.copy(focus).addScaledVector(SUN_DIR, 25 + radius);
  sun.target.position.copy(focus);
  sun.castShadow = true;
  // Static shadows are rendered once, so full resolution is cheap even on weak GPUs
  const size = 2048;
  sun.shadow.mapSize.set(size, size);
  const cam = sun.shadow.camera;
  const ext = radius + 4;
  cam.left = -ext;
  cam.right = ext;
  cam.top = ext - 1;
  cam.bottom = -ext + 1;
  cam.near = 5;
  cam.far = 45 + radius * 2;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  // Cool sky fill
  const hemi = new THREE.HemisphereLight('#cfd9e6', '#6a5848', 0.35);
  scene.add(hemi);

  return {
    sky,
    /** 0 → 1: trees grow out of the ground with the model */
    setGrowth: trees.setGrowth,
    dispose() {
      envRT.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      trees.dispose();
      sun.shadow.map?.dispose();
    },
  };
}

// ------------------------------------------------------------
// Trees around the site, so window views show greenery rather than
// an empty horizon. Positions are offsets from the footprint centre,
// spread out for larger units so they stay clear of the camera.
// ------------------------------------------------------------
const TREE_OFFSETS: [number, number, number][] = [
  [-11.1, -4.8, 5.5], [-13.1, -0.5, 6.5], [-11, 3.3, 5], [-13.6, 6.5, 6], [-15.1, -8.3, 7], [-10.2, -9.8, 4.5],
  [-1.6, -12.3, 6], [2.9, -13.3, 5.5], [-5.6, -11.9, 5], [9.4, -2.3, 6], [8.9, 3.7, 5.5], [7.4, -9.3, 6.5],
];

function lumpyBlob() {
  const ico = new THREE.IcosahedronGeometry(1, 3);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv');
  const g = mergeVertices(ico);
  ico.dispose();
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 5.1) * Math.cos(v.y * 4.3) * Math.sin(v.z * 4.7);
    v.multiplyScalar(1 + n * 0.14);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

interface TreePart { base: THREE.Vector3; p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }

function buildTrees(center: THREE.Vector3, radius: number) {
  const rand = seededRandom(77);
  const group = new THREE.Group();
  group.name = 'trees';
  const blobGeo = lumpyBlob();
  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.14, 1, 8);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const barkMat = new THREE.MeshStandardMaterial({ color: '#4a3b2e', roughness: 1 });
  const blobsPerTree = 7;
  const blobs = new THREE.InstancedMesh(blobGeo, leafMat, TREE_OFFSETS.length * blobsPerTree);
  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, TREE_OFFSETS.length);
  const e = new THREE.Euler();
  const color = new THREE.Color();
  const greens = ['#4f6b3c', '#5d7a45', '#435f36', '#6b8650'];
  // The 1-bedroom (radius ≈ 5.4 m) is the reference spacing
  const spread = (radius + 4) / 9.4;
  const trunkParts: TreePart[] = [];
  const blobParts: TreePart[] = [];

  TREE_OFFSETS.forEach(([ox, oz, h]) => {
    const x = center.x + ox * spread;
    const z = center.z + oz * spread;
    const base = new THREE.Vector3(x, -0.3, z);
    const trunkH = h * 0.45;
    trunkParts.push({ base, p: new THREE.Vector3(x, -0.3 + trunkH / 2, z), q: new THREE.Quaternion(), s: new THREE.Vector3(1, trunkH, 1) });
    const crownR = h * 0.32;
    for (let b = 0; b < blobsPerTree; b++) {
      const a = rand() * Math.PI * 2;
      const r = b === 0 ? 0 : crownR * (0.35 + rand() * 0.4);
      const p = new THREE.Vector3(x + Math.cos(a) * r, -0.3 + trunkH + crownR * (0.6 + rand() * 0.9), z + Math.sin(a) * r);
      e.set(rand() * 3, rand() * 3, rand() * 3);
      const q = new THREE.Quaternion().setFromEuler(e);
      const s = crownR * (b === 0 ? 1 : 0.55 + rand() * 0.3);
      blobParts.push({ base, p, q, s: new THREE.Vector3(s, s * (0.85 + rand() * 0.2), s) });
      blobs.setColorAt(blobParts.length - 1, color.set(greens[Math.floor(rand() * greens.length)]));
    }
  });

  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const apply = (mesh: THREE.InstancedMesh, parts: TreePart[], t: number) => {
    parts.forEach((part, i) => {
      p.copy(part.p).sub(part.base).multiplyScalar(t).add(part.base);
      sc.copy(part.s).multiplyScalar(Math.max(t, 0.0001));
      m.compose(p, part.q, sc);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  let growth = -1;
  const setGrowth = (t: number) => {
    if (t === growth) return;
    growth = t;
    apply(trunks, trunkParts, t);
    apply(blobs, blobParts, t);
    group.visible = t > 0.001;
  };
  setGrowth(1);
  blobs.receiveShadow = true;
  trunks.receiveShadow = true;
  // Bounds must cover the fully grown trees
  blobs.computeBoundingSphere();
  trunks.computeBoundingSphere();
  blobs.frustumCulled = false;
  trunks.frustumCulled = false;
  group.add(blobs, trunks);
  return {
    group,
    setGrowth,
    dispose() {
      blobGeo.dispose();
      trunkGeo.dispose();
      leafMat.dispose();
      barkMat.dispose();
      blobs.dispose();
      trunks.dispose();
    },
  };
}
