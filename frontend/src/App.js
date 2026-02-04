import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Minutas from './pages/Minutas';
import Certificados from './pages/Certificados';
import Licencas from './pages/Licencas';
import './App.css';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090B]">
                <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090B]">
                <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/minutas" 
                element={
                    <ProtectedRoute>
                        <Minutas />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/certificados" 
                element={
                    <ProtectedRoute>
                        <Certificados />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/licencas" 
                element={
                    <ProtectedRoute>
                        <Licencas />
                    </ProtectedRoute>
                } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                <Toaster 
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#18181B',
                            border: '1px solid #27272A',
                            color: '#FAFAFA',
                        },
                    }}
                />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
