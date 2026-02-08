import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, FileText, Upload, Download, LogOut, Menu, X, BarChart3, 
  Brain, ChevronDown, Calculator, AlertTriangle, Calendar, 
  DollarSign, Sparkles, Building2, Users, LayoutGrid, LayoutList
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Layout = ({ user, onLogout, children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState('vertical');
  const { selectedCompany, selectedCompetencia, openSelector } = useAppContext();

  // Load menu preference from user
  useEffect(() => {
    const savedMode = localStorage.getItem('menuMode');
    if (savedMode) {
      setMenuMode(savedMode);
    } else if (user?.preferences?.menu_mode) {
      setMenuMode(user.preferences.menu_mode);
    }
  }, [user]);

  const toggleMenuMode = async () => {
    const newMode = menuMode === 'vertical' ? 'horizontal' : 'vertical';
    setMenuMode(newMode);
    localStorage.setItem('menuMode', newMode);
    
    // Save preference to backend
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/auth/me/preferences`, 
        { menu_mode: newMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Erro ao salvar preferência:', err);
    }
  };

  // Check if user is Master/Admin
  const isMasterOrAdmin = user?.role === 'admin' || user?.role === 'master' || user?.role === 'super_admin';

  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, testId: 'nav-dashboard' },
    { name: 'Upload', href: '/upload', icon: Upload, testId: 'nav-upload' },
    { name: 'Documentos', href: '/documents', icon: FileText, testId: 'nav-documents' },
    { name: 'Alertas', href: '/alertas-cfop', icon: AlertTriangle, testId: 'nav-alertas-cfop' },
    { name: 'Validação IA', href: '/classificacao', icon: Brain, testId: 'nav-classificacao' },
    { name: 'PIS/COFINS', href: '/analise-pis-cofins', icon: DollarSign, testId: 'nav-pis-cofins' },
    { name: 'Apuração', href: '/apuracao-mensal', icon: Calculator, testId: 'nav-apuracao-mensal' },
    { name: 'Análise IA', href: '/analise-tributaria-ia', icon: Sparkles, testId: 'nav-analise-tributaria-ia' },
    { name: 'Relatórios', href: '/reports', icon: BarChart3, testId: 'nav-reports' },
    { name: 'Exportação', href: '/export', icon: Download, testId: 'nav-export' },
  ];

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    if (location.pathname === href) return true;
    if (location.pathname.startsWith(href + '/')) return true;
    return false;
  };

  // Render navigation item for vertical menu
  const NavItemVertical = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        data-testid={item.testId}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
          active
            ? 'text-[#C8A951] bg-[#C8A951]/10 border-l-2 border-[#C8A951]'
            : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{item.name}</span>
      </Link>
    );
  };

  // Render navigation item for horizontal menu
  const NavItemHorizontal = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        to={item.href}
        data-testid={item.testId}
        className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 whitespace-nowrap ${
          active
            ? 'text-[#C8A951] bg-[#C8A951]/10'
            : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C]">
      {/* Header Principal - Logo e Controles */}
      <header className="bg-[#0C0C0C] border-b border-[#2A2A2A] sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/aurion-logo.png" 
                alt="AURION" 
                className="h-10 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  AURION
                </h1>
                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">
                  Núcleo de Inteligência Operacional
                </p>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* Company Selector */}
              {selectedCompany && (
                <button
                  data-testid="change-company-btn"
                  onClick={openSelector}
                  className="hidden md:flex items-center gap-3 px-3 py-2 bg-[#141414] hover:bg-[#1F1F1F] rounded border border-[#2A2A2A] transition-colors"
                >
                  {selectedCompany.codigo_empresa && (
                    <span className="px-2 py-0.5 bg-[#C8A951]/10 text-[#C8A951] rounded text-xs font-semibold">
                      #{selectedCompany.codigo_empresa}
                    </span>
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-white truncate max-w-[150px]">
                      {selectedCompany.razao_social}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                      <Calendar className="w-3 h-3" />
                      <span>{selectedCompetencia}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
                </button>
              )}

              {/* Management Links (Master/Admin only) */}
              {isMasterOrAdmin && (
                <div className="hidden md:flex items-center gap-1">
                  <Link
                    to="/companies"
                    data-testid="nav-companies"
                    className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Empresas"
                  >
                    <Building2 className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/usuarios"
                    data-testid="nav-users"
                    className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Usuários"
                  >
                    <Users className="w-5 h-5" />
                  </Link>
                </div>
              )}

              {/* Menu Mode Toggle - SEMPRE VISÍVEL */}
              <button
                data-testid="toggle-menu-mode"
                onClick={toggleMenuMode}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#C8A951] hover:bg-[#B09240] text-black rounded font-medium transition-colors"
                title={menuMode === 'vertical' ? 'Mudar para menu horizontal' : 'Mudar para menu vertical'}
              >
                {menuMode === 'vertical' ? (
                  <>
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-xs font-semibold">HORIZONTAL</span>
                  </>
                ) : (
                  <>
                    <LayoutList className="w-4 h-4" />
                    <span className="text-xs font-semibold">VERTICAL</span>
                  </>
                )}
              </button>

              {/* User Info */}
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-[#2A2A2A]">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-[#A1A1AA]">
                    {user.role === 'super_admin' ? 'Super Admin' : 
                     user.role === 'master' || user.role === 'admin' ? 'Master' : 
                     'Operacional'}
                  </p>
                </div>
                <button
                  data-testid="logout-button"
                  onClick={onLogout}
                  className="p-2 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-[#A1A1AA]"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Horizontal - Segunda linha quando em modo horizontal */}
        {menuMode === 'horizontal' && (
          <div className="hidden md:block border-t border-[#2A2A2A] bg-[#141414]">
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
              <nav className="flex items-center gap-1 py-2 overflow-x-auto">
                {navigation.map((item) => (
                  <NavItemHorizontal key={item.name} item={item} />
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#141414] border-b border-[#2A2A2A]">
          {selectedCompany && (
            <button
              onClick={() => { openSelector(); setMobileMenuOpen(false); }}
              className="w-full px-4 py-3 bg-[#0C0C0C] border-b border-[#2A2A2A] flex items-center justify-between"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white">{selectedCompany.razao_social}</p>
                <p className="text-xs text-[#A1A1AA]">Competência: {selectedCompetencia}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
            </button>
          )}
          
          <div className="px-4 py-2 space-y-1">
            {navigation.map((item) => (
              <NavItemVertical key={item.name} item={item} />
            ))}
            
            {isMasterOrAdmin && (
              <>
                <div className="border-t border-[#2A2A2A] my-2" />
                <Link
                  to="/companies"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Empresas</span>
                </Link>
                <Link
                  to="/usuarios"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg"
                >
                  <Users className="w-4 h-4" />
                  <span>Usuários</span>
                </Link>
              </>
            )}
            
            {/* Toggle menu mode mobile */}
            <div className="border-t border-[#2A2A2A] my-2" />
            <button
              onClick={() => { toggleMenuMode(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#C8A951] hover:bg-[#C8A951]/10 rounded-lg"
            >
              {menuMode === 'vertical' ? <LayoutGrid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
              <span>Mudar para {menuMode === 'vertical' ? 'Horizontal' : 'Vertical'}</span>
            </button>
            
            <div className="border-t border-[#2A2A2A] my-2" />
            <button
              onClick={() => { onLogout(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Apenas em modo vertical */}
          {menuMode === 'vertical' && (
            <aside className="hidden md:block w-56 flex-shrink-0">
              <nav className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-3 sticky top-24">
                <div className="space-y-1">
                  {navigation.map((item) => (
                    <NavItemVertical key={item.name} item={item} />
                  ))}
                </div>
              </nav>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
