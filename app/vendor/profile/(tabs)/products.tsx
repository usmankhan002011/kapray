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
import {
  formatPkr,
  getActiveProductSale,
  getProductRegularPriceRevision,
  getProductSaleKeys,
} from "@/utils/kapray/productSale";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";

const PAGE_SIZE = 30;
const LOW_STOCK_THRESHOLD = 5;

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
  order_count?: number | null;
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

type ProductCardPriceDisplay = {
  tone: "sale" | "revision" | "regular";
  currentLabel: string;
  previousLabel?: string;
  discountLabel?: string;
};

type ProductCardStockStatus = {
  label: "Out of stock" | "Low stock";
  tone: "danger" | "warning";
};

type ProductCardInventoryRevision = {
  previousLabel: string;
};

type ProductCardMetric = {
  label: string;
  value: string | number;
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

function getArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getReadyStyleCount(product: ProductRow) {
  const price = product?.price ?? {};
  const spec = product?.spec ?? {};
  const inventory = (product as any)?.inventory ?? {};

  return Math.max(
    getArrayLength(price?.variants),
    getArrayLength(price?.ready_variants),
    getArrayLength(price?.readyVariants),
    getArrayLength(price?.stitched_variants),
    getArrayLength(price?.stitchedVariants),
    getArrayLength(spec?.variants),
    getArrayLength(spec?.ready_variants),
    getArrayLength(spec?.readyVariants),
    getArrayLength(spec?.stitched_variants),
    getArrayLength(spec?.stitchedVariants),
    getArrayLength(inventory?.variants),
    getArrayLength(inventory?.ready_variants),
    getArrayLength(inventory?.readyVariants),
    getArrayLength(inventory?.stitched_variants),
    getArrayLength(inventory?.stitchedVariants),
  );
}

function getMadeOrderStyleCount(product: ProductRow) {
  const price = product?.price ?? {};
  const spec = product?.spec ?? {};
  const inventory = (product as any)?.inventory ?? {};

  return Math.max(
    getArrayLength(price?.made_order_variants),
    getArrayLength(price?.madeOrderVariants),
    getArrayLength(product?.price?.made_order_variants),
    getArrayLength(product?.price?.madeOrderVariants),
    getArrayLength(spec?.made_order_variants),
    getArrayLength(spec?.madeOrderVariants),
    getArrayLength(inventory?.made_order_variants),
    getArrayLength(inventory?.madeOrderVariants),
  );
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

function getCompactStockDisplay(item: ProductRow): string {
  if (isMadeOnOrderProduct(item)) {
    return "MTO";
  }

  const qty = Math.max(0, Number(getCurrentStockQty(item) ?? 0));
  const suffix = getStockUnit(item) === "m" ? " m" : "";
  return `${formatStockQty(qty)}${suffix}`;
}

function getProductOrderMetricLabel(item: ProductRow) {
  if (isMadeOnOrderProduct(item)) {
    return "Sold";
  }

  return isUnstitchedProduct(item) ? "Orders" : "Sold";
}

function getProductOrderMetricValue(item: ProductRow) {
  const count = safeInt(item?.order_count);
  return Math.max(0, count ?? 0);
}

function getStyleMetric(item: ProductRow): ProductCardMetric | null {
  const count = isMadeOnOrderProduct(item)
    ? getMadeOrderStyleCount(item)
    : isStitchedReadyProduct(item)
      ? getReadyStyleCount(item)
      : 0;

  if (count <= 0) return null;

  return {
    label: count === 1 ? "Design" : "Styles",
    value: count,
  };
}

function getProductCardMetrics(item: ProductRow): ProductCardMetric[] {
  const metrics: ProductCardMetric[] = [];

  if (!isMadeOnOrderProduct(item)) {
    metrics.push({ label: "Stock", value: getCompactStockDisplay(item) });
  }

  const styleMetric = getStyleMetric(item);
  if (styleMetric) {
    metrics.push(styleMetric);
  }

  metrics.push({
    label: getProductOrderMetricLabel(item),
    value: getProductOrderMetricValue(item),
  });

  return metrics;
}

function getStockUnit(item: ProductRow) {
  return isUnstitchedProduct(item) ? "m" : "unit";
}

function normalizeStockQtyForUnit(value: unknown, unit: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (unit === "m") return Math.round(n * 100) / 100;
  return Math.trunc(n);
}

function getCurrentStockQty(item: ProductRow) {
  if (isMadeOnOrderProduct(item)) return null;

  if (isStitchedReadyProduct(item)) {
    return getStitchedInventorySummary(item).totalQty;
  }

  const qty = Number(item?.inventory_qty ?? 0);
  return Number.isFinite(qty) ? qty : 0;
}

function getInventoryRevisionDisplay(
  item: ProductRow,
): ProductCardInventoryRevision | null {
  if (isMadeOnOrderProduct(item)) return null;

  const revision = item?.spec?.inventory_revision;
  if (!revision || typeof revision !== "object" || revision?.active !== true) {
    return null;
  }

  const unit = String(revision?.unit ?? getStockUnit(item)).trim() || "unit";
  if (unit !== getStockUnit(item)) return null;

  const previousQty = normalizeStockQtyForUnit(revision?.previous_qty, unit);
  const revisionCurrentQty = normalizeStockQtyForUnit(
    revision?.current_qty,
    unit,
  );
  const currentQty = normalizeStockQtyForUnit(getCurrentStockQty(item), unit);

  if (
    previousQty == null ||
    revisionCurrentQty == null ||
    currentQty == null ||
    previousQty === currentQty ||
    revisionCurrentQty !== currentQty
  ) {
    return null;
  }

  const suffix = unit === "m" ? " m" : "";

  return {
    previousLabel: `Previous stock ${formatStockQty(previousQty)}${suffix}`,
  };
}

function getStockStatusDisplay(
  item: ProductRow,
): ProductCardStockStatus | null {
  if (isMadeOnOrderProduct(item)) return null;

  const qty = isStitchedReadyProduct(item)
    ? getStitchedInventorySummary(item).totalQty
    : Number(item?.inventory_qty ?? 0);

  if (!Number.isFinite(qty) || qty <= 0) {
    return { label: "Out of stock", tone: "danger" };
  }

  if (qty <= LOW_STOCK_THRESHOLD) {
    return { label: "Low stock", tone: "warning" };
  }

  return null;
}

function getProductCardPriceDisplay(
  item: ProductRow,
): ProductCardPriceDisplay | null {
  const saleInfo = getActiveProductSale(item.price);

  if (saleInfo) {
    return {
      tone: "sale",
      currentLabel: saleInfo.currentLabel,
      previousLabel: saleInfo.previousLabel,
      discountLabel: `-${saleInfo.discountPercent}%`,
    };
  }

  const regularRevision = getProductRegularPriceRevision(item.price);

  if (regularRevision) {
    return {
      tone: "revision",
      currentLabel: regularRevision.currentLabel,
      previousLabel: regularRevision.previousLabel,
    };
  }

  const keys = getProductSaleKeys(item.price);
  if (!keys) return null;

  const price = item?.price ?? {};
  const currentCost = positiveNumber(price?.[keys.priceKey]);
  if (currentCost <= 0) return null;

  return {
    tone: "regular",
    currentLabel: `${formatPkr(currentCost)}${keys.unitSuffix}`,
  };
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
    useAppSelector((s: any) => s?.vendorSlice?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const loadedVendorIdRef = React.useRef<number | null>(null);

  const trimmedSearch = searchQuery.trim();
  const searching = trimmedSearch.length > 0;
  const displayedProductCount = productCount ?? products.length;
  const productCountLabel = `Total Products: ${displayedProductCount.toLocaleString()}`;
  const newProductIdParam = String((params as any)?.new_product_id ?? "").trim();
  const updatedProductIdParam = String(
    (params as any)?.updated_product_id ?? "",
  ).trim();
  const refreshParam = String((params as any)?.refresh ?? "").trim();

  function isCountedOrderStatus(status: unknown) {
    const value = String(status ?? "").trim().toLowerCase();
    return !["canceled", "cancelled", "rejected", "refunded", "returned"].includes(
      value,
    );
  }

  async function fetchOrderCountsByProductId(
    productIds: Array<string | number | null | undefined>,
  ): Promise<Record<string, number>> {
    if (!vendorId) return {};

    const ids = Array.from(
      new Set(
        productIds
          .map((id) => safeInt(id))
          .filter((id): id is number => id != null),
      ),
    );

    if (!ids.length) return {};

    const { data, error } = await supabase
      .from("orders")
      .select("product_id, status")
      .eq("vendor_id", vendorId)
      .in("product_id", ids);

    if (error) {
      console.warn("Could not load product order counts:", error.message);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const row of (data as any[]) ?? []) {
      if (!isCountedOrderStatus(row?.status)) continue;

      const productId = safeInt(row?.product_id);
      if (productId == null) continue;

      const key = String(productId);
      counts[key] = (counts[key] ?? 0) + 1;
    }

    return counts;
  }

  async function attachOrderCounts(rows: ProductRow[]) {
    const counts = await fetchOrderCountsByProductId(rows.map((row) => row.id));
    return rows.map((row) => ({
      ...row,
      order_count: counts[String(safeInt(row.id) ?? row.id)] ?? 0,
    }));
  }

  async function fetchProductsReset(options?: { showLoading?: boolean }) {
    if (!vendorId) {
      return;
    }

    const showLoading = options?.showLoading ?? true;

    try {
      if (showLoading) {
        setLoading(true);
      }
      setHasMore(true);

      let query = supabase
        .from(PRODUCTS_TABLE)
        .select(
          "id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media",
          { count: "exact" },
        )
        .eq("vendor_id", vendorId);

      if (trimmedSearch) {
        query = applyVendorProductSearch(query, trimmedSearch);
      }

      const { data, error, count } = await query
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
      const mappedWithCounts = await attachOrderCounts(mapped);

      setProducts(mappedWithCounts);
      setProductCount(typeof count === "number" ? count : rows.length);
      setHasMore(rows.length === PAGE_SIZE);
      loadedVendorIdRef.current = vendorId;
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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
      const mappedWithCounts = await attachOrderCounts(mapped);

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const add = mappedWithCounts.filter((r) => !seen.has(r.id));
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
        void fetchProductsReset({
          showLoading: loadedVendorIdRef.current !== vendorId,
        });
      }
    }, [
      vendorId,
      trimmedSearch,
      newProductIdParam,
      updatedProductIdParam,
      refreshParam,
    ]),
  );

  useEffect(() => {
    const newId = safeInt(newProductIdParam);
    const updatedId = safeInt(updatedProductIdParam);
    const targetId = updatedId ?? newId;
    const shouldPrepend = newId != null && updatedId == null;
    if (targetId == null || !vendorId) return;

    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from(PRODUCTS_TABLE)
          .select(
            "id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media",
          )
          .eq("id", targetId)
          .eq("vendor_id", vendorId)
          .single();

        if (!alive) return;
        if (error || !data) return;

        const row = data as any as ProductRow;
        const imgPath = firstImagePath((row as any).media);
        const banner_url = publicUrlForStoragePath(imgPath);
        const [mappedRow] = await attachOrderCounts([{ ...row, banner_url }]);

        if (!alive) return;

        setProducts((prev) => {
          const exists = prev.some((p) => p.id === row.id);
          if (exists) {
            return prev.map((p) => (p.id === row.id ? mappedRow : p));
          }
          return shouldPrepend ? [mappedRow, ...prev] : prev;
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, [newProductIdParam, refreshParam, updatedProductIdParam, vendorId]);

  function openProduct(item: ProductRow) {
    router.push({
      pathname: "/vendor/profile/view-product",
      params: {
        product_id: item.id,
        from: "vendor-products",
      },
    } as any);
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
    resetDraft("start-new-product");
    router.push("/vendor/profile/add-product");
  }

  function renderItem({ item }: { item: ProductRow }) {
    const code = safeText(item.product_code);
    const title = safeText(item.title);
    const categoryText = productCategoryCardLabel(item);
    const cardMetrics = getProductCardMetrics(item);
    const inventoryRevision = getInventoryRevisionDisplay(item);
    const stockStatus = getStockStatusDisplay(item);
    const saleInfo = getActiveProductSale(item.price);
    const priceDisplay = getProductCardPriceDisplay(item);

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

            {priceDisplay ? (
              <View style={styles.priceBlock}>
                <Text
                  style={[
                    styles.cardPrice,
                    priceDisplay.tone === "sale" ? styles.salePrice : null,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                >
                  {priceDisplay.currentLabel}
                </Text>
                {priceDisplay.previousLabel ? (
                  <View style={styles.previousPriceRow}>
                    <Text
                      style={[
                        styles.previousPrice,
                        priceDisplay.tone === "sale"
                          ? styles.salePreviousPrice
                          : null,
                        priceDisplay.tone === "revision"
                          ? styles.revisionPreviousPrice
                          : null,
                      ]}
                      numberOfLines={1}
                    >
                      {priceDisplay.previousLabel}
                    </Text>
                    {priceDisplay.discountLabel ? (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>
                          {priceDisplay.discountLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.stockText} numberOfLines={2}>
              {categoryText}
            </Text>
            <Text style={styles.stockText} numberOfLines={1}>
              {cardMetrics.map((metric, index) => (
                <React.Fragment key={`${metric.label}-${index}`}>
                  {index > 0 ? " | " : ""}
                  {metric.label}:{" "}
                  <Text style={styles.stockValueText}>{metric.value}</Text>
                </React.Fragment>
              ))}
            </Text>
            {inventoryRevision ? (
              <Text style={styles.inventoryRevisionText}>
                {inventoryRevision.previousLabel}
              </Text>
            ) : null}

            {stockStatus ? (
              <View
                style={[
                  styles.stockStatusTag,
                  stockStatus.tone === "danger"
                    ? styles.stockStatusDanger
                    : styles.stockStatusWarning,
                ]}
              >
                <Text
                  style={[
                    styles.stockStatusText,
                    stockStatus.tone === "danger"
                      ? styles.stockStatusDangerText
                      : styles.stockStatusWarningText,
                  ]}
                >
                  {stockStatus.label}
                </Text>
              </View>
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
                loading || !vendorId ? styles.disabledButton : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={
                loading || !vendorId ? undefined : () => void fetchProductsReset()
              }
              disabled={loading || !vendorId}
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

          <View style={styles.sectionRow}>
            <Text style={styles.section}>
              {searching ? "Results" : "Recent Products"}
            </Text>
            {vendorId ? (
              <Text style={styles.productCountText}>{productCountLabel}</Text>
            ) : null}
          </View>

          {!vendorId ? (
            <View style={styles.listCard}>
              <Text style={styles.empty}>Vendor not loaded.</Text>
            </View>
          ) : loading && !products.length ? (
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

  sectionRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  section: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 15,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  productCountText: {
    flexShrink: 0,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: stylesVars.mutedText,
    textAlign: "right",
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

  priceBlock: {
    marginTop: 4,
  },

  cardPrice: {
    fontFamily: apFontFamily,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  salePrice: {
    color: stylesVars.danger,
  },

  previousPriceRow: {
    marginTop: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  discountBadge: {
    minHeight: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  discountBadgeText: {
    fontFamily: apFontFamily,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900",
    color: "#C2410C",
    letterSpacing: 0,
  },

  previousPrice: {
    flexShrink: 1,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: stylesVars.mutedText,
    textDecorationLine: "line-through",
    letterSpacing: 0,
  },

  salePreviousPrice: {
    color: stylesVars.mutedText,
  },

  revisionPreviousPrice: {
    color: stylesVars.text,
  },

  stockText: {
    marginTop: 2,
    fontFamily: apFontFamily,
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
    letterSpacing: 0,
  },

  stockValueText: {
    fontFamily: apFontFamily,
    fontWeight: "900",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  inventoryRevisionText: {
    marginTop: 1,
    fontFamily: apFontFamily,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: stylesVars.mutedText,
    textDecorationLine: "line-through",
    letterSpacing: 0,
  },

  stockStatusTag: {
    marginTop: 5,
    alignSelf: "flex-start",
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: apRadii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stockStatusDanger: {
    borderColor: stylesVars.dangerBorder,
    backgroundColor: stylesVars.dangerSoft,
  },

  stockStatusWarning: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFF7ED",
  },

  stockStatusText: {
    fontFamily: apFontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    letterSpacing: 0,
  },

  stockStatusDangerText: {
    color: stylesVars.danger,
  },

  stockStatusWarningText: {
    color: "#C2410C",
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
