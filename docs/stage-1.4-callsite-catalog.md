# Stage 1.4 — `handleGeneratePDF()` call site catalog

**File audited:** `src/pages/ViewReportPDF.tsx`
**Date:** 2026-05-01
**Purpose:** Pre-flight catalog for Stage 1.4 (PR-B) before any code edits. Every `handleGeneratePDF()` reference classified as either "auto-regen tail to remove" or "explicit user button to keep".
**Total references:** 23 (1 function declaration, 18 auto-regen tail calls, 4 explicit button bindings)

---

## Function declaration (untouched)

| Line | Reference | Notes |
|---|---|---|
| 578 | `async function handleGeneratePDF()` | The function itself. Body unchanged by this stage. Continues to call `generateInspectionPDF(inspection.id, { regenerate: true })` at line 600. The change is in *who calls it*. |

---

## Auto-regen tail calls — REMOVE (18)

Each entry: line, handler, user-visible trigger, and the `await handleGeneratePDF()` call to strip. The DB save logic and toast UX above each tail call remain untouched.

### 1. Line 655 — `handleJobFieldSave`

- **Trigger:** Admin edits a job_completion field (Requested By, Attention To, Completion Date, Premises Type, Additional Notes, Scope What/Why/Extra/Reduced, Demolition Justification, Demolition Removal Notes) and clicks save.
- **Surrounding context:**
  ```
  650      toast.success(`${jobEditField.label} updated`)
  651      setJobEditOpen(false)
  652      setJobEditField(null)
  653      setJobPdfUrlOverride(null)
  654      // ↓ remove this line
  655      await handleGeneratePDF()
  656    } catch (err) {
  657      toast.error('Failed to update field')
  ```
- **Phase 2 scope note:** This handler operates on `job_completions` (Phase 2 feature, already merged). Halting the regen storm here is mechanical and does NOT add or change Phase 2 functionality — it removes a redundant auto-regen call from existing merged code. **Including in scope.**

### 2. Line 784 — `handleJobPhotoSwap`

- **Trigger:** Admin swaps a before/after photo on a job completion report.
- **Surrounding context:**
  ```
  780      toast.success('Photo swapped')
  781      setJobReplacingPhotoId(null)
  782      setJobPdfUrlOverride(null)
  783      refetchJobPhotos()
  784      await handleGeneratePDF()
  785    } catch (err) {
  786      console.error('Photo swap failed:', err)
  ```
- **Phase 2 scope note:** Same as #1 — `job_completions` table. Including in scope for the same reason.

### 3. Line 1296 — `handleImageUploadSuccess`

- **Trigger:** Admin uploads a new image via the ImageUploadModal (any inspection page image).
- **Surrounding context:**
  ```
  1294    async function handleImageUploadSuccess() {
  1295      toast.success('Image uploaded!', { id: 'image-upload' })
  1296      await handleGeneratePDF()
  1297      setImageModalOpen(false)
  1298      setEditingImage(null)
  1299    }
  ```
- **Note:** The await is BEFORE the modal close. After fix, modal closes immediately after toast.

### 4. Line 1378 — `handleVPFieldSave`

- **Trigger:** Admin saves "What We Found" or "What We're Going To Do" inline edit.
- **Surrounding context:**
  ```
  1374      if (error) throw error
  1375
  1376      toast.success(`${key === 'what_we_found' ? 'What We Found' : "What We're Going To Do"} updated`)
  1377      // ↓ remove
  1378      await handleGeneratePDF()
  1379    } catch (error) {
  1380      console.error('VP save failed:', error)
  ```

### 5. Line 1398 — `handlePASave`

- **Trigger:** Admin saves Problem Analysis content.
- **Surrounding context:**
  ```
  1395      if (error) throw error
  1396
  1397      toast.success('Problem Analysis updated')
  1398      await handleGeneratePDF()
  1399    } catch (error) {
  1400      console.error('PA save failed:', error)
  ```

