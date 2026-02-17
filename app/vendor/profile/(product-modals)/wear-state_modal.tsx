import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { getWearStates, WearStateItem } from "@/utils/supabase/wearState";
import { useProductDraft } from "@/components/product/ProductDraftContext";

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

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function ProductWearStateModal() {
  const router = useRouter();
  const { draft, setWearStateIds } = useProductDraft();

  const [items, setItems] = useState<WearStateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Local selection inside modal (apply to draft only on Done)
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.wearStateIds) ? draft.spec.wearStateIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const itemById = useMemo(() => {
    const m = new Map<string, WearStateItem>();
    for (const it of items) m.set(String(it.id), it);
    return m;
  }, [items]);

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

  function closeToAddProduct() {
    router.replace("/vendor/profile/add-product" as any);
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function onClear() {
    (draft.spec as any).wearStateNames = [];
    setSelected([]);
    setWearStateIds([]);
  }

  function onDone() {
    const pickedNames = selected
      .map((id) => itemById.get(String(id))?.name ?? "")
      .map((s) => safeStr(s))
      .filter(Boolean);

    (draft.spec as any).wearStateNames = pickedNames;

    setWearStateIds(selected);
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

        <Text style={styles.headerTitle}>Wear State</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more wear states.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

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
              onPress={() => toggle(item.id)}
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
    borderColor: "#0b2f6b",
    borderWidth: 2,
    backgroundColor: "#F3F7FF"
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
  },

  pressed: { opacity: 0.75 }
});
