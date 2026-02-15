import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";

type ColorShadeItem = {
  id: string;
  name: string;
  hex: string;
};

const COLOR_SHADES: ColorShadeItem[] = [
  { id: "red", name: "Red", hex: "#C21807" },
  { id: "green", name: "Green", hex: "#1B5E20" },
  { id: "yellow", name: "Yellow", hex: "#FBC02D" },
  { id: "blue", name: "Blue", hex: "#1565C0" },
  { id: "golden", name: "Golden", hex: "#D4AF37" },
  { id: "silver", name: "Silver", hex: "#C0C0C0" },
  { id: "white", name: "White", hex: "#FFFFFF" },
  { id: "black", name: "Black", hex: "#000000" }
];

const GRID_GAP = 8;
const H_PADDING = 12;

export default function ProductColorModal() {
  const router = useRouter();
  const { draft, setColorShadeIds } = useProductDraft();

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.colorShadeIds) ? draft.spec.colorShadeIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onClear() {
    setSelected([]);
  }

  function onDone() {
    setColorShadeIds(selected);
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

        <Text style={styles.headerTitle}>Color</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more color shades.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      <Text style={styles.heading}>Select Color Shades</Text>

      <FlatList
        data={COLOR_SHADES}
        keyExtractor={(i) => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const isOn = selectedSet.has(item.id);

          return (
            <Pressable
              key={item.id}
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => toggle(item.id)}
            >
              <View style={styles.swatchWrap}>
                <View style={[styles.swatch, { backgroundColor: item.hex }]} />
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

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 12,
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
    borderRadius: 8,
    padding: 6
  },
  cardSelected: {
    borderColor: "#0b2f6b",
    borderWidth: 2,
    backgroundColor: "#F3F7FF"
  },

  swatchWrap: {
    width: "100%",
    height: 96,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 6
  },
  swatch: {
    width: "100%",
    height: 96
  },

  label: {
    fontSize: 13,
    color: "#111",
    textAlign: "center",
    fontWeight: "700"
  },

  pressed: { opacity: 0.75 }
});
