# PDF Template Integration Guide

## Template Location

| Item | URL |
|------|-----|
| **Template** | `https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-templates/inspection-report-template-final.html` |
| **Assets Base** | `https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-assets` |
| **Bucket (template)** | `pdf-templates` |
| **Bucket (assets)** | `pdf-assets` (52 files) |

## Page Structure (15 pages)

| Page | Name | Placeholders |
|------|------|-------------|
| 1 | Cover | 8 |
| 2 | Table of Contents | 0 (static) |
| 3 | Our Services | 0 (static) |
| 4 | Value Proposition | 0 (static) |
| 5 | Problem Analysis | 1 |
| 6 | Demolition | 1 |
| 7 | Outdoor Environment | 6 |
| 8 | Areas Inspected | 13 |
| **9** | **Subfloor (NEW)** | **14** |
| 10 | Visual Mould Cleaning Estimate | 4 |
| 11-14 | Terms & Conditions | 0 (static) |
| 15 | Contact / Remember Us | 0 (static) |

---

## All Placeholders

### Page 1: Cover (8 placeholders)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{ordered_by}}` | text | `John Smith` |
| `{{inspector}}` | text | `Mike Thompson` |
| `{{inspection_date}}` | text | `10/02/2026` |
| `{{directed_to}}` | text | `Jane Doe` |
| `{{property_type}}` | text | `Residential - House` |
| `{{examined_areas}}` | text | `Kitchen, Bathroom, Bedroom 1` |
| `{{cover_photo_url}}` | image URL | Supabase Storage URL |
| `{{property_address}}` | text | `123 Collins St, Melbourne VIC 3000` |

### Page 4: Value Proposition (2 placeholders)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{what_we_found_text}}` | long text | Multi-sentence findings summary |
| `{{what_we_will_do_text}}` | long text | Treatment plan description |

### Page 5: Problem Analysis (1 placeholder)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{problem_analysis_content}}` | long text (HTML OK) | Full analysis with `<br/>` line breaks |

### Page 6: Demolition (1 placeholder)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{demolition_content}}` | long text (HTML OK) | Full demolition plan with `<br/>` breaks |

### Page 7: Outdoor Environment (6 placeholders)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{outdoor_temperature}}` | text | `22` |
| `{{outdoor_humidity}}` | text | `65` |
| `{{outdoor_dew_point}}` | text | `15` |
| `{{outdoor_photo_1}}` | image URL | Supabase Storage URL |
| `{{outdoor_photo_2}}` | image URL | Supabase Storage URL |
| `{{outdoor_photo_3}}` | image URL | Supabase Storage URL |

### Page 8: Areas Inspected (13 placeholders)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{area_name}}` | text | `Kitchen` |
| `{{area_temperature}}` | text | `24°C` |
| `{{area_humidity}}` | text | `72%` |
| `{{area_dew_point}}` | text | `18°C` |
| `{{visible_mould}}` | text | `Ceiling, Walls` |
| `{{internal_moisture}}` | text | `High` |
| `{{external_moisture}}` | text | `Normal` |
| `{{area_photo_1}}` | image URL | Supabase Storage URL |
| `{{area_photo_2}}` | image URL | Supabase Storage URL |
| `{{area_photo_3}}` | image URL | Supabase Storage URL |
| `{{area_photo_4}}` | image URL | Supabase Storage URL |
| `{{area_infrared_photo}}` | image URL | Supabase Storage URL |
| `{{area_natural_infrared_photo}}` | image URL | Supabase Storage URL |
| `{{area_notes}}` | long text | Area-specific observations |
| `{{extra_notes}}` | long text | Additional notes |

**Note:** Page 8 is REPEATABLE — duplicate the entire page block for each inspected area.

### Page 9: Subfloor (14 placeholders)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{subfloor_photo_1}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_2}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_3}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_4}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_5}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_6}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_7}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_8}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_9}}` | image URL | Supabase Storage URL |
| `{{subfloor_photo_10}}` | image URL | Supabase Storage URL |
| `{{subfloor_observation}}` | long text | Subfloor observation notes |
| `{{subfloor_landscape}}` | long text | Subfloor landscape description |
| `{{subfloor_comments}}` | long text | Subfloor comments |
| `{{subfloor_moisture_levels}}` | long text | Moisture level readings |

### Page 10: Visual Mould Cleaning Estimate (4 placeholders)

| Placeholder | Type | Example |
|-------------|------|---------|
| `{{option_1_price}}` | text | `$2,450.00` |
| `{{option_2_price}}` | text | `$3,200.00` |
| `{{equipment_dehumidifier}}` | text | `$132/day` |
| `{{equipment_air_mover}}` | text | `$46/day` |
| `{{equipment_rcd_box}}` | text | `$5/day` |
| `{{equipment_max_days}}` | text | `5 days` |

---

## How to Populate the Template

### Step 1: Fetch the template
```typescript
const TEMPLATE_URL = 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-templates/inspection-report-template-final.html';
const ASSET_BASE = 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-assets';

const response = await fetch(TEMPLATE_URL);
let html = await response.text();
```

### Step 2: Replace asset paths
```typescript
// Convert relative paths to absolute Supabase URLs
html = html.replace(/\.\/assets\//g, `${ASSET_BASE}/assets/`);
html = html.replace(/\.\/fonts\//g, `${ASSET_BASE}/fonts/`);
```

