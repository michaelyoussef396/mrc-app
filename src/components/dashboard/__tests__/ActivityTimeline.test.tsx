import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ActivityTimeline } from '../ActivityTimeline';
import { useActivityTimeline } from '@/hooks/useActivityTimeline';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
afterEach(cleanup);

const websiteLead = { lead_source: 'website', created_by: null };
function activity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'activity-1', activity_type: 'status_change', title: 'Timeline event',
    description: null, user_id: null, metadata: null, lead_id: 'lead-1',
    leads: null, created_at: '2026-09-09T10:00:00Z', ...overrides,
  };
}

function mount(row: ReturnType<typeof activity>, compact: boolean, table = 'activities') {
  from.mockClear();
  const profiles = [{ id: 'user-1', full_name: 'Team member' }, { id: 'blank', full_name: '  ' }];
  from.mockImplementation((name: string) => {
    const query = Promise.resolve({ data: name === 'profiles' ? profiles : name === table ? [row] : [] });
    return Object.assign(query, {
      select: vi.fn().mockReturnValue(query), order: vi.fn().mockReturnValue(query),
      limit: vi.fn().mockReturnValue(query), eq: vi.fn().mockReturnValue(query),
      in: vi.fn().mockReturnValue(query),
    });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  function Timeline() {
    const { data = [], isLoading } = useActivityTimeline(15, 'lead-1');
    return <ActivityTimeline events={data} isLoading={isLoading} compact={compact} />;
  }
  return render(<QueryClientProvider client={client}><MemoryRouter><Timeline /></MemoryRouter></QueryClientProvider>);
}

it('requests the provenance needed to identify website creation', async () => {
  mount(activity(), false);
  await screen.findByText('Timeline event');
  const query = from.mock.results[from.mock.calls.findIndex(([table]) => table === 'activities')].value;
  expect(query.select).toHaveBeenCalledWith(expect.stringContaining('lead_source'));
  expect(query.select).toHaveBeenCalledWith(expect.stringContaining('created_by'));
});

describe.each([false, true])('timeline attribution (compact=%s)', (compact) => {
  it.each([
    'status_change', 'inspection_booked', 'booking_cancelled',
    'job_completion_submitted', 'archived', 'lead_not_proceeding', 'future_activity',
  ])('does not attribute an unrecorded %s actor to automation', async (activity_type) => {
    mount(activity({ activity_type, leads: websiteLead }), compact);
    expect(await screen.findByText(/Actor not recorded/)).toBeVisible();
    expect(screen.queryByText(/System|Website/)).not.toBeInTheDocument();
  });

  it.each([
    ['named user', { user_id: 'user-1' }, 'Team member'],
    ['missing profile', { user_id: 'missing' }, 'User (name unavailable)'],
    ['blank profile', { user_id: 'blank' }, 'User (name unavailable)'],
    ['website creation', { activity_type: 'lead_created', leads: websiteLead }, 'Website'],
    ['unknown creation', { activity_type: 'lead_created' }, 'Actor not recorded'],
    ['null source', { activity_type: 'lead_created', leads: { created_by: null, lead_source: null } }, 'Actor not recorded'],
    ['manual website lead', { activity_type: 'lead_created', leads: { ...websiteLead, created_by: 'user-1' } }, 'Actor not recorded'],
    ['named website creator', { activity_type: 'lead_created', leads: websiteLead, user_id: 'user-1' }, 'Team member'],
    ['invoice overdue cron', { activity_type: 'invoice_overdue' }, 'System'],
    ['invoice milestone cron', { activity_type: 'invoice_milestone' }, 'System'],
    ['named actor over cron type', { activity_type: 'invoice_overdue', user_id: 'user-1' }, 'Team member'],
  ] as const)('renders %s attribution', async (_, overrides, label) => {
    mount(activity(overrides), compact);
    expect(await screen.findByText((_, element) => element?.textContent?.replace(/^\s*—\s*/, '') === label)).toBeVisible();
  });

  it.each(['email_logs', 'notifications'])('keeps missing %s initiators unknown', async (table) => {
    mount(activity({ template_name: 'custom-email', sent_at: '2026-09-09T10:00:00Z', type: 'status_changed' }), compact, table);
    expect(await screen.findByText(/Actor not recorded/)).toBeVisible();
    expect(screen.queryByText(/System|Website/)).not.toBeInTheDocument();
  });
});
