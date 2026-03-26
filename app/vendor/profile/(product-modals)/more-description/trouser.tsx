import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { apStyles } from "@/components/product/addProductStyles";
import { useProductDraft } from "@/components/product/ProductDraftContext";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function TrouserModal() {
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
    "Paired with a matching silk trouser.",
    "Includes a straight trouser with embroidered hem.",
    "Comes with a traditional gharara for a classic look.",
    "Matched with a plain dyed trouser for balance.",
    "Includes a stylish sharara to complete the festive appeal.",
    "Finished with embroidered organza border on the hem.",
    "Comes with a jamawar trouser for a rich traditional finish.",
    "Paired with a tailored grip trouser for modern elegance.",
    "Includes a beautifully stitched flared trouser.",
    "Coordinated bottom enhances the overall silhouette."
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
    if (alreadyPicked.includes(s)) return; // 🔥 FIX
    setPicked((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const pickedCount = useMemo(() => picked.length, [picked]);

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

  function closeModal() {
    router.back();
  }

  const visibleOptions = showMore ? options : primaryOptions;

  return (
    <View style={apStyles.screen}>
      <ScrollView contentContainerStyle={apStyles.content}>
        <View style={[apStyles.headerRow, { alignItems: "center" }]}>
          <Text style={apStyles.title}>Trouser</Text>

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