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
import { authStyles } from "@/components/auth";

export default function VendorSignUp() {
  const router = useRouter();

  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    if (!ownerName.trim() || !email.trim() || !password || !confirmPassword) {
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
            role: "vendor",
            name: ownerName.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        "Verify email",
        "Vendor account created. Please verify your email, then log in to create your shop.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/vendor/signin" as Href),
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
          <Text style={authStyles.title}>Vendor Sign Up</Text>
          <Text style={authStyles.subtitle}>
            Create your vendor account. You will set up your shop after login.
          </Text>

          <Text style={authStyles.label}>Owner Name</Text>
          <TextInput
            placeholder="Enter owner name"
            value={ownerName}
            onChangeText={setOwnerName}
            style={authStyles.input}
          />

          <Text style={authStyles.label}>Email</Text>
          <TextInput
            placeholder="Enter email"
            value={email}
            onChangeText={setEmail}
            style={authStyles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={authStyles.label}>Password</Text>
          <TextInput
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            style={authStyles.input}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={authStyles.label}>Confirm Password</Text>
          <TextInput
            placeholder="Confirm password"
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
              <Text style={authStyles.primaryText}>Create Vendor Account</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/vendor/signin" as Href)}
            style={authStyles.secondaryBtn}
          >
            <Text style={authStyles.secondaryText}>
              Already have a vendor account? Login
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
