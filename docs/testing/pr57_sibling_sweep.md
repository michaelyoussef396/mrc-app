# PR #57 Pre-Merge Sibling-Site Sweep

**Date:** 2026-05-15
**Trigger:** Manual QA on PR #57 surfaced a regression — BUG-046 currency display fix (`.toFixed(2)` wrap) was applied to Option 2 Labour input but Option 1 Labour input still renders raw float `$1691.81575` (5 dp). Same sibling-site-missed pattern as the BUG-047 → `o1Labour` follow-up caught in commit `a4e55c0`.
**Methodology:** Two read-only agents in parallel — pricing-guardian (scopes 1+2: pricing-focused) + Explore (scopes 3-6: codebase-wide legacy/back-compat).
**Branch state:** `wave-6.1-pr-4-pricing-leadview-fixes` @ `2d8f710` (5 commits ahead of main, all per `docs/testing/section9_verification_MRC-2026-0144.md` + `docs/testing/leadview_completeness_audit_MRC-2026-0144.md`).

---

## Headline verdict

| Scope | Verdict | Severity | Action |
|---|---|---|---|
| 1. BUG-046 currency display | **SIBLING-SITE-MISSED (4 sites)** | HIGH | Fixup commit pre-merge (~8 LOC) |
| 2. BUG-047 residual + single-option | **PASS** | — | None |
| 3. BUG-041 dew-point callers | **PASS** | — | None |
| 4. BUG-040 save handler + null default | **PASS** | — | None |
| 5. LeadView CRITICAL E–J legacy data | **PASS** | — | None |
| 6. EF subfloor PDF gate back-compat | **PASS** | — | None |

**Single blocker:** Scope 1. **4 missed inputs (3 Equipment + 1 Option 1 Labour) still render raw float, same 5-dp display bug as the user-reported regression.** Recommend a fixup commit (`fix(form): BUG-046 sibling sweep — wrap remaining Equipment + Option 1 Labour inputs with .toFixed(2)`) before merge.

All other scopes clean. No legacy-data risks, no side-effect hazards.

---

## Scope 1 — BUG-046 currency display sibling sweep

### Inputs audited

| Site (file:line) | Mode | Field | Current `value` prop | Verdict |
|---|---|---|---|---|
| `TechnicianInspectionForm.tsx:2271` | Both / Option 1 | `o1Labour` | `value={o1Labour \|\| ''}` | **SIBLING-SITE-MISSED** |
| `TechnicianInspectionForm.tsx:2284` | Both / Option 1 | `o1Equipment` | `value={o1Equipment \|\| ''}` | **SIBLING-SITE-MISSED** |
| `TechnicianInspectionForm.tsx:2321` | Both / Option 2 | `o2Labour` | `value={o2Labour ? Number(o2Labour).toFixed(2) : ''}` | PASS |
| `TechnicianInspectionForm.tsx:2334` | Both / Option 2 | `o2Equipment` | `value={o2Equipment \|\| ''}` | **SIBLING-SITE-MISSED** |
| `TechnicianInspectionForm.tsx:2399` | Single-option | `labour` | `value={labour ? Number(labour).toFixed(2) : ''}` | PASS |
| `TechnicianInspectionForm.tsx:2414` | Single-option | `equipment` | `value={equipment \|\| ''}` | **SIBLING-SITE-MISSED** |

### Root cause

The original BUG-046 fix targeted the two **Labour** inputs that displayed the originally-reported `$1691.81575` 5-decimal-place symptom (`o2Labour` at :2321 and single-option `labour` at :2399). All four **Equipment** inputs plus the **Option 1 Labour** input in Both mode were not in the original report's repro path and were missed during the fix — same sibling-site pattern as BUG-047 → `o1Labour` caught in fixup `a4e55c0`.

### Recommended fixup (4 × 2 LOC = ~8 LOC total)

```diff
# src/pages/TechnicianInspectionForm.tsx

# Site 1 (line ~2271) — Both / Option 1 Labour
- value={o1Labour || ''}
+ value={o1Labour ? Number(o1Labour).toFixed(2) : ''}

# Site 2 (line ~2284) — Both / Option 1 Equipment
- value={o1Equipment || ''}
+ value={o1Equipment ? Number(o1Equipment).toFixed(2) : ''}

# Site 3 (line ~2334) — Both / Option 2 Equipment
- value={o2Equipment || ''}
+ value={o2Equipment ? Number(o2Equipment).toFixed(2) : ''}

# Site 4 (line ~2414) — Single-option Equipment
- value={equipment || ''}
+ value={equipment ? Number(equipment).toFixed(2) : ''}
```

