// app/vendor/profile/(product-modals)/dyeing/dye_palette_modal.tsx

import React, { useMemo, useState } from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { generateDyePalette } from "./palette";

type Shade = {
  id: string;
  hex: string;
  label?: string;
};

export default function DyePaletteModal() {
  const shades = useMemo(() => generateDyePalette() as Shade[], []);
  const [selectedId, setSelectedId] = useState<string>("");

  const params = useLocalSearchParams<{
    // ✅ NEW: robust return mechanism
    returnPath?: string;
    productId?: string;

    // keep passthrough if you still pass it
    dyeing_cost_pkr?: string;

    // optional preselected (if you pass these)
    dye_shade_id?: string;
  }>();

  const selectedShade = useMemo(() => {
    const id = selectedId || String(params.dye_shade_id ?? "").trim();
    if (!id) return null;
    return shades.find((s) => String(s.id) === id) ?? null;
  }, [selectedId, params.dye_shade_id, shades]);

  function handleDone() {
    if (!selectedShade) return;

    const returnPath = String(params.returnPath ?? "/").trim() || "/";
    const productId = String(params.productId ?? "").trim();

    router.replace({
      pathname: returnPath as any,
      params: {
        // ✅ critical: keep id clean (bigint safe)
        ...(productId ? { id: productId } : {}),

        // ✅ match what view-product expects
        dye_shade_id: String(selectedShade.id),

        // NOTE: view-product currently reads dye_hex too; we keep passing it,
        // but you can stop displaying it on the screen by preferring label.
        dye_hex: String(selectedShade.hex),

        // ✅ friendly label (not hex)
        dye_label: String(selectedShade.label ?? selectedShade.id),

        // keep passing cost through
        dyeing_cost_pkr: String(params.dyeing_cost_pkr ?? "")
      }
    });
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