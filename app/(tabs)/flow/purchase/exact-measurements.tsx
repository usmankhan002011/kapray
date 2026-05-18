import React, { useEffect, useMemo, useState } from "react";
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
import ExactMeasurementsModal from "./exact-measurements-modal";
import type { ExactMeasurementSheetRow } from "./exact-measurements-sheet";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type Unit = "cm" | "in";
type StandardSize = (typeof STANDARD_SIZES)[number];

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

type BridalSizeProfile = {
  bust: number;
  waist: number;
  hips: number;
  shoulder: number;
  acrossBack: number;
  acrossFront: number;
  shoulderToWaist: number;
  shoulderToFloor: number;
  backNeckToWaist: number;
  innerArm: number;
  ankle: number;
};

const MEASURE_LABELS: Record<
  MeasureKey,
  {
    code: string;
    title: string;
    refKey?:
      | "shoulder"
      | "acrossBack"
      | "acrossFront"
      | "bust"
      | "waist"
      | "hips"
      | "shoulderToWaist"
      | "shoulderToFloor"
      | "backNeckToWaist"
      | "innerArm"
      | "ankle";
    fallbackCm?: number;
  }
> = {
  m1: { code: "1", title: "Neck", fallbackCm: 34 },
  m2: { code: "2", title: "Across front", refKey: "acrossFront" },
  m3: { code: "3", title: "Bust", refKey: "bust" },
  m4: { code: "4", title: "Under bust", fallbackCm: 80 },
  m5: { code: "5", title: "Waist", refKey: "waist" },
  m6: { code: "6", title: "Hips", refKey: "hips" },
  m7: { code: "7", title: "Thigh", fallbackCm: 60 },
  m8: { code: "8", title: "Upper arm", fallbackCm: 30 },
  m9: { code: "9", title: "Elbow", fallbackCm: 26 },
  m10: { code: "10", title: "Wrist", fallbackCm: 16 },
  m11: { code: "11", title: "Shoulder to waist", refKey: "shoulderToWaist" },
  m12: { code: "12", title: "Shoulder to floor", refKey: "shoulderToFloor" },
  m13: { code: "13", title: "Shoulder to shoulder", refKey: "shoulder" },
  m14: { code: "14", title: "Back neck to waist", refKey: "backNeckToWaist" },
  m15: { code: "15", title: "Across back", refKey: "acrossBack" },
  m16: { code: "16", title: "Inner arm length", refKey: "innerArm" },
  m17: { code: "17", title: "Ankle", refKey: "ankle" },
};

