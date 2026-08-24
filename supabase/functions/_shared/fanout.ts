// Fans a notification out to every admin/technician via the
// fan_out_notification RPC (see supabase/migrations/20260823090000_
// notifications_fan_out.sql — DRAFT, not yet applied as of this file's
// writing). This is purely additive alongside this codebase's existing
// Slack posts: it NEVER throws, so a caller can fire it right next to a
// Slack call without any extra try/catch, and the RPC not existing yet on a
// database this migration hasn't reached cannot break the caller's flow.
//
// The client parameter is typed structurally (only the .rpc() call this
// helper needs) rather than importing supabase-js's SupabaseClient type,
// because this module is shared across Edge Functions that pin different
// esm.sh versions of supabase-js (e.g. receive-framer-lead pins
// @2.39.3?deps=..., check-overdue-invoices imports @2 generic) — importing
// one specific version's type here would risk a structural mismatch against
// a client built from a different pinned import.
interface RpcCapableClient {
  rpc(
    fn: string,
    params?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>
}

export interface FanOutNotificationParams {
  type: string
  title: string
  message: string
  /** Omit to use the RPC's own default: ARRAY['admin','technician']. */
  roles?: readonly string[]
  leadId?: string | null
  actionUrl?: string | null
  priority?: 'high' | 'normal' | 'low'
  metadata?: Record<string, unknown> | null
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

export interface FanOutNotificationResult {
  ok: boolean
  /** Rows inserted, when the RPC returned successfully. */
  count?: number
  error?: string
}

export async function fanOutNotification(
  client: RpcCapableClient,
  params: FanOutNotificationParams,
): Promise<FanOutNotificationResult> {
  try {
    const { data, error } = await client.rpc('fan_out_notification', {
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      ...(params.roles ? { p_roles: params.roles } : {}),
      p_lead_id: params.leadId ?? null,
      p_action_url: params.actionUrl ?? null,
      p_priority: params.priority ?? 'normal',
      p_metadata: params.metadata ?? null,
      p_related_entity_type: params.relatedEntityType ?? null,
      p_related_entity_id: params.relatedEntityId ?? null,
    })

    if (error) {
      console.error('[fanOutNotification] RPC failed:', error.code ?? 'no-code', error.message)
      return { ok: false, error: error.message }
    }

    return { ok: true, count: typeof data === 'number' ? data : undefined }
  } catch (err) {
    // Covers the RPC not existing yet (this migration is a DRAFT until
    // Michael applies it) as well as any network/client-level failure.
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fanOutNotification] threw:', msg)
    return { ok: false, error: msg }
  }
}
