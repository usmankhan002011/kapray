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

export default function Q06B2TailoringStyleChoice() {
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
  const needsTailoring = category === "unstitched_dyeing_tailoring";

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

  function goYes() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    if (!needsTailoring) {
      Alert.alert(
        "Wrong product flow",
        "Tailoring style cards are only for Unstitched + Dyeing + Tailoring products.",
      );
      return;
    }

    patchSpec({
      has_tailoring_style_presets: true,
    });

    router.push({
      pathname: "/vendor/profile/add-product/q06b2-tailoring-styles" as any,
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
      has_tailoring_style_presets: false,
      includes_trouser: false,
      tailoring_style_presets: [],
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
          <Text style={apStyles.title}>Tailoring Styles</Text>

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
            Do you want to add tailoring style cards?
          </Text>

          <Text style={{ color: apColors.muted, lineHeight: 20 }}>
            Add tailoring style cards for this product with reference images for
            different blouse, trouser, applique, and other tailoring or design
            options.
          </Text>

          <Pressable style={apStyles.primaryBtn} onPress={goYes}>
            <Text style={apStyles.primaryText}>Yes, add tailoring styles</Text>
          </Pressable>

          <Pressable style={apStyles.secondaryBtn} onPress={goNo}>
            <Text style={apStyles.secondaryText}>
              No, continue without styles
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
