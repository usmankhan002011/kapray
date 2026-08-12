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
  getFallbackWorkTypes,
  getWorkTypes,
  WorkTypeItem,
} from "@/utils/supabase/workType";

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

const ALLOWED_PARENT_CODES = new Set([
  "metallic",
  "thread",
  "stone",
  "sequin",
  "gotta",
  "mirror",
  "machine",
  "designer",
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
  if (count <= 0) return "None";
  if (count === 1) return "1 selected";
  return `${count} selected`;
}

export default function ProductWorkModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = pickFirstString((params as any)?.returnTo);

  const { draft, setWorkTypeIds } = useProductDraft() as any;

  const [items, setItems] = useState<WorkTypeItem[]>(() =>
    getFallbackWorkTypes(),
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = Array.isArray(draft?.spec?.workTypeIds)
    ? draft.spec.workTypeIds
    : [];
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    let alive = true;
    setLoading(false);
    setErr(null);

    getWorkTypes()
      .then((res) => {
        if (!alive) return;
        const cleaned = (res ?? []).filter((item) =>
          ALLOWED_PARENT_CODES.has(safeStr(item.code).toLowerCase()),
        );
        setItems(cleaned.length ? cleaned : getFallbackWorkTypes());
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
    closeProductModal(router, returnTo);
  }

  function openSubTypes(item: WorkTypeItem) {
    const mainModalPath = returnTo
      ? `/vendor/profile/(product-modals)/work_modal?returnTo=${encodeURIComponent(returnTo)}`
      : "/vendor/profile/(product-modals)/work_modal";

    const encodedReturnTo = encodeURIComponent(mainModalPath);
    const encodedParentId = encodeURIComponent(String(item.id));
    const encodedParentCode = encodeURIComponent(
      String(item.code ?? "").toLowerCase(),
    );
    const encodedParentName = encodeURIComponent(String(item.name ?? ""));

    router.push(
      `/vendor/profile/(product-modals)/work-subtypes_modal?parentId=${encodedParentId}&parentCode=${encodedParentCode}&parentName=${encodedParentName}&returnTo=${encodedReturnTo}` as any,
    );
  }

  function onClear() {
    (draft.spec as any).workTypeNames = [];
    (draft.spec as any).workSubTypeMap = {};
    (draft.spec as any).workSubTypeNames = [];
    setWorkTypeIds([]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Work</Text>

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
        <Text style={styles.infoText}>Loading work...</Text>
      ) : null}
      {err ? <Text style={styles.errorText}>{err}</Text> : null}

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
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? apStyles.pressed : null,
              ]}
              onPress={() => openSubTypes(item)}
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

              <Text
                style={[styles.subSelectionText, isOn ? styles.subTextOn : null]}
                numberOfLines={1}
              >
                {subLabel}
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
            onPress={close}
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
    height: 96,
    borderRadius: 7,
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
  subSelectionText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: apColors.muted,
    textAlign: "center",
    fontWeight: "600",
  },
  subTextOn: {
    color: apColors.blue,
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
