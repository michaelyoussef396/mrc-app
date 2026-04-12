import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface RevisionJob {
  leadId: string
  customerName: string
  address: string
  suburb: string
  sendBackNote: string | null
  sendBackDate: string | null
}

export function useRevisionJobs() {
  const [revisions, setRevisions] = useState<RevisionJob[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchRevisions() {
      setIsLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        setIsLoading(false)
        return
      }

      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          id,
          full_name,
          property_address_street,
          property_address_suburb,
          job_completions!inner (
            status,
            submitted_at
          )
        `)
        .eq('status', 'job_scheduled')
        .eq('assigned_to', user.id)
        .eq('job_completions.status', 'draft')
        .not('job_completions.submitted_at', 'is', null)

      if (error || cancelled) {
        if (error) console.error('[useRevisionJobs] Query error:', error)
        setIsLoading(false)
        return
      }

      const leadIds = (leads ?? []).map(l => l.id)

      let notesByLead: Record<string, { description: string | null; created_at: string }> = {}

      if (leadIds.length > 0) {
        const { data: activities } = await supabase
          .from('activities')
          .select('lead_id, description, created_at')
          .in('lead_id', leadIds)
          .eq('title', 'Job completion sent back to technician')
          .order('created_at', { ascending: false })

        if (!cancelled && activities) {
          for (const a of activities) {
            if (!notesByLead[a.lead_id]) {
              notesByLead[a.lead_id] = { description: a.description, created_at: a.created_at }
            }
          }
        }
      }

      if (cancelled) return

      const mapped: RevisionJob[] = (leads ?? []).map(lead => ({
        leadId: lead.id,
        customerName: lead.full_name || 'Unknown',
        address: lead.property_address_street || '',
        suburb: lead.property_address_suburb || '',
        sendBackNote: notesByLead[lead.id]?.description ?? null,
        sendBackDate: notesByLead[lead.id]?.created_at ?? null,
      }))

      setRevisions(mapped)
      setIsLoading(false)
    }

    fetchRevisions()
    return () => { cancelled = true }
  }, [])

  return { revisions, isLoading, count: revisions.length }
}
