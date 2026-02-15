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
import { getOriginCities, OriginCityItem } from "@/utils/supabase/originCity";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const ORIGIN_CITY_LOCAL_IMAGES: Record<string, any> = {
  bahawalpur: require("@/assets/origin-images/Bahawalpur.jpg"),
  faisalabad: require("@/assets/origin-images/Faisalabad_labeled.jpg"),
  hyderabad: require("@/assets/origin-images/Hyderabad.jpg"),
  karachi: require("@/assets/origin-images/Karachi.jpg"),
  lahore: require("@/assets/origin-images/Lahore.jpg"),
  multan: require("@/assets/origin-images/Multan.jpg"),
  peshawar: require("@/assets/origin-images/Peshawar.jpg"),
  rawalpindi: require("@/assets/origin-images/Rawalpindi.jpg")
};

const GRID_GAP = 8;
const H_PADDING = 12;

// Responsive sizing to fit better on screen (still scrolls)
const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;
const IMAGE_H = Math.max(92, Math.round(CARD_W * 0.62));

export default function ProductOriginCityModal() {
  const router = useRouter();
  const { draft, setOriginCityIds } = useProductDraft();

  const [items, setItems] = useState<OriginCityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Local selection inside modal (apply to draft only on Done)
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.originCityIds) ? draft.spec.originCityIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getOriginCities()
      .then((res) => {
        if (!alive) return;
        setItems(res ?? []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load origin cities");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onClear() {
    setSelected([]);
  }

  function onDone() {
    setOriginCityIds(selected);
    router.back();
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Origin</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more origin cities.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Select Origin City</Text>

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
            ORIGIN_CITY_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

          return (
            <Pressable
              key={item.id}
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => toggle(item.id)}
            >
              <View style={styles.imageWrap}>
                {localImg ? (
                  <Image source={localImg} style={styles.image} resizeMode="cover" />
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
    paddingTop: 2
  },
  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP
  },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 6
  },
  cardSelected: {
    borderColor: "#0b2f6b",
    borderWidth: 2,
    backgroundColor: "#F3F7FF"
  },

  imageWrap: {
    width: "100%",
    height: IMAGE_H,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 6
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
    fontSize: 13,
    color: "#111",
    textAlign: "center",
    fontWeight: "700"
  },

  pressed: { opacity: 0.75 }
});
