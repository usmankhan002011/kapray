import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  apRadii,
  apStyles,
} from "@/components/product/addProductStyles";
import {
  AddProductCard,
  AddProductScreen,
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
      params: {
        ...(returnTo ? { returnTo } : {}),
        variantMode: "ready_variants",
      },
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

    router.push({
      pathname: "/vendor/profile/add-product/q06b2-piece-count" as any,
      params: {
        ...(returnTo ? { returnTo } : {}),
        variantMode: "simple_ready",
      },
    } as any);
  }

  return (
    <AddProductScreen
      title="Ready-to-wear styles"
      onBack={() => router.back()}
      backLabel="Back"
    >
      <AddProductCard>
        <Text style={apStyles.label}>Add styles?</Text>
        <Text style={apStyles.metaHint}>
          One style, choose No. Multiple colours/designs, choose Yes.
        </Text>

        <View style={styles.segmented}>
          <Pressable
            accessibilityRole="button"
            onPress={no}
            style={({ pressed }) => [
              styles.segment,
              styles.segmentLeft,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={styles.segmentText}>No</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={yes}
            style={({ pressed }) => [
              styles.segment,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={styles.segmentText}>Yes</Text>
          </Pressable>
        </View>
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  segmented: {
    marginTop: 14,
    flexDirection: "row",
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#F8FAFF",
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  segmentLeft: {
    borderRightWidth: 1,
    borderRightColor: "#D7E3FF",
  },
  segmentText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "800",
  },
});
