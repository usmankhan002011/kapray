// app/vendor/profile/add-product.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect } from "@react-navigation/native";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";

const BUCKET_VENDOR = "vendor_images";
const PRODUCTS_TABLE = "products";

const MODAL_ORDER = [
  "dress-type",
  "fabric",
  "color",
  "work",
  "work-density",
  "origin-city",
  "wear-state"
] as const;

type ModalName = (typeof MODAL_ORDER)[number];

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

// App-side product_code (no SQL dependency)
// Format: V{vendorId}-P{6digits}{2rand}  e.g. V15-P48219374
function makeProductCode(vendorId: number) {
  const tail = String(Date.now()).slice(-6);
  const r = String(Math.floor(10 + Math.random() * 90));
  return `V${vendorId}-P${tail}${r}`;
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

export default function AddProductScreen() {
  const router = useRouter();

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

  // --- Guided modal chain state (the missing piece) ---
  const [guidedActive, setGuidedActive] = useState(false);
  const [guidedIndex, setGuidedIndex] = useState<number>(-1);

  // Used to prevent auto-running on first render
  const hasFocusedOnceRef = useRef(false);
  // Used to know we actually navigated to a modal and came back
  const expectingReturnRef = useRef(false);

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

    return true;
  }, [vendorId, draft]);

  function pushModal(name: ModalName) {
    expectingReturnRef.current = true;
    router.push(`/vendor/profile/(product-modals)/${name}` as any);
  }

  function startGuidedFrom(name: ModalName) {
    const idx = MODAL_ORDER.indexOf(name);
    setGuidedActive(true);
    setGuidedIndex(idx);
    pushModal(name);
  }

  function goPickModal(name: ModalName) {
    // If you want “single modal only”, call pushModal(name)
    // If you want “auto-next chain”, call startGuidedFrom(name)
    startGuidedFrom(name);
  }

  // When we return from a modal, auto-open the next one (guided chain)
  useFocusEffect(
    React.useCallback(() => {
      // first focus after mount: do nothing
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      // only run auto-next when we actually went to a modal
      if (!expectingReturnRef.current) return;
      expectingReturnRef.current = false;

      if (!guidedActive) return;

      const nextIndex = guidedIndex + 1;

      if (nextIndex >= MODAL_ORDER.length) {
        setGuidedActive(false);
        setGuidedIndex(-1);
        return;
      }

      setGuidedIndex(nextIndex);

      // push next modal on next tick to keep navigation stable
      setTimeout(() => {
        pushModal(MODAL_ORDER[nextIndex]);
      }, 0);
    }, [guidedActive, guidedIndex])
  );

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

  function summaryLine(label: string, value: string) {
    return (
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    );
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

      const productCode = makeProductCode(vendorId);

      // 1) Insert product row first (media empty for now)
      const insertPayload = {
        vendor_id: vendorId,
        product_code: productCode,
        title: safeStr(draft.title),
        inventory_qty: Number(draft.inventory_qty ?? 0),
        spec: draft.spec,
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
      const finalCode =
        (created?.product_code as string | undefined) ?? productCode;

      if (!productId) {
        Alert.alert("Save failed", "Product id not returned.");
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

      // Done
      Alert.alert("Saved", `Product created: ${finalCode}`);
      resetDraft();
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  const imageCount = (draft.media.images ?? []).length;
  const videoCount = (draft.media.videos ?? []).length;

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

        <Text style={styles.label}>Inventory Quantity *</Text>
        <TextInput
          value={String(draft.inventory_qty ?? 0)}
          onChangeText={(t) => setInventoryQty(Number(sanitizeNumber(t) || "0"))}
          placeholder="e.g., 10"
          placeholderTextColor={stylesVars.placeholder}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.label}>Cost Mode *</Text>
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
              placeholder="e.g., XS, S, M, L"
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
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Build Product Description (Selections)
        </Text>

        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("dress-type")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Dress Type *</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("fabric")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Fabric</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("color")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Color</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("work")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Work</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("work-density")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Density</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("origin-city")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Origin</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.pickBtn,
              pressed ? styles.pressed : null
            ]}
            onPress={() => goPickModal("wear-state")}
            disabled={saving}
          >
            <Text style={styles.pickText}>Wear State</Text>
          </Pressable>
        </View>

        <View style={styles.summaryBox}>
          {summaryLine(
            "Dress Type",
            (draft.spec.dressTypeIds ?? []).length
              ? `${draft.spec.dressTypeIds.length} selected`
              : "Not set"
          )}
          {summaryLine(
            "Fabric",
            (draft.spec.fabricTypeIds ?? []).length
              ? `${draft.spec.fabricTypeIds.length} selected`
              : "Any"
          )}
          {summaryLine(
            "Color",
            (draft.spec.colorShadeIds ?? []).length
              ? `${draft.spec.colorShadeIds.length} selected`
              : "Any"
          )}
          {summaryLine(
            "Work",
            (draft.spec.workTypeIds ?? []).length
              ? `${draft.spec.workTypeIds.length} selected`
              : "Any"
          )}
          {summaryLine(
            "Density",
            (draft.spec.workDensityIds ?? []).length
              ? `${draft.spec.workDensityIds.length} selected`
              : "Any"
          )}
          {summaryLine(
            "Origin",
            (draft.spec.originCityIds ?? []).length
              ? `${draft.spec.originCityIds.length} selected`
              : "Any"
          )}
          {summaryLine(
            "Wear State",
            (draft.spec.wearStateIds ?? []).length
              ? `${draft.spec.wearStateIds.length} selected`
              : "Any"
          )}
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

  pickBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: stylesVars.border
  },
  pickText: { color: stylesVars.blue, fontWeight: "900", fontSize: 13 },

  summaryBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    padding: 12,
    backgroundColor: "#F8FAFF"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8
  },
  summaryLabel: { fontSize: 12, fontWeight: "900", color: stylesVars.blue },
  summaryValue: {
    fontSize: 12,
    color: stylesVars.text,
    opacity: 0.9,
    flex: 1,
    textAlign: "right"
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
