import * as THREE from 'three';
import {
  oakFloorTexture, woodGrainTexture, bathTileTexture, backsplashTexture,
  fabricTexture, marbleTexture, rugTexture, artworkTexture,
} from './textures';

// ============================================================
// MATERIALS
// Warm Scandinavian palette: oak, linen, sage and brushed brass,
// with the brand's deep green used on wall caps (as in the floor plan).
// ============================================================

function std(color: THREE.ColorRepresentation, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function fabric(color: THREE.ColorRepresentation, map: THREE.Texture, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, map, roughness: 0.95, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff'),
    ...extra,
  });
}

function repeated(tex: THREE.Texture, x: number, y: number) {
  const t = tex.clone();
  t.repeat.set(x, y);
  t.needsUpdate = true;
  return t;
}

export function createMaterials(anisotropy: number) {
  const floorTex = oakFloorTexture(anisotropy);
  const grain = woodGrainTexture(anisotropy);
  const tile = bathTileTexture(anisotropy);
  const splash = backsplashTexture(anisotropy);
  const weave = fabricTexture(anisotropy);
  const marble = marbleTexture(anisotropy);

  const textures: THREE.Texture[] = [floorTex, grain, tile, splash, weave, marble];
  const track = <T extends THREE.Texture>(t: T) => { textures.push(t); return t; };
  const weaveFine = track(repeated(weave, 4, 4));

  const materials = {
    // --- Architecture ---
    plaster: std('#efeae3', 0.92),
    wallCap: std('#1d3a31', 0.85),
    ceiling: std('#f5f2ed', 0.95),
    concrete: std('#8f8b84', 0.9),
    facade: std('#e4ded4', 0.9),
    trim: std('#f2efea', 0.55),
    oakFloor: new THREE.MeshStandardMaterial({
      map: floorTex, bumpMap: floorTex, bumpScale: 1.2, roughness: 0.48, color: '#ffffff',
    }),
    deck: new THREE.MeshStandardMaterial({
      map: floorTex, bumpMap: floorTex, bumpScale: 2, roughness: 0.8, color: '#a79d93',
    }),
    bathTile: new THREE.MeshStandardMaterial({
      map: tile, bumpMap: tile, bumpScale: 1.5, roughness: 0.35,
    }),
    backsplash: new THREE.MeshStandardMaterial({
      map: splash, bumpMap: splash, bumpScale: 1.5, roughness: 0.18,
    }),
    ground: std('#38342f', 1),

    // --- Windows & metals ---
    glass: new THREE.MeshPhysicalMaterial({
      color: '#dfe9ea', roughness: 0.02, metalness: 0, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
    }),
    frameMetal: std('#232220', 0.45, 0.6),
    blackMetal: std('#1b1b1b', 0.5, 0.5),
    brass: std('#c4a06a', 0.3, 1),
    pendant: std('#c4a06a', 0.35, 1, { side: THREE.DoubleSide }),
    chrome: std('#e2e2e2', 0.12, 1),

    // --- Wood ---
    oak: new THREE.MeshStandardMaterial({ map: grain, color: '#ffffff', roughness: 0.55 }),
    walnut: new THREE.MeshStandardMaterial({ map: grain, color: '#87634c', roughness: 0.5 }),

    // --- Kitchen & bath ---
    sage: std('#7d8b78', 0.62),
    sageDark: std('#5f6d5c', 0.7),
    quartz: new THREE.MeshStandardMaterial({ map: marble, roughness: 0.22 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f7f5f1', roughness: 0.12, clearcoat: 0.6 }),
    cooktop: std('#0d0d0e', 0.08, 0.2),
    cooktopRing: std('#3a3a3c', 0.3, 0.2),
    steelDark: std('#4b4b4b', 0.35, 0.9),
    appliance: std('#d9d9d6', 0.25, 0.6),
    screen: std('#08090b', 0.12, 0.3),

    // --- Soft furnishings ---
    sofa: fabric('#d3cbbf', weaveFine),
    headboard: fabric('#b8b3a2', weaveFine),
    linen: fabric('#f4f0e9', weaveFine),
    duvet: fabric('#ece6dc', weaveFine),
    pillowSage: fabric('#94a08a', weaveFine),
    pillowRust: fabric('#b46a46', weaveFine),
    pillowCream: fabric('#e8ddcb', weaveFine),
    pillowCharcoal: fabric('#4b4a47', weaveFine),
    throwRust: fabric('#a95b3c', weaveFine),
    towel: fabric('#efe9df', weaveFine),
    curtain: new THREE.MeshPhysicalMaterial({
      color: '#f3eee6', roughness: 1, sheen: 1, sheenRoughness: 0.9, sheenColor: new THREE.Color('#ffffff'),
      transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false,
    }),
    rugLiving: new THREE.MeshStandardMaterial({ map: track(rugTexture(anisotropy, [36, 22, 76], 61)), roughness: 1 }),
    rugBedroom: new THREE.MeshStandardMaterial({ map: track(rugTexture(anisotropy, [28, 14, 68], 62)), roughness: 1 }),

    // --- Decor ---
    artA: new THREE.MeshStandardMaterial({ map: track(artworkTexture(anisotropy, 3)), roughness: 0.85 }),
    artB: new THREE.MeshStandardMaterial({ map: track(artworkTexture(anisotropy, 8)), roughness: 0.85 }),
    artC: new THREE.MeshStandardMaterial({ map: track(artworkTexture(anisotropy, 14)), roughness: 0.85 }),
    leaf: std('#3f6a3b', 0.65, 0, { side: THREE.DoubleSide }),
    leafLight: std('#5d8a4e', 0.65, 0, { side: THREE.DoubleSide }),
    stem: std('#4a5a35', 0.8),
    soil: std('#3a2c21', 1),
    potTerracotta: std('#b4805f', 0.85),
    potStone: std('#a9a39a', 0.9),
    potBlack: std('#2a2927', 0.7),
    fruit: std('#e08a2e', 0.45),
    bookA: std('#b8a07e', 0.8),
    bookB: std('#5c6b5a', 0.8),
    bookC: std('#8c4a35', 0.8),
    bookD: std('#e8e2d6', 0.8),

    // --- Light emitters ---
    lampShade: new THREE.MeshStandardMaterial({
      color: '#f5ead8', emissive: '#ffcf94', emissiveIntensity: 0.9, roughness: 0.9, side: THREE.DoubleSide,
    }),
    bulb: new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffe2b8', emissiveIntensity: 4 }),
    downlight: new THREE.MeshStandardMaterial({ color: '#fff8ee', emissive: '#fff1dc', emissiveIntensity: 3 }),
    ledStrip: new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffd9a8', emissiveIntensity: 2.5 }),
    mirrorGlow: new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffe6c4', emissiveIntensity: 1.6 }),
  };

  const dispose = () => {
    Object.values(materials).forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return { materials, dispose };
}

export type Materials = ReturnType<typeof createMaterials>['materials'];
