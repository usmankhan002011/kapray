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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");
const FOOTER_H = 86;

// Assumed lookup table names (adjust if your Supabase uses different names)
const LOOKUP = {
  dressTypes: "dress_types",
  fabricTypes: "fabric_types",
  workTypes: "work_types",
  workDensities: "work_densities",
  originCities: "origin_cities",
  wearStates: "wear_states"
} as const;

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
};

type ProductRow = {
  id: string;
  vendor_id: string | number;
  product_code: string;
  title: string;
  inventory_qty: number;

  // ✅ NEW DB column
  made_on_order?: boolean;

  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;

  // join alias
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
  // Defensive: strip any accidental "?..." so bigint/id stays clean
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

export default function ViewProductScreen() {
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  // buyer route is a re-export that still renders this component
const isBuyerRoute = useMemo(() => {
  const segs = segments as unknown as string[];
  return segs.includes("(buyer)");
}, [segments]);
  // (Optional) current vendor session id (safe)
  const vendorId =
    useAppSelector((s: any) => s?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.id ?? null) ??
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null);

  // Accept either ?id=uuid OR ?code=V15-P0010 (also tolerate product_id/product_code)
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

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [vendorRow, setVendorRow] = useState<VendorRow | null>(null);
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

  // ✅ Dye selection returned from palette modal (buyer chooses)
  const [selectedDyeShadeId, setSelectedDyeShadeId] = useState<string>("");
  const [selectedDyeHex, setSelectedDyeHex] = useState<string>("");
  const [selectedDyeLabel, setSelectedDyeLabel] = useState<string>("");

  useEffect(() => {
    const rawId = firstParam((params as any)?.dye_shade_id ?? null);
    const rawHex = firstParam((params as any)?.dye_hex ?? null);
    const rawLabel = firstParam((params as any)?.dye_label ?? null);

    const id = rawId ? safeDecode(rawId) : "";
    const hex = rawHex ? safeDecode(rawHex) : "";
    const label = rawLabel ? safeDecode(rawLabel) : "";

    if (id) setSelectedDyeShadeId(id);
    if (hex) setSelectedDyeHex(hex);

    // ✅ If label not provided by modal, show the actual selected color (hex) instead of only shade id
    if (label) setSelectedDyeLabel(label);
    else if (hex) setSelectedDyeLabel(hex);

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
        flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
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
      setVendorRow(null);
      return;
    }

    try {
      setMissingParam(false);
      setLoading(true);

      // IMPORTANT: include vendor join so we can store vendor details in redux
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
            status
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

      // Push vendor details into redux so purchase flow can access it reliably.
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

  // resolve ids -> names (Dress Type etc.)
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

  const videoTiles = useMemo(() => {
    return videoUrls.map((v, idx) => ({
      videoUrl: v,
      thumbUrl: thumbUrls[idx] ?? null,
      idx
    }));
  }, [videoUrls, thumbUrls]);

  // ✅ Detect if current viewer is the product's own vendor
  const isVendorSelf = useMemo(() => {
    if (!vendorId) return false;
    if (!product?.vendor_id) return false;
    return String(product.vendor_id) === String(vendorId);
  }, [vendorId, product?.vendor_id]);

  // ✅ Only show Vendor card + View button + Purchase button for non-vendor viewers
  const showBuyerActions = !isVendorSelf;

  // ✅ Dyeing option: only if Unstitched + Dyeing enabled by vendor
  const showDyeing = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const spec = (product as any)?.spec ?? {};
    const isUnstitched = String(price?.mode ?? "") === "unstitched_per_meter";
    const enabled = Boolean(spec?.dyeing_enabled);
    return Boolean(product) && isUnstitched && enabled;
  }, [product]);

  // ✅ Dyeing cost (from vendor) - tolerant to aliases but primary is spec.dyeing_cost_pkr
  const dyeingCostPkr = useMemo(() => {
  const price = (product as any)?.price ?? {};
  const spec = (product as any)?.spec ?? {};

  const raw =
    price?.dyeing_cost_pkr ??
    price?.dyeingCostPkr ??
    spec?.dyeing_cost_pkr ?? // fallback only (old data)
    spec?.dyeingCostPkr ??
    spec?.dyeing_cost ??
    spec?.dyeingCost ??
    0;

  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}, [product]);

  // ✅ Category shown in product view
  const categoryText = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const mode = String(price?.mode ?? "");

    if (mode === "unstitched_per_meter") {
      return showDyeing ? "Unstitched + Dyeable" : "Unstitched";
    }

    return "Stitched / Ready-to-wear";
  }, [product, showDyeing]);

  const onOpenDyeing = useCallback(() => {
    if (!product) return;

    router.push({
      pathname: "/vendor/profile/(product-modals)/dyeing/dye_palette_modal",
      params: {
        returnPath: isBuyerRoute ? "/(buyer)/view-product" : "/vendor/profile/view-product",
        productId: String(product.id),

        productCode: String(product.product_code || ""),

        dye_shade_id: selectedDyeShadeId || "",
        dye_label: selectedDyeLabel || ""
      }
    });
  }, [router, product, isBuyerRoute, selectedDyeShadeId, selectedDyeLabel]);

  // start purchase flow
  const onPurchase = useCallback(() => {
    if (!product) return;

    // pick best image to show during checkout
    const imageUrl = bannerUrl || (imageUrls.length ? imageUrls[0] : "");

    router.push({
      pathname: "/purchase/size",
      params: {
        returnTo: "/purchase/place-order",

        // product params forwarded
        productId: String(product.id),
        productCode: String(product.product_code || ""),
        productName: String(product.title || ""),
        currency: "PKR",
        price: priceTotalForParams,
        imageUrl,

        // ✅ dye selection forwarded (buyer choice)
        dye_shade_id: selectedDyeShadeId ? encodeURIComponent(selectedDyeShadeId) : "",
        dye_hex: selectedDyeHex ? encodeURIComponent(selectedDyeHex) : "",
        dye_label: selectedDyeLabel ? encodeURIComponent(selectedDyeLabel) : "",

        // ✅ dyeing cost forwarded (vendor-set)
        dyeing_cost_pkr: showDyeing ? encodeURIComponent(String(dyeingCostPkr)) : ""
      }
    });
  }, [
    router,
    product,
    bannerUrl,
    imageUrls,
    priceTotalForParams,
    selectedDyeShadeId,
    selectedDyeHex,
    selectedDyeLabel,
    showDyeing,
    dyeingCostPkr
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

  return (
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + (showBuyerActions ? FOOTER_H : 0) }
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Product Details</Text>
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

        {!!bannerUrl && (
          <Pressable
            onPress={() => openViewerAt(0)}
            style={({ pressed }) => [styles.bannerWrap, pressed ? styles.pressed : null]}
          >
            <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          </Pressable>
        )}

        {/* ✅ Vendor card (ONLY for non-vendor viewers) */}
        {showBuyerActions ? (
          <View style={styles.card}>
            <View style={styles.vendorHeaderRow}>
              <Text style={styles.sectionTitle}>Vendor</Text>

              <Pressable
                onPress={onViewVendorProfile}
                style={({ pressed }) => [styles.viewBtn, pressed ? styles.pressed : null]}
              >
                <Text style={styles.viewBtnText}>View</Text>
              </Pressable>
            </View>

            {/* ✅ Vendor Name above + Shop Name below */}
            <Field label="Vendor Name" value={vendorRow?.name ?? "—"} />
            <Field label="Shop Name" value={vendorRow?.shop_name ?? "—"} />

            <Field label="Mobile" value={vendorRow?.mobile ?? "—"} />
            <Field label="Address" value={vendorRow?.address ?? "—"} />

            {/* ✅ removed location / open location button */}
          </View>
        ) : null}

        <View style={styles.card}>
          <Field label="Product Code" value={product?.product_code} />
          <Field label="Title" value={product?.title} />
          <Field label="Category" value={categoryText} />
          <Field label="Inventory Qty" value={inventoryText} />
          <Field label="Price" value={priceText} />
          <Field label="Available Sizes" value={sizeText} />

          {/* ✅ Dyeing: only if Unstitched + Dyeing enabled */}
          {showBuyerActions && showDyeing ? (
            <Pressable
              onPress={onOpenDyeing}
              style={({ pressed }) => [styles.linkBtnInline, pressed ? styles.pressed : null]}
            >
              <Text style={styles.linkText}>
                {selectedDyeShadeId || selectedDyeHex
                  ? `Dyeing (Change Shade) • +PKR ${dyeingCostPkr}`
                  : `Dyeing (Select Shade) • +PKR ${dyeingCostPkr}`}
              </Text>
            </Pressable>
          ) : null}

          {/* {showBuyerActions && showDyeing ? (
            <View style={{ marginTop: 10 }}>
              <Field label="Dyeing Cost" value={`PKR ${dyeingCostPkr}`} />
            </View>
          ) : null} */}

          {showBuyerActions && showDyeing && selectedDyeHex ? (
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

          {/* ✅ NEW: free text description from Add Product */}
          {safeText((product as any)?.spec?.more_description ?? "").trim() !== "—" ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.specTitle}>More Description</Text>
              <Text style={styles.moreDescText}>{moreDescriptionText}</Text>
            </View>
          ) : null}
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
                      style={({ pressed }) => [styles.thumbWrap, pressed ? styles.pressed : null]}
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

              <Text style={styles.meta}>Tap a thumbnail to play. Long-press to open externally.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.hRow}>
                  {videoTiles.map((t) => (
                    <Pressable
                      key={`${t.videoUrl}-${t.idx}`}
                      onPress={() => setSelectedVideoUrl(t.videoUrl)}
                      onLongPress={() => openExternal(t.videoUrl)}
                      style={({ pressed }) => [
                        styles.thumbWrap,
                        selectedVideoUrl === t.videoUrl ? styles.videoThumbOn : null,
                        pressed ? styles.pressed : null
                      ]}
                    >
                      {t.thumbUrl ? (
                        <Image source={{ uri: t.thumbUrl }} style={styles.thumb} />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderText}>Video {t.idx + 1}</Text>
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

      {/* ✅ Sticky Purchase footer (ONLY for non-vendor viewers) */}
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

      {/* Fullscreen Viewer (images only) */}
      <Modal visible={viewerVisible} transparent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerContainer}>
          <FlatList
            ref={flatListRef}
            data={gallery}
            horizontal
            pagingEnabled
            keyExtractor={(_, i) => i.toString()}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={Math.max(0, Math.min(currentIndex, Math.max(0, gallery.length - 1)))}
            onScrollToIndexFailed={() => {
              // ignore
            }}
            onMomentumScrollEnd={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / width) || 0;
              setCurrentIndex(next);
            }}
            renderItem={({ item }) => <Image source={{ uri: item }} style={styles.viewerImage} />}
          />

          <Pressable style={styles.closeButton} onPress={() => setViewerVisible(false)}>
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
  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

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

  // ✅ NEW: more description text style
  moreDescText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: stylesVars.text,
    opacity: 0.9,
    lineHeight: 18
  },

  // ✅ Vendor header + View button top-right
  vendorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  viewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: stylesVars.dangerSoft,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder
  },
  viewBtnText: { color: stylesVars.danger, fontWeight: "900" },

  // ✅ Sticky footer
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