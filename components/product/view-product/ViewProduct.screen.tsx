// File: components/product/view-product/ViewProduct.screen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, useSegments } from "expo-router";

import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";
import { FooterBar, MediaBlock, useProductMedia } from "./ViewProduct.media";
import { makeViewProductStyles, stylesVars } from "./ViewProduct.styles";
import ViewProductTailoringSelection, {
  TailoringSelection,
} from "./ViewProduct.tailoring.selection";
import {
  normalizeTailoringPresetArray,
  safeInt0,
} from "./ViewProduct.tailoring.helpers";
import {
  clearCachedDyeSelection,
  getCachedDyeSelection,
} from "@/app/vendor/profile/(product-modals)/dyeing/dye_palette_modal";

const BUCKET_VENDOR = "vendor_images";
const { width } = Dimensions.get("window");
const FOOTER_H = 86;

// persist buyer choices across dye modal round-trips
const BUYER_TAILORING_CHOICE_CACHE = new Map<string, boolean>();
const BUYER_DYEING_CHOICE_CACHE = new Map<string, boolean>();

function makeChoiceKey(productId: number | null, productCode: string | null) {
  const pid = String(productId ?? "").trim();
  if (pid) return `id:${pid}`;

  const pc = String(productCode ?? "").trim();
  if (pc) return `code:${pc}`;

  return "";
}

const LOOKUP = {
  dressTypes: "dress_types",
  fabricTypes: "fabric_types",
  workTypes: "work_types",
  workDensities: "work_densities",
  originCities: "origin_cities",
  wearStates: "wear_states",
} as const;

type LookupTable = (typeof LOOKUP)[keyof typeof LOOKUP];

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type VendorRow = {
  id: number;
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
  exports_enabled?: boolean | null;
  export_regions?: string[] | null;
};

type ProductRow = {
  id: number;
  vendor_id: number;
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

function safeText(v: unknown) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function isHttpUrl(v: unknown) {
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

function normalizeLabelList(v: unknown): string[] {
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
      const obj = item as Record<string, unknown>;
      const s =
        String(
          obj.label ??
            obj.name ??
            obj.title ??
            obj.text ??
            obj.value ??
            obj.id ??
            "",
        ).trim() || "";

      if (s) out.push(s);
    }
  }

  return out;
}

function normalizeIdList(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  const out: string[] = [];

  for (const item of arr) {
    if (item == null) continue;
    const s = String(item).trim();
    if (s) out.push(s);
  }

  return out;
}

function safePositiveNumber(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function isProductCategory(v: unknown): v is ProductCategory {
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

  if (s === "1" || s === "true" || s === "yes" || s === "y" || s === "on") {
    return true;
  }
  if (s === "0" || s === "false" || s === "no" || s === "n" || s === "off") {
    return false;
  }

  return null;
}

function compactLineValue(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || s === "—") return null;
  return s;
}

function formatDateOnly(isoLike: unknown): string | null {
  const s = String(isoLike ?? "").trim();
  if (!s) return null;

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;

  return d.toISOString().slice(0, 10);
}

function formatSizeLengthMapLine(v: unknown): string | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;

  const obj = v as Record<string, unknown>;
  const order = ["XS", "S", "M", "L", "XL", "XXL"];

  const parts = order
    .map((key) => {
      const n = Number(obj[key]);
      if (!Number.isFinite(n) || n <= 0) return null;
      return `${key}: ${n} m`;
    })
    .filter(Boolean);

  return parts.length ? parts.join(" • ") : null;
}

function encodeJsonParam(v: unknown) {
  try {
    return encodeURIComponent(JSON.stringify(v ?? null));
  } catch {
    return "";
  }
}

