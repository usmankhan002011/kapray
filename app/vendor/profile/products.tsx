// app/vendor/profile/products.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";

const PAGE_SIZE = 30;

type ProductRow = {
  id: string;
  product_code: string | null;
  title: string | null;
  created_at?: string | null;
  media?: any;
  banner_url?: string | null;
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

function firstImagePath(media: any): string | null {
  try {
    const p = media?.images?.[0];
    if (!p) return null;
    const s = String(p).trim();
    return s.length ? s : null;
  } catch {
    return null;
  }
}

function publicUrlForStoragePath(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function VendorProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // vendor.id is bigint in your DB -> treat as number
  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loading, setLoading] = useState(false); // initial / refresh
  const [loadingMore, setLoadingMore] = useState(false); // pagination
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const heading = useMemo(() => {
    return vendorId ? `Products (Vendor #${vendorId})` : "Products";
  }, [vendorId]);

  async function fetchProductsReset() {
    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor.id is loaded.");
      return;
    }

    try {
      setLoading(true);
      setHasMore(true);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("id, product_code, title, created_at, media")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      const rows = ((data as any) ?? []) as ProductRow[];
      const mapped = rows.map((r) => {
        const imgPath = firstImagePath((r as any).media);
        return {
          ...r,
          banner_url: publicUrlForStoragePath(imgPath)
        };
      });

      setProducts(mapped);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMore() {
    if (!vendorId) return;
    if (loading || loadingMore) return;
    if (!hasMore) return;

    try {
      setLoadingMore(true);

      const from = products.length;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("id, product_code, title, created_at, media")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      const rows = ((data as any) ?? []) as ProductRow[];
      const mapped = rows.map((r) => {
        const imgPath = firstImagePath((r as any).media);
        return {
          ...r,
          banner_url: publicUrlForStoragePath(imgPath)
        };
      });

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const add = mapped.filter((r) => !seen.has(r.id));
        return [...prev, ...add];
      });

      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setProducts([]);
    setHasMore(true);
    if (vendorId) fetchProductsReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // If we returned here with a new product_id, fetch and insert it at the top immediately
  useEffect(() => {
    const newId = String((params as any)?.new_product_id ?? "").trim();
    if (!newId || !vendorId) return;

    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from(PRODUCTS_TABLE)
          .select("id, product_code, title, created_at, media")
          .eq("id", newId)
          .eq("vendor_id", vendorId)
          .single();

        if (!alive) return;
        if (error || !data) return;

        const row = data as any as ProductRow;
        const imgPath = firstImagePath((row as any).media);
        const banner_url = publicUrlForStoragePath(imgPath);

        setProducts((prev) => {
          const exists = prev.some((p) => p.id === row.id);
          if (exists) return prev;
          return [{ ...row, banner_url }, ...prev];
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [params, vendorId]);

  function renderItem({ item }: { item: ProductRow }) {
    const code = safeText(item.product_code);
    const title = safeText(item.title);

    return (
      <Pressable
        style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
        onPress={() =>
          router.push(
            `/vendor/profile/view-product?product_id=${encodeURIComponent(
              item.id
            )}` as any
          )
        }
      >
        <View style={styles.thumbWrap}>
          {item.banner_url ? (
            <Image source={{ uri: item.banner_url }} style={styles.thumb} />
          ) : (
            <View style={styles.thumbFallback}>
              <Text style={styles.thumbFallbackText}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.itemMid}>
          <Text style={styles.itemCode}>{code}</Text>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Text style={styles.itemArrow}>›</Text>
      </Pressable>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (!loading && !loadingMore && hasMore) fetchMore();
      }}
      ListHeaderComponent={
        <>
          <View style={styles.topBar}>
            <Text style={styles.title}>{heading}</Text>
            <Text
              style={[styles.refresh, loading && styles.disabledText]}
              onPress={loading ? undefined : fetchProductsReset}
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
                onPress={() => router.push("/vendor/profile/update-product")}
              >
                <Text style={styles.secondaryText}>Update Product</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.section}>Recent Products</Text>

          {!vendorId ? (
            <View style={styles.listCard}>
              <Text style={styles.empty}>
                Vendor not loaded. Please ensure vendorSlice has vendor.id.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.listCard}>
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading products…</Text>
              </View>
            </View>
          ) : !products.length ? (
            <View style={styles.listCard}>
              <Text style={styles.empty}>No products yet.</Text>
            </View>
          ) : null}
        </>
      }
      ListFooterComponent={
        vendorId && products.length ? (
          <View style={styles.footer}>
            {loadingMore ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading more…</Text>
              </View>
            ) : hasMore ? (
              <Pressable
                onPress={fetchMore}
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  pressed ? styles.pressed : null
                ]}
              >
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : (
              <Text style={styles.endText}>product list complete</Text>
            )}
          </View>
        ) : (
          <View style={{ height: 10 }} />
        )
      }
    />
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

  item: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },

  thumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft
  },
  thumb: { width: 54, height: 54 },
  thumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  thumbFallbackText: { color: "#111", opacity: 0.55, fontWeight: "800", fontSize: 10 },

  itemMid: { flex: 1, paddingHorizontal: 10 },

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

  footer: { paddingTop: 8, paddingBottom: 10 },
  loadMoreBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: "center"
  },
  loadMoreText: { color: stylesVars.blue, fontWeight: "900" },
  endText: { marginTop: 10, textAlign: "center", color: stylesVars.subText, fontWeight: "800" },

  pressed: { opacity: 0.75 }
});
