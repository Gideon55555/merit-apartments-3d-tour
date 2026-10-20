'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

// ============================================================
// APARTMENT DIMENSIONS (approximate, based on floor plan)
// All measurements in meters. These are provisional estimates.
// ============================================================
const WALL_HEIGHT = 2.8;
const WALL_THICKNESS = 0.15;
const FLOOR_THICKNESS = 0.1;

// Overall apartment footprint (approx 7m x 7m = 49m² gross)
const APT_WIDTH = 7.5;  // X axis (left-right)
const APT_DEPTH = 8.5;  // Z axis (top-bottom in plan)

// Room positions and sizes based on floor plan analysis
// Origin (0,0) at bottom-left of apartment
const ROOMS = {
  livingDining: { x: 0, z: 0, width: 5.0, depth: 4.2, area: 14 },
  kitchen: { x: 5.0, z: 0, width: 2.5, depth: 3.0, area: 6 },
  bedroom: { x: 0.8, z: 4.8, width: 4.2, depth: 3.5, area: 12 },
  bathroom: { x: 5.2, z: 4.8, width: 2.3, depth: 3.2, area: 7 },
  balcony1: { x: -1.5, z: 5.5, width: 1.5, depth: 3.0, area: 3 }, // Left balcony (larger)
  balcony2: { x: -1.5, z: 0, width: 1.5, depth: 2.0, area: 2 },  // Bottom-left balcony
};

// Materials
function createMaterials() {
  return {
    // Walls
    wallInterior: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f0ebe3'),
      roughness: 0.85,
      metalness: 0.0,
    }),
    wallExterior: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2a3a2e'),
      roughness: 0.7,
      metalness: 0.1,
    }),
    // Floors
    woodFloor: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c4a47a'),
      roughness: 0.6,
      metalness: 0.0,
    }),
    tileFloor: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d8d2c8'),
      roughness: 0.4,
      metalness: 0.05,
    }),
    balconyFloor: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a8b5a0'),
      roughness: 0.75,
      metalness: 0.0,
    }),
    // Furniture
    sofa: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c8c0b4'),
      roughness: 0.8,
      metalness: 0.0,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8b6d4a'),
      roughness: 0.5,
      metalness: 0.05,
    }),
    darkWood: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4a3520'),
      roughness: 0.5,
      metalness: 0.05,
    }),
    bedding: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e8e0d4'),
      roughness: 0.9,
      metalness: 0.0,
    }),
    pillow: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f5f0e8'),
      roughness: 0.95,
      metalness: 0.0,
    }),
    // Kitchen / Bath
    counter: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e5ddd0'),
      roughness: 0.3,
      metalness: 0.1,
    }),
    cabinet: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d4cdc0'),
      roughness: 0.6,
      metalness: 0.05,
    }),
    appliance: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c0c0c0'),
      roughness: 0.3,
      metalness: 0.5,
    }),
    ceramic: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f0ede8'),
      roughness: 0.2,
      metalness: 0.1,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d0d0d0'),
      roughness: 0.15,
      metalness: 0.8,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c8e0f0'),
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.25,
    }),
    plant: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4a7a4a'),
      roughness: 0.8,
      metalness: 0.0,
    }),
    pot: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8a7560'),
      roughness: 0.7,
      metalness: 0.0,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8f5f0'),
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.BackSide,
    }),
    railing: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a2a1e'),
      roughness: 0.4,
      metalness: 0.6,
    }),
    fabric: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8a8070'),
      roughness: 0.9,
      metalness: 0.0,
    }),
  };
}

