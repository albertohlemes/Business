import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  History, Search, Filter, Calendar, User, Building2, 
  CheckCircle, XCircle, ChevronDown, ChevronUp, Activity,
  Users, FileText, Lock, Upload, Brain, RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const actionIcons = {
  'auth': <User className="w-4 h-4" />,
  'user': <Users className="w-4 h-4" />,
  'company': <Building2 className="w-4 h-4" />,
  'document': <FileText className="w-4 h-4" />,
  'classification': <Brain className="w-4 h-4" />,
  'competencia': <Lock className="w-4 h-4" />,
  'sped': <Upload className="w-4 h-4" />
};

const actionLabels = {
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.login_failed': 'Tentativa de Login Falhou',
  'user.create': 'Usuário Criado',
  'user.update': 'Usuário Atualizado',
  'user.delete': 'Usuário Excluído',
  'user.reactivate': 'Usuário Reativado',
  'user.permission_change': 'Permissões Alteradas',
  'company.create': 'Empresa Criada',
  'company.update': 'Empresa Atualizada',
  'company.delete': 'Empresa Excluída',
  'document.upload': 'Upload de Documentos',
  'document.delete': 'Documentos Excluídos',
  'document.reprocess': 'Documentos Reprocessados',
  'classification.manual': 'Classificação Manual',
  'classification.ai': 'Classificação por IA',
  'classification.batch': 'Classificação em Lote',
  'competencia.fechar': 'Competência Fechada',
  'competencia.reabrir': 'Competência Reaberta',
  'sped.export': 'SPED Exportado'
};

const AuditLog = ({ user, onLogout }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    company_id: '',
    start_date: '',
    end_date: '',
    success_only: null
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Resumo
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(true);
  
  // Ações disponíveis
  const [availableActions, setAvailableActions] = useState({});
  
  // Paginação
  const [skip, setSkip] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchLogs();
    fetchSummary();
    fetchActions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [skip]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('limit', limit);
      params.append('skip', skip);
      
      if (filters.action) params.append('action', filters.action);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.success_only !== null) params.append('success_only', filters.success_only);
      
      const response = await axios.get(`${API}/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
      setHasMore(response.data.has_more || false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/audit-logs/summary?days=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(response.data);
    } catch (err) {
      console.error('Erro ao carregar resumo:', err);
    }
  };

  const fetchActions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/audit-logs/actions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableActions(response.data.actions || {});
    } catch (err) {
      console.error('Erro ao carregar ações:', err);
    }
  };

  const handleFilter = () => {
    setSkip(0);
    fetchLogs();
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      user_id: '',
      company_id: '',
      start_date: '',
      end_date: '',
      success_only: null
    });
    setSkip(0);
    setTimeout(fetchLogs, 100);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
  };

  const getActionIcon = (action) => {
    const prefix = action?.split('.')[0];
    return actionIcons[prefix] || <Activity className="w-4 h-4" />;
  };

  const getActionLabel = (action) => {
    return actionLabels[action] || action;
  };

  // Verifica se é admin
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[#A1A1AA]">
            <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Acesso restrito a administradores</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="audit-log-page" className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-[#C8A951]" />
              Histórico de Alterações
            </h1>
            <p className="text-[#A1A1AA]">
              Auditoria de ações do sistema • {total.toLocaleString()} registros
            </p>
          </div>
          
          <button
            onClick={fetchLogs}
            className="p-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg text-[#A1A1AA]"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo */}
        {showSummary && summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-[#A1A1AA]">Total (30 dias)</p>
                  <p className="text-xl font-bold text-white">{summary.total_logs?.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <User className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-[#A1A1AA]">Logins</p>
                  <p className="text-xl font-bold text-white">
                    {summary.by_action?.find(a => a._id === 'auth.login')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-[#A1A1AA]">Usuários Ativos</p>
                  <p className="text-xl font-bold text-white">{summary.by_user?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#C8A951]/30 rounded-lg">
                  <Lock className="w-5 h-5 text-[#C8A951]" />
                </div>
                <div>
                  <p className="text-sm text-[#A1A1AA]">Fechamentos</p>
                  <p className="text-xl font-bold text-white">
                    {summary.by_action?.find(a => a._id === 'competencia.fechar')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A]">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-[#1A1A1A]"
          >
            <span className="flex items-center gap-2 font-medium">
              <Filter className="w-5 h-5 text-[#C8A951]" />
              Filtros
            </span>
            {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showFilters && (
            <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Tipo de Ação</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({...filters, action: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white"
                >
                  <option value="">Todas</option>
                  {Object.entries(availableActions).map(([category, actions]) => (
                    <optgroup key={category} label={category}>
                      {actions.map(action => (
                        <option key={action.value} value={action.value}>{action.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Data Inicial</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Data Final</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Status</label>
                <select
                  value={filters.success_only === null ? '' : filters.success_only.toString()}
                  onChange={(e) => setFilters({...filters, success_only: e.target.value === '' ? null : e.target.value === 'true'})}
                  className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white"
                >
                  <option value="">Todos</option>
                  <option value="true">Sucesso</option>
                  <option value="false">Falha</option>
                </select>
              </div>
              
              <div className="flex items-end gap-2">
                <button
                  onClick={handleFilter}
                  className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#b39642]"
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Filtrar
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A]"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Logs */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C8A951]"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-[#141414] rounded-xl p-8 text-center border border-[#2A2A2A]">
            <History className="w-12 h-12 mx-auto mb-4 text-[#A1A1AA] opacity-50" />
            <p className="text-[#A1A1AA]">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[#A1A1AA] bg-[#0C0C0C] border-b border-[#2A2A2A]">
                    <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                    <th className="text-left px-4 py-3 font-medium">Usuário</th>
                    <th className="text-left px-4 py-3 font-medium">Empresa</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id || idx} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]">
                      <td className="px-4 py-3 text-sm text-[#A1A1AA]">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#C8A951]">{getActionIcon(log.action)}</span>
                          <span className="text-white text-sm">{getActionLabel(log.action)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {log.user_email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#A1A1AA]">
                        {log.company_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            OK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            Falha
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#A1A1AA] max-w-xs truncate">
                        {log.error_message || (log.details && Object.keys(log.details).length > 0 
                          ? JSON.stringify(log.details).substring(0, 50) + '...'
                          : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginação */}
            <div className="px-4 py-3 bg-[#0C0C0C] flex items-center justify-between border-t border-[#2A2A2A]">
              <span className="text-sm text-[#A1A1AA]">
                Mostrando {skip + 1} - {Math.min(skip + limit, total)} de {total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  className="px-3 py-1 bg-[#2A2A2A] text-white rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setSkip(skip + limit)}
                  disabled={!hasMore}
                  className="px-3 py-1 bg-[#2A2A2A] text-white rounded disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AuditLog;
