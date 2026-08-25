import type { TablesInsert, TablesUpdate } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

const VENDOR_MEDIA_BUCKET = "vendor_images";

export function getCurrentVendorUser() {
  return appSupabase.auth.getUser();
}

export function getVendorByAuthUser(authUserId: string) {
  return appSupabase
    .from("vendor")
    .select("id, created_at, auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
}

export function createShopVendor(payload: TablesInsert<"vendor">) {
  return appSupabase
    .from("vendor")
    .insert(payload)
    .select("id, created_at, auth_user_id")
    .single();
}

export function updateShopVendor(
  vendorId: number,
  payload: TablesUpdate<"vendor">,
) {
  return appSupabase.from("vendor").update(payload).eq("id", vendorId);
}

export function uploadCreateShopAsset(args: {
  path: string;
  fileBody: ArrayBuffer;
  contentType: string;
}) {
  return appSupabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .upload(args.path, args.fileBody, {
      contentType: args.contentType,
      upsert: true,
    });
}