// Helper to create a box mesh
function createBox(
  width: number, height: number, depth: number,
  material: THREE.Material,
  x: number, y: number, z: number
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Build the apartment
function buildApartment(scene: THREE.Scene, materials: ReturnType<typeof createMaterials>) {
  const apartment = new THREE.Group();
  apartment.name = 'apartment';

  // Center the apartment
  const offsetX = -APT_WIDTH / 2;
  const offsetZ = -APT_DEPTH / 2;

  // === FLOORS ===
  buildFloors(apartment, materials, offsetX, offsetZ);
  
  // === WALLS ===
  buildWalls(apartment, materials, offsetX, offsetZ);

  // === CEILING (transparent for top-down, but adds ambient) ===
  // We skip ceiling to allow dollhouse view

  // === FURNITURE ===
  buildLivingRoom(apartment, materials, offsetX, offsetZ);
  buildKitchen(apartment, materials, offsetX, offsetZ);
  buildBedroom(apartment, materials, offsetX, offsetZ);
  buildBathroom(apartment, materials, offsetX, offsetZ);
  buildBalconies(apartment, materials, offsetX, offsetZ);
  buildKitchenBar(apartment, materials, offsetX, offsetZ);

  scene.add(apartment);
  return apartment;
}

function buildFloors(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  // Living/Dining floor
  const lf = createBox(ROOMS.livingDining.width, FLOOR_THICKNESS, ROOMS.livingDining.depth,
    mat.woodFloor, ox + ROOMS.livingDining.x + ROOMS.livingDining.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.livingDining.z + ROOMS.livingDining.depth/2);
  lf.name = 'floor-living';
  group.add(lf);

  // Kitchen floor
  const kf = createBox(ROOMS.kitchen.width, FLOOR_THICKNESS, ROOMS.kitchen.depth,
    mat.tileFloor, ox + ROOMS.kitchen.x + ROOMS.kitchen.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.kitchen.z + ROOMS.kitchen.depth/2);
  kf.name = 'floor-kitchen';
  group.add(kf);

  // Corridor/transition floor between kitchen and living
  const cf = createBox(ROOMS.kitchen.width, FLOOR_THICKNESS, ROOMS.livingDining.depth - ROOMS.kitchen.depth,
    mat.woodFloor, ox + ROOMS.kitchen.x + ROOMS.kitchen.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.kitchen.depth + (ROOMS.livingDining.depth - ROOMS.kitchen.depth)/2);
  cf.name = 'floor-corridor';
  group.add(cf);

  // Bedroom floor
  const bf = createBox(ROOMS.bedroom.width, FLOOR_THICKNESS, ROOMS.bedroom.depth,
    mat.woodFloor, ox + ROOMS.bedroom.x + ROOMS.bedroom.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.bedroom.z + ROOMS.bedroom.depth/2);
  bf.name = 'floor-bedroom';
  group.add(bf);

  // Hallway floor connecting bedroom to entry
  const hf = createBox(0.8, FLOOR_THICKNESS, ROOMS.bedroom.depth,
    mat.woodFloor, ox + 0.4, -FLOOR_THICKNESS/2,
    oz + ROOMS.bedroom.z + ROOMS.bedroom.depth/2);
  hf.name = 'floor-hallway';
  group.add(hf);

  // Bathroom floor
  const bathf = createBox(ROOMS.bathroom.width, FLOOR_THICKNESS, ROOMS.bathroom.depth,
    mat.tileFloor, ox + ROOMS.bathroom.x + ROOMS.bathroom.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.bathroom.z + ROOMS.bathroom.depth/2);
  bathf.name = 'floor-bathroom';
  group.add(bathf);

  // Balcony 1 floor
  const b1f = createBox(ROOMS.balcony1.width, FLOOR_THICKNESS, ROOMS.balcony1.depth,
    mat.balconyFloor, ox + ROOMS.balcony1.x + ROOMS.balcony1.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.balcony1.z + ROOMS.balcony1.depth/2);
  b1f.name = 'floor-balcony1';
  group.add(b1f);

  // Balcony 2 floor
  const b2f = createBox(ROOMS.balcony2.width, FLOOR_THICKNESS, ROOMS.balcony2.depth,
    mat.balconyFloor, ox + ROOMS.balcony2.x + ROOMS.balcony2.width/2, -FLOOR_THICKNESS/2,
    oz + ROOMS.balcony2.z + ROOMS.balcony2.depth/2);
  b2f.name = 'floor-balcony2';
  group.add(b2f);
}

function buildWalls(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  const wh = WALL_HEIGHT;
  const wt = WALL_THICKNESS;
  const wy = wh / 2;

  // === EXTERIOR WALLS ===
  
  // South wall (bottom of plan) - Living area
  group.add(createBox(APT_WIDTH, wh, wt, mat.wallExterior,
    ox + APT_WIDTH/2, wy, oz - wt/2));

  // East wall (right side) - full height
  group.add(createBox(wt, wh, APT_DEPTH, mat.wallExterior,
    ox + APT_WIDTH + wt/2, wy, oz + APT_DEPTH/2));

  // North wall (top of plan)
  group.add(createBox(APT_WIDTH + wt, wh, wt, mat.wallExterior,
    ox + APT_WIDTH/2, wy, oz + APT_DEPTH + wt/2));

  // West wall - lower section (below balcony 2 opening) 
  group.add(createBox(wt, wh, 0.5, mat.wallExterior,
    ox - wt/2, wy, oz + 0.25));

  // West wall - section between balconies
  group.add(createBox(wt, wh, ROOMS.bedroom.z - ROOMS.balcony2.depth - ROOMS.balcony1.depth + 1.0, mat.wallExterior,
    ox - wt/2, wy, oz + ROOMS.balcony2.depth + (ROOMS.bedroom.z - ROOMS.balcony2.depth - ROOMS.balcony1.depth + 1.0)/2 + 0.5));

  // West wall - above balcony 1 opening
  group.add(createBox(wt, wh, 0.5, mat.wallExterior,
    ox - wt/2, wy, oz + APT_DEPTH - 0.25));

  // === INTERIOR WALLS ===

  // Wall between living/dining and bedroom (horizontal wall in the middle)
  // Has opening for doorway/corridor
  const midWallZ = oz + ROOMS.livingDining.depth;
  
  // Left section of middle wall
  group.add(createBox(3.0, wh, wt, mat.wallInterior,
    ox + 1.5, wy, midWallZ));

  // Right section of middle wall (with kitchen bar opening)
  group.add(createBox(2.0, wh, wt, mat.wallInterior,
    ox + APT_WIDTH - 1.0, wy, midWallZ));

  // Wall between kitchen and bathroom (vertical wall on right side)
  const kitchenBathWallX = ox + ROOMS.kitchen.x;
  // Only partial wall - with doorway opening
  group.add(createBox(wt, wh, 2.0, mat.wallInterior,
    kitchenBathWallX, wy, oz + ROOMS.kitchen.depth + 1.0));

  // Wall between bedroom and bathroom
  const bedBathWallX = ox + ROOMS.bathroom.x;
  // Has door opening
  group.add(createBox(wt, wh, 1.2, mat.wallInterior,
    bedBathWallX, wy, oz + ROOMS.bedroom.z + ROOMS.bedroom.depth - 0.6));
  group.add(createBox(wt, wh, 1.0, mat.wallInterior,
    bedBathWallX, wy, oz + ROOMS.bedroom.z + 0.5));

  // Above door header between bedroom and bathroom
  group.add(createBox(wt, 0.6, 1.3, mat.wallInterior,
    bedBathWallX, wh - 0.3, oz + ROOMS.bedroom.z + 1.5 + 0.65));

  // Balcony 1 walls (left balcony - larger)
  // Back wall
  group.add(createBox(ROOMS.balcony1.width + wt, wh, wt, mat.wallExterior,
    ox + ROOMS.balcony1.x + ROOMS.balcony1.width/2, wy, oz + ROOMS.balcony1.z + ROOMS.balcony1.depth + wt/2));
  // Front wall (railing - shorter)
  group.add(createBox(ROOMS.balcony1.width + wt, 1.0, wt/2, mat.railing,
    ox + ROOMS.balcony1.x + ROOMS.balcony1.width/2, 0.5, oz + ROOMS.balcony1.z - wt/4));
  // Side wall
  group.add(createBox(wt, wh, ROOMS.balcony1.depth + wt, mat.wallExterior,
    ox + ROOMS.balcony1.x - wt/2, wy, oz + ROOMS.balcony1.z + ROOMS.balcony1.depth/2));

  // Balcony 2 walls (bottom-left balcony - smaller)
  // Side wall
  group.add(createBox(wt, wh, ROOMS.balcony2.depth + wt, mat.wallExterior,
    ox + ROOMS.balcony2.x - wt/2, wy, oz + ROOMS.balcony2.z + ROOMS.balcony2.depth/2));
  // Front railing
  group.add(createBox(ROOMS.balcony2.width + wt, 1.0, wt/2, mat.railing,
    ox + ROOMS.balcony2.x + ROOMS.balcony2.width/2, 0.5, oz + ROOMS.balcony2.z - wt/4));
  // Back wall connection
  group.add(createBox(ROOMS.balcony2.width + wt, wh, wt, mat.wallExterior,
    ox + ROOMS.balcony2.x + ROOMS.balcony2.width/2, wy, oz + ROOMS.balcony2.z + ROOMS.balcony2.depth + wt/2));

  // === WINDOWS ===
  // Glass panels for windows/balcony doors
  
  // Living room - large window/balcony door on west wall
  const livingWindowGlass = createBox(0.02, 2.2, 2.5, mat.glass,
    ox + 0.01, 1.2, oz + 1.5);
  livingWindowGlass.name = 'window-living';
  group.add(livingWindowGlass);

  // Bedroom - window/balcony door on west wall
  const bedroomWindowGlass = createBox(0.02, 2.2, 2.0, mat.glass,
    ox + 0.01, 1.2, oz + ROOMS.bedroom.z + 1.5);
  bedroomWindowGlass.name = 'window-bedroom';
  group.add(bedroomWindowGlass);

  // Bathroom - small window on east wall
  const bathWindowGlass = createBox(0.02, 0.8, 0.6, mat.glass,
    ox + APT_WIDTH + 0.01, 2.0, oz + ROOMS.bathroom.z + ROOMS.bathroom.depth/2);
  bathWindowGlass.name = 'window-bathroom';
  group.add(bathWindowGlass);
}

function buildLivingRoom(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  const room = ROOMS.livingDining;
  const rx = ox + room.x;
  const rz = oz + room.z;

  // L-shaped sofa
  // Main seat
  group.add(createBox(2.2, 0.4, 0.9, mat.sofa,
    rx + 1.5, 0.2, rz + 1.8));
  // Back cushion
  group.add(createBox(2.2, 0.35, 0.15, mat.sofa,
    rx + 1.5, 0.55, rz + 2.2));
  // Side arm
  group.add(createBox(0.9, 0.4, 0.9, mat.sofa,
    rx + 0.85, 0.2, rz + 1.0));
  // Side back cushion
  group.add(createBox(0.15, 0.35, 0.9, mat.sofa,
    rx + 0.5, 0.55, rz + 1.0));
  // Sofa pillows
  group.add(createBox(0.4, 0.15, 0.3, mat.pillow,
    rx + 0.85, 0.5, rz + 1.8));
  group.add(createBox(0.35, 0.15, 0.25, mat.pillow,
    rx + 2.2, 0.5, rz + 1.8));

  // Coffee table (oval approximated with box)
  group.add(createBox(0.9, 0.05, 0.5, mat.wood,
    rx + 1.8, 0.38, rz + 2.6));
  // Table legs
  for (const [dx, dz] of [[-0.3, -0.15], [0.3, -0.15], [-0.3, 0.15], [0.3, 0.15]]) {
    group.add(createBox(0.04, 0.35, 0.04, mat.darkWood,
      rx + 1.8 + dx, 0.175, rz + 2.6 + dz));
  }

  // Dining table
  group.add(createBox(1.2, 0.04, 0.7, mat.wood,
    rx + 3.8, 0.75, rz + 2.8));
  // Table legs
  for (const [dx, dz] of [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]]) {
    group.add(createBox(0.05, 0.72, 0.05, mat.darkWood,
      rx + 3.8 + dx, 0.36, rz + 2.8 + dz));
  }

  // Dining chairs (4)
  for (const [dx, dz, rotY] of [
    [-0.5, -0.55, 0], [0.5, -0.55, 0],
    [-0.5, 0.55, Math.PI], [0.5, 0.55, Math.PI]
  ]) {
    const chair = new THREE.Group();
    // Seat
    chair.add(createBox(0.4, 0.04, 0.4, mat.wood, 0, 0.45, 0));
    // Back
    chair.add(createBox(0.4, 0.45, 0.04, mat.wood, 0, 0.7, -0.18));
    // Legs
    for (const [lx, lz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) {
      chair.add(createBox(0.03, 0.43, 0.03, mat.darkWood, lx, 0.215, lz));
    }
    chair.position.set(rx + 3.8 + (dx as number), 0, rz + 2.8 + (dz as number));
    chair.rotation.y = rotY as number;
    group.add(chair);
  }

  // TV unit / shelving on south wall
  group.add(createBox(1.5, 0.5, 0.35, mat.cabinet,
    rx + 3.8, 0.25, rz + 0.2));
  // TV
  group.add(createBox(1.0, 0.6, 0.04, mat.appliance,
    rx + 3.8, 0.85, rz + 0.22));

  // Area rug
  group.add(createBox(2.5, 0.01, 2.0, mat.fabric,
    rx + 1.8, 0.005, rz + 2.0));

  // Plant near sofa
  addPlant(group, mat, rx + 0.35, 0, rz + 2.8, 0.6);
}

function buildKitchen(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  const room = ROOMS.kitchen;
  const rx = ox + room.x;
  const rz = oz + room.z;

  // Lower cabinets - L shape along south and east walls
  // South wall cabinets
  group.add(createBox(room.width - 0.2, 0.85, 0.6, mat.cabinet,
    rx + room.width/2, 0.425, rz + 0.3));
  // Countertop
  group.add(createBox(room.width - 0.1, 0.04, 0.65, mat.counter,
    rx + room.width/2, 0.87, rz + 0.32));

  // East wall cabinets
  group.add(createBox(0.6, 0.85, 1.5, mat.cabinet,
    rx + room.width - 0.3, 0.425, rz + 1.45));
  // Countertop
  group.add(createBox(0.65, 0.04, 1.5, mat.counter,
    rx + room.width - 0.32, 0.87, rz + 1.45));

  // Upper cabinets on south wall
  group.add(createBox(room.width - 0.3, 0.6, 0.35, mat.cabinet,
    rx + room.width/2, 1.8, rz + 0.18));

  // Sink
  group.add(createBox(0.5, 0.08, 0.4, mat.chrome,
    rx + room.width/2 + 0.3, 0.92, rz + 0.3));

  // Stove/cooktop
  group.add(createBox(0.55, 0.02, 0.45, mat.appliance,
    rx + room.width - 0.33, 0.89, rz + 1.0));
  // Burner markers
  for (const [dx, dz] of [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.1], [0.12, 0.1]]) {
    const burner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16),
      mat.chrome
    );
    burner.position.set(rx + room.width - 0.33 + dx, 0.91, rz + 1.0 + dz);
    group.add(burner);
  }

  // Refrigerator
  group.add(createBox(0.6, 1.8, 0.6, mat.appliance,
    rx + room.width - 0.3, 0.9, rz + 2.5));
}

