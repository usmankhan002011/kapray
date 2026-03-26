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

function parseAppendMany(v: unknown): string[] {
  const raw = pickFirstString(v);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((x) => safeStr(x))
    .filter(Boolean);
}

function deriveManualText(fullDescription: string, parts: string[]) {
  let next = safeStr(fullDescription);

  for (const part of parts) {
    const normalizedPart = normalizeSpaces(safeStr(part));
    if (!normalizedPart) continue;

    const normalizedFull = normalizeSpaces(next);
    const idx = normalizedFull.indexOf(normalizedPart);
    if (idx < 0) continue;

    const before = normalizedFull.slice(0, idx).trim();
    const after = normalizedFull.slice(idx + normalizedPart.length).trim();
    next = normalizeSpaces([before, after].filter(Boolean).join(" "));
  }

  return next;
}

function composeDescription(manualText: string, parts: string[]) {
  return normalizeSpaces([safeStr(manualText), ...parts.map((x) => safeStr(x))].filter(Boolean).join(" "));
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
        spec: { ...(prev?.spec ?? {}), ...patch },
      }));
      return;
    }
    draft.spec = { ...(draft?.spec ?? {}), ...patch };
  }

  const initialParts = Array.isArray((draft?.spec as any)?.more_description_parts)
    ? ((draft?.spec as any)?.more_description_parts as string[])
    : [];

  const initialFullText = safeStr((draft?.spec as any)?.more_description ?? "");
  const initialManualText =
    safeStr((draft?.spec as any)?.more_description_manual ?? "") ||
    deriveManualText(initialFullText, initialParts);

  const [manualText, setManualText] = useState<string>(initialManualText);
  const [selectedSentences, setSelectedSentences] = useState<string[]>(initialParts);

  const composedDescription = useMemo(() => {
    return composeDescription(manualText, selectedSentences);
  }, [manualText, selectedSentences]);

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);

  useFocusEffect(
    React.useCallback(() => {
      const toAdd = [...appendMany, ...(appendOne ? [appendOne] : [])]
        .map((x) => safeStr(x))
        .filter(Boolean);

      if (toAdd.length) {
        const latestParts = Array.isArray((draft?.spec as any)?.more_description_parts)
          ? ((draft?.spec as any)?.more_description_parts as string[])
          : [];

        const latestManual =
          safeStr((draft?.spec as any)?.more_description_manual ?? "") ||
          deriveManualText(
            safeStr((draft?.spec as any)?.more_description ?? ""),
            latestParts,
          );

        const uniqueToAdd = toAdd.filter((s) => !latestParts.includes(s));
        const nextParts = uniqueToAdd.length ? [...latestParts, ...uniqueToAdd] : latestParts;
        const nextManual = latestManual;
        const nextFull = composeDescription(nextManual, nextParts);

        setSelectedSentences(nextParts);
        setManualText(nextManual);

        patchSpec({
          more_description_parts: nextParts,
          more_description_manual: safeStr(nextManual),
          more_description: safeStr(nextFull),
        });

        router.replace({
          pathname: "/vendor/profile/add-product/q12-more-description",
          params: returnTo ? { returnTo } : undefined,
        } as any);
      } else {
        const latestParts = Array.isArray((draft?.spec as any)?.more_description_parts)
          ? ((draft?.spec as any)?.more_description_parts as string[])
          : [];

        const latestFull = safeStr((draft?.spec as any)?.more_description ?? "");
        const latestManual =
          safeStr((draft?.spec as any)?.more_description_manual ?? "") ||
          deriveManualText(latestFull, latestParts);

        setSelectedSentences(latestParts);
        setManualText(latestManual);
      }

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appendManyRaw, appendOne, draft, returnTo]),
  );

  function onChangeText(next: string) {
    const cleaned = safeStr(next);
    setManualText(cleaned);

    patchSpec({
      more_description_manual: cleaned,
      more_description_parts: selectedSentences,
      more_description: safeStr(composeDescription(cleaned, selectedSentences)),
    });
  }

  function removeSentenceAt(indexToRemove: number) {
    setSelectedSentences((prev) => {
      const nextParts = prev.filter((_, index) => index !== indexToRemove);

      patchSpec({
        more_description_parts: nextParts,
        more_description_manual: safeStr(manualText),
        more_description: safeStr(composeDescription(manualText, nextParts)),
      });

      return nextParts;
    });
  }

  function clearAllBuilder() {
    setSelectedSentences([]);

    patchSpec({
      more_description_parts: [],
      more_description_manual: safeStr(manualText),
      more_description: safeStr(composeDescription(manualText, [])),
    });
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
        parentReturnTo: returnTo,
      },
    } as any);
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert("Vendor not loaded", "Please ensure vendorSlice has vendor.id.");
      return;
    }

    patchSpec({
      more_description_manual: safeStr(manualText),
      more_description_parts: selectedSentences,
      more_description: safeStr(composedDescription),
    });

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

              {selectedSentences.map((sentence, index) => (
                <View
                  key={`${index}-${sentence}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginTop: 12,
                    padding: 10,
                    backgroundColor: "#FFF5F5",
                    borderRadius: 8,
                  }}
                >
                  <Pressable onPress={() => removeSentenceAt(index)} style={{ marginRight: 8 }}>
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
            value={manualText}
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
              pressed ? apStyles.pressed : null,
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