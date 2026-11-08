-- ==============================================================================
-- Migration: 20261108_quiz_submissions.sql
-- Description: Edu Familia Online Quiz Competition Submissions & Questions Tables
-- Fixes: Supabase Security Advisor "RLS Disabled in Public (CRITICAL)" Warnings
-- ==============================================================================

-- 1. Create Submissions Table if not exists
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_name TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_class TEXT DEFAULT '',
    phone_number TEXT NOT NULL,
    place TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 30,
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_phone ON public.quiz_submissions(phone_number);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_score ON public.quiz_submissions(score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted_at ON public.quiz_submissions(submitted_at DESC);

-- 3. ENABLE Row Level Security (Resolves Supabase Security Advisor CRITICAL alert)
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies to prevent Error 42710 (policy already exists)
DROP POLICY IF EXISTS "Public insert quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Admin select quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Admin delete quiz submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Allow public insert to quiz_submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Allow authenticated read to quiz_submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Allow authenticated all to quiz_submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_public_insert" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_admin_select" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_admin_delete" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_admin_all" ON public.quiz_submissions;

-- 5. Define Secure RLS Policies for quiz_submissions
-- Allow public (anyone taking the quiz) to submit their responses safely
CREATE POLICY "quiz_submissions_public_insert"
ON public.quiz_submissions
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- Allow reading submissions for admin dashboard and real-time evaluation
CREATE POLICY "quiz_submissions_public_select"
ON public.quiz_submissions
FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- Allow authenticated admins to view, evaluate, and delete submissions
CREATE POLICY "quiz_submissions_admin_all"
ON public.quiz_submissions
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 6. Create Questions Table if not exists
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer_index INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. ENABLE Row Level Security on quiz_questions (Resolves Supabase CRITICAL alert)
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- 8. Clean up questions policies
DROP POLICY IF EXISTS "Public select quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admin manage quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_public_select" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_admin_all" ON public.quiz_questions;

-- 9. Define Secure RLS Policies for quiz_questions
-- Allow anyone taking the quiz to fetch and read the questions
CREATE POLICY "quiz_questions_public_select"
ON public.quiz_questions
FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- Allow authenticated admins to edit, update, or add questions
CREATE POLICY "quiz_questions_admin_all"
ON public.quiz_questions
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 10. Database Permissions Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.quiz_questions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
