import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export type StitchedVariantSize = {
  size: string;
  qty: number;
};

type VariantMode = "ready_variants" | "made_order_variants" | "";

type ReadyVariantCard = {
  id: string;
  variant_no: number;
  label: string;
  name: string;
  display_name: string;
  additional_price_pkr: number;
  image_paths: string[];
  imageUrls: string[];
  sizes: StitchedVariantSize[];
  sku?: string;
  note?: string;
  raw: any;
};

type MadeOrderVariantCard = {
  id: string;
  variant_no: number;
  label: string;
  name: string;
  display_name: string;
  additional_price_pkr: number;
  estimated_days: number;
  image_paths: string[];
  imageUrls: string[];
  note?: string;
  raw: any;
};

export type StitchedVariant = {
  id: string;
  title: string;
  label: string;
  size: string;
  color?: string;

  price_pkr: number;
  pricePkr: number;
  stock_qty: number | null;
  stockQty: number | null;

  additional_price_pkr: number;
  total_price_pkr: number;

  sku?: string;
  note?: string;

  image_paths: string[];
  imageUrls: string[];

  made_on_order?: boolean;
  variant_mode?: VariantMode;
  estimated_days?: number;

  raw: any;
  rawVariant: ReadyVariantCard | MadeOrderVariantCard;
  rawSize: StitchedVariantSize | null;
};

type Props = {
  product: any;
  selectedVariant: StitchedVariant | null;
  onSelect: (variant: StitchedVariant) => void;
  styles: any;
  stylesVars: any;

  /** Preferred: pass the product base/stitched total price from ViewProduct.screen.tsx. */
  basePricePkr?: number;

  /** Same resolver used by tailoring cards. */
  resolvePublicUrl?: (path: string | null | undefined) => string | null;

  /** Backward compatibility only. Prefer resolvePublicUrl. */
  resolveManyPublic?: (paths: any) => string[];

  /** Kept for compatibility; this component does not auto-select a purchasable size. */
  autoSelectFirstAvailable?: boolean;

  /** Read-only preview mode for vendor self-view. No variant/size selection actions. */
  readOnly?: boolean;
};

function safeText(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function safeNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

function safeArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return [v];
}

function isHttpUrl(v: unknown) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

function isLocalRenderableUri(v: unknown) {
  return (
    typeof v === "string" &&
    (/^file:\/\//i.test(v) ||
      /^content:\/\//i.test(v) ||
      /^data:image\//i.test(v))
  );
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const value = safeText(raw);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }

  return out;
}

function rawImageFromObject(item: any) {
  if (!item || typeof item !== "object") return "";

  return safeText(
    item?.path ??
      item?.uri ??
      item?.url ??
      item?.image_path ??
      item?.imagePath ??
      item?.image_url ??
      item?.imageUrl ??
      item?.public_url ??
      item?.publicUrl,
  );
}

function extractRawVariantImages(v: any) {
  const rawCandidates = [
    ...safeArray(v?.image_paths),
    ...safeArray(v?.imagePaths),
    ...safeArray(v?.images),
    ...safeArray(v?.image_urls),
    ...safeArray(v?.imageUrls),
    ...safeArray(v?.variant_image_paths),
    ...safeArray(v?.variantImagePaths),
    ...safeArray(v?.variant_images),
    ...safeArray(v?.variantImages),
    ...safeArray(v?.variant_image_urls),
    ...safeArray(v?.variantImageUrls),
    ...safeArray(v?.photos),
    ...safeArray(v?.photo_paths),
    ...safeArray(v?.photoPaths),
    ...safeArray(v?.photo_urls),
    ...safeArray(v?.photoUrls),
    ...safeArray(v?.media?.image_paths),
    ...safeArray(v?.media?.imagePaths),
    ...safeArray(v?.media?.images),
    ...safeArray(v?.media?.image_urls),
    ...safeArray(v?.media?.imageUrls),
    v?.image_path,
    v?.imagePath,
    v?.image,
    v?.image_url,
    v?.imageUrl,
    v?.variant_image_path,
    v?.variantImagePath,
    v?.variant_image,
    v?.variantImage,
    v?.variant_image_url,
    v?.variantImageUrl,
    v?.photo_path,
    v?.photoPath,
    v?.photo,
    v?.photo_url,
    v?.photoUrl,
    v?.thumbnail_path,
    v?.thumbnailPath,
    v?.thumbnail,
    v?.thumbnail_url,
    v?.thumbnailUrl,
  ];

  return uniqueNonEmpty(
    rawCandidates.map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return safeText(item);
      }
      return rawImageFromObject(item);
    }),
  );
}

