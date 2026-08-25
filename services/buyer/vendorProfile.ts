import type { VendorState } from "@/store/vendorSlice";
import type { Tables } from "@/supabase/supabase";
import { BUYER_VENDOR_MEDIA_BUCKET } from "@/constants/buyer";
import { appSupabase } from "@/services/supabase";
import { isHttpUrl, toStringArray } from "@/utils/buyer";

type VendorRow = Tables<"vendor">;
type ReviewRow = Tables<"vendor_reviews">;
type ReviewSummaryRow = Tables<"vendor_review_summary">;

export type BuyerVendorProfile = Omit<
  Pick<
    VendorRow,
    | "id"
    | "created_at"
    | "name"
    | "shop_name"
    | "email"
    | "mobile"
    | "additional_mobile_numbers"
    | "landline"
    | "additional_landline_numbers"
    | "address"
    | "location"
    | "location_url"
    | "profile_image_path"
    | "banner_path"
    | "certificate_paths"
    | "shop_image_paths"
    | "shop_video_paths"
    | "status"
    | "offers_dyeing"
    | "offers_tailoring"
    | "exports_enabled"
    | "export_regions"
  >,
  "export_regions"
> & { export_regions: string[] };

export type BuyerVendorReview = Pick<
  ReviewRow,
  "id" | "created_at" | "rating" | "comment" | "vendor_reply"
>;

export type BuyerVendorReviewSummary = Pick<
  ReviewSummaryRow,
  "average_rating" | "review_count"
>;

const VENDOR_PROFILE_COLUMNS = `
  id,
  created_at,
  name,
  shop_name,
  email,
  mobile,
  additional_mobile_numbers,
  landline,
  additional_landline_numbers,
  address,
  location,
  location_url,
  profile_image_path,
  banner_path,
  certificate_paths,
  shop_image_paths,
  shop_video_paths,
  status,
  offers_dyeing,
  offers_tailoring,
  exports_enabled,
  export_regions
`;

export function getVendorMediaUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  return appSupabase.storage.from(BUYER_VENDOR_MEDIA_BUCKET).getPublicUrl(path)
    .data.publicUrl;
}

export function getVendorMediaUrls(paths: unknown): string[] {
  return toStringArray(paths)
    .map(getVendorMediaUrl)
    .filter((url): url is string => Boolean(url));
}

export async function getBuyerVendorProfile(
  vendorId: number,
): Promise<BuyerVendorProfile> {
  const { data, error } = await appSupabase
    .from("vendor")
    .select(VENDOR_PROFILE_COLUMNS)
    .eq("id", vendorId)
    .single();

  if (error) throw error;

  return {
    ...data,
    export_regions: toStringArray(data.export_regions),
  };
}

export async function getBuyerVendorReviewSummary(
  vendorId: number,
): Promise<BuyerVendorReviewSummary | null> {
  const { data, error } = await appSupabase
    .from("vendor_review_summary")
    .select("average_rating, review_count")
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBuyerVendorReviews(
  vendorId: number,
): Promise<BuyerVendorReview[]> {
  const { data, error } = await appSupabase
    .from("vendor_reviews")
    .select("id, created_at, rating, comment, vendor_reply")
    .eq("vendor_id", vendorId)
    .eq("is_public", true)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return data;
}

export function toSelectedVendor(
  vendor: BuyerVendorProfile,
): Partial<VendorState> {
  return {
    id: vendor.id,
    shop_name: vendor.shop_name,
    owner_name: vendor.name,
    name: vendor.name,
    mobile: vendor.mobile,
    additional_mobile_numbers: vendor.additional_mobile_numbers,
    landline: vendor.landline,
    additional_landline_numbers: vendor.additional_landline_numbers,
    email: vendor.email,
    address: vendor.address,
    location: vendor.location,
    location_url: vendor.location_url,
    profile_image_path: vendor.profile_image_path,
    banner_path: vendor.banner_path,
    banner_url: getVendorMediaUrl(vendor.banner_path),
    offers_dyeing: vendor.offers_dyeing,
    offers_tailoring: vendor.offers_tailoring,
    exports_enabled: vendor.exports_enabled,
    export_regions: vendor.export_regions,
    government_permission_url: null,
    images: vendor.shop_image_paths,
    videos: vendor.shop_video_paths,
    status: vendor.status,
  };
}
