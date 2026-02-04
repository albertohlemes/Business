import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { 
    LayoutDashboard, FileText, Shield, FileCheck,
    LogOut, Building2, User
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/minutas', label: 'Minutas', icon: FileText },
        { path: '/certificados', label: 'Certificados', icon: Shield },
        { path: '/licencas', label: 'Licenças', icon: FileCheck },
    ];

    return (
        <div className="flex min-h-screen bg-[#09090B]">
            {/* Sidebar */}
            <aside className="sidebar flex flex-col" data-testid="sidebar">
                <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-red-600" strokeWidth={1.5} />
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">BUSINESS</h1>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Portal Societário</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 py-6">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                data-testid={`nav-${item.path.slice(1)}`}
                                className={({ isActive }) =>
                                    `sidebar-item ${isActive ? 'active' : ''}`
                                }
                            >
                                <Icon className="w-5 h-5" strokeWidth={1.5} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                className="w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                data-testid="user-menu-trigger"
                            >
                                <div className="w-8 h-8 rounded bg-red-600/20 flex items-center justify-center">
                                    <User className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user?.name || 'Usuário'}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                            className="w-56 bg-zinc-900 border-zinc-800"
                            align="end"
                        >
                            <DropdownMenuItem className="text-zinc-400 focus:text-white focus:bg-zinc-800">
                                <User className="w-4 h-4 mr-2" strokeWidth={1.5} />
                                Perfil
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem 
                                className="text-red-500 focus:text-red-400 focus:bg-red-950"
                                onClick={handleLogout}
                                data-testid="logout-btn"
                            >
                                <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
};

export default Layout;
