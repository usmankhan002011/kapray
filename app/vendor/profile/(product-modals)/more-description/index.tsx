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
    { label: "Luxury Hook", path: "hook" },
    { label: "Fabric & Work", path: "fabric-work" },
    { label: "Dupatta", path: "dupatta" },
    { label: "Trouser", path: "trouser" },
    { label: "Occasion", path: "occasion" },
    { label: "Stitching & Disclaimer", path: "disclaimer" },
    { label: "Replica / Designer Inspired", path: "replica" }
  ];

  function closeModal() {
    router.replace({
      pathname: q12Path as any,
      params: parentReturnTo ? { returnTo: parentReturnTo } : undefined
    } as any);
  }

  return (
    <View style={apStyles.screen}>
      <ScrollView contentContainerStyle={apStyles.content}>
        <View style={apStyles.headerRow}>
          <Text style={apStyles.title}>Build Description</Text>

          <Pressable
            onPress={closeModal}
            style={({ pressed }) => [
              apStyles.linkBtn,
              pressed ? apStyles.pressed : null
            ]}
          >
            <Text style={apStyles.linkText}>Close</Text>
          </Pressable>
        </View>

        {sections.map((s) => (
          <Pressable
            key={s.path}
            onPress={() =>
              router.push({
                pathname: `/vendor/profile/(product-modals)/more-description/${s.path}`,
                params: { q12Path, parentReturnTo }
              } as any)
            }
            style={apStyles.card}
          >
            <Text style={apStyles.label}>{s.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}