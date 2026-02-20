import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/store/hooks";

export default function VendorConfirmationScreen() {
  const router = useRouter();
  const vendor = useAppSelector((s) => s.vendor as any);
  const shopName = (vendor?.shop_name || "").trim();
  const ownerName = (vendor?.name || "").trim();
  const displayTitle = shopName || ownerName || "Vendor";

  const onViewProfile = () => {
    if (!vendor?.id) {
      Alert.alert(
        "Vendor not found",
        "Vendor data is not available yet. Go back and open profile from vendor home."
      );
      return;
    }
    router.push("/vendor/profile");
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.success}>✅ Registration Successful</Text>

        <Text style={styles.title}>{displayTitle}</Text>

        {/* Debug line (keep for now; remove later if you want) */}
        <Text style={styles.meta}>Vendor ID: {String(vendor?.id || "—")}</Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.pressedBtn
          ]}
          onPress={onViewProfile}
        >
          <Text style={styles.primaryBtnText}>View profile</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/vendor")}>
          <Text style={styles.link}>Back to vendor home</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, backgroundColor: "#fff" },

  card: {
    marginTop: 30,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    padding: 18
  },

  success: { fontSize: 18, fontWeight: "900", color: "#0b7a3b" },

  title: { marginTop: 10, fontSize: 20, fontWeight: "900", color: "#111" },

  meta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    opacity: 0.75
  },

  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#0b2f6b",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  pressedBtn: { opacity: 0.85 },

  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  link: { marginTop: 16, fontSize: 14, fontWeight: "900", color: "#005ea6" }
});
