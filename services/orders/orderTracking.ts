import type { Tables } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

type Order = Tables<"orders">;
type Vendor = Tables<"vendor">;

export type OrderTrackingVendor = Pick<Vendor, "id" | "shop_name" | "name">;
export type TrackedOrderRecord = Pick<
  Order,
  | "id"
  | "created_at"
  | "order_no"
  | "status"
  | "buyer_name"
  | "buyer_mobile"
  | "city"
  | "product_code_snapshot"
  | "title_snapshot"
  | "total_pkr"
  | "currency"
  | "vendor_id"
  | "spec_snapshot"
>;

export async function searchOrderVendors(
  search: string,
): Promise<OrderTrackingVendor[]> {
  const { data, error } = await appSupabase
    .from("vendor")
    .select("id,shop_name,name")
    .or(`shop_name.ilike.%${search}%,name.ilike.%${search}%`)
    .order("id", { ascending: true })
    .limit(30);

  if (error) throw error;
  return data;
}

export async function getTrackedOrders(input: {
  buyerMobile: string;
  buyerName: string;
  vendorId?: number;
}): Promise<TrackedOrderRecord[]> {
  let query = appSupabase
    .from("orders")
    .select(
      `
      id,
      created_at,
      order_no,
      status,
      buyer_name,
      buyer_mobile,
      city,
      product_code_snapshot,
      title_snapshot,
      total_pkr,
      currency,
      vendor_id,
      spec_snapshot
    `,
    )
    .eq("buyer_mobile", input.buyerMobile)
    .order("created_at", { ascending: false })
    .limit(200);

  if (input.buyerName) {
    query = query.ilike("buyer_name", `%${input.buyerName}%`);
  }

  if (input.vendorId) {
    query = query.eq("vendor_id", input.vendorId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getReviewedOrderIds(
  orderIds: number[],
): Promise<number[]> {
  if (!orderIds.length) return [];

  const { data, error } = await appSupabase
    .from("vendor_reviews")
    .select("order_id")
    .in("order_id", orderIds);

  if (error) throw error;
  return data.map((row) => row.order_id);
}
