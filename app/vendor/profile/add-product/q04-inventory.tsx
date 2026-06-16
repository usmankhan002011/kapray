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

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

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

export default function Q04Inventory() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setInventoryQty } = ctx;

  const madeOnOrder = Boolean((draft?.spec as any)?.made_on_order ?? false);
  const category = inferCategoryFromDraft(draft);

  const [qtyText, setQtyText] = useState<string>(() => {
    if (madeOnOrder) return "0";
    const existingQty = Number(draft?.inventory_qty);
    return Number.isFinite(existingQty) && existingQty > 0
      ? String(Math.trunc(existingQty))
      : "";
  });

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    if (madeOnOrder) return true;

    const cleanedQty = sanitizeNumber(qtyText);
    if (!cleanedQty) return false;

    const q = Number(cleanedQty);
    return Number.isFinite(q) && q >= 0;
  }, [vendorId, madeOnOrder, qtyText]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !canContinue
      ? "Enter inventory quantity, 0 or more."
      : "";

  useFocusEffect(
    React.useCallback(() => {
      if (madeOnOrder) return;
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [madeOnOrder])
  );

  function nextRouteAfterInventory() {
    if (category === "stitched_ready") return "/vendor/profile/add-product/q05a-stitched-total-cost";
    return "/vendor/profile/add-product/q05b-unstitched-cost-per-meter";
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!madeOnOrder) {
      const cleanedQty = sanitizeNumber(qtyText);
      const q = Number(cleanedQty);
      if (!Number.isFinite(q) || q < 0) {
        Alert.alert("Invalid quantity", "Please enter a valid inventory quantity (0 or more).");
        return;
      }
      setInventoryQty?.(Math.trunc(q));
    } else {
      setInventoryQty?.(0);
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push(nextRouteAfterInventory() as any);
  }

  return (
    <AddProductScreen
      title="Inventory"
      onBack={() => router.back()}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField
          label="Inventory quantity"
          required
          hint={
            madeOnOrder
              ? "Made on order. Inventory will be set as 0."
              : "Enter how many pieces are available."
          }
          style={{ marginTop: 0 }}
        >
          <FastNumberInput
            ref={inputRef}
            value={madeOnOrder ? "0" : qtyText}
            onChangeText={setQtyText}
            placeholder="e.g., 10"
            placeholderTextColor={apColors.muted}
            style={[apStyles.input, madeOnOrder ? { opacity: 0.55 } : null]}
            keyboardType="number-pad"
            maxLength={10}
            editable={!madeOnOrder}
            returnKeyType="done"
          />
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}
