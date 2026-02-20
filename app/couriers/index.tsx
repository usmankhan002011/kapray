import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function CouriersIndex() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Couriers</Text>

      <Pressable onPress={() => router.push("/couriers/(modals)/courier-list_modal")}>
        <Text style={styles.link}>Select Courier</Text>
      </Pressable>

      <View style={styles.noteWrap}>
        <Text style={styles.note}>
          Couriers are vendor-managed only. Vendor maintains local/international couriers and their rates, and
          assigns vendor rating. Customer selects at purchase time.
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
