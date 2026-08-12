// app/vendor/profile/add-product/review.tsx
import React, { useMemo } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  getMadeOrderVariantFinalPrice,
  getReadyVariantFinalPrice,
  normalizeMadeOrderVariants,
  normalizeSimpleReadyInventory,
  sumSimpleReadyInventory,
  sumReadyVariantQty,
  MadeOrderVariant as SharedMadeOrderVariant,
  ReadyVariant as SharedReadyVariant,
} from "@/utils/kapray/productVariants";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";
import { EXPORT_REGIONS } from "@/data/kapray/exportRegions";
import type { ExportRegion } from "@/data/kapray/productTypes";
import {
  getDeliveryPolicySummary,
  isUnstitchedDeliveryCategory,
  normalizeDeliveryPolicy,
  normalizeExportRegionList,
} from "@/utils/kapray/deliveryPolicy";
import { formatFabricWidthFromSpec } from "@/utils/kapray/fabricWidth";
import {
  apColors,
  apFontFamily,
  apRadii,
  apSpacing,
} from "@/components/product/addProductStyles";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type ReadyVariantSize = {
  size: string;
  qty: number;
};

type ReadyVariant = SharedReadyVariant & {
  title?: string;
  color?: string;
  size?: string;
  price_pkr?: number;
  stock_qty?: number;
  sku?: string;
  note?: string;
  image_paths?: any;
  variant_image_paths?: any;
  variant_images?: any;
  image_path?: any;
  image?: any;
};

type MadeOrderVariant = SharedMadeOrderVariant & {
  title?: string;
  color?: string;
  note?: string;
  image_paths?: any;
  variant_image_paths?: any;
  variant_images?: any;
  image_path?: any;
  image?: any;
};

type SizeLengthMap = Partial<
  Record<"XS" | "S" | "M" | "L" | "XL" | "XXL", number>
>;

const STANDARD_SIZE_LABELS = ["XS", "S", "M", "L", "XL", "XXL", "All"];
const DEFAULT_MADE_ORDER_SIZES = ["All"];

type TailoringStylePresetImage = {
  uri?: string | null;
  url?: string | null;
  path?: string | null;
};

