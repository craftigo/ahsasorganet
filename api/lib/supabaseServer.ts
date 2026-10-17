import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Automatically load root .env file in Node runtime if not yet loaded
try {
  if (typeof (process as any).loadEnvFile === 'function') {
    const rootEnv = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(rootEnv)) {
      (process as any).loadEnvFile(rootEnv);
    }
  }
} catch {
  // Ignored in serverless / production environments where env vars are injected natively
}

export const VERIFIED_SUPABASE_ANON_KEY = 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';
export const VERIFIED_SUPABASE_URL = 'https://tcxmvujspjrrxinzpiqq.supabase.co';

function isRealServiceRoleKey(k?: string): boolean {
  if (!k) return false;
  const trimmed = k.trim();
  return (trimmed.startsWith('eyJ') || trimmed.startsWith('sb_secret_')) && trimmed.length > 50;
}

export const supabaseUrl = VERIFIED_SUPABASE_URL;

// On the server: use valid service_role key if provided, else use the verified working key
export const supabaseKey = isRealServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  : VERIFIED_SUPABASE_ANON_KEY;

export const supabaseServer: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Creates an authenticated Supabase client for a specific user request JWT.
 * This preserves RLS and acts on behalf of the user.
 */
export function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(supabaseUrl, VERIFIED_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
