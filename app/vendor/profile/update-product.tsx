// app/vendor/profile/update-product.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppSelector } from "@/store/hooks";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as VideoThumbnails from "expo-video-thumbnails";

const PRODUCTS_TABLE = "products";
const BUCKET_VENDOR = "vendor_images";

type ProductRow = {
  id: number;
  vendor_id: number;
  product_code: string | null;
  title: string | null;
  inventory_qty: number | null;
  made_on_order?: boolean | null;
  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;
};

type VendorTailoringOptions = {
  blouse_neck?: string[] | null;
  sleeves?: string[] | null;
  trouser?: string[] | null;
};

type ProductTailoringSelections = {
  blouse_neck: string[];
  sleeves: string[];
  trouser: string[];
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "—";
}

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function safeJson(v: any) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return {};
}

function safeNumOrZero(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function isHttpUrl(v: any) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function extFromUri(uri: string) {
  const clean = String(uri || "");
  const qIdx = clean.indexOf("?");
  const base = qIdx >= 0 ? clean.slice(0, qIdx) : clean;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function guessContentTypeFromExt(ext: string) {
  const e = String(ext || "").toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "heic") return "image/heic";
  if (e === "mp4") return "video/mp4";
  if (e === "mov") return "video/quicktime";
  if (e === "m4v") return "video/x-m4v";
  return "application/octet-stream";
}

function normalizeStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];

  for (const item of v) {
    const s = String(item ?? "").trim();
    if (s) out.push(s);
  }

  return Array.from(new Set(out));
}

function readVendorTailoringOptions(v: unknown): VendorTailoringOptions {
  const obj = safeJson(v);

  return {
    blouse_neck: normalizeStringList(
      obj?.blouse_neck ??
        obj?.blouseNeck ??
        obj?.neck ??
        obj?.neck_styles ??
        obj?.neckStyles ??
        [],
    ),
    sleeves: normalizeStringList(
      obj?.sleeves ??
        obj?.sleeve ??
        obj?.sleeve_styles ??
        obj?.sleeveStyles ??
        [],
    ),
    trouser: normalizeStringList(
      obj?.trouser ??
        obj?.trousers ??
        obj?.bottom ??
        obj?.bottoms ??
        obj?.trouser_styles ??
        obj?.trouserStyles ??
        [],
    ),
  };
}

function emptyTailoringSelections(): ProductTailoringSelections {
  return {
    blouse_neck: [],
    sleeves: [],
    trouser: [],
  };
}

function readProductTailoringSelections(specInput: unknown): ProductTailoringSelections {
  const spec = safeJson(specInput);

  const nested =
    safeJson(spec?.tailoring_options).blouse_neck ||
    safeJson(spec?.tailoring_styles).blouse_neck ||
    safeJson(spec?.tailoring_style_options).blouse_neck
      ? safeJson(spec?.tailoring_options ?? spec?.tailoring_styles ?? spec?.tailoring_style_options)
      : {};

  const blouse_neck = normalizeStringList(
    nested?.blouse_neck ??
      nested?.blouseNeck ??
      spec?.blouse_neck_styles ??
      spec?.blouseNeckStyles ??
      spec?.neck_styles ??
      spec?.neckStyles ??
      spec?.neck_options ??
      spec?.neckOptions ??
      spec?.blouse_neck ??
      [],
  );

  const sleeves = normalizeStringList(
    nested?.sleeves ??
      nested?.sleeve ??
      spec?.sleeve_styles ??
      spec?.sleeveStyleOptions ??
      spec?.sleeve_options ??
      spec?.sleeves ??
      [],
  );

  const trouser = normalizeStringList(
    nested?.trouser ??
      nested?.trousers ??
      spec?.trouser_styles ??
      spec?.trouserStyleOptions ??
      spec?.trouser_options ??
      spec?.trouser ??
      [],
  );

  return {
    blouse_neck,
    sleeves,
    trouser,
  };
}

function writeProductTailoringSelections(
  specInput: unknown,
  selections: ProductTailoringSelections,
) {
  const spec = safeJson(specInput);

  const normalized: ProductTailoringSelections = {
    blouse_neck: normalizeStringList(selections.blouse_neck),
    sleeves: normalizeStringList(selections.sleeves),
    trouser: normalizeStringList(selections.trouser),
  };

  return {
    ...spec,

    tailoring_options: {
      blouse_neck: normalized.blouse_neck,
      sleeves: normalized.sleeves,
      trouser: normalized.trouser,
    },

    tailoring_styles: {
      blouse_neck: normalized.blouse_neck,
      sleeves: normalized.sleeves,
      trouser: normalized.trouser,
    },

    tailoring_style_options: {
      blouse_neck: normalized.blouse_neck,
      sleeves: normalized.sleeves,
      trouser: normalized.trouser,
    },

    blouse_neck_styles: normalized.blouse_neck,
    sleeve_styles: normalized.sleeves,
    trouser_styles: normalized.trouser,
  };
}

