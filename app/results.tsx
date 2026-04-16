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
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { supabase } from "@/utils/supabase/client";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";

const TABLE_DRESS_TYPE = "dress_types";
const TABLE_FABRIC_TYPES = "fabric_types";
const TABLE_WORK_TYPES = "work_types";
const TABLE_WORK_DENSITIES = "work_densities";
const TABLE_ORIGIN_CITIES = "origin_cities";
const TABLE_WEAR_STATES = "wear_states";

const PAGE_SIZE = 30;

type ProductRow = {
  id: number;
  vendor_id?: number | null;
  product_code?: string | null;
  title?: string | null;
  created_at?: string | null;
  inventory_qty?: number | null;
  made_on_order?: boolean;
  product_category?:
    | "unstitched_plain"
    | "unstitched_dyeing"
    | "unstitched_dyeing_tailoring"
    | "stitched_ready"
    | null;
  spec?: any;
  price?: any;
  media?: any;
};

type NameRow = { id: any; name: string };

type ResultsCacheShape = {
  products: ProductRow[];
  dressTypes: NameRow[];
  fabricTypes: NameRow[];
  workTypes: NameRow[];
  workDensities: NameRow[];
  originCities: NameRow[];
  wearStates: NameRow[];
  hasMore: boolean;
};

let RESULTS_CACHE: ResultsCacheShape | null = null;

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function normalizeIds(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x ?? "").trim()).filter((x) => x.length > 0);
}

