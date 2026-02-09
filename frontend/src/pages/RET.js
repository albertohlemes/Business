import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Calculator,
  Scale, RefreshCw, Building2, BarChart3, 
  AlertTriangle, CheckCircle, Sparkles, Target, Brain,
  ChevronDown, ChevronUp, Percent, PiggyBank, Calendar,
  Award, ArrowRight, Zap, Info
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InteligenciaTributaria = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('periodo'); // periodo, acumulado, estimativa
  const [dados, setDados] = useState(null);
  const [dadosAcumulado, setDadosAcumulado] = useState(null);
  const [expandedRegime, setExpandedRegime] = useState(null);

  // Limites do Simples Nacional
  const LIMITE_SIMPLES_ANUAL = 4800000;
  const LIMITE_SIMPLES_MENSAL = LIMITE_SIMPLES_ANUAL / 12;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar dados do período atual
      const periodoRes = await axios.get(
        `${API}/inteligencia-tributaria/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&tipo=periodo`,
        { headers }
      ).catch(() => null);
      
      // Buscar dados acumulados do ano
      const acumuladoRes = await axios.get(
        `${API}/inteligencia-tributaria/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&tipo=acumulado`,
        { headers }
      ).catch(() => null);
      
      setDados(periodoRes?.data);
      setDadosAcumulado(acumuladoRes?.data);
      
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular estimativa anual
  const dadosEstimativa = useMemo(() => {
    if (!dadosAcumulado) return null;
    
    const mesesDecorridos = dadosAcumulado.meses_apurados || 1;
    const fator = 12 / mesesDecorridos;
    
    return {
      ...dadosAcumulado,
      faturamento: (dadosAcumulado.faturamento || 0) * fator,
      simples: {
        ...dadosAcumulado.simples,
        total: (dadosAcumulado.simples?.total || 0) * fator,
        icms: (dadosAcumulado.simples?.icms || 0) * fator,
        pis: (dadosAcumulado.simples?.pis || 0) * fator,
        cofins: (dadosAcumulado.simples?.cofins || 0) * fator,
        irpj: (dadosAcumulado.simples?.irpj || 0) * fator,
        csll: (dadosAcumulado.simples?.csll || 0) * fator,
        cpp: (dadosAcumulado.simples?.cpp || 0) * fator,
      },
      presumido: {
        ...dadosAcumulado.presumido,
        total: (dadosAcumulado.presumido?.total || 0) * fator,
        icms: (dadosAcumulado.presumido?.icms || 0) * fator,
        pis: (dadosAcumulado.presumido?.pis || 0) * fator,
        cofins: (dadosAcumulado.presumido?.cofins || 0) * fator,
        irpj: (dadosAcumulado.presumido?.irpj || 0) * fator,
        csll: (dadosAcumulado.presumido?.csll || 0) * fator,
      },
      real: {
        ...dadosAcumulado.real,
        total: (dadosAcumulado.real?.total || 0) * fator,
        icms: (dadosAcumulado.real?.icms || 0) * fator,
        pis: (dadosAcumulado.real?.pis || 0) * fator,
        cofins: (dadosAcumulado.real?.cofins || 0) * fator,
        irpj: (dadosAcumulado.real?.irpj || 0) * fator,
        csll: (dadosAcumulado.real?.csll || 0) * fator,
      },
      meses_projetados: 12,
      tipo: 'estimativa'
    };
  }, [dadosAcumulado]);

  // Dados ativos conforme aba selecionada
  const dadosAtivos = useMemo(() => {
    if (activeTab === 'periodo') return dados;
    if (activeTab === 'acumulado') return dadosAcumulado;
    return dadosEstimativa;
  }, [activeTab, dados, dadosAcumulado, dadosEstimativa]);

  // Identificar melhor regime
  const melhorRegime = useMemo(() => {
    if (!dadosAtivos) return null;
    
    const faturamento = dadosAtivos.faturamento || 0;
    const limiteSimples = activeTab === 'periodo' ? LIMITE_SIMPLES_MENSAL : LIMITE_SIMPLES_ANUAL;
    const simplesDisponivel = faturamento <= limiteSimples;
    
    const valores = [];
    if (simplesDisponivel && dadosAtivos.simples?.total) {
      valores.push({ regime: 'simples', total: dadosAtivos.simples.total, nome: 'Simples Nacional' });
    }
    if (dadosAtivos.presumido?.total) {
      valores.push({ regime: 'presumido', total: dadosAtivos.presumido.total, nome: 'Lucro Presumido' });
    }
    if (dadosAtivos.real?.total) {
      valores.push({ regime: 'real', total: dadosAtivos.real.total, nome: 'Lucro Real' });
    }
    
    if (valores.length === 0) return null;
    
    valores.sort((a, b) => a.total - b.total);
    return valores[0];
  }, [dadosAtivos, activeTab]);

  // Card de Regime
  const RegimeCard = ({ regime, nome, dados, isMelhor, simplesIndisponivel }) => {
    const isExpanded = expandedRegime === regime;
    
    return (
      <div className={`bg-[#0C0C0C] border rounded-xl overflow-hidden transition-all ${
        isMelhor ? 'border-green-500 ring-2 ring-green-500/20' : 'border-[#2A2A2A]'
      } ${simplesIndisponivel ? 'opacity-50' : ''}`}>
        {/* Header */}
        <button
          onClick={() => setExpandedRegime(isExpanded ? null : regime)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#141414] transition-colors"
          disabled={simplesIndisponivel}
        >
          <div className="flex items-center gap-3">
            {isMelhor && <Award className="w-6 h-6 text-green-400" />}
            <div className="text-left">
              <h3 className="text-white font-semibold text-lg">{nome}</h3>
              {simplesIndisponivel && (
                <span className="text-xs text-amber-400">Faturamento excede limite</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[#666] text-xs">Total de Impostos</p>
              <p className={`text-2xl font-bold ${isMelhor ? 'text-green-400' : 'text-white'}`}>
                {formatCurrency(dados?.total || 0)}
              </p>
            </div>
            {!simplesIndisponivel && (
              isExpanded ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />
            )}
          </div>
        </button>
        
        {/* Detalhamento */}
        {isExpanded && !simplesIndisponivel && (
          <div className="border-t border-[#2A2A2A] p-4 bg-[#141414]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <p className="text-[#666] text-xs">ICMS</p>
                <p className="text-white font-semibold">{formatCurrency(dados?.icms || 0)}</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <p className="text-[#666] text-xs">PIS</p>
                <p className="text-white font-semibold">{formatCurrency(dados?.pis || 0)}</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <p className="text-[#666] text-xs">COFINS</p>
                <p className="text-white font-semibold">{formatCurrency(dados?.cofins || 0)}</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <p className="text-[#666] text-xs">IRPJ</p>
                <p className="text-white font-semibold">{formatCurrency(dados?.irpj || 0)}</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <p className="text-[#666] text-xs">CSLL</p>
                <p className="text-white font-semibold">{formatCurrency(dados?.csll || 0)}</p>
              </div>
              {regime === 'simples' && (
                <div className="bg-[#0C0C0C] rounded-lg p-3">
                  <p className="text-[#666] text-xs">CPP</p>
                  <p className="text-white font-semibold">{formatCurrency(dados?.cpp || 0)}</p>
                </div>
              )}
            </div>
            
            {/* Percentual sobre faturamento */}
            <div className="mt-4 flex items-center justify-between bg-[#0C0C0C] rounded-lg p-3">
              <span className="text-[#A1A1AA]">Carga Tributária sobre Faturamento</span>
              <span className="text-[#C8A951] font-bold text-lg">
                {formatPercent(((dados?.total || 0) / (dadosAtivos?.faturamento || 1)) * 100)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-[#A1A1AA]">Escolha uma empresa no seletor acima para visualizar a inteligência tributária</p>
          </div>
        </div>
      </Layout>
    );
  }

  const faturamento = dadosAtivos?.faturamento || 0;
  const limiteSimples = activeTab === 'periodo' ? LIMITE_SIMPLES_MENSAL : LIMITE_SIMPLES_ANUAL;
  const simplesIndisponivel = faturamento > limiteSimples;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="w-8 h-8 text-[#C8A951]" />
              Inteligência Tributária
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Comparativo de regimes tributários: Simples, Presumido e Real
            </p>
          </div>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2A2A2A] pb-3">
          <button
            onClick={() => setActiveTab('periodo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'periodo'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Período Atual
          </button>
          <button
            onClick={() => setActiveTab('acumulado')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'acumulado'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Acumulado do Ano
          </button>
          <button
            onClick={() => setActiveTab('estimativa')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'estimativa'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
          >
            <Target className="w-4 h-4" />
            Estimativa Anual
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : dadosAtivos ? (
          <div className="space-y-6">
            {/* Resumo do Período */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[#666] text-sm">
                    {activeTab === 'periodo' ? 'Competência' : activeTab === 'acumulado' ? 'Período Acumulado' : 'Projeção Anual'}
                  </p>
                  <p className="text-white font-semibold">
                    {activeTab === 'periodo' ? selectedCompetencia : 
                     activeTab === 'acumulado' ? `${dadosAcumulado?.meses_apurados || 0} meses de ${selectedCompetencia?.split('/')[1]}` :
                     `Estimativa para 12 meses`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#666] text-sm">Faturamento</p>
                  <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(faturamento)}</p>
                </div>
                {simplesIndisponivel && (
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-400 text-sm">
                      Faturamento excede limite do Simples (máx. {formatCurrency(limiteSimples)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Melhor Regime - Destaque */}
            {melhorRegime && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Award className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-green-400 font-bold text-xl">Regime Mais Vantajoso: {melhorRegime.nome}</h3>
                    <p className="text-[#A1A1AA]">
                      Economia de até {formatCurrency(
                        Math.max(
                          (dadosAtivos?.presumido?.total || 0) - melhorRegime.total,
                          (dadosAtivos?.real?.total || 0) - melhorRegime.total
                        )
                      )} em comparação com outros regimes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#666] text-sm">Total de Impostos</p>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(melhorRegime.total)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cards de Regimes */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#C8A951]" />
                Comparativo por Regime
              </h2>
              
              <RegimeCard 
                regime="simples" 
                nome="Simples Nacional" 
                dados={dadosAtivos?.simples}
                isMelhor={melhorRegime?.regime === 'simples'}
                simplesIndisponivel={simplesIndisponivel}
              />
              
              <RegimeCard 
                regime="presumido" 
                nome="Lucro Presumido" 
                dados={dadosAtivos?.presumido}
                isMelhor={melhorRegime?.regime === 'presumido'}
                simplesIndisponivel={false}
              />
              
              <RegimeCard 
                regime="real" 
                nome="Lucro Real" 
                dados={dadosAtivos?.real}
                isMelhor={melhorRegime?.regime === 'real'}
                simplesIndisponivel={false}
              />
            </div>

            {/* Gráfico de Comparação Visual */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#C8A951]" />
                Visualização Comparativa
              </h3>
              
              <div className="space-y-4">
                {!simplesIndisponivel && (
                  <div className="flex items-center gap-4">
                    <span className="w-32 text-[#A1A1AA] text-sm">Simples</span>
                    <div className="flex-1 h-8 bg-[#2A2A2A] rounded-lg overflow-hidden">
                      <div 
                        className={`h-full ${melhorRegime?.regime === 'simples' ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ 
                          width: `${Math.min(100, ((dadosAtivos?.simples?.total || 0) / Math.max(dadosAtivos?.simples?.total || 1, dadosAtivos?.presumido?.total || 1, dadosAtivos?.real?.total || 1)) * 100)}%` 
                        }}
                      />
                    </div>
                    <span className="w-32 text-right text-white font-medium">{formatCurrency(dadosAtivos?.simples?.total)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <span className="w-32 text-[#A1A1AA] text-sm">Presumido</span>
                  <div className="flex-1 h-8 bg-[#2A2A2A] rounded-lg overflow-hidden">
                    <div 
                      className={`h-full ${melhorRegime?.regime === 'presumido' ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ 
                        width: `${Math.min(100, ((dadosAtivos?.presumido?.total || 0) / Math.max(dadosAtivos?.simples?.total || 1, dadosAtivos?.presumido?.total || 1, dadosAtivos?.real?.total || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="w-32 text-right text-white font-medium">{formatCurrency(dadosAtivos?.presumido?.total)}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="w-32 text-[#A1A1AA] text-sm">Real</span>
                  <div className="flex-1 h-8 bg-[#2A2A2A] rounded-lg overflow-hidden">
                    <div 
                      className={`h-full ${melhorRegime?.regime === 'real' ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ 
                        width: `${Math.min(100, ((dadosAtivos?.real?.total || 0) / Math.max(dadosAtivos?.simples?.total || 1, dadosAtivos?.presumido?.total || 1, dadosAtivos?.real?.total || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="w-32 text-right text-white font-medium">{formatCurrency(dadosAtivos?.real?.total)}</span>
                </div>
              </div>
            </div>

            {/* Nota Informativa */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#C8A951] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#A1A1AA]">
                <p className="mb-1"><strong className="text-white">Nota:</strong> Esta análise considera os dados fiscais da empresa no período selecionado.</p>
                <p>• <strong>Simples Nacional:</strong> Limitado a R$ 4.800.000/ano. Alíquotas conforme anexos e faixas de faturamento.</p>
                <p>• <strong>Lucro Presumido:</strong> Presunção de {selectedCompany?.percentual_presuncao_irpj || 8}% para IRPJ e {selectedCompany?.percentual_presuncao_csll || 12}% para CSLL sobre o faturamento.</p>
                <p>• <strong>Lucro Real:</strong> Base de cálculo é o lucro líquido contábil ajustado.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg">Nenhum dado disponível</h3>
            <p className="text-[#A1A1AA]">Importe documentos fiscais para gerar a análise tributária</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default InteligenciaTributaria;
