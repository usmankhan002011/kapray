// app/vendor/profile/view-product.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAppSelector } from "@/store/hooks";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");

// Assumed lookup table names (adjust if your Supabase uses different names)
const LOOKUP = {
  dressTypes: "dress_types",
  fabricTypes: "fabric_types",
  workTypes: "work_types",
  workDensities: "work_densities",
  originCities: "origin_cities",
  wearStates: "wear_states"
} as const;

type ProductRow = {
  id: string;
  vendor_id: string | number;
  product_code: string;
  title: string;
  inventory_qty: number;
  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;
};

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function isHttpUrl(v: any) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function firstParam(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

function normalizeLabelList(v: any): string[] {
  const arr = Array.isArray(v) ? v : [];
  const out: string[] = [];

  for (const item of arr) {
    if (item == null) continue;

    if (typeof item === "string" || typeof item === "number") {
      const s = String(item).trim();
      if (s) out.push(s);
      continue;
    }

    if (typeof item === "object") {
      const s =
        String(
          (item as any)?.label ??
            (item as any)?.name ??
            (item as any)?.title ??
            (item as any)?.text ??
            (item as any)?.value ??
            (item as any)?.id ??
            ""
        ).trim() || "";
      if (s) out.push(s);
      continue;
    }
  }

  return out;
}

function normalizeIdList(v: any): string[] {
  const arr = Array.isArray(v) ? v : [];
  const out: string[] = [];
  for (const item of arr) {
    if (item == null) continue;
    const s = String(item).trim();
    if (s) out.push(s);
  }
  return out;
}

export default function ViewProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const vendorId =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  // Accept either ?id=uuid OR ?code=V15-P0010 (also tolerate product_id/product_code)
  const productId = useMemo(() => {
    const raw = firstParam(
      (params as any)?.id ?? (params as any)?.product_id ?? null
    );
    return raw ? decodeURIComponent(raw) : null;
  }, [params]);

  const productCode = useMemo(() => {
    const raw = firstParam(
      (params as any)?.code ?? (params as any)?.product_code ?? null
    );
    return raw ? decodeURIComponent(raw) : null;
  }, [params]);

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [missingParam, setMissingParam] = useState(false);

  // resolved labels (names) for spec ids
  const [specNames, setSpecNames] = useState<{
    dressType: string[];
    fabric: string[];
    work: string[];
    density: string[];
    origin: string[];
    wear: string[];
    color: string[];
  }>({
    dressType: [],
    fabric: [],
    work: [],
    density: [],
    origin: [],
    wear: [],
    color: []
  });

  // viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

  // video selection
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>("");

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;

    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

  const resolveManyPublic = useCallback(
    (paths: any): string[] => {
      const list = Array.isArray(paths) ? paths : [];
      return list
        .map((p) => resolvePublicUrl(String(p || "").trim()))
        .filter(Boolean) as string[];
    },
    [resolvePublicUrl]
  );

  const imageUrls = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.images);
  }, [product, resolveManyPublic]);

  const thumbUrls = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.thumbs);
  }, [product, resolveManyPublic]);

  const videoUrls = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.videos);
  }, [product, resolveManyPublic]);

  const bannerUrl = useMemo(() => {
    return imageUrls.length ? imageUrls[0] : null;
  }, [imageUrls]);

  const gallery = useMemo(() => {
    return [...imageUrls];
  }, [imageUrls]);

  const openViewerAt = useCallback(
    (idx: number) => {
      if (!gallery.length) return;
      const safeIdx = Math.max(0, Math.min(idx, gallery.length - 1));
      setCurrentIndex(safeIdx);
      setViewerVisible(true);
    },
    [gallery.length]
  );

  useEffect(() => {
    if (!viewerVisible) return;
    if (!gallery.length) return;

    const t = setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: false
        });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [viewerVisible, currentIndex, gallery.length]);

  useEffect(() => {
    if (!videoUrls.length) {
      setSelectedVideoUrl("");
      return;
    }
    if (!selectedVideoUrl || !videoUrls.includes(selectedVideoUrl)) {
      setSelectedVideoUrl(videoUrls[0]);
    }
  }, [videoUrls, selectedVideoUrl]);

  const player = useVideoPlayer(selectedVideoUrl || "");

  useEffect(() => {
    try {
      if (player) player.loop = false;
    } catch {
      // ignore
    }
  }, [player]);

  async function openExternal(url: string) {
    const u = String(url || "").trim();
    if (!u) return;

    const ok = await Linking.canOpenURL(u);
    if (!ok) {
      Alert.alert("Cannot open", u);
      return;
    }
    Linking.openURL(u);
  }

  async function fetchProduct() {
    if (!productId && !productCode) {
      setMissingParam(true);
      setProduct(null);
      return;
    }

    try {
      setMissingParam(false);
      setLoading(true);

      let q = supabase.from("products").select(
        [
          "id",
          "vendor_id",
          "product_code",
          "title",
          "inventory_qty",
          "spec",
          "price",
          "media",
          "created_at",
          "updated_at"
        ].join(",")
      );

      if (productId) q = q.eq("id", productId);
      else q = q.eq("product_code", productCode);

      const { data, error } = await q.single();

      if (error) {
        Alert.alert("Load error", error.message);
        setProduct(null);
        return;
      }

      setProduct(data as ProductRow);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load product.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  // resolve ids -> names (Dress Type etc.)
  const resolveNamesByIds = useCallback(
    async (table: string, ids: string[]): Promise<string[]> => {
      const clean = ids.map((x) => String(x).trim()).filter(Boolean);
      if (!clean.length) return [];

      const { data, error } = await supabase
        .from(table)
        .select("id, name")
        .in("id", clean);

      if (error || !data) return [];

      const map = new Map<string, string>();
      for (const r of data as any[]) {
        const id = String(r?.id ?? "").trim();
        const name = String(r?.name ?? "").trim();
        if (id && name) map.set(id, name);
      }

      // keep original order
      return clean.map((id) => map.get(id) ?? id);
    },
    []
  );

  const resolveColorNames = useCallback((ids: any): string[] => {
    const list = normalizeIdList(ids);
    if (!list.length) return [];

    const map: Record<string, string> = {
      red: "Red",
      green: "Green",
      yellow: "Yellow",
      blue: "Blue",
      golden: "Golden",
      silver: "Silver",
      white: "White",
      black: "Black"
    };

    return list.map((id) => map[String(id).toLowerCase()] ?? String(id));
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const spec = (product as any)?.spec ?? {};
      if (!product) {
        if (alive) {
          setSpecNames({
            dressType: [],
            fabric: [],
            work: [],
            density: [],
            origin: [],
            wear: [],
            color: []
          });
        }
        return;
      }

      const dressTypeIds =
        normalizeIdList(spec?.dressTypeIds ?? spec?.dressTypes ?? []);
      const fabricTypeIds =
        normalizeIdList(spec?.fabricTypeIds ?? spec?.fabricTypes ?? []);
      const workTypeIds =
        normalizeIdList(spec?.workTypeIds ?? spec?.workTypes ?? []);
      const densityIds =
        normalizeIdList(spec?.workDensityIds ?? spec?.workDensities ?? []);
      const originIds =
        normalizeIdList(spec?.originCityIds ?? spec?.originCities ?? []);
      const wearIds =
        normalizeIdList(spec?.wearStateIds ?? spec?.wearStates ?? []);
      const colorIds =
        normalizeIdList(spec?.colorShadeIds ?? spec?.colorShades ?? []);

      try {
        const [dressType, fabric, work, density, origin, wear] =
          await Promise.all([
            resolveNamesByIds(LOOKUP.dressTypes, dressTypeIds),
            resolveNamesByIds(LOOKUP.fabricTypes, fabricTypeIds),
            resolveNamesByIds(LOOKUP.workTypes, workTypeIds),
            resolveNamesByIds(LOOKUP.workDensities, densityIds),
            resolveNamesByIds(LOOKUP.originCities, originIds),
            resolveNamesByIds(LOOKUP.wearStates, wearIds)
          ]);

        const color = resolveColorNames(colorIds);

        if (!alive) return;

        setSpecNames({
          dressType,
          fabric,
          work,
          density,
          origin,
          wear,
          color
        });
      } catch {
        if (!alive) return;
        setSpecNames({
          dressType: [],
          fabric: [],
          work: [],
          density: [],
          origin: [],
          wear: [],
          color: resolveColorNames(colorIds)
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [product, resolveNamesByIds, resolveColorNames]);

  useFocusEffect(
    useCallback(() => {
      fetchProduct();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, productCode])
  );

  useEffect(() => {
    imageUrls.forEach((u) => u && Image.prefetch(u));
  }, [imageUrls]);

  const Field = ({ label, value }: { label: string; value: any }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{safeText(value)}</Text>
    </View>
  );

  const ChipRow = ({ title, items }: { title: string; items: any }) => {
    const list = useMemo(() => normalizeLabelList(items), [items]);
    if (!list.length) return null;

    return (
      <View style={{ marginTop: 12 }}>
        <Text style={styles.specTitle}>{title}</Text>
        <View style={styles.chipsWrap}>
          {list.map((t, idx) => (
            <View key={`${title}-${t}-${idx}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const priceText = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const mode = String(price?.mode ?? "");

    if (mode === "unstitched_per_meter") {
      const v = price?.cost_pkr_per_meter;
      return v ? `PKR ${v} / meter` : "—";
    }

    const t = price?.cost_pkr_total;
    return t ? `PKR ${t} (total)` : "—";
  }, [product]);

  const sizeText = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const sizes = Array.isArray(price?.available_sizes)
      ? price.available_sizes
      : [];
    return sizes.length ? sizes.join(", ") : "—";
  }, [product]);

  const inventoryText = useMemo(() => {
    const n = Number((product as any)?.inventory_qty ?? 0);
    if (!Number.isFinite(n)) return "—";
    if (n === 0) return "Made on order";
    return String(n);
  }, [product]);

  const videoTiles = useMemo(() => {
    return videoUrls.map((v, idx) => ({
      videoUrl: v,
      thumbUrl: thumbUrls[idx] ?? null,
      idx
    }));
  }, [videoUrls, thumbUrls]);

  return (
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Product Details</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.linkBtn,
              pressed ? styles.pressed : null
            ]}
          >
            <Text style={styles.linkText}>Close</Text>
          </Pressable>
        </View>

        {missingParam ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Missing product</Text>
            <Text style={styles.meta} selectable>
              Provide route params as either:
              {"\n"}• /vendor/profile/view-product?id=UUID
              {"\n"}• /vendor/profile/view-product?code=V15-P0010
            </Text>

            <Text style={[styles.meta, { marginTop: 8 }]} selectable>
              Example:
              {"\n"}
              {
                'router.push({ pathname: "/vendor/profile/view-product", params: { id: product.id } })'
              }
              {"\n"}
              {
                'router.push({ pathname: "/vendor/profile/view-product", params: { code: product.product_code } })'
              }
            </Text>
          </View>
        ) : null}

        {!!loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading product...</Text>
          </View>
        )}

        {!!vendorId &&
        !!product?.vendor_id &&
        String(product.vendor_id) !== String(vendorId) ? (
          <Text style={styles.warn}>
            Note: This product belongs to a different vendor_id than the current
            vendor session.
          </Text>
        ) : null}

        {!!bannerUrl && (
          <Pressable
            onPress={() => openViewerAt(0)}
            style={({ pressed }) => [
              styles.bannerWrap,
              pressed ? styles.pressed : null
            ]}
          >
            <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          </Pressable>
        )}

        <View style={styles.card}>
          <Field label="Product Code" value={product?.product_code} />
          <Field label="Title" value={product?.title} />
          <Field label="Inventory Qty" value={inventoryText} />
          <Field label="Price" value={priceText} />
          <Field label="Available Sizes" value={sizeText} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product Description</Text>

          {/* Prefer resolved names; fallback to whatever is in spec */}
          <ChipRow
            title="Dress Type"
            items={
              specNames.dressType.length
                ? specNames.dressType
                : (product as any)?.spec?.dressTypeNames ??
                  (product as any)?.spec?.dressTypeLabels ??
                  (product as any)?.spec?.dressTypeIds
            }
          />
          <ChipRow
            title="Fabric"
            items={
              specNames.fabric.length
                ? specNames.fabric
                : (product as any)?.spec?.fabricTypeNames ??
                  (product as any)?.spec?.fabricTypeLabels ??
                  (product as any)?.spec?.fabricTypeIds
            }
          />
          <ChipRow
            title="Color"
            items={
              specNames.color.length
                ? specNames.color
                : (product as any)?.spec?.colorShadeNames ??
                  (product as any)?.spec?.colorShadeLabels ??
                  (product as any)?.spec?.colorShadeIds
            }
          />
          <ChipRow
            title="Work"
            items={
              specNames.work.length
                ? specNames.work
                : (product as any)?.spec?.workTypeNames ??
                  (product as any)?.spec?.workTypeLabels ??
                  (product as any)?.spec?.workTypeIds
            }
          />
          <ChipRow
            title="Density"
            items={
              specNames.density.length
                ? specNames.density
                : (product as any)?.spec?.workDensityNames ??
                  (product as any)?.spec?.workDensityLabels ??
                  (product as any)?.spec?.workDensityIds
            }
          />
          <ChipRow
            title="Origin"
            items={
              specNames.origin.length
                ? specNames.origin
                : (product as any)?.spec?.originCityNames ??
                  (product as any)?.spec?.originCityLabels ??
                  (product as any)?.spec?.originCityIds
            }
          />
          <ChipRow
            title="Wear State"
            items={
              specNames.wear.length
                ? specNames.wear
                : (product as any)?.spec?.wearStateNames ??
                  (product as any)?.spec?.wearStateLabels ??
                  (product as any)?.spec?.wearStateIds
            }
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Images</Text>

          {imageUrls.length ? (
            <>
              <Text style={styles.meta}>Tap any image to view full screen.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {imageUrls.map((u, idx) => (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => openViewerAt(idx)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      <Image source={{ uri: u }} style={styles.thumb} />
                      {idx === 0 ? (
                        <View style={styles.bannerTag}>
                          <Text style={styles.bannerTagText}>Banner</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Videos</Text>

          {videoUrls.length ? (
            <>
              {!!selectedVideoUrl && (
                <View style={styles.videoBox}>
                  <VideoView
                    player={player}
                    style={styles.video}
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                </View>
              )}

              <Text style={styles.meta}>
                Tap a thumbnail to play. Long-press to open externally.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {videoTiles.map((t) => (
                    <Pressable
                      key={`${t.videoUrl}-${t.idx}`}
                      onPress={() => setSelectedVideoUrl(t.videoUrl)}
                      onLongPress={() => openExternal(t.videoUrl)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        selectedVideoUrl === t.videoUrl
                          ? styles.videoThumbOn
                          : null,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      {t.thumbUrl ? (
                        <Image
                          source={{ uri: t.thumbUrl }}
                          style={styles.thumb}
                        />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderText}>
                            Video {t.idx + 1}
                          </Text>
                        </View>
                      )}

                      <View style={styles.playBadge}>
                        <Text style={styles.playBadgeText}>▶</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.empty}>—</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meta</Text>
          <Field label="Created at" value={product?.created_at} />
          <Field label="Updated at" value={product?.updated_at} />
        </View>
      </ScrollView>

      {/* Fullscreen Viewer (images only) */}
      <Modal
        visible={viewerVisible}
        transparent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <FlatList
            ref={flatListRef}
            data={gallery}
            horizontal
            pagingEnabled
            keyExtractor={(_, i) => i.toString()}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i
            })}
            initialScrollIndex={Math.max(
              0,
              Math.min(currentIndex, Math.max(0, gallery.length - 1))
            )}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next =
                Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              setCurrentIndex(next);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.viewerImage} />
            )}
          />

          <Pressable
            style={styles.closeButton}
            onPress={() => setViewerVisible(false)}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.indexCaption}>
            <Text style={styles.indexText}>
              {gallery.length ? currentIndex + 1 : 0} / {gallery.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesVars = {
  bg: "#F5F7FB",
  cardBg: "#FFFFFF",
  border: "#D9E2F2",
  borderSoft: "#E6EDF8",
  blue: "#0B2F6B",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A",
  placeholder: "#94A3B8"
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  linkText: { color: stylesVars.blue, fontWeight: "900" },

  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: { fontSize: 12, color: stylesVars.subText, fontWeight: "800" },

  warn: { marginTop: 10, color: stylesVars.subText },

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: stylesVars.subText,
    fontWeight: "800"
  },

  row: { marginTop: 10 },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.2
  },
  value: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.text
  },

  bannerWrap: {
    marginTop: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff"
  },
  bannerImage: { width: "100%", height: 190, resizeMode: "cover" },

  hRow: { flexDirection: "row", gap: 10, paddingTop: 10, paddingBottom: 4 },
  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff"
  },
  thumb: { width: "100%", height: "100%", backgroundColor: "#f3f3f3" },

  bannerTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(11,47,107,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  bannerTagText: { color: "#fff", fontWeight: "900", fontSize: 11 },

  empty: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  videoBox: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff"
  },
  video: { width: "100%", height: 210 },

  videoThumbOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5FF"
  },
  videoPlaceholderText: {
    color: stylesVars.blue,
    fontWeight: "900",
    fontSize: 12
  },
  playBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: "rgba(11,47,107,0.92)",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  playBadgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  specTitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue
  },
  chipsWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  chipText: {
    color: stylesVars.blue,
    fontWeight: "900",
    fontSize: 12,
    maxWidth: 220
  },

  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center"
  },
  viewerImage: { width, height: "100%", resizeMode: "contain" },

  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8
  },
  closeText: { color: "#fff", fontSize: 20, fontWeight: "900" },

  indexCaption: { position: "absolute", bottom: 40, alignSelf: "center" },
  indexText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  pressed: { opacity: 0.75 }
});
