// File: app/purchase/size.tsx

import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type Mode = "standard" | "exact";
type Unit = "cm" | "in";

type MeasureKey =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o";

const MEASURE_LABELS: Record<MeasureKey, { code: string; title: string; hint: string }> = {
  a: { code: "A", title: "Neck circumference", hint: "Around base of neck" },
  b: { code: "B", title: "Shoulder width", hint: "Shoulder tip to shoulder tip" },
  c: { code: "C", title: "Bust / Chest circumference", hint: "Fullest bust/chest" },
  d: { code: "D", title: "Under-bust circumference", hint: "Just under bust" },
  e: { code: "E", title: "Waist circumference", hint: "Natural waist" },
  f: { code: "F", title: "Hips circumference", hint: "Fullest hips/seat" },
  g: { code: "G", title: "Shoulder to waist", hint: "Shoulder seam to waist" },
  h: { code: "H", title: "Sleeve length", hint: "Shoulder tip to wrist" },
  i: { code: "I", title: "Bicep circumference", hint: "Fullest upper arm" },
  j: { code: "J", title: "Wrist circumference", hint: "Around wrist bone" },
  k: { code: "K", title: "Full height", hint: "Top of head to floor" },
  l: { code: "L", title: "Waist to floor", hint: "Waist down to floor" },
  m: { code: "M", title: "Inseam", hint: "Crotch to ankle/floor" },
  n: { code: "N", title: "Outseam", hint: "Waist to ankle/floor (outside)" },
  o: { code: "O", title: "Thigh circumference", hint: "Fullest upper thigh" },
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

function BodyMeasureSvg() {
  const BLUE = "#1E5EFF";
  const RED = "#D11F1F";
  const GREEN = "#138A36";
  const OUTLINE = "#111";

  const labelFill = (c: string) => c;

  return (
    <View style={styles.svgCard}>
      <Text style={styles.svgTitle}>Measure Guide (A–O)</Text>

      <Svg width="100%" height={440} viewBox="0 0 360 580">
        <Circle cx="180" cy="60" r="30" stroke={OUTLINE} strokeWidth="2" fill="none" />
        <Path d="M165 88 C170 100, 190 100, 195 88" stroke={OUTLINE} strokeWidth="2" fill="none" />

        <Path
          d="
            M 125 128
            C 145 112, 160 108, 180 108
            C 200 108, 215 112, 235 128

            C 250 142, 252 165, 248 195
            C 244 220, 238 235, 236 252

            C 233 278, 240 295, 254 312
            C 268 328, 268 350, 255 370
            C 240 395, 234 420, 234 460
            C 234 498, 224 525, 210 538
            C 198 548, 190 544, 186 536

            C 182 528, 182 504, 180 488
            C 178 504, 178 528, 174 536
            C 170 544, 162 548, 150 538
            C 136 525, 126 498, 126 460
            C 126 420, 120 395, 105 370
            C 92 350, 92 328, 106 312
            C 120 295, 127 278, 124 252

            C 122 235, 116 220, 112 195
            C 108 165, 110 142, 125 128
          "
          stroke={OUTLINE}
          strokeWidth="2"
          fill="none"
        />

        <Path
          d="
            M 105 146
            C 75 176, 72 225, 82 265
            C 90 300, 90 330, 82 360
          "
          stroke={OUTLINE}
          strokeWidth="2"
          fill="none"
        />
        <Path
          d="
            M 255 146
            C 285 176, 288 225, 278 265
            C 270 300, 270 330, 278 360
          "
          stroke={OUTLINE}
          strokeWidth="2"
          fill="none"
        />

        <Line x1="160" y1="98" x2="200" y2="98" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="160" cy="98" r="3.5" fill={GREEN} />
        <Circle cx="200" cy="98" r="3.5" fill={GREEN} />
        <Line x1="200" y1="98" x2="285" y2="98" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="103" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          A
        </SvgText>

        <Line x1="138" y1="132" x2="222" y2="132" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="138" cy="132" r="3.5" fill={GREEN} />
        <Circle cx="222" cy="132" r="3.5" fill={GREEN} />
        <Line x1="222" y1="132" x2="285" y2="132" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="137" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          B
        </SvgText>

        <Line x1="140" y1="194" x2="220" y2="194" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="140" cy="194" r="3.5" fill={GREEN} />
        <Circle cx="220" cy="194" r="3.5" fill={GREEN} />
        <Line x1="220" y1="194" x2="285" y2="194" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="199" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          C
        </SvgText>

        <Line x1="148" y1="224" x2="212" y2="224" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="148" cy="224" r="3.5" fill={GREEN} />
        <Circle cx="212" cy="224" r="3.5" fill={GREEN} />
        <Line x1="212" y1="224" x2="285" y2="224" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="229" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          D
        </SvgText>

        <Line x1="118" y1="266" x2="242" y2="266" stroke={GREEN} strokeWidth="3" />
        <Circle cx="118" cy="266" r="3.8" fill={GREEN} />
        <Circle cx="242" cy="266" r="3.8" fill={GREEN} />
        <Line x1="242" y1="266" x2="285" y2="266" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="271" fontSize="16" fontWeight="900" fill={labelFill(GREEN)}>
          E
        </SvgText>

        <Line x1="120" y1="322" x2="240" y2="322" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="120" cy="322" r="3.5" fill={GREEN} />
        <Circle cx="240" cy="322" r="3.5" fill={GREEN} />
        <Line x1="240" y1="322" x2="285" y2="322" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="327" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          F
        </SvgText>

        <Line x1="140" y1="372" x2="220" y2="372" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="140" cy="372" r="3.5" fill={GREEN} />
        <Circle cx="220" cy="372" r="3.5" fill={GREEN} />
        <Line x1="220" y1="372" x2="285" y2="372" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="377" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          O
        </SvgText>

        <Line x1="62" y1="132" x2="62" y2="266" stroke={RED} strokeWidth="2.5" />
        <Circle cx="62" cy="132" r="3.5" fill={RED} />
        <Circle cx="62" cy="266" r="3.5" fill={RED} />
        <Line x1="62" y1="200" x2="98" y2="200" stroke={RED} strokeWidth="1.8" />
        <SvgText x="40" y="205" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          G
        </SvgText>

        <Line x1="304" y1="150" x2="304" y2="360" stroke={RED} strokeWidth="2.5" />
        <Circle cx="304" cy="150" r="3.5" fill={RED} />
        <Circle cx="304" cy="360" r="3.5" fill={RED} />
        <SvgText x="318" y="262" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          H
        </SvgText>

        <Line x1="78" y1="220" x2="112" y2="220" stroke={BLUE} strokeWidth="2.5" />
        <Circle cx="78" cy="220" r="3.5" fill={BLUE} />
        <Circle cx="112" cy="220" r="3.5" fill={BLUE} />
        <Line x1="78" y1="220" x2="44" y2="220" stroke={BLUE} strokeWidth="1.8" />
        <SvgText x="26" y="225" fontSize="16" fontWeight="800" fill={labelFill(BLUE)}>
          I
        </SvgText>

        <Line x1="84" y1="356" x2="108" y2="356" stroke={BLUE} strokeWidth="2.5" />
        <Circle cx="84" cy="356" r="3.5" fill={BLUE} />
        <Circle cx="108" cy="356" r="3.5" fill={BLUE} />
        <Line x1="84" y1="356" x2="44" y2="356" stroke={BLUE} strokeWidth="1.8" />
        <SvgText x="26" y="361" fontSize="16" fontWeight="800" fill={labelFill(BLUE)}>
          J
        </SvgText>

        <Line x1="334" y1="28" x2="334" y2="540" stroke={RED} strokeWidth="2.5" />
        <SvgText x="346" y="295" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          K
        </SvgText>

        <Line x1="318" y1="266" x2="318" y2="540" stroke={RED} strokeWidth="2.5" />
        <SvgText x="330" y="430" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          L
        </SvgText>

        <Line x1="180" y1="352" x2="180" y2="522" stroke={RED} strokeWidth="2.5" />
        <Circle cx="180" cy="352" r="3.5" fill={RED} />
        <Circle cx="180" cy="522" r="3.5" fill={RED} />
        <Line x1="180" y1="438" x2="214" y2="438" stroke={RED} strokeWidth="1.8" />
        <SvgText x="224" y="443" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          M
        </SvgText>

        <Line x1="244" y1="266" x2="244" y2="522" stroke={RED} strokeWidth="2.5" />
        <Circle cx="244" cy="266" r="3.5" fill={RED} />
        <Circle cx="244" cy="522" r="3.5" fill={RED} />
        <Line x1="244" y1="394" x2="285" y2="394" stroke={RED} strokeWidth="1.8" />
        <SvgText x="296" y="399" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          N
        </SvgText>
      </Svg>

      <View style={styles.legend}>
        <Text style={styles.legendText}>A Neck</Text>
        <Text style={styles.legendText}>B Shoulder</Text>
        <Text style={styles.legendText}>C Bust</Text>
        <Text style={styles.legendText}>D Under-bust</Text>
        <Text style={styles.legendText}>E Waist</Text>
        <Text style={styles.legendText}>F Hips</Text>
        <Text style={styles.legendText}>O Thigh</Text>
        <Text style={styles.legendText}>G Shoulder→Waist</Text>
        <Text style={styles.legendText}>H Sleeve length</Text>
        <Text style={styles.legendText}>I Bicep</Text>
        <Text style={styles.legendText}>J Wrist</Text>
        <Text style={styles.legendText}>K Height</Text>
        <Text style={styles.legendText}>L Waist→Floor</Text>
        <Text style={styles.legendText}>M Inseam</Text>
        <Text style={styles.legendText}>N Outseam</Text>
      </View>
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

  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  f?: string;
  g?: string;
  h?: string;
  i?: string;
  j?: string;
  k?: string;
  l?: string;
  m?: string;
  n?: string;
  o?: string;
}>();

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

  const [a, setA] = useState<string>(norm(params.a));
  const [b, setB] = useState<string>(norm(params.b));
  const [c, setC] = useState<string>(norm(params.c));
  const [d, setD] = useState<string>(norm(params.d));
  const [e, setE] = useState<string>(norm(params.e));
  const [f, setF] = useState<string>(norm(params.f));
  const [g, setG] = useState<string>(norm(params.g));
  const [h, setH] = useState<string>(norm(params.h));
  const [i, setI] = useState<string>(norm(params.i));
  const [j, setJ] = useState<string>(norm(params.j));
  const [k, setK] = useState<string>(norm(params.k));
  const [l, setL] = useState<string>(norm(params.l));
  const [m, setM] = useState<string>(norm(params.m));
  const [n, setN] = useState<string>(norm(params.n));
  const [o, setO] = useState<string>(norm(params.o));

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

  const exactHasAny = [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o].some(
    (x) => norm(x).length > 0,
  );

  const invalid =
    !isValidNumberOrEmpty(a) ||
    !isValidNumberOrEmpty(b) ||
    !isValidNumberOrEmpty(c) ||
    !isValidNumberOrEmpty(d) ||
    !isValidNumberOrEmpty(e) ||
    !isValidNumberOrEmpty(f) ||
    !isValidNumberOrEmpty(g) ||
    !isValidNumberOrEmpty(h) ||
    !isValidNumberOrEmpty(i) ||
    !isValidNumberOrEmpty(j) ||
    !isValidNumberOrEmpty(k) ||
    !isValidNumberOrEmpty(l) ||
    !isValidNumberOrEmpty(m) ||
    !isValidNumberOrEmpty(n) ||
    !isValidNumberOrEmpty(o);

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
      a: "",
      b: "",
      c: "",
      d: "",
      e: "",
      f: "",
      g: "",
      h: "",
      i: "",
      j: "",
      k: "",
      l: "",
      m: "",
      n: "",
      o: "",
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
      a: a.trim(),
      b: b.trim(),
      c: c.trim(),
      d: d.trim(),
      e: e.trim(),
      f: f.trim(),
      g: g.trim(),
      h: h.trim(),
      i: i.trim(),
      j: j.trim(),
      k: k.trim(),
      l: l.trim(),
      m: m.trim(),
      n: n.trim(),
      o: o.trim(),
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
          <Text style={[styles.toggleText, mode === "standard" ? styles.toggleTextActive : null]}>
            Standard
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode("exact")}
          style={[styles.toggleBtn, mode === "exact" ? styles.toggleActive : null]}
        >
          <Text style={[styles.toggleText, mode === "exact" ? styles.toggleTextActive : null]}>
            Exact (A–O)
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
                Cost per meter: <Text style={styles.costStrong}>PKR {pricePerMeterPkr} / meter</Text>
              </Text>
              <Text style={styles.costLine}>
                Selected size: <Text style={styles.costStrong}>{selectedStandardSize}</Text>
              </Text>
              <Text style={styles.costLine}>
                Fabric length: <Text style={styles.costStrong}>{previewLengthM} meter(s)</Text>
              </Text>
              <Text style={styles.costLine}>
                Total fabric cost: <Text style={styles.costStrong}>PKR {previewFabricCostPkr}</Text>
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.exactWrap}>
          <BodyMeasureSvg />

          <Text style={styles.helper}>
            Enter measurements in one unit only. Standard size is better for quick checkout. Exact
            measurements are mainly useful where stitching/tailoring is involved.
          </Text>

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
                a,
                b,
                c,
                d,
                e,
                f,
                g,
                h,
                i,
                j,
                k,
                l,
                m,
                n,
                o,
              };

              const setterMap: Record<MeasureKey, (v: string) => void> = {
                a: setA,
                b: setB,
                c: setC,
                d: setD,
                e: setE,
                f: setF,
                g: setG,
                h: setH,
                i: setI,
                j: setJ,
                k: setK,
                l: setL,
                m: setM,
                n: setN,
                o: setO,
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
      <Text style={styles.inputLabel}>{code}</Text>
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

  svgTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    color: stylesVars.text,
  },

  legend: {
    marginTop: 8,
    gap: 4,
  },

  legendText: {
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
    width: 24,
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
});