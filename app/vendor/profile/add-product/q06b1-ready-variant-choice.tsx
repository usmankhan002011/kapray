import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import {
  AddProductPrimaryButton,
  AddProductScreen,
  AddProductSecondaryButton,
} from "@/components/product/add-product/AddProductWizard";

export default function Q06B1ReadyVariantChoice() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";
  const ctx = useProductDraft() as any;

  function patchDraft(patch: any) {
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, ...patch }));
    }
  }

  function yes() {
    patchDraft({
      inventory_qty: 0,
      spec: {
        ...(ctx.draft?.spec ?? {}),
        has_ready_variants: true,
        variant_mode: "ready_variants",
      },
      price: {
        ...(ctx.draft?.price ?? {}),
        simple_ready_inventory: [],
      },
    });
    router.push({
      pathname: "/vendor/profile/add-product/q06b2-piece-count" as any,
      params: returnTo ? { returnTo } : {},
    } as any);
  }

  function no() {
    patchDraft({
      inventory_qty: 0,
      spec: {
        ...(ctx.draft?.spec ?? {}),
        has_ready_variants: false,
        variant_mode: "simple_ready",
      },
      price: {
        ...(ctx.draft?.price ?? {}),
        variants: [],
      },
    });

    router.replace({
      pathname:
        "/vendor/profile/add-product/q06b1-simple-ready-inventory" as any,
      params: returnTo ? { returnTo } : {},
    } as any);
  }

  return (
    <AddProductScreen
      title="Ready-to-wear styles"
      onBack={() => router.back()}
      backLabel="Back"
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>Do you want to add styles?</Text>
        <Text style={apStyles.metaHint}>
          Add styles for this product with different colors, design
          alterations, sizes, stock, or additional price if applicable.
        </Text>

        <View style={apStyles.btnStack}>
          <AddProductPrimaryButton
            label="Yes, add styles"
            icon="add"
            onPress={yes}
          />
          <AddProductSecondaryButton
            label="No, continue simple product"
            icon="arrow-forward"
            onPress={no}
          />
        </View>
      </View>
    </AddProductScreen>
  );
}
