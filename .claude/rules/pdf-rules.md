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

## Locked Template Sections
- Sections in `src/templates/inspection-report-template.html` wrapped by `<!-- LOCKED START -->` ... `<!-- LOCKED END -->` MUST NOT be modified unless the user explicitly names the file AND the section in the prompt.
- The contact-page (last page) background is a designed 4-color photo at `/pages/page-9-contact/background.png`. It MUST remain a photo background — never convert to HTML/CSS, gradients, or approximations.

## Edge Function
- PDF generation runs as a Supabase Edge Function
- Use the service role key to read inspection data (bypasses RLS)
- Return the PDF as a downloadable file or store in Supabase Storage
- Handle timeouts gracefully — large reports may take >5 seconds
