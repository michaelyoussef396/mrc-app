# PDF Report Data Requirements

This document maps template variables to their database sources and defines the queries needed to populate the PDF report.

---

## Database Tables Required

| Table | Purpose |
|-------|---------|
| `leads` | Customer and property information |
| `inspections` | Inspection data, findings, recommendations |
| `users` | Inspector/technician details |
| `inspection_areas` | Per-area readings and notes |
| `inspection_photos` | Photos for each area |
| `quotes` | Pricing options |

---

## Field Mapping by Source

### From `leads` Table

| Variable | Database Field | Transform |
|----------|---------------|-----------|
| `{{ordered_by}}` | `leads.first_name` + `leads.last_name` | Concatenate with space |
| `{{directed_to}}` | `leads.first_name` + `leads.last_name` OR `leads.company_name` | Use company name if commercial |
| `{{property_address}}` | `leads.address` | None |
| `{{property_type}}` | `leads.property_type` | Uppercase |

### From `inspections` Table

| Variable | Database Field | Transform |
|----------|---------------|-----------|
| `{{inspection_date}}` | `inspections.inspection_date` | Format as DD/MM/YYYY |
| `{{examined_areas}}` | `inspections.areas_examined` | None |
| `{{what_we_found_text}}` | `inspections.findings_summary` | None |
| `{{what_we_will_do_text}}` | `inspections.action_plan` | None |
| `{{identified_issues_text}}` | `inspections.identified_issues` | None |
| `{{root_cause_analysis_text}}` | `inspections.root_cause_analysis` | None |
| `{{recommendations_text}}` | `inspections.recommendations` | None |
| `{{priority_level}}` | `inspections.priority_level` | Uppercase |
| `{{inventory_description}}` | `inspections.inventory_description` | None |
| `{{outdoor_temperature}}` | `inspections.outdoor_temperature` | Append "°C" |
| `{{outdoor_humidity}}` | `inspections.outdoor_humidity` | Append "%" |
| `{{outdoor_dew_point}}` | `inspections.outdoor_dew_point` | Append "°C" |

### From `users` Table (Inspector)

| Variable | Database Field | Transform |
|----------|---------------|-----------|
| `{{inspector}}` | `users.first_name` + `users.last_name` | Concatenate with space |

### From `inspection_areas` Table

*Query returns array of areas, loop to generate pages*

| Variable | Database Field | Transform |
|----------|---------------|-----------|
| `{{area_name}}` | `inspection_areas.area_name` | Uppercase |
| `{{area_temperature}}` | `inspection_areas.temperature` | Append "°C" |
| `{{area_humidity}}` | `inspection_areas.humidity` | Append "%" |
| `{{area_dew_point}}` | `inspection_areas.dew_point` | Append "°C" |
| `{{visible_mould}}` | `inspection_areas.visible_mould` | Boolean to "DETECTED"/"NONE" |
| `{{internal_moisture}}` | `inspection_areas.internal_moisture` | None |
| `{{external_moisture}}` | `inspection_areas.external_moisture` | None |
| `{{area_notes}}` | `inspection_areas.notes` | None |
| `{{extra_notes}}` | `inspection_areas.extra_notes` | None |

### From `inspection_photos` Table

*Photos are fetched per area and inserted as image URLs*

| Photo Slot | Query |
|------------|-------|
| Area photos (4 per area) | `WHERE inspection_id = ? AND area_id = ? AND photo_type = 'area' LIMIT 4` |
| Infrared photos (2 per area) | `WHERE inspection_id = ? AND area_id = ? AND photo_type = 'infrared' LIMIT 2` |
| Outdoor photos (3) | `WHERE inspection_id = ? AND photo_type = 'outdoor' LIMIT 3` |
| Before/after (2) | `WHERE inspection_id = ? AND photo_type IN ('before', 'after') LIMIT 2` |

### From Pricing Calculations

