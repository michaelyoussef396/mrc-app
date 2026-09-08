import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import ViewReportPDF from '../ViewReportPDF'
import type { CostData } from '@/components/pdf/ReportPreviewHTML'

// Regression test for the 2026-09-08 Codex finding on Unit B, in the SINGLE-SESSION form
// CC found while confirming it: no second writer is needed.
//
// The cost editor reconciles the STORED equipment_days against hours derived from areasData.
// Refresh the areas alone and a stale auto day count reconciles as an EXPLICIT hire period,
// so the editor's auto figure — the one it saves — bills two days where one is correct.
//
// 16h of areas derives 2 days, and a stored 2 is NOT greater, so it stays auto: 1 x $119 x 2
// = $238, correct. Drop the job to 4h and the derived days fall to 1. If equipment_days is
// refreshed with the areas it is also 1, still auto, $119. If it is NOT refreshed it stays 2,
// 2 > 1 reads as explicit, and the quote inflates back to $238.

const INSPECTION_ID = 'inspection-1'
const DEHUMIDIFIER_RATE = 119

const tableResults: Record<string, { data: unknown; error: unknown }> = {}

vi.mock('@/integrations/supabase/client', () => {
  function builderFor(table: string) {
    const settle = () => Promise.resolve(tableResults[table] ?? { data: null, error: null })
    const builder: Record<string, unknown> = {
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        settle().then(onFulfilled, onRejected),
      single: settle,
      maybeSingle: settle,
    }
    for (const method of [
      'select', 'eq', 'neq', 'not', 'is', 'in', 'or', 'gte', 'lte', 'gt', 'lt',
      'order', 'limit', 'range', 'update', 'insert', 'upsert', 'delete',
    ]) {
      builder[method] = () => builder
    }
    return builder
  }
  return {
    supabase: {
      storage: { from: () => ({ download: vi.fn(), upload: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
      from: (table: string) => builderFor(table),
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    },
  }
})

// The whole cost editor is gated on costData, so capturing that prop is how this test sees
// both what the editor would save and whether it is open at all.
const costDataSeen: (CostData | null)[] = []
vi.mock('@/components/pdf/ReportPreviewHTML', () => ({
  ReportPreviewHTML: (props: { costData?: CostData | null }) => {
    costDataSeen.push(props.costData ?? null)
    return <div data-testid="report-preview" />
  },
}))

function area(id: string, jobTimeMinutes: number) {
  return {
    id,
    area_name: id,
    temperature: 0, humidity: 0, dew_point: 0,
    external_moisture: 0, internal_moisture: 0,
    mould_visible_locations: null, comments: null, extra_notes: null,
    infrared_enabled: false, include_in_report: true,
    job_time_minutes: jobTimeMinutes,
    demolition_time_minutes: 0, demolition_required: false,
  }
}

function subfloorRow(treatmentTimeMinutes: number) {
  return {
    id: 'subfloor-1',
    observations: '',
    comments: '',
    landscape: '',
    treatment_time_minutes: treatmentTimeMinutes,
  }
}

function inspectionRow(equipmentDays: number, subfloorRequired = false) {
  return {
    id: INSPECTION_ID,
    job_number: 'JOB-1',
    subfloor_required: subfloorRequired,
    // Without a rendered report the page short-circuits to "No Report Generated" and the
    // cost editor never mounts.
    pdf_url: 'https://reports.test/inspection-report.html',
    commercial_dehumidifier_qty: 1,
    air_movers_qty: 0,
    rcd_box_qty: 0,
    equipment_days: equipmentDays,
    hepa_air_scrubber_qty: 0,
    hepa_air_scrubber_days: null,
    waste_disposal_confirmed_cost: 0,
    option_selected: 2,
    labour_cost_ex_gst: 0,
    equipment_cost_ex_gst: 0,
  }
}

/** The auto equipment figure the cost editor would save, from the newest render. */
function latestAutoEquipment(): number | null {
  for (let i = costDataSeen.length - 1; i >= 0; i--) {
    const seen = costDataSeen[i]
    if (seen) return seen.auto_equipment_ex_gst
  }
  return null
}

function renderInspectionReport() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/inspection/${INSPECTION_ID}/report`]}>
        <Routes>
          <Route path="/inspection/:inspectionId/report" element={<ViewReportPDF />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ViewReportPDF — equipment days must refresh with the areas', () => {
  beforeEach(() => {
    costDataSeen.length = 0
    for (const key of Object.keys(tableResults)) delete tableResults[key]
    // A 16-hour job: 2 areas at 480 minutes each. Stored equipment_days 2 is what the
    // hours derive, so it is an AUTO value, not an explicit hire period.
    tableResults.inspections = { data: inspectionRow(2), error: null }
    tableResults.inspection_areas = { data: [area('a1', 480), area('a2', 480)], error: null }
  })

  it('should quote two days for the sixteen-hour job it was loaded with', async () => {
    renderInspectionReport()
    await waitFor(() => expect(latestAutoEquipment()).not.toBeNull())
    expect(latestAutoEquipment()).toBe(DEHUMIDIFIER_RATE * 2)
  })

  it('should requote one day after the job drops to four hours', async () => {
    const user = userEvent.setup()
    renderInspectionReport()
    await waitFor(() => expect(latestAutoEquipment()).toBe(DEHUMIDIFIER_RATE * 2))

    // The job is rewritten to 4 hours; equipment_days follows it down to 1. Both rows are
    // now current in the database — the only question is whether the page reads both.
    tableResults.inspections = { data: inspectionRow(1), error: null }
    tableResults.inspection_areas = { data: [area('a1', 240)], error: null }

    await user.click(await screen.findByRole('button', { name: /Edit Areas|Add Areas/ }))
    await user.click(await screen.findByRole('button', { name: /Add Area/i }))
    await user.type(await screen.findByPlaceholderText(/Area name/i), 'Bedroom 2')
    await user.click(screen.getByRole('button', { name: /Create Area/i }))

    await waitFor(() => expect(latestAutoEquipment()).toBe(DEHUMIDIFIER_RATE))
  })
})

describe('ViewReportPDF — subfloor treatment time must refresh with the areas', () => {
  // Subfloor treatment time feeds the same derived hours the stored equipment days are
  // reconciled against, so refreshing the areas and the inspection row while leaving the
  // subfloor snapshot behind reproduces the defect one input over.
  beforeEach(() => {
    costDataSeen.length = 0
    for (const key of Object.keys(tableResults)) delete tableResults[key]
    // 4h of areas + 12h of subfloor treatment = 16h, deriving 2 days. Stored 2 is what the
    // hours derive, so it is auto: 1 x $119 x 2 = $238.
    tableResults.inspections = { data: inspectionRow(2, true), error: null }
    tableResults.inspection_areas = { data: [area('a1', 240)], error: null }
    tableResults.subfloor_data = { data: subfloorRow(720), error: null }
  })

  it('should quote two days while the subfloor treatment still counts', async () => {
    renderInspectionReport()
    await waitFor(() => expect(latestAutoEquipment()).not.toBeNull())
    expect(latestAutoEquipment()).toBe(DEHUMIDIFIER_RATE * 2)
  })

  it('should requote one day after the subfloor treatment is cleared', async () => {
    const user = userEvent.setup()
    renderInspectionReport()
    await waitFor(() => expect(latestAutoEquipment()).toBe(DEHUMIDIFIER_RATE * 2))

    // Subfloor treatment is cleared and equipment_days follows it down. The areas are
    // untouched, so ONLY the subfloor snapshot and the inspection row have moved.
    tableResults.inspections = { data: inspectionRow(1, true), error: null }
    tableResults.subfloor_data = { data: subfloorRow(0), error: null }

    await user.click(await screen.findByRole('button', { name: /Edit Areas|Add Areas/ }))
    await user.click(await screen.findByRole('button', { name: /Add Area/i }))
    await user.type(await screen.findByPlaceholderText(/Area name/i), 'Bedroom 2')
    await user.click(screen.getByRole('button', { name: /Create Area/i }))

    await waitFor(() => expect(latestAutoEquipment()).toBe(DEHUMIDIFIER_RATE))
  })
})
