// app/vendor/profile/add-product.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";

const BUCKET_VENDOR = "vendor_images";
const PRODUCTS_TABLE = "products";

// Individual modal file names in /vendor/profile/(product-modals)/
const MODALS = [
  "dress-type_modal",
  "fabric_modal",
  "color_modal",
  "work_modal",
  "work-density_modal",
  "origin-city_modal",
  "wear-state_modal"
] as const;

type ModalName = (typeof MODALS)[number];

function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

async function uploadAssetToStorage(args: {
  bucket: string;
  path: string;
  uri: string;
  contentType: string;
}) {
  const base64 = await FileSystem.readAsStringAsync(args.uri, {
    encoding: FileSystem.EncodingType.Base64
  });
  const buffer = decode(base64);

  const { data, error } = await supabase.storage
    .from(args.bucket)
    .upload(args.path, buffer, { contentType: args.contentType, upsert: true });

  if (error) throw new Error(error.message);
  return data?.path ?? null;
}

// Show ALL picked values (no "+2" truncation)
function formatPicked(list: any, emptyLabel: string) {
  const arr = Array.isArray(list) ? list : [];
  const cleaned = arr.map((x) => safeStr(x)).filter(Boolean);
  if (!cleaned.length) return emptyLabel;
  return cleaned.join(", ");
}