| Variable | Source | Transform |
|----------|--------|-----------|
| `{{investment_total}}` | Calculated from quote | Format as $X,XXX.XX |
| `{{option_1_price}}` | `quotes.option_1_total` | Format as $X,XXX.XX + GST |
| `{{option_2_price}}` | `quotes.option_2_total` | Format as $X,XXX.XX + GST |
| `{{equipment_dehumidifier}}` | Static | $132/day |
| `{{equipment_air_mover}}` | Static | $46/day |
| `{{equipment_rcd_box}}` | Static | $5/day |
| `{{equipment_max_days}}` | `quotes.equipment_max_days` | Append "days" |

### Inventory Assessment Variables

| Variable | Database Field | Notes |
|----------|---------------|-------|
| `{{inventory_area_1}}` | First affected area name | e.g., "ENSUITE" |
| `{{non_salvageable_items_1}}` | `inspection_inventory.non_salvageable` | Where area matches |
| `{{inventory_area_2}}` | Second affected area name | e.g., "BEDROOM 1" |
| `{{salvageable_items}}` | `inspection_inventory.salvageable` | Comma-separated list |
| `{{non_salvageable_items_2}}` | `inspection_inventory.non_salvageable` | Where area matches |

---

## Sample Query: Complete Report Data

```sql
-- Main inspection data
SELECT
    i.id,
    i.inspection_date,
    i.areas_examined,
    i.findings_summary,
    i.action_plan,
    i.identified_issues,
    i.root_cause_analysis,
    i.recommendations,
    i.priority_level,
    i.outdoor_temperature,
    i.outdoor_humidity,
    i.outdoor_dew_point,
    i.inventory_description,
    -- Lead info
    l.first_name as customer_first,
    l.last_name as customer_last,
    l.address as property_address,
    l.property_type,
    l.company_name,
    -- Inspector info
    u.first_name as inspector_first,
    u.last_name as inspector_last
FROM inspections i
JOIN leads l ON i.lead_id = l.id
JOIN users u ON i.inspector_id = u.id
WHERE i.id = $1;

-- Area readings
SELECT
    area_name,
    temperature,
    humidity,
    dew_point,
    visible_mould,
    internal_moisture,
    external_moisture,
    notes,
    extra_notes
FROM inspection_areas
WHERE inspection_id = $1
ORDER BY created_at;

-- Photos per area
SELECT
    photo_url,
    photo_type,
    area_id
FROM inspection_photos
WHERE inspection_id = $1
ORDER BY area_id, photo_type, created_at;

-- Quote/pricing data
SELECT
    option_1_total,
    option_2_total,
    equipment_max_days
FROM quotes
WHERE inspection_id = $1;
```

---

## Data Transformation Functions

```typescript
// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format currency as $X,XXX.XX
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
}

// Format temperature
function formatTemperature(value: number): string {
  return `${value}°C`;
}

// Format humidity
function formatHumidity(value: number): string {
  return `${value}%`;
}

// Format visible mould boolean
function formatVisibleMould(detected: boolean): string {
  return detected ? 'DETECTED' : 'NONE';
}
```

---

## Missing Database Columns

The following variables may need new database columns:

| Variable | Suggested Table | Suggested Column |
|----------|----------------|------------------|
| `{{inventory_description}}` | inspections | inventory_description (TEXT) |
| `{{salvageable_items}}` | inspection_inventory | salvageable_items (TEXT) |
| `{{non_salvageable_items_1}}` | inspection_inventory | non_salvageable_items (TEXT) |

---

## Photo URL Requirements

Photos must be publicly accessible URLs from Supabase Storage:

```typescript
// Get public URL for photo
const { data } = supabase.storage
  .from('inspection-photos')
  .getPublicUrl(filePath);

const photoUrl = data.publicUrl;
// https://xxx.supabase.co/storage/v1/object/public/inspection-photos/abc123.jpg
```

---

## Notes

1. **Timezone:** All dates should be displayed in Australia/Melbourne timezone.

2. **Null Handling:** If a field is null, display empty string or sensible default.

3. **Text Truncation:** Long text fields may need truncation to fit page layout.

4. **Photo Fallbacks:** If photos are missing, use placeholder images.

5. **Equipment Rates:** The equipment daily rates ($132, $46, $5) are static and should match the values in `CLAUDE.md`.
