// app/orders/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";

type Params = { id?: string };

type OrderRow = {
  id: number;
  created_at: string;
  order_no: string | null;
  status: string;

  buyer_name: string;
  buyer_mobile: string;
  buyer_email: string | null;

  delivery_address: string;
  city: string;
  notes: string | null;

  product_code_snapshot: string;
  title_snapshot: string;

  currency: string;
  subtotal_pkr: number | null;
  delivery_pkr: number | null;
  discount_pkr: number | null;
  total_pkr: number | null;

  size_mode: string;
  selected_size: string | null;
  exact_measurements: any;
};

function money(currency: string, v: any) {
  if (v == null || v === "") return `${currency} —`;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return `${currency} —`;
  return `${currency} ${n.toLocaleString()}`;
}

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const orderId = useMemo(() => String(params.id ?? "").trim(), [params.id]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          created_at,
          order_no,
          status,
          buyer_name,
          buyer_mobile,
          buyer_email,
          delivery_address,
          city,
          notes,
          product_code_snapshot,
          title_snapshot,
          currency,
          subtotal_pkr,
          delivery_pkr,
          discount_pkr,
          total_pkr,
          size_mode,
          selected_size,
          exact_measurements
        `
        )
        .eq("id", Number(orderId))
        .single();

      if (error) throw error;

      const o: any = data;

      setOrder({
        id: Number(o.id),
        created_at: String(o.created_at),
        order_no: o.order_no ?? null,
        status: String(o.status ?? "confirmed"),

        buyer_name: String(o.buyer_name ?? ""),
        buyer_mobile: String(o.buyer_mobile ?? ""),
        buyer_email: o.buyer_email ? String(o.buyer_email) : null,

        delivery_address: String(o.delivery_address ?? ""),
        city: String(o.city ?? ""),
        notes: o.notes ? String(o.notes) : null,

        product_code_snapshot: String(o.product_code_snapshot ?? ""),
        title_snapshot: String(o.title_snapshot ?? ""),

        currency: String(o.currency ?? "PKR"),
        subtotal_pkr: o.subtotal_pkr != null ? Number(o.subtotal_pkr) : null,
        delivery_pkr: o.delivery_pkr != null ? Number(o.delivery_pkr) : null,
        discount_pkr: o.discount_pkr != null ? Number(o.discount_pkr) : null,
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,

        size_mode: String(o.size_mode ?? "standard"),
        selected_size: o.selected_size ? String(o.selected_size) : null,
        exact_measurements: o.exact_measurements ?? {}
      });
    } catch (e: any) {
      console.warn("order detail error:", e?.message ?? e);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const sizeLine = useMemo(() => {
    if (!order) return "—";
    if (order.size_mode === "exact") {
      const m = order.exact_measurements && typeof order.exact_measurements === "object" ? order.exact_measurements : {};
      const pairs = Object.entries(m)
        .map(([k, v]) => `${k}=${String(v ?? "").trim()}`)
        .filter((x) => !x.endsWith("="));
      return pairs.length ? `Exact: ${pairs.join(", ")}` : "Exact: —";
    }
    return order.selected_size ? `Standard: ${order.selected_size}` : "Standard: —";
  }, [order]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Order Detail</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : !order ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Order not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <Text style={styles.h1}>{order.order_no || `Order #${order.id}`}</Text>
            <Text style={styles.meta}>
              Status: <Text style={styles.strong}>{order.status}</Text>
            </Text>
            <Text style={styles.meta}>
              Created: <Text style={styles.strong}>{new Date(order.created_at).toLocaleString()}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Product</Text>
            <Text style={styles.meta}>
              Title: <Text style={styles.strong}>{order.title_snapshot}</Text>
            </Text>
            <Text style={styles.meta}>
              Code: <Text style={styles.strong}>{order.product_code_snapshot}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Buyer</Text>
            <Text style={styles.meta}>
              Name: <Text style={styles.strong}>{order.buyer_name}</Text>
            </Text>
            <Text style={styles.meta}>
              Mobile: <Text style={styles.strong}>{order.buyer_mobile}</Text>
            </Text>
            {!!order.buyer_email && (
              <Text style={styles.meta}>
                Email: <Text style={styles.strong}>{order.buyer_email}</Text>
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Delivery</Text>
            <Text style={styles.meta}>
              Address: <Text style={styles.strong}>{order.delivery_address}</Text>
            </Text>
            <Text style={styles.meta}>
              City: <Text style={styles.strong}>{order.city}</Text>
            </Text>
            {!!order.notes && (
              <Text style={styles.meta}>
                Notes: <Text style={styles.strong}>{order.notes}</Text>
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Size</Text>
            <Text style={styles.meta}>
              <Text style={styles.strong}>{sizeLine}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h2}>Totals</Text>
            <Text style={styles.meta}>
              Subtotal: <Text style={styles.strong}>{money(order.currency, order.subtotal_pkr)}</Text>
            </Text>
            <Text style={styles.meta}>
              Delivery: <Text style={styles.strong}>{money(order.currency, order.delivery_pkr)}</Text>
            </Text>
            <Text style={styles.meta}>
              Discount: <Text style={styles.strong}>{money(order.currency, order.discount_pkr)}</Text>
            </Text>
            <View style={styles.divider} />
            <Text style={styles.meta}>
              Total: <Text style={styles.strong}>{money(order.currency, order.total_pkr)}</Text>
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  top: { padding: 16, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 18, fontWeight: "900" },
  backBtn: { borderWidth: 1, borderColor: "#111", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { fontWeight: "800" },
  pressed: { opacity: 0.7 },

  loading: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#444" },

  container: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 14, gap: 6 },
  h1: { fontSize: 18, fontWeight: "900" },
  h2: { fontSize: 14, fontWeight: "900", marginBottom: 2 },
  meta: { fontSize: 13, color: "#444" },
  strong: { fontWeight: "900", color: "#111" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },

  empty: { padding: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "900" }
});
