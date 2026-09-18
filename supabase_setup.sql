-- Workforce Productivity Analytics & Task Management System
-- Part 9: Multi-Manager Team Scoping & Invitation System Setup

-- 1. Create/Update public.users table (with manager_id column)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure manager_id column exists if table was created previously
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create public.invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- 3. Create public.tasks table (with 4-stage status & rejection_note)
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

-- 4. Create public.time_logs table
CREATE TABLE IF NOT EXISTS public.time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  minutes_logged INTEGER NOT NULL CHECK (minutes_logged > 0),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create public.task_attachments table
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

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- 7. Helper Function: is_manager()
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RLS Policies for public.users
DROP POLICY IF EXISTS "Users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile or manager views all" ON public.users;
DROP POLICY IF EXISTS "Users can insert profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update profile" ON public.users;

-- Managers can view themselves and employees in their team; employees can view themselves & their manager
CREATE POLICY "Users can view profiles"
  ON public.users FOR SELECT
  USING (
    id = auth.uid() 
    OR (public.is_manager() AND (manager_id = auth.uid() OR manager_id IS NULL))
    OR (id = (SELECT manager_id FROM public.users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can insert profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 9. RLS Policies for public.invitations
DROP POLICY IF EXISTS "Managers can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by id" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can update invitation status by id" ON public.invitations;

CREATE POLICY "Managers can manage invitations"
  ON public.invitations FOR ALL
  USING (manager_id = auth.uid());

CREATE POLICY "Anyone can view invitations by id"
  ON public.invitations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update invitation status by id"
  ON public.invitations FOR UPDATE
  USING (true);

-- 10. RLS Policies for public.tasks (Manager Team Scoped - TC-03)
DROP POLICY IF EXISTS "Tasks SELECT policy" ON public.tasks;
CREATE POLICY "Tasks SELECT policy"
  ON public.tasks FOR SELECT
  USING (
    assigned_to = auth.uid() 
    OR (
      public.is_manager() AND (
        assigned_to IS NULL 
        OR assigned_to IN (SELECT id FROM public.users WHERE manager_id = auth.uid() OR id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Tasks INSERT policy" ON public.tasks;
CREATE POLICY "Tasks INSERT policy"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Manager UPDATE policy" ON public.tasks;
CREATE POLICY "Manager UPDATE policy"
  ON public.tasks FOR UPDATE
  USING (
    public.is_manager() AND (
      assigned_to IS NULL 
      OR assigned_to IN (SELECT id FROM public.users WHERE manager_id = auth.uid() OR id = auth.uid())
    )
  )
  WITH CHECK (public.is_manager());

DROP POLICY IF EXISTS "Employee UPDATE policy" ON public.tasks;
CREATE POLICY "Employee UPDATE policy"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid() AND status IN ('pending', 'in_progress', 'submitted'));

DROP POLICY IF EXISTS "Tasks DELETE policy" ON public.tasks;
CREATE POLICY "Tasks DELETE policy"
  ON public.tasks FOR DELETE
  USING (
    public.is_manager() AND (
      assigned_to IS NULL 
      OR assigned_to IN (SELECT id FROM public.users WHERE manager_id = auth.uid() OR id = auth.uid())
    )
  );

-- 11. RLS Policies for public.time_logs (Manager Team Scoped)
DROP POLICY IF EXISTS "Time logs SELECT policy" ON public.time_logs;
CREATE POLICY "Time logs SELECT policy"
  ON public.time_logs FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      public.is_manager() AND user_id IN (
        SELECT id FROM public.users WHERE manager_id = auth.uid() OR id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Time logs INSERT policy" ON public.time_logs;
CREATE POLICY "Time logs INSERT policy"
  ON public.time_logs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (
      public.is_manager() AND user_id IN (
        SELECT id FROM public.users WHERE manager_id = auth.uid() OR id = auth.uid()
      )
    )
  );

-- 12. RLS Policies for public.task_attachments
DROP POLICY IF EXISTS "Attachments SELECT policy" ON public.task_attachments;
CREATE POLICY "Attachments SELECT policy"
  ON public.task_attachments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Attachments INSERT policy" ON public.task_attachments;
CREATE POLICY "Attachments INSERT policy"
  ON public.task_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 13. Storage Bucket & Policies for task-proofs
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


-- 13.5 Storage Bucket & Policies for avatars (Profile Pictures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar Storage Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Storage Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Storage Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Storage Delete Policy" ON storage.objects;

CREATE POLICY "Avatar Storage Insert Policy" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Avatar Storage Select Policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Avatar Storage Update Policy" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Avatar Storage Delete Policy" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 14. Automatic Profile Creation Trigger with manager_id support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_id UUID;
BEGIN
  v_manager_id := CASE 
    WHEN NEW.raw_user_meta_data->>'manager_id' IS NOT NULL AND NEW.raw_user_meta_data->>'manager_id' != ''
    THEN (NEW.raw_user_meta_data->>'manager_id')::uuid
    ELSE NULL
  END;

  INSERT INTO public.users (id, full_name, email, role, manager_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    v_manager_id
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    manager_id = COALESCE(EXCLUDED.manager_id, public.users.manager_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. Prevent any update to role column on public.users table (Permanent Role Rule)
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


