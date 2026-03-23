import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles, apColors } from "@/components/product/addProductStyles";

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

          <Text style={apStyles.metaHint}>
            Used for courier calculation (weight & volumetric).
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