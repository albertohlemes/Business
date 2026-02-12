import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { 
  Users, Shield, Check, X, ChevronDown, ChevronRight, 
  Search, Save, RefreshCw, Eye, Edit2, Trash2, UserPlus,
  Lock, Unlock, Settings, Building2, FileText, Calculator,
  BarChart3, FileSpreadsheet, Database
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Ícones por módulo
const MODULE_ICONS = {
  dashboard: BarChart3,
  documents: FileText,
  classification: Settings,
  icms: Calculator,
  pis_cofins: Calculator,
  ret: Calculator,
  reports: FileSpreadsheet,
  sped: Database,
  companies: Building2,
  users: Users,
  settings: Settings,
};

const UserPermissions = () => {
  const { user: currentUser } = useAppContext();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  // Carregar usuários
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // API retorna {users: [...], total: N}
      setUsers(response.data.users || response.data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar lista de usuários');
    }
  }, []);

  // Carregar permissões disponíveis
  const fetchAvailablePermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/auth/permissions/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailablePermissions(response.data);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      toast.error('Erro ao carregar permissões disponíveis');
    }
  }, []);

  // Carregar permissões de um usuário específico
  const fetchUserPermissions = useCallback(async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/auth/users/${userId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserPermissions(response.data);
    } catch (error) {
      console.error('Erro ao carregar permissões do usuário:', error);
      toast.error('Erro ao carregar permissões do usuário');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchAvailablePermissions()]);
      setLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchAvailablePermissions]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
    }
  }, [selectedUser, fetchUserPermissions]);

  // Alternar permissão
  const togglePermission = async (permissionKey) => {
    if (!selectedUser || !userPermissions) return;
    
    const isEnabled = userPermissions.effective_permissions.includes(permissionKey) ||
                      userPermissions.effective_permissions.includes('*');
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/auth/users/${selectedUser.id}/permissions/toggle`,
        { permission: permissionKey, enabled: !isEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Recarregar permissões
      await fetchUserPermissions(selectedUser.id);
      toast.success(`Permissão ${!isEnabled ? 'concedida' : 'revogada'}`);
    } catch (error) {
      console.error('Erro ao alterar permissão:', error);
      toast.error(error.response?.data?.detail || 'Erro ao alterar permissão');
    } finally {
      setSaving(false);
    }
  };

  // Verificar se permissão está habilitada
  const isPermissionEnabled = (permissionKey) => {
    if (!userPermissions) return false;
    if (userPermissions.has_full_access) return true;
    return userPermissions.effective_permissions.includes(permissionKey);
  };

  // Verificar se permissão foi customizada
  const isPermissionCustomized = (permissionKey) => {
    if (!userPermissions) return false;
    return userPermissions.custom_permissions.includes(permissionKey) ||
           userPermissions.denied_permissions.includes(permissionKey);
  };

  // Filtrar usuários
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle módulo expandido
  const toggleModule = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  // Expandir todos
  const expandAll = () => {
    if (!availablePermissions) return;
    const allExpanded = {};
    Object.keys(availablePermissions.modules).forEach(key => {
      allExpanded[key] = true;
    });
    setExpandedModules(allExpanded);
  };

  // Recolher todos
  const collapseAll = () => {
    setExpandedModules({});
  };

  // Role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'master':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'operacional':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'client':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <Layout user={currentUser} onLogout={() => {}}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={currentUser} onLogout={() => {}}>
      <div className="p-6 space-y-6" data-testid="user-permissions-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#C8A951]/10 rounded-xl">
              <Shield className="w-8 h-8 text-[#C8A951]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Permissões de Usuários</h1>
              <p className="text-[#A1A1AA]">Gerencie o que cada usuário pode fazer no sistema</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Lista de Usuários */}
          <div className="col-span-4 bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="p-4 border-b border-[#2A2A2A]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:border-[#C8A951] focus:outline-none"
                data-testid="search-users"
              />
            </div>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 border-b border-[#2A2A2A] cursor-pointer transition-colors ${
                  selectedUser?.id === user.id 
                    ? 'bg-[#C8A951]/10 border-l-2 border-l-[#C8A951]' 
                    : 'hover:bg-[#2A2A2A]/50'
                }`}
                data-testid={`user-item-${user.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-sm text-[#666]">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getRoleBadgeColor(user.role)}`}>
                    {availablePermissions?.roles?.[user.role]?.label || user.role}
                  </span>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-[#666]">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Painel de Permissões */}
        <div className="col-span-8 bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden">
          {selectedUser ? (
            <>
              {/* Header do usuário selecionado */}
              <div className="p-4 border-b border-[#2A2A2A] bg-[#141414]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedUser.name}</h2>
                    <p className="text-sm text-[#666]">{selectedUser.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-sm rounded-full border ${getRoleBadgeColor(selectedUser.role)}`}>
                      {availablePermissions?.roles?.[selectedUser.role]?.label || selectedUser.role}
                    </span>
                    {userPermissions?.has_full_access && (
                      <span className="px-3 py-1 text-sm rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Acesso Total
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Botões de ação */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={expandAll}
                    className="px-3 py-1.5 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
                  >
                    Expandir Tudo
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-1.5 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
                  >
                    Recolher Tudo
                  </button>
                  <button
                    onClick={() => fetchUserPermissions(selectedUser.id)}
                    className="px-3 py-1.5 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </button>
                </div>
              </div>

              {/* Lista de Permissões por Módulo */}
              <div className="max-h-[520px] overflow-y-auto p-4 space-y-2">
                {userPermissions?.has_full_access && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Lock className="w-5 h-5" />
                      <span className="font-medium">Este usuário tem acesso total ao sistema</span>
                    </div>
                    <p className="text-sm text-yellow-400/70 mt-1">
                      Todas as permissões estão habilitadas automaticamente pelo role {selectedUser.role}
                    </p>
                  </div>
                )}

                {availablePermissions?.modules && Object.entries(availablePermissions.modules).map(([moduleKey, moduleData]) => {
                  const isExpanded = expandedModules[moduleKey];
                  const IconComponent = MODULE_ICONS[moduleKey] || Settings;
                  
                  // Contar permissões habilitadas no módulo
                  const enabledCount = moduleData.permissions.filter(p => 
                    isPermissionEnabled(p.key)
                  ).length;
                  const totalCount = moduleData.permissions.length;
                  
                  return (
                    <div key={moduleKey} className="border border-[#2A2A2A] rounded-lg overflow-hidden">
                      {/* Header do módulo */}
                      <div
                        onClick={() => toggleModule(moduleKey)}
                        className="flex items-center justify-between p-3 bg-[#141414] cursor-pointer hover:bg-[#1A1A1A] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#666]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#666]" />
                          )}
                          <IconComponent className="w-5 h-5 text-[#C8A951]" />
                          <span className="font-medium text-white">{moduleData.label}</span>
                        </div>
                        <span className={`text-sm ${enabledCount === totalCount ? 'text-green-400' : 'text-[#666]'}`}>
                          {enabledCount}/{totalCount}
                        </span>
                      </div>
                      
                      {/* Permissões do módulo */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 bg-[#1A1A1A]">
                          {moduleData.permissions.map(permission => {
                            const enabled = isPermissionEnabled(permission.key);
                            const customized = isPermissionCustomized(permission.key);
                            
                            return (
                              <div
                                key={permission.key}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  enabled ? 'bg-green-500/5' : 'bg-[#141414]'
                                } ${customized ? 'ring-1 ring-[#C8A951]/30' : ''}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white">{permission.label}</span>
                                    {customized && (
                                      <span className="px-1.5 py-0.5 text-xs bg-[#C8A951]/20 text-[#C8A951] rounded">
                                        Customizado
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#666]">{permission.description}</p>
                                </div>
                                
                                <button
                                  onClick={() => togglePermission(permission.key)}
                                  disabled={saving || userPermissions?.has_full_access}
                                  className={`w-12 h-6 rounded-full transition-colors relative ${
                                    enabled
                                      ? 'bg-green-500'
                                      : 'bg-[#2A2A2A]'
                                  } ${userPermissions?.has_full_access ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  data-testid={`toggle-${permission.key}`}
                                >
                                  <div
                                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                      enabled ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-[#666]">
              <Shield className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Selecione um usuário para gerenciar permissões</p>
              <p className="text-sm mt-1">Clique em um usuário na lista ao lado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;
