# PDF Page 1 Edit Architecture

## 1. UI Architecture: Right Sidebar (Sheet)
**Decision**: Use a **Right Sheet (Sidebar)** component.
-   **Rationale**: Allows the user to view the PDF trigger (or the PDF itself if we embed it) while editing. Keeps context better than a full page redirect and offers more space than a centered modal.
-   **Component**: `Sheet` from `shadcn-ui` (already in codebase?).

## 2. Photo Management Strategy
### Problem
The PDF generator prioritizes photos with `caption === 'front_house'`.
The current `ImageUploadModal` maps 'cover_photo' to `photo_type='general'` and uses a human-readable caption. This causes priority mismatches.

### Solution
-   **Upload Flow**:
    -   Reuse `ImageUploadModal`.
    -   Pass `caption="front_house"` (strictly lowercase) when uploading the cover photo.
    -   Or, better, add a `exactCaption` prop to `ImageUploadModal` to override the human-readable label for the DB/Storage metadata.
-   **Selection**:
    -   Show current cover photo.
    -   "Replace": Opens File Picker.
    -   On successful upload, we **must** invalidate `generate-inspection-pdf` cache or force regeneration.
-   **Storage**:
    -   Uploads to `inspection-photos` bucket.
    -   Inserts into `photos` table with `caption='front_house'`.

## 3. Database Update Strategy
The "Page 1" fields map to multiple tables:

| Field | Source Table | Column | Update Strategy |
| :--- | :--- | :--- | :--- |
| **Ordered By** | `inspections` | `requested_by` | Update `inspections` |
| **Inspector** | `inspections` | `inspector_name` | Update `inspections` |
| **Date** | `inspections` | `inspection_date` | Update `inspections` |
| **Attention To** | `inspections` | `attention_to` | Update `inspections` |
| **Property Type** | `inspections` | `dwelling_type` | Update `inspections` (Lead fallback exists, but specific inspection overrides) |
| **Address** | `leads` | `property_address_*` | Update `leads` (Warning: affects Lead record globally) |
| **Examined Areas** | `inspection_areas` | `area_name` | **Complex** (See below) |

### "Examined Areas" Complexity
The PDF generates this list dynamically: `areas.map(a => a.area_name).join(', ')`.
-   **Option A (Text Edit)**: Allow user to edit the comma-separated string.
    -   *Risk*: This implies creating/renaming/deleting areas based on string parsing. High risk of data loss or duplication.
-   **Option B (List Manager)**: Show list of current areas. Allow "Rename" or "Delete".
    -   *Recommendation*: **Rename Only** for Page 1 edit. Adding/Removing areas should be done in the main Inspection Form to ensure data integrity (readings, photos, etc.).
    -   *Plan*: Show a list of areas with "Edit Name" inputs.

## 4. Edit Workflow
1.  **Trigger**: "Edit Cover Page" button on `ViewReportPDF` page.
2.  **Sidebar Opens**: Fetches current data.
3.  **User Edits**: Modifies fields.
4.  **Photo Update**: Immediate upload (standard `ImageUploadModal` behavior).
5.  **Save**:
    -   Calls `updateInspection` RPC or direct Supabase updates.
    -   Updates `leads` and `inspection_areas` in parallel.
    -   On success: Closes sidebar, triggers PDF regeneration.
6.  **Regeneration**: Reruns `generate-inspection-pdf` logic to reflect changes.

## 5. Validation Rules
-   **Inspector**: Required.
-   **Date**: Required, Valid Date.
-   **Address**: Required (Street, Suburb, State, Postcode).
-   **Photo**: Optional (PDF handles missing).

## 6. Questions for Approval
1.  **UI**: Is Right Sidebar acceptable?
2.  **Scope**: Do we allow editing "Examined Areas" names here? Or read-only?
3.  **Address**: Editing the address updates the **Lead** record. Is this desired? (Usually yes, fixes typos).
4.  **Photo**: Is "Immediate Upload" for the photo acceptable? (User changes photo, it uploads. If they cancel the *text* edits, the photo remains changed). This is simpler to implement.