export default function ViewProductScreen() {
  const { styles } = useMemo(() => makeViewProductStyles(width, FOOTER_H), []);
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const isBuyerRoute = useMemo(() => {
    const segs = segments as unknown as string[];
    return segs.includes("(buyer)") || segs.includes("flow");
  }, [segments]);

  const vendorIdFromVendor = useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorIdFromVendorSlice = useAppSelector((s: any) => s?.vendorSlice?.id ?? null);
  const vendorIdFromVendorSliceVendor = useAppSelector(
    (s: any) => s?.vendorSlice?.vendor?.id ?? null,
  );

  const vendorId =
    vendorIdFromVendor ??
    vendorIdFromVendorSlice ??
    vendorIdFromVendorSliceVendor;

  const productId = useMemo<number | null>(() => {
    const raw = firstParam((params as any)?.id ?? (params as any)?.product_id ?? null);
    if (!raw) return null;

    const decoded = safeDecode(raw);
    const cleaned = cleanIdParam(decoded);
    const n = Number(cleaned);

    return Number.isFinite(n) ? n : null;
  }, [params]);

  const productCode = useMemo<string | null>(() => {
    const raw = firstParam((params as any)?.code ?? (params as any)?.product_code ?? null);
    if (!raw) return null;
    return safeDecode(raw);
  }, [params]);

  const choiceKey = useMemo(
    () => makeChoiceKey(productId, productCode),
    [productId, productCode],
  );

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
    color: [],
  });

  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");

  const [videoCoverVisible, setVideoCoverVisible] = useState(true);
  const [videoControlsVisible, setVideoControlsVisible] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedDyeShadeId, setSelectedDyeShadeId] = useState("");
  const [selectedDyeHex, setSelectedDyeHex] = useState("");
  const [selectedDyeLabel, setSelectedDyeLabel] = useState("");

  const [buyerWantsTailoring, _setBuyerWantsTailoring] = useState(false);
  const [buyerWantsDyeing, _setBuyerWantsDyeing] = useState(false);

  const [tailoringSelection, setTailoringSelection] = useState<TailoringSelection | null>(null);

  const setBuyerWantsTailoring = useCallback(
    (next: boolean) => {
      _setBuyerWantsTailoring(next);
      if (choiceKey) {
        BUYER_TAILORING_CHOICE_CACHE.set(choiceKey, next);
      }
      if (!next) {
        setTailoringSelection(null);
      }
    },
    [choiceKey],
  );

  const setBuyerWantsDyeing = useCallback(
    (next: boolean) => {
      _setBuyerWantsDyeing(next);
      if (choiceKey) {
        BUYER_DYEING_CHOICE_CACHE.set(choiceKey, next);
      }
    },
    [choiceKey],
  );

  const showControlsBriefly = useCallback(() => {
    setVideoControlsVisible(true);

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = setTimeout(() => {
      setVideoControlsVisible(false);
    }, 1800);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  const resetBuyerSelections = useCallback(() => {
    _setBuyerWantsTailoring(false);
    _setBuyerWantsDyeing(false);
    setTailoringSelection(null);
    setSelectedDyeShadeId("");
    setSelectedDyeHex("");
    setSelectedDyeLabel("");

    if (choiceKey) {
      BUYER_TAILORING_CHOICE_CACHE.delete(choiceKey);
      BUYER_DYEING_CHOICE_CACHE.delete(choiceKey);
    }

    clearCachedDyeSelection(
      productId != null ? String(productId) : null,
      productCode ?? "",
    );

    router.setParams({
      dyeing_selected: "0",
      dye_shade_id: undefined,
      dye_hex: undefined,
      dye_label: undefined,
    } as any);
  }, [choiceKey, productId, productCode, router]);

  const exitBuyerToResults = useCallback(() => {
    resetBuyerSelections();
    router.replace("/(tabs)");
  }, [resetBuyerSelections, router]);

  useEffect(() => {
    if (!choiceKey) return;

    const cachedTailoring = BUYER_TAILORING_CHOICE_CACHE.get(choiceKey);
    if (typeof cachedTailoring === "boolean") {
      _setBuyerWantsTailoring(cachedTailoring);
    }

    const cachedDyeing = BUYER_DYEING_CHOICE_CACHE.get(choiceKey);
    if (typeof cachedDyeing === "boolean") {
      _setBuyerWantsDyeing(cachedDyeing);
    }
  }, [choiceKey]);

  useFocusEffect(
    useCallback(() => {
      const cachedShade = getCachedDyeSelection(
        productId != null ? String(productId) : null,
        productCode ?? "",
      );
      if (!cachedShade) return;

      setBuyerWantsDyeing(true);
      setSelectedDyeShadeId(String(cachedShade.id));
      setSelectedDyeHex(String(cachedShade.hex));
      setSelectedDyeLabel(String(cachedShade.label));
    }, [productId, productCode, setBuyerWantsDyeing]),
  );

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
  }, [params]);

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;

    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

  const resolveManyPublic = useCallback(
    (paths: unknown): string[] => {
      const list = Array.isArray(paths) ? paths : [];
      return list
        .map((p) => resolvePublicUrl(String(p || "").trim()))
        .filter(Boolean) as string[];
    },
    [resolvePublicUrl],
  );

  const productMediaState = useProductMedia({
    product,
    resolveManyPublic,
  });

  const imageUrls = Array.isArray(productMediaState?.imageUrls)
    ? productMediaState.imageUrls
    : [];

  const mediaItems = Array.isArray(productMediaState?.mediaItems)
    ? productMediaState.mediaItems
    : [];

  useEffect(() => {
    if (!mediaItems.length) {
      setActiveVideoUrl("");
      return;
    }

    const safeIdx = Math.max(0, Math.min(selectedMediaIndex, mediaItems.length - 1));
    const it = mediaItems[safeIdx];

    if (it?.kind === "video" && activeVideoUrl !== it.url) {
      setActiveVideoUrl(it.url);
      setVideoCoverVisible(true);
    }
  }, [mediaItems, selectedMediaIndex, activeVideoUrl]);

  const fetchProduct = useCallback(async () => {
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
        .select(`
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
            offers_tailoring,
            exports_enabled,
            export_regions
          )
        `);

      if (productId != null) {
        q = q.eq("id", productId);
      } else if (productCode) {
        q = q.eq("product_code", productCode);
      }

      const { data, error } = await q.single();

      if (error) {
        Alert.alert("Load error", error.message);
        setProduct(null);
        setVendorRow(null);
        return;
      }

      const row = data as unknown as ProductRow;
      setProduct(row);

      const v = (row as any)?.vendor ?? null;
      setVendorRow(v);

      if (v && (v as any).id != null) {
        const banner_url = resolvePublicUrl((v as any).banner_path ?? null);

        dispatch(
          setSelectedVendor({
            id: Number((v as any).id),
            shop_name: (v as any).shop_name ?? null,
            owner_name: (v as any).name ?? null,
            name: (v as any).name ?? null,
            mobile: (v as any).mobile ?? null,
            landline: (v as any).landline ?? null,
            email: (v as any).email ?? null,
            address: (v as any).address ?? null,
            location: (v as any).location ?? null,
            location_url: (v as any).location_url ?? null,
            profile_image_path: (v as any).profile_image_path ?? null,
            banner_path: (v as any).banner_path ?? null,
            banner_url: banner_url ?? null,
            offers_tailoring: (v as any).offers_tailoring ?? null,
            exports_enabled: (v as any).exports_enabled ?? false,
            export_regions: (v as any).export_regions ?? [],
            government_permission_url: null,
            images: null,
            videos: null,
            status: (v as any).status ?? null,
          }),
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load product.");
      setProduct(null);
      setVendorRow(null);
    } finally {
      setLoading(false);
    }
  }, [dispatch, productCode, productId, resolvePublicUrl]);

  const resolveNamesByIds = useCallback(
    async (table: LookupTable, ids: string[]): Promise<string[]> => {
      const clean = ids.map((x) => String(x).trim()).filter(Boolean);
      if (!clean.length) return [];

      const { data, error } = await (supabase as any)
        .from(table)
        .select("id, name")
        .in("id", clean);
      if (error || !data) return [];

      const map = new Map<string, string>();
      for (const r of data as any[]) {
        const id = String(r?.id ?? "").trim();
        const name = String(r?.name ?? "").trim();
        if (id && name) {
          map.set(id, name);
        }
      }

      return clean.map((id) => map.get(id) ?? id);
    },
    [],
  );

  const resolveColorNames = useCallback((ids: unknown): string[] => {
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
      black: "Black",
    };

    return list.map((id) => map[String(id).toLowerCase()] ?? String(id));
  }, []);

  useEffect(() => {
    let alive = true;

    void (async () => {
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
            color: [],
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
          resolveNamesByIds(LOOKUP.wearStates, wearIds),
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
          color,
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
          color: resolveColorNames(colorIds),
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [product, resolveColorNames, resolveNamesByIds]);

  useFocusEffect(
    useCallback(() => {
      void fetchProduct();
    }, [fetchProduct]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!isBuyerRoute) return;

      const onBackPress = () => {
        exitBuyerToResults();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [exitBuyerToResults, isBuyerRoute]),
  );

  const ChipRow = ({ title, items }: { title: string; items: unknown }) => {
    const list = useMemo(() => normalizeLabelList(items ?? []), [items]);
    if (!list.length) return null;

    return (
      <View style={styles.specRow}>
        <Text style={[styles.specLabel, { color: stylesVars.blue }]}>{title}:</Text>
        <Text style={styles.specValue}>{list.join(", ")}</Text>
      </View>
    );
  };

  const SelectPill = ({
    label,
    selected,
    disabled,
    onPress,
  }: {
    label: string;
    selected: boolean;
    disabled?: boolean;
    onPress: () => void;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.linkBtnInline,
          {
            minHeight: 24,
            paddingVertical: 4,
            paddingHorizontal: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: selected ? stylesVars.blue : "#D7E3FF",
            backgroundColor: selected ? stylesVars.blue : "#EEF4FF",
            opacity: disabled ? 0.5 : 1,
          },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          style={[
            styles.linkText,
            {
              fontSize: 10,
              fontWeight: "700",
              color: selected ? "#FFFFFF" : stylesVars.blue,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
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

  const pricePerMeterPkr = useMemo(() => {
    const price = (product as any)?.price ?? {};
    return safePositiveNumber(price?.cost_pkr_per_meter);
  }, [product]);

  const stitchedTotalPkr = useMemo(() => {
    const price = (product as any)?.price ?? {};
    return safePositiveNumber(price?.cost_pkr_total);
  }, [product]);

  const sizeText = useMemo(() => {
    const price = (product as any)?.price ?? {};
    const sizes = Array.isArray(price?.available_sizes) ? price.available_sizes : [];
    return sizes.length ? sizes.join(", ") : "—";
  }, [product]);

  const inventoryText = useMemo(() => {
    const made =
      Boolean((product as any)?.made_on_order) ||
      Boolean((product as any)?.spec?.made_on_order);

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
  }, [isBuyerRoute, product?.vendor_id, vendorId]);

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
    if (!product || !isUnstitched) return false;

    if (productCategory) {
      return (
        productCategory === "unstitched_dyeing" ||
        productCategory === "unstitched_dyeing_tailoring"
      );
    }

    const spec = (product as any)?.spec ?? {};
    return Boolean(spec?.dyeing_enabled);
  }, [isUnstitched, product, productCategory]);

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

  const vendorExportsEnabled = useMemo(() => {
    return Boolean((vendorRow as any)?.exports_enabled);
  }, [vendorRow]);

  const vendorExportRegions = useMemo(() => {
    return Array.isArray((vendorRow as any)?.export_regions)
      ? ((vendorRow as any)?.export_regions as string[])
      : [];
  }, [vendorRow]);

  const productTailoringEnabled = useMemo(() => {
    if (productCategory) {
      return productCategory === "unstitched_dyeing_tailoring";
    }

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

  const tailoringIncludesTrouser = useMemo(() => {
    const spec = (product as any)?.spec ?? {};
    return Boolean(
      spec?.includes_trouser ??
        spec?.has_trouser ??
        spec?.product_has_trouser ??
        false,
    );
  }, [product]);

  const tailoringStylePresets = useMemo(() => {
    const spec = (product as any)?.spec ?? {};
    return normalizeTailoringPresetArray(spec?.tailoring_style_presets);
  }, [product]);

  const hasTailoringStylePresets = useMemo(() => {
    return tailoringStylePresets.length > 0;
  }, [tailoringStylePresets]);

  const sizeLengthMap = useMemo(() => {
    return ((product as any)?.spec?.size_length_m ?? {}) as Record<string, unknown>;
  }, [product]);

  const hasAnySizeLengthMap = useMemo(() => {
    const keys = ["XS", "S", "M", "L", "XL", "XXL"];
    return keys.some((key) => safePositiveNumber(sizeLengthMap?.[key]) > 0);
  }, [sizeLengthMap]);

  const sizeLengthLine = useMemo(() => {
    return formatSizeLengthMapLine(sizeLengthMap);
  }, [sizeLengthMap]);

  const tailoringAvailabilityLine = useMemo(() => {
    if (!isUnstitched) return "Tailoring: not applicable";
    if (!vendorOffersTailoring) return "Tailoring: vendor does not offer";
    if (!productTailoringEnabled) return "Tailoring: not enabled for this product";
    if (tailoringCostPkr <= 0) return "Tailoring: not available";
    return `Tailoring: available • PKR ${tailoringCostPkr}`;
  }, [
    isUnstitched,
    productTailoringEnabled,
    tailoringCostPkr,
    vendorOffersTailoring,
  ]);

  const tailoringEligible = useMemo(() => {
    return (
      Boolean(product) &&
      vendorOffersTailoring &&
      isUnstitched &&
      productTailoringEnabled &&
      tailoringCostPkr > 0
    );
  }, [
    isUnstitched,
    product,
    productTailoringEnabled,
    tailoringCostPkr,
    vendorOffersTailoring,
  ]);

  const shippingWeightKg = useMemo(() => {
    const spec = (product as any)?.spec ?? {};
    const price = (product as any)?.price ?? {};

    return (
      safePositiveNumber(spec?.weight_kg) ||
      safePositiveNumber(spec?.shipping_weight_kg) ||
      safePositiveNumber(price?.weight_kg) ||
      0
    );
  }, [product]);

  const packageCm = useMemo(() => {
    const spec = (product as any)?.spec ?? {};
    const v =
      spec?.package_cm ??
      spec?.package_dimensions_cm ??
      spec?.shipping_package_cm ??
      null;

    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return v;
  }, [product]);

  useEffect(() => {
    if (!tailoringEligible && buyerWantsTailoring) {
      setBuyerWantsTailoring(false);
    }
  }, [buyerWantsTailoring, setBuyerWantsTailoring, tailoringEligible]);

  const showTailoringSection = useMemo(() => {
    return Boolean(product) && showBuyerActions && isUnstitched;
  }, [isUnstitched, product, showBuyerActions]);

  const categoryText = useMemo(() => {
    if (productCategory === "stitched_ready") return "Stitched / Ready-to-wear";
    if (productCategory === "unstitched_dyeing_tailoring") {
      return "Unstitched + Dyeing + Tailoring";
    }
    if (productCategory === "unstitched_dyeing") return "Unstitched + Dyeing";
    if (productCategory === "unstitched_plain") return "Unstitched (Plain)";

    if (isUnstitched) {
      return showDyeing ? "Unstitched + Dyeable" : "Unstitched";
    }

    return "Stitched / Ready-to-wear";
  }, [isUnstitched, productCategory, showDyeing]);

  const onOpenDyeing = useCallback(() => {
    if (!product) return;

    router.setParams({ dyeing_selected: "1" } as any);

    router.push({
      pathname: isBuyerRoute
        ? "/(buyer)/dye_palette_modal"
        : "/vendor/profile/(product-modals)/dyeing/dye_palette_modal",
      params: {
        returnPath: isBuyerRoute ? "/flow/view-product" : "/vendor/profile/view-product",
        productId: String(product.id),
        productCode: String(product.product_code || ""),
        dyeing_selected: "1",
        dye_shade_id: selectedDyeShadeId || "",
        dye_hex: selectedDyeHex || "",
        dye_label: selectedDyeLabel || "",
      },
    });
  }, [
    isBuyerRoute,
    product,
    router,
    selectedDyeHex,
    selectedDyeLabel,
    selectedDyeShadeId,
  ]);

  const onPurchase = useCallback(() => {
    if (!product) return;

    if (tailoringEligible && buyerWantsTailoring) {
      if (!tailoringSelection?.presetId) {
        Alert.alert("Select tailoring style", "Please select a tailoring style card.");
        return;
      }

      if (!tailoringSelection?.neck) {
        Alert.alert("Select neck variation", "Please select a neck variation.");
        return;
      }

      if (!tailoringSelection?.sleeve) {
        Alert.alert("Select sleeve variation", "Please select a sleeve variation.");
        return;
      }

      if (tailoringIncludesTrouser && !tailoringSelection?.trouser) {
        Alert.alert("Select trouser variation", "Please select a trouser variation.");
        return;
      }
    }

    const imageUrl = imageUrls.length ? imageUrls[0] : "";

    router.push({
      pathname: "/flow/purchase/size" as any,
      params: {
        returnTo: "/flow/purchase/place-order",
        productId: String(product.id),
        productCode: String(product.product_code || ""),
        productName: String(product.title || ""),
        product_category: productCategory ? String(productCategory) : "",
        currency: "PKR",
        imageUrl,

        price_per_meter_pkr: isUnstitched && pricePerMeterPkr > 0 ? String(pricePerMeterPkr) : "",
        stitched_total_pkr:
          !isUnstitched && stitchedTotalPkr > 0 ? String(stitchedTotalPkr) : "",

        size_length_m: hasAnySizeLengthMap ? encodeJsonParam(sizeLengthMap) : "",

        dyeing_available: showDyeing ? "1" : "0",
        dyeing_selected: showDyeing && buyerWantsDyeing ? "1" : "0",
        dye_shade_id:
          buyerWantsDyeing && selectedDyeShadeId
            ? encodeURIComponent(selectedDyeShadeId)
            : "",
        dye_hex:
          buyerWantsDyeing && selectedDyeHex ? encodeURIComponent(selectedDyeHex) : "",
        dye_label:
          buyerWantsDyeing && selectedDyeLabel
            ? encodeURIComponent(selectedDyeLabel)
            : "",
        dyeing_cost_pkr:
          showDyeing && buyerWantsDyeing
            ? encodeURIComponent(String(dyeingCostPkr))
            : "",

        tailoring_available: tailoringEligible ? "1" : "0",
        tailoring_cost_pkr: tailoringEligible
          ? encodeURIComponent(String(tailoringCostPkr))
          : "",
        tailoring_turnaround_days: tailoringEligible
          ? encodeURIComponent(String(tailoringTurnaroundDays))
          : "",
        tailoring_selected: tailoringEligible && buyerWantsTailoring ? "1" : "0",
        selected_tailoring_style_id:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.presetId
            ? encodeURIComponent(String(tailoringSelection.presetId))
            : "",
            
        selected_tailoring_style_title:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.title
            ? encodeURIComponent(String(tailoringSelection.title))
            : "",
        selected_tailoring_style_image:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.imageUrl
            ? encodeURIComponent(String(tailoringSelection.imageUrl))
            : "",
        selected_tailoring_style_snapshot:
          tailoringEligible && buyerWantsTailoring && tailoringSelection
            ? encodeJsonParam(tailoringSelection)
            : "",
        tailoring_style_extra_cost_pkr:
          tailoringEligible &&
          buyerWantsTailoring &&
          (tailoringSelection?.extraCostPkr ?? 0) > 0
            ? encodeURIComponent(String(tailoringSelection?.extraCostPkr))
            : "",

        selected_neck_variation:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.neck
            ? encodeURIComponent(String(tailoringSelection.neck))
            : "",
        selected_sleeve_variation:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.sleeve
            ? encodeURIComponent(String(tailoringSelection.sleeve))
            : "",
        selected_trouser_variation:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringIncludesTrouser &&
          tailoringSelection?.trouser
            ? encodeURIComponent(String(tailoringSelection.trouser))
            : "",

        selected_neck_style:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.neck
            ? encodeURIComponent(String(tailoringSelection.neck))
            : "",
        selected_sleeve_style:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.sleeve
            ? encodeURIComponent(String(tailoringSelection.sleeve))
            : "",
        selected_trouser_style:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringIncludesTrouser &&
          tailoringSelection?.trouser
            ? encodeURIComponent(String(tailoringSelection.trouser))
            : "",

        custom_tailoring_note:
          tailoringEligible &&
          buyerWantsTailoring &&
          tailoringSelection?.note
            ? encodeURIComponent(String(tailoringSelection.note).trim())
            : "",

        exports_enabled: vendorExportsEnabled ? "1" : "0",
        export_regions: vendorExportRegions.length ? encodeJsonParam(vendorExportRegions) : "",

        weight_kg: shippingWeightKg > 0 ? String(shippingWeightKg) : "",
        package_cm: packageCm ? encodeJsonParam(packageCm) : "",
      },
    });
  }, [
    buyerWantsDyeing,
    buyerWantsTailoring,
    dyeingCostPkr,
    hasAnySizeLengthMap,
    imageUrls,
    isUnstitched,
    packageCm,
    pricePerMeterPkr,
    product,
    productCategory,
    router,
    selectedDyeHex,
    selectedDyeLabel,
    selectedDyeShadeId,
    shippingWeightKg,
    showDyeing,
    sizeLengthMap,
    stitchedTotalPkr,
    tailoringCostPkr,
    tailoringEligible,
    tailoringIncludesTrouser,
    tailoringSelection,
    tailoringTurnaroundDays,
    vendorExportRegions,
    vendorExportsEnabled,
  ]);

  const onViewVendorProfile = useCallback(() => {
    const vId = (vendorRow as any)?.id ?? null;
    if (!vId) {
      Alert.alert("Vendor not found", "This product has no vendor attached.");
      return;
    }

    router.push({
      pathname: "/(buyer)/view-profile",
      params: { vendorId: String(vId) },
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
  const categoryLine = useMemo(() => compactLineValue(categoryText), [categoryText]);

  const inventoryLine = useMemo(() => {
    const s = compactLineValue(inventoryText);
    if (!s) return null;
    if (s === "Made on order") return s;
    return `Qty: ${s}`;
  }, [inventoryText]);

  const priceLine = useMemo(() => compactLineValue(priceText), [priceText]);

  const sizesLine = useMemo(() => {
    const s = compactLineValue(sizeText);
    if (!s) return null;
    return `Sizes: ${s}`;
  }, [sizeText]);

  const uploadedDate = useMemo(() => formatDateOnly(product?.created_at), [product?.created_at]);
  const modifiedDate = useMemo(() => formatDateOnly(product?.updated_at), [product?.updated_at]);

  const onTogglePlayPause = useCallback(() => {
    showControlsBriefly();
  }, [showControlsBriefly]);

  return (
    <View style={{ flex: 1, backgroundColor: stylesVars.bg }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + (showBuyerActions ? FOOTER_H : 0) },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Product</Text>

          <Pressable
            onPress={() => {
              if (isBuyerRoute) {
                exitBuyerToResults();
                return;
              }
              router.back();
            }}
            style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.linkText}>Close</Text>
          </Pressable>
        </View>

        {missingParam ? (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: stylesVars.blue }]}>Missing product</Text>
            <Text style={styles.meta} selectable>
              Provide route params as either:
              {"\n"}• /vendor/profile/view-product?id=123
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

        {!!vendorId &&
        !!product?.vendor_id &&
        String(product.vendor_id) !== String(vendorId) ? (
          <Text style={styles.warn}>
            Note: This product belongs to a different vendor_id than the current vendor
            session.
          </Text>
        ) : null}

        <MediaBlock
          mediaItems={mediaItems}
          selectedMediaIndex={selectedMediaIndex}
          setSelectedMediaIndex={setSelectedMediaIndex}
          mediaViewerVisible={mediaViewerVisible}
          setMediaViewerVisible={setMediaViewerVisible}
          mediaViewerIndex={mediaViewerIndex}
          setMediaViewerIndex={setMediaViewerIndex}
          activeVideoUrl={activeVideoUrl}
          setActiveVideoUrl={setActiveVideoUrl}
          videoCoverVisible={videoCoverVisible}
          setVideoCoverVisible={setVideoCoverVisible}
          videoControlsVisible={videoControlsVisible}
          showControlsBriefly={showControlsBriefly}
          onTogglePlayPause={onTogglePlayPause}
          width={width}
          styles={styles}
        />

        <View style={styles.compactBlock}>
          <CompactLine text={titleLine} />
          <CompactLine text={categoryLine} />
          <CompactLine text={priceLine} />
          <CompactLine text={sizesLine} />
          <CompactLine text={inventoryLine} />

          {isUnstitched ? (
            <>
              <CompactLine text={tailoringAvailabilityLine} />
            </>
          ) : null}

          {showBuyerActions && isUnstitched && !hasAnySizeLengthMap ? (
            <Text style={[styles.meta, { marginTop: 8 }]}>
              Size-length mapping not available.
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: stylesVars.blue }]}>Product Details</Text>

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
              (product as any)?.spec?.workSubTypeNames?.length
                ? (product as any)?.spec?.workSubTypeNames
                : specNames.work.length
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
              <Text style={[styles.specTitle, { color: stylesVars.blue }]}>More Description</Text>
              <Text style={styles.moreDescText}>{moreDescriptionText}</Text>
            </View>
          ) : null}
        </View>

        {showBuyerActions && showDyeing ? (
          <View style={styles.card}>
            <Text style={[styles.label, { color: stylesVars.blue }]}>Do you want dyeing?</Text>
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => {
                setBuyerWantsDyeing(true);
                onOpenDyeing();
              }}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: buyerWantsDyeing ? stylesVars.blue : "#D7E3FF",
                  backgroundColor: buyerWantsDyeing ? stylesVars.blue : "#EEF4FF",
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: buyerWantsDyeing ? "#FFFFFF" : stylesVars.blue,
                }}
              >
                Yes • +PKR {dyeingCostPkr}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setBuyerWantsDyeing(false);
                setSelectedDyeShadeId("");
                setSelectedDyeHex("");
                setSelectedDyeLabel("");
                clearCachedDyeSelection(
                  productId != null ? String(productId) : null,
                  productCode ?? "",
                );

                router.setParams({
                  dyeing_selected: "0",
                  dye_shade_id: undefined,
                  dye_hex: undefined,
                  dye_label: undefined,
                } as any);
              }}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: !buyerWantsDyeing ? stylesVars.blue : "#D7E3FF",
                  backgroundColor: !buyerWantsDyeing ? stylesVars.blue : "#EEF4FF",
                },
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: !buyerWantsDyeing ? "#FFFFFF" : stylesVars.blue,
                }}
              >
                No
              </Text>
            </Pressable>
          </View>
        </View>

            {buyerWantsDyeing && selectedDyeHex ? (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.label, { color: stylesVars.blue }]}>Selected Colour</Text>

                <View
                  style={{
                    marginTop: 8,
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    backgroundColor: selectedDyeHex,
                    borderWidth: 1,
                    borderColor: "#CBD5E1",
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {showTailoringSection ? (
          <View style={styles.card}>
            <ViewProductTailoringSelection
              styles={styles}
              stylesVars={stylesVars}
              tailoringEligible={tailoringEligible}
              tailoringCostPkr={tailoringCostPkr}
              tailoringIncludesTrouser={tailoringIncludesTrouser}
              tailoringStylePresets={tailoringStylePresets}
              hasTailoringStylePresets={hasTailoringStylePresets}
              buyerWantsTailoring={buyerWantsTailoring}
              setBuyerWantsTailoring={setBuyerWantsTailoring}
              onChange={setTailoringSelection}
              resolvePublicUrl={resolvePublicUrl}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: stylesVars.blue }]}>Meta</Text>
          {uploadedDate ? (
            <Text style={styles.metaLine}>Date uploaded: {uploadedDate}</Text>
          ) : null}
          {modifiedDate ? (
            <Text style={styles.metaLine}>Date modified: {modifiedDate}</Text>
          ) : null}
        </View>
      </ScrollView>

      {showBuyerActions && (vendorRow as any)?.id != null ? (
        <Pressable
          onPress={onViewVendorProfile}
          style={({ pressed }) => [styles.fabVendor, pressed ? styles.pressed : null]}
        >
          <Text style={styles.fabVendorText}>Vendor</Text>
        </Pressable>
      ) : null}

      <FooterBar
        showBuyerActions={showBuyerActions}
        FOOTER_H={FOOTER_H}
        safePriceText={priceText}
        productTitle={product?.title}
        purchaseDisabled={purchaseDisabled}
        onPurchase={onPurchase}
        styles={styles}
      />
    </View>
  );
}