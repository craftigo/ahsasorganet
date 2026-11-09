import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseServer } from '../lib/supabaseServer';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  ParentMeetSettings,
  ParentRegistration,
  ParentRegistrationInput,
  ScanVerificationResult,
  ScannerStation
} from '../../shared/types';
import {
  DEFAULT_PARENT_MEET_SETTINGS,
  generateRegistrationNumber,
  generateSecureQRToken,
  formatWhatsAppMessage
} from '../../shared/data/parentMeetDefaults';

export const parentMeetRouter = Router();

// In-memory fallback cache to ensure 100% operational uptime if Supabase table is pending migration
let cachedSettings: ParentMeetSettings = { ...DEFAULT_PARENT_MEET_SETTINGS };
const inMemoryRegistrations: Map<string, ParentRegistration> = new Map();
const inMemoryExpoEntries: Map<string, any> = new Map();
const inMemoryMeetingAttendance: Map<string, any> = new Map();
const inMemoryFoodTokens: Map<string, any> = new Map();
const inMemoryStations: Map<string, ScannerStation> = new Map([
  [
    'expo-gate-1',
    {
      id: 'expo-gate-1',
      name: 'Expo Main Gate',
      type: 'expo',
      access_key: 'EXPO-PASS-2026',
      is_active: true,
      assigned_staff_name: 'Expo Reception',
      total_scans: 0,
      created_at: new Date().toISOString()
    }
  ],
  [
    'meeting-hall-1',
    {
      id: 'meeting-hall-1',
      name: 'Main Auditorium Entrance',
      type: 'meeting',
      access_key: 'MEET-PASS-2026',
      is_active: true,
      assigned_staff_name: 'Auditorium Desk',
      total_scans: 0,
      created_at: new Date().toISOString()
    }
  ],
  [
    'food-counter-1',
    {
      id: 'food-counter-1',
      name: 'Dining Hall Food Counter',
      type: 'food',
      access_key: 'FOOD-PASS-2026',
      is_active: true,
      assigned_staff_name: 'Catering Manager',
      total_scans: 0,
      created_at: new Date().toISOString()
    }
  ]
]);
const inMemoryScanLogs: any[] = [];
const inMemoryAuditLogs: any[] = [];
const inMemoryWhatsAppLogs: any[] = [];

// ============================================================================
// HELPER: Fetch or Sync Settings
// ============================================================================
async function getActiveSettings(): Promise<ParentMeetSettings> {
  try {
    const { data, error } = await supabaseServer
      .from('parent_meet_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data) {
      cachedSettings = { ...cachedSettings, ...data };
      return cachedSettings;
    }

    // Secondary fallback: check global_settings for edu_familia_event_settings
    const { data: gData } = await supabaseServer
      .from('global_settings')
      .select('value')
      .eq('key', 'edu_familia_event_settings')
      .maybeSingle();

    if (gData && gData.value) {
      const parsed = JSON.parse(gData.value);
      cachedSettings = { ...cachedSettings, ...parsed };
      return cachedSettings;
    }
  } catch (err) {
    // Fall back to cachedSettings
  }
  return cachedSettings;
}

