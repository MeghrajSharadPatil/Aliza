import { createClient } from "@supabase/supabase-js";

// =====================================================================
// SUPABASE CREDENTIALS
// Replace the values below with your project URL and public anon key.
// =====================================================================

// 1. Paste your Supabase project URL here (Base project URL without /rest/v1):
const RAW_SUPABASE_URL = "https://hrwreunsewjkmubghhfw.supabase.co";

// Sanitize URL to ensure no trailing '/rest/v1' or trailing slashes cause endpoint routing errors
const SUPABASE_URL = RAW_SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

// 2. Paste your Supabase public API key (anon / publishable) here:
const SUPABASE_PUBLIC_KEY = "sb_publishable_a1R077eMfEpE-r3HhLJrYg_FKtW-nLW";

// =====================================================================
// SUPABASE CLIENT EXPORT
// =====================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
