import { supabase } from "./client";

export async function getProducts(): Promise<{
  created_at: string;
  description: string | null;
  dress_type: number | null;
  id: number;
  price: number;
  title: string | null;
  vendor: number;
  imageURLs: string[];
}[]> {
  const { data, error } = await supabase.from("product_with_photos").select("*");
  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

    return data.map((item) => {

    });
}
