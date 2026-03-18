import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWearStates, WearStateItem } from "@/utils/supabase/wearState";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const GRID_GAP = 10;
const H_PADDING = 12;

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;
const CARD_H = Math.max(120, Math.round(CARD_W * 1.05));

const CARD_COLORS: Record<string, { bg: string; text: string }> = {
  "dupatta-included": { bg: "#FCE7F3", text: "#111" },
  "trouser-included": { bg: "#E0F2FE", text: "#111" },
  "blouse-included": { bg: "#DCFCE7", text: "#111" },
  "one-piece": { bg: "#FEF3C7", text: "#111" },
  "two-piece": { bg: "#EDE9FE", text: "#111" },
  "three-piece": { bg: "#FFE4E6", text: "#111" }
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

export default function ProductWearStateModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = pickFirstString((params as any)?.returnTo);

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
          "dupatta-included",
          "trouser-included",
          "blouse-included",
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

  function close() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
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
    close();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={close}
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

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  overlayDark: "rgba(0,0,0,0.58)",
  overlaySoft: "rgba(255,255,255,0.14)",
  white: "#FFFFFF",
  black: "#000000"
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text
  },

  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    alignItems: "center",
    justifyContent: "center"
  },

  headerBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue
  },

  subHeader: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },

  subText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500"
  },

  clearBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    alignItems: "center",
    justifyContent: "center"
  },

  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.text
  },

  heading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
    color: stylesVars.text,
    paddingHorizontal: 14,
    paddingTop: 6
  },

  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.mutedText,
    fontWeight: "500",
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
    borderColor: stylesVars.border,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center"
  },

  cardSelected: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  },

  selected: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },

  pressed: {
    opacity: 0.82
  }
});