### Verdict: SIBLING-SITE-MISSED — 4 sites, HIGH severity, **fixup before merge**

---

## Scope 2 — BUG-047 residual + single-option re-verify

### 2A. Residual `formData.X || ` short-circuit grep

```bash
grep -nE 'formData\.(laborCost|equipmentCost|option1LabourCost|option1EquipmentCost|subtotalExGst|gstAmount|totalIncGst|manualTotal) \|\|' src/pages/TechnicianInspectionForm.tsx
```

**Result: zero live hits.** Only match is a comment at line 2236 documenting the old bug. All consumption + save sites use `formData.manualPriceOverride ?` ternary.

### 2B. `option2*` drift check

No `formData.option2LabourCost` or `formData.option2EquipmentCost` reference anywhere in TIF.tsx. The only `option2*` field in `InspectionFormData` is `option2TotalIncGst` (per `src/types/inspection.ts:144`). Render-side `o2Labour` / `o2Equipment` are local consts derived from the canonical combined fields (`formData.laborCost` / `formData.equipmentCost`), already gated correctly by the BUG-047 fix. **No drift.**

### 2C. Single-option mode (`optionSelected === 1`) re-verification

Save block at `TechnicianInspectionForm.tsx:3466-3469`:

```ts
} else if (formData.optionSelected === 1) {
  saveOption1Total = saveTotal;          // line 3467 — direct assignment, no || pattern
  saveOption2Total = null;               // line 3469 — explicit null-clear
}
```

`saveTotal` (line 3425) = `saveSubtotal + saveGst`, where `saveSubtotal = saveLabour + saveEquipment`. Both `saveLabour` (TIF:3417-3419) and `saveEquipment` (TIF:3420-3422) are gated on `formData.manualPriceOverride`. No `||` short-circuit reachable. Single-option mode writes ONE field (`saveOption1Total`) derived from the already-fixed pricing gate — **safe**.

### Verdict: PASS — no residuals, no drift, single-option mode confirmed safe

---

## Scope 3 — BUG-041 Magnus-Tetens dew-point callers

### Callers found (4 sites)

| file:line | Caller context | Old-semantic dependence? |
|---|---|---|
| `TechnicianInspectionForm.tsx:3115-3116` | Per-area on-blur: `const dewPoint = calculateDewPoint(temp, hum); handleAreaChange(areaId, 'dewPoint', dewPoint.toString());` | **NO** — `.toString()` contract preserved; new Magnus values propagate as strings |
| `TechnicianInspectionForm.tsx:3123-3124` | Outdoor on-blur: `handleChange('outdoorDewPoint', dewPoint.toString());` | **NO** — same `.toString()` pattern |
| `TechnicianInspectionForm.tsx:3638` | Save: `dew_point: area.dewPoint ? parseFloat(area.dewPoint) : null` | **NO** — parses string back to number; new values persist correctly; edge case `dewPoint = 0` → `"0"` → `parseFloat("0") = 0` ✓ |
| `TechnicianInspectionForm.tsx:3823` | Same save handler (autosave path) | **NO** — same pattern as :3638 |

### Verdict: PASS

No caller depends on the old simple-approximation semantics. All four sites use `.toString()` → string contract. Edge cases (return 0 on invalid input, `console.warn` on out-of-range temperatures) handled transparently by `.toString()` + `parseFloat()`.

---

## Scope 4 — BUG-040 subfloor toggle save handler + form default

### State distinction matrix (3 cases)

| State | Initial default (TIF:2570) | DB hydration (TIF:2850) | Save write (TIF:3574) | subfloor_data write gate (TIF:3732) | Submit validation (TIF:3994) | Behaviour |
|---|---|---|---|---|---|---|
| **`null`** | `null as boolean \| null` ✓ | `ins.subfloor_required ?? null` ✓ | `formData.subfloorRequired ?? null` ✓ | `!== false` → WRITES (back-compat for legacy null rows) ✓ | Blocks submit + destructive toast + forces Section 4 ✓ | Legacy rows continue normal writes; new leads MUST confirm |
| **`true`** | (user selects) | DB value: `true` | Writes `true` ✓ | WRITES subfloor_data ✓ | Passes ✓ | Subfloor section active |
| **`false`** | (user selects) | DB value: `false` | Writes `false` ✓ | SKIPS subfloor_data writes ✓ | Passes ✓ | Section UI greyed out + writes suppressed |

