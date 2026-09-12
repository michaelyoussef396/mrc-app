import { describe, it, expect } from 'vitest'
import {
  isStalledInspection,
  STALLED_AFTER_HOURS,
  type StalledInspectionRow,
} from '../useStalledInspections'

// Cover for the stalled-inspection sweep (2026-09-09).
//
// Two inspections stopped partway on 7 Sep and nobody found out for two days.
// MRC-2026-0136 reached Section 7 and MRC-2026-0168 reached Section 6. Neither
// reached report generation, so no ai_summary_versions row and no pdf_url ever
// landed — but nothing failed and no lead status changed, so no surface
// anywhere said so.
//
// The predicate deliberately does not consult lead status, and deliberately
// does not consult pdf_version (its column default is 1, so it is evidence of
// nothing).

const NOW = new Date('2026-09-09T14:00:00.000Z')

function hoursBefore(hours: number): string {
  return new Date(NOW.getTime() - hours * 3600000).toISOString()
}

function inspectionRow(overrides: Partial<StalledInspectionRow> = {}): StalledInspectionRow {
  return {
    id: 'inspection-uuid',
    pdf_url: null,
    updated_at: hoursBefore(STALLED_AFTER_HOURS + 1),
    leads: { lead_number: 'MRC-2026-0136', archived_at: null },
    ai_summary_versions: [],
    ...overrides,
  }
}

describe('isStalledInspection', () => {
  it('should select an inspection with no summary version and no pdf', () => {
    expect(isStalledInspection(inspectionRow(), NOW)).toBe(true)
  })

  it('should select a second such inspection regardless of how far it got', () => {
    const secondStall = inspectionRow({ leads: { lead_number: 'MRC-2026-0168', archived_at: null } })

    expect(isStalledInspection(secondStall, NOW)).toBe(true)
  })

  it('should exclude an inspection that produced a summary version and a pdf', () => {
    const completed = inspectionRow({
      pdf_url: 'https://storage.example/reports/completed.pdf',
      ai_summary_versions: [{ id: 'version-1' }, { id: 'version-2' }],
    })

    expect(isStalledInspection(completed, NOW)).toBe(false)
  })

  it('should exclude an inspection whose report was generated but not yet saved as a pdf', () => {
    const summarised = inspectionRow({ ai_summary_versions: [{ id: 'version-1' }] })

    expect(isStalledInspection(summarised, NOW)).toBe(false)
  })

  it('should exclude an inspection whose pdf exists even with no summary version', () => {
    const rendered = inspectionRow({ pdf_url: 'https://storage.example/reports/legacy.pdf' })

    expect(isStalledInspection(rendered, NOW)).toBe(false)
  })

  it('should exclude a stalled inspection on an archived lead', () => {
    const archived = inspectionRow({
      leads: { lead_number: 'MRC-2026-0130', archived_at: '2026-09-09T04:00:00.000Z' },
    })

    expect(isStalledInspection(archived, NOW)).toBe(false)
  })

  it('should exclude an inspection whose lead did not come back from the join', () => {
    expect(isStalledInspection(inspectionRow({ leads: null }), NOW)).toBe(false)
  })

  // Technicians fill in what they can on site and finish the report that night,
  // so an inspection untouched for a couple of hours is the normal working
  // rhythm. Flagging it would make the tile noise on day one.
  it('should exclude an inspection touched two hours ago', () => {
    const inProgress = inspectionRow({ updated_at: hoursBefore(2) })

    expect(isStalledInspection(inProgress, NOW)).toBe(false)
  })

  it('should select an inspection untouched for thirty hours', () => {
    const abandoned = inspectionRow({ updated_at: hoursBefore(30) })

    expect(isStalledInspection(abandoned, NOW)).toBe(true)
  })

  // Known and accepted, not a bug: a duplicate-submission defect can leave more
  // than one inspection row on a single lead, and every one of them genuinely
  // matches the predicate. The tile repeating a lead number is correct output —
  // MRC-2026-0124 did exactly this on 2026-09-09.
  it('should select every stalled inspection on a lead that has more than one', () => {
    const duplicated = [
      inspectionRow({ id: 'inspection-a', leads: { lead_number: 'MRC-2026-0124', archived_at: null } }),
      inspectionRow({ id: 'inspection-b', leads: { lead_number: 'MRC-2026-0124', archived_at: null } }),
    ]

    expect(duplicated.filter((row) => isStalledInspection(row, NOW))).toHaveLength(2)
  })
})