function clearProductTailoringSelections(specInput: unknown) {
  return writeProductTailoringSelections(specInput, emptyTailoringSelections());
}

function SelectionPill({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.optionPill,
        selected ? styles.optionPillOn : null,
        disabled ? styles.optionPillDisabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.optionPillText, selected ? styles.optionPillTextOn : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function UpdateProductScreen() {
  const router = useRouter();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => {
    return products.find((p) => p.id === selectedId) ?? null;
  }, [products, selectedId]);

  const [pickerOpen, setPickerOpen] = useState(true);

  const [title, setTitle] = useState("");
  const [moreDescription, setMoreDescription] = useState("");
  const [inventoryQty, setInventoryQty] = useState<number>(0);

  const [priceMode, setPriceMode] = useState<"stitched_total" | "unstitched_per_meter">(
    "unstitched_per_meter",
  );
  const [priceTotal, setPriceTotal] = useState<number>(0);
  const [pricePerMeter, setPricePerMeter] = useState<number>(0);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  const [dyeingEnabled, setDyeingEnabled] = useState<boolean>(false);
  const [dyeingCost, setDyeingCost] = useState<number>(0);

  const [tailoringEnabled, setTailoringEnabled] = useState<boolean>(false);
  const [tailoringCost, setTailoringCost] = useState<number>(0);
  const [tailoringTurnaroundDays, setTailoringTurnaroundDays] = useState<number>(0);

  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<boolean>(false);
  const [vendorTailoringOptions, setVendorTailoringOptions] = useState<VendorTailoringOptions>({
    blouse_neck: [],
    sleeves: [],
    trouser: [],
  });

  const [selectedTailoringStyles, setSelectedTailoringStyles] =
    useState<ProductTailoringSelections>(emptyTailoringSelections());

  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;
    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

  const toggleStyle = useCallback(
    (group: keyof ProductTailoringSelections, value: string) => {
      const clean = String(value ?? "").trim();
      if (!clean) return;

      setSelectedTailoringStyles((prev) => {
        const current = normalizeStringList(prev[group]);
        const exists = current.includes(clean);

        return {
          ...prev,
          [group]: exists ? current.filter((x) => x !== clean) : [...current, clean],
        };
      });
    },
    [],
  );

  async function fetchProducts() {
    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor.id is loaded.");
      return;
    }

    try {
      setLoadingList(true);

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, spec, price, media, created_at, updated_at",
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      setProducts(((data as unknown) as ProductRow[]) ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      setLoadingList(false);
    }
  }

  const fetchVendorTailoring = useCallback(async () => {
    if (!vendorId) {
      setVendorOffersTailoring(false);
      setVendorTailoringOptions({
        blouse_neck: [],
        sleeves: [],
        trouser: [],
      });
      return;
    }

    try {
      setVendorLoading(true);

      const { data, error } = await supabase
        .from("vendor")
        .select("id, offers_tailoring, tailoring_options")
        .eq("id", vendorId)
        .single();

      if (error) {
        setVendorOffersTailoring(false);
        setVendorTailoringOptions({
          blouse_neck: [],
          sleeves: [],
          trouser: [],
        });
        return;
      }

      setVendorOffersTailoring(Boolean((data as any)?.offers_tailoring));
      setVendorTailoringOptions(readVendorTailoringOptions((data as any)?.tailoring_options));
    } catch {
      setVendorOffersTailoring(false);
      setVendorTailoringOptions({
        blouse_neck: [],
        sleeves: [],
        trouser: [],
      });
    } finally {
      setVendorLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void fetchProducts();
    void fetchVendorTailoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    if (!selected) return;

    setTitle(safeText(selected.title));
    setMoreDescription(safeText(safeJson(selected.spec)?.more_description ?? ""));

    const isMadeOnOrder = Boolean(selected.made_on_order);
    setInventoryQty(isMadeOnOrder ? 0 : safeNumOrZero(selected.inventory_qty));

    const price = safeJson(selected.price);
    const spec = safeJson(selected.spec);

    const modeRaw = String(price?.mode ?? "").trim();
    const mode: "stitched_total" | "unstitched_per_meter" =
      modeRaw === "stitched_total" ? "stitched_total" : "unstitched_per_meter";

    setPriceMode(mode);
    setPriceTotal(safeNumOrZero(price?.cost_pkr_total));
    setPricePerMeter(safeNumOrZero(price?.cost_pkr_per_meter));

    setAvailableSizes(
      Array.isArray(price?.available_sizes)
        ? price.available_sizes.map((x: any) => String(x).trim()).filter(Boolean)
        : [],
    );

    const dyeOn = Boolean(spec?.dyeing_enabled);
    setDyeingEnabled(dyeOn);

    const dyeCostFromPrice = safeNumOrZero(price?.dyeing_cost_pkr ?? 0);
    const dyeCostFromSpec = safeNumOrZero(spec?.dyeing_cost_pkr ?? 0);
    setDyeingCost(dyeCostFromPrice > 0 ? dyeCostFromPrice : dyeCostFromSpec);

    const tailorOn = Boolean(spec?.tailoring_enabled);
    setTailoringEnabled(tailorOn);

    const tailorCostFromPrice = safeNumOrZero(price?.tailoring_cost_pkr ?? 0);
    const tailorCostFromSpec = safeNumOrZero(spec?.tailoring_cost_pkr ?? 0);
    setTailoringCost(tailorCostFromPrice > 0 ? tailorCostFromPrice : tailorCostFromSpec);

    const daysFromSpec = safeNumOrZero(spec?.tailoring_turnaround_days ?? 0);
    setTailoringTurnaroundDays(daysFromSpec);

    setSelectedTailoringStyles(readProductTailoringSelections(spec));
  }, [selected]);

  useEffect(() => {
    if (!dyeingEnabled && dyeingCost !== 0) setDyeingCost(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyeingEnabled]);

  useEffect(() => {
    if (!tailoringEnabled) {
      if (tailoringCost !== 0) setTailoringCost(0);
      if (tailoringTurnaroundDays !== 0) setTailoringTurnaroundDays(0);
      setSelectedTailoringStyles(emptyTailoringSelections());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailoringEnabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p: ProductRow) => {
      const code = String(p.product_code ?? "").toLowerCase();
      const t = String(p.title ?? "").toLowerCase();
      return code.includes(q) || t.includes(q);
    });
  }, [products, query]);

  const inventoryEditable = useMemo(() => {
    if (!selected) return false;
    return !Boolean(selected.made_on_order);
  }, [selected]);

  const media = useMemo(() => safeJson(selected?.media), [selected]);

  const imagePaths = useMemo(
    () => (Array.isArray(media?.images) ? media.images.map(String) : []),
    [media],
  );
  const videoPaths = useMemo(
    () => (Array.isArray(media?.videos) ? media.videos.map(String) : []),
    [media],
  );
  const thumbPaths = useMemo(
    () => (Array.isArray(media?.thumbs) ? media.thumbs.map(String) : []),
    [media],
  );

  const imageUrls = useMemo(
    () => imagePaths.map((p: string) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [imagePaths, resolvePublicUrl],
  );

  const videoUrls = useMemo(
    () => videoPaths.map((p: string) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [videoPaths, resolvePublicUrl],
  );

  const thumbUrls = useMemo(
    () => thumbPaths.map((p: string) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [thumbPaths, resolvePublicUrl],
  );

  useEffect(() => {
    let cancelled = false;

    async function ensureThumb(url: string) {
      const u = String(url || "").trim();
      if (!u) return;
      if (videoThumbs[u]) return;

      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(u, { time: 1500 });
        if (cancelled) return;
        if (uri) {
          setVideoThumbs((prev) => (prev[u] ? prev : { ...prev, [u]: uri }));
          try {
            Image.prefetch(uri);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    const list = (videoUrls ?? []).slice(0, 20);
    (async () => {
      for (let i = 0; i < list.length; i++) {
        await ensureThumb(list[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(videoUrls)]);

  const isUnstitched = priceMode === "unstitched_per_meter";

  const blouseNeckOptions = useMemo(
    () => normalizeStringList(vendorTailoringOptions?.blouse_neck),
    [vendorTailoringOptions?.blouse_neck],
  );

  const sleeveOptions = useMemo(
    () => normalizeStringList(vendorTailoringOptions?.sleeves),
    [vendorTailoringOptions?.sleeves],
  );

  const trouserOptions = useMemo(
    () => normalizeStringList(vendorTailoringOptions?.trouser),
    [vendorTailoringOptions?.trouser],
  );

  const hasAnyVendorStyleOptions = useMemo(() => {
    return Boolean(blouseNeckOptions.length || sleeveOptions.length || trouserOptions.length);
  }, [blouseNeckOptions.length, sleeveOptions.length, trouserOptions.length]);

  const canSave = useMemo(() => {
    if (!vendorId) return false;
    if (!selectedId) return false;
    if (!title.trim()) return false;

    if (priceMode === "unstitched_per_meter") {
      const n = Number(pricePerMeter ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;

      if (dyeingEnabled) {
        const d = Number(dyeingCost ?? 0);
        if (!Number.isFinite(d) || d <= 0) return false;
      }

      if (tailoringEnabled) {
        if (!vendorOffersTailoring) return false;

        const t = Number(tailoringCost ?? 0);
        if (!Number.isFinite(t) || t <= 0) return false;

        const days = Number(tailoringTurnaroundDays ?? 0);
        if (!Number.isFinite(days) || days < 0) return false;
      }
    } else {
      const n = Number(priceTotal ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    }

    return true;
  }, [
    vendorId,
    selectedId,
    title,
    priceMode,
    pricePerMeter,
    priceTotal,
    dyeingEnabled,
    dyeingCost,
    tailoringEnabled,
    tailoringCost,
    tailoringTurnaroundDays,
    vendorOffersTailoring,
  ]);

  async function saveUpdate() {
    if (saving) return;

    if (!canSave) {
      Alert.alert("Incomplete", "Please select a product and fill required fields.");
      return;
    }

    if (!vendorId || !selectedId) {
      Alert.alert("Missing", "Vendor or product is missing.");
      return;
    }

    try {
      setSaving(true);

      const prevSpec = safeJson(selected?.spec);
      const prevPrice = safeJson(selected?.price);

      let nextPrice: any = {
        ...(prevPrice ?? {}),
        mode: priceMode,
      };

      if (priceMode === "unstitched_per_meter") {
        nextPrice = {
          ...nextPrice,
          cost_pkr_per_meter: Number(pricePerMeter ?? 0),
          dyeing_cost_pkr: dyeingEnabled ? Number(dyeingCost ?? 0) : 0,
          tailoring_cost_pkr: tailoringEnabled ? Number(tailoringCost ?? 0) : 0,
        };

        if ("cost_pkr_total" in nextPrice) {
          nextPrice.cost_pkr_total = nextPrice.cost_pkr_total ?? undefined;
        }
      } else {
        nextPrice = {
          ...nextPrice,
          cost_pkr_total: Number(priceTotal ?? 0),
          available_sizes: (availableSizes ?? [])
            .map((x) => String(x).trim())
            .filter(Boolean),
        };

        nextPrice.dyeing_cost_pkr = 0;
        nextPrice.tailoring_cost_pkr = 0;
      }

      let nextSpec: any = {
        ...(prevSpec ?? {}),
      };

      nextSpec.more_description = String(moreDescription ?? "").trim();

      if (priceMode === "unstitched_per_meter") {
        nextSpec.dyeing_enabled = Boolean(dyeingEnabled);
        nextSpec.dyeing_cost_pkr = dyeingEnabled ? Number(dyeingCost ?? 0) : 0;

        nextSpec.tailoring_enabled = Boolean(tailoringEnabled);
        nextSpec.tailoring_cost_pkr = tailoringEnabled ? Number(tailoringCost ?? 0) : 0;
        nextSpec.tailoring_turnaround_days = tailoringEnabled
          ? Math.max(0, Number(tailoringTurnaroundDays ?? 0))
          : 0;

        if (tailoringEnabled) {
          nextSpec = writeProductTailoringSelections(nextSpec, selectedTailoringStyles);
        } else {
          nextSpec = clearProductTailoringSelections(nextSpec);
        }
      } else {
        nextSpec.dyeing_enabled = false;
        nextSpec.dyeing_cost_pkr = 0;

        nextSpec.tailoring_enabled = false;
        nextSpec.tailoring_cost_pkr = 0;
        nextSpec.tailoring_turnaround_days = 0;
        nextSpec = clearProductTailoringSelections(nextSpec);
      }

      const updatePayload: any = {
        title: title.trim(),
        price: nextPrice,
        spec: nextSpec,
        updated_at: new Date().toISOString(),
      };

      if (Boolean(selected?.made_on_order)) {
        updatePayload.inventory_qty = 0;
      } else if (inventoryEditable) {
        updatePayload.inventory_qty = Number(inventoryQty ?? 0);
      }

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, spec, price, media, created_at, updated_at",
        )
        .single();

      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      Alert.alert("Updated", `Saved changes for ${safeText(updated.product_code)}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update product.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMedia(nextMedia: any) {
    if (!vendorId || !selectedId) return;
    if (savingMedia) return;

    try {
      setSavingMedia(true);

      const updatePayload = {
        media: nextMedia,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, spec, price, media, created_at, updated_at",
        )
        .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not update media.");
    } finally {
      setSavingMedia(false);
    }
  }

  async function removeImageAt(idx: number) {
    if (!selected) return;

    const m = safeJson(selected.media);
    const images = Array.isArray(m.images) ? [...m.images] : [];
    if (idx < 0 || idx >= images.length) return;

    images.splice(idx, 1);

    const next = {
      ...m,
      images,
    };

    await saveMedia(next);
  }

  async function removeVideoAt(idx: number) {
    if (!selected) return;

    const m = safeJson(selected.media);
    const videos = Array.isArray(m.videos) ? [...m.videos] : [];
    const thumbs = Array.isArray(m.thumbs) ? [...m.thumbs] : [];

    if (idx < 0 || idx >= videos.length) return;

    videos.splice(idx, 1);
    if (idx < thumbs.length) thumbs.splice(idx, 1);

    const next = {
      ...m,
      videos,
      thumbs,
    };

    await saveMedia(next);
  }

  async function uploadOneAsset(args: {
    kind: "image" | "video";
    uri: string;
    vendorId: number;
    productCode: string;
    index: number;
  }) {
    const ext = extFromUri(args.uri) || (args.kind === "image" ? "jpg" : "mp4");
    const contentType = guessContentTypeFromExt(ext);

    const base64 = await FileSystem.readAsStringAsync(args.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const folder = args.kind === "image" ? "images" : "videos";
    const filename = `${Date.now()}_${args.index}_${Math.random().toString(16).slice(2)}.${ext}`;
    const storagePath = `vendors/${args.vendorId}/products/${args.productCode}/${folder}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_VENDOR)
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);
    return storagePath;
  }

  async function pickAndUpload(kind: "image" | "video") {
    if (!vendorId || !selectedId || !selected?.product_code) {
      Alert.alert("Missing", "Select a product first.");
      return;
    }
    if (savingMedia) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow media library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        kind === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      quality: kind === "image" ? 0.9 : undefined,
      allowsEditing: false,
      allowsMultipleSelection: true,
    });

    if (result.canceled) return;

    const assets = (result.assets ?? []).filter((a: any) => !!a?.uri);
    if (!assets.length) return;

    try {
      setSavingMedia(true);

      const productCode = String(selected.product_code);

      const m = safeJson(selected.media);
      const nextImages = Array.isArray(m.images) ? [...m.images] : [];
      const nextVideos = Array.isArray(m.videos) ? [...m.videos] : [];
      const nextThumbs = Array.isArray(m.thumbs) ? [...m.thumbs] : [];

      const seenUri = new Set<string>();

      for (let i = 0; i < assets.length; i++) {
        const uri = String(assets[i]?.uri || "").trim();
        if (!uri) continue;
        if (seenUri.has(uri)) continue;
        seenUri.add(uri);

        const storagePath = await uploadOneAsset({
          kind,
          uri,
          vendorId,
          productCode,
          index: i,
        });

        if (kind === "image") {
          nextImages.push(storagePath);
        } else {
          nextVideos.push(storagePath);

          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
              time: 1500,
            });

            if (thumbUri) {
              const thumbPath = await uploadOneAsset({
                kind: "image",
                uri: thumbUri,
                vendorId,
                productCode,
                index: i,
              });

              nextThumbs.push(thumbPath);
            }
          } catch {
            // thumb optional
          }
        }
      }

      const next = {
        ...m,
        images: nextImages,
        videos: nextVideos,
        thumbs: nextThumbs,
      };

      const updatePayload = {
        media: next,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, made_on_order, spec, price, media, created_at, updated_at",
        )
        .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

      const updated = data as unknown as ProductRow;
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not upload media.");
    } finally {
      setSavingMedia(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Update Product</Text>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>

      {!vendorId ? (
        <Text style={styles.warn}>
          Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
        </Text>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pick a product</Text>

          {selected ? (
            <Pressable
              onPress={() => setPickerOpen((v) => !v)}
              style={({ pressed }) => [styles.smallBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.smallBtnText}>{pickerOpen ? "Hide" : "Change Product"}</Text>
            </Pressable>
          ) : null}
        </View>

        {selected ? (
          <View style={styles.selectedBox}>
            <Text style={styles.selectedCode}>{safeText(selected.product_code)}</Text>
            <Text style={styles.selectedTitle} numberOfLines={1}>
              {safeText(selected.title)}
            </Text>
          </View>
        ) : null}

        {pickerOpen ? (
          <>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by product code or title..."
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              maxLength={80}
            />

            <View style={styles.topActionsRow}>
              <Text
                style={[styles.refresh, loadingList && styles.disabledText]}
                onPress={loadingList ? undefined : fetchProducts}
              >
                {loadingList ? "Loading..." : "Refresh"}
              </Text>
            </View>

            {loadingList ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading products…</Text>
              </View>
            ) : filtered.length ? (
              <View style={styles.list}>
                {filtered.slice(0, 30).map((p: ProductRow) => {
                  const isOn = p.id === selectedId;
                  const code = safeText(p.product_code);
                  const t = safeText(p.title);

                  return (
                    <Pressable
                      key={String(p.id)}
                      style={({ pressed }) => [
                        styles.item,
                        isOn ? styles.itemOn : null,
                        pressed ? styles.pressed : null,
                      ]}
                      onPress={() => {
                        setSelectedId(p.id);
                        setPickerOpen(false);
                      }}
                    >
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemCode}>{code}</Text>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {t}
                        </Text>
                      </View>

                      <Text style={styles.itemArrow}>{isOn ? "✓" : "›"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.empty}>No products found.</Text>
            )}

            {filtered.length > 30 ? (
              <Text style={styles.hint}>Showing first 30 matches. Refine your search.</Text>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Edit details</Text>

        {!selected ? (
          <Text style={styles.empty}>Select a product above to edit.</Text>
        ) : (
          <>
            <Text style={styles.metaLine}>
              Selected: <Text style={styles.metaStrong}>{safeText(selected.product_code)}</Text>
            </Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Bridal heavy embroidered lehenga"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.label}>Inventory Quantity *</Text>

            {Boolean(selected.made_on_order) ? (
              <View style={styles.madeOnOrderPill}>
                <Text style={styles.madeOnOrderText}>Made on Order</Text>
              </View>
            ) : (
              <TextInput
                value={String(inventoryQty ?? 0)}
                onChangeText={(t) => setInventoryQty(Number(sanitizeNumber(t) || "0"))}
                placeholder="e.g., 10"
                placeholderTextColor={stylesVars.placeholder}
                style={styles.input}
                keyboardType="number-pad"
                maxLength={10}
              />
            )}

            <Text style={styles.label}>Cost Mode</Text>
            <View style={styles.fixedPill}>
              <Text style={styles.fixedPillText}>
                {priceMode === "unstitched_per_meter"
                  ? "Unstitched (PKR/meter)"
                  : "Stitched / Ready-to-wear"}
              </Text>
            </View>

            {priceMode === "stitched_total" ? (
              <>
                <Text style={styles.label}>Total Cost (PKR) *</Text>
                <TextInput
                  value={String(priceTotal ?? "")}
                  onChangeText={(t) => setPriceTotal(Number(sanitizeNumber(t) || "0"))}
                  placeholder="e.g., 25000"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  maxLength={12}
                />

                <Text style={styles.label}>Available Sizes (comma separated)</Text>
                <TextInput
                  value={(availableSizes ?? []).join(", ")}
                  onChangeText={(t) =>
                    setAvailableSizes(
                      t
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="e.g., XS, S, M, L, XL, XXL, All"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  maxLength={80}
                />

                <Text style={styles.hint}>
                  Dyeing and stitching services apply only to unstitched products.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Cost per Meter (PKR) *</Text>
                <TextInput
                  value={String(pricePerMeter ?? "")}
                  onChangeText={(t) => setPricePerMeter(Number(sanitizeNumber(t) || "0"))}
                  placeholder="e.g., 1800"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  keyboardType="decimal-pad"
                  maxLength={12}
                />

                <View style={styles.inlineToggleRow}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Dyeable</Text>

                  <Pressable
                    onPress={() => {
                      if (!isUnstitched) return;
                      setDyeingEnabled((v) => !v);
                    }}
                    style={({ pressed }) => [
                      styles.inlineTogglePill,
                      dyeingEnabled ? styles.inlineTogglePillOn : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineTogglePillText,
                        dyeingEnabled ? styles.inlineTogglePillTextOn : null,
                      ]}
                    >
                      {dyeingEnabled ? "Yes" : "No"}
                    </Text>
                  </Pressable>
                </View>

                {dyeingEnabled ? (
                  <>
                    <Text style={styles.hint}>
                      Buyer will pick a dye shade at checkout.
                    </Text>

                    <Text style={styles.label}>Dyeing Cost (PKR) *</Text>
                    <TextInput
                      value={String(dyeingCost ?? "")}
                      onChangeText={(t) => setDyeingCost(Number(sanitizeNumber(t) || "0"))}
                      placeholder="e.g., 800"
                      placeholderTextColor={stylesVars.placeholder}
                      style={styles.input}
                      keyboardType="decimal-pad"
                      maxLength={12}
                    />
                  </>
                ) : null}

                <View style={styles.inlineToggleRow}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Stitching available</Text>

                  <Pressable
                    onPress={() => {
                      if (!isUnstitched) return;
                      if (!vendorOffersTailoring) {
                        Alert.alert(
                          "Tailoring not enabled",
                          "This vendor profile does not offer tailoring.",
                        );
                        return;
                      }
                      setTailoringEnabled((v) => !v);
                    }}
                    style={({ pressed }) => [
                      styles.inlineTogglePill,
                      tailoringEnabled ? styles.inlineTogglePillOn : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineTogglePillText,
                        tailoringEnabled ? styles.inlineTogglePillTextOn : null,
                      ]}
                    >
                      {tailoringEnabled ? "Yes" : "No"}
                    </Text>
                  </Pressable>
                </View>

                {vendorLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>Loading tailoring options…</Text>
                  </View>
                ) : null}

                {!vendorLoading && !vendorOffersTailoring ? (
                  <Text style={styles.hint}>
                    Vendor profile currently does not offer tailoring.
                  </Text>
                ) : null}

                {tailoringEnabled ? (
                  <>
                    <Text style={styles.hint}>
                      Pick only the styles this product should offer to buyers. Keep selections
                      small and relevant.
                    </Text>

                    <Text style={styles.label}>Tailoring Cost (PKR) *</Text>
                    <TextInput
                      value={String(tailoringCost ?? "")}
                      onChangeText={(t) => setTailoringCost(Number(sanitizeNumber(t) || "0"))}
                      placeholder="e.g., 2500"
                      placeholderTextColor={stylesVars.placeholder}
                      style={styles.input}
                      keyboardType="decimal-pad"
                      maxLength={12}
                    />

                    <Text style={styles.label}>Tailoring Turnaround (days)</Text>
                    <TextInput
                      value={String(tailoringTurnaroundDays ?? "")}
                      onChangeText={(t) =>
                        setTailoringTurnaroundDays(Number(sanitizeNumber(t) || "0"))
                      }
                      placeholder="e.g., 12"
                      placeholderTextColor={stylesVars.placeholder}
                      style={styles.input}
                      keyboardType="number-pad"
                      maxLength={3}
                    />

                    <Text style={styles.label}>Neck Styles</Text>
                    {blouseNeckOptions.length ? (
                      <View style={styles.optionWrap}>
                        {blouseNeckOptions.map((item) => (
                          <SelectionPill
                            key={`neck-${item}`}
                            label={item}
                            selected={selectedTailoringStyles.blouse_neck.includes(item)}
                            onPress={() => toggleStyle("blouse_neck", item)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyInline}>No neck styles found in vendor profile.</Text>
                    )}

                    <Text style={styles.label}>Sleeve Styles</Text>
                    {sleeveOptions.length ? (
                      <View style={styles.optionWrap}>
                        {sleeveOptions.map((item) => (
                          <SelectionPill
                            key={`sleeve-${item}`}
                            label={item}
                            selected={selectedTailoringStyles.sleeves.includes(item)}
                            onPress={() => toggleStyle("sleeves", item)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyInline}>
                        No sleeve styles found in vendor profile.
                      </Text>
                    )}

                    <Text style={styles.label}>Trouser Styles</Text>
                    {trouserOptions.length ? (
                      <View style={styles.optionWrap}>
                        {trouserOptions.map((item) => (
                          <SelectionPill
                            key={`trouser-${item}`}
                            label={item}
                            selected={selectedTailoringStyles.trouser.includes(item)}
                            onPress={() => toggleStyle("trouser", item)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyInline}>
                        No trouser styles found in vendor profile.
                      </Text>
                    )}

                    {!hasAnyVendorStyleOptions ? (
                      <Text style={styles.hint}>
                        Add tailoring style options in vendor profile first, then return here.
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Media</Text>

          {selected ? (
            <View style={styles.mediaActionRow}>
              <Pressable
                onPress={() => pickAndUpload("image")}
                disabled={savingMedia}
                style={({ pressed }) => [
                  styles.smallBtn,
                  savingMedia ? styles.smallBtnDisabled : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.smallBtnText}>+ Add Image</Text>
              </Pressable>

              <Pressable
                onPress={() => pickAndUpload("video")}
                disabled={savingMedia}
                style={({ pressed }) => [
                  styles.smallBtn,
                  savingMedia ? styles.smallBtnDisabled : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={styles.smallBtnText}>+ Add Video</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {!selected ? (
          <Text style={styles.empty}>Select a product above to edit media.</Text>
        ) : (
          <>
            {savingMedia ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Updating media…</Text>
              </View>
            ) : null}

            <Text style={styles.metaSmall}>Images</Text>
            {imageUrls.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {imageUrls.map((u, idx) => (
                    <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                      <Image source={{ uri: u }} style={styles.thumb} />
                      <Pressable
                        onPress={() => removeImageAt(idx)}
                        disabled={savingMedia}
                        style={({ pressed }) => [styles.thumbX, pressed ? styles.pressed : null]}
                      >
                        <Text style={styles.thumbXText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.emptyInline}>—</Text>
            )}

            <Text style={[styles.metaSmall, { marginTop: 12 }]}>Videos</Text>
            {videoUrls.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {videoUrls.map((u, idx) => {
                    const t = thumbUrls[idx] ?? null;
                    const fallback = videoThumbs[u] ?? null;

                    return (
                      <View key={`${u}-${idx}`} style={styles.thumbWrap}>
                        {t ? (
                          <Image source={{ uri: t }} style={styles.thumb} />
                        ) : fallback ? (
                          <Image source={{ uri: fallback }} style={styles.thumb} />
                        ) : (
                          <View style={styles.videoPlaceholder}>
                            <Text style={styles.videoPlaceholderText}>Video {idx + 1}</Text>
                          </View>
                        )}

                        <View style={styles.playBadge}>
                          <Text style={styles.playBadgeText}>▶</Text>
                        </View>

                        <Pressable
                          onPress={() => removeVideoAt(idx)}
                          disabled={savingMedia}
                          style={({ pressed }) => [styles.thumbX, pressed ? styles.pressed : null]}
                        >
                          <Text style={styles.thumbXText}>✕</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.emptyInline}>—</Text>
            )}

            <Text style={styles.label}>More Description</Text>
            <TextInput
              value={moreDescription}
              onChangeText={setMoreDescription}
              placeholder="Add more details: work, fabric, lining, measurements, delivery notes, etc."
              placeholderTextColor={stylesVars.placeholder}
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
              maxLength={1200}
            />
          </>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          !canSave || saving ? styles.saveBtnDisabled : null,
          pressed ? styles.pressed : null,
        ]}
        onPress={saveUpdate}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save Changes"}</Text>
      </Pressable>

      {!vendorId ? (
        <Text style={styles.warn}>
          Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
        </Text>
      ) : null}
    </ScrollView>
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
  white: "#FFFFFF",
  black: "#000000",
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  linkBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  linkText: {
    color: stylesVars.blue,
    fontSize: 14,
    fontWeight: "700",
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 2,
    flex: 1,
  },

  selectedBox: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    padding: 14,
  },

  selectedCode: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  selectedTitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.text,
  },

  smallBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center",
  },

  smallBtnDisabled: {
    opacity: 0.6,
  },

  smallBtnText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  label: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0.2,
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: stylesVars.white,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },

  fixedPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  fixedPillText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  madeOnOrderPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },

  madeOnOrderText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  metaLine: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  metaStrong: {
    color: stylesVars.blue,
    fontWeight: "700",
  },

  metaSmall: {
    marginTop: 10,
    color: stylesVars.text,
    fontWeight: "700",
    fontSize: 13,
  },

  topActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  refresh: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  disabledText: {
    opacity: 0.6,
  },

  list: {
    gap: 10,
    marginTop: 12,
  },

  item: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: stylesVars.cardBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  itemOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft,
  },

  itemLeft: {
    flex: 1,
    paddingRight: 10,
  },

  itemCode: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  itemTitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: stylesVars.text,
  },

  itemArrow: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.subText,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },

  loadingText: {
    fontSize: 13,
    color: stylesVars.mutedText,
    fontWeight: "600",
  },

  hint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  thumbRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },

  thumbWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
  },

  thumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
  },

  thumbX: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: stylesVars.dangerSoft,
    borderColor: stylesVars.dangerBorder,
    borderWidth: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  thumbXText: {
    color: stylesVars.danger,
    fontWeight: "700",
    fontSize: 12,
  },

  videoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blueSoft,
  },

  videoPlaceholderText: {
    color: stylesVars.blue,
    fontWeight: "700",
    fontSize: 12,
  },

  playBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    backgroundColor: stylesVars.overlayDark,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  playBadgeText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 12,
  },

  saveBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue,
  },

  saveBtnDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14,
  },

  warn: {
    marginTop: 10,
    color: stylesVars.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  empty: {
    marginTop: 10,
    color: stylesVars.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },

  emptyInline: {
    marginTop: 8,
    color: stylesVars.mutedText,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },

  inlineToggleRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  inlineTogglePill: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  inlineTogglePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  inlineTogglePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  inlineTogglePillTextOn: {
    color: stylesVars.white,
  },

  optionWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionPill: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  optionPillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blue,
  },

  optionPillDisabled: {
    opacity: 0.5,
  },

  optionPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: stylesVars.blue,
  },

  optionPillTextOn: {
    color: stylesVars.white,
  },

  mediaActionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  pressed: {
    opacity: 0.82,
  },
});