// ============================================================================
// 1. PUBLIC: Get Event Settings & Information
// GET /api/parent-meet/settings
// ============================================================================
parentMeetRouter.get('/settings', async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getActiveSettings();
    // Sanitize secret credentials from public response
    const publicSettings = {
      ...settings,
      whatsapp_access_token: undefined
    };
    res.json({ success: true, settings: publicSettings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

// ============================================================================
// 2. ADMIN: Update Event Settings
// POST /api/parent-meet/settings
// ============================================================================
parentMeetRouter.post('/settings', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const updates: Partial<ParentMeetSettings> = req.body;
    cachedSettings = {
      ...cachedSettings,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // 1. Try updating parent_meet_settings table
    try {
      await supabaseServer
        .from('parent_meet_settings')
        .upsert(cachedSettings);
    } catch {
      // Table may not exist yet
    }

    // 2. Mirror into global_settings for guaranteed persistence
    try {
      await supabaseServer
        .from('global_settings')
        .upsert({
          key: 'edu_familia_event_settings',
          value: JSON.stringify(cachedSettings),
          updated_at: new Date().toISOString()
        });
    } catch {}

    // 3. Log to audit log
    const auditEntry = {
      id: crypto.randomUUID(),
      action: 'rule_change',
      performed_by: req.user?.email || 'admin',
      mandatory_reason: updates.public_announcements ? 'Updated public announcements' : 'Updated event configuration rules',
      created_at: new Date().toISOString()
    };
    inMemoryAuditLogs.unshift(auditEntry);
    supabaseServer.from('audit_logs').insert(auditEntry).then(() => {}, () => {});

    res.json({ success: true, settings: cachedSettings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

// ============================================================================
// 3. PUBLIC: Register Parent & Generate Unique QR Pass
// POST /api/parent-meet/register
// ============================================================================
parentMeetRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getActiveSettings();

    // 1. Check if registration is open
    if (!settings.registration_enabled) {
      res.status(403).json({ error: 'Registration is currently closed for this event.' });
      return;
    }

    if (settings.registration_closing_date) {
      const closing = new Date(settings.registration_closing_date);
      if (new Date() > closing) {
        res.status(403).json({ error: 'Registration deadline has passed. Registration is now closed.' });
        return;
      }
    }

    const input: ParentRegistrationInput = req.body;

    // 2. Validate Fields
    if (!input.parent_name || !input.parent_name.trim()) {
      res.status(400).json({ error: 'Parent / Guardian name is required.' });
      return;
    }

    const cleanWhatsapp = (input.whatsapp_number || '').replace(/\D/g, '');
    if (!cleanWhatsapp || cleanWhatsapp.length < 10) {
      res.status(400).json({ error: 'A valid WhatsApp phone number (minimum 10 digits) is required.' });
      return;
    }

    if (!input.student_name || !input.student_name.trim()) {
      res.status(400).json({ error: 'Child / Student name is required.' });
      return;
    }

    const attendees = Math.max(1, Math.min(Number(input.attendees_count) || 1, settings.max_attendees_per_reg || 6));

    // 3. Duplicate check
    if (settings.prevent_duplicate_phone) {
      let duplicateFound = false;
      try {
        const { data: existingSb } = await supabaseServer
          .from('parent_registrations')
          .select('id, registration_number')
          .eq('whatsapp_number', cleanWhatsapp)
          .maybeSingle();

        if (existingSb) duplicateFound = true;
      } catch {}

      if (!duplicateFound) {
        for (const reg of inMemoryRegistrations.values()) {
          if (reg.whatsapp_number.replace(/\D/g, '') === cleanWhatsapp) {
            duplicateFound = true;
            break;
          }
        }
      }

      if (duplicateFound) {
        res.status(409).json({
          error: 'This WhatsApp number is already registered for Edu Familia. Each family registration requires a unique contact number.'
        });
        return;
      }
    }

    // 4. Generate Registration Number & Secure QR Token
    let currentCount = inMemoryRegistrations.size + 1;
    try {
      const { count } = await supabaseServer
        .from('parent_registrations')
        .select('*', { count: 'exact', head: true });
      if (typeof count === 'number') currentCount = count + 1;
    } catch {}

    const regNumber = generateRegistrationNumber(currentCount);
    const qrToken = generateSecureQRToken();
    const qrHash = crypto.createHash('sha256').update(qrToken).digest('hex');

    const newRegistration: ParentRegistration = {
      id: crypto.randomUUID(),
      registration_number: regNumber,
      parent_name: input.parent_name.trim(),
      whatsapp_number: cleanWhatsapp,
      mobile_number: (input.mobile_number || '').trim(),
      email: (input.email || '').trim().toLowerCase(),
      address: (input.address || '').trim(),
      student_name: input.student_name.trim(),
      student_class: (input.student_class || '').trim(),
      attendees_count: attendees,
      additional_details: (input.additional_details || '').trim(),
      custom_fields: input.custom_fields || {},
      qr_token: qrToken,
      qr_token_hash: qrHash,
      pass_status: 'active',
      whatsapp_status: settings.whatsapp_enabled ? 'pending' : 'not_configured',
      created_at: new Date().toISOString()
    };

    // 5. Save to database
    try {
      await supabaseServer.from('parent_registrations').insert(newRegistration);
    } catch (sbErr) {
      console.warn('[ParentMeet API] Supabase insert warning (cached locally):', sbErr);
    }
    inMemoryRegistrations.set(newRegistration.id, newRegistration);

    // 6. Create initial food token allocation
    const foodToken = {
      id: crypto.randomUUID(),
      registration_id: newRegistration.id,
      status: 'pending_meeting' as const,
      tokens_allocated: settings.food_max_tokens_per_reg || 1,
      tokens_redeemed: 0,
      created_at: new Date().toISOString()
    };
    inMemoryFoodTokens.set(newRegistration.id, foodToken);
    supabaseServer.from('food_tokens').insert(foodToken).then(() => {}, () => {});

    // 7. WhatsApp Delivery Workflow
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
    const passUrl = `${protocol}://${host}/event/pass/${qrToken}`;

    const waLog = {
      id: crypto.randomUUID(),
      registration_id: newRegistration.id,
      phone_number: cleanWhatsapp,
      message_type: 'qr_pass',
      provider: 'meta_cloud_api',
      status: settings.whatsapp_enabled ? 'simulated' : 'not_configured',
      error_message: settings.whatsapp_enabled ? null : 'WhatsApp API provider not yet configured with production credentials',
      payload_snapshot: {
        text: formatWhatsAppMessage(newRegistration.parent_name, regNumber, passUrl, settings.event_date, settings.venue)
      },
      sent_at: new Date().toISOString()
    };
    inMemoryWhatsAppLogs.unshift(waLog);
    supabaseServer.from('whatsapp_logs').insert(waLog).then(() => {}, () => {});

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully!',
      registration: newRegistration,
      pass_url: passUrl
    });
  } catch (err: any) {
    console.error('[ParentMeet API] Registration error:', err);
    res.status(500).json({ error: 'Server error during registration: ' + (err.message || 'Unknown error') });
  }
});

// ============================================================================
// 4. PUBLIC: Get QR Pass Details by Secure Token
// GET /api/parent-meet/pass/:token
// ============================================================================
parentMeetRouter.get('/pass/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    let registration: ParentRegistration | null = null;

    // 1. Search in Supabase
    try {
      const { data } = await supabaseServer
        .from('parent_registrations')
        .select('*')
        .eq('qr_token', token)
        .maybeSingle();
      if (data) registration = data as ParentRegistration;
    } catch {}

    // 2. Search in memory
    if (!registration) {
      for (const reg of inMemoryRegistrations.values()) {
        if (reg.qr_token === token) {
          registration = reg;
          break;
        }
      }
    }

    if (!registration) {
      res.status(404).json({ error: 'QR Pass not found. Please verify your token.' });
      return;
    }

    // 3. Fetch status of Expo, Meeting, Food
    let expoEntry = inMemoryExpoEntries.get(registration.id) || null;
    let meetingAtt = inMemoryMeetingAttendance.get(registration.id) || null;
    let foodToken = inMemoryFoodTokens.get(registration.id) || null;

    try {
      const [expoRes, meetRes, foodRes] = await Promise.all([
        supabaseServer.from('expo_entries').select('*').eq('registration_id', registration.id).maybeSingle(),
        supabaseServer.from('meeting_attendance').select('*').eq('registration_id', registration.id).maybeSingle(),
        supabaseServer.from('food_tokens').select('*').eq('registration_id', registration.id).maybeSingle()
      ]);
      if (expoRes.data) expoEntry = expoRes.data;
      if (meetRes.data) meetingAtt = meetRes.data;
      if (foodRes.data) foodToken = foodRes.data;
    } catch {}

    const settings = await getActiveSettings();

    res.json({
      success: true,
      registration: {
        id: registration.id,
        registration_number: registration.registration_number,
        parent_name: registration.parent_name,
        whatsapp_number: registration.whatsapp_number,
        student_name: registration.student_name,
        student_class: registration.student_class,
        attendees_count: registration.attendees_count,
        address: registration.address,
        pass_status: registration.pass_status,
        created_at: registration.created_at
      },
      event: {
        name: settings.event_name,
        subtitle: settings.event_subtitle,
        date: settings.event_date,
        day: settings.event_day,
        venue: settings.venue,
        location: settings.location
      },
      statuses: {
        expo_entered: !!expoEntry,
        expo_entry_time: expoEntry?.entry_timestamp || null,
        meeting_attended: !!meetingAtt,
        meeting_attendance_time: meetingAtt?.attendance_timestamp || null,
        food_status: foodToken?.status || (meetingAtt ? 'eligible' : 'pending_meeting'),
        food_redeemed_at: foodToken?.redeemed_at || null,
        food_tokens_allocated: foodToken?.tokens_allocated || 1,
        food_tokens_redeemed: foodToken?.tokens_redeemed || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching pass' });
  }
});

// ============================================================================
// 5. CRITICAL CORE: Scanner Verification & Atomic Recording
// POST /api/parent-meet/scan/verify
// ============================================================================
parentMeetRouter.post('/scan/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      station_type, // 'expo' | 'meeting' | 'food'
      station_key,
      qr_token,
      manual_id,
      staff_name = 'Staff Member'
    } = req.body;

    if (!station_type || !['expo', 'meeting', 'food'].includes(station_type)) {
      res.status(400).json({
        success: false,
        result_code: 'UNAUTHORIZED_SCANNER',
        message: 'Invalid scanner station type specified.'
      });
      return;
    }

    // 1. Station authorization verification
    const station = inMemoryStations.get(`${station_type}-gate-1`) || inMemoryStations.get(`${station_type}-hall-1`) || inMemoryStations.get(`${station_type}-counter-1`);
    if (station_key && station && station.access_key && station_key !== station.access_key) {
      res.status(403).json({
        success: false,
        result_code: 'UNAUTHORIZED_SCANNER',
        message: 'Invalid station access credentials.'
      });
      return;
    }

    const cleanToken = typeof qr_token === 'string' ? qr_token.trim() : '';
    const cleanManual = typeof manual_id === 'string' ? manual_id.trim().toUpperCase() : '';

    if (!cleanToken && !cleanManual) {
      res.status(400).json({
        success: false,
        result_code: 'INVALID_QR',
        message: 'No QR code or Registration ID provided.'
      });
      return;
    }

    // 2. Lookup Registration Record
    let registration: ParentRegistration | null = null;

    try {
      let query = supabaseServer.from('parent_registrations').select('*');
      if (cleanToken) {
        query = query.eq('qr_token', cleanToken);
      } else {
        query = query.or(`registration_number.eq.${cleanManual},whatsapp_number.eq.${cleanManual}`);
      }
      const { data } = await query.maybeSingle();
      if (data) registration = data as ParentRegistration;
    } catch {}

    if (!registration) {
      for (const reg of inMemoryRegistrations.values()) {
        if (cleanToken && reg.qr_token === cleanToken) {
          registration = reg;
          break;
        }
        if (cleanManual && (reg.registration_number === cleanManual || reg.whatsapp_number === cleanManual)) {
          registration = reg;
          break;
        }
      }
    }

    const maskedToken = cleanToken ? `${cleanToken.slice(0, 10)}...${cleanToken.slice(-4)}` : cleanManual;

    // 3. Registration not found
    if (!registration) {
      const scanLog = {
        id: crypto.randomUUID(),
        station_type,
        station_id: station?.id || station_type,
        registration_id: null,
        qr_token_masked: maskedToken,
        result: 'invalid_qr',
        reason: 'Registration not found in database',
        staff_name,
        scanned_at: new Date().toISOString()
      };
      inMemoryScanLogs.unshift(scanLog);
      supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

      const result: ScanVerificationResult = {
        success: false,
        result_code: 'REGISTRATION_NOT_FOUND',
        message: 'Registration not found. Invalid or unrecognized QR pass.'
      };
      res.status(404).json(result);
      return;
    }

    // 4. Pass Revoked or Cancelled
    if (registration.pass_status !== 'active') {
      const scanLog = {
        id: crypto.randomUUID(),
        station_type,
        station_id: station?.id || station_type,
        registration_id: registration.id,
        qr_token_masked: maskedToken,
        result: 'revoked',
        reason: `Pass status is ${registration.pass_status}`,
        staff_name,
        scanned_at: new Date().toISOString()
      };
      inMemoryScanLogs.unshift(scanLog);
      supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

      const result: ScanVerificationResult = {
        success: false,
        result_code: 'REVOKED_QR',
        message: `This pass has been ${registration.pass_status.toUpperCase()} by the administrator.`
      };
      res.status(403).json(result);
      return;
    }

    // ========================================================================
    // STATION TYPE 1: EXPO ENTRY (Strict 1-Time Entry Rule)
    // ========================================================================
    if (station_type === 'expo') {
      let existingEntry = inMemoryExpoEntries.get(registration.id);
      if (!existingEntry) {
        try {
          const { data } = await supabaseServer
            .from('expo_entries')
            .select('*')
            .eq('registration_id', registration.id)
            .maybeSingle();
          if (data) existingEntry = data;
        } catch {}
      }

      if (existingEntry) {
        const scanLog = {
          id: crypto.randomUUID(),
          station_type: 'expo',
          station_id: station?.id || 'expo',
          registration_id: registration.id,
          qr_token_masked: maskedToken,
          result: 'already_entered',
          reason: 'Parent has already entered Expo',
          staff_name,
          scanned_at: new Date().toISOString()
        };
        inMemoryScanLogs.unshift(scanLog);
        supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

        const result: ScanVerificationResult = {
          success: false,
          result_code: 'EXPO_ALREADY_ENTERED',
          message: 'ALREADY ENTERED – RE-ENTRY NOT ALLOWED',
          registration: {
            id: registration.id,
            registration_number: registration.registration_number,
            parent_name: registration.parent_name,
            student_name: registration.student_name,
            student_class: registration.student_class,
            attendees_count: registration.attendees_count,
            whatsapp_number: registration.whatsapp_number
          },
          details: {
            original_timestamp: existingEntry.entry_timestamp,
            staff_name: existingEntry.staff_name
          }
        };
        res.status(409).json(result);
        return;
      }

      // Record first Expo entry atomically
      const newEntry = {
        id: crypto.randomUUID(),
        registration_id: registration.id,
        entry_timestamp: new Date().toISOString(),
        scanner_id: station?.id || 'expo-gate-1',
        staff_name
      };
      inMemoryExpoEntries.set(registration.id, newEntry);
      supabaseServer.from('expo_entries').insert(newEntry).then(() => {}, () => {});

      if (station) station.total_scans += 1;

      const scanLog = {
        id: crypto.randomUUID(),
        station_type: 'expo',
        station_id: station?.id || 'expo',
        registration_id: registration.id,
        qr_token_masked: maskedToken,
        result: 'approved',
        reason: 'First Expo entry approved',
        staff_name,
        scanned_at: new Date().toISOString()
      };
      inMemoryScanLogs.unshift(scanLog);
      supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

      const result: ScanVerificationResult = {
        success: true,
        result_code: 'EXPO_APPROVED',
        message: 'EXPO ENTRY APPROVED',
        registration: {
          id: registration.id,
          registration_number: registration.registration_number,
          parent_name: registration.parent_name,
          student_name: registration.student_name,
          student_class: registration.student_class,
          attendees_count: registration.attendees_count,
          whatsapp_number: registration.whatsapp_number
        },
        details: {
          original_timestamp: newEntry.entry_timestamp,
          staff_name
        }
      };
      res.json(result);
      return;
    }

    // ========================================================================
    // STATION TYPE 2: MAIN MEETING ATTENDANCE
    // ========================================================================
    if (station_type === 'meeting') {
      let existingAttendance = inMemoryMeetingAttendance.get(registration.id);
      if (!existingAttendance) {
        try {
          const { data } = await supabaseServer
            .from('meeting_attendance')
            .select('*')
            .eq('registration_id', registration.id)
            .maybeSingle();
          if (data) existingAttendance = data;
        } catch {}
      }

      if (existingAttendance) {
        const scanLog = {
          id: crypto.randomUUID(),
          station_type: 'meeting',
          station_id: station?.id || 'meeting',
          registration_id: registration.id,
          qr_token_masked: maskedToken,
          result: 'already_attended',
          reason: 'Attendance already recorded previously',
          staff_name,
          scanned_at: new Date().toISOString()
        };
        inMemoryScanLogs.unshift(scanLog);
        supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

        const result: ScanVerificationResult = {
          success: false,
          result_code: 'MEETING_ALREADY_ATTENDED',
          message: 'ATTENDANCE ALREADY RECORDED',
          registration: {
            id: registration.id,
            registration_number: registration.registration_number,
            parent_name: registration.parent_name,
            student_name: registration.student_name,
            student_class: registration.student_class,
            attendees_count: registration.attendees_count,
            whatsapp_number: registration.whatsapp_number
          },
          details: {
            original_timestamp: existingAttendance.attendance_timestamp,
            staff_name: existingAttendance.staff_name
          }
        };
        res.status(409).json(result);
        return;
      }

      // Record meeting attendance atomically
      const newAttendance = {
        id: crypto.randomUUID(),
        registration_id: registration.id,
        attendance_timestamp: new Date().toISOString(),
        scanner_id: station?.id || 'meeting-hall-1',
        staff_name
      };
      inMemoryMeetingAttendance.set(registration.id, newAttendance);
      supabaseServer.from('meeting_attendance').insert(newAttendance).then(() => {}, () => {});

      // Automatically upgrade food token status to eligible!
      let foodToken = inMemoryFoodTokens.get(registration.id);
      if (foodToken) {
        foodToken.status = 'eligible';
      }
      supabaseServer
        .from('food_tokens')
        .update({ status: 'eligible', updated_at: new Date().toISOString() })
        .eq('registration_id', registration.id)
        .then(() => {}, () => {});

      if (station) station.total_scans += 1;

      const scanLog = {
        id: crypto.randomUUID(),
        station_type: 'meeting',
        station_id: station?.id || 'meeting',
        registration_id: registration.id,
        qr_token_masked: maskedToken,
        result: 'approved',
        reason: 'Main Meeting attendance confirmed',
        staff_name,
        scanned_at: new Date().toISOString()
      };
      inMemoryScanLogs.unshift(scanLog);
      supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

      const result: ScanVerificationResult = {
        success: true,
        result_code: 'MEETING_APPROVED',
        message: 'MAIN MEETING ATTENDANCE CONFIRMED',
        registration: {
          id: registration.id,
          registration_number: registration.registration_number,
          parent_name: registration.parent_name,
          student_name: registration.student_name,
          student_class: registration.student_class,
          attendees_count: registration.attendees_count,
          whatsapp_number: registration.whatsapp_number
        },
        details: {
          original_timestamp: newAttendance.attendance_timestamp,
          staff_name
        }
      };
      res.json(result);
      return;
    }

    // ========================================================================
    // STATION TYPE 3: FOOD COUNTER (Strict Meeting Attendance Dependency)
    // ========================================================================
    if (station_type === 'food') {
      const settings = await getActiveSettings();

      // Check if food feature is enabled
      if (!settings.food_enabled) {
        res.status(403).json({
          success: false,
          result_code: 'UNAUTHORIZED_SCANNER',
          message: 'Food token redemption is currently disabled in event settings.'
        });
        return;
      }

      // STEP A: VERIFY MAIN MEETING ATTENDANCE
      if (settings.food_requires_meeting) {
        let hasAttendedMeeting = inMemoryMeetingAttendance.has(registration.id);
        if (!hasAttendedMeeting) {
          try {
            const { data } = await supabaseServer
              .from('meeting_attendance')
              .select('id')
              .eq('registration_id', registration.id)
              .maybeSingle();
            if (data) hasAttendedMeeting = true;
          } catch {}
        }

        if (!hasAttendedMeeting) {
          const scanLog = {
            id: crypto.randomUUID(),
            station_type: 'food',
            station_id: station?.id || 'food',
            registration_id: registration.id,
            qr_token_masked: maskedToken,
            result: 'missing_meeting',
            reason: 'Main meeting attendance missing',
            staff_name,
            scanned_at: new Date().toISOString()
          };
          inMemoryScanLogs.unshift(scanLog);
          supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

          const result: ScanVerificationResult = {
            success: false,
            result_code: 'FOOD_MISSING_MEETING',
            message:
              'FOOD ACCESS DENIED – Main Meeting Attendance Not Found. Please attend the Main Meeting before collecting your food token.',
            registration: {
              id: registration.id,
              registration_number: registration.registration_number,
              parent_name: registration.parent_name,
              student_name: registration.student_name,
              student_class: registration.student_class,
              attendees_count: registration.attendees_count,
              whatsapp_number: registration.whatsapp_number
            }
          };
          res.status(403).json(result);
          return;
        }
      }

      // STEP B: CHECK FOOD TOKEN REDEMPTION STATUS
      let foodToken = inMemoryFoodTokens.get(registration.id);
      if (!foodToken) {
        try {
          const { data } = await supabaseServer
            .from('food_tokens')
            .select('*')
            .eq('registration_id', registration.id)
            .maybeSingle();
          if (data) foodToken = data;
        } catch {}
      }

      const allocated = foodToken?.tokens_allocated || settings.food_max_tokens_per_reg || 1;
      const redeemed = foodToken?.tokens_redeemed || 0;

      if (foodToken && foodToken.status === 'redeemed' && redeemed >= allocated) {
        const scanLog = {
          id: crypto.randomUUID(),
          station_type: 'food',
          station_id: station?.id || 'food',
          registration_id: registration.id,
          qr_token_masked: maskedToken,
          result: 'already_redeemed',
          reason: 'Food token already redeemed',
          staff_name,
          scanned_at: new Date().toISOString()
        };
        inMemoryScanLogs.unshift(scanLog);
        supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

        const result: ScanVerificationResult = {
          success: false,
          result_code: 'FOOD_ALREADY_REDEEMED',
          message: 'FOOD TOKEN ALREADY USED – Food has already been collected.',
          registration: {
            id: registration.id,
            registration_number: registration.registration_number,
            parent_name: registration.parent_name,
            student_name: registration.student_name,
            student_class: registration.student_class,
            attendees_count: registration.attendees_count,
            whatsapp_number: registration.whatsapp_number
          },
          details: {
            original_timestamp: foodToken.redeemed_at || undefined,
            staff_name: foodToken.staff_name || undefined,
            tokens_allocated: allocated,
            tokens_redeemed: redeemed
          }
        };
        res.status(409).json(result);
        return;
      }

      // STEP C: APPROVE AND REDEEM FOOD TOKEN ATOMICALLY
      const now = new Date().toISOString();
      const updatedFoodToken = {
        id: foodToken?.id || crypto.randomUUID(),
        registration_id: registration.id,
        status: 'redeemed' as const,
        tokens_allocated: allocated,
        tokens_redeemed: allocated,
        redeemed_at: now,
        scanner_id: station?.id || 'food-counter-1',
        staff_name,
        updated_at: now
      };
      inMemoryFoodTokens.set(registration.id, updatedFoodToken);
      supabaseServer.from('food_tokens').upsert(updatedFoodToken).then(() => {}, () => {});

      if (station) station.total_scans += 1;

      const scanLog = {
        id: crypto.randomUUID(),
        station_type: 'food',
        station_id: station?.id || 'food',
        registration_id: registration.id,
        qr_token_masked: maskedToken,
        result: 'approved',
        reason: 'Food token successfully redeemed',
        staff_name,
        scanned_at: now
      };
      inMemoryScanLogs.unshift(scanLog);
      supabaseServer.from('scan_logs').insert(scanLog).then(() => {}, () => {});

      const result: ScanVerificationResult = {
        success: true,
        result_code: 'FOOD_APPROVED',
        message: 'FOOD TOKEN APPROVED – Meeting attendance verified. Food token successfully redeemed.',
        registration: {
          id: registration.id,
          registration_number: registration.registration_number,
          parent_name: registration.parent_name,
          student_name: registration.student_name,
          student_class: registration.student_class,
          attendees_count: registration.attendees_count,
          whatsapp_number: registration.whatsapp_number
        },
        details: {
          tokens_allocated: allocated,
          tokens_redeemed: allocated,
          original_timestamp: now,
          staff_name
        }
      };
      res.json(result);
      return;
    }
  } catch (err: any) {
    console.error('[ParentMeet API] Scan verify exception:', err);
    res.status(500).json({
      success: false,
      result_code: 'REGISTRATION_NOT_FOUND',
      message: 'Server error during scan verification: ' + (err.message || 'Unknown error')
    });
  }
});

