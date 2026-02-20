import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function TailorsIndex() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tailors</Text>

      <Pressable onPress={() => router.push("/tailors/(modals)/tailor-list_modal")}>
        <Text style={styles.link}>Select Tailor</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/tailors/(modals)/size_modal")}>
        <Text style={styles.link}>Select Size</Text>
      </Pressable>

      <View style={styles.noteWrap}>
        <Text style={styles.note}>
          Tailors are vendor-managed only. If vendor does not offer stitching, customer will buy raw cloth only.
          Tailor rating and costs are maintained by the vendor.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  link: { fontSize: 16, textDecorationLine: "underline" },
  noteWrap: { marginTop: 8 },
  note: { fontSize: 13, opacity: 0.8, lineHeight: 18 }
});
