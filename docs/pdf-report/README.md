# MRC Inspection Report PDF Template

**Version:** 1.0
**Last Updated:** 2025-02-07
**Status:** Template Complete - Awaiting Integration

---

## Overview

The MRC Inspection Report PDF is a 13-page professional document generated from inspection data. It provides customers with a comprehensive mould assessment report including findings, recommendations, environmental readings, and pricing estimates.

---

## Page Structure

| Page | Title | Description | Template Variables |
|------|-------|-------------|-------------------|
| 1 | Cover | Property address, inspector, date, customer | 7 variables |
| 2 | Table of Contents | Navigation index | Static (no variables) |
| 3 | Our Services | Company capabilities | Static (no variables) |
| 4 | Value Proposition | What we found, what we'll do | 4 variables |
| 5 | Problem Analysis | Issues, root cause, recommendations | 5 variables |
| 6 | Outdoor Environment | Temperature, humidity, dew point | 3 variables |
| 7 | Areas Inspected (1) | First area with readings and photos | 8 variables |
| 7.5 | Areas Inspected (2) | Second area (repeatable template) | 8 variables |
| 8 | Inventory Assessment | Salvageable/non-salvageable items | 7 variables |
| 10 | Cleaning Estimate | Option 1 & 2 pricing, equipment | 6 variables |
| 11 | Terms & Conditions (Warranty) | 12-month warranty terms | Static (no variables) |
| 12 | Terms & Conditions (Payment) | Payment terms | Static (no variables) |
| 13 | Remember Us | Contact information | Static (no variables) |

**Total Pages:** 13 (or more with additional area inspected pages)
**Total Template Variables:** 46 unique variables

---

## PDF Generation

### Method: Chrome Headless

The PDF is generated using Chrome headless browser for accurate rendering of fonts and styling.

### Generation Command

```bash
# Navigate to the template directory
cd inspection-report-pdf

# Generate PDF from HTML template
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless \
  --disable-gpu \
  --print-to-pdf=output.pdf \
  --no-pdf-header-footer \
  complete-report.html
```

### Page Size

- **Format:** A4
- **Width:** 794px (210mm at 96dpi)
- **Height:** 1123px (297mm at 96dpi)

---

## Design Requirements

### Fonts

| Font | Weight | Usage |
|------|--------|-------|
| Garet Heavy | 800 | Headings, titles, labels |
| Galvji | 400 | Body text, values, descriptions |

Font files location: `/assets/fonts/`

### Colour Palette

| Colour | Hex | Usage |
|--------|-----|-------|
| White | #FFFFFF | Backgrounds, text on dark |
| Navy Blue | #121D73 | Primary brand, headings |
| Dark Grey | #252525 | Body text, secondary text |
| Red | #E30000 | Warnings, alerts |
| Black | #000000 | MOULD title, primary headings |

### Branding

- Logo location: `/assets/logos/`
- Background shapes: `/assets/backgrounds/`
- Icons: `/assets/icons/`

---

## File Locations

```
inspection-report-pdf/
├── complete-report.html          # Main template (production)
├── test-complete-13-pages.pdf    # Example output
└── assets/
    ├── backgrounds/              # SVG background shapes
    ├── fonts/                    # Garet Heavy, Galvji
    ├── icons/                    # Service icons, IICRC cert
    ├── logos/                    # MRC logos (various sizes)
    └── photos/                   # Placeholder photos

docs/pdf-report/
├── README.md                     # This file
├── TEMPLATE-VARIABLES.md         # All 46 variables documented
├── DATA-REQUIREMENTS.md          # Database field mappings
└── templates/
    └── complete-report-backup.html  # Backup of working template
```

---

## Integration Status

### Completed
- [x] 13-page HTML template
- [x] All styling and branding
- [x] Placeholder photos working
- [x] PDF generation via Chrome headless
- [x] Documentation (this file)

### TODO
- [ ] Create Supabase Edge Function for PDF generation
- [ ] Map database fields to template variables
- [ ] Implement dynamic photo insertion
- [ ] Test with real inspection data
- [ ] Add download button to inspection form
- [ ] Email attachment functionality

---

## Related Documentation

- [Template Variables](./TEMPLATE-VARIABLES.md) - Complete list of all 46 variables
- [Data Requirements](./DATA-REQUIREMENTS.md) - Database field mappings
- [context/TODO.md](/context/TODO.md) - PDF integration tasks

---

## Notes

1. **Repeatable Pages:** The "Areas Inspected" page (Page 7) is a repeatable template. Generate one instance per inspected area.

2. **Photo Placeholders:** All photos currently use placeholder images in `/assets/photos/`. Real implementation should pull from Supabase Storage.

3. **Static Pages:** Pages 2, 3, 11, 12, 13 have no variables and remain constant across all reports.

4. **Print Optimisation:** The template includes print-specific CSS rules to ensure correct colour reproduction and page breaks.
