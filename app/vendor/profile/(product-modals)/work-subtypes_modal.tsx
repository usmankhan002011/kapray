import React, { useMemo, useState } from "react";
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
import {
  flattenWorkSubTypeNames,
  getWorkSubTypes,
  isWorkParentCode,
  WorkSubTypeItem,
} from "@/data/workSubTypes";

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

export default function WorkSubTypesModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const parentId = safeStr(pickFirstString((params as any)?.parentId));
  const parentCodeRaw = safeStr(pickFirstString((params as any)?.parentCode));
  const parentName = safeStr(pickFirstString((params as any)?.parentName));
  const returnTo = pickFirstString((params as any)?.returnTo);

  const { draft, setWorkTypeIds } = useProductDraft() as any;

  const parentCode = isWorkParentCode(parentCodeRaw) ? parentCodeRaw : null;
  const items: WorkSubTypeItem[] = parentCode ? getWorkSubTypes(parentCode) : [];

  const existingMap =
    draft?.spec && typeof draft.spec === "object" && draft.spec.workSubTypeMap
      ? { ...(draft.spec.workSubTypeMap as Record<string, string[]>) }
      : {};

  const initialSelected =
    parentCode && Array.isArray(existingMap[parentCode])
      ? existingMap[parentCode]
      : [];

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function close() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  }

  function onClear() {
    setSelected([]);
  }

  function onDone() {
    if (!parentCode || !parentId) {
      close();
      return;
    }

    const nextMap: Record<string, string[]> = { ...existingMap };

    if (selected.length) {
      nextMap[parentCode] = [...selected];
    } else {
      delete nextMap[parentCode];
    }

    const flatNames = flattenWorkSubTypeNames(nextMap);

    (draft.spec as any).workSubTypeMap = nextMap;
    (draft.spec as any).workSubTypeNames = flatNames;

    const currentIds = Array.isArray(draft?.spec?.workTypeIds)
      ? [...draft.spec.workTypeIds]
      : [];
    const currentNames = Array.isArray((draft?.spec as any)?.workTypeNames)
      ? [...((draft.spec as any).workTypeNames as string[])]
      : [];

    let nextIds = [...currentIds];
    let nextNames = [...currentNames];

    if (selected.length) {
      if (!nextIds.includes(parentId)) nextIds.push(parentId);
      if (!nextNames.includes(parentName)) nextNames.push(parentName);
    } else {
      nextIds = nextIds.filter((x) => x !== parentId);
      nextNames = nextNames.filter((x) => x !== parentName);
    }

    (draft.spec as any).workTypeNames = nextNames;
    setWorkTypeIds(nextIds);

    close();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text
          numberOfLines={1}
          style={styles.headerTitle}
        >
          {parentName || "Sub work"}
        </Text>

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

      {!parentCode ? <Text style={styles.errorText}>Invalid work type.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.code}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const isOn = selectedSet.has(item.code);

          return (
            <Pressable
              key={item.code}
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? apStyles.pressed : null,
              ]}
              onPress={() => toggle(item.code)}
            >
              <View style={styles.imageWrap}>
                <Image
                  source={item.image}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>

              <Text style={styles.label} numberOfLines={2}>
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
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: apColors.text,
  },
  closeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
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
