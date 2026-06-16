import React, { useMemo, useRef, useState } from "react";
import { Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

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

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    const n = Number(sanitizeNumber(text));
    return Number.isFinite(n) && n > 0;
  }, [vendorId, text]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !canContinue
      ? "Enter the fabric cost per meter."
      : "";

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

    const n = Number(sanitizeNumber(text) || "0");
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert("Invalid cost", "Please enter a valid cost per meter (PKR).");
      return;
    }

    setPriceMode?.("unstitched_per_meter");
    setPricePerMeter?.(n);

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q05c-unstitched-fabric-length" as any);
  }

  return (
    <AddProductScreen
      title="Cost per meter"
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
        <AddProductField label="Cost per meter (PKR)" required style={{ marginTop: 0 }}>
          <FastNumberInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="e.g., 1800"
            placeholderTextColor={apColors.muted}
            style={apStyles.input}
            keyboardType="decimal-pad"
            maxLength={12}
            returnKeyType="done"
          />
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}
