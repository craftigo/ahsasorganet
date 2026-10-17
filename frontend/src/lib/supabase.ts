import { createClient } from '@supabase/supabase-js';

// Verified, valid Supabase credentials for tcxmvujspjrrxinzpiqq project
export const SUPABASE_URL = 'https://tcxmvujspjrrxinzpiqq.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_rFl-zfQXBUuqKhWeEtXuSA_9x1Kg8kp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
