import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { READY_PIECE_COUNTS } from "@/data/kapray/productPieces";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

export default function Q06B2PieceCount() {
  const router = useRouter();
  const ctx = useProductDraft() as any;
  const pieceCount = Number(ctx.draft?.spec?.piece_count || 0);

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
    router.push("/vendor/profile/add-product/q06b3-ready-variants" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView contentContainerStyle={apStyles.content}>
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Number of pieces</Text>

          <Pressable onPress={() => router.back()} style={apStyles.linkBtn}>
            <Text style={apStyles.linkText}>Back</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>How many pieces are included?</Text>

          <Text style={{ color: apColors.muted, lineHeight: 20 }}>
            Only select the number of pieces. Piece names are not required
            because buyers can see them in product images and description.
          </Text>

          {READY_PIECE_COUNTS.map((count) => (
            <Pressable
              key={count}
              onPress={() => choose(count)}
              style={[
                apStyles.secondaryBtn,
                pieceCount === count ? { borderWidth: 2 } : null,
              ]}
            >
              <Text style={apStyles.secondaryText}>
                {pieceCount === count ? "✓ " : ""}
                {count} piece{count > 1 ? "s" : ""}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={[
              apStyles.primaryBtn,
              !pieceCount ? apStyles.primaryBtnDisabled : null,
            ]}
            disabled={!pieceCount}
            onPress={next}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
