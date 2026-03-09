import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react"; // <-- Import added
import Navbar from "@/components/Navbar";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Roster from "@/pages/Roster";
import Fantasy from "@/pages/Fantasy";
import FunZone from "@/pages/FunZone";
import ChallengeUs from "@/pages/ChallengeUs";
import MatchHistory from "@/pages/MatchHistory";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<><Navbar /><Dashboard /></>} />
          <Route path="/roster" element={<><Navbar /><Roster /></>} />
          <Route path="/matches" element={<><Navbar /><MatchHistory /></>} />
          <Route path="/fantasy" element={<><Navbar /><Fantasy /></>} />
          
          <Route path="/fun-zone" element={<><Navbar /><FunZone /></>} />
          <Route path="/challenge-us" element={<><Navbar /><ChallengeUs /></>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<><Navbar /><NotFound /></>} />
        </Routes>
        <Analytics /> {/* <-- Component added here */}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;