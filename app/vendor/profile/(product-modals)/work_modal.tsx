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
import { useProductDraft } from "@/components/product/ProductDraftContext";

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

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function ProductWorkModal() {
  const router = useRouter();
  const { draft, setWorkTypeIds } = useProductDraft();

  const [items, setItems] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Local selection inside modal (apply to draft only on Done)
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.workTypeIds) ? draft.spec.workTypeIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const itemById = useMemo(() => {
    const m = new Map<string, WorkTypeItem>();
    for (const it of items) m.set(String(it.id), it);
    return m;
  }, [items]);

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

  function closeToAddProduct() {
    router.replace("/vendor/profile/add-product" as any);
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onClear() {
    (draft.spec as any).workTypeNames = [];
    setSelected([]);
    setWorkTypeIds([]);
  }

  function onDone() {
    const pickedNames = selected
      .map((id) => itemById.get(String(id))?.name ?? "")
      .map((s) => safeStr(s))
      .filter(Boolean);

    (draft.spec as any).workTypeNames = pickedNames;

    setWorkTypeIds(selected);
    closeToAddProduct();
  }

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={closeToAddProduct}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Work</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more work types.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

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
              onPress={() => toggle(item.id)}
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
                    <Text style={styles.noImageText}>No Image</Text>
                  </View>
                )}
              </View>

              <Text style={styles.label} numberOfLines={1}>
                {item.name} {isOn ? "✓" : ""}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  headerBtnText: { fontSize: 14, fontWeight: "900", color: "#0b2f6b" },

  subHeader: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  subText: { flex: 1, color: "#111", opacity: 0.7 },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e7e7e7"
  },
  clearBtnText: { fontSize: 12, fontWeight: "900", color: "#111" },

  heading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
    paddingHorizontal: 14,
    paddingTop: 6
  },
  infoText: {
    color: "#111",
    marginBottom: 6,
    paddingHorizontal: 14
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
    borderColor: "#0b2f6b",
    borderWidth: 2,
    backgroundColor: "#F3F7FF"
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
  noImage: {
    width: "100%",
    height: 96,
    alignItems: "center",
    justifyContent: "center"
  },
  noImageText: { color: "#111", opacity: 0.6, fontWeight: "800" },

  label: {
    fontSize: 13,
    color: "#111",
    textAlign: "center",
    fontWeight: "700"
  },

  pressed: { opacity: 0.75 }
});
