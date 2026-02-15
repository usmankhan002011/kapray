import { getDressTypes } from "@/utils/supabase/dressType";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";

type DressTypeOption = {
  key: string; // numeric id as string
  label: string;
  icon?: string | null;
};

export default function ProductDressTypeModal() {
  const router = useRouter();
  const { draft, setDressTypeIds } = useProductDraft();

  const [options, setOptions] = useState<DressTypeOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Local selection in this modal (so user can pick multiple then Done)
  const [selected, setSelected] = useState<string[]>(
    (draft.spec.dressTypeIds ?? []).map((x) => String(x))
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    getDressTypes()
      .then((types) => {
        if (!alive) return;

        const mapped =
          (types ?? []).map((type: any) => {
            const key = String(type.id);
            const name = String(type.name ?? "");

            return {
              key,
              label: name,
              icon: type?.iconURL ?? null
            } as DressTypeOption;
          }) ?? [];

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

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  function onDone() {
    const ids = selected
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n));

    setDressTypeIds(ids);
    router.back();
  }

  function onClear() {
    setSelected([]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
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

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {options.map((opt) => {
          const isOn = selectedSet.has(opt.key);

          return (
            <Pressable
              key={opt.key}
              style={[styles.card, isOn && styles.cardOn]}
              onPress={() => toggle(opt.key)}
            >
              <View style={styles.imageWrap}>
                {opt.icon ? (
                  <Image
                    source={{ uri: opt.icon }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.label, isOn && styles.labelOn]} numberOfLines={2}>
                {opt.label} {isOn ? "✓" : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { fontSize: 14, fontWeight: "900", color: "#0b2f6b" },

  subHeader: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  subText: { flex: 1, color: "#111", opacity: 0.7 },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e7e7e7"
  },
  clearBtnText: { fontSize: 12, fontWeight: "900", color: "#111" },

  info: { paddingHorizontal: 14, paddingBottom: 8, color: "#111", opacity: 0.8 },

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
    borderColor: "#e7e7e7",
    borderRadius: 16,
    padding: 10
  },
  cardOn: {
    borderColor: "#0b2f6b",
    borderWidth: 2,
    backgroundColor: "#F3F7FF"
  },

  imageWrap: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 10
  },
  image: { width: "100%", height: 150 },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  imageFallbackText: { color: "#111", opacity: 0.6, fontWeight: "800" },

  label: { fontSize: 13, fontWeight: "800", color: "#111", textAlign: "center" },
  labelOn: { color: "#0b2f6b" },

  pressed: { opacity: 0.75 }
});
