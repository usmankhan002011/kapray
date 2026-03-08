import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

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

export default function Q05AStitchedTotalCost() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setPriceTotal, setPriceMode } = ctx;

  const initial = String(draft?.price?.cost_pkr_total ?? "");
  const [text, setText] = useState<string>(initial);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    const n = Number(text);
    return Number.isFinite(n) && n > 0;
  }, [vendorId, text]);

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, price: { ...(prev?.price ?? {}), ...patch } }));
      return;
    }
    // last resort (shouldn't be needed, but keeps behavior consistent)
    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  // ✅ Auto focus when screen becomes active
  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    const n = Number(sanitizeNumber(text) || "0");
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid cost", "Please enter a valid total cost (PKR).");
      return;
    }

    // Prefer context helpers if available, but always persist values
    setPriceMode?.("stitched_total");
    setPriceTotal?.(n);
    patchPrice({ mode: "stitched_total", cost_pkr_total: n });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q06a-sizes" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Total cost</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Total cost (PKR) *</Text>

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={(t) => setText(sanitizeNumber(t))}
            placeholder="e.g., 25000"
            placeholderTextColor={apColors.muted}
            style={apStyles.input}
            keyboardType="decimal-pad"
            maxLength={12}
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