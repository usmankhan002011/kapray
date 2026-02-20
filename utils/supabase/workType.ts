import { supabase } from "@/utils/supabase/client";

export type WorkTypeItem = {
  id: string;
  name: string;
  code?: string | null;
};

export async function getWorkTypes(): Promise<WorkTypeItem[]> {
  const { data, error } = await supabase
    .from("work_types")
    .select("id,name,code")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkTypeItem[];
}
