import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Calculator,
  Scale, RefreshCw, Building2, BarChart3, 
  AlertTriangle, CheckCircle, Sparkles, Target, Brain,
  ChevronDown, ChevronUp, Percent, PiggyBank, Calendar,
  Award, ArrowRight, Zap, Info, FileText
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RET = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('periodo');
  const [dados, setDados] = useState(null);
  const [dadosAcumulado, setDadosAcumulado] = useState(null);

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
      
      const periodoRes = await axios.get(
        `${API}/inteligencia-tributaria/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&tipo=periodo`,
        { headers }
      ).catch(() => null);
      
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
    if (simplesDisponivel && dadosAtivos.simples?.total !== undefined) {
      valores.push({ regime: 'simples', total: dadosAtivos.simples.total, nome: 'Simples Nacional' });
    }
    if (dadosAtivos.presumido?.total !== undefined) {
      valores.push({ regime: 'presumido', total: dadosAtivos.presumido.total, nome: 'Lucro Presumido' });
    }
    if (dadosAtivos.real?.total !== undefined) {
      valores.push({ regime: 'real', total: dadosAtivos.real.total, nome: 'Lucro Real' });
    }
    
    if (valores.length === 0) return null;
    
    valores.sort((a, b) => a.total - b.total);
    return valores[0];
  }, [dadosAtivos, activeTab, LIMITE_SIMPLES_MENSAL, LIMITE_SIMPLES_ANUAL]);

  // Card de Imposto Individual
  const ImpostoItem = ({ label, valor, color = "text-white" }) => (
    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] last:border-0">
      <span className="text-[#A1A1AA] text-sm">{label}</span>
      <span className={`font-semibold ${color}`}>{formatCurrency(valor)}</span>
    </div>
  );

  // Card de Regime Completo
  const RegimeCard = ({ regime, nome, dados, isMelhor, simplesIndisponivel, corBorda }) => {
    if (simplesIndisponivel) {
      return (
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl p-4 opacity-50">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${corBorda}`}></div>
            <h3 className="text-white font-semibold text-lg">{nome}</h3>
          </div>
          <div className="text-center py-8">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-400 text-sm">Faturamento excede limite</p>
            <p className="text-[#666] text-xs mt-1">Máx. {formatCurrency(activeTab === 'periodo' ? LIMITE_SIMPLES_MENSAL : LIMITE_SIMPLES_ANUAL)}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`bg-[#0C0C0C] border-2 rounded-xl overflow-hidden transition-all ${
        isMelhor ? 'border-green-500 ring-2 ring-green-500/20' : 'border-[#2A2A2A]'
      }`}>
        {/* Header */}
        <div className={`p-4 ${isMelhor ? 'bg-green-500/10' : 'bg-[#141414]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${corBorda}`}></div>
              <h3 className="text-white font-semibold text-lg">{nome}</h3>
              {isMelhor && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3" /> MAIS ECONÔMICO
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Impostos Individualizados */}
        <div className="p-4 space-y-1">
          <ImpostoItem label="ICMS" valor={dados?.icms || 0} />
          <ImpostoItem label="PIS" valor={dados?.pis || 0} />
          <ImpostoItem label="COFINS" valor={dados?.cofins || 0} />
          {regime === 'simples' && <ImpostoItem label="CPP" valor={dados?.cpp || 0} />}
          <ImpostoItem label="IRPJ" valor={dados?.irpj || 0} />
          <ImpostoItem label="CSLL" valor={dados?.csll || 0} />
        </div>

        {/* Total em Destaque */}
        <div className={`p-4 ${isMelhor ? 'bg-green-500/20' : 'bg-[#1A1A1A]'}`}>
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">TOTAL DE IMPOSTOS</span>
            <span className={`text-2xl font-bold ${isMelhor ? 'text-green-400' : 'text-[#C8A951]'}`}>
              {formatCurrency(dados?.total || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[#A1A1AA] text-sm">% sobre Faturamento</span>
            <span className="text-[#C8A951] font-medium">
              {formatPercent(((dados?.total || 0) / (dadosAtivos?.faturamento || 1)) * 100)}
            </span>
          </div>
        </div>

        {/* Detalhes adicionais para Lucro Real */}
        {regime === 'real' && (
          <div className="p-4 bg-[#0C0C0C] border-t border-[#2A2A2A]">
            <p className="text-xs text-[#666] mb-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> Base de Cálculo IRPJ/CSLL
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#141414] rounded p-2">
                <span className="text-[#666]">Lucro Bruto</span>
                <p className={`font-medium ${(dados?.lucro_bruto || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(dados?.lucro_bruto || 0)}
                </p>
              </div>
              <div className="bg-[#141414] rounded p-2">
                <span className="text-[#666]">Despesa Informada</span>
                <p className="font-medium text-purple-400">{formatCurrency(dados?.despesa_informada || 0)}</p>
              </div>
              <div className="bg-[#141414] rounded p-2 col-span-2">
                <span className="text-[#666]">Lucro Contábil (Base IR)</span>
                <p className={`font-medium ${(dados?.lucro_contabil || 0) > 0 ? 'text-[#C8A951]' : 'text-[#A1A1AA]'}`}>
                  {formatCurrency(dados?.lucro_contabil || 0)}
                  {(dados?.lucro_contabil || 0) === 0 && <span className="text-xs text-[#666] ml-2">(Prejuízo = IR zerado)</span>}
                </p>
              </div>
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
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar o comparativo de regimes</p>
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
              <Zap className="w-8 h-8 text-[#C8A951]" />
              RET - Rota de Eficiência Tributária
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Comparativo de regimes: Simples Nacional, Lucro Presumido e Lucro Real
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
                    <h3 className="text-green-400 font-bold text-xl">Regime Mais Econômico: {melhorRegime.nome}</h3>
                    <p className="text-[#A1A1AA]">
                      Economia de até {formatCurrency(
                        Math.max(
                          (dadosAtivos?.simples?.total || 0) - melhorRegime.total,
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

            {/* Aviso de dados incompletos para Lucro Real */}
            {(dadosAtivos?.real?.despesa_informada === 0 || dadosAtivos?.real?.lucro_bruto === dadosAtivos?.real?.lucro_contabil) && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-400 font-semibold mb-1">Cálculo do Lucro Real pode estar impreciso</p>
                  <p className="text-[#A1A1AA]">
                    Para maior precisão no comparativo, informe os dados de <strong className="text-white">estoque</strong> e <strong className="text-white">despesas</strong> na página <strong className="text-[#C8A951]">Indicadores</strong>.
                    Sem esses dados, o sistema considera despesas zeradas, resultando em um Lucro Real superestimado.
                  </p>
                </div>
              </div>
            )}

            {/* Cards de Regimes - Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RegimeCard 
                regime="simples" 
                nome="Simples Nacional" 
                dados={dadosAtivos?.simples}
                isMelhor={melhorRegime?.regime === 'simples'}
                simplesIndisponivel={simplesIndisponivel}
                corBorda="bg-blue-500"
              />
              
              <RegimeCard 
                regime="presumido" 
                nome="Lucro Presumido" 
                dados={dadosAtivos?.presumido}
                isMelhor={melhorRegime?.regime === 'presumido'}
                simplesIndisponivel={false}
                corBorda="bg-amber-500"
              />
              
              <RegimeCard 
                regime="real" 
                nome="Lucro Real" 
                dados={dadosAtivos?.real}
                isMelhor={melhorRegime?.regime === 'real'}
                simplesIndisponivel={false}
                corBorda="bg-purple-500"
              />
            </div>

            {/* Tabela Comparativa */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A]">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#C8A951]" />
                  Tabela Comparativa
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0C0C0C]">
                      <th className="text-left p-3 text-[#A1A1AA] font-medium">Imposto</th>
                      <th className="text-right p-3 text-blue-400 font-medium">Simples</th>
                      <th className="text-right p-3 text-amber-400 font-medium">Presumido</th>
                      <th className="text-right p-3 text-purple-400 font-medium">Lucro Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">ICMS</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosAtivos?.simples?.icms)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.presumido?.icms)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.real?.icms)}</td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">PIS (débitos)</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosAtivos?.simples?.pis)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.presumido?.pis)}</td>
                      <td className="p-3 text-right text-white">
                        {formatCurrency(dadosAtivos?.real?.pis_debitos || dadosAtivos?.real?.pis)}
                      </td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">COFINS (débitos)</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosAtivos?.simples?.cofins)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.presumido?.cofins)}</td>
                      <td className="p-3 text-right text-white">
                        {formatCurrency(dadosAtivos?.real?.cofins_debitos || dadosAtivos?.real?.cofins)}
                      </td>
                    </tr>
                    {(dadosAtivos?.real?.pis_creditos > 0 || dadosAtivos?.real?.cofins_creditos > 0) && (
                      <tr className="border-t border-[#2A2A2A] bg-[#0A1F0A]">
                        <td className="p-3 text-green-400 text-sm">(-) Créditos PIS/COFINS</td>
                        <td className="p-3 text-right text-[#666]">-</td>
                        <td className="p-3 text-right text-[#666]">-</td>
                        <td className="p-3 text-right text-green-400 text-sm">
                          {formatCurrency((dadosAtivos?.real?.pis_creditos || 0) + (dadosAtivos?.real?.cofins_creditos || 0))}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">IRPJ</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosAtivos?.simples?.irpj)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.presumido?.irpj)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.real?.irpj)}</td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">CSLL</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosAtivos?.simples?.csll)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.presumido?.csll)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.real?.csll)}</td>
                    </tr>
                    {!simplesIndisponivel && (
                      <tr className="border-t border-[#2A2A2A]">
                        <td className="p-3 text-[#A1A1AA]">CPP (Simples)</td>
                        <td className="p-3 text-right text-white">{formatCurrency(dadosAtivos?.simples?.cpp)}</td>
                        <td className="p-3 text-right text-[#666]">-</td>
                        <td className="p-3 text-right text-[#666]">-</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-[#C8A951] bg-[#0C0C0C]">
                      <td className="p-3 text-[#C8A951] font-bold">TOTAL</td>
                      <td className={`p-3 text-right font-bold ${melhorRegime?.regime === 'simples' ? 'text-green-400' : 'text-white'}`}>
                        {simplesIndisponivel ? '-' : formatCurrency(dadosAtivos?.simples?.total)}
                        {melhorRegime?.regime === 'simples' && <Award className="w-4 h-4 inline ml-1" />}
                      </td>
                      <td className={`p-3 text-right font-bold ${melhorRegime?.regime === 'presumido' ? 'text-green-400' : 'text-white'}`}>
                        {formatCurrency(dadosAtivos?.presumido?.total)}
                        {melhorRegime?.regime === 'presumido' && <Award className="w-4 h-4 inline ml-1" />}
                      </td>
                      <td className={`p-3 text-right font-bold ${melhorRegime?.regime === 'real' ? 'text-green-400' : 'text-white'}`}>
                        {formatCurrency(dadosAtivos?.real?.total)}
                        {melhorRegime?.regime === 'real' && <Award className="w-4 h-4 inline ml-1" />}
                      </td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#666] text-xs">% s/ Faturamento</td>
                      <td className="p-3 text-right text-[#C8A951] text-xs">
                        {simplesIndisponivel ? '-' : formatPercent(((dadosAtivos?.simples?.total || 0) / faturamento) * 100)}
                      </td>
                      <td className="p-3 text-right text-[#C8A951] text-xs">
                        {formatPercent(((dadosAtivos?.presumido?.total || 0) / faturamento) * 100)}
                      </td>
                      <td className="p-3 text-right text-[#C8A951] text-xs">
                        {formatPercent(((dadosAtivos?.real?.total || 0) / faturamento) * 100)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nota Informativa */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#C8A951] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#A1A1AA]">
                <p className="mb-1"><strong className="text-white">Nota:</strong> Esta análise considera os dados fiscais da empresa no período selecionado.</p>
                <p>• <strong>Simples Nacional:</strong> Limitado a R$ 4.800.000/ano. Alíquotas conforme anexos e faixas.</p>
                <p>• <strong>Lucro Presumido:</strong> Presunção de {selectedCompany?.percentual_presuncao_irpj || 8}% IRPJ e {selectedCompany?.percentual_presuncao_csll || 12}% CSLL. PIS 0,65% e COFINS 3% (cumulativo).</p>
                <p>• <strong>Lucro Real:</strong> Base = Lucro Contábil (informe estoque e despesas na página Indicadores). PIS 1,65% e COFINS 7,6% (não cumulativo, com créditos).</p>
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

export default RET;