function buildKitchenBar(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  // Kitchen bar/counter that separates the kitchen area from the corridor
  const barX = ox + 3.5;
  const barZ = oz + ROOMS.livingDining.depth;

  // Bar counter
  group.add(createBox(3.0, 0.04, 0.5, mat.counter,
    barX + 1.5, 1.0, barZ));

  // Bar base
  group.add(createBox(3.0, 0.95, 0.15, mat.cabinet,
    barX + 1.5, 0.475, barZ));

  // Bar stools (2)
  for (const dx of [0.7, 2.3]) {
    const stool = new THREE.Group();
    // Seat
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16),
      mat.wood
    );
    seat.position.y = 0.7;
    stool.add(seat);
    // Leg
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 0.68, 8),
      mat.chrome
    );
    leg.position.y = 0.35;
    stool.add(leg);
    // Base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16),
      mat.chrome
    );
    base.position.y = 0.01;
    stool.add(base);
    stool.position.set(barX + dx, 0, barZ - 0.4);
    group.add(stool);
  }

  // Decorative plant on bar
  addPlant(group, mat, barX + 2.8, 1.04, barZ, 0.25);
}

function buildBedroom(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  const room = ROOMS.bedroom;
  const rx = ox + room.x;
  const rz = oz + room.z;

  // Bed frame
  group.add(createBox(1.6, 0.3, 2.0, mat.wood,
    rx + room.width/2, 0.15, rz + room.depth/2 + 0.3));
  
  // Mattress
  group.add(createBox(1.5, 0.2, 1.9, mat.bedding,
    rx + room.width/2, 0.4, rz + room.depth/2 + 0.3));

  // Pillows
  group.add(createBox(0.55, 0.12, 0.35, mat.pillow,
    rx + room.width/2 - 0.35, 0.55, rz + room.depth/2 + 1.1));
  group.add(createBox(0.55, 0.12, 0.35, mat.pillow,
    rx + room.width/2 + 0.35, 0.55, rz + room.depth/2 + 1.1));

  // Headboard
  group.add(createBox(1.7, 0.8, 0.08, mat.darkWood,
    rx + room.width/2, 0.8, rz + room.depth/2 + 1.25));

  // Duvet/cover (slightly disheveled look)
  group.add(createBox(1.4, 0.06, 1.2, mat.bedding,
    rx + room.width/2, 0.52, rz + room.depth/2 - 0.1));

  // Nightstand 1
  group.add(createBox(0.4, 0.5, 0.35, mat.wood,
    rx + room.width/2 - 1.2, 0.25, rz + room.depth/2 + 1.0));
  // Lamp 1
  addLamp(group, mat, rx + room.width/2 - 1.2, 0.5, rz + room.depth/2 + 1.0);

  // Nightstand 2
  group.add(createBox(0.4, 0.5, 0.35, mat.wood,
    rx + room.width/2 + 1.2, 0.25, rz + room.depth/2 + 1.0));
  // Lamp 2
  addLamp(group, mat, rx + room.width/2 + 1.2, 0.5, rz + room.depth/2 + 1.0);

  // Wardrobe/closet on north wall
  group.add(createBox(1.8, 2.2, 0.55, mat.cabinet,
    rx + 1.0, 1.1, rz + room.depth - 0.28));

  // Area rug under bed
  group.add(createBox(2.5, 0.01, 2.5, mat.fabric,
    rx + room.width/2, 0.005, rz + room.depth/2 + 0.3));

  // Small plant
  addPlant(group, mat, rx + room.width/2 + 1.2, 0.52, rz + room.depth/2 + 0.65, 0.2);
}

