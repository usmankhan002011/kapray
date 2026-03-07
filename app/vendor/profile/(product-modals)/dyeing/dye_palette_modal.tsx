import React, { useMemo, useState } from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { generateDyePalette } from "./palette";

type Shade = {
  id: string;
  hex: string;
  label?: string;
};

type CachedDyeSelection = {
  id: string;
  hex: string;
  label: string;
};

const BUYER_DYE_SELECTION_CACHE = new Map<string, CachedDyeSelection>();

function makeDyeSelectionKey(productId?: string | null, productCode?: string | null) {
  const pid = String(productId ?? "").trim();
  if (pid) return `id:${pid}`;

  const pc = String(productCode ?? "").trim();
  if (pc) return `code:${pc}`;

  return "";
}

export function getCachedDyeSelection(productId?: string | null, productCode?: string | null) {
  const key = makeDyeSelectionKey(productId, productCode);
  if (!key) return null;
  return BUYER_DYE_SELECTION_CACHE.get(key) ?? null;
}

export function clearCachedDyeSelection(productId?: string | null, productCode?: string | null) {
  const key = makeDyeSelectionKey(productId, productCode);
  if (!key) return;
  BUYER_DYE_SELECTION_CACHE.delete(key);
}

function setCachedDyeSelection(
  productId: string | null | undefined,
  productCode: string | null | undefined,
  selection: CachedDyeSelection
) {
  const key = makeDyeSelectionKey(productId, productCode);
  if (!key) return;
  BUYER_DYE_SELECTION_CACHE.set(key, selection);
}

export default function DyePaletteModal() {
  const shades = useMemo(() => generateDyePalette() as Shade[], []);
  const [selectedId, setSelectedId] = useState<string>("");

  const params = useLocalSearchParams<{
    returnPath?: string;
    productId?: string;
    productCode?: string;
    dyeing_cost_pkr?: string;
    dye_shade_id?: string;
  }>();

  const selectedShade = useMemo(() => {
    const id = selectedId || String(params.dye_shade_id ?? "").trim();
    if (!id) return null;
    return shades.find((s) => String(s.id) === id) ?? null;
  }, [selectedId, params.dye_shade_id, shades]);

  function handleDone() {
    if (!selectedShade) return;

    const productId = String(params.productId ?? "").trim() || null;
    const productCode = String(params.productCode ?? "").trim() || null;

    setCachedDyeSelection(productId, productCode, {
      id: String(selectedShade.id),
      hex: String(selectedShade.hex),
      label: String(selectedShade.label ?? selectedShade.id)
    });

    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ padding: 0 }}>
        {shades.map((shade) => {
          const isOn = (selectedShade?.id ?? "") === String(shade.id);
          return (
            <Pressable
              key={shade.id}
              onPress={() => setSelectedId(String(shade.id))}
              style={{
                height: 60,
                backgroundColor: shade.hex,
                borderWidth: isOn ? 3 : 0,
                borderColor: "#FFF"
              }}
            />
          );
        })}
      </ScrollView>

      <View style={{ padding: 16, backgroundColor: "#000" }}>
        <Text
          style={{
            color: "#ccc",
            fontSize: 12,
            marginBottom: 12,
            textAlign: "center"
          }}
        >
          Custom dyed items are final sale. Shade may vary slightly due to fabric and dye batch.
        </Text>

        <Pressable
          onPress={handleDone}
          disabled={!selectedShade}
          style={{
            backgroundColor: selectedShade ? "#FFF" : "#555",
            padding: 14,
            borderRadius: 8
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "bold",
              color: selectedShade ? "#000" : "#999"
            }}
          >
            Confirm Shade
          </Text>
        </Pressable>
      </View>
    </View>
  );
}