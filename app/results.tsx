// app/results.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { supabase } from "@/utils/supabase/client";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";

const TABLE_DRESS_TYPE = "dress_type";
const TABLE_FABRIC_TYPES = "fabric_types";
const TABLE_WORK_TYPES = "work_types";
const TABLE_WORK_DENSITIES = "work_densities";
const TABLE_ORIGIN_CITIES = "origin_cities";
const TABLE_WEAR_STATES = "wear_states";
const TABLE_PRICE_BANDS = "price_bands";

const PAGE_SIZE = 30;

type ProductRow = {
  id: number;
  vendor_id?: number | null;
  product_code?: string | null;
  title?: string | null;
  created_at?: string | null;
  spec?: any;
  price?: any;
  media?: any;
};

type PriceBandRow = {
  id: string;
  name: string;
  min_pkr: number | null;
  max_pkr: number | null;
  sort_order: number;
};

type NameRow = { id: any; name: string };

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function normalizeIds(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x) => String(x ?? "").trim())
    .filter((x) => x.length > 0);
}

// empty selection => ANY (pass)
function anyOverlap(selected: string[], productIds: any): boolean {
  if (!selected.length) return true;
  const p = normalizeIds(productIds);
  if (!p.length) return false;
  const set = new Set(p);
  return selected.some((s) => set.has(String(s)));
}

// dressType: Redux has SINGLE dressTypeId, product has spec.dressTypeIds[]
function includesSingleId(single: number | null, productIds: any): boolean {
  if (single === null || single === undefined) return true;
  const p = normalizeIds(productIds);
  if (!p.length) return false;
  const key = String(single);
  return p.includes(key);
}

function firstImagePath(media: any): string | null {
  try {
    const p = media?.images?.[0];
    if (!p) return null;
    const s = String(p).trim();
    return s.length ? s : null;
  } catch {
    return null;
  }
}

function publicUrlForStoragePath(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/**
 * Numeric PKR value for band comparison:
 * - stitched_total => cost_pkr_total
 * - unstitched_per_meter => cost_pkr_per_meter
 * Prefer total if present.
 */
function getComparablePkr(price: any): number | null {
  if (!price || typeof price !== "object") return null;

  const total = price?.cost_pkr_total;
  const perMeter = price?.cost_pkr_per_meter;

  const totalNum = typeof total === "number" ? total : null;
  const perNum = typeof perMeter === "number" ? perMeter : null;

  if (totalNum !== null) return totalNum;
  if (perNum !== null) return perNum;

  return null;
}

function formatPrice(price: any): string {
  const mode = price?.mode;
  const total = price?.cost_pkr_total;
  const perMeter = price?.cost_pkr_per_meter;

  if (mode === "stitched_total" && typeof total === "number") {
    return `PKR ${total.toLocaleString()}`;
  }
  if (mode === "unstitched_per_meter" && typeof perMeter === "number") {
    return `PKR ${perMeter.toLocaleString()} / meter`;
  }

  if (typeof total === "number") return `PKR ${total.toLocaleString()}`;
  if (typeof perMeter === "number") return `PKR ${perMeter.toLocaleString()} / meter`;

  return "Price not set";
}

function withinBand(v: number, band: PriceBandRow): boolean {
  const min = band.min_pkr;
  const max = band.max_pkr;

  if (typeof min === "number" && v < min) return false;
  if (typeof max === "number" && v > max) return false;

  return true;
}

// empty selection => ANY
function matchesAnySelectedBand(
  selectedBandIds: string[],
  bandsById: Map<string, PriceBandRow>,
  valuePkr: number | null
): boolean {
  if (!selectedBandIds.length) return true;
  if (valuePkr === null) return false;

  for (const id of selectedBandIds) {
    const b = bandsById.get(String(id));
    if (!b) continue;
    if (withinBand(valuePkr, b)) return true;
  }
  return false;
}

function buildNameMap(rows: NameRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows ?? []) {
    const id = String((r as any).id ?? "").trim();
    const name = String((r as any).name ?? "").trim();
    if (id && name) m.set(id, name);
  }
  return m;
}

function idsToNames(ids: string[], map: Map<string, string>): string[] {
  if (!ids?.length) return [];
  return ids
    .map((id) => map.get(String(id)) ?? "")
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
}