### 6. Line 1418 — `handleDemoSave`

- **Trigger:** Admin saves Demolition content.
- **Surrounding context:**
  ```
  1415      if (error) throw error
  1416
  1417      toast.success('Demolition content updated')
  1418      await handleGeneratePDF()
  1419    } catch (error) {
  1420      console.error('Demolition save failed:', error)
  ```

### 7. Line 1443 — `handleOutdoorFieldSave`

- **Trigger:** Admin edits outdoor temperature, humidity, or dew point inline.
- **Surrounding context:**
  ```
  1438        outdoor_temperature: 'Temperature',
  1439        outdoor_humidity: 'Humidity',
  1440        outdoor_dew_point: 'Dew Point',
  1441      }
  1442      toast.success(`${labelMap[key] || key} updated`)
  1443      await handleGeneratePDF()
  1444    } catch (error) {
  1445      console.error('Outdoor save failed:', error)
  ```

### 8. Line 1477 — `handleSubfloorFieldSave`

- **Trigger:** Admin saves subfloor observations, landscape, or comments.
- **Surrounding context:**
  ```
  1473      // Update local state
  1474      setSubfloorData(prev => prev ? { ...prev, [column]: value } : prev)
  1475
  1476      toast.success(`Subfloor ${field} updated`)
  1477      await handleGeneratePDF()
  1478    } catch (error) {
  1479      console.error('Subfloor save failed:', error)
  ```

### 9. Line 1500 — `handleSubfloorReadingSave`

- **Trigger:** Admin edits a subfloor moisture reading value or location.
- **Surrounding context:**
  ```
  1495      setSubfloorReadings(prev =>
  1496        prev.map(r => r.id === readingId ? { ...r, moisture_percentage: moisturePercentage, location: location.trim() } : r)
  1497      )
  1498
  1499      toast.success('Moisture reading updated')
  1500      await handleGeneratePDF()
  1501    } catch (error) {
  1502      console.error('Subfloor reading save failed:', error)
  ```

### 10. Line 1549 — `handleCostSave`

- **Trigger:** Admin saves cost estimate (labour, equipment, subtotal, GST, total, option_selected, treatment methods).
- **Surrounding context:**
  ```
  1545        option_2_total_inc_gst: costs.option_2_total_inc_gst,
  1546      } : null)
  1547
  1548      toast.success('Estimate updated')
  1549      await handleGeneratePDF()
  1550    } catch (error) {
  1551      console.error('Cost save failed:', error)
  ```
- **13% cap note:** This handler writes pricing fields. The `await handleGeneratePDF()` removal does NOT touch pricing logic. Pricing math is upstream in the modal that produced the `costs` object. The 13% cap remains enforced unchanged.

### 11. Line 1634 — `handleSwapSubfloorPhoto`

- **Trigger:** Admin swaps a subfloor photo.
- **Surrounding context:**
  ```
  1630      toast.success('Subfloor photo swapped')
  1631      setReplacingSubfloorPhotoId(null)
  1632      setReplacingSubfloorPhotoId(null)  // (state reset)
  1633      await loadSubfloorPhotos()
  1634      await handleGeneratePDF()
  1635    } catch (err) {
  1636      console.error('Swap subfloor photo failed:', err)
  ```

### 12. Line 1686 — `saveAreaForm`

- **Trigger:** Admin saves the per-area form modal (temperature, humidity, dew_point, external_moisture, internal_moisture, mould_visible_locations, comments, extra_notes).
- **Surrounding context:**
  ```
  1683      toast.success('Area updated')
  1684      setAreaEditOpen(false)
  1685      setEditingAreaId(null)
  1686      await handleGeneratePDF()
  1687
  1688      // Refresh areas data
  1689      const { data: areas } = await supabase
  ```
- **Note:** After removal, the `// Refresh areas data` block continues to fetch updated areas. UX is preserved — only the regen tail is removed.

