import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { TablesInsert } from "@/supabase/supabase";
import { appSupabase } from "@/services/supabase";

export function getAppSession() {
  return appSupabase.auth.getSession();
}

export function getCurrentUser() {
  return appSupabase.auth.getUser();
}

export function subscribeToAuthStateChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  return appSupabase.auth.onAuthStateChange(callback);
}

export function getVendorForAuthUser(authUserId: string) {
  return appSupabase
    .from("vendor")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
}

export function resetPassword(email: string) {
  return appSupabase.auth.resetPasswordForEmail(email);
}

export function signOut() {
  return appSupabase.auth.signOut();
}

export async function signOutOrThrow(): Promise<void> {
  const { error } = await signOut();
  if (error) throw error;
}

export function signInWithGoogleIdToken(token: string) {
  return appSupabase.auth.signInWithIdToken({
    provider: "google",
    token,
  });
}

export function updateAuthUserMetadata(data: Record<string, unknown>) {
  return appSupabase.auth.updateUser({ data });
}

export function createGoogleVendor(payload: TablesInsert<"vendor">) {
  return appSupabase.from("vendor").insert(payload);
}
