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
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWorkDensities, WorkDensityItem } from "@/utils/supabase/workDensity";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const WORK_DENSITY_LOCAL_IMAGES: Record<string, any> = {
  light: require("@/assets/work-density-images/light.png"),
  medium: require("@/assets/work-density-images/medium.jpg"),
  heavy: require("@/assets/work-density-images/heavy.jpg"),
  "extra-heavy": require("@/assets/work-density-images/extra-heavy.jpg")
};

const GRID_GAP = 8;
const H_PADDING = 12;

// Responsive sizing so cards feel bigger and fill the screen
const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - H_PADDING * 2 - GRID_GAP) / 2;
const IMAGE_H = Math.round(CARD_W * 1.35);

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

  const [items, setItems] = useState<WorkDensityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Local selection inside modal (apply to draft only on Done)
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.workDensityIds) ? draft.spec.workDensityIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const itemById = useMemo(() => {
    const m = new Map<string, WorkDensityItem>();
    for (const it of items) m.set(String(it.id), it);
    return m;
  }, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getWorkDensities()
      .then((res) => {
        if (!alive) return;
        setItems(res ?? []);
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
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={close}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Work Density</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more density levels.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      {/* <Text style={styles.heading}>Select Work Density</Text> */}

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
            WORK_DENSITY_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

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
    paddingBottom: 16,
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
    padding: 8,
    backgroundColor: stylesVars.cardBg
  },

  cardSelected: {
    borderColor: stylesVars.blue,
    borderWidth: 2,
    backgroundColor: stylesVars.blueSoft
  },

  imageWrap: {
    width: "100%",
    height: IMAGE_H,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 8
  },

  image: {
    width: "100%",
    height: IMAGE_H
  },

  noImage: {
    width: "100%",
    height: IMAGE_H,
    alignItems: "center",
    justifyContent: "center"
  },

  noImageText: {
    color: stylesVars.mutedText,
    fontSize: 12,
    fontWeight: "600"
  },

  label: {
    fontSize: 14,
    lineHeight: 18,
    color: stylesVars.text,
    textAlign: "center",
    fontWeight: "700"
  },

  pressed: {
    opacity: 0.82
  }
});