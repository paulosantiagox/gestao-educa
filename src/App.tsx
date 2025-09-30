import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { WhatsAppTemplatesProvider } from "@/contexts/WhatsAppTemplatesContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Sales from "./pages/Sales";
import Certifications from "./pages/Certifications";
import CertificationProcess from "./pages/CertificationProcess";
import PaymentMethods from "./pages/PaymentMethods";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import StudentStatusCheck from "./pages/StudentStatusCheck";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SettingsProvider>
        <WhatsAppTemplatesProvider>
          <AuthProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
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
                path="/consultar-aluno" 
                element={<StudentStatusCheck />} 
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full flex-col">
                        <div className="flex flex-1">
                          <AppSidebar />
                          <main className="flex-1 overflow-auto">
                            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                              <SidebarTrigger />
                              <h1 className="text-lg font-semibold">Sistema de Gestão Educacional</h1>
                            </header>
                            <div className="p-6">
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/students" element={<Students />} />
                                <Route path="/sales" element={<Sales />} />
                                <Route path="/certifications" element={<Certifications />} />
                                <Route path="/certification-process" element={<CertificationProcess />} />
                                <Route path="/payment-methods" element={<PaymentMethods />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/settings" element={<Settings />} />
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
        </AuthProvider>
      </WhatsAppTemplatesProvider>
    </SettingsProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
