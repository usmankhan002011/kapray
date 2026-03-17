import React, { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import {
  flattenWorkSubTypeNames,
  getWorkSubTypes,
  isWorkParentCode,
  WorkSubTypeItem
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
    parentCode && Array.isArray(existingMap[parentCode]) ? existingMap[parentCode] : [];

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
    setSelected((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
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

    const currentIds = Array.isArray(draft?.spec?.workTypeIds) ? [...draft.spec.workTypeIds] : [];
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
        <Pressable
          onPress={close}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>{parentName || "Sub Work"}</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more sub work types.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      {!parentCode ? <Text style={styles.infoText}>Invalid work type.</Text> : null}

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
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => toggle(item.code)}
            >
              <View style={styles.imageWrap}>
                <Image source={item.image} style={styles.image} resizeMode="cover" />
              </View>

              <Text style={styles.label}>
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
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  white: "#FFFFFF"
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

  label: {
    fontSize: 13,
    lineHeight: 18,
    color: stylesVars.text,
    textAlign: "center",
    fontWeight: "700"
  },

  pressed: {
    opacity: 0.82
  }
});