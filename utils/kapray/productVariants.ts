export type ReadyVariantImage = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  path?: string | null;
  url?: string | null;
};

export type ReadyVariantSize = {
  size: string;
  qty: number;
};

export type ReadyVariant = {
  id: string;
  variant_no: number;
  label: string;
  name: string;
  display_name: string;
  additional_price_pkr: number;

  // New standardized schema for storage/display.
  image_paths: string[];

  // Legacy/local picker support.
  images: ReadyVariantImage[];

  sizes: ReadyVariantSize[];
};

export type MadeOrderVariantImage = ReadyVariantImage;

export type MadeOrderVariant = {
  id: string;
  variant_no: number;
  label: string;
  name: string;
  display_name: string;
  additional_price_pkr: number;
  estimated_days: number;

  // New standardized schema for storage/display.
  image_paths: string[];

  // Legacy/local picker support.
  images: MadeOrderVariantImage[];
};

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function safeInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export function normalizeReadyVariantImagePaths(v: unknown): string[] {
  const obj = (v ?? {}) as any;

  const raw =
    obj?.image_paths ??
    obj?.variant_image_paths ??
    obj?.image_path ??
    obj?.image ??
    obj?.images ??
    obj?.variant_images ??
    [];

  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of arr) {
    const s =
      typeof item === "string"
        ? safeStr(item)
        : safeStr(
            (item as any)?.path ??
              (item as any)?.uri ??
              (item as any)?.url ??
              "",
          );

    if (!s || seen.has(s)) continue;

    seen.add(s);
    out.push(s);
  }

  return out;
}

export function normalizeReadyVariantImages(v: unknown): ReadyVariantImage[] {
  const arr = Array.isArray(v) ? v : [];
  const seen = new Set<string>();
  const out: ReadyVariantImage[] = [];

  for (const item of arr) {
    const obj = (item ?? {}) as any;
    const uri = safeStr(obj?.uri ?? obj?.url ?? obj?.path ?? "");
    if (!uri || seen.has(uri)) continue;

    seen.add(uri);

    out.push({
      uri,
      width: Number.isFinite(Number(obj?.width))
        ? Number(obj.width)
        : undefined,
      height: Number.isFinite(Number(obj?.height))
        ? Number(obj.height)
        : undefined,
      fileName: obj?.fileName ?? null,
      mimeType: obj?.mimeType ?? null,
      fileSize: Number.isFinite(Number(obj?.fileSize))
        ? Number(obj.fileSize)
        : null,
      path: safeStr(obj?.path ?? "") || null,
      url: safeStr(obj?.url ?? "") || null,
    });
  }

  return out;
}

export function buildReadyVariantDisplayName(variantNo: number, name: string) {
  const clean = safeStr(name);
  return clean ? `Variant ${variantNo}: ${clean}` : `Variant ${variantNo}`;
}

export function makeReadyVariant(variantNo: number): ReadyVariant {
  return {
    id: `variant-${variantNo}`,
    variant_no: variantNo,
    label: `Variant ${variantNo}`,
    name: "",
    display_name: `Variant ${variantNo}`,
    additional_price_pkr: 0,
    image_paths: [],
    images: [],
    sizes: [],
  };
}

export function normalizeReadyVariant(v: unknown, index: number): ReadyVariant {
  const obj = (v ?? {}) as any;

  const variantNo = safeInt(obj?.variant_no) || index + 1;
  const name = safeStr(obj?.name ?? obj?.color ?? obj?.title ?? "");

  const rawSizes = Array.isArray(obj?.sizes) ? obj.sizes : [];

  const sizes: ReadyVariantSize[] = rawSizes
    .map((row: unknown): ReadyVariantSize => {
      const r = (row ?? {}) as any;

      if (typeof row === "string" || typeof row === "number") {
        return {
          size: safeStr(row),
          qty: 0,
        };
      }

      return {
        size: safeStr(r?.size ?? r?.label ?? ""),
        qty: safeInt(r?.qty ?? r?.stock_qty ?? r?.stock ?? 0),
      };
    })
    .filter((row: ReadyVariantSize) => !!row.size);

  return {
    id: safeStr(obj?.id) || `variant-${variantNo}`,
    variant_no: variantNo,
    label: safeStr(obj?.label) || `Variant ${variantNo}`,
    name,
    display_name:
      safeStr(obj?.display_name) ||
      buildReadyVariantDisplayName(variantNo, name),
    additional_price_pkr: safeInt(
      obj?.additional_price_pkr ?? obj?.extra_price_pkr ?? 0,
    ),
    image_paths: normalizeReadyVariantImagePaths(obj),
    images: normalizeReadyVariantImages(obj?.images),
    sizes,
  };
}

export function normalizeReadyVariants(v: unknown): ReadyVariant[] {
  const arr = Array.isArray(v) ? v : [];
  return arr.map((item: unknown, index: number) =>
    normalizeReadyVariant(item, index),
  );
}

export function sumReadyVariantQty(variants: ReadyVariant[]) {
  return (variants || []).reduce((total: number, variant: ReadyVariant) => {
    return (
      total +
      (variant.sizes || []).reduce((s: number, row: ReadyVariantSize) => {
        return s + Number(row.qty || 0);
      }, 0)
    );
  }, 0);
}

