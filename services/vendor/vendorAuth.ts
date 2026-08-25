import { appSupabase } from "@/services/supabase";

export async function signOutVendor(): Promise<void> {
  const { error } = await appSupabase.auth.signOut();
  if (error) throw error;
}
