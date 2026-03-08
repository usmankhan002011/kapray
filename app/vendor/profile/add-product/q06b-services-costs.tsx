import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";
import { apColors, apStyles } from "@/components/product/addProductStyles";

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

  const needsDyeing = category === "unstitched_dyeing" || category === "unstitched_dyeing_tailoring";
  const needsTailoring = category === "unstitched_dyeing_tailoring";

  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<boolean>(false);
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);

  const [dyeingCost, setDyeingCost] = useState<string>(() => {
    const fromPrice = safeNumOrZero((draft?.price as any)?.dyeing_cost_pkr ?? 0);
    if (fromPrice > 0) return String(fromPrice);
    const fromSpec = safeNumOrZero((draft?.spec as any)?.dyeing_cost_pkr ?? 0);
    return fromSpec > 0 ? String(fromSpec) : "";
  });

  const [tailoringCost, setTailoringCost] = useState<string>(() => {
    const fromPrice = safeNumOrZero((draft?.price as any)?.tailoring_cost_pkr ?? 0);
    return fromPrice > 0 ? String(fromPrice) : "";
  });

  const [turnaroundDays, setTurnaroundDays] = useState<string>(() => {
    const fromSpec = safeNumOrZero((draft?.spec as any)?.tailoring_turnaround_days ?? 0);
    return fromSpec > 0 ? String(fromSpec) : "";
  });

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

  useEffect(() => {
    if (category === "unstitched_plain" || category === "stitched_ready") {
      patchSpec({ dyeing_enabled: false, tailoring_enabled: false, tailoring_turnaround_days: 0 });
      patchPrice({ dyeing_cost_pkr: 0, tailoring_cost_pkr: 0 });
      return;
    }

    patchSpec({
      dyeing_enabled: needsDyeing,
      tailoring_enabled: needsTailoring
    });

    if (!needsDyeing) patchPrice({ dyeing_cost_pkr: 0 });
    if (!needsTailoring) {
      patchPrice({ tailoring_cost_pkr: 0 });
      patchSpec({ tailoring_turnaround_days: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;

    if (needsDyeing) {
      const d = Number(dyeingCost);
      if (!Number.isFinite(d) || d <= 0) return false;
    }

    if (needsTailoring) {
      if (!vendorOffersTailoring) return false;

      const t = Number(tailoringCost);
      if (!Number.isFinite(t) || t <= 0) return false;

      const days = turnaroundDays === "" ? 0 : Number(turnaroundDays);
      if (!Number.isFinite(days) || days < 0) return false;
    }

    return true;
  }, [vendorId, needsDyeing, dyeingCost, needsTailoring, vendorOffersTailoring, tailoringCost, turnaroundDays]);

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (needsTailoring && !vendorOffersTailoring) {
      Alert.alert(
        "Tailoring not enabled",
        "You cannot continue because your vendor profile does not offer tailoring. Enable “Stitching / Tailoring” in your profile first."
      );
      return;
    }

    if (needsDyeing) {
      const d = Number(sanitizeNumber(dyeingCost) || "0");
      if (!Number.isFinite(d) || d <= 0) {
        Alert.alert("Invalid dyeing cost", "Please enter a valid dyeing cost (PKR).");
        return;
      }
      patchPrice({ dyeing_cost_pkr: d });
      patchSpec({ dyeing_cost_pkr: d });
    }

    if (needsTailoring) {
      const t = Number(sanitizeNumber(tailoringCost) || "0");
      if (!Number.isFinite(t) || t <= 0) {
        Alert.alert("Invalid tailoring cost", "Please enter a valid tailoring cost (PKR).");
        return;
      }
      const days = turnaroundDays === "" ? 0 : Number(sanitizeNumber(turnaroundDays) || "0");
      if (!Number.isFinite(days) || days < 0) {
        Alert.alert("Invalid turnaround", "Turnaround days must be 0 or more.");
        return;
      }

      patchPrice({ tailoring_cost_pkr: t });
      patchSpec({ tailoring_turnaround_days: Math.max(0, Math.trunc(days)) });
    }

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q09-images" as any);
  }

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        if (needsDyeing) {
          dyeingRef.current?.focus();
          return;
        }
        if (needsTailoring) {
          tailoringRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [needsDyeing, needsTailoring])
  );

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Services & Costs</Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          {vendorLoading ? (
            <View style={apStyles.loadingRow}>
              <ActivityIndicator />
              <Text style={apStyles.loadingText}>Loading vendor settings…</Text>
            </View>
          ) : null}

          {needsDyeing ? (
            <>
              <Text style={apStyles.label}>Dyeing cost (PKR) *</Text>
              <TextInput
                ref={dyeingRef}
                value={dyeingCost}
                onChangeText={(t) => setDyeingCost(sanitizeNumber(t))}
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
            </>
          ) : null}

          {needsTailoring ? (
            <>
              <Text style={apStyles.label}>Tailoring cost (PKR) *</Text>
              <TextInput
                ref={tailoringRef}
                value={tailoringCost}
                onChangeText={(t) => setTailoringCost(sanitizeNumber(t))}
                placeholder="e.g., 2500"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="decimal-pad"
                maxLength={12}
                returnKeyType="next"
              />

              <Text style={apStyles.label}>Tailoring turnaround (days)</Text>
              <TextInput
                value={turnaroundDays}
                onChangeText={(t) => setTurnaroundDays(sanitizeNumber(t))}
                placeholder="e.g., 12"
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="done"
              />
            </>
          ) : null}

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