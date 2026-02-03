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
      className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all"
      style={{
        border: isExpanded ? '1px solid #e5e5e5' : '1px solid transparent',
        boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Collapsed Header */}
      <div
        className={`p-5 flex items-center justify-between cursor-pointer transition-all ${
          isExpanded ? '' : 'hover:bg-gray-50'
        }`}
        style={{ borderBottom: isExpanded ? '1px solid #e5e5e5' : 'none' }}
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          {/* Client Name */}
          <h4
            className="text-base font-bold truncate"
            style={{ color: '#1d1d1f' }}
          >
            {lead.fullName}
          </h4>

          {/* Suburb + Property Type + Time Ago */}
          <p
            className="text-sm mt-0.5"
            style={{ color: '#617589' }}
          >
            {lead.suburb}
            {lead.propertyType && ` • ${lead.propertyType}`}
            {lead.timeAgo && (
              <span className="ml-2 opacity-75">• {lead.timeAgo}</span>
            )}
          </p>
        </div>

        {/* Expand/Collapse Icon */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ml-3"
          style={{ backgroundColor: '#f0f2f4' }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ color: '#617589' }}
          >
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="p-5 space-y-5"
          style={{ backgroundColor: 'rgba(246, 247, 248, 0.5)' }}
        >
          {/* Notes from Enquiry */}
          <div className="space-y-2">
            <p
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: '#617589' }}
            >
              Notes from Enquiry
            </p>
            <div
              className="p-3 rounded-xl shadow-sm"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
              }}
            >
              {lead.issueDescription ? (
                <p
                  className="text-sm italic leading-relaxed"
                  style={{ color: '#1d1d1f' }}
                >
                  "{lead.issueDescription}"
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

          {/* Date and Time Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: '#617589' }}
              >
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={today}
                className="w-full p-3 rounded-xl text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  color: '#1d1d1f',
                }}
              />
            </div>

            {/* Time Slot Dropdown */}
            <div className="space-y-2">
              <label
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: '#617589' }}
              >
                Time Slot
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full p-3 rounded-xl text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all appearance-none cursor-pointer"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e5e5',
                  color: selectedTime ? '#1d1d1f' : '#86868b',
                }}
              >
                <option value="">Select time...</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Technician Toggle */}
          <div className="space-y-2">
            <label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: '#617589' }}
            >
              Technician
            </label>
            <div className="flex gap-3">
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
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${
                      isSelected
                        ? 'ring-2'
                        : 'hover:bg-gray-50'
                    }`}
                    style={{
                      backgroundColor: isSelected ? `${tech.color}15` : 'white',
                      border: isSelected ? `1px solid ${tech.color}` : '1px solid #e5e5e5',
                      color: isSelected ? tech.color : '#617589',
                      ringColor: isSelected ? `${tech.color}30` : undefined,
                    }}
                  >
                    {tech.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <label
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: '#617589' }}
            >
              Internal Notes (Optional)
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add notes for the technician..."
              rows={2}
              className="w-full p-3 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all placeholder:text-gray-400"
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e5e5',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleViewLead}
              className="flex-1 h-[44px] flex items-center justify-center rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
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
              className={`flex-1 h-[44px] flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                canBook
                  ? 'hover:brightness-110 shadow-md'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: '#007AFF',
                color: 'white',
                boxShadow: canBook ? '0 4px 12px rgba(0, 122, 255, 0.25)' : undefined,
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
