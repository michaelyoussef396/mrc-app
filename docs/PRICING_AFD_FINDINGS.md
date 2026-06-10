# Pricing Engine & AFD Billing — Verified Findings

**Date:** 2026-06-02
**Phase:** 1 of 3 (read-only investigation)
**Scope:** `src/lib/calculations/pricing.ts` + AFD capture/billing trace
**Method:** Every value below was re-confirmed by reading the exact file/line. No value is inferred.

> This document is a developer artefact. It corrects two stale claims in `docs/COST_CALCULATION_SYSTEM.md` (v1.0, 2026-01-08) — see the "Corrections" callouts.

---

## 1. Full Labour Rate Card

Source: `src/lib/calculations/pricing.ts:14-19` (`LABOUR_RATES`).

| Work type | tier2h (2-hour minimum) | tier8h (8-hour / day rate) | file:line | Offered today? |
|---|---|---|---|---|
| nonDemo (normal) | $612.00 | $1,216.99 | `pricing.ts:15` | Yes |
| demolition | $711.90 | $1,798.90 | `pricing.ts:16` | Yes |
| subfloor | $900.00 | $2,334.69 | `pricing.ts:18` | Yes |
| construction | $661.96 | $1,507.95 | `pricing.ts:17` | **No** — defined but marked `// Future use` |

`construction` is defined in the rate card and is a valid `LabourType` member (`pricing.ts:53`), but the inline comment at `pricing.ts:17` marks it `// Future use`. It is defined-but-not-currently-offered: `CostEstimateInput` (`pricing.ts:264-279`) only exposes `nonDemoHours`, `demolitionHours`, and `subfloorHours`, so construction hours cannot be fed into `calculateCostEstimate`.

---

## 2. How Labour Is Charged

Source: `interpolateCost` (`pricing.ts:73-85`), `calculateLabourCostWithBreakdown` (`pricing.ts:91-142`).

Labour is **not** a flat hourly rate. It is a three-band tier model:

1. **Under (and including) 2 hours → flat 2-hour minimum, NOT pro-rated.**
   `pricing.ts:75-78`: `if (hours <= 2) { return tier2h; }`.
   Example (nonDemo): 0.5h, 1h, and 2h all charge the full $612.00. There is no per-hour scaling below the 2-hour floor.

2. **2h → 8h → linear interpolation between the two tier prices.**
   `pricing.ts:79-82`: `if (hours <= 8) { return tier2h + ((hours - 2) / 6) * (tier8h - tier2h); }`.
   The fraction `(hours - 2) / 6` walks from tier2h (at 2h) to tier8h (at 8h).

3. **Beyond 8h → day blocks: full 8-hour days at tier8h + interpolated remainder.**
   `calculateLabourCostWithBreakdown` loops full 8h days at `rates.tier8h` (`pricing.ts:106-117`), then runs the leftover hours back through `interpolateCost` (`pricing.ts:120-121`). The leftover follows the same two-band rule above (2h minimum, then interpolation). `calculateLabourCost` (`pricing.ts:147-171`) is the simple-version equivalent and produces the same shape.

> **Correction to `docs/COST_CALCULATION_SYSTEM.md`:** that doc states under-2h is pro-rated. It is **not** — `pricing.ts:75-78` returns the flat 2-hour minimum (`tier2h`) for any `hours <= 2`.

---

## 3. Discount Tiers, GST, and Equipment Model

### Volume discount — on TOTAL labour hours

Source: `DISCOUNT_TIERS` (`pricing.ts:29-35`), applied in `calculateDiscount` (`pricing.ts:177-185`).

| Total labour hours | Discount | file:line |
|---|---|---|
| 0–8h | 0% | `pricing.ts:30` |
| 9–16h | 7.5% (0.075) | `pricing.ts:31` |
| 17–24h | 10.25% (0.1025) | `pricing.ts:32` |
| 25–32h | 11.5% (0.115) | `pricing.ts:33` |
| 33h+ | 13% (0.13) | `pricing.ts:34` |

The discount applies to total labour hours summed across nonDemo + demolition + subfloor (`pricing.ts:317`), and is applied to the labour subtotal only — equipment is never discounted (`pricing.ts:366-368, 384`).

- **`MAX_DISCOUNT = 0.13`** — `pricing.ts:47` (the sacred 13% cap / 0.87 multiplier minimum).
- **`GST_RATE = 0.10`** — `pricing.ts:38`. GST is 10% on the ex-GST subtotal (`pricing.ts:385`).

### Equipment model — qty × rate × days (NOT direct-total)

Source: `calculateEquipmentCost` (`pricing.ts:229-258`).

