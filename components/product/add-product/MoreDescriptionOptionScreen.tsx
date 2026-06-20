import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useProductDraft } from "@/components/product/ProductDraftContext";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import {
  AddProductPrimaryButton,
  AddProductSecondaryButton,
} from "@/components/product/add-product/AddProductWizard";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

type Props = {
  title: string;
  options: string[];
  primaryCount?: number;
};

export default function MoreDescriptionOptionScreen({
  title,
  options,
  primaryCount = 7,
}: Props) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draft } = useProductDraft() as any;

  const q12Path =
    safeStr((params as any)?.q12Path) ||
    "/vendor/profile/add-product/q12-more-description";
  const parentReturnTo = safeStr((params as any)?.parentReturnTo);

  const alreadyPicked: string[] = useMemo(() => {
    const parts = (draft?.spec as any)?.more_description_parts;
    return Array.isArray(parts) ? parts : [];
  }, [draft?.spec]);

  const [picked, setPicked] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);

  const primaryOptions = options.slice(0, primaryCount);
  const extraOptions = options.slice(primaryCount);
  const visibleOptions = showMore ? options : primaryOptions;
  const pickedCount = picked.length;

  function toggle(sentence: string) {
    if (alreadyPicked.includes(sentence)) return;
    setPicked((prev) =>
      prev.includes(sentence)
        ? prev.filter((item) => item !== sentence)
        : [...prev, sentence],
    );
  }

  function addSelected() {
    if (!picked.length) return;

    router.push({
      pathname: q12Path as any,
      params: parentReturnTo
        ? { appendMany: picked.join("\n"), returnTo: parentReturnTo }
        : { appendMany: picked.join("\n") },
    } as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        contentContainerStyle={[apStyles.content, apStyles.contentWithFooter]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text
            numberOfLines={2}
            style={[apStyles.title, styles.title]}
          >
            {title}
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              apStyles.linkBtn,
              styles.closeButton,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.optionStack}>
          {visibleOptions.map((option) => {
            const isPicked = picked.includes(option);
            const isAlready = alreadyPicked.includes(option);

            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{
                  selected: isPicked,
                  disabled: isAlready,
                }}
                disabled={isAlready}
                onPress={() => toggle(option)}
                style={({ pressed }) => [
                  apStyles.segment,
                  styles.option,
                  isPicked ? apStyles.segmentOn : null,
                  isAlready ? styles.optionDisabled : null,
                  pressed ? apStyles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    isPicked ? styles.optionTextOn : null,
                  ]}
                >
                  {option}
                </Text>

                {isPicked || isAlready ? (
                  <Text
                    style={[
                      styles.statusText,
                      isAlready ? styles.statusTextMuted : null,
                    ]}
                  >
                    {isAlready ? "Added" : "Selected"}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {extraOptions.length ? (
          <AddProductSecondaryButton
            label={showMore ? "Show less" : "Show more"}
            onPress={() => setShowMore((value) => !value)}
            style={styles.showMoreButton}
          />
        ) : null}
      </ScrollView>

      <View style={apStyles.footer}>
        <Text style={styles.footerCount}>{pickedCount} selected</Text>
        <AddProductPrimaryButton
          label={pickedCount ? `Add (${pickedCount})` : "Add"}
          onPress={addSelected}
          disabled={!pickedCount}
          style={styles.addButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  optionStack: {
    marginTop: 14,
    gap: 10,
  },
  option: {
    minHeight: 58,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    color: apColors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  optionTextOn: {
    color: apColors.blue,
  },
  statusText: {
    marginTop: 8,
    color: apColors.blue,
    fontSize: 11,
    fontWeight: "800",
  },
  statusTextMuted: {
    color: apColors.muted,
  },
  showMoreButton: {
    marginTop: 12,
  },
  footerCount: {
    color: apColors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  addButton: {
    marginTop: 8,
  },
});
