-- ==============================================================================
-- SETUP TABEL PROFILES & AKUN ADMIN (PASSWORD: 123123)
-- ==============================================================================

-- 1. Ekstensi Dasar
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat Tabel public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'super-admin', 'admin', 'user'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan RLS & Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
CREATE POLICY "Allow public read on profiles" 
ON public.profiles FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public full access on profiles" ON public.profiles;
CREATE POLICY "Allow public full access on profiles" 
ON public.profiles FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- 3. Trigger Sinkronisasi Otomatis saat ada User Baru di Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(public.profiles.role, EXCLUDED.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Daftarkan / Update Password & Role Akun Admin (Password: 123123)
DO $$
DECLARE
  v_user1_id UUID := gen_random_uuid();
  v_user2_id UUID := gen_random_uuid();
  v_existing_id UUID;
BEGIN
  -- A. Setup Akun SUPER ADMIN: r.wariyanto@gmail.com
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'r.wariyanto@gmail.com';
  
  IF v_existing_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user1_id,
      'authenticated',
      'authenticated',
      'r.wariyanto@gmail.com',
      crypt('123123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Rifqi Wariyanto","role":"super-admin"}',
      NOW(),
      NOW()
    );
    
    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_user1_id, 'r.wariyanto@gmail.com', 'Rifqi Wariyanto', 'super-admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super-admin', is_active = true;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('123123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"super-admin"')
    WHERE id = v_existing_id;

    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_existing_id, 'r.wariyanto@gmail.com', 'Rifqi Wariyanto', 'super-admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super-admin', is_active = true;
  END IF;

  -- B. Setup Akun ADMIN: brosurmta@gmail.com
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'brosurmta@gmail.com';
  
  IF v_existing_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user2_id,
      'authenticated',
      'authenticated',
      'brosurmta@gmail.com',
      crypt('123123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin Brosur MTA","role":"admin"}',
      NOW(),
      NOW()
    );
    
    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_user2_id, 'brosurmta@gmail.com', 'Admin Brosur MTA', 'admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('123123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
    WHERE id = v_existing_id;

    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_existing_id, 'brosurmta@gmail.com', 'Admin Brosur MTA', 'admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
