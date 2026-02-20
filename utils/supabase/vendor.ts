import { supabase } from "@/utils/supabase/client";

export type VendorInsert = {
  name: string;
  email: string;
  mobile: string;
  landline?: string | null;

  shop_name: string;
  address: string;
  location_url?: string | null;

  location?: string | null;
  status?: string | null;
};

export async function createVendor(payload: VendorInsert) {
  return await supabase.from("vendor").insert(payload).select("id").single();
}

export async function updateVendorMedia(
  vendorId: string,
  media: {
    profile_image_path?: string | null;
    banner_path?: string | null;
    certificate_paths?: string[] | null;
    shop_image_paths?: string[] | null;
    shop_video_paths?: string[] | null;
    status?: string | null;
  }
) {
  return await supabase.from("vendor").update(media).eq("id", vendorId);
}
