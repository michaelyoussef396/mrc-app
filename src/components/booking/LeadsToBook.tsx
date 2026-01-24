import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Loader2,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BookInspectionModal } from '@/components/leads/BookInspectionModal'

interface LeadsToBookProps {
  selectedDate: Date
  existingAppointments: Array<{
    suburb: string
    address: string
    time: string
  }>
  className?: string
}

interface UnscheduledLead {
  id: string
  lead_number: string
  full_name: string
  phone: string
  property_address_street: string
  property_address_suburb: string
  property_address_state: string
  property_address_postcode: string
  status: string
  created_at: string
}

// Proximity scoring: closer suburbs get higher scores
// Simple heuristic - if same suburb as an appointment, score high
function calculateProximityScore(
  leadSuburb: string,
  existingSuburbs: string[]
): { score: number; nearestSuburb: string | null } {
  if (existingSuburbs.length === 0) {
    return { score: 0, nearestSuburb: null }
  }

  const leadSuburbLower = leadSuburb.toLowerCase().trim()

  for (const suburb of existingSuburbs) {
    const suburbLower = suburb.toLowerCase().trim()
    // Exact match
    if (leadSuburbLower === suburbLower) {
      return { score: 100, nearestSuburb: suburb }
    }
    // Partial match (e.g., "North Melbourne" contains "Melbourne")
    if (leadSuburbLower.includes(suburbLower) || suburbLower.includes(leadSuburbLower)) {
      return { score: 75, nearestSuburb: suburb }
    }
  }

  // No match found - could use distance API for real distance but keeping it simple
  return { score: 0, nearestSuburb: null }
}

export function LeadsToBook({
  selectedDate,
  existingAppointments,
  className
}: LeadsToBookProps) {
  const navigate = useNavigate()
  const [selectedLead, setSelectedLead] = useState<UnscheduledLead | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  // Fetch unscheduled leads (new or waiting for inspection)
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['unscheduled-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          lead_number,
          full_name,
          phone,
          property_address_street,
          property_address_suburb,
          property_address_state,
          property_address_postcode,
          status,
          created_at
        `)
        .eq('status', 'new_lead')
        .is('inspection_scheduled_date', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as UnscheduledLead[]
    },
    refetchInterval: 60000, // Refetch every minute
  })

  // Extract suburbs from existing appointments
  const existingSuburbs = useMemo(() => {
    return existingAppointments.map(apt => apt.suburb).filter(Boolean)
  }, [existingAppointments])

  // Sort leads by proximity to existing appointments
  const sortedLeads = useMemo(() => {
    return [...leads]
      .map(lead => ({
        ...lead,
        ...calculateProximityScore(lead.property_address_suburb || '', existingSuburbs)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Show top 5
  }, [leads, existingSuburbs])

  const handleSchedule = (lead: UnscheduledLead) => {
    setSelectedLead(lead)
    setBookingModalOpen(true)
  }

  const handleViewLead = (leadId: string) => {
    navigate(`/leads/${leadId}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading leads...</span>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load leads</span>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn('p-4', className)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Leads to Book
          </h3>
          {leads.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('/leads?status=new_lead&unscheduled=true')}
            >
              View All ({leads.length})
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        {sortedLeads.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">All leads scheduled!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLeads.map(lead => (
              <div
                key={lead.id}
                className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => handleViewLead(lead.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {lead.full_name}
                      </span>
                      {lead.score >= 75 && (
                        <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
                          Nearby
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {lead.property_address_suburb || 'Unknown location'}
                      </span>
                    </div>

                    {lead.nearestSuburb && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Clock className="h-3 w-3" />
                        <span>Near {lead.nearestSuburb}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSchedule(lead)
                    }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {leads.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} awaiting inspection
          </div>
        )}
      </Card>

      {/* Booking Modal */}
      {selectedLead && (
        <BookInspectionModal
          open={bookingModalOpen}
          onOpenChange={(open) => {
            setBookingModalOpen(open)
            if (!open) setSelectedLead(null)
          }}
          leadId={selectedLead.id}
          leadNumber={selectedLead.lead_number || ''}
          customerName={selectedLead.full_name || 'Unknown'}
          propertyAddress={`${selectedLead.property_address_street || ''}, ${selectedLead.property_address_suburb || ''} ${selectedLead.property_address_state || ''} ${selectedLead.property_address_postcode || ''}`}
          propertySuburb={selectedLead.property_address_suburb || ''}
        />
      )}
    </>
  )
}

export default LeadsToBook
