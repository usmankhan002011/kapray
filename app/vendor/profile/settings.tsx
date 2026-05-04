import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearSelectedVendor } from "@/store/vendorSlice";

export default function VendorSettingsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const vendor = useAppSelector((s) => s.vendor);

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const vendorId = vendor?.id;
  const hasShop = vendor?.has_shop;

  if (!vendorId) {
    return <Redirect href="/vendor/signin" />;
  }

  if (!hasShop) {
    return <Redirect href="/vendor/create-shop" />;
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      dispatch(clearSelectedVendor());
      setLogoutVisible(false);
      router.replace("/vendor/signin");
    } catch (error: any) {
      Alert.alert("Logout failed", error?.message ?? "Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Vendor Settings</Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutVisible(true)}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.placeholder}
            onPress={() => router.push("/vendor/profile/view-profile")}
          >
            <Text style={styles.actionText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.placeholder}
            onPress={() => router.push("/vendor/profile/reviews")}
          >
            <Text style={styles.actionText}>Reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.placeholder}
            onPress={() => router.push("/vendor/profile/edit-vendor")}
          >
            <Text style={styles.actionText}>Edit Shop</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) setLogoutVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalMessage}>
              You will need to sign in again to manage your shop.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setLogoutVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmLogoutButton,
                  loggingOut && styles.disabledButton,
                ]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Text style={styles.confirmLogoutText}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  overlay: "rgba(15, 23, 42, 0.35)",
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    flex: 1,
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

  logoutButton: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: stylesVars.dangerSoft,
    borderWidth: 1,
    borderColor: stylesVars.dangerBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: stylesVars.danger,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: stylesVars.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 18,
    backgroundColor: stylesVars.white,
    padding: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: stylesVars.text,
  },

  modalMessage: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: stylesVars.subText,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },

  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.white,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.text,
  },

  confirmLogoutButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: stylesVars.danger,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmLogoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: stylesVars.white,
  },

  disabledButton: {
    opacity: 0.7,
  },
});
