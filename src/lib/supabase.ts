import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export const hasSupabasePublicConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const hasSupabaseServiceConfig = Boolean(
  supabaseUrl && supabaseServiceKey,
);

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined' || !hasSupabasePublicConfig) {
    return null;
  }
  if (!browserClient) {
    browserClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storageKey: 'cps-auth',
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return browserClient;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined' || !hasSupabaseServiceConfig) {
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}
