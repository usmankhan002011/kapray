import type { Tables } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

export type ShopVendor = Pick<
  Tables<"vendor">,
  "id" | "name" | "shop_name" | "location"
>;

export async function getShopVendors(): Promise<ShopVendor[]> {
  const { data, error } = await appSupabase
    .from("vendor")
    .select("id, name, shop_name, location")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}