export default function AddProductScreen() {
  const router = useRouter();

  // This screen’s route (origin screen for these modals)
  const returnTo = "/vendor/profile/add-product";

  // Vendor id (Redux for vendor identity only)
  // NOTE: your vendor table uses bigint id, so we treat it as number.
  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  // Product Draft Context (ALL product fields live here)
  const {
    draft,
    setTitle,
    setInventoryQty,
    setPriceMode,
    setPricePerMeter,
    setPriceTotal,
    setAvailableSizes,
    setImages,
    setVideos,
    resetDraft
  } = useProductDraft();

  const [saving, setSaving] = useState(false);

  // Made-on-order toggle (stores flag in spec; inventory_qty saved as 0)
  const [madeOnOrder, setMadeOnOrder] = useState<boolean>(() => {
    return Boolean((draft.spec as any)?.made_on_order ?? false);
  });

  // Video thumbs for picked videos (uri -> thumb uri)
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});

  // Generate thumbs whenever picked videos change (best-effort)
  useEffect(() => {
    let alive = true;

    const vids: any[] = draft.media.videos ?? [];
    const uris = vids.map((v) => safeStr(v?.uri)).filter(Boolean);

    (async () => {
      for (const uri of uris) {
        if (!alive) return;
        if (videoThumbs[uri]) continue;

        try {
          const t = await VideoThumbnails.getThumbnailAsync(uri, { time: 1500 });
          if (!alive) return;
          if (t?.uri) {
            setVideoThumbs((prev) => {
              if (prev[uri]) return prev;
              return { ...prev, [uri]: t.uri };
            });
          }
        } catch {
          // ignore thumb failures
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.media.videos]);

  const canSave = useMemo(() => {
    if (!vendorId) return false;
    if (!draft.title.trim()) return false;

    if (draft.price.mode === "unstitched_per_meter") {
      const n = Number(draft.price.cost_pkr_per_meter ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    } else {
      const n = Number(draft.price.cost_pkr_total ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    }

    if ((draft.media.images ?? []).length < 1) return false;
    if ((draft.spec.dressTypeIds ?? []).length < 1) return false;

    // Inventory validation:
    // - if made on order: allow (we will save inventory_qty = 0)
    // - else: require >= 0 integer (your DB check enforces >= 0 anyway)
    if (!madeOnOrder) {
      const q = Number(draft.inventory_qty ?? 0);
      if (!Number.isFinite(q) || q < 0) return false;
    }

    return true;
  }, [vendorId, draft, madeOnOrder]);

  function goPickModal(name: ModalName) {
    // DO NOT TOUCH: navigation is already correct per your instruction.
    const encoded = encodeURIComponent(returnTo);
    router.push(
      `/vendor/profile/(product-modals)/${name}?returnTo=${encoded}` as any
    );
  }

  function dressTypeSummary() {
    const names = (draft.spec as any)?.dressTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Not set");
    }

    const ids = (draft.spec.dressTypeIds ?? []).map((x) => String(x));
    if (!ids.length) return "Not set";
    return `${ids.length} selected`;
  }

  function fabricSummary() {
    const names = (draft.spec as any)?.fabricTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Any");
    }

    const list = (draft.spec.fabricTypeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function colorSummary() {
    const names = (draft.spec as any)?.colorShadeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Any");
    }

    const list = (draft.spec.colorShadeIds ?? []) as any[];
    if (!list.length) return "Any";

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

    const mapped = list.map((id) => map[String(id)] ?? String(id));
    return formatPicked(mapped, "Any");
  }

  function workSummary() {
    const names = (draft.spec as any)?.workTypeNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Any");
    }

    const list = (draft.spec.workTypeIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function densitySummary() {
    const names = (draft.spec as any)?.workDensityNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Any");
    }

    const list = (draft.spec.workDensityIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function originSummary() {
    const names = (draft.spec as any)?.originCityNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Any");
    }

    const list = (draft.spec.originCityIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  function wearStateSummary() {
    const names = (draft.spec as any)?.wearStateNames as any[] | undefined;
    if (Array.isArray(names) && names.length) {
      return formatPicked(names, "Any");
    }

    const list = (draft.spec.wearStateIds ?? []) as any[];
    return list.length ? `${list.length} selected` : "Any";
  }

  async function pickImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.9
    });

    if (res.canceled) return;

    setImages((prev) => {
      const seen = new Set(prev.map((a) => a.uri));
      const next = [...prev];
      for (const a of res.assets) {
        if (!seen.has(a.uri)) next.push(a);
      }
      return next.slice(0, 8);
    });
  }

  async function pickVideos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 1
    });

    if (res.canceled) return;

    setVideos((prev) => {
      const seen = new Set(prev.map((a) => a.uri));
      const next = [...prev];
      for (const a of res.assets) {
        if (!seen.has(a.uri)) next.push(a);
      }
      return next.slice(0, 4);
    });
  }

  async function saveProduct() {
    if (saving) return;

    if (!canSave) {
      Alert.alert("Incomplete", "Please fill required fields and selections.");
      return;
    }

    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor id is loaded.");
      return;
    }

    try {
      setSaving(true);

      // IMPORTANT:
      // Your DB now enforces vendor_seq + product_code via trigger: products_assign_code()
      // So we DO NOT generate serials here. DB guarantees:
      // - vendor-wise increasing serial (vendor_seq)
      // - never reuse (unique vendor_id + vendor_seq)
      // - product_code unique
      // Just insert minimal fields and read back id/product_code.

      const inventoryQty = madeOnOrder ? 0 : Number(draft.inventory_qty ?? 0);

      const insertPayload: any = {
        vendor_id: vendorId,
        title: safeStr(draft.title),
        inventory_qty: Number.isFinite(inventoryQty) ? Math.trunc(inventoryQty) : 0,
        spec: {
          ...(draft.spec ?? {}),
          made_on_order: Boolean(madeOnOrder)
        },
        price: draft.price,
        media: {
          images: [],
          videos: [],
          thumbs: []
        }
      };

      const { data: created, error: insertErr } = await supabase
        .from(PRODUCTS_TABLE)
        .insert(insertPayload)
        .select("id, product_code")
        .single();

      if (insertErr) {
        Alert.alert("Save failed", insertErr.message);
        return;
      }

      const productId = created?.id as string | undefined;
      const finalCode = created?.product_code as string | undefined;

      if (!productId || !finalCode) {
        Alert.alert("Save failed", "Product id/code not returned.");
        return;
      }

      // 2) Upload media to vendor_images under vendors/{vendor_id}/products/{product_code}/...
      const imageAssets = draft.media.images ?? [];
      const videoAssets = draft.media.videos ?? [];

      const uploadedImagePaths: string[] = [];
      for (let i = 0; i < imageAssets.length; i++) {
        const a: any = imageAssets[i];
        const uri = a?.uri;
        if (!uri) continue;

        const mimeType = safeStr(a?.mimeType) || "image/jpeg";
        const ext =
          safeStr(a?.fileName).split(".").pop()?.toLowerCase() ||
          mimeType.split("/")[1] ||
          "jpg";

        const path = `vendors/${vendorId}/products/${finalCode}/images/${Date.now()}-${i}.${ext}`;

        const p = await uploadAssetToStorage({
          bucket: BUCKET_VENDOR,
          path,
          uri,
          contentType: mimeType.startsWith("image/") ? mimeType : "image/jpeg"
        });

        if (p) uploadedImagePaths.push(p);
      }

      const uploadedVideoPaths: string[] = [];
      const uploadedThumbPaths: string[] = [];

      for (let i = 0; i < videoAssets.length; i++) {
        const a: any = videoAssets[i];
        const uri = a?.uri;
        if (!uri) continue;

        const mimeType = safeStr(a?.mimeType) || "video/mp4";
        const vPath = `vendors/${vendorId}/products/${finalCode}/videos/${Date.now()}-${i}.mp4`;

        const vp = await uploadAssetToStorage({
          bucket: BUCKET_VENDOR,
          path: vPath,
          uri,
          contentType: mimeType.startsWith("video/") ? mimeType : "video/mp4"
        });

        if (vp) uploadedVideoPaths.push(vp);

        // Optional thumb (same library as venues)
        try {
          const t = await VideoThumbnails.getThumbnailAsync(uri, { time: 1500 });
          if (t?.uri) {
            const tPath = `vendors/${vendorId}/products/${finalCode}/thumbs/${Date.now()}-${i}.jpg`;
            const tp = await uploadAssetToStorage({
              bucket: BUCKET_VENDOR,
              path: tPath,
              uri: t.uri,
              contentType: "image/jpeg"
            });
            if (tp) uploadedThumbPaths.push(tp);
          }
        } catch {
          // thumb is optional
        }
      }

      // 3) Update product row media JSONB with storage paths
      const media = {
        images: uploadedImagePaths,
        videos: uploadedVideoPaths,
        thumbs: uploadedThumbPaths
      };

      const { error: updErr } = await supabase
        .from(PRODUCTS_TABLE)
        .update({
          media,
          updated_at: new Date().toISOString()
        })
        .eq("id", productId);

      if (updErr) {
        Alert.alert("Saved, but media update failed", updErr.message);
        return;
      }

      // Done -> go to Products and pass new_product_id so products.tsx can insert at top
      Alert.alert("Saved", `Product created: ${finalCode}`);
      resetDraft();
      router.replace(
        `/vendor/profile/products?new_product_id=${encodeURIComponent(
          productId
        )}` as any
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  const imageCount = (draft.media.images ?? []).length;
  const videoCount = (draft.media.videos ?? []).length;

  const dressTypeValue = dressTypeSummary();
  const fabricValue = fabricSummary();
  const colorValue = colorSummary();
  const workValue = workSummary();
  const densityValue = densitySummary();
  const originValue = originSummary();
  const wearValue = wearStateSummary();

  const pickedImages: any[] = draft.media.images ?? [];
  const pickedVideos: any[] = draft.media.videos ?? [];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Add New Product</Text>

        <View style={styles.headerRight}>
          {saving ? (
            <View style={styles.savingPill}>
              <ActivityIndicator />
              <Text style={styles.savingText}>Saving…</Text>
            </View>
          ) : null}

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
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          value={draft.title}
          onChangeText={setTitle}
          placeholder="e.g., Bridal heavy embroidered lehenga"
          placeholderTextColor={stylesVars.placeholder}
          style={styles.input}
          maxLength={80}
        />

        <View style={styles.inventoryTopRow}>
          <Text style={[styles.label, { marginTop: 0 }]}>
            Inventory Quantity *
          </Text>

          <Pressable
            onPress={() => setMadeOnOrder((v) => !v)}
            style={({ pressed }) => [
              styles.madeOnOrderPill,
              madeOnOrder ? styles.madeOnOrderPillOn : null,
              pressed ? styles.pressed : null
            ]}
          >
            <Text
              style={[
                styles.madeOnOrderText,
                madeOnOrder ? styles.madeOnOrderTextOn : null
              ]}
            >
              Made on order
            </Text>
          </Pressable>
        </View>

        {madeOnOrder ? (
          <Text style={styles.madeOnOrderHint}>
            This product will be shown as “Made on order”.
          </Text>
        ) : null}

        <TextInput
          value={String(draft.inventory_qty ?? 0)}
          onChangeText={(t) =>
            setInventoryQty(Number(sanitizeNumber(t) || "0"))
          }
          placeholder="e.g., 10"
          placeholderTextColor={stylesVars.placeholder}
          style={[styles.input, madeOnOrder ? styles.inputDisabled : null]}
          keyboardType="number-pad"
          maxLength={10}
          editable={!madeOnOrder}
        />

        <Text style={styles.label}>Cost *</Text>
        <View style={styles.segmentRow}>
          <Pressable
            onPress={() => setPriceMode("stitched_total")}
            style={({ pressed }) => [
              styles.segment,
              draft.price.mode === "stitched_total" ? styles.segmentOn : null,
              pressed ? styles.pressed : null
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                draft.price.mode === "stitched_total"
                  ? styles.segmentTextOn
                  : null
              ]}
            >
              Stitched / Ready-to-wear
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPriceMode("unstitched_per_meter")}
            style={({ pressed }) => [
              styles.segment,
              draft.price.mode === "unstitched_per_meter"
                ? styles.segmentOn
                : null,
              pressed ? styles.pressed : null
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                draft.price.mode === "unstitched_per_meter"
                  ? styles.segmentTextOn
                  : null
              ]}
            >
              Unstitched (PKR/meter)
            </Text>
          </Pressable>
        </View>

        {draft.price.mode === "stitched_total" ? (
          <>
            <Text style={styles.label}>Total Cost (PKR) *</Text>
            <TextInput
              value={String(draft.price.cost_pkr_total ?? "")}
              onChangeText={(t) =>
                setPriceTotal(Number(sanitizeNumber(t) || "0"))
              }
              placeholder="e.g., 25000"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              keyboardType="decimal-pad"
              maxLength={12}
            />

            <Text style={styles.label}>Available Sizes (comma separated)</Text>
            <TextInput
              value={(draft.price.available_sizes ?? []).join(", ")}
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
          </>
        ) : (
          <>
            <Text style={styles.label}>Cost per Meter (PKR) *</Text>
            <TextInput
              value={String(draft.price.cost_pkr_per_meter ?? "")}
              onChangeText={(t) =>
                setPricePerMeter(Number(sanitizeNumber(t) || "0"))
              }
              placeholder="e.g., 1800"
              placeholderTextColor={stylesVars.placeholder}
              style={styles.input}
              keyboardType="decimal-pad"
              maxLength={12}
            />
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Media</Text>

        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={pickImages}
            disabled={saving}
          >
            <Text style={styles.primaryText}>
              Pick Images {imageCount ? `(${imageCount})` : ""}
            </Text>
          </Pressable>

          {pickedImages.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {pickedImages.map((a: any, idx: number) => {
                const uri = safeStr(a?.uri);
                if (!uri) return null;
                return (
                  <View key={`${uri}-${idx}`} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumbImg} />
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={pickVideos}
            disabled={saving}
          >
            <Text style={styles.secondaryText}>
              Pick Videos {videoCount ? `(${videoCount})` : ""}
            </Text>
          </Pressable>

          {pickedVideos.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {pickedVideos.map((a: any, idx: number) => {
                const uri = safeStr(a?.uri);
                if (!uri) return null;

                const tUri = videoThumbs[uri];

                return (
                  <View key={`${uri}-${idx}`} style={styles.thumbWrap}>
                    {tUri ? (
                      <Image source={{ uri: tUri }} style={styles.thumbImg} />
                    ) : (
                      <View style={styles.videoThumbFallback}>
                        <Text style={styles.videoThumbText}>Video</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Build Product Description
        </Text>

        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("dress-type_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Dress Type *</Text>
            <Text style={styles.pickValue}>{dressTypeValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("fabric_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Fabric</Text>
            <Text style={styles.pickValue}>{fabricValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("color_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Color</Text>
            <Text style={styles.pickValue}>{colorValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("work_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Work</Text>
            <Text style={styles.pickValue}>{workValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("work-density_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Density</Text>
            <Text style={styles.pickValue}>{densityValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("origin-city_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Origin</Text>
            <Text style={styles.pickValue}>{originValue}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("wear-state_modal")}
            disabled={saving}
          >
            <Text style={styles.pickTitle}>Wear State</Text>
            <Text style={styles.pickValue}>{wearValue}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          !canSave || saving ? styles.saveBtnDisabled : null,
          pressed ? styles.pressed : null
        ]}
        onPress={saveProduct}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveText}>{saving ? "Saving…" : "Save Product"}</Text>
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
  placeholder: "#94A3B8"
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: stylesVars.bg },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 20, fontWeight: "900", color: stylesVars.blue },

  savingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  savingText: { color: stylesVars.blue, fontWeight: "900", fontSize: 12 },

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

  label: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "900",
    color: stylesVars.blue,
    letterSpacing: 0.2
  },

  inventoryTopRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },

  madeOnOrderPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: "#fff"
  },
  madeOnOrderPillOn: {
    borderColor: stylesVars.blue,
    backgroundColor: stylesVars.blueSoft
  },
  madeOnOrderText: { fontSize: 12, fontWeight: "900", color: stylesVars.text },
  madeOnOrderTextOn: { color: stylesVars.blue },

  madeOnOrderHint: {
    marginTop: 6,
    color: stylesVars.subText,
    fontWeight: "800",
    fontSize: 12
  },

  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: "#fff"
  },
  inputDisabled: { opacity: 0.55 },

  sectionTitle: { fontSize: 13, fontWeight: "900", color: stylesVars.blue },

  segmentRow: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
  segment: {
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  segmentOn: {
    backgroundColor: stylesVars.blueSoft,
    borderColor: stylesVars.blue
  },
  segmentText: { color: stylesVars.text, fontWeight: "900", fontSize: 12 },
  segmentTextOn: { color: stylesVars.blue },

  btnRow: { marginTop: 12, gap: 10 },

  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blue,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: stylesVars.blue,
    alignItems: "center"
  },
  secondaryText: { color: stylesVars.blue, fontWeight: "900", fontSize: 14 },

  thumbRow: {
    paddingTop: 6,
    gap: 8
  },
  thumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: "#f3f4f6"
  },
  thumbImg: { width: 54, height: 54 },
  videoThumbFallback: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center"
  },
  videoThumbText: { fontWeight: "900", color: "#111", opacity: 0.7 },

  pickBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  pickTitle: { color: stylesVars.blue, fontWeight: "900", fontSize: 13 },
  pickValue: {
    marginTop: 4,
    color: stylesVars.text,
    opacity: 0.8,
    fontSize: 12
  },

  saveBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: stylesVars.blue
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  warn: { marginTop: 10, color: stylesVars.subText },

  pressed: { opacity: 0.75 }
});
