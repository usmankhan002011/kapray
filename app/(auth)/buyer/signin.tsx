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
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "@/utils/supabase/client";
import { authStyles, ForgotPasswordModal } from "@/components/auth";

type Params = {
  redirectTo?: string;
};

export default function BuyerSignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const redirectTo = String(params.redirectTo ?? "").trim();

  const buildSignupRoute = () => {
    return `/(auth)/buyer/signup${
      redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""
    }` as any;
  };

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

      if (redirectTo) {
        router.replace(redirectTo as any);
        return;
      }

      router.replace("/" as any);
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
          <Text style={authStyles.title}>Sign in to continue</Text>
          <Text style={authStyles.subtitle}>
            Please sign in to continue with your buyer account.
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
              <Text style={authStyles.primaryText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setForgotVisible(true)}
            style={authStyles.secondaryBtn}
          >
            <Text style={authStyles.secondaryText}>Forgot password</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(buildSignupRoute())}
            style={authStyles.secondaryBtn}
          >
            <Text style={authStyles.secondaryText}>Create account</Text>
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
