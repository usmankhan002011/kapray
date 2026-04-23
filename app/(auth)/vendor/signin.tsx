import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Href, useRouter } from "expo-router";

import { supabase } from "@/utils/supabase/client";
import { authStyles, ForgotPasswordModal } from "@/components/auth";

export default function VendorSignIn() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const login = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      // ✅ IMPORTANT: go to /vendor (gate will decide next step)
      router.replace("/vendor" as Href);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={authStyles.screen}>
      <ScrollView
        contentContainerStyle={authStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={authStyles.card}>
          <Text style={authStyles.title}>Vendor Login</Text>
          <Text style={authStyles.subtitle}>
            Sign in to manage your shop and products.
          </Text>

          <Text style={authStyles.label}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            style={authStyles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={authStyles.label}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={authStyles.input}
            autoCapitalize="none"
          />

          <Pressable
            onPress={login}
            style={[
              authStyles.primaryBtn,
              loading && authStyles.primaryBtnDisabled,
            ]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.primaryText}>Login</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setForgotVisible(true)}
            style={authStyles.secondaryBtn}
          >
            <Text style={authStyles.secondaryText}>Forgot password</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/vendor/signup" as Href)}
            style={authStyles.secondaryBtn}
          >
            <Text style={authStyles.secondaryText}>Create vendor account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ForgotPasswordModal
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
      />
    </View>
  );
}
