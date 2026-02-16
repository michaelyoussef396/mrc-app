# Supabase Asset Management Plan

## Current Problem
- `Logo.png` and `background-cover.png` are referenced via local file paths in the PDF template.
- This causes them to fail to load in the generated PDF (Edge Function execution environment cannot access local user files).

## Solution
Upload assets to the existing `pdf-assets` Supabase Storage bucket and reference them via public URLs.

## Assets
1. **Logo**: `/src/assets/Logo.png` -> `pdf-assets/logo/mrc-logo.png`
2. **Background**: `/inspection-report-pdf/assets/backgrounds/background-cover.png` -> `pdf-assets/backgrounds/cover-background.png`

## Implementation Steps
1. **Upload**: Upload files to `pdf-assets` bucket.
2. **Environment**: Add public URLs to `.env` / `.env.local`.
3. **Template**: Update `inspection-report-template.html` to use the URLs.

## Future Strategy
- All static assets for PDFs must be in `pdf-assets`.
- Use `public` bucket for performance (avoid signing overhead for static assets).
