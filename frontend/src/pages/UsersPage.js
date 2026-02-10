import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  Users, Plus, Search, Edit, Trash2, X, Check, Shield, 
  UserCheck, UserX, RefreshCw, Building2, ArrowUp, ArrowDown,
  Crown, UserMinus
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const UsersPage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  // Ordenação
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const emptyFormData = {
    email: '',
    password: '',
    name: '',
    role: 'operacional',
    company_ids: []
  };
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const handleEdit = (userData) => {
    setEditingUser(userData);
    setFormData({
      email: userData.email,
      password: '',
      name: userData.name,
      role: userData.role,
      company_ids: userData.company_ids || []
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingUser) {
        // Update existing user
        const updateData = {
          name: formData.name,
          role: formData.role,
          company_ids: formData.company_ids
        };
        await axios.put(`${API}/auth/users/${editingUser.id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Usuário atualizado com sucesso!');
      } else {
        // Create new user
        await axios.post(`${API}/auth/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Usuário criado com sucesso!');
      }
      
      handleCancel();
      fetchUsers();
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      alert(err.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleDeactivate = async (userId, userName) => {
    if (window.confirm(`Deseja desativar o usuário "${userName}"?\n\nO usuário não poderá mais acessar o sistema.`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/auth/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Usuário desativado com sucesso!');
        fetchUsers();
      } catch (err) {
        console.error('Erro ao desativar:', err);
        alert(err.response?.data?.detail || 'Erro ao desativar usuário');
      }
    }
  };

  const handleReactivate = async (userId, userName) => {
    if (window.confirm(`Deseja reativar o usuário "${userName}"?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API}/auth/users/${userId}/reactivate`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Usuário reativado com sucesso!');
        fetchUsers();
      } catch (err) {
        console.error('Erro ao reativar:', err);
        alert(err.response?.data?.detail || 'Erro ao reativar usuário');
      }
    }
  };

  const handlePromoteToMaster = async (userId, userName) => {
    if (window.confirm(`Deseja promover "${userName}" para Master?\n\nUsuários Master podem ver todas as empresas e gerenciar responsáveis.`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API}/auth/users/${userId}/promote-master`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Usuário promovido para Master com sucesso!');
        fetchUsers();
      } catch (err) {
        console.error('Erro ao promover:', err);
        alert(err.response?.data?.detail || 'Erro ao promover usuário');
      }
    }
  };

  const handleDemoteToOperacional = async (userId, userName) => {
    if (window.confirm(`Deseja rebaixar "${userName}" para Operacional?\n\nUsuários Operacionais só podem ver empresas às quais foram atribuídos.`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API}/auth/users/${userId}/demote-operacional`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Usuário rebaixado para Operacional com sucesso!');
        fetchUsers();
      } catch (err) {
        console.error('Erro ao rebaixar:', err);
        alert(err.response?.data?.detail || 'Erro ao rebaixar usuário');
      }
    }
  };

  const toggleCompany = (companyId) => {
    const current = formData.company_ids || [];
    if (current.includes(companyId)) {
      setFormData({ ...formData, company_ids: current.filter(id => id !== companyId) });
    } else {
      setFormData({ ...formData, company_ids: [...current, companyId] });
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'master': return 'Master';
      case 'admin': return 'Master';
      case 'operacional': return 'Operacional';
      case 'client': return 'Operacional';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'super_admin') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (role === 'master' || role === 'admin') return 'bg-[#C8A951]/10 text-[#C8A951] border-[#C8A951]/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || 
        (filterRole === 'master' && (u.role === 'master' || u.role === 'admin' || u.role === 'super_admin')) ||
        (filterRole === 'operacional' && (u.role === 'operacional' || u.role === 'client'));
      
      return matchesSearch && matchesRole;
    });
    
    // Ordenação
    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    
    return result;
  }, [users, searchTerm, filterRole, sortField, sortDirection]);
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 inline ml-1" />
      : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="users-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Gestão de Usuários
            </h1>
            <p className="text-[#A1A1AA] text-sm">
              Gerencie os usuários do escritório e suas permissões
            </p>
          </div>
          <button
            data-testid="add-user-button"
            onClick={handleNewUser}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Usuário
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded border border-[#2A2A2A] w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <h2 className="text-lg font-medium text-white">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button onClick={handleCancel} className="p-1 text-[#A1A1AA] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Nome *</label>
                  <input
                    data-testid="user-name-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    required
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Email *</label>
                  <input
                    data-testid="user-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    required
                    disabled={!!editingUser}
                    placeholder="email@exemplo.com"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Senha *</label>
                    <input
                      data-testid="user-password-input"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      required={!editingUser}
                      placeholder="••••••••"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Perfil *</label>
                  <select
                    data-testid="user-role-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                  >
                    <option value="operacional">Operacional</option>
                    <option value="master">Master</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Master: todas as empresas | Operacional: apenas empresas designadas
                  </p>
                </div>

                {(formData.role === 'operacional' || formData.role === 'client') && (
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                      Empresas Responsável
                    </label>
                    <div className="max-h-40 overflow-y-auto bg-[#0C0C0C] border border-[#2A2A2A] rounded p-2 space-y-1">
                      {companies.length === 0 ? (
                        <p className="text-xs text-[#A1A1AA] p-2">Nenhuma empresa cadastrada</p>
                      ) : (
                        companies.map(company => (
                          <label
                            key={company.id}
                            className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.company_ids?.includes(company.id)}
                              onChange={() => toggleCompany(company.id)}
                              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
                            />
                            <span className="text-sm text-white">{company.razao_social}</span>
                            {company.codigo_empresa && (
                              <span className="text-xs text-[#A1A1AA]">#{company.codigo_empresa}</span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Selecione as empresas que este usuário poderá acessar
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    data-testid="save-user-button"
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] transition-all"
                  >
                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2.5 bg-[#2A2A2A] text-white rounded font-medium hover:bg-[#333333] transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#A1A1AA]" />
            <input
              data-testid="search-users-input"
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
          >
            <option value="all">Todos os perfis</option>
            <option value="master">Master / Admin</option>
            <option value="operacional">Operacional</option>
          </select>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin mx-auto" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-[#141414] rounded border border-[#2A2A2A]">
            <Users className="w-12 h-12 text-[#A1A1AA] mx-auto mb-3" />
            <p className="text-[#A1A1AA]">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="bg-[#141414] rounded border border-[#2A2A2A] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#0C0C0C]">
                  <th 
                    className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort('name')}
                  >
                    Usuário <SortIndicator field="name" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-white"
                    onClick={() => handleSort('email')}
                  >
                    Email <SortIndicator field="email" />
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort('role')}
                  >
                    Perfil <SortIndicator field="role" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider hidden lg:table-cell">Empresas</th>
                  <th 
                    className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white"
                    onClick={() => handleSort('is_active')}
                  >
                    Status <SortIndicator field="is_active" />
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr 
                    key={u.id} 
                    data-testid={`user-row-${u.id}`}
                    className="border-b border-[#2A2A2A] hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#2A2A2A] flex items-center justify-center">
                          <Shield className="w-4 h-4 text-[#A1A1AA]" />
                        </div>
                        <span className="font-medium text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA] hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRoleBadgeClass(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(u.role === 'operacional' || u.role === 'client') ? (
                        <span className="text-sm text-[#A1A1AA]">
                          {(u.company_ids || []).length} empresa(s)
                        </span>
                      ) : (
                        <span className="text-sm text-[#C8A951]">Todas</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                          <UserCheck className="w-4 h-4" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                          <UserX className="w-4 h-4" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          data-testid={`edit-user-btn-${u.id}`}
                          onClick={() => handleEdit(u)}
                          className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {u.id !== user.id && (
                          u.is_active !== false ? (
                            <button
                              data-testid={`deactivate-user-btn-${u.id}`}
                              onClick={() => handleDeactivate(u.id, u.name)}
                              className="p-2 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                              title="Desativar"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              data-testid={`reactivate-user-btn-${u.id}`}
                              onClick={() => handleReactivate(u.id, u.name)}
                              className="p-2 text-[#A1A1AA] hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                              title="Reativar"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center justify-between text-sm text-[#A1A1AA]">
          <span>
            {filteredUsers.length} usuário(s) encontrado(s)
          </span>
          <span>
            {filteredUsers.filter(u => u.is_active !== false).length} ativo(s)
          </span>
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;
