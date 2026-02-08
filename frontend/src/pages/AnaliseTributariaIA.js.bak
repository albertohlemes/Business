import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, TrendingDown, TrendingUp, Brain, RefreshCw, 
  ChevronDown, ChevronUp, DollarSign, Package, FileText,
  AlertCircle, CheckCircle, XCircle, Lightbulb, Target,
  ArrowUpDown, ArrowUp, ArrowDown, Search, Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnaliseTributariaIA = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedVilao, setExpandedVilao] = useState(null);
  const [expandedOportunidade, setExpandedOportunidade] = useState(null);
  const [activeTab, setActiveTab] = useState('viloes');
  
  // Filtros e Ordenação
  const [filtroNCM, setFiltroNCM] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const fetchAnalise = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analise-tributaria-ia/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Erro ao buscar análise:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar análise tributária');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    if (selectedCompany?.id && selectedCompetencia) {
      fetchAnalise();
    }
  }, [selectedCompany, selectedCompetencia, fetchAnalise]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Extrair NCMs únicos para o filtro
  const ncmsUnicos = useMemo(() => {
    if (!data?.analise_por_ncm) return [];
    const ncms = [...new Set(data.analise_por_ncm.map(item => item.ncm))];
    return ncms.filter(ncm => ncm).sort();
  }, [data]);

  // Função de ordenação
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Renderizar ícone de ordenação
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Filtrar e ordenar dados NCM
  const filteredNcmData = useMemo(() => {
    if (!data?.analise_por_ncm) return [];
    
    let filtered = [...data.analise_por_ncm];
    
    // Aplicar filtro por NCM
    if (filtroNCM) {
      filtered = filtered.filter(item => item.ncm === filtroNCM);
    }
    
    // Aplicar filtro por produto (descrição)
    if (filtroProduto) {
      const search = filtroProduto.toLowerCase();
      filtered = filtered.filter(item => 
        item.descricao?.toLowerCase().includes(search)
      );
    }
    
    // Aplicar ordenação
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Converter para número se for valor numérico
        if (typeof aValue === 'number' || !isNaN(parseFloat(aValue))) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [data, filtroNCM, filtroProduto, sortConfig]);

  // Filtrar e ordenar vilões
  const filteredViloes = useMemo(() => {
    if (!data?.viloes_tributarios) return [];
    
    let filtered = [...data.viloes_tributarios];
    
    if (filtroNCM) {
      filtered = filtered.filter(item => item.ncm === filtroNCM);
    }
    
    if (filtroProduto) {
      const search = filtroProduto.toLowerCase();
      filtered = filtered.filter(item => 
        item.descricao?.toLowerCase().includes(search)
      );
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (typeof aValue === 'number' || !isNaN(parseFloat(aValue))) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [data, filtroNCM, filtroProduto, sortConfig]);

  // Filtrar e ordenar oportunidades
  const filteredOportunidades = useMemo(() => {
    if (!data?.oportunidades) return [];
    
    let filtered = [...data.oportunidades];
    
    if (filtroNCM) {
      filtered = filtered.filter(item => item.ncm === filtroNCM);
    }
    
    if (filtroProduto) {
      const search = filtroProduto.toLowerCase();
      filtered = filtered.filter(item => 
        item.descricao?.toLowerCase().includes(search)
      );
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (typeof aValue === 'number' || !isNaN(parseFloat(aValue))) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [data, filtroNCM, filtroProduto, sortConfig]);

  // Limpar filtros
  const clearFilters = () => {
    setFiltroNCM('');
    setFiltroProduto('');
    setSortConfig({ key: null, direction: 'asc' });
  };

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Selecione uma Empresa</h2>
            <p className="text-gray-500 mt-2">Clique no seletor no header para escolher uma empresa</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-tributaria-ia-page" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              Análise Tributária Inteligente
            </h1>
            <p className="text-gray-600 mt-1">
              Identificação de vilões tributários, oportunidades e insights estratégicos
            </p>
          </div>
          <button
            onClick={fetchAnalise}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analisando...' : 'Atualizar Análise'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analisando dados tributários com IA...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Documentos</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.resumo?.total_documentos || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.resumo?.total_entradas || 0} entradas • {data.resumo?.total_saidas || 0} saídas
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Crédito ICMS</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.resumo?.credito_icms)}</p>
                <p className="text-xs text-gray-500 mt-1">Total de entradas</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-600">Débito ICMS</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(data.resumo?.debito_icms)}</p>
                <p className="text-xs text-gray-500 mt-1">Total de saídas</p>
              </div>

              <div className={`rounded-xl p-5 shadow-sm border ${data.resumo?.saldo_icms > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${data.resumo?.saldo_icms > 0 ? 'bg-yellow-200' : 'bg-blue-200'}`}>
                    <DollarSign className={`w-5 h-5 ${data.resumo?.saldo_icms > 0 ? 'text-yellow-700' : 'text-blue-700'}`} />
                  </div>
                  <span className="text-sm text-gray-600">Saldo ICMS</span>
                </div>
                <p className={`text-2xl font-bold ${data.resumo?.saldo_icms > 0 ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {formatCurrency(data.resumo?.saldo_icms)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.resumo?.saldo_icms > 0 ? 'A pagar' : 'Crédito acumulado'}
                </p>
              </div>
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vilões */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-lg">Vilões Tributários</h3>
                    <p className="text-red-100 text-sm">Produtos com prejuízo tributário</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold">{data.resumo?.total_viloes || 0}</p>
                    <p className="text-red-100 text-sm">produtos identificados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(data.resumo?.impacto_viloes)}</p>
                    <p className="text-red-100 text-sm">impacto negativo</p>
                  </div>
                </div>
              </div>

              {/* Oportunidades */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Lightbulb className="w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-lg">Oportunidades</h3>
                    <p className="text-green-100 text-sm">Situações tributárias favoráveis</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold">{data.resumo?.total_oportunidades || 0}</p>
                    <p className="text-green-100 text-sm">produtos identificados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(data.resumo?.beneficio_oportunidades)}</p>
                    <p className="text-green-100 text-sm">benefício total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Filtros:</span>
                </div>
                
                {/* Filtro por NCM */}
                <div className="flex-1 min-w-[200px] max-w-[250px]">
                  <select
                    value={filtroNCM}
                    onChange={(e) => setFiltroNCM(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Todos os NCMs</option>
                    {ncmsUnicos.map(ncm => (
                      <option key={ncm} value={ncm}>{ncm}</option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro por Produto */}
                <div className="flex-1 min-w-[200px] max-w-[300px] relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por produto..."
                    value={filtroProduto}
                    onChange={(e) => setFiltroProduto(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                
                {/* Botão Limpar */}
                {(filtroNCM || filtroProduto || sortConfig.key) && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('viloes')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'viloes'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Vilões ({filteredViloes.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('oportunidades')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'oportunidades'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Oportunidades ({filteredOportunidades.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('ncm')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'ncm'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Package className="w-4 h-4 inline mr-2" />
                    Por NCM ({filteredNcmData.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'insights'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Brain className="w-4 h-4 inline mr-2" />
                    Insights IA
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Vilões Tab */}
                {activeTab === 'viloes' && (
                  <div className="space-y-4">
                    {filteredViloes.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-gray-600">Nenhum vilão tributário identificado!</p>
                        <p className="text-gray-500 text-sm">Sua tributação está equilibrada.</p>
                      </div>
                    ) : (
                      <>
                        {/* Cabeçalho ordenável */}
                        <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                          <button onClick={() => handleSort('descricao')} className="flex items-center gap-1 text-left">
                            Produto <SortIcon columnKey="descricao" />
                          </button>
                          <button onClick={() => handleSort('ncm')} className="flex items-center gap-1">
                            NCM <SortIcon columnKey="ncm" />
                          </button>
                          <button onClick={() => handleSort('aliq_entrada')} className="flex items-center gap-1">
                            Alíq. Entrada <SortIcon columnKey="aliq_entrada" />
                          </button>
                          <button onClick={() => handleSort('aliq_saida')} className="flex items-center gap-1">
                            Alíq. Saída <SortIcon columnKey="aliq_saida" />
                          </button>
                          <button onClick={() => handleSort('diferenca_aliquota')} className="flex items-center gap-1">
                            Diferença <SortIcon columnKey="diferenca_aliquota" />
                          </button>
                          <button onClick={() => handleSort('impacto_negativo')} className="flex items-center gap-1">
                            Impacto <SortIcon columnKey="impacto_negativo" />
                          </button>
                        </div>
                        
                        {filteredViloes.map((vilao, idx) => (
                          <div key={idx} className="border border-red-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedVilao(expandedVilao === idx ? null : idx)}
                              className="w-full px-4 py-3 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold text-gray-900">{vilao.descricao}</p>
                                  <p className="text-sm text-gray-600">NCM: {vilao.ncm}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="hidden md:flex items-center gap-4 text-sm">
                                  <span className="text-gray-600">{vilao.aliq_entrada}% → {vilao.aliq_saida}%</span>
                                  <span className="text-red-600 font-medium">+{vilao.diferenca_aliquota}%</span>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-red-600">{formatCurrency(vilao.impacto_negativo)}</p>
                                  <p className="text-xs text-gray-500">impacto negativo</p>
                                </div>
                                {expandedVilao === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </button>
                            
                            {expandedVilao === idx && (
                              <div className="p-4 bg-white border-t border-red-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-xs text-gray-500">Alíquota Entrada</p>
                                    <p className="font-bold text-gray-900">{vilao.aliq_entrada}%</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <p className="text-xs text-gray-500">Alíquota Saída</p>
                                    <p className="font-bold text-gray-900">{vilao.aliq_saida}%</p>
                                  </div>
                                  <div className="bg-green-50 p-3 rounded">
                                    <p className="text-xs text-gray-500">Crédito ICMS</p>
                                    <p className="font-bold text-green-600">{formatCurrency(vilao.icms_credito)}</p>
                                  </div>
                                  <div className="bg-red-50 p-3 rounded">
                                    <p className="text-xs text-gray-500">Débito ICMS</p>
                                    <p className="font-bold text-red-600">{formatCurrency(vilao.icms_debito)}</p>
                                  </div>
                                </div>
                                
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                    <p className="text-sm text-yellow-800">{vilao.explicacao}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-3 flex gap-4 text-sm text-gray-600">
                                  <span>Qtd Entrada: <strong>{vilao.qtd_entrada}</strong></span>
                                  <span>Valor Entrada: <strong>{formatCurrency(vilao.valor_entrada)}</strong></span>
                                  <span>Qtd Saída: <strong>{vilao.qtd_saida}</strong></span>
                                  <span>Valor Saída: <strong>{formatCurrency(vilao.valor_saida)}</strong></span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Oportunidades Tab */}
                {activeTab === 'oportunidades' && (
                  <div className="space-y-4">
                    {filteredOportunidades.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Nenhuma oportunidade identificada</p>
                        <p className="text-gray-500 text-sm">Continue monitorando para identificar benefícios.</p>
                      </div>
                    ) : (
                      filteredOportunidades.map((op, idx) => (
                        <div key={idx} className="border border-green-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedOportunidade(expandedOportunidade === idx ? null : idx)}
                            className="w-full px-4 py-3 bg-green-50 flex items-center justify-between hover:bg-green-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-gray-900">{op.descricao}</p>
                                <p className="text-sm text-gray-600">NCM: {op.ncm} • Tipo: {op.tipo?.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-green-600">{formatCurrency(op.beneficio)}</p>
                                <p className="text-xs text-gray-500">benefício</p>
                              </div>
                              {expandedOportunidade === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </button>
                          
                          {expandedOportunidade === idx && (
                            <div className="p-4 bg-white border-t border-green-200">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                                <div className="flex items-start gap-2">
                                  <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />
                                  <p className="text-sm text-green-800">{op.explicacao}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Crédito ICMS</p>
                                  <p className="font-bold text-green-600">{formatCurrency(op.icms_credito)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Débito ICMS</p>
                                  <p className="font-bold text-gray-600">{formatCurrency(op.icms_debito)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* NCM Tab */}
                {activeTab === 'ncm' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <button onClick={() => handleSort('ncm')} className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                              NCM / Produto <SortIcon columnKey="ncm" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-center">
                            <button onClick={() => handleSort('aliq_entrada')} className="flex items-center gap-1 justify-center text-xs font-semibold text-gray-600 w-full">
                              Alíq. Entr. <SortIcon columnKey="aliq_entrada" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-center">
                            <button onClick={() => handleSort('aliq_saida')} className="flex items-center gap-1 justify-center text-xs font-semibold text-gray-600 w-full">
                              Alíq. Saída <SortIcon columnKey="aliq_saida" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button onClick={() => handleSort('entrada_valor')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-600 w-full">
                              Entrada (R$) <SortIcon columnKey="entrada_valor" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button onClick={() => handleSort('entrada_icms_creditavel')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-600 w-full">
                              Créd. ICMS <SortIcon columnKey="entrada_icms_creditavel" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button onClick={() => handleSort('saida_valor')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-600 w-full">
                              Saída (R$) <SortIcon columnKey="saida_valor" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button onClick={() => handleSort('saida_icms')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-600 w-full">
                              Déb. ICMS <SortIcon columnKey="saida_icms" />
                            </button>
                          </th>
                          <th className="px-4 py-3 text-right">
                            <button onClick={() => handleSort('saldo_icms')} className="flex items-center gap-1 justify-end text-xs font-semibold text-gray-600 w-full">
                              Saldo <SortIcon columnKey="saldo_icms" />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredNcmData.map((ncm, idx) => {
                          const temDiferencaAliquota = ncm.aliq_entrada > 0 && ncm.aliq_saida > 0 && Math.abs(ncm.aliq_saida - ncm.aliq_entrada) >= 3;
                          // Pegar primeira descrição como título do grupo
                          const tituloProduto = ncm.descricoes && ncm.descricoes.length > 0 
                            ? ncm.descricoes[0].substring(0, 35) + (ncm.descricoes[0].length > 35 ? '...' : '')
                            : '';
                          return (
                            <tr 
                              key={idx} 
                              className={ncm.saldo_icms > 0 ? 'bg-red-50' : ncm.saldo_icms < 0 ? 'bg-green-50' : ''}
                              title={ncm.descricoes?.join(', ') || ''}
                            >
                              <td className="px-4 py-3">
                                <div className="font-mono text-sm font-medium">{ncm.ncm}</div>
                                {tituloProduto && (
                                  <div className="text-xs text-gray-500 mt-0.5">{tituloProduto}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {ncm.aliq_entrada > 0 ? `${ncm.aliq_entrada}%` : 
                                  ncm.tem_st_entrada ? <span className="text-orange-600 text-xs">ST</span> : '-'}
                              </td>
                              <td className={`px-4 py-3 text-sm text-center ${temDiferencaAliquota && ncm.aliq_saida > ncm.aliq_entrada ? 'text-red-600 font-bold' : ''}`}>
                                {ncm.aliq_saida > 0 ? `${ncm.aliq_saida}%` : '-'}
                                {temDiferencaAliquota && ncm.aliq_saida > ncm.aliq_entrada && (
                                  <span className="ml-1 text-xs">⚠️</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(ncm.entrada_valor)}</td>
                              <td className="px-4 py-3 text-sm text-right text-green-600">
                                {formatCurrency(ncm.entrada_icms_creditavel || ncm.entrada_icms)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(ncm.saida_valor)}</td>
                              <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(ncm.saida_icms)}</td>
                              <td className={`px-4 py-3 text-sm text-right font-semibold ${ncm.saldo_icms > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(ncm.saldo_icms)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredNcmData.length === 0 && (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Nenhum NCM encontrado</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Insights IA Tab */}
                {activeTab === 'insights' && (
                  <div className="prose max-w-none">
                    {data.insights_ia ? (
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center gap-3 mb-4">
                          <Brain className="w-8 h-8 text-purple-600" />
                          <h3 className="text-xl font-bold text-purple-900 m-0">Análise Inteligente</h3>
                        </div>
                        <div className="text-gray-800 leading-relaxed space-y-4">
                          {data.insights_ia.split('\n').map((line, idx) => {
                            // Detectar títulos (linhas que começam com número ou são todas maiúsculas)
                            const isTitulo = /^(\d+\.|[A-ZÁÉÍÓÚÀÃÕÇ\s]{5,}:)/.test(line.trim());
                            // Detectar itens de lista
                            const isListItem = /^[-•*]\s/.test(line.trim()) || /^\d+\)\s/.test(line.trim());
                            // Limpar asteriscos e formatação markdown
                            const cleanLine = line
                              .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
                              .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
                              .replace(/^#+\s*/, '')               // Remove # markdown headers
                              .trim();
                            
                            if (!cleanLine) return null;
                            
                            if (isTitulo) {
                              return (
                                <h4 key={idx} className="text-lg font-bold text-purple-900 mt-4 mb-2 border-b border-purple-200 pb-1">
                                  {cleanLine}
                                </h4>
                              );
                            } else if (isListItem) {
                              return (
                                <div key={idx} className="flex items-start gap-2 ml-4">
                                  <span className="text-purple-500 mt-1">•</span>
                                  <span>{cleanLine.replace(/^[-•*]\s*/, '').replace(/^\d+\)\s*/, '')}</span>
                                </div>
                              );
                            } else {
                              return <p key={idx} className="text-gray-700">{cleanLine}</p>;
                            }
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Insights não disponíveis</p>
                        <p className="text-gray-500 text-sm">Clique em &quot;Atualizar Análise&quot; para gerar insights com IA.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnaliseTributariaIA;
