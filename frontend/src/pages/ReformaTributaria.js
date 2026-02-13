import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Calculator, Settings, FileText, 
  AlertTriangle, CheckCircle, ArrowRight, ArrowDown, ArrowUp,
  Loader2, RefreshCw, Download, Info, DollarSign, Percent,
  Package, ShoppingCart, Truck, Building2, ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import Layout from '../components/Layout';

const API = process.env.REACT_APP_BACKEND_URL;

const ReformaTributaria = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState({
    aliquota_cbs: 8.80,
    aliquota_ibs: 17.70,
    aliquota_total: 26.50
  });
  const [apuracao, setApuracao] = useState(null);
  const [tabelas, setTabelas] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  // Carregar configuração
  const loadConfig = useCallback(async () => {
    if (!selectedCompany?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/reforma-tributaria/config/${selectedCompany.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConfig(response.data);
    } catch (err) {
      console.error('Erro ao carregar config:', err);
    }
  }, [selectedCompany]);

  // Carregar apuração
  const loadApuracao = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/reforma-tributaria/apuracao/${selectedCompany.id}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { competencia: selectedCompetencia }
        }
      );
      setApuracao(response.data);
    } catch (err) {
      console.error('Erro ao carregar apuração:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  // Carregar tabelas
  const loadTabelas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/reforma-tributaria/tabelas`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTabelas(response.data);
    } catch (err) {
      console.error('Erro ao carregar tabelas:', err);
    }
  }, []);

  // Salvar configuração
  const saveConfig = async () => {
    if (!selectedCompany?.id) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/reforma-tributaria/config/${selectedCompany.id}`,
        {
          aliquota_cbs: config.aliquota_cbs,
          aliquota_ibs: config.aliquota_ibs
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Recarregar apuração com novas alíquotas
      loadApuracao();
    } catch (err) {
      console.error('Erro ao salvar config:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadTabelas();
  }, [loadConfig, loadTabelas]);

  useEffect(() => {
    loadApuracao();
  }, [loadApuracao]);

  // Formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Formatar percentual
  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Download PDF
  const downloadPDF = async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/reforma-tributaria/relatorio-pdf/${selectedCompany.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { competencia: selectedCompetencia },
          responseType: 'blob'
        }
      );
      
      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reforma_Tributaria_${selectedCompetencia.replace('/', '-')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="min-h-screen bg-[#0C0C0C] text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Reforma Tributária</h1>
                  <p className="text-[#A1A1AA] text-sm">
                    Simulação IVA Dual (CBS + IBS) - Cenário 2027
                  </p>
                </div>
              </div>
              
              {/* Botões de ação */}
              <div className="flex items-center gap-3">
                <button
                  onClick={loadApuracao}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-sm transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={!apuracao || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#2A2A2A] disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#2A2A2A]">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Apuração
            </button>
            <button
              onClick={() => setActiveTab('detalhes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'detalhes'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Detalhes
            </button>
            <button
              onClick={() => setActiveTab('tabelas')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tabelas'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Tabelas NCM
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'config'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Configuração
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <span className="ml-3 text-[#A1A1AA]">Calculando apuração...</span>
            </div>
          )}

          {/* Tab: Dashboard */}
          {activeTab === 'dashboard' && !loading && apuracao && (
            <div className="space-y-6">
              {/* Cards Principais */}
              <div className="grid grid-cols-4 gap-4">
                {/* Créditos (Entradas) */}
                <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-emerald-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#A1A1AA] text-sm">Créditos (Entradas)</span>
                    <ArrowDown className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(apuracao.apuracao?.creditos?.total)}
                  </p>
                  <div className="mt-2 text-xs text-[#666] space-y-1">
                    <p>CBS: {formatCurrency(apuracao.apuracao?.creditos?.cbs)}</p>
                    <p>IBS: {formatCurrency(apuracao.apuracao?.creditos?.ibs)}</p>
                  </div>
                  <p className="mt-2 text-xs text-[#A1A1AA]">
                    {apuracao.estatisticas?.entradas?.produtos || 0} itens
                  </p>
                </div>

                {/* Débitos (Saídas) */}
                <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-red-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#A1A1AA] text-sm">Débitos (Saídas)</span>
                    <ArrowUp className="w-5 h-5 text-red-400" />
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(apuracao.apuracao?.debitos?.total)}
                  </p>
                  <div className="mt-2 text-xs text-[#666] space-y-1">
                    <p>CBS: {formatCurrency(apuracao.apuracao?.debitos?.cbs)}</p>
                    <p>IBS: {formatCurrency(apuracao.apuracao?.debitos?.ibs)}</p>
                  </div>
                  <p className="mt-2 text-xs text-[#A1A1AA]">
                    {apuracao.estatisticas?.saidas?.produtos || 0} itens
                  </p>
                </div>

                {/* Imposto Seletivo */}
                <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-amber-500/30 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#A1A1AA] text-sm">Imposto Seletivo</span>
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(apuracao.apuracao?.imposto_seletivo?.total)}
                  </p>
                  <p className="mt-2 text-xs text-[#A1A1AA]">
                    {apuracao.apuracao?.imposto_seletivo?.quantidade || 0} itens com IS
                  </p>
                </div>

                {/* Saldo */}
                <div className={`bg-gradient-to-br from-[#141414] to-[#1a1a1a] border rounded-xl p-5 ${
                  apuracao.apuracao?.saldo?.situacao === 'a_pagar' 
                    ? 'border-red-500/50' 
                    : 'border-emerald-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#A1A1AA] text-sm">
                      {apuracao.apuracao?.saldo?.situacao === 'a_pagar' ? 'A Pagar' : 'Crédito Acumulado'}
                    </span>
                    <DollarSign className={`w-5 h-5 ${
                      apuracao.apuracao?.saldo?.situacao === 'a_pagar' ? 'text-red-400' : 'text-emerald-400'
                    }`} />
                  </div>
                  <p className={`text-2xl font-bold ${
                    apuracao.apuracao?.saldo?.situacao === 'a_pagar' ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {formatCurrency(Math.abs(apuracao.apuracao?.saldo?.total || 0))}
                  </p>
                  <div className="mt-2 text-xs text-[#666] space-y-1">
                    <p>CBS: {formatCurrency(apuracao.apuracao?.saldo?.cbs)}</p>
                    <p>IBS: {formatCurrency(apuracao.apuracao?.saldo?.ibs)}</p>
                    {apuracao.apuracao?.saldo?.is > 0 && (
                      <p>IS: {formatCurrency(apuracao.apuracao?.saldo?.is)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* =============== COMPARATIVO 1: CBS vs PIS/COFINS (2027) =============== */}
              <div className="bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#141414] border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Calculator className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <span className="text-white">Comparativo 2027</span>
                      <p className="text-xs text-[#A1A1AA] font-normal mt-1">
                        CBS substitui PIS/COFINS
                      </p>
                    </div>
                  </h3>
                  <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <span className="text-blue-400 font-bold">TRANSIÇÃO 2027</span>
                  </div>
                </div>
                
                {/* Cards 2027 - CBS vs PIS/COFINS */}
                <div className="grid grid-cols-2 gap-6">
                  {/* PIS/COFINS Atual */}
                  <div className="bg-[#0C0C0C] rounded-xl p-5 border border-[#333]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-amber-400 font-semibold">PIS/COFINS ATUAL</span>
                    </div>
                    <p className="text-sm text-[#666] mb-4">Será extinto em 2027</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">PIS</span>
                        <span className="text-white font-medium">
                          {formatCurrency((apuracao.comparativo_regime_atual?.pis_cofins || 0) * 0.35)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">COFINS</span>
                        <span className="text-white font-medium">
                          {formatCurrency((apuracao.comparativo_regime_atual?.pis_cofins || 0) * 0.65)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <span className="text-amber-400 font-semibold">TOTAL</span>
                        <span className="text-amber-400 font-bold text-xl">
                          {formatCurrency(apuracao.comparativo_regime_atual?.pis_cofins)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* CBS 2027 */}
                  <div className="bg-[#0C0C0C] rounded-xl p-5 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-blue-400 font-semibold">CBS 2027</span>
                    </div>
                    <p className="text-sm text-[#666] mb-4">Alíquota: {config.aliquota_cbs}%</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">CBS Débitos</span>
                        <span className="text-red-400 font-medium">
                          {formatCurrency(apuracao.apuracao?.debitos?.cbs)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">CBS Créditos</span>
                        <span className="text-emerald-400 font-medium">
                          - {formatCurrency(apuracao.apuracao?.creditos?.cbs)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        <span className="text-blue-400 font-semibold">SALDO CBS</span>
                        <span className="text-blue-400 font-bold text-xl">
                          {formatCurrency(apuracao.apuracao?.saldo?.cbs)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resultado 2027 */}
                {(() => {
                  const pisCofinsAtual = apuracao.comparativo_regime_atual?.pis_cofins || 0;
                  const cbsNovo = apuracao.apuracao?.saldo?.cbs || 0;
                  const diferenca = cbsNovo - pisCofinsAtual;
                  const percentual = pisCofinsAtual > 0 ? (diferenca / pisCofinsAtual * 100) : 0;
                  const vaiPagarMais = diferenca > 0;
                  
                  return (
                    <div className={`mt-4 p-4 rounded-xl flex items-center justify-between ${
                      vaiPagarMais 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : 'bg-emerald-500/10 border border-emerald-500/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        {vaiPagarMais ? (
                          <TrendingUp className="w-6 h-6 text-red-400" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-emerald-400" />
                        )}
                        <div>
                          <p className={`font-bold ${vaiPagarMais ? 'text-red-400' : 'text-emerald-400'}`}>
                            {vaiPagarMais ? '⚠️ Aumento' : '✅ Economia'} em 2027
                          </p>
                          <p className="text-xs text-[#A1A1AA]">CBS vs PIS/COFINS</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${vaiPagarMais ? 'text-red-400' : 'text-emerald-400'}`}>
                          {vaiPagarMais ? '+' : '-'} {formatCurrency(Math.abs(diferenca))}
                        </p>
                        <p className={`text-sm ${vaiPagarMais ? 'text-red-400' : 'text-emerald-400'}`}>
                          {vaiPagarMais ? '+' : ''}{percentual.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* =============== COMPARATIVO 2: REFORMA COMPLETA (CBS+IBS vs PIS/COFINS+ICMS) =============== */}
              <div className="bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#141414] border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Calculator className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <span className="text-white">Reforma Tributária Completa</span>
                      <p className="text-xs text-[#A1A1AA] font-normal mt-1">
                        IVA Dual (CBS + IBS) substitui PIS/COFINS + ICMS
                      </p>
                    </div>
                  </h3>
                  <div className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <span className="text-purple-400 font-bold">CENÁRIO FINAL</span>
                  </div>
                </div>
                
                {/* Cards Reforma Completa */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Regime Atual Completo */}
                  <div className="bg-[#0C0C0C] rounded-xl p-5 border border-[#333]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-amber-400 font-semibold">REGIME ATUAL</span>
                    </div>
                    <p className="text-sm text-[#666] mb-4">PIS/COFINS + ICMS</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">PIS/COFINS</span>
                        <span className="text-white font-medium">
                          {formatCurrency(apuracao.comparativo_regime_atual?.pis_cofins)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">ICMS</span>
                        <span className="text-white font-medium">
                          {formatCurrency(apuracao.comparativo_regime_atual?.icms)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <span className="text-amber-400 font-semibold">TOTAL ATUAL</span>
                        <span className="text-amber-400 font-bold text-xl">
                          {formatCurrency(apuracao.comparativo_regime_atual?.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* IVA Dual */}
                  <div className="bg-[#0C0C0C] rounded-xl p-5 border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-purple-400 font-semibold">IVA DUAL</span>
                    </div>
                    <p className="text-sm text-[#666] mb-4">CBS ({config.aliquota_cbs}%) + IBS ({config.aliquota_ibs}%)</p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">CBS (substitui PIS/COFINS)</span>
                        <span className="text-white font-medium">
                          {formatCurrency(apuracao.apuracao?.saldo?.cbs)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                        <span className="text-[#A1A1AA]">IBS (substitui ICMS/ISS)</span>
                        <span className="text-white font-medium">
                          {formatCurrency(apuracao.apuracao?.saldo?.ibs)}
                        </span>
                      </div>
                      {apuracao.apuracao?.saldo?.is > 0 && (
                        <div className="flex justify-between items-center p-3 bg-[#141414] rounded-lg">
                          <span className="text-[#A1A1AA]">Imposto Seletivo</span>
                          <span className="text-amber-400 font-medium">
                            {formatCurrency(apuracao.apuracao?.saldo?.is)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <span className="text-purple-400 font-semibold">TOTAL IVA</span>
                        <span className="text-purple-400 font-bold text-xl">
                          {formatCurrency(Math.abs(apuracao.apuracao?.saldo?.total || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resultado Reforma Completa */}
                <div className={`mt-4 p-4 rounded-xl flex items-center justify-between ${
                  apuracao.diferenca?.valor > 0 
                    ? 'bg-red-500/10 border border-red-500/30' 
                    : 'bg-emerald-500/10 border border-emerald-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {apuracao.diferenca?.valor > 0 ? (
                      <TrendingUp className="w-6 h-6 text-red-400" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-emerald-400" />
                    )}
                    <div>
                      <p className={`font-bold ${apuracao.diferenca?.valor > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {apuracao.diferenca?.valor > 0 ? '⚠️ Aumento Total' : '✅ Economia Total'}
                      </p>
                      <p className="text-xs text-[#A1A1AA]">IVA Dual vs Regime Atual Completo</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${apuracao.diferenca?.valor > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {apuracao.diferenca?.valor > 0 ? '+' : '-'} {formatCurrency(Math.abs(apuracao.diferenca?.valor || 0))}
                    </p>
                    <p className={`text-sm ${apuracao.diferenca?.valor > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {apuracao.diferenca?.valor > 0 ? '+' : ''}{(apuracao.diferenca?.percentual || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
                
                {/* Nota explicativa */}
                <div className="mt-4 p-3 bg-[#0C0C0C] rounded-lg border border-[#333]">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#A1A1AA]">
                      A Reforma Tributária implementará o IVA Dual não-cumulativo, permitindo créditos em todas as etapas da cadeia produtiva. A alíquota total será de {config.aliquota_total}% (CBS {config.aliquota_cbs}% + IBS {config.aliquota_ibs}%).
                    </p>
                  </div>
                </div>
              </div>

              {/* Estatísticas por CST */}
              <div className="grid grid-cols-2 gap-6">
                {/* CST Entradas */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    Créditos por CST
                  </h3>
                  <div className="space-y-3">
                    {apuracao.estatisticas?.entradas?.por_cst && 
                      Object.entries(apuracao.estatisticas.entradas.por_cst).map(([cst, data]) => (
                        <div key={cst} className="flex items-center justify-between p-3 bg-[#0C0C0C] rounded-lg">
                          <div>
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-mono">
                              CST {cst}
                            </span>
                            <p className="text-sm text-[#A1A1AA] mt-1">{data.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(data.valor)}</p>
                            <p className="text-xs text-[#666]">{data.quantidade} itens</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* CST Saídas */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-red-400" />
                    Débitos por CST
                  </h3>
                  <div className="space-y-3">
                    {apuracao.estatisticas?.saidas?.por_cst && 
                      Object.entries(apuracao.estatisticas.saidas.por_cst).map(([cst, data]) => (
                        <div key={cst} className="flex items-center justify-between p-3 bg-[#0C0C0C] rounded-lg">
                          <div>
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-mono">
                              CST {cst}
                            </span>
                            <p className="text-sm text-[#A1A1AA] mt-1">{data.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(data.valor)}</p>
                            <p className="text-xs text-[#666]">{data.quantidade} itens</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>

              {/* Alíquotas Utilizadas */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-sm font-medium text-[#A1A1AA] mb-3">Alíquotas Aplicadas</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[#666]">CBS:</span>
                    <span className="font-bold text-white">{formatPercent(apuracao.config?.aliquota_cbs)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666]">IBS:</span>
                    <span className="font-bold text-white">{formatPercent(apuracao.config?.aliquota_ibs)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#666]">Total:</span>
                    <span className="font-bold text-emerald-400">{formatPercent(apuracao.config?.aliquota_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Detalhes */}
          {activeTab === 'detalhes' && !loading && apuracao && (
            <div className="space-y-6">
              {/* Detalhes Entradas */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a]"
                  onClick={() => setExpandedSection(expandedSection === 'entradas' ? null : 'entradas')}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold">Detalhes de Entradas (Créditos)</h3>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                      {apuracao.detalhes?.entradas?.length || 0} itens
                    </span>
                  </div>
                  {expandedSection === 'entradas' ? (
                    <ChevronUp className="w-5 h-5 text-[#666]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#666]" />
                  )}
                </div>
                
                {expandedSection === 'entradas' && (
                  <div className="border-t border-[#2A2A2A] max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0C0C0C] sticky top-0">
                        <tr className="text-[#666]">
                          <th className="text-left p-3">NF</th>
                          <th className="text-left p-3">Emitente</th>
                          <th className="text-left p-3">Produto</th>
                          <th className="text-left p-3">NCM</th>
                          <th className="text-left p-3">CFOP</th>
                          <th className="text-center p-3">CST</th>
                          <th className="text-right p-3">Valor</th>
                          <th className="text-right p-3">Crédito</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apuracao.detalhes?.entradas?.map((item, idx) => (
                          <tr key={idx} className="border-t border-[#2A2A2A] hover:bg-[#1a1a1a]">
                            <td className="p-3">{item.numero_nfe}</td>
                            <td className="p-3 text-[#A1A1AA]">{item.emitente}</td>
                            <td className="p-3">{item.produto}</td>
                            <td className="p-3 font-mono text-xs">{item.ncm}</td>
                            <td className="p-3 font-mono text-xs">{item.cfop}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                                {item.cst}
                              </span>
                            </td>
                            <td className="p-3 text-right">{formatCurrency(item.valor_produto)}</td>
                            <td className="p-3 text-right text-emerald-400">{formatCurrency(item.valor_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Detalhes Saídas */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a]"
                  onClick={() => setExpandedSection(expandedSection === 'saidas' ? null : 'saidas')}
                >
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-red-400" />
                    <h3 className="font-semibold">Detalhes de Saídas (Débitos)</h3>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                      {apuracao.detalhes?.saidas?.length || 0} itens
                    </span>
                  </div>
                  {expandedSection === 'saidas' ? (
                    <ChevronUp className="w-5 h-5 text-[#666]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#666]" />
                  )}
                </div>
                
                {expandedSection === 'saidas' && (
                  <div className="border-t border-[#2A2A2A] max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#0C0C0C] sticky top-0">
                        <tr className="text-[#666]">
                          <th className="text-left p-3">NF</th>
                          <th className="text-left p-3">Produto</th>
                          <th className="text-left p-3">NCM</th>
                          <th className="text-left p-3">CFOP</th>
                          <th className="text-center p-3">CST</th>
                          <th className="text-right p-3">Valor</th>
                          <th className="text-right p-3">Débito</th>
                          <th className="text-left p-3">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apuracao.detalhes?.saidas?.map((item, idx) => (
                          <tr key={idx} className="border-t border-[#2A2A2A] hover:bg-[#1a1a1a]">
                            <td className="p-3">{item.numero_nfe}</td>
                            <td className="p-3">{item.produto}</td>
                            <td className="p-3 font-mono text-xs">{item.ncm}</td>
                            <td className="p-3 font-mono text-xs">{item.cfop}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.cst === '03' || item.cst === '04' || item.cst === '05'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : item.cst === '01' || item.cst === '02'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-red-500/20 text-red-400'
                              }`}>
                                {item.cst}
                              </span>
                            </td>
                            <td className="p-3 text-right">{formatCurrency(item.valor_produto)}</td>
                            <td className="p-3 text-right text-red-400">{formatCurrency(item.valor_total)}</td>
                            <td className="p-3 text-xs text-[#A1A1AA]">{item.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Tabelas NCM */}
          {activeTab === 'tabelas' && tabelas && (
            <div className="space-y-6">
              {/* Cesta Básica */}
              <div className="bg-[#141414] border border-emerald-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Cesta Básica Nacional (Alíquota Zero - CST 03)
                </h3>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Produtos com alíquota zero na saída, mas mantém direito a crédito na entrada.
                </p>
                <div className="flex flex-wrap gap-2">
                  {tabelas.ncm_cesta_basica?.map((ncm) => (
                    <span key={ncm} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-mono">
                      {ncm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Imposto Seletivo */}
              <div className="bg-[#141414] border border-amber-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Imposto Seletivo (Sobretaxa)
                </h3>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Produtos sujeitos a tributação adicional além do IVA.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {tabelas.ncm_imposto_seletivo && 
                    Object.entries(tabelas.ncm_imposto_seletivo).map(([ncm, data]) => (
                      <div key={ncm} className="flex items-center justify-between p-3 bg-[#0C0C0C] rounded-lg">
                        <div>
                          <span className="font-mono text-amber-400">{ncm}</span>
                          <p className="text-sm text-[#A1A1AA]">{data.descricao}</p>
                        </div>
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-sm font-bold">
                          +{data.aliquota}%
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Redução 60% */}
              <div className="bg-[#141414] border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-400" />
                  Redução de 60% (CST 01)
                </h3>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Medicamentos, equipamentos médicos, insumos agropecuários e higiene pessoal.
                </p>
                <div className="flex flex-wrap gap-2">
                  {tabelas.ncm_reducao_60?.map((ncm) => (
                    <span key={ncm} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-mono">
                      {ncm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Redução 30% */}
              <div className="bg-[#141414] border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-purple-400" />
                  Redução de 30% (CST 02)
                </h3>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Equipamentos de informática.
                </p>
                <div className="flex flex-wrap gap-2">
                  {tabelas.ncm_reducao_30?.map((ncm) => (
                    <span key={ncm} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-mono">
                      {ncm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Configuração */}
          {activeTab === 'config' && (
            <div className="max-w-2xl">
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  Configuração de Alíquotas
                </h3>

                <div className="space-y-6">
                  {/* CBS */}
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-2">
                      Alíquota CBS (Contribuição sobre Bens e Serviços)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.01"
                        value={config.aliquota_cbs}
                        onChange={(e) => setConfig({
                          ...config,
                          aliquota_cbs: parseFloat(e.target.value) || 0,
                          aliquota_total: (parseFloat(e.target.value) || 0) + config.aliquota_ibs
                        })}
                        className="flex-1 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
                      />
                      <span className="text-[#A1A1AA]">%</span>
                    </div>
                    <p className="text-xs text-[#666] mt-1">Federal - Estimativa 2027: 8,80%</p>
                  </div>

                  {/* IBS */}
                  <div>
                    <label className="block text-sm text-[#A1A1AA] mb-2">
                      Alíquota IBS (Imposto sobre Bens e Serviços)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.01"
                        value={config.aliquota_ibs}
                        onChange={(e) => setConfig({
                          ...config,
                          aliquota_ibs: parseFloat(e.target.value) || 0,
                          aliquota_total: config.aliquota_cbs + (parseFloat(e.target.value) || 0)
                        })}
                        className="flex-1 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
                      />
                      <span className="text-[#A1A1AA]">%</span>
                    </div>
                    <p className="text-xs text-[#666] mt-1">Estadual/Municipal - Estimativa 2027: 17,70%</p>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-[#0C0C0C] rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[#A1A1AA]">Alíquota Total (CBS + IBS)</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        {(config.aliquota_cbs + config.aliquota_ibs).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div className="text-sm text-[#A1A1AA]">
                        <p className="font-medium text-blue-400 mb-1">Sobre as alíquotas</p>
                        <p>As alíquotas são estimativas para o cenário de 2027. Os valores finais serão definidos por legislação específica. A CBS é federal e o IBS é compartilhado entre estados e municípios.</p>
                      </div>
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#2A2A2A] text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    Salvar Configuração
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sem dados */}
          {!loading && !apuracao && activeTab === 'dashboard' && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
              <Calculator className="w-12 h-12 text-[#666] mx-auto mb-3" />
              <p className="text-[#A1A1AA]">Selecione uma empresa e competência para calcular a apuração</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ReformaTributaria;
