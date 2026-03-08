import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

export default function Q06ASizes() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = pickFirstString((params as any)?.returnTo) ?? "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setAvailableSizes } = ctx;

  const initial = Array.isArray((draft?.price as any)?.available_sizes)
    ? ((draft?.price as any)?.available_sizes as any[]).map((x) => String(x ?? "").trim()).filter(Boolean).join(", ")
    : "";

  const [text, setText] = useState<string>(initial);

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, price: { ...(prev?.price ?? {}), ...patch } }));
      return;
    }
    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);

  // ✅ Auto focus when screen becomes active (same pattern as other steps)
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

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    const sizes = String(text ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    // Prefer context helper if available (legacy used setAvailableSizes)
    setAvailableSizes?.(sizes);

    // Also persist into draft.price for safety/compat
    patchPrice({ available_sizes: sizes });

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
          <Text style={apStyles.title}>Sizes</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Available Sizes (comma separated)</Text>

          <Text style={apStyles.metaHint}>
            Example: XS, S, M, L, XL, XXL, All
          </Text>

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="e.g., XS, S, M, L, XL, XXL, All"
            placeholderTextColor={apColors.muted}
            style={apStyles.input}
            maxLength={80}
            returnKeyType="done"
          />

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null
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