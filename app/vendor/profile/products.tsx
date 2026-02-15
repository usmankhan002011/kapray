// app/vendor/profile/products.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";

const PRODUCTS_TABLE = "products";

type ProductRow = {
  id: string;
  product_code: string | null;
  title: string | null;
  created_at?: string | null;
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

export default function VendorProductsScreen() {
  const router = useRouter();

  // vendor.id is bigint in your DB -> treat as number
  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);

  const heading = useMemo(() => {
    return vendorId ? `Products (Vendor #${vendorId})` : "Products";
  }, [vendorId]);

  async function fetchProducts() {
    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor.id is loaded.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("id, product_code, title, created_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      setProducts((data as any) ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{heading}</Text>
        <Text
          style={[styles.refresh, loading && styles.disabledText]}
          onPress={loading ? undefined : fetchProducts}
        >
          {loading ? "Loading..." : "Refresh"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.meta}>Add products & manage inventory here.</Text>

        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => router.push("/vendor/profile/add-product")}
          >
            <Text style={styles.primaryText}>Add New Product</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => router.push("/vendor/profile/edit-product")}
          >
            <Text style={styles.secondaryText}>Edit Product</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.section}>All Products</Text>

      <View style={styles.listCard}>
        {!vendorId ? (
          <Text style={styles.empty}>
            Vendor not loaded. Please ensure vendorSlice has vendor.id.
          </Text>
        ) : loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading products…</Text>
          </View>
        ) : products.length ? (
          <View style={styles.list}>
            {products.map((p) => {
              const code = safeText(p.product_code);
              const title = safeText(p.title);

              return (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    styles.item,
                    pressed ? styles.pressed : null
                  ]}
                  onPress={() =>
                    router.push(
                      `/vendor/profile/view-product?product_id=${encodeURIComponent(
                        p.id
                      )}` as any
                    )
                  }
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemCode}>{code}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {title}
                    </Text>
                  </View>

                  <Text style={styles.itemArrow}>›</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>No products yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A"
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

  refresh: { fontSize: 14, fontWeight: "900", color: "#005ea6" },
  disabledText: { opacity: 0.6 },

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14
  },

  meta: { marginTop: 6, fontSize: 14, color: stylesVars.subText },

  btnRow: {
    marginTop: 14,
    gap: 10
  },

  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blue,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: stylesVars.blue,
    alignItems: "center"
  },
  secondaryText: { color: stylesVars.blue, fontWeight: "900", fontSize: 14 },

  section: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "900",
    color: stylesVars.blue
  },

  listCard: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff",
    padding: 12
  },

  list: { gap: 10 },

  item: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  itemLeft: { flex: 1, paddingRight: 10 },

  itemCode: { fontSize: 12, fontWeight: "900", color: stylesVars.blue },
  itemTitle: { marginTop: 2, fontSize: 13, fontWeight: "800", color: "#111" },

  itemArrow: { fontSize: 22, fontWeight: "900", color: stylesVars.subText },

  empty: { color: stylesVars.subText, fontWeight: "800" },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6
  },
  loadingText: { color: stylesVars.subText, fontWeight: "800" },

  pressed: { opacity: 0.75 }
});
