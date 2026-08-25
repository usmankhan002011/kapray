import type { TablesUpdate } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

const PRODUCT_SALE_COLUMNS =
  "id, vendor_id, product_code, title, price, updated_at";

export function getVendorSaleProduct(productId: number, vendorId: number) {
  return appSupabase
    .from("products")
    .select(PRODUCT_SALE_COLUMNS)
    .eq("id", productId)
    .eq("vendor_id", vendorId)
    .single();
}

export function updateVendorProductPrice(
  productId: number,
  vendorId: number,
  payload: Pick<TablesUpdate<"products">, "price" | "updated_at">,
) {
  return appSupabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .eq("vendor_id", vendorId)
    .select(PRODUCT_SALE_COLUMNS)
    .single();
}
