// app/vendor/profile/add-product/submit.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";

const BUCKET_VENDOR = "vendor_images";
const PRODUCTS_TABLE = "products";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type TailoringStylePresetImage = {
  uri?: string | null;
  url?: string | null;
  path?: string | null;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

type TailoringStylePreset = {
  id?: string;
  title?: string;
  note?: string;
  extra_cost_pkr?: number;
  images?: TailoringStylePresetImage[];
  default_neck?: string;
  default_sleeve?: string;
  default_trouser?: string;
  allowed_neck_variations?: string[];
  allowed_sleeve_variations?: string[];
  allowed_trouser_variations?: string[];
  allow_custom_note?: boolean;
};

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeNumOrZero(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function normalizeStringArray(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of arr) {
    const s = safeStr(item);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function normalizePresetArray(v: unknown): TailoringStylePreset[] {
  return Array.isArray(v) ? (v as TailoringStylePreset[]) : [];
}

async function uploadAssetToStorage(args: {
  bucket: string;
  path: string;
  uri: string;
  contentType: string;
}) {
  const base64 = await FileSystem.readAsStringAsync(args.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buffer = decode(base64);

  const { data, error } = await supabase.storage
    .from(args.bucket)
    .upload(args.path, buffer, { contentType: args.contentType, upsert: true });

  if (error) throw new Error(error.message);
  return data?.path ?? null;
}

function inferCategoryFromDraft(draft: any): ProductCategory {
  const spec = draft?.spec ?? {};
  const price = draft?.price ?? {};
  const fromSpec = safeStr((spec as any)?.product_category ?? "");
  if (
    fromSpec === "unstitched_plain" ||
    fromSpec === "unstitched_dyeing" ||
    fromSpec === "unstitched_dyeing_tailoring" ||
    fromSpec === "stitched_ready"
  ) {
    return fromSpec as ProductCategory;
  }

  const mode = safeStr(price?.mode ?? "");
  if (mode === "stitched_total") return "stitched_ready";

  const dye = Boolean(spec?.dyeing_enabled);
  const tail = Boolean(spec?.tailoring_enabled);

  if (tail) return "unstitched_dyeing_tailoring";
  if (dye) return "unstitched_dyeing";
  return "unstitched_plain";
}

function hasValidSizeLengthMap(v: any) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;

  const keys = ["XS", "S", "M", "L", "XL", "XXL"];
  for (const key of keys) {
    const n = Number(v[key]);
    if (Number.isFinite(n) && n > 0) return true;
  }
  return false;
}

function hasValidPackageCm(v: any) {
  const length = Number(v?.length);
  const width = Number(v?.width);
  const height = Number(v?.height);

  return (
    Number.isFinite(length) &&
    length > 0 &&
    Number.isFinite(width) &&
    width > 0 &&
    Number.isFinite(height) &&
    height > 0
  );
}
function hasValidTailoringPreset(
  preset: TailoringStylePreset,
  includesTrouser: boolean,
) {
  const title = safeStr(preset?.title);
  const images = Array.isArray(preset?.images) ? preset.images : [];

  if (!title) return false;
  if (images.length < 1) return false;

  return true;
}

async function uploadTailoringPresetImages(args: {
  vendorId: number;
  productCode: string;
  presets: TailoringStylePreset[];
}) {
  const nextPresets: TailoringStylePreset[] = [];

  for (let presetIndex = 0; presetIndex < args.presets.length; presetIndex++) {
    const preset = args.presets[presetIndex];
    const images = Array.isArray(preset?.images) ? preset.images : [];
    const uploadedImages: TailoringStylePresetImage[] = [];

    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      const img = images[imageIndex] ?? {};
      const rawUri = safeStr((img as any)?.uri ?? "");
      const rawUrl = safeStr((img as any)?.url ?? "");
      const rawPath = safeStr((img as any)?.path ?? "");

      if (rawPath && rawUrl) {
        uploadedImages.push({
          ...img,
          uri: rawUrl,
          url: rawUrl,
          path: rawPath,
        });
        continue;
      }

      if (rawPath && !rawUrl) {
        const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(rawPath);
        uploadedImages.push({
          ...img,
          uri: data?.publicUrl ?? rawUri ?? "",
          url: data?.publicUrl ?? "",
          path: rawPath,
        });
        continue;
      }

      if (!rawUri) continue;

      const mimeType = safeStr((img as any)?.mimeType) || "image/jpeg";
      const ext =
        safeStr((img as any)?.fileName).split(".").pop()?.toLowerCase() ||
        mimeType.split("/")[1] ||
        "jpg";

      const presetId = safeStr(preset?.id) || `style_${presetIndex + 1}`;
      const path = `vendors/${args.vendorId}/products/${args.productCode}/tailoring/${presetId}/${Date.now()}-${imageIndex}.${ext}`;

      const uploadedPath = await uploadAssetToStorage({
        bucket: BUCKET_VENDOR,
        path,
        uri: rawUri,
        contentType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
      });

      if (!uploadedPath) continue;

      const { data } = supabase.storage.from(BUCKET_VENDOR).getPublicUrl(uploadedPath);

      uploadedImages.push({
        ...img,
        uri: data?.publicUrl ?? rawUri,
        url: data?.publicUrl ?? "",
        path: uploadedPath,
      });
    }

    nextPresets.push({
      ...preset,
      images: uploadedImages,
    });
  }

  return nextPresets;
}

export default function AddProductSubmitScreen() {
  const router = useRouter();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const { draft, resetDraft } = useProductDraft();

  const [saving, setSaving] = useState(false);

  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<boolean>(false);
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    async function loadVendor() {
      if (!vendorId) {
        if (alive) setVendorOffersTailoring(false);
        return;
      }

      try {
        if (alive) setVendorLoading(true);

        const { data, error } = await supabase
          .from("vendor")
          .select("id, offers_tailoring")
          .eq("id", vendorId)
          .single();

        if (!alive) return;

        if (error) {
          setVendorOffersTailoring(false);
          return;
        }

        setVendorOffersTailoring(Boolean((data as any)?.offers_tailoring));
      } catch {
        if (!alive) return;
        setVendorOffersTailoring(false);
      } finally {
        if (alive) setVendorLoading(false);
      }
    }

    loadVendor();

    return () => {
      alive = false;
    };
  }, [vendorId]);

  const productCategory = useMemo<ProductCategory>(() => inferCategoryFromDraft(draft), [draft]);

  const madeOnOrder = Boolean((draft.spec as any)?.made_on_order ?? false);
  const moreDescription = safeStr((draft.spec as any)?.more_description ?? "");

  const needsDyeing =
    productCategory === "unstitched_dyeing" || productCategory === "unstitched_dyeing_tailoring";
  const needsTailoring = productCategory === "unstitched_dyeing_tailoring";
  const isUnstitched = productCategory !== "stitched_ready";

  const dyeingCostPkr = safeNumOrZero((draft.price as any)?.dyeing_cost_pkr ?? 0);
  const tailoringCostPkr = safeNumOrZero((draft.price as any)?.tailoring_cost_pkr ?? 0);
  const tailoringTurnaroundDays = safeNumOrZero((draft.spec as any)?.tailoring_turnaround_days ?? 0);

  const sizeLengthMap = (draft.spec as any)?.size_length_m ?? {};
  const weightKg = safeNumOrZero((draft.spec as any)?.weight_kg ?? 0);
  const packageCm = (draft.spec as any)?.package_cm ?? {};

  const includesTrouser = Boolean(
    (draft.spec as any)?.includes_trouser ??
      (draft.spec as any)?.has_trouser ??
      (draft.spec as any)?.product_has_trouser ??
      false,
  );

  const tailoringStylePresets = useMemo(
    () => normalizePresetArray((draft.spec as any)?.tailoring_style_presets),
    [draft.spec],
  );

  const canSave = useMemo(() => {
    if (!vendorId) return false;
    if (!safeStr(draft.title)) return false;

    if (productCategory === "stitched_ready") {
      const n = Number((draft.price as any)?.cost_pkr_total ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    } else {
      const n = Number((draft.price as any)?.cost_pkr_per_meter ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;

      if (!hasValidSizeLengthMap(sizeLengthMap)) return false;

      if (needsDyeing) {
        const d = Number(dyeingCostPkr ?? 0);
        if (!Number.isFinite(d) || d <= 0) return false;
      }

      if (needsTailoring) {
        if (!vendorOffersTailoring) return false;

        const t = Number(tailoringCostPkr ?? 0);
        if (!Number.isFinite(t) || t <= 0) return false;

        const days = Number(tailoringTurnaroundDays ?? 0);
        if (!Number.isFinite(days) || days < 0) return false;

        if (!tailoringStylePresets.length) return false;
        if (!tailoringStylePresets.every((preset) => hasValidTailoringPreset(preset, includesTrouser))) {
          return false;
        }
      }
    }

    if (!Number.isFinite(weightKg) || weightKg <= 0) return false;
    if (!hasValidPackageCm(packageCm)) return false;

    if ((draft.media.images ?? []).length < 1) return false;
    if ((draft.spec.dressTypeIds ?? []).length < 1) return false;

    if (!madeOnOrder) {
      const q = Number(draft.inventory_qty ?? 0);
      if (!Number.isFinite(q) || q < 0) return false;
    }

    return true;
  }, [
    vendorId,
    draft,
    madeOnOrder,
    productCategory,
    needsDyeing,
    dyeingCostPkr,
    needsTailoring,
    vendorOffersTailoring,
    tailoringCostPkr,
    tailoringTurnaroundDays,
    sizeLengthMap,
    weightKg,
    packageCm,
    tailoringStylePresets,
    includesTrouser,
  ]);

  async function saveProduct() {
    if (saving) return;

    if (!vendorId) {
      Alert.alert("Vendor missing", "Please ensure vendor id is loaded.");
      return;
    }

    if (!safeStr(draft.title)) {
      Alert.alert("Missing title", "Please enter product title.");
      return;
    }

    if (productCategory === "stitched_ready") {
      const total = Number((draft.price as any)?.cost_pkr_total ?? 0);
      if (!Number.isFinite(total) || total <= 0) {
        Alert.alert("Missing price", "Please enter valid total cost for stitched product.");
        return;
      }
    } else {
      const perMeter = Number((draft.price as any)?.cost_pkr_per_meter ?? 0);
      if (!Number.isFinite(perMeter) || perMeter <= 0) {
        Alert.alert("Missing price", "Please enter valid cost per meter.");
        return;
      }

      if (!hasValidSizeLengthMap(sizeLengthMap)) {
        Alert.alert(
          "Missing size lengths",
          "For unstitched products, please enter fabric length in meters for at least one size.",
        );
        return;
      }

      if (needsDyeing) {
        const d = Number(dyeingCostPkr ?? 0);
        if (!Number.isFinite(d) || d <= 0) {
          Alert.alert("Missing dyeing cost", "Please enter valid dyeing cost.");
          return;
        }
      }

      if (needsTailoring) {
        if (!vendorOffersTailoring) {
          Alert.alert(
            "Tailoring not enabled",
            "Your vendor profile does not offer tailoring.",
          );
          return;
        }

        const t = Number(tailoringCostPkr ?? 0);
        if (!Number.isFinite(t) || t <= 0) {
          Alert.alert("Missing tailoring cost", "Please enter valid tailoring cost.");
          return;
        }

        const days = Number(tailoringTurnaroundDays ?? 0);
        if (!Number.isFinite(days) || days < 0) {
          Alert.alert("Invalid turnaround", "Tailoring turnaround days must be 0 or more.");
          return;
        }

        if (!tailoringStylePresets.length) {
          Alert.alert("Missing style cards", "Please add at least one tailoring style card.");
          return;
        }

        for (const preset of tailoringStylePresets) {
          if (!hasValidTailoringPreset(preset, includesTrouser)) {
            Alert.alert(
              "Incomplete tailoring style",
              "Each tailoring style card must have a title and at least one image.",
            );
            return;
          }
        }
      }
    }

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      Alert.alert("Missing weight", "Please enter valid product weight in kg.");
      return;
    }

    if (!hasValidPackageCm(packageCm)) {
      Alert.alert(
        "Missing package dimensions",
        "Please enter valid package length, width, and height in cm.",
      );
      return;
    }

    if ((draft.media.images ?? []).length < 1) {
      Alert.alert("Missing images", "Please upload at least one product image.");
      return;
    }

    if ((draft.spec.dressTypeIds ?? []).length < 1) {
      Alert.alert("Missing dress type", "Please select at least one dress type.");
      return;
    }

    if (!madeOnOrder) {
      const q = Number(draft.inventory_qty ?? 0);
      if (!Number.isFinite(q) || q < 0) {
        Alert.alert("Invalid inventory", "Inventory must be 0 or more.");
        return;
      }
    }

    try {
      setSaving(true);

      const inventoryQty = madeOnOrder ? 0 : Number(draft.inventory_qty ?? 0);

      const finalCategory: ProductCategory = productCategory;

      const finalPriceMode =
        finalCategory === "stitched_ready" ? "stitched_total" : "unstitched_per_meter";

      const unstitchedDyeingEnabled =
        finalCategory === "unstitched_dyeing" || finalCategory === "unstitched_dyeing_tailoring";
      const unstitchedTailoringEnabled = finalCategory === "unstitched_dyeing_tailoring";

      const unstitchedDyeingCost = unstitchedDyeingEnabled
        ? Math.max(0, Number(dyeingCostPkr ?? 0))
        : 0;

      const unstitchedTailoringCost = unstitchedTailoringEnabled
        ? Math.max(0, Number(tailoringCostPkr ?? 0))
        : 0;

      const unstitchedTailoringTurnaround = unstitchedTailoringEnabled
        ? Math.max(0, Number(tailoringTurnaroundDays ?? 0))
        : 0;

      const insertPayload: any = {
        vendor_id: vendorId,
        title: safeStr(draft.title),

        product_category: finalCategory,
        made_on_order: Boolean(madeOnOrder),

        inventory_qty: Number.isFinite(inventoryQty) ? Math.trunc(inventoryQty) : 0,

        spec: {
          ...(draft.spec ?? {}),
          made_on_order: Boolean(madeOnOrder),
          more_description: safeStr(moreDescription),

          product_category: finalCategory,

          dyeing_enabled: unstitchedDyeingEnabled,
          tailoring_enabled: unstitchedTailoringEnabled,
          tailoring_turnaround_days: unstitchedTailoringTurnaround,

          includes_trouser: unstitchedTailoringEnabled ? includesTrouser : false,
          tailoring_style_presets: unstitchedTailoringEnabled ? tailoringStylePresets : [],

          weight_kg: Number(weightKg),
          package_cm: {
            length: Number(packageCm?.length ?? 0),
            width: Number(packageCm?.width ?? 0),
            height: Number(packageCm?.height ?? 0),
          },
          ...(isUnstitched
            ? {
                size_length_m: sizeLengthMap,
              }
            : {}),
        },

        price: {
          ...(draft.price ?? {}),
          mode: finalPriceMode,

          dyeing_cost_pkr: unstitchedDyeingCost,
          tailoring_cost_pkr: unstitchedTailoringCost,
        },

        media: {
          images: [],
          videos: [],
          thumbs: [],
        },
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

      const productId = created?.id as number | undefined;
      const finalCode = created?.product_code as string | undefined;

      if (!productId || !finalCode) {
        Alert.alert("Save failed", "Product id/code not returned.");
        return;
      }

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
          contentType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
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
          contentType: mimeType.startsWith("video/") ? mimeType : "video/mp4",
        });

        if (vp) uploadedVideoPaths.push(vp);

        try {
          const t = await VideoThumbnails.getThumbnailAsync(uri, { time: 1500 });
          if (t?.uri) {
            const tPath = `vendors/${vendorId}/products/${finalCode}/thumbs/${Date.now()}-${i}.jpg`;
            const tp = await uploadAssetToStorage({
              bucket: BUCKET_VENDOR,
              path: tPath,
              uri: t.uri,
              contentType: "image/jpeg",
            });
            if (tp) uploadedThumbPaths.push(tp);
          }
        } catch {
          // optional
        }
      }

      const uploadedTailoringPresets = unstitchedTailoringEnabled
        ? await uploadTailoringPresetImages({
            vendorId,
            productCode: finalCode,
            presets: tailoringStylePresets,
          })
        : [];

      const media = {
        images: uploadedImagePaths,
        videos: uploadedVideoPaths,
        thumbs: uploadedThumbPaths,
      };

      const { error: updErr } = await supabase
        .from(PRODUCTS_TABLE)
        .update({
          media,
          spec: {
            ...insertPayload.spec,
            tailoring_style_presets: unstitchedTailoringEnabled ? uploadedTailoringPresets : [],
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (updErr) {
        Alert.alert("Saved, but media update failed", updErr.message);
        return;
      }

      Alert.alert("Saved", `Product created: ${finalCode}`);
      resetDraft();

      router.replace(
        `/vendor/profile/products?new_product_id=${encodeURIComponent(String(productId))}` as any,
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Save Product</Text>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.linkBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.linkText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ready to save</Text>

        {vendorLoading ? (
          <View style={styles.inlineRow}>
            <ActivityIndicator />
            <Text style={styles.meta}>Loading vendor settings…</Text>
          </View>
        ) : null}

        {!vendorId ? (
          <Text style={[styles.meta, { color: "#991B1B" }]}>
            Vendor not loaded. Please ensure vendorSlice has vendor.id (bigint).
          </Text>
        ) : null}

        {!canSave ? (
          <Text style={styles.meta}>
            Some required fields are missing. Go back to Review and complete the missing steps.
          </Text>
        ) : (
          <Text style={styles.meta}>
            Save Product to create the product and upload media.
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveBtn,
          !canSave || saving ? styles.saveBtnDisabled : null,
          pressed ? styles.pressed : null,
        ]}
        onPress={saveProduct}
        disabled={!canSave || saving}
      >
        {saving ? (
          <View style={styles.inlineRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.saveText}>Saving…</Text>
          </View>
        ) : (
          <Text style={styles.saveText}>Save Product</Text>
        )}
      </Pressable>
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
  white: "#FFFFFF",
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

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 2,
  },

  meta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
  },

  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
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

  pressed: {
    opacity: 0.82,
  },
});