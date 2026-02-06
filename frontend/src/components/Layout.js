import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useState } from 'react';
import EmpresaSelectorModal from './EmpresaSelectorModal';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  UserPlus, 
  Calculator, 
  ClipboardCheck, 
  FileSpreadsheet,
  Download,
  LogOut,
  Menu,
  X,
  Calendar,
  ChevronDown,
  ChevronRight,
  Bell,
  RefreshCw,
  FileCheck,
  FileScan,
  FileInput,
  Repeat,
  CheckSquare,
  BarChart3
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_4f7d5596-5b20-477c-ba75-d49f33573db4/artifacts/junuf5pl_logo%20business%20Grande%20Horizontal%20Branco.png";

const Layout = () => {
  const { user, logout } = useAuth();
  const { empresaSelecionada, competencia } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(['conversoes', 'validacoes', 'calculos', 'controles']);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuSections = [
    {
      id: 'conversoes',
      title: 'Conversões',
      icon: Repeat,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      items: [
        { to: '/conversao-apontamentos', icon: FileInput, label: 'Apontamentos → SCI' },
        { to: '/conversao-admissional', icon: FileScan, label: 'Docs Admissionais' },
      ]
    },
    {
      id: 'validacoes',
      title: 'Validações',
      icon: CheckSquare,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      items: [
        { to: '/validacao', icon: ClipboardCheck, label: 'Validação de Folha' },
        { to: '/validacao-rescisao', icon: FileCheck, label: 'Validação de Rescisão' },
        { to: '/informes', icon: FileSpreadsheet, label: 'Informes de Rendimento' },
      ]
    },
    {
      id: 'calculos',
      title: 'Cálculos',
      icon: Calculator,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      items: [
        { to: '/dissidio', icon: FileText, label: 'Dissídio Coletivo' },
        { to: '/medias', icon: BarChart3, label: 'Médias' },
      ]
    },
    {
      id: 'controles',
      title: 'Controles',
      icon: LayoutDashboard,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/clientes', icon: Building2, label: 'Empresas' },
        { to: '/colaboradores', icon: Users, label: 'Colaboradores' },
        { to: '/admissoes', icon: UserPlus, label: 'Admissões' },
        { to: '/relatorios', icon: Download, label: 'Relatórios' },
      ]
    },
  ];

  // Encontrar item ativo para título
  const findActiveItem = () => {
    for (const section of menuSections) {
      const item = section.items.find(item => 
        item.to === location.pathname || 
        (item.to === '/' && location.pathname === '/')
      );
      if (item) return item;
    }
    return null;
  };

  const activeItem = findActiveItem();

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Mobile menu button */}
      <button
        data-testid="mobile-menu-btn"
        className="lg:hidden fixed top-5 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg border border-slate-700"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-72 bg-slate-950 border-r border-slate-800/50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 flex flex-col`}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-center px-4 border-b border-slate-800/50">
          <img 
            src={LOGO_URL} 
            alt="Business Contabilidade" 
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {menuSections.map((section) => (
            <div key={section.id} className="mb-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${section.bgColor} flex items-center justify-center`}>
                    <section.icon size={14} className={section.color} />
                  </div>
                  <span className="uppercase tracking-wider text-xs">{section.title}</span>
                </div>
                <ChevronRight 
                  size={14} 
                  className={`transition-transform duration-200 ${expandedSections.includes(section.id) ? 'rotate-90' : ''}`}
                />
              </button>
              
              {/* Section Items */}
              {expandedSections.includes(section.id) && (
                <div className="mt-1 space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-').replace(/→/g, '')}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 mx-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-red-500/10 text-red-500 border-l-2 border-red-500 ml-2' 
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon size={18} strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-semibold">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="lg:ml-72">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/5 h-20 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-6 ml-12 lg:ml-0">
            {/* Page title based on route */}
            <div>
              <h1 className="text-xl font-bold text-white">
                {activeItem?.label || 'Portal DP'}
              </h1>
              <p className="text-sm text-slate-500">Business Contabilidade</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Empresa & Competência Selector Button */}
            <button
              data-testid="empresa-selector-header"
              onClick={() => setSelectorOpen(true)}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl hover:border-red-500/50 transition-all duration-200 group"
            >
              {empresaSelecionada ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Building2 size={16} className="text-red-500" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-white max-w-[150px] truncate">
                        {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={10} />
                        <span className="font-mono">{competencia}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-slate-500 group-hover:text-red-500 transition-colors" />
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Building2 size={16} className="text-slate-400" />
                  </div>
                  <span className="text-slate-400 text-sm hidden sm:block">Selecionar Empresa</span>
                  <ChevronDown size={16} className="text-slate-500" />
                </>
              )}
            </button>

            {/* Notifications */}
            <button className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
              <Bell size={18} />
            </button>

            {/* User avatar */}
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-semibold text-sm">
                {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-[calc(100vh-5rem)]">
          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Empresa Selector Modal */}
      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default Layout;
