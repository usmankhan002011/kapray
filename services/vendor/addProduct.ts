import type { TablesInsert, TablesUpdate } from "@/supabase/supabase";
import {
  getVendorMediaPathFromPublicUrl,
  getVendorMediaPublicUrl,
  uploadVendorMediaWithOverwrite,
} from "@/services/media/media";
import { appSupabase } from "@/services/supabase";

export {
  getVendorMediaPathFromPublicUrl as getAddProductAssetPathFromPublicUrl,
  getVendorMediaPublicUrl as getAddProductAssetPublicUrl,
  uploadVendorMediaWithOverwrite as uploadAddProductAsset,
};

export function getVendorAddProductSettings(vendorId: number) {
  return appSupabase
    .from("vendor")
    .select("id, offers_tailoring, tailoring_options")
    .eq("id", vendorId)
    .single();
}

export function createVendorProduct(payload: TablesInsert<"products">) {
  return appSupabase
    .from("products")
    .insert(payload)
    .select("id, product_code")
    .single();
}

export function updateVendorProductMedia(
  productId: number,
  payload: TablesUpdate<"products">,
) {
  return appSupabase.from("products").update(payload).eq("id", productId);
}