Equipment days = `Math.max(1, Math.ceil(totalLabourHours / 8))` (`pricing.ts:233`). Each line is `qty × rate × days` (`pricing.ts:235-237`). The canonical path is computed, not entered as a direct total.

> **Correction to `docs/COST_CALCULATION_SYSTEM.md`:** that doc says "Equipment is entered as a direct total cost (ex GST), not calculated from quantities and rates." That is wrong — the canonical path is `qty × rate × days` per `pricing.ts:229-258`. (A legacy `equipmentCost?` direct-entry field still exists in `CostEstimateInput` at `pricing.ts:271` and is honoured as a fallback at `pricing.ts:381`, but it is not the canonical model.)

---

## 4. Equipment Rates & The Missing AFD Key

Source: `EQUIPMENT_RATES` (`pricing.ts:22-26`).

| Equipment | Rate | file:line |
|---|---|---|
| dehumidifier | $132/day | `pricing.ts:23` |
| airMover | $46/day | `pricing.ts:24` |
| rcd | $5/day | `pricing.ts:25` |

**There is NO `afd` key in `pricing.ts`.** Confirmed by grep — zero `afd` matches anywhere in the file.

The **only** AFD number anywhere in the codebase is a placeholder: `afd: 75` at `src/components/job-completion/Section7Equipment.tsx:9`, inside a **local** `EQUIPMENT_RATES` constant (not the canonical `pricing.ts` one). The component docstring at `Section7Equipment.tsx:166` reads: *"NOTE: AFD daily rate ($75) is a placeholder. Confirm with Michael before going live."*

---

## 5. AFD Capture → Stop Trace

AFD usage is captured on the technician job-completion form, persisted to the DB, but never reaches the invoice. Each hop with file:line:

### Capture point 1 — Treatment method toggle
`src/components/job-completion/Section5TreatmentMethods.tsx:21` — the `methodAfdInstallation` toggle, labelled "AFD Installation". It is a **plain boolean `role="switch"` toggle** (`Section5TreatmentMethods.tsx:79-97`) with **no qty/days reveal**. It records only that AFD was installed.

### Capture point 2 — Equipment card (qty + days)
`src/components/job-completion/Section7Equipment.tsx:219-230` — the "Air Filtration Device (AFD)" `EquipmentCard` with `actualAfdQty` / `actualAfdDays` steppers. It is rendered **unconditionally** — it sits in the static card list and is **not gated** on the `methodAfdInstallation` toggle. (Its `quotedQty` is hardcoded to `0` at `Section7Equipment.tsx:224` because there is no quoted AFD field upstream.) The card computes a local `afdSubtotal` (`Section7Equipment.tsx:177-178`) using the $75 placeholder and includes it in the on-screen `totalEquipmentCost` (`:181`) — but that on-screen total is display-only and is not the billed figure.

### Persistence — DB columns mapped + typed
- Mapped in `src/lib/api/jobCompletions.ts`: `method_afd_installation` at `:43`, `actual_afd_qty` at `:62`, `actual_afd_days` at `:63`.
- Typed in `src/types/jobCompletion.ts`: camelCase form fields `methodAfdInstallation:56`, `actualAfdQty:75`, `actualAfdDays:76`; snake_case row fields `method_afd_installation:129`, `actual_afd_qty:144`, `actual_afd_days:145`; defaults `methodAfdInstallation: false:196`, `actualAfdQty: 0:211`, `actualAfdDays: 0:212`.

So AFD units + days are reliably written to `job_completions` on every job.

### STOP point — invoice auto-populate drops AFD
`src/lib/api/invoices.ts`, `autoPopulateFromLead`:
- The `job_completions` SELECT at `invoices.ts:438-444` requests only `actual_dehumidifier_*`, `actual_air_mover_*`, `actual_rcd_*` (line `:440`). **`actual_afd_qty` / `actual_afd_days` are omitted from the SELECT** — the data is never even fetched.
- The line-item block at `invoices.ts:480-513` emits exactly three equipment lines: dehumidifier (`:481-491`), air mover (`:492-502`), RCD (`:503-513`). **There is no AFD line.**
- `invoices.ts` imports `EQUIPMENT_RATES` from `pricing.ts` (`invoices.ts:3`), which has no `afd` key — and grep confirms **zero `afd` references anywhere in `invoices.ts`**.

### Net effect — stated plainly
AFD usage (units + days) **IS recorded on every job** (form capture + DB persistence) **but never reaches the invoice.** Combined with the absence of an `afd` rate in the canonical `pricing.ts`, **AFD bills $0** on every job that uses it. The only AFD rate that exists at all is the $75 placeholder in the form component, which influences only the technician's on-screen equipment total — never the customer invoice.
