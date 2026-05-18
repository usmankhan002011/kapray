export type TailoringPresetImage = {
  uri?: string | null;
  url?: string | null;
  path?: string | null;
};

export type TailoringStylePreset = {
  id: string;
  title: string;
  note?: string;
  extra_cost_pkr?: number;
  images: TailoringPresetImage[];
  default_neck?: string;
  default_sleeve?: string;
  default_trouser?: string;
  allowed_neck_variations?: string[];
  allowed_sleeve_variations?: string[];
  allowed_trouser_variations?: string[];
  allow_custom_note?: boolean;
};

export function isHttpUrl(v: unknown) {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

export function safeInt0(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

export function normalizeLabelList(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  const out: string[] = [];

  for (const item of arr) {
    if (item == null) continue;

    if (typeof item === "string" || typeof item === "number") {
      const s = String(item).trim();
      if (s) out.push(s);
      continue;
    }

    if (typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const s =
        String(
          obj.label ??
            obj.name ??
            obj.title ??
            obj.text ??
            obj.value ??
            obj.id ??
            "",
        ).trim() || "";

      if (s) out.push(s);
    }
  }

  return out;
}

export function normalizeStyleOptions(v: unknown): string[] {
  const list = normalizeLabelList(v);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of list) {
    const s = String(item).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function pushImageCandidate(out: TailoringPresetImage[], candidate: unknown) {
  if (candidate == null) return;

  if (typeof candidate === "string" || typeof candidate === "number") {
    const s = String(candidate).trim();
    if (!s) return;

    out.push(isHttpUrl(s) ? { url: s } : { path: s });
    return;
  }

  if (typeof candidate !== "object" || Array.isArray(candidate)) return;

  const obj = candidate as Record<string, unknown>;
  const rawUrl = String(
    obj.url ?? obj.publicUrl ?? obj.public_url ?? "",
  ).trim();
  const rawUri = String(obj.uri ?? obj.imageUri ?? obj.image_uri ?? "").trim();
  const rawPath = String(
    obj.path ??
      obj.image_path ??
      obj.imagePath ??
      obj.storage_path ??
      obj.storagePath ??
      obj.key ??
      "",
  ).trim();

  if (!rawUrl && !rawUri && !rawPath) return;

  out.push({
    url: rawUrl || null,
    uri: rawUri || null,
    path: rawPath || null,
  });
}

export function normalizeTailoringPresetImages(
  v: unknown,
): TailoringPresetImage[] {
  const obj = (v ?? {}) as any;
  const out: TailoringPresetImage[] = [];

  const candidates = [
    obj?.images,
    obj?.image_paths,
    obj?.imagePaths,
    obj?.style_images,
    obj?.styleImages,
    obj?.style_image_paths,
    obj?.styleImagePaths,
    obj?.media?.images,
    obj?.media?.image_paths,
    obj?.media?.imagePaths,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) pushImageCandidate(out, item);
  }

  pushImageCandidate(out, obj?.image);
  pushImageCandidate(out, obj?.image_url);
  pushImageCandidate(out, obj?.imageUrl);
  pushImageCandidate(out, obj?.url);
  pushImageCandidate(out, obj?.uri);
  pushImageCandidate(out, obj?.path);
  pushImageCandidate(out, obj?.image_path);
  pushImageCandidate(out, obj?.imagePath);
  pushImageCandidate(out, obj?.style_image);
  pushImageCandidate(out, obj?.styleImage);
  pushImageCandidate(out, obj?.style_image_path);
  pushImageCandidate(out, obj?.styleImagePath);

  const seen = new Set<string>();
  return out.filter((img) => {
    const key = String(img.url ?? img.uri ?? img.path ?? "").trim();
    if (!key) return false;
    const lower = key.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

export function normalizeTailoringPresetArray(
  v: unknown,
): TailoringStylePreset[] {
  const arr = Array.isArray(v) ? v : [];
  const out: TailoringStylePreset[] = [];

  for (const item of arr) {
    const obj = (item ?? {}) as any;
    const id = String(obj?.id ?? "").trim();
    const title = String(obj?.title ?? obj?.name ?? obj?.label ?? "").trim();
    const images = normalizeTailoringPresetImages(obj);

    if (!id && !title && !images.length) continue;

    out.push({
      id: id || `style_${out.length + 1}`,
      title,
      note: String(obj?.note ?? obj?.description ?? "").trim(),
      extra_cost_pkr: safeInt0(
        obj?.extra_cost_pkr ??
          obj?.extraCostPkr ??
          obj?.additional_cost_pkr ??
          obj?.additionalCostPkr,
      ),
      images,
      default_neck: String(obj?.default_neck ?? obj?.defaultNeck ?? "").trim(),
      default_sleeve: String(
        obj?.default_sleeve ?? obj?.defaultSleeve ?? "",
      ).trim(),
      default_trouser: String(
        obj?.default_trouser ?? obj?.defaultTrouser ?? "",
      ).trim(),
      allowed_neck_variations: normalizeStyleOptions(
        obj?.allowed_neck_variations ?? obj?.allowedNeckVariations,
      ),
      allowed_sleeve_variations: normalizeStyleOptions(
        obj?.allowed_sleeve_variations ?? obj?.allowedSleeveVariations,
      ),
      allowed_trouser_variations: normalizeStyleOptions(
        obj?.allowed_trouser_variations ?? obj?.allowedTrouserVariations,
      ),
      allow_custom_note: Boolean(
        obj?.allow_custom_note ?? obj?.allowCustomNote ?? false,
      ),
    });
  }

  return out;
}

export function firstResolvedPresetImageUrl(
  preset: TailoringStylePreset | null | undefined,
  resolvePublicUrl: (path: string | null | undefined) => string | null,
) {
  if (!preset) return "";

  const images = Array.isArray(preset.images) ? preset.images : [];
  for (const img of images) {
    const rawUrl = String((img as any)?.url ?? "").trim();
    const rawUri = String((img as any)?.uri ?? "").trim();
    const rawPath = String((img as any)?.path ?? "").trim();

    if (rawUrl && isHttpUrl(rawUrl)) return rawUrl;
    if (rawUri && isHttpUrl(rawUri)) return rawUri;

    const fromPath = resolvePublicUrl(rawPath || null);
    if (fromPath) return fromPath;
  }

  return "";
}
