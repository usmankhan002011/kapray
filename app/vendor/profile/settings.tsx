import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function VendorSettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Settings</Text>

      <View style={styles.card}>
        <Text
          style={styles.action}
          onPress={() => router.push("/vendor/profile/view-profile")}
        >
          View Profile
        </Text>

        <Text
          style={styles.action}
          onPress={() => router.push("/vendor/profile/edit-vendor")}
        >
          Edit Vendor
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: "#fff" },

  title: { fontSize: 20, fontWeight: "900", color: "#111" },

  card: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    padding: 16
  },

  action: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "900",
    color: "#005ea6"
  }
});
