import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { 
  Cloud, CheckCircle2, XCircle, AlertTriangle, RefreshCw, 
  Building2, FileText, Calendar, Clock, Settings, Play,
  ChevronRight, ChevronDown, Download, Activity, TrendingUp,
  FileX, Loader2, Search, Filter, Info, Zap, CheckCircle,
  AlertCircle, ArrowRight, History, ArrowDownCircle, ArrowUpCircle, X
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
  
  // NOVO: Modal de relatório detalhado
  const [relatorioModal, setRelatorioModal] = useState({ open: false, syncId: null, item: null });
  const [relatorioData, setRelatorioData] = useState(null);
  const [relatorioLoading, setRelatorioLoading] = useState(false);
  
  // NOVO: Estado para verificação de CNPJ no SIEG
  const [cnpjStatus, setCnpjStatus] = useState(null);
  const [verificandoCnpj, setVerificandoCnpj] = useState(false);

  // Verificar status do CNPJ no SIEG
  const verificarCnpjSieg = useCallback(async (companyId) => {
    if (!companyId) return;
    
    setVerificandoCnpj(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sieg/verificar-cnpj/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCnpjStatus(response.data);
      
      if (!response.data.success) {
        toast.warning(
          <div className="space-y-1">
            <p className="font-semibold">⚠️ CNPJ não autorizado no SIEG</p>
            <p className="text-sm">{response.data.mensagem}</p>
          </div>,
          { duration: 10000 }
        );
      }
    } catch (err) {
      console.error('Erro ao verificar CNPJ:', err);
      setCnpjStatus(null);
    } finally {
      setVerificandoCnpj(false);
    }
  }, []);

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
      // CORRIGIDO: Passar competência para filtrar estatísticas
      const competenciaParam = selectedCompetencia ? `?competencia=${encodeURIComponent(selectedCompetencia)}` : '';
      
      const [painelRes, historicoRes, canceladosRes] = await Promise.all([
        axios.get(`${API}/sieg/painel/${companyId}${competenciaParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/sieg/historico/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/sieg/cancelados/${companyId}${competenciaParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setPainelEmpresa(painelRes.data);
      setHistorico(historicoRes.data.historico || []);
      setCancelados(canceladosRes.data.cancelados || []);
      // Atualizar empresa selecionada para o modal de relatório
      setSelectedEmpresa(painelRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompetencia]);

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
    // Se tem empresa selecionada no contexto, carrega dados dela automaticamente
    if (selectedCompany?.id) {
      fetchPainelEmpresa(selectedCompany.id);
    }
    fetchSiegStatus();
    fetchConfigHorarios();
  }, [selectedCompany, selectedCompetencia, fetchSiegStatus, fetchPainelEmpresa]);

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
    // Determinar a competência a usar (selecionada ou atual)
    const competenciaToUse = selectedCompetencia || (() => {
      const now = new Date();
      return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    })();
    
    setSyncInProgress(true);
    toast.info('🔄 Sincronização iniciada... Isso pode levar alguns minutos.', { duration: 5000 });
    
    try {
      const token = localStorage.getItem('token');
      
      // Usar FormData como esperado pelo endpoint
      const formData = new FormData();
      formData.append('competencia', competenciaToUse);
      
      const response = await axios.post(
        `${API}/sieg/sync/${companyId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Extrair estatísticas do resultado
      const result = response.data;
      const totalImportados = result.total_importados || 0;
      const totalDuplicados = result.total_duplicados || 0;
      const totalErros = result.total_erros || 0;
      
      if (totalErros > 0) {
        toast.warning(`⚠️ Sincronização parcial: ${totalImportados} importados, ${totalDuplicados} já existiam, ${totalErros} erros`, { duration: 8000 });
      } else if (totalImportados > 0) {
        toast.success(`✅ Sincronização concluída! ${totalImportados} documentos importados, ${totalDuplicados} já existiam.`, { duration: 6000 });
      } else if (totalDuplicados > 0) {
        toast.info(`ℹ️ Todos os ${totalDuplicados} documentos já existiam no sistema.`, { duration: 5000 });
      } else {
        toast.info('ℹ️ Nenhum documento novo encontrado no SIEG.', { duration: 5000 });
      }
      
      // Recarregar dados após sync
      await fetchPainelGeral();
      if (selectedCompany) {
        await fetchPainelEmpresa(selectedCompany.id);
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      
      // Tratar erro específico de CNPJ não cadastrado no SIEG
      const errorDetail = err.response?.data?.detail;
      if (errorDetail?.code === 'CNPJ_NAO_CADASTRADO_SIEG') {
        toast.error(
          <div className="space-y-2">
            <p className="font-semibold">❌ CNPJ não cadastrado no SIEG</p>
            <p className="text-sm">{errorDetail.message}</p>
            <p className="text-xs text-yellow-300 whitespace-pre-line">{errorDetail.instrucoes}</p>
          </div>,
          { duration: 15000 }
        );
      } else if (typeof errorDetail === 'object' && errorDetail?.message) {
        toast.error(`❌ ${errorDetail.message}`);
      } else {
        toast.error('❌ Erro ao sincronizar: ' + (errorDetail || err.message));
      }
    } finally {
      setSyncInProgress(false);
    }
  };

  // NOVO: Buscar relatório detalhado de uma sincronização
  const fetchRelatorio = async (syncId) => {
    // CORRIGIDO: Usar selectedCompany do contexto ou painelEmpresa
    const companyId = selectedCompany?.id || painelEmpresa?.empresa?.id;
    if (!companyId || !syncId) {
      console.error('Falta company_id ou syncId para buscar relatório');
      return;
    }
    
    setRelatorioLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/sieg/relatorio-sync/${companyId}/${syncId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRelatorioData(response.data);
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
      setRelatorioData(null);
    } finally {
      setRelatorioLoading(false);
    }
  };
  
  // Efeito para buscar relatório quando modal abre
  useEffect(() => {
    if (relatorioModal.open && relatorioModal.syncId) {
      fetchRelatorio(relatorioModal.syncId);
    } else {
      setRelatorioData(null);
    }
  }, [relatorioModal.open, relatorioModal.syncId]);

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
                  {selectedCompany?.razao_social || 'Selecione uma empresa'}
                  {selectedCompetencia && ` • ${selectedCompetencia}`}
                </p>
              </div>
            </div>
            
            {/* Status e Ações */}
            <div className="flex items-center gap-4">
              {siegStatus && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]">
                  {siegStatus.running ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-sm">Scheduler Ativo</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-amber-400 text-sm">Scheduler Parado</span>
                    </>
                  )}
                </div>
              )}
              
              {selectedCompany && (
                <button
                  onClick={() => startSync(selectedCompany.id)}
                  disabled={loading || syncInProgress}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8A951] text-black font-medium hover:bg-[#B8994A] transition-all disabled:opacity-50"
                >
                  {syncInProgress ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Sincronizar Agora
                </button>
              )}
              
              <button
                onClick={() => selectedCompany && fetchPainelEmpresa(selectedCompany.id)}
                disabled={loading || !selectedCompany}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:bg-[#252525] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              
              {/* Botão de configurar horário */}
              <button
                onClick={() => setHorarioModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#A1A1AA] hover:bg-[#252525] transition-all"
                title="Configurar horário de sincronização"
              >
                <Clock className="w-4 h-4" />
                {configHorarios?.horario_diario || '03:00'}
              </button>
            </div>
          </div>
        </div>

        {/* Banner de Sincronização em Progresso */}
        {syncInProgress && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">Sincronização em andamento...</h4>
                <p className="text-purple-300 text-sm">
                  Baixando XMLs do cofre SIEG. Isso pode levar alguns minutos dependendo da quantidade de documentos.
                </p>
              </div>
              <div className="text-purple-400 animate-pulse">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Verificar se tem empresa selecionada */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-12 text-center">
            <Building2 className="w-12 h-12 text-[#666] mx-auto mb-4" />
            <p className="text-[#A1A1AA] text-lg mb-2">Nenhuma empresa selecionada</p>
            <p className="text-[#666] text-sm">
              Selecione uma empresa no topo da página para ver o status da integração SIEG
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 bg-[#141414] border border-[#2A2A2A] rounded-lg p-2">
              <TabButton id="overview" icon={Activity} label="Status" active={activeTab === 'overview'} />
              <TabButton id="historico" icon={History} label="Histórico de Sincronizações" active={activeTab === 'historico'} />
              <TabButton id="cancelados" icon={FileX} label="Notas Canceladas" active={activeTab === 'cancelados'} />
            </div>

            {/* Content based on active tab */}
            {activeTab === 'overview' && painelEmpresa && (
          <div className="space-y-6">
            {/* Status da Integração */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card de Configuração */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#C8A951]" />
                  Configuração da Integração
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A1A1A]">
                    <span className="text-[#A1A1AA]">Integração SIEG</span>
                    {painelEmpresa.config?.sieg_ativo ? (
                      <span className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-400">
                        <XCircle className="w-4 h-4" /> Inativa
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A1A1A]">
                    <span className="text-[#A1A1AA]">Sincronização Automática</span>
                    {painelEmpresa.config?.sync_automatico ? (
                      <span className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-[#666]">
                        <XCircle className="w-4 h-4" /> Desativada
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A1A1A]">
                    <span className="text-[#A1A1AA]">Frequência</span>
                    <span className="text-white capitalize">
                      {painelEmpresa.config?.frequencia === '6h' ? 'A cada 6 horas' :
                       painelEmpresa.config?.frequencia === '12h' ? 'A cada 12 horas' :
                       'Diária'}
                    </span>
                  </div>
                </div>
                
                {!painelEmpresa.config?.sieg_ativo && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Para ativar a integração SIEG, edite a empresa no menu "Empresas"
                    </p>
                  </div>
                )}
              </div>
              
              {/* Card de Estatísticas */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#C8A951]" />
                  Estatísticas {selectedCompetencia && <span className="text-sm text-[#A1A1AA] font-normal">({selectedCompetencia})</span>}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#1A1A1A] text-center">
                    <p className="text-3xl font-bold text-emerald-400">
                      {painelEmpresa.estatisticas?.total_sieg || 0}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">Docs via SIEG</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-[#1A1A1A] text-center">
                    <p className="text-3xl font-bold text-blue-400">
                      {painelEmpresa.estatisticas?.total_manual || 0}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">Docs Manuais</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-[#1A1A1A] text-center">
                    <p className="text-3xl font-bold text-purple-400">
                      {painelEmpresa.estatisticas?.total_classificados || 0}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">Classificados</p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-[#1A1A1A] text-center">
                    <p className="text-3xl font-bold text-white">
                      {(painelEmpresa.estatisticas?.total_sieg || 0) + (painelEmpresa.estatisticas?.total_manual || 0)}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">Total Docs</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* NOVO: Card de Cobertura de Importação SIEG */}
            {painelEmpresa.estatisticas?.data_ultima_nf_importada && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#C8A951]" />
                  Cobertura de Importação SIEG
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-[#1A1A1A]">
                    <p className="text-[#A1A1AA] text-sm mb-1">Última NF Importada</p>
                    <p className="text-white text-lg font-medium">
                      NF {painelEmpresa.estatisticas?.numero_ultima_nf_importada || '-'}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-[#1A1A1A]">
                    <p className="text-[#A1A1AA] text-sm mb-1">Data de Emissão</p>
                    <p className="text-emerald-400 text-lg font-medium">
                      {painelEmpresa.estatisticas?.data_ultima_nf_importada 
                        ? new Date(painelEmpresa.estatisticas.data_ultima_nf_importada).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-[#1A1A1A]">
                    <p className="text-[#A1A1AA] text-sm mb-1">Status da Cobertura</p>
                    {(() => {
                      const dataUltimaNF = painelEmpresa.estatisticas?.data_ultima_nf_importada;
                      if (!dataUltimaNF) return <p className="text-[#666]">-</p>;
                      
                      const hoje = new Date();
                      const ultimaNF = new Date(dataUltimaNF);
                      const diasAtras = Math.floor((hoje - ultimaNF) / (1000 * 60 * 60 * 24));
                      
                      if (diasAtras <= 2) {
                        return <p className="text-emerald-400 text-lg font-medium flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" /> Atualizado
                        </p>;
                      } else if (diasAtras <= 7) {
                        return <p className="text-amber-400 text-lg font-medium flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" /> {diasAtras} dias atrás
                        </p>;
                      } else {
                        return <p className="text-red-400 text-lg font-medium flex items-center gap-2">
                          <XCircle className="w-5 h-5" /> {diasAtras} dias atrás
                        </p>;
                      }
                    })()}
                  </div>
                </div>
                
                {/* Nota: Devoluções são analisadas no Wizard de Fechamento por competência */}
              </div>
            )}
            
            {/* Última Sincronização */}
            {painelEmpresa.historico_sync?.length > 0 && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-6">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#C8A951]" />
                  Última Sincronização
                </h3>
                
                {(() => {
                  const ultima = painelEmpresa.historico_sync[0];
                  return (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1A1A]">
                      <div className="flex items-center gap-4">
                        <StatusBadge status={ultima.status} />
                        <div>
                          <p className="text-white">
                            {ultima.total_importados} documentos importados
                          </p>
                          <p className="text-xs text-[#666]">
                            Competência: {ultima.competencia}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#A1A1AA]">
                          {ultima.data ? new Date(ultima.data).toLocaleString('pt-BR') : '-'}
                        </p>
                        <p className="text-xs text-[#666]">
                          Duração: {ultima.duracao_segundos || 0}s
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

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
                      A integração busca automaticamente XMLs de NF-e do cofre SIEG
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      XMLs baixados passam pelo rito completo: classificação, devoluções e cancelamentos
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      O horário da sincronização automática pode ser configurado (atual: {configHorarios?.horario_diario || '03:00'})
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-[#C8A951]" />
                      Documentos duplicados são ignorados automaticamente
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            {/* Histórico Table */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Competência</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#A1A1AA] uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Modo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Encontrados</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Novos</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Duplicados</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Importados</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Devol.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#A1A1AA] uppercase">Duração</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[#A1A1AA] uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {(painelEmpresa?.historico_sync || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="px-4 py-3 text-white text-sm">
                        {item.data_sync ? new Date(item.data_sync).toLocaleString('pt-BR') : 
                         item.data ? new Date(item.data).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">{item.competencia || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.modo === 'incremental' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {item.modo === 'incremental' ? 'Incremental' : 'Full'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white">{item.total_encontrados || 0}</td>
                      <td className="px-4 py-3 text-center text-emerald-400">{item.total_novos || 0}</td>
                      <td className="px-4 py-3 text-center text-yellow-400">{item.total_duplicados || 0}</td>
                      <td className="px-4 py-3 text-center text-emerald-400 font-medium">{item.total_importados || 0}</td>
                      <td className="px-4 py-3 text-center text-orange-400">{item.total_devolucoes || 0}</td>
                      <td className="px-4 py-3 text-right text-[#A1A1AA] text-sm">
                        {item.duracao_segundos ? `${item.duracao_segundos}s` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.tem_relatorio && (
                          <button
                            onClick={() => setRelatorioModal({ open: true, syncId: item.id, item })}
                            className="px-2 py-1 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/30 rounded hover:bg-purple-500/20 transition-all"
                          >
                            Ver Relatório
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Legenda */}
              <div className="px-4 py-3 bg-[#1A1A1A] border-t border-[#2A2A2A]">
                <div className="flex flex-wrap gap-4 text-xs text-[#A1A1AA]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-blue-400"></span> Incremental: Só busca docs novos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-yellow-400"></span> Duplicados: XMLs já importados (ignorados)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-orange-400"></span> Devoluções: Notas anuladas por devolução de fornecedor
                  </span>
                </div>
              </div>
              
              {(!painelEmpresa?.historico_sync || painelEmpresa.historico_sync.length === 0) && (
                <div className="p-8 text-center text-[#A1A1AA]">
                  Nenhuma sincronização registrada para esta empresa
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'cancelados' && (
          <div className="space-y-4">
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
                  {(painelEmpresa?.cancelados || cancelados || []).map((doc, idx) => (
                    <tr key={idx} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="px-4 py-3 text-white">{doc.numero_nfe || '-'}</td>
                      <td className="px-4 py-3 text-white text-sm">{doc.emitente?.razao_social || '-'}</td>
                      <td className="px-4 py-3 text-[#A1A1AA] text-sm">
                        {doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 capitalize">
                          {doc.situacao || 'cancelada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {doc.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {(!painelEmpresa?.cancelados?.length && !cancelados?.length) && (
                <div className="p-8 text-center text-[#A1A1AA]">
                  <FileX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma nota cancelada ou inutilizada encontrada</p>
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )}

        {/* Config Modal - Ainda útil para editar via modal se necessário */}
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

        {/* Modal de Configuração de Horário Global */}
        {horarioModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setHorarioModal(false)}>
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#C8A951]/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#C8A951]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Horário de Sincronização</h3>
                  <p className="text-[#A1A1AA] text-sm">Configure o horário da importação automática</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-[#1A1A1A] rounded-lg">
                  <p className="text-white font-medium mb-3">Horário da Sincronização Diária</p>
                  <p className="text-[#A1A1AA] text-sm mb-3">
                    Todos os XMLs de todas as empresas serão importados neste horário
                  </p>
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="w-full px-4 py-3 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white text-lg focus:border-[#C8A951]/50 focus:outline-none"
                  />
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    <strong>Dica:</strong> Configure para a madrugada (ex: 03:00) para que ao chegar pela manhã todos os documentos já estejam importados e classificados.
                  </p>
                </div>

                {configHorarios && (
                  <div className="p-4 bg-[#1A1A1A] rounded-lg">
                    <p className="text-[#A1A1AA] text-sm mb-2">Horários calculados automaticamente:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-[#666]">Diário:</span>
                        <span className="text-white ml-2">{configHorarios.horario_diario}</span>
                      </div>
                      <div>
                        <span className="text-[#666]">12h:</span>
                        <span className="text-white ml-2">{configHorarios.horarios_12h?.join(', ')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#666]">6h:</span>
                        <span className="text-white ml-2">{configHorarios.horarios_6h?.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setHorarioModal(false)}
                  className="flex-1 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#252525] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveConfigHorarios}
                  className="flex-1 px-4 py-2 bg-[#C8A951] text-black font-medium rounded-lg hover:bg-[#D4B962] transition-all"
                >
                  Salvar Horário
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

        {/* Modal de Relatório Detalhado */}
        {relatorioModal.open && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header do Modal */}
              <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-purple-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Relatório de Importação</h3>
                    <p className="text-sm text-[#A1A1AA]">
                      {relatorioModal.item?.competencia || 'N/A'} - {formatDate(relatorioModal.item?.data_sync)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setRelatorioModal({ open: false, syncId: null, item: null })}
                  className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Conteúdo do Modal */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {relatorioLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#C8A951] animate-spin" />
                  </div>
                ) : relatorioData ? (
                  <>
                    {/* Resumo */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-[#1A1A1A] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-white">{relatorioData.resumo?.total_encontrados || 0}</p>
                        <p className="text-xs text-[#A1A1AA]">Encontrados</p>
                      </div>
                      <div className="bg-[#1A1A1A] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{relatorioData.resumo?.total_importados || 0}</p>
                        <p className="text-xs text-[#A1A1AA]">Importados</p>
                      </div>
                      <div className="bg-[#1A1A1A] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-400">{relatorioData.resumo?.total_duplicados || 0}</p>
                        <p className="text-xs text-[#A1A1AA]">Duplicados</p>
                      </div>
                      <div className="bg-[#1A1A1A] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-400">{relatorioData.resumo?.total_erros || 0}</p>
                        <p className="text-xs text-[#A1A1AA]">Erros</p>
                      </div>
                    </div>
                    
                    {/* Entradas vs Saídas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                        <h4 className="text-emerald-400 font-medium mb-2 flex items-center gap-2">
                          <ArrowDownCircle className="w-4 h-4" />
                          Entradas
                        </h4>
                        <p className="text-white text-2xl font-bold">{relatorioData.entradas?.importados || 0}</p>
                        <p className="text-[#A1A1AA] text-sm">de {relatorioData.entradas?.encontrados || 0} encontrados</p>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                          <ArrowUpCircle className="w-4 h-4" />
                          Saídas
                        </h4>
                        <p className="text-white text-2xl font-bold">{relatorioData.saidas?.importados || 0}</p>
                        <p className="text-[#A1A1AA] text-sm">de {relatorioData.saidas?.encontrados || 0} encontrados</p>
                      </div>
                    </div>
                    
                    {/* Notas Importadas */}
                    {relatorioData.notas_importadas && relatorioData.notas_importadas.length > 0 && (
                      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                        <div className="p-3 border-b border-[#2A2A2A]">
                          <h4 className="text-white font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            Notas Importadas ({relatorioData.notas_importadas.length})
                          </h4>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#141414] sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs text-[#A1A1AA]">NF</th>
                                <th className="px-3 py-2 text-left text-xs text-[#A1A1AA]">Tipo</th>
                                <th className="px-3 py-2 text-left text-xs text-[#A1A1AA]">Emitente/Dest.</th>
                                <th className="px-3 py-2 text-right text-xs text-[#A1A1AA]">Valor</th>
                                <th className="px-3 py-2 text-center text-xs text-[#A1A1AA]">Classificação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {relatorioData.notas_importadas.slice(0, 50).map((nota, idx) => (
                                <tr key={idx} className="border-t border-[#2A2A2A]">
                                  <td className="px-3 py-2 text-white">{nota.numero_nfe}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      nota.tipo === 'entrada' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                      {nota.tipo}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-[#A1A1AA] truncate max-w-[200px]">
                                    {nota.emitente_nome || nota.destinatario || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-white">
                                    {nota.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      nota.origem_classificacao === 'cache' ? 'bg-purple-500/20 text-purple-400' :
                                      nota.origem_classificacao === 'regra' ? 'bg-blue-500/20 text-blue-400' :
                                      nota.origem_classificacao === 'ia' ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-[#2A2A2A] text-[#A1A1AA]'
                                    }`}>
                                      {nota.origem_classificacao || 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {relatorioData.notas_importadas.length > 50 && (
                            <div className="p-3 text-center text-[#A1A1AA] text-sm border-t border-[#2A2A2A]">
                              + {relatorioData.notas_importadas.length - 50} notas não exibidas
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Resumo de Classificação */}
                    {relatorioData.relatorio?.resumo_classificacao && (
                      <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
                        <h4 className="text-white font-medium mb-3">Resumo de Classificação</h4>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-white">{relatorioData.relatorio.resumo_classificacao.total || 0}</p>
                            <p className="text-xs text-[#A1A1AA]">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-purple-400">{relatorioData.relatorio.resumo_classificacao.from_cache || 0}</p>
                            <p className="text-xs text-[#A1A1AA]">Cache</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-400">{relatorioData.relatorio.resumo_classificacao.from_rules || 0}</p>
                            <p className="text-xs text-[#A1A1AA]">Regras</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-amber-400">{relatorioData.relatorio.resumo_classificacao.from_ai || 0}</p>
                            <p className="text-xs text-[#A1A1AA]">IA</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Erros */}
                    {relatorioData.erros && relatorioData.erros.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Erros ({relatorioData.erros.length})
                        </h4>
                        <ul className="space-y-1 text-sm text-red-300">
                          {relatorioData.erros.slice(0, 10).map((erro, idx) => (
                            <li key={idx}>• {erro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-[#A1A1AA]">
                    Relatório não disponível para esta sincronização
                  </div>
                )}
              </div>
              
              {/* Footer do Modal */}
              <div className="p-4 border-t border-[#2A2A2A] flex justify-end">
                <button
                  onClick={() => setRelatorioModal({ open: false, syncId: null, item: null })}
                  className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SiegMonitor;
