import { supabase } from "@/utils/supabase/client";

export type WearStateItem = {
  id: string;
  name: string;
  code?: string | null;
};

export async function getWearStates(): Promise<WearStateItem[]> {
  const { data, error } = await supabase
    .from("wear_states")
    .select("id,name,code")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WearStateItem[];
}
