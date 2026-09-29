// Supabase client + the two calls Hifzly needs: read and write the signed-in user's data row.
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Resolves {data, updated_at} or null when the user has no saved data yet. */
export async function fetchRemote(userId) {
  const { data, error } = await supabase
    .from("user_data")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function pushRemote(userId, snapshot) {
  const { error } = await supabase
    .from("user_data")
    .upsert({ user_id: userId, data: snapshot, updated_at: new Date().toISOString() });
  if (error) throw error;
}
