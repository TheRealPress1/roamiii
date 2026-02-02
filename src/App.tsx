import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfileGate } from "@/components/ProfileGate";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CreateTrip from "./pages/CreateTrip";
import JoinTrip from "./pages/JoinTrip";
import InvitePage from "./pages/InvitePage";
import TripChat from "./pages/TripChat";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            {/* Invite routes - canonical /invite/:code with /join/:code as legacy route */}
            <Route path="/invite/:code" element={<InvitePage />} />
            <Route path="/join/:code" element={<InvitePage />} />
            {/* Profile page - protected but no ProfileGate (this IS the gate destination) */}
            <Route path="/app/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            {/* All other app routes - protected AND gated by profile completeness */}
            <Route path="/app" element={
              <ProtectedRoute>
                <ProfileGate>
                  <Dashboard />
                </ProfileGate>
              </ProtectedRoute>
            } />
            <Route path="/app/create" element={
              <ProtectedRoute>
                <ProfileGate>
                  <CreateTrip />
                </ProfileGate>
              </ProtectedRoute>
            } />
            <Route path="/app/join" element={
              <ProtectedRoute>
                <ProfileGate>
                  <JoinTrip />
                </ProfileGate>
              </ProtectedRoute>
            } />
            <Route path="/app/trip/:tripId" element={
              <ProtectedRoute>
                <ProfileGate>
                  <TripChat />
                </ProfileGate>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
