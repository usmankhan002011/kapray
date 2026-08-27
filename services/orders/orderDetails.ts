import type { Tables, TablesUpdate } from "@/supabase/supabase";
import { getCurrentUser } from "@/services/auth/auth";
import { getVendorMediaPublicUrl } from "@/services/media/media";
import { appSupabase } from "@/services/supabase";

export { getVendorMediaPublicUrl as getOrderMediaPublicUrl };

type Order = Tables<"orders">;
type Vendor = Tables<"vendor">;

export type OrderDetailsRecord = Pick<
  Order,
  | "id"
  | "vendor_id"
  | "created_at"
  | "order_no"
  | "status"
  | "buyer_name"
  | "buyer_mobile"
  | "buyer_email"
  | "delivery_address"
  | "city"
  | "notes"
  | "product_code_snapshot"
  | "title_snapshot"
  | "spec_snapshot"
  | "media_snapshot"
  | "price_snapshot"
  | "currency"
  | "subtotal_pkr"
  | "delivery_pkr"
  | "discount_pkr"
  | "total_pkr"
  | "size_mode"
  | "selected_size"
  | "exact_measurements"
  | "courier_name"
  | "tracking_number"
> & {
  vendor: Pick<Vendor, "id" | "name" | "shop_name"> | null;
};

export type OrderStatusUpdate = Pick<
  TablesUpdate<"orders">,
  "status" | "courier_name" | "tracking_number"
>;

export async function getOrderDetails(
  orderId: number,
): Promise<OrderDetailsRecord> {
  const { data, error } = await appSupabase
    .from("orders")
    .select(
      `
      id,
      vendor_id,
      vendor:vendor_id (
        id,
        name,
        shop_name
      ),
      created_at,
      order_no,
      status,
      buyer_name,
      buyer_mobile,
      buyer_email,
      delivery_address,
      city,
      notes,
      product_code_snapshot,
      title_snapshot,
      spec_snapshot,
      media_snapshot,
      price_snapshot,
      currency,
      subtotal_pkr,
      delivery_pkr,
      discount_pkr,
      total_pkr,
      size_mode,
      selected_size,
      exact_measurements,
      courier_name,
      tracking_number
    `,
    )
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function hasCurrentBuyerReviewedOrder(
  orderId: number,
): Promise<boolean> {
  const {
    data: { user },
  } = await getCurrentUser();

  if (!user) return false;

  const { data, error } = await appSupabase
    .from("vendor_reviews")
    .select("id")
    .eq("order_id", orderId)
    .eq("buyer_user_id", user.id)
    .limit(1);

  if (error) throw error;
  return data.length > 0;
}

export async function updateOrderStatus(
  orderId: number,
  update: OrderStatusUpdate,
): Promise<void> {
  const { error } = await appSupabase
    .from("orders")
    .update(update)
    .eq("id", orderId);

  if (error) throw error;
}
