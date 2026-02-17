import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text
} from "react-native";
import { useRouter } from "expo-router";
import { getPriceBands, PriceBandItem } from "@/utils/supabase/priceBand";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearPriceBands, togglePriceBand } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

const GRID_GAP = 10;
const H_PADDING = 12;

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;

// Tall cards so they spread on screen (still scrollable)
const CARD_H = Math.round(CARD_W * 0.5);

const CARD_PALETTE = [
  { bg: "#FCE7F3", text: "#111" }, // blush
  { bg: "#E0F2FE", text: "#111" }, // sky
  { bg: "#DCFCE7", text: "#111" }, // mint
  { bg: "#FEF3C7", text: "#111" }, // amber
  { bg: "#EDE9FE", text: "#111" }, // violet
  { bg: "#FFE4E6", text: "#111" }, // rose
  { bg: "#F3F4F6", text: "#111" }, // gray
  { bg: "#ECFCCB", text: "#111" } // lime
];

function getCardColorsByIndex(index: number) {
  return CARD_PALETTE[index % CARD_PALETTE.length];
}

export default function PriceBand() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s: any) => s.filters?.priceBandIds ?? []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const [options, setOptions] = useState<PriceBandItem[]>([]);

  useEffect(() => {
    let alive = true;

    getPriceBands()
      .then((rows) => {
        if (!alive) return;
        setOptions(rows ?? []);
      })
      .catch(() => {
        // keep silent, UI shows nothing
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <StandardFilterDisplay
      title="Price Band"
      onBack={() => router.back()}
      onAny={() => dispatch(clearPriceBands())}
      onNext={() => router.replace("/results")}
    >
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{ paddingHorizontal: H_PADDING }}
        renderItem={({ item, index }) => {
          const isOn = selectedSet.has(item.id);
          const colors = getCardColorsByIndex(index);

          return (
            <Pressable
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: colors.bg, height: CARD_H },
                isOn ? styles.cardSelected : null
              ]}
              onPress={() => dispatch(togglePriceBand(item.id))}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                {item.name}
              </Text>

              {isOn ? (
                <Text style={[styles.selected, { color: colors.text }]}>
                  ✓ Selected
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: GRID_GAP
  },
  cardSelected: {
    borderColor: "#111",
    borderWidth: 2
  },
  label: {
    fontSize: 16,
    fontWeight: "700"
  },
  selected: {
    fontSize: 13,
    fontWeight: "700"
  }
});
