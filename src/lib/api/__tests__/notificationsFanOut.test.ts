// Pins the Slack → in-app notification mapping (buildNotificationFromSlackEvent) and
// the fan_out_notification RPC wrapper (fanOutNotification). The RPC ships in a
// migration Michael applies by hand, so it must never surface an error to a caller —
// every fanOutNotification test proves a rejected/erroring RPC still resolves cleanly.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}))

import { buildNotificationFromSlackEvent, fanOutNotification } from '../notifications'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'

beforeEach(() => {
  vi.clearAllMocks()
  rpcMock.mockResolvedValue({ data: 1, error: null })
})

describe('buildNotificationFromSlackEvent — new_lead', () => {
  it('should map the event to type new_lead', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen' })
    expect(mapped?.type).toBe('new_lead')
  })

  it('should title the notification "New lead received"', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen' })
    expect(mapped?.title).toBe('New lead received')
  })

  it('should join name, suburb and phone with " — " when all are present', () => {
    const mapped = buildNotificationFromSlackEvent({
      event: 'new_lead', full_name: 'Jane Citizen', suburb: 'Richmond', phone: '0400 000 000',
    })
    expect(mapped?.message).toBe('Jane Citizen — Richmond — 0400 000 000')
  })

  it('should drop the suburb and phone segments when they are absent', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen' })
    expect(mapped?.message).toBe('Jane Citizen')
  })

  it('should null the lead_id when no leadId is provided', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen' })
    expect(mapped?.leadId).toBeNull()
  })

  it('should carry the leadId through when provided', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen', leadId: LEAD_ID })
    expect(mapped?.leadId).toBe(LEAD_ID)
  })

  it('should deep-link to the admin leads list', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen' })
    expect(mapped?.actionUrl).toBe('/admin/leads')
  })

  it('should mark the notification high priority', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'new_lead', full_name: 'Jane Citizen' })
    expect(mapped?.priority).toBe('high')
  })

  it('should carry only routing-relevant fields as metadata, never contact PII', () => {
    const params = {
      event: 'new_lead' as const,
      full_name: 'Jane Citizen',
      suburb: 'Richmond',
      email: 'jane@example.com',
      phone: '0400 000 000',
      lead_source: 'website',
      preferred_date: '2026-08-25',
      preferred_time: '10:00',
    }
    const mapped = buildNotificationFromSlackEvent(params)
    expect(mapped?.metadata).toEqual({
      lead_source: 'website',
      preferred_date: '2026-08-25',
      preferred_time: '10:00',
    })
  })
})

describe('buildNotificationFromSlackEvent — inspection_booked', () => {
  it('should map the event to type inspection_booked', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'inspection_booked', leadId: LEAD_ID })
    expect(mapped?.type).toBe('inspection_booked')
  })

  it('should title the notification "Inspection booked"', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'inspection_booked', leadId: LEAD_ID })
    expect(mapped?.title).toBe('Inspection booked')
  })

  it('should join lead name, address, technician and date with " — "', () => {
    const mapped = buildNotificationFromSlackEvent({
      event: 'inspection_booked',
      leadId: LEAD_ID,
      leadName: 'Jane Citizen',
      propertyAddress: '12 Test St, Richmond',
      technicianName: 'Clayton',
      bookingDate: '24/08/2026 at 9:00 AM',
    })
    expect(mapped?.message).toBe('Jane Citizen — 12 Test St, Richmond — Clayton — 24/08/2026 at 9:00 AM')
  })

  it('should skip empty fields rather than leaving stray separators', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'inspection_booked', leadId: LEAD_ID, leadName: 'Jane Citizen' })
    expect(mapped?.message).toBe('Jane Citizen')
  })

  it('should deep-link to the lead detail route when a leadId is present', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'inspection_booked', leadId: LEAD_ID })
    expect(mapped?.actionUrl).toBe(`/leads/${LEAD_ID}`)
  })

  it('should have no action_url when no leadId is present', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'inspection_booked' })
    expect(mapped?.actionUrl).toBeNull()
  })

  it('should be normal priority', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'inspection_booked', leadId: LEAD_ID })
    expect(mapped?.priority).toBe('normal')
  })
})

