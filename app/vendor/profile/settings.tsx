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

const stylesVars = {
  bg: "#F8FAFC",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#E5E7EB",
  blue: "#2563EB",
  blueSoft: "#EEF4FF",
  text: "#0F172A",
  subText: "#475569",
  mutedText: "#64748B",
  placeholder: "#94A3B8",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  white: "#FFFFFF",
  black: "#000000",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18,
  },

  placeholder: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: stylesVars.blueSoft,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    marginTop: 10,
    justifyContent: "center",
  },

  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue,
  },
});