import React, { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setWorkSubTypesForParent } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";
import {
  getWorkSubTypes,
  isWorkParentCode,
  WorkSubTypeItem,
} from "@/data/workSubTypes";

const GRID_GAP = 10;
const H_PADDING = 16;

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function firstParam(v: unknown) {
  if (typeof v === "string") return safeStr(v);
  if (Array.isArray(v)) return safeStr(v[0]);
  return "";
}

export default function WorkSubtypesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const parentId = firstParam((params as any)?.parentId);
  const parentCodeRaw = firstParam((params as any)?.parentCode).toLowerCase();
  const parentName = firstParam((params as any)?.parentName) || "Work";

  const parentCode = isWorkParentCode(parentCodeRaw) ? parentCodeRaw : null;
  const items: WorkSubTypeItem[] = parentCode ? getWorkSubTypes(parentCode) : [];

  const existingMap = useAppSelector(
    (s: any) => s.filters?.workSubTypeMap ?? {},
  );
  const initialSelected =
    parentCode && Array.isArray(existingMap?.[parentCode])
      ? existingMap[parentCode]
      : [];

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  function onDone() {
    if (!parentCode || !parentId) {
      router.back();
      return;
    }

    dispatch(
      setWorkSubTypesForParent({
        parentId,
        parentCode,
        subTypeCodes: selected,
      }),
    );
    router.back();
  }

  return (
    <StandardFilterDisplay
      title={parentName}
      onBack={() => router.back()}
      onAny={() => setSelected([])}
      onNext={onDone}
      anyLabel="Clear"
      nextLabel="Done"
    >
      {!parentCode ? <Text style={styles.infoText}>Invalid work.</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.code}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        renderItem={({ item }) => {
          const isOn = selectedSet.has(item.code);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              key={item.code}
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardSelected : null,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => toggle(item.code)}
            >
              <View style={styles.imageWrap}>
                <Image source={item.image} style={styles.image} resizeMode="cover" />
              </View>

              <Text
                style={[styles.label, isOn ? styles.labelOn : null]}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              {isOn ? (
                <View style={styles.check}>
                  <MaterialIcons name="check" size={14} color={apColors.white} />
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  infoText: {
    marginHorizontal: H_PADDING,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    color: apColors.danger,
    fontWeight: "600",
    fontFamily: apFontFamily,
  },

  listContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: 16,
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
  },

  cardSelected: {
    borderColor: "#D7E3FF",
    backgroundColor: apColors.blueSoft,
  },

  imageWrap: {
    width: "100%",
    height: 96,
    borderRadius: apRadii.card,
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
    fontFamily: apFontFamily,
  },

  labelOn: {
    color: apColors.blue,
  },

  check: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: apRadii.pill,
    backgroundColor: apColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.82,
  },
});
