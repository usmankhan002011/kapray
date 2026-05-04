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
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
  inventory_qty?: number | null;
  made_on_order?: boolean | null;
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

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
        .select(
          "id, product_code, title, created_at, inventory_qty, made_on_order, media",
        )
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
          banner_url: publicUrlForStoragePath(imgPath),
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
        .select(
          "id, product_code, title, created_at, inventory_qty, made_on_order, media",
        )
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
          banner_url: publicUrlForStoragePath(imgPath),
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

  useFocusEffect(
    React.useCallback(() => {
      if (vendorId) {
        void fetchProductsReset();
      }
    }, [vendorId]),
  );

  useEffect(() => {
    const newIdRaw = String((params as any)?.new_product_id ?? "").trim();
    const newId = safeInt(newIdRaw);
    if (newId == null || !vendorId) return;

    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from(PRODUCTS_TABLE)
          .select(
            "id, product_code, title, created_at, inventory_qty, made_on_order, media",
          )
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

  function openProduct(item: ProductRow) {
    router.push(
      `/vendor/profile/view-product?product_id=${encodeURIComponent(
        item.id,
      )}` as any,
    );
  }

  function editProduct(item: ProductRow) {
    router.push({
      pathname: "/vendor/profile/update-product",
      params: {
        productId: item.id,
        product_id: item.id,
      },
    } as any);
  }

  function renderItem({ item }: { item: ProductRow }) {
    const code = safeText(item.product_code);
    const title = safeText(item.title);

    return (
      <View style={styles.item}>
        <Pressable
          style={({ pressed }) => [
            styles.itemMain,
            pressed ? styles.pressed : null,
          ]}
          // onPress={() => openProduct(item)}
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

            <Text style={styles.stockText}>
              {item?.made_on_order
                ? "Made on order"
                : `Qty: ${Math.max(0, Number(item?.inventory_qty ?? 0))}`}
            </Text>

            {!item?.made_on_order && Number(item?.inventory_qty ?? 0) <= 0 ? (
              <Text style={styles.outOfStockText}>Out of stock</Text>
            ) : null}
          </View>
        </Pressable>
        <View style={styles.itemActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => openProduct(item)}
          >
            <Text style={styles.actionText}>View</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => editProduct(item)}
          >
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        </View>
      </View>
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
            <Text style={styles.meta}>
              Add new products here. To update a product, tap Edit on any
              product below.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => router.push("/vendor/profile/add-product")}
            >
              <Text style={styles.primaryText}>Add New Product</Text>
            </Pressable>
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
                  pressed ? styles.pressed : null,
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
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  danger: "#B91C1C",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  refresh: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  disabledText: {
    opacity: 0.6,
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  meta: {
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
  },

  section: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
  },

  listCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  item: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    backgroundColor: stylesVars.cardBg,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  itemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 10,
  },

  thumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: stylesVars.border,
  },

  thumb: {
    width: 54,
    height: 54,
  },

  thumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  thumbFallbackText: {
    color: stylesVars.mutedText,
    fontWeight: "600",
    fontSize: 10,
  },

  itemMid: {
    flex: 1,
    paddingHorizontal: 10,
  },

  itemCode: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  itemTitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.text,
  },

  stockText: {
    marginTop: 2,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  outOfStockText: {
    marginTop: 2,
    fontSize: 12,
    color: stylesVars.danger,
    fontWeight: "700",
  },

  itemActions: {
    paddingRight: 10,
    paddingLeft: 4,
    justifyContent: "center",
    gap: 6,
  },

  actionBtn: {
    minWidth: 70,
    height: 32,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 12,
  },

  empty: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },

  loadingText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  footer: {
    paddingTop: 8,
    paddingBottom: 10,
  },

  loadMoreBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 14,
  },

  endText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  pressed: {
    opacity: 0.82,
  },
});
