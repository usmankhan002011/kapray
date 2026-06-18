import React, { useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, type TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles, apColors } from "@/components/product/addProductStyles";
import { getDeliveryCost } from "@/utils/kapray/delivery";
import { EXPORT_REGIONS } from "@/data/kapray/exportRegions";
import {
  AddProductCard,
  AddProductChip,
  AddProductField,
  AddProductFooter,
  AddProductInput,
  AddProductScreen,
  AddProductSecondaryButton,
} from "@/components/product/add-product/AddProductWizard";

type DimensionUnit = "cm" | "in";
type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

const CM_PER_INCH = 2.54;

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
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

function initialPositiveNumberText(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(v) : "";
}

function formatDimensionNumber(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

function positiveNumberFromText(text: string) {
  const n = Number(sanitizeNumber(text));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function dimensionToCm(text: string, unit: DimensionUnit) {
  const n = positiveNumberFromText(text);
  if (n <= 0) return 0;
  return unit === "in" ? n * CM_PER_INCH : n;
}

function getInitialDimensionUnit(spec: any): DimensionUnit {
  return spec?.package_dimension_unit === "in" ? "in" : "cm";
}

function initialDimensionText(spec: any, key: "length" | "width" | "height", unit: DimensionUnit) {
  if (unit === "in") {
    const fromIn = Number(spec?.package_in?.[key]);
    if (Number.isFinite(fromIn) && fromIn > 0) return formatDimensionNumber(fromIn);

    const fromCm = Number(spec?.package_cm?.[key]);
    return Number.isFinite(fromCm) && fromCm > 0
      ? formatDimensionNumber(fromCm / CM_PER_INCH)
      : "";
  }

  return initialPositiveNumberText(spec?.package_cm?.[key]);
}

function convertDimensionText(text: string, from: DimensionUnit, to: DimensionUnit) {
  if (from === to) return text;
  const n = positiveNumberFromText(text);
  if (n <= 0) return "";
  return formatDimensionNumber(from === "in" ? n * CM_PER_INCH : n / CM_PER_INCH);
}

export default function Q06CShipping() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const weightRef = useRef<TextInput>(null);
  const lengthRef = useRef<TextInput>(null);
  const widthRef = useRef<TextInput>(null);
  const heightRef = useRef<TextInput>(null);
  const previewCalculatedRef = useRef(false);

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;
  const category = inferCategoryFromDraft(draft);
  const isFabricByMeter =
    category === "unstitched_plain" || category === "unstitched_dyeing";

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        spec: { ...(prev?.spec ?? {}), ...patch },
      }));
      return;
    }

    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  const initialWeightText = useMemo(
    () =>
      initialPositiveNumberText(
        isFabricByMeter
          ? draft?.spec?.weight_per_meter_kg ?? draft?.spec?.weight_kg
          : draft?.spec?.weight_kg,
      ),
    [
      draft?.spec?.weight_kg,
      draft?.spec?.weight_per_meter_kg,
      isFabricByMeter,
    ],
  );
  const initialDimensionUnit = useMemo(
    () => getInitialDimensionUnit(draft?.spec),
    [draft?.spec],
  );
  const initialLengthText = useMemo(
    () => initialDimensionText(draft?.spec, "length", initialDimensionUnit),
    [draft?.spec, initialDimensionUnit],
  );
  const initialWidthText = useMemo(
    () => initialDimensionText(draft?.spec, "width", initialDimensionUnit),
    [draft?.spec, initialDimensionUnit],
  );
  const initialHeightText = useMemo(
    () => initialDimensionText(draft?.spec, "height", initialDimensionUnit),
    [draft?.spec, initialDimensionUnit],
  );

  const weightTextRef = useRef(initialWeightText);
  const lengthTextRef = useRef(initialLengthText);
  const widthTextRef = useRef(initialWidthText);
  const heightTextRef = useRef(initialHeightText);

  const [weight, setWeight] = useState<string>(initialWeightText);
  const [dimensionUnit, setDimensionUnit] =
    useState<DimensionUnit>(initialDimensionUnit);
  const [length, setLength] = useState<string>(initialLengthText);
  const [width, setWidth] = useState<string>(initialWidthText);
  const [height, setHeight] = useState<string>(initialHeightText);
  const [hasCalculatedPreview, setHasCalculatedPreview] = useState(false);

  const canContinue = useMemo(() => {
    return Boolean(vendorId);
  }, [vendorId]);
  const weightLabel = isFabricByMeter ? "Weight per meter (kg)" : "Weight (kg)";
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

  function syncPreviewState() {
    const nextWeight = weightTextRef.current;
    const nextLength = lengthTextRef.current;
    const nextWidth = widthTextRef.current;
    const nextHeight = heightTextRef.current;

    setWeight((prev) => (prev === nextWeight ? prev : nextWeight));
    setLength((prev) => (prev === nextLength ? prev : nextLength));
    setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    setHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }

  function markPreviewDirty() {
    if (!previewCalculatedRef.current) return;
    previewCalculatedRef.current = false;
    setHasCalculatedPreview(false);
  }

  const shippingPreview = useMemo(() => {
    const actualWeightKg = positiveNumberFromText(weight);
    const rawLengthCm = dimensionToCm(length, dimensionUnit);
    const rawWidthCm = dimensionToCm(width, dimensionUnit);
    const rawHeightCm = dimensionToCm(height, dimensionUnit);

    const safeActualWeightKg =
      Number.isFinite(actualWeightKg) && actualWeightKg > 0 ? actualWeightKg : 0;

    const lengthCm =
      Number.isFinite(rawLengthCm) && rawLengthCm > 0 ? Math.ceil(rawLengthCm) : 0;
    const widthCm =
      Number.isFinite(rawWidthCm) && rawWidthCm > 0 ? Math.ceil(rawWidthCm) : 0;
    const heightCm =
      Number.isFinite(rawHeightCm) && rawHeightCm > 0 ? Math.ceil(rawHeightCm) : 0;

    const dimensionalWeightKg =
      lengthCm > 0 && widthCm > 0 && heightCm > 0
        ? (lengthCm * widthCm * heightCm) / 5000
        : 0;

    const chargeableWeightKg = Math.max(safeActualWeightKg, dimensionalWeightKg);

    const roundedChargeableWeightKg =
      chargeableWeightKg > 0 ? Math.ceil(chargeableWeightKg * 2) / 2 : 0;

    const packageCm =
      lengthCm > 0 && widthCm > 0 && heightCm > 0
        ? { length: lengthCm, width: widthCm, height: heightCm }
        : undefined;

    const inlandAmountPkr =
      roundedChargeableWeightKg > 0
        ? getDeliveryCost({
            weightKg: safeActualWeightKg,
            packageCm,
            scope: "inland",
            regionOrCity: "Karachi",
          } as any)
        : null;

    const exportAmounts = EXPORT_REGIONS.map((region) => ({
      region,
      amountPkr:
        roundedChargeableWeightKg > 0
          ? getDeliveryCost({
              weightKg: safeActualWeightKg,
              packageCm,
              scope: "international",
              regionOrCity: region,
            } as any)
          : null,
    }));

    const volumetricRatio =
      safeActualWeightKg > 0 ? dimensionalWeightKg / safeActualWeightKg : 0;

    const efficiencyLevel =
      volumetricRatio >= 4 ? "red" : volumetricRatio >= 1.5 ? "yellow" : "green";

    const efficiencyLabel =
      efficiencyLevel === "red"
        ? "Poor packaging efficiency"
        : efficiencyLevel === "yellow"
          ? "Average packaging efficiency"
          : "Good packaging efficiency";

    const warningText =
      efficiencyLevel === "red"
        ? "Volumetric weight is dominating strongly. Courier cost may be much higher than physical weight suggests."
        : efficiencyLevel === "yellow"
          ? "Volumetric weight is affecting courier cost. Tighter packaging may reduce charges."
          : "";

    const suggestedHeightCm =
      lengthCm > 0 && widthCm > 0 && safeActualWeightKg > 0
        ? Math.max(1, Math.floor((safeActualWeightKg * 5000) / (lengthCm * widthCm)))
        : 0;

    const suggestedDimensionalWeightKg =
      lengthCm > 0 && widthCm > 0 && suggestedHeightCm > 0
        ? (lengthCm * widthCm * suggestedHeightCm) / 5000
        : 0;

    const suggestedChargeableWeightKg =
      suggestedDimensionalWeightKg > 0
        ? Math.ceil(Math.max(safeActualWeightKg, suggestedDimensionalWeightKg) * 2) / 2
        : 0;

    const heightReductionCm =
      suggestedHeightCm > 0 && heightCm > suggestedHeightCm ? heightCm - suggestedHeightCm : 0;

    const suggestionText =
      efficiencyLevel !== "green" &&
      suggestedChargeableWeightKg > 0 &&
      roundedChargeableWeightKg > suggestedChargeableWeightKg &&
      heightReductionCm > 0
        ? `Try reducing package height from ${heightCm} cm to about ${suggestedHeightCm} cm. Estimated chargeable weight may improve from ${roundedChargeableWeightKg.toFixed(1)} kg to ${suggestedChargeableWeightKg.toFixed(1)} kg.`
        : "";

    return {
      actualWeightKg: safeActualWeightKg,
      lengthCm,
      widthCm,
      heightCm,
      dimensionalWeightKg,
      chargeableWeightKg,
      roundedChargeableWeightKg,
      inlandAmountPkr,
      exportAmounts,
      volumetricRatio,
      efficiencyLevel,
      efficiencyLabel,
      warningText,
      suggestionText,
      suggestedChargeableWeightKg,
      suggestedHeightCm,
    };
  }, [dimensionUnit, height, length, weight, width]);

  useFocusEffect(
    React.useCallback(() => {
      const t = setTimeout(() => {
        weightRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }, [])
  );

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function onChangeDimensionUnit(nextUnit: DimensionUnit) {
    if (nextUnit === dimensionUnit) return;

    const nextLength = convertDimensionText(
      lengthTextRef.current,
      dimensionUnit,
      nextUnit,
    );
    const nextWidth = convertDimensionText(
      widthTextRef.current,
      dimensionUnit,
      nextUnit,
    );
    const nextHeight = convertDimensionText(
      heightTextRef.current,
      dimensionUnit,
      nextUnit,
    );

    lengthTextRef.current = nextLength;
    widthTextRef.current = nextWidth;
    heightTextRef.current = nextHeight;

    setLength(nextLength);
    setWidth(nextWidth);
    setHeight(nextHeight);
    setDimensionUnit(nextUnit);
    markPreviewDirty();
  }

  function readValidShippingValues() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return null;
    }

    const w = positiveNumberFromText(weightTextRef.current);
    const lengthInput = positiveNumberFromText(lengthTextRef.current);
    const widthInput = positiveNumberFromText(widthTextRef.current);
    const heightInput = positiveNumberFromText(heightTextRef.current);
    const l = dimensionToCm(lengthTextRef.current, dimensionUnit);
    const wi = dimensionToCm(widthTextRef.current, dimensionUnit);
    const h = dimensionToCm(heightTextRef.current, dimensionUnit);

    if (!Number.isFinite(w) || w <= 0) {
      Alert.alert("Invalid weight", "Enter valid weight in kg.");
      return null;
    }

    if (
      !Number.isFinite(l) ||
      l <= 0 ||
      !Number.isFinite(wi) ||
      wi <= 0 ||
      !Number.isFinite(h) ||
      h <= 0
    ) {
      Alert.alert("Invalid dimensions", "Enter valid package dimensions.");
      return null;
    }

    return { h, heightInput, l, lengthInput, w, wi, widthInput };
  }

  function onCalculate() {
    const values = readValidShippingValues();
    if (!values) return;

    syncPreviewState();
    previewCalculatedRef.current = true;
    setHasCalculatedPreview(true);
  }

  function onContinue() {
    const values = readValidShippingValues();
    if (!values) return;

    const { h, heightInput, l, lengthInput, w, wi, widthInput } = values;

    patchSpec({
      weight_kg: w,
      weight_per_meter_kg: isFabricByMeter ? w : null,
      shipping_weight_mode: isFabricByMeter ? "per_meter" : "per_order",
      package_dimension_unit: dimensionUnit,
      package_in:
        dimensionUnit === "in"
          ? { length: lengthInput, width: widthInput, height: heightInput }
          : null,
      package_cm: {
        length: Math.round(l * 100) / 100,
        width: Math.round(wi * 100) / 100,
        height: Math.round(h * 100) / 100,
      },
    });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q09-images" as any);
  }

  const efficiencyColor =
    shippingPreview.efficiencyLevel === "red"
      ? "#B91C1C"
      : shippingPreview.efficiencyLevel === "yellow"
        ? "#B45309"
        : "#166534";

  const efficiencyBg =
    shippingPreview.efficiencyLevel === "red"
      ? "#FEF2F2"
      : shippingPreview.efficiencyLevel === "yellow"
        ? "#FFF7ED"
        : "#F0FDF4";

  const efficiencyBorder =
    shippingPreview.efficiencyLevel === "red"
      ? "#FCA5A5"
      : shippingPreview.efficiencyLevel === "yellow"
        ? "#FDBA74"
        : "#86EFAC";

  return (
    <AddProductScreen
      title="Shipping details"
      onBack={closeScreen}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField label={weightLabel} required style={{ marginTop: 0 }}>
          <AddProductInput
            ref={weightRef}
            defaultValue={weight}
            onChangeText={markPreviewDirty}
            placeholder="e.g., 1.2"
            textValueRef={weightTextRef}
            sanitizeText={sanitizeNumber}
            keyboardType="decimal-pad"
            maxLength={6}
            returnKeyType="next"
          />
        </AddProductField>

        <AddProductField label="Package dimensions">
          <View style={styles.unitRow}>
            <AddProductChip
              label="cm"
              selected={dimensionUnit === "cm"}
              onPress={() => onChangeDimensionUnit("cm")}
            />
            <AddProductChip
              label="in"
              selected={dimensionUnit === "in"}
              onPress={() => onChangeDimensionUnit("in")}
            />
          </View>

          <View style={styles.dimensionRow}>
            <View style={styles.dimensionField}>
              <Text style={apStyles.label}>Length</Text>
              <AddProductInput
                key={`length-${dimensionUnit}`}
                ref={lengthRef}
                defaultValue={length}
                onChangeText={markPreviewDirty}
                placeholder="L"
                textValueRef={lengthTextRef}
                sanitizeText={sanitizeNumber}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.dimensionField}>
              <Text style={apStyles.label}>Width</Text>
              <AddProductInput
                key={`width-${dimensionUnit}`}
                ref={widthRef}
                defaultValue={width}
                onChangeText={markPreviewDirty}
                placeholder="W"
                textValueRef={widthTextRef}
                sanitizeText={sanitizeNumber}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.dimensionField}>
              <Text style={apStyles.label}>Height</Text>
              <AddProductInput
                key={`height-${dimensionUnit}`}
                ref={heightRef}
                defaultValue={height}
                onChangeText={markPreviewDirty}
                placeholder="H"
                textValueRef={heightTextRef}
                sanitizeText={sanitizeNumber}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </AddProductField>

        <AddProductSecondaryButton
          label="Calculate"
          onPress={onCalculate}
          style={{ marginTop: 12 }}
        />

        {hasCalculatedPreview ? (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Used for courier calculation (actual vs volumetric).
            </Text>

            {!!shippingPreview.actualWeightKg && (
              <Text style={styles.previewText}>
                {isFabricByMeter ? "Weight per Meter" : "Actual Weight"}:{" "}
                {shippingPreview.actualWeightKg.toFixed(2)} kg
              </Text>
            )}

            {!!shippingPreview.lengthCm &&
              !!shippingPreview.widthCm &&
              !!shippingPreview.heightCm && (
                <Text style={styles.previewText}>
                  Rated Dimensions: {shippingPreview.lengthCm} x {shippingPreview.widthCm} x{" "}
                  {shippingPreview.heightCm} cm
                </Text>
              )}

            {!!shippingPreview.dimensionalWeightKg && (
              <Text style={styles.previewMetricText}>
                Dimensional Weight: {shippingPreview.dimensionalWeightKg.toFixed(2)} kg
              </Text>
            )}

            {!!shippingPreview.roundedChargeableWeightKg && (
              <Text style={styles.previewStrongText}>
                Chargeable Weight: {shippingPreview.roundedChargeableWeightKg.toFixed(1)} kg
              </Text>
            )}

            {!!shippingPreview.roundedChargeableWeightKg && (
              <View
                style={[
                  styles.efficiencyBox,
                  { borderColor: efficiencyBorder, backgroundColor: efficiencyBg },
                ]}
              >
                <Text
                  style={[styles.efficiencyTitle, { color: efficiencyColor }]}
                >
                  Packaging Status: {shippingPreview.efficiencyLabel}
                </Text>

                {shippingPreview.warningText ? (
                  <Text
                    style={[styles.efficiencyText, { color: efficiencyColor }]}
                  >
                    Warning: {shippingPreview.warningText}
                  </Text>
                ) : (
                  <Text
                    style={[styles.efficiencyText, { color: efficiencyColor }]}
                  >
                    OK: Package size looks efficient for the entered physical weight.
                  </Text>
                )}

                {shippingPreview.suggestionText ? (
                  <Text
                    style={[styles.efficiencyText, { color: efficiencyColor }]}
                  >
                    Suggestion: {shippingPreview.suggestionText}
                  </Text>
                ) : null}
              </View>
            )}

            {!!shippingPreview.inlandAmountPkr && (
              <Text style={styles.previewAmountText}>
                Within Pakistan Estimated Courier (avg distance): PKR {shippingPreview.inlandAmountPkr}
              </Text>
            )}

            <Text style={styles.previewHeadingText}>
              Export Estimated Courier:
            </Text>

            {shippingPreview.exportAmounts.map((item) => (
              <Text key={item.region} style={styles.previewText}>
                {item.region}:{" "}
                {item.amountPkr && Number(item.amountPkr) > 0
                  ? `PKR ${item.amountPkr}`
                  : "Not available"}
              </Text>
            ))}
          </View>
        ) : null}
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  unitRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  dimensionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  dimensionField: {
    width: "32%",
  },
  preview: {
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 8,
    backgroundColor: apColors.blueSoft,
    gap: 4,
  },
  previewText: {
    fontSize: 10,
    lineHeight: 14,
    color: apColors.subText,
    fontWeight: "600",
  },
  previewMetricText: {
    fontSize: 12,
    lineHeight: 16,
    color: apColors.text,
    fontWeight: "700",
  },
  previewStrongText: {
    fontSize: 13,
    lineHeight: 17,
    color: apColors.text,
    fontWeight: "800",
  },
  previewAmountText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    color: apColors.text,
    fontWeight: "700",
  },
  previewHeadingText: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: apColors.text,
    fontWeight: "700",
  },
  efficiencyBox: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  efficiencyTitle: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  efficiencyText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
});
