-- ============================================================================
-- Migration: Ensure technician role exists and assign to admin user
-- Created: 2026-02-03
-- Purpose: Fix empty technician selector in Admin Schedule page
-- ============================================================================

DO $$
DECLARE
  tech_role_id UUID;
  admin_role_id UUID;
  user_record RECORD;
BEGIN
  -- Step 1: Insert technician role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'technician') THEN
    INSERT INTO public.roles (name, display_name, description)
    VALUES ('technician', 'Technician', 'Field technician who performs inspections and jobs');
    RAISE NOTICE 'Created technician role';
  END IF;

  -- Step 2: Insert admin role if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin') THEN
    INSERT INTO public.roles (name, display_name, description)
    VALUES ('admin', 'Administrator', 'Full system access');
    RAISE NOTICE 'Created admin role';
  END IF;

  -- Get role IDs
  SELECT id INTO tech_role_id FROM public.roles WHERE name = 'technician';
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin';

  RAISE NOTICE 'Technician role ID: %', tech_role_id;
  RAISE NOTICE 'Admin role ID: %', admin_role_id;

  -- Step 3: For each user with admin role, also give them technician role
  -- This allows admins to appear in the technician selector
  FOR user_record IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role_id = admin_role_id
  LOOP
    -- Check if user already has technician role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = user_record.user_id AND role_id = tech_role_id
    ) THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (user_record.user_id, tech_role_id);
      RAISE NOTICE 'Assigned technician role to user: %', user_record.user_id;
    ELSE
      RAISE NOTICE 'User already has technician role: %', user_record.user_id;
    END IF;
  END LOOP;

  -- Step 4: If no admin users exist, try to find any authenticated user in user_profiles
  -- and assign them the technician role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role_id = tech_role_id) THEN
    RAISE NOTICE 'No technicians found. Looking for any user in user_profiles...';

    FOR user_record IN
      SELECT id as user_id FROM public.user_profiles LIMIT 5
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_record.user_id AND role_id = tech_role_id
      ) THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (user_record.user_id, tech_role_id);
        RAISE NOTICE 'Assigned technician role to user from profiles: %', user_record.user_id;
      END IF;
    END LOOP;
  END IF;
END $$;

-- Verify: Show all roles
SELECT 'Available roles:' as info;
SELECT id, name, display_name FROM public.roles ORDER BY name;

-- Verify: Show technicians
SELECT 'Users with technician role:' as info;
SELECT
  ur.user_id,
  up.first_name,
  up.last_name,
  r.name as role_name
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
LEFT JOIN public.user_profiles up ON up.id = ur.user_id
WHERE r.name = 'technician';
