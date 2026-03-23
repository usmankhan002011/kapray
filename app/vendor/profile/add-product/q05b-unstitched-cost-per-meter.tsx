import React, { useMemo, useRef, useState } from "react";
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

function buildInitialSizeMap(draft: any) {
  const fromSpec = draft?.spec?.size_length_m ?? {};
  const out: Record<SizeKey, string> = {
    XS: "",
    S: "",
    M: "",
    L: "",
    XL: "",
    XXL: "",
  };

  SIZE_KEYS.forEach((key) => {
    const v = fromSpec?.[key];
    out[key] = v == null ? "" : String(v);
  });

  return out;
}

export default function Q05BUnstitchedCostPerMeter() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setPricePerMeter, setPriceMode } = ctx;

  const [text, setText] = useState<string>(String(draft?.price?.cost_pkr_per_meter ?? ""));
  const [sizeMap, setSizeMap] = useState<Record<SizeKey, string>>(buildInitialSizeMap(draft));

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

  const normalizedSizeLengthMap = useMemo(() => {
    const out: Partial<Record<SizeKey, number>> = {};

    SIZE_KEYS.forEach((key) => {
      const raw = sanitizeNumber(sizeMap[key] ?? "");
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) {
        out[key] = n;
      }
    });

    return out;
  }, [sizeMap]);

  const hasAtLeastOneSizeLength = useMemo(() => {
    return Object.keys(normalizedSizeLengthMap).length > 0;
  }, [normalizedSizeLengthMap]);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    const n = Number(text);
    return Number.isFinite(n) && n > 0 && hasAtLeastOneSizeLength;
  }, [vendorId, text, hasAtLeastOneSizeLength]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  function onChangeSizeLength(size: SizeKey, value: string) {
    setSizeMap((prev) => ({
      ...prev,
      [size]: sanitizeNumber(value),
    }));
  }

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

    const n = Number(sanitizeNumber(text) || "0");
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid cost", "Please enter a valid cost per meter (PKR).");
      return;
    }

    if (!hasAtLeastOneSizeLength) {
      Alert.alert(
        "Missing fabric lengths",
        "Please enter fabric length in meters for at least one size."
      );
      return;
    }

    setPriceMode?.("unstitched_per_meter");
    setPricePerMeter?.(n);

    patchSpec({
      size_length_m: normalizedSizeLengthMap,
    });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    if (needsServices) {
      router.push("/vendor/profile/add-product/q06b-services-costs" as any);
      return;
    }

    router.push("/vendor/profile/add-product/q09-images" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Cost per meter</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Cost per meter (PKR) *</Text>

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={(t) => setText(sanitizeNumber(t))}
            placeholder="e.g., 1800"
            placeholderTextColor={apColors.muted}
            style={apStyles.input}
            keyboardType="decimal-pad"
            maxLength={12}
            returnKeyType="done"
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
            Fabric length by size (meters)
          </Text>

          <Text style={apStyles.metaHint}>
            Enter only the sizes you want to offer. At least one size is required.
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            {SIZE_KEYS.map((size) => (
              <View
                key={size}
                style={{
                  width: "48%",
                  marginBottom: 12,
                }}
              >
                <Text style={apStyles.label}>{size}</Text>
                <TextInput
                  value={sizeMap[size]}
                  onChangeText={(v) => onChangeSizeLength(size, v)}
                  placeholder="e.g., 2.5"
                  placeholderTextColor={apColors.muted}
                  style={apStyles.input}
                  keyboardType="decimal-pad"
                  maxLength={8}
                />
              </View>
            ))}
          </View>

          <Text style={apStyles.metaHint}>
            Saved in draft as{" "}
            <Text style={{ fontWeight: "700", color: apColors.text }}>
              spec.size_length_m
            </Text>
          </Text>

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