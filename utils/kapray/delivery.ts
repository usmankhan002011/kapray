import { INLAND_COURIER_SLABS, INTERNATIONAL_COURIER_SLABS } from '@/data/kapray/courierSlabs';
import type { CourierSlab, DeliveryQuoteInput, ExportRegion } from '@/data/kapray/productTypes';

function pickSlabCost(slabs: CourierSlab[], weightKg: number): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;

  const match = slabs.find((slab) => weightKg <= slab.upToKg);
  if (match) return match.costPkr;

  const last = slabs[slabs.length - 1];
  if (!last) return null;

  return last.costPkr;
}

export function getInlandDeliveryCost(weightKg: number): number | null {
  return pickSlabCost(INLAND_COURIER_SLABS, weightKg);
}

export function getInternationalDeliveryCost(
  region: ExportRegion,
  weightKg: number,
): number | null {
  const slabs = INTERNATIONAL_COURIER_SLABS[region];
  return pickSlabCost(slabs, weightKg);
}

export function getDeliveryCost(input: DeliveryQuoteInput): number | null {
  if (input.scope === 'inland') {
    return getInlandDeliveryCost(input.weightKg);
  }

  return getInternationalDeliveryCost(
    input.regionOrCity as ExportRegion,
    input.weightKg,
  );
}