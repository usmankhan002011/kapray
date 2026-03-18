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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Login</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Enter Vendor ID</Text>

        <TextInput
          style={styles.input}
          value={vendorIdInput}
          onChangeText={setVendorIdInput}
          keyboardType="numeric"
          placeholder="e.g. 15"
          placeholderTextColor={stylesVars.placeholder}
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
  black: "#000000"
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg
  },

  content: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: stylesVars.bg
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text
  },

  card: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 18
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: stylesVars.text,
    letterSpacing: 0.2
  },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: stylesVars.text,
    backgroundColor: stylesVars.white
  },

  button: {
    marginTop: 14,
    minHeight: 48,
    backgroundColor: stylesVars.blue,
    color: stylesVars.white,
    textAlign: "center",
    textAlignVertical: "center",
    paddingVertical: 12,
    borderRadius: 14,
    fontWeight: "700",
    fontSize: 14,
    overflow: "hidden"
  },

  disabled: {
    opacity: 0.6
  },

  link: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.blue
  }
});