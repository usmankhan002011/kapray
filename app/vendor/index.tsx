import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedVendor } from "@/store/vendorSlice";

export default function VendorIndexScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [vendorIdInput, setVendorIdInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOpenVendor() {
    const id = Number(vendorIdInput.trim());

    if (!id) {
      Alert.alert("Enter Vendor ID", "Please enter a valid numeric ID.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("vendor")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        Alert.alert(
          "Vendor not found",
          "No vendor exists with this ID. Please register."
        );
        router.push("/vendor/create-shop");
        return;
      }

      // ✅ IMPORTANT: store the full vendor row so existing screens that rely on
      // profile_image_path/banner_path/shop_image_paths/shop_video_paths keep working.
      dispatch(
        setSelectedVendor({
          ...(data as any),
          id: Number((data as any).id)
        })
      );

      router.replace("/vendor/profile/settings");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Login</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Enter Vendor ID</Text>

        <TextInput
          style={styles.input}
          value={vendorIdInput}
          onChangeText={setVendorIdInput}
          keyboardType="numeric"
          placeholder="e.g. 15"
          placeholderTextColor="#777"
        />

        <Text
          style={[styles.button, loading && styles.disabled]}
          onPress={loading ? undefined : handleOpenVendor}
        >
          {loading ? "Checking..." : "Open Vendor"}
        </Text>

        <Text
          style={styles.link}
          onPress={() => router.push("/vendor/create-shop")}
        >
          Register new vendor
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

  label: { fontSize: 14, fontWeight: "800", color: "#111" },

  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#111"
  },

  button: {
    marginTop: 16,
    backgroundColor: "#0b2f6b",
    color: "#fff",
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: 10,
    fontWeight: "900",
    fontSize: 16
  },

  disabled: { opacity: 0.6 },

  link: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: "#005ea6"
  }
});
