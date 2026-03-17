import { getDressTypes, DressTypeItem } from "@/utils/supabase/dressType";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";

type DressTypeOption = {
  key: string;
  label: string;
  code: string;
};

const DRESS_TYPE_LOCAL_IMAGES: Record<string, any> = {
  lehnga_set: require("@/assets/dress-types-images/LEHNGA_SET.png"),
  maxi_gown: require("@/assets/dress-types-images/MAXI_GOWN.png"),
  peshwas_frock: require("@/assets/dress-types-images/PESHWAS_FROCK.png"),
  saree: require("@/assets/dress-types-images/SAREE.png"),
  sharara: require("@/assets/dress-types-images/SHARARA.png"),
  shirt_and_bottom_set: require("@/assets/dress-types-images/SHIRT_AND_BOTTOM_SET.png"),
  dupatta: require("@/assets/dress-types-images/DUPATTA.png"),
  farchi_lehnga: require("@/assets/dress-types-images/FARCHI_LEHNGA.png"),
  gharara: require("@/assets/dress-types-images/GHARARA.png"),
  blouse: require("@/assets/dress-types-images/BLOUSE.png")
};

export default function ProductDressTypeModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const { draft, setDressTypeIds } = useProductDraft();

  const [options, setOptions] = useState<DressTypeOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<string[]>(
    (draft.spec.dressTypeIds ?? []).map((x) => String(x))
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const labelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(o.key, o.label);
    return m;
  }, [options]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    getDressTypes()
      .then((types: DressTypeItem[]) => {
        if (!alive) return;

        const mapped: DressTypeOption[] =
          (types ?? []).map((type) => ({
            key: String(type.id),
            label: String(type.name ?? ""),
            code: String(type.code ?? "")
          })) ?? [];

        setOptions(mapped);
      })
      .catch(() => {
        if (!alive) return;
        setOptions([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  function closeToAddProduct() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  function onDone() {
    const ids = selected
      .map((k) => String(k).trim())
      .filter(Boolean);

    const pickedNames = selected
      .map((k) => labelByKey.get(k) ?? "")
      .map((s) => String(s).trim())
      .filter(Boolean);

    (draft.spec as any).dressTypeNames = pickedNames;

    setDressTypeIds(ids);
    closeToAddProduct();
  }

  function onClear() {
    (draft.spec as any).dressTypeNames = [];
    setSelected([]);
    setDressTypeIds([]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={closeToAddProduct}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Dress Type</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>
          Select one or more dress types for this product.
        </Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.info}>Loading...</Text> : null}

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt) => {
          const isOn = selectedSet.has(opt.key);
          const localImage = DRESS_TYPE_LOCAL_IMAGES[opt.code] ?? null;

          return (
            <Pressable
              key={opt.key}
              style={[styles.card, isOn && styles.cardOn]}
              onPress={() => toggle(opt.key)}
            >
              <View style={styles.imageWrap}>
                {localImage ? (
                  <Image
                    source={localImage}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
              </View>

              <Text
                style={[styles.label, isOn && styles.labelOn]}
                numberOfLines={2}
              >
                {opt.label} {isOn ? "✓" : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text
  },

  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  headerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue
  },

  subHeader: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },

  subText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  clearBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    alignItems: "center",
    justifyContent: "center"
  },

  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.text
  },

  info: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  grid: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },

  card: {
    width: "47%",
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    padding: 10,
    backgroundColor: stylesVars.cardBg
  },

  cardOn: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  imageWrap: {
    width: "100%",
    height: 185,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 10
  },

  image: {
    width: "100%",
    height: 185
  },

  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },

  imageFallbackText: {
    color: stylesVars.mutedText,
    fontSize: 12,
    fontWeight: "600"
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: stylesVars.text,
    textAlign: "center"
  },

  labelOn: {
    color: stylesVars.blue
  },

  pressed: {
    opacity: 0.82
  }
});