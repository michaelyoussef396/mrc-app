import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";
import { GlobalLoader, ProgressBar, PageTransition } from "@/components/loading";

import { useSessionRefresh } from "@/lib/hooks/useSessionRefresh";
import ErrorBoundary, { PageErrorBoundary } from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";

// Eagerly loaded pages (login flow - needed immediately)
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CheckEmail from "./pages/CheckEmail";
import NotFound from "./pages/NotFound";
// AdminComingSoon and TechnicianComingSoon removed - using real dashboards
import AdminDashboard from "./pages/AdminDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";


// Lazy loaded pages (code-split for smaller initial bundle)
const AdminSchedule = lazy(() => import("./pages/AdminSchedule"));
const AdminTechnicians = lazy(() => import("./pages/AdminTechnicians"));
const AdminTechnicianDetail = lazy(() => import("./pages/AdminTechnicianDetail"));

const LeadsManagement = lazy(() => import("./pages/LeadsManagement"));
const NewLeadView = lazy(() => import("./pages/NewLeadView"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const RequestInspection = lazy(() => import("./pages/RequestInspection"));
const InspectionSuccess = lazy(() => import("./pages/InspectionSuccess"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ViewReportPDF = lazy(() => import("./pages/ViewReportPDF"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const TechnicianJobs = lazy(() => import("./pages/TechnicianJobs"));
const TechnicianAlerts = lazy(() => import("./pages/TechnicianAlerts"));
const TechnicianInspectionForm = lazy(() => import("./pages/TechnicianInspectionForm"));
const TechnicianJobDetail = lazy(() => import("./pages/TechnicianJobDetail"));
const JobCompletionForm = lazy(() => import("./pages/JobCompletionForm"));
const InspectionAIReview = lazy(() => import("./pages/InspectionAIReview"));
// AdminInvoiceHelper kept on disk but route removed — payment tracking simplified to LeadDetail card
// ViewJobReportPDF deleted — unified into ViewReportPDF with reportType detection

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes — prevents refetch on every navigation
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: false,
    },
  },
});

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      <OfflineBanner />
      <ProgressBar />
      <PageTransition location={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes (no layout) */}
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/request-inspection" element={<RequestInspection />} />
            <Route path="/request-inspection/success" element={<InspectionSuccess />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Dashboard (standalone layout - no AppLayout) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Schedule (standalone layout - no AppLayout) */}
            <Route
              path="/admin/schedule"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminSchedule />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Technicians (standalone layout - no AppLayout) */}
            <Route
              path="/admin/technicians"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminTechnicians />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Technician Detail (standalone layout - no AppLayout) */}
            <Route
              path="/admin/technicians/:id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminTechnicianDetail />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Leads Management (standalone layout - no AppLayout) */}
            <Route
              path="/admin/leads"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <LeadsManagement />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin AI Review (standalone layout - no AppLayout) */}
            <Route
              path="/admin/inspection-ai-review/:leadId"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <PageErrorBoundary name="ai-review">
                        <InspectionAIReview />
                      </PageErrorBoundary>
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Reports (standalone layout - no AppLayout) */}
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <Reports />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Recent Activity (standalone layout - no AppLayout) */}
            <Route
              path="/admin/activity"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <Notifications />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Settings (standalone layout - no AppLayout) */}
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <Settings />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Help (standalone layout - no AppLayout) */}
            <Route
              path="/admin/help"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <HelpSupport />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Dashboard (standalone layout - no AppLayout) */}
            <Route
              path="/technician"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <TechnicianDashboard />
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Profile (standalone - uses shared Profile component) */}
            <Route
              path="/technician/profile"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <Profile />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Jobs (standalone - My Jobs page) */}
            <Route
              path="/technician/jobs"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <TechnicianJobs />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Alerts (standalone - Notifications page) */}
            <Route
              path="/technician/alerts"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <TechnicianAlerts />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Inspection Form (standalone - New inspection form) */}
            <Route
              path="/technician/inspection"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <PageErrorBoundary name="inspection-form">
                        <TechnicianInspectionForm />
                      </PageErrorBoundary>
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Inspection Edit — reuses TechnicianInspectionForm via adminMode flag */}
            <Route
              path="/admin/inspection/:leadId"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <PageErrorBoundary name="admin-inspection-form">
                        <TechnicianInspectionForm adminMode />
                      </PageErrorBoundary>
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Job Detail — reuses the shared LeadDetail page so
                technicians see the full lead view (contact, property, inspection
                data, cost estimate, AI summary, job schedule, activity log).
                LeadDetail renders role-aware UI to hide admin-only actions. */}
            <Route
              path="/technician/job/:id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <PageErrorBoundary name="technician-lead-detail">
                        <LeadDetail />
                      </PageErrorBoundary>
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Job Completion Form */}
            <Route
              path="/technician/job-completion/:leadId"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <PageErrorBoundary name="job-completion-form">
                        <JobCompletionForm />
                      </PageErrorBoundary>
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Settings (standalone - uses shared Settings component) */}
            <Route
              path="/technician/settings"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <Settings />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Technician Help (standalone - uses shared HelpSupport component) */}
            <Route
              path="/technician/help"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["technician"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <HelpSupport />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Profile (standalone) */}
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <Profile />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Standalone admin routes (previously inside AppLayout) */}
            <Route
              path="/lead/new/:id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <NewLeadView />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/leads/:id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <PageErrorBoundary name="lead-detail">
                        <LeadDetail />
                      </PageErrorBoundary>
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inspection/:inspectionId/report"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <ViewReportPDF />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Job Report Viewer */}
            <Route
              path="/admin/job-report/:leadId"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <ViewReportPDF />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/report/:id"
              element={
                <ProtectedRoute>
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<GlobalLoader />}>
                      <ViewReportPDF />
                    </Suspense>
                  </RoleProtectedRoute>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </>
  );
};

const App = () => {
  const [initialLoading, setInitialLoading] = useState(true);

  // Enable proactive session refresh to prevent timeouts
  useSessionRefresh();

  // One-time cleanup: remove any stale inline overflow styles on body
  useEffect(() => {
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    // Simulate initial app load
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <GlobalLoader loading={initialLoading} />
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