function buildBathroom(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  const room = ROOMS.bathroom;
  const rx = ox + room.x;
  const rz = oz + room.z;

  // Shower/tub area (north-east corner)
  // Shower base
  group.add(createBox(1.0, 0.08, 1.2, mat.tileFloor,
    rx + 0.6, 0.04, rz + room.depth - 0.6));
  // Shower glass wall
  group.add(createBox(0.02, 2.0, 1.2, mat.glass,
    rx + 1.1, 1.0, rz + room.depth - 0.6));
  // Shower head
  group.add(createBox(0.15, 0.15, 0.05, mat.chrome,
    rx + 0.6, 2.2, rz + room.depth - 0.05));
  // Shower arm
  group.add(createBox(0.02, 0.3, 0.02, mat.chrome,
    rx + 0.6, 2.35, rz + room.depth - 0.08));

  // Toilet
  // Base
  const toiletBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.35, 0.55),
    mat.ceramic
  );
  toiletBase.position.set(rx + room.width - 0.3, 0.175, rz + room.depth - 0.5);
  toiletBase.castShadow = true;
  toiletBase.receiveShadow = true;
  group.add(toiletBase);
  // Tank
  group.add(createBox(0.34, 0.4, 0.15, mat.ceramic,
    rx + room.width - 0.3, 0.4, rz + room.depth - 0.2));
  // Seat
  group.add(createBox(0.36, 0.02, 0.35, mat.ceramic,
    rx + room.width - 0.3, 0.38, rz + room.depth - 0.55));

  // Washbasin / Vanity
  // Vanity cabinet
  group.add(createBox(0.8, 0.7, 0.45, mat.cabinet,
    rx + room.width - 0.5, 0.35, rz + 0.5));
  // Counter
  group.add(createBox(0.85, 0.04, 0.5, mat.counter,
    rx + room.width - 0.5, 0.72, rz + 0.5));
  // Basin
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.15, 0.1, 20),
    mat.ceramic
  );
  basin.position.set(rx + room.width - 0.5, 0.72, rz + 0.5);
  group.add(basin);
  // Faucet
  group.add(createBox(0.03, 0.2, 0.03, mat.chrome,
    rx + room.width - 0.5, 0.85, rz + 0.28));
  group.add(createBox(0.03, 0.03, 0.12, mat.chrome,
    rx + room.width - 0.5, 0.95, rz + 0.34));

  // Mirror above basin
  group.add(createBox(0.7, 0.8, 0.02, mat.glass,
    rx + room.width - 0.5, 1.5, rz + 0.25));

  // Towel rack
  group.add(createBox(0.5, 0.02, 0.02, mat.chrome,
    rx + 0.4, 1.2, rz + 0.1));
  // Towel
  group.add(createBox(0.45, 0.5, 0.03, mat.bedding,
    rx + 0.4, 0.95, rz + 0.12));
}

