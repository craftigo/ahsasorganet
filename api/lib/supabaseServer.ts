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

const VERIFIED_SUPABASE_ANON_KEY = 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';

function isValidKey(k?: string): boolean {
  if (!k) return false;
  const trimmed = k.trim();
  if (trimmed.length < 30) return false;
  if (trimmed.startsWith('your-') || trimmed.includes('placeholder') || trimmed.includes('secret-key')) return false;
  if (trimmed.includes('nhmIwk55')) return false;
  return true;
}

function isValidUrl(u?: string): boolean {
  if (!u) return false;
  const trimmed = u.trim();
  if (!trimmed.startsWith('https://')) return false;
  if (trimmed.includes('your-') || trimmed.includes('placeholder')) return false;
  return true;
}

export const supabaseUrl = isValidUrl(process.env.SUPABASE_URL)
  ? process.env.SUPABASE_URL!.trim()
  : 'https://tcxmvujspjrrxinzpiqq.supabase.co';

// On the server, prioritize valid service_role key, then valid anon key, then default verified key
export const supabaseKey = isValidKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  : isValidKey(process.env.SUPABASE_ANON_KEY)
  ? process.env.SUPABASE_ANON_KEY!.trim()
  : VERIFIED_SUPABASE_ANON_KEY;

if (!isValidKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.warn('[Server] Notice: SUPABASE_SERVICE_ROLE_KEY is not set or invalid in server environment. Using verified key.');
}

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
  const rawAnonKey = process.env.SUPABASE_ANON_KEY;
  const anonKey = rawAnonKey && !rawAnonKey.includes('nhmIwk55') ? rawAnonKey : supabaseKey;

  return createClient(supabaseUrl, anonKey, {
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
