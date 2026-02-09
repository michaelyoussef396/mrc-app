import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TechnicianBottomNav } from '@/components/technician';

// ============================================================================
// TYPES
// ============================================================================

interface LeadData {
    id: string;
    lead_number: string | null;
    full_name: string;
    phone: string;
    email: string;
    property_address_street: string;
    property_address_suburb: string;
    property_address_state: string;
    property_address_postcode: string;
    lead_source: string | null;
    issue_description: string | null;
    notes: string | null;
    urgency: string | null;
    property_type: string | null;
    access_instructions: string | null;
    status: string;
    created_at: string;
    inspection_scheduled_date: string | null;
}

interface BookingData {
    id: string;
    start_datetime: string;
    end_datetime: string;
    description: string | null;
    inspection_id: string | null;
}

interface InspectionData {
    id: string;
    pdf_url: string | null;
    report_generated: boolean | null;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DetailSection({ title, children, icon }: { title: string; children: React.ReactNode; icon: string }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#86868b] text-xl">{icon}</span>
                <h3 className="text-xs font-bold text-[#86868b] uppercase tracking-wider">{title}</h3>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function InfoRow({ label, value, isLink, href }: { label: string; value: string | null; isLink?: boolean; href?: string }) {
    if (!value) return null;

    return (
        <div className="mb-3 last:mb-0">
            <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wide mb-0.5">{label}</p>
            {isLink ? (
                <a href={href} className="text-sm font-semibold text-[#007AFF] hover:underline transition-all">
                    {value}
                </a>
            ) : (
                <p className="text-sm font-medium text-[#1d1d1f] leading-relaxed">{value}</p>
            )}
        </div>
    );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TechnicianJobDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [lead, setLead] = useState<LeadData | null>(null);
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [inspection, setInspection] = useState<InspectionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchJobData() {
            if (!id) return;

            try {
                setIsLoading(true);

                // Fetch Lead
                const { data: leadData, error: leadError } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (leadError) throw leadError;
                setLead(leadData);

                // Fetch Booking
                const { data: bookingData, error: bookingError } = await supabase
                    .from('calendar_bookings')
                    .select('id, start_datetime, end_datetime, description, inspection_id')
                    .eq('lead_id', id)
                    .order('start_datetime', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!bookingError) setBooking(bookingData);

                // Fetch Inspection (to determine Start vs View Report)
                const { data: inspectionData } = await supabase
                    .from('inspections')
                    .select('id, pdf_url, report_generated')
                    .eq('lead_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (inspectionData) setInspection(inspectionData);

            } catch (err: any) {
                console.error('Error fetching job details:', err);
                toast({
                    title: 'Error',
                    description: 'Failed to load job details. Please try again.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchJobData();
    }, [id, toast]);

    const handleStartInspection = () => {
        navigate(`/technician/inspection?leadId=${id}`);
    };

    const handleCall = () => {
        if (lead?.phone) window.location.href = `tel:${lead.phone.replace(/\s/g, '')}`;
    };

    const handleDirections = () => {
        if (lead) {
            const address = `${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`;
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f7f8]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-[#007AFF] border-t-transparent animate-spin" />
                    <p className="text-sm font-medium text-[#86868b]">Loading job info...</p>
                </div>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f5f7f8] p-6 text-center">
                <div>
                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
                    <h2 className="text-xl font-bold text-[#1d1d1f] mb-2">Job Not Found</h2>
                    <p className="text-[#86868b] mb-6">This lead may have been deleted or moved.</p>
                    <button
                        onClick={() => navigate('/technician')}
                        className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-bold"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const formatDateTime = (dtStr: string) => {
        return new Date(dtStr).toLocaleString('en-AU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Australia/Melbourne'
        });
    };

    return (
        <div className="min-h-screen bg-[#f5f7f8] pb-40">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-12 h-12 flex items-center justify-center text-[#007AFF] hover:bg-gray-100 rounded-lg transition-all"
                        style={{ minWidth: '48px', minHeight: '48px' }}
                    >
                        <span className="material-symbols-outlined text-3xl">chevron_left</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-[#1d1d1f] leading-tight">Job Detail</h1>
                        <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest">
                            ID: {lead.lead_number || lead.id.substring(0, 8)}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 space-y-4">

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleCall}
                        className="flex flex-col items-center justify-center gap-1 h-20 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-all text-[#007AFF]"
                    >
                        <span className="material-symbols-outlined text-2xl">call</span>
                        <span className="text-xs font-bold">Call</span>
                    </button>
                    <button
                        onClick={handleDirections}
                        className="flex flex-col items-center justify-center gap-1 h-20 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-all text-[#007AFF]"
                    >
                        <span className="material-symbols-outlined text-2xl">directions</span>
                        <span className="text-xs font-bold">Directions</span>
                    </button>
                </div>

                {/* Lead Status Card */}
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wide mb-1">Status</p>
                        <span className="px-2.5 py-1 bg-blue-50 text-[#007AFF] text-[10px] font-bold rounded-full uppercase tracking-wider">
                            {lead.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wide mb-1">Created</p>
                        <p className="text-xs font-semibold text-[#1d1d1f]">
                            {new Date(lead.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Customer Info */}
                <DetailSection title="Customer Information" icon="person">
                    <InfoRow label="Full Name" value={lead.full_name} />
                    <InfoRow label="Phone" value={lead.phone} isLink href={`tel:${lead.phone}`} />
                    <InfoRow label="Email" value={lead.email} isLink href={`mailto:${lead.email}`} />
                    <InfoRow label="Source" value={lead.lead_source || 'Website'} />
                </DetailSection>

                {/* Property & Access */}
                <DetailSection title="Property & Access" icon="location_on">
                    <InfoRow
                        label="Address"
                        value={`${lead.property_address_street}, ${lead.property_address_suburb} ${lead.property_address_state} ${lead.property_address_postcode}`}
                        isLink
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lead.property_address_street}, ${lead.property_address_suburb}`)}`}
                    />
                    <InfoRow label="Urgency" value={lead.urgency ? lead.urgency.toUpperCase() : 'MEDIUM'} />
                    <InfoRow label="Property Type" value={lead.property_type ? lead.property_type.toUpperCase() : 'HOUSE'} />

                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wide mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">key</span>
                            Access Instructions
                        </p>
                        <p className="text-sm text-[#1d1d1f] font-medium italic">
                            {lead.access_instructions || 'No specific instructions provided.'}
                        </p>
                    </div>
                </DetailSection>

                {/* Inquiry Notes */}
                <DetailSection title="Inquiry Notes" icon="description">
                    <p className="text-sm text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
                        {lead.issue_description || 'No inquiry description found.'}
                    </p>
                </DetailSection>

                {/* Internal Office Notes */}
                <DetailSection title="Internal Office Notes" icon="assignment_late">
                    <p className="text-sm text-[#86868b] leading-relaxed italic whitespace-pre-wrap">
                        {lead.notes || 'No internal notes available.'}
                    </p>
                </DetailSection>

                {/* Scheduling Info */}
                {booking && (
                    <DetailSection title="Scheduling Info" icon="schedule">
                        <InfoRow label="Appointment Time" value={formatDateTime(booking.start_datetime)} />
                        <InfoRow label="Estimated Duration" value="1.5 Hours" />
                        <div className="mt-2 text-xs text-[#86868b]">
                            <p>Booked on: {new Date(booking.start_datetime).toLocaleDateString()}</p>
                        </div>
                    </DetailSection>
                )}

            </main>

            {/* Sticky Footer Action */}
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 z-30 pb-20">
                <div className="max-w-md mx-auto">
                    {inspection?.pdf_url ? (
                        <button
                            onClick={() => navigate(`/inspection/${inspection.id}/report`)}
                            className="w-full h-14 bg-[#34C759] text-white text-lg font-bold rounded-xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">description</span>
                            View Report
                        </button>
                    ) : inspection ? (
                        <button
                            onClick={handleStartInspection}
                            className="w-full h-14 bg-[#FF9500] text-white text-lg font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">play_arrow</span>
                            Continue Inspection
                        </button>
                    ) : (
                        <button
                            onClick={handleStartInspection}
                            className="w-full h-14 bg-[#007AFF] text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">assignment</span>
                            Start Inspection
                        </button>
                    )}
                </div>
            </footer>

            {/* Bottom Nav Spacer */}
            <TechnicianBottomNav />
        </div>
    );
}
