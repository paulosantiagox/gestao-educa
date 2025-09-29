import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Sales from "./pages/Sales";
import Certifications from "./pages/Certifications";
import PaymentMethods from "./pages/PaymentMethods";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/auth" 
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              } 
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="min-h-screen flex w-full flex-col">
                      <Header />
                      <div className="flex flex-1">
                        <AppSidebar />
                        <main className="flex-1 overflow-auto">
                          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                            <SidebarTrigger />
                            <div className="flex-1" />
                          </header>
                          <div className="p-6">
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/students" element={<Students />} />
                              <Route path="/sales" element={<Sales />} />
                              <Route path="/certifications" element={<Certifications />} />
                              <Route path="/payment-methods" element={<PaymentMethods />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </div>
                        </main>
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
