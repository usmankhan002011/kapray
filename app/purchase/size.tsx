import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type Mode = "standard" | "exact";
type Unit = "cm" | "in";

type MeasureKey =
  | "m1"
  | "m2"
  | "m3"
  | "m4"
  | "m5"
  | "m6"
  | "m7"
  | "m8"
  | "m9"
  | "m10"
  | "m11"
  | "m12"
  | "m13"
  | "m14"
  | "m15"
  | "m16"
  | "m17";

const MEASURE_LABELS: Record<MeasureKey, { code: string; title: string; hint: string }> = {
  m1: { code: "1", title: "Neck", hint: "Neck" },
  m2: { code: "2", title: "Across front", hint: "Across front" },
  m3: { code: "3", title: "Bust", hint: "Bust" },
  m4: { code: "4", title: "Under bust", hint: "Under bust" },
  m5: { code: "5", title: "Waist", hint: "Waist" },
  m6: { code: "6", title: "Hips", hint: "Hips" },
  m7: { code: "7", title: "Thigh", hint: "Thigh" },
  m8: { code: "8", title: "Upper arm", hint: "Upper arm" },
  m9: { code: "9", title: "Elbow", hint: "Elbow" },
  m10: { code: "10", title: "Wrist", hint: "Wrist" },
  m11: { code: "11", title: "Shoulder to waist", hint: "Shoulder to waist" },
  m12: { code: "12", title: "Shoulder to floor", hint: "Shoulder to floor" },
  m13: { code: "13", title: "Shoulder to shoulder", hint: "Shoulder width" },
  m14: { code: "14", title: "Back neck to waist", hint: "Back neck to waist" },
  m15: { code: "15", title: "Across back", hint: "Across back" },
  m16: { code: "16", title: "Inner arm length", hint: "Armhole to wrist" },
  m17: { code: "17", title: "Ankle", hint: "Ankle" },
};

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

