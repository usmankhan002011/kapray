import React, { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";

function safeInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function pickFirstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0].trim() || null;
  return null;
}

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function removeFirstOccurrence(full: string, part: string) {
  const a = normalizeSpaces(full);
  const b = normalizeSpaces(part);
  if (!a || !b) return full;

  const idx = a.indexOf(b);
  if (idx < 0) return full;

  const before = a.slice(0, idx).trim();
  const after = a.slice(idx + b.length).trim();
  return normalizeSpaces([before, after].filter(Boolean).join(" "));
}

function parseAppendMany(v: unknown): string[] {
  const raw = pickFirstString(v);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((x) => safeStr(x))
    .filter(Boolean);
}

export default function Q12MoreDescription() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);

  const returnTo = pickFirstString((params as any)?.returnTo) ?? "";

  const appendOne = pickFirstString((params as any)?.append);
  const appendManyRaw = pickFirstString((params as any)?.appendMany);
  const appendMany = parseAppendMany((params as any)?.appendMany);

  const vendorIdRaw =
    useAppSelector((s: any) => s?.vendorSlice?.vendor?.id ?? null) ??
    useAppSelector((s: any) => s?.vendor?.id ?? null);
  const vendorId = safeInt(vendorIdRaw);

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

  const [text, setText] = useState<string>(safeStr((draft?.spec as any)?.more_description ?? ""));
  const [selectedSentences, setSelectedSentences] = useState<string[]>(
    Array.isArray((draft?.spec as any)?.more_description_parts)
      ? (draft?.spec as any)?.more_description_parts
      : []
  );

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);

  useFocusEffect(
    React.useCallback(() => {
      const toAdd = [...appendMany, ...(appendOne ? [appendOne] : [])]
        .map((x) => safeStr(x))
        .filter(Boolean);

      if (toAdd.length) {
        const parts = Array.isArray((draft?.spec as any)?.more_description_parts)
          ? (draft?.spec as any)?.more_description_parts
          : [];
        const currentText = safeStr((draft?.spec as any)?.more_description ?? "");

        const uniqueToAdd = toAdd.filter((s) => !parts.includes(s));
        const nextParts = uniqueToAdd.length ? [...parts, ...uniqueToAdd] : parts;

        const nextText = uniqueToAdd.length
          ? normalizeSpaces(
              currentText ? `${currentText} ${uniqueToAdd.join(" ")}` : uniqueToAdd.join(" ")
            )
          : currentText;

        patchSpec({
          more_description_parts: nextParts,
          more_description: safeStr(nextText)
        });

        setSelectedSentences(nextParts);
        setText(nextText);

        router.replace({
          pathname: "/vendor/profile/add-product/q12-more-description",
          params: returnTo ? { returnTo } : undefined
        } as any);
      } else {
        const latestText = safeStr((draft?.spec as any)?.more_description ?? "");
        const latestParts = Array.isArray((draft?.spec as any)?.more_description_parts)
          ? (draft?.spec as any)?.more_description_parts
          : [];

        setText(latestText);
        setSelectedSentences(latestParts);
      }

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }, [appendManyRaw, appendOne, returnTo])
  );

  function onChangeText(next: string) {
    const cleaned = safeStr(next);
    setText(cleaned);
    patchSpec({ more_description: cleaned });
  }

  function removeSentence(sentence: string) {
    const nextParts = selectedSentences.filter((s) => s !== sentence);
    setSelectedSentences(nextParts);
    patchSpec({ more_description_parts: nextParts });

    const nextText = removeFirstOccurrence(text, sentence);
    setText(nextText);
    patchSpec({ more_description: safeStr(nextText) });
  }

  function clearAllBuilder() {
    const toRemove = selectedSentences.slice();

    setSelectedSentences([]);
    patchSpec({ more_description_parts: [] });

    let nextText = text;
    for (const s of toRemove) {
      nextText = removeFirstOccurrence(nextText, s);
    }

    setText(nextText);
    patchSpec({ more_description: safeStr(nextText) });
  }

  function closeScreen() {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.back();
  }

  function openBuilder() {
    router.push({
      pathname: "/vendor/profile/(product-modals)/more-description",
      params: {
        q12Path: "/vendor/profile/add-product/q12-more-description",
        parentReturnTo: returnTo
      }
    } as any);
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    patchSpec({ more_description: safeStr(text) });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    router.push("/vendor/profile/add-product/review" as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={apStyles.screen}
        contentContainerStyle={apStyles.content}
      >
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>More description</Text>

          <Pressable
            onPress={closeScreen}
            style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={apStyles.card}>
          <Text style={apStyles.label}>Build Description</Text>

          <Pressable
            onPress={openBuilder}
            style={({ pressed }) => [apStyles.secondaryBtn, pressed ? apStyles.pressed : null]}
          >
            <Text style={apStyles.secondaryText}>Open Builder</Text>
          </Pressable>

          {selectedSentences.length ? (
            <View style={{ marginTop: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={apStyles.metaHint}>Tap ✕ to remove a builder sentence.</Text>

                <Pressable
                  onPress={clearAllBuilder}
                  style={({ pressed }) => [apStyles.linkBtn, pressed ? apStyles.pressed : null]}
                >
                  <Text style={apStyles.linkText}>Clear builder list</Text>
                </Pressable>
              </View>

              {selectedSentences.map((sentence) => (
                <View
                  key={sentence}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginTop: 12,
                    padding: 10,
                    backgroundColor: "#FFF5F5",
                    borderRadius: 8
                  }}
                >
                  <Pressable onPress={() => removeSentence(sentence)} style={{ marginRight: 8 }}>
                    <Text style={{ color: "red", fontWeight: "bold" }}>✕</Text>
                  </Pressable>

                  <Text style={{ flex: 1 }}>{sentence}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={[apStyles.label, { marginTop: 20 }]}>More description (optional)</Text>

          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={onChangeText}
            placeholder="Write additional details…"
            placeholderTextColor={apColors.muted}
            style={[apStyles.input, { minHeight: 120, marginTop: 10 }]}
            multiline
            maxLength={800}
          />

          <Pressable
            style={({ pressed }) => [
              apStyles.primaryBtn,
              !canContinue ? apStyles.primaryBtnDisabled : null,
              pressed ? apStyles.pressed : null
            ]}
            onPress={onContinue}
            disabled={!canContinue}
          >
            <Text style={apStyles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}