-- Migration: Login Security Tables
-- Description: Creates tables for login activity tracking, device management, and session management
-- Date: 2026-01-25

-- ============================================
-- Table: login_activity (tracks all login attempts)
-- ============================================
CREATE TABLE IF NOT EXISTS login_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, -- Store even for failed attempts
  success BOOLEAN NOT NULL DEFAULT false,

  -- Device info
  device_fingerprint TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  browser TEXT, -- 'Chrome', 'Safari', 'Firefox', etc.
  browser_version TEXT,
  os TEXT, -- 'iOS', 'Android', 'Windows', 'macOS'
  os_version TEXT,

  -- Location info
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  timezone TEXT,

  -- Metadata
  user_agent TEXT,
  error_message TEXT, -- For failed attempts
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_email ON login_activity(email);
CREATE INDEX IF NOT EXISTS idx_login_activity_ip ON login_activity(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_activity_created ON login_activity(created_at DESC);

-- ============================================
-- Table: user_devices (trusted devices per user)
-- ============================================
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT, -- "Chrome on Windows", "Safari on iPhone"

  -- Device details
  device_type TEXT,
  browser TEXT,
  os TEXT,

  -- Status
  is_trusted BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Location of first use
  first_ip TEXT,
  first_location TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);

-- ============================================
-- Table: user_sessions (active sessions for force logout)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES user_devices(id) ON DELETE CASCADE,

  session_token TEXT NOT NULL, -- Supabase session ID

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  ip_address TEXT,
  location TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason TEXT, -- 'logout', 'force_logout', 'expired', 'new_device'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);

-- ============================================
-- Table: suspicious_activity (flagged events)
-- ============================================
CREATE TABLE IF NOT EXISTS suspicious_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_activity_id UUID REFERENCES login_activity(id),

  activity_type TEXT NOT NULL, -- 'new_device', 'new_location', 'multiple_failures', 'impossible_travel'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high'
  description TEXT,

  -- Details
  details JSONB,

  -- Status
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_unreviewed ON suspicious_activity(reviewed) WHERE reviewed = false;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

-- login_activity: Users can view their own, admins can view all
CREATE POLICY "Users can view own login activity" ON login_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all login activity" ON login_activity
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role can insert login activity" ON login_activity
  FOR INSERT WITH CHECK (true);

-- user_devices: Users can view and manage their own
CREATE POLICY "Users can view own devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- user_sessions: Users can view their own
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- suspicious_activity: Users can view their own, admins can manage all
CREATE POLICY "Users can view own suspicious activity" ON suspicious_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suspicious activity" ON suspicious_activity
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update suspicious activity" ON suspicious_activity
  FOR UPDATE USING (is_admin());

CREATE POLICY "Service role can insert suspicious activity" ON suspicious_activity
  FOR INSERT WITH CHECK (true);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE login_activity IS 'Tracks all login attempts (successful and failed) with device and location info';
COMMENT ON TABLE user_devices IS 'Stores known devices for each user with trust status';
COMMENT ON TABLE user_sessions IS 'Tracks active sessions for force logout capability';
COMMENT ON TABLE suspicious_activity IS 'Flags suspicious login events for review';
