import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { UploadProvider } from './context/UploadContext';
import CompanySelector from './components/CompanySelector';
import GlobalUploadProgress from './components/GlobalUploadProgress';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import UsersPage from './pages/UsersPage';
import UploadXML from './pages/UploadXML';
import Documents from './pages/Documents';
import ClassificacaoPage from './pages/ClassificacaoPage';
import ClassificacaoInteligente from './pages/ClassificacaoInteligente';
import ExportMenu from './pages/ExportMenu';
import Reports from './pages/Reports';
import AnaliseSaidas from './pages/AnaliseSaidas';
import AnalisePisCofins from './pages/AnalisePisCofins';
import PisCofins from './pages/PisCofins';
import ApuracaoMensal from './pages/ApuracaoMensal';
import ApuracaoICMS from './pages/ApuracaoICMS';
import ApuracaoISS from './pages/ApuracaoISS';
import ApuracaoIPI from './pages/ApuracaoIPI';
import RET from './pages/RET';
import AlertasCfop from './pages/AlertasCfop';
import AnaliseTributariaIA from './pages/AnaliseTributariaIA';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedCompanyId');
    localStorage.removeItem('selectedCompetencia');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-red-600 text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <AppProvider>
          <UploadProvider>
            <CompanySelector />
            <GlobalUploadProgress />
            <Routes>
              <Route 
                path="/login" 
                element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
              />
            <Route
              path="/"
              element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/companies"
              element={user ? <Companies user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/usuarios"
              element={user ? <UsersPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/upload"
              element={user ? <UploadXML user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/documents"
              element={user ? <Documents user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/classificacao-inteligente"
              element={user ? <ClassificacaoInteligente user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/classificacao"
              element={user ? <ClassificacaoPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            {/* Rotas antigas redirecionam */}
            <Route path="/validation" element={<Navigate to="/classificacao-inteligente" />} />
            <Route path="/reclassification" element={<Navigate to="/classificacao-inteligente" />} />
            <Route path="/alertas-cfop" element={<Navigate to="/classificacao-inteligente" />} />
            <Route
              path="/export"
              element={user ? <ExportMenu user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/reports"
              element={user ? <Reports user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/apuracao-mensal"
              element={user ? <ApuracaoMensal user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/apuracao-icms"
              element={user ? <ApuracaoICMS user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/apuracao-iss"
              element={user ? <ApuracaoISS user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/apuracao-ipi"
              element={user ? <ApuracaoIPI user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/ret"
              element={user ? <RET user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/analise-saidas"
              element={user ? <AnaliseSaidas user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/analise-pis-cofins"
              element={user ? <AnalisePisCofins user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/pis-cofins"
              element={user ? <PisCofins user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            <Route
              path="/analise-tributaria-ia"
              element={user ? <AnaliseTributariaIA user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
            />
            {/* Rotas antigas redirecionam */}
            <Route path="/analise-aliquotas-saida" element={<Navigate to="/analise-saidas" />} />
            <Route path="/divergencias-saida" element={<Navigate to="/analise-pis-cofins" />} />
            <Route path="/apuracao" element={<Navigate to="/apuracao-mensal" />} />
            <Route path="/apuracao-pis-cofins" element={<Navigate to="/apuracao-mensal" />} />
          </Routes>
          </UploadProvider>
        </AppProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
