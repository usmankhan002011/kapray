import { getVendorMediaUrl } from "@/services/buyer/vendorProfile";
import { appSupabase } from "@/services/supabase";

const PRODUCT_COLUMNS =
  "id, vendor_id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media";

function getCommonLookupQueries() {
  return [
    appSupabase
      .from("fabric_types")
      .select("id, name")
      .order("sort_order", { ascending: true }),
    appSupabase
      .from("work_types")
      .select("id, name")
      .order("name", { ascending: true }),
    appSupabase
      .from("work_densities")
      .select("id, name")
      .order("name", { ascending: true }),
    appSupabase
      .from("origin_cities")
      .select("id, name")
      .order("name", { ascending: true }),
    appSupabase
      .from("wear_states")
      .select("id, name")
      .order("name", { ascending: true }),
  ] as const;
}

export { getVendorMediaUrl as getCatalogProductMediaUrl };

export function getCatalogPriceBuckets() {
  return appSupabase
    .from("price_buckets")
    .select("id, label, min_pkr, max_pkr, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
}

export function getCatalogProductsPage(from: number, to: number) {
  return appSupabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false })
    .range(from, to);
}

export function getResultFilterLookupQueries() {
  return Promise.all(getCommonLookupQueries());
}

export function getInitialCatalogQueries(from: number, to: number) {
  return Promise.all([
    getCatalogProductsPage(from, to),
    appSupabase
      .from("dress_types")
      .select("id, name")
      .order("id", { ascending: true }),
    ...getCommonLookupQueries(),
  ]);
}
