import React from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { READY_PIECE_COUNTS } from "@/data/kapray/productPieces";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

export default function Q06B2PieceCount() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";
  const ctx = useProductDraft() as any;
  const pieceCount = Number(ctx.draft?.spec?.piece_count || 0);
  const variantMode = String(
    typeof params?.variantMode === "string"
      ? params.variantMode
      : (ctx.draft?.spec?.variant_mode ?? ""),
  ).trim();

  function setSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        spec: { ...(prev?.spec ?? {}), ...patch },
      }));
    }
  }

  function choose(count: number) {
    setSpec({ piece_count: count });
  }

  function next() {
    router.push({
      pathname:
        variantMode === "simple_ready"
          ? ("/vendor/profile/add-product/q06b1-simple-ready-inventory" as any)
          : ("/vendor/profile/add-product/q06b3-ready-variants" as any),
      params: returnTo ? { returnTo } : {},
    } as any);
  }

  return (
    <AddProductScreen
      title="Number of pieces"
      onBack={() => router.back()}
      backLabel="Back"
      footer={
        <AddProductFooter
          onPrimaryPress={next}
          primaryDisabled={!pieceCount}
          disabledHint={!pieceCount ? "Select how many pieces are included." : ""}
        />
      }
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>How many pieces?</Text>

        <View style={apStyles.segmentRow}>
          {READY_PIECE_COUNTS.map((count) => {
            const selected = pieceCount === count;

            return (
              <Pressable
                key={count}
                onPress={() => choose(count)}
                style={({ pressed }) => [
                  apStyles.segment,
                  selected ? apStyles.segmentOn : null,
                  pressed ? apStyles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    apStyles.segmentText,
                    selected ? apStyles.segmentTextOn : null,
                  ]}
                >
                  {selected ? "Selected - " : ""}
                  {count} piece{count > 1 ? "s" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </AddProductScreen>
  );
}
