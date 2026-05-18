import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVOURITES_STORAGE_KEY = "kapray:favourite_product_ids";

export function parseFavouriteProductIds(
  raw: string | null,
): Set<number> {
  if (!raw) return new Set<number>();

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set<number>();
    }

    return new Set(
      parsed
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0)
        .map((x) => Math.trunc(x)),
    );
  } catch {
    return new Set<number>();
  }
}

export async function loadFavouriteProductIds(): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(
    FAVOURITES_STORAGE_KEY,
  );

  return parseFavouriteProductIds(raw);
}

export async function saveFavouriteProductIds(
  ids: Set<number>,
) {
  const clean = Array.from(ids)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0)
    .map((x) => Math.trunc(x));

  await AsyncStorage.setItem(
    FAVOURITES_STORAGE_KEY,
    JSON.stringify(clean),
  );
}
