// utils/supabase/client.ts

import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";
import { PROJECT_URL, API_PUBLIC_KEY } from "./supabaseSecrets";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const supabase = createClient<Database>(PROJECT_URL, API_PUBLIC_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
