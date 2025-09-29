import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeWrapper } from "@/components/ThemeWrapper";
import Index from "./pages/Index";
import Compare from "./pages/Compare";
import Visualize from "./pages/Visualize";
import Database from "./pages/Database";
import Analytics from "./pages/Analytics";
import Transform from "./pages/Transform";
import CodeComparison from "./pages/CodeComparison";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeWrapper>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/visualize" element={<Visualize />} />
            <Route path="/database" element={<Database />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/transform" element={<Transform />} />
            <Route path="/code-comparison" element={<CodeComparison />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeWrapper>
  </QueryClientProvider>
);

export default App;