function resolveVariantImageUrls(
  rawPaths: string[],
  resolvePublicUrl?: (path: string | null | undefined) => string | null,
  resolveManyPublic?: (paths: any) => string[],
) {
  const resolved = rawPaths.map((item) => {
    if (isHttpUrl(item) || isLocalRenderableUri(item)) return item;

    if (resolvePublicUrl) {
      const url = resolvePublicUrl(item);
      if (url) return url;
    }

    if (resolveManyPublic) {
      try {
        const many = resolveManyPublic([item]);
        if (Array.isArray(many) && many[0]) return many[0];
      } catch {
        // ignore fallback failure
      }
    }

    return "";
  });

  return uniqueNonEmpty(resolved);
}

function getProductBasePrice(product: any, override?: number) {
  if (Number.isFinite(Number(override)) && Number(override) > 0) {
    return Number(override);
  }

  const price = product?.price ?? {};
  const spec = product?.spec ?? {};
  const inventory = product?.inventory ?? {};

  return safeNumber(
    product?.total_cost_pkr ??
      product?.stitched_total_cost_pkr ??
      product?.stitchedTotalCostPkr ??
      product?.price_pkr ??
      product?.base_price_pkr ??
      product?.basePricePkr ??
      price?.total_cost_pkr ??
      price?.stitched_total_cost_pkr ??
      price?.stitchedTotalCostPkr ??
      price?.price_pkr ??
      price?.cost_pkr_total ??
      price?.costPkrTotal ??
      price?.base_price_pkr ??
      price?.amount_pkr ??
      price?.amount ??
      price?.total_pkr ??
      spec?.total_cost_pkr ??
      spec?.stitched_total_cost_pkr ??
      inventory?.total_cost_pkr ??
      inventory?.stitched_total_cost_pkr ??
      0,
  );
}

function isProductMadeOnOrder(product: any) {
  return Boolean(
    product?.made_on_order ??
    product?.madeOnOrder ??
    product?.spec?.made_on_order ??
    product?.spec?.madeOnOrder ??
    false,
  );
}

function getVariantMode(product: any): VariantMode {
  const mode = safeText(
    product?.spec?.variant_mode ??
      product?.spec?.variantMode ??
      product?.price?.variant_mode ??
      product?.price?.variantMode ??
      "",
  );

  if (mode === "ready_variants" || mode === "made_order_variants") return mode;
  return "";
}

function getRawReadyVariants(product: any) {
  const price = product?.price ?? {};
  const spec = product?.spec ?? {};
  const inventory = product?.inventory ?? {};

  const raw =
    product?.variants ??
    price?.variants ??
    price?.ready_variants ??
    price?.readyVariants ??
    price?.stitched_variants ??
    price?.stitchedVariants ??
    spec?.variants ??
    spec?.ready_variants ??
    spec?.readyVariants ??
    spec?.stitched_variants ??
    spec?.stitchedVariants ??
    inventory?.variants ??
    inventory?.ready_variants ??
    inventory?.stitched_variants ??
    [];

  return Array.isArray(raw) ? raw : [];
}

function getRawMadeOrderVariants(product: any) {
  const price = product?.price ?? {};
  const spec = product?.spec ?? {};
  const inventory = product?.inventory ?? {};

  const raw =
    price?.made_order_variants ??
    price?.madeOrderVariants ??
    product?.made_order_variants ??
    product?.madeOrderVariants ??
    spec?.made_order_variants ??
    spec?.madeOrderVariants ??
    inventory?.made_order_variants ??
    inventory?.madeOrderVariants ??
    [];

  return Array.isArray(raw) ? raw : [];
}

