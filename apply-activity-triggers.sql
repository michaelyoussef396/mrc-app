-- ============================================================================
-- QUICK APPLY: Add Lead Activity Triggers
-- Run this in Supabase Dashboard SQL Editor
-- ============================================================================

-- Function to automatically log lead creation
CREATE OR REPLACE FUNCTION log_lead_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (
    lead_id,
    activity_type,
    title,
    description,
    user_id,
    created_at
  ) VALUES (
    NEW.id,
    'lead_created',
    CASE
      WHEN NEW.status = 'hipages_lead' THEN 'HiPages Lead Created'
      ELSE 'Lead Created'
    END,
    CASE
      WHEN NEW.status = 'hipages_lead'
        THEN 'New HiPages lead for ' || NEW.property_address_suburb || ' - requires initial contact'
      ELSE 'New lead from ' || COALESCE(NEW.full_name, 'customer') || ' in ' || NEW.property_address_suburb
    END,
    NEW.assigned_to,
    NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log creation automatically
DROP TRIGGER IF EXISTS trigger_log_lead_creation ON leads;
CREATE TRIGGER trigger_log_lead_creation
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_creation();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activities (
      lead_id,
      activity_type,
      title,
      description,
      user_id,
      metadata
    ) VALUES (
      NEW.id,
      'status_changed',
      'Status Changed',
      'Lead status updated from ' || OLD.status || ' to ' || NEW.status,
      NEW.assigned_to,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for status changes
DROP TRIGGER IF EXISTS trigger_log_lead_status_change ON leads;
CREATE TRIGGER trigger_log_lead_status_change
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_status_change();

-- Backfill activities for existing leads that don't have creation activities
INSERT INTO activities (lead_id, activity_type, title, description, created_at)
SELECT
  l.id,
  'lead_created',
  CASE
    WHEN l.status = 'hipages_lead' THEN 'HiPages Lead Created'
    ELSE 'Lead Created'
  END,
  CASE
    WHEN l.status = 'hipages_lead'
      THEN 'New HiPages lead for ' || l.property_address_suburb || ' - requires initial contact'
    ELSE 'New lead from ' || COALESCE(l.full_name, 'customer') || ' in ' || l.property_address_suburb
  END,
  l.created_at
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM activities a
  WHERE a.lead_id = l.id
  AND a.activity_type = 'lead_created'
);

-- Verification queries
SELECT COUNT(*) as backfilled_activities FROM activities WHERE activity_type = 'lead_created';

SELECT
  l.lead_number,
  l.status,
  a.title,
  a.created_at
FROM leads l
LEFT JOIN activities a ON l.id = a.lead_id AND a.activity_type = 'lead_created'
WHERE l.lead_number IN ('MRC-2025-0113', 'MRC-2025-0114', 'MRC-2025-0115', 'MRC-2025-0117')
ORDER BY l.created_at DESC;

-- Expected: All HiPages leads should now have "HiPages Lead Created" activities
