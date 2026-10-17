import { createClient } from '@supabase/supabase-js';

const VERIFIED_SUPABASE_ANON_KEY = 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';

function isValidKey(k?: string): boolean {
  if (!k) return false;
  const trimmed = k.trim();
  if (trimmed.length < 30) return false;
  if (trimmed.startsWith('your-') || trimmed.includes('placeholder') || trimmed.includes('secret-key')) return false;
  if (trimmed.includes('nhmIwk55')) return false;
  return true;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcxmvujspjrrxinzpiqq.supabase.co';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = isValidKey(rawAnonKey) ? rawAnonKey.trim() : VERIFIED_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
