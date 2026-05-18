import { Href, router } from "expo-router";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { supabase } from "@/utils/supabase/client";

export type AuthRole = "buyer" | "vendor";

type GoogleLoginResult = {
  ok: boolean;
  message?: string;
};

function normalizeName(input: unknown) {
  const value = String(input ?? "").trim();
  return value || "User";
}

function normalizeEmail(input: unknown) {
  return String(input ?? "")
    .trim()
    .toLowerCase();
}

export async function handleGoogleLogin(
  role: AuthRole,
): Promise<GoogleLoginResult> {
  try {
    await GoogleSignin.signOut();
    await GoogleSignin.hasPlayServices();

    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) {
      throw new Error("No ID token received from Google Sign-In.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    if (!user) {
      throw new Error(
        "Google account was authenticated but no user was returned.",
      );
    }

    const email = normalizeEmail(user.email ?? user.user_metadata?.email);
    const name = normalizeName(
      user.user_metadata?.name ??
        user.user_metadata?.full_name ??
        user.user_metadata?.user_name,
    );

    const { error: updateUserError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        role,
        name,
      },
    });

    if (updateUserError) {
      throw updateUserError;
    }

    if (role === "buyer") {
      router.replace("/" as Href);
      return { ok: true };
    }

    const { data: existingVendor, error: vendorLookupError } = await supabase
      .from("vendor")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (vendorLookupError) {
      throw vendorLookupError;
    }

    if (!existingVendor) {
      const { error: vendorInsertError } = await supabase
        .from("vendor")
        .insert({
          name,
          shop_name: user.user_metadata?.shop_name ?? null,
          email: email || null,
          mobile: null,
          owner_user_id: user.id,
          auth_user_id: user.id,
          offers_tailoring: false,
          exports_enabled: false,
          export_regions: [],
          tailoring_options: {},
          status: "draft",
        });

      if (vendorInsertError) {
        throw vendorInsertError;
      }

      router.replace("/vendor/create-shop" as Href);
      return { ok: true };
    }

    router.replace("/vendor/profile" as Href);
    return { ok: true };
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      return { ok: false, message: "Google sign-in was cancelled." };
    }

    if (error?.code === statusCodes.IN_PROGRESS) {
      return { ok: false, message: "Google sign-in is already in progress." };
    }

    if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        ok: false,
        message: "Google Play Services are not available or outdated.",
      };
    }

    return {
      ok: false,
      message: error?.message || "Google sign-in failed.",
    };
  }
}
