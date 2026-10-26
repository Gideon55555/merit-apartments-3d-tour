import * as THREE from 'three';
import {
  porcelainFloorTexture, woodGrainTexture, backsplashTexture,
  fabricTexture, rugTexture, artworkTexture,
} from './textures';
import { weaveNormalTexture } from './soft';

// ============================================================
// MATERIALS
// Matched to the Merit design renders: pale marble-look porcelain,
// warm greige walls, cream upholstery, white cabinetry, dark timber and
// black accents. The brand's deep green stays on the wall caps.
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

/**
 * Load a texture sample cut from the Merit design renders (public/textures).
 * Mirrored wrapping hides tile seams. onLoad lets the renderer redraw.
 */
function photo(file: string, anisotropy: number, repeat: [number, number], onLoad: () => void) {
  const t = new THREE.TextureLoader().load(`/textures/${file}`, onLoad);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = anisotropy;
  return t;
}

export function createMaterials(anisotropy: number, onTextureLoad: () => void = () => undefined) {
  const floorTex = porcelainFloorTexture(anisotropy);
  const grain = woodGrainTexture(anisotropy);
  const splash = backsplashTexture(anisotropy);
  const weave = fabricTexture(anisotropy);

  const marblePhoto = photo('marble-wall.jpg', anisotropy, [1, 1], onTextureLoad);
  const carpetPhoto = photo('carpet.jpg', anisotropy, [3, 3], onTextureLoad);
  const darkWoodPhoto = photo('dark-wood.jpg', anisotropy, [1, 1], onTextureLoad);
  const stonePhoto = photo('bath-stone.jpg', anisotropy, [1, 1], onTextureLoad);
  const artGold = photo('art-gold.jpg', anisotropy, [1, 1], onTextureLoad);
  const artDark = photo('art-dark.jpg', anisotropy, [1, 1], onTextureLoad);
  artGold.wrapS = artGold.wrapT = artDark.wrapS = artDark.wrapT = THREE.ClampToEdgeWrapping;

  const textures: THREE.Texture[] = [floorTex, grain, splash, weave, marblePhoto, carpetPhoto, darkWoodPhoto, stonePhoto, artGold, artDark];
  const track = <T extends THREE.Texture>(t: T) => { textures.push(t); return t; };
  const weaveFine = track(repeated(weave, 4, 4));

  const materials = {
    // --- Architecture ---
    plaster: std('#dcd4ca', 0.9),
    wallCap: std('#1d3a31', 0.85),
    ceiling: std('#e6e0d8', 0.95),
    concrete: std('#8f8b84', 0.9),
    facade: std('#e4ded4', 0.9),
    trim: std('#ece7e0', 0.55),
    doorDark: std('#2b2420', 0.45),
    oakFloor: new THREE.MeshStandardMaterial({
      map: floorTex, roughness: 0.28, color: '#f2eee9',
    }),
    deck: new THREE.MeshStandardMaterial({
      map: floorTex, bumpMap: floorTex, bumpScale: 2, roughness: 0.8, color: '#a79d93',
    }),
    // Large-format warm stone from the bathroom render
    bathTile: new THREE.MeshStandardMaterial({
      map: stonePhoto, roughness: 0.3,
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
    walnut: new THREE.MeshStandardMaterial({ map: grain, color: '#6b4f3f', roughness: 0.45 }),

    // --- Kitchen & bath ---
    sage: std('#ebe6de', 0.45),
    sageDark: std('#2b2420', 0.6),
    // Polished white marble (feature walls, counters, coffee tables)
    quartz: new THREE.MeshStandardMaterial({ map: marblePhoto, roughness: 0.16 }),
    marbleWall: new THREE.MeshStandardMaterial({ map: marblePhoto, roughness: 0.14 }),
    // Black marble counters (the same slab, tinted dark)
    blackMarble: new THREE.MeshStandardMaterial({ map: marblePhoto, color: '#3a3532', roughness: 0.12 }),
    darkWood: new THREE.MeshStandardMaterial({ map: darkWoodPhoto, roughness: 0.5 }),
    taupe: std('#9d8d7e', 0.55),
    smokedGlass: new THREE.MeshPhysicalMaterial({
      color: '#2e2b29', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.6, depthWrite: false,
    }),
    glassBlock: new THREE.MeshPhysicalMaterial({
      color: '#e8dcc6', roughness: 0.35, metalness: 0, transparent: true, opacity: 0.72, depthWrite: false,
    }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#f7f5f1', roughness: 0.12, clearcoat: 0.6 }),
    cooktop: std('#0d0d0e', 0.08, 0.2),
    cooktopRing: std('#3a3a3c', 0.3, 0.2),
    steelDark: std('#4b4b4b', 0.35, 0.9),
    appliance: std('#d9d9d6', 0.25, 0.6),
    screen: std('#08090b', 0.12, 0.3),

    // --- Soft furnishings ---
    sofa: fabric('#efe6d8', weaveFine),
    headboard: fabric('#d9ccba', weaveFine),
    linen: fabric('#f4f0e9', weaveFine),
    duvet: fabric('#c9c4bd', weaveFine, { side: THREE.DoubleSide }),
    pillowSage: fabric('#cbbfae', weaveFine),
    pillowRust: fabric('#a69684', weaveFine),
    pillowCream: fabric('#ddd2c3', weaveFine),
    pillowCharcoal: fabric('#4b4a47', weaveFine),
    throwRust: fabric('#4a4643', weaveFine, { side: THREE.DoubleSide }),
    towel: fabric('#efe9df', weaveFine),
    curtain: new THREE.MeshPhysicalMaterial({
      color: '#c8b49b', roughness: 1, sheen: 1, sheenRoughness: 0.9, sheenColor: new THREE.Color('#ffffff'),
      transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false,
    }),
    rugLiving: new THREE.MeshStandardMaterial({ map: carpetPhoto, roughness: 1 }),
    rugBedroom: new THREE.MeshStandardMaterial({ map: track(rugTexture(anisotropy, [30, 6, 72], 62)), roughness: 1 }),

    // --- Decor ---
    artA: new THREE.MeshStandardMaterial({ map: artGold, roughness: 0.85 }),
    artB: new THREE.MeshStandardMaterial({ map: artDark, roughness: 0.85 }),
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

  // Woven surface detail on every textile so upholstery reads as cloth
  const weaveNormal = track(weaveNormalTexture(anisotropy));
  for (const f of [
    materials.sofa, materials.headboard, materials.linen, materials.duvet, materials.pillowSage, materials.pillowRust,
    materials.pillowCream, materials.pillowCharcoal, materials.throwRust, materials.towel,
  ]) {
    f.normalMap = weaveNormal;
    f.normalScale.set(0.45, 0.45);
  }

  const dispose = () => {
    Object.values(materials).forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return { materials, dispose };
}

export type Materials = ReturnType<typeof createMaterials>['materials'];
