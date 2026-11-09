-- ==============================================================================
-- Migration: 20261109_parent_meet_management.sql
-- Description: EDU FAMILIA – THARQIYA FAMILY MEET
-- Complete Parent Registration, Single QR Pass, Entry Management, Attendance,
-- Food Token & Admin Control System
-- ==============================================================================

-- 1. Event Settings & Configuration Table
CREATE TABLE IF NOT EXISTS public.parent_meet_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    event_name TEXT NOT NULL DEFAULT 'EDU FAMILIA',
    event_subtitle TEXT NOT NULL DEFAULT 'THARQIYA FAMILY MEET',
    organizer TEXT NOT NULL DEFAULT 'AHSAS – Anwarul Huda Students’ Association',
    venue TEXT NOT NULL DEFAULT 'Darussalam Tharqiya Edu Village',
    location TEXT NOT NULL DEFAULT 'Koyilandy, Calicut, India',
    event_date DATE NOT NULL DEFAULT '2026-11-09',
    event_day TEXT NOT NULL DEFAULT 'Monday',
    event_description TEXT NOT NULL DEFAULT 'An Islamic Parents'' Meet is a meaningful gathering that brings parents and teachers together to strengthen the bond between home and institution. It provides an opportunity to discuss children''s academic progress, moral values, Islamic upbringing, and spiritual development.',
    registration_enabled BOOLEAN NOT NULL DEFAULT true,
    registration_closing_date TIMESTAMPTZ DEFAULT NULL,
    max_registrations INTEGER NOT NULL DEFAULT 2000,
    max_attendees_per_reg INTEGER NOT NULL DEFAULT 6,
    prevent_duplicate_phone BOOLEAN NOT NULL DEFAULT true,
    expo_enabled BOOLEAN NOT NULL DEFAULT true,
    expo_max_entries INTEGER NOT NULL DEFAULT 1,
    meeting_enabled BOOLEAN NOT NULL DEFAULT true,
    food_enabled BOOLEAN NOT NULL DEFAULT true,
    food_requires_meeting BOOLEAN NOT NULL DEFAULT true,
    food_max_tokens_per_reg INTEGER NOT NULL DEFAULT 1,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
    whatsapp_api_status TEXT NOT NULL DEFAULT 'testing',
    whatsapp_phone_number_id TEXT DEFAULT '',
    whatsapp_business_account_id TEXT DEFAULT '',
    whatsapp_access_token TEXT DEFAULT '',
    whatsapp_template_name TEXT DEFAULT 'edu_familia_qr_pass',
    form_fields_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_programme JSONB NOT NULL DEFAULT '[]'::jsonb,
    public_announcements TEXT DEFAULT 'Welcome parents! Please present your unique QR pass at the Expo entrance, Main Auditorium, and Food Counter.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial setting record if absent
INSERT INTO public.parent_meet_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. Parent Registrations Table (Single Personal QR Token per registration)
CREATE TABLE IF NOT EXISTS public.parent_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL UNIQUE,
    parent_name TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    mobile_number TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    student_name TEXT NOT NULL,
    student_class TEXT DEFAULT '',
    attendees_count INTEGER NOT NULL DEFAULT 1,
    additional_details TEXT DEFAULT '',
    custom_fields JSONB DEFAULT '{}'::jsonb,
    qr_token TEXT NOT NULL UNIQUE,
    qr_token_hash TEXT NOT NULL,
    pass_status TEXT NOT NULL DEFAULT 'active',
    whatsapp_status TEXT NOT NULL DEFAULT 'not_configured',
    whatsapp_sent_at TIMESTAMPTZ DEFAULT NULL,
    whatsapp_error TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parent_reg_num ON public.parent_registrations(registration_number);
