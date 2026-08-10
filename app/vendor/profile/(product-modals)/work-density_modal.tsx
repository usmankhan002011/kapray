import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import { closeProductModal } from "@/components/product/productModalNavigation";
import {
  getFallbackWorkDensities,
  getWorkDensities,
  WorkDensityItem,
} from "@/utils/supabase/workDensity";

const WORK_DENSITY_LOCAL_IMAGES: Record<string, any> = {
  light: require("@/assets/work-density-images/light.png"),
  medium: require("@/assets/work-density-images/medium.jpg"),
  heavy: require("@/assets/work-density-images/heavy.jpg"),
  "extra-heavy": require("@/assets/work-density-images/extra-heavy.jpg"),
};

const GRID_GAP = 8;
const H_PADDING = 12;
const IMAGE_H = 122;

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

export default function ProductWorkDensityModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = pickFirstString((params as any)?.returnTo);

  const { draft, setWorkDensityIds } = useProductDraft();

  const [items, setItems] = useState<WorkDensityItem[]>(() =>
    getFallbackWorkDensities(),
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.workDensityIds) ? draft.spec.workDensityIds : [],
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const itemById = useMemo(() => {
    const m = new Map<string, WorkDensityItem>();
    for (const it of items) m.set(String(it.id), it);
    return m;
  }, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(false);
    setErr(null);

    getWorkDensities()
      .then((res) => {
        if (!alive) return;
        setItems(res?.length ? res : getFallbackWorkDensities());
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

  function close() {
    closeProductModal(router, returnTo);
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onClear() {
    (draft.spec as any).workDensityNames = [];
    setSelected([]);
    setWorkDensityIds([]);
  }

  function onDone() {
    const pickedNames = selected
      .map((id) => itemById.get(String(id))?.name ?? "")
      .map((s) => safeStr(s))
      .filter(Boolean);

    (draft.spec as any).workDensityNames = pickedNames;

    setWorkDensityIds(selected);
    close();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Density</Text>

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

      {loading && !items.length ? (
        <Text style={styles.infoText}>Loading density...</Text>
      ) : null}
      {err ? <Text style={styles.errorText}>{err}</Text> : null}

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
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? apStyles.pressed : null,
              ]}
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
                    <Text style={styles.noImageText}>No image</Text>
                  </View>
                )}
              </View>

              <Text style={styles.label} numberOfLines={1}>
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
    borderWidth: 1,
    borderColor: apColors.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: apColors.white,
    position: "relative",
  },
  cardSelected: {
    borderColor: apColors.blue,
    backgroundColor: apColors.blueSoft,
  },
  imageWrap: {
    width: "100%",
    height: IMAGE_H,
    borderRadius: 7,
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
  },
  noImageText: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    color: apColors.text,
    textAlign: "center",
    fontWeight: "700",
  },
  selectedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
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
