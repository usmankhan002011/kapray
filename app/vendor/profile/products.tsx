// app/vendor/profile/products.tsx
import React, { useEffect, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  apColors,
  apFontFamily,
  apInputTextStyle,
  apRadii,
} from "@/components/product/addProductStyles";
import { getActiveProductSale } from "@/utils/kapray/productSale";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";

const PAGE_SIZE = 30;

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type ProductRow = {
  id: string;
  product_code: string | null;
  title: string | null;
  created_at?: string | null;
  inventory_qty?: number | null;
  made_on_order?: boolean | null;
  product_category?: ProductCategory | null;
  spec?: any;
  price?: any;
  media?: any;
  banner_url?: string | null;
};

type VariantInventorySummary = {
  totalQty: number;
  availableSizes: number;
  variantCount: number;
  hasStock: boolean;
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function positiveNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatStockQty(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return String(Math.round(n * 100) / 100)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
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

function getVariantInventorySummary(
  product: ProductRow,
): VariantInventorySummary {
  const price = product?.price ?? {};
  const spec = product?.spec ?? {};

  const variants =
    price?.variants ??
    price?.ready_variants ??
    price?.readyVariants ??
    price?.stitched_variants ??
    price?.stitchedVariants ??
    spec?.variants ??
    spec?.ready_variants ??
    spec?.readyVariants ??
    spec?.stitched_variants ??
    spec?.stitchedVariants ??
    [];

  let totalQty = 0;
  let variantCount = 0;
  const availableSizeKeys = new Set<string>();

  for (const variant of Array.isArray(variants) ? variants : []) {
    const sizes = Array.isArray(variant?.sizes) ? variant.sizes : [];
    let variantHasStock = false;

    for (const row of sizes) {
      const qty = Number(
        row?.qty ??
          row?.stock_qty ??
          row?.stockQty ??
          row?.stock ??
          row?.quantity ??
          0,
      );

      if (Number.isFinite(qty) && qty > 0) {
        totalQty += Math.trunc(qty);
        variantHasStock = true;

        const sizeKey = String(
          row?.size ??
            row?.size_label ??
            row?.sizeLabel ??
            row?.label ??
            row?.name ??
            "",
        )
          .trim()
          .toLowerCase();

        if (sizeKey) {
          availableSizeKeys.add(sizeKey);
        }
      }
    }

    if (variantHasStock) {
      variantCount += 1;
    }
  }

  return {
    totalQty,
    availableSizes: Math.min(6, availableSizeKeys.size),
    variantCount,
    hasStock: totalQty > 0,
  };
}

function getRawSimpleReadyInventory(product: ProductRow): any[] {
  const price = product?.price ?? {};
  const spec = product?.spec ?? {};
  const inventory = (product as any)?.inventory ?? {};

  const raw =
    price?.simple_ready_inventory ??
    price?.simpleReadyInventory ??
    spec?.simple_ready_inventory ??
    spec?.simpleReadyInventory ??
    inventory?.simple_ready_inventory ??
    inventory?.simpleReadyInventory ??
    [];

  return Array.isArray(raw) ? raw : [];
}

function getSimpleReadyInventorySummary(
  product: ProductRow,
): VariantInventorySummary {
  const rows = getRawSimpleReadyInventory(product);
  let totalQty = 0;
  const availableSizeKeys = new Set<string>();

  for (const row of rows) {
    const qty = Number(
      row?.qty ??
        row?.stock_qty ??
        row?.stockQty ??
        row?.stock ??
        row?.quantity ??
        0,
    );

    if (!Number.isFinite(qty) || qty <= 0) continue;

    totalQty += Math.trunc(qty);

    const sizeKey = String(
      row?.size ??
        row?.size_label ??
        row?.sizeLabel ??
        row?.label ??
        row?.name ??
        "",
    )
      .trim()
      .toLowerCase();

    if (sizeKey) {
      availableSizeKeys.add(sizeKey);
    }
  }

  if (totalQty <= 0) {
    totalQty = Math.max(0, Math.trunc(Number(product?.inventory_qty ?? 0)));
  }

  if (!availableSizeKeys.size && totalQty > 0) {
    const sizes = Array.isArray(product?.price?.available_sizes)
      ? product.price.available_sizes
      : [];

    for (const size of sizes) {
      const key = String(size ?? "").trim().toLowerCase();
      if (key) availableSizeKeys.add(key);
    }
  }

  return {
    totalQty,
    availableSizes: Math.min(6, availableSizeKeys.size),
    variantCount: totalQty > 0 ? 1 : 0,
    hasStock: totalQty > 0,
  };
}

function getStitchedInventorySummary(
  product: ProductRow,
): VariantInventorySummary {
  const mode = String(product?.spec?.variant_mode ?? "").trim();
  const variantSummary = getVariantInventorySummary(product);

  if (mode === "ready_variants") return variantSummary;
  if (mode === "simple_ready") return getSimpleReadyInventorySummary(product);
  if (variantSummary.hasStock) return variantSummary;

  return getSimpleReadyInventorySummary(product);
}

function isProductCategory(v: unknown): v is ProductCategory {
  return (
    v === "unstitched_plain" ||
    v === "unstitched_dyeing" ||
    v === "unstitched_dyeing_tailoring" ||
    v === "stitched_ready"
  );
}

function getProductCategory(item: ProductRow): ProductCategory | null {
  const fromSpec = String(item?.spec?.product_category ?? "").trim();
  const fromDb = String(item?.product_category ?? "").trim();
  const exactCategories = [fromSpec, fromDb].filter(isProductCategory);
  const spec = item?.spec ?? {};
  const price = item?.price ?? {};
  const priceMode = String(price?.mode ?? "").trim();
  const isUnstitched =
    exactCategories.some(
      (category) =>
        category === "unstitched_plain" ||
        category === "unstitched_dyeing" ||
        category === "unstitched_dyeing_tailoring",
    ) ||
    fromDb === "unstitched" ||
    priceMode.includes("unstitched");

  if (isUnstitched) {
    if (
      exactCategories.includes("unstitched_dyeing_tailoring") ||
      isTruthyFlag(spec?.tailoring_enabled) ||
      isTruthyFlag(spec?.tailoring_selected)
    ) {
      return "unstitched_dyeing_tailoring";
    }

    if (
      exactCategories.includes("unstitched_dyeing") ||
      isTruthyFlag(spec?.dyeing_enabled) ||
      isTruthyFlag(spec?.dyeing_selected) ||
      positiveNumber(price?.dyeing_cost_pkr) > 0 ||
      positiveNumber(spec?.dyeing_cost_pkr) > 0
    ) {
      return "unstitched_dyeing";
    }

    return "unstitched_plain";
  }

  if (
    exactCategories.includes("stitched_ready") ||
    priceMode === "stitched_total" ||
    priceMode === "stitched_ready"
  ) {
    return "stitched_ready";
  }

  return null;
}

function isTruthyFlag(v: unknown) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return false;
}

function isMadeOnOrderProduct(item: ProductRow) {
  return (
    isTruthyFlag(item?.made_on_order) ||
    isTruthyFlag(item?.spec?.made_on_order)
  );
}

function isStitchedReadyProduct(item: ProductRow) {
  return getProductCategory(item) === "stitched_ready";
}

function isUnstitchedProduct(item: ProductRow) {
  const category = getProductCategory(item);

  if (
    category === "unstitched_plain" ||
    category === "unstitched_dyeing" ||
    category === "unstitched_dyeing_tailoring"
  ) {
    return true;
  }

  const rawCategory = String(item?.product_category ?? "").trim();
  if (rawCategory === "unstitched") return true;

  const priceMode = String(item?.price?.mode ?? "").trim();
  return priceMode.includes("unstitched");
}

function productCategoryCardLabel(item: ProductRow) {
  const category = getProductCategory(item);

  if (category === "stitched_ready") {
    return isMadeOnOrderProduct(item) ? "Made-on-order" : "Ready-to-wear";
  }

  if (category === "unstitched_dyeing_tailoring") {
    return "Unstitched + dyeing + tailoring";
  }

  if (category === "unstitched_dyeing") return "Unstitched + dyeing";

  if (category === "unstitched_plain" || isUnstitchedProduct(item)) {
    return "Unstitched plain fabric";
  }

  return isMadeOnOrderProduct(item) ? "Made-on-order" : "Product";
}

function getStockSummaryText(item: ProductRow) {
  if (isMadeOnOrderProduct(item)) return "Made on order";

  if (isStitchedReadyProduct(item)) {
    const info = getStitchedInventorySummary(item);

    if (!info.hasStock) return "Total stock 0";

    const styleWord = info.variantCount === 1 ? "style" : "styles";
    return `Total stock ${info.totalQty} in ${info.variantCount} ${styleWord}`;
  }

  const qty = Math.max(0, Number(item?.inventory_qty ?? 0));
  return isUnstitchedProduct(item)
    ? `Total stock ${formatStockQty(qty)} m`
    : `Total stock ${formatStockQty(qty)}`;
}

function isOutOfStock(item: ProductRow) {
  if (isMadeOnOrderProduct(item)) return false;

  if (isStitchedReadyProduct(item)) {
    return !getStitchedInventorySummary(item).hasStock;
  }

  return Number(item?.inventory_qty ?? 0) <= 0;
}

function getSearchCategories(searchText: string): ProductCategory[] {
  const q = searchText.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (!q) return [];

  const words = q.split(/\s+/).filter(Boolean);
  const hasWord = (word: string) => words.includes(word);
  const hasPhrase = (phrase: string) => q.includes(phrase);

  if (
    hasPhrase("ready to wear") ||
    hasPhrase("ready wear") ||
    hasPhrase("stitched ready")
  ) {
    return ["stitched_ready"];
  }

  if (hasWord("stitched") && !hasWord("unstitched")) {
    return ["stitched_ready"];
  }

  if (hasWord("unstitched")) {
    if (hasWord("tailoring") || hasWord("tailor")) {
      return ["unstitched_dyeing_tailoring"];
    }

    if (hasWord("dyeing") || hasWord("dyed") || hasWord("dye")) {
      return ["unstitched_dyeing", "unstitched_dyeing_tailoring"];
    }

    if (hasWord("plain")) {
      return ["unstitched_plain"];
    }

    return [
      "unstitched_plain",
      "unstitched_dyeing",
      "unstitched_dyeing_tailoring",
    ];
  }

  if (hasWord("plain")) return ["unstitched_plain"];
  if (hasWord("tailoring") || hasWord("tailor"))
    return ["unstitched_dyeing_tailoring"];
  if (hasWord("dyeing") || hasWord("dyed") || hasWord("dye")) {
    return ["unstitched_dyeing", "unstitched_dyeing_tailoring"];
  }

  return [];
}

function applyVendorProductSearch(query: any, searchText: string) {
  const safeQuery = searchText.replace(/[%_,]/g, " ").trim();
  if (!safeQuery) return query;

  const categoryMatches = getSearchCategories(safeQuery);

  if (categoryMatches.length === 1) {
    return query.eq("product_category", categoryMatches[0]);
  }

  if (categoryMatches.length > 1) {
    return query.in("product_category", categoryMatches);
  }

  return query.or(
    [`product_code.ilike.%${safeQuery}%`, `title.ilike.%${safeQuery}%`].join(
      ",",
    ),
  );
}

export default function VendorProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetDraft } = useProductDraft();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const trimmedSearch = searchQuery.trim();
  const searching = trimmedSearch.length > 0;

  async function fetchProductsReset() {
    if (!vendorId) {
      Alert.alert("Vendor missing", "Open from vendor profile.");
      return;
    }

    try {
      setLoading(true);
      setHasMore(true);

      let query = supabase
        .from(PRODUCTS_TABLE)
        .select(
          "id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media",
        )
        .eq("vendor_id", vendorId);

      if (trimmedSearch) {
        query = applyVendorProductSearch(query, trimmedSearch);
      }

      const { data, error } = await query
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

      let query = supabase
        .from(PRODUCTS_TABLE)
        .select(
          "id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media",
        )
        .eq("vendor_id", vendorId);

      if (trimmedSearch) {
        query = applyVendorProductSearch(query, trimmedSearch);
      }

      const { data, error } = await query
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
    }, [vendorId, trimmedSearch]),
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
            "id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media",
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

  function openSale(item: ProductRow) {
    router.push({
      pathname: "/vendor/profile/product-sale",
      params: {
        productId: item.id,
        product_id: item.id,
      },
    } as any);
  }

  function startNewProduct() {
    resetDraft();
    router.push("/vendor/profile/add-product");
  }

  function renderItem({ item }: { item: ProductRow }) {
    const code = safeText(item.product_code);
    const title = safeText(item.title);
    const categoryText = productCategoryCardLabel(item);
    const stockText = getStockSummaryText(item);
    const outOfStock = isOutOfStock(item);
    const saleInfo = getActiveProductSale(item.price);

    return (
      <View style={styles.item}>
        <Pressable
          style={({ pressed }) => [
            styles.itemMain,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => openProduct(item)}
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

            <Text style={styles.stockText} numberOfLines={2}>
              {categoryText}
            </Text>
            <Text style={styles.stockText}>{stockText}</Text>

            {outOfStock ? (
              <Text style={styles.outOfStockText}>Out of stock</Text>
            ) : null}
            {saleInfo ? (
              <Text style={styles.saleText}>
                Sale {saleInfo.currentLabel} -{saleInfo.discountPercent}%
              </Text>
            ) : null}
          </View>
        </Pressable>
        <View style={styles.itemActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set product sale"
            style={({ pressed }) => [
              styles.actionBtn,
              saleInfo ? styles.saleActionBtn : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => openSale(item)}
          >
            <MaterialIcons
              name="local-offer"
              size={17}
              color={saleInfo ? stylesVars.danger : stylesVars.blue}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit product"
            style={({ pressed }) => [
              styles.actionBtn,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => editProduct(item)}
          >
            <MaterialIcons name="edit" size={17} color={stylesVars.blue} />
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
            <View style={styles.headerText}>
              <Text style={styles.title}>Products</Text>
              {vendorId ? (
                <Text style={styles.vendorMeta}>Vendor #{vendorId}</Text>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.refreshBtn,
                loading ? styles.disabledButton : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={loading ? undefined : fetchProductsReset}
              disabled={loading}
            >
              <View style={styles.actionContent}>
                <MaterialIcons
                  name="refresh"
                  size={17}
                  color={stylesVars.blue}
                />
                <Text style={styles.refreshText}>
                  {loading ? "Loading" : "Refresh"}
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.pressed : null,
            ]}
            onPress={startNewProduct}
          >
            <View style={styles.primaryContent}>
              <MaterialIcons name="add" size={19} color={stylesVars.white} />
              <Text style={styles.primaryText}>Add New Product</Text>
            </View>
          </Pressable>

          {vendorId ? (
            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Search</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Code, name, category"
                placeholderTextColor={stylesVars.mutedText}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={styles.searchInput}
              />
            </View>
          ) : null}

          <Text style={styles.section}>
            {searching ? "Results" : "Recent Products"}
          </Text>

          {!vendorId ? (
            <View style={styles.listCard}>
              <Text style={styles.empty}>Vendor not loaded.</Text>
            </View>
          ) : loading ? (
            <View style={styles.listCard}>
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            </View>
          ) : searching && !products.length ? (
            <View style={styles.listCard}>
              <Text style={styles.empty}>No matches.</Text>
            </View>
          ) : !products.length ? (
            <View style={styles.listCard}>
              <Text style={styles.empty}>No products.</Text>
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
                <Text style={styles.loadingText}>Loading more...</Text>
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
              <Text style={styles.endText}>All products loaded</Text>
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
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  subText: apColors.subText,
  mutedText: apColors.muted,
  danger: apColors.danger,
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  white: apColors.white,
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 92,
    backgroundColor: stylesVars.bg,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontFamily: apFontFamily,
    fontSize: 20,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  vendorMeta: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: stylesVars.mutedText,
    letterSpacing: 0,
  },

  disabledButton: {
    opacity: 0.6,
  },

  refreshBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  primaryBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: apRadii.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryText: {
    fontFamily: apFontFamily,
    color: stylesVars.white,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0,
  },

  searchCard: {
    marginTop: 14,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14,
  },

  searchLabel: {
    fontFamily: apFontFamily,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.text,
    marginBottom: 8,
    letterSpacing: 0,
  },

  searchInput: {
    minHeight: 46,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.white,
    paddingHorizontal: 12,
    ...apInputTextStyle,
    color: stylesVars.text,
    fontSize: 14,
    fontWeight: "600",
  },

  section: {
    marginTop: 16,
    fontFamily: apFontFamily,
    fontSize: 15,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  listCard: {
    marginTop: 10,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 16,
  },

  item: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: apRadii.card,
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
    borderRadius: apRadii.control,
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
    fontFamily: apFontFamily,
    color: stylesVars.mutedText,
    fontWeight: "600",
    fontSize: 10,
    letterSpacing: 0,
  },

  itemMid: {
    flex: 1,
    paddingHorizontal: 10,
  },

  itemCode: {
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
  },

  itemTitle: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  stockText: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  outOfStockText: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.danger,
    fontWeight: "800",
    letterSpacing: 0,
  },

  saleText: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.danger,
    fontWeight: "800",
    letterSpacing: 0,
  },

  itemActions: {
    paddingRight: 10,
    paddingLeft: 4,
    justifyContent: "center",
    gap: 8,
  },

  actionBtn: {
    width: 34,
    height: 30,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  saleActionBtn: {
    backgroundColor: stylesVars.dangerSoft,
    borderColor: stylesVars.dangerBorder,
  },

  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  actionText: {
    fontFamily: apFontFamily,
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0,
  },

  empty: {
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },

  loadingText: {
    fontFamily: apFontFamily,
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  footer: {
    paddingTop: 8,
    paddingBottom: 10,
  },

  loadMoreBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: apRadii.control,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreText: {
    fontFamily: apFontFamily,
    color: stylesVars.blue,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0,
  },

  endText: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: apFontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
    letterSpacing: 0,
  },

  pressed: {
    opacity: 0.82,
  },
});