function BodyMeasurePhoto({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <View style={styles.svgCard}>
      <View style={styles.guideHeaderRow}>
        <Text style={styles.svgTitle}>Measurement Guide</Text>

        <Pressable onPress={onOpen} style={styles.zoomBtn}>
          <Text style={styles.zoomBtnText}>Zoom</Text>
        </Pressable>
      </View>

      <Pressable onPress={onOpen}>
        <Image
          source={require("../../assets/body measurement chart.jpg")}
          style={styles.measureGuideImage}
          resizeMode="contain"
        />
      </Pressable>

      <Text style={styles.guideHint}>Tap image to open larger view</Text>
    </View>
  );
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
  }>();

  const [guideOpen, setGuideOpen] = useState(false);

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

  const initialMode: Mode = useMemo(() => {
    const m = norm(params.mode);
    return m === "exact" ? "exact" : "standard";
  }, [params.mode]);

  const [mode, setMode] = useState<Mode>(initialMode);

  const initialUnit: Unit = useMemo(() => {
    const u = norm(params.unit).toLowerCase();
    return u === "in" ? "in" : "cm";
  }, [params.unit]);

  const [unit, setUnit] = useState<Unit>(initialUnit);
  const unitSuffix = useMemo(() => (unit === "in" ? " (inch)" : " (cm)"), [unit]);

  const [m1, setM1] = useState<string>(norm(params.m1));
  const [m2, setM2] = useState<string>(norm(params.m2));
  const [m3, setM3] = useState<string>(norm(params.m3));
  const [m4, setM4] = useState<string>(norm(params.m4));
  const [m5, setM5] = useState<string>(norm(params.m5));
  const [m6, setM6] = useState<string>(norm(params.m6));
  const [m7, setM7] = useState<string>(norm(params.m7));
  const [m8, setM8] = useState<string>(norm(params.m8));
  const [m9, setM9] = useState<string>(norm(params.m9));
  const [m10, setM10] = useState<string>(norm(params.m10));
  const [m11, setM11] = useState<string>(norm(params.m11));
  const [m12, setM12] = useState<string>(norm(params.m12));
  const [m13, setM13] = useState<string>(norm(params.m13));
  const [m14, setM14] = useState<string>(norm(params.m14));
  const [m15, setM15] = useState<string>(norm(params.m15));
  const [m16, setM16] = useState<string>(norm(params.m16));
  const [m17, setM17] = useState<string>(norm(params.m17));

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

  const isValidNumberOrEmpty = (v: string) => {
    if (!v.trim()) return true;
    const num = Number(v);
    return Number.isFinite(num) && num > 0;
  };

  const exactValues = [
    m1,
    m2,
    m3,
    m4,
    m5,
    m6,
    m7,
    m8,
    m9,
    m10,
    m11,
    m12,
    m13,
    m14,
    m15,
    m16,
    m17,
  ];

  const exactHasAny = exactValues.some((x) => norm(x).length > 0);
  const invalid = exactValues.some((x) => !isValidNumberOrEmpty(x));

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
      unit,
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
    });
  };

  const onSaveExact = () => {
    if (invalid || !exactHasAny) return;

    goPlaceOrder({
      mode: "exact",
      selectedSize: "",
      selected_unstitched_size: "",
      selected_fabric_length_m: "",
      fabric_cost_pkr: "",
      unit,
      m1: m1.trim(),
      m2: m2.trim(),
      m3: m3.trim(),
      m4: m4.trim(),
      m5: m5.trim(),
      m6: m6.trim(),
      m7: m7.trim(),
      m8: m8.trim(),
      m9: m9.trim(),
      m10: m10.trim(),
      m11: m11.trim(),
      m12: m12.trim(),
      m13: m13.trim(),
      m14: m14.trim(),
      m15: m15.trim(),
      m16: m16.trim(),
      m17: m17.trim(),
    });
  };

  const previewLengthM = useMemo(() => {
    if (!isUnstitched) return 0;
    if (mode !== "standard") return 0;
    return selectedStandardFabricLength;
  }, [isUnstitched, mode, selectedStandardFabricLength]);

  const previewFabricCostPkr = useMemo(() => {
    if (!isUnstitched) return 0;
    if (mode !== "standard") return 0;
    return selectedStandardFabricCost;
  }, [isUnstitched, mode, selectedStandardFabricCost]);

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
          <Pressable
            onPress={() => setMode("standard")}
            style={[styles.toggleBtn, mode === "standard" ? styles.toggleActive : null]}
          >
            <Text
              style={[styles.toggleText, mode === "standard" ? styles.toggleTextActive : null]}
            >
              Standard
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("exact")}
            style={[styles.toggleBtn, mode === "exact" ? styles.toggleActive : null]}
          >
            <Text style={[styles.toggleText, mode === "exact" ? styles.toggleTextActive : null]}>
              Exact (1–17)
            </Text>
          </Pressable>
        </View>

        {mode === "standard" ? (
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

            {isUnstitched && !!selectedStandardSize && previewLengthM > 0 ? (
              <View style={styles.costCard}>
                <Text style={styles.costLine}>
                  Cost per meter:{" "}
                  <Text style={styles.costStrong}>PKR {pricePerMeterPkr} / meter</Text>
                </Text>
                <Text style={styles.costLine}>
                  Selected size: <Text style={styles.costStrong}>{selectedStandardSize}</Text>
                </Text>
                <Text style={styles.costLine}>
                  Fabric length: <Text style={styles.costStrong}>{previewLengthM} meter(s)</Text>
                </Text>
                <Text style={styles.costLine}>
                  Total fabric cost:{" "}
                  <Text style={styles.costStrong}>PKR {previewFabricCostPkr}</Text>
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.exactWrap}>
            <BodyMeasurePhoto onOpen={() => setGuideOpen(true)} />

            <Text style={styles.helper}>Enter measurements</Text>

            <View style={styles.unitRow}>
              <Pressable
                onPress={() => setUnit("cm")}
                style={[styles.unitPill, unit === "cm" ? styles.unitActive : null]}
              >
                <Text style={[styles.unitText, unit === "cm" ? styles.unitTextActive : null]}>
                  cm
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setUnit("in")}
                style={[styles.unitPill, unit === "in" ? styles.unitActive : null]}
              >
                <Text style={[styles.unitText, unit === "in" ? styles.unitTextActive : null]}>
                  inch
                </Text>
              </Pressable>
            </View>

            <View style={styles.inputs}>
              {(Object.keys(MEASURE_LABELS) as MeasureKey[]).map((key) => {
                const valueMap: Record<MeasureKey, string> = {
                  m1,
                  m2,
                  m3,
                  m4,
                  m5,
                  m6,
                  m7,
                  m8,
                  m9,
                  m10,
                  m11,
                  m12,
                  m13,
                  m14,
                  m15,
                  m16,
                  m17,
                };

                const setterMap: Record<MeasureKey, (v: string) => void> = {
                  m1: setM1,
                  m2: setM2,
                  m3: setM3,
                  m4: setM4,
                  m5: setM5,
                  m6: setM6,
                  m7: setM7,
                  m8: setM8,
                  m9: setM9,
                  m10: setM10,
                  m11: setM11,
                  m12: setM12,
                  m13: setM13,
                  m14: setM14,
                  m15: setM15,
                  m16: setM16,
                  m17: setM17,
                };

                const item = MEASURE_LABELS[key];

                return (
                  <MeasureRow
                    key={key}
                    code={item.code}
                    value={valueMap[key]}
                    onChange={setterMap[key]}
                    placeholder={`${item.title}${unitSuffix}`}
                  />
                );
              })}

              <Pressable onPress={onSaveExact} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Continue</Text>
              </Pressable>

              {invalid ? (
                <Text style={styles.validation}>
                  Please enter valid positive numbers only, or leave a field blank.
                </Text>
              ) : null}
            </View>
          </View>
        )}

        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.link}>Close</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={guideOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setGuideOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Measurement Guide</Text>

              <Pressable onPress={() => setGuideOpen(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoomScrollContent}
            >
              <ScrollView
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.zoomScrollContent}
              >
                <Image
                  source={require("../../assets/body measurement chart.jpg")}
                  style={styles.zoomGuideImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MeasureRow({
  code,
  value,
  onChange,
  placeholder,
}: {
  code: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{code}.</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={stylesVars.placeholder}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
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

  exactWrap: {
    gap: 10,
    marginTop: 8,
  },

  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  unitRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  unitPill: {
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

  unitActive: {
    backgroundColor: stylesVars.blue,
    borderColor: stylesVars.blue,
  },

  unitText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  unitTextActive: {
    color: stylesVars.white,
  },

  svgCard: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 12,
    backgroundColor: stylesVars.cardBg,
  },

  guideHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  svgTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  zoomBtn: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  zoomBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  measureGuideImage: {
    width: "100%",
    height: 520,
    borderRadius: 12,
  },

  guideHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  inputs: {
    gap: 10,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  inputLabel: {
    width: 28,
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: stylesVars.text,
    backgroundColor: stylesVars.white,
  },

  primaryBtn: {
    marginTop: 4,
    minHeight: 46,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "center",
    padding: 16,
  },

  modalCard: {
    backgroundColor: stylesVars.cardBg,
    borderRadius: 18,
    overflow: "hidden",
    maxHeight: "88%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: stylesVars.border,
  },

  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  modalCloseBtn: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  zoomScrollContent: {
    alignItems: "center",
    justifyContent: "center",
  },

  zoomGuideImage: {
    width: 900,
    height: 1400,
  },
});