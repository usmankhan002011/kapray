export type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

export type ProductRow = {
  id: number;
  vendor_id: number;
  product_code: string | null;
  title: string | null;
  inventory_qty: number | null;
  made_on_order?: boolean | null;
  product_category?: ProductCategory | string | null;
  spec: any;
  price: any;
  media: any;
  created_at?: string | null;
  updated_at?: string | null;
};

export type VendorTailoringOptions = {
  blouse_neck?: string[] | null;
  sleeves?: string[] | null;
  trouser?: string[] | null;
};

export type ProductTailoringSelections = {
  blouse_neck: string[];
  sleeves: string[];
  trouser: string[];
};

export type EditableVariantSizeRow = {
  size: string;
  qty: number;
  raw: any;
};

export type EditableReadyVariant = {
  id: string;
  label: string;
  additional_price_pkr: number;
  sourceKey: string;
  raw: any;
  sizes: EditableVariantSizeRow[];
};

export const READY_STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export type NewReadyVariantImageDraft = {
  uri: string;
};

export type NewReadyVariantDraft = {
  name: string;
  additional_price_pkr: number;
  sizes: EditableVariantSizeRow[];
  images: NewReadyVariantImageDraft[];
};

export type NewMadeOrderVariantImageDraft = {
  uri: string;
};

export type NewMadeOrderVariantDraft = {
  name: string;
  additional_price_pkr: number;
  estimated_days: number;
  images: NewMadeOrderVariantImageDraft[];
};

export type NewTailoringStyleImageDraft = {
  uri: string;
};

export type NewTailoringStyleDraft = {
  title: string;
  note: string;
  extra_cost_pkr: number;
  default_neck: string;
  default_sleeve: string;
  default_trouser: string;
  neck_styles: string[];
  sleeve_styles: string[];
  trouser_styles: string[];
  images: NewTailoringStyleImageDraft[];
};

export function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function safeText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : "-";
}

