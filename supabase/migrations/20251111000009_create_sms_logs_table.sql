-- Migration: Create sms_logs table
-- Phase: 2D.2 - HIGH PRIORITY
-- Priority: P1
-- Created: 2025-11-11
-- Description: Track all SMS deliveries for audit and debugging
--              Admin-only access for privacy/compliance

-- =============================================================================
-- Create sms_logs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES auth.users(id),

  -- SMS Details
  recipient_phone TEXT NOT NULL CHECK (
    recipient_phone ~ '^(04[0-9]{8}|\\+614[0-9]{8}|\\(0[2-9]\\) [0-9]{4} [0-9]{4})$'
  ), -- Australian phone format: 04XX XXX XXX or (0X) XXXX XXXX
  recipient_name TEXT,
  message TEXT NOT NULL CHECK (length(message) <= 1600), -- SMS character limit
  message_type TEXT DEFAULT 'transactional' CHECK (message_type IN (
    'transactional', -- Appointment reminders, confirmations
    'marketing',     -- Promotional messages
    'alert'          -- Urgent notifications
  )),

  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Queued for sending
    'sent',         -- Sent to SMS provider
    'delivered',    -- Confirmed delivered to phone
    'failed',       -- Send failed
    'invalid_number',-- Phone number invalid
    'undeliverable',-- Cannot deliver (phone off, no signal)
    'expired'       -- Message expired before delivery
  )),

  -- SMS Provider Response
  provider TEXT DEFAULT 'twilio', -- 'twilio', 'messagebird', etc.
  provider_message_id TEXT, -- External tracking ID
  error_message TEXT,
  cost_cents INTEGER, -- Cost in cents (e.g., 12 cents = 12)

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Campaign info, A/B test, etc.

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_sms_logs_lead_id ON sms_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_inspection_id ON sms_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_phone ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON sms_logs(message_type);

-- =============================================================================
-- Enable Row Level Security (Admin-only access)
-- =============================================================================

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admins_view_sms_logs" ON sms_logs;
DROP POLICY IF EXISTS "admins_manage_sms_logs" ON sms_logs;
DROP POLICY IF EXISTS "system_create_sms_logs" ON sms_logs;

-- Policy 1: Only admins can view SMS logs (privacy/compliance)
CREATE POLICY "admins_view_sms_logs"
  ON sms_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy 2: Only admins can manage SMS logs
CREATE POLICY "admins_manage_sms_logs"
  ON sms_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy 3: System/service can create SMS logs (for automated SMS)
CREATE POLICY "system_create_sms_logs"
  ON sms_logs
  FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- Add updated_at trigger
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_sms_logs_updated_at ON sms_logs;
    CREATE TRIGGER update_sms_logs_updated_at
      BEFORE UPDATE ON sms_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- Verification queries (commented out, run manually to test)
-- =============================================================================

-- Check table exists
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'sms_logs';

-- Check RLS policies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sms_logs';

-- Test SMS log creation (example)
-- INSERT INTO sms_logs (
--   recipient_phone,
--   message,
--   message_type,
--   status,
--   metadata
-- ) VALUES (
--   '0412 345 678',
--   'Your inspection is scheduled for tomorrow at 10am.',
--   'transactional',
--   'sent',
--   '{"campaign": "inspection_reminders"}'::jsonb
-- );

-- Query recent SMS logs (as admin)
-- SELECT
--   id,
--   recipient_phone,
--   LEFT(message, 50) || '...' as message_preview,
--   message_type,
--   status,
--   sent_at
-- FROM sms_logs
-- ORDER BY sent_at DESC
-- LIMIT 10;

-- SMS delivery stats (as admin)
-- SELECT
--   status,
--   COUNT(*) as count,
--   SUM(cost_cents) / 100.0 as total_cost_dollars
-- FROM sms_logs
-- WHERE sent_at > NOW() - INTERVAL '30 days'
-- GROUP BY status
-- ORDER BY count DESC;

-- =============================================================================
-- SMS Message Templates Reference
-- =============================================================================
-- These are the expected SMS types used in the MRC system:
--
-- 1. Inspection reminder (24h before):
--    "Hi {name}, reminder: MRC inspection tomorrow at {time} at {address}. Reply CANCEL to reschedule."
--
-- 2. On the way notification:
--    "Hi {name}, {technician} is on the way to your property. ETA: {eta} minutes. Contact: {phone}"
--
-- 3. Inspection completed:
--    "Thanks {name}! Your MRC inspection is complete. Report will be emailed within 2 hours. Reply URGENT if needed."
--
-- 4. Quote ready:
--    "Hi {name}, your MRC quote is ready. Check email or visit: {quote_link}"
--
-- 5. Payment reminder:
--    "Hi {name}, friendly reminder: MRC invoice #{invoice_number} due {due_date}. Pay now: {payment_link}"
--
-- Character limits: Keep under 160 characters per segment for optimal delivery
