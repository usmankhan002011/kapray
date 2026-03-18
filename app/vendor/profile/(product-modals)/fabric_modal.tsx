import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getFabricTypes, FabricTypeItem } from "@/utils/supabase/fabricType";
import { useProductDraft } from "@/components/product/ProductDraftContext";

const FABRIC_LOCAL_IMAGES: Record<string, any> = {
  chiffon: require("@/assets/fabric-types-images/CHIFFON.jpg"),
  crepe_chiffon: require("@/assets/fabric-types-images/CREPE_CHIFFON.jpg"),
  silk_chiffon: require("@/assets/fabric-types-images/SILK_CHIFFON.jpg"),

  cotton_silk: require("@/assets/fabric-types-images/COTTON_SILK.jpg"),
  korean_silk: require("@/assets/fabric-types-images/KOREAN_SILK.jpg"),
  satin_silk: require("@/assets/fabric-types-images/SATIN_SILK.jpg"),
  silk: require("@/assets/fabric-types-images/SILK.jpg"),
  silk_velvet: require("@/assets/fabric-types-images/SILK_VELVET.jpg"),
  tissue_silk: require("@/assets/fabric-types-images/TISSUE_SILK.jpg"),

  georgette: require("@/assets/fabric-types-images/GEORGETTE.jpg"),
  jamawar: require("@/assets/fabric-types-images/JAMAWAR.jpg"),
  katan_brocade: require("@/assets/fabric-types-images/KATAN_BROCADE.jpg"),
  net: require("@/assets/fabric-types-images/NET.jpg"),
  organza: require("@/assets/fabric-types-images/ORGANZA.jpg"),
  tissue: require("@/assets/fabric-types-images/TISSUE.jpg"),
  velvet: require("@/assets/fabric-types-images/VELVET.jpg")
};


const GRID_GAP = 8;
const H_PADDING = 12;

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function ProductFabricModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = typeof params?.returnTo === "string" ? params.returnTo : "";

  const { draft, setFabricTypeIds } = useProductDraft();

  const [items, setItems] = useState<FabricTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(draft.spec.fabricTypeIds) ? draft.spec.fabricTypeIds : []
  );

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const itemById = useMemo(() => {
    const m = new Map<string, FabricTypeItem>();
    for (const it of items) m.set(String(it.id), it);
    return m;
  }, [items]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    getFabricTypes()
      .then((res) => {
        if (!alive) return;
        setItems(res ?? []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load fabric types");
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
    (draft.spec as any).fabricTypeNames = [];
    setSelected([]);
    setFabricTypeIds([]);
  }

  function onDone() {
    const pickedNames = selected
      .map((id) => itemById.get(String(id))?.name ?? "")
      .map((s) => safeStr(s))
      .filter(Boolean);

    (draft.spec as any).fabricTypeNames = pickedNames;

    setFabricTypeIds(selected);
    closeToAddProduct();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={closeToAddProduct}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Close</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Fabric</Text>

        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.headerBtnText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subText}>Select one or more fabric types.</Text>

        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
      </View>

      {/* <Text style={styles.heading}>Select Fabric Type</Text> */}

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
          const localImg = FABRIC_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

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
    color: stylesVars.text,
    textAlign: "center",
    fontWeight: "700",
    lineHeight: 18
  },

  pressed: {
    opacity: 0.82
  }
});