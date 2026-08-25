import type { TablesUpdate } from "@/supabase/supabase";
import {
  getBuyerVendorProfile,
  getBuyerVendorReviewSummary,
  getVendorMediaUrl,
  getVendorMediaUrls,
  VENDOR_PROFILE_COLUMNS,
} from "@/services/buyer/vendorProfile";
import { appSupabase } from "@/services/supabase";

const VENDOR_MEDIA_BUCKET = "vendor_images";

export {
  getVendorMediaUrl,
  getVendorMediaUrls,
  getBuyerVendorProfile as getVendorProfile,
  getBuyerVendorReviewSummary as getVendorProfileReviewSummary,
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

export function uploadVendorProfileAsset(args: {
  path: string;
  fileBody: ArrayBuffer;
  contentType: string;
}) {
  return appSupabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .upload(args.path, args.fileBody, {
      contentType: args.contentType,
      upsert: false,
    });
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
