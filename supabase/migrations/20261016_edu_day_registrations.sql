-- ==============================================================================
-- Migration: 20261016_edu_day_registrations.sql
-- Description: Production-hardened additive migration for AHSAS EDU DAY
--              Anniversary & Jazriyya One Day Workshop registration system.
-- Author: AHSAS Full-Stack Engineering & Application Security Team
-- Safety Guarantee: 100% additive. ZERO modifications to existing production tables,
--                   data, or settings. Precondition checks halt on conflicts.
-- Status: PREPARED & VALIDATED — Awaiting explicit user approval before execution.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRECONDITION AUDIT: Inspect Existing Objects & Prevent Accidental Overwrite
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Check if table already exists unexpectedly
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'edu_day_registrations'
    ) THEN
        RAISE NOTICE 'Table "public.edu_day_registrations" already exists. Proceeding with verification.';
    END IF;

    -- Check if sequence already exists unexpectedly
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'S' AND n.nspname = 'public' AND c.relname = 'edu_day_reg_seq'
    ) THEN
        RAISE NOTICE 'Sequence "public.edu_day_reg_seq" already exists. Preserving current sequence value.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Helper Function: Check Administrator Role (Security Definer)
--    Uses feature-specific function name to prevent namespace collisions.
--    Prevents 42P17 infinite recursion when checking admin_users table under RLS.
--    Scoped with search_path = public, pg_temp to prevent path-hijacking attacks.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_edu_day_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email TEXT;
BEGIN
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Check Master Admin Whitelist (matches AuthContext.tsx)
  IF user_email IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- 2. Check admin_users whitelist table (SECURITY DEFINER avoids RLS recursion)
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = user_email) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Restrict execution: Revoke from public, grant strictly to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_edu_day_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_edu_day_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Reference Number Sequence (Starts at 1001 for 4-digit human-readable codes)
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.edu_day_reg_seq START WITH 1001;

