import { EXPORT_REGIONS } from "@/data/kapray/exportRegions";
import type { ExportRegion } from "@/data/kapray/productTypes";

export type InlandDeliveryMode = "app_calculated" | "free" | "vendor_flat";
export type ExportDeliveryMode = "app_calculated" | "vendor_flat";

export type InlandDeliveryPolicy = {
  mode: InlandDeliveryMode;
  amount_pkr: number | null;
};

export type ExportDeliveryRegionPolicy = {
  mode: ExportDeliveryMode;
  amount_pkr: number | null;
};

export type MeterShippingPolicy = {
  calculation_mode: "actual_weight_only";
  max_checkout_m: number;
  soft_weight_warning_kg: number;
  max_checkout_weight_kg: number;
};

export type DeliveryPolicy = {
  version: 1;
  inland: InlandDeliveryPolicy;
  export_regions: Partial<Record<ExportRegion, ExportDeliveryRegionPolicy>>;
  meter_shipping: MeterShippingPolicy;
};

export type DeliveryPricingOverride = {
  amountPkr: number;
  source: "free_inland" | "vendor_flat_inland" | "vendor_flat_export";
  label: string;
};

export type DeliveryPricingSource =
  | "app_calculated"
  | DeliveryPricingOverride["source"];

export const VENDOR_COURIER_CONSENT_TEXT =
  "Replaces app estimate.";

export const DEFAULT_METER_SHIPPING: MeterShippingPolicy = {
  calculation_mode: "actual_weight_only",
  max_checkout_m: 20,
  soft_weight_warning_kg: 15,
  max_checkout_weight_kg: 20,
};

export const DEFAULT_DELIVERY_POLICY: DeliveryPolicy = {
  version: 1,
  inland: {
    mode: "app_calculated",
    amount_pkr: null,
  },
  export_regions: {},
  meter_shipping: DEFAULT_METER_SHIPPING,
};

