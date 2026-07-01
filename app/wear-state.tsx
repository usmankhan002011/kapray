import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWearStates, WearStateItem } from "@/utils/supabase/wearState";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearWearStates, toggleWearState } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

const GRID_GAP = 10;
const H_PADDING = 16;

const INCLUDED_CODE_ORDER = [
  "dupatta-included",
  "trouser-included",
  "blouse-included",
  "shawl-included",
  "coat-included",
  "inner-included",
  "lining-included",
  "one-piece",
  "two-piece",
  "three-piece",
];

export default function WearStateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.wearStateIds);

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
        const byCode = new Map(
          list.map((x) => [String(x.code ?? "").toLowerCase(), x]),
        );

        const ordered = INCLUDED_CODE_ORDER.map((code) => byCode.get(code))
          .filter(Boolean) as WearStateItem[];

        const used = new Set(ordered.map((x) => x.id));
        const rest = list.filter((x) => !used.has(x.id));

        setItems([...ordered, ...rest]);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load includes");
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
      title="Includes"
      onBack={() => router.back()}
      onAny={() => dispatch(clearWearStates())}
      onNext={() =>
        fromResultsFilters ? router.back() : router.push("/price-band")
      }
    >
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
              onPress={() => dispatch(toggleWearState(item.id))}
            >
              <View style={[styles.iconBox, isOn ? styles.iconBoxOn : null]}>
                <MaterialIcons
                  name="checkroom"
                  size={20}
                  color={isOn ? apColors.blue : apColors.subText}
                />
              </View>

              <Text
                style={[styles.label, isOn ? styles.labelOn : null]}
                numberOfLines={2}
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
  infoText: {
    marginHorizontal: H_PADDING,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: apColors.muted,
    fontWeight: "500",
    fontFamily: apFontFamily,
  },

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
    minHeight: 110,
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: apRadii.card,
    padding: 12,
    backgroundColor: apColors.white,
  },

  cardSelected: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  iconBoxOn: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.white,
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    fontFamily: apFontFamily,
    color: apColors.text,
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
