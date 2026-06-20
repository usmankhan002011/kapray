import React, { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearColorShades, toggleColorShade } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

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
  { id: "black", name: "Black", hex: "#000000" },
];

const GRID_GAP = 10;
const H_PADDING = 16;

export default function ColorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.colorShadeIds);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

  return (
    <StandardFilterDisplay
      title="Color"
      onBack={() => router.back()}
      onAny={() => dispatch(clearColorShades())}
      onNext={() => (fromResultsFilters ? router.back() : router.push("/work"))}
    >
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
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => dispatch(toggleColorShade(item.id))}
            >
              <View style={styles.swatchWrap}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: item.hex },
                    item.id === "white" ? styles.whiteSwatch : null,
                  ]}
                />
              </View>

              <Text
                style={[styles.label, isOn ? styles.labelOn : null]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {isOn ? (
                <View style={styles.check}>
                  <MaterialIcons name="check" size={14} color={apColors.white} />
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
  },

  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: apRadii.card,
    padding: 8,
    backgroundColor: apColors.white,
  },

  cardSelected: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
  },

  swatchWrap: {
    width: "100%",
    height: 92,
    borderRadius: apRadii.card,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },

  swatch: {
    width: "100%",
    height: 92,
  },

  whiteSwatch: {
    borderWidth: 1,
    borderColor: apColors.border,
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    color: apColors.text,
    textAlign: "center",
    fontWeight: "700",
    fontFamily: apFontFamily,
  },

  labelOn: {
    color: apColors.blue,
  },

  check: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.82,
  },
});
