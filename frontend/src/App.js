import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EmpresaProvider } from "./contexts/EmpresaContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Colaboradores from "./pages/Colaboradores";
import Dissidio from "./pages/Dissidio";
import Admissoes from "./pages/Admissoes";
import Medias from "./pages/Medias";
import ValidacaoFolha from "./pages/ValidacaoFolha";
import InformesRendimento from "./pages/InformesRendimento";
import Layout from "./components/Layout";
import "@/App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <EmpresaProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="colaboradores" element={<Colaboradores />} />
              <Route path="dissidio" element={<Dissidio />} />
              <Route path="admissoes" element={<Admissoes />} />
              <Route path="medias" element={<Medias />} />
              <Route path="validacao" element={<ValidacaoFolha />} />
              <Route path="informes" element={<InformesRendimento />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;
