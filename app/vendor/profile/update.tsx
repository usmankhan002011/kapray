import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function VendorUpdateScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Update Vendor / Shop</Text>

      <View style={styles.card}>
        <Text style={styles.meta}>
          Here vendor will be able to edit shop name, contact, media, etc.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: "#fff" },

  title: { fontSize: 20, fontWeight: "900", color: "#111" },

  card: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    padding: 14
  },

  meta: {
    marginTop: 6,
    fontSize: 14,
    color: "#111",
    opacity: 0.75
  }
});
