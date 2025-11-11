import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { GlobalLoader, ProgressBar, PageTransition } from "@/components/loading";
import { SessionMonitor } from "@/components/debug/SessionMonitor";
import { useSessionRefresh } from "@/lib/hooks/useSessionRefresh";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CheckEmail from "./pages/CheckEmail";
import ResetPassword from "./pages/ResetPassword";
import PasswordChanged from "./pages/PasswordChanged";
import Dashboard from "./pages/Dashboard";
import NewLead from "./pages/NewLead";
import InspectionSelectLead from "./pages/InspectionSelectLead";
import { SelectLead } from "./pages/SelectLead";
import ClientDetail from "./pages/ClientDetail";
import LeadsManagement from "./pages/LeadsManagement";
import NewLeadView from "./pages/NewLeadView";
import Profile from "./pages/Profile";
import ManageUsers from "./pages/ManageUsers";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import LeadDetail from "./pages/LeadDetail";
import Calendar from "./pages/Calendar";
import InspectionForm from "./pages/InspectionForm";
import { ReportsPage } from "./pages/ReportsPage";
import CustomerBooking from "./pages/CustomerBooking";
import RequestInspection from "./pages/RequestInspection";
import InspectionSuccess from "./pages/InspectionSuccess";
import AllNotifications from "./pages/AllNotifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  
  return (
    <>
      <ProgressBar />
      <PageTransition location={location.pathname}>
        <Routes>
          {/* Public routes (no layout) */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/check-email" element={<CheckEmail />} />
          {/* <Route path="/reset-password" element={<ResetPassword />} /> */}
          {/* <Route path="/password-changed" element={<PasswordChanged />} /> */}
          <Route path="/request-inspection" element={<RequestInspection />} />
          <Route path="/request-inspection/success" element={<InspectionSuccess />} />
          
          {/* Protected routes (with AppLayout) */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notifications" element={<AllNotifications />} />
            <Route path="/lead/new" element={<NewLead />} />
            <Route path="/inspection/select-lead" element={<SelectLead />} />
            <Route path="/client/:id" element={<ClientDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/manage-users" element={<ManageUsers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/leads" element={<LeadsManagement />} />
            <Route path="/lead/new/:id" element={<NewLeadView />} />
            <Route path="/leads-pipeline" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/inspection" element={<InspectionForm />} />
            <Route path="/inspection/new" element={<InspectionForm />} />
            <Route path="/inspection/:id" element={<InspectionForm />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </>
  );
};

const App = () => {
  const [initialLoading, setInitialLoading] = useState(true);

  // Enable proactive session refresh to prevent timeouts
  useSessionRefresh();

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
        <BrowserRouter>
          <GlobalLoader loading={initialLoading} />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          {/* Session Monitor - only visible in development */}
          <SessionMonitor />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
