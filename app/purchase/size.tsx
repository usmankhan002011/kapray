// app/purchase/size.tsx
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;

type Mode = "standard" | "exact";
type Unit = "cm" | "in";

type MeasureKey =
  | "a" // Neck
  | "b" // Shoulder width
  | "c" // Bust/Chest
  | "d" // Under-bust
  | "e" // Waist
  | "f" // Hips
  | "g" // Shoulder to waist
  | "h" // Sleeve length
  | "i" // Bicep
  | "j" // Wrist
  | "k" // Height
  | "l" // Waist to floor
  | "m" // Inseam
  | "n" // Outseam
  | "o"; // Thigh circumference

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
  o: { code: "O", title: "Thigh circumference", hint: "Fullest upper thigh" }
};

function BodyMeasureSvg() {
  // Color rule:
  // - Waist lines: BLUE
  // - Length lines: RED (G, H, K, L, M, N)
  // - Others: GREEN (A, B, C, D, F, I, J)
  const BLUE = "#1E5EFF";
  const RED = "#D11F1F";
  const GREEN = "#138A36";
  const OUTLINE = "#111";

  const labelFill = (c: string) => c; // keep labels same color as their line

  return (
    <View style={styles.svgCard}>
      <Text style={styles.svgTitle}>Measure Guide (A–N)</Text>

      {/* wider viewBox so labels never clip */}
      <Svg width="100%" height={440} viewBox="0 0 360 580">
        {/* ===== silhouette: more feminine waist/hip contour ===== */}
        {/* Head */}
        <Circle cx="180" cy="60" r="30" stroke={OUTLINE} strokeWidth="2" fill="none" />
        {/* Neck */}
        <Path d="M165 88 C170 100, 190 100, 195 88" stroke={OUTLINE} strokeWidth="2" fill="none" />

        {/* Body (narrower waist, wider hips) */}
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

        {/* ===== Arms separated from body (gap) ===== */}
        {/* Left arm (separated) */}
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
        {/* Right arm (separated) */}
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

        {/* ===== helper: anchor dot ===== */}
        {/*
          We use dots at endpoints to make it “measurement-like”.
        */}

        {/* ===== A: Neck circumference (GREEN) ===== */}
        <Line x1="160" y1="98" x2="200" y2="98" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="160" cy="98" r="3.5" fill={GREEN} />
        <Circle cx="200" cy="98" r="3.5" fill={GREEN} />
        <Line x1="200" y1="98" x2="285" y2="98" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="103" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          A
        </SvgText>

        {/* ===== B: Shoulder width (GREEN) ===== */}
        <Line x1="138" y1="132" x2="222" y2="132" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="138" cy="132" r="3.5" fill={GREEN} />
        <Circle cx="222" cy="132" r="3.5" fill={GREEN} />
        <Line x1="222" y1="132" x2="285" y2="132" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="137" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          B
        </SvgText>

        {/* ===== C: Bust / Chest (GREEN) ===== */}
        <Line x1="140" y1="194" x2="220" y2="194" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="140" cy="194" r="3.5" fill={GREEN} />
        <Circle cx="220" cy="194" r="3.5" fill={GREEN} />
        <Line x1="220" y1="194" x2="285" y2="194" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="199" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          C
        </SvgText>

        {/* ===== D: Under-bust (GREEN) ===== */}
        <Line x1="148" y1="224" x2="212" y2="224" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="148" cy="224" r="3.5" fill={GREEN} />
        <Circle cx="212" cy="224" r="3.5" fill={GREEN} />
        <Line x1="212" y1="224" x2="285" y2="224" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="229" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          D
        </SvgText>

        {/* ===== E: Waist (GREEN) — expanded edge-to-edge ===== */}
        <Line x1="118" y1="266" x2="242" y2="266" stroke={GREEN} strokeWidth="3" />
        <Circle cx="118" cy="266" r="3.8" fill={GREEN} />
        <Circle cx="242" cy="266" r="3.8" fill={GREEN} />
        <Line x1="242" y1="266" x2="285" y2="266" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="271" fontSize="16" fontWeight="900" fill={labelFill(GREEN)}>
          E
        </SvgText>

        {/* ===== F: Hips (GREEN) — wider ===== */}
        <Line x1="120" y1="322" x2="240" y2="322" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="120" cy="322" r="3.5" fill={GREEN} />
        <Circle cx="240" cy="322" r="3.5" fill={GREEN} />
        <Line x1="240" y1="322" x2="285" y2="322" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="327" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          F
        </SvgText>

        {/* ===== O: Thigh circumference (GREEN) ===== */}
        <Line x1="140" y1="372" x2="220" y2="372" stroke={GREEN} strokeWidth="2.5" />
        <Circle cx="140" cy="372" r="3.5" fill={GREEN} />
        <Circle cx="220" cy="372" r="3.5" fill={GREEN} />
        <Line x1="220" y1="372" x2="285" y2="372" stroke={GREEN} strokeWidth="1.8" />
        <SvgText x="296" y="377" fontSize="16" fontWeight="800" fill={labelFill(GREEN)}>
          O
        </SvgText>

        {/* ===== G: Shoulder to waist (RED) ===== */}
        <Line x1="62" y1="132" x2="62" y2="266" stroke={RED} strokeWidth="2.5" />
        <Circle cx="62" cy="132" r="3.5" fill={RED} />
        <Circle cx="62" cy="266" r="3.5" fill={RED} />
        <Line x1="62" y1="200" x2="98" y2="200" stroke={RED} strokeWidth="1.8" />
        <SvgText x="40" y="205" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          G
        </SvgText>

        {/* ===== H: Sleeve length (RED) — shoulder → wrist (arm separated) ===== */}
        <Line x1="304" y1="150" x2="304" y2="360" stroke={RED} strokeWidth="2.5" />
        <Circle cx="304" cy="150" r="3.5" fill={RED} />
        <Circle cx="304" cy="360" r="3.5" fill={RED} />
        <SvgText x="318" y="262" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          H
        </SvgText>

        {/* ===== I: Bicep circumference (BLUE) — on separated left arm ===== */}
        <Line x1="78" y1="220" x2="112" y2="220" stroke={BLUE} strokeWidth="2.5" />
        <Circle cx="78" cy="220" r="3.5" fill={BLUE} />
        <Circle cx="112" cy="220" r="3.5" fill={BLUE} />
        <Line x1="78" y1="220" x2="44" y2="220" stroke={BLUE} strokeWidth="1.8" />
        <SvgText x="26" y="225" fontSize="16" fontWeight="800" fill={labelFill(BLUE)}>
          I
        </SvgText>

        {/* ===== J: Wrist circumference (BLUE) — on separated left arm ===== */}
        <Line x1="84" y1="356" x2="108" y2="356" stroke={BLUE} strokeWidth="2.5" />
        <Circle cx="84" cy="356" r="3.5" fill={BLUE} />
        <Circle cx="108" cy="356" r="3.5" fill={BLUE} />
        <Line x1="84" y1="356" x2="44" y2="356" stroke={BLUE} strokeWidth="1.8" />
        <SvgText x="26" y="361" fontSize="16" fontWeight="800" fill={labelFill(BLUE)}>
          J
        </SvgText>

        {/* ===== K: Full height (RED) ===== */}
        <Line x1="334" y1="28" x2="334" y2="540" stroke={RED} strokeWidth="2.5" />
        <SvgText x="346" y="295" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          K
        </SvgText>

        {/* ===== L: Waist to floor (RED) ===== */}
        <Line x1="318" y1="266" x2="318" y2="540" stroke={RED} strokeWidth="2.5" />
        <SvgText x="330" y="430" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          L
        </SvgText>

        {/* ===== M: Inseam (RED) — crotch → ankle (inner) ===== */}
        <Line x1="180" y1="352" x2="180" y2="522" stroke={RED} strokeWidth="2.5" />
        <Circle cx="180" cy="352" r="3.5" fill={RED} />
        <Circle cx="180" cy="522" r="3.5" fill={RED} />
        <Line x1="180" y1="438" x2="214" y2="438" stroke={RED} strokeWidth="1.8" />
        <SvgText x="224" y="443" fontSize="16" fontWeight="800" fill={labelFill(RED)}>
          M
        </SvgText>

        {/* ===== N: Outseam (RED) — waist → ankle (outside) ===== */}
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

    // ✅ dress category passthrough (stitched/unstitched etc.)
    product_category?: string;

    price?: string;
    currency?: string;
    imageUrl?: string;

    dye_shade_id?: string;
    dye_hex?: string;
    dye_label?: string;
    dyeing_cost_pkr?: string;

    // ✅ tailoring passthrough
    tailoring_cost_pkr?: string;
    tailoring_turnaround_days?: string;

    selectedSize?: string;
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
    [params.returnTo]
  );

  const productId = useMemo(() => {
    const v = params.productId ?? params.product_id ?? "";
    return v ? String(v) : "";
  }, [params.productId, params.product_id]);

  const productCode = useMemo(() => {
    const v = params.productCode ?? params.product_code ?? "";
    return v ? String(v) : "";
  }, [params.productCode, params.product_code]);

  const initialMode: Mode = useMemo(() => {
    const m = params.mode ? String(params.mode) : "";
    return m === "exact" ? "exact" : "standard";
  }, [params.mode]);

  const [mode, setMode] = useState<Mode>(initialMode);

  const initialUnit: Unit = useMemo(() => {
    const u = (params.unit ? String(params.unit) : "").toLowerCase();
    return u === "in" ? "in" : "cm";
  }, [params.unit]);

  const [unit, setUnit] = useState<Unit>(initialUnit);

  const unitSuffix = useMemo(() => (unit === "in" ? " (inch)" : " (cm)"), [unit]);

  const [a, setA] = useState<string>(params.a ? String(params.a) : "");
  const [b, setB] = useState<string>(params.b ? String(params.b) : "");
  const [c, setC] = useState<string>(params.c ? String(params.c) : "");
  const [d, setD] = useState<string>(params.d ? String(params.d) : "");
  const [e, setE] = useState<string>(params.e ? String(params.e) : "");
  const [f, setF] = useState<string>(params.f ? String(params.f) : "");
  const [g, setG] = useState<string>(params.g ? String(params.g) : "");
  const [h, setH] = useState<string>(params.h ? String(params.h) : "");
  const [i, setI] = useState<string>(params.i ? String(params.i) : "");
  const [j, setJ] = useState<string>(params.j ? String(params.j) : "");
  const [k, setK] = useState<string>(params.k ? String(params.k) : "");
  const [l, setL] = useState<string>(params.l ? String(params.l) : "");
  const [m, setM] = useState<string>(params.m ? String(params.m) : "");
  const [n, setN] = useState<string>(params.n ? String(params.n) : "");
  const [o, setO] = useState<string>(params.o ? String(params.o) : "");

  const isValidNumberOrEmpty = (v: string) => {
    if (!v.trim()) return true;
    const num = Number(v);
    return Number.isFinite(num) && num > 0;
  };

  const goPlaceOrder = (p: Record<string, string>) => {
    router.replace({
      pathname: returnTo as any,
      params: {
        ...(params as any), // keep forwarded product + dye + tailoring params
        productId,
        productCode,

        // ✅ ensure canonical key exists for place-order
        product_category: (params as any)?.product_category ?? (params as any)?.productCategory ?? "",

        ...p
      }
    });
  };

  const onSelectStandard = (size: string) => {
    goPlaceOrder({
      mode: "standard",
      selectedSize: size,
      unit
    });
  };

  const onSaveExact = () => {
    const ok =
      isValidNumberOrEmpty(a) &&
      isValidNumberOrEmpty(b) &&
      isValidNumberOrEmpty(c) &&
      isValidNumberOrEmpty(d) &&
      isValidNumberOrEmpty(e) &&
      isValidNumberOrEmpty(f) &&
      isValidNumberOrEmpty(g) &&
      isValidNumberOrEmpty(h) &&
      isValidNumberOrEmpty(i) &&
      isValidNumberOrEmpty(j) &&
      isValidNumberOrEmpty(k) &&
      isValidNumberOrEmpty(l) &&
      isValidNumberOrEmpty(m) &&
      isValidNumberOrEmpty(n) &&
      isValidNumberOrEmpty(o);

    // require at least one measurement
    const hasAny = [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o].some(
      (x) => String(x ?? "").trim().length > 0
    );

    if (!ok || !hasAny) return;

    goPlaceOrder({
      mode: "exact",
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
      selectedSize: ""
    });
  };

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Select Size</Text>

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
            Exact (A–N)
          </Text>
        </Pressable>
      </View>

      {mode === "standard" ? (
        <View style={styles.sizeGrid}>
          {STANDARD_SIZES.map((s) => (
            <Pressable key={s} onPress={() => onSelectStandard(s)} style={styles.sizePill}>
              <Text style={styles.sizeText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.exactWrap}>
          <BodyMeasureSvg />

          <Text style={styles.helper}>
            Enter measurements (inches or cm — just be consistent). You can fill only what you know.
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
            <MeasureRow
              code="A"
              value={a}
              onChange={setA}
              placeholder={"Neck circumference" + unitSuffix}
            />
            <MeasureRow
              code="B"
              value={b}
              onChange={setB}
              placeholder={"Shoulder width" + unitSuffix}
            />
            <MeasureRow
              code="C"
              value={c}
              onChange={setC}
              placeholder={"Bust / Chest circumference" + unitSuffix}
            />
            <MeasureRow
              code="D"
              value={d}
              onChange={setD}
              placeholder={"Under-bust circumference" + unitSuffix}
            />
            <MeasureRow
              code="E"
              value={e}
              onChange={setE}
              placeholder={"Waist circumference" + unitSuffix}
            />
            <MeasureRow
              code="F"
              value={f}
              onChange={setF}
              placeholder={"Hips circumference" + unitSuffix}
            />
            <MeasureRow
              code="O"
              value={o}
              onChange={setO}
              placeholder={"Thigh circumference" + unitSuffix}
            />
            <MeasureRow
              code="G"
              value={g}
              onChange={setG}
              placeholder={"Shoulder to waist" + unitSuffix}
            />
            <MeasureRow
              code="H"
              value={h}
              onChange={setH}
              placeholder={"Sleeve length" + unitSuffix}
            />
            <MeasureRow
              code="I"
              value={i}
              onChange={setI}
              placeholder={"Bicep circumference" + unitSuffix}
            />
            <MeasureRow
              code="J"
              value={j}
              onChange={setJ}
              placeholder={"Wrist circumference" + unitSuffix}
            />
            <MeasureRow
              code="K"
              value={k}
              onChange={setK}
              placeholder={"Full height" + unitSuffix}
            />
            <MeasureRow
              code="L"
              value={l}
              onChange={setL}
              placeholder={"Waist to floor" + unitSuffix}
            />
            <MeasureRow code="M" value={m} onChange={setM} placeholder={"Inseam" + unitSuffix} />
            <MeasureRow
              code="N"
              value={n}
              onChange={setN}
              placeholder={"Outseam" + unitSuffix}
            />

            <Pressable onPress={onSaveExact} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>

            {invalid ? (
              <Text style={styles.validation}>
                Please enter valid positive numbers only (or leave blank).
              </Text>
            ) : null}
          </View>
        </View>
      )}

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

function MeasureRow({
  code,
  value,
  onChange,
  placeholder
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
        placeholderTextColor="#888"
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 16, paddingBottom: 28, gap: 12, backgroundColor: "#fff" },

  title: { fontSize: 18, fontWeight: "800", color: "#111" },

  toggleRow: { flexDirection: "row", gap: 10, marginTop: 6, flexWrap: "wrap" },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10
  },
  toggleActive: { backgroundColor: "#111" },
  toggleText: { fontSize: 14, fontWeight: "800", color: "#111" },
  toggleTextActive: { color: "#fff" },

  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8
  },
  sizePill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#111"
  },
  sizeText: { fontSize: 14, fontWeight: "900", color: "#111" },

  exactWrap: { gap: 10, marginTop: 8 },
  helper: { fontSize: 13, color: "#333", opacity: 0.85 },

  unitRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  unitPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#111"
  },
  unitActive: { backgroundColor: "#111" },
  unitText: { fontSize: 13, fontWeight: "900", color: "#111" },
  unitTextActive: { color: "#fff" },

  svgCard: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff"
  },
  svgTitle: { fontSize: 14, fontWeight: "900", marginBottom: 8, color: "#111" },
  legend: { marginTop: 8, gap: 4 },
  legendText: { fontSize: 12, color: "#111", opacity: 0.85 },

  inputs: { gap: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  inputLabel: { width: 24, fontSize: 16, fontWeight: "900", color: "#111" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff"
  },

  primaryBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "900" },
  validation: { fontSize: 12, color: "#b00020" },

  link: { fontSize: 16, textDecorationLine: "underline", marginTop: 8, color: "#111" }
});