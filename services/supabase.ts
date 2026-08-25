import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/supabase/supabase";
import { supabase } from "@/utils/supabase/client";

export const appSupabase = supabase as unknown as SupabaseClient<Database>;
