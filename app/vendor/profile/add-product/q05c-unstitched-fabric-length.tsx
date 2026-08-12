import React, { useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, type TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors } from "@/components/product/addProductStyles";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductInput,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";
import {
  formatFabricWidth,
  normalizeFabricWidth,
  normalizeFabricWidthFromSpec,
} from "@/utils/kapray/fabricWidth";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type SizeKey = "XS" | "S" | "M" | "L" | "XL" | "XXL";

const SIZE_KEYS: SizeKey[] = ["XS", "S", "M", "L", "XL", "XXL"];
const DISPLAY_SIZE_KEYS: SizeKey[] = ["XS", "S", "M", "L", "XL", "XXL"];

const XS_FACTOR = 0.9;
const SIZE_FACTOR = 1.1;
const AUTO_FILL_BG = "#EEF4FF";
const EDITED_BG = "#FFFFFF";

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
  if (Number.isFinite(xsVal) && xsVal > 0) return String(roundLength(xsVal / XS_FACTOR));

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

function getInitialFabricWidthTextFromDraft(draft: any) {
  const width = normalizeFabricWidthFromSpec(draft?.spec);
  return width ? String(width.value) : "";
}

function buildComputedSizeLengthMap(baseSInput: string): Partial<Record<SizeKey, number>> {
  const s = Number(sanitizeNumber(baseSInput ?? ""));
  if (!Number.isFinite(s) || s <= 0) return {};

  const xs = roundLength(s * XS_FACTOR);
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

  const [fabricWidthText, setFabricWidthText] = useState<string>(
    getInitialFabricWidthTextFromDraft(draft),
  );
  const [sLengthText, setSLengthText] = useState<string>(getBaseSLengthFromDraft(draft));
  const [sizeTexts, setSizeTexts] = useState<Record<SizeKey, string>>(
    getInitialSizeTextsFromDraft(draft),
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

  const finalSizeLengthMap = useMemo(() => {
    return toNumberMap({
      ...sizeTexts,
      S: sLengthText,
    });
  }, [sizeTexts, sLengthText]);

  const fabricWidth = useMemo(
    () => normalizeFabricWidth(fabricWidthText),
    [fabricWidthText],
  );

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
    return Boolean(fabricWidth) && hasBaseSLength && hasAllSizes;
  }, [vendorId, fabricWidth, hasBaseSLength, hasAllSizes]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !fabricWidth
      ? "Enter fabric width."
    : !hasBaseSLength
      ? "Enter fabric length for size S."
      : !hasAllSizes
        ? "Ensure all size lengths are valid."
        : "";

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, []),
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

    if (size === "XS") {
      return;
    }

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

    if (!fabricWidth) {
      Alert.alert("Missing fabric width", "Enter fabric width (Panna / عرض).");
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
      fabric_width: fabricWidth,
      fabric_width_in: fabricWidth.value,
      fabric_width_label: formatFabricWidth(fabricWidth),
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

  return (
    <AddProductScreen
      title="Fabric length"
      onBack={closeScreen}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard style={styles.card}>
        <AddProductField
          label="Fabric width (Panna / عرض)"
          hint="Inches, e.g. 44, 54, 60."
          style={{ marginTop: 0 }}
        >
          <AddProductInput
            ref={inputRef}
            value={fabricWidthText}
            onChangeText={(v) => setFabricWidthText(sanitizeNumber(v))}
            sanitizeText={sanitizeNumber}
            placeholder="e.g., 44 in"
            keyboardType="decimal-pad"
            maxLength={6}
            returnKeyType="next"
          />
        </AddProductField>

        <AddProductField
          label="Fabric length by size (meters)"
          hint="Enter fabric length for S. Edit others."
          style={{ marginTop: 14 }}
        >
          <View style={styles.grid}>
            {DISPLAY_SIZE_KEYS.map((size) => {
              const isEdited = overriddenSizes[size];
              const isXS = size === "XS";
              const isS = size === "S";

              return (
                <View
                  key={size}
                  style={[
                    styles.sizeBox,
                    { backgroundColor: isEdited ? EDITED_BG : AUTO_FILL_BG },
                  ]}
                >
                  <View style={styles.sizeHeader}>
                    <Text style={styles.sizeLabel}>{size}</Text>

                    {isEdited && !isXS ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Edited</Text>
                      </View>
                    ) : null}
                  </View>

                  <AddProductInput
                    value={isS ? sLengthText : sizeTexts[size]}
                    onChangeText={(v) => onChangeSize(size, v)}
                    sanitizeText={sanitizeNumber}
                    editable={!isXS}
                    placeholder="e.g., 2.5"
                    style={[
                      {
                        minHeight: isS ? 46 : 40,
                        paddingVertical: 8,
                        backgroundColor: isXS ? "#FFFFFF" : "#FFFFFF",
                        fontSize: isS ? 16 : 14,
                      },
                    ]}
                    keyboardType="decimal-pad"
                    maxLength={8}
                    returnKeyType="done"
                  />
                </View>
              );
            })}
          </View>
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
  },
  grid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  sizeBox: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 8,
    padding: 10,
  },
  sizeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 6,
  },
  sizeLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: apColors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: apColors.subText,
  },
});
