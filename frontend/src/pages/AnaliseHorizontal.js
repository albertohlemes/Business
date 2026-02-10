import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, RefreshCw, 
  BarChart3, LineChart, Save, Edit2, Sparkles,
  ChevronDown, ChevronUp, Calendar, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AnaliseHorizontal = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [dadosManuais, setDadosManuais] = useState({});
  const [editando, setEditando] = useState(null);
  const [viewMode, setViewMode] = useState('unificado'); // unificado ou desmembrado
  const [analiseIA, setAnaliseIA] = useState(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [showFormularioAnterior, setShowFormularioAnterior] = useState(false);
  
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const anoAtual = selectedCompetencia ? parseInt(selectedCompetencia.split('/')[1]) : new Date().getFullYear();
  const anoAnterior = anoAtual - 1;
  const [anoDigitacao, setAnoDigitacao] = useState(anoAnterior);
  
  // Função para verificar se a competência permite edição manual
  // Apenas períodos anteriores ao mês atual podem ser editados manualmente
  const isPeriodoEditavel = (competencia) => {
    if (!competencia) return false;
    const [mesStr, anoStr] = competencia.split('/');
    const mesComp = parseInt(mesStr);
    const anoComp = parseInt(anoStr);
    const now = new Date();
    const mesAtual = now.getMonth() + 1; // JavaScript meses são 0-indexed
    const anoAtualReal = now.getFullYear();
    
    // Permite edição se:
    // 1. O ano da competência é anterior ao ano atual
    // 2. O ano é o atual, mas o mês é anterior ao mês atual
    if (anoComp < anoAtualReal) return true;
    if (anoComp === anoAtualReal && mesComp < mesAtual) return true;
    return false;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatShortCurrency = (value) => {
    if (!value) return '0';
    const absValue = Math.abs(value);
    if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (absValue >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const fetchDados = async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/analise-horizontal/${selectedCompany.id}?ano=${anoAtual}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos:', data);
        setDados(data);
      } else {
        console.error('Erro na resposta:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchDados();
      
      // Carregar dados manuais salvos do localStorage
      const key = `evolucao_manual_${selectedCompany.id}`;
      const savedData = localStorage.getItem(key);
      if (savedData) {
        try {
          setDadosManuais(JSON.parse(savedData));
        } catch (e) {
          console.error('Erro ao carregar dados manuais:', e);
        }
      }
    }
  }, [selectedCompany?.id, anoAtual]);

  // Preparar dados para o gráfico
  const dadosGrafico = useMemo(() => {
    const result = [];
    
    for (let i = 0; i < 12; i++) {
      const mes = meses[i];
      const competencia = `${String(i + 1).padStart(2, '0')}/${anoAtual}`;
      const competenciaAnterior = `${String(i + 1).padStart(2, '0')}/${anoAnterior}`;
      
      // Dados do sistema
      const dadosMes = dados?.mensal?.[competencia] || {};
      const dadosMesAnterior = dados?.mensal_ano_anterior?.[competenciaAnterior] || {};
      
      // Dados manuais (sobrescreve dados do sistema)
      const manuaisMes = dadosManuais[competencia] || {};
      const manuaisMesAnterior = dadosManuais[competenciaAnterior] || {};
      
      // Valores do ano atual
      const compras = manuaisMes.compras ?? dadosMes.compras ?? 0;
      const vendas = manuaisMes.vendas ?? dadosMes.vendas ?? 0;
      
      // Impostos individuais - primeiro dados manuais, depois sistema
      const icms = manuaisMes.icms ?? dadosMes.icms ?? 0;
      const icms_st = manuaisMes.icms_st ?? dadosMes.icms_st ?? 0;
      const pis = manuaisMes.pis ?? dadosMes.pis ?? 0;
      const cofins = manuaisMes.cofins ?? dadosMes.cofins ?? 0;
      const ipi = manuaisMes.ipi ?? dadosMes.ipi ?? 0;
      const iss = manuaisMes.iss ?? dadosMes.iss ?? 0;
      const das = manuaisMes.das ?? dadosMes.das ?? 0;
      const difal = manuaisMes.difal ?? dadosMes.difal ?? 0;
      
      // Calcular impostos a pagar: se tem dados manuais, somar os impostos individuais
      // Caso contrário, usar o valor do sistema
      const temDadosManuais = Object.keys(manuaisMes).length > 0;
      const impostosPagar = temDadosManuais 
        ? (Math.max(0, icms) + Math.max(0, pis) + Math.max(0, cofins) + ipi + iss + das + difal)
        : (manuaisMes.impostos_pagar ?? dadosMes.impostos_pagar ?? 0);
      const creditoAcumulado = temDadosManuais
        ? (Math.abs(Math.min(0, icms)) + Math.abs(Math.min(0, pis)) + Math.abs(Math.min(0, cofins)))
        : (manuaisMes.credito_acumulado ?? dadosMes.credito_acumulado ?? 0);
      
      // Valores do ano anterior - mesma lógica
      const temDadosManuaisAnterior = Object.keys(manuaisMesAnterior).length > 0;
      const comprasAnterior = manuaisMesAnterior.compras ?? dadosMesAnterior.compras ?? 0;
      const vendasAnterior = manuaisMesAnterior.vendas ?? dadosMesAnterior.vendas ?? 0;
      
      const icmsAnterior = manuaisMesAnterior.icms ?? dadosMesAnterior.icms ?? 0;
      const pisAnterior = manuaisMesAnterior.pis ?? dadosMesAnterior.pis ?? 0;
      const cofinsAnterior = manuaisMesAnterior.cofins ?? dadosMesAnterior.cofins ?? 0;
      const ipiAnterior = manuaisMesAnterior.ipi ?? dadosMesAnterior.ipi ?? 0;
      const issAnterior = manuaisMesAnterior.iss ?? dadosMesAnterior.iss ?? 0;
      const dasAnterior = manuaisMesAnterior.das ?? dadosMesAnterior.das ?? 0;
      const difalAnterior = manuaisMesAnterior.difal ?? dadosMesAnterior.difal ?? 0;
      
      const impostosAnterior = temDadosManuaisAnterior
        ? (Math.max(0, icmsAnterior) + Math.max(0, pisAnterior) + Math.max(0, cofinsAnterior) + ipiAnterior + issAnterior + dasAnterior + difalAnterior)
        : (manuaisMesAnterior.impostos_pagar ?? dadosMesAnterior.impostos_pagar ?? 0);
      
      // Saldo de impostos: positivo = a pagar, negativo = crédito
      const saldoImpostos = impostosPagar - creditoAcumulado;
      const creditoAnterior = temDadosManuaisAnterior
        ? (Math.abs(Math.min(0, icmsAnterior)) + Math.abs(Math.min(0, pisAnterior)) + Math.abs(Math.min(0, cofinsAnterior)))
        : (dadosMesAnterior.credito_acumulado ?? 0);
      const saldoImpostosAnterior = impostosAnterior - creditoAnterior;
      
      result.push({
        mes,
        competencia,
        // Ano atual
        compras,
        vendas,
        impostos: saldoImpostos,
        icms: icms > 0 ? icms : -Math.abs(icms),
        icms_st,
        pis: pis > 0 ? pis : -Math.abs(pis),
        cofins: cofins > 0 ? cofins : -Math.abs(cofins),
        ipi: ipi > 0 ? ipi : -Math.abs(ipi),
        iss,
        das,
        difal,
        // Ano anterior
        compras_anterior: comprasAnterior,
        vendas_anterior: vendasAnterior,
        impostos_anterior: saldoImpostosAnterior,
        // Variação vs ano anterior
        var_compras: comprasAnterior > 0 ? ((compras - comprasAnterior) / comprasAnterior * 100) : 0,
        var_vendas: vendasAnterior > 0 ? ((vendas - vendasAnterior) / vendasAnterior * 100) : 0,
        var_impostos: impostosAnterior !== 0 ? ((saldoImpostos - saldoImpostosAnterior) / Math.abs(saldoImpostosAnterior) * 100) : 0,
      });
    }
    
    // Calcular variação vs mês anterior para cada item
    for (let i = 0; i < result.length; i++) {
      if (i === 0) {
        // Primeiro mês não tem mês anterior no mesmo ano
        result[i].var_compras_mes = 0;
        result[i].var_vendas_mes = 0;
        result[i].var_impostos_mes = 0;
      } else {
        const mesAtual = result[i];
        const mesAnterior = result[i - 1];
        
        result[i].var_compras_mes = mesAnterior.compras > 0 
          ? ((mesAtual.compras - mesAnterior.compras) / mesAnterior.compras * 100) 
          : (mesAtual.compras > 0 ? 100 : 0);
        
        result[i].var_vendas_mes = mesAnterior.vendas > 0 
          ? ((mesAtual.vendas - mesAnterior.vendas) / mesAnterior.vendas * 100) 
          : (mesAtual.vendas > 0 ? 100 : 0);
        
        result[i].var_impostos_mes = mesAnterior.impostos !== 0 
          ? ((mesAtual.impostos - mesAnterior.impostos) / Math.abs(mesAnterior.impostos) * 100) 
          : (mesAtual.impostos !== 0 ? 100 : 0);
      }
    }
    
    return result;
  }, [dados, dadosManuais, anoAtual, anoAnterior]);

  // Calcular totais
  const totais = useMemo(() => {
    const atual = dadosGrafico.reduce((acc, m) => ({
      compras: acc.compras + m.compras,
      vendas: acc.vendas + m.vendas,
      impostos: acc.impostos + m.impostos,
    }), { compras: 0, vendas: 0, impostos: 0 });
    
    const anterior = dadosGrafico.reduce((acc, m) => ({
      compras: acc.compras + m.compras_anterior,
      vendas: acc.vendas + m.vendas_anterior,
      impostos: acc.impostos + m.impostos_anterior,
    }), { compras: 0, vendas: 0, impostos: 0 });
    
    return { atual, anterior };
  }, [dadosGrafico]);

  // Salvar valor manual
  const salvarValorManual = (competencia, campo, valor) => {
    const valorNumerico = valor === '' ? '' : parseFloat(valor) || 0;
    setDadosManuais(prev => ({
      ...prev,
      [competencia]: {
        ...prev[competencia],
        [campo]: valorNumerico
      }
    }));
    setEditando(null);
  };

  // Gerar análise com IA
  const gerarAnaliseIA = async () => {
    if (!selectedCompany?.id) return;
    
    setLoadingIA(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/analise-horizontal/insights/${selectedCompany.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dados_grafico: dadosGrafico,
            totais,
            ano_atual: anoAtual,
            ano_anterior: anoAnterior
          })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAnaliseIA(data.analise);
      }
    } catch (error) {
      console.error('Erro ao gerar análise IA:', error);
    }
    setLoadingIA(false);
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#A1A1AA]">{entry.name}:</span>
            <span className={`font-medium ${entry.value < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Renderizar card de variação
  const VariacaoCard = ({ titulo, valorAtual, valorAnterior, icone: Icone, cor }) => {
    const variacao = valorAnterior !== 0 
      ? ((valorAtual - valorAnterior) / Math.abs(valorAnterior) * 100) 
      : 0;
    const isPositivo = variacao > 0;
    const isNegativo = variacao < 0;
    
    return (
      <div className="bg-[#141414] rounded-xl p-5 border border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg ${cor} flex items-center justify-center`}>
            <Icone className="w-5 h-5 text-white" />
          </div>
          {variacao !== 0 && (
            <div className={`flex items-center gap-1 text-sm ${isPositivo ? 'text-emerald-400' : isNegativo ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
              {isPositivo ? <ArrowUpRight className="w-4 h-4" /> : isNegativo ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {Math.abs(variacao).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-xs text-[#A1A1AA] uppercase tracking-wide mb-1">{titulo}</p>
        <p className="text-2xl font-bold text-white">{formatCurrency(valorAtual)}</p>
        <p className="text-xs text-[#666] mt-1">
          Ano anterior: {formatCurrency(valorAnterior)}
        </p>
      </div>
    );
  };

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-[#666] mx-auto mb-4" />
            <p className="text-[#A1A1AA]">Selecione uma empresa para visualizar a análise horizontal</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-horizontal-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <LineChart className="w-8 h-8" />
                Análise Horizontal
              </h1>
              <p className="text-indigo-200 mt-1">
                Evolução de Compras, Vendas e Impostos • {anoAtual} vs {anoAnterior}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={gerarAnaliseIA}
                disabled={loadingIA}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Sparkles className={`w-4 h-4 ${loadingIA ? 'animate-pulse' : ''}`} />
                {loadingIA ? 'Analisando...' : 'Análise IA'}
              </button>
              <button
                onClick={fetchDados}
                disabled={loading}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VariacaoCard
            titulo="Total Compras"
            valorAtual={totais.atual.compras}
            valorAnterior={totais.anterior.compras}
            icone={TrendingDown}
            cor="bg-blue-600"
          />
          <VariacaoCard
            titulo="Total Vendas"
            valorAtual={totais.atual.vendas}
            valorAnterior={totais.anterior.vendas}
            icone={TrendingUp}
            cor="bg-emerald-600"
          />
          <VariacaoCard
            titulo={totais.atual.impostos >= 0 ? 'Impostos a Pagar' : 'Crédito Acumulado'}
            valorAtual={Math.abs(totais.atual.impostos)}
            valorAnterior={Math.abs(totais.anterior.impostos)}
            icone={DollarSign}
            cor={totais.atual.impostos >= 0 ? 'bg-red-600' : 'bg-amber-600'}
          />
        </div>

        {/* Seletor de Visualização */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#A1A1AA]">Visualização:</span>
          <div className="flex bg-[#141414] rounded-lg p-1 border border-[#2A2A2A]">
            <button
              onClick={() => setViewMode('unificado')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'unificado' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Impostos Unificados
            </button>
            <button
              onClick={() => setViewMode('desmembrado')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'desmembrado' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              Impostos Desmembrados
            </button>
          </div>
        </div>

        {/* Gráfico Principal */}
        <div className="bg-[#141414] rounded-xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              Evolução Mensal {anoAtual}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-[#A1A1AA]">Compras</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[#A1A1AA]">Vendas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-[#A1A1AA]">Impostos (+ pagar / - crédito)</span>
              </div>
            </div>
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico} margin={{ top: 20, right: 60, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="mes" tick={{ fill: '#A1A1AA', fontSize: 12 }} />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: '#A1A1AA', fontSize: 12 }} 
                  tickFormatter={formatShortCurrency}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#f59e0b', fontSize: 12 }} 
                  tickFormatter={formatShortCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" yAxisId="left" />
                
                {/* Linha para Compras - eixo esquerdo */}
                <Line 
                  type="monotone" 
                  dataKey="compras" 
                  name="Compras"
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2 }}
                  yAxisId="left"
                  connectNulls
                />
                
                {/* Linha para Vendas - eixo esquerdo */}
                <Line 
                  type="monotone" 
                  dataKey="vendas" 
                  name="Vendas"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5, strokeWidth: 2 }}
                  yAxisId="left"
                  connectNulls
                />
                
                {viewMode === 'unificado' ? (
                  /* Linha para Impostos Unificados - eixo direito para melhor visualização */
                  <Line 
                    type="monotone"
                    dataKey="impostos" 
                    name="Impostos"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', r: 5, strokeWidth: 2 }}
                    yAxisId="right"
                    connectNulls
                  />
                ) : (
                  /* Linhas para Impostos Desmembrados - baseado no regime */
                  <>
                    {dados?.regime_tributario === 'simples_nacional' ? (
                      <>
                        {/* Simples Nacional: DAS e DIFAL */}
                        <Line type="monotone" dataKey="das" name="DAS" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="difal" name="DIFAL" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="icms" name="ICMS (DAS)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="iss" name="ISS (DAS)" stroke="#84cc16" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" yAxisId="right" connectNulls />
                      </>
                    ) : (
                      <>
                        {/* Lucro Presumido/Real: todos os impostos */}
                        <Line type="monotone" dataKey="icms" name="ICMS" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="icms_st" name="ICMS-ST" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="pis" name="PIS" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="cofins" name="COFINS" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="ipi" name="IPI" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                        <Line type="monotone" dataKey="iss" name="ISS" stroke="#84cc16" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" connectNulls />
                      </>
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparativo com Ano Anterior */}
        <div className="bg-[#141414] rounded-xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Comparativo: {anoAtual} vs {anoAnterior}
            </h3>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="mes" tick={{ fill: '#A1A1AA', fontSize: 12 }} />
                <YAxis tick={{ fill: '#A1A1AA', fontSize: 12 }} tickFormatter={formatShortCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Ano Atual */}
                <Line type="monotone" dataKey="vendas" name={`Vendas ${anoAtual}`} stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="compras" name={`Compras ${anoAtual}`} stroke="#3b82f6" strokeWidth={2} />
                
                {/* Ano Anterior (linhas tracejadas) */}
                <Line type="monotone" dataKey="vendas_anterior" name={`Vendas ${anoAnterior}`} stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="compras_anterior" name={`Compras ${anoAnterior}`} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Dados (com edição manual) */}
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              Dados Mensais
            </h3>
            <p className="text-xs text-[#666]">
              Edição manual disponível apenas para períodos anteriores ao mês atual
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Mês</th>
                  <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Compras</th>
                  <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Vendas</th>
                  <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Impostos</th>
                  <th className="text-center px-4 py-3 text-[#A1A1AA] font-medium">Var. Compras</th>
                  <th className="text-center px-4 py-3 text-[#A1A1AA] font-medium">Var. Vendas</th>
                  <th className="text-center px-4 py-3 text-[#A1A1AA] font-medium">Var. Impostos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {dadosGrafico.map((row, idx) => {
                  const competenciaAnterior = `${String(idx + 1).padStart(2, '0')}/${anoAnterior}`;
                  const editavelAtual = isPeriodoEditavel(row.competencia);
                  const editavelAnterior = isPeriodoEditavel(competenciaAnterior);
                  
                  return (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{row.mes}/{anoAtual}</td>
                    
                    {/* Compras */}
                    <td className="px-4 py-3 text-right">
                      {editando === `${row.competencia}-compras` && editavelAtual ? (
                        <input
                          type="number"
                          defaultValue={row.compras}
                          className="w-24 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white"
                          onBlur={(e) => salvarValorManual(row.competencia, 'compras', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && salvarValorManual(row.competencia, 'compras', e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span 
                          className={editavelAtual ? "cursor-pointer text-blue-400 hover:underline" : "text-blue-400"}
                          onClick={() => editavelAtual && setEditando(`${row.competencia}-compras`)}
                          title={editavelAtual ? "Clique para editar" : "Período atual/futuro - não editável manualmente"}
                        >
                          {formatCurrency(row.compras)}
                        </span>
                      )}
                    </td>
                    
                    {/* Vendas */}
                    <td className="px-4 py-3 text-right">
                      {editando === `${row.competencia}-vendas` && editavelAtual ? (
                        <input
                          type="number"
                          defaultValue={row.vendas}
                          className="w-24 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white"
                          onBlur={(e) => salvarValorManual(row.competencia, 'vendas', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && salvarValorManual(row.competencia, 'vendas', e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span 
                          className={editavelAtual ? "cursor-pointer text-emerald-400 hover:underline" : "text-emerald-400"}
                          onClick={() => editavelAtual && setEditando(`${row.competencia}-vendas`)}
                          title={editavelAtual ? "Clique para editar" : "Período atual/futuro - não editável manualmente"}
                        >
                          {formatCurrency(row.vendas)}
                        </span>
                      )}
                    </td>
                    
                    {/* Impostos */}
                    <td className="px-4 py-3 text-right">
                      {editando === `${row.competencia}-impostos` && editavelAtual ? (
                        <input
                          type="number"
                          defaultValue={row.impostos}
                          className="w-24 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white"
                          onBlur={(e) => salvarValorManual(row.competencia, 'impostos_pagar', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && salvarValorManual(row.competencia, 'impostos_pagar', e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span 
                          className={`${editavelAtual ? "cursor-pointer hover:underline" : ""} ${row.impostos >= 0 ? 'text-red-400' : 'text-amber-400'}`}
                          onClick={() => editavelAtual && setEditando(`${row.competencia}-impostos`)}
                          title={editavelAtual ? "Clique para editar" : "Período atual/futuro - não editável manualmente"}
                        >
                          {formatCurrency(row.impostos)}
                        </span>
                      )}
                    </td>
                    
                    {/* Variações */}
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${row.var_compras > 0 ? 'text-emerald-400' : row.var_compras < 0 ? 'text-red-400' : 'text-[#666]'}`}>
                        {row.var_compras > 0 ? '+' : ''}{row.var_compras.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${row.var_vendas > 0 ? 'text-emerald-400' : row.var_vendas < 0 ? 'text-red-400' : 'text-[#666]'}`}>
                        {row.var_vendas > 0 ? '+' : ''}{row.var_vendas.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${row.var_impostos < 0 ? 'text-emerald-400' : row.var_impostos > 0 ? 'text-red-400' : 'text-[#666]'}`}>
                        {row.var_impostos > 0 ? '+' : ''}{row.var_impostos.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botão para Digitar Dados do Ano Anterior */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowFormularioAnterior(!showFormularioAnterior);
              setAnoDigitacao(anoAnterior);
            }}
            className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 rounded-lg text-amber-400 flex items-center gap-2 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {showFormularioAnterior ? 'Fechar Digitação Manual' : `Digitar Dados de ${anoAnterior}`}
          </button>
          <span className="text-xs text-[#666]">
            Insira dados históricos para comparativos mais precisos
          </span>
        </div>

        {/* Formulário de Digitação do Ano Anterior */}
        {showFormularioAnterior && (
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-xl p-6 border border-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Dados Manuais - {anoDigitacao}</h3>
                  <p className="text-xs text-amber-300">Preencha os valores mensais do ano anterior</p>
                </div>
              </div>
              <select
                value={anoDigitacao}
                onChange={(e) => setAnoDigitacao(parseInt(e.target.value))}
                className="px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white"
              >
                {[...Array(5)].map((_, i) => {
                  const ano = new Date().getFullYear() - i - 1;
                  return <option key={ano} value={ano}>{ano}</option>;
                })}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-500/20">
                    <th className="text-left px-3 py-2 text-amber-400 font-medium">Mês</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">Compras</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">Vendas</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">ICMS</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">PIS</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">COFINS</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">ISS</th>
                    <th className="text-right px-3 py-2 text-amber-400 font-medium">DAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {meses.map((mes, idx) => {
                    const competencia = `${String(idx + 1).padStart(2, '0')}/${anoDigitacao}`;
                    const dadosMes = dadosManuais[competencia] || {};
                    
                    return (
                      <tr key={competencia} className="hover:bg-white/5">
                        <td className="px-3 py-2 text-white font-medium">{mes}/{anoDigitacao}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.compras || ''}
                            onChange={(e) => salvarValorManual(competencia, 'compras', e.target.value)}
                            className="w-24 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.vendas || ''}
                            onChange={(e) => salvarValorManual(competencia, 'vendas', e.target.value)}
                            className="w-24 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.icms || ''}
                            onChange={(e) => salvarValorManual(competencia, 'icms', e.target.value)}
                            className="w-20 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.pis || ''}
                            onChange={(e) => salvarValorManual(competencia, 'pis', e.target.value)}
                            className="w-20 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.cofins || ''}
                            onChange={(e) => salvarValorManual(competencia, 'cofins', e.target.value)}
                            className="w-20 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.iss || ''}
                            onChange={(e) => salvarValorManual(competencia, 'iss', e.target.value)}
                            className="w-20 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            placeholder="0,00"
                            value={dadosMes.das || ''}
                            onChange={(e) => salvarValorManual(competencia, 'das', e.target.value)}
                            className="w-20 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-right text-white placeholder:text-[#444]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-amber-300/70">
                * Os valores digitados são aplicados automaticamente ao gráfico
              </p>
              <button
                onClick={() => {
                  // Salvar os dados manuais no localStorage para persistência
                  const key = `evolucao_manual_${selectedCompany?.id}`;
                  localStorage.setItem(key, JSON.stringify(dadosManuais));
                  alert('Dados salvos com sucesso!');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Salvar Dados
              </button>
            </div>
          </div>
        )}

        {/* Análise IA */}
        {analiseIA && (
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-xl p-6 border border-indigo-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Análise Inteligente</h3>
                <p className="text-xs text-indigo-300">Comparativo {anoAtual} vs {anoAnterior}</p>
              </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                {analiseIA}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnaliseHorizontal;
