// File: app/purchase/payment.tsx

import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase/client";

type Params = {
  productId?: string;
  product_id?: string;

  productCode?: string;
  product_code?: string;

  productName?: string;
  product_name?: string;

  product_category?: string;

  price?: string;
  currency?: string;
  imageUrl?: string;
  image_url?: string;

  price_per_meter_pkr?: string;
  stitched_total_pkr?: string;
  base_product_cost_pkr?: string;
  fabric_cost_pkr?: string;
  subtotal_before_delivery_pkr?: string;
  delivery_cost_pkr?: string;
  selected_fabric_length_m?: string;

  vendorName?: string;
  vendorShopName?: string;
  vendorMobile?: string;
  vendorAddress?: string;

  mode?: string;
  selectedSize?: string;
  selected_unstitched_size?: string;

  a?: string;
  b?: string;
  c?: string;
  d?: string;
  e?: string;
  f?: string;
  g?: string;
  h?: string;
  i?: string;
  j?: string;
  k?: string;
  l?: string;
  m?: string;
  n?: string;
  o?: string;

  buyerName?: string;
  buyerMobile?: string;
  buyerEmail?: string;

  deliveryAddress?: string;
  city?: string;
  notes?: string;

  destination_type?: string;
  export_region?: string;
  weight_kg?: string;

  dye_shade_id?: string;
  dye_hex?: string;
  dye_label?: string;
  dyeing_cost_pkr?: string;
  dyeing_selected?: string;

  tailoring_cost_pkr?: string;
  tailoring_turnaround_days?: string;
  tailoring_selected?: string;

  selected_tailoring_style_id?: string;
  selected_tailoring_style_title?: string;
  selected_tailoring_style_image?: string;
  selected_tailoring_style_snapshot?: string;
  selected_neck_variation?: string;
  selected_sleeve_variation?: string;
  selected_trouser_variation?: string;
  custom_tailoring_note?: string;
  tailoring_style_extra_cost_pkr?: string;
};

type SelectedTailoringStyleSnapshot = {
  id?: string | null;
  title?: string | null;
  note?: string | null;
  extra_cost_pkr?: number | string | null;
  default_neck?: string | null;
  default_sleeve?: string | null;
  default_trouser?: string | null;
  selected_neck_variation?: string | null;
  selected_sleeve_variation?: string | null;
  selected_trouser_variation?: string | null;
  image_url?: string | null;
  allow_custom_note?: boolean | null;
  custom_note?: string | null;
};

const norm = (v: unknown) => (v == null ? "" : String(v).trim());

function firstNonEmpty(...vals: Array<unknown>) {
  for (const v of vals) {
    const s = norm(v);
    if (s) return s;
  }
  return "";
}