// empty selection => ANY (pass)
function anyOverlap(selected: string[], productIds: any): boolean {
  if (!selected.length) return true;
  const p = normalizeIds(productIds);
  if (!p.length) return false;
  const set = new Set(p);
  return selected.some((s) => set.has(String(s)));
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
 * Numeric PKR value for filtering:
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
  if (typeof perMeter === "number")
    return `PKR ${perMeter.toLocaleString()} / meter`;

  return "Price not set";
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
function namesOrLoading(
  label: string,
  selectedIds: any[],
  names: string[],
): string {
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;
  if (!hasSelection) return `${label}: Any`;
  if (!names.length) return `${label}: Loading…`;
  return `${label}: ${names.join(", ")}`;
}

function formatPKR(n: number) {
  return `PKR ${Math.round(n).toLocaleString()}`;
}

function priceRangeSummary(
  minCostPkr: number | null,
  maxCostPkr: number | null,
) {
  if (minCostPkr === null && maxCostPkr === null) return "Price: Any";
  if (minCostPkr !== null && maxCostPkr === null)
    return `Price: ${formatPKR(minCostPkr)}+`;
  if (minCostPkr === null && maxCostPkr !== null)
    return `Price: Up to ${formatPKR(maxCostPkr)}`;
  return `Price: ${formatPKR(minCostPkr as number)} – ${formatPKR(maxCostPkr as number)}`;
}

export default function ResultsScreen() {
  const router = useRouter();
  const filters = useAppSelector((s: any) => s.filters);

  // ✅ Dress Type is now MULTI-select (empty => Any)
  const dressTypeIds: string[] = filters?.dressTypeIds ?? [];

  const fabricTypeIds: string[] = filters?.fabricTypeIds ?? [];
  const colorShadeIds: string[] = filters?.colorShadeIds ?? [];
  const workTypeIds: string[] = filters?.workTypeIds ?? [];
  const workDensityIds: string[] = filters?.workDensityIds ?? [];
  const originCityIds: string[] = filters?.originCityIds ?? [];
  const wearStateIds: string[] = filters?.wearStateIds ?? [];

  // ✅ cost range (nulls => Any)
  const minCostPkr: number | null = filters?.minCostPkr ?? null;
  const maxCostPkr: number | null = filters?.maxCostPkr ?? null;

  // ✅ vendors (multi-select, empty = Any)
  const vendorIds: string[] = filters?.vendorIds ?? [];

  const hasWarmCache = Boolean(RESULTS_CACHE);

  const [loading, setLoading] = useState(!hasWarmCache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(RESULTS_CACHE?.hasMore ?? true);

  const [products, setProducts] = useState<ProductRow[]>(
    RESULTS_CACHE?.products ?? [],
  );

  // lookups (names only)
  const [dressTypes, setDressTypes] = useState<NameRow[]>(
    RESULTS_CACHE?.dressTypes ?? [],
  );
  const [fabricTypes, setFabricTypes] = useState<NameRow[]>(
    RESULTS_CACHE?.fabricTypes ?? [],
  );
  const [workTypes, setWorkTypes] = useState<NameRow[]>(
    RESULTS_CACHE?.workTypes ?? [],
  );
  const [workDensities, setWorkDensities] = useState<NameRow[]>(
    RESULTS_CACHE?.workDensities ?? [],
  );
  const [originCities, setOriginCities] = useState<NameRow[]>(
    RESULTS_CACHE?.originCities ?? [],
  );
  const [wearStates, setWearStates] = useState<NameRow[]>(
    RESULTS_CACHE?.wearStates ?? [],
  );

  // ✅ local favourites (heart turns red). No DB yet.
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // ✅ sort (default: cost ascending)
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"cost_asc" | "cost_desc" | "date">(
    "cost_asc",
  );

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
      .select(
        "id, vendor_id, product_code, title, created_at, inventory_qty, made_on_order, product_category, spec, price, media",
      )
      .order("created_at", { ascending: false })
      .range(from, to);
  }

  useEffect(() => {
    let alive = true;

    async function loadAll() {
      try {
        if (!RESULTS_CACHE) {
          setLoading(true);
          setHasMore(true);
        }

        const [
          prodRes,
          dressRes,
          fabricRes,
          workRes,
          densityRes,
          originRes,
          wearRes,
        ] = await Promise.all([
          fetchPage(0, PAGE_SIZE - 1),

          (supabase as any)
            .from(TABLE_DRESS_TYPE)
            .select("id, name")
            .order("id", { ascending: true }),
          supabase
            .from(TABLE_FABRIC_TYPES)
            .select("id, name")
            .order("sort_order", { ascending: true }),
          supabase
            .from(TABLE_WORK_TYPES)
            .select("id, name")
            .order("name", { ascending: true }),
          supabase
            .from(TABLE_WORK_DENSITIES)
            .select("id, name")
            .order("name", { ascending: true }),
          supabase
            .from(TABLE_ORIGIN_CITIES)
            .select("id, name")
            .order("name", { ascending: true }),
          supabase
            .from(TABLE_WEAR_STATES)
            .select("id, name")
            .order("name", { ascending: true }),
        ]);

        if (!alive) return;

        // products (first page only)
        if ((prodRes as any).error) {
          Alert.alert("Load error", (prodRes as any).error.message);
          setProducts([]);
          setHasMore(false);
          RESULTS_CACHE = {
            products: [],
            dressTypes: (((dressRes as any).data as any) ?? []) as any,
            fabricTypes: (((fabricRes as any).data as any) ?? []) as any,
            workTypes: (((workRes as any).data as any) ?? []) as any,
            workDensities: (((densityRes as any).data as any) ?? []) as any,
            originCities: (((originRes as any).data as any) ?? []) as any,
            wearStates: (((wearRes as any).data as any) ?? []) as any,
            hasMore: false,
          };
        } else {
          const rows = (((prodRes as any).data as any) ?? []) as ProductRow[];
          const nextDress = (((dressRes as any).data as any) ?? []) as any[];
          const nextFabric = (((fabricRes as any).data as any) ?? []) as any[];
          const nextWork = (((workRes as any).data as any) ?? []) as any[];
          const nextDensity = (((densityRes as any).data as any) ??
            []) as any[];
          const nextOrigin = (((originRes as any).data as any) ?? []) as any[];
          const nextWear = (((wearRes as any).data as any) ?? []) as any[];
          const nextHasMore = rows.length === PAGE_SIZE;

          setProducts(rows);
          setHasMore(nextHasMore);

          // lookups
          setDressTypes(nextDress);
          setFabricTypes(nextFabric);
          setWorkTypes(nextWork);
          setWorkDensities(nextDensity);
          setOriginCities(nextOrigin);
          setWearStates(nextWear);

          RESULTS_CACHE = {
            products: rows,
            dressTypes: nextDress,
            fabricTypes: nextFabric,
            workTypes: nextWork,
            workDensities: nextDensity,
            originCities: nextOrigin,
            wearStates: nextWear,
            hasMore: nextHasMore,
          };
        }

        if ((prodRes as any).error) {
          setDressTypes((((dressRes as any).data as any) ?? []) as any);
          setFabricTypes((((fabricRes as any).data as any) ?? []) as any);
          setWorkTypes((((workRes as any).data as any) ?? []) as any);
          setWorkDensities((((densityRes as any).data as any) ?? []) as any);
          setOriginCities((((originRes as any).data as any) ?? []) as any);
          setWearStates((((wearRes as any).data as any) ?? []) as any);
        }
      } catch (e: any) {
        if (!alive) return;
        Alert.alert("Load error", e?.message ?? "Unknown error");
        setProducts([]);
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

    if (!RESULTS_CACHE) {
      loadAll();
    } else {
      setLoading(false);
      setProducts(RESULTS_CACHE.products);
      setDressTypes(RESULTS_CACHE.dressTypes);
      setFabricTypes(RESULTS_CACHE.fabricTypes);
      setWorkTypes(RESULTS_CACHE.workTypes);
      setWorkDensities(RESULTS_CACHE.workDensities);
      setOriginCities(RESULTS_CACHE.originCities);
      setWearStates(RESULTS_CACHE.wearStates);
      setHasMore(RESULTS_CACHE.hasMore);
    }

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
        const next = [...prev, ...add];

        if (RESULTS_CACHE) {
          RESULTS_CACHE = {
            ...RESULTS_CACHE,
            products: next,
            hasMore: rows.length === PAGE_SIZE,
          };
        } else {
          RESULTS_CACHE = {
            products: next,
            dressTypes,
            fabricTypes,
            workTypes,
            workDensities,
            originCities,
            wearStates,
            hasMore: rows.length === PAGE_SIZE,
          };
        }

        return next;
      });

      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }

  // lookup maps
  const dressMap = useMemo(() => buildNameMap(dressTypes), [dressTypes]);
  const fabricMap = useMemo(() => buildNameMap(fabricTypes), [fabricTypes]);
  const workMap = useMemo(() => buildNameMap(workTypes), [workTypes]);
  const densityMap = useMemo(
    () => buildNameMap(workDensities),
    [workDensities],
  );
  const originMap = useMemo(() => buildNameMap(originCities), [originCities]);
  const wearMap = useMemo(() => buildNameMap(wearStates), [wearStates]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      const spec = p?.spec ?? {};
      const price = p?.price ?? {};

      const madeOnOrder = Boolean(p?.made_on_order);
      const inventoryQty = Number(p?.inventory_qty ?? 0);

      if (!madeOnOrder && inventoryQty <= 0) return false;

      // ✅ vendor filter (multi-select). Empty => ANY
      if (vendorIds.length) {
        const vid =
          p?.vendor_id === null || p?.vendor_id === undefined
            ? ""
            : String(p.vendor_id);
        if (!vid || !vendorIds.includes(vid)) return false;
      }

      // ✅ dress type MULTI-select (empty => ANY)
      if (!anyOverlap(dressTypeIds, spec?.dressTypeIds)) return false;

      if (!anyOverlap(fabricTypeIds, spec?.fabricTypeIds)) return false;
      if (!anyOverlap(colorShadeIds, spec?.colorShadeIds)) return false;
      if (!anyOverlap(workTypeIds, spec?.workTypeIds)) return false;
      if (!anyOverlap(workDensityIds, spec?.workDensityIds)) return false;
      if (!anyOverlap(originCityIds, spec?.originCityIds)) return false;
      if (!anyOverlap(wearStateIds, spec?.wearStateIds)) return false;

      // ✅ Redux-only cost range filtering
      const anyBound = minCostPkr !== null || maxCostPkr !== null;
      if (anyBound) {
        const pkr = getComparablePkr(price);
        if (pkr === null) return false;
        if (minCostPkr !== null && pkr < minCostPkr) return false;
        if (maxCostPkr !== null && pkr > maxCostPkr) return false;
      }

      return true;
    });
  }, [
    products,
    vendorIds,
    dressTypeIds,
    fabricTypeIds,
    colorShadeIds,
    workTypeIds,
    workDensityIds,
    originCityIds,
    wearStateIds,
    minCostPkr,
    maxCostPkr,
  ]);

  // ✅ apply sort (cost asc/desc or date)
  const sorted = useMemo(() => {
    const arr = [...(filtered ?? [])];

    if (sortMode === "cost_asc" || sortMode === "cost_desc") {
      const dir = sortMode === "cost_asc" ? 1 : -1;

      arr.sort((a, b) => {
        const ap = getComparablePkr(a?.price);
        const bp = getComparablePkr(b?.price);

        // nulls last
        if (ap === null && bp === null) return 0;
        if (ap === null) return 1;
        if (bp === null) return -1;

        if (ap < bp) return -1 * dir;
        if (ap > bp) return 1 * dir;
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
    const dressNames = idsToNames(dressTypeIds, dressMap);
    const fabricNames = idsToNames(fabricTypeIds, fabricMap);
    const workNames = idsToNames(workTypeIds, workMap);
    const densityNames = idsToNames(workDensityIds, densityMap);
    const originNames = idsToNames(originCityIds, originMap);
    const wearNames = idsToNames(wearStateIds, wearMap);

    // colors are already names in Redux/spec
    const colorNames = (colorShadeIds ?? [])
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);

    return [
      namesOrLoading("Dress", dressTypeIds, dressNames),
      namesOrLoading("Fabric", fabricTypeIds, fabricNames),
      namesOrLoading("Color", colorShadeIds, colorNames),
      namesOrLoading("Work", workTypeIds, workNames),
      namesOrLoading("Density", workDensityIds, densityNames),
      namesOrLoading("Origin", originCityIds, originNames),
      namesOrLoading("Wear", wearStateIds, wearNames),
      priceRangeSummary(minCostPkr, maxCostPkr),
    ].join("  |  ");
  }, [
    dressTypeIds,
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
    minCostPkr,
    maxCostPkr,
  ]);

  function openProduct(p: ProductRow) {
    router.push({
      pathname: "/flow/view-product" as any,
      params: { id: String(p.id) },
    });
  }

  if (loading) {
    return (
      <View style={[styles.center, styles.loadingScreen]}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading products…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          Products ({sorted.length})
        </Text>

        <View style={styles.topActions}>
          <Pressable
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <Text style={styles.iconText}>↕️</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/flow/results-filters" as any,
              })
            }
            style={({ pressed }) => [
              styles.iconBtn,
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <Text style={styles.iconText}>🔍</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/flow/orders/track" as any,
              })
            }
            style={({ pressed }) => [
              styles.iconBtn,
              pressed ? { opacity: 0.7 } : null,
            ]}
          >
            <Text style={styles.iconText}>📦</Text>
          </Pressable>
        </View>
      </View>

      {/* ✅ Summary line (includes Redux-only price range) */}
      {/* <View style={styles.summaryBar}>
        <Text style={styles.summaryText} numberOfLines={2}>
          {filtersSummary}
        </Text>
      </View> */}

      {/* ✅ Sort Modal (dark background) */}
      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSortOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Sort</Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSortMode("cost_asc");
                setSortOpen(false);
              }}
            >
              <View style={styles.modalLeft}>
                <Text style={styles.modalEmoji}>💰</Text>
                <View>
                  <Text style={styles.modalItemTitle}>Price</Text>
                  <Text style={styles.modalItemSub}>Low to high</Text>
                </View>
              </View>
              <Text style={styles.modalRight}>
                {sortMode === "cost_asc" ? "✅" : ""}
              </Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSortMode("cost_desc");
                setSortOpen(false);
              }}
            >
              <View style={styles.modalLeft}>
                <Text style={styles.modalEmoji}>💸</Text>
                <View>
                  <Text style={styles.modalItemTitle}>Price</Text>
                  <Text style={styles.modalItemSub}>High to low</Text>
                </View>
              </View>
              <Text style={styles.modalRight}>
                {sortMode === "cost_desc" ? "✅" : ""}
              </Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSortMode("date");
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
              <Text style={styles.modalRight}>
                {sortMode === "date" ? "✅" : ""}
              </Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.modalItem,
                pressed ? { opacity: 0.7 } : null,
              ]}
              onPress={() => {
                setSortOpen(false);
                Alert.alert(
                  "Coming soon",
                  "⭐ Sort by vendor rating is a feature coming soon.",
                );
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

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setSortOpen(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {sorted.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            No matching products (loaded so far)
          </Text>
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

                <View style={{ marginTop: 0, paddingTop: 0, paddingBottom: 0 }}>
                  {item?.made_on_order ? (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      Made on order
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {item?.product_category === "stitched_ready"
                          ? "Ready-to-wear"
                          : "Unstitched"}
                      </Text>

                      {item?.product_category ===
                      "unstitched_dyeing_tailoring" ? (
                        <Text style={styles.cardSub} numberOfLines={1}>
                          Tailoring available
                        </Text>
                      ) : null}

                      {item?.product_category === "unstitched_dyeing" ? (
                        <Text style={styles.cardSub} numberOfLines={1}>
                          Dyeing available
                        </Text>
                      ) : null}

                      <Text style={styles.cardSub} numberOfLines={1}>
                        In Stock:{" "}
                        {Math.max(0, Number(item?.inventory_qty ?? 0))}
                      </Text>
                    </>
                  )}
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => toggleFavorite(item.id)}
                    style={styles.actionBtn}
                  >
                    <Text
                      style={[styles.actionText, isFav ? styles.heartOn : null]}
                    >
                      {isFav ? "❤️" : "🤍"}
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

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  topRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  link: {
    fontSize: 14,
    color: stylesVars.blue,
    fontWeight: "700",
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
    paddingHorizontal: 10,
  },

  topActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  iconText: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  summaryBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  summaryText: {
    fontSize: 12,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 20,
    justifyContent: "center",
  },

  modalCard: {
    backgroundColor: stylesVars.cardBg,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
  },

  modalTitle: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  modalItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  modalEmoji: {
    fontSize: 18,
  },

  modalItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  modalItemSub: {
    fontSize: 12,
    fontWeight: "500",
    color: stylesVars.mutedText,
    marginTop: 2,
  },

  modalRight: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  divider: {
    height: 1,
    backgroundColor: stylesVars.border,
  },

  soonPill: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.mutedText,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  modalCloseBtn: {
    margin: 14,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  modalCloseText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 14,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  loadingScreen: {
    backgroundColor: stylesVars.bg,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 8,
  },

  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: stylesVars.cardBg,
    marginBottom: 10,
  },

  image: {
    width: "100%",
    height: 140,
    backgroundColor: "#F1F5F9",
  },

  imagePlaceholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  cardTitle: {
    paddingHorizontal: 10,
    paddingTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
  },

  cardPrice: {
    paddingHorizontal: 10,
    paddingTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text,
  },

  cardSub: {
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 0,
    fontSize: 12,
    lineHeight: 14,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  actionRow: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  actionBtn: {
    flex: 1,
  },

  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text,
  },

  heartOn: {
    color: "#D11A2A",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },

  loadMoreBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadMoreText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 14,
  },

  endText: {
    marginTop: 10,
    textAlign: "center",
    color: stylesVars.mutedText,
    fontWeight: "500",
    fontSize: 13,
    lineHeight: 18,
  },
});
