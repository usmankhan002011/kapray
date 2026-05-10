import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import { READY_STANDARD_SIZES } from "@/data/kapray/productPieces";

type ReadyVariantSize = {
  size: string;
  qty: number;
};

type ReadyVariant = {
  id: string;
  variant_no: number;
  label: string;
  name: string;
  display_name: string;
  additional_price_pkr: number;
  image_paths: string[];
  sizes: ReadyVariantSize[];
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function sanitizeIntText(v: string) {
  return String(v ?? "").replace(/[^\d]/g, "");
}

function normalizeStringArray(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : v == null || v === "" ? [] : [v];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    const s = safeStr(item);
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out;
}

function normalizeVariantImagePaths(v: any): string[] {
  const raw =
    v?.image_paths ??
    v?.variant_image_paths ??
    v?.images ??
    v?.variant_images ??
    v?.image_path ??
    v?.image ??
    [];

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of arr) {
    const s =
      typeof item === "string"
        ? safeStr(item)
        : safeStr(item?.path ?? item?.uri ?? item?.url ?? "");

    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out;
}

function buildReadyVariantDisplayName(variantNo: number, name: string) {
  const clean = safeStr(name);
  return clean ? `Variant ${variantNo}: ${clean}` : `Variant ${variantNo}`;
}

function makeVariantId(variantNo: number) {
  return `variant-${variantNo}`;
}

function createEmptyVariant(variantNo: number): ReadyVariant {
  return {
    id: makeVariantId(variantNo),
    variant_no: variantNo,
    label: `Variant ${variantNo}`,
    name: "",
    display_name: `Variant ${variantNo}`,
    additional_price_pkr: 0,
    image_paths: [],
    sizes: [],
  };
}

function normalizeReadyVariant(v: any, index: number): ReadyVariant {
  const variantNo = safeInt(v?.variant_no) || index + 1;
  const name = safeStr(v?.name ?? v?.color ?? v?.title ?? "");

  const rawSizes = Array.isArray(v?.sizes) ? v.sizes : [];
  const sizes: ReadyVariantSize[] = rawSizes
    .map((row: any) => ({
      size: safeStr(row?.size ?? row?.label ?? row),
      qty: safeInt(row?.qty ?? row?.stock_qty ?? row?.stock ?? 0),
    }))
    .filter((row: ReadyVariantSize) => row.size);

  return {
    id: safeStr(v?.id) || makeVariantId(variantNo),
    variant_no: variantNo,
    label: safeStr(v?.label) || `Variant ${variantNo}`,
    name,
    display_name:
      safeStr(v?.display_name) || buildReadyVariantDisplayName(variantNo, name),
    additional_price_pkr: safeInt(
      v?.additional_price_pkr ?? v?.extra_price_pkr ?? 0,
    ),
    image_paths: normalizeVariantImagePaths(v),
    sizes,
  };
}

function normalizeReadyVariants(v: unknown): ReadyVariant[] {
  const arr = Array.isArray(v) ? v : [];
  return arr.map(normalizeReadyVariant);
}

function sumReadyVariantQty(variants: ReadyVariant[]) {
  return (variants || []).reduce((total, variant) => {
    return (
      total +
      (variant.sizes || []).reduce(
        (s: number, row: ReadyVariantSize) => s + safeInt(row.qty),
        0,
      )
    );
  }, 0);
}

function getReadyVariantFinalPrice(basePrice: number, variant: ReadyVariant) {
  return Number(basePrice || 0) + Number(variant?.additional_price_pkr || 0);
}

function cleanReadyVariants(variants: ReadyVariant[]) {
  return (variants || []).map((variant, index) => {
    const variantNo = index + 1;
    const name = safeStr(variant.name);

    return {
      id: makeVariantId(variantNo),
      variant_no: variantNo,
      label: `Variant ${variantNo}`,
      name,
      display_name: buildReadyVariantDisplayName(variantNo, name),
      additional_price_pkr: safeInt(variant.additional_price_pkr),
      image_paths: normalizeStringArray(variant.image_paths),
      sizes: (variant.sizes || [])
        .map((row: ReadyVariantSize) => ({
          size: safeStr(row.size),
          qty: safeInt(row.qty),
        }))
        .filter((row: ReadyVariantSize) => row.size),
    };
  });
}

function validateReadyVariants(variants: ReadyVariant[]) {
  if (!variants.length)
    return "Please add at least one ready-to-wear variant card.";

  for (const variant of variants) {
    const title = variant.display_name || variant.label || "Variant";

    if (!safeStr(variant.name))
      return `${variant.label} needs a color or design name.`;
    if (!normalizeStringArray(variant.image_paths).length) {
      return `${title} needs at least one image.`;
    }
    if (!variant.sizes?.length) return `${title} needs at least one size.`;

    for (const row of variant.sizes) {
      if (!safeStr(row.size)) return `${title} has a missing size.`;
      if (!Number.isFinite(Number(row.qty)) || Number(row.qty) < 0) {
        return `${title} has an invalid quantity.`;
      }
    }
  }

  if (sumReadyVariantQty(variants) <= 0) {
    return "Total stock across variants must be more than 0.";
  }

  return "";
}

function toggleSizeInVariant(
  variant: ReadyVariant,
  size: string,
  onChange: (next: ReadyVariant) => void,
) {
  const exists = (variant.sizes || []).some((s) => s.size === size);

  if (exists) {
    onChange({
      ...variant,
      sizes: (variant.sizes || []).filter((s) => s.size !== size),
    });
    return;
  }

  onChange({
    ...variant,
    sizes: [...(variant.sizes || []), { size, qty: 0 }],
  });
}

const ReadyVariantCard = memo(function ReadyVariantCard({
  variant,
  idx,
  basePrice,
  updateVariant,
  removeVariant,
  pickVariantImages,
  makeVariantPrimaryImage,
  removeVariantImage,
}: {
  variant: ReadyVariant;
  idx: number;
  basePrice: number;
  updateVariant: (
    variantId: string,
    updater: (prev: ReadyVariant) => ReadyVariant,
  ) => void;
  removeVariant: (variantId: string) => void;
  pickVariantImages: (variantId: string) => Promise<void>;
  makeVariantPrimaryImage: (variantId: string, index: number) => void;
  removeVariantImage: (variantId: string, path: string) => void;
}) {
  const images = normalizeStringArray(variant.image_paths);
  const finalPrice = getReadyVariantFinalPrice(basePrice, variant);

  function updateName(name: string) {
    updateVariant(variant.id, (prev) => ({
      ...prev,
      name,
      display_name: buildReadyVariantDisplayName(prev.variant_no, name),
    }));
  }

  function updateExtra(v: string) {
    updateVariant(variant.id, (prev) => ({
      ...prev,
      additional_price_pkr: safeInt(sanitizeIntText(v)),
    }));
  }

  function updateQty(size: string, qtyText: string) {
    const qty = safeInt(sanitizeIntText(qtyText));
    updateVariant(variant.id, (prev) => ({
      ...prev,
      sizes: (prev.sizes || []).map((row: ReadyVariantSize) =>
        row.size === size ? { ...row, qty } : row,
      ),
    }));
  }

  const totalQty = (variant.sizes || []).reduce(
    (sum: number, row: ReadyVariantSize) => sum + safeInt(row.qty),
    0,
  );

  return (
    <View
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#D7E3FF",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: apColors.text }}>
          Variant {idx + 1}
        </Text>

        <Pressable
          onPress={() => removeVariant(variant.id)}
          style={({ pressed }) => [
            {
              minHeight: 30,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#F2C5C5",
              backgroundColor: "#FFF4F4",
            },
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#B42318" }}>
            Remove
          </Text>
        </Pressable>
      </View>

      <Text style={[apStyles.label, { marginTop: 12 }]}>
        Color / design name *
      </Text>
      <TextInput
        value={variant.name}
        onChangeText={updateName}
        placeholder="e.g., Black, Ivory Gold, Design A"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
        maxLength={80}
      />

      <Text style={apStyles.label}>Additional price, if any (PKR)</Text>
      <TextInput
        value={String(
          Math.max(0, Number(variant.additional_price_pkr ?? 0) || 0),
        )}
        onChangeText={updateExtra}
        placeholder="0"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
        keyboardType="number-pad"
        maxLength={12}
      />

      <Text style={apStyles.metaHint}>
        Final price: Rs {finalPrice.toLocaleString()} · Total stock: {totalQty}
      </Text>

      <Text style={apStyles.label}>Variant images *</Text>

      <Pressable
        onPress={() => pickVariantImages(variant.id)}
        style={({ pressed }) => [
          apStyles.primaryBtn,
          { marginTop: 8 },
          pressed ? apStyles.pressed : null,
        ]}
      >
        <Text style={apStyles.primaryText}>
          Pick Variant Images {images.length ? `(${images.length})` : ""}
        </Text>
      </Pressable>

      {images.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, gap: 10 }}
        >
          {images.map((uri, imgIdx) => {
            if (!uri) return null;
            const isPrimary = imgIdx === 0;

            return (
              <View
                key={`${variant.id}-${uri}-${imgIdx}`}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: apColors.borderSoft,
                  backgroundColor: "#f3f4f6",
                }}
              >
                <Image source={{ uri }} style={{ width: 76, height: 76 }} />

                {isPrimary ? (
                  <View
                    style={{
                      position: "absolute",
                      left: 6,
                      bottom: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: "rgba(11,47,107,0.88)",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}
                    >
                      Banner
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => makeVariantPrimaryImage(variant.id, imgIdx)}
                    style={({ pressed }) => [
                      {
                        position: "absolute",
                        left: 6,
                        bottom: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10,
                        backgroundColor: "rgba(0,0,0,0.55)",
                      },
                      pressed ? apStyles.pressed : null,
                    ]}
                    hitSlop={10}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}
                    >
                      Make Banner
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => removeVariantImage(variant.id, uri)}
                  style={({ pressed }) => [
                    {
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.55)",
                    },
                    pressed ? apStyles.pressed : null,
                  ]}
                  hitSlop={10}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}
                  >
                    ✕
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
          No variant images selected yet.
        </Text>
      )}

      <Text style={apStyles.label}>Available sizes and quantity *</Text>

      {READY_STANDARD_SIZES.map((size) => {
        const selected = (variant.sizes || []).find((s) => s.size === size);

        return (
          <View
            key={`${variant.id}-${size}`}
            style={{ gap: 8, marginBottom: 8 }}
          >
            <Pressable
              onPress={() =>
                updateVariant(variant.id, (prev) => {
                  let next = prev;
                  toggleSizeInVariant(prev, size, (changed) => {
                    next = changed;
                  });
                  return next;
                })
              }
              style={({ pressed }) => [
                apStyles.secondaryBtn,
                selected ? { borderColor: apColors.blue } : null,
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text style={apStyles.secondaryText}>
                {selected ? "✓ " : ""}
                {size}
              </Text>
            </Pressable>

            {selected ? (
              <TextInput
                value={String(selected.qty || "")}
                onChangeText={(t) => updateQty(size, t)}
                placeholder={`Qty for ${size}`}
                placeholderTextColor={apColors.muted}
                style={apStyles.input}
                keyboardType="number-pad"
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
});

export default function Q06B3ReadyVariants() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  const basePrice = Number(draft?.price?.cost_pkr_total || 0);

  const [variants, setVariants] = useState<ReadyVariant[]>(() => {
    const existing = normalizeReadyVariants(draft?.price?.variants);
    return existing.length ? existing : [createEmptyVariant(1)];
  });

  const totalQty = useMemo(() => sumReadyVariantQty(variants), [variants]);

  function patchPrice(patch: any) {
    if (typeof ctx.setPrice === "function") {
      ctx.setPrice((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        price: { ...(prev?.price ?? {}), ...patch },
      }));
      return;
    }

    draft.price = { ...(draft?.price ?? {}), ...patch };
  }

  function patchDraft(patch: any) {
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }

    Object.assign(draft, patch);
  }

  function updateVariant(
    variantId: string,
    updater: (prev: ReadyVariant) => ReadyVariant,
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? updater(v) : v)),
    );
  }

  function removeVariant(variantId: string) {
    setVariants((prev) => {
      const next = prev.filter((v) => v.id !== variantId);
      return cleanReadyVariants(next.length ? next : [createEmptyVariant(1)]);
    });
  }

  function addVariant() {
    setVariants((prev) => [...prev, createEmptyVariant(prev.length + 1)]);
  }

  async function pickVariantImages(variantId: string) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });

    if (res.canceled) return;

    updateVariant(variantId, (prev) => {
      const existing = normalizeStringArray(prev.image_paths);
      const seen = new Set(existing);
      const next = [...existing];

      for (const a of res.assets) {
        const uri = safeStr(a?.uri);
        if (!uri || seen.has(uri)) continue;
        seen.add(uri);
        next.push(uri);
      }

      return {
        ...prev,
        image_paths: next,
      };
    });
  }

  function removeVariantImage(variantId: string, path: string) {
    updateVariant(variantId, (prev) => ({
      ...prev,
      image_paths: normalizeStringArray(prev.image_paths).filter(
        (x) => x !== path,
      ),
    }));
  }

  function makeVariantPrimaryImage(variantId: string, index: number) {
    updateVariant(variantId, (prev) => {
      const imagePaths = [...normalizeStringArray(prev.image_paths)];
      if (index <= 0 || index >= imagePaths.length) return prev;
      const selected = imagePaths.splice(index, 1)[0];
      imagePaths.unshift(selected);
      return { ...prev, image_paths: imagePaths };
    });
  }

  useEffect(() => {
    const cleaned = cleanReadyVariants(variants);
    patchPrice({
      mode: "stitched_total",
      variants: cleaned,
    });
    patchDraft({ inventory_qty: sumReadyVariantQty(cleaned) });
  }, [variants]);

  const canContinue = useMemo(() => {
    return !validateReadyVariants(cleanReadyVariants(variants));
  }, [variants]);

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function onContinue() {
    const cleaned = cleanReadyVariants(variants);
    const error = validateReadyVariants(cleaned);

    if (error) {
      Alert.alert("Check variants", error);
      return;
    }

    patchPrice({
      mode: "stitched_total",
      variants: cleaned,
    });

    patchDraft({ inventory_qty: sumReadyVariantQty(cleaned) });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q11-description" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Ready Variants</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [
              apStyles.linkBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <View
            style={{
              marginTop: 4,
              marginBottom: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: apColors.blueSoft,
              borderWidth: 1,
              borderColor: "#D7E3FF",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: apColors.text,
                marginBottom: 4,
              }}
            >
              Ready-to-wear variant cards
            </Text>
            <Text style={apStyles.metaHint}>
              Add one card for each color/design. Each card may have its own
              images, extra price, and size-wise stock.
            </Text>
            <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
              Main product price will show: From Rs {basePrice.toLocaleString()}
            </Text>
            <Text style={[apStyles.metaHint, { marginTop: 4 }]}>
              Total stock from variants: {totalQty}
            </Text>

            {!variants.length ? (
              <>
                <View style={{ marginTop: 14 }}>
                  <Pressable
                    onPress={addVariant}
                    style={({ pressed }) => [
                      apStyles.primaryBtn,
                      pressed ? apStyles.pressed : null,
                    ]}
                  >
                    <Text style={apStyles.primaryText}>Add Variant</Text>
                  </Pressable>
                </View>

                <Text style={[apStyles.metaHint, { marginTop: 12 }]}>
                  No variant cards added yet.
                </Text>
              </>
            ) : (
              <>
                <FlatList
                  data={variants}
                  keyExtractor={(item: ReadyVariant) => item.id}
                  scrollEnabled={false}
                  removeClippedSubviews
                  initialNumToRender={4}
                  windowSize={5}
                  renderItem={({
                    item,
                    index,
                  }: {
                    item: ReadyVariant;
                    index: number;
                  }) => (
                    <ReadyVariantCard
                      variant={item}
                      idx={index}
                      basePrice={basePrice}
                      updateVariant={updateVariant}
                      removeVariant={removeVariant}
                      pickVariantImages={pickVariantImages}
                      makeVariantPrimaryImage={makeVariantPrimaryImage}
                      removeVariantImage={removeVariantImage}
                    />
                  )}
                />

                <View style={{ marginTop: 14 }}>
                  <Text style={[apStyles.metaHint, { marginBottom: 6 }]}>
                    {variants.length}{" "}
                    {variants.length === 1 ? "variant" : "variants"} added
                  </Text>

                  <Pressable
                    onPress={addVariant}
                    style={({ pressed }) => [
                      apStyles.secondaryBtn,
                      pressed ? apStyles.pressed : null,
                    ]}
                  >
                    <Text style={apStyles.secondaryText}>
                      Add More Variants
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null,
            ]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