export function isUnstitchedDeliveryCategory(value: unknown) {
  const key = cleanString(value).toLowerCase();
  return (
    key === "unstitched_plain" ||
    key === "unstitched_dyeing" ||
    key === "unstitched_dyeing_tailoring"
  );
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function asExportRegion(value: unknown): ExportRegion | null {
  const key = cleanString(value).toUpperCase();
  return EXPORT_REGIONS.find((region) => region === key) ?? null;
}

export function normalizeExportRegionList(value: unknown): ExportRegion[] {
  const rawList =
    typeof value === "string"
      ? value
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((item) => item.replace(/^["']|["']$/g, ""))
      : Array.isArray(value)
        ? value
        : [];

  const seen = new Set<ExportRegion>();
  const out: ExportRegion[] = [];

  for (const item of rawList) {
    const region = asExportRegion(item);
    if (!region || seen.has(region)) continue;
    seen.add(region);
    out.push(region);
  }

  return out;
}

export function safeDeliveryAmount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function normalizeInlandMode(value: unknown): InlandDeliveryMode {
  if (value === "free") return "free";
  if (value === "vendor_flat") return "vendor_flat";
  return "app_calculated";
}

function normalizeExportMode(value: unknown): ExportDeliveryMode {
  return value === "vendor_flat" ? "vendor_flat" : "app_calculated";
}

function normalizeMeterShipping(value: unknown): MeterShippingPolicy {
  const row = asObject(value);
  const maxCheckoutM = Number(row.max_checkout_m);
  const softWeightWarningKg = Number(row.soft_weight_warning_kg);
  const maxCheckoutWeightKg = Number(row.max_checkout_weight_kg);

  return {
    calculation_mode: "actual_weight_only",
    max_checkout_m:
      Number.isFinite(maxCheckoutM) && maxCheckoutM > 0
        ? Math.round(maxCheckoutM * 100) / 100
        : DEFAULT_METER_SHIPPING.max_checkout_m,
    soft_weight_warning_kg:
      Number.isFinite(softWeightWarningKg) && softWeightWarningKg > 0
        ? Math.round(softWeightWarningKg * 100) / 100
        : DEFAULT_METER_SHIPPING.soft_weight_warning_kg,
    max_checkout_weight_kg:
      Number.isFinite(maxCheckoutWeightKg) && maxCheckoutWeightKg > 0
        ? Math.round(maxCheckoutWeightKg * 100) / 100
        : DEFAULT_METER_SHIPPING.max_checkout_weight_kg,
  };
}

export function normalizeDeliveryPolicy(
  value: unknown,
  allowedExportRegions?: unknown,
): DeliveryPolicy {
  const row = asObject(value);
  const allowedRegions =
    allowedExportRegions === undefined
      ? EXPORT_REGIONS
      : normalizeExportRegionList(allowedExportRegions);

  const inlandSource = asObject(
    row.inland ?? row.domestic ?? row.pakistan ?? row.within_pakistan,
  );
  const inlandMode = normalizeInlandMode(inlandSource.mode);
  const inlandAmount =
    inlandMode === "vendor_flat"
      ? safeDeliveryAmount(
          inlandSource.amount_pkr ??
            inlandSource.amount ??
            inlandSource.courier_pkr,
        )
      : null;

  const exportSource = asObject(
    row.export_regions ?? row.export ?? row.international,
  );
  const exportPolicies: DeliveryPolicy["export_regions"] = {};

  for (const region of allowedRegions) {
    const regionSource = asObject(exportSource[region]);
    const mode = normalizeExportMode(regionSource.mode);
    exportPolicies[region] = {
      mode,
      amount_pkr:
        mode === "vendor_flat"
          ? safeDeliveryAmount(
              regionSource.amount_pkr ??
                regionSource.amount ??
                regionSource.courier_pkr,
            )
          : null,
    };
  }

  return {
    version: 1,
    inland: {
      mode: inlandMode,
      amount_pkr: inlandAmount,
    },
    export_regions: exportPolicies,
    meter_shipping: normalizeMeterShipping(row.meter_shipping),
  };
}

export function decodeDeliveryPolicyParam(
  value: unknown,
  allowedExportRegions?: unknown,
): DeliveryPolicy {
  const raw = cleanString(value);
  if (!raw) return normalizeDeliveryPolicy(null, allowedExportRegions);

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  try {
    return normalizeDeliveryPolicy(JSON.parse(decoded), allowedExportRegions);
  } catch {
    return normalizeDeliveryPolicy(null, allowedExportRegions);
  }
}

export function encodeDeliveryPolicyParam(
  policy: unknown,
  allowedExportRegions?: unknown,
): string {
  try {
    return encodeURIComponent(
      JSON.stringify(normalizeDeliveryPolicy(policy, allowedExportRegions)),
    );
  } catch {
    return "";
  }
}

export function resolveDeliveryPolicyOverride(args: {
  policy: DeliveryPolicy;
  destinationType: "inland" | "export";
  exportRegion?: string | null;
}): DeliveryPricingOverride | null {
  const policy = normalizeDeliveryPolicy(args.policy);

  if (args.destinationType === "inland") {
    if (policy.inland.mode === "free") {
      return {
        amountPkr: 0,
        source: "free_inland",
        label: "Free in Pakistan",
      };
    }

    if (
      policy.inland.mode === "vendor_flat" &&
      (policy.inland.amount_pkr ?? 0) > 0
    ) {
      return {
        amountPkr: policy.inland.amount_pkr ?? 0,
        source: "vendor_flat_inland",
        label: `Pakistan courier PKR ${policy.inland.amount_pkr}`,
      };
    }

    return null;
  }

  const region = asExportRegion(args.exportRegion);
  if (!region) return null;

  const exportPolicy = policy.export_regions[region];
  if (
    exportPolicy?.mode === "vendor_flat" &&
    (exportPolicy.amount_pkr ?? 0) > 0
  ) {
    return {
      amountPkr: exportPolicy.amount_pkr ?? 0,
      source: "vendor_flat_export",
      label: `${region} courier PKR ${exportPolicy.amount_pkr}`,
    };
  }

  return null;
}

export function validateDeliveryPolicy(
  value: unknown,
  allowedExportRegions?: unknown,
): string | null {
  const policy = normalizeDeliveryPolicy(value, allowedExportRegions);
  const allowedRegions =
    allowedExportRegions === undefined
      ? EXPORT_REGIONS
      : normalizeExportRegionList(allowedExportRegions);

  if (
    policy.inland.mode === "vendor_flat" &&
    !(Number(policy.inland.amount_pkr) > 0)
  ) {
    return "Enter Pakistan courier charge.";
  }

  for (const region of allowedRegions) {
    const row = policy.export_regions[region];
    if (row?.mode === "vendor_flat" && !(Number(row.amount_pkr) > 0)) {
      return `Enter courier charge for ${region}.`;
    }
  }

  return null;
}

export function getDeliveryPolicySummary(
  value: unknown,
  allowedExportRegions?: unknown,
  options?: { perMeter?: boolean },
): string[] {
  const policy = normalizeDeliveryPolicy(value, allowedExportRegions);
  const allowedRegions =
    allowedExportRegions === undefined
      ? EXPORT_REGIONS
      : normalizeExportRegionList(allowedExportRegions);
  const rows: string[] = [];
  const unit = options?.perMeter ? "/m" : "";
  const appUnit = options?.perMeter ? " per meter" : "";

  if (policy.inland.mode === "free") {
    rows.push("Pakistan: free");
  } else if (policy.inland.mode === "vendor_flat") {
    rows.push(
      `Pakistan: PKR ${policy.inland.amount_pkr ?? 0}${unit}`,
    );
  } else {
    rows.push(`Pakistan: app courier${appUnit}`);
  }

  if (!allowedRegions.length) {
    rows.push("Export: no regions");
    return rows;
  }

  for (const region of allowedRegions) {
    const row = policy.export_regions[region];
    rows.push(
      row?.mode === "vendor_flat"
        ? `${region}: PKR ${row.amount_pkr ?? 0}${unit}`
        : `${region}: app courier${appUnit}`,
    );
  }

  return rows;
}