### 13. Line 1787 — `handleDeleteAreaPhoto`

- **Trigger:** Admin deletes a photo from an area.
- **Surrounding context:**
  ```
  1783      try {
  1784        await deleteInspectionPhoto(photoId)
  1785        setAreaPhotos(prev => prev.filter(p => p.id !== photoId))
  1786        toast.success('Photo deleted — regenerating PDF...')
  1787        await handleGeneratePDF()
  1788      } catch (err) {
  ```
- **UX note:** Toast text says "regenerating PDF…" — should be updated to remove that promise. New text: `'Photo deleted'`. (One-line copy fix alongside the regen removal.)

### 14. Line 1834 — `handleSelectPhotoForArea`

- **Trigger:** Admin picks a photo from the photo picker to set as an area's primary photo.
- **Surrounding context:**
  ```
  1830      // Update primary state — keeps all area photos visible
  1831      setPrimaryPhotoId(photoId)
  1832
  1833      toast.success('Area photo updated')
  1834      await handleGeneratePDF()
  1835    } catch (error) {
  1836      console.error('Failed to set area photo:', error)
  ```

### 15. Line 1966 — `handlePage1FieldSave`

- **Trigger:** Admin saves a Page 1 field (job number, address, etc., with potential cross-write to leads table).
- **Surrounding context:**
  ```
  1962        }
  1963      }
  1964
  1965      // Regenerate PDF with new data
  1966      await handleGeneratePDF()
  1967    } catch (error) {
  1968      console.error('Page 1 save failed:', error)
  ```
- **Note:** The `// Regenerate PDF with new data` comment line is removed alongside the call.

### 16. Line 2002 — `handleSelectExistingPhoto`

- **Trigger:** Admin selects an existing photo to be the cover photo (front_house). Stage 1.2 already touched this handler.
- **Surrounding context:**
  ```
  1996      await supabase
  1997        .from('photos')
  1998        .update({ caption: 'front_house', photo_type: 'outdoor' })
  1999        .eq('id', photoId)
  2000
  2001      toast.success('Cover photo updated')
  2002      await handleGeneratePDF()
  2003    } catch (error) {
  2004      console.error('Failed to set cover photo:', error)
  ```

### 17. Line 2041 — `handlePhotoUpload`

- **Trigger:** Admin uploads a new cover photo from device.
- **Surrounding context:**
  ```
  2037        order_index: 0,
  2038      })
  2039
  2040      toast.success('Photo updated')
  2041      await handleGeneratePDF()
  2042    } catch (error) {
  2043      console.error('Photo upload failed:', error)
  ```

### 18. Line 3052 — EditFieldModal `onSuccess` callback

- **Trigger:** EditFieldModal completes a Page 2+ field save and fires its onSuccess callback (which currently chains a PDF regen).
- **Surrounding context:**
  ```
  3047            setEditModalOpen(false)
  3048            setEditingField(null)
  3049          }}
  3050          onSuccess={async () => {
  3051            await loadInspection()
  3052            await handleGeneratePDF()
  3053          }}
  ```
- **Important:** This is a render-time JSX callback prop, not a top-level handler. Strip the second await; keep `await loadInspection()` so UI reflects new data.
- **Cross-reference:** EditFieldModal's `handleSave` calls `updateFieldAndRegenerate` which (per the pdfGeneration.ts change in scope #1) will no longer auto-regen. So this onSuccess callback is the only remaining regen path through EditFieldModal — and removing it eliminates EditFieldModal regen entirely.

---

## Explicit user-button bindings — KEEP (4)

These are the explicit user-initiated regen paths the v2 plan endorses. **Untouched.**

