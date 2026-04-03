---
alwaysApply: true
---

# Australian Compliance (MRC Business Rules)

## Currency & Pricing
- Format: `$X,XXX.XX` (Australian dollars)
- GST: always 10% — calculate as `subtotal * 1.1`
- **13% discount cap** — maximum multiplier is `0.87`. NEVER exceed this.
- Equipment pricing (fixed): Dehumidifier $132/day, Air Mover $46/day, RCD Box $5/day

## Date & Time
- Format: `DD/MM/YYYY` (not MM/DD/YYYY)
- Timezone: `Australia/Melbourne` — always use `en-AU` locale
- Use `Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne' })` for display

## Phone Numbers
- Landline: `(03) XXXX XXXX`
- Mobile: `04XX XXX XXX`
- Validate Australian phone number patterns

## Business Identity
- ABN format: `XX XXX XXX XXX` (11 digits, space-separated)
- Company: Mould & Restoration Co.
- Location: Melbourne, Australia
