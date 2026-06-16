import React, { useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles, apColors } from "@/components/product/addProductStyles";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import { getDeliveryCost } from "@/utils/kapray/delivery";
import { EXPORT_REGIONS } from "@/data/kapray/exportRegions";
import {
  AddProductCard,
  AddProductChip,
  AddProductField,
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

type DimensionUnit = "cm" | "in";

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

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

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

  const [weight, setWeight] = useState<string>(
    initialPositiveNumberText(draft?.spec?.weight_kg),
  );
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>(() =>
    getInitialDimensionUnit(draft?.spec),
  );
  const [length, setLength] = useState<string>(
    initialDimensionText(draft?.spec, "length", dimensionUnit),
  );
  const [width, setWidth] = useState<string>(
    initialDimensionText(draft?.spec, "width", dimensionUnit),
  );
  const [height, setHeight] = useState<string>(
    initialDimensionText(draft?.spec, "height", dimensionUnit),
  );

  const canContinue = useMemo(() => {
    if (!vendorId) return false;

    const w = positiveNumberFromText(weight);
    const l = positiveNumberFromText(length);
    const wi = positiveNumberFromText(width);
    const h = positiveNumberFromText(height);

    return (
      Number.isFinite(w) &&
      w > 0 &&
      Number.isFinite(l) &&
      l > 0 &&
      Number.isFinite(wi) &&
      wi > 0 &&
      Number.isFinite(h) &&
      h > 0
    );
  }, [vendorId, weight, length, width, height]);
  const dimensionUnitLabel = dimensionUnit === "in" ? "inches" : "cm";
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : positiveNumberFromText(weight) <= 0
      ? "Enter package weight in kg."
      : positiveNumberFromText(length) <= 0
        ? `Enter package length in ${dimensionUnitLabel}.`
        : positiveNumberFromText(width) <= 0
          ? `Enter package width in ${dimensionUnitLabel}.`
          : positiveNumberFromText(height) <= 0
            ? `Enter package height in ${dimensionUnitLabel}.`
            : "";

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

    setLength((prev) => convertDimensionText(prev, dimensionUnit, nextUnit));
    setWidth((prev) => convertDimensionText(prev, dimensionUnit, nextUnit));
    setHeight((prev) => convertDimensionText(prev, dimensionUnit, nextUnit));
    setDimensionUnit(nextUnit);
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    const w = positiveNumberFromText(weight);
    const lengthInput = positiveNumberFromText(length);
    const widthInput = positiveNumberFromText(width);
    const heightInput = positiveNumberFromText(height);
    const l = dimensionToCm(length, dimensionUnit);
    const wi = dimensionToCm(width, dimensionUnit);
    const h = dimensionToCm(height, dimensionUnit);

    if (!Number.isFinite(w) || w <= 0) {
      Alert.alert("Invalid weight", "Enter valid weight in kg.");
      return;
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
      return;
    }

    patchSpec({
      weight_kg: w,
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
        <AddProductField label="Weight (kg)" required style={{ marginTop: 0 }}>
          <FastNumberInput
            ref={weightRef}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g., 1.2"
            placeholderTextColor={apColors.muted}
            style={apStyles.input}
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
              <FastNumberInput
                value={length}
                onChangeText={setLength}
                placeholder="L"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.dimensionField}>
              <Text style={apStyles.label}>Width</Text>
              <FastNumberInput
                value={width}
                onChangeText={setWidth}
                placeholder="W"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.dimensionField}>
              <Text style={apStyles.label}>Height</Text>
              <FastNumberInput
                value={height}
                onChangeText={setHeight}
                placeholder="H"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </AddProductField>

          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Used for courier calculation (actual vs volumetric).
            </Text>

            {!!shippingPreview.actualWeightKg && (
              <Text style={styles.previewText}>
                Actual Weight: {shippingPreview.actualWeightKg.toFixed(2)} kg
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
