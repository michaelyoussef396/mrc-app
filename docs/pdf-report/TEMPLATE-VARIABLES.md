# PDF Report Template Variables

**Total Variables:** 46 unique template variables
**Syntax:** `{{variable_name}}`

---

## Cover Page (Page 1) - 7 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{ordered_by}}` | Customer name who ordered inspection | text | John Smith | Yes |
| `{{inspector}}` | Inspector/technician name | text | Michael Youssef | Yes |
| `{{inspection_date}}` | Date of inspection | date (DD/MM/YYYY) | 07/02/2026 | Yes |
| `{{directed_to}}` | Report recipient (usually customer) | text | John Smith | Yes |
| `{{property_type}}` | Type of property | text | Residential / Commercial | Yes |
| `{{examined_areas}}` | List of areas examined | text | Kitchen, Bathroom, Bedroom | Yes |
| `{{property_address}}` | Full property address | text | 123 Smith St, Carlton VIC 3053 | Yes |

---

## Value Proposition Page (Page 4) - 4 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{what_we_found_text}}` | Summary of mould findings | long text | Active mould growth was identified in multiple areas... | Yes |
| `{{what_we_will_do_text}}` | Proposed action plan | long text | Our team will conduct a comprehensive treatment... | Yes |
| `{{investment_total}}` | Total investment amount (ex GST) | currency | $2,450.00 | Yes |

---

## Problem Analysis Page (Page 5) - 5 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{identified_issues_text}}` | List of identified issues | long text | 1. Water damage to ceiling\n2. Poor ventilation... | Yes |
| `{{root_cause_analysis_text}}` | Root cause analysis | long text | The primary cause of mould growth is... | Yes |
| `{{recommendations_text}}` | Treatment recommendations | long text | 1. Fix roof leak\n2. Improve ventilation... | Yes |
| `{{priority_level}}` | Priority level badge | text | HIGH / MEDIUM / LOW | Yes |

---

## Outdoor Environment Page (Page 6) - 3 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{outdoor_temperature}}` | Outdoor temperature reading | text | 25°C | Yes |
| `{{outdoor_humidity}}` | Outdoor humidity percentage | text | 65% | Yes |
| `{{outdoor_dew_point}}` | Outdoor dew point | text | 18°C | Yes |

---

## Areas Inspected Page 1 (Page 7) - 8 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{area_name}}` | Name of inspected area | text | BATHROOM | Yes |
| `{{area_temperature}}` | Area temperature | text | 22°C | Yes |
| `{{area_humidity}}` | Area humidity percentage | text | 78% | Yes |
| `{{area_dew_point}}` | Area dew point | text | 18°C | Yes |
| `{{visible_mould}}` | Visible mould status | text | DETECTED / NONE | Yes |
| `{{internal_moisture}}` | Internal moisture level | text | 45% / HIGH / LOW | Yes |
| `{{external_moisture}}` | External moisture level | text | 32% / HIGH / LOW | Yes |
| `{{area_notes}}` | Notes for this area | long text | Heavy mould growth on ceiling tiles... | No |
| `{{extra_notes}}` | Additional notes | long text | Infrared imaging shows moisture... | No |

---

## Areas Inspected Page 2 (Page 7.5) - 8 Variables

