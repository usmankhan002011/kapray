import { supabase } from "@/utils/supabase/client";
import { timeoutAfter } from "@/utils/supabase/lookupTimeout";

export type WorkDensityItem = {
  id: string;
  name: string;
  code?: string | null;
};

export const FALLBACK_WORK_DENSITIES: WorkDensityItem[] = [
  { id: "31db3889-0528-45e4-ac49-016c5043d79b", name: "Light", code: "light" },
  { id: "524f7a65-ab0c-4d44-98ef-4c4c25a6acbe", name: "Medium", code: "medium" },
  { id: "1821a98f-bcbd-4140-b38d-e7432d738234", name: "Heavy", code: "heavy" },
  { id: "b5bcdf6e-a8d6-4bb8-ab8a-16c78e2b5ba5", name: "Extra Heavy", code: "extra-heavy" },
];

export function getFallbackWorkDensities() {
  return FALLBACK_WORK_DENSITIES.map((item) => ({ ...item }));
}

export async function getWorkDensities(): Promise<WorkDensityItem[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from("work_densities")
        .select("id,name,code")
        .order("name", { ascending: true }),
      timeoutAfter<any>(),
    ]);

    if (error) throw error;
    const rows = (data ?? []) as WorkDensityItem[];
    return rows.length ? rows : getFallbackWorkDensities();
  } catch {
    return getFallbackWorkDensities();
  }
}
