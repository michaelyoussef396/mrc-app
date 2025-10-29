import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import CheckEmail from "./pages/CheckEmail";
import ResetPassword from "./pages/ResetPassword";
import PasswordChanged from "./pages/PasswordChanged";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ManageUsers from "./pages/ManageUsers";
import Settings from "./pages/Settings";
import Leads from "./pages/Leads";
import Calendar from "./pages/Calendar";
import InspectionForm from "./pages/InspectionForm";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import ClientBooking from "./pages/ClientBooking";
import RequestInspection from "./pages/RequestInspection";
import InspectionSuccess from "./pages/InspectionSuccess";
import NotFound from "./pages/NotFound";
import ServerError from "./pages/ServerError";
import Unauthorized from "./pages/Unauthorized";
import SessionExpired from "./pages/SessionExpired";
import Maintenance from "./pages/Maintenance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/password-changed" element={<PasswordChanged />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-users"
              element={
                <ProtectedRoute>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <Leads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspection/new"
              element={
                <ProtectedRoute>
                  <InspectionForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspection/:id"
              element={
                <ProtectedRoute>
                  <InspectionForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="/book/:token" element={<ClientBooking />} />
            <Route path="/booking/:inspectionId/:token" element={<ClientBooking />} />
            <Route path="/request-inspection" element={<RequestInspection />} />
            <Route path="/request-inspection/success" element={<InspectionSuccess />} />
            <Route path="/contact" element={<RequestInspection />} />
            <Route path="/get-quote" element={<RequestInspection />} />
            <Route path="/500" element={<ServerError />} />
            <Route path="/error" element={<ServerError />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/403" element={<Unauthorized />} />
            <Route path="/session-expired" element={<SessionExpired />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
