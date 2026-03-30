import { getDeliveryCost } from "@/utils/kapray/delivery";
import {
  isUnstitchedCategory,
  type DeliveryQuoteInput,
  type ExportRegion,
  type ProductCategory,
  type SizeLengthMap,
  type UnstitchedSizeKey,
} from "@/data/kapray/productTypes";

export type DestinationType = "inland" | "export";

export interface PricingInput {
  productCategory?: ProductCategory | string | null;
  pricePerMeterPkr?: number | null;
  stitchedTotalPkr?: number | null;
  selectedUnstitchedSize?: string | null;
  sizeLengthMap?: SizeLengthMap | null;

  dyeingSelected?: boolean | null;
  dyeingCostPkr?: number | null;

  tailoringSelected?: boolean | null;
  tailoringCostPkr?: number | null;

  weightKg?: number | null;
  destinationType?: DestinationType | null;
  exportRegion?: ExportRegion | string | null;
  city?: string | null;
}

export interface PricingBreakdown {
  selectedUnstitchedSize: string | null;
  fabricLengthM: number;
  fabricCostPkr: number;
  baseProductCostPkr: number;
  dyeingCostPkr: number;
  tailoringCostPkr: number;
  deliveryCostPkr: number;
  subtotalBeforeDeliveryPkr: number;
  totalPkr: number;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeSizeKey(v: unknown): UnstitchedSizeKey | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "XS" || s === "S" || s === "M" || s === "L" || s === "XL" || s === "XXL") {
    return s;
  }
  return null;
}

export function getFabricLengthFromSize(
  selectedSize: unknown,
  sizeLengthMap?: SizeLengthMap | null,
): number {
  const key = normalizeSizeKey(selectedSize);
  if (!key || !sizeLengthMap) return 0;
  return safeNum(sizeLengthMap[key]);
}

export function getBaseProductCost(input: PricingInput): {
  fabricLengthM: number;
  fabricCostPkr: number;
  baseProductCostPkr: number;
} {
  const isUnstitched = isUnstitchedCategory(input.productCategory ?? null);

  if (isUnstitched) {
    const fabricLengthM = getFabricLengthFromSize(
      input.selectedUnstitchedSize,
      input.sizeLengthMap,
    );
    const fabricCostPkr = safeNum(input.pricePerMeterPkr) * fabricLengthM;

    return {
      fabricLengthM,
      fabricCostPkr,
      baseProductCostPkr: fabricCostPkr,
    };
  }

  const stitchedTotalPkr = safeNum(input.stitchedTotalPkr);

  return {
    fabricLengthM: 0,
    fabricCostPkr: 0,
    baseProductCostPkr: stitchedTotalPkr,
  };
}

export function getDeliveryCostForPurchase(input: PricingInput): number {
  const weightKg = safeNum(input.weightKg);
  if (!weightKg) return 0;

  const scope: DestinationType =
    input.destinationType === "export" ? "export" : "inland";

  const regionOrCity =
    scope === "export"
      ? String(input.exportRegion ?? "").trim()
      : String(input.city ?? "").trim();

  if (!regionOrCity) return 0;

  const quoteInput: DeliveryQuoteInput = {
    weightKg,
    scope: scope === "export" ? "international" : "inland",
    regionOrCity,
  };

  return safeNum(getDeliveryCost(quoteInput));
}

export function computePurchasePricing(input: PricingInput): PricingBreakdown {
  const { fabricLengthM, fabricCostPkr, baseProductCostPkr } = getBaseProductCost(input);

  const dyeingCostPkr = input.dyeingSelected ? safeNum(input.dyeingCostPkr) : 0;
  const tailoringCostPkr = input.tailoringSelected ? safeNum(input.tailoringCostPkr) : 0;
  const deliveryCostPkr = getDeliveryCostForPurchase(input);

  const subtotalBeforeDeliveryPkr =
    baseProductCostPkr + dyeingCostPkr + tailoringCostPkr;

  const totalPkr = subtotalBeforeDeliveryPkr + deliveryCostPkr;

  return {
    selectedUnstitchedSize: normalizeSizeKey(input.selectedUnstitchedSize),
    fabricLengthM,
    fabricCostPkr,
    baseProductCostPkr,
    dyeingCostPkr,
    tailoringCostPkr,
    deliveryCostPkr,
    subtotalBeforeDeliveryPkr,
    totalPkr,
  };
}
