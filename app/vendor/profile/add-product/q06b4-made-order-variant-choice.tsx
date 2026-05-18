import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function Q06B4MadeOrderVariantChoice() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  const category = safeStr((draft?.spec as any)?.product_category ?? "");
  const madeOnOrder = Boolean((draft?.spec as any)?.made_on_order ?? false);

  const isMadeOrderStitched = category === "stitched_ready" && madeOnOrder;

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

  function goYes() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    if (!isMadeOrderStitched) {
      Alert.alert(
        "Wrong product flow",
        "Made-order variants are only for stitched products marked as made on order.",
      );
      return;
    }

    patchSpec({
      variant_mode: "made_order_variants",
    });

    router.push({
      pathname: "/vendor/profile/add-product/q06b4-made-order-variants" as any,
      params: returnTo ? { returnTo } : {},
    } as any);
  }

  function goNo() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    patchSpec({
      variant_mode: null,
    });

    patchPrice({
      made_order_variants: [],
    });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/review" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Made-on-order Designs</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              apStyles.linkBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>Back</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>
            Do you want to add made-on-order design variants?
          </Text>

          <Text style={{ color: apColors.muted, lineHeight: 20 }}>
            Add variants for this product with different colors, styles, design
            alterations, or additional price if applicable.
          </Text>

          <Pressable style={apStyles.primaryBtn} onPress={goYes}>
            <Text style={apStyles.primaryText}>Yes, add design variants</Text>
          </Pressable>

          <Pressable style={apStyles.secondaryBtn} onPress={goNo}>
            <Text style={apStyles.secondaryText}>
              No, continue without variants
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
