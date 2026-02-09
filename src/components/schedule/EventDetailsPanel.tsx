import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/hooks/useScheduleCalendar';
import { formatTimeForDisplay } from '@/lib/bookingService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { X } from 'lucide-react';

interface EventDetailsPanelProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
}

export function EventDetailsPanel({ event, open, onClose }: EventDetailsPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!event) return null;

  const startTime = event.startDatetime.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTime = event.endDatetime.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = event.startDatetime.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const durationMs = event.endDatetime.getTime() - event.startDatetime.getTime();
  const durationHours = Math.max(durationMs / (1000 * 60 * 60), 0);
  const durationLabel = durationHours === 1 ? '1 hour' : `${durationHours}h`;

  const handleCancelBooking = async () => {
    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('calendar_bookings')
        .update({ status: 'cancelled' })
        .eq('id', event.id);

      if (error) throw error;

      // Update lead status back to new_lead
      if (event.leadId) {
        await supabase
          .from('leads')
          .update({ status: 'new_lead' })
          .eq('id', event.leadId);

        await supabase.from('activities').insert({
          lead_id: event.leadId,
          activity_type: 'booking_cancelled',
          title: 'Booking cancelled',
          description: `Inspection on ${dateStr} at ${startTime} was cancelled`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['schedule-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['leads-to-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Booking cancelled');
      onClose();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      toast.error('Failed to cancel booking');
    }
  };

  const handleStartInspection = () => {
    if (event.leadId) {
      navigate(`/inspection?leadId=${event.leadId}`);
      onClose();
    }
  };

  const handleViewLead = () => {
    if (event.leadId) {
      navigate(`/client/${event.leadId}`);
      onClose();
    }
  };

  const isInspection = event.eventType === 'inspection';
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Scheduled' },
    in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'In Progress' },
    completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },
  };
  const statusStyle = statusColors[event.status] || statusColors.scheduled;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold text-slate-900">
              Booking Details
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Type + Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${isInspection ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
              {isInspection ? 'Inspection' : 'Job'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>

          {/* Client */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <p className="text-base font-bold text-slate-900">{event.clientName}</p>
          </div>

          {/* Date & Time */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date & Time</p>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-slate-400">calendar_today</span>
              <p className="text-sm font-medium text-slate-900">{dateStr}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-slate-400">schedule</span>
              <p className="text-sm font-medium text-slate-900">
                {startTime} - {endTime} ({durationLabel})
              </p>
            </div>
          </div>

          {/* Location */}
          {(event.address || event.suburb) && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-lg text-slate-400 mt-0.5">location_on</span>
                <p className="text-sm text-slate-900">
                  {event.address || `${event.suburb} ${event.postcode}`}
                </p>
              </div>
            </div>
          )}

          {/* Technician */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Technician</p>
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: event.technicianColor }}
              >
                {event.technicianInitial}
              </span>
              <p className="text-sm font-medium text-slate-900">{event.technicianName}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {event.status !== 'cancelled' && event.status !== 'completed' && (
              <>
                <button
                  onClick={handleStartInspection}
                  className="w-full h-11 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">play_arrow</span>
                  Start Inspection
                </button>
                <button
                  onClick={handleViewLead}
                  className="w-full h-11 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">visibility</span>
                  View Lead
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="w-full h-11 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">cancel</span>
                  Cancel Booking
                </button>
              </>
            )}
            {(event.status === 'cancelled' || event.status === 'completed') && (
              <button
                onClick={handleViewLead}
                className="w-full h-11 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">visibility</span>
                View Lead
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default EventDetailsPanel;
