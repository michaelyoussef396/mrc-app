-- Seed test leads for Actions Required widget
-- Get the current user ID
DO $$
DECLARE
  admin_user_id UUID;
  lead_new UUID;
  lead_contacted UUID;
  lead_insp_waiting UUID;
  lead_insp_completed UUID;
  lead_report_ready UUID;
  lead_job_waiting UUID;
  lead_job_completed UUID;
  lead_paid UUID;
  lead_review UUID;
BEGIN
  -- Get first user ID
  SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  
  -- 1. NEW LEAD (created 5 hours ago - should show as URGENT)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    created_at, updated_at
  ) VALUES (
    'MRC-2025-0101', 'new_lead', 'Emma Wilson', 'emma.wilson@email.com', '0412 345 678',
    '15 Oak Street', 'Ringwood', 'VIC', '3134',
    'residential', 'website', 'Mould in bathroom and bedroom', 'high', admin_user_id,
    NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'
  ) RETURNING id INTO lead_new;
  
  -- 2. CONTACTED (with inspection scheduled TODAY)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    created_at, updated_at
  ) VALUES (
    'MRC-2025-0102', 'contacted', 'Sarah Lee', 'sarah.lee@email.com', '0423 456 789',
    '22 Park Avenue', 'Box Hill', 'VIC', '3128',
    'residential', 'phone', 'Water damage in ceiling', 'medium', admin_user_id,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'
  ) RETURNING id INTO lead_contacted;
  
  -- Create calendar event for inspection today
  INSERT INTO calendar_events (
    lead_id, event_type, title, start_datetime, end_datetime,
    assigned_to, status, location_address
  ) VALUES (
    lead_contacted, 'inspection', 'Inspection - Sarah Lee',
    DATE_TRUNC('day', NOW()) + INTERVAL '9 hours',
    DATE_TRUNC('day', NOW()) + INTERVAL '11 hours',
    admin_user_id, 'scheduled', '22 Park Avenue, Box Hill VIC 3128'
  );
  
  -- 3. INSPECTION WAITING (inspection is now)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    created_at, updated_at
  ) VALUES (
    'MRC-2025-0103', 'inspection_waiting', 'David Chen', 'david.chen@email.com', '0434 567 890',
    '8 River Road', 'Hawthorn', 'VIC', '3122',
    'residential', 'referral', 'Basement flooding', 'high', admin_user_id,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 hour'
  ) RETURNING id INTO lead_insp_waiting;
  
  -- 4. INSPECTION COMPLETED (needs approval)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    quoted_amount, created_at, updated_at
  ) VALUES (
    'MRC-2025-0104', 'inspection_completed', 'Mike Brown', 'mike.brown@email.com', '0445 678 901',
    '45 High Street', 'Richmond', 'VIC', '3121',
    'residential', 'google', 'Multiple rooms with mould', 'medium', admin_user_id,
    3480.00, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 hours'
  ) RETURNING id INTO lead_insp_completed;
  
  -- 5. REPORT PDF READY (needs to be sent)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    quoted_amount, created_at, updated_at
  ) VALUES (
    'MRC-2025-0105', 'inspection_report_pdf_completed', 'Anna Taylor', 'anna.taylor@email.com', '0456 789 012',
    '67 Beach Road', 'Brighton', 'VIC', '3186',
    'residential', 'facebook', 'Bathroom ceiling mould', 'low', admin_user_id,
    2250.00, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 hours'
  ) RETURNING id INTO lead_report_ready;
  
  -- 6. JOB WAITING (10 days - should show as URGENT)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    quoted_amount, created_at, updated_at
  ) VALUES (
    'MRC-2025-0106', 'job_waiting', 'John Smith', 'john.smith@email.com', '0467 890 123',
    '45 High Street', 'Croydon', 'VIC', '3136',
    'residential', 'website', 'Major mould remediation', 'high', admin_user_id,
    5680.00, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'
  ) RETURNING id INTO lead_job_waiting;
  
  -- 7. JOB COMPLETED (job scheduled today)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    quoted_amount, created_at, updated_at
  ) VALUES (
    'MRC-2025-0107', 'job_completed', 'Sophie Martin', 'sophie.martin@email.com', '0478 901 234',
    '12 Garden Lane', 'Kew', 'VIC', '3101',
    'residential', 'phone', 'Mould treatment required', 'medium', admin_user_id,
    4120.00, NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'
  ) RETURNING id INTO lead_job_completed;
  
  -- Create calendar event for job today
  INSERT INTO calendar_events (
    lead_id, event_type, title, start_datetime, end_datetime,
    assigned_to, status, location_address
  ) VALUES (
    lead_job_completed, 'job', 'Remediation Job - Sophie Martin',
    DATE_TRUNC('day', NOW()) + INTERVAL '13 hours',
    DATE_TRUNC('day', NOW()) + INTERVAL '17 hours',
    admin_user_id, 'scheduled', '12 Garden Lane, Kew VIC 3101'
  );
  
  -- 8. PAID (needs to mark as paid)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    quoted_amount, invoice_amount, created_at, updated_at
  ) VALUES (
    'MRC-2025-0108', 'paid', 'Lisa Chen', 'lisa.chen@email.com', '0489 012 345',
    '78 Park Street', 'Glen Waverley', 'VIC', '3150',
    'residential', 'referral', 'Kitchen and laundry mould', 'medium', admin_user_id,
    2850.00, 2850.00, NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'
  ) RETURNING id INTO lead_paid;
  
  -- 9. GOOGLE REVIEW (needs review request)
  INSERT INTO leads (
    lead_number, status, full_name, email, phone,
    property_address_street, property_address_suburb, property_address_state, property_address_postcode,
    property_type, lead_source, issue_description, urgency, assigned_to,
    quoted_amount, invoice_amount, created_at, updated_at
  ) VALUES (
    'MRC-2025-0109', 'google_review', 'Tom Anderson', 'tom.anderson@email.com', '0490 123 456',
    '34 Forest Drive', 'Doncaster', 'VIC', '3108',
    'residential', 'google', 'Bedroom mould treatment', 'low', admin_user_id,
    1980.00, 1980.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'
  ) RETURNING id INTO lead_review;
  
  -- Create activities for each lead
  INSERT INTO activities (lead_id, activity_type, title, description) VALUES
    (lead_new, 'lead_created', 'Lead Created', 'New lead from website form'),
    (lead_contacted, 'status_changed', 'Inspection Booked', 'Inspection scheduled for today at 9:00 AM'),
    (lead_insp_waiting, 'status_changed', 'Ready for Inspection', 'Technician to start inspection'),
    (lead_insp_completed, 'status_changed', 'Inspection Complete', 'Awaiting report approval'),
    (lead_report_ready, 'status_changed', 'Report Generated', 'PDF ready to send to customer'),
    (lead_job_waiting, 'status_changed', 'Awaiting Booking', 'Customer to book remediation job'),
    (lead_job_completed, 'status_changed', 'Job Scheduled', 'Remediation work scheduled'),
    (lead_paid, 'status_changed', 'Invoice Sent', 'Payment received, needs confirmation'),
    (lead_review, 'status_changed', 'Job Complete', 'Ready to request Google review');
  
  RAISE NOTICE 'Successfully seeded % test leads for Actions Required widget', 9;
END $$;