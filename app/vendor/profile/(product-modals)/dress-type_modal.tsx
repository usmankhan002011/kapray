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
import { getDressTypes, DressTypeItem } from "@/utils/supabase/dressType";

type DressTypeOption = {
  key: string;
  label: string;
  code: string;
};

const DRESS_TYPE_LOCAL_IMAGES: Record<string, any> = {
  lehnga_set: require("@/assets/dress-types-images/LEHNGA_SET.png"),
  maxi_gown: require("@/assets/dress-types-images/MAXI_GOWN.png"),
  peshwas_frock: require("@/assets/dress-types-images/PESHWAS_FROCK.png"),
  saree: require("@/assets/dress-types-images/SAREE.png"),
  sharara: require("@/assets/dress-types-images/SHARARA.png"),
  shirt_and_bottom_set: require("@/assets/dress-types-images/SHIRT_AND_BOTTOM_SET.png"),
  dupatta: require("@/assets/dress-types-images/DUPATTA.png"),
  farchi_lehnga: require("@/assets/dress-types-images/FARCHI_LEHNGA.png"),
  gharara: require("@/assets/dress-types-images/GHARARA.png"),
  blouse: require("@/assets/dress-types-images/BLOUSE.png"),
};

const GRID_GAP = 8;
const H_PADDING = 12;
const IMAGE_H = 118;

const DISPLAY_LABEL_BY_CODE: Record<string, string> = {
  gharara: "Gharara Set",
  sharara: "Sharara Set",
  peshwas_frock: "Peshwas Frock Set",
  maxi_gown: "Maxi Gown Set",
  farchi_lehnga: "Farshi Lehnga Set",
};

function displayLabelFor(type: DressTypeItem) {
  const code = String(type.code ?? "");
  return DISPLAY_LABEL_BY_CODE[code] ?? String(type.name ?? "");
}

export default function ProductDressTypeModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const { draft, setDressTypeIds } = useProductDraft();

  const [options, setOptions] = useState<DressTypeOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<string[]>(
    (draft.spec.dressTypeIds ?? []).map((x) => String(x)),
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const labelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(o.key, o.label);
    return m;
  }, [options]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    getDressTypes()
      .then((types: DressTypeItem[]) => {
        if (!alive) return;

        const mapped: DressTypeOption[] =
          (types ?? []).map((type) => ({
            key: String(type.id),
            label: displayLabelFor(type),
            code: String(type.code ?? ""),
          })) ?? [];

        setOptions(mapped);
      })
      .catch(() => {
        if (!alive) return;
        setOptions([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  function closeToAddProduct() {
    closeProductModal(router, returnTo);
  }

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  }

  function onDone() {
    const ids = selected.map((k) => String(k).trim()).filter(Boolean);

    const pickedNames = selected
      .map((k) => labelByKey.get(k) ?? "")
      .map((s) => String(s).trim())
      .filter(Boolean);

    (draft.spec as any).dressTypeNames = pickedNames;

    setDressTypeIds(ids);
    closeToAddProduct();
  }

  function onClear() {
    (draft.spec as any).dressTypeNames = [];
    setSelected([]);
    setDressTypeIds([]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dress type</Text>

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

      {loading ? <Text style={styles.infoText}>Loading dress types...</Text> : null}

      <FlatList
        data={options}
        keyExtractor={(item) => item.key}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrap}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No dress types found.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isOn = selectedSet.has(item.key);
          const localImage = DRESS_TYPE_LOCAL_IMAGES[item.code] ?? null;

          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.card,
                isOn ? styles.cardOn : null,
                pressed ? apStyles.pressed : null,
              ]}
              onPress={() => toggle(item.key)}
            >
              <View style={styles.imageWrap}>
                {localImage ? (
                  <Image
                    source={localImage}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>No image</Text>
                  </View>
                )}
              </View>

              <Text style={styles.label} numberOfLines={2}>
                {item.label}
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
  cardOn: {
    borderColor: apColors.blue,
    backgroundColor: apColors.blueSoft,
  },
  imageWrap: {
    width: "100%",
    height: IMAGE_H,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: IMAGE_H,
  },
  imageFallback: {
    width: "100%",
    height: IMAGE_H,
    alignItems: "center",
    justifyContent: "center",
  },
  imageFallbackText: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  label: {
    minHeight: 34,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    color: apColors.text,
    textAlign: "center",
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
