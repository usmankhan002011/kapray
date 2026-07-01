import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import {
  AddProductCard,
  AddProductField,
  AddProductFooter,
  AddProductInput,
  AddProductSecondaryButton,
  AddProductScreen,
} from "@/components/product/add-product/AddProductWizard";

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

  const category = safeStr((draft?.spec as any)?.product_category ?? "");
  const needsTailoring = category === "unstitched_dyeing_tailoring";

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

  const [text, setText] = useState<string>(
    safeStr((draft?.spec as any)?.more_description ?? ""),
  );
  const [selectedSentences, setSelectedSentences] = useState<string[]>(
    Array.isArray((draft?.spec as any)?.more_description_parts)
      ? (draft?.spec as any)?.more_description_parts
      : [],
  );

  const canContinue = useMemo(() => Boolean(vendorId), [vendorId]);
  const disabledHint = !vendorId ? "Vendor not loaded." : "";

  useFocusEffect(
    React.useCallback(() => {
      const toAdd = [...appendMany, ...(appendOne ? [appendOne] : [])]
        .map((x) => safeStr(x))
        .filter(Boolean);

      if (toAdd.length) {
        const parts = Array.isArray(
          (draft?.spec as any)?.more_description_parts,
        )
          ? (draft?.spec as any)?.more_description_parts
          : [];
        const currentText = safeStr(
          (draft?.spec as any)?.more_description ?? "",
        );

        const uniqueToAdd = toAdd.filter((s) => !parts.includes(s));
        const nextParts = uniqueToAdd.length
          ? [...parts, ...uniqueToAdd]
          : parts;

        const nextText = uniqueToAdd.length
          ? normalizeSpaces(
              currentText
                ? `${currentText} ${uniqueToAdd.join(" ")}`
                : uniqueToAdd.join(" "),
            )
          : currentText;

        patchSpec({
          more_description_parts: nextParts,
          more_description: safeStr(nextText),
        });

        setSelectedSentences(nextParts);
        setText(nextText);

        router.replace({
          pathname: "/vendor/profile/add-product/q12-more-description",
          params: returnTo ? { returnTo } : undefined,
        } as any);
      } else {
        const latestText = safeStr(
          (draft?.spec as any)?.more_description ?? "",
        );
        const latestParts = Array.isArray(
          (draft?.spec as any)?.more_description_parts,
        )
          ? (draft?.spec as any)?.more_description_parts
          : [];

        setText(latestText);
        setSelectedSentences(latestParts);
      }

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }, [appendManyRaw, appendOne, returnTo]),
  );

  function onChangeText(next: string) {
    setText(next);
    patchSpec({ more_description: next });
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
        parentReturnTo: returnTo,
      },
    } as any);
  }

  function onContinue() {
    if (!vendorId) {
      Alert.alert(
        "Vendor not loaded",
        "Please ensure vendorSlice has vendor.id.",
      );
      return;
    }

    patchSpec({ more_description: safeStr(text) });

    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }

    if (needsTailoring) {
      router.push(
        "/vendor/profile/add-product/q06b2-tailoring-styles" as any,
      );
      return;
    }

    router.push("/vendor/profile/add-product/review" as any);
  }

  return (
    <AddProductScreen
      title="More description"
      onBack={closeScreen}
      footer={
        <AddProductFooter
          onPrimaryPress={onContinue}
          primaryDisabled={!canContinue}
          disabledHint={disabledHint}
        />
      }
    >
      <AddProductCard>
        <View style={styles.builderTop}>
          <Text style={apStyles.label}>Builder</Text>
          <AddProductSecondaryButton
            label="Open"
            onPress={openBuilder}
            style={styles.openBuilderButton}
          />
        </View>

        {selectedSentences.length ? (
          <View style={styles.builderBlock}>
            <View style={styles.builderHeader}>
              <Text style={styles.builderCount}>
                {selectedSentences.length} added
              </Text>

              <Pressable
                onPress={clearAllBuilder}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed ? apStyles.pressed : null,
                ]}
              >
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>

            {selectedSentences.map((sentence) => (
              <View
                key={sentence}
                style={styles.sentenceRow}
              >
                <Text style={styles.sentenceText}>{sentence}</Text>

                <Pressable
                  onPress={() => removeSentence(sentence)}
                  style={({ pressed }) => [
                    styles.removeSentenceBtn,
                    pressed ? apStyles.pressed : null,
                  ]}
                  hitSlop={8}
                >
                  <Text style={styles.removeSentenceText}>X</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <AddProductField label="Details" style={styles.detailsField}>
          <AddProductInput
            ref={inputRef}
            value={text}
            onChangeText={onChangeText}
            placeholder="Optional details"
            placeholderTextColor={apColors.muted}
            style={[apStyles.input, styles.descriptionInput]}
            multiline
            textAlignVertical="top"
            maxLength={800}
          />
        </AddProductField>
      </AddProductCard>
    </AddProductScreen>
  );
}

const styles = StyleSheet.create({
  builderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  openBuilderButton: {
    minHeight: 40,
    marginTop: 0,
    paddingHorizontal: 16,
  },
  builderBlock: {
    marginTop: 14,
  },
  builderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 2,
  },
  builderCount: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  clearButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: apColors.blueSoft,
  },
  clearText: {
    color: apColors.blue,
    fontSize: 12,
    fontWeight: "800",
  },
  sentenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#F8FAFF",
  },
  sentenceText: {
    flex: 1,
    color: apColors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  removeSentenceBtn: {
    marginLeft: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: apColors.white,
  },
  removeSentenceText: {
    color: apColors.danger,
    fontSize: 11,
    fontWeight: "900",
  },
  detailsField: {
    marginTop: 18,
  },
  descriptionInput: {
    minHeight: 132,
    marginTop: 10,
    lineHeight: 20,
  },
});
