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
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

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
  spec_snapshot?: any;
  has_review?: boolean;
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

function cleanText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "";
}

function designText(value: unknown, fallback = "") {
  const s = String(value ?? "").trim();
  if (!s || s === "â€”" || s === "—" || s === "Ã¢â‚¬â€") {
    return fallback;
  }

  return (
    s
      .replace(/^(?:Variant|Style)\s+\d+\s*:\s*/i, "")
      .replace(/^(?:Variant|Style)\s+\d+$/i, "")
      .trim() || fallback
  );
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

function numOrNull(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getSelectedVariant(spec: any) {
  const title = designText(cleanText(spec?.selected_variant_title));
  const size = cleanText(spec?.selected_variant_size);
  const color = cleanText(spec?.selected_variant_color);
  const price = numOrNull(spec?.selected_variant_price_pkr);

  return {
    hasVariant: !!(title || size || color || price != null),
    title,
    size,
    color,
    price,
  };
}

export default function TrackOrdersScreen() {
  const router = useRouter();

  const [buyerName, setBuyerName] = useState("");
  const [buyerMobile, setBuyerMobile] = useState("");

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
        name: v.name ?? null,
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
        `,
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
        spec_snapshot: o.spec_snapshot ?? {},
        has_review: false,
      }));

      const deliveredIds = mapped
        .filter((o) => normLower(o.status) === "delivered")
        .map((o) => o.id);

      if (deliveredIds.length) {
        const { data: reviewRows, error: reviewError } = await (supabase as any)
          .from("vendor_reviews")
          .select("order_id")
          .in("order_id", deliveredIds);

        if (reviewError) {
          console.warn("review lookup error:", reviewError.message);
        } else {
          const reviewedIds = new Set<number>(
            Array.isArray(reviewRows)
              ? reviewRows
                  .map((r: any) => Number(r?.order_id))
                  .filter((n: number) => Number.isFinite(n))
              : [],
          );

          mapped.forEach((row) => {
            row.has_review = reviewedIds.has(row.id);
          });
        }
      }

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
        style={({ pressed }) => [
          styles.vendorOption,
          pressed && styles.pressed,
        ]}
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

    const spec =
      item.spec_snapshot && typeof item.spec_snapshot === "object"
        ? item.spec_snapshot
        : {};

    const dressCat = humanizeCat(
      spec?.product_category ?? spec?.dress_category ?? spec?.dress_cat ?? "",
    );

    const selectedVariant = getSelectedVariant(spec);
    const showReviewSubmitted = status === "delivered" && !!item.has_review;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/flow/orders/[id]" as any,
            params: { id: String(item.id), from: "track" },
          })
        }
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          status === "placed" && styles.cardNewRed,
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.orderNo} numberOfLines={1}>
            {orderLabel}
          </Text>
          <Text
            style={[
              styles.badge,
              status === "placed" ? styles.badgeRed : styles.badgeBlue,
            ]}
            numberOfLines={1}
          >
            {humanizeCat(item.status)}
          </Text>
        </View>

        <Text style={styles.line} numberOfLines={1}>
          {item.title_snapshot} • {item.product_code_snapshot}
        </Text>

        <Text style={styles.small} numberOfLines={1}>
          Category: {dressCat}
        </Text>

        {selectedVariant.hasVariant ? (
          <View style={styles.variantBox}>
            <Text style={styles.variantTitle} numberOfLines={1}>
              Selected Design:{" "}
              {selectedVariant.title || "Ready-to-wear design"}
            </Text>

            <Text style={styles.variantMeta} numberOfLines={1}>
              {selectedVariant.size ? `Size: ${selectedVariant.size}` : ""}
              {selectedVariant.size && selectedVariant.color ? " • " : ""}
              {selectedVariant.color ? `Color: ${selectedVariant.color}` : ""}
              {(selectedVariant.size || selectedVariant.color) &&
              selectedVariant.price != null
                ? " • "
                : ""}
              {selectedVariant.price != null
                ? money(item.currency, selectedVariant.price)
                : ""}
            </Text>
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

        {showReviewSubmitted ? (
          <View style={styles.reviewPill}>
            <Text style={styles.reviewPillText}>Review submitted</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const selectedVendorLabel = useMemo(() => {
    if (!selectedVendor) return "";
    return safeText(
      selectedVendor.shop_name ||
        selectedVendor.name ||
        `Vendor #${selectedVendor.id}`,
    );
  }, [selectedVendor]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Track Order</Text>
        <Text style={styles.subtitle}>Search your orders without login</Text>

        <View style={styles.cardForm}>
          <Text style={styles.label}>Buyer Mobile (required)</Text>
          <TextInput
            value={buyerMobile}
            onChangeText={setBuyerMobile}
            placeholder="03XXXXXXXXX"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.label}>Buyer Name (optional)</Text>
          <TextInput
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="e.g., Arif"
            style={styles.input}
            placeholderTextColor={stylesVars.placeholder}
          />

          <Text style={styles.label}>Vendor (optional)</Text>

          {selectedVendor ? (
            <View style={styles.selectedVendorRow}>
              <View style={styles.selectedVendorInfo}>
                <Text style={styles.selectedVendorTitle} numberOfLines={1}>
                  {selectedVendorLabel}
                </Text>
                <Text style={styles.selectedVendorSub}>Filter applied</Text>
              </View>

              <Pressable
                onPress={clearVendor}
                style={({ pressed }) => [
                  styles.clearBtn,
                  pressed && styles.pressed,
                ]}
              >
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
                placeholderTextColor={stylesVars.placeholder}
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
              pressed && canSearch && !loading && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>
              {loading ? "Searching…" : "Track Order"}
            </Text>
          </Pressable>

          {!canSearch ? (
            <Text style={styles.helper}>
              Enter buyer mobile (at least 10 digits) to search.
            </Text>
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
              <Text style={styles.emptyTitle}>
                {searched ? "No orders found" : "Search to view orders"}
              </Text>
              <Text style={styles.emptyText}>
                Use buyer mobile. Add name or vendor to narrow results.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  subText: apColors.subText,
  mutedText: apColors.muted,
  placeholder: "#94A3B8",
  danger: apColors.danger,
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  success: apColors.success,
  successSoft: apColors.successSoft,
  white: apColors.white,
  black: "#000000",
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

  title: {
    fontFamily: apFontFamily,
    fontSize: 18,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  subtitle: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  cardForm: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 16,
    gap: 10,
    backgroundColor: stylesVars.cardBg,
  },

  label: {
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  input: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: apRadii.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: apFontFamily,
    fontSize: 14,
    color: stylesVars.text,
    fontWeight: "500",
    backgroundColor: stylesVars.white,
    letterSpacing: 0,
  },

  vendorOptionsBox: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    overflow: "hidden",
    maxHeight: 220,
    backgroundColor: stylesVars.cardBg,
  },

  vendorOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.cardBg,
  },

  vendorOptionTitle: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  vendorOptionSub: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.mutedText,
    marginTop: 2,
    letterSpacing: 0,
  },

  selectedVendorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
    padding: 12,
    backgroundColor: stylesVars.cardBg,
  },

  selectedVendorInfo: {
    flex: 1,
  },

  selectedVendorTitle: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  selectedVendorSub: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.mutedText,
    marginTop: 2,
    letterSpacing: 0,
  },

  clearBtn: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    borderRadius: apRadii.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  clearBtnText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  primaryBtn: {
    minHeight: 48,
    backgroundColor: stylesVars.blue,
    paddingVertical: 12,
    borderRadius: apRadii.control,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  primaryText: {
    fontFamily: apFontFamily,
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0,
  },

  disabledBtn: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.82,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  helper: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  loadingArea: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    borderRadius: apRadii.card,
    padding: 16,
    gap: 8,
    backgroundColor: stylesVars.cardBg,
  },

  cardNewRed: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: "#FFF7F7",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  orderNo: {
    fontFamily: apFontFamily,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    color: stylesVars.text,
    letterSpacing: 0,
  },

  line: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.subText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  small: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  variantBox: {
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    paddingTop: 8,
    gap: 3,
  },

  variantTitle: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.text,
    fontWeight: "800",
    letterSpacing: 0,
  },

  variantMeta: {
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  badge: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: apRadii.control,
    overflow: "hidden",
    letterSpacing: 0,
  },

  badgeRed: {
    color: stylesVars.danger,
    backgroundColor: stylesVars.dangerSoft,
  },

  badgeBlue: {
    color: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft,
  },

  reviewPill: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.successSoft,
  },

  reviewPillText: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.success,
    letterSpacing: 0,
  },

  empty: {
    padding: 20,
    gap: 8,
    alignItems: "center",
  },

  emptyTitle: {
    fontFamily: apFontFamily,
    fontSize: 16,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  emptyText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0,
  },
});