export function sanitizeNumber(input: string) {
  const cleaned = input.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export function safeJson(v: any) {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return {};
}

export function safeNumOrZero(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

export function roundMeter(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function isProductCategory(v: unknown): v is ProductCategory {
  return (
    v === "unstitched_plain" ||
    v === "unstitched_dyeing" ||
    v === "unstitched_dyeing_tailoring" ||
    v === "stitched_ready"
  );
}

export function isTruthyFlag(v: unknown) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y";
  }
  return false;
}

export function positiveNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function resolveProductCategory(product: ProductRow | null): ProductCategory | null {
  if (!product) return null;

  const spec = safeJson(product.spec);
  const price = safeJson(product.price);
  const fromSpec = String(spec?.product_category ?? "").trim();
  const fromDb = String(product?.product_category ?? "").trim();
  const exactCategories = [fromSpec, fromDb].filter(isProductCategory);
  const priceMode = String(price?.mode ?? "").trim();
  const isUnstitched =
    exactCategories.some(
      (category) =>
        category === "unstitched_plain" ||
        category === "unstitched_dyeing" ||
        category === "unstitched_dyeing_tailoring",
    ) ||
    fromDb === "unstitched" ||
    priceMode.includes("unstitched");

  if (isUnstitched) {
    if (
      exactCategories.includes("unstitched_dyeing_tailoring") ||
      isTruthyFlag(spec?.tailoring_enabled) ||
      isTruthyFlag(spec?.tailoring_selected)
    ) {
      return "unstitched_dyeing_tailoring";
    }

    if (
      exactCategories.includes("unstitched_dyeing") ||
      isTruthyFlag(spec?.dyeing_enabled) ||
      isTruthyFlag(spec?.dyeing_selected) ||
      positiveNumber(price?.dyeing_cost_pkr) > 0 ||
      positiveNumber(spec?.dyeing_cost_pkr) > 0
    ) {
      return "unstitched_dyeing";
    }

    return "unstitched_plain";
  }

  if (
    exactCategories.includes("stitched_ready") ||
    priceMode === "stitched_total" ||
    priceMode === "stitched_ready"
  ) {
    return "stitched_ready";
  }

  return null;
}

export function editedCategoryFromState(
  priceMode: "stitched_total" | "unstitched_per_meter",
  dyeingEnabled: boolean,
  tailoringEnabled: boolean,
): ProductCategory {
  if (priceMode === "stitched_total") return "stitched_ready";
  if (tailoringEnabled) return "unstitched_dyeing_tailoring";
  if (dyeingEnabled) return "unstitched_dyeing";
  return "unstitched_plain";
}

export function categoryLabel(category: ProductCategory | null) {
  if (category === "unstitched_dyeing_tailoring") {
    return "Unstitched + dyeing + tailoring";
  }
  if (category === "unstitched_dyeing") return "Unstitched + dyeing";
  if (category === "unstitched_plain") return "Unstitched plain fabric";
  if (category === "stitched_ready") return "Stitched";
  return "Product";
}

export function isHttpUrl(v: any) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

export function extFromUri(uri: string) {
  const clean = String(uri || "");
  const qIdx = clean.indexOf("?");
  const base = qIdx >= 0 ? clean.slice(0, qIdx) : clean;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function guessContentTypeFromExt(ext: string) {
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

export function normalizeStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];

  for (const item of v) {
    const s = String(item ?? "").trim();
    if (s) out.push(s);
  }

  return Array.from(new Set(out));
}

export function readVendorTailoringOptions(v: unknown): VendorTailoringOptions {
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

export function emptyTailoringSelections(): ProductTailoringSelections {
  return {
    blouse_neck: [],
    sleeves: [],
    trouser: [],
  };
}

export function readProductTailoringSelections(
  specInput: unknown,
): ProductTailoringSelections {
  const spec = safeJson(specInput);

  const nested =
    safeJson(spec?.tailoring_options).blouse_neck ||
    safeJson(spec?.tailoring_styles).blouse_neck ||
    safeJson(spec?.tailoring_style_options).blouse_neck
      ? safeJson(
          spec?.tailoring_options ??
            spec?.tailoring_styles ??
            spec?.tailoring_style_options,
        )
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

export function writeProductTailoringSelections(
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

export function clearProductTailoringSelections(specInput: unknown) {
  return writeProductTailoringSelections(specInput, emptyTailoringSelections());
}

export function safeNonNegInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(0, Math.trunc(n));
}

export function readVariantArrayWithSource(priceInput: unknown, specInput: unknown) {
  const price = safeJson(priceInput);
  const spec = safeJson(specInput);

  const candidates: Array<{
    source: "price" | "spec";
    key: string;
    value: any;
  }> = [
    { source: "price", key: "variants", value: price?.variants },
    { source: "price", key: "ready_variants", value: price?.ready_variants },
    { source: "price", key: "readyVariants", value: price?.readyVariants },
    {
      source: "price",
      key: "stitched_variants",
      value: price?.stitched_variants,
    },
    {
      source: "price",
      key: "stitchedVariants",
      value: price?.stitchedVariants,
    },
    { source: "spec", key: "variants", value: spec?.variants },
    { source: "spec", key: "ready_variants", value: spec?.ready_variants },
    { source: "spec", key: "readyVariants", value: spec?.readyVariants },
    {
      source: "spec",
      key: "stitched_variants",
      value: spec?.stitched_variants,
    },
    { source: "spec", key: "stitchedVariants", value: spec?.stitchedVariants },
  ];

  const found = candidates.find((item) => Array.isArray(item.value));

  return {
    source: found?.source ?? "price",
    key: found?.key ?? "variants",
    variants: Array.isArray(found?.value) ? found?.value : [],
  };
}

export function normalizeEditableVariantSizes(v: any): EditableVariantSizeRow[] {
  const rawSizes = Array.isArray(v?.sizes) ? v.sizes : [];

  const fromSizes = rawSizes
    .map((row: any): EditableVariantSizeRow | null => {
      const size = String(
        row?.size ?? row?.label ?? row?.name ?? row?.value ?? "",
      ).trim();
      if (!size) return null;

      return {
        size,
        qty: safeNonNegInt(
          row?.qty ??
            row?.stock_qty ??
            row?.stockQty ??
            row?.stock ??
            row?.quantity ??
            0,
        ),
        raw: row && typeof row === "object" && !Array.isArray(row) ? row : {},
      };
    })
    .filter(Boolean) as EditableVariantSizeRow[];

  if (fromSizes.length) return fromSizes;

  const singleSize = String(
    v?.size ?? v?.selected_size ?? v?.selectedSize ?? v?.label ?? "",
  ).trim();

  if (!singleSize) return [];

  return [
    {
      size: singleSize,
      qty: safeNonNegInt(
        v?.qty ?? v?.stock_qty ?? v?.stockQty ?? v?.stock ?? v?.quantity ?? 0,
      ),
      raw: {},
    },
  ];
}

export function readEditableStitchedVariants(
  product: ProductRow | null,
): EditableReadyVariant[] {
  if (!product) return [];

  const { key, variants } = readVariantArrayWithSource(
    product.price,
    product.spec,
  );

  return variants
    .map((variant: any, index: number): EditableReadyVariant | null => {
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
        return null;
      }

      const variantNo =
        safeNonNegInt(variant?.variant_no ?? variant?.variantNo) || index + 1;
      const name = String(
        variant?.display_name ??
          variant?.displayName ??
          variant?.name ??
          variant?.color ??
          variant?.design ??
          variant?.title ??
          variant?.label ??
          `Style ${variantNo}`,
      ).trim();

      const id = String(
        variant?.id ??
          variant?.variant_id ??
          variant?.variantId ??
          `variant-${variantNo}`,
      ).trim();

      const sizes = normalizeEditableVariantSizes(variant);
      if (!sizes.length) return null;

      return {
        id,
        label: name.replace(/^Variant\b/i, "Style") || `Style ${variantNo}`,
        additional_price_pkr: safeNonNegInt(
          variant?.additional_price_pkr ??
            variant?.additionalPricePkr ??
            variant?.extra_price_pkr ??
            variant?.extraPricePkr,
        ),
        sourceKey: key,
        raw: variant,
        sizes,
      };
    })
    .filter(Boolean) as EditableReadyVariant[];
}

export function getStitchedVariantInventoryInfo(variants: EditableReadyVariant[]) {
  let totalQty = 0;
  let availableSizes = 0;

  for (const variant of variants) {
    for (const row of variant.sizes) {
      const qty = safeNonNegInt(row.qty);
      totalQty += qty;
      if (qty > 0) availableSizes += 1;
    }
  }

  return {
    totalQty,
    availableSizes,
    allOutOfStock: variants.length > 0 && totalQty <= 0,
  };
}

export function readEditableSimpleReadyInventory(
  product: ProductRow | null,
): EditableVariantSizeRow[] {
  if (!product) return [];

  const price = safeJson(product.price);
  const spec = safeJson(product.spec);
  const rawRows =
    price?.simple_ready_inventory ??
    price?.simpleReadyInventory ??
    spec?.simple_ready_inventory ??
    spec?.simpleReadyInventory ??
    [];

  if (!Array.isArray(rawRows)) return [];

  const seen = new Set<string>();
  const rows: EditableVariantSizeRow[] = [];

  for (const item of rawRows) {
    const row = safeJson(item);
    const size = String(
      row?.size ?? row?.label ?? row?.name ?? row?.value ?? "",
    ).trim();
    const key = size.toLowerCase();

    if (!size || seen.has(key)) continue;
    seen.add(key);

    rows.push({
      size,
      qty: safeNonNegInt(
        row?.qty ??
          row?.stock_qty ??
          row?.stockQty ??
          row?.stock ??
          row?.quantity ??
          0,
      ),
      raw: row,
    });
  }

  return rows;
}

export function getSimpleReadyInventoryInfo(rows: EditableVariantSizeRow[]) {
  let totalQty = 0;
  let availableSizes = 0;

  for (const row of rows) {
    const qty = safeNonNegInt(row.qty);
    totalQty += qty;
    if (qty > 0) availableSizes += 1;
  }

  return {
    totalQty,
    availableSizes,
    allOutOfStock: totalQty <= 0,
  };
}

export function writeSimpleReadyInventoryToJson(args: {
  nextPrice: any;
  nextSpec: any;
  rows: EditableVariantSizeRow[];
}) {
  const cleanedRows = args.rows
    .map((row) => {
      const rawRow =
        row.raw && typeof row.raw === "object" && !Array.isArray(row.raw)
          ? row.raw
          : {};
      const size = String(row.size ?? "").trim();
      const qty = safeNonNegInt(row.qty);

      return {
        ...rawRow,
        size,
        qty,
        stock_qty: qty,
        stockQty: qty,
      };
    })
    .filter((row) => row.size);

  args.nextPrice.simple_ready_inventory = cleanedRows;
  args.nextSpec.simple_ready_inventory = cleanedRows;
  args.nextPrice.available_sizes = cleanedRows.map((row) => row.size);
  args.nextSpec.has_ready_variants = false;
  args.nextSpec.variant_mode = "simple_ready";

  return {
    nextPrice: args.nextPrice,
    nextSpec: args.nextSpec,
    totalQty: getSimpleReadyInventoryInfo(args.rows).totalQty,
  };
}

export function writeEditableStitchedVariantsToJson(args: {
  prevPrice: any;
  prevSpec: any;
  nextPrice: any;
  nextSpec: any;
  variants: EditableReadyVariant[];
}) {
  const sourceInfo = readVariantArrayWithSource(args.prevPrice, args.prevSpec);
  const key = sourceInfo.key || "variants";
  const source = sourceInfo.source || "price";

  const nextVariants = args.variants.map((variant, variantIndex) => {
    const rawVariant =
      variant.raw &&
      typeof variant.raw === "object" &&
      !Array.isArray(variant.raw)
        ? variant.raw
        : {};

    return {
      ...rawVariant,
      id: rawVariant?.id ?? variant.id ?? `variant-${variantIndex + 1}`,
      additional_price_pkr: safeNonNegInt(variant.additional_price_pkr),
      sizes: variant.sizes.map((row) => {
        const rawRow =
          row.raw && typeof row.raw === "object" && !Array.isArray(row.raw)
            ? row.raw
            : {};
        const qty = safeNonNegInt(row.qty);

        return {
          ...rawRow,
          size: row.size,
          qty,
          stock_qty: qty,
          stockQty: qty,
        };
      }),
    };
  });

  if (source === "spec") {
    args.nextSpec[key] = nextVariants;
  } else {
    args.nextPrice[key] = nextVariants;
  }

  if (key !== "variants" && Array.isArray(args.prevPrice?.variants)) {
    args.nextPrice.variants = nextVariants;
  }

  return {
    nextPrice: args.nextPrice,
    nextSpec: args.nextSpec,
    totalQty: getStitchedVariantInventoryInfo(args.variants).totalQty,
  };
}

export function makeEmptyReadyVariantDraft(): NewReadyVariantDraft {
  return {
    name: "",
    additional_price_pkr: 0,
    sizes: READY_STANDARD_SIZES.map((size) => ({ size, qty: 0, raw: {} })),
    images: [],
  };
}

export function makeEmptyMadeOrderVariantDraft(): NewMadeOrderVariantDraft {
  return {
    name: "",
    additional_price_pkr: 0,
    estimated_days: 0,
    images: [],
  };
}

export function makeEmptyTailoringStyleDraft(): NewTailoringStyleDraft {
  return {
    title: "",
    note: "",
    extra_cost_pkr: 0,
    default_neck: "",
    default_sleeve: "",
    default_trouser: "",
    neck_styles: [],
    sleeve_styles: [],
    trouser_styles: [],
    images: [],
  };
}

export function sumReadyVariantDraftQty(variant: NewReadyVariantDraft) {
  return (variant.sizes ?? []).reduce(
    (sum, row) => sum + safeNonNegInt(row.qty),
    0,
  );
}

export function nextVariantNoFromList(list: any[]) {
  let maxNo = 0;
  for (let i = 0; i < list.length; i += 1) {
    const n = safeNonNegInt(list[i]?.variant_no ?? list[i]?.variantNo);
    maxNo = Math.max(maxNo, n || i + 1);
  }
  return maxNo + 1;
}

export function cleanNewReadyVariantDraft(
  variant: NewReadyVariantDraft,
  variantNo: number,
  imagePaths: string[] = [],
) {
  const name = String(variant.name ?? "").trim();
  const cleanImagePaths = normalizeStringList(imagePaths);
  const sizes = (variant.sizes ?? [])
    .map((row) => ({
      size: String(row.size ?? "").trim(),
      qty: safeNonNegInt(row.qty),
      stock_qty: safeNonNegInt(row.qty),
      stockQty: safeNonNegInt(row.qty),
    }))
    .filter((row) => row.size && row.qty > 0);

  return {
    id: `ready-variant-${Date.now()}-${variantNo}`,
    variant_no: variantNo,
    label: `Style ${variantNo}`,
    name,
    display_name: name
      ? `Style ${variantNo}: ${name}`
      : `Style ${variantNo}`,
    additional_price_pkr: safeNonNegInt(variant.additional_price_pkr),
    image_paths: cleanImagePaths,
    images: cleanImagePaths.map((path) => ({ uri: path, path })),
    sizes,
  };
}

export function cleanNewMadeOrderVariantDraft(
  variant: NewMadeOrderVariantDraft,
  variantNo: number,
  imagePaths: string[] = [],
) {
  const name = String(variant.name ?? "").trim();
  const cleanImagePaths = normalizeStringList(imagePaths);

  return {
    id: `made-order-variant-${Date.now()}-${variantNo}`,
    variant_no: variantNo,
    label: `Style ${variantNo}`,
    name,
    display_name: name,
    additional_price_pkr: safeNonNegInt(variant.additional_price_pkr),
    estimated_days: safeNonNegInt(variant.estimated_days),
    image_paths: cleanImagePaths,
    images: cleanImagePaths.map((path) => ({ uri: path, path })),
  };
}

export function readMadeOrderVariants(priceInput: unknown): any[] {
  const price = safeJson(priceInput);
  return Array.isArray(price?.made_order_variants)
    ? price.made_order_variants
    : [];
}

export function readTailoringStylePresets(specInput: unknown): any[] {
  const spec = safeJson(specInput);
  return Array.isArray(spec?.tailoring_style_presets)
    ? spec.tailoring_style_presets
    : [];
}

export function variantDisplayTitle(v: any, fallbackNo: number) {
  const no = safeNonNegInt(v?.variant_no ?? v?.variantNo) || fallbackNo;
  const name = String(
    v?.name ?? v?.display_name ?? v?.displayName ?? v?.title ?? v?.label ?? "",
  ).trim();
  if (name && !/^(variant|style)\s+\d+$/i.test(name)) {
    return `Style ${no}: ${name.replace(/^(Variant|Style)\s+\d+\s*:\s*/i, "")}`;
  }
  return `Style ${no}`;
}

export function resolveVariantImageUrls(
  variant: any,
  resolvePublicUrl: (path: string | null | undefined) => string | null,
) {
  const raw = variant?.raw ?? variant ?? {};
  const candidates: unknown[] = [
    ...(Array.isArray(raw?.image_paths) ? raw.image_paths : []),
    ...(Array.isArray(raw?.imagePaths) ? raw.imagePaths : []),
    ...(Array.isArray(raw?.variant_image_paths) ? raw.variant_image_paths : []),
    ...(Array.isArray(raw?.images) ? raw.images : []),
    ...(Array.isArray(raw?.media?.images) ? raw.media.images : []),
    ...(Array.isArray(raw?.media?.image_paths) ? raw.media.image_paths : []),
    raw?.image_path,
    raw?.imagePath,
    raw?.variant_image_path,
    raw?.image,
    raw?.url,
    raw?.uri,
    raw?.path,
  ];

  const urls = candidates
    .map((item) => {
      if (item == null) return null;

      if (typeof item === "string" || typeof item === "number") {
        const rawPath = String(item).trim();
        if (!rawPath) return null;
        return resolvePublicUrl(rawPath) || rawPath;
      }

      if (typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const rawPath = String(
          obj.url ??
            obj.uri ??
            obj.path ??
            obj.image_url ??
            obj.imageUrl ??
            obj.image_path ??
            obj.imagePath ??
            obj.image ??
            "",
        ).trim();
        if (!rawPath) return null;
        return resolvePublicUrl(rawPath) || rawPath;
      }

      return null;
    })
    .filter(Boolean) as string[];

  return normalizeStringList(urls);
}