type TailoringStylePreset = {
  id?: string;
  title?: string;
  note?: string;
  extra_cost_pkr?: number;
  images?: TailoringStylePresetImage[];
  default_neck?: string;
  default_sleeve?: string;
  default_trouser?: string;
  allowed_neck_variations?: string[];
  allowed_sleeve_variations?: string[];
  allowed_trouser_variations?: string[];
  allow_custom_note?: boolean;
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function designText(value: any, fallback = "Design") {
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

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStringArray(v: any): string[] {
  const arr = Array.isArray(v) ? v : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of arr) {
    const s = safeStr(item);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function normalizeAvailableSizes(v: any, fallback: string[] = []) {
  const arr = Array.isArray(v) ? v : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of arr) {
    const raw = safeStr(item);
    if (!raw) continue;

    const size =
      STANDARD_SIZE_LABELS.find(
        (label) => label.toLowerCase() === raw.toLowerCase(),
      ) ?? raw;
    const key = size.toLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(size);
  }

  if (out.some((size) => size.toLowerCase() === "all")) return ["All"];
  return out.length ? out : fallback;
}

function formatPicked(list: any, emptyLabel: string) {
  const cleaned = normalizeStringArray(list);
  if (!cleaned.length) return emptyLabel;
  return cleaned.join(", ");
}

function inferCategoryFromDraft(draft: any): ProductCategory {
  const spec = draft?.spec ?? {};
  const price = draft?.price ?? {};
  const fromSpec = safeStr((spec as any)?.product_category ?? "");
  if (
    fromSpec === "unstitched_plain" ||
    fromSpec === "unstitched_dyeing" ||
    fromSpec === "unstitched_dyeing_tailoring" ||
    fromSpec === "stitched_ready"
  ) {
    return fromSpec as ProductCategory;
  }

  const mode = safeStr(price?.mode ?? "");
  if (mode === "stitched_total") return "stitched_ready";

  const dye = Boolean(spec?.dyeing_enabled);
  const tail = Boolean(spec?.tailoring_enabled);

  if (tail) return "unstitched_dyeing_tailoring";
  if (dye) return "unstitched_dyeing";
  return "unstitched_plain";
}

function categoryLabel(cat: ProductCategory, madeOnOrder = false) {
  switch (cat) {
    case "unstitched_plain":
      return "Unstitched (Plain)";
    case "unstitched_dyeing":
      return "Unstitched + Dyeing";
    case "unstitched_dyeing_tailoring":
      return "Unstitched + Dyeing + Tailoring";
    case "stitched_ready":
      return madeOnOrder ? "Stitched / Made on order" : "Stitched / Ready to wear";
    default:
      return String(cat);
  }
}

function formatSizeLengthMap(sizeLengthMap: SizeLengthMap | undefined | null) {
  if (!sizeLengthMap || typeof sizeLengthMap !== "object") return "Not set";

  const orderedKeys: (keyof SizeLengthMap)[] = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ];
  const parts = orderedKeys
    .map((key) => {
      const val = sizeLengthMap[key];
      const n = Number(val);
      if (!Number.isFinite(n) || n <= 0) return null;
      return `${key}: ${n} m`;
    })
    .filter(Boolean);

  return parts.length ? parts.join(" / ") : "Not set";
}

function formatDimension(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function formatPackageCm(pkg: any, spec?: any) {
  const length = safeNum(pkg?.length);
  const width = safeNum(pkg?.width);
  const height = safeNum(pkg?.height);

  if (length <= 0 || width <= 0 || height <= 0) return "Not set";

  const cmText = `${formatDimension(length)} x ${formatDimension(width)} x ${formatDimension(height)} cm`;
  const packageIn = spec?.package_in ?? {};
  const inLength = safeNum(packageIn?.length);
  const inWidth = safeNum(packageIn?.width);
  const inHeight = safeNum(packageIn?.height);

  if (
    spec?.package_dimension_unit === "in" &&
    inLength > 0 &&
    inWidth > 0 &&
    inHeight > 0
  ) {
    return `${formatDimension(inLength)} x ${formatDimension(inWidth)} x ${formatDimension(inHeight)} in (${cmText})`;
  }

  return cmText;
}

function normalizePresetArray(v: unknown): TailoringStylePreset[] {
  return Array.isArray(v) ? (v as TailoringStylePreset[]) : [];
}

function countPresetImages(preset: TailoringStylePreset) {
  return Array.isArray(preset?.images) ? preset.images.length : 0;
}

function summarizePreset(
  preset: TailoringStylePreset,
  includesTrouser: boolean,
) {
  const title = safeStr(preset?.title) || "Untitled style";
  const imgCount = countPresetImages(preset);
  const extra = safeNum(preset?.extra_cost_pkr);

  const neckCount = normalizeStringArray(
    preset?.allowed_neck_variations,
  ).length;
  const sleeveCount = normalizeStringArray(
    preset?.allowed_sleeve_variations,
  ).length;
  const trouserCount = includesTrouser
    ? normalizeStringArray(preset?.allowed_trouser_variations).length
    : 0;

  const parts = [
    title,
    `${imgCount} image${imgCount === 1 ? "" : "s"}`,
    neckCount
      ? `${neckCount} neck variation${neckCount === 1 ? "" : "s"}`
      : "No neck variations offered",
    sleeveCount
      ? `${sleeveCount} sleeve variation${sleeveCount === 1 ? "" : "s"}`
      : "No sleeve variations offered",
  ];

  if (includesTrouser) {
    parts.push(
      trouserCount
        ? `${trouserCount} trouser variation${trouserCount === 1 ? "" : "s"}`
        : "No trouser variations offered",
    );
  }

  if (extra > 0) {
    parts.push(`+PKR ${extra}`);
  }

  parts.push(`Custom note: ${preset?.allow_custom_note ? "Yes" : "No"}`);

  return parts.join(" / ");
}

function normalizeReadyVariants(v: any): ReadyVariant[] {
  const arr = Array.isArray(v) ? v : [];

  return arr.map((item: any, index: number) => {
    const variantNo = safeInt(item?.variant_no) ?? index + 1;
    const id = safeStr(item?.id) || `variant-${variantNo}`;
    const name = safeStr(item?.name ?? item?.color ?? item?.title ?? "");
    const label =
      safeStr(item?.label).replace(/^Variant\b/i, "Style") ||
      `Style ${variantNo}`;
    const displayName =
      safeStr(item?.display_name) ||
      safeStr(item?.title) ||
      (name ? `Style ${variantNo}: ${name}` : label);

    return {
      ...item,
      id,
      variant_no: variantNo,
      label,
      name,
      display_name: displayName,
      additional_price_pkr: safeNum(item?.additional_price_pkr),
      images: Array.isArray(item?.images) ? item.images : [],
      sizes: Array.isArray(item?.sizes) ? item.sizes : [],
    } as ReadyVariant;
  });
}

function normalizeReadyVariantImagePaths(variant: ReadyVariant): string[] {
  const raw =
    variant?.image_paths ??
    variant?.variant_image_paths ??
    variant?.images ??
    variant?.variant_images ??
    variant?.image_path ??
    variant?.image ??
    [];

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of arr) {
    const s =
      typeof item === "string"
        ? safeStr(item)
        : safeStr(item?.path ?? item?.uri ?? item?.url ?? "");

    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out;
}

function countReadyVariantImages(variant: ReadyVariant) {
  return normalizeReadyVariantImagePaths(variant).length;
}

function firstReadyVariantImageUri(variant: ReadyVariant) {
  return normalizeReadyVariantImagePaths(variant)[0] || "";
}

function getReadyVariantTitle(variant: ReadyVariant, useDesign = false) {
  const raw =
    safeStr(variant?.display_name) ||
    safeStr(variant?.title) ||
    safeStr(variant?.label) ||
    safeStr(variant?.name) ||
    "Style";

  return useDesign ? designText(raw) : raw;
}

function summarizeReadyVariant(
  variant: ReadyVariant,
  basePrice: number,
  useDesign = false,
) {
  const title = getReadyVariantTitle(variant, useDesign);
  const imgCount = countReadyVariantImages(variant);
  const finalPrice = getReadyVariantFinalPrice(basePrice, variant as any);
  const sizes = Array.isArray(variant?.sizes) ? variant.sizes : [];
  const sizeText = sizes.length
    ? sizes
        .map((s: any) => `${safeStr(s?.size)} (${safeNum(s?.qty)})`)
        .join(", ")
    : "No sizes";
  const sku = safeStr(variant?.sku);
  const note = safeStr(variant?.note);

  return [
    title,
    `Rs ${finalPrice.toLocaleString()}`,
    `${imgCount} image${imgCount === 1 ? "" : "s"}`,
    sizeText,
    sku ? `SKU: ${sku}` : "",
    note,
  ]
    .filter(Boolean)
    .join(" / ");
}

function normalizeMadeOrderVariantImagePaths(
  variant: MadeOrderVariant,
): string[] {
  const rawSources = [
    variant?.image_paths,
    variant?.variant_image_paths,
    variant?.images,
    variant?.variant_images,
    variant?.image_path,
    variant?.image,
  ];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of rawSources) {
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];

    for (const item of arr) {
      const s =
        typeof item === "string"
          ? safeStr(item)
          : safeStr(item?.uri ?? item?.url ?? item?.path ?? "");

      if (!s) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }

  return out;
}

function countMadeOrderVariantImages(variant: MadeOrderVariant) {
  return normalizeMadeOrderVariantImagePaths(variant).length;
}

function firstMadeOrderVariantImageUri(variant: MadeOrderVariant) {
  return normalizeMadeOrderVariantImagePaths(variant)[0] || "";
}

function getMadeOrderVariantTitle(
  variant: MadeOrderVariant,
  useDesign = false,
) {
  const raw =
    safeStr(variant?.display_name) ||
    safeStr(variant?.title) ||
    safeStr(variant?.label) ||
    safeStr(variant?.name) ||
    "Style";

  return useDesign ? designText(raw) : raw;
}

function summarizeMadeOrderVariant(
  variant: MadeOrderVariant,
  basePrice: number,
) {
  const imgCount = countMadeOrderVariantImages(variant);
  const finalPrice = getMadeOrderVariantFinalPrice(basePrice, variant as any);
  const days = Math.max(0, Math.trunc(safeNum(variant?.estimated_days)));
  const note = safeStr((variant as any)?.note);

  return [
    `Rs ${finalPrice.toLocaleString()}`,
    `${days} day${days === 1 ? "" : "s"}`,
    `${imgCount} image${imgCount === 1 ? "" : "s"}`,
    note,
  ]
    .filter(Boolean)
    .join(" / ");
}

const COST_TEXT_PATTERN = /(Rs\s[\d,]+|\+?PKR\s[\d,]+|\d+(?:\.\d+)?\sPKR)/g;

function renderCostSegments(text: string) {
  const clean = safeStr(text);
  if (!clean) return "";

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of clean.matchAll(COST_TEXT_PATTERN)) {
    const index = match.index ?? 0;
    const costText = match[0];

    if (index > lastIndex) {
      parts.push(clean.slice(lastIndex, index));
    }

    parts.push(
      <Text key={`cost-${index}`} style={styles.costValue}>
        {costText}
      </Text>,
    );
    lastIndex = index + costText.length;
  }

  if (lastIndex < clean.length) {
    parts.push(clean.slice(lastIndex));
  }

  return parts.length ? parts : clean;
}

