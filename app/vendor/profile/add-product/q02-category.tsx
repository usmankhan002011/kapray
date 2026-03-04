import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";
import { apStyles } from "@/components/product/addProductStyles";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function inferCategoryFromDraft(draft: any): ProductCategory {
  const spec = draft?.spec ?? {};
  const price = draft?.price ?? {};
  const fromSpec = safeStr((spec as any)?.product_category ?? "");
  if (
    fromSpec === "unstitched_plain" ||
    fromSpec === "unstitched_dyeing" ||
    fromSpec === "unstitched_dyeing_tailoring" ||
    fromSpec === "stitched_ready"
  ) {
    return fromSpec as ProductCategory;
  }

  const mode = safeStr(price?.mode ?? "");
  if (mode === "stitched_total") return "stitched_ready";

  const dye = Boolean(spec?.dyeing_enabled);
  const tail = Boolean(spec?.tailoring_enabled);

  if (tail) return "unstitched_dyeing_tailoring";
  if (dye) return "unstitched_dyeing";
  return "unstitched_plain";
}

export default function Q02Category() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  // ✅ Lock category edits when arriving from Review
  const fromReview = returnTo === "/vendor/profile/add-product/review";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft, setPriceMode } = ctx;

  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<boolean>(false);
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);

  const [category, setCategory] = useState<ProductCategory>(() => inferCategoryFromDraft(draft));

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, spec: { ...(prev?.spec ?? {}), ...patch } }));
      return;
    }
    // last resort (not ideal)
    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, price: { ...(prev?.price ?? {}), ...patch } }));
      return;
    }
    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  useEffect(() => {
    let alive = true;

    async function loadVendor() {
      if (!vendorId) {
        if (alive) setVendorOffersTailoring(false);
        return;
      }

      try {
        if (alive) setVendorLoading(true);

        const { data, error } = await supabase
          .from("vendor")
          .select("id, offers_tailoring")
          .eq("id", vendorId)
          .single();

        if (!alive) return;

        if (error) {
          setVendorOffersTailoring(false);
          return;
        }

        setVendorOffersTailoring(Boolean((data as any)?.offers_tailoring));
      } catch {
        if (!alive) return;
        setVendorOffersTailoring(false);
      } finally {
        if (alive) setVendorLoading(false);
      }
    }

    loadVendor();

    return () => {
      alive = false;
    };
  }, [vendorId]);

  // Keep draft in sync when category changes
  useEffect(() => {
    patchSpec({ product_category: category });

    if (category === "stitched_ready") {
      if (draft?.price?.mode !== "stitched_total") setPriceMode?.("stitched_total");
      patchSpec({ dyeing_enabled: false, tailoring_enabled: false, tailoring_turnaround_days: 0 });
      patchPrice({ dyeing_cost_pkr: 0, tailoring_cost_pkr: 0 });
      return;
    }

    if (draft?.price?.mode !== "unstitched_per_meter") setPriceMode?.("unstitched_per_meter");

    const dyeingEnabled = category === "unstitched_dyeing" || category === "unstitched_dyeing_tailoring";
    const tailoringEnabled = category === "unstitched_dyeing_tailoring";

    patchSpec({
      dyeing_enabled: dyeingEnabled,
      tailoring_enabled: tailoringEnabled
    });

    if (!dyeingEnabled) patchPrice({ dyeing_cost_pkr: 0 });
    if (!tailoringEnabled) {
      patchPrice({ tailoring_cost_pkr: 0 });
      patchSpec({ tailoring_turnaround_days: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Gate tailoring category by vendor.offers_tailoring (only while choosing category, not from Review)
  useEffect(() => {
    if (fromReview) return;

    if (category === "unstitched_dyeing_tailoring" && !vendorOffersTailoring) {
      setCategory("unstitched_dyeing");
      Alert.alert(
        "Tailoring not enabled",
        "You cannot select “Dyeing + Tailoring” because you not offer tailoring. Enable “Stitching / Tailoring” in your profile first."
      );
    }
  }, [vendorOffersTailoring, category, fromReview]);

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q03-made-on-order" as any);
  }

  function onClose() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function trySetCategory(next: ProductCategory) {
    if (fromReview) {
      Alert.alert("Category locked", "Category is fixed once set and cannot be changed from Review.");
      return;
    }
    setCategory(next);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Category</Text>

          <Pressable onPress={onClose} style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}>
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Select category *</Text>

          {vendorLoading ? (
            <View style={apStyles.loadingRow}>
              <ActivityIndicator />
              <Text style={apStyles.loadingText}>Loading vendor settings…</Text>
            </View>
          ) : (
            <Text style={apStyles.metaHint}>
              {vendorOffersTailoring
                ? "Tailoring services have been offered by you"
                : "Tailoring services have not been offered by you"}
            </Text>
          )}

          <View style={apStyles.segmentRow}>
            <Pressable
              onPress={() => trySetCategory("unstitched_plain")}
              disabled={fromReview}
              style={({ pressed }) => [
                apStyles.segment,
                category === "unstitched_plain" ? apStyles.segmentOn : null,
                fromReview ? apStyles.segmentDisabled : null,
                pressed ? apStyles.pressed : null
              ]}
            >
              <Text
                style={[
                  apStyles.segmentText,
                  category === "unstitched_plain" ? apStyles.segmentTextOn : null,
                  fromReview ? apStyles.segmentTextDisabled : null
                ]}
              >
                Unstitched (Plain)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => trySetCategory("unstitched_dyeing")}
              disabled={fromReview}
              style={({ pressed }) => [
                apStyles.segment,
                category === "unstitched_dyeing" ? apStyles.segmentOn : null,
                fromReview ? apStyles.segmentDisabled : null,
                pressed ? apStyles.pressed : null
              ]}
            >
              <Text
                style={[
                  apStyles.segmentText,
                  category === "unstitched_dyeing" ? apStyles.segmentTextOn : null,
                  fromReview ? apStyles.segmentTextDisabled : null
                ]}
              >
                Unstitched + Dyeing
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (fromReview) {
                  Alert.alert("Category locked", "Category is fixed once set and cannot be changed from Review.");
                  return;
                }

                if (!vendorOffersTailoring) {
                  Alert.alert(
                    "Tailoring not enabled",
                    "You cannot select “Dyeing + Tailoring” because your do not offer tailoring. Enable “Stitching / Tailoring” in your profile first."
                  );
                  return;
                }
                setCategory("unstitched_dyeing_tailoring");
              }}
              disabled={fromReview}
              style={({ pressed }) => [
                apStyles.segment,
                category === "unstitched_dyeing_tailoring" ? apStyles.segmentOn : null,
                !vendorOffersTailoring ? apStyles.segmentDisabled : null,
                fromReview ? apStyles.segmentDisabled : null,
                pressed ? apStyles.pressed : null
              ]}
            >
              <Text
                style={[
                  apStyles.segmentText,
                  category === "unstitched_dyeing_tailoring" ? apStyles.segmentTextOn : null,
                  !vendorOffersTailoring ? apStyles.segmentTextDisabled : null,
                  fromReview ? apStyles.segmentTextDisabled : null
                ]}
              >
                Unstitched + Dyeing + Tailoring
              </Text>
            </Pressable>

            <Pressable
              onPress={() => trySetCategory("stitched_ready")}
              disabled={fromReview}
              style={({ pressed }) => [
                apStyles.segment,
                category === "stitched_ready" ? apStyles.segmentOn : null,
                fromReview ? apStyles.segmentDisabled : null,
                pressed ? apStyles.pressed : null
              ]}
            >
              <Text
                style={[
                  apStyles.segmentText,
                  category === "stitched_ready" ? apStyles.segmentTextOn : null,
                  fromReview ? apStyles.segmentTextDisabled : null
                ]}
              >
                Stitched / Ready-to-wear
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null
            ]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}