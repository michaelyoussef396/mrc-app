-- Migration: Create email_logs table
-- Phase: 2D.1 - HIGH PRIORITY
-- Priority: P1
-- Created: 2025-11-11
-- Description: Track all email deliveries for audit and debugging
--              Admin-only access for privacy/compliance

-- =============================================================================
-- Create email_logs table
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES auth.users(id),

  -- Email Details
  recipient_email TEXT NOT NULL CHECK (recipient_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,

  -- Delivery Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Queued for sending
    'sent',       -- Sent to email provider
    'delivered',  -- Confirmed delivered
    'bounced',    -- Hard bounce (invalid email)
    'soft_bounce',-- Temporary delivery failure
    'failed',     -- Send failed
    'spam',       -- Marked as spam
    'unsubscribed'-- User unsubscribed
  )),

  -- Email Provider Response
  provider TEXT DEFAULT 'resend', -- 'resend', 'sendgrid', etc.
  provider_message_id TEXT, -- External tracking ID
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Template variables, attachments, etc.

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_email_logs_lead_id ON email_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_inspection_id ON email_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_name ON email_logs(template_name);

-- =============================================================================
-- Enable Row Level Security (Admin-only access)
-- =============================================================================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admins_view_email_logs" ON email_logs;
DROP POLICY IF EXISTS "admins_manage_email_logs" ON email_logs;
DROP POLICY IF EXISTS "system_create_email_logs" ON email_logs;

-- Policy 1: Only admins can view email logs (privacy/compliance)
CREATE POLICY "admins_view_email_logs"
  ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy 2: Only admins can manage email logs
CREATE POLICY "admins_manage_email_logs"
  ON email_logs
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

-- Policy 3: System/service can create email logs (for automated emails)
CREATE POLICY "system_create_email_logs"
  ON email_logs
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
    DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
    CREATE TRIGGER update_email_logs_updated_at
      BEFORE UPDATE ON email_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- Verification queries (commented out, run manually to test)
-- =============================================================================

-- Check table exists
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'email_logs';

-- Check RLS policies
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'email_logs';

-- Test email log creation (example)
-- INSERT INTO email_logs (
--   recipient_email,
--   subject,
--   template_name,
--   status,
--   metadata
-- ) VALUES (
--   'test@example.com',
--   'Test Email',
--   'test_template',
--   'sent',
--   '{"test": true}'::jsonb
-- );

-- Query recent email logs (as admin)
-- SELECT
--   id,
--   recipient_email,
--   subject,
--   template_name,
--   status,
--   sent_at
-- FROM email_logs
-- ORDER BY sent_at DESC
-- LIMIT 10;

-- =============================================================================
-- Email Template Names Reference
-- =============================================================================
-- These are the expected template names used in the MRC system:
--
-- 1. 'lead_confirmation'           - Customer: Lead received confirmation
-- 2. 'inspection_booked'           - Customer: Inspection appointment confirmed
-- 3. 'inspection_reminder'         - Customer: 24h reminder before inspection
-- 4. 'inspection_completed'        - Customer: Thank you after inspection
-- 5. 'report_ready'                - Customer: PDF report ready for review
-- 6. 'quote_sent'                  - Customer: Quote/proposal sent
-- 7. 'job_scheduled'               - Customer: Job start date confirmed
-- 8. 'job_completed'               - Customer: Job finished, request review
-- 9. 'payment_reminder'            - Customer: Payment due reminder
-- 10. 'payment_received'           - Customer: Payment received thank you
-- 11. 'admin_new_lead'             - Admin: New lead notification
-- 12. 'admin_urgent_lead'          - Admin: Urgent lead requiring attention