### Step 3: Replace placeholders with data
```typescript
const replacements: Record<string, string> = {
  '{{ordered_by}}': inspection.ordered_by,
  '{{inspector}}': inspection.inspector_name,
  '{{inspection_date}}': formatDate(inspection.created_at),
  // ... all other placeholders
};

for (const [placeholder, value] of Object.entries(replacements)) {
  html = html.replaceAll(placeholder, value || '');
}
```

### Step 4: Handle repeatable Areas Inspected pages
```typescript
// Extract the Areas Inspected page block
const areaPageRegex = /<!-- Page 8: Areas Inspected[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 9)/;
const areaTemplate = html.match(areaPageRegex)?.[0] || '';

// Generate one page per inspected area
const areaPages = areas.map(area => {
  let page = areaTemplate;
  page = page.replaceAll('{{area_name}}', area.name);
  page = page.replaceAll('{{area_temperature}}', area.temperature);
  // ... replace all area placeholders
  return page;
}).join('\n');

// Replace original with generated pages
html = html.replace(areaPageRegex, areaPages);
```

### Step 5: Clean up unused placeholders
```typescript
html = html.replace(/\{\{[^}]+\}\}/g, '');
```

---

## Edge Function Skeleton

```typescript
// supabase/functions/generate-inspection-pdf/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEMPLATE_URL = 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-templates/inspection-report-template-final.html';
const ASSET_BASE = 'https://ecyivrxjpsmjmexqatym.supabase.co/storage/v1/object/public/pdf-assets';

serve(async (req) => {
  const { inspection_id } = await req.json();

  // 1. Fetch inspection data from database
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: inspection } = await supabase
    .from('inspections')
    .select('*, leads(*)')
    .eq('id', inspection_id)
    .single();

  // 2. Fetch template
  const templateRes = await fetch(TEMPLATE_URL);
  let html = await templateRes.text();

  // 3. Replace asset paths with absolute URLs
  html = html.replace(/\.\/assets\//g, `${ASSET_BASE}/assets/`);
  html = html.replace(/\.\/fonts\//g, `${ASSET_BASE}/fonts/`);

  // 4. Populate all placeholders from inspection data
  const replacements = buildReplacements(inspection);
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(key, value || '');
  }

  // 5. Handle repeatable area pages
  html = generateAreaPages(html, inspection.areas);

  // 6. Clean unused placeholders
  html = html.replace(/\{\{[^}]+\}\}/g, '');

  // 7. Generate PDF using browser API (Puppeteer/Playwright)
  const pdf = await generatePdfFromHtml(html);

  // 8. Upload PDF to storage
  const filename = `reports/${inspection_id}.pdf`;
  await supabase.storage.from('inspection-reports').upload(filename, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  });

  // 9. Return public URL
  const { data: urlData } = supabase.storage
    .from('inspection-reports')
    .getPublicUrl(filename);

  return new Response(JSON.stringify({ url: urlData.publicUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function buildReplacements(inspection: any): Record<string, string> {
  return {
    '{{ordered_by}}': inspection.leads?.customer_name || '',
    '{{inspector}}': inspection.inspector_name || '',
    '{{inspection_date}}': new Date(inspection.created_at).toLocaleDateString('en-AU'),
    '{{directed_to}}': inspection.leads?.customer_name || '',
    '{{property_type}}': inspection.property_type || '',
    '{{examined_areas}}': inspection.examined_areas || '',
    '{{cover_photo_url}}': inspection.cover_photo_url || '',
    '{{property_address}}': inspection.leads?.address || '',
    '{{what_we_found_text}}': inspection.what_we_found || '',
    '{{what_we_will_do_text}}': inspection.what_we_will_do || '',
    '{{problem_analysis_content}}': inspection.problem_analysis || '',
    '{{demolition_content}}': inspection.demolition_plan || '',
    '{{outdoor_temperature}}': inspection.outdoor_temperature || '',
    '{{outdoor_humidity}}': inspection.outdoor_humidity || '',
    '{{outdoor_dew_point}}': inspection.outdoor_dew_point || '',
    '{{outdoor_photo_1}}': inspection.outdoor_photos?.[0] || '',
    '{{outdoor_photo_2}}': inspection.outdoor_photos?.[1] || '',
    '{{outdoor_photo_3}}': inspection.outdoor_photos?.[2] || '',
    '{{subfloor_observation}}': inspection.subfloor_observation || '',
    '{{subfloor_landscape}}': inspection.subfloor_landscape || '',
    '{{subfloor_comments}}': inspection.subfloor_comments || '',
    '{{subfloor_moisture_levels}}': inspection.subfloor_moisture_levels || '',
    ...buildSubfloorPhotos(inspection.subfloor_photos || []),
    '{{option_1_price}}': inspection.option_1_price || '',
    '{{option_2_price}}': inspection.option_2_price || '',
    '{{equipment_dehumidifier}}': '$132/day',
    '{{equipment_air_mover}}': '$46/day',
    '{{equipment_rcd_box}}': '$5/day',
    '{{equipment_max_days}}': inspection.equipment_max_days || '5 days',
  };
}

function buildSubfloorPhotos(photos: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) {
    result[`{{subfloor_photo_${i}}}`] = photos[i - 1] || '';
  }
  return result;
}
```

---

## Supabase Storage Summary

| Bucket | Files | Access | Purpose |
|--------|-------|--------|---------|
| `pdf-assets` | 52 | Public | Backgrounds, icons, logos, fonts, static photos |
| `pdf-templates` | 1 | Public | The HTML template file |
| `inspection-photos` | Dynamic | Auth | Uploaded inspection photos |
| `inspection-reports` | Dynamic | Auth | Generated PDF output files |

---

*Last updated: 2026-02-12*
