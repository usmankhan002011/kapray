import type { PostgrestError } from "@supabase/supabase-js";
import type { Tables, TablesInsert } from "@/supabase/supabase";
import { getCurrentUser } from "@/services/auth/auth";
import { appSupabase } from "@/services/supabase";

export type SubmitVendorReviewInput = {
  orderId: number;
  vendorId: number;
  rating: number;
  comment: string;
};

export type SubmitVendorReviewStatus =
  | "submitted"
  | "requires_sign_in"
  | "order_not_found"
  | "vendor_mismatch"
  | "order_not_delivered"
  | "not_order_owner"
  | "already_reviewed";

type ReviewOrder = Pick<
  Tables<"orders">,
  "id" | "vendor_id" | "buyer_auth_user_id" | "status"
>;

function isDuplicate(error: PostgrestError): boolean {
  const message = error.message.toLowerCase();
  return (
    error.code === "23505" ||
    message.includes("duplicate") ||
    message.includes("unique")
  );
}

export async function submitVendorReview(
  input: SubmitVendorReviewInput,
): Promise<SubmitVendorReviewStatus> {
  const { data: auth, error: authError } = await getCurrentUser();
  if (authError) throw authError;
  if (!auth.user) return "requires_sign_in";

  const { data, error: orderError } = await appSupabase
    .from("orders")
    .select("id, vendor_id, buyer_auth_user_id, status")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!data) return "order_not_found";

  const order: ReviewOrder = data;
  if (order.vendor_id !== input.vendorId) return "vendor_mismatch";
  if (order.status.trim().toLowerCase() !== "delivered") {
    return "order_not_delivered";
  }
  if (order.buyer_auth_user_id && order.buyer_auth_user_id !== auth.user.id) {
    return "not_order_owner";
  }

  const review: TablesInsert<"vendor_reviews"> = {
    vendor_id: input.vendorId,
    buyer_user_id: auth.user.id,
    order_id: input.orderId,
    rating: input.rating,
    comment: input.comment.trim() || null,
    is_verified_purchase: true,
    is_public: true,
    is_hidden: false,
  };

  const { error } = await appSupabase.from("vendor_reviews").insert(review);
  if (!error) return "submitted";
  if (isDuplicate(error)) return "already_reviewed";
  throw error;
}
