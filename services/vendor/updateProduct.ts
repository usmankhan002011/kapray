import type { TablesUpdate } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

const PRODUCT_COLUMNS =
  "id, vendor_id, product_code, title, inventory_qty, made_on_order, product_category, spec, price, media, created_at, updated_at";
const PRODUCT_MEDIA_BUCKET = "vendor_images";

export function getVendorProductsForUpdate(vendorId: number) {
  return appSupabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
}

export function getVendorUpdateProductSettings(vendorId: number) {
  return appSupabase
    .from("vendor")
    .select(
      "id, offers_tailoring, tailoring_options, exports_enabled, export_regions",
    )
    .eq("id", vendorId)
    .single();
}

export function updateVendorProduct(args: {
  productId: number;
  vendorId: number;
  payload: TablesUpdate<"products">;
}) {
  return appSupabase
    .from("products")
    .update(args.payload)
    .eq("id", args.productId)
    .eq("vendor_id", args.vendorId)
    .select(PRODUCT_COLUMNS)
    .single();
}

export function uploadVendorProductAsset(args: {
  path: string;
  fileBody: ArrayBuffer;
  contentType: string;
}) {
  return appSupabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(args.path, args.fileBody, {
      contentType: args.contentType,
      upsert: false,
    });
}
