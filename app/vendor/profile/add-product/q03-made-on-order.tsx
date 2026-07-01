import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apStyles } from "@/components/product/addProductStyles";
import {
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

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
      ctx.setDraft((prev: any) => ({
        ...prev,
        spec: { ...(prev?.spec ?? {}), ...patch },
      }));
      return;
    }
    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

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
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    const category = safeStr((draft?.spec as any)?.product_category ?? "");
    const isStitchedReady = category === "stitched_ready";

    if (isStitchedReady && madeOnOrder) {
      router.push(
        returnTo
          ? (`/vendor/profile/add-product/q05a-stitched-total-cost?returnTo=${encodeURIComponent(returnTo)}` as any)
          : ("/vendor/profile/add-product/q05a-stitched-total-cost" as any),
      );
      return;
    }

    if (isStitchedReady && !madeOnOrder) {
      router.push(
        returnTo
          ? (`/vendor/profile/add-product/q05a-stitched-total-cost?returnTo=${encodeURIComponent(returnTo)}` as any)
          : ("/vendor/profile/add-product/q05a-stitched-total-cost" as any),
      );
      return;
    }

    router.push(
      returnTo
        ? (`/vendor/profile/add-product/q04-inventory?returnTo=${encodeURIComponent(returnTo)}` as any)
        : ("/vendor/profile/add-product/q04-inventory" as any),
    );
  }

  return (
    <AddProductScreen
      title="Made on order"
      onBack={() => router.back()}
      footer={
        <AddProductFooter
          onPrimaryPress={goNext}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <View style={apStyles.card}>
        <Text style={apStyles.label}>Made on order?</Text>

          {/* YES */}
          <Pressable
            onPress={setYes}
            style={({ pressed }) => [
              apStyles.segment,
              madeOnOrder ? apStyles.segmentOn : null,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text
              style={[
                apStyles.segmentText,
                madeOnOrder ? apStyles.segmentTextOn : null,
              ]}
            >
              {madeOnOrder ? "Selected - Yes" : "Yes"}
            </Text>
          </Pressable>

          {/* NO */}
          <Pressable
            onPress={setNo}
            style={({ pressed }) => [
              apStyles.segment,
              !madeOnOrder ? apStyles.segmentOn : null,
              pressed ? apStyles.pressed : null,
              { marginTop: 10 },
            ]}
          >
            <Text
              style={[
                apStyles.segmentText,
                !madeOnOrder ? apStyles.segmentTextOn : null,
              ]}
            >
              {!madeOnOrder ? "Selected - No" : "No"}
            </Text>
          </Pressable>

          <Text style={apStyles.metaHint}>
            {madeOnOrder
              ? "Inventory will be set as 0. Buyer will see “Made on order”."
              : "Set inventory quantity in the next step."}
          </Text>

      </View>
    </AddProductScreen>
  );
}
