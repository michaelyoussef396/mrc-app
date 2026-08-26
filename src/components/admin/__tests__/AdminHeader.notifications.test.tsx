// Regression cover for the notification-coherence rework: the bell badge,
// the dropdown list, and "Mark all as read" previously drew from different
// (partly unmounted) sources. All three must now read/write the same
// `notifications` table row set.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import type { Notification } from '@/hooks/useNotifications'

const MOCK_USER_ID = 'user-1'

// hoisted: vi.mock factories run before module-level consts are initialised.
const { mockFrom, mockChannel, mockRemoveChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: MOCK_USER_ID }, signOut: vi.fn() }),
}))

vi.mock('@/lib/sentry', () => ({
  captureBusinessError: vi.fn(),
}))

import AdminHeader from '../AdminHeader'

const NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    type: 'lead_created',
    title: 'New lead: Jane Citizen',
    message: 'A new lead was submitted from the website contact form.',
    lead_id: 'lead-1',
    related_entity_type: null,
    related_entity_id: null,
    metadata: null,
    is_read: false,
    read_at: null,
    user_id: MOCK_USER_ID,
    created_at: '2026-08-20T09:00:00.000Z',
    updated_at: '2026-08-20T09:00:00.000Z',
    action_url: null,
    priority: 'normal',
  },
  {
    id: 'notif-2',
    type: 'job_completion',
    title: 'Job completed',
    message: 'Job JOB-2026-0001 was marked complete.',
    lead_id: 'lead-2',
    related_entity_type: null,
    related_entity_id: null,
    metadata: null,
    is_read: false,
    read_at: null,
    user_id: MOCK_USER_ID,
    created_at: '2026-08-19T09:00:00.000Z',
    updated_at: '2026-08-19T09:00:00.000Z',
    action_url: '/admin/jobs/job-1',
    priority: 'high',
  },
  {
    id: 'notif-3',
    type: 'invoice_overdue',
    title: 'Invoice overdue',
    message: 'Invoice INV-1002 is now overdue.',
    lead_id: null,
    related_entity_type: null,
    related_entity_id: null,
    metadata: null,
    is_read: true,
    read_at: '2026-08-18T10:00:00.000Z',
    user_id: MOCK_USER_ID,
    created_at: '2026-08-18T09:00:00.000Z',
    updated_at: '2026-08-18T10:00:00.000Z',
    action_url: null,
    priority: 'normal',
  },
]

const UNREAD_COUNT = NOTIFICATIONS.filter((n) => n.is_read === false).length

/** Payloads passed to `.update()` on the notifications table, most recent last. */
let updatePayloads: Record<string, unknown>[] = []

/**
 * A chainable, thenable query-builder stand-in for the notifications table.
 * Which result it resolves to is inferred from which terminal method was
 * called — `.update()` vs. a head-count `.select()` vs. a row-returning
 * `.select()` — matching how useNotifications/useUnreadCount/useMarkAllAsRead
 * each shape their own call against the same table.
 */
function buildNotificationsBuilder() {
  let isCountQuery = false
  let isUpdateQuery = false

  const builder: Record<string, unknown> = {}
  const chain = () => builder

  builder.select = vi.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
    if (opts?.head) isCountQuery = true
    return builder
  })
  builder.eq = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.update = vi.fn((payload: Record<string, unknown>) => {
    isUpdateQuery = true
    updatePayloads.push(payload)
    return builder
  })
  builder.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => {
    const result = isUpdateQuery
      ? { error: null }
      : isCountQuery
        ? { count: UNREAD_COUNT, error: null }
        : { data: NOTIFICATIONS, error: null }
    return Promise.resolve(result).then(onFulfilled, onRejected)
  }

  return builder
}

function renderAdminHeader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminHeader userName="Admin" />
      </MemoryRouter>
    </QueryClientProvider>
  )

  return { invalidateSpy }
}

async function openNotificationDropdown() {
  const user = userEvent.setup()
  const trigger = screen.getByTestId('notification-bell-trigger')
  await user.click(trigger)
  return user
}

describe('AdminHeader notification coherence', () => {
  beforeEach(() => {
    updatePayloads = []
    mockFrom.mockReset()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'notifications') return buildNotificationsBuilder()
      throw new Error(`Unexpected table requested in test: ${table}`)
    })
    mockChannel.mockReset()
    mockChannel.mockImplementation(() => {
      const channel: Record<string, unknown> = {}
      channel.on = vi.fn(() => channel)
      channel.subscribe = vi.fn(() => channel)
      return channel
    })
    mockRemoveChannel.mockReset()
  })

  it('should show the unread count from the notifications table on the bell badge', async () => {
    renderAdminHeader()

    expect(await screen.findByTestId('notification-unread-badge')).toHaveTextContent(
      String(UNREAD_COUNT)
    )
  })

  it('should render the same notification rows in the dropdown as the badge counted', async () => {
    renderAdminHeader()
    await openNotificationDropdown()

    const list = await screen.findByTestId('notification-list')
    for (const notification of NOTIFICATIONS) {
      expect(within(list).getByText(notification.title)).toBeInTheDocument()
    }
  })

  it('should issue the mark-all-read update against the notifications table', async () => {
    renderAdminHeader()
    const user = await openNotificationDropdown()

    const markAllButton = await screen.findByRole('button', { name: /mark all as read/i })
    await user.click(markAllButton)

    await waitFor(() => expect(updatePayloads).toHaveLength(1))
    expect(updatePayloads[0]).toMatchObject({ is_read: true })
  })

  it('should invalidate the unread-count query after mark-all-read succeeds', async () => {
    const { invalidateSpy } = renderAdminHeader()
    const user = await openNotificationDropdown()

    const markAllButton = await screen.findByRole('button', { name: /mark all as read/i })
    await user.click(markAllButton)

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['unread-count'] })
    )
  })

  it('should badge a high-priority notification as High', async () => {
    renderAdminHeader()
    await openNotificationDropdown()

    const list = await screen.findByTestId('notification-list')
    expect(within(list).getByText('High')).toBeInTheDocument()
  })

  it('should not badge a normal-priority notification', async () => {
    renderAdminHeader()
    await openNotificationDropdown()

    const list = await screen.findByTestId('notification-list')
    expect(within(list).getAllByText('High')).toHaveLength(1)
  })
})
