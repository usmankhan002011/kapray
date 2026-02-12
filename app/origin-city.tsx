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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearOriginCities, toggleOriginCity } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

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
const IMAGE_H = Math.max(92, Math.round(CARD_W * 0.62)); // smaller cards; still clear

export default function OriginCityScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.originCityIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const [items, setItems] = useState<OriginCityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <StandardFilterDisplay
      title={`Origin City${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearOriginCities())}
      onNext={() => router.push("/wear-state")}

    >
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
              onPress={() => dispatch(toggleOriginCity(item.id))}
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
    borderColor: "#111"
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

  label: {
    fontSize: 13,
    color: "#111",
    textAlign: "center"
  }
});
