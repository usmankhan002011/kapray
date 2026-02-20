import { supabase } from "@/utils/supabase/client";

export type PriceBandItem = {
  id: string;
  name: string;
  min_pkr: number | null;
  max_pkr: number | null;
  sort_order: number;
};

export async function getPriceBands(): Promise<PriceBandItem[]> {
  const { data, error } = await supabase
    .from("price_bands")
    .select("id,name,min_pkr,max_pkr,sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PriceBandItem[];
}
