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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearFabricTypes, toggleFabricType } from "@/store/filtersSlice";
import StandardFilterDisplay from "@/components/ui/StandardFilterDisplay";

const FABRIC_LOCAL_IMAGES: Record<string, any> = {
  chiffon: require("@/assets/fabric-types-images/CHIFFON.jpg"),
  georgette: require("@/assets/fabric-types-images/GEORGETTE.jpg"),
  jamawar: require("@/assets/fabric-types-images/JAMAWAR.jpg"),
  net: require("@/assets/fabric-types-images/NET.jpg"),
  organza: require("@/assets/fabric-types-images/ORGANZA.jpg"),
  silk: require("@/assets/fabric-types-images/SILK.jpg"),
  tissue: require("@/assets/fabric-types-images/TISSUE.jpg"),
  velvet: require("@/assets/fabric-types-images/VELVET.jpg")
};

const GRID_GAP = 8;
const H_PADDING = 12;

export default function FabricScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  const selected = useAppSelector((s) => s.filters.fabricTypeIds);
  const dressTypeId = useAppSelector((s) => s.filters.dressTypeId);

  const [items, setItems] = useState<FabricTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const from = String((params as any)?.from ?? "").trim();
  const fromResultsFilters = from === "results-filters";

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

  return (
    <StandardFilterDisplay
      title={`Fabric Type${dressTypeId ? "" : " (Dress type not set)"}`}
      onBack={() => router.back()}
      onAny={() => dispatch(clearFabricTypes())}
      onNext={() => (fromResultsFilters ? router.back() : router.push("/color"))}
    >
      <Text style={styles.heading}>Select Fabric Type</Text>

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
            FABRIC_LOCAL_IMAGES[(item.code ?? "").toLowerCase()];

          return (
            <Pressable
              key={item.id}
              style={[styles.card, isOn ? styles.cardSelected : null]}
              onPress={() => dispatch(toggleFabricType(item.id))}
            >
              <View style={styles.imageWrap}>
                {localImg ? (
                  <Image
                    source={localImg}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : null}
              </View>

              <Text style={styles.label} numberOfLines={1}>
                {item.name} {isOn ? "✓" : ""}
              </Text>
            </Pressable>
          );
        }}
      />
    </StandardFilterDisplay>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111"
  },
  infoText: {
    color: "#111",
    marginBottom: 6
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
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 6
  },
  cardSelected: {
    borderColor: "#111"
  },

  imageWrap: {
    width: "100%",
    height: 96,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#eee",
    marginBottom: 6
  },
  image: {
    width: "100%",
    height: 96
  },

  label: {
    fontSize: 13,
    color: "#111",
    textAlign: "center"
  }
});
