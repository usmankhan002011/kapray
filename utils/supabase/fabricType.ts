import { supabase } from "./client";
import { timeoutAfter } from "@/utils/supabase/lookupTimeout";

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

export const FALLBACK_FABRIC_TYPES: FabricTypeItem[] = [
  { id: "5a460acc-dfe3-44b3-bca2-41b41db42498", code: "chiffon", name: "Chiffon", imageUrl: null },
  { id: "8b871a82-54ec-4f31-9288-1b54cf0ce621", code: "crepe_chiffon", name: "Crepe Chiffon", imageUrl: null },
  { id: "462d1cc0-3a66-4021-a894-586cc39e491f", code: "silk_chiffon", name: "Silk Chiffon", imageUrl: null },
  { id: "80195216-b83f-4bb1-8b57-44ff0ffffe5e", code: "silk", name: "Silk", imageUrl: null },
  { id: "ee51fb72-36a7-4fd9-b16b-2b6fe1a5eb0f", code: "korean_silk", name: "Korean Silk", imageUrl: null },
  { id: "626561b8-8047-4662-8f41-8e4799bd0224", code: "satin_silk", name: "Satin Silk", imageUrl: null },
  { id: "1ace6ba0-87b5-40f7-ae41-6575eeff072b", code: "cotton_silk", name: "Cotton Silk", imageUrl: null },
  { id: "fa95dde3-5dfc-4096-905d-20445cc21964", code: "tissue_silk", name: "Tissue Silk", imageUrl: null },
  { id: "55b6918b-4f5b-457d-abbc-52f528b17e4d", code: "silk_velvet", name: "Silk Velvet", imageUrl: null },
  { id: "e903214e-2115-4e5e-b6b5-358fcf1df23e", code: "katan_brocade", name: "Katan Brocade", imageUrl: null },
  { id: "ca1378e3-e383-4483-865d-2ee3a89fdc37", code: "organza", name: "Organza", imageUrl: null },
  { id: "f0472455-27b0-45cb-9c1e-f03d0b9084af", code: "net", name: "Net", imageUrl: null },
  { id: "2fbd0eb8-95b6-4e91-840b-565dd8f0d5fa", code: "georgette", name: "Georgette", imageUrl: null },
  { id: "13c9b028-1378-47c0-8348-390135cc02a4", code: "tissue", name: "Tissue", imageUrl: null },
  { id: "a5207c15-1e69-4507-bd85-176035009cb8", code: "velvet", name: "Velvet", imageUrl: null },
  { id: "5cf94af9-8eb0-4287-a0fa-092a07504739", code: "jamawar", name: "Jamawar", imageUrl: null },
];

export function getFallbackFabricTypes() {
  return FALLBACK_FABRIC_TYPES.map((item) => ({ ...item }));
}

export async function getFabricTypes(): Promise<FabricTypeItem[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from("fabric_types")
        .select("id,code,name,image_path,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      timeoutAfter<any>(),
    ]);

    if (error) throw error;

    const rows = (data ?? []) as FabricTypeRow[];
    if (!rows.length) return getFallbackFabricTypes();

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
  } catch {
    return getFallbackFabricTypes();
  }
}
