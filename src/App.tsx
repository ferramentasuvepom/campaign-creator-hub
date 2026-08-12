import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TemplatesPage from "./pages/TemplatesPage";
import UsersPage from "./pages/UsersPage";
import ProfilesPage from "./pages/ProfilesPage";
import BusinessManagersPage from "./pages/BusinessManagersPage";
import AdAccountsPage from "./pages/AdAccountsPage";
import CampaignsPage from "./pages/CampaignsPage";
import CreateCampaignPage from "./pages/CreateCampaignPage";
import EditCampaignPage from "./pages/EditCampaignPage";
import AdSetsPage from "./pages/AdSetsPage";
import AdsPage from "./pages/AdsPage";
import PixelsPage from "./pages/PixelsPage";
import ExecutionsPage from "./pages/ExecutionsPage";
import BulkCreationPage from "./pages/BulkCreationPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// A trava real esta na RLS do banco; isto so evita mostrar a tela a quem
// nao pode usa-la (e a consulta voltaria vazia de qualquer forma).
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/templates" element={<TemplatesPage />} />

                      <Route path="/business-managers" element={<BusinessManagersPage />} />
                      <Route path="/ad-accounts" element={<AdAccountsPage />} />
                      <Route path="/campaigns" element={<CampaignsPage />} />
                      <Route path="/campaigns/create" element={<CreateCampaignPage />} />
                      <Route path="/campaigns/:id/edit" element={<EditCampaignPage />} />
                      <Route path="/ad-sets" element={<AdSetsPage />} />
                      <Route path="/ads" element={<AdsPage />} />
                      <Route path="/executions" element={<ExecutionsPage />} />
                      <Route path="/bulk" element={<BulkCreationPage />} />
                      <Route
                        path="/users"
                        element={
                          <AdminRoute>
                            <UsersPage />
                          </AdminRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MainLayout>
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
