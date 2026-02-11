import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, FileText, Download, LogOut, Menu, X, BarChart3, 
  Brain, ChevronDown, Calculator, AlertTriangle, Calendar, 
  DollarSign, Sparkles, Building2, Users, LayoutGrid, LayoutList,
  Briefcase, Factory, Zap, Star, ArrowLeftRight, Package, LineChart, TrendingUp,
  Shield, Bell, FileOutput, Lock
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import CoffeeProgress from './CoffeeProgress';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Layout = ({ user, onLogout, children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState('vertical');
  const { selectedCompany, selectedCompetencia, openSelector, uploadProgress, finishUpload } = useAppContext();

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

  // Determinar quais apurações mostrar baseado nos flags da empresa
  const getVisibleNavigation = () => {
    // === CADASTROS E NAVEGAÇÃO PRINCIPAL ===
    // Nota: "Empresas" foi removido do menu lateral - disponível apenas no header
    const nav = [
      { name: 'Dashboard', href: '/', icon: Home, testId: 'nav-dashboard' },
      { name: 'Documentos', href: '/documents', icon: FileText, testId: 'nav-documents' },
      { name: 'Classificação Inteligente', href: '/classificacao-inteligente', icon: Brain, testId: 'nav-classificacao-inteligente' },
      { name: 'Central de Alertas', href: '/alertas', icon: Bell, testId: 'nav-alertas' },
    ];
    
    // Se não tem empresa selecionada, mostra menu completo padrão
    if (!selectedCompany) {
      return [
        ...nav,
        // Apurações
        { name: 'Apuração', href: '/apuracao-movimento', icon: Package, testId: 'nav-apuracao-movimento' },
        { name: 'PIS/COFINS', href: '/pis-cofins', icon: DollarSign, testId: 'nav-pis-cofins' },
        { name: 'IPI', href: '/apuracao-ipi', icon: Factory, testId: 'nav-apuracao-ipi' },
        { name: 'ICMS', href: '/apuracao-icms', icon: Calculator, testId: 'nav-apuracao-icms' },
        { name: 'ICMS ST', href: '/apuracao-icms-st', icon: Calculator, testId: 'nav-apuracao-icms-st' },
        { name: 'DIFAL', href: '/difal', icon: ArrowLeftRight, testId: 'nav-difal' },
        { name: 'ISS', href: '/apuracao-iss', icon: Briefcase, testId: 'nav-apuracao-iss' },
        { name: 'Impostos Retidos', href: '/impostos-retidos', icon: DollarSign, testId: 'nav-impostos-retidos' },
        // Análises
        { name: 'Simples Nacional', href: '/simples-nacional', icon: Star, testId: 'nav-simples-nacional' },
        { name: 'Indicadores', href: '/indicadores', icon: BarChart3, testId: 'nav-indicadores' },
        { name: 'Evolução Fiscal', href: '/analise-horizontal', icon: TrendingUp, testId: 'nav-analise-horizontal' },
        { name: 'Vilões e Oportunidades', href: '/viloes-oportunidades', icon: AlertTriangle, testId: 'nav-viloes-oportunidades' },
        { name: 'RET', href: '/ret', icon: Zap, testId: 'nav-ret' },
        // Exportações
        { name: 'Relatórios', href: '/reports', icon: BarChart3, testId: 'nav-reports' },
        { name: 'Exportação', href: '/export', icon: Download, testId: 'nav-export' },
      ];
    }
    
    const tipoAtividade = selectedCompany.tipo_atividade || 'comercio';
    const perfisComerciais = selectedCompany.perfis_comerciais || [];
    const equiparadoIndustria = selectedCompany.equiparado_industria || false;
    const apuraIcms = selectedCompany.apura_icms || false;
    const apuraIcmsSt = selectedCompany.apura_icms_st || false;
    const regimeTributario = selectedCompany.regime_tributario || 'lucro_presumido';
    
    // Verificar se é indústria
    const ehIndustria = tipoAtividade === 'industria' || perfisComerciais.includes('industria') || equiparadoIndustria;
    
    // === APURAÇÕES ===
    
    // Simples Nacional tem estrutura diferente
    if (regimeTributario === 'simples_nacional') {
      nav.push({ name: 'Apuração', href: '/apuracao-movimento', icon: Package, testId: 'nav-apuracao-movimento' });
      nav.push({ name: 'Simples Nacional', href: '/simples-nacional', icon: Star, testId: 'nav-simples-nacional' });
      
      // DIFAL para compras interestaduais
      if (['comercio', 'industria', 'mista'].includes(tipoAtividade)) {
        nav.push({ name: 'DIFAL', href: '/difal', icon: ArrowLeftRight, testId: 'nav-difal' });
      }
      
      // IPI apenas para indústria no Simples
      if (ehIndustria) {
        nav.push({ name: 'IPI', href: '/apuracao-ipi', icon: Factory, testId: 'nav-apuracao-ipi' });
      }
      
      // Impostos Retidos (apuração)
      nav.push({ name: 'Impostos Retidos', href: '/impostos-retidos', icon: DollarSign, testId: 'nav-impostos-retidos' });
    } else {
      // Lucro Presumido / Lucro Real
      // NÃO tem menu de Apuração tradicional - apenas indicadores e análises
      
      // FEDERAIS (PIS/COFINS, IPI)
      nav.push({ name: 'PIS/COFINS', href: '/pis-cofins', icon: DollarSign, testId: 'nav-pis-cofins' });
      
      if (ehIndustria) {
        nav.push({ name: 'IPI', href: '/apuracao-ipi', icon: Factory, testId: 'nav-apuracao-ipi' });
      }
      
      // ESTADUAIS (ICMS, ICMS ST)
      if (['comercio', 'industria', 'mista'].includes(tipoAtividade) || apuraIcms) {
        nav.push({ name: 'ICMS', href: '/apuracao-icms', icon: Calculator, testId: 'nav-apuracao-icms' });
      }
      
      if (ehIndustria || apuraIcmsSt) {
        nav.push({ name: 'ICMS ST', href: '/apuracao-icms-st', icon: Calculator, testId: 'nav-apuracao-icms-st' });
      }
      
      // MUNICIPAIS (ISS)
      if (['servicos', 'mista'].includes(tipoAtividade)) {
        nav.push({ name: 'ISS', href: '/apuracao-iss', icon: Briefcase, testId: 'nav-apuracao-iss' });
      }
      
      // Impostos Retidos (apuração)
      nav.push({ name: 'Impostos Retidos', href: '/impostos-retidos', icon: DollarSign, testId: 'nav-impostos-retidos' });
    }
    
    // === ANÁLISES ===
    nav.push({ name: 'Indicadores', href: '/indicadores', icon: BarChart3, testId: 'nav-indicadores' });
    nav.push({ name: 'Evolução Fiscal', href: '/analise-horizontal', icon: TrendingUp, testId: 'nav-analise-horizontal' });
    nav.push({ name: 'Vilões e Oportunidades', href: '/viloes-oportunidades', icon: AlertTriangle, testId: 'nav-viloes-oportunidades' });
    nav.push({ name: 'RET', href: '/ret', icon: Zap, testId: 'nav-ret' });
    
    // === FECHAMENTO E EXPORTAÇÕES ===
    nav.push({ name: 'Fechamento Mensal', href: '/fechamento-mensal', icon: Lock, testId: 'nav-fechamento-mensal' });
    nav.push({ name: 'SPED Fiscal', href: '/sped', icon: FileOutput, testId: 'nav-sped' });
    nav.push({ name: 'Relatórios', href: '/reports', icon: BarChart3, testId: 'nav-reports' });
    nav.push({ name: 'Exportação', href: '/export', icon: Download, testId: 'nav-export' });
    
    return nav;
  };
  
  const navigation = getVisibleNavigation();

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
    <div className="h-screen bg-[#0C0C0C] flex flex-col overflow-hidden">
      {/* Header Principal - Logo e Controles - FIXO NO TOPO */}
      <header className="bg-[#0C0C0C] border-b border-[#2A2A2A] z-50 flex-shrink-0">
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

            {/* Centro - Company Selector (mais destaque) */}
            {selectedCompany && (
              <button
                data-testid="change-company-btn"
                onClick={openSelector}
                className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#141414] hover:bg-[#1F1F1F] rounded-lg border border-[#2A2A2A] transition-colors"
              >
                {/* Logo da empresa */}
                {selectedCompany.logo_url ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                    <img 
                      src={selectedCompany.logo_url} 
                      alt={selectedCompany.razao_social}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : selectedCompany.codigo_empresa ? (
                  <span className="px-2 py-0.5 bg-[#C8A951]/10 text-[#C8A951] rounded text-xs font-semibold flex-shrink-0">
                    #{selectedCompany.codigo_empresa}
                  </span>
                ) : (
                  <Building2 className="w-5 h-5 text-[#A1A1AA] flex-shrink-0" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">
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

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Management Links (Master/Admin only) - Cadastros */}
              {isMasterOrAdmin && (
                <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                  <Link
                    to="/companies"
                    data-testid="nav-companies"
                    className="flex items-center gap-1.5 px-2 py-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Empresas"
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs">Empresas</span>
                  </Link>
                  <div className="w-px h-4 bg-[#2A2A2A]" />
                  <Link
                    to="/usuarios"
                    data-testid="nav-users"
                    className="flex items-center gap-1.5 px-2 py-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Usuários"
                  >
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Usuários</span>
                  </Link>
                  <Link
                    to="/permissoes"
                    data-testid="nav-permissions"
                    className="flex items-center gap-1.5 px-2 py-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="Permissões"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-xs">Permissões</span>
                  </Link>
                </div>
              )}

              {/* Menu Mode Toggle */}
              <button
                data-testid="toggle-menu-mode"
                onClick={toggleMenuMode}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#C8A951] hover:bg-[#B09240] text-black rounded-lg font-medium transition-colors"
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
              <div className="hidden md:flex items-center gap-3 pl-2 border-l border-[#2A2A2A]">
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
        <div className="md:hidden bg-[#141414] border-b border-[#2A2A2A] flex-shrink-0 max-h-[60vh] overflow-y-auto">
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
                {isMasterOrAdmin && (
                  <Link
                    to="/usuarios"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <Users className="w-4 h-4" />
                    <span>Usuários</span>
                  </Link>
                )}
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

      {/* Main Content Area - Flex grow para ocupar espaço restante */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 h-full">
          <div className="flex gap-6 h-full py-4">
            {/* Sidebar - Apenas em modo vertical - FIXA */}
            {menuMode === 'vertical' && (
              <aside className="hidden md:block w-56 flex-shrink-0 overflow-y-auto">
                <nav className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-3">
                  <div className="space-y-1">
                    {navigation.map((item) => (
                      <NavItemVertical key={item.name} item={item} />
                    ))}
                  </div>
                </nav>
              </aside>
            )}

            {/* Main Content - ÚNICO ELEMENTO ROLÁVEL */}
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
              {children}
            </main>
          </div>
        </div>
      </div>

      {/* Barra de Progresso Global de Upload - SEMPRE VISÍVEL */}
      {uploadProgress.isUploading && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 bg-[#141414] rounded-xl border border-[#2A2A2A] shadow-2xl">
          <div className="p-4">
            {/* Header com título e botão fechar */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {uploadProgress.error ? '❌ Erro na importação' : 'Importando documentos'}
                </p>
                <p className="text-xs text-[#666] truncate max-w-[150px]">{uploadProgress.companyName}</p>
              </div>
              <button
                onClick={() => finishUpload()}
                className="p-1 hover:bg-[#2A2A2A] rounded transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4 text-[#666] hover:text-white" />
              </button>
            </div>
            
            {uploadProgress.error ? (
              // Exibir erro
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-red-400">{uploadProgress.error}</p>
              </div>
            ) : (
              <>
                {/* Contador principal - GRANDE E VISÍVEL */}
                {uploadProgress.total > 0 && (() => {
                  // Calcular porcentagem real
                  const realPercent = Math.round((uploadProgress.current / uploadProgress.total) * 100);
                  
                  // Calcular tempo estimado
                  const startTime = uploadProgress.startTime || Date.now();
                  const elapsed = (Date.now() - startTime) / 1000; // segundos
                  const rate = uploadProgress.current > 0 ? elapsed / uploadProgress.current : 0; // segundos por doc
                  const remaining = (uploadProgress.total - uploadProgress.current) * rate;
                  
                  // Formatar tempo restante
                  const formatTime = (seconds) => {
                    if (seconds < 60) return `${Math.round(seconds)}s`;
                    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
                    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}min`;
                  };
                  
                  return (
                    <div className="text-center mb-3">
                      <p className="text-3xl font-bold text-white">
                        {uploadProgress.current.toLocaleString()} <span className="text-[#666] text-lg">de</span> {uploadProgress.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-[#C8A951]">documentos processados</p>
                      
                      {/* Barra de progresso */}
                      <div className="h-2.5 bg-[#2A2A2A] rounded-full overflow-hidden my-3">
                        <div 
                          className="h-full bg-gradient-to-r from-[#C8A951] to-[#D4B85C] rounded-full transition-all duration-300"
                          style={{ width: `${realPercent}%` }}
                        />
                      </div>
                      
                      {/* Porcentagem e tempo estimado */}
                      <div className="flex justify-between text-sm">
                        <span className="text-[#A1A1AA]">{realPercent}% concluído</span>
                        {remaining > 0 && uploadProgress.current > 5 && (
                          <span className="text-[#C8A951]">~{formatTime(remaining)} restante</span>
                        )}
                      </div>
                      
                      {/* Velocidade */}
                      {rate > 0 && uploadProgress.current > 5 && (
                        <p className="text-xs text-[#666] mt-1">
                          {(1/rate).toFixed(1)} docs/seg
                        </p>
                      )}
                    </div>
                  );
                })()}
                
                {/* Contador de café */}
                <div className="flex justify-center">
                  <CoffeeProgress 
                    progress={uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0} 
                    message=""
                    showPercentage={false}
                  />
                </div>
              </>
            )}
            
            <p className="text-xs text-[#666] text-center mt-2 italic">
              {uploadProgress.error ? 'Clique no X para fechar' : '☕ Continue navegando enquanto processamos...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
