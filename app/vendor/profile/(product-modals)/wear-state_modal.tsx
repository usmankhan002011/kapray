import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import { getWearStates, WearStateItem } from "@/utils/supabase/wearState";

const GRID_GAP = 8;
const H_PADDING = 12;

const CARD_COLORS: Record<string, string> = {
  "dupatta-included": "#F8FBFF",
  "trouser-included": "#F5FAFF",
  "shawl-included": "#F3F8FF",
  "blouse-included": "#F2F6FF",
  "choli-included": "#F0F5FF",
  "koti-included": "#EEF4FF",
  "jacket-included": "#F1F7FA",
  "small-coat-included": "#F4F8F4",
  "coat-included": "#F8FAF1",
  "cape-included": "#FAF7F1",
  "overlay-included": "#FAF5F6",
  "inner-included": "#F8F5FA",
  "lining-included": "#F5F6FA",
  "scarf-included": "#F5FAF8",
  "hijab-included": "#F4F9FB",
  "gharara-included": "#FBF8F2",
  "sharara-included": "#FAF6F2",
  "lehenga-included": "#F8F4FA",
  "skirt-included": "#F5F2FA",
  "petticoat-included": "#F2F5FA",
};

const INCLUDED_CODE_ORDER = [
  "dupatta-included",
  "trouser-included",
  "shawl-included",
  "blouse-included",
  "choli-included",
  "koti-included",
  "jacket-included",
  "small-coat-included",
  "coat-included",
  "cape-included",
  "overlay-included",
  "inner-included",
  "lining-included",
  "scarf-included",
  "hijab-included",
  "gharara-included",
  "sharara-included",
  "lehenga-included",
  "skirt-included",
  "petticoat-included",
];

const FALLBACK_COLORS = [
  "#F8FBFF",
  "#F3F8FF",
  "#EEF4FF",
  "#F5FAF8",
  "#FAF7F1",
  "#F8F5FA",
];

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

function codeOf(item: WearStateItem) {
  return String(item.code ?? "").toLowerCase().trim();
}

function sortIncludedItems(list: WearStateItem[]) {
  const included = list.filter((item) => codeOf(item).endsWith("-included"));
  const byCode = new Map(included.map((item) => [codeOf(item), item]));

  const ordered = INCLUDED_CODE_ORDER.map((code) => byCode.get(code)).filter(
    Boolean,
  ) as WearStateItem[];

  const used = new Set(ordered.map((item) => item.id));
  const rest = included.filter((item) => !used.has(item.id));

  return [...ordered, ...rest];
}

function cardColorFor(code: string, index: number) {
  return CARD_COLORS[code] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function ProductWearStateModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = pickFirstString((params as any)?.returnTo);

  const { draft, setWearStateIds } = useProductDraft();

  const [items, setItems] = useState<WearStateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.wearStateIds) ? draft.spec.wearStateIds : [],
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

        const included = sortIncludedItems((res ?? []) as WearStateItem[]);
        const availableIds = new Set(included.map((item) => String(item.id)));

        setItems(included);
        setSelected((prev) => prev.filter((id) => availableIds.has(String(id))));
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load included items");
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
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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
        <Text style={styles.headerTitle}>Includes</Text>

        <Pressable
          onPress={close}
          style={({ pressed }) => [
            apStyles.linkBtn,
            styles.closeButton,
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text style={apStyles.linkText}>Close</Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.infoText}>Loading items...</Text> : null}
      {err ? <Text style={styles.errorText}>{err}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        ListEmptyComponent={
          !loading && !err ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items found.</Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const isOn = selectedSet.has(item.id);
          const code = String(item.code ?? "").toLowerCase();
          const bg = cardColorFor(code, index);

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: bg },
                isOn ? styles.cardSelected : null,
                pressed ? apStyles.pressed : null,
              ]}
              onPress={() => toggle(item.id)}
            >
              <Text style={styles.label}>{item.name}</Text>

              {isOn ? (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Selected</Text>
          <Text style={styles.footerValue}>{selected.length}</Text>
        </View>

        <View style={styles.footerActions}>
          <Pressable
            onPress={onClear}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>

          <Pressable
            onPress={onDone}
            style={({ pressed }) => [
              styles.doneBtn,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: apColors.bg,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: apColors.text,
  },
  closeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: apColors.muted,
    fontWeight: "500",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: apColors.danger,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 106,
    paddingTop: 2,
  },
  columnWrap: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  card: {
    flex: 1,
    minHeight: 66,
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cardSelected: {
    borderColor: apColors.blue,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: apColors.text,
    textAlign: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: apColors.blue,
  },
  selectedText: {
    color: apColors.white,
    fontSize: 9,
    fontWeight: "800",
  },
  emptyState: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 8,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: {
    color: apColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: apColors.border,
    backgroundColor: "rgba(248,250,252,0.98)",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerLabel: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  footerValue: {
    color: apColors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clearBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: apColors.border,
    backgroundColor: apColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: apColors.text,
  },
  doneBtn: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 8,
    backgroundColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    fontSize: 13,
    fontWeight: "800",
    color: apColors.white,
  },
});
