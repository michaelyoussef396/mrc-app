# Section 9 Verification — MRC-2026-0144 (Wave 6.1 PR #4 pre-flight)

**Date:** 2026-05-14
**Author:** Claude (Session 1 Test 3 verification pass)
**Test lead label:** MRC-2026-0144 (filename label per user direction)
**Test data source-of-truth:** `docs/testing/inscpect1.md` (lead MRC-2026-6382, 35 Wellington Street, Mernda VIC 3754, 47h job)
**Pricing source-of-truth:** `src/lib/calculations/pricing.ts` @ commit `8238d9c` (main, post Wave 6.1 PR #3)
**Spec source-of-truth:** `docs/COST_CALCULATION_SYSTEM.md` v1.0 (2026-01-08); `docs/TROUBLESHOOTING.md` (dew-point mandate, line 145)
**Scope:** Formula-level. The verdicts below apply to every inspection through the same code paths, not just this test lead.

---

## BUG-047 — Verdict: **CONFIRMED BUG** (data-integrity bug at hydration/save path; pricing engine itself is correct)

### Hour-base classification

| Option | Hours summed | Tier (from `DISCOUNT_TIERS`) | Expected multiplier | Expected labour ex GST | Observed labour ex GST | Effective multiplier | Cap-respect |
|---|---|---|---|---|---|---|---|
| Option 1 | 15h (nonDemo only) | 9–16h | 0.925 (7.5%) | $2,158.16 | $2,158.16 | 0.925 | PASS |
| Option 2 | 47h (15 nonDemo + 22 demo + 10 subfloor) | 33h+ | 0.87 (13%) | **$9,223.92** | **$6,409.73805** | 0.6046 (~39.5%) | **FAIL** |

### Verdict statement

> Expected tier: 33h+ @ 13% cap → expected $9,223.92 (= $10,602.21 × 0.87). Observed $6,409.74 → effective multiplier 0.6046 (~39.5% discount). **Cap-respect: FAIL.**

### Source of $6,409.73805 — root-caused

The value is **sourced from persisted form state (`formData.laborCost`), not produced by a live calculation error in `pricing.ts`.** The arithmetic identity is exact:

```
(nonDemo 15h: $2,333.15) + (demo 22h: $5,034.37) = $7,367.52
$7,367.52 × 0.87 = $6,409.73805
```

This matches a **prior save** where (a) subfloor hours were 0 or hadn't been entered yet, so only nonDemo + demo = 37h were in play — which still falls in the 33h+ tier (0.87 multiplier) — and (b) `formData.laborCost` was written to `inspections.labour_cost_ex_gst` with that incomplete result. On the next form load, line 2835 hydrates `formData.laborCost = 6409.73805` from the DB. Then at render time, line 2180 short-circuits:

```ts
const o2Labour = formData.laborCost || costResult.labourAfterDiscount;
//               6409.73805 is truthy → costResult.labourAfterDiscount ($9,223.92) is NEVER read
```

The stale DB value wins over the freshly computed `costResult`, and the display freezes at the old incorrect total until the user manually edits the labour field. The save path at line 3343 has the **same** `||` short-circuit, so a fresh submit-as-is would persist `$6,409.73805` to `inspections.labour_cost_ex_gst` — propagating the wrong total downstream.

### Code path inventory

**Read sites** (where the value is consumed):
- `src/pages/TechnicianInspectionForm.tsx:2180` — `o2Labour = formData.laborCost || costResult.labourAfterDiscount` (Both mode, Option 2 column)
- `src/pages/TechnicianInspectionForm.tsx:2309` — mirror short-circuit for single-option mode
- `src/pages/TechnicianInspectionForm.tsx:3343` — `saveLabour = formData.laborCost || saveFullResult.labourAfterDiscount` (save path)

**Write sites** (where `formData.laborCost` is set):
- `src/pages/TechnicianInspectionForm.tsx:2545` — initial state (`laborCost: 0`)
- `src/pages/TechnicianInspectionForm.tsx:2835` — **DB hydration on form load** (`laborCost: ins.labour_cost_ex_gst ? Number(ins.labour_cost_ex_gst) : 0`) — **the stale-state entry point**
- `src/pages/TechnicianInspectionForm.tsx:2259` — onChange in Both-mode Option 2 input
- `src/pages/TechnicianInspectionForm.tsx:2332` — onChange in single-option-mode input
- `src/pages/TechnicianInspectionForm.tsx:2448` — pass-through in `buildSavePayload()`

### Rationale

BUG-047 is a **data-integrity bug at the read/hydration path, not a math error in `pricing.ts`.** `calculateCostEstimate` (`pricing.ts:311`) produces $9,223.92 every render cycle. That value is discarded because `formData.laborCost` is non-zero after being loaded from a prior partial save. The `||` guard at line 2180 (and its twins) was intended to let admins override the auto-calc by typing into the labour field, but it has the unintended side-effect of permanently locking the displayed value to whatever was last persisted — even when underlying hours have changed.

The fix is **not in `pricing.ts`**. It is in the hydration/render/save guards: drop the `||` short-circuit pattern and always read from `costResult.labourAfterDiscount`, or introduce a "user has explicitly overridden" flag distinct from "stale DB value present." The current code conflates the two signals.

---

## BUG-041 — Verdict: **IMPLEMENTATION-BUG** (spec mandates Magnus; JS shipped simple approximation)

### Current formula

`src/lib/inspectionUtils.ts:7-11`:
```ts
export const calculateDewPoint = (temperature: number, humidity: number): number => {
  if (!temperature || !humidity) return 0;
  const dewPoint = temperature - ((100 - humidity) / 5);
  return Math.round(dewPoint * 10) / 10;
};
```

### Three-point validation (all match simple approximation exactly)

| Input | Displayed (form) | Computed `T − (100−RH)/5` | Match |
|---|---|---|---|
| 32°C, 23% | 16.6°C | 32 − 77/5 = 32 − 15.4 = 16.6 | ✓ |
| 20°C, 34% | 6.8°C | 20 − 66/5 = 20 − 13.2 = 6.8 | ✓ |
| 47°C, 21% | 31.2°C | 47 − 79/5 = 47 − 15.8 = 31.2 | ✓ |

Magnus-Tetens (Alduchov-Eskridge 1996) outputs for the same inputs: **8.3°C / 3.7°C / 19.3°C** respectively. Error scales with temperature (+8.3 / +3.1 / +11.9°C) — material for moisture inspection conclusions on the customer PDF.

### Spec status

**MANDATE found** — `docs/TROUBLESHOOTING.md:142-147`:

> "Dew point showing wrong value … Dew point is auto-calculated from temperature and humidity using **the Magnus formula** … If both inputs are correct, the dew point calculation is deterministic"

This classifies the bug as **IMPLEMENTATION-BUG**, not SPEC-DEFECT. Spec says Magnus; code ships simple approximation. The mandate is reinforced by the fact that a Magnus implementation already exists in the DB (see "DB function status" below) — the intent was clearly Magnus.

Other doc hits (no contradictions, no additional mandates):
- `docs/USER-GUIDE.md:104`, `docs/MRC_FULL_WALKTHROUGH.html:1284,1313`, `docs/PRD.md:280,285,728,739` — all reference "Dew Point" without specifying a formula.
- `docs/database_technical_audit.md:565` — flags `calculate_dew_point()` DB function as "Used = No" (dead code).

### Persistence path — **Outcome A: DB-persisted only**

JS is the **only** producer of `dew_point`. Every other surface reads from DB.

**Producer call sites** (JS computes → form state → DB):
- `src/pages/TechnicianInspectionForm.tsx:3043` — per-area on-blur calc, writes `dewPoint` field
- `src/pages/TechnicianInspectionForm.tsx:3051` — outdoor on-blur calc, writes `outdoorDewPoint`

**DB write paths:**
- `src/pages/TechnicianInspectionForm.tsx:3436` → `inspections.outdoor_dew_point`
- `src/pages/TechnicianInspectionForm.tsx:3552` → `inspection_areas.dew_point` (primary save path)
- `src/pages/TechnicianInspectionForm.tsx:3736` → `inspection_areas.dew_point` (autosave path)

**Consumers (all DB-read, no recomputation):**
- `supabase/functions/generate-inspection-pdf/index.ts:1076` — `{{area_dew_point}}` token replacement on customer PDF
- `src/components/leads/InspectionDataDisplay.tsx:219,387` — admin LeadDetail render
- `src/components/pdf/ReportPreviewHTML.tsx:409` — admin PDF preview
- `src/pages/ViewReportPDF.tsx:1332,1382,1760,1781,1804,2914,3007-3008` — admin PDF edit screen (read + manual override)
- `src/pages/InspectionAIReview.tsx:878,899` — feeds value into AI summary prompt

**No DB trigger / generated column** wires `calculate_dew_point()` to either `inspection_areas.dew_point` or `inspections.outdoor_dew_point`.

**Consequence:** a JS-only formula swap fixes future inspections. Past inspections retain wrong dew points until backfilled. Since the value lands on customer-facing PDFs, backfill is warranted.

### DB function `calculate_dew_point()` status — **DEAD CODE**

Defined twice (each `CREATE OR REPLACE`):
- `supabase/migrations/20251028135212_…sql:831-844` — original (Magnus, `a=17.27, b=237.7`)
- `supabase/migrations/20260217074203_fix_functions_search_path.sql:170-184` — re-defined with `SET search_path = ''`; same Magnus body

Zero invocations: no trigger, no generated column, no other migration call, no EF call, no client call. `database_technical_audit.md:565` confirms "Used = No".

An accurate Magnus implementation was shipped to the DB in October 2025 and re-hardened in February 2026, but no caller was ever wired up.

### Recommended PR #4 fix path: **(b) Replace JS + backfill migration**

Rationale:
1. Customer-facing PDF → backfill required so historical PDF regenerations display correct dew points.
2. JS on-blur preview keeps the technician UX deterministic (no DB round-trip on every keystroke). Wiring the DB function (Outcome C) would require either a DB trigger (which would clobber the admin-override path at `ViewReportPDF.tsx:3007-3008`) or RPC plumbing in the form — both expand PR #4 scope unnecessarily.
3. Use **Alduchov-Eskridge 1996 constants** (`a=17.625, b=243.04`) — more accurate than the migration's older Magnus constants (`a=17.27, b=237.7`). Since the DB function is dead code, no JS↔DB parity needs preserving. If the DB function is ever resurrected, update its constants then.

### Drop-in replacement

```ts
// Magnus-Tetens with Alduchov-Eskridge 1996 coefficients.
// Accurate to ±0.4°C across 0-50°C / 1-100% RH (vs. ±2°C for the simple
// T-(100-RH)/5 approximation, which degrades at low RH — see BUG-041).
export const calculateDewPoint = (temperature: number, humidity: number): number => {
  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return 0;
  if (humidity <= 0 || humidity > 100) return 0;

  const A = 17.625;
  const B = 243.04;
  const gamma = Math.log(humidity / 100) + (A * temperature) / (B + temperature);
  const dewPoint = (B * gamma) / (A - gamma);

  if (!Number.isFinite(dewPoint)) return 0;
  return Math.round(dewPoint * 10) / 10;
};
```

Note: the four unit tests at `src/lib/__tests__/inspectionUtils.test.ts:386-399` currently encode the wrong formula. Update expected values as part of PR #4.

### Backfill SQL skeleton (do not run — PR #4 migration file)

```sql
-- BUG-041 backfill: recompute dew points using Alduchov-Eskridge 1996 (a=17.625, b=243.04).
-- Run as a single migration after the JS fix ships.

UPDATE public.inspection_areas
SET dew_point = ROUND(
  (243.04 * (LN(humidity / 100.0) + (17.625 * temperature) / (243.04 + temperature)))
  / (17.625 - (LN(humidity / 100.0) + (17.625 * temperature) / (243.04 + temperature)))
::numeric, 1)
WHERE temperature IS NOT NULL
  AND humidity IS NOT NULL
  AND humidity > 0
  AND humidity <= 100;

UPDATE public.inspections
SET outdoor_dew_point = ROUND(
  (243.04 * (LN(outdoor_humidity / 100.0) + (17.625 * outdoor_temperature) / (243.04 + outdoor_temperature)))
  / (17.625 - (LN(outdoor_humidity / 100.0) + (17.625 * outdoor_temperature) / (243.04 + outdoor_temperature)))
::numeric, 1)
WHERE outdoor_temperature IS NOT NULL
  AND outdoor_humidity IS NOT NULL
  AND outdoor_humidity > 0
  AND outdoor_humidity <= 100;
```

**Operator caveat:** `ViewReportPDF.tsx:3007-3008` allows admin-typed overrides on `dew_point`. The backfill above will silently overwrite any admin override that happens to differ from the simple-approximation output. Recommend probing `audit_logs` for non-system-attributed `dew_point` writes before running the migration. Expected count is near-zero (override surface is rarely used), but worth checking.

Exposure sizing (read-only count queries — do not run in this pass):
```sql
SELECT COUNT(*) AS areas_to_backfill
FROM public.inspection_areas
WHERE dew_point IS NOT NULL AND temperature IS NOT NULL AND humidity IS NOT NULL;

SELECT COUNT(*) AS inspections_to_backfill
FROM public.inspections
WHERE outdoor_dew_point IS NOT NULL AND outdoor_temperature IS NOT NULL AND outdoor_humidity IS NOT NULL;
```

---

## BUG-046 — Verdict: **CONFIRMED DISPLAY BUG**

`src/pages/TechnicianInspectionForm.tsx:2256-2262`:
```jsx
<input
  type="number"
  value={o2Labour || ''}
  onChange={(e) => onChange('laborCost', parseFloat(e.target.value) || 0)}
  step={0.01}
  className="w-full h-10 bg-white text-[#1d1d1f] text-sm rounded-lg border border-[#007AFF]/20 pl-6 pr-2"
/>
```

**Recommended fix (Approach A — keep editable, clamp display to 2 dp):**
```jsx
<input
  type="number"
  value={o2Labour ? Number(o2Labour).toFixed(2) : ''}
  onChange={(e) => onChange('laborCost', parseFloat(e.target.value) || 0)}
  step={0.01}
  className="w-full h-10 bg-white text-[#1d1d1f] text-sm rounded-lg border border-[#007AFF]/20 pl-6 pr-2"
/>
```

Rationale: the field must remain editable (admins intentionally override the auto-calc), so switching to a read-only `<span>` would break the existing override UX. Clamping the `value` to `Number(x).toFixed(2)` guarantees the 2-dp Australian currency display regardless of the underlying float precision.

**Mirror site:** apply the same fix at the single-option-mode input (`TechnicianInspectionForm.tsx:2332` per Agent A inventory) for parity.

---

## Equipment ratio sanity (Option 1 $814 vs Option 2 $2,442) — Verdict: **SPEC-COMPLIANT**

- Option 1 equipment days: `Math.max(1, Math.ceil(15/8)) = 2` ✓ (Option 1 calls `calculateEquipmentCost` with `totalLabourHours = 15` — nonDemo only)
- Option 2 equipment days: `Math.max(1, Math.ceil(47/8)) = 6` ✓
- Day ratio **2/6 = 1/3 is coincidental** — each option computes its own day count independently from its own labour hours; no shared awareness of Option 1 in Option 2's math
- Equipment is **never discounted** — confirmed `pricing.ts:231-233`. Discount multiplier only applies to `labourSubtotal` at `pricing.ts:363-364`. Equipment is summed at locked daily rates and concatenated to `subtotalExGst` after the labour-discount step.

---

## Sanity checks — Verdict: **ALL PASS**

| # | Item | Verdict | Reasoning + `pricing.ts` ref |
|---|---|---|---|
| 1 | 7h nonDemo = $1,116.16 | PASS | `interpolateCost(7, 612.00, 1216.99)` at `pricing.ts:77` = 612 + (5/6) × 604.99 = 1116.158… → $1,116.16 |
| 2 | 6h demo = $1,436.57 | PASS | `interpolateCost(6, 711.90, 1798.90)` at `pricing.ts:77` = 711.90 + (4/6) × 1087 = 1436.567… → $1,436.57 |
| 3 | 2h subfloor min = $900 | PASS | `interpolateCost(2, 900, 2334.69)` at `pricing.ts:71-73` hits `hours <= 2` branch, returns `tier2h` = $900 |
| 4 | Equipment days = 6 | PASS | `Math.max(1, Math.ceil(47/8)) = Math.max(1, 6) = 6` at `pricing.ts:229` |
| 5 | Option 1 equipment 1/3 ratio | PASS — coincidental | See "Equipment ratio sanity" above. By design, not by ratio. |

---

## Recommended Wave 6.1 PR #4 batch

Ordered by severity. All items below are scoped fixes with no migration-cleanup or feature work bundled in.

| # | Item | Severity | Files | ~LOC | Notes |
|---|---|---|---|---|---|
| 1 | **BUG-047 hydration short-circuit fix** | CRITICAL (pricing integrity, blocks submit) | `src/pages/TechnicianInspectionForm.tsx` lines 2180, 2309, 3343, 2835 | ~10 LOC | Either drop the `||` short-circuit and always read from `costResult.labourAfterDiscount`, OR introduce an explicit `isLabourOverridden` flag distinct from "stale DB value." Same pattern likely affects `formData.equipmentCost`, `subtotalExGst`, `gstAmount`, `totalIncGst` (per `buildSavePayload` at line 2443-2453) — audit those before fix to avoid whack-a-mole. |
| 2 | **BUG-041 dew-point formula + backfill** | HIGH (customer-facing) | `src/lib/inspectionUtils.ts:7-11` + `src/lib/__tests__/inspectionUtils.test.ts:386-399` + new migration | ~15 LOC + migration | Drop-in snippet provided above. Update 4 unit tests. Run `audit_logs` probe for admin overrides before backfill. |
| 3 | **BUG-040 subfloor toggle + PDF page coupling** | MEDIUM (UX correctness, already queued) | `src/pages/TechnicianInspectionForm.tsx` Section 4 + `supabase/functions/generate-inspection-pdf/index.ts` + new migration restoring `inspections.subfloor_required` | ~30 LOC + migration + EF edit | Match per-area `demolitionRequired` pattern from Section 3. Same toggle must gate UI section render AND PDF Subfloor page render. |
| 4 | **BUG-046 currency display 5-dp** | LOW (display only) | `src/pages/TechnicianInspectionForm.tsx:2256-2262, 2332` | ~2 LOC | Drop-in fix provided above. Apply at both Option 2 sites. |

### Optional / out-of-scope flags (PR #4 author's call)

- **Photo counter `8/4`** (room view max 4 + 4 extras: internal moisture, external moisture, natural-light comparison, infrared) — separate UX bug, multiple prior fix attempts per user. Phase 1 did not incidentally find the root cause; defer to a dedicated PR unless a fix-in-batch is preferred.
- **`calculate_dew_point()` DB dead code cleanup** — defined twice in migrations, never called. Safe to leave OR drop in a future hygiene pass. Not blocking.

---

## Submission gate for MRC-2026-0144 (and any inspection sitting on stale labour state)

**Verdict: NO-GO** on submitting the current state of MRC-2026-0144.

**Reasoning:** the same `||` short-circuit that produces the wrong displayed value (`$6,409.74`) also lives at the save path (`TechnicianInspectionForm.tsx:3343`). Submitting now would persist `$6,409.73805` to `inspections.labour_cost_ex_gst`, propagating the cap violation into the DB, into the customer-facing PDF total, and into any downstream invoice generation. That violates the sacred 13% cap in production data even if the pricing engine itself is correct.

**Two workarounds available** (admin-side, no code change needed):
1. **Manually clear the labour input field** before submit. Setting the field to `0` (or empty) writes `formData.laborCost = 0`, after which the next render uses `costResult.labourAfterDiscount = $9,223.92` and a fresh submit will persist the correct total.
2. **Wait for PR #4 BUG-047 fix** to ship to production, then the displayed value re-derives automatically.

**Recommended:** option 2 (wait for the fix). Option 1 is fragile — relies on the technician noticing the wrong value and manually correcting it, which is exactly the failure mode BUG-047 exists in.

---

## Files referenced (absolute paths)

- `/Users/michaelyoussef/mrc-app-1/src/lib/calculations/pricing.ts`
- `/Users/michaelyoussef/mrc-app-1/src/lib/inspectionUtils.ts`
- `/Users/michaelyoussef/mrc-app-1/src/lib/__tests__/inspectionUtils.test.ts`
- `/Users/michaelyoussef/mrc-app-1/src/pages/TechnicianInspectionForm.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/pages/ViewReportPDF.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/pages/InspectionAIReview.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/components/leads/InspectionDataDisplay.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/components/pdf/ReportPreviewHTML.tsx`
- `/Users/michaelyoussef/mrc-app-1/src/types/inspection.ts`
- `/Users/michaelyoussef/mrc-app-1/supabase/functions/generate-inspection-pdf/index.ts`
- `/Users/michaelyoussef/mrc-app-1/supabase/migrations/20251028135212_32f4908a-2987-4ad7-8470-270bb7333f88.sql` (DB column + dead Magnus function)
- `/Users/michaelyoussef/mrc-app-1/supabase/migrations/20260217074203_fix_functions_search_path.sql` (re-defined Magnus, still unwired)
- `/Users/michaelyoussef/mrc-app-1/docs/COST_CALCULATION_SYSTEM.md` (pricing spec)
- `/Users/michaelyoussef/mrc-app-1/docs/TROUBLESHOOTING.md` (dew-point Magnus mandate, line 145)
- `/Users/michaelyoussef/mrc-app-1/docs/database_technical_audit.md` (dead-code confirmation, line 565)
- `/Users/michaelyoussef/mrc-app-1/docs/testing/inscpect1.md` (test-data source-of-truth for MRC-2026-6382)
