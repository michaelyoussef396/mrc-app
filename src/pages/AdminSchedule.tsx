import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ScheduleHeader, ScheduleCalendar, LeadsQueue } from '@/components/schedule';
import { useScheduleCalendar, getWeekStart } from '@/hooks/useScheduleCalendar';
import { useTechnicians } from '@/hooks/useTechnicians';

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminSchedule() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);

  // Fetch technicians using the shared hook
  const { data: technicians = [], isLoading: techniciansLoading, error: techniciansError } = useTechnicians();

  // Log technician fetch results for debugging
  if (techniciansError) {
    console.error('[AdminSchedule] Technicians error:', techniciansError);
  }
  if (technicians.length > 0) {
    console.log('[AdminSchedule] Technicians loaded:', technicians.map(t => ({ id: t.id, name: t.name })));
  }

  // Fetch calendar events
  const { events, isLoading, refetch } = useScheduleCalendar({
    weekStart,
    technicianFilter: selectedTechnician,
  });

  // Handle week change
  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStart(newWeekStart);
  };

  // Handle technician filter change
  const handleTechnicianChange = (technicianId: string | null) => {
    setSelectedTechnician(technicianId);
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
          <div className="flex items-center px-6 py-3 justify-between">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ color: '#1d1d1f' }}>
                menu
              </span>
            </button>

            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div
                className="flex w-10 h-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: '#007AFF' }}
              >
                <span className="material-symbols-outlined">calendar_today</span>
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
                  AD
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
              />
            </div>

            {/* Calendar Grid - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ScheduleCalendar
                weekStart={weekStart}
                events={events}
                isLoading={isLoading}
              />
            </div>
          </section>

          {/* Leads Queue Panel (Right 30%) - Fixed position, internal scroll */}
          <aside className="hidden lg:flex lg:w-[30%] flex-col min-h-0">
            <LeadsQueue technicians={technicians} />
          </aside>
        </div>

        {/* Mobile: Bottom Sheet for Leads Queue */}
        <div className="lg:hidden">
          {/* Add a floating action button or bottom sheet trigger here if needed */}
        </div>
      </main>
    </div>
  );
}
