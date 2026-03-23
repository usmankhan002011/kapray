// File: app/orders/index.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
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

  subtotal_pkr: number | null;
  delivery_pkr: number | null;
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

function boolish(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return !!v;
}

function money(currency: string, v: any) {
  if (v == null || v === "") return `${currency} —`;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return `${currency} —`;
  return `${currency} ${n.toLocaleString()}`;
}

function numOrNull(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function OrdersIndexScreen() {
  const router = useRouter();
  const vendorIdFromStore = useAppSelector((s) => (s.vendor as any)?.id ?? null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [query, setQuery] = useState("");

  const [tab, setTab] = useState<"active" | "completed">("active");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const vId = vendorIdFromStore != null ? Number(vendorIdFromStore) : null;

      if (!vId) {
        setRows([]);
        return;
      }

      const activeStatuses = ["placed", "seen", "in_progress", "packed", "dispatched"];

      let q = supabase
        .from("orders")
        .select(`
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
          subtotal_pkr,
          delivery_pkr,
          total_pkr,
          currency
        `)
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
        subtotal_pkr: o.subtotal_pkr != null ? Number(o.subtotal_pkr) : null,
        delivery_pkr: o.delivery_pkr != null ? Number(o.delivery_pkr) : null,
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,
        currency: String(o.currency ?? "PKR"),
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

      const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
      const tailoringEnabled = safeText(spec?.tailoring_enabled ?? spec?.tailoring_selected ?? "");
      const tailoringDays = safeText(spec?.tailoring_turnaround_days ?? "");
      const tailoringCost = safeText(spec?.tailoring_cost_pkr ?? "");
      const productCategory = safeText(
        spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "",
      );
      const selectedUnstitchedSize = safeText(spec?.selected_unstitched_size ?? "");
      const fabricLength = safeText(spec?.selected_fabric_length_m ?? "");
      const exportRegion = safeText(spec?.export_region ?? "");
      const destinationType = safeText(spec?.destination_type ?? "");

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
        tailoringEnabled,
        tailoringDays,
        tailoringCost,
        selectedUnstitchedSize,
        fabricLength,
        exportRegion,
        destinationType,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const renderItem = ({ item }: { item: OrderRow }) => {
    const orderNo = item.order_no || `Order #${item.id}`;
    const status = norm(item.status);

    const spec = item.spec_snapshot && typeof item.spec_snapshot === "object" ? item.spec_snapshot : {};

    const dyeHex = safeText(spec?.dye_hex ?? spec?.dyeing_hex ?? "");
    const hasDye = dyeHex && dyeHex !== "—";

    const dressCat = humanizeCat(
      spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "",
    );

    const selectedUnstitchedSize = safeText(spec?.selected_unstitched_size ?? "");
    const selectedFabricLengthM = numOrNull(spec?.selected_fabric_length_m ?? null);
    const fabricCostPkr = numOrNull(spec?.fabric_cost_pkr ?? null);
    const destinationType = safeText(spec?.destination_type ?? "");
    const exportRegion = safeText(spec?.export_region ?? "");

    const isNew = status === "placed";

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/flow/orders/[id]",
            params: { id: String(item.id) },
          })
        }
        style={({ pressed }) => [styles.card, isNew && styles.cardNewRed, pressed && styles.pressed]}
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

        <Text style={styles.small} numberOfLines={1}>
          Dress Cat: {dressCat}
        </Text>

        {!!selectedUnstitchedSize && (
          <Text style={styles.small} numberOfLines={1}>
            Size: {selectedUnstitchedSize}
            {selectedFabricLengthM != null ? ` • ${selectedFabricLengthM}m` : ""}
          </Text>
        )}

        {fabricCostPkr != null ? (
          <Text style={styles.small} numberOfLines={1}>
            Total Fabric Cost: {money(item.currency, fabricCostPkr)}
          </Text>
        ) : null}

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
            {money(item.currency, item.total_pkr)}
          </Text>
        </View>

        <Text style={styles.small} numberOfLines={1}>
          City: {item.city || "—"}
          {destinationType !== "—"
            ? ` • ${humanizeCat(destinationType)}${exportRegion !== "—" ? ` • ${exportRegion}` : ""}`
            : ""}
        </Text>
      </Pressable>
    );
  };

  const vIdLabel = vendorIdFromStore ? String(vendorIdFromStore) : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.rowBetween}>
          <View style={styles.headerMain}>
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
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>Active</Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("completed")}
            style={({ pressed }) => [
              styles.tabBtn,
              tab === "completed" && styles.tabBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.tabText, tab === "completed" && styles.tabTextActive]}>
              Completed
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search: order no, buyer, mobile, city, product..."
          placeholderTextColor={stylesVars.placeholder}
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
          <Text style={styles.emptyText}>
            Open vendor first (enter Vendor ID), then come back to Orders.
          </Text>
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
              <Text style={styles.emptyText}>
                Orders will appear here once buyers complete payment.
              </Text>
            </View>
          }
        />
      )}
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
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  header: {
    padding: 16,
    gap: 10,
    backgroundColor: stylesVars.bg,
  },

  headerMain: {
    flex: 1,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  subtitleStrong: {
    fontWeight: "700",
    color: stylesVars.text,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  tabRow: {
    flexDirection: "row",
    gap: 10,
  },

  tabBtn: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
  },

  tabBtnActive: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  tabText: {
    fontWeight: "700",
    fontSize: 12,
    color: stylesVars.blue,
  },

  tabTextActive: {
    color: stylesVars.white,
  },

  search: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: stylesVars.white,
  },

  refreshBtn: {
    alignSelf: "flex-start",
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshText: {
    fontWeight: "700",
    fontSize: 12,
    color: stylesVars.blue,
  },

  pressed: {
    opacity: 0.82,
  },

  loading: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  list: {
    padding: 16,
    paddingTop: 6,
    gap: 12,
    backgroundColor: stylesVars.bg,
  },

  card: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    backgroundColor: stylesVars.cardBg,
  },

  cardNewRed: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: "#FFF7F7",
  },

  orderNo: {
    fontSize: 16,
    fontWeight: "700",
    color: stylesVars.text,
    flex: 1,
  },

  line: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.subText,
    fontWeight: "500",
  },

  small: {
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  badge: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },

  badgeRed: {
    color: stylesVars.danger,
    backgroundColor: stylesVars.dangerSoft,
  },

  badgeBlue: {
    color: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft,
  },

  dyeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dyeSwatch: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.white,
  },

  empty: {
    padding: 20,
    gap: 8,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: stylesVars.text,
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    textAlign: "center",
  },
});