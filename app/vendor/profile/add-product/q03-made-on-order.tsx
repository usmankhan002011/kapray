import React, { useMemo, useState } from "react";
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

export default function Q03MadeOnOrder() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setInventoryQty } = ctx;

  const initial = Boolean((draft?.spec as any)?.made_on_order ?? false);
  const [madeOnOrder, setMadeOnOrder] = useState<boolean>(initial);

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, spec: { ...(prev?.spec ?? {}), ...patch } }));
      return;
    }
    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);

  function setYes() {
    setMadeOnOrder(true);
    patchSpec({ made_on_order: true });
    setInventoryQty?.(0);
  }

  function setNo() {
    setMadeOnOrder(false);
    patchSpec({ made_on_order: false });
  }

  function goNext() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    router.push(
      returnTo
        ? (`/vendor/profile/add-product/q04-inventory?returnTo=${encodeURIComponent(returnTo)}` as any)
        : ("/vendor/profile/add-product/q04-inventory" as any)
    );
  }

  const category = safeStr((draft?.spec as any)?.product_category ?? "");

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Made on order</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>MADE ON ORDER?</Text>

          {/* YES */}
          <Pressable
            onPress={setYes}
            style={({ pressed }) => [
              apStyles.segment,
              madeOnOrder ? apStyles.segmentOn : null,
              pressed ? apStyles.pressed : null
            ]}
          >
            <Text
              style={[
                apStyles.segmentText,
                madeOnOrder ? apStyles.segmentTextOn : null
              ]}
            >
              {madeOnOrder ? "✓  Yes" : "Yes"}
            </Text>
          </Pressable>

          {/* NO */}
          <Pressable
            onPress={setNo}
            style={({ pressed }) => [
              apStyles.segment,
              !madeOnOrder ? apStyles.segmentOn : null,
              pressed ? apStyles.pressed : null,
              { marginTop: 10 }
            ]}
          >
            <Text
              style={[
                apStyles.segmentText,
                !madeOnOrder ? apStyles.segmentTextOn : null
              ]}
            >
              {!madeOnOrder ? "✓  No" : "No"}
            </Text>
          </Pressable>

          <Text style={apStyles.metaHint}>
            {madeOnOrder
              ? "Inventory will be set as 0. Buyer will see “Made on order”."
              : "Set inventory quantity in the next step."}
          </Text>

          {/* {category ? (
            <Text style={apStyles.metaHint}>
              Category:{" "}
              <Text style={{ fontWeight: "900", color: apColors.text }}>
                {category}
              </Text>
            </Text>
          ) : null} */}

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null
            ]}
            onPress={goNext}
            disabled={!canContinue}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}