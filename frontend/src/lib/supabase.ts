import { createClient } from '@supabase/supabase-js';

const VERIFIED_SUPABASE_ANON_KEY = 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcxmvujspjrrxinzpiqq.supabase.co';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Guard against invalid key previously injected in Vercel environment
const supabaseAnonKey =
  rawAnonKey && !rawAnonKey.includes('nhmIwk55')
    ? rawAnonKey
    : VERIFIED_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
