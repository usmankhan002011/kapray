import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apStyles } from "@/components/product/addProductStyles";
import { useProductDraft } from "@/components/product/ProductDraftContext";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function HookModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draft } = useProductDraft() as any;

  const q12Path = safeStr((params as any)?.q12Path) || "/vendor/profile/add-product/q12-more-description";
  const parentReturnTo = safeStr((params as any)?.parentReturnTo);

  const options = [
    "This stunning ensemble is beautifully adorned with intricate detailing.",
    "A breathtaking outfit crafted for timeless elegance.",
    "Step into sophistication with this exquisitely designed attire.",
    "An epitome of grace and luxury for modern women.",
    "This elegant masterpiece reflects refined craftsmanship and premium finishing.",
    "Designed to make you stand out at every special occasion.",
    "A luxurious creation that blends tradition with contemporary charm.",
    "Experience unmatched elegance with this beautifully curated outfit.",
    "A graceful attire that captures the essence of festive glamour.",
    "This captivating design is tailored for women who appreciate fine artistry.",
    "Elevate your formal wardrobe with this statement ensemble.",
    "A regal design inspired by classic bridal aesthetics."
  ];

  const primaryOptions = options.slice(0, 7);
  const extraOptions = options.slice(7);

  const alreadyPicked: string[] = useMemo(() => {
    const parts = (draft?.spec as any)?.more_description_parts;
    return Array.isArray(parts) ? parts : [];
  }, [draft?.spec]);

  const [picked, setPicked] = useState<string[]>([]);
  const [showMore, setShowMore] = useState<boolean>(false);

  function toggle(s: string) {
    if (alreadyPicked.includes(s)) return;
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
          <Text style={apStyles.title}>Luxury Hook</Text>

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
          const isAlready = alreadyPicked.includes(o);

          return (
            <Pressable
              key={o}
              onPress={() => toggle(o)}
              style={[
                apStyles.card,
                isPicked ? { borderWidth: 1, borderColor: "#111" } : null,
                isAlready ? { opacity: 0.55 } : null
              ]}
            >
              <Text style={apStyles.label}>
                {isPicked ? "✓ " : ""}
                {o}
              </Text>
              {isAlready ? <Text style={apStyles.metaHint}>Already added</Text> : null}
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