import React, { useMemo, useState } from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { generateDyePalette } from "@/utils/kapray/dyePalette";

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

function getShadeColumnIndex(shade: Shade) {
  const match = /^shade_(\d+)_\d+$/i.exec(String(shade.id));
  return match ? Number(match[1]) : 0;
}

function getShadeCode(shade: Shade) {
  const match = /^shade_(\d+)_(\d+)$/i.exec(String(shade.id));
  if (!match) return "";
  const column = String(Number(match[1]) + 1).padStart(2, "0");
  const row = String(Number(match[2]) + 1).padStart(2, "0");
  return `Dye-C${column}-R${row}`;
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
  const shadeColumns = useMemo(() => {
    const columns: Shade[][] = [];
    shades.forEach((shade) => {
      const index = getShadeColumnIndex(shade);
      if (!columns[index]) columns[index] = [];
      columns[index].push(shade);
    });
    return columns.filter(Boolean);
  }, [shades]);
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
      label: getShadeCode(selectedShade) || String(selectedShade.label ?? "")
    });

    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ alignItems: "center", flexShrink: 0 }}>
            <Text
              style={{
                height: 18,
                color: "#999",
                fontSize: 9,
                fontWeight: "900",
                textAlign: "center"
              }}
            >
              R
            </Text>
            {(shadeColumns[0] ?? []).map((shade, rowIndex) => (
              <Text
                key={`row_${shade.id}`}
                style={{
                  width: 20,
                  height: 30,
                  color: "#999",
                  fontSize: 8,
                  lineHeight: 30,
                  fontWeight: "800",
                  textAlign: "center"
                }}
              >
                {String(rowIndex + 1).padStart(2, "0")}
              </Text>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {shadeColumns.map((column, columnIndex) => (
              <View key={`column_wrap_${columnIndex}`}>
                <Text
                  style={{
                    height: 18,
                    color: "#999",
                    fontSize: 9,
                    fontWeight: "900",
                    textAlign: "center"
                  }}
                >
                  C{String(columnIndex + 1).padStart(2, "0")}
                </Text>
                <View
                  key={`column_${columnIndex}`}
                  style={{
                    width: 48,
                    borderRadius: 12,
                    overflow: "hidden",
                    backgroundColor: "#111"
                  }}
                >
                  {column.map((shade) => {
                    const isOn = (selectedShade?.id ?? "") === String(shade.id);
                    return (
                      <Pressable
                        key={shade.id}
                        onPress={() => setSelectedId(String(shade.id))}
                        style={{
                          height: 30,
                          backgroundColor: shade.hex,
                          borderWidth: isOn ? 3 : 0,
                          borderColor: "#FFF"
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={{ padding: 16, backgroundColor: "#000" }}>
        {selectedShade ? (
          <View
            style={{
              alignSelf: "center",
              width: 96,
              height: 54,
              borderRadius: 14,
              backgroundColor: selectedShade.hex,
              borderWidth: 2,
              borderColor: "#FFF",
              marginBottom: 12
            }}
          />
        ) : null}

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
