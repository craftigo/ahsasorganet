# Supabase Database Architecture & Recovery Documentation

**Project:** AHSAS — Activity Management & Ranking System  
**Authoritative Host:** `https://tcxmvujspjrrxinzpiqq.supabase.co`  
**Database:** PostgreSQL (Supabase Managed)  

---

## 1. Schema Objects & Relationships

### Tables and Foreign Keys
1. **`public.units`**: Class/Unit records.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
   - `name VARCHAR(255) NOT NULL` (e.g., Class Name or Unit Name)
   - `class_name VARCHAR(255)`
   - `org_name VARCHAR(255)`
   - `reg_no VARCHAR(100)`
   - `cluster VARCHAR(100) DEFAULT 'Nandi'`
   - `zone VARCHAR(100) DEFAULT 'Koyilandi'`
   - `address TEXT` (Used for Committee Name in onboarding)
   - `contact_info VARCHAR(255)`
   - `grade VARCHAR(10) DEFAULT 'C'`
   - `total_score INTEGER DEFAULT 0`
   - `fund_amount NUMERIC(12,2) DEFAULT 0`
   - `total_members INTEGER DEFAULT 0`
   - `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

2. **`public.reports`**: Activity Submissions.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL`
   - `title VARCHAR(255) NOT NULL`
   - `description TEXT`
   - `file_url TEXT` (URL pointing to Supabase Storage `activity-images`)
   - `points_awarded INTEGER DEFAULT 0`
   - `status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))`
   - `submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`
   - `reviewed_at TIMESTAMPTZ`

3. **`public.members`**: Committee Members.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL`
   - `name VARCHAR(255) NOT NULL`
   - `designation VARCHAR(100) NOT NULL`
   - `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

4. **`public.students`**: Class Students.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL`
   - `name VARCHAR(255) NOT NULL`
   - `dob DATE`
   - `father_name VARCHAR(255)`
   - `contact_number VARCHAR(20)`
   - `district VARCHAR(100)`
   - `address TEXT`
   - `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

5. **`public.notifications`**: Circulars & Announcements.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `title VARCHAR(255) NOT NULL`
   - `description TEXT`
   - `file_url TEXT`
   - `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

6. **`public.unit_messages`**: Real-time Support Chat.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL`
   - `message TEXT NOT NULL`
   - `sender VARCHAR(50) DEFAULT 'unit'` ('unit' or 'admin')
   - `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

7. **`public.global_settings`**: System Key-Value Toggles.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `key VARCHAR(255) UNIQUE NOT NULL`
   - `value TEXT NOT NULL`
   - `updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

8. **`public.admin_users`**: Authorized Admin Emails.
   - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
   - `email VARCHAR(255) UNIQUE NOT NULL`
   - `created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL`

---

## 2. Functions, Triggers & Automated Logic

- **Function:** `public.update_unit_points()`
  - Language: `plpgsql`
  - Security: `SECURITY DEFINER`
  - Logic:
    - When report `status` transitions to `'approved'`, adds `points_awarded` to `units.total_score`.
    - When report `status` transitions away from `'approved'`, subtracts `points_awarded` from `units.total_score`.
- **Trigger:** `on_report_approval`
  - Event: `AFTER UPDATE OF status ON public.reports FOR EACH ROW`
  - Executes: `update_unit_points()`

---

## 3. Storage & Auth Dependencies

### Storage
- Bucket: `'activity-images'` (Public read access)
- Object paths:
  - Report evidence: `{unit_id}/{timestamp}_{random}.{ext}`
  - Notification attachments: `notifications/{timestamp}-{random}.{ext}`

### Supabase Auth
- Schema: `auth.users`
- Dependency: `units.user_id` has foreign key `REFERENCES auth.users(id) ON DELETE CASCADE`.
- Master Admin Emails: `ahsaslab@gmail.com`, `mmmed8833@gmail.com`.

---

## 4. Limitations & Manual Backup / Disaster Recovery Procedure

Because client-side keys cannot access the managed `auth` schema or private superuser dumps, the authoritative full-database backup should be performed via the Supabase Dashboard:

1. **Full Database Dump via Supabase Dashboard / CLI:**
   - Command: `supabase db dump -f supabase_backup.sql --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.tcxmvujspjrrxinzpiqq.supabase.co:5432/postgres"`
   - Or navigate to Supabase Dashboard $\to$ Project Settings $\to$ Database $\to$ Backups.
2. **Storage Bucket Backup:**
   - Download contents of `'activity-images'` from Supabase Dashboard $\to$ Storage $\to$ `activity-images`.
3. **Data Restoration Protocol:**
   - In the event of catastrophic data loss, restored tables must preserve UUID foreign keys (`units.id` $\to$ `reports.unit_id`, `members.unit_id`, `students.unit_id`).