// ✅ if user selected IDs but names not loaded yet, show Loading… (not Any)
function namesOrLoading(label: string, selectedIds: any[], names: string[]): string {
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;
  if (!hasSelection) return `${label}: Any`;
  if (!names.length) return `${label}: Loading…`;
  return `${label}: ${names.join(", ")}`;
}

export default function ResultsScreen() {
  const router = useRouter();
  const filters = useAppSelector((s: any) => s.filters);

  const dressTypeId: number | null = filters?.dressTypeId ?? null;

  const fabricTypeIds: string[] = filters?.fabricTypeIds ?? [];
  const colorShadeIds: string[] = filters?.colorShadeIds ?? [];
  const workTypeIds: string[] = filters?.workTypeIds ?? [];
  const workDensityIds: string[] = filters?.workDensityIds ?? [];
  const originCityIds: string[] = filters?.originCityIds ?? [];
  const wearStateIds: string[] = filters?.wearStateIds ?? [];
  const priceBandIds: string[] = filters?.priceBandIds ?? [];

  // ✅ vendors (multi-select, empty = Any)
  const vendorIds: string[] = filters?.vendorIds ?? [];

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [priceBands, setPriceBands] = useState<PriceBandRow[]>([]);

  // lookups (names only)
  const [dressTypes, setDressTypes] = useState<NameRow[]>([]);
  const [fabricTypes, setFabricTypes] = useState<NameRow[]>([]);
  const [workTypes, setWorkTypes] = useState<NameRow[]>([]);
  const [workDensities, setWorkDensities] = useState<NameRow[]>([]);
  const [originCities, setOriginCities] = useState<NameRow[]>([]);
  const [wearStates, setWearStates] = useState<NameRow[]>([]);

  // ✅ local favourites (heart turns red). No DB yet.
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // ✅ sort (default: cost)
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"cost" | "date">("cost");

  function toggleFavorite(productId: number) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function fetchPage(from: number, to: number) {
    return supabase
      .from(PRODUCTS_TABLE)
      .select("id, vendor_id, product_code, title, created_at, spec, price, media")
      .order("created_at", { ascending: false })
      .range(from, to);
  }

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        setLoading(true);
        setHasMore(true);

        const [
          bandsRes,
          prodRes,
          dressRes,
          fabricRes,
          workRes,
          densityRes,
          originRes,
          wearRes
        ] = await Promise.all([
          supabase
            .from(TABLE_PRICE_BANDS)
            .select("id, name, min_pkr, max_pkr, sort_order")
            .order("sort_order", { ascending: true }),

          fetchPage(0, PAGE_SIZE - 1),

          supabase.from(TABLE_DRESS_TYPE).select("id, name").order("id", { ascending: true }),
          supabase.from(TABLE_FABRIC_TYPES).select("id, name").order("sort_order", { ascending: true }),
          supabase.from(TABLE_WORK_TYPES).select("id, name").order("name", { ascending: true }),
          supabase.from(TABLE_WORK_DENSITIES).select("id, name").order("name", { ascending: true }),
          supabase.from(TABLE_ORIGIN_CITIES).select("id, name").order("name", { ascending: true }),
          supabase.from(TABLE_WEAR_STATES).select("id, name").order("name", { ascending: true })
        ]);

        if (!alive) return;

        // price bands
        if ((bandsRes as any).error) {
          console.log("Price bands load error:", (bandsRes as any).error?.message);
          setPriceBands([]);
        } else {
          setPriceBands(((bandsRes as any).data as any) ?? []);
        }

        // products (first page only)
        if ((prodRes as any).error) {
          Alert.alert("Load error", (prodRes as any).error.message);
          setProducts([]);
          setHasMore(false);
        } else {
          const rows = ((((prodRes as any).data as any) ?? []) as ProductRow[]);
          setProducts(rows);
          setHasMore(rows.length === PAGE_SIZE);
        }

        // lookups
        setDressTypes((((dressRes as any).data as any) ?? []) as any);
        setFabricTypes((((fabricRes as any).data as any) ?? []) as any);
        setWorkTypes((((workRes as any).data as any) ?? []) as any);
        setWorkDensities((((densityRes as any).data as any) ?? []) as any);
        setOriginCities((((originRes as any).data as any) ?? []) as any);
        setWearStates((((wearRes as any).data as any) ?? []) as any);
      } catch (e: any) {
        if (!alive) return;
        Alert.alert("Load error", e?.message ?? "Unknown error");
        setProducts([]);
        setPriceBands([]);
        setDressTypes([]);
        setFabricTypes([]);
        setWorkTypes([]);
        setWorkDensities([]);
        setOriginCities([]);
        setWearStates([]);
        setHasMore(false);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    loadAll();

    return () => {
      alive = false;
    };
  }, []);

  async function fetchMore() {
    if (loading || loadingMore) return;
    if (!hasMore) return;

    try {
      setLoadingMore(true);

      const from = products.length;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await fetchPage(from, to);
      if (error) return;

      const rows = ((data as any) ?? []) as ProductRow[];

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const add = rows.filter((r) => !seen.has(r.id));
        return [...prev, ...add];
      });

      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  const bandsById = useMemo(() => {
    const m = new Map<string, PriceBandRow>();
    for (const b of priceBands) m.set(String(b.id), b);
    return m;
  }, [priceBands]);

  // lookup maps
  const dressMap = useMemo(() => buildNameMap(dressTypes), [dressTypes]);
  const fabricMap = useMemo(() => buildNameMap(fabricTypes), [fabricTypes]);
  const workMap = useMemo(() => buildNameMap(workTypes), [workTypes]);
  const densityMap = useMemo(() => buildNameMap(workDensities), [workDensities]);
  const originMap = useMemo(() => buildNameMap(originCities), [originCities]);
  const wearMap = useMemo(() => buildNameMap(wearStates), [wearStates]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      const spec = p?.spec ?? {};
      const price = p?.price ?? {};

      // ✅ vendor filter (multi-select). Empty => ANY
      if (vendorIds.length) {
        const vid =
          p?.vendor_id === null || p?.vendor_id === undefined ? "" : String(p.vendor_id);
        if (!vid || !vendorIds.includes(vid)) return false;
      }

      if (!includesSingleId(dressTypeId, spec?.dressTypeIds)) return false;
      if (!anyOverlap(fabricTypeIds, spec?.fabricTypeIds)) return false;
      if (!anyOverlap(colorShadeIds, spec?.colorShadeIds)) return false;
      if (!anyOverlap(workTypeIds, spec?.workTypeIds)) return false;
      if (!anyOverlap(workDensityIds, spec?.workDensityIds)) return false;
      if (!anyOverlap(originCityIds, spec?.originCityIds)) return false;
      if (!anyOverlap(wearStateIds, spec?.wearStateIds)) return false;

      const pkr = getComparablePkr(price);
      if (!matchesAnySelectedBand(priceBandIds, bandsById, pkr)) return false;

      return true;
    });
  }, [
    products,
    vendorIds,
    dressTypeId,
    fabricTypeIds,
    colorShadeIds,
    workTypeIds,
    workDensityIds,
    originCityIds,
    wearStateIds,
    priceBandIds,
    bandsById
  ]);

  // ✅ apply sort (cost or date)
  const sorted = useMemo(() => {
    const arr = [...(filtered ?? [])];

    if (sortMode === "cost") {
      arr.sort((a, b) => {
        const ap = getComparablePkr(a?.price);
        const bp = getComparablePkr(b?.price);

        // nulls last
        if (ap === null && bp === null) return 0;
        if (ap === null) return 1;
        if (bp === null) return -1;

        // ascending (low -> high)
        if (ap < bp) return -1;
        if (ap > bp) return 1;
        return 0;
      });
      return arr;
    }

    // date: newest first
    arr.sort((a, b) => {
      const at = a?.created_at ? Date.parse(a.created_at) : NaN;
      const bt = b?.created_at ? Date.parse(b.created_at) : NaN;

      const aOk = Number.isFinite(at);
      const bOk = Number.isFinite(bt);

      if (!aOk && !bOk) return 0;
      if (!aOk) return 1; // unknown dates last
      if (!bOk) return -1;

      // newest first
      if (at > bt) return -1;
      if (at < bt) return 1;
      return 0;
    });

    return arr;
  }, [filtered, sortMode]);

  // ✅ summary = NAMES ONLY (and "Loading…" if selection exists but names not loaded yet)
  const filtersSummary = useMemo(() => {
    const dressSelected = dressTypeId !== null && dressTypeId !== undefined;

    const dressName = dressSelected ? (dressMap.get(String(dressTypeId)) ?? "").trim() : "";

    const dressPart = !dressSelected
      ? "Dress: Any"
      : dressName
      ? `Dress: ${dressName}`
      : "Dress: Loading…";

    const fabricNames = idsToNames(fabricTypeIds, fabricMap);
    const workNames = idsToNames(workTypeIds, workMap);
    const densityNames = idsToNames(workDensityIds, densityMap);
    const originNames = idsToNames(originCityIds, originMap);
    const wearNames = idsToNames(wearStateIds, wearMap);

    // colors are already names in Redux/spec
    const colorNames = (colorShadeIds ?? [])
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);

    const priceNames =
      !priceBandIds.length
        ? []
        : priceBandIds
            .map((id) => bandsById.get(String(id))?.name ?? "")
            .map((x) => String(x).trim())
            .filter((x) => x.length > 0);

    return [
      dressPart,
      namesOrLoading("Fabric", fabricTypeIds, fabricNames),
      namesOrLoading("Color", colorShadeIds, colorNames),
      namesOrLoading("Work", workTypeIds, workNames),
      namesOrLoading("Density", workDensityIds, densityNames),
      namesOrLoading("Origin", originCityIds, originNames),
      namesOrLoading("Wear", wearStateIds, wearNames),
      namesOrLoading("Price", priceBandIds, priceNames)
    ].join("  |  ");
  }, [
    dressTypeId,
    dressMap,
    fabricTypeIds,
    fabricMap,
    colorShadeIds,
    workTypeIds,
    workMap,
    workDensityIds,
    densityMap,
    originCityIds,
    originMap,
    wearStateIds,
    wearMap,
    priceBandIds,
    bandsById
  ]);

  function openProduct(p: ProductRow) {
    router.push(`/view-product?id=${encodeURIComponent(String(p.id))}`);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading products…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.link} onPress={() => router.back()}>
          Back
        </Text>

        <Text style={styles.title} numberOfLines={1}>
          Products ({sorted.length})
        </Text>

        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          {/* ✅ sort button (emoji) */}
          <Pressable
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [styles.sortBtn, pressed ? { opacity: 0.7 } : null]}
          >
            <Text style={styles.sortBtnText}>↕️ Sort</Text>
          </Pressable>

          <Text style={styles.link} onPress={() => router.push("/results-filters")}>
            🔍Filters
          </Text>

          <Text style={styles.link} onPress={() => router.replace("/wizard")}>
            Restart
          </Text>
        </View>
      </View>

      {/* ✅ Sort Modal (dark background) */}
      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSortOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Sort</Text>

            <Pressable
              style={({ pressed }) => [styles.modalItem, pressed ? { opacity: 0.7 } : null]}
              onPress={() => {
                setSortMode("cost");
                setSortOpen(false);
              }}
            >
              <View style={styles.modalLeft}>
                <Text style={styles.modalEmoji}>💰</Text>
                <View>
                  <Text style={styles.modalItemTitle}>Cost</Text>
                  <Text style={styles.modalItemSub}>Low to high</Text>
                </View>
              </View>
              <Text style={styles.modalRight}>{sortMode === "cost" ? "✅" : ""}</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.modalItem, pressed ? { opacity: 0.7 } : null]}
              onPress={() => {
                setSortMode("date"); // ✅ new
                setSortOpen(false);
              }}
            >
              <View style={styles.modalLeft}>
                <Text style={styles.modalEmoji}>🗓️</Text>
                <View>
                  <Text style={styles.modalItemTitle}>Date</Text>
                  <Text style={styles.modalItemSub}>Newest first</Text>
                </View>
              </View>
              <Text style={styles.modalRight}>{sortMode === "date" ? "✅" : ""}</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [styles.modalItem, pressed ? { opacity: 0.7 } : null]}
              onPress={() => {
                setSortOpen(false);
                Alert.alert("Coming soon", "⭐ Sort by vendor rating is a feature coming soon.");
              }}
            >
              <View style={styles.modalLeft}>
                <Text style={styles.modalEmoji}>⭐</Text>
                <View>
                  <Text style={styles.modalItemTitle}>Vendor Rating</Text>
                  <Text style={styles.modalItemSub}>Feature coming soon</Text>
                </View>
              </View>
              <Text style={styles.soonPill}>Soon</Text>
            </Pressable>

            <Pressable style={styles.modalCloseBtn} onPress={() => setSortOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* quick windup line — names only */}
      <View style={styles.summaryWrap}>
        <Text style={styles.summaryText} numberOfLines={3}>
          {filtersSummary}
        </Text>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No matching products (loaded so far)</Text>
          <Text style={styles.muted}>
            Tip: press “Load more” to search more products, or broaden filters.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 16 }}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!loadingMore && hasMore) fetchMore();
          }}
          renderItem={({ item }) => {
            const imgPath = firstImagePath(item.media);
            const url = publicUrlForStoragePath(imgPath);
            const isFav = favoriteIds.has(item.id);

            return (
              <Pressable style={styles.card} onPress={() => openProduct(item)}>
                {url ? (
                  <Image source={{ uri: url }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.muted}>No image</Text>
                  </View>
                )}

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {safeText(item.title)}
                </Text>

                <Text style={styles.cardPrice} numberOfLines={1}>
                  {formatPrice(item.price)}
                </Text>

                <Text style={styles.cardSub} numberOfLines={1}>
                  {safeText(item.product_code)}
                </Text>

                {/* ✅ Favourite only (Purchase removed) */}
                <View style={styles.actionRow}>
                  <Pressable onPress={() => toggleFavorite(item.id)} style={styles.actionBtn}>
                    <Text style={[styles.actionText, isFav ? styles.heartOn : null]}>
                      {isFav ? "❤️" : "🤍"} Favourite
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
              {loadingMore ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />
                  <Text style={styles.muted}>Loading more…</Text>
                </View>
              ) : hasMore ? (
                <Pressable style={styles.loadMoreBtn} onPress={fetchMore}>
                  <Text style={styles.loadMoreText}>Load more</Text>
                </Pressable>
              ) : (
                <Text style={styles.endText}>product list complete</Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  link: { fontSize: 16, color: "#111", fontWeight: "700" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    paddingHorizontal: 10
  },

  summaryWrap: {
    paddingHorizontal: 16,
    paddingBottom: 6
  },
  summaryText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16
  },

  // ✅ sort button
  sortBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)"
  },
  sortBtnText: { fontSize: 13, fontWeight: "900", color: "#111" },

  // ✅ modal (dark background)
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 20,
    justifyContent: "center"
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)"
  },
  modalTitle: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#111"
  },
  modalItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalEmoji: { fontSize: 18 },
  modalItemTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  modalItemSub: { fontSize: 12, fontWeight: "700", color: "#60708A", marginTop: 2 },
  modalRight: { fontSize: 14, fontWeight: "900", color: "#0B2F6B" },
  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
  soonPill: {
    fontSize: 12,
    fontWeight: "900",
    color: "#60708A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)"
  },
  modalCloseBtn: {
    margin: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderWidth: 1,
    borderColor: "#D9E2F2"
  },
  modalCloseText: { color: "#0B2F6B", fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  muted: { fontSize: 14, color: "#666" },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 10
  },
  image: { width: "100%", height: 140, backgroundColor: "#f3f4f6" },
  imagePlaceholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6"
  },
  cardTitle: {
    paddingHorizontal: 10,
    paddingTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#111"
  },
  cardPrice: {
    paddingHorizontal: 10,
    paddingTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#111"
  },
  cardSub: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
    fontSize: 12,
    color: "#666"
  },

  actionRow: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  actionBtn: { flex: 1 },
  actionText: { fontSize: 13, fontWeight: "800", color: "#111" },
  heartOn: { color: "#D11A2A" },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  loadMoreBtn: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#EAF2FF",
    borderWidth: 1,
    borderColor: "#D9E2F2",
    alignItems: "center"
  },
  loadMoreText: { color: "#0B2F6B", fontWeight: "900" },
  endText: { marginTop: 10, textAlign: "center", color: "#60708A", fontWeight: "800" }
});
