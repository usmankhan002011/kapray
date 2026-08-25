import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import {
  getPurchaseMediaPublicUrl,
  getPurchaseProductDetails,
} from "@/services/purchase/purchaseProducts";
import { getDeliveryCost } from "@/utils/kapray/delivery";
import {
  decodeDeliveryPolicyParam,
  encodeDeliveryPolicyParam,
  isUnstitchedDeliveryCategory,
  normalizeDeliveryPolicy,
  resolveDeliveryPolicyOverride,
  type DeliveryPolicy,
  type DeliveryPricingSource,
} from "@/utils/kapray/deliveryPolicy";
import DyePaletteReferenceButton from "@/components/product/DyePaletteReferenceButton";
import ExactMeasurementsModal from "../(tabs)/flow/purchase/exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "../(tabs)/flow/purchase/exact-measurements-sheet";

const LAST_CHECKOUT_ADDRESS_KEY = "kapray:last_checkout_address:v1";

type LastCheckoutAddress = {
  buyerName?: string;
  buyerMobile?: string;
  deliveryAddress?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  destinationType?: "inland" | "export";
  exportRegion?: string;
};

type Params = {
  productId?: string;
  product_id?: string;
  productCode?: string;
  product_code?: string;

  mode?: string;
  selectedSize?: string;
  selected_unstitched_size?: string;
  selected_fabric_length_m?: string;
  fabric_cost_pkr?: string;

  m1?: string;
  m2?: string;
  m3?: string;
  m4?: string;
  m5?: string;
  m6?: string;
  m7?: string;
  m8?: string;
  m9?: string;
  m10?: string;
  m11?: string;
  m12?: string;
  m13?: string;
  m14?: string;
  m15?: string;
  m16?: string;
  m17?: string;

  custom_label_1?: string;
  custom_value_1?: string;
  custom_label_2?: string;
  custom_value_2?: string;
  custom_label_3?: string;
  custom_value_3?: string;
  custom_label_4?: string;
  custom_value_4?: string;

  product_category?: string;
  made_on_order?: string;
  selected_variant_made_on_order?: string;
  variant_mode?: string;
  selected_variant_mode?: string;
  selected_variant_label?: string;
  selected_variant_snapshot?: string;
  selected_stitched_variant_snapshot?: string;

  productName?: string;
  product_name?: string;
  price?: string;
  price_per_meter_pkr?: string;
  stitched_total_pkr?: string;
  currency?: string;
  imageUrl?: string;
  image_url?: string;

  vendorName?: string;
  vendorMobile?: string;
  vendorAddress?: string;

  dye_shade_id?: string;
  dye_hex?: string;
  dye_label?: string;
  dyeing_split_json?: string;
  dyeing_cost_pkr?: string;
  dyeing_selected?: string;
  dyeing_available?: string;

  tailoring_cost_pkr?: string;
  tailoring_turnaround_days?: string;
  tailoring_selected?: string;
  tailoring_available?: string;

  selected_tailoring_style_id?: string;
  selected_tailoring_style_title?: string;
  selected_tailoring_style_image?: string;
  selected_tailoring_style_snapshot?: string;
  tailoring_style_label?: string;

  selected_variant_id?: string;
  selected_variant_title?: string;
  selected_variant_size?: string;
  selected_variant_color?: string;
  selected_variant_price_pkr?: string;
  selected_variant_image_path?: string;
  selected_variant_banner_path?: string;
  selected_variant_banner_url?: string;
  selected_variant_image_url?: string;

  selected_neck_variation?: string;
  selected_sleeve_variation?: string;
  selected_trouser_variation?: string;

  custom_tailoring_note?: string;
  tailoring_style_extra_cost_pkr?: string;

  exports_enabled?: string;
  export_regions?: string;
  delivery_policy?: string;
  weight_kg?: string;
  weight_per_meter_kg?: string;
  package_cm?: string;
  unit?: string;
};

type VendorState = {
  shop_name: string | null;
  owner_name: string | null;
  mobile: string | null;
  landline: string | null;
  address: string | null;
  location_url: string | null;
  government_permission_url: string | null;
  banner_url: string | null;
  images: string[] | null;
  videos: string[] | null;
  status: string | null;
  exports_enabled?: boolean | null;
  export_regions?: unknown[] | null;
};

type VendorRow = {
  id: string | number;
  name?: string | null;
  shop_name?: string | null;
  address?: string | null;
  mobile?: string | null;
  landline?: string | null;
  email?: string | null;
  location?: string | null;
  location_url?: string | null;
  profile_image_path?: string | null;
  banner_path?: string | null;
  status?: string | null;
  exports_enabled?: boolean | null;
  export_regions?: unknown[] | null;
};

type ProductRow = {
  id: string | number;
  product_code?: string | null;
  title?: string | null;
  spec?: any;
  price?: any;
  media?: any;
  vendor_id?: string | number | null;
  vendor?: VendorRow | null;
};

type SelectedTailoringStyleSnapshot = {
  id?: string | null;
  title?: string | null;
  styleLabel?: string | null;
  style_label?: string | null;
  note?: string | null;
  extra_cost_pkr?: number | string | null;
  default_neck?: string | null;
  default_sleeve?: string | null;
  default_trouser?: string | null;
  selected_neck_variation?: string | null;
  selected_sleeve_variation?: string | null;
  selected_trouser_variation?: string | null;
  image_url?: string | null;
  allow_custom_note?: boolean | null;
  custom_note?: string | null;
};

type DyeSplit = {
  length_m: number;
  dye_shade_id: string;
  dye_hex: string;
  dye_label: string;
  dyeing_cost_pkr: number;
};

const PAKISTAN_CITY_OPTIONS = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Hyderabad",
  "Quetta",
  "Sialkot",
];

const norm = (v: unknown) => (v == null ? "" : String(v).trim());

const AUTO_COUNTRY_BY_EXPORT_REGION: Record<string, string> = {
  UK: "United Kingdom",
  USA: "United States",
  CANADA: "Canada",
  KSA: "Saudi Arabia",
  UAE: "United Arab Emirates",
  AUSTRALIA: "Australia",
};

const MANUAL_COUNTRY_EXPORT_REGIONS = new Set(["EUROPE"]);

function exportRegionKey(region: unknown) {
  return norm(region).toUpperCase();
}

function countryForExportRegion(region: unknown) {
  return AUTO_COUNTRY_BY_EXPORT_REGION[exportRegionKey(region)] ?? "";
}

function exportRegionNeedsCountry(region: unknown) {
  return MANUAL_COUNTRY_EXPORT_REGIONS.has(exportRegionKey(region));
}

function isBlankOrAutoCountry(value: unknown) {
  const country = norm(value).toLowerCase();
  if (!country || country === "pakistan") return true;

  const autoCountries = Object.values(AUTO_COUNTRY_BY_EXPORT_REGION).map((x) =>
    x.toLowerCase(),
  );
  const autoRegionKeys = Object.keys(AUTO_COUNTRY_BY_EXPORT_REGION).map((x) =>
    x.toLowerCase(),
  );

  return autoCountries.includes(country) || autoRegionKeys.includes(country);
}

function firstNonEmpty(...vals: Array<unknown>) {
  for (const v of vals) {
    const s = norm(v);
    if (s) return s;
  }
  return "";
}

function safeDecode(v: unknown) {
  const s = norm(v);
  if (!s) return "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function safeJsonDecode<T = any>(v: unknown, fallback: T): T {
  const s = safeDecode(v);
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function normalizeSavedCheckoutAddress(
  value: unknown,
): LastCheckoutAddress | null {
  if (!value || typeof value !== "object") return null;

  const row = value as LastCheckoutAddress;
  const normalizedDestinationType =
    row.destinationType === "export" ? "export" : "inland";
  const normalizedExportRegion = norm(row.exportRegion);

  const saved: LastCheckoutAddress = {
    buyerName: norm(row.buyerName),
    buyerMobile: norm(row.buyerMobile),
    deliveryAddress: norm(row.deliveryAddress),
    city: norm(row.city),
    postalCode: norm(row.postalCode),
    country:
      normalizedDestinationType === "inland"
        ? "Pakistan"
        : norm(row.country) || countryForExportRegion(normalizedExportRegion),
    destinationType: normalizedDestinationType,
    exportRegion: normalizedExportRegion,
  };

  if (
    !saved.buyerName &&
    !saved.buyerMobile &&
    !saved.deliveryAddress &&
    !saved.city
  ) {
    return null;
  }

  return saved;
}

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function normalizeDyeSplits(v: unknown): DyeSplit[] {
  const rows = safeJsonDecode<any[]>(v, []);
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      length_m: safePositiveNumber(row?.length_m),
      dye_shade_id: safeDecode(row?.dye_shade_id),
      dye_hex: safeDecode(row?.dye_hex),
      dye_label: safeDecode(row?.dye_label),
      dyeing_cost_pkr: safePositiveNumber(row?.dyeing_cost_pkr),
    }))
    .filter((row) => row.length_m > 0 && (row.dye_hex || row.dye_shade_id));
}

