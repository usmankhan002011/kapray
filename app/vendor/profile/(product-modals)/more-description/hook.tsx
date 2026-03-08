import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { apStyles } from "@/components/product/addProductStyles";
import { useProductDraft } from "@/components/product/ProductDraftContext";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function HookModal() {
  const router = useRouter();
  const ctx = useProductDraft() as any;
  const { draft } = ctx;

  function patchSpec(patch: any) {
    if (typeof ctx.setSpec === "function") {
      ctx.setSpec((prev: any) => ({ ...(prev ?? {}), ...patch }));
      return;
    }
    if (typeof ctx.setDraft === "function") {
      ctx.setDraft((prev: any) => ({
        ...prev,
        spec: { ...(prev?.spec ?? {}), ...patch }
      }));
      return;
    }
    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

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

  const alreadyPicked: string[] = useMemo(() => {
    const parts = (draft?.spec as any)?.more_description_parts;
    return Array.isArray(parts) ? parts : [];
  }, [draft?.spec]);

  const [picked, setPicked] = useState<string[]>([]);

  function toggle(s: string) {
    setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function addSelected() {
    if (!picked.length) return;

    const parts = Array.isArray((draft?.spec as any)?.more_description_parts)
      ? (draft?.spec as any)?.more_description_parts
      : [];
    const text = safeStr((draft?.spec as any)?.more_description ?? "");

    const uniqueToAdd = picked.filter((s) => !parts.includes(s));
    const nextParts = uniqueToAdd.length ? [...parts, ...uniqueToAdd] : parts;

    const nextText = uniqueToAdd.length
      ? normalizeSpaces(text ? `${text} ${uniqueToAdd.join(" ")}` : uniqueToAdd.join(" "))
      : text;

    patchSpec({
      more_description_parts: nextParts,
      more_description: nextText
    });

    setPicked([]);
  }

  function done() {
    router.back();
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView contentContainerStyle={apStyles.content}>
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Luxury Hook</Text>

          <Pressable
            onPress={done}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Done</Text>
          </Pressable>
        </View>

        <Text style={apStyles.metaHint}>
          Tap to select multiple. Press “Add selected” to append into More description.
        </Text>

        {options.map((o) => {
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

        <Pressable
          onPress={addSelected}
          style={({ pressed }) => [
            apStyles.primaryBtn,
            !picked.length ? apStyles.primaryBtnDisabled : null,
            pressed ? apStyles.pressed : null,
            { marginTop: 16 }
          ]}
          disabled={!picked.length}
        >
          <Text style={apStyles.primaryText}>Add selected</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!picked.length) {
              done();
              return;
            }
            Alert.alert("Selections not added", "Press “Add selected” first, then Done.");
          }}
          style={({ pressed }) => [apStyles.secondaryBtn, pressed ? apStyles.pressed : null]}
        >
          <Text style={apStyles.secondaryText}>Close without adding</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}