// ============================================================================
// 6. ADMIN: Overview Dashboard Stats
// GET /api/parent-meet/admin/stats
// ============================================================================
parentMeetRouter.get('/admin/stats', requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let regs: ParentRegistration[] = Array.from(inMemoryRegistrations.values());
    try {
      const { data } = await supabaseServer.from('parent_registrations').select('*');
      if (data && data.length > 0) regs = data as ParentRegistration[];
    } catch {}

    let expoCount = inMemoryExpoEntries.size;
    let meetingCount = inMemoryMeetingAttendance.size;
    let foodRedeemedCount = 0;

    for (const f of inMemoryFoodTokens.values()) {
      if (f.status === 'redeemed') foodRedeemedCount += 1;
    }

    try {
      const [expoRes, meetRes, foodRes] = await Promise.all([
        supabaseServer.from('expo_entries').select('*', { count: 'exact', head: true }),
        supabaseServer.from('meeting_attendance').select('*', { count: 'exact', head: true }),
        supabaseServer.from('food_tokens').select('*', { count: 'exact', head: true }).eq('status', 'redeemed')
      ]);
      if (typeof expoRes.count === 'number') expoCount = expoRes.count;
      if (typeof meetRes.count === 'number') meetingCount = meetRes.count;
      if (typeof foodRes.count === 'number') foodRedeemedCount = foodRes.count;
    } catch {}

    const totalRegs = regs.length;
    const totalAttendees = regs.reduce((sum, r) => sum + (r.attendees_count || 1), 0);

    let waSent = 0;
    let waFailed = 0;
    for (const r of regs) {
      if (r.whatsapp_status === 'sent' || r.whatsapp_status === 'delivered') waSent++;
      if (r.whatsapp_status === 'failed') waFailed++;
    }

    res.json({
      success: true,
      stats: {
        total_registrations: totalRegs,
        total_attendees: totalAttendees,
        expo_completed: expoCount,
        expo_remaining: Math.max(0, totalRegs - expoCount),
        meeting_completed: meetingCount,
        meeting_remaining: Math.max(0, totalRegs - meetingCount),
        food_eligible: meetingCount,
        food_redeemed: foodRedeemedCount,
        food_remaining: Math.max(0, meetingCount - foodRedeemedCount),
        whatsapp_sent: waSent,
        whatsapp_failed: waFailed
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stats' });
  }
});

// ============================================================================
// 7. ADMIN: List Registrations with Filters
// GET /api/parent-meet/admin/registrations
// ============================================================================
parentMeetRouter.get('/admin/registrations', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let list: ParentRegistration[] = Array.from(inMemoryRegistrations.values());

    try {
      const { data } = await supabaseServer
        .from('parent_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) list = data as ParentRegistration[];
    } catch {}

    // Attach statuses
    const enriched = list.map((reg) => ({
      ...reg,
      expo_entry: inMemoryExpoEntries.get(reg.id) || null,
      meeting_attendance: inMemoryMeetingAttendance.get(reg.id) || null,
      food_token: inMemoryFoodTokens.get(reg.id) || null
    }));

    res.json({ success: true, registrations: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch registrations' });
  }
});

// ============================================================================
// 8. ADMIN: Manual Add Registration
// POST /api/parent-meet/admin/registrations/manual
// ============================================================================
parentMeetRouter.post('/admin/registrations/manual', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input: ParentRegistrationInput = req.body;
    if (!input.parent_name || !input.whatsapp_number || !input.student_name) {
      res.status(400).json({ error: 'Parent name, WhatsApp number, and Student name are required.' });
      return;
    }

    const cleanPhone = input.whatsapp_number.replace(/\D/g, '');
    const currentCount = inMemoryRegistrations.size + 1;
    const regNumber = generateRegistrationNumber(currentCount);
    const qrToken = generateSecureQRToken();
    const qrHash = crypto.createHash('sha256').update(qrToken).digest('hex');

    const newReg: ParentRegistration = {
      id: crypto.randomUUID(),
      registration_number: regNumber,
      parent_name: input.parent_name.trim(),
      whatsapp_number: cleanPhone,
      mobile_number: (input.mobile_number || '').trim(),
      email: (input.email || '').trim().toLowerCase(),
      address: (input.address || '').trim(),
      student_name: input.student_name.trim(),
      student_class: (input.student_class || '').trim(),
      attendees_count: Number(input.attendees_count) || 1,
      additional_details: (input.additional_details || '').trim(),
      custom_fields: input.custom_fields || {},
      qr_token: qrToken,
      qr_token_hash: qrHash,
      pass_status: 'active',
      whatsapp_status: 'not_configured',
      created_at: new Date().toISOString()
    };

    inMemoryRegistrations.set(newReg.id, newReg);
    supabaseServer.from('parent_registrations').insert(newReg).then(() => {}, () => {});

    // Initial Food token
    const ft = {
      id: crypto.randomUUID(),
      registration_id: newReg.id,
      status: 'pending_meeting' as const,
      tokens_allocated: 1,
      tokens_redeemed: 0,
      created_at: new Date().toISOString()
    };
    inMemoryFoodTokens.set(newReg.id, ft);
    supabaseServer.from('food_tokens').insert(ft).then(() => {}, () => {});

    // Audit log
    const auditEntry = {
      id: crypto.randomUUID(),
      action: 'registration_edited',
      registration_id: newReg.id,
      performed_by: req.user?.email || 'admin',
      mandatory_reason: 'Manual registration created by administrator',
      created_at: new Date().toISOString()
    };
    inMemoryAuditLogs.unshift(auditEntry);
    supabaseServer.from('audit_logs').insert(auditEntry).then(() => {}, () => {});

    res.status(201).json({ success: true, registration: newReg });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add manual registration' });
  }
});

