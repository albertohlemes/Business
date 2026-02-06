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
  Settings,
  Bell
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_4f7d5596-5b20-477c-ba75-d49f33573db4/artifacts/u8zs9dji_WhatsApp_Image_2026-02-03_at_21.10.59-removebg-preview.png";

const Layout = () => {
  const { user, logout } = useAuth();
  const { empresaSelecionada, competencia } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clientes', icon: Building2, label: 'Empresas' },
    { to: '/colaboradores', icon: Users, label: 'Colaboradores' },
    { to: '/validacao', icon: ClipboardCheck, label: 'Validação Folha' },
    { to: '/dissidio', icon: FileText, label: 'Dissídio' },
    { to: '/admissoes', icon: UserPlus, label: 'Admissões' },
    { to: '/medias', icon: Calculator, label: 'Médias' },
    { to: '/informes', icon: FileSpreadsheet, label: 'Informes Rendimento' },
    { to: '/relatorios', icon: Download, label: 'Relatórios' },
  ];

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
      <aside className={`sidebar transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <img 
              src={LOGO_URL} 
              alt="Business Contabilidade" 
              className="h-12 w-auto"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white tracking-tight">BUSINESS</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Contabilidade</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="py-6 flex-1 overflow-y-auto">
          <div className="px-4 mb-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 mb-3">Menu Principal</p>
          </div>
          
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} strokeWidth={1.5} />
              <span>{item.label}</span>
            </NavLink>
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
        <header className="header-glass h-20 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-6 ml-12 lg:ml-0">
            {/* Page title based on route */}
            <div>
              <h1 className="text-xl font-bold text-white">
                {navItems.find(item => item.to === location.pathname)?.label || 'Portal DP'}
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
