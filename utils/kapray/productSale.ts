export type ProductSaleUnit = "total" | "per_meter";

export type ProductSaleInfo = {
  active: true;
  unit: ProductSaleUnit;
  priceKey: "cost_pkr_total" | "cost_pkr_per_meter";
  previousKey: "previous_cost_pkr_total" | "previous_cost_pkr_per_meter";
  saleKey: "sale_cost_pkr_total" | "sale_cost_pkr_per_meter";
  currentCostPkr: number;
  previousCostPkr: number;
  discountPercent: number;
  currentLabel: string;
  previousLabel: string;
  unitSuffix: string;
};

export type ProductPriceRevisionInfo = {
  active: true;
  unit: ProductSaleUnit;
  priceKey: "cost_pkr_total" | "cost_pkr_per_meter";
  previousKey: "previous_cost_pkr_total" | "previous_cost_pkr_per_meter";
  currentCostPkr: number;
  previousCostPkr: number;
  currentLabel: string;
  previousLabel: string;
  unitSuffix: string;
  updatedAt: string | null;
};

type ProductSaleKeys = Pick<
  ProductSaleInfo,
  "unit" | "priceKey" | "previousKey" | "saleKey" | "unitSuffix"
>;

function safeJson(v: unknown): Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, any>)
    : {};
}

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundPkr(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.round(v));
}

export function formatPkr(n: number) {
  return `PKR ${roundPkr(n).toLocaleString()}`;
}

export function getProductSaleKeys(priceInput: unknown): ProductSaleKeys | null {
  const price = safeJson(priceInput);
  const mode = String(price?.mode ?? "").trim();
  const total = safePositiveNumber(price?.cost_pkr_total);
  const perMeter = safePositiveNumber(price?.cost_pkr_per_meter);

  if (mode === "stitched_total") {
    return {
      unit: "total",
      priceKey: "cost_pkr_total",
      previousKey: "previous_cost_pkr_total",
      saleKey: "sale_cost_pkr_total",
      unitSuffix: "",
    };
  }

  if (mode === "unstitched_per_meter") {
    return {
      unit: "per_meter",
      priceKey: "cost_pkr_per_meter",
      previousKey: "previous_cost_pkr_per_meter",
      saleKey: "sale_cost_pkr_per_meter",
      unitSuffix: " / meter",
    };
  }

  if (total > 0) {
    return {
      unit: "total",
      priceKey: "cost_pkr_total",
      previousKey: "previous_cost_pkr_total",
      saleKey: "sale_cost_pkr_total",
      unitSuffix: "",
    };
  }

  if (perMeter > 0) {
    return {
      unit: "per_meter",
      priceKey: "cost_pkr_per_meter",
      previousKey: "previous_cost_pkr_per_meter",
      saleKey: "sale_cost_pkr_per_meter",
      unitSuffix: " / meter",
    };
  }

  return null;
}

export function getActiveProductSale(priceInput: unknown): ProductSaleInfo | null {
  const price = safeJson(priceInput);
  const sale = safeJson(price?.sale);
  const keys = getProductSaleKeys(price);

  if (!keys || sale?.active !== true) return null;

  const currentCost =
    safePositiveNumber(price?.[keys.priceKey]) ||
    safePositiveNumber(sale?.[keys.saleKey]);
  const previousCost = safePositiveNumber(sale?.[keys.previousKey]);

  if (currentCost <= 0 || previousCost <= currentCost) return null;

  const discountPercent = Math.max(
    1,
    Math.min(99, Math.round(((previousCost - currentCost) / previousCost) * 100)),
  );

  return {
    active: true,
    ...keys,
    currentCostPkr: currentCost,
    previousCostPkr: previousCost,
    discountPercent,
    currentLabel: `${formatPkr(currentCost)}${keys.unitSuffix}`,
    previousLabel: `${formatPkr(previousCost)}${keys.unitSuffix}`,
  };
}

export function getProductSaleReferenceCost(priceInput: unknown) {
  const price = safeJson(priceInput);
  const sale = getActiveProductSale(price);
  const keys = getProductSaleKeys(price);

  if (!keys) return null;

  const liveCost = safePositiveNumber(price?.[keys.priceKey]);

  return {
    ...keys,
    currentCostPkr: liveCost,
    previousCostPkr: sale?.previousCostPkr ?? liveCost,
  };
}

