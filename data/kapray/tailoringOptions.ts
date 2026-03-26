// ===============================
// BASE STYLE CATALOGS (UNCHANGED)
// ===============================

export const BLOUSE_NECK_PATTERNS = [
  'Round',
  'Boat',
  'V',
  'Square',
  'Sweetheart',
  'Collar',
  'Deep Back',
  'Funnel',
  'Cowl',
  'Keyhole',
  'Tie-neck',
  'Scoop',
  'High',
] as const;

export const BLOUSE_SLEEVE_PATTERNS = [
  'Sleeveless',
  'Cap',
  'Short',
  'Elbow',
  'Three Quarter',
  'Full',
  'Puffed',
  'Dolman',
  'Butterfly',
] as const;

export const TROUSER_STYLES = [
  'Straight Trouser',
  'Cigarette Pant',
  'Palazzo',
  'Tulip Shalwar',
  'Churidar',
  'Farshi Trouser',
] as const;

// ===============================
// TYPES
// ===============================

export type NeckPattern = typeof BLOUSE_NECK_PATTERNS[number];
export type SleevePattern = typeof BLOUSE_SLEEVE_PATTERNS[number];
export type TrouserStyle = typeof TROUSER_STYLES[number];

export type TailoringStylePresetImage = {
  path: string;   // supabase storage path
  url: string;    // public url
};

export type TailoringStylePreset = {
  id: string;

  title: string;
  note?: string;

  extra_cost_pkr?: number;

  images: TailoringStylePresetImage[];

  // DEFAULT STYLE (base design)
  default_neck?: NeckPattern;
  default_sleeve?: SleevePattern;
  default_trouser?: TrouserStyle; // ⚠️ only if trouser applicable

  // ALLOWED VARIATIONS (within this style)
  allowed_neck_variations?: NeckPattern[];
  allowed_sleeve_variations?: SleevePattern[];
  allowed_trouser_variations?: TrouserStyle[]; // ⚠️ only if trouser applicable

  // Optional customization
  allow_custom_note?: boolean;
};

// ===============================
// HELPERS
// ===============================

// 🔹 create empty preset (vendor side)
export function createEmptyTailoringStylePreset(): TailoringStylePreset {
  return {
    id: `style_${Date.now()}`,
    title: '',
    note: '',
    extra_cost_pkr: 0,
    images: [],

    default_neck: undefined,
    default_sleeve: undefined,
    default_trouser: undefined,

    allowed_neck_variations: [],
    allowed_sleeve_variations: [],
    allowed_trouser_variations: [],

    allow_custom_note: false,
  };
}

// 🔹 normalize presets before saving
export function normalizeTailoringStylePresets(
  presets: TailoringStylePreset[],
  includesTrouser: boolean
): TailoringStylePreset[] {
  return (Array.isArray(presets) ? presets : []).map((p) => {
    const clean: TailoringStylePreset = {
      ...p,
      title: String(p.title || '').trim(),
      note: String(p.note || '').trim(),
      extra_cost_pkr: Number(p.extra_cost_pkr || 0),
      images: Array.isArray(p.images) ? p.images : [],
      allowed_neck_variations: uniqueList(p.allowed_neck_variations),
      allowed_sleeve_variations: uniqueList(p.allowed_sleeve_variations),
      allow_custom_note: Boolean(p.allow_custom_note),
    };

    // 🔴 TROUSER RULE APPLIED HERE
    if (includesTrouser) {
      clean.default_trouser = p.default_trouser;
      clean.allowed_trouser_variations = uniqueList(p.allowed_trouser_variations);
    } else {
      delete clean.default_trouser;
      delete clean.allowed_trouser_variations;
    }

    return clean;
  });
}

// 🔹 utility: unique list
function uniqueList<T>(arr?: T[]): T[] {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr));
}

// ===============================
// APPLICABILITY
// ===============================

// 🔴 CENTRAL RULE: TROUSER APPLICABILITY
export function isTrouserApplicable(spec: any): boolean {
  return Boolean(
    spec?.includes_trouser ||
    spec?.has_trouser ||
    spec?.product_has_trouser
  );
}

// ===============================
// BUYER SIDE HELPERS
// ===============================

// get allowed variations for selected preset
export function getAllowedVariationsForPreset(
  preset: TailoringStylePreset,
  includesTrouser: boolean
) {
  return {
    neck: preset.allowed_neck_variations || [],
    sleeve: preset.allowed_sleeve_variations || [],
    trouser: includesTrouser
      ? preset.allowed_trouser_variations || []
      : [],
  };
}

// get defaults for selected preset
export function getDefaultVariationsForPreset(
  preset: TailoringStylePreset,
  includesTrouser: boolean
) {
  return {
    neck: preset.default_neck || '',
    sleeve: preset.default_sleeve || '',
    trouser: includesTrouser ? preset.default_trouser || '' : '',
  };
}