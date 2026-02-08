# Australian Compliance Skill

## Purpose
Ensure all data formatting follows Australian business standards.

## When to Use
- Displaying phone numbers
- Formatting currency
- Formatting dates
- Calculating GST
- Displaying addresses

## Standards

### Phone Numbers
```
Mobile: 04XX XXX XXX
Landline: (03) XXXX XXXX
International: +61 4XX XXX XXX
```

```typescript
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('04')) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  if (cleaned.startsWith('03')) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2 $3');
  }
  return phone;
}
```

### Currency
```
Format: $X,XXX.XX
Thousands separator: comma
Decimal: 2 places always
```

```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}
// Output: $1,234.56
```

### Dates
```
Display: DD/MM/YYYY
Input: YYYY-MM-DD (ISO for database)
Time: 12-hour with AM/PM
```

```typescript
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
// Output: 07/02/2025

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
// Output: 2:30 PM
```

### GST
```
Rate: 10% always
Applied: AFTER all other calculations
Display: Show subtotal ex GST, GST amount, total inc GST
```

```typescript
function calculateGST(subtotal: number): { gst: number; total: number } {
  const gst = subtotal * 0.10;
  return {
    gst: Math.round(gst * 100) / 100,
    total: Math.round((subtotal + gst) * 100) / 100,
  };
}
```

### ABN
```
Format: XX XXX XXX XXX
Example: 51 824 753 556
```

### Addresses
```
Format:
{street_number} {street_name}
{suburb} {state} {postcode}

Example:
123 Collins Street
Melbourne VIC 3000
```

### Timezone
```
Timezone: Australia/Melbourne
Handles AEST (UTC+10) and AEDT (UTC+11) automatically
```

```typescript
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
  });
}
```

### Spelling
Use Australian English:
- colour (not color)
- labour (not labor)
- organisation (not organization)
- metre (not meter)
- recognise (not recognize)

## Verification Checklist
- [ ] Phone numbers formatted correctly
- [ ] Currency shows $X,XXX.XX
- [ ] Dates show DD/MM/YYYY
- [ ] GST is exactly 10%
- [ ] ABN formatted with spaces
- [ ] Timezone is Australia/Melbourne
- [ ] Australian spelling used
