-- Supabase Schema for AHSAS Portal

-- 1. Units Table (Stores Class Details)
CREATE TABLE public.units (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Links to Supabase Auth
    name VARCHAR(255) NOT NULL, -- e.g., 'Class 10A'
    org_name VARCHAR(255), -- Organization Name
    reg_no VARCHAR(100),
    cluster VARCHAR(100) DEFAULT 'Nandi',
    zone VARCHAR(100) DEFAULT 'Koyilandi',
    address TEXT,
    contact_info VARCHAR(255),
    grade VARCHAR(10) DEFAULT 'C', -- e.g., A, B, C, E
    total_score INTEGER DEFAULT 0,
    total_members INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) for units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.units FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.units FOR UPDATE USING (auth.uid() = user_id);
-- Admin has full access policy (requires setting up a role or checking email)
CREATE POLICY "Admin full access to units" ON public.units FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);


-- 2. Activity Reports Table
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT, -- URL if file uploaded to Supabase Storage
    points_awarded INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS) for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Units can view their own reports" ON public.reports FOR SELECT USING (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Units can insert their own reports" ON public.reports FOR INSERT WITH CHECK (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Everyone can view approved reports for leaderboard" ON public.reports FOR SELECT USING (status = 'approved');
CREATE POLICY "Admin full access to reports" ON public.reports FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);


-- 3. Notifications Table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications are viewable by everyone." ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Admin can manage notifications" ON public.notifications FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);


-- 4. Global Settings Table
CREATE TABLE public.global_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable by everyone." ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage settings" ON public.global_settings FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);

-- Insert initial settings
INSERT INTO public.global_settings (key, value) VALUES ('news_ticker', 'Welcome to the new AHSAS Activity Management Portal! • Upcoming Sports meet next week.');


-- 5. Function to update unit points automatically when a report is approved
CREATE OR REPLACE FUNCTION update_unit_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.units SET total_score = total_score + NEW.points_awarded WHERE id = NEW.unit_id;
  ELSIF NEW.status != 'approved' AND OLD.status = 'approved' THEN
    UPDATE public.units SET total_score = total_score - OLD.points_awarded WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_approval
  AFTER UPDATE OF status ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_unit_points();

-- 6. Admin Users Table
CREATE TABLE public.admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin users viewable by everyone" ON public.admin_users FOR SELECT USING (true);
-- Only let people already in admin_users modify admin_users. 
-- For initial setup, we insert the master admin.
CREATE POLICY "Only admins can insert admins" ON public.admin_users FOR INSERT WITH CHECK (
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users) OR 
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com')
);
CREATE POLICY "Only admins can delete admins" ON public.admin_users FOR DELETE USING (
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users) OR 
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com')
);

-- Insert master admin
INSERT INTO public.admin_users (email) VALUES ('ahsaslab@gmail.com');


-- 7. Committee Members Table
CREATE TABLE public.members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Units can view their own members" ON public.members FOR SELECT USING (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Units can insert their own members" ON public.members FOR INSERT WITH CHECK (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Units can delete their own members" ON public.members FOR DELETE USING (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Admin full access to members" ON public.members FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);


-- 8. Unit Messages (Contact Admin) Table
CREATE TABLE public.unit_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    sender VARCHAR(50) DEFAULT 'unit', -- 'unit' or 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.unit_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Units can view their own messages" ON public.unit_messages FOR SELECT USING (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Units can insert their own messages" ON public.unit_messages FOR INSERT WITH CHECK (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Admin full access to unit_messages" ON public.unit_messages FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);


-- 9. Students Table (Class Students)
CREATE TABLE public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    dob DATE,
    father_name VARCHAR(255),
    contact_number VARCHAR(20),
    district VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) for students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.students FOR SELECT USING (true);
CREATE POLICY "Units can manage their own students" ON public.students FOR ALL USING (
  unit_id IN (SELECT id FROM public.units WHERE user_id = auth.uid())
);
CREATE POLICY "Admin full access to students" ON public.students FOR ALL USING (
  auth.jwt() ->> 'email' IN ('ahsaslab@gmail.com', 'mmmed8833@gmail.com') OR 
  auth.jwt() ->> 'email' IN (SELECT email FROM public.admin_users)
);

-- Add initial setting for student registration
INSERT INTO public.global_settings (key, value) VALUES ('allow_student_registration', 'false') ON CONFLICT (key) DO NOTHING;

-- ===== FUND COLLECTION ADDITIONS =====

-- Add fund_amount column to units table (run this if units table already exists)
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS fund_amount NUMERIC(12,2) DEFAULT 0;

-- Add show_fund_collection setting (controls homepage + nav visibility)
INSERT INTO public.global_settings (key, value) VALUES ('show_fund_collection', 'false') ON CONFLICT (key) DO NOTHING;