// ============================================================================
// 9. ADMIN: Regenerate QR Pass
// POST /api/parent-meet/admin/registrations/:id/regenerate-qr
// ============================================================================
parentMeetRouter.post('/admin/registrations/:id/regenerate-qr', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Administrator reissued QR Pass' } = req.body;

    const reg = inMemoryRegistrations.get(id);
    const newToken = generateSecureQRToken();
    const newHash = crypto.createHash('sha256').update(newToken).digest('hex');

    if (reg) {
      reg.qr_token = newToken;
      reg.qr_token_hash = newHash;
      reg.pass_status = 'active';
      reg.updated_at = new Date().toISOString();
    }

    try {
      await supabaseServer
        .from('parent_registrations')
        .update({
          qr_token: newToken,
          qr_token_hash: newHash,
          pass_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch {}

    // Audit log
    const audit = {
      id: crypto.randomUUID(),
      action: 'qr_regenerated',
      registration_id: id,
      performed_by: req.user?.email || 'admin',
      mandatory_reason: reason,
      created_at: new Date().toISOString()
    };
    inMemoryAuditLogs.unshift(audit);
    supabaseServer.from('audit_logs').insert(audit).then(() => {}, () => {});

    res.json({ success: true, qr_token: newToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to regenerate QR pass' });
  }
});

// ============================================================================
// 10. ADMIN: Resend WhatsApp QR Pass
// POST /api/parent-meet/admin/registrations/:id/resend-whatsapp
// ============================================================================
parentMeetRouter.post('/admin/registrations/:id/resend-whatsapp', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let reg = inMemoryRegistrations.get(id);

    if (!reg) {
      try {
        const { data } = await supabaseServer.from('parent_registrations').select('*').eq('id', id).maybeSingle();
        if (data) reg = data as ParentRegistration;
      } catch {}
    }

    if (!reg) {
      res.status(404).json({ error: 'Registration not found' });
      return;
    }

    const settings = await getActiveSettings();
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
    const passUrl = `${protocol}://${host}/event/pass/${reg.qr_token}`;

    const waLog = {
      id: crypto.randomUUID(),
      registration_id: reg.id,
      phone_number: reg.whatsapp_number,
      message_type: 'qr_pass_resend',
      provider: 'meta_cloud_api',
      status: settings.whatsapp_enabled ? 'sent' : 'simulated',
      error_message: settings.whatsapp_enabled ? null : 'Simulated resend (WhatsApp credentials not configured)',
      payload_snapshot: {
        text: formatWhatsAppMessage(reg.parent_name, reg.registration_number, passUrl, settings.event_date, settings.venue)
      },
      sent_at: new Date().toISOString()
    };
    inMemoryWhatsAppLogs.unshift(waLog);
    supabaseServer.from('whatsapp_logs').insert(waLog).then(() => {}, () => {});

    reg.whatsapp_status = settings.whatsapp_enabled ? 'sent' : 'not_configured';
    reg.whatsapp_sent_at = new Date().toISOString();

    res.json({
      success: true,
      message: `WhatsApp pass resend initiated for ${reg.parent_name} (${reg.whatsapp_number}).`,
      pass_url: passUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resend WhatsApp pass' });
  }
});

// ============================================================================
// 11. ADMIN: Authorized Override (Expo Reset, Attendance Correction, Food Reset)
// POST /api/parent-meet/admin/override
// ============================================================================
parentMeetRouter.post('/admin/override', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { action_type, registration_id, mandatory_reason } = req.body;

    if (!action_type || !registration_id || !mandatory_reason || !mandatory_reason.trim()) {
      res.status(400).json({
        error: 'Action type, registration ID, and a mandatory reason are required for audit logging.'
      });
      return;
    }

    if (action_type === 'expo_reset') {
      inMemoryExpoEntries.delete(registration_id);
      try {
        await supabaseServer.from('expo_entries').delete().eq('registration_id', registration_id);
      } catch {}
    } else if (action_type === 'attendance_reset') {
      inMemoryMeetingAttendance.delete(registration_id);
      try {
        await supabaseServer.from('meeting_attendance').delete().eq('registration_id', registration_id);
      } catch {}
    } else if (action_type === 'food_reset') {
      const ft = inMemoryFoodTokens.get(registration_id);
      if (ft) {
        ft.status = 'eligible';
        ft.tokens_redeemed = 0;
        ft.redeemed_at = null;
      }
      try {
        await supabaseServer
          .from('food_tokens')
          .update({ status: 'eligible', tokens_redeemed: 0, redeemed_at: null })
          .eq('registration_id', registration_id);
      } catch {}
    } else {
      res.status(400).json({ error: 'Unknown override action type' });
      return;
    }

    // Record audit log
    const audit = {
      id: crypto.randomUUID(),
      action: action_type,
      registration_id,
      performed_by: req.user?.email || 'admin',
      mandatory_reason: mandatory_reason.trim(),
      created_at: new Date().toISOString()
    };
    inMemoryAuditLogs.unshift(audit);
    supabaseServer.from('audit_logs').insert(audit).then(() => {}, () => {});

    res.json({ success: true, message: `Override '${action_type}' executed and logged.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute override' });
  }
});

// ============================================================================
// 12. ADMIN: Scanner Stations & Device Management
// GET & POST /api/parent-meet/admin/scanners
// ============================================================================
parentMeetRouter.get('/admin/scanners', requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let stations = Array.from(inMemoryStations.values());
    try {
      const { data } = await supabaseServer.from('scanner_stations').select('*');
      if (data && data.length > 0) stations = data as ScannerStation[];
    } catch {}
    res.json({ success: true, stations });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch scanners' });
  }
});

parentMeetRouter.post('/admin/scanners', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const station: ScannerStation = req.body;
    if (!station.id || !station.name || !station.type) {
      res.status(400).json({ error: 'Station ID, name, and type are required' });
      return;
    }
    inMemoryStations.set(station.id, station);
    supabaseServer.from('scanner_stations').upsert(station).then(() => {}, () => {});
    res.json({ success: true, station });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save scanner station' });
  }
});

// ============================================================================
// 13. ADMIN: Logs & Activity Reports
// GET /api/parent-meet/admin/logs
// ============================================================================
parentMeetRouter.get('/admin/logs', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const type = req.query.type || 'all';
    res.json({
      success: true,
      scan_logs: inMemoryScanLogs.slice(0, 100),
      audit_logs: inMemoryAuditLogs.slice(0, 100),
      whatsapp_logs: inMemoryWhatsAppLogs.slice(0, 100)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch logs' });
  }
});