describe('buildNotificationFromSlackEvent — status_changed', () => {
  const params = {
    event: 'status_changed' as const,
    leadId: LEAD_ID,
    leadName: 'Jane Citizen',
    propertyAddress: '12 Test St, Richmond',
    oldStatus: 'new',
    newStatus: 'contacted',
    oldStatusLabel: 'NEW',
    newStatusLabel: 'CONTACTED',
  }

  it('should map the event to type status_changed', () => {
    expect(buildNotificationFromSlackEvent(params)?.type).toBe('status_changed')
  })

  it('should title the notification "Lead status changed"', () => {
    expect(buildNotificationFromSlackEvent(params)?.title).toBe('Lead status changed')
  })

  it('should format the message as "name: oldLabel → newLabel"', () => {
    expect(buildNotificationFromSlackEvent(params)?.message).toBe('Jane Citizen: NEW → CONTACTED')
  })

  it('should deep-link to the lead detail route', () => {
    expect(buildNotificationFromSlackEvent(params)?.actionUrl).toBe(`/leads/${LEAD_ID}`)
  })

  it('should carry the status transition in metadata', () => {
    expect(buildNotificationFromSlackEvent(params)?.metadata).toEqual({
      oldStatus: 'new',
      newStatus: 'contacted',
      oldStatusLabel: 'NEW',
      newStatusLabel: 'CONTACTED',
      propertyAddress: '12 Test St, Richmond',
    })
  })
})

describe('buildNotificationFromSlackEvent — lead_updated', () => {
  const params = {
    event: 'lead_updated' as const,
    leadId: LEAD_ID,
    leadName: 'Jane Citizen',
    changedFields: 'Phone, Email',
  }

  it('should map the event to type lead_updated', () => {
    expect(buildNotificationFromSlackEvent(params)?.type).toBe('lead_updated')
  })

  it('should title the notification "Lead details updated"', () => {
    expect(buildNotificationFromSlackEvent(params)?.title).toBe('Lead details updated')
  })

  it('should format the message as "name — fields: changedFields"', () => {
    expect(buildNotificationFromSlackEvent(params)?.message).toBe('Jane Citizen — fields: Phone, Email')
  })

  it('should deep-link to the lead detail route', () => {
    expect(buildNotificationFromSlackEvent(params)?.actionUrl).toBe(`/leads/${LEAD_ID}`)
  })
})

describe('buildNotificationFromSlackEvent — unmapped events', () => {
  it('should return null for a custom event', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'custom', message: 'anything' })
    expect(mapped).toBeNull()
  })

  it('should return null for report_ready, which stays Slack-only dead code', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'report_ready', leadId: LEAD_ID })
    expect(mapped).toBeNull()
  })

  it('should return null for report_approved, which stays Slack-only dead code', () => {
    const mapped = buildNotificationFromSlackEvent({ event: 'report_approved', leadId: LEAD_ID })
    expect(mapped).toBeNull()
  })
})

describe('buildNotificationFromSlackEvent — title length guard', () => {
  it('should never produce a title over 255 chars, even for a very long lead name', () => {
    const longName = 'A'.repeat(1000)
    const mapped = buildNotificationFromSlackEvent({
      event: 'status_changed',
      leadId: LEAD_ID,
      leadName: longName,
      oldStatus: 'new',
      newStatus: 'contacted',
      oldStatusLabel: 'NEW',
      newStatusLabel: 'CONTACTED',
    })
    expect(mapped!.title.length).toBeLessThanOrEqual(255)
  })
})

describe('fanOutNotification', () => {
  it('should call the fan_out_notification RPC with the mapped p_-prefixed fields', async () => {
    await fanOutNotification({
      type: 'new_lead',
      title: 'New lead received',
      message: 'Jane Citizen',
      leadId: LEAD_ID,
      actionUrl: '/admin/leads',
      priority: 'high',
      metadata: { source: 'test' },
    })
    expect(rpcMock).toHaveBeenCalledWith('fan_out_notification', {
      p_type: 'new_lead',
      p_title: 'New lead received',
      p_message: 'Jane Citizen',
      p_lead_id: LEAD_ID,
      p_action_url: '/admin/leads',
      p_priority: 'high',
      p_metadata: { source: 'test' },
      p_related_entity_type: null,
      p_related_entity_id: null,
    })
  })

  it('should default priority to normal when the caller omits it', async () => {
    await fanOutNotification({ type: 'lead_updated', title: 'Lead details updated', message: 'Jane Citizen — fields: Phone' })
    expect(rpcMock).toHaveBeenCalledWith('fan_out_notification', expect.objectContaining({ p_priority: 'normal' }))
  })

  it('should not throw when the RPC call rejects (e.g. the function does not exist yet)', async () => {
    rpcMock.mockRejectedValueOnce(new Error('function fan_out_notification does not exist'))
    await expect(
      fanOutNotification({ type: 'new_lead', title: 'New lead received', message: 'Jane Citizen' })
    ).resolves.toBeUndefined()
  })

  it('should not throw when the RPC resolves with a Postgres error', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } })
    await expect(
      fanOutNotification({ type: 'new_lead', title: 'New lead received', message: 'Jane Citizen' })
    ).resolves.toBeUndefined()
  })
})
