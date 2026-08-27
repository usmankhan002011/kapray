import type { Tables } from "@/supabase/supabase";
import { getFabricTypeMediaUrl } from "@/services/media/media";
import { appSupabase } from "@/services/supabase";
import { timeoutAfter } from "@/utils/supabase/lookupTimeout";

type DressType = Tables<"dress_types">;
type FabricType = Tables<"fabric_types">;
type SimpleLookupItem = Pick<Tables<"origin_cities">, "id" | "name" | "code">;
type SimpleLookupTable = "origin_cities" | "work_densities" | "work_types";

export type DressTypeItem = Pick<DressType, "id" | "code" | "name">;
export type FabricTypeItem = Pick<FabricType, "id" | "code" | "name"> & {
  imageUrl: string | null;
};
export type OriginCityItem = SimpleLookupItem;
export type WearStateItem = SimpleLookupItem;
export type WorkDensityItem = SimpleLookupItem;
export type WorkTypeItem = SimpleLookupItem;

export const FALLBACK_FABRIC_TYPES: FabricTypeItem[] = [
  {
    id: "5a460acc-dfe3-44b3-bca2-41b41db42498",
    code: "chiffon",
    name: "Chiffon",
    imageUrl: null,
  },
  {
    id: "8b871a82-54ec-4f31-9288-1b54cf0ce621",
    code: "crepe_chiffon",
    name: "Crepe Chiffon",
    imageUrl: null,
  },
  {
    id: "462d1cc0-3a66-4021-a894-586cc39e491f",
    code: "silk_chiffon",
    name: "Silk Chiffon",
    imageUrl: null,
  },
  {
    id: "80195216-b83f-4bb1-8b57-44ff0ffffe5e",
    code: "silk",
    name: "Silk",
    imageUrl: null,
  },
  {
    id: "ee51fb72-36a7-4fd9-b16b-2b6fe1a5eb0f",
    code: "korean_silk",
    name: "Korean Silk",
    imageUrl: null,
  },
  {
    id: "626561b8-8047-4662-8f41-8e4799bd0224",
    code: "satin_silk",
    name: "Satin Silk",
    imageUrl: null,
  },
  {
    id: "1ace6ba0-87b5-40f7-ae41-6575eeff072b",
    code: "cotton_silk",
    name: "Cotton Silk",
    imageUrl: null,
  },
  {
    id: "fa95dde3-5dfc-4096-905d-20445cc21964",
    code: "tissue_silk",
    name: "Tissue Silk",
    imageUrl: null,
  },
  {
    id: "55b6918b-4f5b-457d-abbc-52f528b17e4d",
    code: "silk_velvet",
    name: "Silk Velvet",
    imageUrl: null,
  },
  {
    id: "e903214e-2115-4e5e-b6b5-358fcf1df23e",
    code: "katan_brocade",
    name: "Katan Brocade",
    imageUrl: null,
  },
  {
    id: "ca1378e3-e383-4483-865d-2ee3a89fdc37",
    code: "organza",
    name: "Organza",
    imageUrl: null,
  },
  {
    id: "f0472455-27b0-45cb-9c1e-f03d0b9084af",
    code: "net",
    name: "Net",
    imageUrl: null,
  },
  {
    id: "2fbd0eb8-95b6-4e91-840b-565dd8f0d5fa",
    code: "georgette",
    name: "Georgette",
    imageUrl: null,
  },
  {
    id: "13c9b028-1378-47c0-8348-390135cc02a4",
    code: "tissue",
    name: "Tissue",
    imageUrl: null,
  },
  {
    id: "a5207c15-1e69-4507-bd85-176035009cb8",
    code: "velvet",
    name: "Velvet",
    imageUrl: null,
  },
  {
    id: "5cf94af9-8eb0-4287-a0fa-092a07504739",
    code: "jamawar",
    name: "Jamawar",
    imageUrl: null,
  },
];

export const FALLBACK_ORIGIN_CITIES: OriginCityItem[] = [
  {
    id: "addbe19b-bc66-4483-9465-2e6bedad9fc3",
    name: "Bahawalpur",
    code: "bahawalpur",
  },
  {
    id: "4e64ff55-509e-43bf-b2de-e0a4d7846e56",
    name: "Faisalabad",
    code: "faisalabad",
  },
  {
    id: "da321e90-e69c-496f-89dc-5281d990b50e",
    name: "Hyderabad",
    code: "hyderabad",
  },
  {
    id: "88df4e29-fb21-42d6-bc98-ea5dd241fcbf",
    name: "Karachi",
    code: "karachi",
  },
  {
    id: "01b18b8d-15b8-4820-a822-b511347ab677",
    name: "Lahore",
    code: "lahore",
  },
  {
    id: "50d39525-ca10-498f-8384-eda056f11ed2",
    name: "Multan",
    code: "multan",
  },
  {
    id: "6ac024d9-2e7f-4722-aa28-639da06c88fd",
    name: "Peshawar",
    code: "peshawar",
  },
  {
    id: "bcf68290-410a-4a57-9e4e-6bd88a9336b3",
    name: "Rawalpindi",
    code: "rawalpindi",
  },
];

