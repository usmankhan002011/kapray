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
import { getWorkTypes, WorkTypeItem } from "@/utils/supabase/workType";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearWorkTypes } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import { isWorkParentCode } from "@/data/workSubTypes";

const WORK_LOCAL_IMAGES: Record<string, any> = {
  designer: require("@/assets/work-images/designer.jpg"),
  gotta: require("@/assets/work-images/gotta.jpg"),
  machine: require("@/assets/work-images/machine.jpg"),
  metallic: require("@/assets/work-images/metallic.jpg"),
  mirror: require("@/assets/work-images/mirror.jpg"),
  sequin: require("@/assets/work-images/sequin.jpg"),
  stone: require("@/assets/work-images/stone.jpg"),
  thread: require("@/assets/work-images/thread.jpg"),
};

const GRID_GAP = 10;
const H_PADDING = 16;

export default function WorkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.workTypeIds);
  const workSubTypeMap = useAppSelector(
    (s: any) => s.filters.workSubTypeMap ?? {},
  );

  const [items, setItems] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

  function subtypeCount(parentCode: string) {
    const list = workSubTypeMap?.[parentCode];
    return Array.isArray(list) ? list.length : 0;
  }

  function subtypeLabel(parentCode: string) {
    const count = subtypeCount(parentCode);
    if (count <= 0) return "None";
    if (count === 1) return "1 selected";
    return `${count} selected`;
  }

  function openSubtypes(item: WorkTypeItem) {
    const parentCode = String(item.code ?? "").trim().toLowerCase();
    if (!isWorkParentCode(parentCode)) return;

    router.push({
      pathname: "/work-subtypes" as any,
      params: {
        parentId: String(item.id),
        parentCode,
        parentName: String(item.name ?? ""),
      },
    } as any);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getWorkTypes()
      .then((res) => {
        if (!alive) return;
        setItems(
          (res ?? []).filter((item) =>
            isWorkParentCode(String(item.code ?? "").trim().toLowerCase()),
          ),
        );
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load work types");
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
      title="Work"
      onBack={() => router.back()}
      onAny={() => dispatch(clearWorkTypes())}
      onNext={() =>
        fromResultsFilters ? router.back() : router.push("/work-density")
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
          const parentCode = String(item.code ?? "").trim().toLowerCase();
          const count = subtypeCount(parentCode);
          const isOn = selectedSet.has(item.id) || count > 0;
          const localImg = WORK_LOCAL_IMAGES[parentCode];

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
              onPress={() => openSubtypes(item)}
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

              <Text
                style={[styles.subText, isOn ? styles.subTextOn : null]}
                numberOfLines={1}
              >
                {subtypeLabel(parentCode)}
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
    height: 96,
    borderRadius: apRadii.card,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },

  image: {
    width: "100%",
    height: 96,
  },

  noImage: {
    width: "100%",
    height: 96,
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

  subText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: apColors.muted,
    textAlign: "center",
    fontWeight: "600",
    fontFamily: apFontFamily,
  },

  subTextOn: {
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
