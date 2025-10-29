-- Add booking-related columns to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS scheduled_dates TEXT[],
ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
ADD COLUMN IF NOT EXISTS access_instructions TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS booked_at TIMESTAMP WITH TIME ZONE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking tokens table for secure customer access
CREATE TABLE IF NOT EXISTS public.booking_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable RLS on booking_tokens (public access needed)
ALTER TABLE public.booking_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can read valid tokens
CREATE POLICY "Anyone can read valid tokens"
ON public.booking_tokens
FOR SELECT
USING (expires_at > NOW() AND NOT used);

-- System can create tokens
CREATE POLICY "System can create booking tokens"
ON public.booking_tokens
FOR INSERT
WITH CHECK (true);

-- System can update tokens
CREATE POLICY "System can update booking tokens"
ON public.booking_tokens
FOR UPDATE
USING (true);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_booking_tokens_token ON public.booking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_booking_tokens_lead_id ON public.booking_tokens(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Add updated_at trigger for notifications
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();