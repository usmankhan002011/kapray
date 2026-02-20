import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWearStates, WearStateItem } from "@/utils/supabase/wearState";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearWearStates, toggleWearState } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

const GRID_GAP = 10;
const H_PADDING = 12;

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;
const CARD_H = Math.max(120, Math.round(CARD_W * 1.05));

const CARD_COLORS: Record<string, { bg: string; text: string }> = {
  stitched: { bg: "#FCE7F3", text: "#111" },
  unstitched: { bg: "#E0F2FE", text: "#111" },
  "ready-to-wear": { bg: "#DCFCE7", text: "#111" },
  "one-piece": { bg: "#FEF3C7", text: "#111" },
  "two-piece": { bg: "#EDE9FE", text: "#111" },
  "three-piece": { bg: "#FFE4E6", text: "#111" }
};

export default function WearStateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.wearStateIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const [items, setItems] = useState<WearStateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getWearStates()
      .then((res) => {
        if (!alive) return;

        const list = (res ?? []) as WearStateItem[];

        const order = [
          "stitched",
          "unstitched",
          "ready-to-wear",
          "one-piece",
          "two-piece",
          "three-piece"
        ];

        const byCode = new Map(
          list.map((x) => [String(x.code ?? "").toLowerCase(), x])
        );

        const ordered = order
          .map((code) => byCode.get(code))
          .filter(Boolean) as WearStateItem[];

        const used = new Set(ordered.map((x) => x.id));
        const rest = list.filter((x) => !used.has(x.id));

        setItems([...ordered, ...rest]);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load wear states");
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
      title={`Wear State${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearWearStates())}
      onNext={() =>
        fromResultsFilters ? router.back() : router.push("/price-band")
      }
    >
      <Text style={styles.heading}>Select Wear State</Text>

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
          const code = String(item.code ?? "").toLowerCase();
          const colors = CARD_COLORS[code] ?? { bg: "#F3F4F6", text: "#111" };

          return (
            <Pressable
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: colors.bg, height: CARD_H },
                isOn ? styles.cardSelected : null
              ]}
              onPress={() => dispatch(toggleWearState(item.id))}
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
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  selected: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700"
  }
});
