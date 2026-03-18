import { supabase } from "./client";

export type DressTypeRow = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type DressTypeItem = {
  id: string;
  code: string;
  name: string;
};

export async function getDressTypes(): Promise<DressTypeItem[]> {
  const { data, error } = await (supabase as any)
    .from("dress_types")
    .select("id, code, name, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  console.log(data);
  console.log("ee", error);

  if (error) {
    console.error("Error fetching dress types:", error);
    return [];
  }

  const rows = (data ?? []) as DressTypeRow[];

  return rows
    .map((item) =>
      item?.id == null || item?.code == null || item?.name == null
        ? null
        : {
            id: String(item.id),
            code: String(item.code),
            name: String(item.name)
          }
    )
    .filter((item): item is DressTypeItem => item !== null);
}