import { describe, it, expect } from 'vitest';
import { collapseMultiDayJobs, type TechnicianJob } from '@/hooks/useTechnicianJobs';

function makeJob(overrides: Partial<TechnicianJob> = {}): TechnicianJob {
  return {
    id: overrides.id ?? 'booking-1',
    bookingId: overrides.id ?? 'booking-1',
    leadId: 'lead-A',
    inspectionId: 'insp-A',
    title: 'Job (Day 1/6) - Test',
    eventType: 'job',
    status: 'scheduled',
    leadStatus: 'job_scheduled',
    startDatetime: '2026-06-01T08:00:00Z',
    endDatetime: '2026-06-01T16:00:00Z',
    date: '2026-06-01',
    time: '8:00 AM',
    clientName: 'Test Client',
    phone: '',
    email: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
    fullAddress: '',
    issueDescription: null,
    accessInstructions: null,
    travelTimeMinutes: null,
    dayLabel: 'Day 1 of 6',
    dayNumber: 1,
    totalDays: 6,
    ...overrides,
  };
}

function makeSeries(totalDays: number, startDate: string, overrides: Partial<TechnicianJob> = {}) {
  const jobs: TechnicianJob[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(`${startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    jobs.push(makeJob({
      id: `booking-${i + 1}`,
      bookingId: `booking-${i + 1}`,
      startDatetime: `${iso}T08:00:00Z`,
      endDatetime: `${iso}T16:00:00Z`,
      date: iso,
      title: `Job (Day ${i + 1}/${totalDays}) - Test`,
      dayLabel: `Day ${i + 1} of ${totalDays}`,
      dayNumber: i + 1,
      totalDays,
      ...overrides,
    }));
  }
  return jobs;
}

describe('collapseMultiDayJobs', () => {
  it('returns one card when today is within the series', () => {
    const series = makeSeries(6, '2026-06-01');
    const result = collapseMultiDayJobs(series, '2026-06-03');
    expect(result).toHaveLength(1);
  });

  it('badge shows todays position when today is within the series', () => {
    const series = makeSeries(6, '2026-06-01');
    const result = collapseMultiDayJobs(series, '2026-06-03');
    expect(result[0].dayLabel).toBe('Day 3 of 6');
  });

  it('badge shows Day 1 when today is before the series starts', () => {
    const series = makeSeries(6, '2026-06-10');
    const result = collapseMultiDayJobs(series, '2026-06-05');
    expect(result[0].dayLabel).toBe('Day 1 of 6');
  });

  it('badge shows the final day when today is after the series ends', () => {
    const series = makeSeries(6, '2026-06-01');
    const result = collapseMultiDayJobs(series, '2026-06-20');
    expect(result[0].dayLabel).toBe('Day 6 of 6');
  });

  it('passes single-day jobs through unchanged', () => {
    const singleDay = makeJob({
      id: 'single-1',
      bookingId: 'single-1',
      title: 'Job - Single',
      dayLabel: undefined,
      dayNumber: undefined,
      totalDays: undefined,
    });
    const result = collapseMultiDayJobs([singleDay], '2026-06-01');
    expect(result).toEqual([singleDay]);
  });

  it('preserves single-day jobs alongside collapsed multi-day jobs', () => {
    const series = makeSeries(3, '2026-06-01');
    const singleDay = makeJob({
      id: 'inspection-1',
      bookingId: 'inspection-1',
      leadId: 'lead-B',
      eventType: 'inspection',
      dayLabel: undefined,
      dayNumber: undefined,
      totalDays: undefined,
      startDatetime: '2026-06-02T10:00:00Z',
      date: '2026-06-02',
    });
    const result = collapseMultiDayJobs([...series, singleDay], '2026-06-02');
    expect(result).toHaveLength(2);
  });

  it('falls back gracefully when the (Day X/N) title pattern is missing', () => {
    const orphan = makeJob({
      id: 'orphan-1',
      title: 'Job - Test',
      dayLabel: undefined,
      dayNumber: undefined,
      totalDays: undefined,
    });
    const result = collapseMultiDayJobs([orphan], '2026-06-01');
    expect(result).toEqual([orphan]);
  });

  it('marks the collapsed card in_progress when any series row is in_progress', () => {
    const series = makeSeries(6, '2026-06-01');
    series[2].status = 'in_progress';
    const result = collapseMultiDayJobs(series, '2026-06-01');
    expect(result[0].status).toBe('in_progress');
  });

  it('uses the active rows status when no series row is in_progress', () => {
    const series = makeSeries(6, '2026-06-01');
    const result = collapseMultiDayJobs(series, '2026-06-03');
    expect(result[0].status).toBe('scheduled');
  });

  it('preserves start_datetime ordering across single and collapsed jobs', () => {
    const seriesA = makeSeries(3, '2026-06-05', { leadId: 'lead-A', inspectionId: 'insp-A' });
    const seriesB = makeSeries(3, '2026-06-10', { leadId: 'lead-B', inspectionId: 'insp-B' });
    const singleEarly = makeJob({
      id: 'single-early',
      bookingId: 'single-early',
      leadId: 'lead-C',
      eventType: 'inspection',
      dayLabel: undefined,
      dayNumber: undefined,
      totalDays: undefined,
      startDatetime: '2026-06-01T09:00:00Z',
      date: '2026-06-01',
    });
    const result = collapseMultiDayJobs([...seriesB, ...seriesA, singleEarly], '2026-06-07');
    const dates = result.map((j) => j.startDatetime);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('does not merge series that share a lead but differ in inspection or event_type', () => {
    const jobSeries = makeSeries(3, '2026-06-01', { leadId: 'lead-A', inspectionId: 'insp-A', eventType: 'job' });
    const otherSeries = makeSeries(2, '2026-06-10', { leadId: 'lead-A', inspectionId: 'insp-B', eventType: 'job' });
    const result = collapseMultiDayJobs([...jobSeries, ...otherSeries], '2026-06-02');
    expect(result).toHaveLength(2);
  });
});
