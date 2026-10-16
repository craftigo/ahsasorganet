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

const supabaseUrl = process.env.SUPABASE_URL || 'https://tcxmvujspjrrxinzpiqq.supabase.co';
// On the server, we can use either SERVICE_ROLE_KEY (for trusted admin tasks) or the ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';

if (!supabaseUrl) {
  console.warn('[Server] Warning: SUPABASE_URL environment variable is missing.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Server] Notice: SUPABASE_SERVICE_ROLE_KEY is not set in the server environment. Elevated server operations (generating private storage upload tokens and direct registration table writes) require the service_role key.');
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
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || supabaseKey, {
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
