import React, { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apColors, apStyles } from "@/components/product/addProductStyles";
import { useProductDraft } from "@/components/product/ProductDraftContext";
import { isPristineProductDraft } from "@/components/product/add-product/AddProductWizard";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function MoreDescriptionModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draft, draftResetReason, draftSessionId } = useProductDraft() as any;

  const q12Path =
    safeStr((params as any)?.q12Path) ||
    "/vendor/profile/add-product/q12-more-description";
  const parentReturnTo = safeStr((params as any)?.parentReturnTo);

  const sections = [
    { label: "Luxury Hook", path: "hook" },
    { label: "Fabric & Work", path: "fabric-work" },
    { label: "Dupatta", path: "dupatta" },
    { label: "Trouser", path: "trouser" },
    { label: "Occasion", path: "occasion" },
    { label: "Stitching", path: "disclaimer" },
    { label: "Designer Inspired", path: "replica" },
    { label: "Care", path: "care" },
  ];

  useEffect(() => {
    if (draftResetReason !== "start-new-product") return;
    if (!isPristineProductDraft(draft)) return;
    router.replace("/vendor/profile/add-product" as any);
  }, [draft, draftResetReason, draftSessionId, router]);

  function closeModal() {
    router.dismissTo({
      pathname: q12Path as any,
      params: parentReturnTo ? { returnTo: parentReturnTo } : undefined,
    } as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        contentContainerStyle={[apStyles.content, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={apStyles.title}>Builder</Text>

          <Pressable
            onPress={closeModal}
            hitSlop={8}
            style={({ pressed }) => [
              apStyles.linkBtn,
              styles.closeButton,
              pressed ? apStyles.pressed : null,
            ]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {sections.map((section, index) => (
            <Pressable
              key={section.path}
              onPress={() =>
                router.push({
                  pathname:
                    `/vendor/profile/(product-modals)/more-description/${section.path}` as any,
                  params: { q12Path, parentReturnTo },
                } as any)
              }
              style={({ pressed }) => [
                styles.sectionCard,
                index % 2 ? styles.sectionCardAlt : null,
                pressed ? apStyles.pressed : null,
              ]}
            >
              <Text
                numberOfLines={2}
                style={styles.sectionText}
              >
                {section.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 14,
  },
  sectionCard: {
    width: "48%",
    minHeight: 78,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#F8FAFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  sectionCardAlt: {
    backgroundColor: apColors.blueSoft,
  },
  sectionText: {
    color: apColors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    textAlign: "center",
  },
});
