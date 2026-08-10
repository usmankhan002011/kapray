import { supabase } from "@/utils/supabase/client";
import { timeoutAfter } from "@/utils/supabase/lookupTimeout";

export type WorkTypeItem = {
  id: string;
  name: string;
  code?: string | null;
};

export const FALLBACK_WORK_TYPES: WorkTypeItem[] = [
  { id: "11df5bca-8e07-40c8-8acd-092cc8708264", name: "Designer", code: "designer" },
  { id: "24d6f63d-ac3b-4bdd-910c-bed3231e82c6", name: "Mirror", code: "mirror" },
  { id: "2caecc63-2d30-466d-ba5b-edce67ada03e", name: "Machine", code: "machine" },
  { id: "476433c1-024a-44cb-8d68-0658e68b2e46", name: "Metallic", code: "metallic" },
  { id: "abe58f08-03db-4782-aeba-ce5785b95dfc", name: "Thread", code: "thread" },
  { id: "bd4c40fc-61eb-465e-82ce-b597295ce875", name: "Gotta", code: "gotta" },
  { id: "c6b87f07-7566-4643-b391-64c8e2c4ca49", name: "Stone", code: "stone" },
  { id: "d56038e1-57c4-48b7-96f3-336db6324def", name: "Sequin", code: "sequin" },
];

export function getFallbackWorkTypes() {
  return FALLBACK_WORK_TYPES.map((item) => ({ ...item }));
}

export async function getWorkTypes(): Promise<WorkTypeItem[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from("work_types")
        .select("id,name,code")
        .order("name", { ascending: true }),
      timeoutAfter<any>(),
    ]);

    if (error) throw error;
    const rows = (data ?? []) as WorkTypeItem[];
    return rows.length ? rows : getFallbackWorkTypes();
  } catch {
    return getFallbackWorkTypes();
  }
}
