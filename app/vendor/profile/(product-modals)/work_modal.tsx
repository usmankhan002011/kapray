import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWorkTypes, WorkTypeItem } from "@/utils/supabase/workType";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const WORK_LOCAL_IMAGES: Record<string, any> = {
  designer: require("@/assets/work-images/designer.jpg"),
  gotta: require("@/assets/work-images/gotta.jpg"),
  machine: require("@/assets/work-images/machine.jpg"),
  metallic: require("@/assets/work-images/metallic.jpg"),
  mirror: require("@/assets/work-images/mirror.jpg"),
  sequin: require("@/assets/work-images/sequin.jpg"),
  stone: require("@/assets/work-images/stone.jpg"),
  thread: require("@/assets/work-images/thread.jpg")
};

const ALLOWED_PARENT_CODES = new Set([
  "metallic",
  "thread",
  "stone",
  "sequin",
  "gotta",
  "mirror",
  "machine",
  "designer"
]);

const GRID_GAP = 8;
const H_PADDING = 12;

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

function getParentSelectionCount(draft: any, parentCode: string) {
  const map =
    draft?.spec && typeof draft.spec === "object" && draft.spec.workSubTypeMap
      ? (draft.spec.workSubTypeMap as Record<string, string[]>)
      : {};

  const list = Array.isArray(map[parentCode]) ? map[parentCode] : [];
  return list.length;
}

function getParentSubtitle(draft: any, parentCode: string) {
  const count = getParentSelectionCount(draft, parentCode);
  if (count <= 0) return "None selected";
  if (count === 1) return "1 selected";
  return `${count} selected`;
}

export default function ProductWorkModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = pickFirstString((params as any)?.returnTo);

  const { draft, setWorkTypeIds } = useProductDraft() as any;

  const [items, setItems] = useState<WorkTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = Array.isArray(draft?.spec?.workTypeIds) ? draft.spec.workTypeIds : [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getWorkTypes()
      .then((res) => {
        if (!alive) return;
        const cleaned = (res ?? []).filter((item) =>
          ALLOWED_PARENT_CODES.has(safeStr(item.code).toLowerCase())
        );
        setItems(cleaned);
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

  function close() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function openSubTypes(item: WorkTypeItem) {
    const mainModalPath = returnTo
      ? `/vendor/profile/(product-modals)/work_modal?returnTo=${encodeURIComponent(returnTo)}`
      : "/vendor/profile/(product-modals)/work_modal";

    const encodedReturnTo = encodeURIComponent(mainModalPath);
    const encodedParentId = encodeURIComponent(String(item.id));
    const encodedParentCode = encodeURIComponent(String(item.code ?? "").toLowerCase());
    const encodedParentName = encodeURIComponent(String(item.name ?? ""));

    router.push(
      `/vendor/profile/(product-modals)/work-subtypes_modal?parentId=${encodedParentId}&parentCode=${encodedParentCode}&parentName=${encodedParentName}&returnTo=${encodedReturnTo}` as any
    );
  }


  function onClear() {
    (draft.spec as any).workTypeNames = [];
    (draft.spec as any).workSubTypeMap = {};
    (draft.spec as any).workSubTypeNames = [];
    setWorkTypeIds([]);
  }

  function onDone() {
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

        <Text style={styles.headerTitle}>Work</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>
          Select a work type, then choose one or more sub work types.
        </Text>

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
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const parentCode = safeStr(item.code).toLowerCase();
          const isOn = selectedSet.has(String(item.id));
          const localImg = WORK_LOCAL_IMAGES[parentCode];
          const subLabel = getParentSubtitle(draft, parentCode);

          return (
            <Pressable
              key={String(item.id)}
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => openSubTypes(item)}
            >
              <View style={styles.imageWrap}>
                {localImg ? (
                  <Image source={localImg} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.noImage}>
                    <Text style={styles.noImageText}>No Image</Text>
                  </View>
                )}
              </View>

              <Text style={styles.label} numberOfLines={1}>
                {item.name} {isOn ? "✓" : ""}
              </Text>

              <Text style={styles.subSelectionText} numberOfLines={1}>
                {subLabel}
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
    height: 96,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 8
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

  noImageText: {
    color: stylesVars.mutedText,
    fontSize: 12,
    fontWeight: "600"
  },

  label: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.text,
    textAlign: "center",
    fontWeight: "700"
  },

  subSelectionText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: stylesVars.mutedText,
    textAlign: "center",
    fontWeight: "500"
  },

  pressed: {
    opacity: 0.82
  }
});