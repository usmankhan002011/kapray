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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearWorkDensities, toggleWorkDensity } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

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
const IMAGE_H = Math.round(CARD_W * 1.35); // increase/decrease this multiplier if needed

export default function WorkDensityScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.workDensityIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const [items, setItems] = useState<WorkDensityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

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

  return (
    <StandardFilterDisplay
      title={`Work Density${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearWorkDensities())}
    onNext={() => router.push("/origin-city")}

    >
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
              onPress={() => dispatch(toggleWorkDensity(item.id))}
            >
              <View style={styles.imageWrap}>
                {localImg ? (
                  <Image
                    source={localImg}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : null}
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
  infoText: {
    color: "#111",
    marginBottom: 6
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
    borderColor: "#111"
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

  label: {
    fontSize: 14,
    color: "#111",
    textAlign: "center",
    fontWeight: "600"
  }
});
