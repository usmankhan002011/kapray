import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

export default function Q06B1ReadyVariantChoice() {
  const router = useRouter();
  const ctx = useProductDraft() as any;

  function patchDraft(patch: any) {
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, ...patch }));
    }
  }

  function setSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    patchDraft({
      spec: {
        ...(ctx.draft?.spec ?? {}),
        ...patch,
      },
    });
  }

  function yes() {
    setSpec({
      has_ready_variants: true,
      variant_mode: "ready_variants",
    });
    router.push("/vendor/profile/add-product/q06b2-piece-count" as any);
  }

  function no() {
    setSpec({
      has_ready_variants: false,
      variant_mode: "simple_ready",
    });

    router.push("/vendor/profile/add-product/q11-description" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView contentContainerStyle={apStyles.content}>
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Ready-to-wear variants</Text>

          <Pressable onPress={() => router.back()} style={apStyles.linkBtn}>
            <Text style={apStyles.linkText}>Back</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Do you want to add variants?</Text>

          <Text style={{ color: apColors.muted, lineHeight: 20 }}>
            Add variants for this product with different colors, design
            alterations, sizes, stock, or additional price if applicable.
          </Text>

          <Pressable style={apStyles.primaryBtn} onPress={yes}>
            <Text style={apStyles.primaryText}>Yes, add variants</Text>
          </Pressable>

          <Pressable style={apStyles.secondaryBtn} onPress={no}>
            <Text style={apStyles.secondaryText}>
              No, continue simple product
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
