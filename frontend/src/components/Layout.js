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
  ChevronDown
} from 'lucide-react';

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

  const generateCode = (id) => {
    if (!id) return '';
    return `#${id.slice(0, 4).toUpperCase()}`;
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/colaboradores', icon: Users, label: 'Colaboradores' },
    { to: '/dissidio', icon: FileText, label: 'Dissídio' },
    { to: '/admissoes', icon: UserPlus, label: 'Admissões' },
    { to: '/medias', icon: Calculator, label: 'Médias' },
    { to: '/validacao', icon: ClipboardCheck, label: 'Validação Folha' },
    { to: '/informes', icon: FileSpreadsheet, label: 'Informes Rendimento' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile menu button */}
      <button
        data-testid="mobile-menu-btn"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Top Header Bar */}
      <header className="header-glass h-16 flex items-center justify-between px-6 lg:px-8 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3 ml-12 lg:ml-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Building2 className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Portal DP</h1>
              <p className="text-xs text-slate-500">Departamento Pessoal</p>
            </div>
          </div>

          {/* Empresas Button in Header */}
          <button
            data-testid="header-empresas-btn"
            onClick={() => navigate('/clientes')}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/clientes' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 size={18} />
            <span className="font-medium">Empresas</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Empresa Selector Button */}
          <button
            data-testid="empresa-selector-header"
            onClick={() => setSelectorOpen(true)}
            className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {empresaSelecionada ? (
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">
                  {generateCode(empresaSelecionada.id)}
                </span>
                <span className="font-medium text-slate-700 max-w-[150px] truncate hidden sm:block">
                  {empresaSelecionada.nome_fantasia || empresaSelecionada.razao_social}
                </span>
                <div className="flex items-center gap-1 text-slate-500 text-sm">
                  <Calendar size={14} />
                  <span className="font-mono">{competencia}</span>
                </div>
              </div>
            ) : (
              <>
                <Building2 size={18} className="text-indigo-600" />
                <span className="text-slate-500 hidden sm:block">Selecionar Empresa</span>
              </>
            )}
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {/* User info */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="font-medium">{user?.nome}</span>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 pt-16`}>
        <nav className="py-4">
          {/* Empresas link in sidebar for mobile */}
          <NavLink
            to="/clientes"
            data-testid="nav-empresas"
            className={({ isActive }) =>
              `sidebar-item lg:hidden ${isActive ? 'active' : ''}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Building2 size={20} strokeWidth={1.5} />
            <span>Empresas</span>
          </NavLink>

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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.nome}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16">
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Empresa Selector Modal */}
      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default Layout;