export function getProductRegularPriceRevision(
  priceInput: unknown,
): ProductPriceRevisionInfo | null {
  const price = safeJson(priceInput);
  const revision = safeJson(price?.regular_price_revision);
  const keys = getProductSaleKeys(price);

  if (!keys || revision?.active !== true) return null;

  const revisionUnit = String(revision?.unit ?? "").trim();
  if (revisionUnit && revisionUnit !== keys.unit) return null;

  const currentCost = safePositiveNumber(price?.[keys.priceKey]);
  const previousCost = safePositiveNumber(revision?.[keys.previousKey]);

  if (currentCost <= 0 || previousCost <= 0 || currentCost === previousCost) {
    return null;
  }

  return {
    active: true,
    unit: keys.unit,
    priceKey: keys.priceKey,
    previousKey: keys.previousKey,
    currentCostPkr: currentCost,
    previousCostPkr: previousCost,
    currentLabel: `${formatPkr(currentCost)}${keys.unitSuffix}`,
    previousLabel: `${formatPkr(previousCost)}${keys.unitSuffix}`,
    unitSuffix: keys.unitSuffix,
    updatedAt:
      typeof revision?.updated_at === "string" ? revision.updated_at : null,
  };
}

export function applyProductRegularPriceRevision(
  priceInput: unknown,
  previousCostPkr: number,
  currentCostPkr: number,
  nowIso = new Date().toISOString(),
) {
  const price = safeJson(priceInput);
  const keys = getProductSaleKeys(price);
  if (!keys) return price;

  const previousCost = roundPkr(previousCostPkr);
  const currentCost = roundPkr(currentCostPkr);
  const rawSale = safeJson(price?.sale);

  if (previousCost <= 0 || currentCost <= 0 || previousCost === currentCost) {
    return price;
  }

  return {
    ...price,
    sale:
      rawSale?.active === true
        ? rawSale
        : {
            ...rawSale,
            active: false,
            unit: keys.unit,
            [keys.previousKey]: currentCost,
            [keys.saleKey]: 0,
            updated_at: nowIso,
          },
    regular_price_revision: {
      active: true,
      unit: keys.unit,
      [keys.previousKey]: previousCost,
      [keys.priceKey]: currentCost,
      updated_at: nowIso,
    },
  };
}

export function applyProductSale(
  priceInput: unknown,
  newSaleCostPkr: number,
  nowIso = new Date().toISOString(),
) {
  const price = safeJson(priceInput);
  const keys = getProductSaleKeys(price);
  if (!keys) return price;

  const nextSaleCost = roundPkr(newSaleCostPkr);
  const activeSale = getActiveProductSale(price);
  const liveCost = safePositiveNumber(price?.[keys.priceKey]);
  const previousCost =
    activeSale?.previousCostPkr || liveCost;
  const rawSale = safeJson(price?.sale);

  return {
    ...price,
    [keys.priceKey]: nextSaleCost,
    sale: {
      ...rawSale,
      active: true,
      unit: keys.unit,
      [keys.previousKey]: roundPkr(previousCost),
      [keys.saleKey]: nextSaleCost,
      started_at:
        rawSale?.active === true ? rawSale?.started_at ?? nowIso : nowIso,
      updated_at: nowIso,
      ended_at: null,
    },
  };
}

export function syncProductSaleWithLivePrice(
  priceInput: unknown,
  nowIso = new Date().toISOString(),
) {
  const price = safeJson(priceInput);
  const rawSale = safeJson(price?.sale);
  const keys = getProductSaleKeys(price);
  if (rawSale?.active !== true || !keys) return price;

  const currentCost = roundPkr(safePositiveNumber(price?.[keys.priceKey]));
  const previousCost = roundPkr(safePositiveNumber(rawSale?.[keys.previousKey]));

  if (currentCost <= 0 || previousCost <= 0 || currentCost >= previousCost) {
    return {
      ...price,
      sale: {
        ...rawSale,
        active: false,
        ended_at: nowIso,
        updated_at: nowIso,
      },
    };
  }

  return {
    ...price,
    sale: {
      ...rawSale,
      active: true,
      unit: keys.unit,
      [keys.previousKey]: previousCost,
      [keys.saleKey]: currentCost,
      updated_at: nowIso,
    },
  };
}

export function endProductSale(
  priceInput: unknown,
  nowIso = new Date().toISOString(),
) {
  const price = safeJson(priceInput);
  const sale = getActiveProductSale(price);
  if (!sale) return price;

  return {
    ...price,
    [sale.priceKey]: roundPkr(sale.previousCostPkr),
    sale: {
      ...safeJson(price?.sale),
      active: false,
      ended_at: nowIso,
      updated_at: nowIso,
    },
  };
}
