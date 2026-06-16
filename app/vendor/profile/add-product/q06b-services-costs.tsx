import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductNotice,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeNumOrZero(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
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

export default function Q06BServicesCosts() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const dyeingRef = useRef<TextInput>(null);
  const tailoringRef = useRef<TextInput>(null);

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  const category = inferCategoryFromDraft(draft);
  const needsDyeing =
    category === "unstitched_dyeing" ||
    category === "unstitched_dyeing_tailoring";
  const needsTailoring = category === "unstitched_dyeing_tailoring";

  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<
    boolean | null
  >(needsTailoring ? null : false);
  const [vendorLoading, setVendorLoading] = useState(false);

  const [dyeingCost, setDyeingCost] = useState(() => {
    const fromPrice = safeNumOrZero(
      (draft?.price as any)?.dyeing_cost_pkr ?? 0,
    );
    if (fromPrice > 0) return String(fromPrice);
    const fromSpec = safeNumOrZero((draft?.spec as any)?.dyeing_cost_pkr ?? 0);
    return fromSpec > 0 ? String(fromSpec) : "";
  });

  const [tailoringCost, setTailoringCost] = useState(() => {
    const fromPrice = safeNumOrZero(
      (draft?.price as any)?.tailoring_cost_pkr ?? 0,
    );
    return fromPrice > 0 ? String(fromPrice) : "";
  });

  const [turnaroundDays, setTurnaroundDays] = useState(() => {
    const fromSpec = safeNumOrZero(
      (draft?.spec as any)?.tailoring_turnaround_days ?? 0,
    );
    return fromSpec > 0 ? String(fromSpec) : "";
  });

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

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        price: { ...(prev?.price ?? {}), ...patch },
      }));
      return;
    }
    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  useEffect(() => {
    let alive = true;

    async function loadVendorTailoring() {
      if (!needsTailoring) {
        setVendorLoading(false);
        setVendorOffersTailoring(false);
        return;
      }

      if (!vendorId) {
        setVendorLoading(false);
        setVendorOffersTailoring(false);
        return;
      }

      try {
        setVendorLoading(true);
        setVendorOffersTailoring(null);

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

    loadVendorTailoring();

    return () => {
      alive = false;
    };
  }, [vendorId, needsTailoring]);

  useEffect(() => {
    if (category === "unstitched_plain" || category === "stitched_ready") {
      patchSpec({
        dyeing_enabled: false,
        tailoring_enabled: false,
        tailoring_turnaround_days: 0,
        includes_trouser: false,
        tailoring_style_presets: [],
      });
      patchPrice({ dyeing_cost_pkr: 0, tailoring_cost_pkr: 0 });
      return;
    }

    patchSpec({
      dyeing_enabled: needsDyeing,
      tailoring_enabled: needsTailoring,
    });

    if (!needsDyeing) patchPrice({ dyeing_cost_pkr: 0 });

    if (!needsTailoring) {
      patchPrice({ tailoring_cost_pkr: 0 });
      patchSpec({
        tailoring_turnaround_days: 0,
        includes_trouser: false,
        tailoring_style_presets: [],
      });
    }
  }, [category, needsDyeing, needsTailoring]);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;

    if (needsDyeing) {
      const d = Number(dyeingCost);
      if (!Number.isFinite(d) || d <= 0) return false;
    }

    if (needsTailoring) {
      if (vendorOffersTailoring !== true) return false;

      const t = Number(tailoringCost);
      if (!Number.isFinite(t) || t <= 0) return false;

      const days = turnaroundDays === "" ? 0 : Number(turnaroundDays);
      if (!Number.isFinite(days) || days < 0) return false;
    }

    return true;
  }, [
    vendorId,
    needsDyeing,
    dyeingCost,
    needsTailoring,
    vendorOffersTailoring,
    tailoringCost,
    turnaroundDays,
  ]);

  const disabledHint = !vendorId
    ? "Vendor not loaded."
    : needsDyeing &&
        (!Number.isFinite(Number(dyeingCost)) || Number(dyeingCost) <= 0)
      ? "Enter a valid dyeing cost."
      : needsTailoring && vendorOffersTailoring === null
        ? "Loading vendor tailoring settings."
        : needsTailoring && vendorOffersTailoring === false
          ? "Enable tailoring in your vendor profile first."
          : needsTailoring &&
              (!Number.isFinite(Number(tailoringCost)) ||
                Number(tailoringCost) <= 0)
            ? "Enter a valid tailoring cost."
            : needsTailoring &&
                turnaroundDays !== "" &&
                (!Number.isFinite(Number(turnaroundDays)) ||
                  Number(turnaroundDays) < 0)
              ? "Enter valid turnaround days."
              : "";

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    if (needsTailoring && vendorOffersTailoring !== true) {
      Alert.alert(
        "Tailoring not enabled",
        "You cannot continue because your vendor profile does not offer tailoring. Enable stitching / tailoring in your profile first.",
      );
      return;
    }

    if (needsDyeing) {
      const d = Number(sanitizeNumber(dyeingCost) || "0");
      if (!Number.isFinite(d) || d <= 0) {
        Alert.alert(
          "Invalid dyeing cost",
          "Please enter a valid dyeing cost (PKR).",
        );
        return;
      }
      patchPrice({ dyeing_cost_pkr: d });
      patchSpec({ dyeing_cost_pkr: d });
    }

    if (needsTailoring) {
      const t = Number(sanitizeNumber(tailoringCost) || "0");
      if (!Number.isFinite(t) || t <= 0) {
        Alert.alert(
          "Invalid tailoring cost",
          "Please enter a valid tailoring cost (PKR).",
        );
        return;
      }

      const days =
        turnaroundDays === ""
          ? 0
          : Number(sanitizeNumber(turnaroundDays) || "0");
      if (!Number.isFinite(days) || days < 0) {
        Alert.alert("Invalid turnaround", "Turnaround days must be 0 or more.");
        return;
      }

      patchPrice({ tailoring_cost_pkr: t });
      patchSpec({
        tailoring_turnaround_days: Math.max(0, Math.trunc(days)),
      });

      if (returnTo) {
        router.replace(returnTo as any);
        return;
      }

      router.push("/vendor/profile/add-product/q06c-shipping" as any);
      return;
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q06c-shipping" as any);
  }

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        if (needsDyeing) {
          dyeingRef.current?.focus();
          return;
        }
        if (needsTailoring) tailoringRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [needsDyeing, needsTailoring]),
  );

  return (
    <AddProductScreen
      title="Services & Costs"
      onBack={closeScreen}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        {vendorLoading || (needsTailoring && vendorOffersTailoring === null) ? (
          <View style={[apStyles.loadingRow, { marginBottom: 12 }]}>
            <ActivityIndicator />
            <Text style={apStyles.loadingText}>Loading vendor settings...</Text>
          </View>
        ) : null}

        {needsDyeing ? (
          <AddProductField
            label="Dyeing cost (PKR)"
            required
            style={{ marginTop: 0 }}
          >
            <FastNumberInput
              ref={dyeingRef}
              value={dyeingCost}
              onChangeText={setDyeingCost}
              placeholder="e.g., 800"
              placeholderTextColor={apColors.muted}
              style={apStyles.input}
              keyboardType="decimal-pad"
              maxLength={12}
              returnKeyType={needsTailoring ? "next" : "done"}
              onSubmitEditing={() => {
                if (needsTailoring) tailoringRef.current?.focus();
              }}
            />
          </AddProductField>
        ) : null}

        {needsTailoring ? (
          <>
            {vendorOffersTailoring === false ? (
              <AddProductNotice
                title="Tailoring is not enabled in vendor profile"
                tone="warning"
              >
                Enable stitching / tailoring in vendor profile before using this product category.
              </AddProductNotice>
            ) : null}

            <AddProductField
              label="Tailoring cost (PKR)"
              required
              style={{
                marginTop: needsDyeing || vendorOffersTailoring === false ? 14 : 0,
              }}
            >
              <FastNumberInput
                ref={tailoringRef}
                value={tailoringCost}
                onChangeText={setTailoringCost}
                placeholder="e.g., 2500"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
                maxLength={12}
                returnKeyType="next"
              />
            </AddProductField>

            <AddProductField label="Tailoring turnaround (days)">
              <FastNumberInput
                value={turnaroundDays}
                onChangeText={setTurnaroundDays}
                placeholder="e.g., 12"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="done"
              />
            </AddProductField>
          </>
        ) : null}
      </AddProductCard>
    </AddProductScreen>
  );
}
