import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import { READY_STANDARD_SIZES } from "@/data/kapray/productPieces";
import {
  normalizeSimpleReadyInventory,
  sumSimpleReadyInventory,
  validateSimpleReadyInventory,
  type SimpleReadyInventoryRow,
} from "@/utils/kapray/productVariants";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeQty(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function sanitizeQty(v: string) {
  return String(v ?? "").replace(/[^\d]/g, "");
}

function initialRows(draft: any): SimpleReadyInventoryRow[] {
  const existing = normalizeSimpleReadyInventory(
    draft?.price?.simple_ready_inventory,
  );
  if (existing.length) return existing;

  const sizes = Array.isArray(draft?.price?.available_sizes)
    ? draft.price.available_sizes
    : [];

  return normalizeSimpleReadyInventory(
    sizes.map((size: any) => ({ size: safeStr(size), qty: 0 })),
  );
}

export default function Q06B1SimpleReadyInventory() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  const category = safeStr(draft?.spec?.product_category);
  const madeOnOrder = Boolean(draft?.spec?.made_on_order);
  const isSimpleReady =
    category === "stitched_ready" &&
    !madeOnOrder &&
    safeStr(draft?.spec?.variant_mode) === "simple_ready";
  const [rows, setRows] = useState<SimpleReadyInventoryRow[]>(() =>
    initialRows(draft),
  );

  const sizeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];

    for (const item of [
      ...READY_STANDARD_SIZES,
      ...rows.map((row) => row.size),
    ]) {
      const size = safeStr(item);
      const key = size.toLowerCase();
      if (!size || seen.has(key)) continue;
      seen.add(key);
      out.push(size);
    }

    return out;
  }, [rows]);

  const totalQty = useMemo(() => sumSimpleReadyInventory(rows), [rows]);
  const validationError = useMemo(
    () => validateSimpleReadyInventory(rows),
    [rows],
  );
  const canContinue = isSimpleReady && !validationError;
  const disabledHint = !isSimpleReady
    ? "This inventory step is only for ready-to-wear simple products."
    : validationError || "";

  function toggleSize(size: string) {
    setRows((prev) => {
      const exists = prev.some(
        (row) => row.size.toLowerCase() === size.toLowerCase(),
      );
      if (exists) {
        return prev.filter(
          (row) => row.size.toLowerCase() !== size.toLowerCase(),
        );
      }
      return [...prev, { size, qty: 0 }];
    });
  }

  function updateQty(size: string, text: string) {
    const qty = safeQty(sanitizeQty(text));
    setRows((prev) =>
      prev.map((row) => (row.size === size ? { ...row, qty } : row)),
    );
  }

  function saveRows() {
    if (!isSimpleReady) {
      Alert.alert(
        "Wrong product flow",
        "Size inventory is only for ready-to-wear products without styles.",
      );
      return;
    }

    const cleaned = normalizeSimpleReadyInventory(rows);
    const error = validateSimpleReadyInventory(cleaned);

    if (error) {
      Alert.alert("Check size inventory", error);
      return;
    }

    const total = sumSimpleReadyInventory(cleaned);
    ctx.setDraft((prev: any) => ({
      ...prev,
      inventory_qty: total,
      spec: {
        ...(prev?.spec ?? {}),
        has_ready_variants: false,
        variant_mode: "simple_ready",
      },
      price: {
        ...(prev?.price ?? {}),
        available_sizes: cleaned.map((row) => row.size),
        simple_ready_inventory: cleaned,
        variants: [],
      },
    }));

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q11-description" as any);
  }

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  return (
    <AddProductScreen
      title="Size Inventory"
      onBack={closeScreen}
      footer={
        <AddProductFooter
          onPrimaryPress={saveRows}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>Available sizes and quantity *</Text>
        <Text style={apStyles.metaHint}>
          Select each available size and enter its inventory quantity.
        </Text>

        <View style={apStyles.chipWrap}>
          {sizeOptions.map((size) => {
            const selected = rows.some((row) => row.size === size);

            return (
              <Pressable
                key={size}
                onPress={() => toggleSize(size)}
                style={({ pressed }) => [
                  apStyles.sizeChip,
                  selected ? apStyles.sizeChipOn : null,
                  pressed ? apStyles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    apStyles.sizeChipText,
                    selected ? apStyles.sizeChipTextOn : null,
                  ]}
                >
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {rows.map((row) => (
          <View key={row.size} style={{ marginTop: 12 }}>
            <Text style={apStyles.label}>{row.size} quantity</Text>
            <FastNumberInput
              value={row.qty ? String(row.qty) : ""}
              onChangeText={(text) => updateQty(row.size, text)}
              placeholder={`Qty for ${row.size}`}
              placeholderTextColor={apColors.muted}
              style={apStyles.input}
              keyboardType="number-pad"
            />
          </View>
        ))}

        <Text style={apStyles.metaHint}>Total inventory: {totalQty}</Text>
      </View>
    </AddProductScreen>
  );
}
