// app/vendor/profile/add-product/review.tsx
import React, { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type SizeLengthMap = Partial<Record<"XS" | "S" | "M" | "L" | "XL" | "XXL", number>>;

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

function categoryLabel(cat: ProductCategory) {
  switch (cat) {
    case "unstitched_plain":
      return "Unstitched (Plain)";
    case "unstitched_dyeing":
      return "Unstitched + Dyeing";
    case "unstitched_dyeing_tailoring":
      return "Unstitched + Dyeing + Tailoring";
    case "stitched_ready":
      return "Stitched / Ready-to-wear";
    default:
      return String(cat);
  }
}

function formatSizeLengthMap(sizeLengthMap: SizeLengthMap | undefined | null) {
  if (!sizeLengthMap || typeof sizeLengthMap !== "object") return "Not set";

  const orderedKeys: (keyof SizeLengthMap)[] = ["XS", "S", "M", "L", "XL", "XXL"];
  const parts = orderedKeys
    .map((key) => {
      const val = sizeLengthMap[key];
      const n = Number(val);
      if (!Number.isFinite(n) || n <= 0) return null;
      return `${key}: ${n} m`;
    })
    .filter(Boolean);

  return parts.length ? parts.join(" • ") : "Not set";
}

function formatPackageCm(pkg: any) {
  const length = safeNum(pkg?.length);
  const width = safeNum(pkg?.width);
  const height = safeNum(pkg?.height);

  if (length <= 0 || width <= 0 || height <= 0) return "Not set";
  return `${length} × ${width} × ${height} cm`;
}

function normalizePresetArray(v: unknown): TailoringStylePreset[] {
  return Array.isArray(v) ? (v as TailoringStylePreset[]) : [];
}

function countPresetImages(preset: TailoringStylePreset) {
  return Array.isArray(preset?.images) ? preset.images.length : 0;
}
function summarizePreset(preset: TailoringStylePreset, includesTrouser: boolean) {
  const title = safeStr(preset?.title) || "Untitled style";
  const imgCount = countPresetImages(preset);
  const extra = safeNum(preset?.extra_cost_pkr);

  const neckCount = normalizeStringArray(preset?.allowed_neck_variations).length;
  const sleeveCount = normalizeStringArray(preset?.allowed_sleeve_variations).length;
  const trouserCount = includesTrouser
    ? normalizeStringArray(preset?.allowed_trouser_variations).length
    : 0;

  const parts = [
    title,
    `${imgCount} image${imgCount === 1 ? "" : "s"}`,
    `Neck vars: ${neckCount || 0}`,
    `Sleeve vars: ${sleeveCount || 0}`,
  ];

  if (includesTrouser) {
    parts.push(`Trouser vars: ${trouserCount || 0}`);
  }

  if (extra > 0) {
    parts.push(`+PKR ${extra}`);
  }

  parts.push(`Custom note: ${preset?.allow_custom_note ? "Yes" : "No"}`);

  return parts.join(" • ");
}
export default function AddProductReviewScreen() {
  const router = useRouter();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const { draft } = useProductDraft();

  const cat = useMemo<ProductCategory>(() => inferCategoryFromDraft(draft), [draft]);

  const madeOnOrder = Boolean((draft.spec as any)?.made_on_order ?? false);
  const inventoryQty = madeOnOrder ? 0 : Number(draft.inventory_qty ?? 0);

  const isStitched = cat === "stitched_ready";
  const isUnstitched = !isStitched;
  const needsDyeing = cat === "unstitched_dyeing" || cat === "unstitched_dyeing_tailoring";
  const needsTailoring = cat === "unstitched_dyeing_tailoring";

  const costPerMeter = Number((draft.price as any)?.cost_pkr_per_meter ?? 0);
  const costTotal = Number((draft.price as any)?.cost_pkr_total ?? 0);

  const dyeingCost =
    Number((draft.price as any)?.dyeing_cost_pkr ?? 0) ||
    Number((draft.spec as any)?.dyeing_cost_pkr ?? 0);

  const tailoringCost = Number((draft.price as any)?.tailoring_cost_pkr ?? 0);
  const tailoringDays = Number((draft.spec as any)?.tailoring_turnaround_days ?? 0);

  const sizes = (draft.price as any)?.available_sizes ?? [];
  const sizeLengthMap = (draft.spec as any)?.size_length_m as SizeLengthMap | undefined;

  const weightKg = safeNum((draft.spec as any)?.weight_kg);
  const packageCm = (draft.spec as any)?.package_cm ?? {};

  const moreDescription = safeStr((draft.spec as any)?.more_description ?? "");

  const imageCount = (draft.media.images ?? []).length;
  const videoCount = (draft.media.videos ?? []).length;

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
    if (Array.isArray(names) && names.length) return formatPicked(names, "Not set");

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

  function colorSummary() {
    const names = (draft.spec as any)?.colorShadeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");

    const list = (draft.spec.colorShadeIds ?? []) as any[];
    if (!list.length) return "Any";

    const map: Record<string, string> = {
      red: "Red",
      green: "Green",
      yellow: "Yellow",
      blue: "Blue",
      golden: "Golden",
      silver: "Silver",
      white: "White",
      black: "Black",
    };

    const mapped = list.map((id) => map[String(id)] ?? String(id));
    return formatPicked(mapped, "Any");
  }

  function workSummary() {
    const subNames = (draft.spec as any)?.workSubTypeNames as any[] | undefined;
    if (Array.isArray(subNames) && subNames.length) return formatPicked(subNames, "Any");

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
    if (Array.isArray(names) && names.length) return formatPicked(names, "Any");
    const list = (draft.spec.wearStateIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function serviceSummary() {
    if (isStitched) return "No dyeing / tailoring";

    const parts: string[] = [];

    if (needsDyeing) {
      parts.push(`Dyeing: ${dyeingCost > 0 ? `${dyeingCost} PKR` : "Not set"}`);
    } else {
      parts.push("No dyeing");
    }

    if (needsTailoring) {
      parts.push(`Tailoring: ${tailoringCost > 0 ? `${tailoringCost} PKR` : "Not set"}`);
      parts.push(`${Number.isFinite(tailoringDays) ? tailoringDays : 0} days`);
      parts.push(`Trouser included: ${includesTrouser ? "Yes" : "No"}`);
      parts.push(
        `Style cards: ${tailoringStylePresets.length > 0 ? tailoringStylePresets.length : "Not set"}`,
      );
    } else {
      parts.push("No tailoring");
    }

    return parts.join(" • ");
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
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }
    router.push("/vendor/profile/add-product/submit" as any);
  }

  const dressTypeValue = dressTypeSummary();
  const fabricValue = fabricSummary();
  const colorValue = colorSummary();
  const workValue = workSummary();
  const densityValue = densitySummary();
  const originValue = originSummary();
  const wearValue = wearStateSummary();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Review Product</Text>

        <Pressable
          onPress={close}
          style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>

      {!vendorId ? (
        <View style={[styles.card, styles.errorCard]}>
          <Text style={[styles.sectionTitle, styles.errorTitle]}>Vendor not loaded</Text>
          <Text style={[styles.meta, styles.errorMeta]}>
            Please ensure vendorSlice has vendor.id (bigint).
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basics</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Title *</Text>
          <Text style={styles.rowValue}>{safeStr(draft.title) || "Not set"}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q02-category")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Category *</Text>
          <Text style={styles.rowValue}>{categoryLabel(cat)}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q03-made-on-order")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Made on order</Text>
          <Text style={styles.rowValue}>{madeOnOrder ? "Yes" : "No"}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q04-inventory")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Inventory Quantity *</Text>
          <Text style={styles.rowValue}>
            {Number.isFinite(inventoryQty) ? String(inventoryQty) : "0"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pricing</Text>

        {isStitched ? (
          <>
            <Pressable
              onPress={() => goEdit("/vendor/profile/add-product/q05a-stitched-total-cost")}
              style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>Total Cost (PKR) *</Text>
              <Text style={styles.rowValue}>{costTotal > 0 ? String(costTotal) : "Not set"}</Text>
            </Pressable>

            <Pressable
              onPress={() => goEdit("/vendor/profile/add-product/q06a-sizes")}
              style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>Available Sizes</Text>
              <Text style={styles.rowValue}>
                {Array.isArray(sizes) && sizes.length ? sizes.join(", ") : "Not set"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => goEdit("/vendor/profile/add-product/q05b-unstitched-cost-per-meter")}
              style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>Cost per Meter (PKR) *</Text>
              <Text style={styles.rowValue}>
                {costPerMeter > 0 ? String(costPerMeter) : "Not set"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => goEdit("/vendor/profile/add-product/q05b-unstitched-cost-per-meter")}
              style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>Fabric length by size</Text>
              <Text style={styles.rowValue}>{formatSizeLengthMap(sizeLengthMap)}</Text>
            </Pressable>

            <Pressable
              onPress={() => goEdit("/vendor/profile/add-product/q06b-services-costs")}
              style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>Services summary</Text>
              <Text style={styles.rowValue}>{serviceSummary()}</Text>
            </Pressable>

            {needsTailoring ? (
              <>
                <Pressable
                  onPress={() => goEdit("/vendor/profile/add-product/q06b2-tailoring-styles")}
                  style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.rowTitle}>Product includes trouser</Text>
                  <Text style={styles.rowValue}>{includesTrouser ? "Yes" : "No"}</Text>
                </Pressable>

                <Pressable
                  onPress={() => goEdit("/vendor/profile/add-product/q06b2-tailoring-styles")}
                  style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.rowTitle}>Tailoring style cards</Text>
                  <Text style={styles.rowValue}>
                    {tailoringStylePresets.length
                      ? `${tailoringStylePresets.length} style card(s)`
                      : "Not set"}
                  </Text>
                </Pressable>

                {tailoringStylePresets.map((preset, index) => (
                  <Pressable
                    key={`${safeStr(preset.id) || "style"}-${index}`}
                    onPress={() => goEdit("/vendor/profile/add-product/q06b2-tailoring-styles")}
                    style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.rowTitle}>Style Card {index + 1}</Text>
                    <Text style={styles.rowValue}>{summarizePreset(preset, includesTrouser)}</Text>
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
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Weight (kg)</Text>
          <Text style={styles.rowValue}>{weightKg > 0 ? String(weightKg) : "Not set"}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q06c-shipping")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Package dimensions</Text>
          <Text style={styles.rowValue}>{formatPackageCm(packageCm)}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Media</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q09-images")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Images *</Text>
          <Text style={styles.rowValue}>{imageCount ? `${imageCount} selected` : "Not set"}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q10-videos")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Videos</Text>
          <Text style={styles.rowValue}>{videoCount ? `${videoCount} selected` : "None"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Dress Type *</Text>
          <Text style={styles.rowValue}>{dressTypeValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Fabric</Text>
          <Text style={styles.rowValue}>{fabricValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Color</Text>
          <Text style={styles.rowValue}>{colorValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Work</Text>
          <Text style={styles.rowValue}>{workValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Density</Text>
          <Text style={styles.rowValue}>{densityValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Origin</Text>
          <Text style={styles.rowValue}>{originValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q11-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>Wear State</Text>
          <Text style={styles.rowValue}>{wearValue}</Text>
        </Pressable>

        <Pressable
          onPress={() => goEdit("/vendor/profile/add-product/q12-more-description")}
          style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.rowTitle}>More Description</Text>
          <Text style={styles.rowValue}>{moreDescription ? moreDescription : "None"}</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
        onPress={goSubmit}
      >
        <Text style={styles.primaryText}>Continue to Save</Text>
      </Pressable>
    </ScrollView>
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
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg,
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
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  errorCard: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerSoft,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 2,
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
  },

  errorMeta: {
    color: stylesVars.danger,
  },

  rowBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  rowTitle: {
    color: stylesVars.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  rowValue: {
    marginTop: 4,
    color: stylesVars.subText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  primaryBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
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
  },

  pressed: {
    opacity: 0.82,
  },
});