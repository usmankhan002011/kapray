import type { Tables } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

const PRODUCT_COLUMNS =
  "id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media";
const EXCLUDED_ORDER_STATUSES = new Set([
  "canceled",
  "cancelled",
  "rejected",
  "refunded",
  "returned",
]);

type Product = Tables<"products">;
type VendorProductRecord = Pick<
  Product,
  | "id"
  | "product_code"
  | "title"
  | "created_at"
  | "inventory_qty"
  | "made_on_order"
  | "product_category"
  | "spec"
  | "price"
  | "media"
>;

export type VendorProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

export type VendorProduct = Omit<
  VendorProductRecord,
  "media" | "price" | "product_category" | "spec"
> & {
  media: any;
  price: any;
  product_category: VendorProductCategory;
  spec: any;
  banner_url: string | null;
  order_count: number;
};

export type VendorProductPage = {
  products: VendorProduct[];
  totalCount: number;
};

type VendorProductPageParams = {
  vendorId: number;
  searchText: string;
  from: number;
  to: number;
  includeCount?: boolean;
};

function getSearchCategories(searchText: string): VendorProductCategory[] {
  const query = searchText.toLowerCase().replace(/[_-]+/g, " ").trim();
  if (!query) return [];

  const words = query.split(/\s+/).filter(Boolean);
  const hasWord = (word: string) => words.includes(word);
  const hasPhrase = (phrase: string) => query.includes(phrase);

  if (
    hasPhrase("ready to wear") ||
    hasPhrase("ready wear") ||
    hasPhrase("stitched ready") ||
    (hasWord("stitched") && !hasWord("unstitched"))
  ) {
    return ["stitched_ready"];
  }

  if (hasWord("unstitched")) {
    if (hasWord("tailoring") || hasWord("tailor")) {
      return ["unstitched_dyeing_tailoring"];
    }
    if (hasWord("dyeing") || hasWord("dyed") || hasWord("dye")) {
      return ["unstitched_dyeing", "unstitched_dyeing_tailoring"];
    }
    if (hasWord("plain")) return ["unstitched_plain"];
    return [
      "unstitched_plain",
      "unstitched_dyeing",
      "unstitched_dyeing_tailoring",
    ];
  }

  if (hasWord("plain")) return ["unstitched_plain"];
  if (hasWord("tailoring") || hasWord("tailor")) {
    return ["unstitched_dyeing_tailoring"];
  }
  if (hasWord("dyeing") || hasWord("dyed") || hasWord("dye")) {
    return ["unstitched_dyeing", "unstitched_dyeing_tailoring"];
  }
  return [];
}

function firstImagePath(media: any): string | null {
  try {
    const path = media?.images?.[0];
    if (!path) return null;
    return String(path).trim() || null;
  } catch {
    return null;
  }
}

function getProductImageUrl(media: any): string | null {
  const path = firstImagePath(media);
  if (!path) return null;
  return (
    appSupabase.storage.from("vendor_images").getPublicUrl(path).data
      .publicUrl ?? null
  );
}

function isCountedOrderStatus(status: string): boolean {
  return !EXCLUDED_ORDER_STATUSES.has(status.trim().toLowerCase());
}

async function getOrderCounts(
  vendorId: number,
  productIds: number[],
): Promise<Record<string, number>> {
  const ids = [...new Set(productIds)];
  if (!ids.length) return {};

  const { data, error } = await appSupabase
    .from("orders")
    .select("product_id, status")
    .eq("vendor_id", vendorId)
    .in("product_id", ids);

  if (error) {
    console.warn("Could not load product order counts:", error.message);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.product_id == null || !isCountedOrderStatus(row.status)) continue;
    const key = String(row.product_id);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function mapProducts(
  vendorId: number,
  rows: VendorProductRecord[],
): Promise<VendorProduct[]> {
  const counts = await getOrderCounts(
    vendorId,
    rows.map(({ id }) => id),
  );

  return rows.map((row) => ({
    ...row,
    product_category: row.product_category as VendorProductCategory,
    banner_url: getProductImageUrl(row.media),
    order_count: counts[String(row.id)] ?? 0,
  }));
}

export async function getVendorProductsPage({
  vendorId,
  searchText,
  from,
  to,
  includeCount = false,
}: VendorProductPageParams): Promise<VendorProductPage> {
  let query = appSupabase
    .from("products")
    .select(PRODUCT_COLUMNS, includeCount ? { count: "exact" } : undefined)
    .eq("vendor_id", vendorId);

  const safeQuery = searchText.replace(/[%_,]/g, " ").trim();
  if (safeQuery) {
    const categories = getSearchCategories(safeQuery);
    if (categories.length === 1) {
      query = query.eq("product_category", categories[0]);
    } else if (categories.length > 1) {
      query = query.in("product_category", categories);
    } else {
      query = query.or(
        `product_code.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%`,
      );
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  const rows = data ?? [];
  return {
    products: await mapProducts(vendorId, rows),
    totalCount: typeof count === "number" ? count : rows.length,
  };
}

export async function getVendorProduct(
  vendorId: number,
  productId: number,
): Promise<VendorProduct> {
  const { data, error } = await appSupabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", productId)
    .eq("vendor_id", vendorId)
    .single();

  if (error) throw error;
  const [product] = await mapProducts(vendorId, [data]);
  return product;
}
