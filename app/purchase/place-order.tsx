import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { supabase } from "@/utils/supabase/client";
import { getDeliveryCost } from "@/utils/kapray/delivery";
import ExactMeasurementsModal from "../(tabs)/flow/purchase/exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "../(tabs)/flow/purchase/exact-measurements-sheet";

const BUCKET_VENDOR = "vendor_images";

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

  selected_neck_variation?: string;
  selected_sleeve_variation?: string;
  selected_trouser_variation?: string;

  custom_tailoring_note?: string;
  tailoring_style_extra_cost_pkr?: string;

  exports_enabled?: string;
  export_regions?: string;
  weight_kg?: string;
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
  price?: any;
  media?: any;
  vendor_id?: string | number | null;
  vendor?: VendorRow | null;
};

type SelectedTailoringStyleSnapshot = {
  id?: string | null;
  title?: string | null;
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

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
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
  const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(p);
  return data?.publicUrl ?? "";
}

function prettyCategory(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function joinRegions(list?: unknown[] | null) {
  return Array.isArray(list) && list.length ? list.map((x) => String(x)).join(", ") : "";
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

function computeDeliveryCostSafe(args: {
  destinationType: "inland" | "export";
  city: string;
  exportRegion: string;
  weightKg: number;
  packageCm?: Record<string, unknown> | null;
}) {
  const { destinationType, city, exportRegion, weightKg, packageCm } = args;
  if (weightKg <= 0) return 0;

  try {
    const raw = getDeliveryCost({
      weightKg,
      packageCm: packageCm ?? undefined,
      scope: destinationType === "export" ? "international" : "inland",
      regionOrCity: destinationType === "export" ? exportRegion : city,
    } as any);

    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function cleanVariationLabel(value: string, kind: "neck" | "sleeve") {
  if (!value) return "";
  const pattern = kind === "neck" ? /\bneck\b/gi : /\bsleeve\b/gi;
  return value.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
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
      <Text style={[styles.priceLabel, strong && styles.priceLabelStrong]}>{label}</Text>
      <Text style={[styles.priceValue, strong && styles.priceValueStrong]}>{value}</Text>
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
      <Text style={[styles.choiceText, selected ? styles.choiceTextOn : null]}>{label}</Text>
    </Pressable>
  );
}

export default function PlaceOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const vendor = useSelector((s: any) => (s?.vendor ?? null)) as VendorState | null;
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  const base = useMemo(() => {
    const productId = firstNonEmpty(params.productId, params.product_id);
    const productCode = firstNonEmpty(params.productCode, params.product_code);

    const mode = firstNonEmpty(params.mode) || "standard";
    const selectedSize = firstNonEmpty(params.selectedSize);
    const selectedUnstitchedSize = safeDecode(params.selected_unstitched_size);
    const selectedFabricLengthM = safePositiveNumber(safeDecode(params.selected_fabric_length_m));
    const fabricCostPkr = safePositiveNumber(params.fabric_cost_pkr);

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
    ].filter((pair): pair is [string, string] => typeof pair[1] === "string" && pair[1].length > 0);

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

    const sizeLabel =
      mode === "exact"
        ? exactPairs.length
          ? "Exact measurements"
          : "Exact measurements not set"
        : selectedSize
          ? selectedSize
          : selectedUnstitchedSize
            ? selectedUnstitchedSize
            : "Not set";

    const selectedTailoringStyleId = safeDecode(firstNonEmpty(params.selected_tailoring_style_id));
    const selectedTailoringStyleTitle = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_title),
    );
    const selectedTailoringStyleImage = safeDecode(
      firstNonEmpty(params.selected_tailoring_style_image),
    );

    const selectedTailoringStyleSnapshot = safeJsonDecode<SelectedTailoringStyleSnapshot | null>(
      params.selected_tailoring_style_snapshot,
      null,
    );

    const selectedNeckVariation =
      safeDecode(firstNonEmpty(params.selected_neck_variation)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.selected_neck_variation));

    const selectedSleeveVariation =
      safeDecode(firstNonEmpty(params.selected_sleeve_variation)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.selected_sleeve_variation));

    const selectedTrouserVariation =
      safeDecode(firstNonEmpty(params.selected_trouser_variation)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.selected_trouser_variation));

    const customTailoringNote =
      safeDecode(firstNonEmpty(params.custom_tailoring_note)) ||
      safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.custom_note));

    const styleExtraCostPkr = safePositiveNumber(
      safeDecode(firstNonEmpty(params.tailoring_style_extra_cost_pkr)) ||
        (selectedTailoringStyleSnapshot as any)?.extra_cost_pkr,
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
      priceParam: norm(params.price),
      pricePerMeterPkr: safePositiveNumber(params.price_per_meter_pkr),
      stitchedTotalPkr: safePositiveNumber(params.stitched_total_pkr),
      currency: firstNonEmpty(params.currency) || "PKR",
      imageUrl: firstNonEmpty(params.imageUrl, params.image_url),

      dyeShadeId: safeDecode(firstNonEmpty(params.dye_shade_id)),
      dyeHex: safeDecode(firstNonEmpty(params.dye_hex)),
      dyeLabel: safeDecode(firstNonEmpty(params.dye_label)),
      dyeingCostPkr: safePositiveNumber(safeDecode(firstNonEmpty(params.dyeing_cost_pkr))),
      dyeingSelected: parseBoolParam(params.dyeing_selected),
      dyeingAvailable: parseBoolParam(params.dyeing_available),

      tailoringCostPkr: safePositiveNumber(safeDecode(firstNonEmpty(params.tailoring_cost_pkr))),
      tailoringTurnaroundDays: safePositiveNumber(
        safeDecode(firstNonEmpty(params.tailoring_turnaround_days)),
      ),
      tailoringSelected: parseBoolParam(params.tailoring_selected),
      tailoringAvailable: parseBoolParam(params.tailoring_available),

      selectedTailoringStyleId,
      selectedTailoringStyleTitle:
        selectedTailoringStyleTitle ||
        safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.title)),
      selectedTailoringStyleImage:
        selectedTailoringStyleImage ||
        safeDecode(firstNonEmpty((selectedTailoringStyleSnapshot as any)?.image_url)),
      selectedTailoringStyleSnapshot,
      selectedNeckVariation,
      selectedSleeveVariation,
      selectedTrouserVariation,
      customTailoringNote,
      styleExtraCostPkr,

      exportsEnabledParam: parseBoolParam(params.exports_enabled),
      exportRegionsParam: safeJsonDecode<string[]>(params.export_regions, []),
      weightKg: safePositiveNumber(params.weight_kg),
      packageCm: safeJsonDecode<Record<string, unknown> | null>(params.package_cm, null),

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
      { order: 11, label: "11. Shoulder to waist", value: base.measurements.m11 },
      { order: 12, label: "12. Shoulder to floor", value: base.measurements.m12 },
      { order: 13, label: "13. Shoulder to shoulder", value: base.measurements.m13 },
      { order: 14, label: "14. Back neck to waist", value: base.measurements.m14 },
      { order: 15, label: "15. Across back", value: base.measurements.m15 },
      { order: 16, label: "16. Inner arm length", value: base.measurements.m16 },
      { order: 17, label: "17. Ankle", value: base.measurements.m17 },
    ].filter((row) => row.value);

    const customRows: ExactMeasurementSheetRow[] = base.customDimensions.map((row, index) => ({
      order: 100 + index,
      label: row.label,
      value: row.value,
    }));

    return [...standardRows, ...customRows];
  }, [base.customDimensions, base.measurements]);

  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState<ProductRow | null>(null);

  const loadProductIfNeeded = useCallback(async () => {
    const shouldFetch =
      (!!base.productId || !!base.productCode) && (!base.productName || !base.imageUrl);

    if (!shouldFetch) return;

    try {
      setLoadingProduct(true);

      let q = supabase
        .from("products")
        .select(`
          id,
          vendor_id,
          product_code,
          title,
          price,
          media,
          vendor:vendor_id (
            id,
            name,
            shop_name,
            address,
            mobile,
            landline,
            email,
            location,
            location_url,
            profile_image_path,
            banner_path,
            status,
            exports_enabled,
            export_regions
          )
        `);

      const numericProductId = Number(base.productId);

      if (Number.isFinite(numericProductId)) q = q.eq("id", numericProductId);
      else if (base.productCode) q = q.eq("product_code", base.productCode);

      const { data, error } = await q.single();
      if (!error) setFetchedProduct(data as any);
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

    const vendorMobile = firstNonEmpty(params.vendorMobile, vendor?.mobile, vJoin?.mobile);
    const vendorAddress = firstNonEmpty(params.vendorAddress, vendor?.address, vJoin?.address);

    const exportsEnabled = Boolean(
      base.exportsEnabledParam ??
        vendor?.exports_enabled ??
        (vJoin as any)?.exports_enabled ??
        false,
    );

    const exportRegions =
      base.exportRegionsParam?.length
        ? base.exportRegionsParam
        : ((vendor?.export_regions as unknown[] | null | undefined) ??
            ((vJoin as any)?.export_regions ?? []));

    const isUnstitched =
      base.productCategory === "unstitched_plain" ||
      base.productCategory === "unstitched_dyeing" ||
      base.productCategory === "unstitched_dyeing_tailoring";

    const totalProductCostPkr = isUnstitched
      ? base.fabricCostPkr
      : base.stitchedTotalPkr || safePositiveNumber(base.priceParam);

    const hasDyeing =
      Boolean(base.dyeingSelected) &&
      (Boolean(base.dyeHex) || Boolean(base.dyeShadeId) || Boolean(base.dyeLabel));

    const hasTailoring = Boolean(base.tailoringSelected) && base.tailoringCostPkr > 0;
    const hasStyleSelected =
      hasTailoring &&
      (Boolean(base.selectedTailoringStyleId) ||
        Boolean(base.selectedTailoringStyleTitle) ||
        Boolean(base.selectedTailoringStyleSnapshot));

    return {
      id,
      code,
      title,
      imageUrl,
      vendorName,
      vendorMobile,
      vendorAddress,
      exportsEnabled,
      exportRegions,
      isUnstitched,
      totalProductCostPkr,
      hasDyeing,
      hasTailoring,
      hasStyleSelected,
    };
  }, [base, fetchedProduct, params.vendorAddress, params.vendorMobile, params.vendorName, vendor]);

  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [notes, setNotes] = useState("");

  const [destinationType, setDestinationType] = useState<"inland" | "export">("inland");
  const [exportRegion, setExportRegion] = useState("");

  const exportRegionList = useMemo(() => {
    return Array.isArray(resolved.exportRegions)
      ? resolved.exportRegions.map((x) => String(x))
      : [];
  }, [resolved.exportRegions]);

  useEffect(() => {
    if (destinationType !== "inland") return;
    if (country !== "Pakistan") setCountry("Pakistan");
  }, [destinationType, country]);

  useEffect(() => {
    if (destinationType !== "inland") return;
    if (city.trim()) return;
    const inferred = inferCityFromAddress(deliveryAddress);
    if (inferred) setCity(inferred);
  }, [deliveryAddress, destinationType, city]);

  const fullAddressPreview = useMemo(() => {
    return buildFullAddress({
      address: deliveryAddress,
      city,
      postalCode,
      country: destinationType === "inland" ? "Pakistan" : country,
    });
  }, [deliveryAddress, city, postalCode, country, destinationType]);

  const deliveryCostPkr = useMemo(() => {
    return computeDeliveryCostSafe({
      destinationType,
      city: city.trim(),
      exportRegion: exportRegion.trim(),
      weightKg: base.weightKg,
      packageCm: base.packageCm,
    });
  }, [base.packageCm, base.weightKg, city, destinationType, exportRegion]);

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
    if (!base.weightKg) return "Shipping weight is not available yet.";
    if (destinationType === "export") {
      if (!exportRegion.trim()) return "Select export region to calculate shipping.";
      return deliveryCostPkr > 0
        ? `Shipping ${formatMoney(base.currency, deliveryCostPkr)}`
        : `Shipping could not be calculated for ${exportRegion}.`;
    }
    if (!city.trim()) return "Enter city to calculate shipping.";
    return deliveryCostPkr > 0
      ? `Shipping ${formatMoney(base.currency, deliveryCostPkr)}`
      : `Shipping could not be calculated for ${city}.`;
  }, [base.weightKg, city, deliveryCostPkr, destinationType, exportRegion, base.currency]);

  const canContinue =
    buyerName.trim().length >= 2 &&
    buyerMobile.trim().replace(/\D/g, "").length >= 10 &&
    deliveryAddress.trim().length >= 10 &&
    city.trim().length >= 2 &&
    (destinationType === "inland"
      ? true
      : country.trim().length >= 2 && resolved.exportsEnabled && exportRegion.trim().length >= 2);

  const goToPayment = () => {
    router.push({
      pathname: "/purchase/payment",
      params: {
        productId: resolved.id || base.productId,
        productCode: resolved.code || base.productCode,
        productName: resolved.title,
        product_category: base.productCategory,

        currency: base.currency,
        imageUrl: resolved.imageUrl,

        price_per_meter_pkr: base.pricePerMeterPkr ? String(base.pricePerMeterPkr) : "",
        stitched_total_pkr: base.stitchedTotalPkr ? String(base.stitchedTotalPkr) : "",
        base_product_cost_pkr: String(resolved.totalProductCostPkr || 0),
        fabric_cost_pkr: base.fabricCostPkr ? String(base.fabricCostPkr) : "",
        selected_fabric_length_m: base.selectedFabricLengthM
          ? encodeURIComponent(String(base.selectedFabricLengthM))
          : "",

        subtotal_before_delivery_pkr: String(subtotalBeforeDeliveryPkr || 0),
        delivery_cost_pkr: String(deliveryCostPkr || 0),
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
          destinationType === "export" && exportRegion ? encodeURIComponent(exportRegion) : "",
        postal_code: postalCode ? encodeURIComponent(postalCode.trim()) : "",
        country: encodeURIComponent((destinationType === "inland" ? "Pakistan" : country).trim()),
        weight_kg: base.weightKg ? String(base.weightKg) : "",

        dyeing_selected: resolved.hasDyeing ? "1" : "0",
        dye_shade_id: base.dyeShadeId ? encodeURIComponent(base.dyeShadeId) : "",
        dye_hex: base.dyeHex ? encodeURIComponent(base.dyeHex) : "",
        dye_label: base.dyeLabel ? encodeURIComponent(base.dyeLabel) : "",
        dyeing_cost_pkr: resolved.hasDyeing ? encodeURIComponent(String(base.dyeingCostPkr)) : "",

        tailoring_available:
          base.tailoringAvailable === true ? "1" : base.tailoringAvailable === false ? "0" : "",
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
        selected_tailoring_style_snapshot: base.selectedTailoringStyleSnapshot
          ? encodeURIComponent(JSON.stringify(base.selectedTailoringStyleSnapshot))
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
          base.styleExtraCostPkr > 0 ? encodeURIComponent(String(base.styleExtraCostPkr)) : "",

        buyerName: buyerName.trim(),
        buyerMobile: buyerMobile.trim(),
        deliveryAddress: deliveryAddress.trim(),
        city: city.trim(),
        notes: notes.trim(),
      },
    });
  };

  const categoryLabel = base.productCategory ? prettyCategory(base.productCategory) : "—";
  const exportRegionsText = joinRegions(exportRegionList);
  const displayCountry = destinationType === "inland" ? "Pakistan" : country;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.title}>Place Order</Text>
            <Text style={styles.pageSubtitle}>Review selections, add delivery details, then pay.</Text>
          </View>

          {loadingProduct ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.helper}>Loading product details…</Text>
            </View>
          ) : null}

          <SectionCard title="Product">
            <View style={styles.productRow}>
              <View style={styles.imageBox}>
                {resolved.imageUrl ? (
                  <Image source={{ uri: resolved.imageUrl }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.productMetaWrap}>
                <Text style={styles.productName} numberOfLines={2}>
                  {resolved.title}
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

                <Text style={styles.heroPrice}>
                  {formatMoney(base.currency, resolved.totalProductCostPkr)}
                </Text>

                <Text style={styles.helper}>Sold by {resolved.vendorName}</Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Customization">
            <KVRow
              label="Size"
              value={base.mode === "exact" ? "Exact measurements" : base.sizeLabel}
            />

            {base.mode === "exact" && measurementRows.length ? (
              <View style={styles.inlineActionRow}>
                <Text style={styles.helper}>
                  {measurementRows.length} dimensions saved
                  {base.customDimensions.length
                    ? ` • ${base.customDimensions.length} custom`
                    : ""}
                </Text>

                <Pressable
                  onPress={() => setMeasurementsOpen(true)}
                  style={styles.secondaryInlineBtn}
                >
                  <Text style={styles.secondaryInlineText}>View Exact Measurements</Text>
                </Pressable>
              </View>
            ) : null}

            {resolved.isUnstitched ? (
              <>
                <KVRow label="Fabric length" value={`${base.selectedFabricLengthM || 0} m`} />
                <KVRow
                  label="Rate"
                  value={
                    base.pricePerMeterPkr
                      ? `${formatMoney(base.currency, base.pricePerMeterPkr)} / meter`
                      : ""
                  }
                />
              </>
            ) : null}

            {resolved.hasDyeing ? (
              <View style={styles.customBlock}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Dyeing color</Text>
                  <View style={styles.colorPreviewRow}>
                    {!!base.dyeHex && (
                      <View style={[styles.dyeSwatch, { backgroundColor: base.dyeHex }]} />
                    )}
                    <Text style={styles.helper}>{formatMoney(base.currency, base.dyeingCostPkr)}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {resolved.hasTailoring ? (
              <View style={styles.customBlock}>
                <KVRow
                  label="Tailoring"
                  value={`${formatMoney(base.currency, base.tailoringCostPkr)}${
                    base.tailoringTurnaroundDays ? ` • ${base.tailoringTurnaroundDays} days` : ""
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
                      label="Style"
                      value={base.selectedTailoringStyleTitle || "Selected style"}
                    />

                    {base.selectedNeckVariation !== "no change in selected style" ? (
                      <>
                        <KVRow
                          label="Neck"
                          value={
                            base.selectedNeckVariation
                              ? cleanVariationLabel(base.selectedNeckVariation, "neck")
                              : ""
                          }
                        />
                        <KVRow
                          label="Sleeve"
                          value={
                            base.selectedSleeveVariation
                              ? cleanVariationLabel(base.selectedSleeveVariation, "sleeve")
                              : ""
                          }
                        />
                        <KVRow label="Trouser" value={base.selectedTrouserVariation} />
                      </>
                    ) : null}

                    {base.styleExtraCostPkr > 0 ? (
                      <KVRow
                        label="Additional style cost"
                        value={formatMoney(base.currency, base.styleExtraCostPkr)}
                      />
                    ) : null}

                    {!!base.customTailoringNote && (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>Buyer's Note</Text>
                        <Text style={styles.noteText}>{base.customTailoringNote}</Text>
                      </View>
                    )}
                  </>
                ) : null}
              </View>
            ) : null}
          </SectionCard>

          <SectionCard title="Delivery">
            <Text style={styles.fieldLabel}>Delivery Type</Text>
            <View style={styles.choiceRow}>
              <SelectionChip
                label="Inland"
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
                }}
              />
            </View>

            {!resolved.exportsEnabled ? (
              <Text style={styles.helper}>This vendor does not offer export orders.</Text>
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
                      onPress={() => setExportRegion(region)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Full Name</Text>
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
              placeholder={destinationType === "inland" ? "e.g., Islamabad" : "e.g., London"}
              style={styles.input}
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>Postal Code</Text>
            <TextInput
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder={destinationType === "inland" ? "e.g., 44000" : "e.g., SW1A 1AA"}
              style={styles.input}
              placeholderTextColor={stylesVars.placeholder}
            />

            <Text style={styles.fieldLabel}>Country</Text>
            <TextInput
              value={displayCountry}
              onChangeText={setCountry}
              placeholder="e.g., Pakistan"
              editable={destinationType !== "inland"}
              style={[styles.input, destinationType === "inland" ? styles.disabledInput : null]}
              placeholderTextColor={stylesVars.placeholder}
            />

            {!!fullAddressPreview && (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Address Preview</Text>
                <Text style={styles.previewText}>{fullAddressPreview}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions"
              style={[styles.input, styles.multiline]}
              multiline
              placeholderTextColor={stylesVars.placeholder}
            />

            <View style={styles.shippingBox}>
              <Text style={styles.shippingTitle}>Shipping</Text>
              <Text style={styles.shippingValue}>{courierSummary}</Text>
              {!!base.weightKg && (
                <Text style={styles.shippingMeta}>Weight used: {base.weightKg} kg</Text>
              )}
            </View>
          </SectionCard>

          <SectionCard title="Price Summary">
            <PriceRow
              label="Product"
              value={formatMoney(base.currency, resolved.totalProductCostPkr)}
            />

            {resolved.hasDyeing ? (
              <PriceRow label="Dyeing" value={formatMoney(base.currency, base.dyeingCostPkr)} />
            ) : null}

            {resolved.hasTailoring ? (
              <PriceRow
                label="Tailoring"
                value={formatMoney(base.currency, base.tailoringCostPkr)}
              />
            ) : null}

            {base.styleExtraCostPkr > 0 ? (
              <PriceRow
                label="Additional style cost"
                value={formatMoney(base.currency, base.styleExtraCostPkr)}
              />
            ) : null}

            <View style={styles.divider} />

            <PriceRow
              label="Subtotal"
              value={formatMoney(base.currency, subtotalBeforeDeliveryPkr)}
            />
            <PriceRow label="Shipping" value={formatMoney(base.currency, deliveryCostPkr)} />
            <View style={styles.divider} />
            <PriceRow label="Total" value={formatMoney(base.currency, grandTotalPkr)} strong />
          </SectionCard>

          <SectionCard title="Vendor">
            <KVRow label="Sold by" value={resolved.vendorName} />
            <KVRow label="Exports" value={resolved.exportsEnabled ? "Available" : "Not available"} />
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
            <Text style={styles.footerTotalValue}>{formatMoney(base.currency, grandTotalPkr)}</Text>
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

        {!canContinue ? (
          <View style={styles.footerHintWrap}>
            <Text style={styles.footerHint}>
              Enter name, mobile, address, city, and shipping details to continue.
            </Text>
          </View>
        ) : null}

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
      </View>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E2E8F0",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  white: "#FFFFFF",
  greenSoft: "#ECFDF3",
  greenText: "#166534",
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
    fontSize: 24,
    fontWeight: "800",
    color: stylesVars.text,
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
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
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },

  sectionHeader: {
    gap: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  productRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },

  imageBox: {
    width: 96,
    height: 96,
    borderRadius: 16,
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
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  productMetaWrap: {
    flex: 1,
    gap: 8,
  },

  productName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: stylesVars.text,
  },

  productMetaInfo: {
    gap: 2,
  },

  productMetaLabel: {
    fontSize: 11,
    color: stylesVars.mutedText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  productMetaValue: {
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "700",
  },

  heroPrice: {
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  kvLabel: {
    flex: 0.9,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  kvValue: {
    flex: 1.1,
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "700",
    textAlign: "right",
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
    fontSize: 14,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  priceValue: {
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "700",
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

  colorPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dyeSwatch: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  tailoringImageWrapCompact: {
    width: "100%",
    height: 160,
    borderRadius: 14,
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
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 6,
  },

  noteLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  noteText: {
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
  },

  fieldLabel: {
    fontSize: 13,
    color: stylesVars.text,
    fontWeight: "800",
    marginTop: 2,
  },

  input: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
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
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
  },

  choicePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  choiceText: {
    fontSize: 12,
    color: stylesVars.blue,
    fontWeight: "800",
  },

  choiceTextOn: {
    color: stylesVars.white,
  },

  previewBox: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    gap: 4,
  },

  previewLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  previewText: {
    fontSize: 13,
    lineHeight: 19,
    color: stylesVars.text,
    fontWeight: "500",
  },

  shippingBox: {
    borderWidth: 1,
    borderColor: "#DCEAFE",
    backgroundColor: "#F8FBFF",
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },

  shippingTitle: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  shippingValue: {
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "800",
  },

  shippingMeta: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  secondaryInlineBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryInlineText: {
    color: stylesVars.blue,
    fontSize: 12,
    fontWeight: "700",
  },

  backBtn: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  backText: {
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 12,
  },

  footerBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    borderRadius: 18,
    padding: 12,
    backgroundColor: stylesVars.white,
    borderWidth: 1,
    borderColor: stylesVars.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  footerTotalWrap: {
    flex: 1,
    gap: 2,
  },

  footerTotalLabel: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "700",
  },

  footerTotalValue: {
    fontSize: 18,
    color: stylesVars.text,
    fontWeight: "800",
  },

  footerCta: {
    minHeight: 48,
    minWidth: 136,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  footerCtaText: {
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 14,
  },

  footerHintWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 88,
    alignItems: "center",
  },

  footerHint: {
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "500",
    textAlign: "center",
    backgroundColor: "rgba(248,250,252,0.96)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  disabledBtn: {
    opacity: 0.5,
  },

  disabledInput: {
    backgroundColor: "#F8FAFC",
    color: stylesVars.mutedText,
  },

  bottomSpacer: {
    height: 12,
  },

  pressed: {
    opacity: 0.82,
  },
});