import { supabase } from "@/utils/supabase/client";
import { timeoutAfter } from "@/utils/supabase/lookupTimeout";

export type OriginCityItem = {
  id: string;
  name: string;
  code?: string | null;
};

export const FALLBACK_ORIGIN_CITIES: OriginCityItem[] = [
  { id: "addbe19b-bc66-4483-9465-2e6bedad9fc3", name: "Bahawalpur", code: "bahawalpur" },
  { id: "4e64ff55-509e-43bf-b2de-e0a4d7846e56", name: "Faisalabad", code: "faisalabad" },
  { id: "da321e90-e69c-496f-89dc-5281d990b50e", name: "Hyderabad", code: "hyderabad" },
  { id: "88df4e29-fb21-42d6-bc98-ea5dd241fcbf", name: "Karachi", code: "karachi" },
  { id: "01b18b8d-15b8-4820-a822-b511347ab677", name: "Lahore", code: "lahore" },
  { id: "50d39525-ca10-498f-8384-eda056f11ed2", name: "Multan", code: "multan" },
  { id: "6ac024d9-2e7f-4722-aa28-639da06c88fd", name: "Peshawar", code: "peshawar" },
  { id: "bcf68290-410a-4a57-9e4e-6bd88a9336b3", name: "Rawalpindi", code: "rawalpindi" },
];

export function getFallbackOriginCities() {
  return FALLBACK_ORIGIN_CITIES.map((item) => ({ ...item }));
}

export async function getOriginCities(): Promise<OriginCityItem[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from("origin_cities")
        .select("id,name,code")
        .order("name", { ascending: true }),
      timeoutAfter<any>(),
    ]);

    if (error) throw error;
    const rows = (data ?? []) as OriginCityItem[];
    return rows.length ? rows : getFallbackOriginCities();
  } catch {
    return getFallbackOriginCities();
  }
}