*Repeatable template for additional areas*

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{area_name_2}}` | Name of second area | text | KITCHEN | Yes |
| `{{area_temperature_2}}` | Temperature reading | text | 24°C | Yes |
| `{{area_humidity_2}}` | Humidity percentage | text | 72% | Yes |
| `{{area_dew_point_2}}` | Dew point | text | 19°C | Yes |
| `{{visible_mould_2}}` | Visible mould status | text | DETECTED | Yes |
| `{{internal_moisture_2}}` | Internal moisture | text | HIGH | Yes |
| `{{external_moisture_2}}` | External moisture | text | NORMAL | Yes |
| `{{area_notes_2}}` | Area notes | long text | Mould behind refrigerator... | No |

---

## Inventory Assessment Page (Page 8) - 7 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{inventory_description}}` | Overview of inventory assessment | long text | Items in the affected areas have been assessed... | Yes |
| `{{inventory_area_1}}` | First area name (e.g., ENSUITE) | text | ENSUITE | Yes |
| `{{non_salvageable_items_1}}` | Non-salvageable items list | long text | Towels, bath mat, shower curtain... | No |
| `{{inventory_area_2}}` | Second area name (e.g., BEDROOM 1) | text | BEDROOM 1 | Yes |
| `{{salvageable_items}}` | Items that can be treated | long text | Mattress, bedding, curtains... | No |
| `{{non_salvageable_items_2}}` | Non-salvageable items | long text | Pillows, cushions... | No |

*Note: This page also reuses `{{inspection_date}}`, `{{property_address}}`, and `{{inspector}}` from the cover page.*

---

## Cleaning Estimate Page (Page 10) - 6 Variables

| Variable | Description | Data Type | Example | Required |
|----------|-------------|-----------|---------|----------|
| `{{option_1_price}}` | Surface treatment price | currency | $1,850.00 + GST | Yes |
| `{{option_2_price}}` | Comprehensive treatment price | currency | $3,250.00 + GST | Yes |
| `{{equipment_dehumidifier}}` | Dehumidifier daily rate | currency | $132/day | Yes |
| `{{equipment_air_mover}}` | Air mover daily rate | currency | $46/day | Yes |
| `{{equipment_rcd_box}}` | RCD box daily rate | currency | $5/day | Yes |
| `{{equipment_max_days}}` | Maximum equipment days | text | 7 days | Yes |

---

## Variable Summary by Page

| Page | Count | Variables |
|------|-------|-----------|
| 1 - Cover | 7 | ordered_by, inspector, inspection_date, directed_to, property_type, examined_areas, property_address |
| 4 - Value Proposition | 3 | what_we_found_text, what_we_will_do_text, investment_total |
| 5 - Problem Analysis | 4 | identified_issues_text, root_cause_analysis_text, recommendations_text, priority_level |
| 6 - Outdoor Environment | 3 | outdoor_temperature, outdoor_humidity, outdoor_dew_point |
| 7 - Areas Inspected (1) | 9 | area_name, area_temperature, area_humidity, area_dew_point, visible_mould, internal_moisture, external_moisture, area_notes, extra_notes |
| 7.5 - Areas Inspected (2) | 8 | area_name_2, area_temperature_2, area_humidity_2, area_dew_point_2, visible_mould_2, internal_moisture_2, external_moisture_2, area_notes_2 |
| 8 - Inventory | 6 | inventory_description, inventory_area_1, non_salvageable_items_1, inventory_area_2, salvageable_items, non_salvageable_items_2 |
| 10 - Cleaning Estimate | 6 | option_1_price, option_2_price, equipment_dehumidifier, equipment_air_mover, equipment_rcd_box, equipment_max_days |
| **Total** | **46** | |

---

## Data Types

| Type | Format | Example |
|------|--------|---------|
| text | Plain string | John Smith |
| long text | Multi-line string with line breaks | Active mould growth was identified... |
| date | DD/MM/YYYY (Australian format) | 07/02/2026 |
| currency | $X,XXX.XX format | $2,450.00 |

---

## Notes

1. **Reused Variables:** `inspection_date`, `property_address`, and `inspector` appear on multiple pages (Cover + Inventory Assessment).

2. **Repeatable Section:** The Areas Inspected pages can be duplicated for each inspected area. For 5 areas, generate 5 instances of page 7.

3. **Currency Formatting:** Always use Australian dollar format with comma separators: `$1,234.56`

4. **Date Formatting:** Use Australian format DD/MM/YYYY, not US format MM/DD/YYYY.
