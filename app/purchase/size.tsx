import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ExactMeasurementsModal from "../(tabs)/flow/purchase/exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "../(tabs)/flow/purchase/exact-measurements-sheet";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type Unit = "cm" | "in";

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
  white: "#FFFFFF",
  green: "#065F46",
  greenSoft: "#ECFDF5",
};

function norm(v: unknown) {
  return v == null ? "" : String(v).trim();
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

function prettyCategory(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUnstitchedCategory(v: unknown) {
  const s = norm(v);
  return (
    s === "unstitched_plain" ||
    s === "unstitched_dyeing" ||
    s === "unstitched_dyeing_tailoring"
  );
}

function getFabricLengthFromSize(size: string, sizeMap: Record<string, unknown>) {
  if (!size) return 0;
  return safePositiveNumber(sizeMap?.[size]);
}

export default function SizeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    productId?: string;
    product_id?: string;
    productCode?: string;
    product_code?: string;
    productName?: string;
    product_category?: string;

    price_per_meter_pkr?: string;
    stitched_total_pkr?: string;
    currency?: string;
    imageUrl?: string;

    size_length_m?: string;

    dyeing_available?: string;
    dyeing_selected?: string;
    dye_shade_id?: string;
    dye_hex?: string;
    dye_label?: string;
    dyeing_cost_pkr?: string;

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

    selectedSize?: string;
    selected_unstitched_size?: string;
    selected_fabric_length_m?: string;
    fabric_cost_pkr?: string;

    mode?: string;
    unit?: string;

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
  }>();

  const [summaryOpen, setSummaryOpen] = useState(false);

  const returnTo = useMemo(
    () => (params.returnTo ? String(params.returnTo) : "/purchase/place-order"),
    [params.returnTo],
  );

  const productId = useMemo(
    () => norm(params.productId ?? params.product_id),
    [params.productId, params.product_id],
  );

  const productCode = useMemo(
    () => norm(params.productCode ?? params.product_code),
    [params.productCode, params.product_code],
  );

  const productCategory = useMemo(() => norm(params.product_category), [params.product_category]);
  const isUnstitched = useMemo(() => isUnstitchedCategory(productCategory), [productCategory]);

  const pricePerMeterPkr = useMemo(
    () => safePositiveNumber(params.price_per_meter_pkr),
    [params.price_per_meter_pkr],
  );

  const stitchedTotalPkr = useMemo(
    () => safePositiveNumber(params.stitched_total_pkr),
    [params.stitched_total_pkr],
  );

  const sizeLengthMap = useMemo<Record<string, unknown>>(
    () => safeJsonDecode<Record<string, unknown>>(params.size_length_m, {}),
    [params.size_length_m],
  );

  const availableUnstitchedSizes = useMemo(() => {
    const order = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
    return order.filter((size) => getFabricLengthFromSize(size, sizeLengthMap) > 0);
  }, [sizeLengthMap]);

  const unit = useMemo<Unit>(() => {
    const u = norm(params.unit).toLowerCase();
    return u === "in" ? "in" : "cm";
  }, [params.unit]);

  const selectedStandardSize = useMemo(
    () => safeDecode(params.selected_unstitched_size || params.selectedSize),
    [params.selected_unstitched_size, params.selectedSize],
  );

  const selectedStandardFabricLength = useMemo(
    () =>
      safePositiveNumber(
        safeDecode(params.selected_fabric_length_m) || params.selected_fabric_length_m,
      ),
    [params.selected_fabric_length_m],
  );

  const selectedStandardFabricCost = useMemo(
    () => safePositiveNumber(params.fabric_cost_pkr),
    [params.fabric_cost_pkr],
  );

  const exactValues = useMemo(
    () => [
      norm(params.m1),
      norm(params.m2),
      norm(params.m3),
      norm(params.m4),
      norm(params.m5),
      norm(params.m6),
      norm(params.m7),
      norm(params.m8),
      norm(params.m9),
      norm(params.m10),
      norm(params.m11),
      norm(params.m12),
      norm(params.m13),
      norm(params.m14),
      norm(params.m15),
      norm(params.m16),
      norm(params.m17),
    ],
    [
      params.m1,
      params.m2,
      params.m3,
      params.m4,
      params.m5,
      params.m6,
      params.m7,
      params.m8,
      params.m9,
      params.m10,
      params.m11,
      params.m12,
      params.m13,
      params.m14,
      params.m15,
      params.m16,
      params.m17,
    ],
  );

  const exactHasAny = useMemo(() => exactValues.some((x) => x.length > 0), [exactValues]);

  const customRows = useMemo(
    () =>
      [
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
      ].filter((row) => row.label && row.value),
    [
      params.custom_label_1,
      params.custom_label_2,
      params.custom_label_3,
      params.custom_label_4,
      params.custom_value_1,
      params.custom_value_2,
      params.custom_value_3,
      params.custom_value_4,
    ],
  );

  const exactEnteredCount = useMemo(
    () => exactValues.filter((x) => x.length > 0).length,
    [exactValues],
  );

  const dimensionRows = useMemo<ExactMeasurementSheetRow[]>(
    () =>
      [
        { order: 1, label: "1. Neck", value: norm(params.m1) },
        { order: 2, label: "2. Across front", value: norm(params.m2) },
        { order: 3, label: "3. Bust", value: norm(params.m3) },
        { order: 4, label: "4. Under bust", value: norm(params.m4) },
        { order: 5, label: "5. Waist", value: norm(params.m5) },
        { order: 6, label: "6. Hips", value: norm(params.m6) },
        { order: 7, label: "7. Thigh", value: norm(params.m7) },
        { order: 8, label: "8. Upper arm", value: norm(params.m8) },
        { order: 9, label: "9. Elbow", value: norm(params.m9) },
        { order: 10, label: "10. Wrist", value: norm(params.m10) },
        { order: 11, label: "11. Shoulder to waist", value: norm(params.m11) },
        { order: 12, label: "12. Shoulder to floor", value: norm(params.m12) },
        { order: 13, label: "13. Shoulder to shoulder", value: norm(params.m13) },
        { order: 14, label: "14. Back neck to waist", value: norm(params.m14) },
        { order: 15, label: "15. Across back", value: norm(params.m15) },
        { order: 16, label: "16. Inner arm length", value: norm(params.m16) },
        { order: 17, label: "17. Ankle", value: norm(params.m17) },
        ...customRows.map((row, index) => ({
          order: 100 + index,
          label: row.label,
          value: row.value,
        })),
      ].filter((row) => row.value),
    [
      params.m1,
      params.m2,
      params.m3,
      params.m4,
      params.m5,
      params.m6,
      params.m7,
      params.m8,
      params.m9,
      params.m10,
      params.m11,
      params.m12,
      params.m13,
      params.m14,
      params.m15,
      params.m16,
      params.m17,
      customRows,
    ],
  );

  const goPlaceOrder = (p: Record<string, string>) => {
    router.replace({
      pathname: returnTo as any,
      params: {
        ...(params as any),
        productId,
        productCode,
        product_category: productCategory,
        ...p,
      },
    });
  };

  const onSelectStandard = (size: string) => {
    const fabricLengthM = isUnstitched ? getFabricLengthFromSize(size, sizeLengthMap) : 0;
    const fabricCostPkr = isUnstitched ? pricePerMeterPkr * fabricLengthM : 0;

    goPlaceOrder({
      mode: "standard",
      selectedSize: size,
      selected_unstitched_size: isUnstitched ? encodeURIComponent(size) : "",
      selected_fabric_length_m:
        isUnstitched && fabricLengthM > 0 ? encodeURIComponent(String(fabricLengthM)) : "",
      fabric_cost_pkr: isUnstitched && fabricCostPkr > 0 ? String(fabricCostPkr) : "",

      m1: "",
      m2: "",
      m3: "",
      m4: "",
      m5: "",
      m6: "",
      m7: "",
      m8: "",
      m9: "",
      m10: "",
      m11: "",
      m12: "",
      m13: "",
      m14: "",
      m15: "",
      m16: "",
      m17: "",

      custom_label_1: "",
      custom_value_1: "",
      custom_label_2: "",
      custom_value_2: "",
      custom_label_3: "",
      custom_value_3: "",
      custom_label_4: "",
      custom_value_4: "",
    });
  };

  const openExactMeasurements = () => {
    router.push({
      pathname: "/flow/purchase/exact-measurements" as any,
      params: {
        ...(params as any),
        returnTo: "/flow/purchase/size",
        nextAfterSave: returnTo,
        mode: "exact",
      },
    });
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Select Size</Text>

        {!!productCategory ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Category: <Text style={styles.summaryStrong}>{prettyCategory(productCategory)}</Text>
            </Text>

            {isUnstitched ? (
              <>
                <Text style={styles.summaryText}>
                  Cost per meter:{" "}
                  <Text style={styles.summaryStrong}>PKR {pricePerMeterPkr || 0} / meter</Text>
                </Text>

                {availableUnstitchedSizes.length ? (
                  <Text style={styles.summaryText}>
                    Available mapped sizes:{" "}
                    <Text style={styles.summaryStrong}>{availableUnstitchedSizes.join(", ")}</Text>
                  </Text>
                ) : (
                  <Text style={styles.summaryText}>
                    Available mapped sizes: <Text style={styles.summaryStrong}>Not available</Text>
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.summaryText}>
                Product total: <Text style={styles.summaryStrong}>PKR {stitchedTotalPkr || 0}</Text>
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          <Pressable onPress={() => {}} style={[styles.toggleBtn, styles.toggleActive]}>
            <Text style={[styles.toggleText, styles.toggleTextActive]}>Standard</Text>
          </Pressable>

          <Pressable onPress={openExactMeasurements} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>Exact</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Choose standard size</Text>

          <View style={styles.sizeGrid}>
            {(isUnstitched ? availableUnstitchedSizes : STANDARD_SIZES).map((s) => {
              const isOn = selectedStandardSize === s;

              return (
                <Pressable
                  key={s}
                  onPress={() => onSelectStandard(s)}
                  style={[styles.sizePill, isOn ? styles.sizePillOn : null]}
                >
                  <Text style={[styles.sizeText, isOn ? styles.sizeTextOn : null]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          {isUnstitched && !availableUnstitchedSizes.length ? (
            <Text style={styles.validation}>
              Size-length map is missing for this unstitched product.
            </Text>
          ) : null}

          {isUnstitched && !!selectedStandardSize && selectedStandardFabricLength > 0 ? (
            <View style={styles.costCard}>
              <Text style={styles.costLine}>
                Cost per meter:{" "}
                <Text style={styles.costStrong}>PKR {pricePerMeterPkr} / meter</Text>
              </Text>
              <Text style={styles.costLine}>
                Selected size: <Text style={styles.costStrong}>{selectedStandardSize}</Text>
              </Text>
              <Text style={styles.costLine}>
                Fabric length:{" "}
                <Text style={styles.costStrong}>{selectedStandardFabricLength} meter(s)</Text>
              </Text>
              <Text style={styles.costLine}>
                Total fabric cost:{" "}
                <Text style={styles.costStrong}>PKR {selectedStandardFabricCost}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        {exactHasAny ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Last saved exact measurements</Text>

            <View style={styles.exactSummaryCard}>
              <Text style={styles.resultLine}>
                Unit: <Text style={styles.resultStrong}>{unit}</Text>
              </Text>

              <Text style={styles.resultLine}>
                Entered main measurements:{" "}
                <Text style={styles.resultStrong}>{exactEnteredCount} / 17</Text>
              </Text>

              <Text style={styles.resultLine}>
                Custom dimensions: <Text style={styles.resultStrong}>{customRows.length} / 4</Text>
              </Text>

              <Text style={styles.resultLine}>
                Estimated standard size:{" "}
                <Text style={styles.resultStrong}>
                  {safeDecode(params.selected_unstitched_size || params.selectedSize) || "—"}
                </Text>
              </Text>

              {isUnstitched ? (
                <>
                  <Text style={styles.resultLine}>
                    Fabric length:{" "}
                    <Text style={styles.resultStrong}>{selectedStandardFabricLength || 0} m</Text>
                  </Text>

                  <Text style={styles.resultLine}>
                    Fabric cost:{" "}
                    <Text style={styles.resultStrong}>PKR {selectedStandardFabricCost || 0}</Text>
                  </Text>
                </>
              ) : null}

              <View style={styles.exactActionsRow}>
                <Pressable
                  onPress={() => setSummaryOpen(true)}
                  style={styles.secondaryInlineBtn}
                >
                  <Text style={styles.secondaryInlineText}>View exact measurements</Text>
                </Pressable>

                <Pressable onPress={openExactMeasurements} style={styles.primaryInlineBtn}>
                  <Text style={styles.primaryInlineText}>Edit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </ScrollView>

      <ExactMeasurementsModal
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        title="Exact Measurements"
        rows={dimensionRows}
        inferredSize={safeDecode(params.selected_unstitched_size || params.selectedSize) || ""}
        unit={unit}
        fabricLengthM={selectedStandardFabricLength}
        fabricCostPkr={selectedStandardFabricCost}
        showGuideImage
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  container: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
    backgroundColor: stylesVars.bg,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: stylesVars.cardBg,
    gap: 6,
  },

  summaryText: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  summaryStrong: {
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
  },

  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },

  toggleBtn: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleActive: {
    backgroundColor: stylesVars.blue,
    borderColor: stylesVars.blue,
  },

  toggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  toggleTextActive: {
    color: stylesVars.white,
  },

  sectionCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: stylesVars.cardBg,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },

  sizePill: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  sizePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  sizeText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  sizeTextOn: {
    color: stylesVars.white,
  },

  costCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: 14,
    padding: 12,
    backgroundColor: stylesVars.blueSoft,
    gap: 4,
  },

  costLine: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  costStrong: {
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
  },

  exactSummaryCard: {
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 14,
    backgroundColor: stylesVars.greenSoft,
    gap: 6,
  },

  resultLine: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.subText,
    fontWeight: "500",
  },

  resultStrong: {
    fontSize: 12,
    color: stylesVars.text,
    fontWeight: "700",
  },

  exactActionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },

  primaryInlineBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryInlineText: {
    color: stylesVars.white,
    fontSize: 12,
    fontWeight: "700",
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

  validation: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.danger,
    fontWeight: "500",
  },

  closeBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  link: {
    fontSize: 12,
    color: stylesVars.blue,
    fontWeight: "700",
  },
});