import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || anonKey === "PASTE_YOUR_ANON_KEY_HERE") {
    throw new Error(
      "Supabase is not configured. Copy .env.local.example to .env.local and paste your anon key (see SETUP.md)."
    );
  }
  return createBrowserClient(url, anonKey);
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && anonKey !== "PASTE_YOUR_ANON_KEY_HERE");
}
