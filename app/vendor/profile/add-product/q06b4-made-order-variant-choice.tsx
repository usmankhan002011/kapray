import React from "react";
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import {
  AddProductPrimaryButton,
  AddProductScreen,
  AddProductSecondaryButton,
} from "@/components/product/add-product/AddProductWizard";

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

  function showVendorAlert() {
    Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
  }

  function goYes() {
    if (!vendorId) {
      showVendorAlert();
      return;
    }

    if (!isMadeOrderStitched) {
      Alert.alert(
        "Wrong product flow",
        "Made-order styles are only for stitched products marked as made on order.",
      );
      return;
    }

    patchSpec({ variant_mode: "made_order_variants" });

    router.push({
      pathname: "/vendor/profile/add-product/q06b4-made-order-variants" as any,
      params: returnTo ? { returnTo } : {},
    } as any);
  }

  function goNo() {
    if (!vendorId) {
      showVendorAlert();
      return;
    }

    if (!isMadeOrderStitched) {
      patchSpec({
        has_ready_variants: false,
        variant_mode: "simple_ready",
      });
      router.replace({
        pathname:
          "/vendor/profile/add-product/q06b1-simple-ready-inventory" as any,
        params: returnTo ? { returnTo } : {},
      } as any);
      return;
    }

    patchSpec({ variant_mode: null });
    patchPrice({ made_order_variants: [] });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/review" as any);
  }

  return (
    <AddProductScreen
      title="Made-on-order Styles"
      onBack={() => router.back()}
      backLabel="Back"
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>
          Do you want to add made-on-order styles?
        </Text>
        <Text style={apStyles.metaHint}>
          Add styles for this product with different colors, design alterations,
          or additional price if applicable.
        </Text>

        <View style={apStyles.btnStack}>
          <AddProductPrimaryButton
            label="Yes, add styles"
            icon="add"
            onPress={goYes}
          />
          <AddProductSecondaryButton
            label="No, continue without styles"
            icon="arrow-forward"
            onPress={goNo}
          />
        </View>
      </View>
    </AddProductScreen>
  );
}
