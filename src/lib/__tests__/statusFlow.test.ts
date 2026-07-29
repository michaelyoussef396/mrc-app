import { describe, it, expect } from 'vitest'
import {
  ALL_STATUSES,
  WORKLOAD_BUCKET,
  IS_CONVERTED_STATUS,
  getWorkloadBucket,
  isConvertedStatus,
} from '../statusFlow'

describe('WORKLOAD_BUCKET', () => {
  it('should classify every status in the pipeline', () => {
    const unclassified = ALL_STATUSES.filter(s => WORKLOAD_BUCKET[s] === undefined)
    expect(unclassified).toEqual([])
  })

  // STATUS_FLOW describes `closed` as "Lead completed successfully". The old
  // categoriser filed it under Cancelled, contradicting the Reports conversion
  // rate, which counted the same status as a win.
  it('should treat closed as completed work, not a cancellation', () => {
    expect(WORKLOAD_BUCKET.closed).toBe('completed')
  })

  it('should treat not_landed as the only lost bucket', () => {
    const lost = ALL_STATUSES.filter(s => WORKLOAD_BUCKET[s] === 'notLanded')
    expect(lost).toEqual(['not_landed'])
  })

  // These seven previously fell through to the `else` branch and were silently
  // reported as "Scheduled" on the technician workload bar.
  it('should not report job_report_pdf_sent as scheduled work', () => {
    expect(WORKLOAD_BUCKET.job_report_pdf_sent).toBe('inProgress')
  })

  it('should not report google_review as scheduled work', () => {
    expect(WORKLOAD_BUCKET.google_review).toBe('completed')
  })

  it('should not report invoicing_sent as scheduled work', () => {
    expect(WORKLOAD_BUCKET.invoicing_sent).toBe('inProgress')
  })
})

describe('getWorkloadBucket', () => {
  it('should fall back to scheduled for an unknown status string', () => {
    expect(getWorkloadBucket('some_status_from_the_future')).toBe('scheduled')
  })

  it('should fall back to scheduled for a null status', () => {
    expect(getWorkloadBucket(null)).toBe('scheduled')
  })
})

describe('IS_CONVERTED_STATUS', () => {
  it('should classify every status in the pipeline', () => {
    const unclassified = ALL_STATUSES.filter(s => IS_CONVERTED_STATUS[s] === undefined)
    expect(unclassified).toEqual([])
  })

  it('should count a lead as converted once the job is booked', () => {
    expect(isConvertedStatus('job_waiting')).toBe(true)
  })

  // The old status set stopped at closed/job_completed/paid/finished, so leads
  // sitting at these three were counted as unconverted despite being won.
  it('should count job_report_pdf_sent as converted', () => {
    expect(isConvertedStatus('job_report_pdf_sent')).toBe(true)
  })

  it('should count invoicing_sent as converted', () => {
    expect(isConvertedStatus('invoicing_sent')).toBe(true)
  })

  it('should count google_review as converted', () => {
    expect(isConvertedStatus('google_review')).toBe(true)
  })

  it('should not count a lead still awaiting inspection as converted', () => {
    expect(isConvertedStatus('inspection_waiting')).toBe(false)
  })

  it('should not count a lost lead as converted', () => {
    expect(isConvertedStatus('not_landed')).toBe(false)
  })

  it('should not count an unknown status as converted', () => {
    expect(isConvertedStatus('some_status_from_the_future')).toBe(false)
  })
})
