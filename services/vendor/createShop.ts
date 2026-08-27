import type { TablesInsert, TablesUpdate } from "@/supabase/supabase";
import { getCurrentUser } from "@/services/auth/auth";
import { uploadVendorMediaWithOverwrite } from "@/services/media/media";
import { appSupabase } from "@/services/supabase";

export { getCurrentUser as getCurrentVendorUser };
export { uploadVendorMediaWithOverwrite as uploadCreateShopAsset };

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
