---
paths:
  - "supabase/functions/generate-*"
  - "src/templates/**"
  - "src/lib/api/pdfGeneration*"
---

# PDF Generation Rules

## Template Standards
- HTML templates generate professional inspection reports
- All currency values use Australian formatting ($X,XXX.XX)
- All dates use DD/MM/YYYY format
- Include MRC branding (logo, company details, ABN)

## Data Requirements
- Never generate a PDF with missing required fields — validate first
- Required: client name, address, inspection date, technician name
- Include all inspection sections that have data (skip empty sections)

## Edge Function
- PDF generation runs as a Supabase Edge Function
- Use the service role key to read inspection data (bypasses RLS)
- Return the PDF as a downloadable file or store in Supabase Storage
- Handle timeouts gracefully — large reports may take >5 seconds
