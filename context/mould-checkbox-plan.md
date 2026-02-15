# Visible Mould Checkbox System Plan

## Objective
Replace the free-text "Visible Mould" field in the Inspection Form with a structured checkbox system + custom text option.

## Current State
- **Frontend**: Single text area `mouldDescription`.
- **Database**: `inspection_areas` table has `mould_description` (text).
- **Legacy**: Table also contains unused boolean columns (`mould_ceiling`, `mould_walls`, etc.). These will be ignored/superseded by the new JSON column.

## Solution Architecture
We will implementation **Option A: JSON Array**, as recommended.
- **Column**: `mould_visible_locations` (jsonb)
- **Data Structure**: Array of strings, e.g., `["Walls", "Skirting", "Grout between tiles"]`.
- **Benefit**: Natively handles standard options AND custom free-text entries in a single list.

## Options List
1. Ceiling
2. Cornice
3. Windows
4. Window frames
5. Furnishings
6. Walls
7. Skirting
8. Flooring
9. Wardrobe
10. Cupboard
11. Contents
12. Grout/silicone
13. No mould visible
+ **Custom**: User can type any other text, which is appended to the array.

## Implementation Steps

### Phase 1: Database Schema
1.  **Add Column**:
    ```sql
    ALTER TABLE inspection_areas ADD COLUMN mould_visible_locations JSONB DEFAULT '[]'::jsonb;
    ```
2.  **Migrate Legacy Data (For current lead)**:
    - Parse "Visible mould on walls..." -> `["Walls"]`.
    - _Specific Instruction_: For the active lead, update the record manually or via migration script to set: `["Walls", "Skirting", "Grout/silicone between shower tiles"]`.

### Phase 2: Frontend (React)
1.  **Type Definition (`src/types/inspection.ts`)**:
    - Add `mouldVisibleLocations: string[]` to `InspectionArea` interface.
2.  **Component (`InspectionForm.tsx` - Section 3)**:
    - Replace `Textarea` for `mouldDescription` with a new `MouldMultiSelect` or `CheckboxGroup` component.
    - **Logic**:
        - List standard options.
        - "Other": Toggle text input. On add, push to array.
        - Checkbox state derived from `area.mouldVisibleLocations.includes(option)`.
3.  **Persistence**:
    - Update `handleSave` to write `mouldVisibleLocations` to Supabase.

### Phase 3: Reports & View
1.  **Lead View (`InspectionDataDisplay.tsx`)**:
    - Render `area.mould_visible_locations.join(', ')`.
2.  **PDF Generation (`generate-inspection-pdf` Edge Function)**:
    - Update `InspectionArea` interface in the function.
    - Update HTML template population to join the array.
    - Format: "**VISIBLE MOULD:** Walls, Skirting, Grout/silicone..."

## Verification
- Test creating a new inspection (save/load).
- Test PDF generation with standard + custom options.
- Verify "No mould visible" exclusivity (if checked, uncheck others?). *Decision: UX should handle this, or just let it be a valid option.*

