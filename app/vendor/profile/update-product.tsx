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
  View
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
  id: string;
  vendor_id: number;
  product_code: string | null;
  title: string | null;
  inventory_qty: number | null;
  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;
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
  if (v && typeof v === "object") return v;
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

export default function UpdateProductScreen() {
  const router = useRouter();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => {
    return products.find((p) => p.id === selectedId) ?? null;
  }, [products, selectedId]);

  // ✅ picker visibility: once selected, hide list and show only the product editor
  const [pickerOpen, setPickerOpen] = useState(true);

  // ✅ Allowed edits only
  const [title, setTitle] = useState("");
  const [inventoryQty, setInventoryQty] = useState<number>(0);

  // ✅ Cost mode is read-only (comes from DB), but costs are editable.
  const [priceMode, setPriceMode] = useState<"stitched_total" | "unstitched_per_meter">(
    "unstitched_per_meter"
  );
  const [priceTotal, setPriceTotal] = useState<number>(0);
  const [pricePerMeter, setPricePerMeter] = useState<number>(0);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  // ✅ Dyeing (unstitched): vendor can update toggle + cost
  const [dyeingEnabled, setDyeingEnabled] = useState<boolean>(false);
  const [dyeingCost, setDyeingCost] = useState<number>(0);

  // ✅ Tailoring (unstitched): vendor can update toggle + cost + turnaround
  const [tailoringEnabled, setTailoringEnabled] = useState<boolean>(false);
  const [tailoringCost, setTailoringCost] = useState<number>(0);
  const [tailoringTurnaroundDays, setTailoringTurnaroundDays] = useState<number>(0);

  // ✅ NEW: video thumbs (best-effort) so multi-select videos still render nice tiles
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});

  const resolvePublicUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    if (isHttpUrl(path)) return path;
    const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, []);

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
          "id, vendor_id, product_code, title, inventory_qty, spec, price, media, created_at, updated_at"
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) {
        Alert.alert("Load error", error.message);
        return;
      }

      setProducts((data as any) ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load products.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // When selecting a product, hydrate editor state from its DB fields
  useEffect(() => {
    if (!selected) return;

    setTitle(safeText(selected.title));
    setInventoryQty(safeNumOrZero(selected.inventory_qty));

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
        : []
    );

    // ✅ Dyeing
    const dyeOn = Boolean(spec?.dyeing_enabled);
    setDyeingEnabled(dyeOn);

    const dyeCostFromPrice = safeNumOrZero(price?.dyeing_cost_pkr ?? 0);
    const dyeCostFromSpec = safeNumOrZero(spec?.dyeing_cost_pkr ?? 0);
    setDyeingCost(dyeCostFromPrice > 0 ? dyeCostFromPrice : dyeCostFromSpec);

    // ✅ Tailoring
    const tailorOn = Boolean(spec?.tailoring_enabled);
    setTailoringEnabled(tailorOn);

    const tailorCostFromPrice = safeNumOrZero(price?.tailoring_cost_pkr ?? 0);
    setTailoringCost(tailorCostFromPrice);

    const daysFromSpec = safeNumOrZero(spec?.tailoring_turnaround_days ?? 0);
    setTailoringTurnaroundDays(daysFromSpec);
  }, [selected]);

  // ✅ If toggled OFF, clear associated values (best UX, and matches Add Product behavior)
  useEffect(() => {
    if (!dyeingEnabled && dyeingCost !== 0) setDyeingCost(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyeingEnabled]);

  useEffect(() => {
    if (!tailoringEnabled) {
      if (tailoringCost !== 0) setTailoringCost(0);
      if (tailoringTurnaroundDays !== 0) setTailoringTurnaroundDays(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailoringEnabled]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const code = String(p.product_code ?? "").toLowerCase();
      const t = String(p.title ?? "").toLowerCase();
      return code.includes(q) || t.includes(q);
    });
  }, [products, query]);

  const inventoryEditable = useMemo(() => {
    // ✅ If inventory_qty is null => made-on-order => hide inventory + do not update it
    if (!selected) return false;
    return selected.inventory_qty !== null && selected.inventory_qty !== undefined;
  }, [selected]);

  const media = useMemo(() => safeJson(selected?.media), [selected]);
  const imagePaths = useMemo(
    () => (Array.isArray(media?.images) ? media.images.map(String) : []),
    [media]
  );
  const videoPaths = useMemo(
    () => (Array.isArray(media?.videos) ? media.videos.map(String) : []),
    [media]
  );
  const thumbPaths = useMemo(
    () => (Array.isArray(media?.thumbs) ? media.thumbs.map(String) : []),
    [media]
  );

  const imageUrls = useMemo(
    () => imagePaths.map((p) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [imagePaths, resolvePublicUrl]
  );
  const videoUrls = useMemo(
    () => videoPaths.map((p) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [videoPaths, resolvePublicUrl]
  );
  const thumbUrls = useMemo(
    () => thumbPaths.map((p) => resolvePublicUrl(p)).filter(Boolean) as string[],
    [thumbPaths, resolvePublicUrl]
  );

  // ✅ Best-effort thumbs for videos when DB thumbs are missing
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
        // eslint-disable-next-line no-await-in-loop
        await ensureThumb(list[i]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(videoUrls)]);

  const isUnstitched = priceMode === "unstitched_per_meter";

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
        const t = Number(tailoringCost ?? 0);
        if (!Number.isFinite(t) || t <= 0) return false;

        const days = Number(tailoringTurnaroundDays ?? 0);
        if (!Number.isFinite(days) || days < 0) return false;
      }
    } else {
      const n = Number(priceTotal ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
      // availableSizes optional
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
    tailoringTurnaroundDays
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

      // ✅ Keep mode read-only, update only the costs and related options
      let nextPrice: any = {
        ...(prevPrice ?? {}),
        mode: priceMode
      };

      if (priceMode === "unstitched_per_meter") {
        nextPrice = {
          ...nextPrice,
          cost_pkr_per_meter: Number(pricePerMeter ?? 0),
          // store dyeing + tailoring costs in price JSONB (matches Add Product)
          dyeing_cost_pkr: dyeingEnabled ? Number(dyeingCost ?? 0) : 0,
          tailoring_cost_pkr: tailoringEnabled ? Number(tailoringCost ?? 0) : 0
        };

        // optional: clear stitched fields if present
        if ("cost_pkr_total" in nextPrice) {
          nextPrice.cost_pkr_total = nextPrice.cost_pkr_total ?? undefined;
        }
      } else {
        nextPrice = {
          ...nextPrice,
          cost_pkr_total: Number(priceTotal ?? 0),
          available_sizes: (availableSizes ?? [])
            .map((x) => String(x).trim())
            .filter(Boolean)
        };

        // if stitched, force dyeing/tailoring off in snapshots
        nextPrice.dyeing_cost_pkr = 0;
        nextPrice.tailoring_cost_pkr = 0;
      }

      const nextSpec: any = {
        ...(prevSpec ?? {})
      };

      if (priceMode === "unstitched_per_meter") {
        nextSpec.dyeing_enabled = Boolean(dyeingEnabled);
        nextSpec.tailoring_enabled = Boolean(tailoringEnabled);
        nextSpec.tailoring_turnaround_days = tailoringEnabled
          ? Math.max(0, Number(tailoringTurnaroundDays ?? 0))
          : 0;
      } else {
        // stitched => disable these service flags
        nextSpec.dyeing_enabled = false;
        nextSpec.tailoring_enabled = false;
        nextSpec.tailoring_turnaround_days = 0;
      }

      const updatePayload: any = {
        title: title.trim(),
        price: nextPrice,
        spec: nextSpec,
        updated_at: new Date().toISOString()
      };

      if (inventoryEditable) {
        updatePayload.inventory_qty = Number(inventoryQty ?? 0);
      }

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, spec, price, media, created_at, updated_at"
        )
        .single();

      if (error) {
        Alert.alert("Update failed", error.message);
        return;
      }

      const updated = data as any as ProductRow;
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
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, spec, price, media, created_at, updated_at"
        )
        .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

      const updated = data as any as ProductRow;
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
      images
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
      thumbs
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
      encoding: FileSystem.EncodingType.Base64
    });
    const arrayBuffer = decode(base64);

    const folder = args.kind === "image" ? "images" : "videos";
    const filename = `${Date.now()}_${args.index}_${Math.random().toString(16).slice(2)}.${ext}`;
    const storagePath = `vendors/${args.vendorId}/products/${args.productCode}/${folder}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_VENDOR)
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false
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

      // ✅ MULTI-SELECT + NO LIMIT (same as Add Product)
      allowsMultipleSelection: true
      // selectionLimit removed => unlimited
    });

    if (result.canceled) return;

    const assets = (result.assets ?? []).filter((a: any) => !!a?.uri);
    if (!assets.length) return;

    try {
      setSavingMedia(true);

      const productCode = String(selected.product_code);

      // start from current media
      const m = safeJson(selected.media);
      const nextImages = Array.isArray(m.images) ? [...m.images] : [];
      const nextVideos = Array.isArray(m.videos) ? [...m.videos] : [];
      const nextThumbs = Array.isArray(m.thumbs) ? [...m.thumbs] : [];

      // prevent duplicates by filename/path? (we can only dedupe by uri before upload)
      const seenUri = new Set<string>();

      for (let i = 0; i < assets.length; i++) {
        const uri = String(assets[i]?.uri || "").trim();
        if (!uri) continue;
        if (seenUri.has(uri)) continue;
        seenUri.add(uri);

        // eslint-disable-next-line no-await-in-loop
        const storagePath = await uploadOneAsset({
          kind,
          uri,
          vendorId,
          productCode,
          index: i
        });

        if (kind === "image") {
          nextImages.push(storagePath);
        } else {
          nextVideos.push(storagePath);

          // ✅ create thumb and upload (optional, best-effort)
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
              time: 1500
            });

            if (thumbUri) {
              // eslint-disable-next-line no-await-in-loop
              const thumbPath = await uploadOneAsset({
                kind: "image",
                uri: thumbUri,
                vendorId,
                productCode,
                index: i
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
        thumbs: nextThumbs
      };

      const updatePayload = {
        media: next,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updatePayload)
        .eq("id", selectedId)
        .eq("vendor_id", vendorId)
        .select(
          "id, vendor_id, product_code, title, inventory_qty, spec, price, media, created_at, updated_at"
        )
        .single();

      if (error) {
        Alert.alert("Media update failed", error.message);
        return;
      }

      const updated = data as any as ProductRow;
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

      {/* ✅ Product Picker (collapses after selection) */}
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
                {filtered.slice(0, 30).map((p) => {
                  const isOn = p.id === selectedId;
                  const code = safeText(p.product_code);
                  const t = safeText(p.title);

                  return (
                    <Pressable
                      key={p.id}
                      style={({ pressed }) => [
                        styles.item,
                        isOn ? styles.itemOn : null,
                        pressed ? styles.pressed : null
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

            {inventoryEditable ? (
              <>
                <Text style={styles.label}>Inventory Quantity *</Text>
                <TextInput
                  value={String(inventoryQty ?? 0)}
                  onChangeText={(t) => setInventoryQty(Number(sanitizeNumber(t) || "0"))}
                  placeholder="e.g., 10"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </>
            ) : null}

            {/* ✅ Fixed info (read-only): Cost Mode */}
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
                        .filter(Boolean)
                    )
                  }
                  placeholder="e.g., XS, S, M, L, XL, XXL, All"
                  placeholderTextColor={stylesVars.placeholder}
                  style={styles.input}
                  maxLength={80}
                />

                <Text style={styles.hint}>
                  Dyeing & stitching services apply only to unstitched products.
                </Text>
              </>
            ) : (
              <>
                {/* ✅ Unstitched only: editable cost per meter */}
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

                {/* ✅ Dyeing toggle + cost */}
                <View style={styles.dyeRow}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Dyeable</Text>

                  <Pressable
                    onPress={() => {
                      if (!isUnstitched) return;
                      setDyeingEnabled((v) => !v);
                    }}
                    style={({ pressed }) => [
                      styles.dyePill,
                      dyeingEnabled ? styles.dyePillOn : null,
                      pressed ? styles.pressed : null
                    ]}
                  >
                    <Text
                      style={[
                        styles.dyePillText,
                        dyeingEnabled ? styles.dyePillTextOn : null
                      ]}
                    >
                      {dyeingEnabled ? "Yes" : "No"}
                    </Text>
                  </Pressable>
                </View>

                {dyeingEnabled ? (
                  <>
                    <Text style={styles.dyeHint}>
                      Buyer will pick a dye shade at checkout (only for dyeable unstitched cloth).
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

                {/* ✅ Tailoring toggle + cost + turnaround */}
                <View style={styles.tailorRow}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Stitching available</Text>

                  <Pressable
                    onPress={() => {
                      if (!isUnstitched) return;
                      setTailoringEnabled((v) => !v);
                    }}
                    style={({ pressed }) => [
                      styles.tailorPill,
                      tailoringEnabled ? styles.tailorPillOn : null,
                      pressed ? styles.pressed : null
                    ]}
                  >
                    <Text
                      style={[
                        styles.tailorPillText,
                        tailoringEnabled ? styles.tailorPillTextOn : null
                      ]}
                    >
                      {tailoringEnabled ? "Yes" : "No"}
                    </Text>
                  </Pressable>
                </View>

                {tailoringEnabled ? (
                  <>
                    <Text style={styles.tailorHint}>
                      Buyer will choose “Yes/No” for stitching at checkout (unstitched only).
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
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => pickAndUpload("image")}
                disabled={savingMedia}
                style={({ pressed }) => [
                  styles.smallBtn,
                  savingMedia ? styles.smallBtnDisabled : null,
                  pressed ? styles.pressed : null
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
                  pressed ? styles.pressed : null
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

            <Text style={styles.hint}>
              Tip: Use ✕ to remove a media item. Use “Add” to upload and attach new files.
            </Text>
          </>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          !canSave || saving ? styles.saveBtnDisabled : null,
          pressed ? styles.pressed : null
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

  card: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 14
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },

  selectedBox: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.blueSoft,
    padding: 12
  },
  selectedCode: { fontSize: 12, fontWeight: "900", color: stylesVars.blue },
  selectedTitle: { marginTop: 3, fontSize: 13, fontWeight: "800", color: "#111" },

  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  smallBtnDisabled: { opacity: 0.5 },
  smallBtnText: { color: stylesVars.blue, fontWeight: "900", fontSize: 12 },

  label: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.2
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
    backgroundColor: "#fff"
  },

  // ✅ read-only pill (for fixed fields like mode)
  fixedPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  fixedPillText: { color: stylesVars.blue, fontWeight: "900", fontSize: 12 },

  metaLine: { marginTop: 8, color: stylesVars.subText, fontWeight: "800" },
  metaStrong: { color: stylesVars.blue, fontWeight: "900" },
  metaSmall: { marginTop: 10, color: stylesVars.subText, fontWeight: "900", fontSize: 12 },

  topActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  refresh: { fontSize: 14, fontWeight: "900", color: "#005ea6" },
  disabledText: { opacity: 0.6 },

  list: { gap: 10, marginTop: 12 },

  item: {
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  itemOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  itemLeft: { flex: 1, paddingRight: 10 },
  itemCode: { fontSize: 12, fontWeight: "900", color: stylesVars.blue },
  itemTitle: { marginTop: 2, fontSize: 13, fontWeight: "800", color: "#111" },
  itemArrow: { fontSize: 18, fontWeight: "900", color: stylesVars.subText },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10
  },
  loadingText: { color: stylesVars.subText, fontWeight: "800" },

  hint: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },

  thumbRow: { flexDirection: "row", gap: 10, paddingTop: 10, paddingBottom: 4 },

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
    justifyContent: "center"
  },
  thumbXText: { color: stylesVars.danger, fontWeight: "900", fontSize: 12 },

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
    left: 6,
    bottom: 6,
    backgroundColor: "rgba(11,47,107,0.92)",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  playBadgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  saveBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: stylesVars.blue
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  warn: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },
  empty: { marginTop: 10, color: stylesVars.subText, fontWeight: "800" },
  emptyInline: { marginTop: 8, color: stylesVars.subText, fontWeight: "800" },

  // ✅ Dyeing styles
  dyeRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  dyePill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff"
  },
  dyePillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft
  },
  dyePillText: { fontSize: 12, fontWeight: "900", color: stylesVars.text },
  dyePillTextOn: { color: stylesVars.blue },
  dyeHint: { marginTop: 8, color: stylesVars.subText, fontWeight: "800", fontSize: 12 },

  // ✅ Tailoring styles
  tailorRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  tailorPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff"
  },
  tailorPillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft
  },
  tailorPillText: { fontSize: 12, fontWeight: "900", color: stylesVars.text },
  tailorPillTextOn: { color: stylesVars.blue },
  tailorHint: { marginTop: 8, color: stylesVars.subText, fontWeight: "800", fontSize: 12 },

  pressed: { opacity: 0.75 }
});