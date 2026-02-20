import { supabase } from "./client";

export async function getDressTypes(): Promise<
  { id: number; name: string; iconURL: string }[]
> {
  const { data, error } = await supabase
    .from("dress_type_with_icon_path")
    .select("id, name, icon_path");

  console.log(data);
  console.log("ee", error);

  if (error) {
    console.error("Error fetching dress types:", error);
    return [];
  }

  return data
    .map((item) =>
      item.icon_path === null || item.name === null || item.id === null
        ? null
        : {
            id: item.id,
            name: item.name,
            iconURL: supabase.storage
              .from("dress_type_images")
              .getPublicUrl(item.icon_path).data.publicUrl
          }
    )
    .filter((item) => item !== null);
}
