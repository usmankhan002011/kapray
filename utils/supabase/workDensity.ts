import { supabase } from "@/utils/supabase/client";

export type WorkDensityItem = {
  id: string;
  name: string;
  code?: string | null;
};

export async function getWorkDensities(): Promise<WorkDensityItem[]> {
  const { data, error } = await supabase
    .from("work_densities")
    .select("id,name,code")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkDensityItem[];
}
