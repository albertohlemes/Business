import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info, 
  DollarSign, Target, Calculator, Percent, BarChart3, Calendar,
  ChevronDown, ChevronUp, RefreshCw, Edit2, Check, X, HelpCircle,
  Building2, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
  Upload, FileText, CheckCircle, History
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const SimplesNacionalDashboard = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editingFolha, setEditingFolha] = useState(false);
  const [folhaValue, setFolhaValue] = useState('');
  const [savingFolha, setSavingFolha] = useState(false);
  
  // Estados para importação PGDAS
  const [showPgdasModal, setShowPgdasModal] = useState(false);
  const [uploadingPgdas, setUploadingPgdas] = useState(false);
  const [pgdasResult, setPgdasResult] = useState(null);
  const [historicoFaturamento, setHistoricoFaturamento] = useState(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const fileInputRef = useRef(null);
  
  // Obter ano da competência selecionada
  const getAnoFromCompetencia = useCallback(() => {
    if (selectedCompetencia) {
      const parts = selectedCompetencia.split('/');
      if (parts.length === 2) {
        return parseInt(parts[1]);
      }
    }
    return new Date().getFullYear();
  }, [selectedCompetencia]);

  const fetchDashboard = useCallback(async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const ano = getAnoFromCompetencia();
      
      const response = await axios.post(`${API}/dashboard/simples-nacional`, {
        company_id: selectedCompany.id,
        ano: ano
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(response.data);
      setFolhaValue(response.data.fator_r?.folha_atual?.toString() || '0');
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar dados do Simples Nacional');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, getAnoFromCompetencia]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Função para upload do PGDAS
  const handlePgdasUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor, selecione um arquivo PDF do PGDAS');
      return;
    }
    
    setUploadingPgdas(true);
    setPgdasResult(null);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sobrepor_historico', 'false');
      
      const response = await axios.post(
        `${API}/simples-nacional/${selectedCompany.id}/importar-pgdas`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setPgdasResult(response.data);
      fetchDashboard(); // Atualizar dashboard com novos dados
      fetchHistoricoFaturamento(); // Atualizar histórico
    } catch (err) {
      console.error('Erro ao importar PGDAS:', err);
      setPgdasResult({
        sucesso: false,
        mensagem: err.response?.data?.detail || 'Erro ao processar arquivo PGDAS'
      });
    } finally {
      setUploadingPgdas(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Função para buscar histórico de faturamento
  const fetchHistoricoFaturamento = async () => {
    if (!selectedCompany?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/simples-nacional/${selectedCompany.id}/historico-faturamento`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistoricoFaturamento(response.data);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  const handleSaveFolha = async () => {
    if (!selectedCompany?.id) return;
    
    setSavingFolha(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/companies/${selectedCompany.id}/simples-nacional/folha`, null, {
        params: { folha_12m: parseFloat(folhaValue) || 0 },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEditingFolha(false);
      fetchDashboard();
    } catch (err) {
      console.error('Erro ao salvar folha:', err);
      alert(err.response?.data?.detail || 'Erro ao salvar folha de pagamento');
    } finally {
      setSavingFolha(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Verificar se não é Simples Nacional
  if (selectedCompany && selectedCompany.regime_tributario !== 'simples_nacional') {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div data-testid="simples-nacional-not-applicable" className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Dashboard não disponível</h2>
          <p className="text-[#A1A1AA] max-w-md">
            Esta empresa está cadastrada como <span className="text-[#C8A951] font-medium">
              {selectedCompany.regime_tributario === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'}
            </span>. 
            Este dashboard é exclusivo para empresas do Simples Nacional.
          </p>
        </div>
      </Layout>
    );
  }

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Building2 className="w-16 h-16 text-[#A1A1AA] mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Nenhuma empresa selecionada</h2>
          <p className="text-[#A1A1AA]">Selecione uma empresa para visualizar o dashboard.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="simples-nacional-dashboard" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Dashboard Simples Nacional
            </h1>
            <p className="text-[#A1A1AA] text-sm">
              Acompanhamento de faturamento, limites e tributação
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Botão Importar PGDAS */}
            <button
              onClick={() => {
                setShowPgdasModal(true);
                fetchHistoricoFaturamento();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2A2A2A] text-white rounded font-medium hover:bg-[#333333] transition-all border border-[#444]"
            >
              <Upload className="w-4 h-4" />
              Importar PGDAS
            </button>
            {/* Botão Atualizar */}
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && data && (
          <>
            {/* Alertas */}
            {data.alertas?.length > 0 && (
              <div className="space-y-2">
                {data.alertas.map((alerta, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      alerta.tipo === 'critical' 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                        : alerta.tipo === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}
                  >
                    {alerta.tipo === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : alerta.tipo === 'warning' ? (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm">{alerta.mensagem}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* RBT12 */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">RBT12 (Últimos 12 meses)</span>
                  <Wallet className="w-5 h-5 text-[#C8A951]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.faturamento?.rbt12)}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  Média mensal: {formatCurrency(data.faturamento?.media_mensal)}
                </p>
              </div>

              {/* Faturamento Ano */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Faturamento {data.ano_referencia}</span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.faturamento?.ano_corrente)}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  {data.mes_referencia} mês(es) apurado(s)
                </p>
              </div>

              {/* Faixa Atual */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Faixa / Alíquota</span>
                  <Percent className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {data.enquadramento?.faixa?.descricao || '1ª Faixa'}
                  </span>
                </div>
                <p className="text-xs text-[#666] mt-1">
                  Alíquota efetiva: <span className="text-[#C8A951] font-semibold">
                    {formatPercent(data.enquadramento?.aliquota_efetiva)}
                  </span>
                </p>
              </div>

              {/* DAS Mês */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">DAS {data.competencia_atual}</span>
                  <Calculator className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.das_mes_atual?.valor_das_final)}
                </p>
                {data.das_mes_atual?.descontos?.total > 0 && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Desconto de {formatCurrency(data.das_mes_atual.descontos.total)} (ST/Monof.)
                  </p>
                )}
              </div>
            </div>

            {/* Barras de Progresso - Limites */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Limite Simples */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#C8A951]" />
                    <span className="text-white font-medium">Limite do Simples Nacional</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    data.limites?.percentual_limite_consumido >= 90 
                      ? 'text-red-400' 
                      : data.limites?.percentual_limite_consumido >= 75 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'
                  }`}>
                    {formatPercent(data.limites?.percentual_limite_consumido)}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-4 bg-[#2A2A2A] rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      data.limites?.percentual_limite_consumido >= 90 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : data.limites?.percentual_limite_consumido >= 75 
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600' 
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, data.limites?.percentual_limite_consumido || 0)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">
                    Utilizado: {formatCurrency(data.faturamento?.rbt12)}
                  </span>
                  <span className="text-[#A1A1AA]">
                    Limite: {formatCurrency(data.limites?.limite_simples)}
                  </span>
                </div>
                <p className="text-xs text-[#666] mt-2">
                  Disponível: <span className="text-emerald-400 font-medium">
                    {formatCurrency(data.limites?.limite_disponivel)}
                  </span>
                </p>
              </div>

              {/* Sublimite ICMS/ISS */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Sublimite Estadual (ICMS/ISS)</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    data.limites?.percentual_sublimite_consumido >= 100 
                      ? 'text-red-400' 
                      : data.limites?.percentual_sublimite_consumido >= 85 
                        ? 'text-amber-400' 
                        : 'text-blue-400'
                  }`}>
                    {formatPercent(data.limites?.percentual_sublimite_consumido)}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-4 bg-[#2A2A2A] rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      data.limites?.percentual_sublimite_consumido >= 100 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : data.limites?.percentual_sublimite_consumido >= 85 
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, data.limites?.percentual_sublimite_consumido || 0)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">
                    Utilizado: {formatCurrency(data.faturamento?.rbt12)}
                  </span>
                  <span className="text-[#A1A1AA]">
                    Sublimite: {formatCurrency(data.limites?.sublimite_icms_iss)}
                  </span>
                </div>
                <p className="text-xs text-[#666] mt-2">
                  {data.limites?.percentual_sublimite_consumido >= 100 
                    ? <span className="text-amber-400">ICMS e ISS recolhidos separadamente do DAS</span>
                    : <>Disponível: <span className="text-blue-400 font-medium">{formatCurrency(data.limites?.sublimite_disponivel)}</span></>
                  }
                </p>
              </div>
            </div>

            {/* Projeção e Enquadramento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Projeção Anual */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#C8A951]" />
                  <h3 className="text-white font-medium">Projeção Anual</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">Projeção {data.ano_referencia}</span>
                    <span className="text-xl font-bold text-white">
                      {formatCurrency(data.projecao?.projecao_anual)}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-[#0C0C0C] rounded-lg">
                    <p className="text-sm text-[#A1A1AA] leading-relaxed">
                      {data.projecao?.alerta}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#2A2A2A]">
                    <div>
                      <p className="text-xs text-[#666]">Margem até sublimite</p>
                      <p className="text-sm font-medium text-blue-400">
                        {formatCurrency(data.projecao?.margem_sublimite)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#666]">Margem até limite</p>
                      <p className="text-sm font-medium text-emerald-400">
                        {formatCurrency(data.projecao?.margem_limite)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enquadramento */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-medium">Enquadramento Tributário</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Anexos */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">Anexo(s)</span>
                    <div className="flex gap-2">
                      {data.enquadramento?.anexos_confirmados?.map((anexo, idx) => (
                        <span 
                          key={idx}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            anexo === data.enquadramento?.anexo_principal
                              ? 'bg-[#C8A951]/20 text-[#C8A951]'
                              : 'bg-[#2A2A2A] text-[#A1A1AA]'
                          }`}
                        >
                          {anexo}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Faixa */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA]">Faixa de Faturamento</span>
                    <span className="text-white font-medium">
                      {data.enquadramento?.faixa?.descricao}
                    </span>
                  </div>
                  
                  {/* Alíquotas */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#2A2A2A]">
                    <div className="bg-[#0C0C0C] rounded p-3">
                      <p className="text-xs text-[#666]">Alíquota Nominal</p>
                      <p className="text-lg font-bold text-white">
                        {formatPercent(data.enquadramento?.aliquota_nominal)}
                      </p>
                    </div>
                    <div className="bg-[#C8A951]/10 rounded p-3 border border-[#C8A951]/30">
                      <p className="text-xs text-[#C8A951]">Alíquota Efetiva</p>
                      <p className="text-lg font-bold text-[#C8A951]">
                        {formatPercent(data.enquadramento?.aliquota_efetiva)}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-[#666]">
                    Parcela a deduzir: {formatCurrency(data.enquadramento?.parcela_deducao)}
                  </p>
                </div>
              </div>
            </div>

            {/* Fator R (se aplicável) */}
            {data.fator_r && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-medium">Fator R - Otimização Tributária</h3>
                    <div className="group relative">
                      <HelpCircle className="w-4 h-4 text-[#666] cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg text-xs text-[#A1A1AA] opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        O Fator R determina se uma empresa do Anexo V pode tributar pelo Anexo III (mais favorável). 
                        Se a folha de pagamento representar 28% ou mais do faturamento, você pode usar o Anexo III.
                      </div>
                    </div>
                  </div>
                  
                  {/* Status do Fator R */}
                  {data.fator_r.pode_usar_anexo_iii ? (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm font-medium">
                      Anexo III Disponível
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded text-sm font-medium">
                      Anexo V Obrigatório
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Fator R Atual */}
                  <div className="bg-[#0C0C0C] rounded p-4">
                    <p className="text-xs text-[#666] mb-1">Fator R Atual</p>
                    <p className={`text-2xl font-bold ${
                      data.fator_r.pode_usar_anexo_iii ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {data.fator_r.fator_r_percentual}
                    </p>
                    <p className="text-xs text-[#666] mt-1">Mínimo: 28%</p>
                  </div>
                  
                  {/* Folha Atual */}
                  <div className="bg-[#0C0C0C] rounded p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-[#666]">Folha 12 meses</p>
                      <button
                        onClick={() => setEditingFolha(!editingFolha)}
                        className="p-1 text-[#666] hover:text-[#C8A951] transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    {editingFolha ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={folhaValue}
                          onChange={(e) => setFolhaValue(e.target.value)}
                          className="w-full px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-white text-sm"
                          placeholder="0.00"
                        />
                        <button
                          onClick={handleSaveFolha}
                          disabled={savingFolha}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingFolha(false)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(data.fator_r.folha_atual)}
                      </p>
                    )}
                  </div>
                  
                  {/* Folha Necessária */}
                  <div className="bg-[#0C0C0C] rounded p-4">
                    <p className="text-xs text-[#666] mb-1">Folha p/ Anexo III</p>
                    <p className="text-xl font-bold text-blue-400">
                      {formatCurrency(data.fator_r.folha_necessaria_anexo_iii)}
                    </p>
                    {data.fator_r.folha_faltando > 0 && (
                      <p className="text-xs text-amber-400 mt-1">
                        Faltam: {formatCurrency(data.fator_r.folha_faltando)}
                      </p>
                    )}
                  </div>
                  
                  {/* Economia Potencial */}
                  {!data.fator_r.pode_usar_anexo_iii && data.fator_r.economia_potencial_anual > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-4">
                      <p className="text-xs text-emerald-400 mb-1">Economia Potencial/Ano</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {formatCurrency(data.fator_r.economia_potencial_anual)}
                      </p>
                      <p className="text-xs text-[#666] mt-1">
                        Se aumentar a folha para atingir o Anexo III
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Comparativo de Alíquotas */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA] text-sm">Alíquota Anexo V</span>
                    <span className="text-white font-medium">
                      {formatPercent(data.fator_r.aliquota_anexo_v)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#A1A1AA] text-sm">Alíquota Anexo III</span>
                    <span className="text-emerald-400 font-medium">
                      {formatPercent(data.fator_r.aliquota_anexo_iii)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhamento do DAS */}
            {data.das_mes_atual?.reparticao && (
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-[#C8A951]" />
                  <h3 className="text-white font-medium">
                    Detalhamento do DAS - {data.competencia_atual}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(data.das_mes_atual.reparticao)
                    .filter(([key]) => key !== 'total')
                    .map(([tributo, valor]) => (
                      <div 
                        key={tributo}
                        className="bg-[#0C0C0C] rounded p-3 text-center"
                      >
                        <p className="text-xs text-[#666] uppercase mb-1">{tributo}</p>
                        <p className="text-sm font-medium text-white">
                          {formatCurrency(valor)}
                        </p>
                      </div>
                    ))}
                </div>
                
                {/* Descontos */}
                {data.das_mes_atual.descontos?.total > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#A1A1AA]">Descontos aplicados:</span>
                      {data.das_mes_atual.descontos.icms_st > 0 && (
                        <span className="text-emerald-400">
                          ICMS-ST: -{formatCurrency(data.das_mes_atual.descontos.icms_st)}
                        </span>
                      )}
                      {data.das_mes_atual.descontos.pis_cofins_monofasico > 0 && (
                        <span className="text-emerald-400">
                          Monofásico: -{formatCurrency(data.das_mes_atual.descontos.pis_cofins_monofasico)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Total */}
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
                  <div>
                    <p className="text-sm text-[#A1A1AA]">Faturamento do mês</p>
                    <p className="text-lg font-medium text-white">
                      {formatCurrency(data.das_mes_atual.faturamento)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#A1A1AA]">DAS a pagar</p>
                    <p className="text-2xl font-bold text-[#C8A951]">
                      {formatCurrency(data.das_mes_atual.valor_das_final)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico Mensal */}
            {data.historico_mensal?.length > 0 && (
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-medium">Histórico de Faturamento (12 meses)</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left py-2 px-3 text-[#A1A1AA] font-medium">Competência</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA] font-medium">Faturamento</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA] font-medium">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.historico_mensal.map((mes, idx) => (
                        <tr 
                          key={idx}
                          className="border-b border-[#2A2A2A]/50 hover:bg-white/5"
                        >
                          <td className="py-2 px-3 text-white">{mes.competencia}</td>
                          <td className="py-2 px-3 text-right text-white font-medium">
                            {formatCurrency(mes.faturamento)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#A1A1AA]">
                            {mes.qtd_notas}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#0C0C0C]">
                        <td className="py-3 px-3 text-[#C8A951] font-semibold">Total (RBT12)</td>
                        <td className="py-3 px-3 text-right text-[#C8A951] font-bold">
                          {formatCurrency(data.faturamento?.rbt12)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#A1A1AA]">
                          {data.historico_mensal.reduce((sum, m) => sum + m.qtd_notas, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default SimplesNacionalDashboard;
