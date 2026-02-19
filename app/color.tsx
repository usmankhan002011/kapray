import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearColorShades, toggleColorShade } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

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

export default function ColorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.colorShadeIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

  return (
    <StandardFilterDisplay
      title={`Color${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearColorShades())}
      onNext={() => (fromResultsFilters ? router.back() : router.push("/work"))}
    >
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
              onPress={() => dispatch(toggleColorShade(item.id))}
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
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111"
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
    borderColor: "#111"
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
    textAlign: "center"
  }
});
