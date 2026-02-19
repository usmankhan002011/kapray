import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase/client";

type Params = {
  productId?: string;
  productCode?: string;
  productName?: string;
  price?: string;
  currency?: string;
  imageUrl?: string;

  vendorName?: string;
  vendorShopName?: string;

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
};

const norm = (v: unknown) => (v == null ? "" : String(v).trim());

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const [submitting, setSubmitting] = useState(false);

  const data = useMemo(() => {
    const currency = norm(params.currency) || "PKR";
    const price = norm(params.price);

    const mode = norm(params.mode) || "standard";
    const selectedSize = norm(params.selectedSize);

    // ✅ FIX: force tuple typing so TS doesn't widen to string[][]
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
    ] as [string, string][])
      .filter(([, v]) => v.length > 0);

    const sizeLine =
      mode === "exact"
        ? exactPairs.length
          ? `Exact: ${exactPairs.map(([k, v]) => `${k}=${v}`).join(", ")}`
          : "Exact: Not set"
        : selectedSize
          ? `Standard: ${selectedSize}`
          : "Standard: Not set";

    const vendorName = norm(params.vendorName) || norm(params.vendorShopName) || "Vendor";

    return {
      productId: norm(params.productId),
      productCode: norm(params.productCode),
      productName: norm(params.productName) || "Product",
      imageUrl: norm(params.imageUrl),

      currency,
      price,

      vendorName,

      buyerName: norm(params.buyerName),
      buyerMobile: norm(params.buyerMobile),
      buyerEmail: norm(params.buyerEmail),

      deliveryAddress: norm(params.deliveryAddress),
      city: norm(params.city),
      notes: norm(params.notes),

      mode,
      selectedSize,
      exactPairs,
      sizeLine
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

      // Fetch product for snapshots + vendor_id
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
      const totalPkr =
        data.price && !Number.isNaN(Number(data.price)) ? Number(data.price) : null;

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
          spec_snapshot: pRow.spec ?? {},
          price_snapshot: pRow.price ?? {},
          media_snapshot: pRow.media ?? {},

          currency,
          subtotal_pkr: totalPkr,
          delivery_pkr: 0,
          discount_pkr: 0,
          total_pkr: totalPkr,

          size_mode: data.mode === "exact" ? "exact" : "standard",
          selected_size: data.mode === "exact" ? null : (data.selectedSize || null),
          exact_measurements: data.mode === "exact" ? exactMap : {}
        })
        .select("id")
        .single();

      if (oErr) throw oErr;

      const orderId = Number(oIns.id);
      router.replace({ pathname: "/orders/[id]", params: { id: String(orderId) } });
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
        <Text style={styles.subtitle}>Dummy screen for now. This will create an order and show it in Orders.</Text>

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

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.productName} numberOfLines={2}>
                {data.productName}
              </Text>

              <Text style={styles.meta}>
                Vendor: <Text style={styles.metaStrong}>{data.vendorName}</Text>
              </Text>

              <Text style={styles.meta}>
                Amount:{" "}
                <Text style={styles.metaStrong}>
                  {data.price ? `${data.currency} ${data.price}` : `${data.currency} —`}
                </Text>
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
              submitting && { opacity: 0.6 }
            ]}
          >
            <Text style={styles.primaryText}>{submitting ? "Creating Order…" : "Pay Now (Dummy)"}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/orders")}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>View Orders</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  container: { padding: 16, gap: 12 },

  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { fontSize: 13, color: "#444" },

  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "900" },

  productRow: { flexDirection: "row", gap: 12 },
  imageBox: { width: 90, height: 90, borderRadius: 12, overflow: "hidden", backgroundColor: "#f3f3f3" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  imagePlaceholderText: { color: "#777", fontSize: 12 },

  productName: { fontSize: 14, fontWeight: "900" },
  meta: { fontSize: 12, color: "#444" },
  metaStrong: { fontWeight: "900", color: "#111" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 6 },

  payOption: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, gap: 6 },
  payTitle: { fontWeight: "900" },
  payDesc: { fontSize: 12, color: "#555" },

  primaryBtn: {
    borderRadius: 14,
    backgroundColor: "#111",
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111",
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryText: { fontWeight: "900" },

  backBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 12,
    alignItems: "center"
  },
  backText: { fontWeight: "900" },

  pressed: { opacity: 0.75 }
});