function parseBoolParam(v: unknown): boolean | null {
  const s = norm(v).toLowerCase();
  if (!s) return null;
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return null;
}

function resolvePublicUrl(path: string | null | undefined) {
  const p = norm(path);
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return getPurchaseMediaPublicUrl(p);
}

function cleanReadyToWearTitle(title: string, selectedSize: string) {
  const t = norm(title) || "Product";
  const size = norm(selectedSize);
  if (!size) return t;

  const escaped = size.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return t
    .replace(
      new RegExp(
        `\\s*[\\(\\[]\\s*(?:size\\s*[:#-]?\\s*)?${escaped}\\s*[\\)\\]]\\s*$`,
        "i",
      ),
      "",
    )
    .replace(
      new RegExp(
        `\\s*(?:[-–—|•,]|/)\\s*(?:size\\s*[:#-]?\\s*)?${escaped}\\s*$`,
        "i",
      ),
      "",
    )
    .replace(new RegExp(`\\s+size\\s*[:#-]?\\s*${escaped}\\s*$`, "i"), "")
    .trim();
}

function designText(value: unknown, fallback = "") {
  const s = String(value ?? "").trim();
  if (!s || s === "â€”" || s === "—" || s === "Ã¢â‚¬â€") {
    return fallback;
  }

  return (
    s
      .replace(/^(?:Variant|Style)\s+\d+\s*:\s*/i, "")
      .replace(/^(?:Variant|Style)\s+\d+$/i, "")
      .trim() || fallback
  );
}

type SelectionLabel = "style" | "design";

function normalizeSelectionLabel(
  value: unknown,
  fallback: SelectionLabel = "design",
): SelectionLabel {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "style" || s === "styles" ? "style" : fallback;
}

function selectionLabelText(label: SelectionLabel) {
  return label === "style" ? "style" : "design";
}

function selectionLabelTitle(label: SelectionLabel) {
  return label === "style" ? "Style" : "Design";
}

function selectedLabelTitle(label: SelectionLabel) {
  return `Selected ${selectionLabelTitle(label)}`;
}

