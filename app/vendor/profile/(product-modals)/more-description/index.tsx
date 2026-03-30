import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apStyles } from "@/components/product/addProductStyles";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export default function MoreDescriptionModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const q12Path =
    safeStr((params as any)?.q12Path) ||
    "/vendor/profile/add-product/q12-more-description";
  const parentReturnTo = safeStr((params as any)?.parentReturnTo);

  const sections = [
    { label: "Luxury Hook", path: "hook", emoji: "✨", bg: "#FFF4E5" },
    { label: "Fabric & Work", path: "fabric-work", emoji: "🧵", bg: "#EEF6FF" },
    { label: "Dupatta", path: "dupatta", emoji: "🧣", bg: "#F4EEFF" },
    { label: "Trouser", path: "trouser", emoji: "👖", bg: "#EEFDF3" },
    { label: "Occasion", path: "occasion", emoji: "🎉", bg: "#FFF0F5" },
    { label: "Stitching", path: "disclaimer", emoji: "📌", bg: "#FFF8E7" },
    { label: "Designer Inspired", path: "replica", emoji: "👗", bg: "#F3F4F6" },
    { label: "Care", path: "care", emoji: "🧼", bg: "#ECFDF5" }
  ];

  function closeModal() {
    router.replace({
      pathname: q12Path as any,
      params: parentReturnTo ? { returnTo: parentReturnTo } : undefined
    } as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView
        contentContainerStyle={[apStyles.content, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[apStyles.headerRow, { alignItems: "center", marginBottom: 6 }]}>
          <Text style={apStyles.title}>Build Description</Text>

          <Pressable
            onPress={closeModal}
            hitSlop={8}
            style={({ pressed }) => [
              apStyles.linkBtn,
              {
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999
              },
              pressed ? apStyles.pressed : null
            ]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        <View
          style={{
            marginBottom: 12,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 12,
            backgroundColor: "#F9FAFB",
            borderWidth: 1,
            borderColor: "#ECECEC"
          }}
        >
          <Text style={[apStyles.metaHint, { lineHeight: 18, fontSize: 12 }]}>
            Add polished description lines for your product.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between"
          }}
        >
          {sections.map((s) => (
            <Pressable
              key={s.path}
              onPress={() =>
                router.push({
                  pathname: `/vendor/profile/(product-modals)/more-description/${s.path}`,
                  params: { q12Path, parentReturnTo }
                } as any)
              }
              style={({ pressed }) => [
                {
                  width: "48%",
                  minHeight: 108,
                  marginBottom: 10,
                  borderRadius: 16,
                  backgroundColor: s.bg,
                  borderWidth: 1,
                  borderColor: "#EAEAEA",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 10,
                  paddingVertical: 12
                },
                pressed ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null
              ]}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#ECECEC"
                }}
              >
                <Text style={{ fontSize: 21 }}>{s.emoji}</Text>
              </View>

              <Text
                style={[
                  apStyles.label,
                  {
                    textAlign: "center",
                    fontSize: 13,
                    lineHeight: 17,
                    fontWeight: "700",
                    color: "#111827"
                  }
                ]}
                numberOfLines={2}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}