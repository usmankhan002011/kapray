// app/orders/track.tsx
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

type VendorRow = {
  id: number;
  shop_name?: string | null;
  name?: string | null;
};

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

  vendor_id: number;

  // ✅ bring spec_snapshot to show Dress Cat and allow future UI
  spec_snapshot?: any;
};

function norm(v: unknown) {
  return (v == null ? "" : String(v)).trim();
}

function normLower(v: unknown) {
  return norm(v).toLowerCase();
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

function money(currency: string, v: any) {
  if (v == null || v === "") return `${currency} —`;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return `${currency} —`;
  return `${currency} ${n.toLocaleString()}`;
}

export default function TrackOrdersScreen() {
  const router = useRouter();

  // Buyer inputs (no login required)
  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");

  // Optional vendor filter (search + pick)
  const [vendorQuery, setVendorQuery] = useState("");
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorOptions, setVendorOptions] = useState<VendorRow[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorRow | null>(null);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [searched, setSearched] = useState(false);

  const buyerNameTrim = useMemo(() => norm(buyerName), [buyerName]);
  const buyerMobileTrim = useMemo(() => norm(buyerMobile), [buyerMobile]);

  const canSearch = useMemo(() => {
    // Simple rule: mobile required (name helps narrow)
    return buyerMobileTrim.length >= 10;
  }, [buyerMobileTrim]);

  const loadVendors = useCallback(async () => {
    const q = norm(vendorQuery);
    if (!q || q.length < 2) {
      setVendorOptions([]);
      return;
    }

    try {
      setVendorLoading(true);

      // Your project uses single "vendor" table (not shops).
      const { data, error } = await supabase
        .from("vendor")
        .select("id,shop_name,name")
        .or(`shop_name.ilike.%${q}%,name.ilike.%${q}%`)
        .order("id", { ascending: true })
        .limit(30);

      if (error) throw error;

      const mapped: VendorRow[] = (data ?? []).map((v: any) => ({
        id: Number(v.id),
        shop_name: v.shop_name ?? null,
        name: v.name ?? null
      }));

      setVendorOptions(mapped);
    } catch (e: any) {
      console.warn("vendor search error:", e?.message ?? e);
      setVendorOptions([]);
    } finally {
      setVendorLoading(false);
    }
  }, [vendorQuery]);

  useEffect(() => {
    // Debounce-ish behavior without timers: load when user stops typing a bit (good enough)
    loadVendors();
  }, [loadVendors]);

  const clearVendor = () => {
    setSelectedVendor(null);
    setVendorQuery("");
    setVendorOptions([]);
  };

  const searchOrders = useCallback(async () => {
    if (!canSearch) return;

    try {
      setLoading(true);
      setSearched(true);

      const mobile = buyerMobileTrim;
      const name = buyerNameTrim;

      // Query policy:
      // - buyer_mobile is REQUIRED exact match (simple & safe)
      // - buyer_name is optional; if provided we use ILIKE to narrow
      // - vendor is optional; if selected, require vendor_id match
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
          total_pkr,
          currency,
          vendor_id,
          spec_snapshot
        `
        )
        .eq("buyer_mobile", mobile)
        .order("created_at", { ascending: false })
        .limit(200);

      if (name) {
        q = q.ilike("buyer_name", `%${name}%`);
      }

      if (selectedVendor?.id) {
        q = q.eq("vendor_id", Number(selectedVendor.id));
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
        total_pkr: o.total_pkr != null ? Number(o.total_pkr) : null,
        currency: String(o.currency ?? "PKR"),
        vendor_id: Number(o.vendor_id ?? 0),
        spec_snapshot: o.spec_snapshot ?? {}
      }));

      setRows(mapped);
    } catch (e: any) {
      console.warn("track orders error:", e?.message ?? e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buyerMobileTrim, buyerNameTrim, canSearch, selectedVendor]);

  const renderVendorOption = ({ item }: { item: VendorRow }) => {
    const label = safeText(item.shop_name || item.name || `Vendor #${item.id}`);
    const sub = item.shop_name && item.name ? safeText(item.name) : "";

    return (
      <Pressable
        onPress={() => {
          setSelectedVendor(item);
          setVendorOptions([]);
        }}
        style={({ pressed }) => [styles.vendorOption, pressed && styles.pressed]}
      >
        <Text style={styles.vendorOptionTitle} numberOfLines={1}>
          {label}
        </Text>
        {!!sub ? (
          <Text style={styles.vendorOptionSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: OrderRow }) => {
    const orderLabel = item.order_no || `Order #${item.id}`;
    const amount = money(item.currency, item.total_pkr);
    const status = normLower(item.status);

    const spec = item.spec_snapshot && typeof item.spec_snapshot === "object" ? item.spec_snapshot : {};
    const dressCat = humanizeCat(spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "");

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/orders/[id]",
            params: { id: String(item.id), from: "track" }
          })
        }
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          status === "placed" && styles.cardNewRed
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.orderNo} numberOfLines={1}>
            {orderLabel}
          </Text>
          <Text style={[styles.badge, status === "placed" ? styles.badgeRed : styles.badgeBlue]} numberOfLines={1}>
            {item.status}
          </Text>
        </View>

        <Text style={styles.line} numberOfLines={1}>
          {item.title_snapshot} • {item.product_code_snapshot}
        </Text>

        {/* ✅ Dress Cat */}
        <Text style={styles.small} numberOfLines={1}>
          Dress Cat: {dressCat}
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

  const selectedVendorLabel = useMemo(() => {
    if (!selectedVendor) return "";
    return safeText(selectedVendor.shop_name || selectedVendor.name || `Vendor #${selectedVendor.id}`);
  }, [selectedVendor]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Track Orders</Text>
        <Text style={styles.subtitle}>Search your orders without login</Text>

        <View style={styles.cardForm}>
          <Text style={styles.label}>Buyer Mobile (required)</Text>
          <TextInput
            value={buyerMobile}
            onChangeText={setBuyerMobile}
            placeholder="03XXXXXXXXX"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Buyer Name (optional)</Text>
          <TextInput
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="e.g., Arif"
            style={styles.input}
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.label}>Vendor (optional)</Text>

          {selectedVendor ? (
            <View style={styles.selectedVendorRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedVendorTitle} numberOfLines={1}>
                  {selectedVendorLabel}
                </Text>
                <Text style={styles.selectedVendorSub}>Filter applied</Text>
              </View>

              <Pressable onPress={clearVendor} style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={vendorQuery}
                onChangeText={setVendorQuery}
                placeholder="Type vendor name (2+ letters)..."
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />

              {vendorLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />
                  <Text style={styles.helper}>Searching vendors…</Text>
                </View>
              ) : null}

              {vendorOptions.length ? (
                <View style={styles.vendorOptionsBox}>
                  <FlatList
                    data={vendorOptions}
                    keyExtractor={(x) => String(x.id)}
                    renderItem={renderVendorOption}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              ) : null}
            </>
          )}

          <Pressable
            onPress={searchOrders}
            disabled={!canSearch || loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSearch || loading) && styles.disabledBtn,
              pressed && canSearch && !loading && styles.pressed
            ]}
          >
            <Text style={styles.primaryText}>{loading ? "Searching…" : "Search Orders"}</Text>
          </Pressable>

          {!canSearch ? (
            <Text style={styles.helper}>Enter buyer mobile (at least 10 digits) to search.</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator />
          <Text style={styles.helper}>Loading orders…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(x) => String(x.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{searched ? "No orders found" : "Search to view orders"}</Text>
              <Text style={styles.emptyText}>
                Tip: Use buyer mobile + optional buyer name + optional vendor filter to narrow results.
              </Text>
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
  title: { fontSize: 22, fontWeight: "900", color: "#111" },
  subtitle: { fontSize: 13, color: "#444", fontWeight: "700" },

  cardForm: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    backgroundColor: "#fff"
  },

  label: { fontSize: 12, color: "#6B7280", fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    fontWeight: "800",
    backgroundColor: "#fff"
  },

  vendorOptionsBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 220
  },
  vendorOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#fff"
  },
  vendorOptionTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  vendorOptionSub: { fontSize: 12, fontWeight: "700", color: "#475569", marginTop: 2 },

  selectedVendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12
  },
  selectedVendorTitle: { fontSize: 13, fontWeight: "900", color: "#111" },
  selectedVendorSub: { fontSize: 12, fontWeight: "700", color: "#64748B", marginTop: 2 },

  clearBtn: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  clearBtnText: { fontSize: 12, fontWeight: "900", color: "#111" },

  primaryBtn: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 2
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  disabledBtn: { opacity: 0.45 },
  pressed: { opacity: 0.85 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  helper: { fontSize: 12, color: "#6B7280", fontWeight: "700" },

  loadingArea: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },

  list: { padding: 16, paddingTop: 6, gap: 12 },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    backgroundColor: "#fff"
  },
  cardNewRed: {
    borderColor: "#EF4444",
    backgroundColor: "#FFF7F7"
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  orderNo: { fontSize: 16, fontWeight: "900", flex: 1, color: "#111" },
  line: { fontSize: 13, color: "#333", fontWeight: "700" },
  small: { fontSize: 12, color: "#555", fontWeight: "700" },

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

  empty: { padding: 20, gap: 8, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  emptyText: { fontSize: 13, color: "#555", textAlign: "center", fontWeight: "700" }
});