import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ScheduleHeader, ScheduleCalendar, ScheduleDailyView, LeadsQueue, EventDetailsPanel, CancelledBookingsList } from '@/components/schedule';
import { useScheduleCalendar, getWeekStart, CalendarEvent, type EventTypeFilter } from '@/hooks/useScheduleCalendar';
import { useCancelledBookings } from '@/hooks/useCancelledBookings';
import { useTechnicians } from '@/hooks/useTechnicians';
import { CalendarDays, CalendarPlus, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Tailwind `lg` — the width at which the leads rail docks beside the calendar (see the
// <aside> below). Below it the rail lives in the bottom Sheet instead.
const RAIL_DOCKED_QUERY = '(min-width: 1024px)';

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminSchedule() {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link target — when /admin/schedule?lead={id} is opened from Lead Detail or
  // Lead Management, expand the matching card in LeadsQueue and pop the mobile sheet.
  // Held in state and removed from the URL: if the param stayed, every 60 s rail
  // refetch (and any refresh) would re-apply it and collapse whatever the admin had
  // opened. It is retired once LeadsQueue reports the id resolved, so reopening the
  // mobile sheet does not replay the deep link.
  const [deepLinkLeadId, setDeepLinkLeadId] = useState<string | null>(() => searchParams.get('lead'));
  const [isRailDocked, setIsRailDocked] = useState(
    () => window.matchMedia(RAIL_DOCKED_QUERY).matches,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Take the id out of the URL as soon as it arrives. Reading it here rather than only
  // in the initialiser also catches a second ?lead= navigation while the page is mounted.
  useEffect(() => {
    const leadParam = searchParams.get('lead');
    if (!leadParam) return;
    setDeepLinkLeadId(leadParam);
    const withoutLead = new URLSearchParams(searchParams);
    withoutLead.delete('lead');
    setSearchParams(withoutLead, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(RAIL_DOCKED_QUERY);
    const syncRailDocked = (event: MediaQueryListEvent) => setIsRailDocked(event.matches);
    mediaQuery.addEventListener('change', syncRailDocked);
    return () => mediaQuery.removeEventListener('change', syncRailDocked);
  }, []);

  // Below the dock breakpoint the queue lives in the bottom sheet, so a deep link has to
  // open it. The Sheet's content is portaled to <body>, so the `lg:hidden` wrapper around
  // its trigger cannot hide it — gate on the viewport instead of relying on CSS.
  useEffect(() => {
    if (deepLinkLeadId && !isRailDocked) setMobileQueueOpen(true);
  }, [deepLinkLeadId, isRailDocked]);

  // Once the window is wide enough for the docked rail, the sheet must never sit over it.
  useEffect(() => {
    if (isRailDocked) setMobileQueueOpen(false);
  }, [isRailDocked]);

  // Fetch technicians using the shared hook
  const { data: technicians = [], isLoading: techniciansLoading, error: techniciansError } = useTechnicians();

  // Log technician fetch results for debugging
  if (techniciansError) {
    console.error('[AdminSchedule] Technicians error:', techniciansError);
  }

  // Fetch calendar events
  const { events, isLoading, refetch } = useScheduleCalendar({
    weekStart,
    technicianFilter: selectedTechnician,
    eventTypeFilter,
  });

  // Fetch cancelled bookings
  const { events: cancelledEvents, isLoading: cancelledLoading } = useCancelledBookings();

  // Handle week change
  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStart(newWeekStart);
  };

  // Handle technician filter change
  const handleTechnicianChange = (technicianId: string | null) => {
    setSelectedTechnician(technicianId);
  };

  const handleDeepLinkSettled = useCallback(() => setDeepLinkLeadId(null), []);

  // The queue's search box is the sheet's first tabbable element, and Radix focuses that
  // on open — which raises the soft keyboard over the list every time. Park focus on the
  // sheet itself instead; it keeps the focus trap for keyboard users.
  const handleSheetOpenAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
    (event.currentTarget as HTMLElement | null)?.focus();
  }, []);

  // Handle mobile day navigation
  const handleDayChange = (newDate: Date) => {
    setSelectedDate(newDate);
    const newWeekStart = getWeekStart(newDate);
    if (newWeekStart.getTime() !== weekStart.getTime()) {
      setWeekStart(newWeekStart);
    }
  };

  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        backgroundColor: '#f6f7f8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content - Full height layout */}
      <main className="ml-0 lg:ml-[260px] h-screen flex flex-col">
        {/* Page Header - Fixed height */}
        <header
          className="bg-white flex-shrink-0 z-40"
          style={{ borderBottom: '1px solid #e5e5e5' }}
        >
          <div className="flex items-center px-4 md:px-6 py-3 justify-between">
            {/* Mobile menu button */}
            <button
              className="lg:hidden w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" style={{ color: '#1d1d1f' }} />
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div
                className="flex w-10 h-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: '#007AFF' }}
              >
                <CalendarDays className="h-5 w-5" />
              </div>
              <h2
                className="text-xl font-bold leading-tight tracking-tight"
                style={{ color: '#1d1d1f' }}
              >
                MRC Schedule
              </h2>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* User avatar placeholder */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0, 122, 255, 0.2)' }}
              >
                <span className="text-xs font-bold" style={{ color: '#007AFF' }}>
                  {(() => {
                    const name = profile?.full_name || user?.email || '';
                    const parts = name.split(' ').filter(Boolean);
                    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                    return name[0]?.toUpperCase() || '?';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Split Panel Layout - Takes remaining height */}
        <div className="flex flex-1 min-h-0">
          {/* Calendar Panel (Left 70%) - Scrollable */}
          <section
            className="w-full lg:w-[70%] flex flex-col bg-white min-h-0"
            style={{ borderRight: '1px solid #e5e5e5' }}
          >
            {/* Schedule Header with Navigation and Filters - Fixed */}
            <div className="flex-shrink-0">
              <ScheduleHeader
                weekStart={weekStart}
                onWeekChange={handleWeekChange}
                technicians={technicians}
                selectedTechnician={selectedTechnician}
                onTechnicianChange={handleTechnicianChange}
                showCancelled={showCancelled}
                onShowCancelledChange={setShowCancelled}
                selectedDate={selectedDate}
                onDayChange={handleDayChange}
              />

              {/* Event Type Filter Pills */}
              <div className="flex items-center gap-2 px-4 md:px-6 py-2 border-t border-gray-100 bg-white">
                <span className="text-xs font-medium text-[#86868b] mr-1">Show:</span>
                {(['all', 'inspection', 'job'] as EventTypeFilter[]).map((type) => {
                  const isActive = eventTypeFilter === type;
                  const label = type === 'all' ? 'All' : type === 'inspection' ? 'Inspections' : 'Jobs';
                  return (
                    <button
                      key={type}
                      onClick={() => setEventTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                      style={{ minHeight: '32px' }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Grid or Cancelled List - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {showCancelled ? (
                <CancelledBookingsList
                  events={cancelledEvents}
                  isLoading={cancelledLoading}
                  onEventClick={(event) => setSelectedEvent(event)}
                />
              ) : (
                <>
                  {/* Mobile: daily card list */}
                  <div className="lg:hidden">
                    <ScheduleDailyView
                      selectedDate={selectedDate}
                      events={events}
                      isLoading={isLoading}
                      onEventClick={(event) => setSelectedEvent(event)}
                    />
                  </div>
                  {/* Desktop: weekly time grid */}
                  <div className="hidden lg:block h-full">
                    <ScheduleCalendar
                      weekStart={weekStart}
                      events={events}
                      isLoading={isLoading}
                      onEventClick={(event) => setSelectedEvent(event)}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Leads Queue Panel (Right 30%) - Fixed position, internal scroll.
              Both instances stay mounted, so the deep link goes only to the visible one —
              otherwise the hidden copy would run the same lookup a second time. */}
          <aside className="hidden lg:flex lg:w-[30%] flex-col min-h-0">
            <LeadsQueue
              technicians={technicians}
              initialExpandedLeadId={isRailDocked ? deepLinkLeadId : null}
              onDeepLinkSettled={handleDeepLinkSettled}
            />
          </aside>
        </div>

        {/* Mobile: FAB to open Leads Queue Sheet */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Sheet open={mobileQueueOpen} onOpenChange={setMobileQueueOpen}>
            <SheetTrigger asChild>
              <button
                className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <CalendarPlus className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[85vh] p-0 rounded-t-2xl"
              onOpenAutoFocus={handleSheetOpenAutoFocus}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Leads to schedule</SheetTitle>
                <SheetDescription>Select a lead from the queue to book its inspection.</SheetDescription>
              </SheetHeader>
              <LeadsQueue
                technicians={technicians}
                initialExpandedLeadId={isRailDocked ? null : deepLinkLeadId}
                onDeepLinkSettled={handleDeepLinkSettled}
              />
            </SheetContent>
          </Sheet>
        </div>
      </main>

      {/* Event Details Panel */}
      <EventDetailsPanel
        event={selectedEvent}
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
