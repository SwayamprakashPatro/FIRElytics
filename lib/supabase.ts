import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseKeyLooksPlaceholder =
  !supabaseAnonKey ||
  supabaseAnonKey === "YOUR_ANON_KEY_HERE" ||
  supabaseAnonKey.startsWith("YOUR_");

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && !supabaseKeyLooksPlaceholder;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables. Check your .env.local file.",
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "anon",
);
