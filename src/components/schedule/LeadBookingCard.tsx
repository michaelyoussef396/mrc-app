import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LeadToSchedule } from '@/hooks/useLeadsToSchedule';
import { bookInspection, TIME_SLOTS, formatTimeForDisplay } from '@/lib/bookingService';

// ============================================================================
// TYPES
// ============================================================================

interface Technician {
  id: string;
  name: string;
  color: string;
}

interface LeadBookingCardProps {
  lead: LeadToSchedule;
  technicians: Technician[];
  isExpanded: boolean;
  onToggle: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LeadBookingCard({
  lead,
  technicians,
  isExpanded,
  onToggle,
}: LeadBookingCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  const handleViewLead = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/leads/${lead.id}`);
  };

  const handleBookInspection = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selectedDate || !selectedTime || !selectedTechnician) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await bookInspection(
        {
          leadId: lead.id,
          customerName: lead.fullName,
          propertyAddress: lead.propertyAddress,
          inspectionDate: selectedDate,
          inspectionTime: selectedTime,
          technicianId: selectedTechnician,
          internalNotes: internalNotes || undefined,
        },
        queryClient
      );

      if (result.success) {
        toast.success('Inspection booked successfully!');
        // Reset form
        setSelectedDate('');
        setSelectedTime('');
        setSelectedTechnician('');
        setInternalNotes('');
      } else {
        toast.error(result.error || 'Failed to book inspection');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canBook = selectedDate && selectedTime && selectedTechnician && !isSubmitting;

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden transition-all"
      style={{
        border: isExpanded ? '2px solid #007AFF' : '1px solid #e5e5e5',
        boxShadow: isExpanded ? '0 4px 16px rgba(0, 122, 255, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Collapsed Header */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
          isExpanded ? 'bg-[#007AFF]/5' : 'hover:bg-gray-50'
        }`}
        style={{ borderBottom: isExpanded ? '1px solid #e5e5e5' : 'none' }}
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0 pr-2">
          {/* Client Name - Full name visible */}
          <h4
            className="text-sm font-bold"
            style={{ color: '#1d1d1f' }}
          >
            {lead.fullName}
          </h4>

          {/* Suburb + Property Type + Time Ago */}
          <p
            className="text-xs mt-1"
            style={{ color: '#617589' }}
          >
            {lead.suburb}
            {lead.propertyType && ` • ${lead.propertyType}`}
            {lead.timeAgo && (
              <span className="ml-1 opacity-75">• {lead.timeAgo}</span>
            )}
          </p>
        </div>

        {/* Expand/Collapse Icon */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
          style={{ backgroundColor: isExpanded ? '#007AFF' : '#f0f2f4' }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ color: isExpanded ? 'white' : '#617589' }}
          >
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="p-4 space-y-4"
          style={{ backgroundColor: '#fafafa' }}
        >
          {/* Notes from Enquiry - More prominent */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
              style={{ color: '#007AFF' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                notes
              </span>
              Notes from Enquiry
            </label>
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                minHeight: '60px',
              }}
            >
              {lead.issueDescription ? (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#1d1d1f' }}
                >
                  {lead.issueDescription}
                </p>
              ) : (
                <p
                  className="text-sm italic"
                  style={{ color: '#86868b' }}
                >
                  No notes provided
                </p>
              )}
            </div>
          </div>

          {/* Date Picker - Full width */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: '#617589' }}
            >
              Inspection Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all"
              style={{
                backgroundColor: 'white',
                border: selectedDate ? '2px solid #007AFF' : '1px solid #e5e5e5',
                color: '#1d1d1f',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Time Slot Dropdown - Full width with custom styling */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: '#617589' }}
            >
              Time Slot
            </label>
            <div className="relative">
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full h-12 px-4 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#007AFF] outline-none transition-all appearance-none cursor-pointer pr-10"
                style={{
                  backgroundColor: 'white',
                  border: selectedTime ? '2px solid #007AFF' : '1px solid #e5e5e5',
                  color: selectedTime ? '#1d1d1f' : '#86868b',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select time slot...</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <span
                className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#617589', fontSize: '20px' }}
              >
                schedule
              </span>
            </div>
          </div>

          {/* Technician Selector - Dropdown style */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: '#617589' }}
            >
              Assign Technician
            </label>
            <div className="grid grid-cols-2 gap-2">
              {technicians.map((tech) => {
                const isSelected = selectedTechnician === tech.id;
                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTechnician(tech.id);
                    }}
                    className="h-12 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: isSelected ? tech.color : 'white',
                      border: isSelected ? `2px solid ${tech.color}` : '1px solid #e5e5e5',
                      color: isSelected ? 'white' : '#617589',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : tech.color,
                        color: 'white',
                      }}
                    >
                      {tech.name[0]}
                    </span>
                    {tech.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: '#617589' }}
            >
              Internal Notes (Optional)
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add notes for the technician..."
              rows={2}
              className="w-full p-3 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#007AFF] outline-none transition-all placeholder:text-gray-400"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleViewLead}
              className="flex-1 h-11 flex items-center justify-center rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
                color: '#1d1d1f',
              }}
            >
              View Lead
            </button>
            <button
              onClick={handleBookInspection}
              disabled={!canBook}
              className={`flex-1 h-11 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                canBook
                  ? 'hover:brightness-110 shadow-md'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: '#007AFF',
                color: 'white',
                boxShadow: canBook ? '0 4px 12px rgba(0, 122, 255, 0.3)' : undefined,
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Booking...
                </>
              ) : (
                'Book Inspection'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadBookingCard;
