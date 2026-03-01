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

  spec_snapshot: any;

  total_pkr: number | null;
  currency: string;
};

function norm(v: unknown) {
  return (v == null ? "" : String(v)).trim().toLowerCase();
}

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function humanizeCat(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "—";
  return s
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrdersIndexScreen() {
  const router = useRouter();
  const vendorIdFromStore = useAppSelector((s) => (s.vendor as any)?.id ?? null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");

  // ✅ Active vs Completed toggle (delivered = completed)
  const [tab, setTab] = useState<"active" | "completed">("active");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const vId = vendorIdFromStore != null ? Number(vendorIdFromStore) : null;

      if (!vId) {
        setRows([]);
        return;
      }

      // statuses policy:
      // placed = NEW (red)
      // seen/in_progress/packed = in progress (blue)
      // dispatched = still active (blue)
      // delivered = completed
      const activeStatuses = ["placed", "seen", "in_progress", "packed", "dispatched"];

      let q = supabase
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
          spec_snapshot,
          total_pkr,
          currency
        `
        )
        .eq("vendor_id", vId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (tab === "active") {
        q = q.in("status", activeStatuses);
      } else {
        q = q.eq("status", "delivered");
      }

      const { data, error } = await q;
      if (error) throw error;

      const mapped: OrderRow[] = (data ?? []).map((o: any) => ({
        id: Number(o.id),
        created_at: String(o.created_at),
        order_no: o.order_no ?? null,
        status: String(o.status ?? "placed"),
        buyer_name: String(o.buyer_name ?? ""),
        buyer_mobile: String(o.buyer_mobile ?? ""),
        city: String(o.city ?? ""),
        product_code_snapshot: String(o.product_code_snapshot ?? ""),
        title_snapshot: String(o.title_snapshot ?? ""),
        spec_snapshot: o.spec_snapshot ?? {},
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
  }, [vendorIdFromStore, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;

    return rows.filter((r) => {
      const spec = r.spec_snapshot && typeof r.spec_snapshot === "object" ? r.spec_snapshot : {};

      // dye swatch searchable (hex)
      const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
      const dyeShadeLegacy = safeText(spec?.dyeing_selected_shade ?? "");

      // tailoring searchable
      const tailoringEnabled = safeText(spec?.tailoring_enabled ?? "");
      const tailoringDays = safeText(spec?.tailoring_turnaround_days ?? "");
      const tailoringCost = safeText(spec?.tailoring_cost_pkr ?? "");

      // ✅ dress category searchable (from spec snapshot)
      const productCategory = safeText(spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "");

      const hay = [
        r.order_no ?? "",
        r.status,
        r.buyer_name,
        r.buyer_mobile,
        r.city,
        r.product_code_snapshot,
        r.title_snapshot,
        productCategory,
        dyeHex,
        dyeShadeLegacy,
        tailoringEnabled,
        tailoringDays,
        tailoringCost
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const renderItem = ({ item }: { item: OrderRow }) => {
    const orderNo = item.order_no || `Order #${item.id}`;
    const amount =
      item.total_pkr != null
        ? `${item.currency} ${Number(item.total_pkr).toLocaleString()}`
        : `${item.currency} —`;

    const status = norm(item.status);

    const spec = item.spec_snapshot && typeof item.spec_snapshot === "object" ? item.spec_snapshot : {};
    const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
    const hasDye = dyeHex && dyeHex !== "—";

    // ✅ Dress Cat (from spec snapshot)
    const dressCat = humanizeCat(spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "");

    // Color rules:
    // placed -> RED
    // seen/in_progress/packed/dispatched -> BLUE
    const isNew = status === "placed";

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/orders/[id]",
            params: { id: String(item.id) }
          })
        }
        style={({ pressed }) => [
          styles.card,
          isNew && styles.cardNewRed,
          pressed && styles.pressed
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.orderNo} numberOfLines={1}>
            {orderNo}
          </Text>
          <Text style={[styles.badge, isNew ? styles.badgeRed : styles.badgeBlue]} numberOfLines={1}>
            {item.status}
          </Text>
        </View>

        <Text style={styles.line} numberOfLines={1}>
          {item.title_snapshot} • {item.product_code_snapshot}
        </Text>

        {/* ✅ Dress Category line */}
        <Text style={styles.small} numberOfLines={1}>
          Dress Cat: {dressCat}
        </Text>

        {hasDye ? (
          <View style={styles.dyeRow}>
            <Text style={styles.small} numberOfLines={1}>
              Dyeing
            </Text>
            <View style={[styles.dyeSwatch, { backgroundColor: dyeHex }]} />
          </View>
        ) : null}

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
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Orders</Text>
            <Text style={styles.subtitle}>
              Vendor ID: <Text style={styles.subtitleStrong}>{vIdLabel}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("active")}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === "active" && styles.tabBtnActive,
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>Active</Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("completed")}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === "completed" && styles.tabBtnActive,
              pressed && styles.pressed
            ]}
          >
            <Text style={[styles.tabText, tab === "completed" && styles.tabTextActive]}>Completed</Text>
          </Pressable>
        </View>

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

  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },

  trackBtn: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  trackText: { fontWeight: "900", color: "#111" },

  tabRow: { flexDirection: "row", gap: 10 },
  tabBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#fff"
  },
  tabBtnActive: {
    borderColor: "#111"
  },
  tabText: { fontWeight: "900", color: "#475569" },
  tabTextActive: { color: "#111" },

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

  // ✅ New orders (placed) = RED
  cardNewRed: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF7F7"
  },

  orderNo: { fontSize: 16, fontWeight: "900", flex: 1 },
  line: { fontSize: 13, color: "#333" },
  small: { fontSize: 12, color: "#555" },

  badge: {
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden"
  },
  badgeRed: { color: "#991B1B", backgroundColor: "#FEE2E2" },
  badgeBlue: { color: "#1E3A8A", backgroundColor: "#DBEAFE" },

  // Work swatch (kept as existing behavior)
  dyeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dyeSwatch: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#fff"
  },

  empty: { padding: 20, gap: 8, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 13, color: "#555", textAlign: "center" }
});