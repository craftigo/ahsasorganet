-- ==============================================================================
-- Migration: 20261107_drop_edu_day_registrations.sql
-- Description: Completely removes the EDU DAY / Jazriyya workshop registration
--              system, including tables, sequences, functions, storage policies,
--              and storage files from Supabase.
-- ==============================================================================

-- 1. Drop Triggers on edu_day_registrations
DROP TRIGGER IF EXISTS trg_edu_day_registrations_sanitize_insert ON public.edu_day_registrations;
DROP TRIGGER IF EXISTS trg_edu_day_registrations_update_timestamp ON public.edu_day_registrations;

-- 2. Drop the edu_day_registrations Table
DROP TABLE IF EXISTS public.edu_day_registrations CASCADE;

-- 3. Drop the Sequence for Reference Numbers
DROP SEQUENCE IF EXISTS public.edu_day_reg_seq CASCADE;

-- 4. Drop Associated Functions
DROP FUNCTION IF EXISTS public.is_edu_day_admin() CASCADE;
DROP FUNCTION IF EXISTS public.edu_day_registrations_sanitize_insert() CASCADE;
DROP FUNCTION IF EXISTS public.edu_day_registrations_update_timestamp() CASCADE;

-- 5. Drop Storage Policies for edu-day-registration-files
DROP POLICY IF EXISTS "Public upload to edu_day bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin read edu_day bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public upload to edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Admin select edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Allow select on edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Public select edu_day_registration_files" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete edu_day_registration_files" ON storage.objects;

-- 6. Delete all stored objects and remove the private bucket
DELETE FROM storage.objects WHERE bucket_id = 'edu-day-registration-files';
DELETE FROM storage.buckets WHERE id = 'edu-day-registration-files';

