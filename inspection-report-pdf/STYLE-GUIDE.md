# MRC PDF Report - Style Guide

## STRICT COLOUR PALETTE

| Colour      | Hex Code  | Usage                                       |
|-------------|-----------|---------------------------------------------|
| WHITE       | #FFFFFF   | Backgrounds, text on dark backgrounds       |
| BLUE        | #121D73   | Primary brand, navy backgrounds, "REPORT" title |
| DARK GREY   | #252525   | Body text, secondary text                   |
| RED         | #E30000   | Warnings, alerts, important notes           |
| BLACK       | #000000   | "MOULD" title, primary headings             |

### NO OTHER COLOURS ALLOWED
- Change `#150DB8` → `#121D73`
- Change any other blue → `#121D73`
- Body text: `#252525` or `#000000`

---

## STRICT FONT FAMILIES

| Font           | File              | Usage                                        |
|----------------|-------------------|----------------------------------------------|
| Garet Heavy    | Garet-Heavy.otf   | Headings, subheadings (MOULD, REPORT, etc.)  |
| Galvji         | Galvji.ttc        | Body text, labels, money/prices, all other text |

### NO OTHER FONTS ALLOWED
- Change "Inter" → "Garet Heavy" for headings
- Change "Inter" → "Galvji" for body text

---

## CSS @font-face Declarations

```css
@font-face {
    font-family: 'Garet Heavy';
    src: url('../fonts/Garet-Heavy.otf') format('opentype');
    font-weight: 800;
    font-style: normal;
}

@font-face {
    font-family: 'Galvji';
    src: url('../fonts/Galvji.ttc') format('truetype');
    font-weight: 400;
    font-style: normal;
}
```

---

## Page-by-Page Font & Colour Rules

### Page 1: Cover
| Element                          | Font         | Colour   |
|----------------------------------|--------------|----------|
| "MOULD" title                    | Garet Heavy  | #000000  |
| "REPORT" title                   | Garet Heavy  | #121D73  |
| ordered by / inspector / date    | Galvji       | #000000  |
| DIRECTED TO / PROPERTY TYPE etc  | Galvji       | #000000  |
| Property address (on navy)       | Galvji       | #FFFFFF  |
| Footer contact info              | Galvji       | #FFFFFF  |
| "Restoring your spaces..."       | Galvji       | #FFFFFF  |

### Page 2+: Body Pages
| Element                          | Font         | Colour   |
|----------------------------------|--------------|----------|
| Page headings (VALUE, PROBLEM)   | Garet Heavy  | #000000  |
| Blue subheadings (PROPOSITION)   | Garet Heavy  | #121D73  |
| Body paragraphs                  | Galvji       | #252525  |
| Labels (WHAT WE FOUND)           | Garet Heavy  | #000000  |
| Text on navy backgrounds         | Galvji       | #FFFFFF  |
| Price/money values               | Galvji       | #FFFFFF  |
| Warning/alert text               | Galvji       | #E30000  |

---

## File Structure

```
inspection-report-pdf/
├── STYLE-GUIDE.md
├── fonts/
│   ├── Garet-Heavy.otf
│   └── Galvji.ttc
├── assets/
│   └── shared/
│       └── (images)
├── pages/
│   └── (page-specific assets)
└── page-XX-name/
    └── page-XX-name.html
```

---

## Quality Checklist

Before submitting any page:
- [ ] Only uses #FFFFFF, #121D73, #252525, #E30000, #000000
- [ ] Headings use "Garet Heavy"
- [ ] Body text uses "Galvji"
- [ ] No "Inter" font references
- [ ] No #150DB8 or other blues
- [ ] Page size is 794px × 1123px
