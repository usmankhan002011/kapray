import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type SizeKey = "XS" | "S" | "M" | "L" | "XL" | "XXL";

const SIZE_KEYS: SizeKey[] = ["XS", "S", "M", "L", "XL", "XXL"];
const SIZE_FACTOR = 1.1;
const AUTO_FILL_BG = "#EEF4FF";

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

function roundLength(n: number) {
  return Math.round(n * 10) / 10;
}

function formatLengthText(text?: string | null) {
  const n = Number(sanitizeNumber(String(text ?? "")));
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(roundLength(n));
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

function getBaseSLengthFromDraft(draft: any) {
  const fromSpec = draft?.spec?.size_length_m ?? {};
  const sVal = Number(sanitizeNumber(String(fromSpec?.S ?? "")));
  if (Number.isFinite(sVal) && sVal > 0) return String(roundLength(sVal));

  const xsVal = Number(sanitizeNumber(String(fromSpec?.XS ?? "")));
  if (Number.isFinite(xsVal) && xsVal > 0) return String(roundLength(xsVal));

  return "";
}

function getInitialSizeTextsFromDraft(draft: any): Record<SizeKey, string> {
  const fromSpec = draft?.spec?.size_length_m ?? {};

  return {
    XS: formatLengthText(fromSpec?.XS),
    S: formatLengthText(fromSpec?.S),
    M: formatLengthText(fromSpec?.M),
    L: formatLengthText(fromSpec?.L),
    XL: formatLengthText(fromSpec?.XL),
    XXL: formatLengthText(fromSpec?.XXL),
  };
}

function buildComputedSizeLengthMap(baseSInput: string): Partial<Record<SizeKey, number>> {
  const s = Number(sanitizeNumber(baseSInput ?? ""));

  if (!Number.isFinite(s) || s <= 0) return {};

  const xs = roundLength(s);
  const sizeS = roundLength(s);
  const m = roundLength(sizeS * SIZE_FACTOR);
  const l = roundLength(m * SIZE_FACTOR);
  const xl = roundLength(l * SIZE_FACTOR);
  const xxl = roundLength(xl * SIZE_FACTOR);

  return {
    XS: xs,
    S: sizeS,
    M: m,
    L: l,
    XL: xl,
    XXL: xxl,
  };
}

function toNumberMap(textMap: Record<SizeKey, string>): Partial<Record<SizeKey, number>> {
  const out: Partial<Record<SizeKey, number>> = {};

  SIZE_KEYS.forEach((size) => {
    const n = Number(sanitizeNumber(textMap[size] ?? ""));
    if (Number.isFinite(n) && n > 0) {
      out[size] = roundLength(n);
    }
  });

  return out;
}

export default function Q05CUnstitchedFabricLength() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  const [sLengthText, setSLengthText] = useState<string>(getBaseSLengthFromDraft(draft));
  const [sizeTexts, setSizeTexts] = useState<Record<SizeKey, string>>(
    getInitialSizeTextsFromDraft(draft)
  );
  const [overriddenSizes, setOverriddenSizes] = useState<Record<SizeKey, boolean>>({
    XS: false,
    S: false,
    M: false,
    L: false,
    XL: false,
    XXL: false,
  });

  const category = inferCategoryFromDraft(draft);
  const needsServices =
    category === "unstitched_dyeing" || category === "unstitched_dyeing_tailoring";

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

  const autoMap = useMemo(() => {
    return buildComputedSizeLengthMap(sLengthText);
  }, [sLengthText]);

  useEffect(() => {
    setSizeTexts((prev) => {
      const next = { ...prev };

      SIZE_KEYS.forEach((size) => {
        if (size === "S") {
          next.S = sLengthText;
          return;
        }

        if (!overriddenSizes[size]) {
          const autoValue = autoMap[size];
          next[size] = Number.isFinite(Number(autoValue)) ? String(autoValue) : "";
        }
      });

      return next;
    });
  }, [autoMap, overriddenSizes, sLengthText]);

  const finalSizeLengthMap = useMemo(() => {
    return toNumberMap({
      ...sizeTexts,
      S: sLengthText,
    });
  }, [sizeTexts, sLengthText]);

  const hasBaseSLength = useMemo(() => {
    const s = Number(sanitizeNumber(sLengthText ?? ""));
    return Number.isFinite(s) && s > 0;
  }, [sLengthText]);

  const hasAllSizes = useMemo(() => {
    return SIZE_KEYS.every((size) => {
      const n = finalSizeLengthMap[size];
      return Number.isFinite(Number(n)) && Number(n) > 0;
    });
  }, [finalSizeLengthMap]);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    return hasBaseSLength && hasAllSizes;
  }, [vendorId, hasBaseSLength, hasAllSizes]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function onChangeS(v: string) {
    const next = sanitizeNumber(v);
    const nextAutoMap = buildComputedSizeLengthMap(next);

    setSLengthText(next);

    setSizeTexts({
      XS: Number.isFinite(Number(nextAutoMap.XS)) ? String(nextAutoMap.XS) : "",
      S: next,
      M: Number.isFinite(Number(nextAutoMap.M)) ? String(nextAutoMap.M) : "",
      L: Number.isFinite(Number(nextAutoMap.L)) ? String(nextAutoMap.L) : "",
      XL: Number.isFinite(Number(nextAutoMap.XL)) ? String(nextAutoMap.XL) : "",
      XXL: Number.isFinite(Number(nextAutoMap.XXL)) ? String(nextAutoMap.XXL) : "",
    });

    setOverriddenSizes({
      XS: false,
      S: false,
      M: false,
      L: false,
      XL: false,
      XXL: false,
    });
  }

  function onChangeSize(size: SizeKey, v: string) {
    const next = sanitizeNumber(v);

    if (size === "S") {
      onChangeS(next);
      return;
    }

    setSizeTexts((prev) => ({
      ...prev,
      [size]: next,
    }));

    setOverriddenSizes((prev) => ({
      ...prev,
      [size]: true,
    }));
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!hasBaseSLength) {
      Alert.alert("Missing fabric length", "Please enter fabric length in meters for size S.");
      return;
    }

    if (!hasAllSizes) {
      Alert.alert("Incomplete size lengths", "Please ensure all size lengths are valid.");
      return;
    }

    patchSpec({
      size_length_m: finalSizeLengthMap,
    });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    if (needsServices) {
      router.push("/vendor/profile/add-product/q06b-services-costs" as any);
      return;
    }

    router.push("/vendor/profile/add-product/q06c-shipping" as any);
  }

  const costPerMeter = Number(draft?.price?.cost_pkr_per_meter ?? 0);

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Fabric length</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          {costPerMeter > 0 ? (
            <Text style={[apStyles.metaHint, { marginBottom: 10 }]}>
              Cost per meter: <Text style={{ fontWeight: "900", color: apColors.text }}>PKR {costPerMeter}</Text>
            </Text>
          ) : null}

          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: apColors.text,
              marginBottom: 6,
            }}
          >
            Fabric length by size (meters)
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={apStyles.label}>Enter fabric length for size S *</Text>
            <TextInput
              ref={inputRef}
              value={sLengthText}
              onChangeText={onChangeS}
              placeholder="e.g., 2.5"
              placeholderTextColor={apColors.muted}
              style={apStyles.input}
              keyboardType="decimal-pad"
              maxLength={8}
            />
            <Text style={apStyles.metaHint}>Edit other sizes manually if needed.</Text>
          </View>

          <View
            style={{
              marginTop: 14,
              borderWidth: 1,
              borderColor: apColors.border,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: apColors.card ?? "#FFFFFF",
            }}
          >
            {SIZE_KEYS.map((size, index) => {
              const isBase = size === "S";
              const isOverridden = overriddenSizes[size];
              const helper = isBase
                ? "Base size"
                : isOverridden
                ? "Edited manually"
                : size === "XS"
                ? "Same as S"
                : "Auto-filled";

              return (
                <View
                  key={size}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderBottomWidth: index === SIZE_KEYS.length - 1 ? 0 : 1,
                    borderBottomColor: apColors.border,
                  }}
                >
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: apColors.text,
                      }}
                    >
                      {size}
                    </Text>
                    <Text style={apStyles.metaHint}>{helper}</Text>
                  </View>

                  <TextInput
                    value={isBase ? sLengthText : sizeTexts[size]}
                    onChangeText={(v) => onChangeSize(size, v)}
                    placeholder="e.g., 2.5"
                    placeholderTextColor={apColors.muted}
                    style={[
                      apStyles.input,
                      !isBase && !isOverridden
                        ? {
                            backgroundColor: AUTO_FILL_BG,
                          }
                        : null,
                    ]}
                    keyboardType="decimal-pad"
                    maxLength={8}
                  />
                </View>
              );
            })}
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