function normalizeSizeRows(v: any): StitchedVariantSize[] {
  const rawSizes = Array.isArray(v?.sizes) ? v.sizes : [];

  const fromSizes = rawSizes
    .map(
      (row: any): StitchedVariantSize => ({
        size: safeText(
          row?.size ?? row?.label ?? row?.name ?? row?.value ?? row,
        ),
        qty: safeInt(
          row?.qty ??
            row?.stock_qty ??
            row?.stockQty ??
            row?.stock ??
            row?.quantity ??
            0,
        ),
      }),
    )
    .filter((row: StitchedVariantSize) => !!row.size);

  if (fromSizes.length) return fromSizes;

  const singleSize = safeText(
    v?.size ?? v?.selected_size ?? v?.selectedSize ?? v?.label ?? "",
  );
  if (singleSize) {
    const qtyRaw =
      v?.stock_qty ?? v?.stockQty ?? v?.qty ?? v?.stock ?? v?.quantity;
    return [
      {
        size: singleSize,
        qty: qtyRaw == null || qtyRaw === "" ? 0 : safeInt(qtyRaw),
      },
    ];
  }

  return [];
}

function normalizeReadyVariantCards(
  product: any,
  resolvePublicUrl?: (path: string | null | undefined) => string | null,
  resolveManyPublic?: (paths: any) => string[],
): ReadyVariantCard[] {
  const rawVariants = getRawReadyVariants(product);

  return rawVariants
    .map((v: any, index: number): ReadyVariantCard | null => {
      if (!v || typeof v !== "object") return null;

      const variantNo = safeInt(v?.variant_no ?? v?.variantNo) || index + 1;
      const name = safeText(
        v?.name ?? v?.color ?? v?.design ?? v?.title ?? v?.label ?? "",
      );
      const label = safeText(v?.label) || `Variant ${variantNo}`;
      const displayName =
        safeText(v?.display_name ?? v?.displayName) ||
        (name ? `Variant ${variantNo}: ${name}` : label);
      const additionalPrice = safeNumber(
        v?.additional_price_pkr ??
          v?.additionalPricePkr ??
          v?.extra_price_pkr ??
          v?.extraPricePkr ??
          0,
      );

      const imagePaths = extractRawVariantImages(v);
      const imageUrls = resolveVariantImageUrls(
        imagePaths,
        resolvePublicUrl,
        resolveManyPublic,
      );
      const sizes = normalizeSizeRows(v);

      return {
        id:
          safeText(v?.id ?? v?.variant_id ?? v?.variantId) ||
          `variant-${variantNo}`,
        variant_no: variantNo,
        label,
        name,
        display_name: displayName,
        additional_price_pkr: additionalPrice,
        image_paths: imagePaths,
        imageUrls,
        sizes,
        sku: safeText(v?.sku),
        note: safeText(v?.note ?? v?.description),
        raw: v,
      };
    })
    .filter((v: ReadyVariantCard | null): v is ReadyVariantCard => Boolean(v));
}

function normalizeMadeOrderVariantCards(
  product: any,
  resolvePublicUrl?: (path: string | null | undefined) => string | null,
  resolveManyPublic?: (paths: any) => string[],
): MadeOrderVariantCard[] {
  const rawVariants = getRawMadeOrderVariants(product);

  return rawVariants
    .map((v: any, index: number): MadeOrderVariantCard | null => {
      if (!v || typeof v !== "object") return null;

      const variantNo = safeInt(v?.variant_no ?? v?.variantNo) || index + 1;
      const name = safeText(v?.name ?? v?.color ?? v?.design ?? v?.title ?? "");
      const label = safeText(v?.label) || `Variant ${variantNo}`;
      const displayName =
        safeText(v?.display_name ?? v?.displayName) ||
        (name ? `Variant ${variantNo}: ${name}` : label);
      const additionalPrice = safeNumber(
        v?.additional_price_pkr ??
          v?.additionalPricePkr ??
          v?.extra_price_pkr ??
          v?.extraPricePkr ??
          0,
      );
      const estimatedDays = safeInt(
        v?.estimated_days ??
          v?.estimatedDays ??
          v?.turnaround_days ??
          v?.turnaroundDays ??
          0,
      );

      const imagePaths = extractRawVariantImages(v);
      const imageUrls = resolveVariantImageUrls(
        imagePaths,
        resolvePublicUrl,
        resolveManyPublic,
      );

      return {
        id:
          safeText(v?.id ?? v?.variant_id ?? v?.variantId) ||
          `made-order-variant-${variantNo}`,
        variant_no: variantNo,
        label,
        name,
        display_name: displayName,
        additional_price_pkr: additionalPrice,
        estimated_days: estimatedDays,
        image_paths: imagePaths,
        imageUrls,
        note: safeText(v?.note ?? v?.description),
        raw: v,
      };
    })
    .filter((v: MadeOrderVariantCard | null): v is MadeOrderVariantCard =>
      Boolean(v),
    );
}

