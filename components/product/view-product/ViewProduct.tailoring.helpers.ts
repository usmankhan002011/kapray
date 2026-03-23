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

export function normalizeTailoringPresetArray(v: unknown): TailoringStylePreset[] {
  const arr = Array.isArray(v) ? v : [];
  const out: TailoringStylePreset[] = [];

  for (const item of arr) {
    const obj = (item ?? {}) as any;
    const id = String(obj?.id ?? "").trim();
    const title = String(obj?.title ?? "").trim();
    const images = Array.isArray(obj?.images) ? obj.images : [];

    if (!id && !title && !images.length) continue;

    out.push({
      id: id || `style_${out.length + 1}`,
      title,
      note: String(obj?.note ?? "").trim(),
      extra_cost_pkr: safeInt0(obj?.extra_cost_pkr),
      images,
      default_neck: String(obj?.default_neck ?? "").trim(),
      default_sleeve: String(obj?.default_sleeve ?? "").trim(),
      default_trouser: String(obj?.default_trouser ?? "").trim(),
      allowed_neck_variations: normalizeStyleOptions(obj?.allowed_neck_variations),
      allowed_sleeve_variations: normalizeStyleOptions(obj?.allowed_sleeve_variations),
      allowed_trouser_variations: normalizeStyleOptions(obj?.allowed_trouser_variations),
      allow_custom_note: Boolean(obj?.allow_custom_note),
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