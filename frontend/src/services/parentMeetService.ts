// ==============================================================================
// EDU FAMILIA – THARQIYA FAMILY MEET
// Frontend Service: API Integration, Supabase Client & Offline Dual-Storage
// ==============================================================================

import { supabase } from '../lib/supabase';
import {
  ParentMeetSettings,
  ParentRegistration,
  ParentRegistrationInput,
  ScanVerificationResult,
  ScannerStation,
  ScanLog,
  AuditLog,
  WhatsAppLog
} from '../../../shared/types';
import { DEFAULT_PARENT_MEET_SETTINGS } from '../../../shared/data/parentMeetDefaults';

const STORAGE_KEY_REGISTRATIONS = 'ef_parent_registrations_cache';
const STORAGE_KEY_SETTINGS = 'ef_parent_meet_settings_cache';

// Helper for localStorage
function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const parentMeetService = {
  /**
   * Fetch current event settings (API -> Supabase -> Local fallback)
   */
  async getSettings(): Promise<ParentMeetSettings> {
    try {
      const res = await fetch('/api/parent-meet/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setLocal(STORAGE_KEY_SETTINGS, data.settings);
          return data.settings;
        }
      }
    } catch {}

    // Fallback: direct Supabase query
    try {
      const { data } = await supabase
        .from('parent_meet_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      if (data) {
        setLocal(STORAGE_KEY_SETTINGS, data);
        return data as ParentMeetSettings;
      }
    } catch {}

    return getLocal<ParentMeetSettings>(STORAGE_KEY_SETTINGS, DEFAULT_PARENT_MEET_SETTINGS);
  },

  /**
   * Update event settings (Admin)
   */
  async updateSettings(updates: Partial<ParentMeetSettings>): Promise<ParentMeetSettings> {
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token || '';

    const res = await fetch('/api/parent-meet/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update settings');
    }

    const data = await res.json();
    setLocal(STORAGE_KEY_SETTINGS, data.settings);
    return data.settings;
  },

  /**
   * Submit new parent registration (Public)
   */
  async registerParent(input: ParentRegistrationInput): Promise<{
    registration: ParentRegistration;
    pass_url: string;
    card_image_url?: string;
  }> {
    const res = await fetch('/api/parent-meet/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed. Please check your details.');
    }

    // Cache locally as well
    const cached = getLocal<ParentRegistration[]>(STORAGE_KEY_REGISTRATIONS, []);
    setLocal(STORAGE_KEY_REGISTRATIONS, [data.registration, ...cached]);

    return {
      registration: data.registration,
      pass_url: data.pass_url,
      card_image_url: data.card_image_url
    };
  },

  /**
   * Fetch QR pass by token (Public)
   */
  async getPassByToken(token: string): Promise<any> {
    const res = await fetch(`/api/parent-meet/pass/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'QR Pass not found');
    }
    return data;
  },

  /**
   * Scanner verification (Expo, Meeting, Food)
   */
  async verifyScan(payload: {
    station_type: 'expo' | 'meeting' | 'food';
    station_key?: string;
    qr_token?: string;
    manual_id?: string;
    staff_name?: string;
  }): Promise<ScanVerificationResult> {
    const res = await fetch('/api/parent-meet/scan/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    // If server responded with a structured ScanVerificationResult (even with 400/403/404/409 error)
    if (data && data.result_code) {
      return data as ScanVerificationResult;
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Network or server error during scanning.');
    }

    return data as ScanVerificationResult;
  },

  /**
   * Admin: Overview Stats
   */
  async getAdminStats(): Promise<any> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/parent-meet/admin/stats', {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` }
    });
    if (!res.ok) throw new Error('Failed to load stats');
    const data = await res.json();
    return data.stats;
  },

  /**
   * Admin: List Registrations
   */
  async getRegistrations(): Promise<ParentRegistration[]> {
    const session = (await supabase.auth.getSession()).data.session;
    try {
      const res = await fetch('/api/parent-meet/admin/registrations', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registrations) {
          setLocal(STORAGE_KEY_REGISTRATIONS, data.registrations);
          return data.registrations;
        }
      }
    } catch {}

    // Fallback: direct Supabase select
    try {
      const { data } = await supabase
        .from('parent_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setLocal(STORAGE_KEY_REGISTRATIONS, data);
        return data as ParentRegistration[];
      }
    } catch {}

    return getLocal<ParentRegistration[]>(STORAGE_KEY_REGISTRATIONS, []);
  },

  /**
   * Admin: Manual Registration
   */
  async addManualRegistration(input: ParentRegistrationInput): Promise<ParentRegistration> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/parent-meet/admin/registrations/manual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify(input)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add manual registration');
    return data.registration;
  },

  /**
   * Admin: Regenerate QR Pass
   */
  async regeneratePass(id: string, reason: string): Promise<string> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(`/api/parent-meet/admin/registrations/${id}/regenerate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to regenerate pass');
    return data.qr_token;
  },

  /**
   * Admin: Resend WhatsApp
   */
  async resendWhatsApp(id: string): Promise<string> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(`/api/parent-meet/admin/registrations/${id}/resend-whatsapp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token || ''}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resend WhatsApp pass');
    return data.message || 'WhatsApp message re-sent successfully';
  },

  /**
   * Admin: Override Action (Expo Reset, Attendance Correction, Food Reset)
   */
  async performOverride(payload: {
    action_type: 'expo_reset' | 'attendance_reset' | 'food_reset';
    registration_id: string;
    mandatory_reason: string;
  }): Promise<string> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/parent-meet/admin/override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to perform override');
    return data.message || 'Override completed successfully';
  },

  /**
   * Admin: Get Scanner Stations
   */
  async getScannerStations(): Promise<ScannerStation[]> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/parent-meet/admin/scanners', {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` }
    });
    if (!res.ok) throw new Error('Failed to fetch scanners');
    const data = await res.json();
    return data.stations || [];
  },

  /**
   * Admin: Save Scanner Station
   */
  async saveScannerStation(station: ScannerStation): Promise<ScannerStation> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/parent-meet/admin/scanners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify(station)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save scanner station');
    return data.station;
  },

  /**
   * Admin: Get Logs
   */
  async getLogs(): Promise<{
    scan_logs: ScanLog[];
    audit_logs: AuditLog[];
    whatsapp_logs: WhatsAppLog[];
  }> {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch('/api/parent-meet/admin/logs', {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` }
    });
    if (!res.ok) throw new Error('Failed to fetch logs');
    const data = await res.json();
    return {
      scan_logs: data.scan_logs || [],
      audit_logs: data.audit_logs || [],
      whatsapp_logs: data.whatsapp_logs || []
    };
  }
};
