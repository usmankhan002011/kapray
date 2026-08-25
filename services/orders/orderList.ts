import type { Tables } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

type Order = Tables<"orders">;

export type VendorOrderListRecord = Pick<
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
  | "spec_snapshot"
  | "subtotal_pkr"
  | "delivery_pkr"
  | "total_pkr"
  | "currency"
>;

const ACTIVE_ORDER_STATUSES = [
  "placed",
  "seen",
  "in_progress",
  "packed",
  "dispatched",
];

export async function getVendorOrders(
  vendorId: number,
  tab: "active" | "completed",
): Promise<VendorOrderListRecord[]> {
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
      spec_snapshot,
      subtotal_pkr,
      delivery_pkr,
      total_pkr,
      currency
    `,
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(500);

  query =
    tab === "active"
      ? query.in("status", ACTIVE_ORDER_STATUSES)
      : query.eq("status", "delivered");

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
