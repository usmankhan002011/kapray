import { createClient } from "@supabase/supabase-js";
import { API_PUBLIC_KEY, PROJECT_URL } from "./supabaseSecrets";
import { Database } from "./types";

export const supabase = createClient<Database>(PROJECT_URL, API_PUBLIC_KEY);
