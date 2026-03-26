import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { supabase } from "@/utils/supabase/client";
import { apColors, apStyles } from "@/components/product/addProductStyles";

import {
  BLOUSE_NECK_PATTERNS,
  BLOUSE_SLEEVE_PATTERNS,
  TROUSER_STYLES,
} from "@/data/kapray/tailoringOptions";

type ProductCategory =
  | "unstitched_plain"
  | "unstitched_dyeing"
  | "unstitched_dyeing_tailoring"
  | "stitched_ready";

type VendorTailoringOptions = {
  blouse_neck?: string[] | null;
  sleeves?: string[] | null;
  trouser?: string[] | null;
};

type TailoringPresetImage = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  path?: string | null;
  url?: string | null;
};

type TailoringStylePreset = {
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

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of v) {
    const s = String(item ?? "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
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

function makePresetId() {
  return `style_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyStylePreset(includesTrouser: boolean): TailoringStylePreset {
  return {
    id: makePresetId(),
    title: "",
    note: "",
    extra_cost_pkr: 0,
    images: [],
    default_neck: "",
    default_sleeve: "",
    default_trouser: includesTrouser ? "" : undefined,
    allowed_neck_variations: [],
    allowed_sleeve_variations: [],
    allowed_trouser_variations: includesTrouser ? [] : undefined,
    allow_custom_note: false,
  };
}

function normalizePresetImages(v: unknown): TailoringPresetImage[] {
  const arr = Array.isArray(v) ? v : [];
  const seen = new Set<string>();
  const out: TailoringPresetImage[] = [];

  for (const item of arr) {
    const obj = (item ?? {}) as any;
    const uri = safeStr(obj?.uri ?? obj?.url ?? "");
    if (!uri) continue;
    if (seen.has(uri)) continue;
    seen.add(uri);

    out.push({
      uri,
      width: Number.isFinite(Number(obj?.width)) ? Number(obj.width) : undefined,
      height: Number.isFinite(Number(obj?.height)) ? Number(obj.height) : undefined,
      fileName: obj?.fileName ?? null,
      mimeType: obj?.mimeType ?? null,
      fileSize: Number.isFinite(Number(obj?.fileSize)) ? Number(obj.fileSize) : null,
      path: safeStr(obj?.path ?? "") || null,
      url: safeStr(obj?.url ?? "") || null,
    });
  }

  return out;
}

function filterAllowed(values: unknown, allowed: string[]) {
  const allow = new Set(normalizeStringArray(allowed).map((x) => x.toLowerCase()));
  return normalizeStringArray(values).filter((x) => allow.has(x.toLowerCase()));
}

function normalizeTailoringStylePresets(
  presets: unknown,
  includesTrouser: boolean,
  neckOptions: string[],
  sleeveOptions: string[],
  trouserOptions: string[],
): TailoringStylePreset[] {
  const arr = Array.isArray(presets) ? presets : [];
  const out: TailoringStylePreset[] = [];

  for (const item of arr) {
    const p = (item ?? {}) as any;

    const defaultNeck = filterAllowed([p?.default_neck], neckOptions)[0] ?? "";
    const defaultSleeve = filterAllowed([p?.default_sleeve], sleeveOptions)[0] ?? "";
    const defaultTrouser = includesTrouser
      ? filterAllowed([p?.default_trouser], trouserOptions)[0] ?? ""
      : "";

    const allowedNeck = normalizeStringArray([
      ...filterAllowed(p?.allowed_neck_variations, neckOptions),
      ...(defaultNeck ? [defaultNeck] : []),
    ]);

    const allowedSleeve = normalizeStringArray([
      ...filterAllowed(p?.allowed_sleeve_variations, sleeveOptions),
      ...(defaultSleeve ? [defaultSleeve] : []),
    ]);

    const allowedTrouser = includesTrouser
      ? normalizeStringArray([
          ...filterAllowed(p?.allowed_trouser_variations, trouserOptions),
          ...(defaultTrouser ? [defaultTrouser] : []),
        ])
      : [];

    const clean: TailoringStylePreset = {
      id: safeStr(p?.id) || makePresetId(),
      title: safeStr(p?.title),
      note: safeStr(p?.note),
      extra_cost_pkr: Math.max(0, Number(p?.extra_cost_pkr ?? 0) || 0),
      images: normalizePresetImages(p?.images),
      default_neck: defaultNeck,
      default_sleeve: defaultSleeve,
      allowed_neck_variations: allowedNeck,
      allowed_sleeve_variations: allowedSleeve,
      allow_custom_note: Boolean(p?.allow_custom_note),
    };

    if (includesTrouser) {
      clean.default_trouser = defaultTrouser;
      clean.allowed_trouser_variations = allowedTrouser;
    }

    out.push(clean);
  }

  return out;
}

function toggleStringInArray(
  value: string,
  list: string[] | undefined,
  onChange: (next: string[]) => void,
) {
  const current = normalizeStringArray(list);
  const exists = current.some((x) => x.toLowerCase() === value.toLowerCase());

  if (exists) {
    onChange(current.filter((x) => x.toLowerCase() !== value.toLowerCase()));
    return;
  }

  onChange([...current, value]);
}

const BinaryToggle = ({
  label,
  value,
  trueLabel = "Yes",
  falseLabel = "No",
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
  onChange: (next: boolean) => void;
  hint?: string;
}) => {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={apStyles.label}>{label}</Text>
      {hint ? <Text style={apStyles.metaHint}>{hint}</Text> : null}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => onChange(true)}
          style={({ pressed }) => [
            {
              minHeight: 34,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: value ? apColors.blue : "#D7E3FF",
              backgroundColor: value ? apColors.blue : apColors.blueSoft,
            },
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: value ? "#FFFFFF" : apColors.blue,
            }}
          >
            {trueLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChange(false)}
          style={({ pressed }) => [
            {
              minHeight: 34,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: !value ? apColors.blue : "#D7E3FF",
              backgroundColor: !value ? apColors.blue : apColors.blueSoft,
            },
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: !value ? "#FFFFFF" : apColors.blue,
            }}
          >
            {falseLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const MultiSelectGroup = ({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) => {
  if (!items.length) {
    return (
      <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
        {title}: <Text style={{ fontWeight: "700", color: apColors.text }}>—</Text>
      </Text>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: apColors.text,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => {
          const isSelected = selected.includes(item);

          return (
            <Pressable
              key={`${title}-${item}`}
              onPress={() => onToggle(item)}
              style={({ pressed }) => [
                {
                  width: "48%",
                  minHeight: 28,
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isSelected ? apColors.blue : "#D7E3FF",
                  backgroundColor: isSelected ? apColors.blue : apColors.blueSoft,
                  alignItems: "center",
                  justifyContent: "center",
                },
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: isSelected ? "#FFFFFF" : apColors.blue,
                  textAlign: "center",
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const SingleSelectGroup = ({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}) => {
  if (!items.length) {
    return (
      <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
        {title}: <Text style={{ fontWeight: "700", color: apColors.text }}>—</Text>
      </Text>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: apColors.text,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {items.map((item) => {
          const isSelected = selected === item;

          return (
            <Pressable
              key={`${title}-${item}`}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                {
                  width: "48%",
                  minHeight: 28,
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isSelected ? apColors.blue : "#D7E3FF",
                  backgroundColor: isSelected ? apColors.blue : apColors.blueSoft,
                  alignItems: "center",
                  justifyContent: "center",
                },
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: isSelected ? "#FFFFFF" : apColors.blue,
                  textAlign: "center",
                }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const TailoringPresetCard = memo(function TailoringPresetCard({
  preset,
  idx,
  includesTrouser,
  neckOptions,
  sleeveOptions,
  trouserOptions,
  updatePreset,
  removePreset,
  pickPresetImages,
  makePresetPrimaryImage,
  removePresetImage,
}: {
  preset: TailoringStylePreset;
  idx: number;
  includesTrouser: boolean;
  neckOptions: string[];
  sleeveOptions: string[];
  trouserOptions: string[];
  updatePreset: (
    presetId: string,
    updater: (prev: TailoringStylePreset) => TailoringStylePreset,
  ) => void;
  removePreset: (presetId: string) => void;
  pickPresetImages: (presetId: string) => Promise<void>;
  makePresetPrimaryImage: (presetId: string, index: number) => void;
  removePresetImage: (presetId: string, uri: string) => void;
}) {
  const images = preset.images ?? [];
  
  const allowedNeck = preset.allowed_neck_variations ?? [];
  const allowedSleeve = preset.allowed_sleeve_variations ?? [];
  const allowedTrouser = preset.allowed_trouser_variations ?? [];

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
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: apColors.text,
          }}
        >
          Style {idx + 1}
        </Text>

        <Pressable
          onPress={() => removePreset(preset.id)}
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
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#B42318",
            }}
          >
            Remove
          </Text>
        </Pressable>
      </View>

      <Text style={[apStyles.label, { marginTop: 12 }]}>Style title *</Text>
      <TextInput
        value={preset.title}
        onChangeText={(t) =>
          updatePreset(preset.id, (prev) => ({ ...prev, title: t }))
        }
        placeholder="e.g., Elegant Bridal Cut"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
        maxLength={80}
      />

      <Text style={apStyles.label}>Style note</Text>
      <TextInput
        value={preset.note ?? ""}
        onChangeText={(t) =>
          updatePreset(preset.id, (prev) => ({ ...prev, note: t }))
        }
        placeholder="Optional note for buyer"
        placeholderTextColor={apColors.muted}
        style={[apStyles.input, { minHeight: 88, textAlignVertical: "top" }]}
        multiline
        maxLength={240}
      />

      <Text style={apStyles.label}>Extra cost for this style (PKR)</Text>
      <TextInput
        value={String(Math.max(0, Number(preset.extra_cost_pkr ?? 0) || 0))}
        onChangeText={(t) =>
          updatePreset(preset.id, (prev) => ({
            ...prev,
            extra_cost_pkr: Math.max(0, Number(t.replace(/[^\d.]/g, "") || "0")),
          }))
        }
        placeholder="e.g., 1500"
        placeholderTextColor={apColors.muted}
        style={apStyles.input}
        keyboardType="decimal-pad"
        maxLength={12}
      />

      <Text style={apStyles.label}>Style images *</Text>

      <Pressable
        onPress={() => pickPresetImages(preset.id)}
        style={({ pressed }) => [
          apStyles.primaryBtn,
          { marginTop: 8 },
          pressed ? apStyles.pressed : null,
        ]}
      >
        <Text style={apStyles.primaryText}>
          Pick Style Images {images.length ? `(${images.length})` : ""}
        </Text>
      </Pressable>

      {images.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, gap: 10 }}
        >
          {images.map((img, imgIdx) => {
            const uri = safeStr(img.uri);
            if (!uri) return null;

            const isPrimary = imgIdx === 0;

            return (
              <View
                key={`${preset.id}-${uri}-${imgIdx}`}
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
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}>
                      Banner
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => makePresetPrimaryImage(preset.id, imgIdx)}
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
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}>
                      Make Banner
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => removePresetImage(preset.id, uri)}
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
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                    ✕
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={[apStyles.metaHint, { marginTop: 8 }]}>
          No style images selected yet.
        </Text>
      )}

      <MultiSelectGroup
        title="Allowed neck variations"
        items={neckOptions}
        selected={allowedNeck}
        onToggle={(item) =>
          updatePreset(preset.id, (prev) => {
            const next = normalizeStringArray(prev.allowed_neck_variations);
            let changed: string[] = [];
            toggleStringInArray(item, next, (arr) => {
              changed = arr;
            });
            return { ...prev, allowed_neck_variations: changed };
          })
        }
      />

      <MultiSelectGroup
        title="Allowed sleeve variations"
        items={sleeveOptions}
        selected={allowedSleeve}
        onToggle={(item) =>
          updatePreset(preset.id, (prev) => {
            const next = normalizeStringArray(prev.allowed_sleeve_variations);
            let changed: string[] = [];
            toggleStringInArray(item, next, (arr) => {
              changed = arr;
            });
            return { ...prev, allowed_sleeve_variations: changed };
          })
        }
      />

      {includesTrouser ? (
        <MultiSelectGroup
          title="Allowed trouser variations"
          items={trouserOptions}
          selected={allowedTrouser}
          onToggle={(item) =>
            updatePreset(preset.id, (prev) => {
              const next = normalizeStringArray(prev.allowed_trouser_variations);
              let changed: string[] = [];
              toggleStringInArray(item, next, (arr) => {
                changed = arr;
              });
              return { ...prev, allowed_trouser_variations: changed };
            })
          }
        />
      ) : null}

      <BinaryToggle
        label="Allow buyer additional note for this style?"
        value={Boolean(preset.allow_custom_note)}
        onChange={(next: boolean) =>
          updatePreset(preset.id, (prev) => ({
            ...prev,
            allow_custom_note: next,
          }))
        }
      />
    </View>
  );
});

export default function Q06B2TailoringStyles() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  const category = inferCategoryFromDraft(draft);
  const needsTailoring = category === "unstitched_dyeing_tailoring";

  const [vendorOffersTailoring, setVendorOffersTailoring] = useState<boolean>(false);
  const [vendorTailoringOptions, setVendorTailoringOptions] = useState<VendorTailoringOptions>({
    blouse_neck: [],
    sleeves: [],
    trouser: [],
  });
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);

  const [includesTrouser, setIncludesTrouser] = useState<boolean>(() =>
    Boolean(
      (draft?.spec as any)?.includes_trouser ??
        (draft?.spec as any)?.has_trouser ??
        (draft?.spec as any)?.product_has_trouser ??
        false,
    ),
  );

  const neckOptions = useMemo(() => {
    const fromVendor = normalizeStringArray(vendorTailoringOptions.blouse_neck);
    return fromVendor.length ? fromVendor : [...BLOUSE_NECK_PATTERNS];
  }, [vendorTailoringOptions.blouse_neck]);

  const sleeveOptions = useMemo(() => {
    const fromVendor = normalizeStringArray(vendorTailoringOptions.sleeves);
    return fromVendor.length ? fromVendor : [...BLOUSE_SLEEVE_PATTERNS];
  }, [vendorTailoringOptions.sleeves]);

  const trouserOptions = useMemo(() => {
    const fromVendor = normalizeStringArray(vendorTailoringOptions.trouser);
    return fromVendor.length ? fromVendor : [...TROUSER_STYLES];
  }, [vendorTailoringOptions.trouser]);

  const [stylePresets, setStylePresets] = useState<TailoringStylePreset[]>(() =>
    normalizeTailoringStylePresets(
      (draft?.spec as any)?.tailoring_style_presets,
      Boolean(
        (draft?.spec as any)?.includes_trouser ??
          (draft?.spec as any)?.has_trouser ??
          (draft?.spec as any)?.product_has_trouser ??
          false,
      ),
      [...BLOUSE_NECK_PATTERNS],
      [...BLOUSE_SLEEVE_PATTERNS],
      [...TROUSER_STYLES],
    ),
  );

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({ ...prev, spec: { ...(prev?.spec ?? {}), ...patch } }));
      return;
    }
    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  function updatePreset(
    presetId: string,
    updater: (prev: TailoringStylePreset) => TailoringStylePreset,
  ) {
    setStylePresets((prev) => prev.map((p) => (p.id === presetId ? updater(p) : p)));
  }

  function removePreset(presetId: string) {
    setStylePresets((prev) => prev.filter((p) => p.id !== presetId));
  }

  function addPreset() {
    setStylePresets((prev) => [...prev, createEmptyStylePreset(includesTrouser)]);
  }

  async function pickPresetImages(presetId: string) {
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

    updatePreset(presetId, (prev) => {
      const existing = normalizePresetImages(prev.images);
      const seen = new Set(existing.map((x) => x.uri));
      const next = [...existing];

      for (const a of res.assets) {
        const uri = safeStr(a?.uri);
        if (!uri || seen.has(uri)) continue;
        seen.add(uri);

        next.push({
          uri,
          width: a.width,
          height: a.height,
          fileName: (a as any)?.fileName ?? null,
          mimeType: (a as any)?.mimeType ?? null,
          fileSize: (a as any)?.fileSize ?? null,
          path: null,
          url: null,
        });
      }

      return {
        ...prev,
        images: next,
      };
    });
  }

  function removePresetImage(presetId: string, uri: string) {
    updatePreset(presetId, (prev) => ({
      ...prev,
      images: normalizePresetImages(prev.images).filter((x) => safeStr(x.uri) !== uri),
    }));
  }

  function makePresetPrimaryImage(presetId: string, index: number) {
    updatePreset(presetId, (prev) => {
      const images = [...normalizePresetImages(prev.images)];
      if (index <= 0 || index >= images.length) return prev;
      const selected = images.splice(index, 1)[0];
      images.unshift(selected);
      return { ...prev, images };
    });
  }

  useEffect(() => {
    let alive = true;

    async function loadVendor() {
      if (!vendorId) {
        if (alive) {
          setVendorOffersTailoring(false);
          setVendorTailoringOptions({
            blouse_neck: [],
            sleeves: [],
            trouser: [],
          });
        }
        return;
      }

      try {
        if (alive) setVendorLoading(true);

        const { data, error } = await supabase
          .from("vendor")
          .select("id, offers_tailoring, tailoring_options")
          .eq("id", vendorId)
          .single();

        if (!alive) return;

        if (error) {
          setVendorOffersTailoring(false);
          setVendorTailoringOptions({
            blouse_neck: [],
            sleeves: [],
            trouser: [],
          });
          return;
        }

        const options = ((data as any)?.tailoring_options ?? {}) as VendorTailoringOptions;

        setVendorOffersTailoring(Boolean((data as any)?.offers_tailoring));
        setVendorTailoringOptions({
          blouse_neck: normalizeStringArray(options?.blouse_neck),
          sleeves: normalizeStringArray(options?.sleeves),
          trouser: normalizeStringArray(options?.trouser),
        });
      } catch {
        if (!alive) return;
        setVendorOffersTailoring(false);
        setVendorTailoringOptions({
          blouse_neck: [],
          sleeves: [],
          trouser: [],
        });
      } finally {
        if (alive) setVendorLoading(false);
      }
    }

    loadVendor();

    return () => {
      alive = false;
    };
  }, [vendorId]);

  useEffect(() => {
    if (!needsTailoring) {
      patchSpec({
        includes_trouser: false,
        tailoring_style_presets: [],
      });
      return;
    }

    patchSpec({
      includes_trouser: includesTrouser,
      tailoring_style_presets: normalizeTailoringStylePresets(
        stylePresets,
        includesTrouser,
        neckOptions,
        sleeveOptions,
        trouserOptions,
      ),
    });
  }, [needsTailoring, includesTrouser, stylePresets, neckOptions, sleeveOptions, trouserOptions]);

  const canContinue = useMemo(() => {
    if (!vendorId) return false;
    if (!needsTailoring) return true;
    if (!vendorOffersTailoring) return false;

    if (!stylePresets.length) return false;

    return stylePresets.every((p) => {
      if (!safeStr(p.title)) return false;
      if (!Array.isArray(p.images) || p.images.length < 1) return false;
      return true;
    });
  }, [vendorId, needsTailoring, vendorOffersTailoring, stylePresets, includesTrouser]);

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    if (!needsTailoring) {
      router.push("/vendor/profile/add-product/q06c-shipping" as any);
      return;
    }

    if (!vendorOffersTailoring) {
      Alert.alert(
        "Tailoring not enabled",
        "You cannot continue because your vendor profile does not offer tailoring. Enable stitching / tailoring in your profile first.",
      );
      return;
    }

    const cleaned = normalizeTailoringStylePresets(
      stylePresets,
      includesTrouser,
      neckOptions,
      sleeveOptions,
      trouserOptions,
    );

    if (!cleaned.length) {
      Alert.alert("Add styles", "Please add at least one tailoring style card.");
      return;
    }

    for (const p of cleaned) {
      if (!safeStr(p.title)) {
        Alert.alert("Missing title", "Each tailoring style card must have a title.");
        return;
      }
      if (!p.images?.length) {
        Alert.alert("Missing image", `Please add at least one image for "${p.title || "a style"}".`);
        return;
      }
           // no default_trouser validation
    }

    patchSpec({
      includes_trouser: includesTrouser,
      tailoring_style_presets: cleaned,
    });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    router.push("/vendor/profile/add-product/q06c-shipping" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Tailoring Styles</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          {vendorLoading ? (
            <View style={apStyles.loadingRow}>
              <ActivityIndicator />
              <Text style={apStyles.loadingText}>Loading vendor settings…</Text>
            </View>
          ) : null}

          {!vendorOffersTailoring ? (
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
                Tailoring is not enabled in vendor profile
              </Text>
              <Text style={apStyles.metaHint}>
                Enable stitching / tailoring in vendor profile before using this product category.
              </Text>
            </View>
          ) : (
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
             <BinaryToggle
                label="Does this product include trouser?"
                value={includesTrouser}
                onChange={setIncludesTrouser}
              />

              {!stylePresets.length ? (
                <>
                  <View style={{ marginTop: 14 }}>
                    <Pressable
                      onPress={addPreset}
                      style={({ pressed }) => [apStyles.primaryBtn, pressed ? apStyles.pressed : null]}
                    >
                      <Text style={apStyles.primaryText}>Add Tailoring Style</Text>
                    </Pressable>
                  </View>

                  <Text style={[apStyles.metaHint, { marginTop: 12 }]}>
                    No tailoring style cards added yet.
                  </Text>
                </>
              ) : (
                <>
                  <FlatList
                    data={stylePresets}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    removeClippedSubviews
                    initialNumToRender={4}
                    windowSize={5}
                    renderItem={({ item, index }) => (
                      <TailoringPresetCard
                        preset={item}
                        idx={index}
                        includesTrouser={includesTrouser}
                        neckOptions={neckOptions}
                        sleeveOptions={sleeveOptions}
                        trouserOptions={trouserOptions}
                        updatePreset={updatePreset}
                        removePreset={removePreset}
                        pickPresetImages={pickPresetImages}
                        makePresetPrimaryImage={makePresetPrimaryImage}
                        removePresetImage={removePresetImage}
                      />
                    )}
                  />

                  <View style={{ marginTop: 14 }}>
                    {/* count label */}
                    <Text style={[apStyles.metaHint, { marginBottom: 6 }]}>
                      {stylePresets.length} {stylePresets.length === 1 ? "style" : "styles"} added
                    </Text>

                    {/* smaller secondary button */}
                    <Pressable
                      onPress={addPreset}
                      style={({ pressed }) => [
                        apStyles.secondaryBtn,
                        pressed ? apStyles.pressed : null,
                      ]}
                    >
                      <Text style={apStyles.secondaryText}>
                        Add More Styles
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}

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