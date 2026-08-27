import type { Tables } from "@/supabase/supabase";
import { getVendorMediaPublicUrl } from "@/services/media/media";
import { appSupabase } from "@/services/supabase";

export { getVendorMediaPublicUrl as getPurchaseMediaPublicUrl };

type Product = Tables<"products">;
type Vendor = Tables<"vendor">;

export type PurchaseProductRecord = Pick<
  Product,
  "id" | "vendor_id" | "product_code" | "title" | "spec" | "price" | "media"
>;

export type PurchaseProductDetailsRecord = PurchaseProductRecord & {
  vendor: Pick<
    Vendor,
    | "id"
    | "name"
    | "shop_name"
    | "address"
    | "mobile"
    | "landline"
    | "email"
    | "location"
    | "location_url"
    | "profile_image_path"
    | "banner_path"
    | "status"
    | "exports_enabled"
    | "export_regions"
  > | null;
};

export type PurchaseProductIdentifier = {
  productId?: number;
  productCode?: string;
};

async function getProduct<T>(
  columns: string,
  identifier: PurchaseProductIdentifier,
  limitOne: boolean,
): Promise<T> {
  let query = appSupabase.from("products").select(columns);

  if (limitOne) query = query.limit(1);
  if (identifier.productId !== undefined) {
    query = query.eq("id", identifier.productId);
  } else if (identifier.productCode) {
    query = query.eq("product_code", identifier.productCode);
  }

  const { data, error } = await query.single();
  if (error) throw error;
  return data as T;
}

export function getPaymentProduct(
  identifier: PurchaseProductIdentifier,
): Promise<PurchaseProductRecord> {
  return getProduct<PurchaseProductRecord>(
    "id,vendor_id,product_code,title,spec,price,media",
    identifier,
    true,
  );
}

export function getPurchaseProductDetails(
  identifier: PurchaseProductIdentifier,
): Promise<PurchaseProductDetailsRecord> {
  return getProduct<PurchaseProductDetailsRecord>(
    `
      id,
      vendor_id,
      product_code,
      title,
      spec,
      price,
      media,
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
        exports_enabled,
        export_regions
      )
    `,
    identifier,
    false,
  );
}
