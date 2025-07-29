import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationTriggers } from "@/hooks/useNotificationTriggers";
import { firebaseMessagingService } from "@/services/firebaseMessaging";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import StaffManagement from "./pages/StaffManagement";
import InspectionReview from "./pages/InspectionReview";
import VehicleProfile from "./pages/VehicleProfile";
import Inspection from "./pages/Inspection";
import UserNegotiation from "./pages/UserNegotiation";
import AdminNegotiation from "./pages/AdminNegotiation";
import NotFound from "./pages/NotFound";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import React from "react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'staff' }) => {
  const { user, userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = userRole === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

const RoleBasedHome = () => {
  const { userRole, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (userRole === 'staff') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/auth" replace />;
};

const NotificationManager = () => {
  // Enable notifications for all authenticated users
  useNotifications({
    enableBrowserNotifications: true,
    enableToastNotifications: true
  });
  
  // Set up notification triggers for key events
  useNotificationTriggers();
  
  // Initialize Firebase messaging
  React.useEffect(() => {
    firebaseMessagingService.initialize();
  }, []);
  
  return null;
};

const AppRoutes = () => {

  return (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<RoleBasedHome />} />
    <Route path="/admin" element={
      <ProtectedRoute requiredRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    } />
    <Route path="/dashboard" element={
      <ProtectedRoute requiredRole="staff">
        <Dashboard />
      </ProtectedRoute>
    } />
    <Route path="/admin/staff" element={
      <ProtectedRoute requiredRole="admin">
        <StaffManagement />
      </ProtectedRoute>
    } />
    <Route path="/admin/inspection/:jobId" element={
      <ProtectedRoute requiredRole="admin">
        <InspectionReview />
      </ProtectedRoute>
    } />
    <Route path="/admin/vehicle/:vehicleId" element={
      <ProtectedRoute requiredRole="admin">
        <VehicleProfile />
      </ProtectedRoute>
    } />
    <Route path="/inspection/:jobId" element={
      <ProtectedRoute requiredRole="staff">
        <Inspection />
      </ProtectedRoute>
    } />
    <Route path="/negotiation/:jobId" element={
      <ProtectedRoute requiredRole="staff">
        <UserNegotiation />
      </ProtectedRoute>
    } />
    <Route path="/admin/negotiation/:jobId" element={
      <ProtectedRoute requiredRole="admin">
        <AdminNegotiation />
      </ProtectedRoute>
    } />
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route path="*" element={<NotFound />} />
  </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <NotificationManager />
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