function makeSelection(
  variant: ReadyVariantCard,
  sizeRow: StitchedVariantSize,
  basePrice: number,
): StitchedVariant {
  const total = basePrice + variant.additional_price_pkr;
  const title = `${variant.display_name} - ${sizeRow.size}`;

  return {
    id: `${variant.id}::${sizeRow.size}`,
    title,
    label: title,
    size: sizeRow.size,
    color: variant.name,
    price_pkr: total,
    pricePkr: total,
    stock_qty: sizeRow.qty,
    stockQty: sizeRow.qty,
    additional_price_pkr: variant.additional_price_pkr,
    total_price_pkr: total,
    sku: variant.sku,
    note: variant.note,
    image_paths: variant.image_paths,
    imageUrls: variant.imageUrls,
    made_on_order: false,
    variant_mode: "ready_variants",
    raw: variant.raw,
    rawVariant: variant,
    rawSize: sizeRow,
  };
}

function makeMadeOrderSelection(
  variant: MadeOrderVariantCard,
  basePrice: number,
): StitchedVariant {
  const total = basePrice + variant.additional_price_pkr;
  const title = variant.display_name;

  return {
    id: variant.id,
    title,
    label: title,
    size: "",
    color: variant.name,
    price_pkr: total,
    pricePkr: total,
    stock_qty: null,
    stockQty: null,
    additional_price_pkr: variant.additional_price_pkr,
    total_price_pkr: total,
    note: variant.note,
    image_paths: variant.image_paths,
    imageUrls: variant.imageUrls,
    made_on_order: true,
    variant_mode: "made_order_variants",
    estimated_days: variant.estimated_days,
    raw: variant.raw,
    rawVariant: variant,
    rawSize: null,
  };
}

function money(value: number) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function stockMessage(qty: number) {
  if (qty <= 0) return "Out of stock";
  if (qty <= 2) return `Only ${qty} left`;
  return `${qty} in stock`;
}

export function normalizeStitchedVariants(product: any): StitchedVariant[] {
  const basePrice = getProductBasePrice(product);
  const cards = normalizeReadyVariantCards(product);

  return cards.flatMap((variant) =>
    variant.sizes.map((sizeRow) => makeSelection(variant, sizeRow, basePrice)),
  );
}

export function normalizeMadeOrderStitchedVariants(
  product: any,
): StitchedVariant[] {
  const basePrice = getProductBasePrice(product);
  const cards = normalizeMadeOrderVariantCards(product);

  return cards.map((variant) => makeMadeOrderSelection(variant, basePrice));
}

