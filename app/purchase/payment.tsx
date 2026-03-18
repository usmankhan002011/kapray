// app/purchase/payment.tsx
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

  vendorName?: string;
  vendorShopName?: string;

  vendorMobile?: string;
  vendorAddress?: string;

  mode?: string;
  selectedSize?: string;

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

  buyerName?: string;
  buyerMobile?: string;
  buyerEmail?: string;

  deliveryAddress?: string;
  city?: string;
  notes?: string;

  dye_shade_id?: string;
  dye_hex?: string;
  dye_label?: string;
  dyeing_cost_pkr?: string;

  dyeing_selected_shade?: string;

  tailoring_cost_pkr?: string;
  tailoring_turnaround_days?: string;
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

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const [submitting, setSubmitting] = useState(false);

  const data = useMemo(() => {
    const currency = norm(params.currency) || "PKR";

    const totalParam = norm(params.price);

    const mode = norm(params.mode) || "standard";
    const selectedSize = norm(params.selectedSize);

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
      ["N", norm(params.n)]
    ] as [string, string][]).filter(([, v]) => v.length > 0);

    const sizeLine =
      mode === "exact"
        ? exactPairs.length
          ? `Exact: ${exactPairs.map(([k, v]) => `${k}=${v}`).join(", ")}`
          : "Exact: Not set"
        : selectedSize
          ? `Standard: ${selectedSize}`
          : "Standard: Not set";

    const vendorName = norm(params.vendorName) || norm(params.vendorShopName) || "Vendor";

    const dyeShadeId = safeDecode(params.dye_shade_id);
    const dyeHex = safeDecode(norm(params.dye_hex) || norm(params.dyeing_selected_shade));
    const dyeLabel = safeDecode(params.dye_label);
    const dyeingCostPkrRaw = safeDecode(params.dyeing_cost_pkr);

    const hasDyeing = !!dyeHex || !!dyeShadeId;
    const dyeCost = Number(dyeingCostPkrRaw || 0);
    const safeDye = Number.isFinite(dyeCost) && dyeCost > 0 ? dyeCost : 0;

    const tailoringCostRaw = safeDecode(params.tailoring_cost_pkr);
    const tailoringDaysRaw = safeDecode(params.tailoring_turnaround_days);

    const tailoringCostNum = Number(tailoringCostRaw || 0);
    const tailoringDaysNum = Number(tailoringDaysRaw || 0);

    const tailoringCostPkr =
      Number.isFinite(tailoringCostNum) && tailoringCostNum > 0 ? tailoringCostNum : 0;

    const tailoringTurnaroundDays =
      Number.isFinite(tailoringDaysNum) && tailoringDaysNum > 0 ? tailoringDaysNum : 0;

    const hasTailoring = tailoringCostPkr > 0 && tailoringTurnaroundDays > 0;

    const totalPkrNum = Number(totalParam || 0);
    const totalPkrSafe = Number.isFinite(totalPkrNum) && totalPkrNum > 0 ? totalPkrNum : 0;

    return {
      productId: firstNonEmpty(params.productId, params.product_id),
      productCode: firstNonEmpty(params.productCode, params.product_code),
      productName: firstNonEmpty(params.productName, params.product_name) || "Product",
      imageUrl: firstNonEmpty(params.imageUrl, params.image_url),

      productCategory: norm((params as any).product_category),

      currency,
      totalParam,
      totalText: totalParam ? `${currency} ${totalParam}` : `${currency} —`,
      totalPkrSafe,

      vendorName,
      vendorMobile: norm(params.vendorMobile),
      vendorAddress: norm(params.vendorAddress),

      buyerName: norm(params.buyerName),
      buyerMobile: norm(params.buyerMobile),
      buyerEmail: norm(params.buyerEmail),

      deliveryAddress: norm(params.deliveryAddress),
      city: norm(params.city),
      notes: norm(params.notes),

      mode,
      selectedSize,
      exactPairs,
      sizeLine,

      hasDyeing,
      dyeShadeId,
      dyeHex,
      dyeLabel,
      dyeingCostPkrRaw,
      dyeCostPkr: hasDyeing ? safeDye : 0,

      hasTailoring,
      tailoringCostPkr,
      tailoringTurnaroundDays
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

      const currency = data.currency || "PKR";
      const totalPkr = data.totalPkrSafe ? data.totalPkrSafe : null;

      const specSnapshot =
        pRow.spec && typeof pRow.spec === "object" ? { ...(pRow.spec as any) } : {};

      if (data.productCategory) {
        (specSnapshot as any).product_category = data.productCategory;
      }

      if (data.hasDyeing) {
        (specSnapshot as any).dye_shade_id = data.dyeShadeId || "";
        (specSnapshot as any).dye_hex = data.dyeHex || "";
        (specSnapshot as any).dye_label = data.dyeLabel || "";
        (specSnapshot as any).dyeing_cost_pkr = data.dyeCostPkr;
      }

      if (data.hasTailoring) {
        (specSnapshot as any).tailoring_enabled = true;
        (specSnapshot as any).tailoring_cost_pkr = data.tailoringCostPkr;
        (specSnapshot as any).tailoring_turnaround_days = data.tailoringTurnaroundDays;
      }

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

          currency,
          subtotal_pkr: totalPkr,
          delivery_pkr: 0,
          discount_pkr: 0,
          total_pkr: totalPkr,

          size_mode: data.mode === "exact" ? "exact" : "standard",
          selected_size: data.mode === "exact" ? null : (data.selectedSize || null),
          exact_measurements: data.mode === "exact" ? exactMap : {},

          status: "placed"
        })
        .select("id")
        .single();

      if (oErr) throw oErr;

      const orderId = Number(oIns.id);
        router.replace({
            pathname: "/orders/[id]",
            params: { id: String(orderId), from: "buyer-order" }
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
          Dummy screen for now. This will create an order and show it in Orders.
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
                  <Text style={styles.metaStrong}>
                    {data.productCategory
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                </Text>
              )}

              <Text style={styles.meta}>
                Amount:{" "}
                <Text style={styles.metaStrong}>
                  {data.totalParam ? `${data.currency} ${data.totalParam}` : `${data.currency} —`}
                </Text>
              </Text>

              {data.hasDyeing ? (
                <Text style={styles.meta}>
                  Dyeing:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.dyeCostPkr}
                  </Text>
                </Text>
              ) : null}

              {data.hasTailoring ? (
                <Text style={styles.meta}>
                  Tailoring:{" "}
                  <Text style={styles.metaStrong}>
                    {data.currency} {data.tailoringCostPkr} • {data.tailoringTurnaroundDays} days
                  </Text>
                </Text>
              ) : null}
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
              City: <Text style={styles.metaStrong}>{data.city}</Text>
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
            <Text style={styles.payDesc}>For now this completes the flow and creates the order.</Text>
          </View>

          <Pressable
            onPress={onDummyPay}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || submitting) && styles.pressed,
              submitting && styles.disabledBtn
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
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000"
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  scroll: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  container: {
    padding: 16,
    gap: 12
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: stylesVars.text
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    backgroundColor: stylesVars.cardBg
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text
  },

  productRow: {
    flexDirection: "row",
    gap: 12
  },

  imageBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: stylesVars.border
  },

  image: {
    width: "100%",
    height: "100%"
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  imagePlaceholderText: {
    color: stylesVars.mutedText,
    fontSize: 12,
    fontWeight: "600"
  },

  productMetaWrap: {
    flex: 1,
    gap: 6
  },

  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text
  },

  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  metaStrong: {
    fontWeight: "700",
    color: stylesVars.text
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
    marginVertical: 6
  },

  payOption: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    backgroundColor: stylesVars.cardBg
  },

  payTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: stylesVars.text
  },

  payDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  primaryBtn: {
    borderRadius: 14,
    backgroundColor: stylesVars.blue,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14
  },

  backBtn: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    minHeight: 40
  },

  backText: {
    fontWeight: "700",
    color: stylesVars.blue
  },

  disabledBtn: {
    opacity: 0.6
  },

  bottomSpacer: {
    height: 16
  },

  pressed: {
    opacity: 0.82
  }
});