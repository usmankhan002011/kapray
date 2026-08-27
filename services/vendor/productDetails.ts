import {
  getVendorMediaUrl,
  getVendorMediaUrls,
} from "@/services/buyer/vendorProfile";
import { appSupabase } from "@/services/supabase";

const PRODUCT_DETAIL_COLUMNS = `
  id,
  vendor_id,
  product_code,
  title,
  inventory_qty,
  made_on_order,
  product_category,
  spec,
  price,
  media,
  created_at,
  updated_at,
  vendor:vendor_id (
    id,
    name,
    shop_name,
    address,
    mobile,
    landline,
    email,
    location,
    location_url,
    profile_image_path,
    banner_path,
    status,
    offers_tailoring,
    exports_enabled,
    export_regions
  )
`;

const PRODUCT_LOOKUP_TABLES = {
  dressTypes: "dress_types",
  fabricTypes: "fabric_types",
  workTypes: "work_types",
  workDensities: "work_densities",
  originCities: "origin_cities",
  wearStates: "wear_states",
} as const;

export type ProductLookupKind = keyof typeof PRODUCT_LOOKUP_TABLES;

export { getVendorMediaUrl, getVendorMediaUrls };

export function getVendorProductDetails(args: {
  productId: string | number | null;
  productCode: string | null;
}) {
  const query = appSupabase.from("products").select(PRODUCT_DETAIL_COLUMNS);
  return (
    args.productId
      ? query.eq("id", Number(args.productId))
      : query.eq("product_code", args.productCode ?? "")
  ).single();
}

export async function resolveProductLookupNames(
  kind: ProductLookupKind,
  ids: string[],
): Promise<string[]> {
  const clean = ids.map((id) => String(id).trim()).filter(Boolean);
  if (!clean.length) return [];

  const { data, error } = await appSupabase
    .from(PRODUCT_LOOKUP_TABLES[kind])
    .select("id, name")
    .in("id", clean);
  if (error || !data) return [];

  const names = new Map(data.map((row) => [String(row.id), row.name]));
  return clean.map((id) => names.get(id) ?? id);
}
