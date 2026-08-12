import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

function sanitizeCost(input: string) {
  return input.replace(/\D/g, "");
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
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
    const n = Number(sanitizeCost(text));
    return Number.isFinite(n) && n > 0;
  }, [vendorId, text]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !canContinue
      ? "Enter the product cost."
      : "";

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        price: { ...(prev?.price ?? {}), ...patch },
      }));
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
    }, []),
  );

  function onContinue() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    const n = Number(sanitizeCost(text) || "0");
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid cost", "Please enter a valid cost (PKR).");
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

    const productCategory = safeStr((draft?.spec as any)?.product_category);
    const madeOnOrder = Boolean((draft?.spec as any)?.made_on_order ?? false);

    if (productCategory === "stitched_ready" && madeOnOrder) {
      router.push("/vendor/profile/add-product/q06a-sizes" as any);
      return;
    }

    router.push("/vendor/profile/add-product/q06c-shipping" as any);
  }

  return (
    <AddProductScreen
      title="Cost"
      onBack={() => router.back()}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>Cost (PKR) *</Text>

        <FastNumberInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          sanitize={sanitizeCost}
          placeholder="e.g., 25000"
          placeholderTextColor={apColors.muted}
          style={[apStyles.input, styles.costInput]}
          keyboardType="number-pad"
          maxLength={12}
          returnKeyType="done"
          commitMode="change"
          commitDelayMs={0}
        />
      </View>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  costInput: {
    color: apColors.danger,
  },
});
