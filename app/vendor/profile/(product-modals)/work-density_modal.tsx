import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { getWorkDensities, WorkDensityItem } from "@/utils/supabase/workDensity";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const WORK_DENSITY_LOCAL_IMAGES: Record<string, any> = {
  light: require("@/assets/work-density-images/light.png"),
  medium: require("@/assets/work-density-images/medium.jpg"),
  heavy: require("@/assets/work-density-images/heavy.jpg"),
  "extra-heavy": require("@/assets/work-density-images/extra-heavy.jpg")
};

const GRID_GAP = 8;
const H_PADDING = 12;

// Responsive sizing so cards feel bigger and fill the screen
const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;
const IMAGE_H = Math.round(CARD_W * 1.35);

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function ProductWorkDensityModal() {
  const router = useRouter();
  const { draft, setWorkDensityIds } = useProductDraft();

  const [items, setItems] = useState<WorkDensityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Local selection inside modal (apply to draft only on Done)
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.workDensityIds) ? draft.spec.workDensityIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const itemById = useMemo(() => {
    const m = new Map<string, WorkDensityItem>();
    for (const it of items) m.set(String(it.id), it);
    return m;
  }, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getWorkDensities()
      .then((res) => {
        if (!alive) return;
        setItems(res ?? []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load work densities");
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
    router.replace("/vendor/profile/add-product" as any);
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onClear() {
    (draft.spec as any).workDensityNames = [];
    setSelected([]);
    setWorkDensityIds([]);
  }

  function onDone() {
    const pickedNames = selected
      .map((id) => itemById.get(String(id))?.name ?? "")
      .map((s) => safeStr(s))
      .filter(Boolean);

    (draft.spec as any).workDensityNames = pickedNames;

    setWorkDensityIds(selected);
    closeToAddProduct();
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={closeToAddProduct}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Work Density</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more density levels.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Select Work Density</Text>

      {loading ? <Text style={styles.infoText}>Loading...</Text> : null}
      {err ? <Text style={styles.infoText}>{err}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const isOn = selectedSet.has(item.id);
          const localImg =
            WORK_DENSITY_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

          return (
            <Pressable
              key={item.id}
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => toggle(item.id)}
            >
              <View style={styles.imageWrap}>
                {localImg ? (
                  <Image
                    source={localImg}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImage}>
                    <Text style={styles.noImageText}>No Image</Text>
                  </View>
                )}
              </View>

              <Text style={styles.label} numberOfLines={1}>
                {item.name} {isOn ? "✓" : ""}
              </Text>
            </Pressable>
          );
        }}
      />
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
    paddingBottom: 6,
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

  heading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
    paddingHorizontal: 14,
    paddingTop: 6
  },
  infoText: {
    color: "#111",
    marginBottom: 6,
    paddingHorizontal: 14
  },

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
    paddingTop: 4
  },
  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP
  },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 8
  },
  cardSelected: {
    borderColor: "#0b2f6b",
    borderWidth: 2,
    backgroundColor: "#F3F7FF"
  },

  imageWrap: {
    width: "100%",
    height: IMAGE_H,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 8
  },
  image: {
    width: "100%",
    height: IMAGE_H
  },
  noImage: {
    width: "100%",
    height: IMAGE_H,
    alignItems: "center",
    justifyContent: "center"
  },
  noImageText: { color: "#111", opacity: 0.6, fontWeight: "800" },

  label: {
    fontSize: 14,
    color: "#111",
    textAlign: "center",
    fontWeight: "700"
  },

  pressed: { opacity: 0.75 }
});