const BRIDAL_SIZE_CHART_CM: Record<StandardSize, BridalSizeProfile> = {
  XS: {
    bust: 84,
    waist: 68,
    hips: 92,
    shoulder: 35.5,
    acrossBack: 33.5,
    acrossFront: 31.5,
    shoulderToWaist: 39,
    shoulderToFloor: 144,
    backNeckToWaist: 37,
    innerArm: 43,
    ankle: 21,
  },
  S: {
    bust: 89,
    waist: 73,
    hips: 97,
    shoulder: 36.5,
    acrossBack: 34.5,
    acrossFront: 32.5,
    shoulderToWaist: 40,
    shoulderToFloor: 146,
    backNeckToWaist: 38,
    innerArm: 44,
    ankle: 22,
  },
  M: {
    bust: 94,
    waist: 78,
    hips: 102,
    shoulder: 37.5,
    acrossBack: 35.5,
    acrossFront: 33.5,
    shoulderToWaist: 41,
    shoulderToFloor: 148,
    backNeckToWaist: 39,
    innerArm: 45,
    ankle: 23,
  },
  L: {
    bust: 100,
    waist: 84,
    hips: 108,
    shoulder: 38.5,
    acrossBack: 36.5,
    acrossFront: 34.5,
    shoulderToWaist: 42,
    shoulderToFloor: 150,
    backNeckToWaist: 40,
    innerArm: 46,
    ankle: 24,
  },
  XL: {
    bust: 106,
    waist: 90,
    hips: 114,
    shoulder: 39.5,
    acrossBack: 37.5,
    acrossFront: 35.5,
    shoulderToWaist: 43,
    shoulderToFloor: 152,
    backNeckToWaist: 41,
    innerArm: 47,
    ankle: 25,
  },
  XXL: {
    bust: 112,
    waist: 96,
    hips: 120,
    shoulder: 40.5,
    acrossBack: 38.5,
    acrossFront: 36.5,
    shoulderToWaist: 44,
    shoulderToFloor: 154,
    backNeckToWaist: 42,
    innerArm: 48,
    ankle: 26,
  },
  XXXL: {
    bust: 118,
    waist: 102,
    hips: 126,
    shoulder: 41.5,
    acrossBack: 39.5,
    acrossFront: 37.5,
    shoulderToWaist: 45,
    shoulderToFloor: 156,
    backNeckToWaist: 43,
    innerArm: 49,
    ankle: 27,
  },
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

function getFabricLengthFromSize(
  size: string,
  sizeMap: Record<string, unknown>,
) {
  if (!size) return 0;
  return safePositiveNumber(sizeMap?.[size]);
}

function toCm(v: string, unit: Unit) {
  const n = safePositiveNumber(v);
  if (!n) return 0;
  return unit === "in" ? n * 2.54 : n;
}

function cmToIn(n: number) {
  return n / 2.54;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function isValidNumberOrEmpty(v: string) {
  if (!v.trim()) return true;
  const num = Number(v);
  return Number.isFinite(num) && num > 0;
}

function formatReferenceValue(cm: number, unit: Unit) {
  if (unit === "in") return `${round1(cmToIn(cm))} in`;
  return `${round1(cm)} cm`;
}

function getPlaceholderForMeasure(key: MeasureKey, unit: Unit) {
  const meta = MEASURE_LABELS[key];
  const medium = BRIDAL_SIZE_CHART_CM.M;
  const cm =
    meta.refKey != null
      ? Number(medium[meta.refKey])
      : Number(meta.fallbackCm ?? 0);

  if (!Number.isFinite(cm) || cm <= 0) {
    return `${meta.title}${unit === "in" ? " (inch)" : " (cm)"}`;
  }

  return `${meta.title} (${formatReferenceValue(cm, unit)})`;
}

function BodyMeasurePhoto({ onOpen }: { onOpen: () => void }) {
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
          source={require("../../../../assets/body measurement chart.jpg")}
          style={styles.measureGuideImage}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

function inferNearestSize(args: {
  unit: Unit;
  measures: Record<MeasureKey, string>;
  candidateSizes: StandardSize[];
}) {
  const { unit, measures, candidateSizes } = args;

  const values = {
    bust: toCm(measures.m3, unit),
    waist: toCm(measures.m5, unit),
    hips: toCm(measures.m6, unit),
    shoulder: toCm(measures.m13, unit),
    acrossBack: toCm(measures.m15, unit),
    acrossFront: toCm(measures.m2, unit),
  };

  const weightedInputs = [
    { key: "bust" as keyof BridalSizeProfile, value: values.bust, weight: 4.6 },
    {
      key: "waist" as keyof BridalSizeProfile,
      value: values.waist,
      weight: 4.0,
    },
    { key: "hips" as keyof BridalSizeProfile, value: values.hips, weight: 4.0 },
    {
      key: "shoulder" as keyof BridalSizeProfile,
      value: values.shoulder,
      weight: 2.4,
    },
    {
      key: "acrossBack" as keyof BridalSizeProfile,
      value: values.acrossBack,
      weight: 2.0,
    },
    {
      key: "acrossFront" as keyof BridalSizeProfile,
      value: values.acrossFront,
      weight: 1.8,
    },
  ].filter((x) => x.value > 0);

  if (!weightedInputs.length) {
    return { size: "" as StandardSize | "", confidence: "low" as const };
  }

  let bestSize: StandardSize | "" = "";
  let bestScore = Number.POSITIVE_INFINITY;

  for (const size of candidateSizes) {
    const profile = BRIDAL_SIZE_CHART_CM[size];
    let score = 0;

    for (const item of weightedInputs) {
      score += Math.abs(item.value - Number(profile[item.key])) * item.weight;
    }

    if (score < bestScore) {
      bestScore = score;
      bestSize = size;
    }
  }

  const confidence =
    weightedInputs.length >= 4
      ? "high"
      : weightedInputs.length >= 2
        ? "medium"
        : "low";

  return { size: bestSize, confidence };
}

function computeVerticalAdjustmentMeters(args: {
  unit: Unit;
  measures: Record<MeasureKey, string>;
  size: StandardSize | "";
}) {
  const { unit, measures, size } = args;
  if (!size) return 0;

  const profile = BRIDAL_SIZE_CHART_CM[size];

  const shoulderToWaist = toCm(measures.m11, unit);
  const shoulderToFloor = toCm(measures.m12, unit);
  const backNeckToWaist = toCm(measures.m14, unit);
  const innerArm = toCm(measures.m16, unit);
  const ankle = toCm(measures.m17, unit);

  const extraCm =
    Math.max(0, shoulderToWaist - profile.shoulderToWaist) * 0.22 +
    Math.max(0, shoulderToFloor - profile.shoulderToFloor) * 0.65 +
    Math.max(0, backNeckToWaist - profile.backNeckToWaist) * 0.22 +
    Math.max(0, innerArm - profile.innerArm) * 0.16 +
    Math.max(0, ankle - profile.ankle) * 0.1;

  const bridalAllowanceM = 0.25;

  return round2(extraCm / 100 + bridalAllowanceM);
}

export default function ExactMeasurementsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    returnTo?: string;
    nextAfterSave?: string;
    productId?: string;
    product_id?: string;
    productCode?: string;
    product_code?: string;
    product_category?: string;
    price_per_meter_pkr?: string;
    stitched_total_pkr?: string;
    currency?: string;
    imageUrl?: string;
    size_length_m?: string;

    unit?: string;

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
  }>();

  const [guideOpen, setGuideOpen] = useState(false);
  const [dimensionsOpen, setDimensionsOpen] = useState(false);

  const returnTo = useMemo(
    () => (params.returnTo ? String(params.returnTo) : "/flow/purchase/size"),
    [params.returnTo],
  );

  const nextAfterSave = useMemo(
    () =>
      params.nextAfterSave
        ? String(params.nextAfterSave)
        : "/flow/purchase/place-order",
    [params.nextAfterSave],
  );

  const productCategory = useMemo(
    () => norm(params.product_category),
    [params.product_category],
  );
  const isUnstitched = useMemo(
    () => isUnstitchedCategory(productCategory),
    [productCategory],
  );

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
    const order = [...STANDARD_SIZES];
    return order.filter(
      (size) => getFabricLengthFromSize(size, sizeLengthMap) > 0,
    );
  }, [sizeLengthMap]);

  const candidateSizes = useMemo<StandardSize[]>(() => {
    if (isUnstitched && availableUnstitchedSizes.length)
      return availableUnstitchedSizes;
    return [...STANDARD_SIZES];
  }, [availableUnstitchedSizes, isUnstitched]);

  const initialUnit: Unit = useMemo(() => {
    const u = norm(params.unit).toLowerCase();
    return u === "in" ? "in" : "cm";
  }, [params.unit]);

  const [unit, setUnit] = useState<Unit>(initialUnit);
  const unitSuffix = useMemo(
    () => (unit === "in" ? " (inch)" : " (cm)"),
    [unit],
  );

  const [m1, setM1] = useState(norm(params.m1));
  const [m2, setM2] = useState(norm(params.m2));
  const [m3, setM3] = useState(norm(params.m3));
  const [m4, setM4] = useState(norm(params.m4));
  const [m5, setM5] = useState(norm(params.m5));
  const [m6, setM6] = useState(norm(params.m6));
  const [m7, setM7] = useState(norm(params.m7));
  const [m8, setM8] = useState(norm(params.m8));
  const [m9, setM9] = useState(norm(params.m9));
  const [m10, setM10] = useState(norm(params.m10));
  const [m11, setM11] = useState(norm(params.m11));
  const [m12, setM12] = useState(norm(params.m12));
  const [m13, setM13] = useState(norm(params.m13));
  const [m14, setM14] = useState(norm(params.m14));
  const [m15, setM15] = useState(norm(params.m15));
  const [m16, setM16] = useState(norm(params.m16));
  const [m17, setM17] = useState(norm(params.m17));

  const [customLabel1, setCustomLabel1] = useState(
    safeDecode(params.custom_label_1),
  );
  const [customValue1, setCustomValue1] = useState(
    safeDecode(params.custom_value_1),
  );
  const [customLabel2, setCustomLabel2] = useState(
    safeDecode(params.custom_label_2),
  );
  const [customValue2, setCustomValue2] = useState(
    safeDecode(params.custom_value_2),
  );
  const [customLabel3, setCustomLabel3] = useState(
    safeDecode(params.custom_label_3),
  );
  const [customValue3, setCustomValue3] = useState(
    safeDecode(params.custom_value_3),
  );
  const [customLabel4, setCustomLabel4] = useState(
    safeDecode(params.custom_label_4),
  );
  const [customValue4, setCustomValue4] = useState(
    safeDecode(params.custom_value_4),
  );

  const measures: Record<MeasureKey, string> = {
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

  const exactValues = Object.values(measures);
  const exactHasAny = exactValues.some((x) => norm(x).length > 0);
  const invalidCore = exactValues.some((x) => !isValidNumberOrEmpty(x));

  const customRows = [
    { idx: 1, label: customLabel1, value: customValue1 },
    { idx: 2, label: customLabel2, value: customValue2 },
    { idx: 3, label: customLabel3, value: customValue3 },
    { idx: 4, label: customLabel4, value: customValue4 },
  ];

  const [debouncedMeasures, setDebouncedMeasures] = useState(measures);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedMeasures(measures);
    }, 180);

    return () => clearTimeout(id);
  }, [measures]);

  const invalidCustom = customRows.some(
    (row) =>
      (norm(row.label).length > 0 || norm(row.value).length > 0) &&
      (!norm(row.label).length || !isValidNumberOrEmpty(row.value)),
  );

  const inferred = useMemo(() => {
    return inferNearestSize({
      unit,
      measures: debouncedMeasures,
      candidateSizes,
    });
  }, [candidateSizes, debouncedMeasures, unit]);

  const baseFabricLengthM = useMemo(() => {
    if (!isUnstitched || !inferred.size) return 0;
    return getFabricLengthFromSize(inferred.size, sizeLengthMap);
  }, [inferred.size, isUnstitched, sizeLengthMap]);

  const verticalAdjustmentM = useMemo(() => {
    if (!isUnstitched || !inferred.size) return 0;
    return computeVerticalAdjustmentMeters({
      unit,
      measures: debouncedMeasures,
      size: inferred.size,
    });
  }, [inferred.size, isUnstitched, debouncedMeasures, unit]);

  const finalFabricLengthM = useMemo(() => {
    if (!isUnstitched) return 0;
    if (baseFabricLengthM <= 0) return 0;
    return round2(baseFabricLengthM + verticalAdjustmentM);
  }, [baseFabricLengthM, isUnstitched, verticalAdjustmentM]);

  const fabricCostPkr = useMemo(() => {
    if (!isUnstitched || finalFabricLengthM <= 0 || pricePerMeterPkr <= 0)
      return 0;
    return Math.round(finalFabricLengthM * pricePerMeterPkr);
  }, [finalFabricLengthM, isUnstitched, pricePerMeterPkr]);

  const includedDimensionList = useMemo<ExactMeasurementSheetRow[]>(() => {
    const standardRows = (Object.keys(MEASURE_LABELS) as MeasureKey[])
      .map((key, index) => ({
        order: index + 1,
        label: `${MEASURE_LABELS[key].code}. ${MEASURE_LABELS[key].title}`,
        value: measures[key],
      }))
      .filter((row) => norm(row.value).length > 0);

    const custom = customRows
      .map((row) => ({
        order: 100 + row.idx,
        label: row.label.trim(),
        value: row.value.trim(),
      }))
      .filter((row) => row.label && row.value);

    return [...standardRows, ...custom].sort((a, b) => a.order - b.order);
  }, [customRows, measures]);

  const onSave = () => {
    if (!exactHasAny || invalidCore || invalidCustom) return;

    router.replace({
      pathname: nextAfterSave as any,
      params: {
        ...(params as any),
        mode: "exact",
        unit,

        selectedSize: inferred.size || "",
        selected_unstitched_size:
          isUnstitched && inferred.size
            ? encodeURIComponent(inferred.size)
            : "",
        selected_fabric_length_m:
          isUnstitched && finalFabricLengthM > 0
            ? encodeURIComponent(String(finalFabricLengthM))
            : "",
        fabric_cost_pkr:
          isUnstitched && fabricCostPkr > 0 ? String(fabricCostPkr) : "",

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

        custom_label_1: customLabel1
          ? encodeURIComponent(customLabel1.trim())
          : "",
        custom_value_1: customValue1
          ? encodeURIComponent(customValue1.trim())
          : "",
        custom_label_2: customLabel2
          ? encodeURIComponent(customLabel2.trim())
          : "",
        custom_value_2: customValue2
          ? encodeURIComponent(customValue2.trim())
          : "",
        custom_label_3: customLabel3
          ? encodeURIComponent(customLabel3.trim())
          : "",
        custom_value_3: customValue3
          ? encodeURIComponent(customValue3.trim())
          : "",
        custom_label_4: customLabel4
          ? encodeURIComponent(customLabel4.trim())
          : "",
        custom_value_4: customValue4
          ? encodeURIComponent(customValue4.trim())
          : "",
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
        <Text style={styles.title}>Exact Measurements</Text>

        {!!productCategory ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Category:{" "}
              <Text style={styles.summaryStrong}>
                {prettyCategory(productCategory)}
              </Text>
            </Text>

            {isUnstitched ? (
              <Text style={styles.summaryText}>
                Cost per meter:{" "}
                <Text style={styles.summaryStrong}>
                  PKR {pricePerMeterPkr || 0} / meter
                </Text>
              </Text>
            ) : (
              <Text style={styles.summaryText}>
                Product total:{" "}
                <Text style={styles.summaryStrong}>
                  PKR {stitchedTotalPkr || 0}
                </Text>
              </Text>
            )}
          </View>
        ) : null}

        <BodyMeasurePhoto onOpen={() => setGuideOpen(true)} />

        <Text style={styles.helper}>Enter the measurements.</Text>

        <View style={styles.unitRow}>
          <Pressable
            onPress={() => setUnit("cm")}
            style={[styles.unitPill, unit === "cm" ? styles.unitActive : null]}
          >
            <Text
              style={[
                styles.unitText,
                unit === "cm" ? styles.unitTextActive : null,
              ]}
            >
              cm
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setUnit("in")}
            style={[styles.unitPill, unit === "in" ? styles.unitActive : null]}
          >
            <Text
              style={[
                styles.unitText,
                unit === "in" ? styles.unitTextActive : null,
              ]}
            >
              inch
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Main measurements (1–17)</Text>

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

              return (
                <MeasureRow
                  key={key}
                  code={MEASURE_LABELS[key].code}
                  value={valueMap[key]}
                  onChange={setterMap[key]}
                  placeholder={getPlaceholderForMeasure(key, unit)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Custom dimensions</Text>

          <CustomRow
            index={1}
            label={customLabel1}
            value={customValue1}
            onLabelChange={setCustomLabel1}
            onValueChange={setCustomValue1}
            unitSuffix={unitSuffix}
          />
          <CustomRow
            index={2}
            label={customLabel2}
            value={customValue2}
            onLabelChange={setCustomLabel2}
            onValueChange={setCustomValue2}
            unitSuffix={unitSuffix}
          />
          <CustomRow
            index={3}
            label={customLabel3}
            value={customValue3}
            onLabelChange={setCustomLabel3}
            onValueChange={setCustomValue3}
            unitSuffix={unitSuffix}
          />
          <CustomRow
            index={4}
            label={customLabel4}
            value={customValue4}
            onLabelChange={setCustomLabel4}
            onValueChange={setCustomValue4}
            unitSuffix={unitSuffix}
          />
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Estimated result</Text>

          <Text style={styles.resultLine}>
            Nearest standard size:{" "}
            <Text style={styles.resultStrong}>
              {inferred.size || "Not enough data"}
            </Text>
          </Text>

          <Text style={styles.resultLine}>
            Confidence:{" "}
            <Text style={styles.resultStrong}>{inferred.confidence}</Text>
          </Text>

          {isUnstitched ? (
            <>
              <Text style={styles.resultLine}>
                Base fabric length:{" "}
                <Text style={styles.resultStrong}>
                  {baseFabricLengthM || 0} m
                </Text>
              </Text>

              <Text style={styles.resultLine}>
                Length margin added:{" "}
                <Text style={styles.resultStrong}>
                  {verticalAdjustmentM || 0} m
                </Text>
              </Text>

              <Text style={styles.resultLine}>
                Final fabric length:{" "}
                <Text style={styles.resultStrong}>
                  {finalFabricLengthM || 0} m
                </Text>
              </Text>

              <Text style={styles.resultLine}>
                Fabric cost:{" "}
                <Text style={styles.resultStrong}>
                  PKR {fabricCostPkr || 0}
                </Text>
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dimensions preview</Text>
          {includedDimensionList.length ? (
            <View style={styles.inlineActionRow}>
              <Text style={styles.helper}>
                {includedDimensionList.length} dimensions ready
              </Text>
              <Pressable
                onPress={() => setDimensionsOpen(true)}
                style={styles.secondaryInlineBtn}
              >
                <Text style={styles.secondaryInlineText}>
                  View Dimensions List
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.helper}>No dimensions entered yet.</Text>
          )}
        </View>

        <Pressable onPress={onSave} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Save exact measurements</Text>
        </Pressable>

        {!exactHasAny ? (
          <Text style={styles.validation}>
            Enter at least one valid measurement to continue.
          </Text>
        ) : null}

        {invalidCore ? (
          <Text style={styles.validation}>
            Main measurements must be valid positive numbers or blank.
          </Text>
        ) : null}

        {invalidCustom ? (
          <Text style={styles.validation}>
            Each custom dimension needs both a label and a valid positive value.
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.replace(returnTo as any)}
          style={styles.closeBtn}
        >
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </ScrollView>

      <ExactMeasurementsModal
        visible={dimensionsOpen}
        onClose={() => setDimensionsOpen(false)}
        title="Dimensions List"
        rows={includedDimensionList}
        inferredSize={inferred.size || ""}
        unit={unit}
        fabricLengthM={finalFabricLengthM}
        fabricCostPkr={fabricCostPkr}
        showGuideImage
      />

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

              <Pressable
                onPress={() => setGuideOpen(false)}
                style={styles.modalCloseBtn}
              >
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
                  source={require("../../../../assets/body measurement chart.jpg")}
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

const MeasureRow = React.memo(function MeasureRow({
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
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{code}.</Text>
      <TextInput
        value={localValue}
        onChangeText={setLocalValue}
        onBlur={() => onChange(localValue)}
        placeholder={placeholder}
        placeholderTextColor={stylesVars.placeholder}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
});

function CustomRow({
  index,
  label,
  value,
  onLabelChange,
  onValueChange,
  unitSuffix,
}: {
  index: number;
  label: string;
  value: string;
  onLabelChange: (v: string) => void;
  onValueChange: (v: string) => void;
  unitSuffix: string;
}) {
  return (
    <View style={styles.customRow}>
      <Text style={styles.customIndex}>{index}.</Text>

      <View style={styles.customFields}>
        <TextInput
          value={label}
          onChangeText={onLabelChange}
          placeholder="Custom label"
          placeholderTextColor={stylesVars.placeholder}
          style={styles.input}
        />

        <TextInput
          value={value}
          onChangeText={onValueChange}
          placeholder={`Value${unitSuffix}`}
          placeholderTextColor={stylesVars.placeholder}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>
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
    fontSize: 20,
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

  customRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  customIndex: {
    width: 28,
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
    paddingTop: 10,
  },

  customFields: {
    flex: 1,
    gap: 10,
  },

  resultCard: {
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 14,
    backgroundColor: stylesVars.greenSoft,
    gap: 6,
  },

  resultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.green,
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

  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
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

  primaryBtn: {
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