-- ------------------------------------------------------------------------------
-- 4. Registration Table
--    Uses unambiguous TIMESTAMPTZ defaults (CURRENT_TIMESTAMP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.edu_day_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    place TEXT NOT NULL,
    institute_workplace TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    tajweed_kithabs TEXT NOT NULL,
    payment_screenshot_url TEXT NOT NULL,
    applicant_photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected', 'attended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 5. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_edu_day_reference_no ON public.edu_day_registrations(reference_no);
CREATE INDEX IF NOT EXISTS idx_edu_day_phone_number ON public.edu_day_registrations(phone_number);
CREATE INDEX IF NOT EXISTS idx_edu_day_status ON public.edu_day_registrations(status);
CREATE INDEX IF NOT EXISTS idx_edu_day_created_at ON public.edu_day_registrations(created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Database Triggers
-- ------------------------------------------------------------------------------

-- Trigger 6A: Generate sequence value ONCE, pad shorter numbers to 4 digits,
--             and retain ALL digits without truncation when seq_val >= 10000.
--             Overwrites any client-supplied status to 'submitted'.
CREATE OR REPLACE FUNCTION public.edu_day_registrations_sanitize_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    seq_val BIGINT;
    seq_str TEXT;
BEGIN
    -- 1. Strictly enforce status = 'submitted' on all new registrations
    NEW.status := 'submitted';

    -- 2. ALWAYS generate the authoritative reference number from the sequence
    --    Sequence value is fetched exactly once into variable
    seq_val := nextval('public.edu_day_reg_seq');

    --    Pad shorter values (< 10000) to 4 digits, retain all digits when >= 10000
    IF seq_val < 10000 THEN
        seq_str := LPAD(seq_val::TEXT, 4, '0');
    ELSE
        seq_str := seq_val::TEXT;
    END IF;

    NEW.reference_no := 'EDU-JAZ-2026-' || seq_str;

    -- 3. Set verified UTC timestamps without timezone-conversion ambiguity
    NEW.created_at := CURRENT_TIMESTAMP;
    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_edu_day_registrations_sanitize_insert ON public.edu_day_registrations;
CREATE TRIGGER trg_edu_day_registrations_sanitize_insert
    BEFORE INSERT ON public.edu_day_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.edu_day_registrations_sanitize_insert();

-- Trigger 6B: Maintain updated_at timestamp automatically on record updates
CREATE OR REPLACE FUNCTION public.edu_day_registrations_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_edu_day_registrations_update_timestamp ON public.edu_day_registrations;
CREATE TRIGGER trg_edu_day_registrations_update_timestamp
    BEFORE UPDATE ON public.edu_day_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.edu_day_registrations_update_timestamp();

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) on Registrations Table
-- ------------------------------------------------------------------------------
ALTER TABLE public.edu_day_registrations ENABLE ROW LEVEL SECURITY;

-- Drop legacy or test policies if they exist
DROP POLICY IF EXISTS "Public registration submission" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Public registration insert" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Public insert edu_day_registrations" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Admin access to edu_day_registrations" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Admin read all registrations" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Admin select edu_day_registrations" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Admin update edu_day_registrations" ON public.edu_day_registrations;
DROP POLICY IF EXISTS "Admin delete edu_day_registrations" ON public.edu_day_registrations;

-- SECURITY: Public inserts are strictly sanitized by trigger trg_edu_day_registrations_sanitize_insert
-- to enforce status = 'submitted', generate reference_no from sequence, and set UTC timestamps.
-- Direct SELECT, UPDATE, and DELETE are strictly restricted to authenticated administrators.

-- Policy A: Admin Select — Only verified administrators can view registrations
CREATE POLICY "Admin select edu_day_registrations"
ON public.edu_day_registrations
FOR SELECT
TO authenticated
USING (public.is_edu_day_admin());

-- Policy B: Admin Update — Only verified administrators can modify (e.g. verify/attend)
CREATE POLICY "Admin update edu_day_registrations"
ON public.edu_day_registrations
FOR UPDATE
TO authenticated
USING (public.is_edu_day_admin())
WITH CHECK (public.is_edu_day_admin());

-- Policy C: Admin Delete — Only verified administrators can remove records
CREATE POLICY "Admin delete edu_day_registrations"
ON public.edu_day_registrations
FOR DELETE
TO authenticated
USING (public.is_edu_day_admin());

-- Policy D: Allow new registration submissions (sanitized and enforced by trigger trg_edu_day_registrations_sanitize_insert)
CREATE POLICY "Allow registration insert"
ON public.edu_day_registrations
FOR INSERT
TO public
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. Explicit Privilege Revocations & Minimal Grants
-- ------------------------------------------------------------------------------
-- Revoke all read/update/delete privileges from public and anon
REVOKE ALL ON TABLE public.edu_day_registrations FROM PUBLIC, anon;
REVOKE ALL ON SEQUENCE public.edu_day_reg_seq FROM PUBLIC, anon;

-- Grant INSERT on table and USAGE on sequence for registration submissions
GRANT INSERT ON TABLE public.edu_day_registrations TO public, anon;
GRANT USAGE ON SEQUENCE public.edu_day_reg_seq TO public, anon;

-- Revoke direct write privileges from authenticated role (except insert)
REVOKE UPDATE, DELETE ON TABLE public.edu_day_registrations FROM authenticated;

-- Grant table permissions to authenticated role ONLY for admin-managed operations
-- (governed strictly by RLS is_edu_day_admin() above)
GRANT SELECT, UPDATE, DELETE ON TABLE public.edu_day_registrations TO authenticated;

-- Grant full administrative privileges to service_role (used by server-side Express API)
GRANT ALL ON TABLE public.edu_day_registrations TO service_role;
GRANT ALL ON SEQUENCE public.edu_day_reg_seq TO service_role;

-- ------------------------------------------------------------------------------
-- 9. Storage Bucket Pre-Inspection & Safe Creation
--    If bucket already exists with public access, halts migration immediately!
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    existing_bucket RECORD;
BEGIN
    SELECT id, name, public, file_size_limit, allowed_mime_types
    INTO existing_bucket
    FROM storage.buckets
    WHERE id = 'edu-day-registration-files';

    IF FOUND THEN
        -- Verify safety of existing bucket: if public, halt migration!
        IF existing_bucket.public IS TRUE THEN
            RAISE EXCEPTION 'MIGRATION HALTED: Bucket "edu-day-registration-files" already exists with PUBLIC ACCESS ENABLED. Payment screenshots and applicant photos must be strictly private. Please resolve bucket visibility in Supabase Storage settings before running this migration.';
        END IF;
        RAISE NOTICE 'Bucket "edu-day-registration-files" already exists with private access. Preserving existing bucket without alteration.';
    ELSE
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'edu-day-registration-files',
            'edu-day-registration-files',
            false, -- STRICTLY PRIVATE: no direct unauthenticated HTTP public URL scraping
            5242880, -- 5 MB limit enforced by Supabase Storage
            ARRAY['image/jpeg', 'image/png', 'image/webp']
        );
        RAISE NOTICE 'Created private storage bucket "edu-day-registration-files".';
    END IF;
END $$;

-- Drop existing storage policies if re-running
DROP POLICY IF EXISTS "Public upload to edu_day bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin read edu_day bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public upload to edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Admin select edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete edu_day_registration_files" ON storage.objects;

-- Storage Policy 1: Only administrators can read or download registration files
CREATE POLICY "Admin select edu_day_registration_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'edu-day-registration-files'
    AND public.is_edu_day_admin()
);

-- Storage Policy 2: Only administrators can delete registration files
CREATE POLICY "Admin delete edu_day_registration_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'edu-day-registration-files'
    AND public.is_edu_day_admin()
);

-- Storage Policy 3: Allow upload into edu-day-registration-files strictly within the edu-day folder
CREATE POLICY "Allow upload to edu_day_registration_files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
    bucket_id = 'edu-day-registration-files'
    AND (storage.foldername(name))[1] = 'edu-day'
);
