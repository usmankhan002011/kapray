import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/utils/supabase/client";
import { authStyles } from "@/components/auth/authStyles";

type ForgotPasswordModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ForgotPasswordModal({
  visible,
  onClose,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        throw error;
      }

      Alert.alert(
        "Reset link sent",
        "If this email is registered, a password reset link has been sent.",
      );
      setEmail("");
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={authStyles.modalOverlay}>
        <View style={authStyles.modalCard}>
          <Text style={authStyles.title}>Reset Password</Text>
          <Text style={authStyles.subtitle}>
            Enter your email to receive a password reset link.
          </Text>

          <Text style={authStyles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            style={authStyles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Pressable
            onPress={handleReset}
            style={[
              authStyles.primaryBtn,
              loading && authStyles.primaryBtnDisabled,
            ]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.primaryText}>Send reset link</Text>
            )}
          </Pressable>

          <Pressable onPress={onClose} style={authStyles.secondaryBtn}>
            <Text style={authStyles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