function buildBalconies(group: THREE.Group, mat: ReturnType<typeof createMaterials>, ox: number, oz: number) {
  // Balcony 1 (larger, left side near bedroom)
  const b1 = ROOMS.balcony1;
  const b1x = ox + b1.x;
  const b1z = oz + b1.z;

  // Plant pots
  addPlant(group, mat, b1x + 0.35, 0, b1z + 0.5, 0.5);
  addPlant(group, mat, b1x + 1.1, 0, b1z + 0.4, 0.4);
  addPlant(group, mat, b1x + 0.7, 0, b1z + 2.5, 0.45);

  // Small table
  group.add(createBox(0.45, 0.55, 0.45, mat.wood,
    b1x + 0.7, 0.275, b1z + 1.5));

  // Balcony 2 (smaller, left side near living)
  const b2 = ROOMS.balcony2;
  const b2x = ox + b2.x;
  const b2z = oz + b2.z;

  // Plant
  addPlant(group, mat, b2x + 0.7, 0, b2z + 0.5, 0.4);
  addPlant(group, mat, b2x + 0.4, 0, b2z + 1.5, 0.35);
}

function addPlant(group: THREE.Group, mat: ReturnType<typeof createMaterials>,
  x: number, y: number, z: number, scale: number) {
  // Pot
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.1 * scale, 0.2 * scale, 12),
    mat.pot
  );
  pot.position.set(x, y + 0.1 * scale, z);
  pot.castShadow = true;
  group.add(pot);

  // Foliage (sphere cluster)
  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(0.2 * scale, 8, 6),
    mat.plant
  );
  foliage.position.set(x, y + 0.35 * scale, z);
  foliage.castShadow = true;
  group.add(foliage);

  // Secondary foliage ball
  const foliage2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.15 * scale, 8, 6),
    mat.plant
  );
  foliage2.position.set(x + 0.08 * scale, y + 0.45 * scale, z + 0.05 * scale);
  foliage2.castShadow = true;
  group.add(foliage2);
}

