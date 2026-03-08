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

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

// Show ALL picked values
function formatPicked(list: any, emptyLabel: string) {
  const arr = Array.isArray(list) ? list : [];
  const cleaned = arr.map((x) => safeStr(x)).filter(Boolean);
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
  const needsDyeing = cat === "unstitched_dyeing" || cat === "unstitched_dyeing_tailoring";
  const needsTailoring = cat === "unstitched_dyeing_tailoring";

  const costPerMeter = Number((draft.price as any)?.cost_pkr_per_meter ?? 0);
  const costTotal = Number((draft.price as any)?.cost_pkr_total ?? 0);

  const dyeingCost = Number((draft.price as any)?.dyeing_cost_pkr ?? 0);
  const tailoringCost = Number((draft.price as any)?.tailoring_cost_pkr ?? 0);
  const tailoringDays = Number((draft.spec as any)?.tailoring_turnaround_days ?? 0);

  const sizes = (draft.price as any)?.available_sizes ?? [];
  const moreDescription = safeStr((draft.spec as any)?.more_description ?? "");

  const imageCount = (draft.media.images ?? []).length;
  const videoCount = (draft.media.videos ?? []).length;

  function dressTypeSummary() {
    const names = (draft.spec as any)?.dressTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) return formatPicked(names, "Not set");

    const ids = (draft.spec.dressTypeIds ?? []).map((x) => String(x));
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
      black: "Black"
    };

    const mapped = list.map((id) => map[String(id)] ?? String(id));
    return formatPicked(mapped, "Any");
  }

  function workSummary() {
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

  function goEdit(path: string) {
    // ✅ Ensure Continue/Close returns to Review after editing any screen (including index route)
    router.push({ pathname: path as any, params: { returnTo: "/vendor/profile/add-product/review" } } as any);
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

        <Pressable onPress={close} style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}>
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>

      {!vendorId ? (
        <View style={[styles.card, { borderColor: "#FCA5A5", backgroundColor: "#FFF1F2" }]}>
          <Text style={[styles.sectionTitle, { color: "#991B1B" }]}>Vendor not loaded</Text>
          <Text style={[styles.meta, { color: "#991B1B" }]}>
            Please ensure vendorSlice has vendor.id (bigint).
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basics</Text>

        <Pressable
          // ✅ index.tsx maps to /vendor/profile/add-product (NOT .../index)
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
          <Text style={styles.rowValue}>{Number.isFinite(inventoryQty) ? String(inventoryQty) : "0"}</Text>
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
              <Text style={styles.rowValue}>{costPerMeter > 0 ? String(costPerMeter) : "Not set"}</Text>
            </Pressable>

            <Pressable
              onPress={() => goEdit("/vendor/profile/add-product/q06b-services-costs")}
              style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.rowTitle}>Dyeing / Tailoring</Text>
              <Text style={styles.rowValue}>
                {needsDyeing ? `Dyeing: ${dyeingCost > 0 ? dyeingCost : "Not set"} PKR` : "No dyeing"}
                {needsTailoring ? ` • Tailoring: ${tailoringCost > 0 ? tailoringCost : "Not set"} PKR` : ""}
                {needsTailoring ? ` • ${Number.isFinite(tailoringDays) ? tailoringDays : 0} days` : ""}
              </Text>
            </Pressable>
          </>
        )}
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

      <Pressable style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]} onPress={goSubmit}>
        <Text style={styles.primaryText}>Continue to Save</Text>
      </Pressable>
    </ScrollView>
  );
}

const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A",
  placeholder: "#94A3B8"
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },
  meta: { marginTop: 8, color: stylesVars.subText, fontWeight: "800", fontSize: 12 },

  rowBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },

  // ✅ Interchanged: label now looks like old "value"
  rowTitle: { color: stylesVars.text, opacity: 0.85, fontSize: 12 },

  // ✅ Interchanged: value now looks like old "title"
  rowValue: { marginTop: 4, color: stylesVars.blue, fontWeight: "900", fontSize: 13 },

  primaryBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: stylesVars.blue
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  linkText: { color: stylesVars.blue, fontWeight: "900" },

  pressed: { opacity: 0.75 }
});