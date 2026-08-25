import type { TablesInsert, TablesUpdate } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

const PRODUCT_MEDIA_BUCKET = "vendor_images";

export function getVendorAddProductSettings(vendorId: number) {
  return appSupabase
    .from("vendor")
    .select("id, offers_tailoring, tailoring_options")
    .eq("id", vendorId)
    .single();
}

export function uploadAddProductAsset(args: {
  path: string;
  fileBody: ArrayBuffer;
  contentType: string;
}) {
  return appSupabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(args.path, args.fileBody, {
      contentType: args.contentType,
      upsert: true,
    });
}

export function getAddProductAssetPublicUrl(path: string): string | null {
  return (
    appSupabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(path).data
      .publicUrl ?? null
  );
}

export function getAddProductAssetPathFromPublicUrl(url: string): string {
  const marker = `/storage/v1/object/public/${PRODUCT_MEDIA_BUCKET}/`;
  const clean = url.trim();
  const index = clean.indexOf(marker);
  return index >= 0
    ? decodeURIComponent(clean.slice(index + marker.length))
    : "";
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
