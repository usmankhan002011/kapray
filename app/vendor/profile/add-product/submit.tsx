// app/vendor/profile/add-product/submit.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
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

export default function AddProductSubmitScreen() {
  const router = useRouter();

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);

  const vendorId = safeInt(vendorIdRaw);

  const { draft, resetDraft } = useProductDraft();

  const [saving, setSaving] = useState(false);

  // ✅ Load vendor row to know offers_tailoring (same as original)
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

  const dyeingCostPkr = safeNumOrZero((draft.price as any)?.dyeing_cost_pkr ?? 0);
  const tailoringCostPkr = safeNumOrZero((draft.price as any)?.tailoring_cost_pkr ?? 0);
  const tailoringTurnaroundDays = safeNumOrZero((draft.spec as any)?.tailoring_turnaround_days ?? 0);

  const canSave = useMemo(() => {
    if (!vendorId) return false;
    if (!safeStr(draft.title)) return false;

    if (productCategory === "stitched_ready") {
      const n = Number((draft.price as any)?.cost_pkr_total ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;
    } else {
      const n = Number((draft.price as any)?.cost_pkr_per_meter ?? 0);
      if (!Number.isFinite(n) || n <= 0) return false;

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
      }
    }

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
    tailoringTurnaroundDays
  ]);

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
          tailoring_turnaround_days: unstitchedTailoringTurnaround
        },

        price: {
          ...(draft.price ?? {}),
          mode: finalPriceMode,

          dyeing_cost_pkr: unstitchedDyeingCost,
          tailoring_cost_pkr: unstitchedTailoringCost
        },

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

      const productId = created?.id as number | undefined;
      const finalCode = created?.product_code as string | undefined;

      if (!productId || !finalCode) {
        Alert.alert("Save failed", "Product id/code not returned.");
        return;
      }

      // Upload media
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

        // Optional thumb
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
          // optional
        }
      }

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

      Alert.alert("Saved", `Product created: ${finalCode}`);
      resetDraft();

      router.replace(
        `/vendor/profile/products?new_product_id=${encodeURIComponent(String(productId))}` as any
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
          pressed ? styles.pressed : null
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
  white: "#FFFFFF"
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: stylesVars.text,
    marginBottom: 2
  },

  meta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10
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
    justifyContent: "center"
  },

  linkText: {
    color: stylesVars.blue,
    fontSize: 14,
    fontWeight: "700"
  },

  saveBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: stylesVars.blue
  },

  saveBtnDisabled: {
    opacity: 0.6
  },

  saveText: {
    color: stylesVars.white,
    fontWeight: "700",
    fontSize: 14
  },

  pressed: {
    opacity: 0.82
  }
});