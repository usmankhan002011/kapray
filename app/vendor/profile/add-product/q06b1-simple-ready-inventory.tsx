import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from "react-native";
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

function sizeKey(size: string) {
  return safeStr(size).toLowerCase();
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
  const qtyInputRefs = useRef<Record<string, TextInput | null>>({});
  const pendingFocusSizeRef = useRef<string | null>(null);

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

  useEffect(() => {
    const key = pendingFocusSizeRef.current;
    if (!key) return;

    const timer = setTimeout(() => {
      qtyInputRefs.current[key]?.focus();
      pendingFocusSizeRef.current = null;
    }, 80);

    return () => clearTimeout(timer);
  }, [rows]);

  function toggleSize(size: string) {
    const key = sizeKey(size);
    const willSelect = !rows.some((row) => sizeKey(row.size) === key);
    if (willSelect) pendingFocusSizeRef.current = key;

    setRows((prev) => {
      const exists = prev.some((row) => sizeKey(row.size) === key);
      if (exists) {
        return prev.filter((row) => sizeKey(row.size) !== key);
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
        simple_ready_inventory: cleaned,
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
          topContent={
            <View style={styles.totalFooter}>
              <Text style={styles.totalLabel}>Total inventory</Text>
              <Text style={styles.totalValue}>{totalQty}</Text>
            </View>
          }
          onPrimaryPress={saveRows}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>Available sizes and quantity *</Text>

        <View style={styles.sizeGrid}>
          {sizeOptions.map((size) => {
            const selected = rows.find(
              (row) => sizeKey(row.size) === sizeKey(size),
            );

            return (
              <View key={size} style={styles.sizeCell}>
                <Pressable
                  onPress={() => toggleSize(size)}
                  style={({ pressed }) => [
                    apStyles.sizeChip,
                    styles.sizePill,
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

                {selected ? (
                  <FastNumberInput
                    ref={(input) => {
                      const key = sizeKey(size);
                      qtyInputRefs.current[key] = input;
                    }}
                    value={String(selected.qty || "")}
                    onChangeText={(text) => updateQty(size, text)}
                    placeholder="Qty"
                    placeholderTextColor={apColors.muted}
                    style={[apStyles.input, styles.qtyInput]}
                    keyboardType="number-pad"
                    showSoftInputOnFocus
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  sizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  sizeCell: {
    width: "30.5%",
    minWidth: 82,
  },
  sizePill: {
    width: "100%",
  },
  qtyInput: {
    minHeight: 40,
    marginTop: 8,
    paddingHorizontal: 10,
    textAlign: "center",
  },
  totalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalLabel: {
    color: apColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  totalValue: {
    color: apColors.text,
    fontSize: 22,
    fontWeight: "900",
  },
});
