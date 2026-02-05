import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Home, FileText, Upload, Download, LogOut, Menu, X, BarChart3, Brain, ChevronDown, TrendingUp, ArrowUpCircle, Calculator, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const Layout = ({ user, onLogout, children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { selectedCompany, selectedCompetencia, openSelector } = useAppContext();

  // Menu organizado em ordem lógica do fluxo de trabalho (sem Empresas - agora está no header)
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, testId: 'nav-dashboard' },
    { name: 'Upload XML', href: '/upload', icon: Upload, testId: 'nav-upload' },
    { name: 'Documentos', href: '/documents', icon: FileText, testId: 'nav-documents' },
    { name: 'Alertas CFOP', href: '/alertas-cfop', icon: AlertTriangle, testId: 'nav-alertas-cfop' },
    { name: 'Validação & IA', href: '/classificacao', icon: Brain, testId: 'nav-classificacao' },
    { name: 'Auditoria PIS/COFINS', href: '/analise-pis-cofins', icon: DollarSign, testId: 'nav-pis-cofins' },
    { name: 'Apuração Mensal', href: '/apuracao-mensal', icon: Calculator, testId: 'nav-apuracao-mensal' },
    { name: 'Relatórios', href: '/reports', icon: BarChart3, testId: 'nav-reports' },
    { name: 'Exportação', href: '/export', icon: Download, testId: 'nav-export' },
  ];

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    // Verificar correspondência exata ou com subrotas (mas não rotas similares)
    // Ex: /apuracao não deve ativar quando estiver em /apuracao-pis-cofins
    if (location.pathname === href) {
      return true;
    }
    // Verificar se é uma subrota válida (com /)
    if (location.pathname.startsWith(href + '/')) {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo-business.png" 
                alt="Business Contabilidade" 
                className="h-10 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900">Business Contabilidade</h1>
                <p className="text-xs text-gray-600">Sistema Fiscal Inteligente</p>
              </div>
            </div>

            {/* Seletor de Empresa/Competência + Link Empresas */}
            <div className="hidden md:flex items-center gap-2">
              {/* Link para gerenciar empresas */}
              <Link
                to="/companies"
                data-testid="nav-companies"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Gerenciar Empresas"
              >
                <Building2 className="w-5 h-5" />
                <span className="text-sm font-medium">Empresas</span>
              </Link>
              
              {/* Seletor de empresa/competência */}
              {selectedCompany && (
                <button
                  data-testid="change-company-btn"
                  onClick={openSelector}
                  className="flex items-center gap-3 px-4 py-2 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors"
                >
                  {selectedCompany.codigo_empresa && (
                    <span className="px-2 py-1 bg-blue-600 text-white rounded font-bold text-sm">
                      #{selectedCompany.codigo_empresa}
                    </span>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-red-900 truncate max-w-[180px]">
                      {selectedCompany.razao_social}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-red-700">
                      <Calendar className="w-3 h-3" />
                      <span>Competência: {selectedCompetencia}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>

            {/* User Info */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-600">
                  {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                </p>
              </div>
              <button
                data-testid="logout-button"
                onClick={onLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          {/* Seletor Mobile */}
          {selectedCompany && (
            <button
              onClick={() => { openSelector(); setMobileMenuOpen(false); }}
              className="w-full px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-red-900">{selectedCompany.razao_social}</p>
                <p className="text-xs text-red-700">Competência: {selectedCompetencia}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-red-600" />
            </button>
          )}
          
          <div className="px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={item.testId}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-red-50 text-red-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sticky top-24">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      data-testid={item.testId}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive(item.href)
                          ? 'bg-red-600 text-white font-semibold shadow-lg'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
