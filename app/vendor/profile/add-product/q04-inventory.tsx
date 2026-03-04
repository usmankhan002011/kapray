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

  const [qtyText, setQtyText] = useState<string>(
    String(madeOnOrder ? 0 : (draft?.inventory_qty ?? 0))
  );

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    if (madeOnOrder) return true;

    const q = Number(qtyText);
    return Number.isFinite(q) && q >= 0;
  }, [vendorId, madeOnOrder, qtyText]);

  // ✅ Auto focus when screen becomes active (only if editable)
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
      const q = Number(sanitizeNumber(qtyText) || "0");
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
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Inventory</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Inventory quantity *</Text>

          {madeOnOrder ? (
            <Text style={apStyles.metaHint}>Made on order. Inventory will be set as 0.</Text>
          ) : (
            <Text style={apStyles.metaHint}>Enter how many pieces are available.</Text>
          )}

          <TextInput
            ref={inputRef}
            value={String(madeOnOrder ? 0 : qtyText)}
            onChangeText={(t) => setQtyText(sanitizeNumber(t))}
            placeholder="e.g., 10"
            placeholderTextColor={apColors.muted}
            style={[apStyles.input, madeOnOrder ? { opacity: 0.55 } : null]}
            keyboardType="number-pad"
            maxLength={10}
            editable={!madeOnOrder}
            returnKeyType="done"
          />

          {/* <Text style={apStyles.metaHint}>
            Category: <Text style={{ fontWeight: "900", color: apColors.text }}>{category}</Text>
          </Text> */}

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