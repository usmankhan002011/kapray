import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import FastNumberInput from "@/components/product/add-product/FastNumberInput";
import { READY_STANDARD_SIZES } from "@/data/kapray/productPieces";
import {
  AddProductInput,
  AddProductPrimaryButton,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

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

const READY_SIZE_ROWS = READY_STANDARD_SIZES.reduce<string[][]>(
  (rows, size, index) => {
    if (index % 2 === 0) rows.push([size]);
    else rows[rows.length - 1].push(size);
    return rows;
  },
  [],
);

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

function sizeKey(size: string) {
  return safeStr(size).toLowerCase();
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
  return clean ? `Style ${variantNo}: ${clean}` : `Style ${variantNo}`;
}

function makeVariantId(variantNo: number) {
  return `variant-${variantNo}`;
}

function createEmptyVariant(variantNo: number): ReadyVariant {
  return {
    id: makeVariantId(variantNo),
    variant_no: variantNo,
    label: `Style ${variantNo}`,
    name: "",
    display_name: `Style ${variantNo}`,
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
    label:
      safeStr(v?.label).replace(/^Variant\b/i, "Style") ||
      `Style ${variantNo}`,
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

function countReadyVariantSizes(variant: ReadyVariant) {
  return (variant.sizes || []).filter((row) => safeInt(row.qty) > 0).length;
}

function cleanReadyVariants(variants: ReadyVariant[]) {
  return (variants || []).map((variant, index) => {
    const variantNo = index + 1;
    const name = safeStr(variant.name);

    return {
      id: makeVariantId(variantNo),
      variant_no: variantNo,
      label: `Style ${variantNo}`,
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
    return "Please add at least one ready-to-wear style card.";

  for (const variant of variants) {
    const title = variant.display_name || variant.label || "Style";

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
    return "Total stock across styles must be more than 0.";
  }

  return "";
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
  useDesignLabel,
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
  useDesignLabel?: boolean;
}) {
  const images = normalizeStringArray(variant.image_paths);
  const finalPrice = getReadyVariantFinalPrice(basePrice, variant);
  const sizeCount = countReadyVariantSizes(variant);

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
    const key = sizeKey(size);
    updateVariant(variant.id, (prev) => ({
      ...prev,
      sizes:
        qty > 0
          ? [
              ...(prev.sizes || []).filter(
                (row: ReadyVariantSize) => sizeKey(row.size) !== key,
              ),
              { size, qty },
            ]
          : (prev.sizes || []).filter(
              (row: ReadyVariantSize) => sizeKey(row.size) !== key,
            ),
    }));
  }

  const totalQty = (variant.sizes || []).reduce(
    (sum: number, row: ReadyVariantSize) => sum + safeInt(row.qty),
    0,
  );

  return (
    <View style={styles.variantCard}>
      <View style={styles.variantHeader}>
        <Text style={styles.variantTitle}>
          {useDesignLabel ? "Design" : `Style ${idx + 1}`}
        </Text>

        <Pressable
          onPress={() => removeVariant(variant.id)}
          style={({ pressed }) => [
            styles.removeButton,
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text style={styles.removeText}>Remove</Text>
        </Pressable>
      </View>

      <Text style={[apStyles.label, styles.fieldLabel]}>Color/design *</Text>
      <AddProductInput
        value={variant.name}
        onChangeText={updateName}
        placeholder="Black / Ivory Gold"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
        maxLength={80}
      />

      <Text style={apStyles.label}>Extra price (PKR)</Text>
      <FastNumberInput
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

      <View style={styles.imagePanel}>
        <View style={styles.imageHeader}>
          <Text style={apStyles.label}>Images *</Text>
          <Pressable
            onPress={() => pickVariantImages(variant.id)}
            style={({ pressed }) => [
              styles.imageButton,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={styles.imageButtonText}>
              Add {images.length ? `(${images.length})` : ""}
            </Text>
          </Pressable>
        </View>

        {images.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageRow}
          >
            {images.map((uri, imgIdx) => {
              if (!uri) return null;
              const isPrimary = imgIdx === 0;

              return (
                <View
                  key={`${variant.id}-${uri}-${imgIdx}`}
                  style={styles.thumbWrap}
                >
                  <Image source={{ uri }} style={styles.thumbImage} />

                  {isPrimary ? (
                    <View style={styles.bannerBadge}>
                      <Text style={styles.bannerText}>Banner</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() =>
                        makeVariantPrimaryImage(variant.id, imgIdx)
                      }
                      style={({ pressed }) => [
                        styles.bannerButton,
                        pressed ? apStyles.pressed : null,
                      ]}
                      hitSlop={10}
                    >
                      <Text style={styles.bannerText}>Banner</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => removeVariantImage(variant.id, uri)}
                    style={({ pressed }) => [
                      styles.removeImageButton,
                      pressed ? apStyles.pressed : null,
                    ]}
                    hitSlop={10}
                  >
                    <Text style={styles.removeImageText}>X</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyImageBox}>
            <Text style={styles.emptyImageText}>No images</Text>
          </View>
        )}
      </View>

      <Text style={[apStyles.label, styles.fieldLabel]}>Sizes *</Text>

      <View style={styles.inventoryTable}>
        {READY_SIZE_ROWS.map((row) => (
          <View key={`${variant.id}-${row.join("-")}`} style={styles.inventoryRow}>
            {row.map((size) => {
              const selected = (variant.sizes || []).find(
                (s) => sizeKey(s.size) === sizeKey(size),
              );

              return (
                <View key={`${variant.id}-${size}`} style={styles.inventoryPair}>
                  <View
                    style={[
                      styles.inventorySize,
                      selected ? styles.inventorySizeOn : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inventorySizeText,
                        selected ? styles.inventorySizeTextOn : null,
                      ]}
                    >
                      {size}
                    </Text>
                  </View>

                  <FastNumberInput
                    value={String(selected?.qty || 0)}
                    onChangeText={(t) => updateQty(size, t)}
                    placeholder="0"
                    placeholderTextColor={apColors.muted}
                    style={[apStyles.input, styles.inventoryInput]}
                    keyboardType="number-pad"
                    maxLength={5}
                    selectTextOnFocus
                    showSoftInputOnFocus
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaPill}>Rs {finalPrice.toLocaleString()}</Text>
        <Text style={styles.metaPill}>Stock {totalQty}</Text>
        <Text style={styles.metaPill}>Sizes {sizeCount}</Text>
      </View>
    </View>
  );
});

export default function Q06B3ReadyVariants() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const ctx = useProductDraft() as any;
  const { draft } = ctx;
  const ctxRef = useRef(ctx);
  const draftRef = useRef(draft);
  const variantsRef = useRef<ReadyVariant[]>([]);

  const basePrice = Number(draft?.price?.cost_pkr_total || 0);

  const [variants, setVariants] = useState<ReadyVariant[]>(() => {
    const existing = normalizeReadyVariants(draft?.price?.variants);
    return existing.length ? existing : [createEmptyVariant(1)];
  });

  const totalQty = useMemo(() => sumReadyVariantQty(variants), [variants]);
  const hasSingleVariant = variants.length === 1;

  useEffect(() => {
    ctxRef.current = ctx;
    draftRef.current = draft;
  }, [ctx, draft]);

  useEffect(() => {
    variantsRef.current = variants;
  }, [variants]);

  const syncVariantsToDraft = useCallback((nextVariants: ReadyVariant[]) => {
    const cleaned = cleanReadyVariants(nextVariants);
    const inventoryQty = sumReadyVariantQty(cleaned);
    const currentCtx = ctxRef.current;
    const currentDraft = draftRef.current;

    if (typeof currentCtx.setDraft === "function") {
      currentCtx.setDraft((prev: any) => ({
        ...(prev ?? {}),
        inventory_qty: inventoryQty,
        price: {
          ...(prev?.price ?? {}),
          mode: "stitched_total",
          variants: cleaned,
        },
      }));
      return cleaned;
    }

    if (typeof currentCtx.setPrice === "function") {
      currentCtx.setPrice((prev: any) => ({
        ...(prev ?? {}),
        mode: "stitched_total",
        variants: cleaned,
      }));
    }

    currentDraft.price = {
      ...(currentDraft?.price ?? {}),
      mode: "stitched_total",
      variants: cleaned,
    };
    currentDraft.inventory_qty = inventoryQty;
    return cleaned;
  }, []);

  const updateVariant = useCallback((
    variantId: string,
    updater: (prev: ReadyVariant) => ReadyVariant,
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? updater(v) : v)),
    );
  }, []);

  const removeVariant = useCallback((variantId: string) => {
    setVariants((prev) => {
      const next = prev.filter((v) => v.id !== variantId);
      return cleanReadyVariants(next.length ? next : [createEmptyVariant(1)]);
    });
  }, []);

  const addVariant = useCallback(() => {
    setVariants((prev) => [...prev, createEmptyVariant(prev.length + 1)]);
  }, []);

  const pickVariantImages = useCallback(async (variantId: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
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
  }, [updateVariant]);

  const removeVariantImage = useCallback((variantId: string, path: string) => {
    updateVariant(variantId, (prev) => ({
      ...prev,
      image_paths: normalizeStringArray(prev.image_paths).filter(
        (x) => x !== path,
      ),
    }));
  }, [updateVariant]);

  const makeVariantPrimaryImage = useCallback((variantId: string, index: number) => {
    updateVariant(variantId, (prev) => {
      const imagePaths = [...normalizeStringArray(prev.image_paths)];
      if (index <= 0 || index >= imagePaths.length) return prev;
      const selected = imagePaths.splice(index, 1)[0];
      imagePaths.unshift(selected);
      return { ...prev, image_paths: imagePaths };
    });
  }, [updateVariant]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncVariantsToDraft(variants);
    }, 500);

    return () => clearTimeout(timer);
  }, [syncVariantsToDraft, variants]);

  useEffect(() => {
    return () => {
      syncVariantsToDraft(variantsRef.current);
    };
  }, [syncVariantsToDraft]);

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
      Alert.alert("Check styles", error);
      return;
    }

    syncVariantsToDraft(cleaned);

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q11-description" as any);
  }

  return (
    <AddProductScreen
      title={hasSingleVariant ? "Ready Design" : "Ready Styles"}
      onBack={closeScreen}
      contentStyle={styles.screenContent}
    >
      <View style={styles.contentBlock}>
        <View style={styles.summaryPanel}>
          <Text style={styles.summaryTitle}>
            {hasSingleVariant ? "Design" : "Multiple styles"}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryPill}>
              From Rs {basePrice.toLocaleString()}
            </Text>
          </View>
        </View>

        {!variants.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No styles</Text>
            <Pressable
              onPress={addVariant}
              style={({ pressed }) => [
                apStyles.primaryBtn,
                styles.compactButton,
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text style={apStyles.primaryText}>Add style</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {variants.map((item, index) => (
              <ReadyVariantCard
                key={item.id}
                variant={item}
                idx={index}
                basePrice={basePrice}
                updateVariant={updateVariant}
                removeVariant={removeVariant}
                pickVariantImages={pickVariantImages}
                makeVariantPrimaryImage={makeVariantPrimaryImage}
                removeVariantImage={removeVariantImage}
                useDesignLabel={hasSingleVariant}
              />
            ))}

            <Pressable
              onPress={addVariant}
              style={({ pressed }) => [
                apStyles.secondaryBtn,
                styles.addMoreButton,
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text style={apStyles.secondaryText}>
                {hasSingleVariant ? "Add more designs" : "Add more styles"}
              </Text>
            </Pressable>
          </>
        )}

        <View style={styles.actionPanel}>
          <View style={styles.totalFooter}>
            <Text style={styles.totalLabel}>
              {hasSingleVariant ? "Designs" : "Styles"}
            </Text>
            <Text style={styles.totalValue}>{variants.length}</Text>
          </View>
          <View style={styles.totalFooter}>
            <Text style={styles.totalLabel}>Total stock</Text>
            <Text style={styles.totalValue}>{totalQty}</Text>
          </View>
          <AddProductPrimaryButton label="Continue" onPress={onContinue} />
        </View>
      </View>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 150,
  },
  contentBlock: {
    marginTop: 14,
    marginBottom: 12,
  },
  summaryPanel: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.white,
  },
  summaryTitle: {
    color: apColors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  summaryPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: apColors.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    color: apColors.blue,
    fontSize: 12,
    fontWeight: "800",
  },
  variantCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: apColors.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
  },
  variantHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: apColors.text,
  },
  removeButton: {
    minHeight: 30,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F2C5C5",
    backgroundColor: "#FFF4F4",
  },
  removeText: {
    fontSize: 11,
    fontWeight: "800",
    color: apColors.danger,
  },
  fieldLabel: {
    marginTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: apColors.white,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    color: apColors.blue,
    fontSize: 12,
    fontWeight: "800",
  },
  imagePanel: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#BFD3FF",
    backgroundColor: "#F8FBFF",
  },
  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  imageButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  imageButtonText: {
    color: apColors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  imageRow: {
    paddingTop: 10,
    gap: 10,
  },
  thumbWrap: {
    width: 78,
    height: 78,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: apColors.borderSoft,
    backgroundColor: "#F1F5F9",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  bannerBadge: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.82)",
  },
  bannerButton: {
    position: "absolute",
    left: 6,
    bottom: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(37,99,235,0.88)",
  },
  bannerText: {
    color: apColors.white,
    fontSize: 10,
    fontWeight: "900",
  },
  removeImageButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  removeImageText: {
    color: apColors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyImageBox: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.white,
    borderWidth: 1,
    borderColor: apColors.border,
  },
  emptyImageText: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  inventoryTable: {
    marginTop: 10,
    gap: 8,
  },
  inventoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inventoryPair: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inventorySize: {
    width: 43,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  inventorySizeOn: {
    borderColor: apColors.blue,
    backgroundColor: apColors.white,
  },
  inventorySizeText: {
    color: apColors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  inventorySizeTextOn: {
    color: apColors.blue,
  },
  inventoryInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    marginTop: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
  },
  totalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalLabel: {
    color: apColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  totalValue: {
    color: apColors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  actionPanel: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: apColors.white,
  },
  emptyState: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
  },
  emptyStateText: {
    color: apColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  compactButton: {
    marginTop: 10,
  },
  addMoreButton: {
    marginTop: 12,
  },
});
