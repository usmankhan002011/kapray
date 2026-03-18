import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";
import { PROJECT_URL, API_PUBLIC_KEY } from "./supabaseSecrets";

export const supabase = createClient<Database>(
  PROJECT_URL,
  API_PUBLIC_KEY
);