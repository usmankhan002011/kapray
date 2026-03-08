import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

export default function VendorSettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Vendor Settings</Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.placeholder}
          onPress={() => router.push("/vendor/profile/view-profile")}
        >
          <Text style={styles.actionText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.placeholder}
          onPress={() => router.push("/vendor/profile/edit-vendor")}
        >
          <Text style={styles.actionText}>Edit Vendor</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    padding: 16,
    paddingBottom: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },

  card: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    padding: 16,
  },

  placeholder: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginTop: 12,
  },

  actionText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#005ea6",
  },
});