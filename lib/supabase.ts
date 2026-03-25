import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client — uses anon key, safe to expose
export const supabase = createClient(url, anon);

// Server client — uses service_role key, only used in API routes
export const supabaseAdmin = createClient(url, service);
