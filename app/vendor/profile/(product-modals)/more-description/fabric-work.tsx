import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apStyles } from "@/components/product/addProductStyles";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function FabricWorkModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const q12Path = safeStr((params as any)?.q12Path) || "/vendor/profile/add-product/q12-more-description";
  const parentReturnTo = safeStr((params as any)?.parentReturnTo);

  const options = [
    "The shirt features detailed embroidery with fine craftsmanship.",
    "Intricate zari, dabka and sequin work enhances its luxurious appeal.",
    "Fully embroidered front with delicate hand embellishments.",
    "Premium fabric base with rich traditional artistry.",
    "Adorned with heavy thread and sequin embroidery throughout.",
    "Beautifully embellished neckline with pearls and crystal accents.",
    "Fine resham embroidery adds depth and texture to the design.",
    "Enhanced with traditional zardozi and nakshi detailing.",
    "Delicate spray work on the back complements the ornate front.",
    "Handcrafted embellishments reflect superior finishing quality.",
    "Expertly designed panels with intricate embroidery patterns.",
    "Embellished sleeves add extra elegance to the overall look."
  ];

  // Show fewer by default so it fits one screen
  const primaryOptions = options.slice(0, 7);
  const extraOptions = options.slice(7);

  const [picked, setPicked] = useState<string[]>([]);
  const [showMore, setShowMore] = useState<boolean>(false);

  function toggle(s: string) {
    setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const pickedCount = useMemo(() => picked.length, [picked]);

  function addSelected() {
    if (!picked.length) return;

    const payload = {
      pathname: q12Path as any,
      params: parentReturnTo
        ? { appendMany: picked.join("\n"), returnTo: parentReturnTo }
        : { appendMany: picked.join("\n") }
    } as any;

    router.push(payload);
  }

  function closeModal() {
    router.back();
  }

  const visibleOptions = showMore ? options : primaryOptions;

  return (
    <View style={apStyles.screen}>
      <ScrollView contentContainerStyle={apStyles.content}>
        <View style={[apStyles.headerRow, { alignItems: "center" }]}>
          <Text style={apStyles.title}>Fabric & Work</Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable
              onPress={addSelected}
              disabled={!pickedCount}
              style={({ pressed }) => [
                apStyles.linkBtn,
                !pickedCount ? { opacity: 0.5 } : null,
                pressed ? apStyles.pressed : null
              ]}
            >
              <Text style={apStyles.linkText}>Add ({pickedCount})</Text>
            </Pressable>

            <Pressable
              onPress={closeModal}
              style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
            >
              <Text style={apStyles.linkText}>Close</Text>
            </Pressable>
          </View>
        </View>

        <Text style={apStyles.metaHint}>Tap to select multiple, then press Add.</Text>

        {visibleOptions.map((o) => {
          const isPicked = picked.includes(o);

          return (
            <Pressable
              key={o}
              onPress={() => toggle(o)}
              style={[apStyles.card, isPicked ? { borderWidth: 1, borderColor: "#111" } : null]}
            >
              <Text style={apStyles.label}>
                {isPicked ? "✓ " : ""}
                {o}
              </Text>
            </Pressable>
          );
        })}

        {extraOptions.length ? (
          <Pressable
            onPress={() => setShowMore((v) => !v)}
            style={({ pressed }) => [apStyles.secondaryBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.secondaryText}>{showMore ? "Show less" : "Show more"}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}