export function getReadyVariantFinalPrice(
  basePrice: number,
  variant: ReadyVariant,
) {
  return Number(basePrice || 0) + Number(variant?.additional_price_pkr || 0);
}

export function validateReadyVariants(variants: ReadyVariant[]) {
  if (!variants?.length) return "Please add at least one variant.";

  for (const variant of variants) {
    const title = variant.display_name || variant.label;

    if (!safeStr(variant.name)) {
      return `${variant.label} needs a color or design name.`;
    }

    const imagePaths = normalizeReadyVariantImagePaths(variant);
    const legacyImages = normalizeReadyVariantImages(variant.images);

    if (!imagePaths.length && !legacyImages.length) {
      return `${title} needs at least one image.`;
    }

    if (!variant.sizes?.length) {
      return `${title} needs at least one size.`;
    }

    for (const row of variant.sizes) {
      if (!safeStr(row.size)) {
        return `${title} has a missing size.`;
      }

      if (!Number.isFinite(Number(row.qty)) || Number(row.qty) < 0) {
        return `${title} has an invalid quantity.`;
      }
    }
  }

  const totalQty = sumReadyVariantQty(variants);
  if (totalQty <= 0) return "Total stock across variants must be more than 0.";

  return "";
}

export function buildMadeOrderVariantDisplayName(
  variantNo: number,
  name: string,
) {
  const clean = safeStr(name);
  return clean ? `Variant ${variantNo}: ${clean}` : `Variant ${variantNo}`;
}

export function makeMadeOrderVariant(variantNo: number): MadeOrderVariant {
  return {
    id: `made-order-variant-${variantNo}`,
    variant_no: variantNo,
    label: `Variant ${variantNo}`,
    name: "",
    display_name: `Variant ${variantNo}`,
    additional_price_pkr: 0,
    estimated_days: 7,
    image_paths: [],
    images: [],
  };
}

export function normalizeMadeOrderVariant(
  v: unknown,
  index: number,
): MadeOrderVariant {
  const obj = (v ?? {}) as any;

  const variantNo = safeInt(obj?.variant_no) || index + 1;
  const name = safeStr(obj?.name ?? obj?.color ?? obj?.title ?? "");
  const estimatedDays = safeInt(
    obj?.estimated_days ??
      obj?.estimatedDays ??
      obj?.turnaround_days ??
      obj?.estimated_turnaround_days ??
      7,
  );

  return {
    id: safeStr(obj?.id) || `made-order-variant-${variantNo}`,
    variant_no: variantNo,
    label: safeStr(obj?.label) || `Variant ${variantNo}`,
    name,
    display_name:
      safeStr(obj?.display_name) ||
      buildMadeOrderVariantDisplayName(variantNo, name),
    additional_price_pkr: safeInt(
      obj?.additional_price_pkr ?? obj?.extra_price_pkr ?? 0,
    ),
    estimated_days: estimatedDays,
    image_paths: normalizeReadyVariantImagePaths(obj),
    images: normalizeReadyVariantImages(obj?.images),
  };
}

export function normalizeMadeOrderVariants(v: unknown): MadeOrderVariant[] {
  const arr = Array.isArray(v) ? v : [];
  return arr.map((item: unknown, index: number) =>
    normalizeMadeOrderVariant(item, index),
  );
}

export function getMadeOrderVariantFinalPrice(
  basePrice: number,
  variant: MadeOrderVariant,
) {
  return Number(basePrice || 0) + Number(variant?.additional_price_pkr || 0);
}

export function validateMadeOrderVariants(variants: MadeOrderVariant[]) {
  if (!variants?.length)
    return "Please add at least one made-on-order variant.";

  for (const variant of variants) {
    const title = variant.display_name || variant.label;

    if (!safeStr(variant.name)) {
      return `${variant.label} needs a color or design name.`;
    }

    if (
      !Number.isFinite(Number(variant.additional_price_pkr)) ||
      Number(variant.additional_price_pkr) < 0
    ) {
      return `${title} has an invalid additional price.`;
    }

    if (
      !Number.isFinite(Number(variant.estimated_days)) ||
      Number(variant.estimated_days) <= 0
    ) {
      return `${title} needs valid estimated days.`;
    }

    const imagePaths = normalizeReadyVariantImagePaths(variant);
    const legacyImages = normalizeReadyVariantImages(variant.images);

    if (!imagePaths.length && !legacyImages.length) {
      return `${title} needs at least one image.`;
    }
  }

  return "";
}

export function stripMadeOrderVariantForDb(
  variant: MadeOrderVariant,
  uploadedImagePaths?: string[],
): MadeOrderVariant {
  const normalized = normalizeMadeOrderVariant(variant, 0);
  const imagePaths = uploadedImagePaths?.length
    ? uploadedImagePaths
    : normalizeReadyVariantImagePaths(normalized);

  return {
    id: normalized.id,
    variant_no: normalized.variant_no,
    label: normalized.label,
    name: normalized.name,
    display_name:
      safeStr(normalized.display_name) ||
      buildMadeOrderVariantDisplayName(normalized.variant_no, normalized.name),
    additional_price_pkr: safeInt(normalized.additional_price_pkr),
    estimated_days: safeInt(normalized.estimated_days),
    image_paths: imagePaths,
    images: [],
  };
}