| Line | Surrounding context | What user clicks |
|---|---|---|
| 2080 | `onClick={handleGeneratePDF}` inside the "No Report Generated" inspection prompt screen | Generate button on the empty-state screen for an inspection with no PDF yet |
| 2112 | `onClick={handleGeneratePDF}` inside the "No Report Generated" job report prompt screen | Generate button on the empty-state screen for a job with no PDF yet |
| 2367 | `<Button variant="outline" onClick={handleGeneratePDF} disabled={generating}>…Regenerate` — top toolbar | Regenerate button in the always-visible top toolbar |
| 2502 | `<Button size="lg" onClick={handleGeneratePDF} disabled={generating}>…Generate Job Report` — empty-state in job report card | Generate Job Report button on the job report card |

These four user-explicit paths are the ONLY regen entry points after Stage 1.4 ships. The Stale PDF banner (added by this stage) gives the user a fifth path — its inline Regenerate button — but it routes to the same `handleGeneratePDF()`.

---

## Net change summary

| Category | Count | Action |
|---|---|---|
| Function declaration | 1 | Untouched |
| Auto-regen tail calls | 18 | Strip `await handleGeneratePDF()` (one line each, plus #13's toast text and #15's comment) |
| Explicit button bindings | 4 | Untouched |
| **Total references** | **23** | **18 lines removed + 1 toast text edit + 1 comment line removed** |

Plus, separately:
- `pdfGeneration.ts` — drop the regen tail call inside `updateFieldAndRegenerate`, rename the function to `updateInspectionField`
- `EditFieldModal.tsx` — update import + call site for the rename
- `ViewReportPDF.tsx` — drop the now-dead `updateFieldAndRegenerate` import (line 43)
- `InspectionAIReview.tsx` — add explicit "Regenerate PDF" button + Stale PDF banner
- `ViewReportPDF.tsx` — add Stale PDF banner (uses existing line 2367 button as its action target where possible)

---

## Risk classification per call site

All 18 removals are mechanical: strip one line, leave surrounding logic intact. None of the surrounding code paths depend on the regen completing before subsequent operations (the only sequencing concern was the `setEditModalOpen(false); setEditingImage(null)` reset after #3, which the strip preserves).

**Lowest risk:** #4–#10, #12, #14 (pure inline-edit save handlers — DB write, toast, regen tail; the regen tail is fully isolated).

**Medium risk:** #2, #11, #13, #16, #17 (photo-related — the surrounding photo state updates are all before the regen tail; removal does not affect photo state).

**Slightly higher attention:** #15 (cross-table write to leads), #18 (JSX callback prop, requires careful patch). Both are still mechanical strips — flagged only because they touch more than one file/system per handler.

---

## Things explicitly NOT being changed by Stage 1.4

- The `handleGeneratePDF` function body itself (line 578–614)
- `generateInspectionPDF()` in `pdfGeneration.ts` (the function the explicit buttons still call)
- Any DB save logic — every removal preserves the `.update()` calls and error handling above the regen tail
- Toast UX — every save still shows its success toast (only #13's copy fix removes the now-incorrect "regenerating PDF…" promise)
- The 4 explicit user-button bindings (lines 2080, 2112, 2367, 2502)
- The cover-photo Phase 1 fix from Stage 1.2 (still in place at line 1996–1999)
- `customer_preferred_*`, `calendar_bookings`, `useRevisionJobs.ts`, `/src/auth/*`, the 13% discount cap — all unchanged

---

## Approval gate

The catalog is complete. Awaiting user review. No code change has occurred. Once approved, I execute in this order:

1. `pdfGeneration.ts` rename + regen tail strip + top-of-file regen-policy comment
2. `EditFieldModal.tsx` import + call site update for the rename
3. `ViewReportPDF.tsx` — drop dead import + strip 18 regen tails (one logical patch with multiple `Edit` calls) + add Stale PDF banner near top of editable area
4. `InspectionAIReview.tsx` — add Regenerate PDF button + Stale PDF banner
5. New file `src/components/pdf/StalePdfBanner.tsx` (shared component) with the staleness query and Phase 3 migration comment
6. TypeScript clean, build clean, push to main
7. STOP and report

---

End of catalog.
