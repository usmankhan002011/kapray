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
import { authStyles } from "@/components/auth";

type Params = {
  redirectTo?: string;
};

export default function BuyerSignUp() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = String(params.redirectTo ?? "").trim();

  const buildSigninRoute = () => {
    return `/(auth)/buyer/signin${
      redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""
    }` as any;
  };

  const signUp = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: "buyer",
            name: fullName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Verify email",
        "Your account has been created. Please verify your email, then sign in.",
        [
          {
            text: "OK",
            onPress: () => router.replace(buildSigninRoute()),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not create account.");
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
          <Text style={authStyles.title}>Create account</Text>
          <Text style={authStyles.subtitle}>
            Create a buyer account to continue with Kapray.
          </Text>

          <Text style={authStyles.label}>Full Name</Text>
          <TextInput
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            style={authStyles.input}
          />

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
            style={authStyles.input}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={authStyles.label}>Confirm Password</Text>
          <TextInput
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={authStyles.input}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            onPress={signUp}
            style={[
              authStyles.primaryBtn,
              loading && authStyles.primaryBtnDisabled,
            ]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={authStyles.primaryText}>Create account</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push(buildSigninRoute())}
            style={authStyles.secondaryBtn}
          >
            <Text style={authStyles.secondaryText}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
