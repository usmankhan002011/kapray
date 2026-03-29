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
    { upToKg: 10, costPkr: 41900 },
    { upToKg: 15, costPkr: 62800 },
    { upToKg: 20, costPkr: 83600 },
    { upToKg: 25, costPkr: 104000 },
    { upToKg: 30, costPkr: 124500 },
  ],

  USA: [
    { upToKg: 0.5, costPkr: 4500 },
    { upToKg: 1, costPkr: 6600 },
    { upToKg: 2, costPkr: 10400 },
    { upToKg: 3, costPkr: 13900 },
    { upToKg: 5, costPkr: 20900 },
    { upToKg: 10, costPkr: 57500 },
    { upToKg: 15, costPkr: 86300 },
    { upToKg: 20, costPkr: 115500 },
    { upToKg: 25, costPkr: 144000 },
    { upToKg: 30, costPkr: 172500 },
  ],

  EUROPE: [
    { upToKg: 0.5, costPkr: 4300 },
    { upToKg: 1, costPkr: 6350 },
    { upToKg: 2, costPkr: 9950 },
    { upToKg: 3, costPkr: 13400 },
    { upToKg: 5, costPkr: 20100 },
    { upToKg: 10, costPkr: 43800 },
    { upToKg: 15, costPkr: 65700 },
    { upToKg: 20, costPkr: 87500 },
    { upToKg: 25, costPkr: 108800 },
    { upToKg: 30, costPkr: 130500 },
  ],

  CANADA: [
    { upToKg: 0.5, costPkr: 4550 },
    { upToKg: 1, costPkr: 6700 },
    { upToKg: 2, costPkr: 10600 },
    { upToKg: 3, costPkr: 14100 },
    { upToKg: 5, costPkr: 21200 },
    { upToKg: 10, costPkr: 58200 },
    { upToKg: 15, costPkr: 87300 },
    { upToKg: 20, costPkr: 116800 },
    { upToKg: 25, costPkr: 145500 },
    { upToKg: 30, costPkr: 174500 },
  ],

  KSA: [
    { upToKg: 0.5, costPkr: 3200 },
    { upToKg: 1, costPkr: 4700 },
    { upToKg: 2, costPkr: 7400 },
    { upToKg: 3, costPkr: 9950 },
    { upToKg: 5, costPkr: 14900 },
    { upToKg: 10, costPkr: 27400 },
    { upToKg: 15, costPkr: 39400 },
    { upToKg: 20, costPkr: 51400 },
    { upToKg: 25, costPkr: 63100 },
    { upToKg: 30, costPkr: 74800 },
  ],

  UAE: [
    { upToKg: 0.5, costPkr: 3000 },
    { upToKg: 1, costPkr: 4450 },
    { upToKg: 2, costPkr: 7050 },
    { upToKg: 3, costPkr: 9500 },
    { upToKg: 5, costPkr: 14300 },
    { upToKg: 10, costPkr: 25800 },
    { upToKg: 15, costPkr: 37100 },
    { upToKg: 20, costPkr: 48400 },
    { upToKg: 25, costPkr: 59400 },
    { upToKg: 30, costPkr: 70400 },
  ],

  AUSTRALIA: [
    { upToKg: 0.5, costPkr: 4700 },
    { upToKg: 1, costPkr: 6900 },
    { upToKg: 2, costPkr: 10900 },
    { upToKg: 3, costPkr: 14600 },
    { upToKg: 5, costPkr: 21900 },
    { upToKg: 10, costPkr: 50500 },
    { upToKg: 15, costPkr: 75600 },
    { upToKg: 20, costPkr: 101000 },
    { upToKg: 25, costPkr: 125800 },
    { upToKg: 30, costPkr: 150800 },
  ],
};

export const INTERNATIONAL_OVERWEIGHT_PER_KG: Record<ExportRegion, number> = {
  UK: 4100,
  USA: 5700,
  EUROPE: 4350,
  CANADA: 5800,
  KSA: 2350,
  UAE: 2200,
  AUSTRALIA: 5000,
};

export const INTERNATIONAL_MAX_KG = 30;