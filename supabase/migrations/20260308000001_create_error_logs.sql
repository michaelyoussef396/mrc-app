-- Error Logs table for structured error tracking (client + edge functions)
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  error_type text NOT NULL,           -- 'api_error', 'edge_function_error', 'client_error'
  severity text DEFAULT 'error',       -- 'warning', 'error', 'critical'
  message text NOT NULL,
  stack_trace text,
  context jsonb DEFAULT '{}',          -- { userId, route, action, entityType, entityId }
  source text,                         -- 'client', 'edge_function', 'database'
  user_id uuid REFERENCES auth.users(id),
  resolved boolean DEFAULT false
);

-- Indexes for querying
CREATE INDEX idx_error_logs_created_at ON error_logs (created_at DESC);
CREATE INDEX idx_error_logs_error_type ON error_logs (error_type);
CREATE INDEX idx_error_logs_severity ON error_logs (severity) WHERE severity IN ('error', 'critical');

-- RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can INSERT (for client-side logging)
CREATE POLICY "Authenticated users can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can SELECT (for admin dashboard)
CREATE POLICY "Admins can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );
