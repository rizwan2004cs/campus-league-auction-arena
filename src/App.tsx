import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import { useAuth } from "@/lib/auth";

// Landing ships in the main chunk; every other screen loads on first visit.
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const AuctionRoom = lazy(() => import("@/pages/AuctionRoom"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PublicAuctionView = lazy(() => import("@/pages/PublicAuctionView"));
const AuctionSummary = lazy(() => import("@/pages/AuctionSummary"));

const queryClient = new QueryClient();

// Routes that carry their own header instead of the organiser navbar.
const STANDALONE = ["/", "/login", "/public", "/leaderboard"];

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-[100svh] place-items-center" aria-busy="true">
        <img src="/icons/logo.png" alt="Loading" className="h-12 w-auto animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh]">
      <ScrollToTop />
      {user && !STANDALONE.includes(pathname) && <Navbar />}
      <main>
        <Suspense fallback={<div className="min-h-[60svh]" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teams" element={<TeamManagement />} />
          <Route path="/auction" element={<AuctionRoom />} />
          <Route path="/summary" element={<AuctionSummary />} />
          <Route path="/settings" element={<Settings />} />

          {/* Public routes that don't require authentication */}
          <Route path="/public" element={<PublicAuctionView />} />
          {/* Standings live on the public page now; keep old links working. */}
          <Route path="/leaderboard" element={<Navigate to="/public" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
