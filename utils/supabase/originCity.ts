import { supabase } from "@/utils/supabase/client";

export type OriginCityItem = {
  id: string;
  name: string;
  code?: string | null;
};

export async function getOriginCities(): Promise<OriginCityItem[]> {
  const { data, error } = await supabase
    .from("origin_cities")
    .select("id,name,code")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OriginCityItem[];
}
