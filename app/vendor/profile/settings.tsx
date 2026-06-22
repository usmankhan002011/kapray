import React, { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase/client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearSelectedVendor } from "@/store/vendorSlice";
import {
  apColors,
  apFontFamily,
  apRadii,
} from "@/components/product/addProductStyles";

type SettingsIconName = React.ComponentProps<typeof MaterialIcons>["name"];

function SettingsActionRow({
  icon,
  label,
  onPress,
}: {
  icon: SettingsIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.actionIconBox}>
        <MaterialIcons name={icon} size={19} color={stylesVars.blue} />
      </View>
      <Text style={styles.actionText}>{label}</Text>
      <MaterialIcons name="chevron-right" size={22} color={stylesVars.mutedText} />
    </Pressable>
  );
}

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
          <Text style={styles.title}>Settings</Text>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => setLogoutVisible(true)}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <SettingsActionRow
            icon="storefront"
            label="View Profile"
            onPress={() => router.push("/vendor/profile/view-profile")}
          />

          <SettingsActionRow
            icon="rate-review"
            label="Reviews"
            onPress={() => router.push("/vendor/profile/reviews")}
          />

          <SettingsActionRow
            icon="edit"
            label="Edit Shop"
            onPress={() => router.push("/vendor/profile/edit-vendor")}
          />
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
              Sign in again to manage shop.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed ? styles.pressed : null,
                ]}
                onPress={() => setLogoutVisible(false)}
                disabled={loggingOut}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.confirmLogoutButton,
                  loggingOut && styles.disabledButton,
                  pressed ? styles.pressed : null,
                ]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Text style={styles.confirmLogoutText}>
                  {loggingOut ? "Logging out..." : "Log out"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const stylesVars = {
  bg: apColors.bg,
  cardBg: apColors.card,
  border: apColors.border,
  borderSoft: apColors.borderSoft,
  blue: apColors.blue,
  blueSoft: apColors.blueSoft,
  text: apColors.text,
  subText: apColors.subText,
  mutedText: apColors.muted,
  danger: apColors.danger,
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FCA5A5",
  white: apColors.white,
  overlay: "rgba(15, 23, 42, 0.35)",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  content: {
    padding: 16,
    paddingBottom: 96,
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
    fontFamily: apFontFamily,
    fontSize: 20,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  card: {
    marginTop: 14,
    borderRadius: apRadii.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    backgroundColor: stylesVars.cardBg,
    padding: 10,
    gap: 10,
  },

  actionRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: stylesVars.blueSoft,
  },

  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: stylesVars.white,
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    flex: 1,
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.blue,
    letterSpacing: 0,
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
    fontFamily: apFontFamily,
    fontSize: 12,
    fontWeight: "800",
    color: stylesVars.danger,
    letterSpacing: 0,
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
    borderRadius: apRadii.card,
    backgroundColor: stylesVars.white,
    padding: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
  },

  modalTitle: {
    fontFamily: apFontFamily,
    fontSize: 18,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  modalMessage: {
    marginTop: 8,
    fontFamily: apFontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: stylesVars.subText,
    fontWeight: "500",
    letterSpacing: 0,
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
    borderRadius: apRadii.control,
    borderWidth: 1,
    borderColor: stylesVars.borderSoft,
    backgroundColor: stylesVars.white,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelText: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.text,
    letterSpacing: 0,
  },

  confirmLogoutButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: apRadii.control,
    backgroundColor: stylesVars.danger,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmLogoutText: {
    fontFamily: apFontFamily,
    fontSize: 14,
    fontWeight: "800",
    color: stylesVars.white,
    letterSpacing: 0,
  },

  disabledButton: {
    opacity: 0.7,
  },

  pressed: {
    opacity: 0.82,
  },
});
