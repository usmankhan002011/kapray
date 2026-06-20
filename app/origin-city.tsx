import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getOriginCities, OriginCityItem } from "@/utils/supabase/originCity";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearOriginCities, toggleOriginCity } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

const ORIGIN_CITY_LOCAL_IMAGES: Record<string, any> = {
  bahawalpur: require("@/assets/origin-images/Bahawalpur.jpg"),
  faisalabad: require("@/assets/origin-images/Faisalabad_labeled.jpg"),
  hyderabad: require("@/assets/origin-images/Hyderabad.jpg"),
  karachi: require("@/assets/origin-images/Karachi.jpg"),
  lahore: require("@/assets/origin-images/Lahore.jpg"),
  multan: require("@/assets/origin-images/Multan.jpg"),
  peshawar: require("@/assets/origin-images/Peshawar.jpg"),
  rawalpindi: require("@/assets/origin-images/Rawalpindi.jpg"),
};

const GRID_GAP = 10;
const H_PADDING = 16;
const IMAGE_H = 92;

export default function OriginCityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.originCityIds);

  const [items, setItems] = useState<OriginCityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

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
      title="Origin"
      onBack={() => router.back()}
      onAny={() => dispatch(clearOriginCities())}
      onNext={() =>
        fromResultsFilters ? router.back() : router.push("/wear-state")
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
          const localImg =
            ORIGIN_CITY_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

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
              onPress={() => dispatch(toggleOriginCity(item.id))}
            >
              <View style={styles.imageWrap}>
                {localImg ? (
                  <Image
                    source={localImg}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImage}>
                    <Text style={styles.noImageText}>No image</Text>
                  </View>
                )}
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

  imageWrap: {
    width: "100%",
    height: IMAGE_H,
    borderRadius: apRadii.card,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },

  image: {
    width: "100%",
    height: IMAGE_H,
  },

  noImage: {
    width: "100%",
    height: IMAGE_H,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  noImageText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: apFontFamily,
    color: apColors.muted,
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
