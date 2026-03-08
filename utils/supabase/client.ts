import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase";
const PROJECT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const API_PUBLIC_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(PROJECT_URL, API_PUBLIC_KEY);
