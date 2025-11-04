-- Add report_pdf_url column to leads table to store generated PDF URL
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS report_pdf_url TEXT;