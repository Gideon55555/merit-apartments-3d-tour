import { buildApartment } from '../apartment';
import { drawOneBedroomPlan } from '../paperPlan';
import type { ApartmentDef } from '../types';
import { ONE_BED_HOLDS, ONE_BED_KEYS } from './oneBedroomCamera';

export const oneBedroom: ApartmentDef = {
  slug: 'one-bedroom',
  name: 'One Bedroom',
  shortName: '1 Bed',
  path: '/',
  planImage: { src: '/floorplan.png', width: 640, height: 499 },
  bounds: [-1.5, -0.2, 6.7, 6.8],
  build: buildApartment,
  paper: () => ({
    sheet: [-2.65, -1.0, 7.35, 7.7],
    labels: [
      { x: 0.95, z: 2.62, name: 'BEDROOM', area: '12 m²' },
      { x: 5.2, z: 1.5, name: 'BATH', area: '7 m²' },
      { x: 5.75, z: 2.68, name: 'HALL' },
      { x: 1.65, z: 4.0, name: 'LIVING / DINING', area: '14 m²' },
      { x: 5.38, z: 5.62, name: 'KITCHEN', area: '6 m²' },
      { x: -0.95, z: 1.6, name: 'BALCONY', area: '3 m²', rotate: true },
      { x: -0.95, z: 4.95, name: 'BALCONY', area: '2 m²', rotate: true },
    ],
    dims: [[0, -0.5, 6.5, -0.5, '6.50'], [7.0, 0, 7.0, 6.6, '6.60']],
    north: [-2.0, -0.45],
    scaleBar: [-2.2, 7.3],
    titleBlock: [2.9, 6.95, 7.2, 7.55],
    titleLines: ['TYPE A — ONE BEDROOM APARTMENT', '44 m² NET · 49 m² GROSS · 2 BALCONIES'],
    draw: drawOneBedroomPlan,
  }),
  keys: ONE_BED_KEYS,
  holds: ONE_BED_HOLDS,
  stats: [['44 m²', 'Net Area'], ['49 m²', 'Gross Area'], ['1', 'Bedroom'], ['1', 'Bathroom'], ['2', 'Balconies']],
  scenes: [
    {
      id: 'overview',
      title: 'Designed for Modern Living',
      description: 'Discover a thoughtfully planned 44 m² apartment.',
      area: '44 m² net · 49 m² gross',
      position: 'left',
    },
    {
      id: 'living-dining',
      title: 'Space to Live Beautifully',
      description: 'An inviting living and dining area designed for comfort, connection, and everyday living.',
      area: '14 m² · Living & Dining',
      position: 'left',
    },
    {
      id: 'kitchen',
      title: 'Everyday Living, Thoughtfully Designed',
      description: 'A practical, modern kitchen that makes the most of every square metre.',
      area: '6 m² · Kitchen',
      position: 'right',
    },
    {
      id: 'bedroom',
      title: 'Your Private Sanctuary',
      description: 'A comfortable bedroom designed for privacy, rest, and relaxation.',
      area: '12 m² · Bedroom',
      position: 'left',
    },
    {
      id: 'bathroom',
      title: 'Everyday Comfort, Elevated',
      description: 'A thoughtfully arranged bathroom that combines practical design with refined finishes.',
      area: '7 m² · Bathroom',
      position: 'right',
    },
    {
      id: 'balconies',
      title: 'Bring the Outside In',
      description: 'Two compact balcony spaces that add openness and an outdoor connection to apartment living.',
      area: '2 m² + 3 m² · Two Balconies',
      position: 'left',
    },
    {
      id: 'final',
      title: 'Your Next Chapter Starts Here',
      description: 'Discover a home where thoughtful planning meets modern living.',
      position: 'right',
      isFinal: true,
    },
  ],
};