export default function ViewProductStitchedVariants({
  product,
  selectedVariant,
  onSelect,
  styles,
  stylesVars,
  basePricePkr,
  resolvePublicUrl,
  resolveManyPublic,
  readOnly = false,
}: Props) {
  const { width } = useWindowDimensions();
  const [activeVariantId, setActiveVariantId] = useState<string>("");
  const [previewVariant, setPreviewVariant] = useState<
    ReadyVariantCard | MadeOrderVariantCard | null
  >(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const basePrice = useMemo(
    () => getProductBasePrice(product, basePricePkr),
    [basePricePkr, product],
  );

  const madeOnOrder = isProductMadeOnOrder(product);
  const variantMode = getVariantMode(product);

  const madeOrderVariants = useMemo(
    () =>
      normalizeMadeOrderVariantCards(
        product,
        resolvePublicUrl,
        resolveManyPublic,
      ),
    [product, resolveManyPublic, resolvePublicUrl],
  );

  const hasMadeOrderVariants =
    madeOnOrder &&
    (variantMode === "made_order_variants" || madeOrderVariants.length > 0) &&
    madeOrderVariants.length > 0;

  const variants = useMemo(
    () =>
      normalizeReadyVariantCards(product, resolvePublicUrl, resolveManyPublic),
    [product, resolveManyPublic, resolvePublicUrl],
  );

  useEffect(() => {
    const selectedRawId = selectedVariant?.rawVariant?.id;
    if (selectedRawId) {
      setActiveVariantId(selectedRawId);
    }
  }, [selectedVariant?.rawVariant?.id]);

  if (hasMadeOrderVariants) {
    return (
      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { color: stylesVars.blue }]}>
          {readOnly ? "Variants Offered" : "Choose a Variant"}
        </Text>
        {!readOnly ? (
          <Text style={[styles.meta, { marginTop: 4 }]}></Text>
        ) : null}

        <View style={{ marginTop: 12, gap: 14 }}>
          {madeOrderVariants.map((variant, index) => {
            const isActive = activeVariantId === variant.id;
            const finalPrice = basePrice + variant.additional_price_pkr;

            return (
              <Pressable
                key={variant.id}
                disabled={readOnly}
                onPress={() => {
                  if (readOnly) return;
                  setActiveVariantId(variant.id);
                  onSelect(makeMadeOrderSelection(variant, basePrice));
                }}
                style={({ pressed }) => [
                  {
                    borderWidth: 1.5,
                    borderColor: isActive ? stylesVars.blue : "#D7E3FF",
                    backgroundColor: isActive ? "#F7FAFF" : "#FFFFFF",
                    borderRadius: 16,
                    padding: 12,
                    gap: 10,
                  },
                  pressed && !readOnly ? styles.pressed : null,
                ]}
              >
                {readOnly ? (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: stylesVars.text,
                    }}
                  >
                    Variant {index + 1}
                  </Text>
                ) : null}

                {variant.imageUrls.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {variant.imageUrls.map((uri, imgIndex) => (
                      <Pressable
                        key={`${uri}-${imgIndex}`}
                        disabled={readOnly}
                        onPress={() => {
                          if (readOnly) return;
                          setPreviewVariant(variant);
                          setPreviewIndex(imgIndex);
                        }}
                        style={({ pressed }) => [
                          pressed && !readOnly ? styles.pressed : null,
                        ]}
                      >
                        <Image
                          source={{ uri }}
                          style={{
                            width: Math.min(210, width - 90),
                            height: 170,
                            borderRadius: 14,
                            backgroundColor: "#EEF2F7",
                          }}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View
                    style={{
                      height: 150,
                      borderRadius: 14,
                      backgroundColor: "#EEF2F7",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={styles.meta}>No variant image</Text>
                  </View>
                )}

                <View style={{ gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: stylesVars.text,
                    }}
                    numberOfLines={2}
                  >
                    {variant.display_name}
                  </Text>

                  <Text style={styles.metaLine}>
                    Base price: {money(basePrice)}
                  </Text>
                  <Text style={styles.metaLine}>
                    Additional cost: {money(variant.additional_price_pkr)}
                  </Text>
                  <Text
                    style={[
                      styles.metaLine,
                      { fontWeight: "900", color: stylesVars.text },
                    ]}
                  >
                    Total cost: {money(finalPrice)}
                  </Text>
                  <Text style={styles.metaLine}>
                    Estimated time:{" "}
                    {variant.estimated_days > 0
                      ? `${variant.estimated_days} days`
                      : "To be confirmed"}
                  </Text>
                  {variant.note ? (
                    <Text style={styles.metaLine}>{variant.note}</Text>
                  ) : null}
                </View>

                {!readOnly ? (
                  <View
                    style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                  >
                    <View
                      style={{
                        minHeight: 42,
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isActive
                          ? stylesVars.blue
                          : stylesVars.blueSoft,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "900",
                          color: isActive ? "#FFFFFF" : stylesVars.blue,
                        }}
                      >
                        {isActive ? "Variant Selected" : "Tap to Select"}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        setPreviewVariant(variant);
                        setPreviewIndex(0);
                      }}
                      style={({ pressed }) => [
                        {
                          minHeight: 42,
                          borderRadius: 999,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#EEF4FF",
                          borderWidth: 1,
                          borderColor: "#D7E3FF",
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "900",
                          color: stylesVars.blue,
                        }}
                      >
                        View Card
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <VariantPreviewModal
          previewVariant={previewVariant}
          previewIndex={previewIndex}
          setPreviewVariant={setPreviewVariant}
          width={width}
          styles={styles}
          stylesVars={stylesVars}
          basePrice={basePrice}
        />
      </View>
    );
  }

  if (!variants.length) return null;

  return (
    <View style={styles.card}>
      <Text style={[styles.sectionTitle, { color: stylesVars.blue }]}>
        {readOnly ? "Product Variants Offered" : "Choose a Variant"}
      </Text>

      <View style={{ marginTop: 12, gap: 14 }}>
        {variants.map((variant) => {
          const isActive = activeVariantId === variant.id;
          const selectedSize =
            selectedVariant?.rawVariant?.id === variant.id
              ? selectedVariant?.size
              : "";
          const finalPrice = basePrice + variant.additional_price_pkr;
          const hasAvailableSize = variant.sizes.some((row) => row.qty > 0);

          return (
            <View
              key={variant.id}
              style={{
                borderWidth: 1.5,
                borderColor: isActive ? stylesVars.blue : "#D7E3FF",
                backgroundColor: isActive ? "#F7FAFF" : "#FFFFFF",
                borderRadius: 16,
                padding: 12,
                gap: 10,
              }}
            >
              {variant.imageUrls.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {variant.imageUrls.map((uri, imgIndex) => (
                    <Pressable
                      key={`${uri}-${imgIndex}`}
                      disabled={readOnly}
                      onPress={() => {
                        if (readOnly) return;
                        setPreviewVariant(variant);
                        setPreviewIndex(imgIndex);
                      }}
                      style={({ pressed }) => [
                        pressed && !readOnly ? styles.pressed : null,
                      ]}
                    >
                      <Image
                        source={{ uri }}
                        style={{
                          width: Math.min(210, width - 90),
                          height: 170,
                          borderRadius: 14,
                          backgroundColor: "#EEF2F7",
                        }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View
                  style={{
                    height: 150,
                    borderRadius: 14,
                    backgroundColor: "#EEF2F7",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={styles.meta}>No variant image</Text>
                </View>
              )}

              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "900",
                    color: stylesVars.text,
                  }}
                  numberOfLines={2}
                >
                  {variant.display_name}
                </Text>

                {variant.name ? (
                  <Text style={styles.metaLine}>
                    Color / Design: {variant.name}
                  </Text>
                ) : null}
                <Text style={styles.metaLine}>
                  Base price: {money(basePrice)}
                </Text>
                <Text style={styles.metaLine}>
                  Additional cost: {money(variant.additional_price_pkr)}
                </Text>
                <Text
                  style={[
                    styles.metaLine,
                    { fontWeight: "900", color: stylesVars.text },
                  ]}
                >
                  Total cost: {money(finalPrice)}
                </Text>
                {variant.note ? (
                  <Text style={styles.metaLine}>{variant.note}</Text>
                ) : null}
                {variant.sku ? (
                  <Text style={styles.metaLine}>SKU: {variant.sku}</Text>
                ) : null}
              </View>

              {!readOnly ? (
                <View
                  style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}
                >
                  <Pressable
                    disabled={!hasAvailableSize}
                    onPress={() => setActiveVariantId(variant.id)}
                    style={({ pressed }) => [
                      {
                        minHeight: 42,
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isActive
                          ? stylesVars.blue
                          : stylesVars.blueSoft,
                        opacity: hasAvailableSize ? 1 : 0.5,
                      },
                      pressed && hasAvailableSize ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "900",
                        color: isActive ? "#FFFFFF" : stylesVars.blue,
                      }}
                    >
                      {isActive ? "Variant Selected" : "Select Variant"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setPreviewVariant(variant);
                      setPreviewIndex(0);
                    }}
                    style={({ pressed }) => [
                      {
                        minHeight: 42,
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#EEF4FF",
                        borderWidth: 1,
                        borderColor: "#D7E3FF",
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "900",
                        color: stylesVars.blue,
                      }}
                    >
                      View Card
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {readOnly || isActive ? (
                <View style={{ gap: 8 }}>
                  <Text
                    style={[
                      styles.meta,
                      { color: stylesVars.blue, fontWeight: "800" },
                    ]}
                  >
                    {readOnly
                      ? "Offered sizes and stock:"
                      : "Select from the available sizes:"}
                  </Text>

                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                  >
                    {variant.sizes.map((row: StitchedVariantSize) => {
                      const out = row.qty <= 0;
                      const low = row.qty > 0 && row.qty <= 2;
                      const selected = !readOnly && selectedSize === row.size;

                      return (
                        <Pressable
                          key={`${variant.id}-${row.size}`}
                          disabled={readOnly || out}
                          onPress={() => {
                            if (readOnly) return;
                            onSelect(makeSelection(variant, row, basePrice));
                          }}
                          style={({ pressed }) => [
                            {
                              width: 92,
                              minHeight: 74,
                              borderRadius: 14,
                              paddingHorizontal: 10,
                              paddingVertical: 10,
                              borderWidth: selected ? 2 : 1,
                              borderColor: selected
                                ? stylesVars.blue
                                : low
                                  ? "#FDBA74"
                                  : "#D7E3FF",
                              backgroundColor: selected
                                ? stylesVars.blue
                                : out
                                  ? "#F1F5F9"
                                  : low
                                    ? "#FFF7ED"
                                    : "#FFFFFF",
                              opacity: out ? 0.55 : 1,
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 5,
                            },
                            pressed && !readOnly && !out
                              ? styles.pressed
                              : null,
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              lineHeight: 20,
                              fontWeight: "900",
                              color: selected
                                ? "#FFFFFF"
                                : out
                                  ? "#94A3B8"
                                  : stylesVars.text,
                              textAlign: "center",
                            }}
                            numberOfLines={1}
                          >
                            {row.size}
                          </Text>

                          <Text
                            style={{
                              fontSize: 10.5,
                              lineHeight: 14,
                              fontWeight: "800",
                              color: selected
                                ? "#FFFFFF"
                                : out
                                  ? "#94A3B8"
                                  : low
                                    ? "#C2410C"
                                    : stylesVars.mutedText,
                              textAlign: "center",
                            }}
                            numberOfLines={2}
                          >
                            {stockMessage(row.qty)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <VariantPreviewModal
        previewVariant={previewVariant}
        previewIndex={previewIndex}
        setPreviewVariant={setPreviewVariant}
        width={width}
        styles={styles}
        stylesVars={stylesVars}
        basePrice={basePrice}
      />
    </View>
  );
}

function VariantPreviewModal({
  previewVariant,
  previewIndex,
  setPreviewVariant,
  width,
  styles,
  stylesVars,
  basePrice,
}: {
  previewVariant: ReadyVariantCard | MadeOrderVariantCard | null;
  previewIndex: number;
  setPreviewVariant: (
    variant: ReadyVariantCard | MadeOrderVariantCard | null,
  ) => void;
  width: number;
  styles: any;
  stylesVars: any;
  basePrice: number;
}) {
  const estimatedDays =
    previewVariant && "estimated_days" in previewVariant
      ? previewVariant.estimated_days
      : 0;

  return (
    <Modal
      visible={!!previewVariant}
      transparent
      animationType="fade"
      onRequestClose={() => setPreviewVariant(null)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.72)",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <View
          style={{
            maxHeight: "88%",
            borderRadius: 20,
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: "900",
                  color: stylesVars.text,
                }}
              >
                {previewVariant?.display_name ?? "Variant"}
              </Text>

              <Pressable
                onPress={() => setPreviewVariant(null)}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "900",
                    color: stylesVars.blue,
                  }}
                >
                  Close
                </Text>
              </Pressable>
            </View>

            {previewVariant?.imageUrls?.length ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{
                  x: Math.max(0, previewIndex) * (width - 64),
                  y: 0,
                }}
                contentContainerStyle={{ gap: 10 }}
              >
                {previewVariant.imageUrls.map((uri, imgIndex) => (
                  <Image
                    key={`${uri}-modal-${imgIndex}`}
                    source={{ uri }}
                    style={{
                      width: width - 64,
                      height: Math.min(420, width * 1.1),
                      borderRadius: 16,
                      backgroundColor: "#EEF2F7",
                    }}
                    resizeMode="contain"
                  />
                ))}
              </ScrollView>
            ) : (
              <View
                style={{
                  height: 220,
                  borderRadius: 16,
                  backgroundColor: "#EEF2F7",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.meta}>No image available</Text>
              </View>
            )}

            {previewVariant ? (
              <View style={{ gap: 4 }}>
                {"sizes" in previewVariant && previewVariant.name ? (
                  <Text style={styles.metaLine}>
                    Color / Design: {previewVariant.name}
                  </Text>
                ) : null}
                <Text style={styles.metaLine}>
                  Base price: {money(basePrice)}
                </Text>
                <Text style={styles.metaLine}>
                  Additional cost: {money(previewVariant.additional_price_pkr)}
                </Text>
                <Text
                  style={[
                    styles.metaLine,
                    { fontWeight: "900", color: stylesVars.text },
                  ]}
                >
                  Total cost:{" "}
                  {money(basePrice + previewVariant.additional_price_pkr)}
                </Text>
                {estimatedDays > 0 ? (
                  <Text style={styles.metaLine}>
                    Estimated time: {estimatedDays} days
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
