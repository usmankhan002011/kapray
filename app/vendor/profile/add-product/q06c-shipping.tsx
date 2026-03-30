import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles, apColors } from "@/components/product/addProductStyles";
import { getDeliveryCost } from "@/utils/kapray/delivery";
import { EXPORT_REGIONS } from "@/data/kapray/exportRegions";

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

  const [weight, setWeight] = useState<string>(String(draft?.spec?.weight_kg ?? ""));
  const [length, setLength] = useState<string>(String(draft?.spec?.package_cm?.length ?? ""));
  const [width, setWidth] = useState<string>(String(draft?.spec?.package_cm?.width ?? ""));
  const [height, setHeight] = useState<string>(String(draft?.spec?.package_cm?.height ?? ""));

  const canContinue = useMemo(() => {
    if (!vendorId) return false;

    const w = Number(weight);
    const l = Number(length);
    const wi = Number(width);
    const h = Number(height);

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

  const shippingPreview = useMemo(() => {
    const actualWeightKg = Number(weight);
    const rawLengthCm = Number(length);
    const rawWidthCm = Number(width);
    const rawHeightCm = Number(height);

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
  }, [height, length, weight, width]);

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

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    const w = Number(sanitizeNumber(weight));
    const l = Number(sanitizeNumber(length));
    const wi = Number(sanitizeNumber(width));
    const h = Number(sanitizeNumber(height));

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
      Alert.alert("Invalid dimensions", "Enter valid package dimensions in cm.");
      return;
    }

    patchSpec({
      weight_kg: w,
      package_cm: {
        length: l,
        width: wi,
        height: h,
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
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Shipping details</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Weight (kg) *</Text>
          <TextInput
            ref={weightRef}
            value={weight}
            onChangeText={(t) => setWeight(sanitizeNumber(t))}
            placeholder="e.g., 1.2"
            placeholderTextColor={apColors.muted}
            style={apStyles.input}
            keyboardType="decimal-pad"
            maxLength={6}
          />

          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: apColors.text,
              marginTop: 14,
              marginBottom: 6,
            }}
          >
            Package dimensions (cm)
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            <View style={{ width: "32%" }}>
              <Text style={apStyles.label}>Length</Text>
              <TextInput
                value={length}
                onChangeText={(t) => setLength(sanitizeNumber(t))}
                placeholder="L"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={{ width: "32%" }}>
              <Text style={apStyles.label}>Width</Text>
              <TextInput
                value={width}
                onChangeText={(t) => setWidth(sanitizeNumber(t))}
                placeholder="W"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={{ width: "32%" }}>
              <Text style={apStyles.label}>Height</Text>
              <TextInput
                value={height}
                onChangeText={(t) => setHeight(sanitizeNumber(t))}
                placeholder="H"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderWidth: 1,
              borderColor: apColors.border,
              borderRadius: 12,
              backgroundColor: apColors.blueSoft,
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                lineHeight: 14,
                color: apColors.subText,
                fontWeight: "600",
              }}
            >
              Used for courier calculation (actual vs volumetric).
            </Text>

            {!!shippingPreview.actualWeightKg && (
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  color: apColors.subText,
                  fontWeight: "600",
                }}
              >
                Actual Weight: {shippingPreview.actualWeightKg.toFixed(2)} kg
              </Text>
            )}

            {!!shippingPreview.lengthCm &&
              !!shippingPreview.widthCm &&
              !!shippingPreview.heightCm && (
                <Text
                  style={{
                    fontSize: 10,
                    lineHeight: 14,
                    color: apColors.subText,
                    fontWeight: "600",
                  }}
                >
                  Rated Dimensions: {shippingPreview.lengthCm} × {shippingPreview.widthCm} ×{" "}
                  {shippingPreview.heightCm} cm
                </Text>
              )}

            {!!shippingPreview.dimensionalWeightKg && (
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  color: apColors.subText,
                  fontWeight: "600",
                }}
              >
                Dimensional Weight: {shippingPreview.dimensionalWeightKg.toFixed(2)} kg
              </Text>
            )}

            {!!shippingPreview.roundedChargeableWeightKg && (
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  color: apColors.text,
                  fontWeight: "800",
                }}
              >
                Chargeable Weight: {shippingPreview.roundedChargeableWeightKg.toFixed(1)} kg
              </Text>
            )}

            {!!shippingPreview.roundedChargeableWeightKg && (
              <View
                style={{
                  marginTop: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 7,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: efficiencyBorder,
                  backgroundColor: efficiencyBg,
                  gap: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    lineHeight: 14,
                    color: efficiencyColor,
                    fontWeight: "800",
                  }}
                >
                  Packaging Status: {shippingPreview.efficiencyLabel}
                </Text>

                {shippingPreview.warningText ? (
                  <Text
                    style={{
                      fontSize: 10,
                      lineHeight: 14,
                      color: efficiencyColor,
                      fontWeight: "600",
                    }}
                  >
                    ⚠️ {shippingPreview.warningText}
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontSize: 10,
                      lineHeight: 14,
                      color: efficiencyColor,
                      fontWeight: "600",
                    }}
                  >
                    ✓ Package size looks efficient for the entered physical weight.
                  </Text>
                )}

                {shippingPreview.suggestionText ? (
                  <Text
                    style={{
                      fontSize: 10,
                      lineHeight: 14,
                      color: efficiencyColor,
                      fontWeight: "600",
                    }}
                  >
                    Suggestion: {shippingPreview.suggestionText}
                  </Text>
                ) : null}
              </View>
            )}

            {!!shippingPreview.inlandAmountPkr && (
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  color: apColors.text,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                Inland Estimated Courier (avg Pakistan distance): PKR {shippingPreview.inlandAmountPkr}
              </Text>
            )}

            <Text
              style={{
                fontSize: 10,
                lineHeight: 14,
                color: apColors.text,
                fontWeight: "700",
                marginTop: 4,
              }}
            >
              Export Estimated Courier:
            </Text>

            {shippingPreview.exportAmounts.map((item) => (
              <Text
                key={item.region}
                style={{
                  fontSize: 10,
                  lineHeight: 14,
                  color: apColors.subText,
                  fontWeight: "600",
                }}
              >
                {item.region}:{" "}
                {item.amountPkr && Number(item.amountPkr) > 0
                  ? `PKR ${item.amountPkr}`
                  : "Not available"}
              </Text>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null,
            ]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}