import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apRadii, apStyles } from "@/components/product/addProductStyles";

type ColorShadeItem = {
  id: string;
  name: string;
  hex: string;
};

const COLOR_SHADES: ColorShadeItem[] = [
  { id: "red", name: "Red", hex: "#C21807" },
  { id: "green", name: "Green", hex: "#1B5E20" },
  { id: "yellow", name: "Yellow", hex: "#FBC02D" },
  { id: "blue", name: "Blue", hex: "#1565C0" },
  { id: "golden", name: "Golden", hex: "#D4AF37" },
  { id: "silver", name: "Silver", hex: "#C0C0C0" },
  { id: "white", name: "White", hex: "#FFFFFF" },
  { id: "black", name: "Black", hex: "#000000" },
];

const GRID_GAP = 10;
const H_PADDING = 12;

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function ProductColorModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const { draft, setColorShadeIds } = useProductDraft();

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.colorShadeIds) ? draft.spec.colorShadeIds : [],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of COLOR_SHADES) m.set(c.id, c.name);
    return m;
  }, []);

  function closeToAddProduct() {
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
    (draft.spec as any).colorShadeNames = [];
    setSelected([]);
    setColorShadeIds([]);
  }

  function onDone() {
    const pickedNames = selected
      .map((id) => nameById.get(id) ?? "")
      .map((s) => safeStr(s))
      .filter(Boolean);

    (draft.spec as any).colorShadeNames = pickedNames;
    setColorShadeIds(selected);
    closeToAddProduct();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Color</Text>

        <Pressable
          onPress={closeToAddProduct}
          style={({ pressed }) => [
            apStyles.linkBtn,
            styles.closeButton,
            pressed ? apStyles.pressed : null,
          ]}
        >
          <Text style={apStyles.linkText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        Base colors help buyers find dresses by color.
      </Text>

      <FlatList
        data={COLOR_SHADES}
        keyExtractor={(i) => i.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const isOn = selectedSet.has(item.id);

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? apStyles.pressed : null,
              ]}
              onPress={() => toggle(item.id)}
            >
              <View style={styles.swatchWrap}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: item.hex },
                    item.id === "white" ? styles.whiteSwatch : null,
                  ]}
                />
              </View>

              <Text
                style={[styles.label, isOn ? styles.labelOn : null]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

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

  helperText: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: apColors.muted,
    fontWeight: "500",
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
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: apRadii.card,
    padding: 8,
    backgroundColor: apColors.white,
    position: "relative",
  },

  cardSelected: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
  },

  swatchWrap: {
    width: "100%",
    height: 92,
    borderRadius: apRadii.card,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 8,
  },

  swatch: {
    width: "100%",
    height: 92,
  },

  whiteSwatch: {
    borderWidth: 1,
    borderColor: apColors.border,
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    color: apColors.text,
    textAlign: "center",
    fontWeight: "700",
  },

  labelOn: {
    color: apColors.blue,
  },

  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: apRadii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: apColors.blue,
  },

  selectedText: {
    color: apColors.white,
    fontSize: 10,
    fontWeight: "800",
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
    borderRadius: apRadii.card,
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
    borderRadius: apRadii.card,
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
