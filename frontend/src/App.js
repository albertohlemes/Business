import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import UploadXML from './pages/UploadXML';
import Documents from './pages/Documents';
import ValidationPage from './pages/ValidationPage';
import ExportSPED from './pages/ExportSPED';
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
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-blue-600 text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
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
            path="/upload"
            element={user ? <UploadXML user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/documents"
            element={user ? <Documents user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/validation"
            element={user ? <ValidationPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/export"
            element={user ? <ExportSPED user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;