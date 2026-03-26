import type { CourierSlab, ExportRegion } from './productTypes';

export const INLAND_COURIER_SLABS: CourierSlab[] = [
  { upToKg: 0.5, costPkr: 250 },
  { upToKg: 1, costPkr: 330 },
  { upToKg: 2, costPkr: 480 },
  { upToKg: 3, costPkr: 650 },
  { upToKg: 5, costPkr: 950 },
  { upToKg: 10, costPkr: 1700 },
];

export const INLAND_OVERWEIGHT_PER_KG = 150;
export const INLAND_MAX_KG = 10;

export const INTERNATIONAL_COURIER_SLABS: Record<ExportRegion, CourierSlab[]> = {
  UK: [
    { upToKg: 0.5, costPkr: 4200 },
    { upToKg: 1, costPkr: 6200 },
    { upToKg: 2, costPkr: 9800 },
    { upToKg: 3, costPkr: 13200 },
    { upToKg: 5, costPkr: 19800 },
  ],
  USA: [
    { upToKg: 0.5, costPkr: 4500 },
    { upToKg: 1, costPkr: 6600 },
    { upToKg: 2, costPkr: 10400 },
    { upToKg: 3, costPkr: 13900 },
    { upToKg: 5, costPkr: 20900 },
  ],
  EUROPE: [
    { upToKg: 0.5, costPkr: 4300 },
    { upToKg: 1, costPkr: 6350 },
    { upToKg: 2, costPkr: 9950 },
    { upToKg: 3, costPkr: 13400 },
    { upToKg: 5, costPkr: 20100 },
  ],
  CANADA: [
    { upToKg: 0.5, costPkr: 4550 },
    { upToKg: 1, costPkr: 6700 },
    { upToKg: 2, costPkr: 10600 },
    { upToKg: 3, costPkr: 14100 },
    { upToKg: 5, costPkr: 21200 },
  ],
  KSA: [
    { upToKg: 0.5, costPkr: 3200 },
    { upToKg: 1, costPkr: 4700 },
    { upToKg: 2, costPkr: 7400 },
    { upToKg: 3, costPkr: 9950 },
    { upToKg: 5, costPkr: 14900 },
  ],
  UAE: [
    { upToKg: 0.5, costPkr: 3000 },
    { upToKg: 1, costPkr: 4450 },
    { upToKg: 2, costPkr: 7050 },
    { upToKg: 3, costPkr: 9500 },
    { upToKg: 5, costPkr: 14300 },
  ],
  AUSTRALIA: [
    { upToKg: 0.5, costPkr: 4700 },
    { upToKg: 1, costPkr: 6900 },
    { upToKg: 2, costPkr: 10900 },
    { upToKg: 3, costPkr: 14600 },
    { upToKg: 5, costPkr: 21900 },
  ],
};

export const INTERNATIONAL_OVERWEIGHT_PER_KG: Record<ExportRegion, number> = {
  UK: 3200,
  USA: 5800,
  EUROPE: 3900,
  CANADA: 5800,
  KSA: 2500,
  UAE: 2300,
  AUSTRALIA: 4400,
};

export const INTERNATIONAL_MAX_KG = 5;