function addLamp(group: THREE.Group, mat: ReturnType<typeof createMaterials>,
  x: number, y: number, z: number) {
  // Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.02, 12),
    mat.chrome
  );
  base.position.set(x, y + 0.01, z);
  group.add(base);

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8),
    mat.chrome
  );
  stem.position.set(x, y + 0.16, z);
  group.add(stem);

  // Shade
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.15, 12, 1, true),
    new THREE.MeshStandardMaterial({
      color: '#f0e8d8',
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  shade.position.set(x, y + 0.38, z);
  group.add(shade);
}

// ============================================================
// LIGHTING
// ============================================================
function setupLighting(scene: THREE.Scene) {
  // Ambient light - warm
  const ambient = new THREE.AmbientLight('#ffeedd', 0.4);
  scene.add(ambient);

  // Hemisphere light for sky/ground
  const hemi = new THREE.HemisphereLight('#e8ddd0', '#8a7560', 0.3);
  scene.add(hemi);

  // Main directional light (sunlight from upper-left)
  const sun = new THREE.DirectionalLight('#fff5e6', 1.2);
  sun.position.set(-8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // Fill light from the right
  const fill = new THREE.DirectionalLight('#e0e8f0', 0.4);
  fill.position.set(6, 8, -4);
  scene.add(fill);

  // Warm point light in living area
  const livingLight = new THREE.PointLight('#ffe0b0', 0.5, 8);
  livingLight.position.set(-1.0, 2.4, -2.0);
  scene.add(livingLight);

  // Bedroom warm light
  const bedroomLight = new THREE.PointLight('#ffe0b0', 0.3, 6);
  bedroomLight.position.set(-0.5, 2.4, 2.5);
  scene.add(bedroomLight);

  // Bathroom cool light
  const bathLight = new THREE.PointLight('#f0f0ff', 0.3, 5);
  bathLight.position.set(2.5, 2.4, 3.0);
  scene.add(bathLight);
}

// ============================================================
// CAMERA POSITIONS (for scroll-driven animation)
// ============================================================
export interface CameraKeyframe {
  position: THREE.Vector3;
  target: THREE.Vector3;
  name: string;
}

export function getCameraKeyframes(): CameraKeyframe[] {
  return [
    // Scene 1: Top-down overview (dollhouse view)
    {
      position: new THREE.Vector3(0, 14, 0.5),
      target: new THREE.Vector3(0, 0, 0.5),
      name: 'overview',
    },
    // Transition: Descend and rotate to 3/4 view
    {
      position: new THREE.Vector3(-5, 8, -5),
      target: new THREE.Vector3(0, 0, 0),
      name: 'transition-to-3d',
    },
    // Scene 2: Living & Dining
    {
      position: new THREE.Vector3(-3.5, 2.0, -3.0),
      target: new THREE.Vector3(0.5, 0.5, -1.0),
      name: 'living-dining',
    },
    // Scene 3: Kitchen
    {
      position: new THREE.Vector3(3.0, 2.2, -2.5),
      target: new THREE.Vector3(2.8, 0.8, -2.8),
      name: 'kitchen',
    },
    // Scene 4: Bedroom
    {
      position: new THREE.Vector3(-2.5, 2.0, 3.5),
      target: new THREE.Vector3(0.5, 0.5, 3.0),
      name: 'bedroom',
    },
    // Scene 5: Bathroom
    {
      position: new THREE.Vector3(3.0, 2.5, 4.5),
      target: new THREE.Vector3(2.5, 0.5, 3.5),
      name: 'bathroom',
    },
    // Scene 6: Balconies
    {
      position: new THREE.Vector3(-5.5, 3.5, 1.5),
      target: new THREE.Vector3(-3.5, 0, 2.0),
      name: 'balconies',
    },
    // Scene 7: Final elevated overview
    {
      position: new THREE.Vector3(-6, 8, -4),
      target: new THREE.Vector3(0, 0, 1.0),
      name: 'final-overview',
    },
  ];
}

// ============================================================
// MAIN COMPONENT
// ============================================================
interface ApartmentSceneProps {
  onReady?: () => void;
  cameraRef?: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export default function ApartmentScene({ onReady, cameraRef }: ApartmentSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const internalCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  const materialsRef = useRef<ReturnType<typeof createMaterials> | null>(null);

  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const renderer = rendererRef.current;
    const camera = internalCameraRef.current;
    if (!container || !renderer || !camera) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      container.innerHTML = '<div class="webgl-fallback"><h1>WebGL Not Available</h1><p>Your browser does not support WebGL. Please use a modern browser.</p></div>';
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a1a');
    scene.fog = new THREE.FogExp2('#1a1a1a', 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    // Start at top-down position
    const keyframes = getCameraKeyframes();
    camera.position.copy(keyframes[0].position);
    camera.lookAt(keyframes[0].target);
    internalCameraRef.current = camera;
    if (cameraRef) cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Materials
    const materials = createMaterials();
    materialsRef.current = materials;

    // Build apartment
    buildApartment(scene, materials);

    // Setup lighting
    setupLighting(scene);

    // Ground plane (extends beyond apartment)
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#1a1a1a',
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -FLOOR_THICKNESS - 0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    window.addEventListener('resize', handleResize);

    // Signal ready
    if (onReady) {
      setTimeout(onReady, 100);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose materials
      if (materialsRef.current) {
        Object.values(materialsRef.current).forEach(m => {
          if (m instanceof THREE.Material) m.dispose();
        });
      }

      // Dispose geometries
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
    };
  }, [handleResize, onReady, cameraRef]);

  return <div ref={containerRef} className="canvas-container" id="apartment-canvas" />;
}
