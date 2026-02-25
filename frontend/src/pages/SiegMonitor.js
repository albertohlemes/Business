import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Cloud, CheckCircle2, XCircle, AlertTriangle, RefreshCw, 
  Building2, FileText, Calendar, Clock, Settings, Play,
  ChevronRight, ChevronDown, Download, Activity, TrendingUp,
  FileX, Loader2, Search, Filter, Info, Zap, CheckCircle,
  AlertCircle, ArrowRight, History
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SiegMonitor = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [painelGeral, setPainelGeral] = useState(null);
  const [painelEmpresa, setPainelEmpresa] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [cancelados, setCancelados] = useState([]);
  const [siegStatus, setSiegStatus] = useState(null);
  const [configModal, setConfigModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [configForm, setConfigForm] = useState({
    ativo: false,
    sync_automatico: false,
    frequencia: 'diario',
    hora_sync: '06:00',
    competencias_retroativas: 3
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // NOVO: Estado para configuração de horários globais
  const [configHorarios, setConfigHorarios] = useState(null);
  const [horarioModal, setHorarioModal] = useState(false);
  const [novoHorario, setNovoHorario] = useState('03:00');

  // Buscar dados do painel geral
  const fetchPainelGeral = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sieg/painel`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPainelGeral(response.data);
    } catch (err) {
      console.error('Erro ao carregar painel SIEG:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar dados de uma empresa específica
  const fetchPainelEmpresa = useCallback(async (companyId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [painelRes, historicoRes, canceladosRes] = await Promise.all([
        axios.get(`${API}/sieg/painel/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/sieg/historico/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/sieg/cancelados/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setPainelEmpresa(painelRes.data);
      setHistorico(historicoRes.data.historico || []);
      setCancelados(canceladosRes.data.cancelados || []);
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar status da integração SIEG
  const fetchSiegStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sieg/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSiegStatus(response.data);
    } catch (err) {
      console.error('Erro ao verificar status SIEG:', err);
    }
  }, []);

  useEffect(() => {
    fetchPainelGeral();
    fetchSiegStatus();
    fetchConfigHorarios();
  }, [fetchPainelGeral, fetchSiegStatus]);

  useEffect(() => {
    if (selectedEmpresa) {
      fetchPainelEmpresa(selectedEmpresa.company_id);
    }
  }, [selectedEmpresa, fetchPainelEmpresa]);

  // Buscar configuração de horários
  const fetchConfigHorarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sieg/config-horarios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfigHorarios(response.data);
      setNovoHorario(response.data.horario_diario || '03:00');
    } catch (err) {
      console.error('Erro ao carregar configuração de horários:', err);
    }
  };

  // Salvar configuração de horários
  const saveConfigHorarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('horario_diario', novoHorario);
      
      await axios.post(`${API}/sieg/config-horarios`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setHorarioModal(false);
      fetchConfigHorarios();
      fetchSiegStatus();
    } catch (err) {
      console.error('Erro ao salvar horário:', err);
      alert('Erro ao salvar horário. Verifique o formato (HH:MM)');
    }
  };

  // Salvar configuração de uma empresa
  const saveConfig = async () => {
    if (!selectedEmpresa) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/sieg/config/${selectedEmpresa.company_id}`, configForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfigModal(false);
      fetchPainelGeral();
      if (selectedEmpresa) {
        fetchPainelEmpresa(selectedEmpresa.company_id);
      }
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
    }
  };

  // Iniciar sincronização manual
  const startSync = async (companyId) => {
    setSyncInProgress(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/sieg/sync/${companyId}?competencia=${selectedCompetencia}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Recarregar dados após sync
      await fetchPainelGeral();
      if (selectedEmpresa && selectedEmpresa.company_id === companyId) {
        await fetchPainelEmpresa(companyId);
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncInProgress(false);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Formatar CNPJ
  const formatCNPJ = (cnpj) => {
    if (!cnpj) return '-';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Filtrar empresas
  const filteredEmpresas = (painelGeral?.empresas || []).filter(emp => {
    const matchSearch = emp.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        emp.cnpj?.includes(searchTerm);
    const matchFilter = filterStatus === 'all' ||
                        (filterStatus === 'active' && emp.sieg_ativo) ||
                        (filterStatus === 'inactive' && !emp.sieg_ativo) ||
                        (filterStatus === 'auto' && emp.sync_automatico);
    return matchSearch && matchFilter;
  });

  // Status badge component
  const StatusBadge = ({ status }) => {
    if (status === 'sucesso') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> Sucesso
        </span>
      );
    }
    if (status === 'erro' || status === 'falha') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3" /> Erro
        </span>
      );
    }
    if (status === 'em_andamento') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" /> Em Andamento
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
        <AlertCircle className="w-3 h-3" /> {status || 'Pendente'}
      </span>
    );
  };

  // Tab button component
  const TabButton = ({ id, icon: Icon, label, active }) => (
    <button
      onClick={() => setActiveTab(id)}
      data-testid={`tab-${id}`}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        active 
          ? 'bg-[#C8A951] text-black font-medium' 
          : 'text-[#A1A1AA] hover:bg-[#1A1A1A] hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="sieg-monitor-page" className="space-y-6">
        {/* Header */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C8A951] to-[#E8D591] flex items-center justify-center">
                <Cloud className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Integração SIEG
                </h1>
                <p className="text-[#A1A1AA] text-sm mt-1">
                  Monitor de sincronização automática de XMLs
                </p>
              </div>
            </div>
            
            {/* Status da API */}
            <div className="flex items-center gap-4">
              {siegStatus && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]">
                  {siegStatus.status === 'ok' ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-sm">API Conectada</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-amber-400 text-sm">
                        {siegStatus.message || 'Verificando...'}
                      </span>
                    </>
                  )}
                </div>
              )}
              
              <button
                onClick={fetchPainelGeral}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:bg-[#252525] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              
              {/* Botão de configurar horário */}
              <button
                onClick={() => setHorarioModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8A951]/20 border border-[#C8A951]/30 text-[#C8A951] hover:bg-[#C8A951]/30 transition-all"
                title="Configurar horário de sincronização"
              >
                <Clock className="w-4 h-4" />
                {configHorarios?.horario_diario || '03:00'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-[#141414] border border-[#2A2A2A] rounded-lg p-2">
          <TabButton id="overview" icon={Activity} label="Visão Geral" active={activeTab === 'overview'} />
          <TabButton id="empresas" icon={Building2} label="Empresas" active={activeTab === 'empresas'} />
          <TabButton id="historico" icon={History} label="Histórico" active={activeTab === 'historico'} />
          <TabButton id="cancelados" icon={FileX} label="Cancelados" active={activeTab === 'cancelados'} />
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-[#A1A1AA] text-sm">Total Empresas</span>
                </div>
                <p className="text-3xl font-bold text-white">{painelGeral?.total_empresas || 0}</p>
              </div>
              
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[#A1A1AA] text-sm">SIEG Ativo</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">{painelGeral?.empresas_com_sieg || 0}</p>
              </div>
              
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-[#A1A1AA] text-sm">Sync Automático</span>
                </div>
                <p className="text-3xl font-bold text-amber-400">{painelGeral?.empresas_sync_auto || 0}</p>
              </div>
              
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-[#A1A1AA] text-sm">Docs Importados</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {(painelGeral?.empresas || []).reduce((acc, e) => acc + (e.total_docs_sieg || 0), 0)}
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#141414] border border-[#2A2A2A] rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Como funciona a integração SIEG?</h3>
                  <ul className="space-y-2 text-[#A1A1AA] text-sm">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      A integração busca automaticamente XMLs de NF-e, NFS-e e CT-e do cofre SIEG
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      Configure a frequência de sincronização: diária, a cada 12h ou 6h
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      Notas canceladas e inutilizadas são detectadas e marcadas automaticamente
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      Documentos duplicados são ignorados para evitar reprocessamento
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('empresas')}
                className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5 text-left hover:border-[#C8A951]/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-[#C8A951]" />
                    <span className="text-white font-medium">Configurar Empresas</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A951] transition-colors" />
                </div>
                <p className="text-[#A1A1AA] text-sm mt-2">
                  Ative ou desative a sincronização automática para cada empresa
                </p>
              </button>
              
              <button
                onClick={() => setActiveTab('historico')}
                className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5 text-left hover:border-[#C8A951]/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-[#C8A951]" />
                    <span className="text-white font-medium">Ver Histórico</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A951] transition-colors" />
                </div>
                <p className="text-[#A1A1AA] text-sm mt-2">
                  Veja o histórico completo de sincronizações e logs de execução
                </p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'empresas' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
                <input
                  type="text"
                  placeholder="Buscar por razão social ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:border-[#C8A951]/50 focus:outline-none"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951]/50 focus:outline-none"
              >
                <option value="all">Todas</option>
                <option value="active">SIEG Ativo</option>
                <option value="inactive">SIEG Inativo</option>
                <option value="auto">Sync Automático</option>
              </select>
            </div>

            {/* Empresas List */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Última Sync</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Docs SIEG</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Cancelados</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#A1A1AA] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {filteredEmpresas.map((empresa) => (
                    <tr key={empresa.company_id} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-white font-medium">{empresa.razao_social}</p>
                          <p className="text-[#666] text-sm">{formatCNPJ(empresa.cnpj)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {empresa.sieg_ativo ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                              <CheckCircle className="w-4 h-4" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#666] text-sm">
                              <XCircle className="w-4 h-4" /> Inativo
                            </span>
                          )}
                          {empresa.sync_automatico && (
                            <span className="text-xs text-amber-400">
                              Sync: {empresa.frequencia_sync || 'diário'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {empresa.ultima_sync ? (
                          <div>
                            <p className="text-white text-sm">{formatDate(empresa.ultima_sync)}</p>
                            <StatusBadge status={empresa.ultima_sync_status} />
                          </div>
                        ) : (
                          <span className="text-[#666] text-sm">Nunca sincronizado</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-white font-medium">{empresa.total_docs_sieg || 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={empresa.total_cancelados > 0 ? 'text-amber-400' : 'text-[#666]'}>
                          {empresa.total_cancelados || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedEmpresa(empresa);
                              setConfigForm({
                                ativo: empresa.sieg_ativo,
                                sync_automatico: empresa.sync_automatico,
                                frequencia: empresa.frequencia_sync || 'diario',
                                hora_sync: '06:00',
                                competencias_retroativas: 3
                              });
                              setConfigModal(true);
                            }}
                            className="p-2 rounded-lg bg-[#1A1A1A] text-[#A1A1AA] hover:text-white hover:bg-[#252525] transition-all"
                            title="Configurar"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startSync(empresa.company_id)}
                            disabled={syncInProgress}
                            className="p-2 rounded-lg bg-[#C8A951]/20 text-[#C8A951] hover:bg-[#C8A951]/30 transition-all disabled:opacity-50"
                            title="Sincronizar agora"
                          >
                            {syncInProgress ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmpresa(empresa);
                              setActiveTab('historico');
                            }}
                            className="p-2 rounded-lg bg-[#1A1A1A] text-[#A1A1AA] hover:text-white hover:bg-[#252525] transition-all"
                            title="Ver histórico"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredEmpresas.length === 0 && (
                <div className="p-8 text-center text-[#A1A1AA]">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Nenhuma empresa encontrada com os filtros aplicados'
                    : 'Nenhuma empresa cadastrada'
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            {selectedEmpresa ? (
              <>
                {/* Empresa Header */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-[#C8A951]" />
                      <div>
                        <p className="text-white font-medium">{selectedEmpresa.razao_social}</p>
                        <p className="text-[#666] text-sm">{formatCNPJ(selectedEmpresa.cnpj)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmpresa(null)}
                      className="text-[#A1A1AA] hover:text-white text-sm"
                    >
                      Ver todas empresas
                    </button>
                  </div>
                </div>

                {/* Stats da Empresa */}
                {painelEmpresa && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
                      <p className="text-[#A1A1AA] text-sm">Docs via SIEG</p>
                      <p className="text-2xl font-bold text-white">{painelEmpresa.estatisticas?.total_sieg || 0}</p>
                    </div>
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
                      <p className="text-[#A1A1AA] text-sm">Docs Manuais</p>
                      <p className="text-2xl font-bold text-white">{painelEmpresa.estatisticas?.total_manual || 0}</p>
                    </div>
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
                      <p className="text-[#A1A1AA] text-sm">Classificados</p>
                      <p className="text-2xl font-bold text-emerald-400">{painelEmpresa.estatisticas?.total_classificados || 0}</p>
                    </div>
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
                      <p className="text-[#A1A1AA] text-sm">Frequência</p>
                      <p className="text-2xl font-bold text-[#C8A951]">{painelEmpresa.config?.frequencia || 'Manual'}</p>
                    </div>
                  </div>
                )}

                {/* Histórico Table */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#1A1A1A]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Competência</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Encontrados</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Importados</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Duplicados</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Erros</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#A1A1AA] uppercase">Duração</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {historico.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors">
                          <td className="px-4 py-3 text-white text-sm">{formatDate(item.data)}</td>
                          <td className="px-4 py-3 text-white text-sm">{item.competencia || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                          <td className="px-4 py-3 text-center text-white">{item.total_encontrados || 0}</td>
                          <td className="px-4 py-3 text-center text-emerald-400">{item.total_importados || 0}</td>
                          <td className="px-4 py-3 text-center text-amber-400">{item.total_duplicados || 0}</td>
                          <td className="px-4 py-3 text-center text-red-400">{item.total_erros || 0}</td>
                          <td className="px-4 py-3 text-right text-[#A1A1AA] text-sm">
                            {item.duracao_segundos ? `${item.duracao_segundos}s` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {historico.length === 0 && (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      Nenhuma sincronização registrada para esta empresa
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-8 text-center">
                <History className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Selecione uma empresa</p>
                <p className="text-[#A1A1AA] text-sm mb-4">
                  Clique no botão de histórico de uma empresa na aba "Empresas" para ver detalhes
                </p>
                <button
                  onClick={() => setActiveTab('empresas')}
                  className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#D4B962] transition-all"
                >
                  Ver Empresas
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cancelados' && (
          <div className="space-y-4">
            {selectedEmpresa ? (
              <>
                {/* Empresa Header */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-[#C8A951]" />
                      <div>
                        <p className="text-white font-medium">{selectedEmpresa.razao_social}</p>
                        <p className="text-[#666] text-sm">{formatCNPJ(selectedEmpresa.cnpj)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmpresa(null)}
                      className="text-[#A1A1AA] hover:text-white text-sm"
                    >
                      Ver todas empresas
                    </button>
                  </div>
                </div>

                {/* Cancelados Table */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#1A1A1A]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Número</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Emitente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Situação</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#A1A1AA] uppercase">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {cancelados.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-white text-sm">{doc.numero_nfe || '-'}</p>
                              <p className="text-[#666] text-xs truncate max-w-[200px]">{doc.chave_acesso}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white text-sm">{doc.emitente?.razao_social || '-'}</td>
                          <td className="px-4 py-3 text-[#A1A1AA] text-sm">
                            {doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                              <FileX className="w-3 h-3" />
                              {doc.situacao || 'Cancelada'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.valor_total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {cancelados.length === 0 && (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                      <p className="text-white font-medium">Nenhuma nota cancelada</p>
                      <p className="text-[#A1A1AA] text-sm mt-1">
                        Todas as notas desta empresa estão ativas
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-8 text-center">
                <FileX className="w-12 h-12 text-[#A1A1AA] mx-auto mb-4" />
                <p className="text-white font-medium mb-2">Selecione uma empresa</p>
                <p className="text-[#A1A1AA] text-sm mb-4">
                  Clique no botão de histórico de uma empresa na aba "Empresas" para ver notas canceladas
                </p>
                <button
                  onClick={() => setActiveTab('empresas')}
                  className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#D4B962] transition-all"
                >
                  Ver Empresas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Config Modal */}
        {configModal && selectedEmpresa && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfigModal(false)}>
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-white mb-1">Configurar SIEG</h3>
              <p className="text-[#A1A1AA] text-sm mb-6">{selectedEmpresa.razao_social}</p>
              
              <div className="space-y-4">
                {/* Ativar SIEG */}
                <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg">
                  <div>
                    <p className="text-white font-medium">Integração SIEG</p>
                    <p className="text-[#A1A1AA] text-sm">Habilitar busca automática de XMLs</p>
                  </div>
                  <button
                    onClick={() => setConfigForm({ ...configForm, ativo: !configForm.ativo })}
                    className={`w-12 h-6 rounded-full transition-all ${configForm.ativo ? 'bg-[#C8A951]' : 'bg-[#333]'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-all ${configForm.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Sync Automático */}
                <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg">
                  <div>
                    <p className="text-white font-medium">Sincronização Automática</p>
                    <p className="text-[#A1A1AA] text-sm">Executar busca periodicamente</p>
                  </div>
                  <button
                    onClick={() => setConfigForm({ ...configForm, sync_automatico: !configForm.sync_automatico })}
                    className={`w-12 h-6 rounded-full transition-all ${configForm.sync_automatico ? 'bg-[#C8A951]' : 'bg-[#333]'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-all ${configForm.sync_automatico ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Frequência */}
                {configForm.sync_automatico && (
                  <div className="p-4 bg-[#1A1A1A] rounded-lg">
                    <p className="text-white font-medium mb-3">Frequência</p>
                    <select
                      value={configForm.frequencia}
                      onChange={(e) => setConfigForm({ ...configForm, frequencia: e.target.value })}
                      className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951]/50 focus:outline-none"
                    >
                      <option value="diario">Diário (1x ao dia)</option>
                      <option value="12h">A cada 12 horas</option>
                      <option value="6h">A cada 6 horas</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                )}

                {/* Hora de Sync */}
                {configForm.sync_automatico && configForm.frequencia === 'diario' && (
                  <div className="p-4 bg-[#1A1A1A] rounded-lg">
                    <p className="text-white font-medium mb-3">Horário</p>
                    <input
                      type="time"
                      value={configForm.hora_sync}
                      onChange={(e) => setConfigForm({ ...configForm, hora_sync: e.target.value })}
                      className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951]/50 focus:outline-none"
                    />
                  </div>
                )}

                {/* Competências Retroativas */}
                <div className="p-4 bg-[#1A1A1A] rounded-lg">
                  <p className="text-white font-medium mb-3">Competências Retroativas</p>
                  <p className="text-[#A1A1AA] text-sm mb-2">Quantos meses anteriores sincronizar</p>
                  <select
                    value={configForm.competencias_retroativas}
                    onChange={(e) => setConfigForm({ ...configForm, competencias_retroativas: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951]/50 focus:outline-none"
                  >
                    <option value={1}>1 mês</option>
                    <option value={3}>3 meses</option>
                    <option value={6}>6 meses</option>
                    <option value={12}>12 meses</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfigModal(false)}
                  className="flex-1 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#252525] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveConfig}
                  className="flex-1 px-4 py-2 bg-[#C8A951] text-black font-medium rounded-lg hover:bg-[#D4B962] transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-6 flex items-center gap-4">
              <Loader2 className="w-6 h-6 text-[#C8A951] animate-spin" />
              <span className="text-white">Carregando...</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SiegMonitor;
