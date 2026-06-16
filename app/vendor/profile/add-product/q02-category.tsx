import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";
import { apStyles } from "@/components/product/addProductStyles";
import {
  AddProductCard,
  AddProductChoice,
  AddProductField,
  AddProductFooter,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

type MainCategory = "unstitched" | "stitched";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type CategoryChoice = ProductCategory | "stitched_made_on_order";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function inferSelectionFromDraft(draft: any): {
  mainCategory: MainCategory | null;
  categoryChoice: CategoryChoice | null;
} {
  const category = safeStr(draft?.spec?.product_category);

  if (
    category === "unstitched_plain" ||
    category === "unstitched_dyeing" ||
    category === "unstitched_dyeing_tailoring"
  ) {
    return {
      mainCategory: "unstitched",
      categoryChoice: category,
    };
  }

  if (category === "stitched_ready") {
    return {
      mainCategory: "stitched",
      categoryChoice: Boolean(draft?.spec?.made_on_order)
        ? "stitched_made_on_order"
        : "stitched_ready",
    };
  }

  return { mainCategory: null, categoryChoice: null };
}

export default function Q02Category() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";
  const fromReview = returnTo === "/vendor/profile/add-product/review";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;
  const initialSelection = inferSelectionFromDraft(draft);

  const [mainCategory, setMainCategory] = useState<MainCategory | null>(
    initialSelection.mainCategory,
  );
  const [categoryChoice, setCategoryChoice] = useState<CategoryChoice | null>(
    initialSelection.categoryChoice,
  );
  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<
    boolean | null
  >(null);
  const [vendorLoading, setVendorLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadVendor() {
      if (!vendorId) {
        if (alive) {
          setVendorOffersTailoring(false);
          setVendorLoading(false);
        }
        return;
      }

      try {
        if (alive) {
          setVendorLoading(true);
          setVendorOffersTailoring(null);
        }

        const { data, error } = await supabase
          .from("vendor")
          .select("id, offers_tailoring")
          .eq("id", vendorId)
          .single();

        if (!alive) return;

        setVendorOffersTailoring(
          error ? false : Boolean((data as any)?.offers_tailoring),
        );
      } catch {
        if (alive) setVendorOffersTailoring(false);
      } finally {
        if (alive) setVendorLoading(false);
      }
    }

    loadVendor();

    return () => {
      alive = false;
    };
  }, [vendorId]);

  function ensureEditable() {
    if (!fromReview) return true;
    Alert.alert(
      "Category locked",
      "Category is fixed once set and cannot be changed from Review.",
    );
    return false;
  }

  function selectMainCategory(next: MainCategory) {
    if (!ensureEditable()) return;
    setMainCategory(next);

    const choiceMatchesMain =
      next === "unstitched"
        ? categoryChoice?.startsWith("unstitched_")
        : categoryChoice?.startsWith("stitched_");

    if (!choiceMatchesMain) setCategoryChoice(null);
  }

  function applyChoice(next: CategoryChoice) {
    if (!ensureEditable()) return;

    if (
      next === "unstitched_dyeing_tailoring" &&
      vendorOffersTailoring !== true
    ) {
      Alert.alert(
        vendorOffersTailoring === null
          ? "Loading vendor settings"
          : "Tailoring not enabled",
        vendorOffersTailoring === null
          ? "Please wait while we check your vendor tailoring settings."
          : "You cannot select Dyeing + Tailoring because you do not offer tailoring. Enable stitching / tailoring in your profile first.",
      );
      return;
    }

    setCategoryChoice(next);

    if (next === "stitched_ready" || next === "stitched_made_on_order") {
      ctx.setDraft({
        ...draft,
        inventory_qty: 0,
        spec: {
          ...(draft?.spec ?? {}),
          product_category: "stitched_ready",
          made_on_order: next === "stitched_made_on_order",
          dyeing_enabled: false,
          tailoring_enabled: false,
          tailoring_turnaround_days: 0,
        },
        price: {
          ...(draft?.price ?? {}),
          mode: "stitched_total",
          cost_pkr_per_meter: null,
          dyeing_cost_pkr: 0,
          tailoring_cost_pkr: 0,
          ...(next === "stitched_made_on_order"
            ? { simple_ready_inventory: [], variants: [] }
            : { made_order_variants: [] }),
        },
      });
      return;
    }

    const dyeingEnabled =
      next === "unstitched_dyeing" ||
      next === "unstitched_dyeing_tailoring";
    const tailoringEnabled = next === "unstitched_dyeing_tailoring";

    ctx.setDraft({
      ...draft,
      spec: {
        ...(draft?.spec ?? {}),
        product_category: next,
        made_on_order: false,
        dyeing_enabled: dyeingEnabled,
        tailoring_enabled: tailoringEnabled,
        ...(!tailoringEnabled ? { tailoring_turnaround_days: 0 } : {}),
      },
      price: {
        ...(draft?.price ?? {}),
        mode: "unstitched_per_meter",
        cost_pkr_total: null,
        available_sizes: [],
        simple_ready_inventory: [],
        variants: [],
        made_order_variants: [],
        ...(!dyeingEnabled ? { dyeing_cost_pkr: 0 } : {}),
        ...(!tailoringEnabled ? { tailoring_cost_pkr: 0 } : {}),
      },
    });
  }

  const canContinue = useMemo(() => {
    if (!vendorId || !mainCategory || !categoryChoice) return false;
    if (
      categoryChoice === "unstitched_dyeing_tailoring" &&
      vendorOffersTailoring !== true
    ) {
      return false;
    }

    return mainCategory === "unstitched"
      ? categoryChoice.startsWith("unstitched_")
      : categoryChoice.startsWith("stitched_");
  }, [vendorId, mainCategory, categoryChoice, vendorOffersTailoring]);

  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : !mainCategory
      ? "Select category."
      : !categoryChoice
        ? "Select category."
        : categoryChoice === "unstitched_dyeing_tailoring" &&
            vendorOffersTailoring === null
          ? "Loading vendor settings."
          : categoryChoice === "unstitched_dyeing_tailoring" &&
              vendorOffersTailoring === false
            ? "Tailoring not enabled."
            : "";

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!mainCategory || !categoryChoice) {
      Alert.alert(
        "Category required",
        "Please select a main category and subcategory.",
      );
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push(
      mainCategory === "unstitched"
        ? ("/vendor/profile/add-product/q04-inventory" as any)
        : ("/vendor/profile/add-product/q05a-stitched-total-cost" as any),
    );
  }

  function onClose() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function choiceButton(
    choice: CategoryChoice,
    label: string,
    disabled = false,
  ) {
    return (
      <AddProductChoice
        key={choice}
        title={label}
        selected={categoryChoice === choice}
        onPress={() => applyChoice(choice)}
        disabled={fromReview || disabled}
      />
    );
  }

  const tailoringNotice =
    vendorLoading || vendorOffersTailoring === null ? (
      <View style={apStyles.loadingRow}>
        <ActivityIndicator />
        <Text style={apStyles.loadingText}>Loading vendor settings...</Text>
      </View>
    ) : vendorOffersTailoring ? (
      <Text style={apStyles.metaHint}>
        Tailoring services have been offered by you
      </Text>
    ) : (
      <Text style={apStyles.metaHint}>
        Tailoring services have not been offered by you
      </Text>
    );

  return (
    <AddProductScreen
      title="Category"
      onBack={onClose}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <AddProductField
          label="Select category"
          required
          style={{ marginTop: 0 }}
        >
          <View style={apStyles.segmentRow}>
            <AddProductChoice
              title="Unstitched"
              selected={mainCategory === "unstitched"}
              onPress={() => selectMainCategory("unstitched")}
              disabled={fromReview}
            />

            {mainCategory === "unstitched" ? (
              <View style={apStyles.subChoicePanel}>
                <AddProductField
                  label="Select unstitched type"
                  required
                  style={{ marginTop: 0 }}
                >
                  {tailoringNotice}

                  <View style={apStyles.subChoiceStack}>
                    {choiceButton(
                      "unstitched_plain",
                      "Unstitched (Plain)",
                    )}
                    {choiceButton(
                      "unstitched_dyeing",
                      "Unstitched + Dyeing",
                    )}
                    {choiceButton(
                      "unstitched_dyeing_tailoring",
                      "Unstitched + Dyeing + Tailoring",
                      vendorOffersTailoring !== true,
                    )}
                  </View>
                </AddProductField>
              </View>
            ) : null}

            <AddProductChoice
              title="Stitched"
              selected={mainCategory === "stitched"}
              onPress={() => selectMainCategory("stitched")}
              disabled={fromReview}
            />

            {mainCategory === "stitched" ? (
              <View style={apStyles.subChoicePanel}>
                <AddProductField
                  label="Select stitched type"
                  required
                  style={{ marginTop: 0 }}
                >
                  <View style={apStyles.subChoiceStack}>
                    {choiceButton(
                      "stitched_ready",
                      "Ready to wear",
                    )}
                    {choiceButton(
                      "stitched_made_on_order",
                      "Made on order",
                    )}
                  </View>
                </AddProductField>
              </View>
            ) : null}
          </View>
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}
