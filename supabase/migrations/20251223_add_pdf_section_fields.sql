-- Add separate fields for PDF sections that can be AI-generated and user-approved
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS what_we_found_text TEXT,
ADD COLUMN IF NOT EXISTS what_we_will_do_text TEXT,
ADD COLUMN IF NOT EXISTS what_you_get_text TEXT;

-- Add comments for documentation
COMMENT ON COLUMN inspections.what_we_found_text IS 'Customer-friendly summary of mould findings for PDF';
COMMENT ON COLUMN inspections.what_we_will_do_text IS 'Treatment plan summary for PDF';
COMMENT ON COLUMN inspections.what_you_get_text IS 'Benefits/warranty summary for PDF';
