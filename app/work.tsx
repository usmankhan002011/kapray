import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { getWorkTypes, WorkTypeItem } from "@/utils/supabase/workType";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearWorkTypes, toggleWorkType } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

const WORK_LOCAL_IMAGES: Record<string, any> = {
  designer: require("@/assets/work-images/designer.jpg"),
  gotta: require("@/assets/work-images/gotta.jpg"),
  machine: require("@/assets/work-images/machine.jpg"),
  mirror: require("@/assets/work-images/mirror.jpg"),
  sequin: require("@/assets/work-images/sequin.jpg"),
  stone: require("@/assets/work-images/stone.jpg"),
  thread: require("@/assets/work-images/thread.jpg"),
  zardozi: require("@/assets/work-images/zardozi.jpg")
};

const GRID_GAP = 8;
const H_PADDING = 12;

export default function WorkScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.workTypeIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const [items, setItems] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getWorkTypes()
      .then((res) => {
        if (!alive) return;
        setItems(res ?? []);
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
      title={`Work Type${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearWorkTypes())}
      onNext={() => router.push("/work-density")}

    >
      <Text style={styles.heading}>Select Work Type</Text>

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
          const localImg = WORK_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

          return (
            <Pressable
              key={item.id}
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => dispatch(toggleWorkType(item.id))}
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

  imageWrap: {
    width: "100%",
    height: 96,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 6
  },
  image: {
    width: "100%",
    height: 96
  },

  label: {
    fontSize: 13,
    color: "#111",
    textAlign: "center"
  }
});
