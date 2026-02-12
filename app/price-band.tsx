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
  { bg: "#FEF3C7", text: "#111" }, // gold
  { bg: "#EDE9FE", text: "#111" }, // lavender
  { bg: "#FFE4E6", text: "#111" }, // rose
  { bg: "#ECFCCB", text: "#111" }, // lime
  { bg: "#E0E7FF", text: "#111" }, // periwinkle
  { bg: "#FFEFD5", text: "#111" }, // peach
  { bg: "#E5E7EB", text: "#111" }, // neutral
  { bg: "#D1FAE5", text: "#111" }, // soft green
  { bg: "#FDE68A", text: "#111" }  // warm yellow
];

function getCardColorsByIndex(i: number) {
  return CARD_PALETTE[i % CARD_PALETTE.length];
}

export default function PriceBandScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.priceBandIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const [items, setItems] = useState<PriceBandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getPriceBands()
      .then((res) => {
        if (!alive) return;
        setItems(res ?? []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load price bands");
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <StandardFilterDisplay
      title={`Cost Range${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearPriceBands())}
      onNext={() => router.replace("/(tabs)")}
    >
      <Text style={styles.heading}>Select Cost Range (PKR)</Text>

      {loading ? <Text style={styles.infoText}>Loading...</Text> : null}
      {err ? <Text style={styles.infoText}>{err}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
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
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111"
  },
  infoText: {
    color: "#111",
    marginBottom: 6
  },

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 18,
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
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  cardSelected: {
    borderColor: "#111",
    borderWidth: 2
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  selected: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700"
  }
});
