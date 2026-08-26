import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkBookingConflict } from '../bookingService';

/**
 * Conflict detection lives in the PostgREST filters, not in JavaScript: the overlap
 * test IS the pair of bounds sent to the server. These tests assert those bounds
 * directly, because that is where minute-precision and half-openness are decided.
 *
 * Half-open (`lt`/`gt`, never `lte`/`gte`) is what lets a 10:00 booking follow a
 * 09:00–10:00 one without a false conflict, while still catching a 09:07 overlap.
 */
const mocks = vi.hoisted(() => ({
  state: {
    filters: [] as Array<{ method: string; column: string; value: unknown }>,
    result: { data: [] as unknown[], error: null as unknown },
  },
}));

vi.mock('@/integrations/supabase/client', () => {
  const buildQuery = () => {
    const query: Record<string, unknown> = {};

    for (const method of ['select', 'eq', 'neq', 'lt', 'gt']) {
      query[method] = (column: string, value: unknown) => {
        if (method !== 'select') mocks.state.filters.push({ method, column, value });
        return query;
      };
    }

    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(mocks.state.result).then(resolve);

    return query;
  };

  return { supabase: { from: () => buildQuery() } };
});

const TECHNICIAN_ID = 'tech-1';

/** Arbitrary minutes on purpose — the whole point is that these are not round hours. */
const PROPOSED_START = new Date('2026-09-01T09:07:00');
const PROPOSED_END = new Date('2026-09-01T10:07:00');

/** A booking that touches the proposal's start exactly, rather than overlapping it. */
const TOUCHING_START = new Date('2026-09-01T10:00:00');
const TOUCHING_END = new Date('2026-09-01T11:00:00');

function filterFor(method: string, column: string): unknown {
  return mocks.state.filters.find((f) => f.method === method && f.column === column)?.value;
}

function overlappingRow() {
  return {
    id: 'booking-1',
    title: 'Inspection - Existing Customer',
    start_datetime: new Date('2026-09-01T09:00:00').toISOString(),
    end_datetime: new Date('2026-09-01T10:00:00').toISOString(),
  };
}

beforeEach(() => {
  mocks.state.filters = [];
  mocks.state.result = { data: [], error: null };
});

describe('checkBookingConflict window bounds', () => {
  it('should bound the search by the proposed end time to the exact minute', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(filterFor('lt', 'start_datetime')).toBe(PROPOSED_END.toISOString());
  });

  it('should bound the search by the proposed start time to the exact minute', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(filterFor('gt', 'end_datetime')).toBe(PROPOSED_START.toISOString());
  });

  it('should compare an existing start with a strict less-than, not less-than-or-equal', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(mocks.state.filters.some((f) => f.method === 'lt' && f.column === 'start_datetime')).toBe(
      true,
    );
  });

  it('should compare an existing end with a strict greater-than, not greater-than-or-equal', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(mocks.state.filters.some((f) => f.method === 'gt' && f.column === 'end_datetime')).toBe(
      true,
    );
  });

  it('should keep the proposed start distinct from the hour it falls in', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(filterFor('gt', 'end_datetime')).not.toBe(
      new Date('2026-09-01T09:00:00').toISOString(),
    );
  });

  it('should bound a touching proposal at the existing booking end, so it does not conflict', async () => {
    await checkBookingConflict(TECHNICIAN_ID, TOUCHING_START, TOUCHING_END);

    expect(filterFor('gt', 'end_datetime')).toBe(TOUCHING_START.toISOString());
  });
});

describe('checkBookingConflict scoping', () => {
  it('should restrict the search to the chosen technician', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(filterFor('eq', 'assigned_to')).toBe(TECHNICIAN_ID);
  });

  it('should exclude cancelled bookings from the search', async () => {
    await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(filterFor('neq', 'status')).toBe('cancelled');
  });
});

describe('checkBookingConflict result', () => {
  it('should report a conflict when an overlapping booking is returned', async () => {
    mocks.state.result = { data: [overlappingRow()], error: null };

    const { hasConflict } = await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(hasConflict).toBe(true);
  });

  it('should report no conflict when no booking is returned', async () => {
    const { hasConflict } = await checkBookingConflict(TECHNICIAN_ID, TOUCHING_START, TOUCHING_END);

    expect(hasConflict).toBe(false);
  });

  it('should name the conflicting booking in the returned detail', async () => {
    mocks.state.result = { data: [overlappingRow()], error: null };

    const { conflictDetails } = await checkBookingConflict(
      TECHNICIAN_ID,
      PROPOSED_START,
      PROPOSED_END,
    );

    expect(conflictDetails).toContain('Inspection - Existing Customer');
  });

  it('should report the conflicting booking start time to the minute', async () => {
    mocks.state.result = {
      data: [
        {
          ...overlappingRow(),
          start_datetime: new Date('2026-09-01T09:23:00').toISOString(),
        },
      ],
      error: null,
    };

    const { conflictDetails } = await checkBookingConflict(
      TECHNICIAN_ID,
      PROPOSED_START,
      PROPOSED_END,
    );

    expect(conflictDetails).toContain('9:23 AM');
  });

  it('should not report a conflict when the query errors', async () => {
    mocks.state.result = { data: null, error: { message: 'boom' } };

    const { hasConflict } = await checkBookingConflict(TECHNICIAN_ID, PROPOSED_START, PROPOSED_END);

    expect(hasConflict).toBe(false);
  });
});
