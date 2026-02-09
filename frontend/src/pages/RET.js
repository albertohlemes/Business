import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  Download, RefreshCw, Building2, BarChart3, 
  AlertTriangle, CheckCircle, Sparkles, Calculator,
  Scale, ArrowRight, Lightbulb, Target, Zap,
  Package, Brain, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RET = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [analiseIA, setAnaliseIA] = useState(null);
  const [activeTab, setActiveTab] = useState('resumo'); // resumo, viloes, oportunidades, insights
  const [expandedSections, setExpandedSections] = useState({});

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar dados de apuração consolidados
      const [icmsRes, issRes, pisRes, ipiRes] = await Promise.all([
        axios.get(`${API}/apuracao-icms/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-iss/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/pis-cofins/apuracao/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-ipi/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null)
      ]);
      
      // Buscar análise tributária IA (com vilões e oportunidades)
      const analiseRes = await axios.get(
        `${API}/analise-tributaria-ia/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers }
      ).catch(() => null);
      
      setDados({
        icms: icmsRes?.data,
        iss: issRes?.data,
        pis_cofins: pisRes?.data,
        ipi: ipiRes?.data
      });
      setAnaliseIA(analiseRes?.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia, fetchData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Card de Imposto
  const ImpostoCard = ({ titulo, icone: Icon, corIcone, apagar, arecuperar }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold">{titulo}</span>
      </div>
      <div className="space-y-2">
        {apagar > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1AA] text-sm">A Pagar</span>
            <span className="text-red-400 font-bold">{formatCurrency(apagar)}</span>
          </div>
        )}
        {arecuperar > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1AA] text-sm">A Recuperar</span>
            <span className="text-green-400 font-bold">{formatCurrency(arecuperar)}</span>
          </div>
        )}
        {!apagar && !arecuperar && (
          <div className="text-center py-2">
            <span className="text-[#666] text-sm">Sem movimentação</span>
          </div>
        )}
      </div>
    </div>
  );

  // Calcular totais
  const calcularTotais = () => {
    if (!dados) return { total_pagar: 0, total_recuperar: 0, saldo_liquido: 0, detalhes: {} };
    
    const icms_pagar = dados.icms?.apuracao?.situacao === 'A_PAGAR' ? dados.icms?.apuracao?.saldo || 0 : 0;
    const icms_recuperar = dados.icms?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.icms?.apuracao?.saldo || 0) : 0;
    
    const iss_pagar = dados.iss?.resumo?.iss_a_pagar || 0;
    
    const pis_pagar = dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total > 0 ? dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total : 0;
    const pis_recuperar = dados.pis_cofins?.lucro_real?.saldo?.total < 0 ? Math.abs(dados.pis_cofins?.lucro_real?.saldo?.total) : 0;
    
    const icms_st_pagar = dados.icms?.icms_st?.apuracao?.icms_st_a_recolher || 0;
    
    const ipi_pagar = dados.ipi?.apuracao?.situacao === 'A_PAGAR' ? dados.ipi?.apuracao?.saldo || 0 : 0;
    const ipi_recuperar = dados.ipi?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.ipi?.apuracao?.saldo || 0) : 0;
    
    const total_pagar = icms_pagar + iss_pagar + pis_pagar + icms_st_pagar + ipi_pagar;
    const total_recuperar = icms_recuperar + pis_recuperar + ipi_recuperar;
    
    return {
      total_pagar,
      total_recuperar,
      saldo_liquido: total_pagar - total_recuperar,
      detalhes: {
        icms: { pagar: icms_pagar, recuperar: icms_recuperar },
        iss: { pagar: iss_pagar, recuperar: 0 },
        pis_cofins: { pagar: pis_pagar, recuperar: pis_recuperar },
        icms_st: { pagar: icms_st_pagar, recuperar: 0 },
        ipi: { pagar: ipi_pagar, recuperar: ipi_recuperar }
      }
    };
  };

  const totais = calcularTotais();

  // Renderizar insights IA formatados
  const renderInsightsIA = (texto) => {
    if (!texto) return null;
    return texto.split('\n').map((line, idx) => {
      const cleanLine = line
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s*/, '')
        .trim();
      
      if (!cleanLine) return null;
      
      const isTitulo = /^(\d+\.|[A-ZÁÉÍÓÚÀÃÕÇ\s]{5,}:)/.test(cleanLine);
      const isListItem = /^[-•*]\s/.test(cleanLine) || /^\d+\)\s/.test(cleanLine);
      
      if (isTitulo) {
        return (
          <h4 key={idx} className="text-lg font-bold text-[#C8A951] mt-4 mb-2 border-b border-[#2A2A2A] pb-1">
            {cleanLine}
          </h4>
        );
      } else if (isListItem) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-1">
            <span className="text-[#C8A951] mt-1">•</span>
            <span className="text-[#E0E0E0]">{cleanLine.replace(/^[-•*]\s*/, '').replace(/^\d+\)\s*/, '')}</span>
          </div>
        );
      } else {
        return <p key={idx} className="text-[#E0E0E0] my-2">{cleanLine}</p>;
      }
    });
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-[#C8A951]" />
              RET - Rota de Eficiência Tributária
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Visão consolidada, análise inteligente e oportunidades
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              data-testid="btn-atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-2 rounded-lg transition-colors font-medium"
              data-testid="btn-exportar"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Info da Empresa */}
        {selectedCompany && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-[#C8A951]" />
              <div className="flex-1">
                <h2 className="text-white font-semibold">{selectedCompany.razao_social}</h2>
                <p className="text-[#A1A1AA] text-sm">
                  CNPJ: {selectedCompany.cnpj} | Competência: {selectedCompetencia} | 
                  Regime: <span className="text-[#C8A951]">{selectedCompany.regime_tributario?.replace('_', ' ')?.toUpperCase() || 'N/D'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {selectedCompany && !loading && (
          <div className="flex gap-2 mb-6 border-b border-[#2A2A2A] pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('resumo')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'resumo' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Resumo
            </button>
            <button
              onClick={() => setActiveTab('viloes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'viloes' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Vilões
              {analiseIA?.viloes_tributarios?.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {analiseIA.viloes_tributarios.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('oportunidades')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'oportunidades' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Oportunidades
              {analiseIA?.oportunidades?.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {analiseIA.oportunidades.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'insights' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Brain className="w-4 h-4" />
              Insights IA
            </button>
          </div>
        )}

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a rota de eficiência tributária</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tab Resumo */}
            {activeTab === 'resumo' && (
              <>
                {/* Resumo Consolidado */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                      <span className="text-[#A1A1AA]">Total a Pagar</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">{formatCurrency(totais.total_pagar)}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                      <span className="text-[#A1A1AA]">Total a Recuperar</span>
                    </div>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(totais.total_recuperar)}</p>
                  </div>
                  <div className={`rounded-xl p-6 border ${
                    totais.saldo_liquido > 0 ? 'bg-amber-500/10 border-amber-500/50' : 
                    totais.saldo_liquido < 0 ? 'bg-green-500/10 border-green-500/50' : 'bg-[#141414] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Scale className="w-6 h-6 text-[#C8A951]" />
                      <span className="text-[#A1A1AA]">Saldo Líquido</span>
                    </div>
                    <p className={`text-3xl font-bold ${
                      totais.saldo_liquido > 0 ? 'text-amber-400' : totais.saldo_liquido < 0 ? 'text-green-400' : 'text-white'
                    }`}>
                      {formatCurrency(Math.abs(totais.saldo_liquido))}
                    </p>
                    <p className="text-xs text-[#666] mt-1">
                      {totais.saldo_liquido > 0 ? 'Débito líquido' : totais.saldo_liquido < 0 ? 'Crédito líquido' : 'Equilibrado'}
                    </p>
                  </div>
                </div>

                {/* Cards de Impostos */}
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-[#C8A951]" />
                    Detalhamento por Tributo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <ImpostoCard titulo="ICMS Próprio" icone={BarChart3} corIcone="bg-blue-600"
                      apagar={totais.detalhes?.icms?.pagar} arecuperar={totais.detalhes?.icms?.recuperar} />
                    <ImpostoCard titulo="ICMS ST" icone={BarChart3} corIcone="bg-amber-600"
                      apagar={totais.detalhes?.icms_st?.pagar} arecuperar={0} />
                    <ImpostoCard titulo="PIS/COFINS" icone={DollarSign} corIcone="bg-purple-600"
                      apagar={totais.detalhes?.pis_cofins?.pagar} arecuperar={totais.detalhes?.pis_cofins?.recuperar} />
                    <ImpostoCard titulo="ISS" icone={FileText} corIcone="bg-teal-600"
                      apagar={totais.detalhes?.iss?.pagar} arecuperar={0} />
                    <ImpostoCard titulo="IPI" icone={Package} corIcone="bg-indigo-600"
                      apagar={totais.detalhes?.ipi?.pagar} arecuperar={totais.detalhes?.ipi?.recuperar} />
                  </div>
                </div>

                {/* Comparativo de Regimes */}
                {dados?.pis_cofins?.comparativo && (
                  <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-[#C8A951]" />
                      Comparativo de Regimes (PIS/COFINS)
                    </h3>
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                      <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30 min-w-[200px]">
                        <p className="text-[#A1A1AA] text-sm">Lucro Real</p>
                        <p className="text-green-400 text-2xl font-bold">
                          {formatCurrency(dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total)}
                        </p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-[#666]" />
                      <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 min-w-[200px]">
                        <p className="text-[#A1A1AA] text-sm">Lucro Presumido</p>
                        <p className="text-blue-400 text-2xl font-bold">
                          {formatCurrency(dados.pis_cofins?.lucro_presumido?.imposto_a_pagar?.total)}
                        </p>
                      </div>
                      {dados.pis_cofins?.comparativo?.economia > 0 && (
                        <>
                          <ArrowRight className="w-6 h-6 text-[#C8A951]" />
                          <div className="text-center p-4 bg-[#C8A951]/10 rounded-lg border border-[#C8A951]/30 min-w-[200px]">
                            <p className="text-[#A1A1AA] text-sm">Economia Potencial</p>
                            <p className="text-[#C8A951] text-2xl font-bold">
                              {formatCurrency(dados.pis_cofins?.comparativo?.economia)}
                            </p>
                            <p className="text-xs text-[#666]">{dados.pis_cofins?.comparativo?.regime_mais_economico?.replace('_', ' ')}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tab Vilões */}
            {activeTab === 'viloes' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <div>
                    <h3 className="text-white font-bold">Vilões Tributários</h3>
                    <p className="text-[#A1A1AA] text-sm">Produtos que geram pouco crédito nas entradas e muito débito nas saídas</p>
                  </div>
                </div>
                
                {analiseIA?.viloes_tributarios?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A2A]">
                          <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Produto</th>
                          <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">NCM</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Entrada</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Crédito ICMS</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Saída</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Débito ICMS</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analiseIA.viloes_tributarios.slice(0, 20).map((item, idx) => (
                          <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                            <td className="py-3 px-4 text-white max-w-[200px] truncate">{item.descricao}</td>
                            <td className="py-3 px-4 font-mono text-[#A1A1AA]">{item.ncm}</td>
                            <td className="py-3 px-4 text-right text-white">{formatCurrency(item.entrada_valor)}</td>
                            <td className="py-3 px-4 text-right text-green-400">{formatCurrency(item.entrada_icms_creditavel || item.entrada_icms)}</td>
                            <td className="py-3 px-4 text-right text-white">{formatCurrency(item.saida_valor)}</td>
                            <td className="py-3 px-4 text-right text-red-400">{formatCurrency(item.saida_icms)}</td>
                            <td className={`py-3 px-4 text-right font-bold ${item.saldo_icms > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(item.saldo_icms)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-white font-medium">Nenhum vilão tributário identificado</p>
                    <p className="text-[#A1A1AA] text-sm">Seus produtos estão com uma boa relação crédito/débito</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Oportunidades */}
            {activeTab === 'oportunidades' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="w-6 h-6 text-green-500" />
                  <div>
                    <h3 className="text-white font-bold">Oportunidades Tributárias</h3>
                    <p className="text-[#A1A1AA] text-sm">Produtos que geram muito crédito nas entradas e pouco débito nas saídas</p>
                  </div>
                </div>
                
                {analiseIA?.oportunidades?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#2A2A2A]">
                          <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Produto</th>
                          <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">NCM</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Entrada</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Crédito ICMS</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Saída</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Débito ICMS</th>
                          <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Saldo (Crédito)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analiseIA.oportunidades.slice(0, 20).map((item, idx) => (
                          <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                            <td className="py-3 px-4 text-white max-w-[200px] truncate">{item.descricao}</td>
                            <td className="py-3 px-4 font-mono text-[#A1A1AA]">{item.ncm}</td>
                            <td className="py-3 px-4 text-right text-white">{formatCurrency(item.entrada_valor)}</td>
                            <td className="py-3 px-4 text-right text-green-400">{formatCurrency(item.entrada_icms_creditavel || item.entrada_icms)}</td>
                            <td className="py-3 px-4 text-right text-white">{formatCurrency(item.saida_valor)}</td>
                            <td className="py-3 px-4 text-right text-red-400">{formatCurrency(item.saida_icms)}</td>
                            <td className="py-3 px-4 text-right font-bold text-green-400">
                              {formatCurrency(Math.abs(item.saldo_icms))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-[#666] mx-auto mb-3" />
                    <p className="text-white font-medium">Nenhuma oportunidade identificada</p>
                    <p className="text-[#A1A1AA] text-sm">Não há produtos com saldo de crédito significativo</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Insights IA */}
            {activeTab === 'insights' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-purple-500" />
                  <div>
                    <h3 className="text-white font-bold">Análise Inteligente</h3>
                    <p className="text-[#A1A1AA] text-sm">Insights gerados por IA sobre sua situação tributária</p>
                  </div>
                </div>
                
                {analiseIA?.insights_ia ? (
                  <div className="prose max-w-none">
                    {renderInsightsIA(analiseIA.insights_ia)}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-[#666] mx-auto mb-3" />
                    <p className="text-white font-medium">Insights não disponíveis</p>
                    <p className="text-[#A1A1AA] text-sm">Acesse a página de Análise Tributária IA para gerar insights</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RET;