CREATE INDEX IF NOT EXISTS idx_parent_reg_phone ON public.parent_registrations(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_parent_reg_qr ON public.parent_registrations(qr_token);
CREATE INDEX IF NOT EXISTS idx_parent_reg_created ON public.parent_registrations(created_at DESC);

-- 3. Expo Entry Management Table (One-time entry tracking constraint)
CREATE TABLE IF NOT EXISTS public.expo_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.parent_registrations(id) ON DELETE CASCADE,
    entry_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scanner_id TEXT DEFAULT 'expo-main',
    staff_name TEXT DEFAULT 'Expo Staff',
    notes TEXT DEFAULT NULL,
    CONSTRAINT uq_expo_entry_per_reg UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_expo_entries_reg ON public.expo_entries(registration_id);
CREATE INDEX IF NOT EXISTS idx_expo_entries_time ON public.expo_entries(entry_timestamp DESC);

-- 4. Main Meeting Attendance Table
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.parent_registrations(id) ON DELETE CASCADE,
    attendance_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scanner_id TEXT DEFAULT 'meeting-main',
    staff_name TEXT DEFAULT 'Meeting Staff',
    notes TEXT DEFAULT NULL,
    CONSTRAINT uq_meeting_attendance_per_reg UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_att_reg ON public.meeting_attendance(registration_id);
CREATE INDEX IF NOT EXISTS idx_meeting_att_time ON public.meeting_attendance(attendance_timestamp DESC);

-- 5. Food Token Management Table (Attendance-dependent)
CREATE TABLE IF NOT EXISTS public.food_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.parent_registrations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_meeting',
    tokens_allocated INTEGER NOT NULL DEFAULT 1,
    tokens_redeemed INTEGER NOT NULL DEFAULT 0,
    redeemed_at TIMESTAMPTZ DEFAULT NULL,
    scanner_id TEXT DEFAULT NULL,
    staff_name TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_food_token_per_reg UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_food_tokens_reg ON public.food_tokens(registration_id);
CREATE INDEX IF NOT EXISTS idx_food_tokens_status ON public.food_tokens(status);

-- 6. Scanner Stations Table
CREATE TABLE IF NOT EXISTS public.scanner_stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    access_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_staff_name TEXT DEFAULT '',
    total_scans INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default scanner stations
INSERT INTO public.scanner_stations (id, name, type, access_key, is_active, assigned_staff_name)
VALUES
    ('expo-gate-1', 'Expo Main Gate', 'expo', 'EXPO-PASS-2026', true, 'Expo Reception'),
    ('meeting-hall-1', 'Main Auditorium Entrance', 'meeting', 'MEET-PASS-2026', true, 'Auditorium Desk'),
    ('food-counter-1', 'Dining Hall Food Counter', 'food', 'FOOD-PASS-2026', true, 'Catering Manager')
ON CONFLICT (id) DO NOTHING;

-- 7. Scan Activity Logs Table
CREATE TABLE IF NOT EXISTS public.scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_type TEXT NOT NULL,
    station_id TEXT DEFAULT '',
    registration_id UUID REFERENCES public.parent_registrations(id) ON DELETE SET NULL,
    qr_token_masked TEXT DEFAULT '',
    result TEXT NOT NULL,
    reason TEXT DEFAULT '',
    staff_name TEXT DEFAULT '',
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_time ON public.scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_station ON public.scan_logs(station_type);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    registration_id UUID REFERENCES public.parent_registrations(id) ON DELETE SET NULL,
    performed_by TEXT NOT NULL,
    previous_status JSONB DEFAULT NULL,
    new_status JSONB DEFAULT NULL,
    mandatory_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(created_at DESC);

-- 9. WhatsApp Delivery Logs Table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID REFERENCES public.parent_registrations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'qr_pass',
    provider TEXT NOT NULL DEFAULT 'meta_cloud_api',
    status TEXT NOT NULL,
    provider_response_id TEXT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    payload_snapshot JSONB DEFAULT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_reg ON public.whatsapp_logs(registration_id);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.parent_meet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expo_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_meet_settings_read_all" ON public.parent_meet_settings;
DROP POLICY IF EXISTS "parent_meet_settings_write_admin" ON public.parent_meet_settings;
DROP POLICY IF EXISTS "parent_registrations_insert_public" ON public.parent_registrations;
DROP POLICY IF EXISTS "parent_registrations_select_all" ON public.parent_registrations;
DROP POLICY IF EXISTS "parent_registrations_admin_all" ON public.parent_registrations;
DROP POLICY IF EXISTS "expo_entries_all" ON public.expo_entries;
DROP POLICY IF EXISTS "meeting_attendance_all" ON public.meeting_attendance;
DROP POLICY IF EXISTS "food_tokens_all" ON public.food_tokens;
DROP POLICY IF EXISTS "scanner_stations_all" ON public.scanner_stations;
DROP POLICY IF EXISTS "scan_logs_all" ON public.scan_logs;
DROP POLICY IF EXISTS "audit_logs_all" ON public.audit_logs;
DROP POLICY IF EXISTS "whatsapp_logs_all" ON public.whatsapp_logs;

CREATE POLICY "parent_meet_settings_read_all" ON public.parent_meet_settings FOR SELECT USING (true);
CREATE POLICY "parent_meet_settings_write_admin" ON public.parent_meet_settings FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "parent_registrations_insert_public" ON public.parent_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "parent_registrations_select_all" ON public.parent_registrations FOR SELECT USING (true);
CREATE POLICY "parent_registrations_admin_all" ON public.parent_registrations FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "expo_entries_all" ON public.expo_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "meeting_attendance_all" ON public.meeting_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "food_tokens_all" ON public.food_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "scanner_stations_all" ON public.scanner_stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "scan_logs_all" ON public.scan_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_all" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "whatsapp_logs_all" ON public.whatsapp_logs FOR ALL USING (true) WITH CHECK (true);

-- 11. Database Permissions Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.parent_meet_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.parent_registrations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.expo_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.meeting_attendance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.food_tokens TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.scanner_stations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.scan_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_logs TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