function prettyCategory(v: string) {
  if (v === "stitched_ready") return "Ready to wear";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function joinRegions(list?: unknown[] | null) {
  return Array.isArray(list) && list.length
    ? list.map((x) => String(x)).join(", ")
    : "";
}

function inferCityFromAddress(address: string) {
  const a = address.toLowerCase();
  const match = PAKISTAN_CITY_OPTIONS.find((c) => a.includes(c.toLowerCase()));
  return match || "";
}

function buildFullAddress(args: {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}) {
  const address = norm(args.address);
  const city = norm(args.city);
  const postalCode = norm(args.postalCode);
  const country = norm(args.country);

  const cityLine = [city, postalCode].filter(Boolean).join(" ");
  return [address, cityLine, country].filter(Boolean).join(", ");
}

function computeDeliveryQuoteSafe(args: {
  destinationType: "inland" | "export";
  city: string;
  exportRegion: string;
  weightKg: number;
  weightPerMeterKg?: number;
  fabricLengthM?: number;
  packageCm?: Record<string, unknown> | null;
  deliveryPolicy: DeliveryPolicy;
  isMeterPurchase: boolean;
}) {
  const {
    destinationType,
    city,
    exportRegion,
    weightKg,
    weightPerMeterKg = 0,
    fabricLengthM = 0,
    packageCm,
    deliveryPolicy,
    isMeterPurchase,
  } = args;
  const meterMultiplier =
    isMeterPurchase && fabricLengthM > 0 ? fabricLengthM : 0;
  const usesPerMeterDelivery = meterMultiplier > 0;
  const meterText = String(Math.round(meterMultiplier * 100) / 100);

  const override = resolveDeliveryPolicyOverride({
    policy: deliveryPolicy,
    destinationType,
    exportRegion,
  });

  if (override) {
    if (override.source !== "free_inland" && usesPerMeterDelivery) {
      return {
        amountPkr: Math.round(override.amountPkr * meterMultiplier),
        source: override.source as DeliveryPricingSource,
        label: `${override.label}/m x ${meterText}m`,
      };
    }

    return {
      amountPkr: override.amountPkr,
      source: override.source as DeliveryPricingSource,
      label: override.label,
    };
  }

  const ratedWeightKg =
    usesPerMeterDelivery && weightPerMeterKg > 0 ? weightPerMeterKg : weightKg;

  if (ratedWeightKg <= 0) {
    return {
      amountPkr: 0,
      source: "app_calculated" as DeliveryPricingSource,
      label: "Weight unavailable.",
    };
  }

  try {
    const raw = getDeliveryCost({
      weightKg: ratedWeightKg,
      packageCm: isMeterPurchase ? undefined : packageCm ?? undefined,
      scope: destinationType === "export" ? "international" : "inland",
      regionOrCity: destinationType === "export" ? exportRegion : city,
    } as any);

    const n = Number(raw);
    const unitAmountPkr = Number.isFinite(n) && n > 0 ? n : 0;
    if (usesPerMeterDelivery && weightPerMeterKg > 0) {
      return {
        amountPkr: Math.round(unitAmountPkr * meterMultiplier),
        source: "app_calculated" as DeliveryPricingSource,
        label: `App courier PKR ${Math.round(unitAmountPkr)}/m x ${meterText}m`,
      };
    }

    return {
      amountPkr: unitAmountPkr,
      source: "app_calculated" as DeliveryPricingSource,
      label: "App courier",
    };
  } catch {
    return {
      amountPkr: 0,
      source: "app_calculated" as DeliveryPricingSource,
      label: "Shipping unavailable.",
    };
  }
}

function cleanVariationLabel(value: string, kind: "neck" | "sleeve") {
  if (!value) return "";
  const pattern = kind === "neck" ? /\bneck\b/gi : /\bsleeve\b/gi;
  return value
    .replace(pattern, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${Math.round(amount || 0)}`;
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function KVRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value?: React.ReactNode;
  muted?: boolean;
}) {
  if (
    value == null ||
    value === "" ||
    value === false ||
    (typeof value === "string" && !value.trim())
  ) {
    return null;
  }

  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, muted && styles.kvMuted]}>{value}</Text>
    </View>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, strong && styles.priceLabelStrong]}>
        {label}
      </Text>
      <Text style={[styles.priceValue, strong && styles.priceValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

function SelectionChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.choicePill,
        selected ? styles.choicePillOn : null,
        disabled ? styles.disabledBtn : null,
      ]}
    >
      <Text style={[styles.choiceText, selected ? styles.choiceTextOn : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function PlaceOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const vendor = useSelector(
    (s: any) => s?.vendor ?? null,
  ) as VendorState | null;
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  const base = useMemo(() => {
    const productId = firstNonEmpty(params.productId, params.product_id);
    const productCode = firstNonEmpty(params.productCode, params.product_code);

    const mode = firstNonEmpty(params.mode) || "standard";
    const selectedSize = firstNonEmpty(params.selectedSize);
    const selectedUnstitchedSize = safeDecode(params.selected_unstitched_size);
    const selectedFabricLengthM = safePositiveNumber(
      safeDecode(params.selected_fabric_length_m),
    );
    const fabricCostPkr = safePositiveNumber(params.fabric_cost_pkr);
    const weightPerMeterKg = safePositiveNumber(params.weight_per_meter_kg);
    const routeWeightKg = safePositiveNumber(params.weight_kg);
    const derivedFabricWeightKg =
      selectedFabricLengthM > 0 && weightPerMeterKg > 0
        ? Math.round(selectedFabricLengthM * weightPerMeterKg * 100) / 100
        : 0;

    const measurements = {
      m1: norm(params.m1),
      m2: norm(params.m2),
      m3: norm(params.m3),
      m4: norm(params.m4),
      m5: norm(params.m5),
      m6: norm(params.m6),
      m7: norm(params.m7),
      m8: norm(params.m8),
      m9: norm(params.m9),
      m10: norm(params.m10),
      m11: norm(params.m11),
      m12: norm(params.m12),
      m13: norm(params.m13),
      m14: norm(params.m14),
      m15: norm(params.m15),
      m16: norm(params.m16),
      m17: norm(params.m17),
    };

    const exactPairs: [string, string][] = [
      ["1", measurements.m1],
      ["2", measurements.m2],
      ["3", measurements.m3],
      ["4", measurements.m4],
      ["5", measurements.m5],
      ["6", measurements.m6],
      ["7", measurements.m7],
      ["8", measurements.m8],
      ["9", measurements.m9],
      ["10", measurements.m10],
      ["11", measurements.m11],
      ["12", measurements.m12],
      ["13", measurements.m13],
      ["14", measurements.m14],
      ["15", measurements.m15],
      ["16", measurements.m16],
      ["17", measurements.m17],
    ].filter(
      (pair): pair is [string, string] =>
        typeof pair[1] === "string" && pair[1].length > 0,
    );

    const customDimensions = [
      {
        label: safeDecode(params.custom_label_1),
        value: safeDecode(params.custom_value_1),
      },
      {
        label: safeDecode(params.custom_label_2),
        value: safeDecode(params.custom_value_2),
      },
      {
        label: safeDecode(params.custom_label_3),
        value: safeDecode(params.custom_value_3),
      },
      {
        label: safeDecode(params.custom_label_4),
        value: safeDecode(params.custom_value_4),
      },
    ].filter((row) => row.label && row.value);

    const selectedVariantSizeForLabel = safeDecode(
      firstNonEmpty(params.selected_variant_size),
    );

    const sizeLabel =
      mode === "exact"
        ? exactPairs.length
          ? "Exact measurements"
          : "Exact measurements not set"
        : selectedVariantSizeForLabel
          ? selectedVariantSizeForLabel
          : selectedSize
            ? selectedSize
            : selectedUnstitchedSize
              ? selectedUnstitchedSize
              : "Not set";

    const selectedTailoringStyleId = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_id),
    );
    const selectedTailoringStyleTitle = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_title),
    );
    const selectedTailoringStyleImage = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_image),
    );

    const selectedTailoringStyleSnapshot =
      safeJsonDecode<SelectedTailoringStyleSnapshot | null>(
        params.selected_tailoring_style_snapshot,
        null,
      );
    const tailoringStyleLabel = normalizeSelectionLabel(
      firstNonEmpty(
        params.tailoring_style_label,
        selectedTailoringStyleSnapshot?.styleLabel,
        selectedTailoringStyleSnapshot?.style_label,
      ),
    );

    const selectedVariantSnapshot = safeJsonDecode<any>(
      firstNonEmpty(
        params.selected_stitched_variant_snapshot,
        params.selected_variant_snapshot,
      ),
      null,
    );

    const variantMode = safeDecode(
      firstNonEmpty(
        params.selected_variant_mode,
        params.variant_mode,
        selectedVariantSnapshot?.variant_mode,
        selectedVariantSnapshot?.rawVariant?.variant_mode,
      ),
    );

    const madeOnOrder = Boolean(
      parseBoolParam(params.made_on_order) ??
      parseBoolParam(params.selected_variant_made_on_order) ??
      selectedVariantSnapshot?.made_on_order ??
      selectedVariantSnapshot?.rawVariant?.made_on_order ??
      selectedVariantSnapshot?.rawVariant?.madeOnOrder ??
      variantMode === "made_order_variants",
    );
    const selectedVariantLabel = normalizeSelectionLabel(
      firstNonEmpty(
        params.selected_variant_label,
        selectedVariantSnapshot?.selection_label,
        selectedVariantSnapshot?.selected_variant_label,
        selectedVariantSnapshot?.styleLabel,
        selectedVariantSnapshot?.style_label,
      ),
    );

    const selectedVariantId = safeDecode(
      firstNonEmpty(params.selected_variant_id),
    );
    const selectedVariantTitle = safeDecode(
      firstNonEmpty(params.selected_variant_title),
    );
    const selectedVariantSize = safeDecode(
      firstNonEmpty(params.selected_variant_size),
    );
    const selectedVariantColor = safeDecode(
      firstNonEmpty(params.selected_variant_color),
    );
    const selectedVariantPricePkr = safePositiveNumber(
      safeDecode(firstNonEmpty(params.selected_variant_price_pkr)),
    );
    const selectedVariantImagePath = safeDecode(
      firstNonEmpty(
        params.selected_variant_banner_url,
        params.selected_variant_banner_path,
        params.selected_variant_image_url,
        params.selected_variant_image_path,
      ),
    );

    const selectedNeckVariation =
      safeDecode(firstNonEmpty(params.selected_neck_variation)) ||
      safeDecode(
        firstNonEmpty(
          (selectedTailoringStyleSnapshot as any)?.selected_neck_variation,
        ),
      );

    const selectedSleeveVariation =
      safeDecode(firstNonEmpty(params.selected_sleeve_variation)) ||
      safeDecode(
        firstNonEmpty(
          (selectedTailoringStyleSnapshot as any)?.selected_sleeve_variation,
        ),
      );

    const selectedTrouserVariation =
      safeDecode(firstNonEmpty(params.selected_trouser_variation)) ||
      safeDecode(
        firstNonEmpty(
          (selectedTailoringStyleSnapshot as any)?.selected_trouser_variation,
        ),
      );

    const customTailoringNote =
      safeDecode(firstNonEmpty(params.custom_tailoring_note)) ||
      safeDecode(
        firstNonEmpty((selectedTailoringStyleSnapshot as any)?.custom_note),
      );

    const styleExtraCostPkr = safePositiveNumber(
      safeDecode(firstNonEmpty(params.tailoring_style_extra_cost_pkr)) ||
        (selectedTailoringStyleSnapshot as any)?.extra_cost_pkr,
    );

    const dyeingSplits = normalizeDyeSplits(params.dyeing_split_json);
    const dyeingSplitCostPkr = Math.round(
      dyeingSplits.reduce((sum, row) => sum + row.dyeing_cost_pkr, 0),
    );
    const exportRegionsParam = safeJsonDecode<string[]>(
      params.export_regions,
      [],
    );
    const hasDeliveryPolicyParam = Boolean(norm(params.delivery_policy));
    const deliveryPolicy = decodeDeliveryPolicyParam(
      params.delivery_policy,
      exportRegionsParam,
    );

    return {
      productId,
      productCode,
      mode,
      selectedSize,
      selectedUnstitchedSize,
      selectedFabricLengthM,
      fabricCostPkr,
      exactPairs,
      measurements,
      customDimensions,

      productName: firstNonEmpty(params.productName, params.product_name),
      productCategory: norm(params.product_category),
      madeOnOrder,
      variantMode,
      selectedVariantLabel,
      selectedVariantSnapshot,
      priceParam: norm(params.price),
      pricePerMeterPkr: safePositiveNumber(params.price_per_meter_pkr),
      stitchedTotalPkr: safePositiveNumber(params.stitched_total_pkr),
      currency: firstNonEmpty(params.currency) || "PKR",
      imageUrl: firstNonEmpty(params.imageUrl, params.image_url),

      dyeShadeId: safeDecode(firstNonEmpty(params.dye_shade_id)),
      dyeHex: safeDecode(firstNonEmpty(params.dye_hex)),
      dyeLabel: safeDecode(firstNonEmpty(params.dye_label)),
      dyeingSplits,
      dyeingCostPkr:
        safePositiveNumber(safeDecode(firstNonEmpty(params.dyeing_cost_pkr))) ||
        dyeingSplitCostPkr,
      dyeingSelected: parseBoolParam(params.dyeing_selected),
      dyeingAvailable: parseBoolParam(params.dyeing_available),

      tailoringCostPkr: safePositiveNumber(
        safeDecode(firstNonEmpty(params.tailoring_cost_pkr)),
      ),
      tailoringTurnaroundDays: safePositiveNumber(
        safeDecode(firstNonEmpty(params.tailoring_turnaround_days)),
      ),
      tailoringSelected: parseBoolParam(params.tailoring_selected),
      tailoringAvailable: parseBoolParam(params.tailoring_available),

      selectedVariantId,
      selectedVariantTitle,
      selectedVariantSize,
      selectedVariantColor,
      selectedVariantPricePkr,
      selectedVariantImagePath,

      selectedTailoringStyleId,
      selectedTailoringStyleTitle:
        selectedTailoringStyleTitle ||
        safeDecode(
          firstNonEmpty((selectedTailoringStyleSnapshot as any)?.title),
        ),
      selectedTailoringStyleImage:
        selectedTailoringStyleImage ||
        safeDecode(
          firstNonEmpty((selectedTailoringStyleSnapshot as any)?.image_url),
        ),
      selectedTailoringStyleSnapshot,
      tailoringStyleLabel,
      selectedNeckVariation,
      selectedSleeveVariation,
      selectedTrouserVariation,
      customTailoringNote,
      styleExtraCostPkr,

      exportsEnabledParam: parseBoolParam(params.exports_enabled),
      exportRegionsParam,
      hasDeliveryPolicyParam,
      deliveryPolicy,
      weightKg: derivedFabricWeightKg || routeWeightKg,
      weightPerMeterKg,
      packageCm: safeJsonDecode<Record<string, unknown> | null>(
        params.package_cm,
        null,
      ),

      sizeLabel,
    };
  }, [params]);

  const measurementRows = useMemo<ExactMeasurementSheetRow[]>(() => {
    const standardRows: ExactMeasurementSheetRow[] = [
      { order: 1, label: "1. Neck", value: base.measurements.m1 },
      { order: 2, label: "2. Across front", value: base.measurements.m2 },
      { order: 3, label: "3. Bust", value: base.measurements.m3 },
      { order: 4, label: "4. Under bust", value: base.measurements.m4 },
      { order: 5, label: "5. Waist", value: base.measurements.m5 },
      { order: 6, label: "6. Hips", value: base.measurements.m6 },
      { order: 7, label: "7. Thigh", value: base.measurements.m7 },
      { order: 8, label: "8. Upper arm", value: base.measurements.m8 },
      { order: 9, label: "9. Elbow", value: base.measurements.m9 },
      { order: 10, label: "10. Wrist", value: base.measurements.m10 },
      {
        order: 11,
        label: "11. Shoulder to waist",
        value: base.measurements.m11,
      },
      {
        order: 12,
        label: "12. Shoulder to floor",
        value: base.measurements.m12,
      },
      {
        order: 13,
        label: "13. Shoulder to shoulder",
        value: base.measurements.m13,
      },
      {
        order: 14,
        label: "14. Back neck to waist",
        value: base.measurements.m14,
      },
      { order: 15, label: "15. Across back", value: base.measurements.m15 },
      {
        order: 16,
        label: "16. Inner arm length",
        value: base.measurements.m16,
      },
      { order: 17, label: "17. Ankle", value: base.measurements.m17 },
    ].filter((row) => row.value);

    const customRows: ExactMeasurementSheetRow[] = base.customDimensions.map(
      (row, index) => ({
        order: 100 + index,
        label: row.label,
        value: row.value,
      }),
    );

    return [...standardRows, ...customRows];
  }, [base.customDimensions, base.measurements]);

  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState<ProductRow | null>(null);

  const loadProductIfNeeded = useCallback(async () => {
    const shouldFetch =
      (!!base.productId || !!base.productCode) &&
      (!base.productName || !base.imageUrl);

    if (!shouldFetch) return;

    try {
      setLoadingProduct(true);

      const numericProductId = Number(base.productId);
      const product = await getPurchaseProductDetails({
        productId: Number.isFinite(numericProductId)
          ? numericProductId
          : undefined,
        productCode: Number.isFinite(numericProductId)
          ? undefined
          : base.productCode,
      });
      setFetchedProduct(product as any);
    } catch {
      // Keep the existing product details when the optional lookup fails.
    } finally {
      setLoadingProduct(false);
    }
  }, [base.productId, base.productCode, base.productName, base.imageUrl]);

  useEffect(() => {
    loadProductIfNeeded();
  }, [loadProductIfNeeded]);

  const resolved = useMemo(() => {
    const fp = fetchedProduct;
    const title = base.productName || norm(fp?.title) || "Product";
    const code = base.productCode || norm(fp?.product_code) || "";
    const id = base.productId || norm(fp?.id) || "";

    const media = fp?.media ?? {};
    const imagePath = media?.images?.[0] ?? "";
    const imageUrl = base.imageUrl || resolvePublicUrl(imagePath) || "";

    const vJoin = fp?.vendor ?? null;

    const vendorName =
      firstNonEmpty(
        params.vendorName,
        vendor?.shop_name,
        vendor?.owner_name,
        vJoin?.shop_name,
        vJoin?.name,
      ) || "Vendor";

    const vendorMobile = firstNonEmpty(
      params.vendorMobile,
      vendor?.mobile,
      vJoin?.mobile,
    );
    const vendorAddress = firstNonEmpty(
      params.vendorAddress,
      vendor?.address,
      vJoin?.address,
    );

    const exportsEnabled = Boolean(
      base.exportsEnabledParam ??
      vendor?.exports_enabled ??
      (vJoin as any)?.exports_enabled ??
      false,
    );

    const exportRegions = base.exportRegionsParam?.length
      ? base.exportRegionsParam
      : ((vendor?.export_regions as unknown[] | null | undefined) ??
        (vJoin as any)?.export_regions ??
        []);
    const deliveryPolicy = base.hasDeliveryPolicyParam
      ? normalizeDeliveryPolicy(base.deliveryPolicy, exportRegions)
      : normalizeDeliveryPolicy((fp as any)?.spec?.delivery_policy, exportRegions);

    const isUnstitched = isUnstitchedDeliveryCategory(base.productCategory);
    const isFabricByMeterPurchase =
      base.productCategory === "unstitched_plain" ||
      base.productCategory === "unstitched_dyeing" ||
      base.mode === "meter";
    const usesFabricWeightShipping =
      isUnstitched ||
      (base.selectedFabricLengthM > 0 && base.weightPerMeterKg > 0);

    const categoryKey = base.productCategory.toLowerCase();
    const hasSelectedStitchedVariant = Boolean(
      base.selectedVariantId || base.selectedVariantTitle,
    );
    const isMadeOrderStitched =
      !isUnstitched &&
      hasSelectedStitchedVariant &&
      Boolean(base.madeOnOrder || base.variantMode === "made_order_variants");
    const isReadyToWearStitched =
      !isMadeOrderStitched &&
      !isUnstitched &&
      hasSelectedStitchedVariant &&
      (categoryKey.includes("ready") ||
        categoryKey.includes("ready_to_wear") ||
        categoryKey.includes("ready-to-wear") ||
        categoryKey.includes("stitched_ready") ||
        categoryKey.includes("ready_stitched") ||
        categoryKey === "stitched" ||
        categoryKey === "stitched_ready_to_wear" ||
        categoryKey === "ready_to_wear_stitched");
    const shouldShowSelectedStitchedVariant =
      isReadyToWearStitched || isMadeOrderStitched;

    const selectedVariantImageUrl =
      shouldShowSelectedStitchedVariant && base.selectedVariantImagePath
        ? resolvePublicUrl(base.selectedVariantImagePath)
        : "";
    const displayImageUrl = selectedVariantImageUrl || imageUrl;
    const displayTitle = shouldShowSelectedStitchedVariant
      ? cleanReadyToWearTitle(title, base.selectedVariantSize || base.sizeLabel)
      : title;

    const totalProductCostPkr = isUnstitched
      ? base.fabricCostPkr
      : base.stitchedTotalPkr || safePositiveNumber(base.priceParam);

    const hasDyeing =
      Boolean(base.dyeingSelected) &&
      (base.dyeingSplits.length > 0 ||
        Boolean(base.dyeHex) ||
        Boolean(base.dyeShadeId) ||
        Boolean(base.dyeLabel));

    const hasTailoring =
      Boolean(base.tailoringSelected) && base.tailoringCostPkr > 0;
    const hasStyleSelected =
      hasTailoring &&
      (Boolean(base.selectedTailoringStyleId) ||
        Boolean(base.selectedTailoringStyleTitle) ||
        Boolean(base.selectedTailoringStyleSnapshot));

    return {
      id,
      code,
      title,
      displayTitle,
      imageUrl: displayImageUrl,
      selectedVariantImageUrl,
      vendorName,
      vendorMobile,
      vendorAddress,
      exportsEnabled,
      exportRegions,
      deliveryPolicy,
      isUnstitched,
      isFabricByMeterPurchase,
      usesFabricWeightShipping,
      isReadyToWearStitched,
      isMadeOrderStitched,
      shouldShowSelectedStitchedVariant,
      totalProductCostPkr,
      hasDyeing,
      hasTailoring,
      hasStyleSelected,
    };
  }, [
    base,
    fetchedProduct,
    params.vendorAddress,
    params.vendorMobile,
    params.vendorName,
    vendor,
  ]);

  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [notes, setNotes] = useState("");
  const [savedAddressLoaded, setSavedAddressLoaded] = useState(false);
  const [hasSavedCheckoutAddress, setHasSavedCheckoutAddress] = useState(false);

  const [destinationType, setDestinationType] = useState<"inland" | "export">(
    "inland",
  );
  const [exportRegion, setExportRegion] = useState("");

  const exportRegionList = useMemo(() => {
    return Array.isArray(resolved.exportRegions)
      ? resolved.exportRegions.map((x) => String(x))
      : [];
  }, [resolved.exportRegions]);

  useEffect(() => {
    let alive = true;

    const loadSavedCheckoutAddress = async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_CHECKOUT_ADDRESS_KEY);
        const saved = normalizeSavedCheckoutAddress(
          raw ? JSON.parse(raw) : null,
        );

        if (!alive || !saved) return;

        setHasSavedCheckoutAddress(true);
        setBuyerName((current) => current || saved.buyerName || "");
        setBuyerMobile((current) => current || saved.buyerMobile || "");
        setDeliveryAddress((current) => current || saved.deliveryAddress || "");
        setCity((current) => current || saved.city || "");
        setPostalCode((current) => current || saved.postalCode || "");
        setCountry((current) => current || saved.country || "Pakistan");
        setDestinationType(saved.destinationType || "inland");
        setExportRegion((current) => current || saved.exportRegion || "");
      } catch {
        // Ignore invalid or unavailable local storage.
      } finally {
        if (alive) setSavedAddressLoaded(true);
      }
    };

    loadSavedCheckoutAddress();

    return () => {
      alive = false;
    };
  }, []);

  const clearSavedCheckoutAddress = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LAST_CHECKOUT_ADDRESS_KEY);
    } finally {
      setHasSavedCheckoutAddress(false);
    }
  }, []);

  useEffect(() => {
    if (destinationType !== "inland") return;
    if (country !== "Pakistan") setCountry("Pakistan");
  }, [destinationType, country]);

  useEffect(() => {
    if (destinationType !== "export") return;

    const autoCountry = countryForExportRegion(exportRegion);
    if (autoCountry) {
      if (country !== autoCountry) setCountry(autoCountry);
      return;
    }

    if (!exportRegion.trim()) {
      if (country === "Pakistan") setCountry("");
      return;
    }

    if (exportRegionNeedsCountry(exportRegion) && isBlankOrAutoCountry(country)) {
      if (country) setCountry("");
    }
  }, [destinationType, exportRegion, country]);

  useEffect(() => {
    if (destinationType !== "inland") return;
    if (city.trim()) return;
    const inferred = inferCityFromAddress(deliveryAddress);
    if (inferred) setCity(inferred);
  }, [deliveryAddress, destinationType, city]);

  const onSelectExportRegion = useCallback((region: string) => {
    setExportRegion(region);

    const autoCountry = countryForExportRegion(region);
    if (autoCountry) {
      setCountry(autoCountry);
      return;
    }

    if (exportRegionNeedsCountry(region)) {
      setCountry((current) => (isBlankOrAutoCountry(current) ? "" : current));
      Alert.alert("Country required", "Please enter country.");
    }
  }, []);

  const fullAddressPreview = useMemo(() => {
    return buildFullAddress({
      address: deliveryAddress,
      city,
      postalCode,
      country: destinationType === "inland" ? "Pakistan" : country,
    });
  }, [deliveryAddress, city, postalCode, country, destinationType]);

  const deliveryQuote = useMemo(() => {
    return computeDeliveryQuoteSafe({
      destinationType,
      city: city.trim(),
      exportRegion: exportRegion.trim(),
      weightKg: base.weightKg,
      weightPerMeterKg: base.weightPerMeterKg,
      fabricLengthM: base.selectedFabricLengthM,
      packageCm: base.packageCm,
      deliveryPolicy: resolved.deliveryPolicy,
      isMeterPurchase: resolved.usesFabricWeightShipping,
    });
  }, [
    base.packageCm,
    base.selectedFabricLengthM,
    base.weightKg,
    base.weightPerMeterKg,
    city,
    destinationType,
    exportRegion,
    resolved.deliveryPolicy,
    resolved.usesFabricWeightShipping,
  ]);
  const deliveryCostPkr = deliveryQuote.amountPkr;

  const subtotalBeforeDeliveryPkr = useMemo(() => {
    return Math.round(
      resolved.totalProductCostPkr +
        (resolved.hasDyeing ? base.dyeingCostPkr : 0) +
        (resolved.hasTailoring ? base.tailoringCostPkr : 0) +
        (base.styleExtraCostPkr > 0 ? base.styleExtraCostPkr : 0),
    );
  }, [
    base.dyeingCostPkr,
    base.tailoringCostPkr,
    base.styleExtraCostPkr,
    resolved.totalProductCostPkr,
    resolved.hasDyeing,
    resolved.hasTailoring,
  ]);

  const grandTotalPkr = useMemo(() => {
    return Math.round(subtotalBeforeDeliveryPkr + deliveryCostPkr);
  }, [subtotalBeforeDeliveryPkr, deliveryCostPkr]);

  const courierSummary = useMemo(() => {
    if (deliveryQuote.source !== "app_calculated") return deliveryQuote.label;
    if (!base.weightKg) return "Weight unavailable.";
    if (destinationType === "export") {
      if (!exportRegion.trim()) return "Select export region.";
      return deliveryCostPkr > 0
        ? `Shipping ${formatMoney(base.currency, deliveryCostPkr)}`
        : `Shipping unavailable for ${exportRegion}.`;
    }
    if (!city.trim()) return "Enter city.";
    return deliveryCostPkr > 0
      ? `Shipping ${formatMoney(base.currency, deliveryCostPkr)}`
      : `Shipping unavailable for ${city}.`;
  }, [
    base.weightKg,
    city,
    deliveryCostPkr,
    deliveryQuote.label,
    deliveryQuote.source,
    destinationType,
    exportRegion,
    base.currency,
  ]);

  const exportRegionMissing =
    destinationType === "export" && !exportRegion.trim();

  const canContinue =
    buyerName.trim().length >= 2 &&
    buyerMobile.trim().replace(/\D/g, "").length >= 10 &&
    deliveryAddress.trim().length >= 10 &&
    city.trim().length >= 2 &&
    (destinationType === "inland"
      ? true
      : country.trim().length >= 2 &&
        resolved.exportsEnabled &&
        exportRegion.trim().length >= 2);

  const missingOrderInstruction = useMemo(() => {
    const missing: string[] = [];

    if (buyerName.trim().length < 2) missing.push("name");
    if (buyerMobile.trim().replace(/\D/g, "").length < 10) {
      missing.push("mobile");
    }
    if (deliveryAddress.trim().length < 10) missing.push("address");
    if (city.trim().length < 2) missing.push("city");

    if (destinationType === "export") {
      if (country.trim().length < 2) missing.push("country");
      if (!resolved.exportsEnabled) missing.push("export");
      if (exportRegion.trim().length < 2) missing.push("region");
    }

    return missing.length ? `Fill ${missing.join(", ")}.` : "";
  }, [
    buyerMobile,
    buyerName,
    city,
    country,
    deliveryAddress,
    destinationType,
    exportRegion,
    resolved.exportsEnabled,
  ]);

  const goToPayment = async () => {
    const checkoutAddressToSave: LastCheckoutAddress = {
      buyerName: buyerName.trim(),
      buyerMobile: buyerMobile.trim(),
      deliveryAddress: deliveryAddress.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: (destinationType === "inland" ? "Pakistan" : country).trim(),
      destinationType,
      exportRegion: destinationType === "export" ? exportRegion.trim() : "",
    };

    try {
      await AsyncStorage.setItem(
        LAST_CHECKOUT_ADDRESS_KEY,
        JSON.stringify(checkoutAddressToSave),
      );
      setHasSavedCheckoutAddress(true);
    } catch {
      // Do not block payment navigation if local address save fails.
    }

    router.push({
      pathname: "/purchase/payment",
      params: {
        productId: resolved.id || base.productId,
        productCode: resolved.code || base.productCode,
        productName: resolved.title,
        product_category: base.productCategory,
        made_on_order: resolved.isMadeOrderStitched ? "1" : "0",
        selected_variant_made_on_order: resolved.isMadeOrderStitched
          ? "1"
          : "0",
        variant_mode: resolved.isMadeOrderStitched
          ? "made_order_variants"
          : base.variantMode || "",
        selected_variant_mode: resolved.isMadeOrderStitched
          ? "made_order_variants"
          : base.variantMode || "",
        selected_variant_label: base.selectedVariantLabel,
        selected_variant_snapshot: base.selectedVariantSnapshot
          ? encodeURIComponent(
              JSON.stringify({
                ...base.selectedVariantSnapshot,
                selection_label: base.selectedVariantLabel,
              }),
            )
          : "",
        selected_stitched_variant_snapshot: base.selectedVariantSnapshot
          ? encodeURIComponent(
              JSON.stringify({
                ...base.selectedVariantSnapshot,
                selection_label: base.selectedVariantLabel,
              }),
            )
          : "",

        currency: base.currency,
        imageUrl: resolved.imageUrl,

        selected_variant_id: base.selectedVariantId
          ? encodeURIComponent(base.selectedVariantId)
          : "",
        selected_variant_title: base.selectedVariantTitle
          ? encodeURIComponent(base.selectedVariantTitle)
          : "",
        selected_variant_size: base.selectedVariantSize
          ? encodeURIComponent(base.selectedVariantSize)
          : "",
        selected_variant_color: base.selectedVariantColor
          ? encodeURIComponent(base.selectedVariantColor)
          : "",
        selected_variant_price_pkr:
          base.selectedVariantPricePkr > 0
            ? encodeURIComponent(String(base.selectedVariantPricePkr))
            : "",
        selected_variant_image_path: base.selectedVariantImagePath
          ? encodeURIComponent(base.selectedVariantImagePath)
          : "",

        price_per_meter_pkr: base.pricePerMeterPkr
          ? String(base.pricePerMeterPkr)
          : "",
        stitched_total_pkr: base.stitchedTotalPkr
          ? String(base.stitchedTotalPkr)
          : "",
        base_product_cost_pkr: String(resolved.totalProductCostPkr || 0),
        fabric_cost_pkr: base.fabricCostPkr ? String(base.fabricCostPkr) : "",
        selected_fabric_length_m: base.selectedFabricLengthM
          ? encodeURIComponent(String(base.selectedFabricLengthM))
          : "",

        subtotal_before_delivery_pkr: String(subtotalBeforeDeliveryPkr || 0),
        delivery_cost_pkr: String(deliveryCostPkr || 0),
        delivery_policy: encodeDeliveryPolicyParam(
          resolved.deliveryPolicy,
          resolved.exportRegions,
        ),
        export_regions: resolved.exportRegions.length
          ? encodeURIComponent(JSON.stringify(resolved.exportRegions))
          : "",
        delivery_pricing_source: deliveryQuote.source,
        delivery_pricing_label: encodeURIComponent(deliveryQuote.label),
        price: String(grandTotalPkr || 0),

        vendorName: resolved.vendorName,
        vendorMobile: resolved.vendorMobile,
        vendorAddress: resolved.vendorAddress,

        mode: base.mode,
        selectedSize: base.selectedSize,
        selected_unstitched_size: base.selectedUnstitchedSize
          ? encodeURIComponent(base.selectedUnstitchedSize)
          : "",
        ...base.measurements,

        custom_label_1: base.customDimensions[0]?.label
          ? encodeURIComponent(base.customDimensions[0].label)
          : "",
        custom_value_1: base.customDimensions[0]?.value
          ? encodeURIComponent(base.customDimensions[0].value)
          : "",
        custom_label_2: base.customDimensions[1]?.label
          ? encodeURIComponent(base.customDimensions[1].label)
          : "",
        custom_value_2: base.customDimensions[1]?.value
          ? encodeURIComponent(base.customDimensions[1].value)
          : "",
        custom_label_3: base.customDimensions[2]?.label
          ? encodeURIComponent(base.customDimensions[2].label)
          : "",
        custom_value_3: base.customDimensions[2]?.value
          ? encodeURIComponent(base.customDimensions[2].value)
          : "",
        custom_label_4: base.customDimensions[3]?.label
          ? encodeURIComponent(base.customDimensions[3].label)
          : "",
        custom_value_4: base.customDimensions[3]?.value
          ? encodeURIComponent(base.customDimensions[3].value)
          : "",

        destination_type: destinationType,
        export_region:
          destinationType === "export" && exportRegion
            ? encodeURIComponent(exportRegion)
            : "",
        postal_code: postalCode ? encodeURIComponent(postalCode.trim()) : "",
        country: encodeURIComponent(
          (destinationType === "inland" ? "Pakistan" : country).trim(),
        ),
        weight_kg: base.weightKg ? String(base.weightKg) : "",
        weight_per_meter_kg: base.weightPerMeterKg
          ? String(base.weightPerMeterKg)
          : "",

        dyeing_selected: resolved.hasDyeing ? "1" : "0",
        dyeing_split_json: base.dyeingSplits.length
          ? encodeURIComponent(JSON.stringify(base.dyeingSplits))
          : "",
        dye_shade_id: base.dyeShadeId
          ? encodeURIComponent(base.dyeShadeId)
          : "",
        dye_hex: base.dyeHex ? encodeURIComponent(base.dyeHex) : "",
        dye_label: base.dyeLabel ? encodeURIComponent(base.dyeLabel) : "",
        dyeing_cost_pkr: resolved.hasDyeing
          ? encodeURIComponent(String(base.dyeingCostPkr))
          : "",

        tailoring_available:
          base.tailoringAvailable === true
            ? "1"
            : base.tailoringAvailable === false
              ? "0"
              : "",
        tailoring_selected: resolved.hasTailoring ? "1" : "0",
        tailoring_cost_pkr: resolved.hasTailoring
          ? encodeURIComponent(String(base.tailoringCostPkr))
          : "",
        tailoring_turnaround_days: base.tailoringTurnaroundDays
          ? encodeURIComponent(String(base.tailoringTurnaroundDays))
          : "",

        selected_tailoring_style_id: base.selectedTailoringStyleId
          ? encodeURIComponent(base.selectedTailoringStyleId)
          : "",
        selected_tailoring_style_title: base.selectedTailoringStyleTitle
          ? encodeURIComponent(base.selectedTailoringStyleTitle)
          : "",
        selected_tailoring_style_image: base.selectedTailoringStyleImage
          ? encodeURIComponent(base.selectedTailoringStyleImage)
          : "",
        tailoring_style_label: base.tailoringStyleLabel,
        selected_tailoring_style_snapshot: base.selectedTailoringStyleSnapshot
          ? encodeURIComponent(
              JSON.stringify({
                ...base.selectedTailoringStyleSnapshot,
                styleLabel: base.tailoringStyleLabel,
              }),
            )
          : "",
        selected_neck_variation: base.selectedNeckVariation
          ? encodeURIComponent(base.selectedNeckVariation)
          : "",
        selected_sleeve_variation: base.selectedSleeveVariation
          ? encodeURIComponent(base.selectedSleeveVariation)
          : "",
        selected_trouser_variation: base.selectedTrouserVariation
          ? encodeURIComponent(base.selectedTrouserVariation)
          : "",
        custom_tailoring_note: base.customTailoringNote
          ? encodeURIComponent(base.customTailoringNote)
          : "",
        tailoring_style_extra_cost_pkr:
          base.styleExtraCostPkr > 0
            ? encodeURIComponent(String(base.styleExtraCostPkr))
            : "",

        buyerName: buyerName.trim(),
        buyerMobile: buyerMobile.trim(),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        notes: notes.trim(),
      },
    });
  };

  const categoryLabel = resolved.isMadeOrderStitched
    ? "Made on order"
    : base.productCategory
      ? prettyCategory(base.productCategory)
      : "—";
  const selectedVariantLabelTitle = selectedLabelTitle(
    base.selectedVariantLabel,
  );
  const selectedVariantFallback = `Selected ${selectionLabelText(
    base.selectedVariantLabel,
  )}`;
  const tailoringStyleLabelTitle = selectionLabelTitle(
    base.tailoringStyleLabel,
  );
  const tailoringStyleLower = selectionLabelText(base.tailoringStyleLabel);
  const exportRegionsText = joinRegions(exportRegionList);
  const exportAutoCountry = countryForExportRegion(exportRegion);
  const countryAutoFilled =
    destinationType === "inland" ||
    (destinationType === "export" && !!exportAutoCountry);
  const countryNeedsManual =
    destinationType === "export" && exportRegionNeedsCountry(exportRegion);
  const countryMissing =
    destinationType === "export" &&
    countryNeedsManual &&
    country.trim().length < 2;
  const displayCountry =
    destinationType === "inland" ? "Pakistan" : exportAutoCountry || country;
  const selectedReadyVariantTitle = resolved.shouldShowSelectedStitchedVariant
    ? designText(
        cleanReadyToWearTitle(
          base.selectedVariantTitle || selectedVariantFallback,
          resolved.isMadeOrderStitched
            ? ""
            : base.selectedVariantSize || base.sizeLabel,
        ),
        selectedVariantFallback,
      )
    : designText(base.selectedVariantTitle);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({ ios: "padding", android: "height" })}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Place Order</Text>
            <Text style={styles.pageSubtitle}>Review and pay.</Text>
          </View>

          {loadingProduct ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.helper}>Loading product…</Text>
            </View>
          ) : null}

          <SectionCard title="Product">
            <View style={styles.productRow}>
              <View style={styles.imageBox}>
                {resolved.imageUrl ? (
                  <Image
                    source={{ uri: resolved.imageUrl }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.productMetaWrap}>
                <Text style={styles.productName} numberOfLines={2}>
                  {resolved.displayTitle}
                </Text>

                <View style={styles.productMetaInfo}>
                  <Text style={styles.productMetaLabel}>Category</Text>
                  <Text style={styles.productMetaValue}>{categoryLabel}</Text>
                </View>

                {!!resolved.code && (
                  <View style={styles.productMetaInfo}>
                    <Text style={styles.productMetaLabel}>Code</Text>
                    <Text style={styles.productMetaValue}>{resolved.code}</Text>
                  </View>
                )}

                {resolved.shouldShowSelectedStitchedVariant ? (
                  <>
                    <View style={styles.productMetaInfo}>
                      <Text style={styles.productMetaLabel}>
                        {selectedVariantLabelTitle}
                      </Text>
                      <Text style={styles.productMetaValue}>
                        {selectedReadyVariantTitle || "Not selected"}
                      </Text>
                    </View>

                    <View style={styles.productMetaInfo}>
                      <Text style={styles.productMetaLabel}>Size</Text>
                      <Text style={styles.productMetaValue}>
                        {base.mode === "exact"
                          ? "Exact measurements"
                          : base.selectedVariantSize ||
                            base.sizeLabel ||
                            "Not selected"}
                      </Text>
                    </View>

                    {resolved.isMadeOrderStitched &&
                    base.mode === "exact" &&
                    measurementRows.length ? (
                      <View style={styles.inlineActionRow}>
                        <Text style={styles.helper}>
                          {measurementRows.length} dimensions
                          {base.customDimensions.length
                            ? ` • ${base.customDimensions.length} custom`
                            : ""}
                        </Text>

                        <Pressable
                          onPress={() => setMeasurementsOpen(true)}
                          style={styles.secondaryInlineBtn}
                        >
                          <Text style={styles.secondaryInlineText}>
                            View measurements
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                ) : null}

                <Text style={styles.heroPrice}>
                  {formatMoney(base.currency, resolved.totalProductCostPkr)}
                </Text>

                <Text style={styles.helper}>Sold by {resolved.vendorName}</Text>
              </View>
            </View>
          </SectionCard>

          {!resolved.shouldShowSelectedStitchedVariant ? (
            <SectionCard title="Customization">
              {!resolved.isUnstitched ? (
                <KVRow
                  label={selectedVariantLabelTitle}
                  value={designText(base.selectedVariantTitle, "Not selected")}
                />
              ) : null}

              {!resolved.isFabricByMeterPurchase ? (
                <KVRow
                  label="Size"
                  value={
                    base.mode === "exact"
                      ? "Exact measurements"
                      : resolved.isUnstitched
                        ? base.selectedUnstitchedSize ||
                          base.sizeLabel ||
                          "Not selected"
                        : base.selectedVariantSize ||
                          base.sizeLabel ||
                          "Not selected"
                  }
                />
              ) : null}

              {base.mode === "exact" && measurementRows.length ? (
                <View style={styles.inlineActionRow}>
                  <Text style={styles.helper}>
                    {measurementRows.length} dimensions
                    {base.customDimensions.length
                      ? ` • ${base.customDimensions.length} custom`
                      : ""}
                  </Text>

                  <Pressable
                    onPress={() => setMeasurementsOpen(true)}
                    style={styles.secondaryInlineBtn}
                  >
                    <Text style={styles.secondaryInlineText}>
                      View measurements
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {resolved.isUnstitched ? (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>Fabric</Text>
                  <KVRow
                    label="Length"
                    value={`${base.selectedFabricLengthM || 0} m`}
                  />
                  <KVRow
                    label="Rate"
                    value={
                      base.pricePerMeterPkr
                        ? `${formatMoney(base.currency, base.pricePerMeterPkr)} / meter`
                        : ""
                    }
                  />
                  <KVRow
                    label="Total fabric cost"
                    value={formatMoney(base.currency, base.fabricCostPkr)}
                  />
                </View>
              ) : null}

              {resolved.hasDyeing ? (
                <View style={styles.customSection}>
                  <View style={styles.customSectionHeader}>
                    <Text style={styles.customSectionTitle}>Dyeing</Text>
                    <DyePaletteReferenceButton
                      dyeSplits={base.dyeingSplits}
                      dyeShadeId={base.dyeShadeId}
                      dyeHex={base.dyeHex}
                      dyeLabel={base.dyeLabel}
                    />
                  </View>

                  <KVRow
                    label="Cost"
                    value={formatMoney(base.currency, base.dyeingCostPkr)}
                  />

                  {base.dyeingSplits.length ? (
                    <View style={styles.dyePortionList}>
                      {base.dyeingSplits.map((row, index) => (
                        <View
                          key={`${row.dye_shade_id}-${index}`}
                          style={styles.dyePortionRow}
                        >
                          {!!row.dye_hex && (
                            <View
                              style={[
                                styles.dyeSwatchSmall,
                                { backgroundColor: row.dye_hex },
                              ]}
                            />
                          )}
                          <Text style={styles.dyePortionText}>
                            {row.length_m} m
                            {row.dye_label || row.dye_shade_id
                              ? ` • Code ${row.dye_label || row.dye_shade_id}`
                              : ""}
                          </Text>
                          <Text style={styles.dyePortionCost}>
                            {formatMoney(base.currency, row.dyeing_cost_pkr)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.dyePortionRow}>
                      {!!base.dyeHex && (
                        <View
                          style={[
                            styles.dyeSwatchSmall,
                            { backgroundColor: base.dyeHex },
                          ]}
                        />
                      )}
                      <Text style={styles.dyePortionText}>
                        {base.dyeLabel || base.dyeShadeId
                          ? `Code ${base.dyeLabel || base.dyeShadeId}`
                          : "Selected color"}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {resolved.hasTailoring ? (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>Tailoring</Text>
                  <KVRow
                    label="Cost"
                    value={`${formatMoney(base.currency, base.tailoringCostPkr)}${
                      base.tailoringTurnaroundDays
                        ? ` • ${base.tailoringTurnaroundDays} days`
                        : ""
                    }`}
                  />

                  {resolved.hasStyleSelected ? (
                    <>
                      {!!base.selectedTailoringStyleImage && (
                        <View style={styles.tailoringImageWrapCompact}>
                          <Image
                            source={{ uri: base.selectedTailoringStyleImage }}
                            style={styles.tailoringImage}
                            resizeMode="cover"
                          />
                        </View>
                      )}

                      <KVRow
                        label={tailoringStyleLabelTitle}
                        value={
                          base.selectedTailoringStyleTitle ||
                          `Selected ${tailoringStyleLower}`
                        }
                      />

                      {base.selectedNeckVariation !==
                      "no change in selected style" ? (
                        <>
                          <KVRow
                            label="Neck"
                            value={
                              base.selectedNeckVariation
                                ? cleanVariationLabel(
                                    base.selectedNeckVariation,
                                    "neck",
                                  )
                                : ""
                            }
                          />
                          <KVRow
                            label="Sleeve"
                            value={
                              base.selectedSleeveVariation
                                ? cleanVariationLabel(
                                    base.selectedSleeveVariation,
                                    "sleeve",
                                  )
                                : ""
                            }
                          />
                          <KVRow
                            label="Trouser"
                            value={base.selectedTrouserVariation}
                          />
                        </>
                      ) : null}

                      {base.styleExtraCostPkr > 0 ? (
                        <KVRow
                          label={`Additional ${tailoringStyleLower} cost`}
                          value={formatMoney(
                            base.currency,
                            base.styleExtraCostPkr,
                          )}
                        />
                      ) : null}

                      {!!base.customTailoringNote && (
                        <View style={styles.noteBox}>
                          <Text style={styles.noteLabel}>Note</Text>
                          <Text style={styles.noteText}>
                            {base.customTailoringNote}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : null}

                  <KVRow
                    label="Total Tailoring Cost"
                    value={formatMoney(
                      base.currency,
                      base.tailoringCostPkr +
                        (base.styleExtraCostPkr > 0
                          ? base.styleExtraCostPkr
                          : 0),
                    )}
                  />
                </View>
              ) : null}
            </SectionCard>
          ) : null}

          <SectionCard title="Delivery">
            {hasSavedCheckoutAddress ? (
              <View style={styles.savedAddressBox}>
                <View style={styles.savedAddressHeader}>
                  <Text style={styles.savedAddressTitle}>
                    Saved address
                  </Text>
                  <Pressable
                    onPress={clearSavedCheckoutAddress}
                    style={({ pressed }) => [
                      styles.clearSavedAddressBtn,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.clearSavedAddressText}>Clear</Text>
                  </Pressable>
                </View>
                <Text style={styles.savedAddressText}>
                  {savedAddressLoaded
                    ? "Saved address filled."
                    : "Checking saved address…"}
                </Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Delivery type</Text>
            <View style={styles.choiceRow}>
              <SelectionChip
                label="Within PAK"
                selected={destinationType === "inland"}
                onPress={() => {
                  setDestinationType("inland");
                  setExportRegion("");
                  setCountry("Pakistan");
                }}
              />
              <SelectionChip
                label="Export"
                selected={destinationType === "export"}
                disabled={!resolved.exportsEnabled}
                onPress={() => {
                  if (!resolved.exportsEnabled) return;
                  setDestinationType("export");
                  if (!exportRegion.trim()) {
                    setCountry((current) =>
                      isBlankOrAutoCountry(current) ? "" : current,
                    );
                    return;
                  }
                  const autoCountry = countryForExportRegion(exportRegion);
                  if (autoCountry) {
                    setCountry(autoCountry);
                  } else if (exportRegionNeedsCountry(exportRegion)) {
                    setCountry((current) =>
                      isBlankOrAutoCountry(current) ? "" : current,
                    );
                  }
                }}
              />
            </View>

            {!resolved.exportsEnabled ? (
              <Text style={styles.helper}>Export not available.</Text>
            ) : null}

            {destinationType === "export" ? (
              <>
                <Text style={styles.fieldLabel}>Region</Text>
                <View style={styles.choiceRow}>
                  {exportRegionList.map((region) => (
                    <SelectionChip
                      key={region}
                      label={region}
                      selected={exportRegion === region}
                      onPress={() => onSelectExportRegion(region)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              value={buyerName}
              onChangeText={setBuyerName}
              placeholder="e.g., Arif Nawaz Khan"
              style={styles.input}
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>Mobile</Text>
            <TextInput
              value={buyerMobile}
              onChangeText={setBuyerMobile}
              placeholder="e.g., 03XXXXXXXXX"
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="House / Street / Area"
              style={[styles.input, styles.multiline]}
              multiline
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder={
                destinationType === "inland"
                  ? "e.g., Islamabad"
                  : "e.g., London"
              }
              style={styles.input}
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>Postal code</Text>
            <TextInput
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder={
                destinationType === "inland" ? "e.g., 44000" : "e.g., SW1A 1AA"
              }
              style={styles.input}
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>Country</Text>
            <TextInput
              value={displayCountry}
              onChangeText={setCountry}
              placeholder={countryNeedsManual ? "e.g., Germany" : "e.g., Pakistan"}
              editable={!countryAutoFilled}
              style={[
                styles.input,
                countryAutoFilled ? styles.disabledInput : null,
                countryMissing ? styles.validationInput : null,
              ]}
              placeholderTextColor={stylesVars.placeholder}
            />

            {!!fullAddressPreview && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Address preview</Text>
                <Text style={styles.previewText}>{fullAddressPreview}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              style={[styles.input, styles.multiline]}
              multiline
              placeholderTextColor={stylesVars.placeholder}
            />

            <View style={styles.shippingBox}>
              <Text style={styles.shippingTitle}>Shipping</Text>
              <Text
                style={[
                  styles.shippingValue,
                  exportRegionMissing ? styles.validationText : null,
                ]}
              >
                {courierSummary}
              </Text>
              {!!base.weightKg && (
                <Text style={styles.shippingMeta}>
                  Weight used: {base.weightKg} kg
                </Text>
              )}
              <Text style={styles.shippingMeta}>
                {deliveryQuote.label}
              </Text>
            </View>
          </SectionCard>

          <SectionCard title="Price Summary">
            <PriceRow
              label="Product"
              value={formatMoney(base.currency, resolved.totalProductCostPkr)}
            />

            {resolved.hasDyeing ? (
              <PriceRow
                label="Dyeing"
                value={formatMoney(base.currency, base.dyeingCostPkr)}
              />
            ) : null}

            {resolved.hasTailoring ? (
              <PriceRow
                label="Tailoring"
                value={formatMoney(base.currency, base.tailoringCostPkr)}
              />
            ) : null}

            {base.styleExtraCostPkr > 0 ? (
              <PriceRow
                label={`Additional ${tailoringStyleLower} cost`}
                value={formatMoney(base.currency, base.styleExtraCostPkr)}
              />
            ) : null}

            <View style={styles.divider} />

            <PriceRow
              label="Subtotal"
              value={formatMoney(base.currency, subtotalBeforeDeliveryPkr)}
            />
            <PriceRow
              label="Shipping"
              value={formatMoney(base.currency, deliveryCostPkr)}
            />
            <View style={styles.divider} />
            <PriceRow
              label="Total"
              value={formatMoney(base.currency, grandTotalPkr)}
              strong
            />
          </SectionCard>

          <SectionCard title="Vendor">
            <KVRow label="Sold by" value={resolved.vendorName} />
            <KVRow
              label="Exports"
              value={resolved.exportsEnabled ? "Available" : "Not available"}
            />
            {resolved.exportsEnabled && exportRegionsText ? (
              <KVRow label="Regions" value={exportRegionsText} muted />
            ) : null}
          </SectionCard>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.footerBar}>
          <View style={styles.footerTotalWrap}>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <Text style={styles.footerTotalValue}>
              {formatMoney(base.currency, grandTotalPkr)}
            </Text>
            {!!missingOrderInstruction ? (
              <Text style={styles.footerInlineHint}>
                {missingOrderInstruction}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => {
              if (!canContinue) return;
              goToPayment();
            }}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.footerCta,
              !canContinue && styles.disabledBtn,
              pressed && canContinue && styles.pressed,
            ]}
          >
            <Text style={styles.footerCtaText}>Continue</Text>
          </Pressable>
        </View>

        <ExactMeasurementsModal
          visible={measurementsOpen}
          onClose={() => setMeasurementsOpen(false)}
          title="Exact Measurements"
          rows={measurementRows}
          inferredSize={base.selectedUnstitchedSize || base.selectedSize}
          unit={params.unit === "in" ? "in" : "cm"}
          fabricLengthM={base.selectedFabricLengthM}
          fabricCostPkr={base.fabricCostPkr}
          showGuideImage
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  mutedText: apColors.muted,
  danger: apColors.danger,
  placeholder: "#94A3B8",
  white: apColors.white,
  greenSoft: apColors.successSoft,
  greenText: apColors.success,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  scroll: {
    flex: 1,
  },

  container: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },

  pageHeader: {
    gap: 4,
  },

  title: {
    fontFamily: apFontFamily,
    fontSize: 24,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  pageSubtitle: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  loadingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    borderRadius: apRadii.card,
    padding: 16,
    gap: 12,
  },

  sectionHeader: {
    gap: 3,
  },

  sectionTitle: {
    fontFamily: apFontFamily,
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  sectionSubtitle: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  productRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },

  imageBox: {
    width: 96,
    height: 96,
    borderRadius: apRadii.control,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  imagePlaceholderText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  productMetaWrap: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },

  productName: {
    fontFamily: apFontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  productMetaInfo: {
    gap: 2,
  },

  productMetaLabel: {
    fontFamily: apFontFamily,
    fontSize: 11,
    color: stylesVars.mutedText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0,
  },

  productMetaValue: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
    flexShrink: 1,
    flexWrap: "wrap",
  },

  heroPrice: {
    fontFamily: apFontFamily,
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  kvLabel: {
    flex: 0.9,
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  kvLabelWithIcon: {
    flex: 0.9,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  kvLabelWithIconText: {
    flex: 1,
  },

  kvValue: {
    flex: 1.1,
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "700",
    textAlign: "right",
    letterSpacing: 0,
  },

  kvMuted: {
    color: stylesVars.mutedText,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  priceLabel: {
    fontFamily: apFontFamily,
    fontSize: 14,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  priceValue: {
    fontFamily: apFontFamily,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  priceLabelStrong: {
    fontSize: 16,
    color: stylesVars.text,
    fontWeight: "800",
  },

  priceValueStrong: {
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 2,
  },

  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },

  customBlock: {
    gap: 10,
    paddingTop: 2,
  },

  customSection: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    gap: 8,
  },

  customSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  customSectionTitle: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.blue,
    fontWeight: "800",
    letterSpacing: 0,
  },

  colorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dyeSwatch: {
    width: 34,
    height: 34,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  dyeSwatchSmall: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  dyeSplitSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dyeSplitSummaryText: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  dyePortionList: {
    gap: 7,
  },

  dyePortionRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dyePortionText: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.text,
    fontWeight: "700",
    letterSpacing: 0,
  },

  dyePortionCost: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  tailoringImageWrapCompact: {
    width: "100%",
    height: 160,
    borderRadius: apRadii.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#F1F5F9",
  },

  tailoringImage: {
    width: "100%",
    height: "100%",
  },

  noteBox: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    backgroundColor: "transparent",
    gap: 6,
  },

  noteLabel: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  noteText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
    letterSpacing: 0,
  },

  fieldLabel: {
    fontFamily: apFontFamily,
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0,
  },

  input: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: apFontFamily,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
    letterSpacing: 0,
  },

  validationInput: {
    borderColor: stylesVars.danger,
  },

  multiline: {
    minHeight: 48,
    textAlignVertical: "top",
  },

  choiceRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  choicePill: {
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: apRadii.pill,
    backgroundColor: stylesVars.blueSoft,
  },

  choicePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  choiceText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.blue,
    fontWeight: "800",
    letterSpacing: 0,
  },

  choiceTextOn: {
    color: stylesVars.white,
  },

  savedAddressBox: {
    backgroundColor: "transparent",
    gap: 6,
  },

  savedAddressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  savedAddressTitle: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  savedAddressText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  clearSavedAddressBtn: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: apRadii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  clearSavedAddressText: {
    fontFamily: apFontFamily,
    color: stylesVars.blue,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
  },

  previewBox: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 10,
    backgroundColor: "transparent",
    gap: 4,
  },

  previewLabel: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  previewText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
    letterSpacing: 0,
  },

  shippingBox: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    backgroundColor: "transparent",
    paddingTop: 10,
    gap: 4,
  },

  shippingTitle: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  shippingValue: {
    fontFamily: apFontFamily,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  validationText: {
    color: stylesVars.danger,
  },

  shippingMeta: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  helper: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  secondaryInlineBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryInlineText: {
    fontFamily: apFontFamily,
    color: stylesVars.blue,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },

  backBtn: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: apRadii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  backText: {
    fontFamily: apFontFamily,
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0,
  },

  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: stylesVars.white,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  footerTotalWrap: {
    flex: 1,
    gap: 2,
  },

  footerTotalLabel: {
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
    letterSpacing: 0,
  },

  footerTotalValue: {
    fontFamily: apFontFamily,
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  footerInlineHint: {
    fontFamily: apFontFamily,
    fontSize: 11,
    lineHeight: 15,
    color: stylesVars.danger,
    fontWeight: "700",
    letterSpacing: 0,
  },

  footerCta: {
    minHeight: 42,
    minWidth: 128,
    paddingHorizontal: 16,
    borderRadius: apRadii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  footerCtaText: {
    fontFamily: apFontFamily,
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0,
  },

  disabledBtn: {
    opacity: 0.5,
  },

  disabledInput: {
    backgroundColor: stylesVars.white,
    color: stylesVars.mutedText,
  },

  bottomSpacer: {
    height: 12,
  },

  pressed: {
    opacity: 0.82,
  },
});
