import { supabase } from "./client";

export type FabricTypeRow = {
  id: string;
  code: string;
  name: string;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
};

export type FabricTypeItem = {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
};

export async function getFabricTypes(): Promise<FabricTypeItem[]> {
  const { data, error } = await supabase
    .from("fabric_types")
    .select("id,code,name,image_path,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as FabricTypeRow[];

  return rows.map((r) => {
    let imageUrl: string | null = null;

    if (r.image_path) {
      const { data: pub } = supabase.storage
        .from("fabric-types")
        .getPublicUrl(r.image_path);

      imageUrl = pub?.publicUrl ?? null;
    }

    return {
      id: String(r.id),
      code: r.code,
      name: r.name,
      imageUrl
    };
  });
}
