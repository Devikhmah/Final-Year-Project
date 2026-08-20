-- Workforce Productivity Analytics & Task Management System
-- Part 4: Database Schema & Storage Setup with Row Level Security (RLS) - Fixed RLS Policies

-- 1. Create public.users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create public.tasks table (with 4-stage status & rejection_note)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'submitted', 'done')) DEFAULT 'pending',
  rejection_note TEXT,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns & constraints exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rejection_note TEXT;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'submitted', 'done'));

-- 3. Create public.time_logs table
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  minutes_logged INTEGER NOT NULL CHECK (minutes_logged > 0),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create public.task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- 6. Helper Function: is_manager()
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for public.users
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile or manager views all" ON public.users;
CREATE POLICY "Users can view profiles"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. RLS Policies for public.tasks
DROP POLICY IF EXISTS "Tasks SELECT policy" ON public.tasks;
CREATE POLICY "Tasks SELECT policy"
  ON public.tasks FOR SELECT
  USING (public.is_manager() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Tasks INSERT policy" ON public.tasks;
CREATE POLICY "Tasks INSERT policy"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Manager UPDATE policy" ON public.tasks;
CREATE POLICY "Manager UPDATE policy"
  ON public.tasks FOR UPDATE
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Employee UPDATE policy" ON public.tasks;
CREATE POLICY "Employee UPDATE policy"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid() AND status IN ('pending', 'in_progress', 'submitted'));

DROP POLICY IF EXISTS "Tasks DELETE policy" ON public.tasks;
CREATE POLICY "Tasks DELETE policy"
  ON public.tasks FOR DELETE
  USING (public.is_manager());

-- 9. RLS Policies for public.time_logs
DROP POLICY IF EXISTS "Time logs SELECT policy" ON public.time_logs;
CREATE POLICY "Time logs SELECT policy"
  ON public.time_logs FOR SELECT
  USING (public.is_manager() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Time logs INSERT policy" ON public.time_logs;
CREATE POLICY "Time logs INSERT policy"
  ON public.time_logs FOR INSERT
  WITH CHECK (public.is_manager() OR user_id = auth.uid());

-- 10. RLS Policies for public.task_attachments
DROP POLICY IF EXISTS "Attachments SELECT policy" ON public.task_attachments;
CREATE POLICY "Attachments SELECT policy"
  ON public.task_attachments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Attachments INSERT policy" ON public.task_attachments;
CREATE POLICY "Attachments INSERT policy"
  ON public.task_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Storage Bucket & Policies for task-proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Grant Storage Permissions for authenticated users
DROP POLICY IF EXISTS "Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "Storage Update Policy" ON storage.objects;

CREATE POLICY "Storage Insert Policy" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'task-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Storage Select Policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'task-proofs');

CREATE POLICY "Storage Update Policy" ON storage.objects
  FOR UPDATE USING (bucket_id = 'task-proofs' AND auth.role() = 'authenticated');

-- 12. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 13. Prevent any update to role column on public.users table (Permanent Role Rule)
CREATE OR REPLACE FUNCTION public.prevent_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role updates are strictly prohibited. Account roles are permanent once created.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_permanent_role ON public.users;
CREATE TRIGGER enforce_permanent_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_update();