function safeDecode(v: unknown) {
  const s = norm(v);
  if (!s) return "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function safeJsonDecode<T = any>(v: unknown, fallback: T): T {
  const s = safeDecode(v);
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function parseBoolParam(v: unknown): boolean | null {
  const s = norm(v).toLowerCase();
  if (!s) return null;
  if (s === "1" || s === "true" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n" || s === "off") return false;
  return null;
}

function prettyCategory(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanVariationLabel(value: string, kind: "neck" | "sleeve") {
  if (!value) return "";
  const pattern = kind === "neck" ? /\bneck\b/gi : /\bsleeve\b/gi;
  return value.replace(pattern, "").replace(/\s{2,}/g, " ").trim();
}

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const [submitting, setSubmitting] = useState(false);

  const data = useMemo(() => {
    const currency = norm(params.currency) || "PKR";
    const totalPkrSafe = safePositiveNumber(params.price);
    const subtotalBeforeDeliveryPkr = safePositiveNumber(params.subtotal_before_delivery_pkr);
    const deliveryCostPkr = safePositiveNumber(params.delivery_cost_pkr);
    const baseProductCostPkr = safePositiveNumber(params.base_product_cost_pkr);
    const fabricCostPkr = safePositiveNumber(params.fabric_cost_pkr);
    const selectedFabricLengthM = safePositiveNumber(safeDecode(params.selected_fabric_length_m));

    const mode = norm(params.mode) || "standard";
    const selectedSize = norm(params.selectedSize);
    const selectedUnstitchedSize = safeDecode(params.selected_unstitched_size);

    const exactPairs = ([
      ["A", norm(params.a)],
      ["B", norm(params.b)],
      ["C", norm(params.c)],
      ["D", norm(params.d)],
      ["E", norm(params.e)],
      ["F", norm(params.f)],
      ["G", norm(params.g)],
      ["H", norm(params.h)],
      ["I", norm(params.i)],
      ["J", norm(params.j)],
      ["K", norm(params.k)],
      ["L", norm(params.l)],
      ["M", norm(params.m)],
      ["N", norm(params.n)],
      ["O", norm(params.o)],
    ] as [string, string][]).filter(([, v]) => v.length > 0);

    const sizeLine =
      mode === "exact"
        ? exactPairs.length
          ? `Exact: ${exactPairs.map(([k, v]) => `${k}=${v}`).join(", ")}`
          : "Exact: Not set"
        : selectedUnstitchedSize
          ? `Standard: ${selectedUnstitchedSize}`
          : selectedSize
            ? `Standard: ${selectedSize}`
            : "Standard: Not set";

    const dyeShadeId = safeDecode(params.dye_shade_id);
    const dyeHex = safeDecode(params.dye_hex);
    const dyeLabel = safeDecode(params.dye_label);
    const dyeingSelected = parseBoolParam(params.dyeing_selected) === true;
    const dyeCostPkr = dyeingSelected ? safePositiveNumber(safeDecode(params.dyeing_cost_pkr)) : 0;

    const tailoringSelected = parseBoolParam(params.tailoring_selected) === true;
    const tailoringCostPkr = tailoringSelected
      ? safePositiveNumber(safeDecode(params.tailoring_cost_pkr))
      : 0;
    const tailoringTurnaroundDays = safePositiveNumber(
      safeDecode(params.tailoring_turnaround_days),
    );

    const selectedTailoringStyleSnapshot = safeJsonDecode<SelectedTailoringStyleSnapshot | null>(
      params.selected_tailoring_style_snapshot,
      null,
    );

    const selectedTailoringStyleId = safeDecode(params.selected_tailoring_style_id);
    const selectedTailoringStyleTitle =
      safeDecode(params.selected_tailoring_style_title) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.title);

    const selectedTailoringStyleImage =
      safeDecode(params.selected_tailoring_style_image) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.image_url);

    const selectedNeckVariation =
      safeDecode(params.selected_neck_variation) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.selected_neck_variation);

    const selectedSleeveVariation =
      safeDecode(params.selected_sleeve_variation) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.selected_sleeve_variation);

    const selectedTrouserVariation =
      safeDecode(params.selected_trouser_variation) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.selected_trouser_variation);

    const customTailoringNote =
      safeDecode(params.custom_tailoring_note) ||
      safeDecode((selectedTailoringStyleSnapshot as any)?.custom_note);

    const tailoringStyleExtraCostPkr = safePositiveNumber(
      safeDecode(params.tailoring_style_extra_cost_pkr) ||
        (selectedTailoringStyleSnapshot as any)?.extra_cost_pkr,
    );

    const hasStyleSelected =
      tailoringSelected &&
      (Boolean(selectedTailoringStyleId) ||
        Boolean(selectedTailoringStyleTitle) ||
        Boolean(selectedTailoringStyleSnapshot));

    const noChangeInSelectedStyle =
      selectedNeckVariation === "no change in selected style" ||
      selectedSleeveVariation === "no change in selected style" ||
      selectedTrouserVariation === "no change in selected style";

    return {
      productId: firstNonEmpty(params.productId, params.product_id),
      productCode: firstNonEmpty(params.productCode, params.product_code),
      productName: firstNonEmpty(params.productName, params.product_name) || "Product",
      productCategory: norm(params.product_category),
      imageUrl: firstNonEmpty(params.imageUrl, params.image_url),

      currency,
      totalPkrSafe,
      totalText: totalPkrSafe ? `${currency} ${totalPkrSafe}` : `${currency} —`,
      subtotalBeforeDeliveryPkr,
      deliveryCostPkr,
      baseProductCostPkr,
      fabricCostPkr,
      selectedFabricLengthM,

      vendorName: norm(params.vendorName) || norm(params.vendorShopName) || "Vendor",
      vendorMobile: norm(params.vendorMobile),
      vendorAddress: norm(params.vendorAddress),

      buyerName: norm(params.buyerName),
      buyerMobile: norm(params.buyerMobile),
      buyerEmail: norm(params.buyerEmail),

      deliveryAddress: norm(params.deliveryAddress),
      city: norm(params.city),
      notes: norm(params.notes),
      destinationType: norm(params.destination_type),
      exportRegion: safeDecode(params.export_region),
      weightKg: safePositiveNumber(params.weight_kg),

      mode,
      selectedSize,
      selectedUnstitchedSize,
      exactPairs,
      sizeLine,

      dyeingSelected,
      dyeShadeId,
      dyeHex,
      dyeLabel,
      dyeCostPkr,

      tailoringSelected,
      tailoringCostPkr,
      tailoringTurnaroundDays,

      selectedTailoringStyleId,
      selectedTailoringStyleTitle,
      selectedTailoringStyleImage,
      selectedTailoringStyleSnapshot,
      selectedNeckVariation,
      selectedSleeveVariation,
      selectedTrouserVariation,
      customTailoringNote,
      tailoringStyleExtraCostPkr,
      hasStyleSelected,
      noChangeInSelectedStyle,
    };
  }, [params]);

  const onDummyPay = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      if (!data.productId && !data.productCode) {
        Alert.alert("Missing product", "Product id/code not found.");
        return;
      }

      let q = supabase
        .from("products")
        .select("id,vendor_id,product_code,title,spec,price,media")
        .limit(1);

      if (data.productId) q = q.eq("id", Number(data.productId));
      else q = q.eq("product_code", data.productCode);

      const { data: pRow, error: pErr } = await q.single();
      if (pErr) throw pErr;

      const productId = Number(pRow.id);
      const vendorId = Number(pRow.vendor_id);
      const productCode = String(pRow.product_code ?? data.productCode ?? "");
      const title = String(pRow.title ?? data.productName ?? "Product");

      const { data: auth } = await supabase.auth.getUser();
      const buyerAuthUserId = auth?.user?.id ?? null;

      const exactMap: Record<string, string> = {};
      for (const [k, v] of data.exactPairs) exactMap[k] = v;

      const specSnapshot =
        pRow.spec && typeof pRow.spec === "object" ? { ...(pRow.spec as any) } : {};

      if (data.productCategory) {
        (specSnapshot as any).product_category = data.productCategory;
      }

      if (data.selectedUnstitchedSize) {
        (specSnapshot as any).selected_unstitched_size = data.selectedUnstitchedSize;
      }

      if (data.selectedFabricLengthM > 0) {
        (specSnapshot as any).selected_fabric_length_m = data.selectedFabricLengthM;
      }

      if (data.fabricCostPkr > 0) {
        (specSnapshot as any).fabric_cost_pkr = data.fabricCostPkr;
      }

      if (data.dyeingSelected) {
        (specSnapshot as any).dye_shade_id = data.dyeShadeId || "";
        (specSnapshot as any).dye_hex = data.dyeHex || "";
        (specSnapshot as any).dye_label = data.dyeLabel || "";
        (specSnapshot as any).dyeing_cost_pkr = data.dyeCostPkr;
      }

      if (data.tailoringSelected) {
        (specSnapshot as any).tailoring_enabled = true;
        (specSnapshot as any).tailoring_selected = true;
        (specSnapshot as any).tailoring_cost_pkr = data.tailoringCostPkr;
        (specSnapshot as any).tailoring_turnaround_days = data.tailoringTurnaroundDays;

        if (data.selectedTailoringStyleId) {
          (specSnapshot as any).selected_tailoring_style_id = data.selectedTailoringStyleId;
        }

        if (data.selectedTailoringStyleTitle) {
          (specSnapshot as any).selected_tailoring_style_title = data.selectedTailoringStyleTitle;
        }

        if (data.selectedTailoringStyleImage) {
          (specSnapshot as any).selected_tailoring_style_image = data.selectedTailoringStyleImage;
        }

        if (data.selectedNeckVariation) {
          (specSnapshot as any).selected_neck_variation = data.selectedNeckVariation;
        }

        if (data.selectedSleeveVariation) {
          (specSnapshot as any).selected_sleeve_variation = data.selectedSleeveVariation;
        }

        if (data.selectedTrouserVariation) {
          (specSnapshot as any).selected_trouser_variation = data.selectedTrouserVariation;
        }

        if (data.customTailoringNote) {
          (specSnapshot as any).custom_tailoring_note = data.customTailoringNote;
        }

        if (data.tailoringStyleExtraCostPkr > 0) {
          (specSnapshot as any).tailoring_style_extra_cost_pkr = data.tailoringStyleExtraCostPkr;
        }

        if (data.selectedTailoringStyleSnapshot) {
          (specSnapshot as any).selected_tailoring_style_snapshot =
            data.selectedTailoringStyleSnapshot;
        }
      }

      (specSnapshot as any).destination_type = data.destinationType || "inland";
      (specSnapshot as any).export_region = data.exportRegion || "";
      (specSnapshot as any).delivery_weight_kg = data.weightKg || 0;

      const { data: oIns, error: oErr } = await supabase
        .from("orders")
        .insert({
          vendor_id: vendorId,

          buyer_auth_user_id: buyerAuthUserId,
          buyer_name: data.buyerName || "Buyer",
          buyer_mobile: data.buyerMobile || "",
          buyer_email: data.buyerEmail || null,

          delivery_address: data.deliveryAddress || "",
          city: data.city || "",
          notes: data.notes || null,

          product_id: productId,
          product_code_snapshot: productCode,
          title_snapshot: title,

          spec_snapshot: specSnapshot,
          price_snapshot: pRow.price ?? {},
          media_snapshot: pRow.media ?? {},

          currency: data.currency,
          subtotal_pkr: data.subtotalBeforeDeliveryPkr || data.totalPkrSafe || null,
          delivery_pkr: data.deliveryCostPkr || 0,
          discount_pkr: 0,
          total_pkr: data.totalPkrSafe || null,

          size_mode: data.mode === "exact" ? "exact" : "standard",
          selected_size:
            data.mode === "exact"
              ? null
              : data.selectedUnstitchedSize || data.selectedSize || null,
          exact_measurements: data.mode === "exact" ? exactMap : {},

          status: "placed",
        })
        .select("id")
        .single();

      if (oErr) throw oErr;

      const orderId = Number(oIns.id);
      router.replace({
        pathname: "/orders/[id]",
        params: { id: String(orderId), from: "buyer-order" },
      });
    } catch (e: any) {
      console.warn("order create failed:", e?.message ?? e);
      Alert.alert("Order failed", e?.message ?? "Could not create order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.subtitle}>
          Dummy screen for now. This creates the order and stores the updated pricing breakdown.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>

          <View style={styles.productRow}>
            <View style={styles.imageBox}>
              {data.imageUrl ? (
                <Image source={{ uri: data.imageUrl }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No Image</Text>
                </View>
              )}
            </View>

            <View style={styles.productMetaWrap}>
              <Text style={styles.productName} numberOfLines={2}>
                {data.productName}
              </Text>

              <Text style={styles.meta}>
                Vendor: <Text style={styles.metaStrong}>{data.vendorName}</Text>
              </Text>

              {!!data.productCategory && (
                <Text style={styles.meta}>
                  Dress Cat:{" "}
                  <Text style={styles.metaStrong}>{prettyCategory(data.productCategory)}</Text>
                </Text>
              )}

              {!!data.selectedUnstitchedSize && (
                <Text style={styles.meta}>
                  Size: <Text style={styles.metaStrong}>{data.selectedUnstitchedSize}</Text>
                </Text>
              )}

              {!!data.selectedFabricLengthM && (
                <Text style={styles.meta}>
                  Fabric Length:{" "}
                  <Text style={styles.metaStrong}>{data.selectedFabricLengthM} meter(s)</Text>
                </Text>
              )}

              {data.fabricCostPkr > 0 ? (
                <Text style={styles.meta}>
                  Total Fabric Cost:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.fabricCostPkr}
                  </Text>
                </Text>
              ) : null}

              {data.baseProductCostPkr > 0 && !data.fabricCostPkr ? (
                <Text style={styles.meta}>
                  Product Cost:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.baseProductCostPkr}
                  </Text>
                </Text>
              ) : null}

              {data.dyeingSelected ? (
                <Text style={styles.meta}>
                  Dyeing:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.dyeCostPkr}
                  </Text>
                </Text>
              ) : null}

              {data.tailoringSelected ? (
                <Text style={styles.meta}>
                  Tailoring:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.tailoringCostPkr}
                    {data.tailoringTurnaroundDays ? ` • ${data.tailoringTurnaroundDays} days` : ""}
                  </Text>
                </Text>
              ) : null}

              {data.hasStyleSelected && !!data.selectedTailoringStyleTitle ? (
                <Text style={styles.meta}>
                  Style: <Text style={styles.metaStrong}>{data.selectedTailoringStyleTitle}</Text>
                </Text>
              ) : null}

              {data.hasStyleSelected && data.noChangeInSelectedStyle ? (
                <Text style={styles.meta}>
                  <Text style={styles.metaStrong}>No change in selected style</Text>
                </Text>
              ) : null}

              {data.hasStyleSelected &&
              !data.noChangeInSelectedStyle &&
              !!data.selectedNeckVariation ? (
                <Text style={styles.meta}>
                  Neck:{" "}
                  <Text style={styles.metaStrong}>
                    {cleanVariationLabel(data.selectedNeckVariation, "neck")}
                  </Text>
                </Text>
              ) : null}

              {data.hasStyleSelected &&
              !data.noChangeInSelectedStyle &&
              !!data.selectedSleeveVariation ? (
                <Text style={styles.meta}>
                  Sleeve:{" "}
                  <Text style={styles.metaStrong}>
                    {cleanVariationLabel(data.selectedSleeveVariation, "sleeve")}
                  </Text>
                </Text>
              ) : null}

              {data.hasStyleSelected &&
              !data.noChangeInSelectedStyle &&
              !!data.selectedTrouserVariation ? (
                <Text style={styles.meta}>
                  Trouser: <Text style={styles.metaStrong}>{data.selectedTrouserVariation}</Text>
                </Text>
              ) : null}

              {data.hasStyleSelected && data.tailoringStyleExtraCostPkr > 0 ? (
                <Text style={styles.meta}>
                  Style Extra Cost:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.tailoringStyleExtraCostPkr}
                  </Text>
                </Text>
              ) : null}

              {!!data.customTailoringNote ? (
                <Text style={styles.meta}>
                  Additional Note for Vendor:{" "}
                  <Text style={styles.metaStrong}>{data.customTailoringNote}</Text>
                </Text>
              ) : null}

              <Text style={styles.meta}>
                Delivery:{" "}
                <Text style={styles.metaStrong}>
                  {data.currency} {data.deliveryCostPkr}
                </Text>
              </Text>

              <Text style={styles.meta}>
                Total Amount: <Text style={styles.metaStrong}>{data.totalText}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.meta}>
            Size: <Text style={styles.metaStrong}>{data.sizeLine}</Text>
          </Text>

          <Text style={styles.meta}>
            Deliver to: <Text style={styles.metaStrong}>{data.deliveryAddress || "—"}</Text>
          </Text>

          <Text style={styles.meta}>
            Buyer:{" "}
            <Text style={styles.metaStrong}>
              {data.buyerName || "—"} {data.buyerMobile ? `(${data.buyerMobile})` : ""}
            </Text>
          </Text>

          {!!data.city && (
            <Text style={styles.meta}>
              City/Region: <Text style={styles.metaStrong}>{data.city}</Text>
            </Text>
          )}

          {!!data.destinationType && (
            <Text style={styles.meta}>
              Destination Type: <Text style={styles.metaStrong}>{data.destinationType}</Text>
            </Text>
          )}

          {!!data.exportRegion && (
            <Text style={styles.meta}>
              Export Region: <Text style={styles.metaStrong}>{data.exportRegion}</Text>
            </Text>
          )}

          {!!data.notes && (
            <Text style={styles.meta}>
              Notes: <Text style={styles.metaStrong}>{data.notes}</Text>
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose payment method</Text>

          <View style={styles.payOption}>
            <Text style={styles.payTitle}>Cash on Delivery (Dummy)</Text>
            <Text style={styles.payDesc}>
              For now this completes the flow and creates the order.
            </Text>
          </View>

          <Pressable
            onPress={onDummyPay}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || submitting) && styles.pressed,
              submitting && styles.disabledBtn,
            ]}
          >
            <Text style={styles.primaryText}>
              {submitting ? "Creating Order…" : "Pay Now (Dummy)"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  mutedText: "#64748B",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  scroll: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  container: {
    padding: 16,
    gap: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: stylesVars.text,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    backgroundColor: stylesVars.cardBg,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
  },

  productRow: {
    flexDirection: "row",
    gap: 12,
  },

  imageBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: stylesVars.border,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderText: {
    color: stylesVars.mutedText,
    fontSize: 12,
    fontWeight: "600",
  },

  productMetaWrap: {
    flex: 1,
    gap: 6,
  },

  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  metaStrong: {
    fontWeight: "700",
    color: stylesVars.text,
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 6,
  },

  payOption: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    backgroundColor: stylesVars.cardBg,
  },

  payTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: stylesVars.text,
  },

  payDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  primaryBtn: {
    borderRadius: 14,
    backgroundColor: stylesVars.blue,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
  },

  backBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    minHeight: 36,
  },

  backText: {
    fontWeight: "700",
    color: stylesVars.blue,
    fontSize: 12,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  bottomSpacer: {
    height: 16,
  },

  pressed: {
    opacity: 0.82,
  },
});