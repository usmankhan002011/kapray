// app/orders/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";

type OrderRow = {
  id: number;
  created_at: string;
  order_no: string | null;
  status: string;

  buyer_name: string;
  buyer_mobile: string;
  city: string;

  product_code_snapshot: string;
  title_snapshot: string;

  total_pkr: number | null;
  currency: string;
};

function norm(v: unknown) {
  return (v == null ? "" : String(v)).trim().toLowerCase();
}

export default function OrdersIndexScreen() {
  const router = useRouter();

  // ✅ vendor id comes from your vendor login flow (works for all vendors)
  const vendorIdFromStore = useAppSelector((s) => (s.vendor as any)?.id ?? null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const vId = vendorIdFromStore != null ? Number(vendorIdFromStore) : null;

      if (!vId) {
        setRows([]);
        return;
      }

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
          city,
          product_code_snapshot,
          title_snapshot,
          total_pkr,
          currency
        `
        )
        .eq("vendor_id", vId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const mapped: OrderRow[] = (data ?? []).map((o: any) => ({
        id: Number(o.id),
        created_at: String(o.created_at),
        order_no: o.order_no ?? null,
        status: String(o.status ?? "confirmed"),
        buyer_name: String(o.buyer_name ?? ""),
        buyer_mobile: String(o.buyer_mobile ?? ""),
        city: String(o.city ?? ""),
        product_code_snapshot: String(o.product_code_snapshot ?? ""),
        title_snapshot: String(o.title_snapshot ?? ""),
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,
        currency: String(o.currency ?? "PKR")
      }));

      setRows(mapped);
    } catch (e: any) {
      console.warn("orders load error:", e?.message ?? e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [vendorIdFromStore]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;

    return rows.filter((r) => {
      const hay = [
        r.order_no ?? "",
        r.status,
        r.buyer_name,
        r.buyer_mobile,
        r.city,
        r.product_code_snapshot,
        r.title_snapshot
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const renderItem = ({ item }: { item: OrderRow }) => {
    const orderNo = item.order_no || `Order #${item.id}`;
    const amount =
      item.total_pkr != null ? `${item.currency} ${Number(item.total_pkr).toLocaleString()}` : `${item.currency} —`;

    return (
      <Pressable
        onPress={() => router.push({ pathname: "/orders/[id]", params: { id: String(item.id) } })}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.orderNo} numberOfLines={1}>
            {orderNo}
          </Text>
          <Text style={styles.status} numberOfLines={1}>
            {item.status}
          </Text>
        </View>

        <Text style={styles.line} numberOfLines={1}>
          {item.title_snapshot} • {item.product_code_snapshot}
        </Text>

        <View style={styles.rowBetween}>
          <Text style={styles.small} numberOfLines={1}>
            Buyer: {item.buyer_name} ({item.buyer_mobile})
          </Text>
          <Text style={styles.small} numberOfLines={1}>
            {amount}
          </Text>
        </View>

        <Text style={styles.small} numberOfLines={1}>
          City: {item.city || "—"}
        </Text>
      </Pressable>
    );
  };

  const vIdLabel = vendorIdFromStore ? String(vendorIdFromStore) : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>

        <Text style={styles.subtitle}>
          Vendor ID: <Text style={styles.subtitleStrong}>{vIdLabel}</Text>
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search: order no, buyer, mobile, city, product..."
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable onPress={load} style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {!vendorIdFromStore ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No vendor selected</Text>
          <Text style={styles.emptyText}>Open vendor first (enter Vendor ID), then come back to Orders.</Text>
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => String(x.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>Orders will appear here once buyers complete payment.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 13, color: "#444" },
  subtitleStrong: { fontWeight: "800", color: "#111" },

  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14
  },

  refreshBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  refreshText: { fontWeight: "800" },
  pressed: { opacity: 0.7 },

  loading: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#444" },

  list: { padding: 16, paddingTop: 6, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    backgroundColor: "#fff"
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  orderNo: { fontSize: 16, fontWeight: "900", flex: 1 },
  status: { fontSize: 12, fontWeight: "800", color: "#333" },
  line: { fontSize: 13, color: "#333" },
  small: { fontSize: 12, color: "#555" },

  empty: { padding: 20, gap: 8, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 13, color: "#555", textAlign: "center" }
});