### Critical correctness controls

- **Line 2850 uses `??`, not `||`** — preserves explicit `false` (`false ?? null === false`; `false || null === null` would have been wrong).
- **Line 3732 uses `!== false`, not `=== true`** — back-compat for legacy null rows.
- **Grep `subfloorRequired:` in TIF.tsx** → only 2 assignment sites (initial state + DB hydration). No hidden auto-reset, no draft-restoration override.

### Verdict: PASS

All 3 states correctly distinguished. Null default preserved. Nullish-coalesce hydration correct. Back-compat gate preserves legacy writes. Submit validation enforces explicit confirmation.

---

## Scope 5 — LeadView CRITICAL items E–J legacy data handling

| Item | Surface | Legacy-null handling | Verdict |
|---|---|---|---|
| **E** — `treatment_methods` checklist | `InspectionDataDisplay.tsx:441` | `Array.isArray(i.treatment_methods) ? i.treatment_methods : []` + gate `treatmentMethods.length > 0` → section omitted when null/empty | PASS |
| **F** — `option_selected` banner | `InspectionDataDisplay.tsx:537` | Gate `{i.option_selected != null && OPTION_LABELS[...] && ...}` → no fallback render when null | PASS |
| **G** — per-option dual block | `InspectionDataDisplay.tsx:568-601` | `fmtCurrency(null)` → returns `"—"` per local formatter (line 45-48); `option_selected === 3` ternary preserves single-total fallback for other values | PASS — no `$NaN`, no crash |
| **H** — Dehumidifier label fix | `InspectionDataDisplay.tsx:464` + `LeadDetail.tsx:1843` | Label-only change; no conditional logic | PASS |
| **I** — Infrared photo badges | `InspectionDataDisplay.tsx:776-789` | Strict `=== 'infrared'` / `=== 'naturalInfrared'` checks → legacy null `photo_type` falls through; caption uses `photo.photo_type?.replace(...)` with optional chaining → "Photo" fallback | PASS — no crash, graceful fallback |
| **J** — Admin Cost Breakdown extension | `LeadDetail.tsx:2043-2065` | Gate `inspection.option_selected === 3 && (inspection.option_1_total_inc_gst ?? 0) > 0` → null and 0 both correctly hide the block | PASS |

### Aggregate verdict: PASS

All 6 CRITICAL items handle legacy null/undefined safely. Graceful fallbacks throughout. No legacy-data crash risks.

---

## Scope 6 — EF subfloor PDF gate back-compat verify

### Gate code at `supabase/functions/generate-inspection-pdf/index.ts:1379`

```ts
if (inspection.subfloor_required !== false) {
  html = handleSubfloorPage(html, inspection, subfloorData, subfloorReadings, subfloorPhotos)
} else {
  const subfloorPageRegex = /\s*<!-- Page 5: Subfloor[\s\S]*?<\/div>\s*<\/div>\s*(?=\s*<!-- Page 6)/
  html = html.replace(subfloorPageRegex, '\n\n')
}
```

### Verification

- Both branches present: ✓
  - `subfloor_required === false` → strip page (else branch with regex)
  - `subfloor_required === null` or `=== true` → render page (if branch)
- DB query at the top of the EF uses `.select('*, lead:leads(*), areas:inspection_areas(*, ...)')` — wildcard covers `subfloor_required`; no explicit column list that would exclude it.
- Back-compat: legacy null rows render normally per the manual smoke checklist's third case.

### Verdict: PASS

---

## Merge decision input

**Single recommended action: fixup commit covering Scope 1 (BUG-046 sibling sweep).**

- 4 sites, ~8 LOC, mechanical mirror of the existing `Number(x).toFixed(2)` pattern
- Same severity profile as the original BUG-046 + the o1Labour fixup (`a4e55c0`)
- No new tests required — display-only fix, no behaviour change
- Suggested commit message: `fix(form): BUG-046 sibling sweep — wrap remaining Equipment + Option 1 Labour inputs with .toFixed(2)`

**No other scopes need action.** Scopes 2–6 are MERGE-SAFE as-is.

After the Scope 1 fixup lands, manual QA can resume against:
- The 4 Equipment input sites (no 5-dp leak)
- The Option 1 Labour input in Both mode (no 5-dp leak)
- Previously-corrected Option 2 Labour + single-option Labour (already PASS)

PR #5 backlog: nothing new added by this sweep. The original PR #5 scope (HIGH + MEDIUM LeadView forensic items) stands unchanged.
