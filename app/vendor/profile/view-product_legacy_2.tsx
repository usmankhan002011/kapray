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
import { useFocusEffect, useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");
const FOOTER_H = 86;

// ✅ persist buyer stitching choice across dye modal round-trips (even if screen remounts)
const BUYER_TAILORING_CHOICE_CACHE = new Map<string, boolean>();
const BUYER_DYEING_CHOICE_CACHE = new Map<string, boolean>();

function makeChoiceKey(productId: string | null, productCode: string | null) {
  const pid = String(productId ?? "").trim();
  if (pid) return `id:${pid}`;
  const pc = String(productCode ?? "").trim();
  if (pc) return `code:${pc}`;
  return "";
}

// Assumed lookup table names (adjust if your Supabase uses different names)
const LOOKUP = {
  dressTypes: "dress_types",
  fabricTypes: "fabric_types",
  workTypes: "work_types",
  workDensities: "work_densities",
  originCities: "origin_cities",
  wearStates: "wear_states"
} as const;

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type VendorRow = {
  id: string | number;
  name?: string | null;
  shop_name?: string | null;
  address?: string | null;
  mobile?: string | null;
  landline?: string | null;
  email?: string | null;
  location?: string | null;
  location_url?: string | null;
  profile_image_path?: string | null;
  banner_path?: string | null;
  status?: string | null;
  offers_tailoring?: boolean | null;
};

type ProductRow = {
  id: string;
  vendor_id: string | number;
  product_code: string;
  title: string;
  inventory_qty: number;
  made_on_order?: boolean;
  product_category?: ProductCategory | null;
  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;
  vendor?: VendorRow | null;
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

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function cleanIdParam(v: string) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const head = s.split("?")[0] ?? "";
  return head.trim();
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

function safeInt0(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function isProductCategory(v: any): v is ProductCategory {
  return (
    v === "unstitched_plain" ||
    v === "unstitched_dyeing" ||
    v === "unstitched_dyeing_tailoring" ||
    v === "stitched_ready"
  );
}

function parseBoolParam(v: unknown): boolean | null {
  const raw = firstParam(v);
  if (raw == null) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s === "1" || s === "true" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n" || s === "off") return false;
  return null;
}

type MediaItem =
  | { kind: "image"; url: string }
  | { kind: "video"; url: string; thumbUrl?: string | null; bytes?: number | null };

function compactLineValue(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s === "—") return null;
  return s;
}

function formatDateOnly(isoLike: any): string | null {
  const s = String(isoLike ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function headContentLength(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const len = res.headers?.get?.("content-length") ?? res.headers?.get?.("Content-Length");
    if (!len) return null;
    const n = Number(len);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

export default function ViewProductScreen() {
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const isBuyerRoute = useMemo(() => {
    const segs = segments as unknown as string[];
    return segs.includes("(buyer)");
  }, [segments]);

  const vendorId =
    useAppSelector((s: any) => s?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null);

  const productId = useMemo(() => {
    const raw = firstParam((params as any)?.id ?? (params as any)?.product_id ?? null);
    if (!raw) return null;
    const decoded = safeDecode(raw);
    const cleaned = cleanIdParam(decoded);
    return cleaned ? cleaned : null;
  }, [params]);

  const productCode = useMemo(() => {
    const raw = firstParam((params as any)?.code ?? (params as any)?.product_code ?? null);
    if (!raw) return null;
    return safeDecode(raw);
  }, [params]);

  const choiceKey = useMemo(() => makeChoiceKey(productId, productCode), [productId, productCode]);

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [vendorRow, setVendorRow] = useState<VendorRow | null>(null);
  const [missingParam, setMissingParam] = useState(false);

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

  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const mediaViewerRef = useRef<FlatList<MediaItem>>(null);

  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);

  const [activeVideoUrl, setActiveVideoUrl] = useState<string>("");

  // ✅ cover state to eliminate black flash (keep thumb visible until video is playing)
  const [videoCoverVisible, setVideoCoverVisible] = useState<boolean>(true);
  const coverHideTimerRef = useRef<any>(null);

  // ✅ tap-to-show minimal controls
  const [videoControlsVisible, setVideoControlsVisible] = useState(false);
  const controlsTimerRef = useRef<any>(null);

  const showControlsBriefly = useCallback(() => {
    setVideoControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setVideoControlsVisible(false), 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (coverHideTimerRef.current) clearTimeout(coverHideTimerRef.current);
    };
  }, []);

  const [selectedDyeShadeId, setSelectedDyeShadeId] = useState<string>("");
  const [selectedDyeHex, setSelectedDyeHex] = useState<string>("");
  const [selectedDyeLabel, setSelectedDyeLabel] = useState<string>("");

  const [buyerWantsTailoring, _setBuyerWantsTailoring] = useState<boolean>(false);
  const setBuyerWantsTailoring = useCallback(
    (next: boolean) => {
      _setBuyerWantsTailoring(next);
      if (choiceKey) BUYER_TAILORING_CHOICE_CACHE.set(choiceKey, next);
    },
    [choiceKey]
  );

  const [buyerWantsDyeing, _setBuyerWantsDyeing] = useState<boolean>(false);
  const setBuyerWantsDyeing = useCallback(
    (next: boolean) => {
      _setBuyerWantsDyeing(next);
      if (choiceKey) BUYER_DYEING_CHOICE_CACHE.set(choiceKey, next);
    },
    [choiceKey]
  );

  useEffect(() => {
    if (!choiceKey) return;

    const cachedTailoring = BUYER_TAILORING_CHOICE_CACHE.get(choiceKey);
    if (typeof cachedTailoring === "boolean") _setBuyerWantsTailoring(cachedTailoring);

    const cachedDyeing = BUYER_DYEING_CHOICE_CACHE.get(choiceKey);
    if (typeof cachedDyeing === "boolean") _setBuyerWantsDyeing(cachedDyeing);
  }, [choiceKey]);

  useEffect(() => {
    const dyeingSelected =
      parseBoolParam((params as any)?.dyeing_selected) ??
      parseBoolParam((params as any)?.dye_selected) ??
      null;

    const rawId = firstParam((params as any)?.dye_shade_id ?? null);
    const rawHex = firstParam((params as any)?.dye_hex ?? null);
    const rawLabel = firstParam((params as any)?.dye_label ?? null);

    const id = rawId ? safeDecode(rawId) : "";
    const hex = rawHex ? safeDecode(rawHex) : "";
    const label = rawLabel ? safeDecode(rawLabel) : "";

    const hasDye = Boolean(id || hex || label);

    if (dyeingSelected === false) {
      setBuyerWantsDyeing(false);
      setSelectedDyeShadeId("");
      setSelectedDyeHex("");
      setSelectedDyeLabel("");
      return;
    }

    if (dyeingSelected === true || hasDye) {
      setBuyerWantsDyeing(true);

      if (id) setSelectedDyeShadeId(id);
      if (hex) setSelectedDyeHex(hex);

      if (label) setSelectedDyeLabel(label);
      else if (hex) setSelectedDyeLabel(hex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;

    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

  const resolveManyPublic = useCallback(
    (paths: any): string[] => {
      const list = Array.isArray(paths) ? paths : [];
      return list.map((p) => resolvePublicUrl(String(p || "").trim())).filter(Boolean) as string[];
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

  const videoUrlsRaw = useMemo(() => {
    const media = (product as any)?.media ?? {};
    return resolveManyPublic(media?.videos);
  }, [product, resolveManyPublic]);

  // ✅ Sort videos by size (smallest first) using HEAD Content-Length (best-effort)
  const [videoSizes, setVideoSizes] = useState<Record<string, number>>({});
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const urls = Array.isArray(videoUrlsRaw) ? videoUrlsRaw : [];
      setVideoUrls(urls);

      if (!urls.length) {
        if (alive) setVideoSizes({});
        return;
      }

      const sizes: Record<string, number> = {};
      await Promise.all(
        urls.map(async (u) => {
          const n = await headContentLength(u);
          if (typeof n === "number" && n > 0) sizes[u] = n;
        })
      );

      if (!alive) return;

      setVideoSizes(sizes);

      // Sort: known sizes first (ascending), unknown sizes keep stable order at end
      const sorted = [...urls].sort((a, b) => {
        const sa = sizes[a];
        const sb = sizes[b];
        const ha = Number.isFinite(sa);
        const hb = Number.isFinite(sb);
        if (ha && hb) return (sa as number) - (sb as number);
        if (ha && !hb) return -1;
        if (!ha && hb) return 1;
        return 0;
      });

      setVideoUrls(sorted);
    })();

    return () => {
      alive = false;
    };
  }, [videoUrlsRaw]);

  // Build media items (images first, then videos sorted by size)
  const mediaItems = useMemo<MediaItem[]>(() => {
    const imgs: MediaItem[] = imageUrls.map((u) => ({ kind: "image", url: u }));

    const vids: MediaItem[] = videoUrls.map((u) => {
      const rawIndex = videoUrlsRaw.indexOf(u);
      const thumbUrl = rawIndex >= 0 ? thumbUrls[rawIndex] ?? null : null;
      const bytes = videoSizes[u] ?? null;
      return { kind: "video", url: u, thumbUrl, bytes };
    });

    return [...imgs, ...vids];
  }, [imageUrls, videoUrls, videoUrlsRaw, thumbUrls, videoSizes]);

  const selectedMedia = useMemo<MediaItem | null>(() => {
    if (!mediaItems.length) return null;
    const safeIdx = Math.max(0, Math.min(selectedMediaIndex, mediaItems.length - 1));
    return mediaItems[safeIdx] ?? null;
  }, [mediaItems, selectedMediaIndex]);

  const openMediaViewerAt = useCallback(
    (idx: number) => {
      if (!mediaItems.length) return;
      const safeIdx = Math.max(0, Math.min(idx, mediaItems.length - 1));
      setMediaViewerIndex(safeIdx);
      setMediaViewerVisible(true);

      const it = mediaItems[safeIdx];
      if (it?.kind === "video") {
        setActiveVideoUrl(it.url);
        setVideoCoverVisible(true);
      }
    },
    [mediaItems]
  );

  useEffect(() => {
    if (!mediaViewerVisible) return;
    if (!mediaItems.length) return;

    const t = setTimeout(() => {
      try {
        mediaViewerRef.current?.scrollToIndex({ index: mediaViewerIndex, animated: false });
      } catch {
        // ignore
      }
    }, 0);

    return () => clearTimeout(t);
  }, [mediaViewerVisible, mediaViewerIndex, mediaItems.length]);

  // ✅ ensure activeVideoUrl set if selection is a video (hero)
  useEffect(() => {
    if (!mediaItems.length) {
      setActiveVideoUrl("");
      return;
    }

    const safeIdx = Math.max(0, Math.min(selectedMediaIndex, mediaItems.length - 1));
    const it = mediaItems[safeIdx];

    if (it?.kind === "video") {
      if (activeVideoUrl !== it.url) {
        setActiveVideoUrl(it.url);
        setVideoCoverVisible(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaItems, selectedMediaIndex]);

  const player = useVideoPlayer(activeVideoUrl || "");
  const { status } = useEvent(player as any, "statusChange", { status: (player as any)?.status });
  const { isPlaying } = useEvent(player as any, "playingChange", {
    isPlaying: (player as any)?.playing
  });

  // ✅ Autoplay when activeVideoUrl changes
  useEffect(() => {
    if (!activeVideoUrl) return;
    const t = setTimeout(() => {
      try {
        (player as any)?.play?.();
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(t);
  }, [activeVideoUrl, player]);

  // ✅ Hide cover only AFTER we are actually playing (prevents black flash)
  useEffect(() => {
    if (!activeVideoUrl) return;

    if (isPlaying) {
      if (coverHideTimerRef.current) clearTimeout(coverHideTimerRef.current);

      // tiny delay to allow first rendered frame to be visible (smooth)
      coverHideTimerRef.current = setTimeout(() => {
        setVideoCoverVisible(false);
      }, 120);

      return;
    }

    // while loading/buffering/idle -> keep cover on
    setVideoCoverVisible(true);
  }, [activeVideoUrl, isPlaying, status]);

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
      setVendorRow(null);
      return;
    }

    try {
      setMissingParam(false);
      setLoading(true);

      let q = supabase
        .from("products")
        .select(
          `
          id,
          vendor_id,
          product_code,
          title,
          inventory_qty,
          made_on_order,
          product_category,
          spec,
          price,
          media,
          created_at,
          updated_at,
          vendor:vendor_id (
            id,
            name,
            shop_name,
            address,
            mobile,
            landline,
            email,
            location,
            location_url,
            profile_image_path,
            banner_path,
            status,
            offers_tailoring
          )
        `
        );

      if (productId) q = q.eq("id", productId);
      else q = q.eq("product_code", productCode);

      const { data, error } = await q.single();

      if (error) {
        Alert.alert("Load error", error.message);
        setProduct(null);
        setVendorRow(null);
        return;
      }

      const row = data as ProductRow;
      setProduct(row);

      const v = (row as any)?.vendor ?? null;
      setVendorRow(v);

      if (v && (v as any).id != null) {
        const banner_url = resolvePublicUrl((v as any).banner_path ?? null);

        dispatch(
          setSelectedVendor({
            shop_name: (v as any).shop_name ?? null,
            owner_name: (v as any).name ?? null,
            mobile: (v as any).mobile ?? null,
            landline: (v as any).landline ?? null,
            address: (v as any).address ?? null,
            location_url: (v as any).location_url ?? null,
            banner_url: banner_url ?? null,
            government_permission_url: null,
            images: null,
            videos: null,
            status: (v as any).status ?? null
          } as any)
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load product.");
      setProduct(null);
      setVendorRow(null);
    } finally {
      setLoading(false);
    }
  }

  const resolveNamesByIds = useCallback(async (table: string, ids: string[]): Promise<string[]> => {
    const clean = ids.map((x) => String(x).trim()).filter(Boolean);
    if (!clean.length) return [];

    const { data, error } = await supabase.from(table).select("id, name").in("id", clean);
    if (error || !data) return [];

    const map = new Map<string, string>();
    for (const r of data as any[]) {
      const id = String(r?.id ?? "").trim();
      const name = String(r?.name ?? "").trim();
      if (id && name) map.set(id, name);
    }

    return clean.map((id) => map.get(id) ?? id);
  }, []);

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

      const dressTypeIds = normalizeIdList(spec?.dressTypeIds ?? spec?.dressTypes ?? []);
      const fabricTypeIds = normalizeIdList(spec?.fabricTypeIds ?? spec?.fabricTypes ?? []);
      const workTypeIds = normalizeIdList(spec?.workTypeIds ?? spec?.workTypes ?? []);
      const densityIds = normalizeIdList(spec?.workDensityIds ?? spec?.workDensities ?? []);
      const originIds = normalizeIdList(spec?.originCityIds ?? spec?.originCities ?? []);
      const wearIds = normalizeIdList(spec?.wearStateIds ?? spec?.wearStates ?? []);
      const colorIds = normalizeIdList(spec?.colorShadeIds ?? spec?.colorShades ?? []);

      try {
        const [dressType, fabric, work, density, origin, wear] = await Promise.all([
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
    thumbUrls.forEach((u) => u && Image.prefetch(u));
  }, [imageUrls, thumbUrls]);

  const ChipRow = ({ title, items }: { title: string; items: any }) => {
    const list = useMemo(() => normalizeLabelList(items), [items]);
    if (!list.length) return null;

    return (
      <View style={{ marginTop: 10 }}>
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

  const priceTotalForParams = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const mode = String(price?.mode ?? "");
    if (mode === "unstitched_per_meter") {
      const v = price?.cost_pkr_per_meter;
      return v ? String(v) : "";
    }
    const t = price?.cost_pkr_total;
    return t ? String(t) : "";
  }, [product]);

  const sizeText = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const sizes = Array.isArray(price?.available_sizes) ? price.available_sizes : [];
    return sizes.length ? sizes.join(", ") : "—";
  }, [product]);

  const inventoryText = useMemo(() => {
    const made =
      Boolean((product as any)?.made_on_order) || Boolean((product as any)?.spec?.made_on_order);

    if (made) return "Made on order";

    const n = Number((product as any)?.inventory_qty ?? 0);
    if (!Number.isFinite(n)) return "—";
    return String(n);
  }, [product]);

  const moreDescriptionText = useMemo(() => {
    const spec = (product as any)?.spec ?? {};
    return safeText(spec?.more_description ?? "");
  }, [product]);

  const isVendorSelf = useMemo(() => {
    if (isBuyerRoute) return false;
    if (!vendorId) return false;
    if (!product?.vendor_id) return false;
    return String(product.vendor_id) === String(vendorId);
  }, [isBuyerRoute, vendorId, product?.vendor_id]);

  const showBuyerActions = isBuyerRoute ? true : !isVendorSelf;

  const productCategory = useMemo<ProductCategory | null>(() => {
    const fromDb = (product as any)?.product_category;
    if (isProductCategory(fromDb)) return fromDb;

    const fromSpec = (product as any)?.spec?.product_category;
    if (isProductCategory(fromSpec)) return fromSpec;

    return null;
  }, [product]);

  const isUnstitched = useMemo(() => {
    if (productCategory) return productCategory !== "stitched_ready";
    const price = (product as any)?.price ?? {};
    return String(price?.mode ?? "") === "unstitched_per_meter";
  }, [product, productCategory]);

  const showDyeing = useMemo(() => {
    if (!product) return false;
    if (!isUnstitched) return false;

    if (productCategory) {
      return (
        productCategory === "unstitched_dyeing" || productCategory === "unstitched_dyeing_tailoring"
      );
    }

    const spec = (product as any)?.spec ?? {};
    return Boolean(spec?.dyeing_enabled);
  }, [product, isUnstitched, productCategory]);

  const dyeingCostPkr = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const spec = (product as any)?.spec ?? {};

    const raw =
      price?.dyeing_cost_pkr ??
      price?.dyeingCostPkr ??
      spec?.dyeing_cost_pkr ??
      spec?.dyeingCostPkr ??
      spec?.dyeing_cost ??
      spec?.dyeingCost ??
      0;

    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }, [product]);

  const vendorOffersTailoring = useMemo(() => {
    return Boolean((vendorRow as any)?.offers_tailoring);
  }, [vendorRow]);

  const productTailoringEnabled = useMemo(() => {
    if (productCategory) return productCategory === "unstitched_dyeing_tailoring";
    const spec = (product as any)?.spec ?? {};
    return Boolean(spec?.tailoring_enabled);
  }, [product, productCategory]);

  const tailoringCostPkr = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const spec = (product as any)?.spec ?? {};

    const raw =
      price?.tailoring_cost_pkr ??
      price?.tailoringCostPkr ??
      spec?.tailoring_cost_pkr ??
      spec?.tailoringCostPkr ??
      spec?.tailoring_cost ??
      spec?.tailoringCost ??
      0;

    return safeInt0(raw);
  }, [product]);

  const tailoringTurnaroundDays = useMemo(() => {
    const spec = (product as any)?.spec ?? {};
    return safeInt0(spec?.tailoring_turnaround_days ?? 0);
  }, [product]);

  const tailoringEligible = useMemo(() => {
    return (
      Boolean(product) &&
      vendorOffersTailoring &&
      isUnstitched &&
      productTailoringEnabled &&
      tailoringCostPkr > 0
    );
  }, [product, vendorOffersTailoring, isUnstitched, productTailoringEnabled, tailoringCostPkr]);

  useEffect(() => {
    if (!tailoringEligible && buyerWantsTailoring) setBuyerWantsTailoring(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailoringEligible]);

  const showTailoringSection = useMemo(() => {
    return Boolean(product) && showBuyerActions && isUnstitched;
  }, [product, showBuyerActions, isUnstitched]);

  const categoryText = useMemo(() => {
    if (productCategory === "stitched_ready") return "Stitched / Ready-to-wear";
    if (productCategory === "unstitched_dyeing_tailoring") return "Unstitched + Dyeing + Tailoring";
    if (productCategory === "unstitched_dyeing") return "Unstitched + Dyeing";
    if (productCategory === "unstitched_plain") return "Unstitched (Plain)";

    if (isUnstitched) return showDyeing ? "Unstitched + Dyeable" : "Unstitched";
    return "Stitched / Ready-to-wear";
  }, [productCategory, isUnstitched, showDyeing]);

  const onOpenDyeing = useCallback(() => {
    if (!product) return;

    router.setParams({ dyeing_selected: "1" } as any);

    router.push({
      pathname: isBuyerRoute
        ? "/(buyer)/dye_palette_modal"
        : "/vendor/profile/(product-modals)/dyeing/dye_palette_modal",
      params: {
        returnPath: isBuyerRoute ? "/(buyer)/view-product" : "/vendor/profile/view-product",
        productId: String(product.id),
        productCode: String(product.product_code || ""),
        dyeing_selected: "1",
        dye_shade_id: selectedDyeShadeId || "",
        dye_hex: selectedDyeHex || "",
        dye_label: selectedDyeLabel || ""
      }
    });
  }, [router, product, isBuyerRoute, selectedDyeShadeId, selectedDyeHex, selectedDyeLabel]);

  const onPurchase = useCallback(() => {
    if (!product) return;

    const imageUrl = imageUrls.length ? imageUrls[0] : "";

    router.push({
      pathname: "/purchase/size",
      params: {
        returnTo: "/purchase/place-order",
        productId: String(product.id),
        productCode: String(product.product_code || ""),
        productName: String(product.title || ""),
        product_category: productCategory ? String(productCategory) : "",
        currency: "PKR",
        price: priceTotalForParams,
        imageUrl,
        dye_shade_id:
          buyerWantsDyeing && selectedDyeShadeId ? encodeURIComponent(selectedDyeShadeId) : "",
        dye_hex: buyerWantsDyeing && selectedDyeHex ? encodeURIComponent(selectedDyeHex) : "",
        dye_label: buyerWantsDyeing && selectedDyeLabel ? encodeURIComponent(selectedDyeLabel) : "",
        dyeing_cost_pkr:
          showDyeing && buyerWantsDyeing ? encodeURIComponent(String(dyeingCostPkr)) : "",
        tailoring_available: tailoringEligible ? "1" : "0",
        tailoring_cost_pkr: tailoringEligible ? encodeURIComponent(String(tailoringCostPkr)) : "",
        tailoring_turnaround_days: tailoringEligible
          ? encodeURIComponent(String(tailoringTurnaroundDays))
          : "",
        tailoring_selected: tailoringEligible && buyerWantsTailoring ? "1" : "0"
      }
    });
  }, [
    router,
    product,
    imageUrls,
    productCategory,
    priceTotalForParams,
    buyerWantsDyeing,
    selectedDyeShadeId,
    selectedDyeHex,
    selectedDyeLabel,
    showDyeing,
    dyeingCostPkr,
    tailoringEligible,
    tailoringCostPkr,
    tailoringTurnaroundDays,
    buyerWantsTailoring
  ]);

  const onViewVendorProfile = useCallback(() => {
    const vId = (vendorRow as any)?.id ?? null;
    if (!vId) {
      Alert.alert("Vendor not found", "This product has no vendor attached.");
      return;
    }

    router.push({
      pathname: "/(buyer)/view-profile",
      params: { vendorId: String(vId) }
    });
  }, [router, vendorRow]);

  const purchaseDisabled = !product || loading || missingParam;

  const CompactLine = ({ text }: { text: string | null }) => {
    if (!text) return null;
    return (
      <Text style={styles.compactLine} numberOfLines={2}>
        {text}
      </Text>
    );
  };

  const titleLine = useMemo(() => compactLineValue(product?.title), [product?.title]);

  const categoryLine = useMemo(() => {
    const s = compactLineValue(categoryText);
    return s ? s : null;
  }, [categoryText]);

  const inventoryLine = useMemo(() => {
    const s = compactLineValue(inventoryText);
    if (!s) return null;
    if (s === "Made on order") return s;
    return `Qty: ${s}`;
  }, [inventoryText]);

  const priceLine = useMemo(() => {
    const s = compactLineValue(priceText);
    return s ? s : null;
  }, [priceText]);

  const sizesLine = useMemo(() => {
    const s = compactLineValue(sizeText);
    if (!s || s === "—") return null;
    return `Sizes: ${s}`;
  }, [sizeText]);

  const uploadedDate = useMemo(() => formatDateOnly(product?.created_at), [product?.created_at]);
  const modifiedDate = useMemo(() => formatDateOnly(product?.updated_at), [product?.updated_at]);

  const isVideoSelected = useMemo(() => {
    return selectedMedia?.kind === "video" && selectedMedia?.url === activeVideoUrl;
  }, [selectedMedia, activeVideoUrl]);

  const activeViewerItem = useMemo(() => mediaItems[mediaViewerIndex], [mediaItems, mediaViewerIndex]);
  const activeViewerIsVideo = useMemo(
    () => activeViewerItem?.kind === "video" && activeViewerItem?.url === activeVideoUrl,
    [activeViewerItem, activeVideoUrl]
  );

  const onSelectMedia = useCallback(
    (idx: number) => {
      const item = mediaItems[idx];
      if (!item) return;

      setSelectedMediaIndex(idx);

      if (item.kind === "video") {
        setActiveVideoUrl(item.url);
        setVideoCoverVisible(true);
      }

      openMediaViewerAt(idx);
    },
    [mediaItems, openMediaViewerAt]
  );

  const onTogglePlayPause = useCallback(() => {
    showControlsBriefly();
    try {
      const playing = Boolean((player as any)?.playing);
      if (playing) (player as any)?.pause?.();
      else (player as any)?.play?.();
    } catch {
      // ignore
    }
  }, [player, showControlsBriefly]);

  const Hero = useMemo(() => {
    if (!selectedMedia) return null;

    if (selectedMedia.kind === "video") {
      const thumb = selectedMedia.thumbUrl ?? null;

      return (
        <View style={styles.heroWrap}>
          <View style={styles.heroVideoBox}>
            {/* video renders only when this selected video is the active source */}
            {isVideoSelected ? (
              <VideoView player={player} style={styles.heroVideo} nativeControls={false} />
            ) : null}

            {/* cover (thumb) stays until playback actually begins; eliminates black flash */}
            {thumb && (videoCoverVisible || !isVideoSelected) ? (
              <Image source={{ uri: thumb }} style={styles.heroCover} />
            ) : null}

            {videoControlsVisible ? (
              <Pressable onPress={onTogglePlayPause} style={styles.videoControlsOverlay}>
                <View style={styles.videoControlPill}>
                  <Text style={styles.videoControlText}>⏯</Text>
                </View>
              </Pressable>
            ) : null}

            {/* ✅ tap layer ABOVE video:
                - shows controls on tap
                - opens viewer on double-intent? (we keep single tap to show controls; tap again still works)
                - fixes: controls sometimes not appearing due to nested pressables */}
            <Pressable
              onPress={() => showControlsBriefly()}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* tap anywhere opens viewer (kept as in your design, but moved to separate button below) */}
          <Pressable
            onPress={() => openMediaViewerAt(selectedMediaIndex)}
            style={styles.heroOpenViewerBtn}
          >
            <Text style={styles.heroOpenViewerText}>Open</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => openMediaViewerAt(selectedMediaIndex)}
        style={({ pressed }) => [styles.heroWrap, pressed ? styles.pressed : null]}
      >
        <Image source={{ uri: selectedMedia.url }} style={styles.heroImage} />
      </Pressable>
    );
  }, [
    selectedMedia,
    player,
    isVideoSelected,
    videoCoverVisible,
    videoControlsVisible,
    showControlsBriefly,
    onTogglePlayPause,
    openMediaViewerAt,
    selectedMediaIndex
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + (showBuyerActions ? FOOTER_H : 0) }
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Product</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
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
          </View>
        ) : null}

        {!!loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading product...</Text>
          </View>
        )}

        {!!vendorId && !!product?.vendor_id && String(product.vendor_id) !== String(vendorId) ? (
          <Text style={styles.warn}>
            Note: This product belongs to a different vendor_id than the current vendor session.
          </Text>
        ) : null}

        {mediaItems.length ? (
          <View style={styles.mediaBlock}>
            {Hero}

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.thumbRow}>
                {mediaItems.map((it, idx) => {
                  const isOn = idx === selectedMediaIndex;

                  if (it.kind === "image") {
                    return (
                      <Pressable
                        key={`${it.kind}-${it.url}-${idx}`}
                        onPress={() => onSelectMedia(idx)}
                        style={({ pressed }) => [
                          styles.thumbWrap,
                          isOn ? styles.thumbOn : null,
                          pressed ? styles.pressed : null
                        ]}
                      >
                        <Image source={{ uri: it.url }} style={styles.thumb} />
                      </Pressable>
                    );
                  }

                  return (
                    <Pressable
                      key={`${it.kind}-${it.url}-${idx}`}
                      onPress={() => onSelectMedia(idx)}
                      onLongPress={() => openExternal(it.url)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        isOn ? styles.thumbOn : null,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      {it.thumbUrl ? (
                        <Image source={{ uri: it.thumbUrl }} style={styles.thumb} />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderText}>Video</Text>
                        </View>
                      )}
                      <View style={styles.playBadge}>
                        <Text style={styles.playBadgeText}>▶</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.compactBlock}>
          <CompactLine text={titleLine} />
          <CompactLine text={categoryLine} />
          <CompactLine text={priceLine} />
          <CompactLine text={sizesLine} />
          <CompactLine text={inventoryLine} />

          {showTailoringSection ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Do you want stitching?</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <Pressable
                  onPress={() => {
                    if (!tailoringEligible) {
                      Alert.alert(
                        "Stitching not available",
                        "This product is not eligible for stitching."
                      );
                      return;
                    }
                    setBuyerWantsTailoring(true);
                  }}
                  style={({ pressed }) => [
                    styles.linkBtnInline,
                    buyerWantsTailoring ? { borderColor: stylesVars.blue } : null,
                    !tailoringEligible ? { opacity: 0.5 } : null,
                    pressed ? styles.pressed : null
                  ]}
                >
                  <Text style={styles.linkText}>
                    Yes{tailoringEligible ? ` • +PKR ${tailoringCostPkr}` : ""}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setBuyerWantsTailoring(false)}
                  style={({ pressed }) => [
                    styles.linkBtnInline,
                    !buyerWantsTailoring ? { borderColor: stylesVars.blue } : null,
                    pressed ? styles.pressed : null
                  ]}
                >
                  <Text style={styles.linkText}>No</Text>
                </Pressable>
              </View>

              {!tailoringEligible ? (
                <Text style={[styles.meta, { marginTop: 6 }]}>
                  Stitching is not available for this product.
                </Text>
              ) : null}
            </View>
          ) : null}

          {showBuyerActions && showDyeing ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Do you want dyeing?</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <Pressable
                  onPress={() => {
                    setBuyerWantsDyeing(true);
                    onOpenDyeing();
                  }}
                  style={({ pressed }) => [
                    styles.linkBtnInline,
                    buyerWantsDyeing ? { borderColor: stylesVars.blue } : null,
                    pressed ? styles.pressed : null
                  ]}
                >
                  <Text style={styles.linkText}>Yes • +PKR {dyeingCostPkr}</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setBuyerWantsDyeing(false);
                    setSelectedDyeShadeId("");
                    setSelectedDyeHex("");
                    setSelectedDyeLabel("");

                    router.setParams({
                      dyeing_selected: "0",
                      dye_shade_id: undefined,
                      dye_hex: undefined,
                      dye_label: undefined
                    } as any);
                  }}
                  style={({ pressed }) => [
                    styles.linkBtnInline,
                    !buyerWantsDyeing ? { borderColor: stylesVars.blue } : null,
                    pressed ? styles.pressed : null
                  ]}
                >
                  <Text style={styles.linkText}>No</Text>
                </Pressable>
              </View>

              {buyerWantsDyeing && selectedDyeHex ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.label}>Selected Colour</Text>

                  <View
                    style={{
                      marginTop: 8,
                      width: 60,
                      height: 60,
                      borderRadius: 14,
                      backgroundColor: selectedDyeHex,
                      borderWidth: 1,
                      borderColor: "#CBD5E1"
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product Description</Text>

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

          {safeText((product as any)?.spec?.more_description ?? "").trim() !== "—" ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.specTitle}>More Description</Text>
              <Text style={styles.moreDescText}>{moreDescriptionText}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meta</Text>
          {uploadedDate ? <Text style={styles.metaLine}>Date uploaded: {uploadedDate}</Text> : null}
          {modifiedDate ? <Text style={styles.metaLine}>Date modified: {modifiedDate}</Text> : null}
        </View>
      </ScrollView>

      {showBuyerActions && (vendorRow as any)?.id != null ? (
        <Pressable
          onPress={onViewVendorProfile}
          style={({ pressed }) => [styles.fabVendor, pressed ? styles.pressed : null]}
        >
          <Text style={styles.fabVendorText}>View Vendor</Text>
        </Pressable>
      ) : null}

      {showBuyerActions ? (
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle} numberOfLines={1}>
              {safeText(product?.title)}
            </Text>
            <Text style={styles.footerSub} numberOfLines={1}>
              {safeText(priceText)}
            </Text>
          </View>

          <Pressable
            onPress={onPurchase}
            disabled={purchaseDisabled}
            style={({ pressed }) => [
              styles.footerBtn,
              purchaseDisabled ? styles.footerBtnDisabled : null,
              pressed && !purchaseDisabled ? styles.pressed : null
            ]}
          >
            <Text style={styles.footerBtnText}>Purchase</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={mediaViewerVisible}
        transparent={false}
        onRequestClose={() => setMediaViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <FlatList
            ref={mediaViewerRef}
            data={mediaItems}
            horizontal
            pagingEnabled
            keyExtractor={(it, i) => `${it.kind}-${it.url}-${i}`}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={Math.max(
              0,
              Math.min(mediaViewerIndex, Math.max(0, mediaItems.length - 1))
            )}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              setMediaViewerIndex(next);

              const item = mediaItems[next];
              if (item?.kind === "video") {
                setActiveVideoUrl(item.url);
                setVideoCoverVisible(true);
              } else {
                // keep player; it just won't be visible for images
              }
            }}
            renderItem={({ item, index }) => {
              if (item.kind === "video") {
                const isActive = index === mediaViewerIndex && activeViewerIsVideo;
                const thumb = item.thumbUrl ?? null;

                return (
                  <View style={styles.viewerPage}>
                    {isActive ? (
                      <VideoView player={player} style={styles.viewerVideo} nativeControls={false} />
                    ) : null}

                    {/* cover stays until playing to avoid black flick */}
                    {thumb && (!isActive || videoCoverVisible) ? (
                      <Image source={{ uri: thumb }} style={styles.viewerCover} />
                    ) : null}

                    {videoControlsVisible && isActive ? (
                      <Pressable onPress={onTogglePlayPause} style={styles.videoControlsOverlay}>
                        <View style={styles.videoControlPill}>
                          <Text style={styles.videoControlText}>⏯</Text>
                        </View>
                      </Pressable>
                    ) : null}

                    {/* ✅ tap layer ABOVE the video inside viewer (fixes: controls not appearing) */}
                    <Pressable
                      onPress={() => showControlsBriefly()}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                );
              }

              return <Image source={{ uri: item.url }} style={styles.viewerImage} />;
            }}
          />

          <Pressable style={styles.closeButton} onPress={() => setMediaViewerVisible(false)}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <View style={styles.indexCaption}>
            <Text style={styles.indexText}>
              {mediaItems.length ? mediaViewerIndex + 1 : 0} / {mediaItems.length}
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
  blue: "#3e6292",
  blueSoft: "#EAF2FF",
  text: "#111111",
  subText: "#60708A",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5"
};

const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: stylesVars.bg },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: { fontSize: 18, fontWeight: "900", color: stylesVars.blue },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  linkBtnInline: {
    marginTop: 10,
    alignSelf: "flex-start",
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.3
  },

  meta: {
    marginTop: 6,
    fontSize: 12,
    color: stylesVars.subText,
    fontWeight: "800"
  },

  compactBlock: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 12
  },
  compactLine: {
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.text,
    lineHeight: 16,
    marginTop: 4
  },
  metaLine: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.subText
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.2
  },

  mediaBlock: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff",
    overflow: "hidden"
  },
  heroWrap: { width: "100%", backgroundColor: "#fff" },
  heroImage: { width: "100%", height: 230, resizeMode: "cover", backgroundColor: "#f3f3f3" },

  heroVideoBox: {
    width: "100%",
    height: 230,
    backgroundColor: "#000"
  },
  heroVideo: { width: "100%", height: "100%" },
  heroCover: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },

  heroOpenViewerBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(11,47,107,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  heroOpenViewerText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  thumbRow: { flexDirection: "row", gap: 10, padding: 10 },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#fff"
  },
  thumbOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2
  },
  thumb: { width: "100%", height: "100%", backgroundColor: "#f3f3f3" },

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

  videoControlsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  videoControlPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)"
  },
  videoControlText: { color: "#fff", fontWeight: "900", fontSize: 18 },

  specTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.3
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

  moreDescText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.text,
    opacity: 0.9,
    lineHeight: 18
  },

  fabVendor: {
    position: "absolute",
    top: 56,
    right: 14,
    zIndex: 30,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.dangerSoft,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder
  },
  fabVendorText: { color: stylesVars.danger, fontWeight: "900" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: FOOTER_H,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  footerTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.text },
  footerSub: { marginTop: 4, fontSize: 12, fontWeight: "800", color: stylesVars.subText },

  footerBtn: {
    backgroundColor: stylesVars.blue,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  footerBtnDisabled: { opacity: 0.5 },
  footerBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center"
  },
  viewerPage: { width, height: "100%", backgroundColor: "#000" },
  viewerImage: { width, height: "100%", resizeMode: "contain" },
  viewerVideo: { width: "100%", height: "100%" },
  viewerCover: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    backgroundColor: "#000"
  },

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