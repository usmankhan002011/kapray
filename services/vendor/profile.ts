import type { TablesUpdate } from "@/supabase/supabase";
import {
  getBuyerVendorProfile,
  getBuyerVendorReviewSummary,
  VENDOR_PROFILE_COLUMNS,
} from "@/services/buyer/vendorProfile";
import {
  getVendorMediaUrl,
  getVendorMediaUrls,
  uploadVendorMedia,
} from "@/services/media/media";
import { appSupabase } from "@/services/supabase";

export {
  getVendorMediaUrl,
  getVendorMediaUrls,
  getBuyerVendorProfile as getVendorProfile,
  getBuyerVendorReviewSummary as getVendorProfileReviewSummary,
  uploadVendorMedia as uploadVendorProfileAsset,
};

export function getVendorReviewSummary(vendorId: number) {
  return appSupabase
    .from("vendor_review_summary")
    .select("*")
    .eq("vendor_id", vendorId)
    .maybeSingle();
}

export function getVendorReviews(vendorId: number) {
  return appSupabase
    .from("vendor_reviews")
    .select("id, created_at, rating, comment, vendor_reply")
    .eq("vendor_id", vendorId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
}

export function updateVendorProfile(
  vendorId: number,
  payload: TablesUpdate<"vendor">,
) {
  return appSupabase
    .from("vendor")
    .update(payload)
    .eq("id", vendorId)
    .select(VENDOR_PROFILE_COLUMNS)
    .single();
}