export default function AddProductReviewScreen() {
  const router = useRouter();

  const vendorState = useAppSelector((s: any) => {
    const sliceVendor = s?.vendorSlice?.vendor ?? {};
    const vendor = s?.vendor ?? {};
    return {
      id: sliceVendor?.id ?? s?.vendorSlice?.id ?? vendor?.id ?? null,
      exports_enabled:
        sliceVendor?.exports_enabled ??
        s?.vendorSlice?.exports_enabled ??
        vendor?.exports_enabled ??
        false,
      export_regions:
        sliceVendor?.export_regions ??
        s?.vendorSlice?.export_regions ??
        vendor?.export_regions ??
        [],
    };
  });

  const vendorId = safeInt(vendorState.id);
  const vendorExportRegions = useMemo<ExportRegion[]>(() => {
    if (!vendorState.exports_enabled) return [];
    const selected = normalizeExportRegionList(vendorState.export_regions);
    return EXPORT_REGIONS.filter((region) => selected.includes(region));
  }, [vendorState.export_regions, vendorState.exports_enabled]);

  const { draft } = useProductDraft();

  const cat = useMemo<ProductCategory>(
    () => inferCategoryFromDraft(draft),
    [draft],
  );

  const madeOnOrder = Boolean((draft.spec as any)?.made_on_order ?? false);

  const isStitched = cat === "stitched_ready";
  const isUnstitched = !isStitched;
  const needsDyeing =
    cat === "unstitched_dyeing" || cat === "unstitched_dyeing_tailoring";
  const needsTailoring = cat === "unstitched_dyeing_tailoring";
  const isFabricByMeter = isUnstitchedDeliveryCategory(cat);

  const hasReadyVariants =
    isStitched &&
    !madeOnOrder &&
    safeStr((draft.spec as any)?.variant_mode) === "ready_variants";

  const hasMadeOrderVariants =
    isStitched &&
    madeOnOrder &&
    safeStr((draft.spec as any)?.variant_mode) === "made_order_variants";

  const usesBaseCostWithStyleAdds = hasReadyVariants || hasMadeOrderVariants;

  const isSimpleReady = isStitched && !madeOnOrder && !hasReadyVariants;

  const readyVariants = useMemo(
    () => normalizeReadyVariants((draft.price as any)?.variants),
    [draft.price],
  );

  const madeOrderVariants = useMemo(
    () =>
      normalizeMadeOrderVariants(
        (draft.price as any)?.made_order_variants,
      ) as MadeOrderVariant[],
    [draft.price],
  );
  const hasSingleReadyVariant = readyVariants.length === 1;
  const hasSingleMadeOrderVariant = madeOrderVariants.length === 1;

  const readyVariantQty = useMemo(
    () => sumReadyVariantQty(readyVariants),
    [readyVariants],
  );

  const simpleReadyInventory = useMemo(
    () =>
      normalizeSimpleReadyInventory(
        (draft.price as any)?.simple_ready_inventory,
      ),
    [draft.price],
  );

  const simpleReadyQty = useMemo(
    () => sumSimpleReadyInventory(simpleReadyInventory),
    [simpleReadyInventory],
  );

  const inventoryQty = madeOnOrder
    ? 0
    : hasReadyVariants
      ? readyVariantQty
      : isSimpleReady
        ? simpleReadyQty
        : Number(draft.inventory_qty ?? 0);

  const costPerMeter = Number((draft.price as any)?.cost_pkr_per_meter ?? 0);
  const costTotal = Number((draft.price as any)?.cost_pkr_total ?? 0);

  const dyeingCost =
    Number((draft.price as any)?.dyeing_cost_pkr ?? 0) ||
    Number((draft.spec as any)?.dyeing_cost_pkr ?? 0);

  const tailoringCost = Number((draft.price as any)?.tailoring_cost_pkr ?? 0);
  const tailoringDays = Number(
    (draft.spec as any)?.tailoring_turnaround_days ?? 0,
  );

  const sizes = normalizeAvailableSizes(
    (draft.price as any)?.available_sizes,
    madeOnOrder ? DEFAULT_MADE_ORDER_SIZES : [],
  );
  const sizesSummary = sizes.length ? sizes.join(", ") : "Not set";
  const sizeLengthMap = (draft.spec as any)?.size_length_m as
    | SizeLengthMap
    | undefined;
  const fabricWidthLabel = useMemo(
    () => formatFabricWidthFromSpec(draft.spec),
    [draft.spec],
  );

  const weightKg = safeNum(
    isFabricByMeter
      ? (draft.spec as any)?.weight_per_meter_kg ??
          (draft.spec as any)?.weight_kg
      : (draft.spec as any)?.weight_kg,
  );
  const packageCm = (draft.spec as any)?.package_cm ?? {};
  const packageDimensions = formatPackageCm(packageCm, draft.spec);
  const deliveryPolicy = useMemo(
    () => normalizeDeliveryPolicy((draft.spec as any)?.delivery_policy, vendorExportRegions),
    [draft.spec, vendorExportRegions],
  );
  const deliveryPolicyRows = useMemo(
    () =>
      getDeliveryPolicySummary(deliveryPolicy, vendorExportRegions, {
        perMeter: isFabricByMeter,
      }),
    [deliveryPolicy, isFabricByMeter, vendorExportRegions],
  );

  const moreDescription = safeStr((draft.spec as any)?.more_description ?? "");

  const imageCount = (draft.media.images ?? []).length;
  const videoCount = (draft.media.videos ?? []).length;

  const pieceCount = safeNum((draft.spec as any)?.piece_count);

  const includesTrouser = Boolean(
    (draft.spec as any)?.includes_trouser ??
    (draft.spec as any)?.has_trouser ??
    (draft.spec as any)?.product_has_trouser ??
    false,
  );

  const tailoringStylePresets = useMemo(
    () => normalizePresetArray((draft.spec as any)?.tailoring_style_presets),
    [draft.spec],
  );

  function dressTypeSummary() {
    const names = (draft.spec as any)?.dressTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length)
      return formatPicked(names, "Not set");

    const ids = (draft.spec.dressTypeIds ?? []).map((x: any) => String(x));
    if (!ids.length) return "Not set";
    return `${ids.length} selected`;
  }

  function fabricSummary() {
    const names = (draft.spec as any)?.fabricTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft.spec.fabricTypeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function workSummary() {
    const subNames = (draft.spec as any)?.workSubTypeNames as any[] | undefined;
    if (Array.isArray(subNames) && subNames.length)
      return formatPicked(subNames, "Any");

    const names = (draft.spec as any)?.workTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");

    const list = (draft.spec.workTypeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function densitySummary() {
    const names = (draft.spec as any)?.workDensityNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft.spec.workDensityIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function originSummary() {
    const names = (draft.spec as any)?.originCityNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft.spec.originCityIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function wearStateSummary() {
    const names = (draft.spec as any)?.wearStateNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "None");
    const list = (draft.spec.wearStateIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "None";
  }

  function serviceSummary() {
    if (isStitched) return "No dyeing / tailoring";

    const parts: string[] = [];

    if (needsDyeing) {
      parts.push(
        `Dyeing: ${
          dyeingCost > 0
            ? `${dyeingCost} PKR${cat === "unstitched_dyeing" ? " / meter" : ""}`
            : "Not set"
        }`,
      );
    } else {
      parts.push("No dyeing");
    }
    if (needsTailoring) {
      parts.push(
        `Tailoring: ${tailoringCost > 0 ? `${tailoringCost} PKR` : "Not set"}`,
      );
      parts.push(`${Number.isFinite(tailoringDays) ? tailoringDays : 0} days`);
    } else {
      parts.push("No tailoring");
    }

    return parts.join(" / ");
  }

  function goEdit(path: string) {
    router.push({
      pathname: path as any,
      params: { returnTo: "/vendor/profile/add-product/review" },
    } as any);
  }

  function close() {
    router.back();
  }

  function goSubmit() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }
    router.push("/vendor/profile/add-product/submit" as any);
  }

  const dressTypeValue = dressTypeSummary();
  const fabricValue = fabricSummary();
  const workValue = workSummary();
  const densityValue = densitySummary();
  const originValue = originSummary();
  const wearValue = wearStateSummary();
  const canContinue = Boolean(vendorId);
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

  return (
    <AddProductScreen
      title="Review Product"
      onBack={close}
      footer={
        <AddProductFooter
          primaryLabel="Continue to Save"
          primaryIcon="check"
          onPrimaryPress={goSubmit}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >

      {!vendorId ? (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={[styles.sectionTitle, styles.errorTitle]}>
            Vendor not loaded
          </Text>
          <Text style={[styles.meta, styles.errorMeta]}>
            Please ensure vendorSlice has vendor.id (bigint).
          </Text>
        </View>
      ) : null}

      <Text style={styles.reviewHint}>Tap any item to update before save.</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basics</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q01-title")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Title *</Text>
          <Text style={styles.rowValue}>
            {safeStr(draft.title) || "Not set"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q02-category")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Category *</Text>
          <Text style={styles.rowValue}>{categoryLabel(cat, madeOnOrder)}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Dress type *</Text>
          <Text style={styles.rowValue}>{dressTypeValue}</Text>
        </Pressable>

        {!isStitched ||
        hasReadyVariants ||
        hasMadeOrderVariants ||
        isSimpleReady ? (
          <Pressable
            onPress={() =>
              goEdit(
                hasReadyVariants
                  ? "/vendor/profile/add-product/q06b3-ready-variants"
                  : hasMadeOrderVariants
                    ? "/vendor/profile/add-product/q06b4-made-order-variants"
                    : isSimpleReady
                      ? "/vendor/profile/add-product/q06b1-simple-ready-inventory"
                      : "/vendor/profile/add-product/q04-inventory",
              )
            }
            style={({ pressed }) => [
              styles.rowBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.rowTitle}>
              {isUnstitched
                ? "Available fabric length (meters) *"
                : "Inventory Quantity *"}
              {hasReadyVariants
                ? " (from styles)"
                : isSimpleReady
                  ? " (from sizes)"
                  : madeOnOrder
                    ? " (made on order)"
                    : ""}
            </Text>
            <Text style={styles.rowValue}>
              {Number.isFinite(inventoryQty)
                ? isUnstitched
                  ? `${inventoryQty} m`
                  : String(inventoryQty)
                : "0"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pricing</Text>

        {isStitched ? (
          <>
            <Pressable
              onPress={() =>
                goEdit("/vendor/profile/add-product/q05a-stitched-total-cost")
              }
              style={({ pressed }) => [
                styles.rowBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.rowTitle}>
                {usesBaseCostWithStyleAdds
                  ? "Base cost (PKR) *"
                  : "Total cost (PKR) *"}
              </Text>
              <Text style={styles.rowValue}>
                {costTotal > 0
                  ? renderCostSegments(
                      `${usesBaseCostWithStyleAdds ? "From " : ""}Rs ${costTotal.toLocaleString()}`,
                    )
                  : "Not set"}
              </Text>
            </Pressable>

            {madeOnOrder ? (
              <>
                <Pressable
                  onPress={() =>
                    goEdit("/vendor/profile/add-product/q06a-sizes")
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>Sizes offered</Text>
                  <Text style={styles.rowValue}>{sizesSummary}</Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    goEdit(
                      hasMadeOrderVariants
                        ? "/vendor/profile/add-product/q06b4-made-order-variants"
                        : "/vendor/profile/add-product/q06b4-made-order-variant-choice",
                    )
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>
                    {hasSingleMadeOrderVariant
                      ? "Made-on-order design"
                      : "Made-on-order styles"}
                  </Text>
                  <Text style={styles.rowValue}>
                    {madeOrderVariants.length
                      ? hasSingleMadeOrderVariant
                        ? "1 design / Inventory 0"
                        : `${madeOrderVariants.length} style(s) / Inventory 0`
                      : "One design / Inventory 0"}
                  </Text>
                </Pressable>

                {madeOrderVariants.map((variant, index) => {
                  const imageUri = firstMadeOrderVariantImageUri(variant);
                  const title = getMadeOrderVariantTitle(
                    variant,
                    hasSingleMadeOrderVariant,
                  );
                  const summary = summarizeMadeOrderVariant(variant, costTotal);

                  return (
                    <Pressable
                      key={`${safeStr((variant as any).id) || "made-order-variant"}-${index}`}
                      onPress={() =>
                        goEdit(
                          "/vendor/profile/add-product/q06b4-made-order-variants",
                        )
                      }
                      style={({ pressed }) => [
                        styles.variantCard,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.variantImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.variantImagePlaceholder}>
                          <Text style={styles.variantImagePlaceholderText}>
                            No image
                          </Text>
                        </View>
                      )}

                      <View style={styles.variantBody}>
                        <Text style={styles.rowTitle}>{title}</Text>
                        <Text style={styles.rowValue}>
                          {renderCostSegments(summary)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : hasReadyVariants ? (
              <>
                <Pressable
                  onPress={() =>
                    goEdit(
                      "/vendor/profile/add-product/q06b1-ready-variant-choice",
                    )
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>
                    {hasSingleReadyVariant
                      ? "Ready-to-wear design"
                      : "Ready-to-wear styles"}
                  </Text>
                  <Text style={styles.rowValue}>
                    {readyVariants.length
                      ? hasSingleReadyVariant
                        ? `1 design / Total stock ${readyVariantQty}`
                        : `${readyVariants.length} style(s) / Total stock ${readyVariantQty}`
                      : "Not set"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    goEdit("/vendor/profile/add-product/q06b2-piece-count")
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>Number of pieces</Text>
                  <Text style={styles.rowValue}>
                    {pieceCount > 0
                      ? `${pieceCount} piece${pieceCount > 1 ? "s" : ""}`
                      : "Not set"}
                  </Text>
                </Pressable>

                {readyVariants.map((variant, index) => {
                  const imageUri = firstReadyVariantImageUri(variant);
                  const title = getReadyVariantTitle(
                    variant,
                    hasSingleReadyVariant,
                  );
                  const summary = summarizeReadyVariant(
                    variant,
                    costTotal,
                    hasSingleReadyVariant,
                  );

                  return (
                    <Pressable
                      key={`${safeStr((variant as any).id) || "variant"}-${index}`}
                      onPress={() =>
                        goEdit(
                          "/vendor/profile/add-product/q06b3-ready-variants",
                        )
                      }
                      style={({ pressed }) => [
                        styles.variantCard,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.variantImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.variantImagePlaceholder}>
                          <Text style={styles.variantImagePlaceholderText}>
                            No image
                          </Text>
                        </View>
                      )}

                      <View style={styles.variantBody}>
                        <Text style={styles.rowTitle}>{title}</Text>
                        <Text style={styles.rowValue}>
                          {renderCostSegments(summary)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : (
              <Pressable
                onPress={() =>
                  goEdit(
                    "/vendor/profile/add-product/q06b1-simple-ready-inventory",
                  )
                }
                style={({ pressed }) => [
                  styles.rowBtn,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.rowTitle}>Available Sizes</Text>
                <Text style={styles.rowValue}>
                  {simpleReadyInventory.length
                    ? simpleReadyInventory
                        .map((row) => `${row.size}: ${row.qty}`)
                        .join(" / ")
                    : Array.isArray(sizes) && sizes.length
                      ? sizes.join(", ")
                    : "Not set"}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Pressable
              onPress={() =>
                goEdit(
                  "/vendor/profile/add-product/q05b-unstitched-cost-per-meter",
                )
              }
              style={({ pressed }) => [
                styles.rowBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.rowTitle}>Cost per Meter (PKR) *</Text>
              <Text style={styles.rowValue}>
                {costPerMeter > 0
                  ? renderCostSegments(`Rs ${costPerMeter.toLocaleString()}`)
                  : "Not set"}
              </Text>
            </Pressable>

            {isUnstitched ? (
              <>
                <Pressable
                  onPress={() =>
                    goEdit(
                      "/vendor/profile/add-product/q05c-unstitched-fabric-length",
                    )
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>
                    Fabric width (Panna / عرض) *
                  </Text>
                  <Text style={styles.rowValue}>
                    {fabricWidthLabel || "Not set"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    goEdit(
                      "/vendor/profile/add-product/q05c-unstitched-fabric-length",
                    )
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>Fabric length by size</Text>
                  <Text style={styles.rowValue}>
                    {formatSizeLengthMap(sizeLengthMap)}
                  </Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              onPress={() =>
                goEdit("/vendor/profile/add-product/q06b-services-costs")
              }
              style={({ pressed }) => [
                styles.rowBtn,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.rowTitle}>Services summary</Text>
              <Text style={styles.rowValue}>
                {renderCostSegments(serviceSummary())}
              </Text>
            </Pressable>

            {needsTailoring ? (
              <>
                <Pressable
                  onPress={() =>
                    goEdit("/vendor/profile/add-product/q06b2-tailoring-styles")
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>Product includes trouser</Text>
                  <Text style={styles.rowValue}>
                    {includesTrouser ? "Yes" : "No"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    goEdit("/vendor/profile/add-product/q06b2-tailoring-styles")
                  }
                  style={({ pressed }) => [
                    styles.rowBtn,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>
                    {tailoringStylePresets.length === 1
                      ? "Tailoring design"
                      : "Tailoring style cards"}
                  </Text>
                  <Text style={styles.rowValue}>
                    {tailoringStylePresets.length
                      ? tailoringStylePresets.length === 1
                        ? "1 design"
                        : `${tailoringStylePresets.length} style card(s)`
                      : "Not set"}
                  </Text>
                </Pressable>

                {tailoringStylePresets.map((preset, index) => (
                  <Pressable
                    key={`${safeStr(preset.id) || "style"}-${index}`}
                    onPress={() =>
                      goEdit(
                        "/vendor/profile/add-product/q06b2-tailoring-styles",
                      )
                    }
                    style={({ pressed }) => [
                      styles.rowBtn,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.rowTitle}>
                      {tailoringStylePresets.length === 1
                        ? "Tailoring Design"
                        : `Style Card ${index + 1}`}
                    </Text>
                    <Text style={styles.rowValue}>
                      {renderCostSegments(
                        summarizePreset(preset, includesTrouser),
                      )}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Shipping</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q06c-shipping")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>
            {isFabricByMeter ? "Weight per meter (kg)" : "Weight (kg)"}
          </Text>
          <Text style={styles.rowValue}>
            {weightKg > 0 ? String(weightKg) : "Not set"}
          </Text>
        </Pressable>

        {!isFabricByMeter ? (
          <Pressable
            onPress={() => goEdit("/vendor/profile/add-product/q06c-shipping")}
            style={({ pressed }) => [
              styles.rowBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.rowTitle}>Package dimensions</Text>
            <Text style={styles.rowValue}>{packageDimensions}</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q06c-shipping")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Delivery policy</Text>
          <Text style={styles.rowValue}>{deliveryPolicyRows.join(" / ")}</Text>
        </Pressable>

        {isFabricByMeter ? (
          <Pressable
            onPress={() => goEdit("/vendor/profile/add-product/q06c-shipping")}
            style={({ pressed }) => [
              styles.rowBtn,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.rowTitle}>Meter checkout limit</Text>
            <Text style={styles.rowValue}>
              Max {deliveryPolicy.meter_shipping.max_checkout_m} m / warning above{" "}
              {deliveryPolicy.meter_shipping.soft_weight_warning_kg} kg / block above{" "}
              {deliveryPolicy.meter_shipping.max_checkout_weight_kg} kg
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Media</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q09-images")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Images *</Text>
          <Text style={styles.rowValue}>
            {imageCount ? `${imageCount} selected` : "Not set"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q10-videos")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Videos</Text>
          <Text style={styles.rowValue}>
            {videoCount ? `${videoCount} selected` : "None"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Fabric</Text>
          <Text style={styles.rowValue}>{fabricValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Work</Text>
          <Text style={styles.rowValue}>{workValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Density</Text>
          <Text style={styles.rowValue}>{densityValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Origin</Text>
          <Text style={styles.rowValue}>{originValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>Includes</Text>
          <Text style={styles.rowValue}>{wearValue}</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            goEdit("/vendor/profile/add-product/q12-more-description")
          }
          style={({ pressed }) => [
            styles.rowBtn,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.rowTitle}>More Description</Text>
          <Text style={styles.rowValue}>
            {moreDescription ? moreDescription : "None"}
          </Text>
        </Pressable>
      </View>

    </AddProductScreen>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  content: {
    padding: apSpacing.pagePad,
    paddingBottom: 24,
    backgroundColor: apColors.bg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  card: {
    marginTop: apSpacing.blockGap,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.card,
    padding: 14,
  },

  errorCard: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerSoft,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: apFontFamily,
    color: apColors.text,
    marginBottom: 8,
  },

  errorTitle: {
    color: stylesVars.danger,
  },

  meta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    fontFamily: apFontFamily,
  },

  errorMeta: {
    color: stylesVars.danger,
  },

  reviewHint: {
    marginTop: apSpacing.blockGap,
    color: apColors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontFamily: apFontFamily,
  },

  rowBtn: {
    minHeight: 54,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  rowTitle: {
    color: apColors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    fontFamily: apFontFamily,
  },

  rowValue: {
    marginTop: 3,
    color: apColors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: apFontFamily,
  },

  costValue: {
    color: apColors.danger,
  },

  variantCard: {
    marginTop: 10,
    borderRadius: apRadii.card,
    padding: 10,
    backgroundColor: apColors.white,
    borderWidth: 1,
    borderColor: apColors.border,
    flexDirection: "row",
    gap: 12,
  },

  variantImage: {
    width: 78,
    height: 92,
    borderRadius: apRadii.card,
    backgroundColor: stylesVars.borderSoft,
  },

  variantImagePlaceholder: {
    width: 78,
    height: 92,
    borderRadius: apRadii.card,
    backgroundColor: stylesVars.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },

  variantImagePlaceholderText: {
    color: stylesVars.placeholder,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    fontFamily: apFontFamily,
    textAlign: "center",
  },

  variantBody: {
    flex: 1,
    minWidth: 0,
  },

  variantTitle: {
    marginTop: 3,
    color: stylesVars.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    fontFamily: apFontFamily,
  },

  primaryBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: apRadii.control,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
    fontFamily: apFontFamily,
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  linkText: {
    color: stylesVars.blue,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: apFontFamily,
  },

  pressed: {
    opacity: 0.82,
  },
});