export const FALLBACK_WORK_DENSITIES: WorkDensityItem[] = [
  { id: "31db3889-0528-45e4-ac49-016c5043d79b", name: "Light", code: "light" },
  {
    id: "524f7a65-ab0c-4d44-98ef-4c4c25a6acbe",
    name: "Medium",
    code: "medium",
  },
  { id: "1821a98f-bcbd-4140-b38d-e7432d738234", name: "Heavy", code: "heavy" },
  {
    id: "b5bcdf6e-a8d6-4bb8-ab8a-16c78e2b5ba5",
    name: "Extra Heavy",
    code: "extra-heavy",
  },
];

export const FALLBACK_WORK_TYPES: WorkTypeItem[] = [
  {
    id: "11df5bca-8e07-40c8-8acd-092cc8708264",
    name: "Designer",
    code: "designer",
  },
  {
    id: "24d6f63d-ac3b-4bdd-910c-bed3231e82c6",
    name: "Mirror",
    code: "mirror",
  },
  {
    id: "2caecc63-2d30-466d-ba5b-edce67ada03e",
    name: "Machine",
    code: "machine",
  },
  {
    id: "476433c1-024a-44cb-8d68-0658e68b2e46",
    name: "Metallic",
    code: "metallic",
  },
  {
    id: "abe58f08-03db-4782-aeba-ce5785b95dfc",
    name: "Thread",
    code: "thread",
  },
  { id: "bd4c40fc-61eb-465e-82ce-b597295ce875", name: "Gotta", code: "gotta" },
  { id: "c6b87f07-7566-4643-b391-64c8e2c4ca49", name: "Stone", code: "stone" },
  {
    id: "d56038e1-57c4-48b7-96f3-336db6324def",
    name: "Sequin",
    code: "sequin",
  },
];

function copyItems<T extends object>(items: T[]): T[] {
  return items.map((item) => ({ ...item }));
}

export function getFallbackFabricTypes(): FabricTypeItem[] {
  return copyItems(FALLBACK_FABRIC_TYPES);
}

export function getFallbackOriginCities(): OriginCityItem[] {
  return copyItems(FALLBACK_ORIGIN_CITIES);
}

export function getFallbackWorkDensities(): WorkDensityItem[] {
  return copyItems(FALLBACK_WORK_DENSITIES);
}

export function getFallbackWorkTypes(): WorkTypeItem[] {
  return copyItems(FALLBACK_WORK_TYPES);
}

async function getLookupWithFallback(
  table: SimpleLookupTable,
  fallback: SimpleLookupItem[],
): Promise<SimpleLookupItem[]> {
  try {
    const { data, error } = await Promise.race([
      appSupabase
        .from(table)
        .select("id,name,code")
        .order("name", { ascending: true }),
      timeoutAfter<never>(),
    ]);

    if (error) throw error;
    return data?.length ? data : copyItems(fallback);
  } catch {
    return copyItems(fallback);
  }
}

export async function getDressTypes(): Promise<DressTypeItem[]> {
  const { data, error } = await appSupabase
    .from("dress_types")
    .select("id, code, name, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching dress types:", error);
    return [];
  }

  return (data ?? [])
    .map((item) =>
      item?.id == null || item?.code == null || item?.name == null
        ? null
        : {
            id: String(item.id),
            code: String(item.code),
            name: String(item.name),
          },
    )
    .filter((item): item is DressTypeItem => item !== null);
}

export async function getFabricTypes(): Promise<FabricTypeItem[]> {
  try {
    const { data, error } = await Promise.race([
      appSupabase
        .from("fabric_types")
        .select("id,code,name,image_path,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      timeoutAfter<never>(),
    ]);

    if (error) throw error;
    if (!data?.length) return getFallbackFabricTypes();

    return data.map(({ id, code, name, image_path }) => ({
      id,
      code,
      name,
      imageUrl: image_path ? getFabricTypeMediaUrl(image_path) : null,
    }));
  } catch {
    return getFallbackFabricTypes();
  }
}

export function getOriginCities(): Promise<OriginCityItem[]> {
  return getLookupWithFallback("origin_cities", FALLBACK_ORIGIN_CITIES);
}

export async function getWearStates(): Promise<WearStateItem[]> {
  const { data, error } = await appSupabase
    .from("wear_states")
    .select("id,name,code")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function getWorkDensities(): Promise<WorkDensityItem[]> {
  return getLookupWithFallback("work_densities", FALLBACK_WORK_DENSITIES);
}

export function getWorkTypes(): Promise<WorkTypeItem[]> {
  return getLookupWithFallback("work_types", FALLBACK_WORK_TYPES);
}
