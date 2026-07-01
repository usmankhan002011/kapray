import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import { READY_STANDARD_SIZES } from "@/data/kapray/productPieces";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

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
  const returnTo = pickFirstString((params as any)?.returnTo) ?? "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setAvailableSizes } = ctx;

  const [selectedSizes, setSelectedSizes] = useState<string[]>(() =>
    Array.isArray((draft?.price as any)?.available_sizes)
      ? ((draft?.price as any)?.available_sizes as any[])
          .map((x) => String(x ?? "").trim())
          .filter(Boolean)
      : [],
  );
  const sizeOptions = [...READY_STANDARD_SIZES, "All"];

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
    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);
  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : "Select sizes if this product uses standard sizes.";

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function toggleSize(size: string) {
    setSelectedSizes((prev) => {
      if (size === "All") return prev.includes("All") ? [] : ["All"];

      const withoutAll = prev.filter((x) => x !== "All");
      return withoutAll.includes(size)
        ? withoutAll.filter((x) => x !== size)
        : [...withoutAll, size];
    });
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    setAvailableSizes?.(selectedSizes);
    patchPrice({ available_sizes: selectedSizes });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q06c-shipping" as any);
  }

  return (
    <AddProductScreen
      title="Sizes"
      onBack={closeScreen}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>Available sizes</Text>
        <Text style={apStyles.metaHint}>
          Tap every size this product can support. Use All when one selection
          covers every standard size.
        </Text>

        <View style={apStyles.chipWrap}>
          {sizeOptions.map((size) => {
            const selected = selectedSizes.includes(size);

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

        <Text style={apStyles.metaHint}>
          {selectedSizes.length
            ? `${selectedSizes.length} selected`
            : "No size selected yet."}
        </Text>
      </View>
    </AddProductScreen>
  );
}
