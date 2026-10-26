import { oneBedroom } from './oneBedroom';
import { twoBedroom } from './twoBedroom';
import { threeBedroom } from './threeBedroom';

export const UNITS = {
  'one-bedroom': oneBedroom,
  'two-bedroom': twoBedroom,
  'three-bedroom': threeBedroom,
} as const;

export type UnitSlug = keyof typeof UNITS;

export const UNIT_LIST = [oneBedroom, twoBedroom, threeBedroom];
