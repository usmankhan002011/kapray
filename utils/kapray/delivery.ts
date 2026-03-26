import {
  INLAND_COURIER_SLABS,
  INLAND_MAX_KG,
  INLAND_OVERWEIGHT_PER_KG,
  INTERNATIONAL_COURIER_SLABS,
  INTERNATIONAL_MAX_KG,
  INTERNATIONAL_OVERWEIGHT_PER_KG,
} from '@/data/kapray/courierSlabs';
import type { CourierSlab, DeliveryQuoteInput, ExportRegion } from '@/data/kapray/productTypes';

type PackageCm = {
  length?: number | null;
  width?: number | null;
  height?: number | null;
};

function roundUpToHalfKg(weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  return Math.ceil(weightKg * 2) / 2;
}

function getDimensionalWeightKg(packageCm?: PackageCm): number {
  const length = Number(packageCm?.length ?? 0);
  const width = Number(packageCm?.width ?? 0);
  const height = Number(packageCm?.height ?? 0);

  if (!(length > 0 && width > 0 && height > 0)) return 0;

  return (length * width * height) / 5000;
}

function getChargeableWeightKg(weightKg: number, packageCm?: PackageCm): number {
  const actualWeightKg = Number(weightKg ?? 0);
  if (!Number.isFinite(actualWeightKg) || actualWeightKg <= 0) return 0;

  const dimensionalWeightKg = getDimensionalWeightKg(packageCm);
  const chargeableWeightKg = Math.max(actualWeightKg, dimensionalWeightKg);

  return roundUpToHalfKg(chargeableWeightKg);
}

function pickSlabCost(
  slabs: CourierSlab[],
  weightKg: number,
  maxKg?: number,
  overweightPerKg?: number,
): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;

  const match = slabs.find((slab) => weightKg <= slab.upToKg);
  if (match) return match.costPkr;

  const last = slabs[slabs.length - 1];
  if (!last || maxKg == null || overweightPerKg == null) return null;

  if (weightKg <= maxKg) return last.costPkr;

  const extraKg = Math.ceil(weightKg - maxKg);
  return last.costPkr + extraKg * overweightPerKg;
  }

export function getInlandDeliveryCost(
  weightKg: number,
  packageCm?: PackageCm,
): number | null {
  const chargeableWeightKg = getChargeableWeightKg(weightKg, packageCm);

  return pickSlabCost(
    INLAND_COURIER_SLABS,
    chargeableWeightKg,
    INLAND_MAX_KG,
    INLAND_OVERWEIGHT_PER_KG,
  );
}

export function getInternationalDeliveryCost(
  region: ExportRegion,
  weightKg: number,
  packageCm?: PackageCm,
): number | null {
  const slabs = INTERNATIONAL_COURIER_SLABS[region];
  const chargeableWeightKg = getChargeableWeightKg(weightKg, packageCm);

  return pickSlabCost(
    slabs,
    chargeableWeightKg,
    INTERNATIONAL_MAX_KG,
    INTERNATIONAL_OVERWEIGHT_PER_KG[region],
  );
}

export function getDeliveryCost(
  input: DeliveryQuoteInput & { packageCm?: PackageCm },
): number | null {
  if (input.scope === 'inland') {
    return getInlandDeliveryCost(input.weightKg, input.packageCm);
  }

  return getInternationalDeliveryCost(
    input.regionOrCity as ExportRegion,
    input.weightKg,
    input.packageCm,
  );
}