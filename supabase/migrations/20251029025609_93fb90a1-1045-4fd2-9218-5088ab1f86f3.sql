-- Grant the current user admin role if they don't have one
-- This allows them to create other users

-- First, ensure the logged-in user has admin role
-- Replace the email with your actual login email
DO $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current authenticated user's ID from profiles
  SELECT id INTO current_user_id 
  FROM profiles 
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
  
  -- If user exists and doesn't have admin role, add it
  IF current_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (current_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Also make sure profiles table allows viewing all profiles by admins
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view profiles"
ON profiles FOR SELECT
USING (
  auth.uid() = id 
  OR 
  is_admin(auth.uid())
);

-- Allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update profiles"
ON profiles FOR UPDATE
USING (
  auth.uid() = id 
  OR 
  is_admin(auth.uid())
);

-- Allow system to insert profiles (for new user signups)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Anyone can insert profiles"
ON profiles FOR INSERT
WITH CHECK (true);