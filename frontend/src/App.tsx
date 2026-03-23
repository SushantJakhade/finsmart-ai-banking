import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import FraudDetection from "@/pages/FraudDetection";
import FraudDashboard from "@/pages/FraudDashboard";
import SentimentCRM from "@/pages/SentimentCRM";
import LoanPrediction from "@/pages/LoanPrediction";
import ModelComparison from "@/pages/ModelComparison";
import Chatbot from "@/pages/Chatbot";
import RegulationMonitor from "@/pages/RegulationMonitor";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/fraud-detection" element={<FraudDetection />} />
            <Route path="/fraud-dashboard" element={<FraudDashboard />} />
            <Route path="/sentiment-crm/*" element={<SentimentCRM />} />
            <Route path="/loan-prediction" element={<LoanPrediction />} />
            <Route path="/model-comparison" element={<ModelComparison />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/regulation-monitor" element={<RegulationMonitor />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
