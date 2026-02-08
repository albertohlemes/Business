import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, CheckCircle, TrendingUp, Info, RefreshCw, ArrowUpCircle, 
  Filter, Download, ChevronUp, ChevronDown, DollarSign, FileText, Package
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnaliseSaidas = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [analise, setAnalise] = useState(null);
  const [divergencias, setDivergencias] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('todos'); // todos, com_alerta, divergentes, ok
  const [viewMode, setViewMode] = useState('documento'); // documento, produto
  const [sortConfig, setSortConfig] = useState({ key: 'documento', direction: 'asc' });

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Buscar análise de alíquotas e divergências em paralelo
      const [analiseRes, divergenciasRes] = await Promise.all([
        axios.get(
          `${API}/analise-aliquotas-saida/${selectedCompany.id}?competencia=${selectedCompetencia}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API}/relatorio-divergencias-saida/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);
      
      setAnalise(analiseRes.data);
      setDivergencias(divergenciasRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercent = (value) => `${(value || 0).toFixed(2)}%`;

  // Ordenação
  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Mesclar dados de análise com info de divergência
  const enrichedProducts = useMemo(() => {
    if (!analise?.produtos) return [];
    
    // Criar mapa de produtos divergentes
    const divergentMap = new Map();
    if (divergencias?.divergencias) {
      divergencias.divergencias.forEach(doc => {
        doc.produtos.forEach(prod => {
          const key = `${doc.numero_nfe}_${prod.codigo}`;
          divergentMap.set(key, {
            cst_correto: prod.cst_pis_correto,
            impacto_pis: prod.impacto_pis,
            impacto_cofins: prod.impacto_cofins,
            tipo_divergencia: prod.tipo_divergencia
          });
        });
      });
    }
    
    return analise.produtos.map(p => {
      const key = `${p.documento}_${p.codigo}`;
      const divInfo = divergentMap.get(key);
      return {
        ...p,
        is_divergente: !!divInfo,
        cst_correto: divInfo?.cst_correto,
        impacto_pis: divInfo?.impacto_pis || 0,
        impacto_cofins: divInfo?.impacto_cofins || 0,
        tipo_divergencia: divInfo?.tipo_divergencia
      };
    });
  }, [analise, divergencias]);

  // Filtrar, agrupar e ordenar
  const processedProducts = useMemo(() => {
    let list = [...enrichedProducts];

    // 1. Agrupamento
    if (viewMode === 'produto') {
      const groups = {};
      list.forEach(p => {
        const key = `${p.codigo}|${p.ncm}`;
        if (!groups[key]) {
          groups[key] = {
            ...p,
            documento: 'Vários',
            valor_total: 0,
            valores: { icms: 0, pis: 0, cofins: 0 },
            impacto_pis: 0,
            impacto_cofins: 0,
            alertas: [],
            count: 0,
            is_divergente: false
          };
        }
        const g = groups[key];
        g.count += 1;
        g.valor_total += p.valor_total || 0;
        g.valores.icms += p.valores?.icms || 0;
        g.valores.pis += p.valores?.pis || 0;
        g.valores.cofins += p.valores?.cofins || 0;
        g.impacto_pis += p.impacto_pis || 0;
        g.impacto_cofins += p.impacto_cofins || 0;
        if (p.is_divergente) g.is_divergente = true;
        
        p.alertas?.forEach(a => {
          if (!g.alertas.some(ea => ea.mensagem === a.mensagem && ea.imposto === a.imposto)) {
            g.alertas.push(a);
          }
        });
      });
      list = Object.values(groups);
    }

    // 2. Filtro
    list = list.filter(p => {
      if (filtro === 'com_alerta') return p.alertas?.length > 0;
      if (filtro === 'divergentes') return p.is_divergente;
      if (filtro === 'ok') return !p.alertas?.length && !p.is_divergente;
      return true;
    });

    // 3. Ordenação
    if (sortConfig.key) {
      list.sort((a, b) => {
        let aVal, bVal;
        
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aVal = a[keys[0]]?.[keys[1]] ?? 0;
          bVal = b[keys[0]]?.[keys[1]] ?? 0;
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal, 'pt-BR')
            : bVal.localeCompare(aVal, 'pt-BR');
        }
        
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return list;
  }, [enrichedProducts, filtro, sortConfig, viewMode]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = enrichedProducts.length;
    const comAlerta = enrichedProducts.filter(p => p.alertas?.length > 0).length;
    const divergentes = enrichedProducts.filter(p => p.is_divergente).length;
    const ok = total - comAlerta;
    return { total, comAlerta, divergentes, ok };
  }, [enrichedProducts]);

  // Cabeçalho ordenável
  const SortableHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`px-3 py-2 text-left cursor-pointer hover:bg-gray-100 select-none ${className}`}
        onClick={() => requestSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          <span className="text-[#A1A1AA] text-xs font-medium">{label}</span>
          <div className="flex flex-col">
            <ChevronUp className={`w-3 h-3 -mb-1 ${isActive && sortConfig.direction === 'asc' ? 'text-red-600' : 'text-gray-300'}`} />
            <ChevronDown className={`w-3 h-3 ${isActive && sortConfig.direction === 'desc' ? 'text-red-600' : 'text-gray-300'}`} />
          </div>
        </div>
      </th>
    );
  };

  const exportToCSV = () => {
    if (!processedProducts.length) return;
    
    const headers = 'NF-e,Código,NCM,Descrição,Valor Total,ICMS %,PIS %,COFINS %,Alíq Zero,Divergente,Impacto PIS,Impacto COFINS,Alertas\n';
    const rows = processedProducts.map(p => {
      const alertasText = p.alertas?.map(a => a.mensagem).join('; ') || '';
      return [
        p.documento,
        p.codigo,
        p.ncm,
        `"${(p.descricao || '').replace(/"/g, '""')}"`,
        p.valor_total?.toFixed(2),
        p.aliquotas?.icms?.toFixed(2),
        p.aliquotas?.pis?.toFixed(2),
        p.aliquotas?.cofins?.toFixed(2),
        p.ncm_aliq_zero ? 'Sim' : 'Não',
        p.is_divergente ? 'Sim' : 'Não',
        p.impacto_pis?.toFixed(2),
        p.impacto_cofins?.toFixed(2),
        `"${alertasText}"`
      ].join(',');
    }).join('\n');
    
    const BOM = '\uFEFF';
    const csv = BOM + headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analise_saidas_${selectedCompetencia.replace('/', '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getAlertColor = (tipo) => {
    switch (tipo) {
      case 'atencao': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'erro': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-[#A1A1AA] bg-[#0C0C0C] border-[#2A2A2A]200';
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-saidas-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ArrowUpCircle className="w-7 h-7" />
                Análise de Saídas
              </h1>
              <p className="text-orange-100 mt-1">
                Verificação de alíquotas e divergências nas notas de saída
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                disabled={loading || !selectedCompany}
                className="px-4 py-2 bg-[#141414]/20 hover:bg-[#141414]/30 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={exportToCSV}
                disabled={processedProducts.length === 0}
                className="px-4 py-2 bg-[#141414]/20 hover:bg-[#141414]/30 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {!selectedCompany ? (
          <div className="bg-yellow-50 rounded-xl p-8 text-center border border-yellow-200">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-yellow-900 mb-2">Selecione uma Empresa</h3>
            <p className="text-yellow-700">Clique no botão no header para selecionar</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-[#A1A1AA]">Analisando notas de saída...</p>
          </div>
        ) : analise ? (
          <>
            {/* Info empresa */}
            <div className="bg-[#141414] rounded-xl p-4 shadow-md border border-[#2A2A2A]100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-[#A1A1AA]">Analisando</p>
                  <p className="font-bold text-white">{analise.empresa}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-[#A1A1AA]">Competência: {analise.competencia}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      analise.regime_tributario === 'lucro_real' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {analise.regime_tributario === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-[#A1A1AA]">
                  <span className="font-medium">Alíquotas Esperadas:</span>
                  <span className="ml-2">ICMS: {analise.aliquotas_esperadas?.icms}%</span>
                  <span className="ml-2">PIS: {analise.aliquotas_esperadas?.pis}%</span>
                  <span className="ml-2">COFINS: {analise.aliquotas_esperadas?.cofins}%</span>
                </div>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[#141414] rounded-xl p-4 shadow-sm border border-[#2A2A2A]100">
                <p className="text-sm text-[#A1A1AA]">Total Documentos</p>
                <p className="text-2xl font-bold text-white">{analise.total_documentos_saida}</p>
              </div>
              <div className="bg-[#141414] rounded-xl p-4 shadow-sm border border-[#2A2A2A]100">
                <p className="text-sm text-[#A1A1AA]">Total Produtos</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
                <p className="text-sm text-green-700">Produtos OK</p>
                <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
              </div>
              <div className={`rounded-xl p-4 shadow-sm border ${stats.comAlerta > 0 ? 'bg-orange-50 border-orange-200' : 'bg-[#141414] border-[#2A2A2A]100'}`}>
                <p className="text-sm text-[#A1A1AA]">Com Alertas</p>
                <p className={`text-2xl font-bold ${stats.comAlerta > 0 ? 'text-orange-600' : 'text-white'}`}>
                  {stats.comAlerta}
                </p>
              </div>
              <div className={`rounded-xl p-4 shadow-sm border ${stats.divergentes > 0 ? 'bg-red-50 border-red-200' : 'bg-[#141414] border-[#2A2A2A]100'}`}>
                <p className="text-sm text-[#A1A1AA]">NCM Alíq Zero Tributado</p>
                <p className={`text-2xl font-bold ${stats.divergentes > 0 ? 'text-red-600' : 'text-white'}`}>
                  {stats.divergentes}
                </p>
              </div>
            </div>

            {/* Card de Impacto Fiscal */}
            {divergencias?.impacto_fiscal?.total_indevido > 0 && (
              <div className="bg-[#141414] border border-[#2A2A2A] text-white rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">Impacto Fiscal - PIS/COFINS Indevido</h3>
                    <p className="text-purple-200 text-sm">Produtos com NCM alíquota zero sendo tributados</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#141414]/20 rounded-lg p-4">
                    <p className="text-purple-200 text-sm">PIS Cobrado Indevidamente</p>
                    <p className="text-2xl font-bold">{formatCurrency(divergencias.impacto_fiscal.pis_indevido)}</p>
                  </div>
                  <div className="bg-[#141414]/20 rounded-lg p-4">
                    <p className="text-purple-200 text-sm">COFINS Cobrado Indevidamente</p>
                    <p className="text-2xl font-bold">{formatCurrency(divergencias.impacto_fiscal.cofins_indevido)}</p>
                  </div>
                  <div className="bg-[#141414]/30 rounded-lg p-4">
                    <p className="text-white text-sm font-semibold">TOTAL A RECUPERAR</p>
                    <p className="text-3xl font-bold">{formatCurrency(divergencias.impacto_fiscal.total_indevido)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info NCM Alíquota Zero */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Legenda:</p>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <span><span className="px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">AZ</span> = NCM com alíquota zero (não deveria ter PIS/COFINS)</span>
                    <span><span className="px-1 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">DIV</span> = Divergente (tributado indevidamente)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros e Controles */}
            <div className="bg-[#141414] rounded-xl shadow-md border border-[#2A2A2A]100 overflow-hidden">
              <div className="bg-[#0C0C0C] px-4 py-3 border-b border-[#2A2A2A]200 flex items-center justify-between flex-wrap gap-4">
                <h3 className="font-semibold text-white">
                  Produtos ({processedProducts.length})
                </h3>
                
                <div className="flex gap-2 items-center flex-wrap">
                  {/* Toggle de visualização */}
                  <div className="mr-4 flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('documento')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                        viewMode === 'documento' ? 'bg-[#141414] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-[#E0E0E0]'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Por NF-e
                    </button>
                    <button
                      onClick={() => setViewMode('produto')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                        viewMode === 'produto' ? 'bg-[#141414] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-[#E0E0E0]'
                      }`}
                    >
                      <Package className="w-3 h-3" />
                      Por Produto
                    </button>
                  </div>

                  {/* Filtros */}
                  <button
                    onClick={() => setFiltro('todos')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtro === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-[#E0E0E0]'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltro('com_alerta')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtro === 'com_alerta' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-[#E0E0E0]'
                    }`}
                  >
                    Com Alertas ({stats.comAlerta})
                  </button>
                  <button
                    onClick={() => setFiltro('divergentes')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtro === 'divergentes' ? 'bg-[#C8A951] text-white' : 'bg-gray-200 text-[#E0E0E0]'
                    }`}
                  >
                    Divergentes ({stats.divergentes})
                  </button>
                  <button
                    onClick={() => setFiltro('ok')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtro === 'ok' ? 'bg-green-600 text-white' : 'bg-gray-200 text-[#E0E0E0]'
                    }`}
                  >
                    OK ({stats.ok})
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto">
                  {processedProducts.length === 0 ? (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      {stats.total === 0 
                        ? 'Nenhuma NF de saída na competência selecionada'
                        : 'Nenhum produto com o filtro selecionado'
                      }
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-[#0C0C0C] sticky top-0">
                        <tr>
                          <SortableHeader label="NF-e" sortKey="documento" />
                          <SortableHeader label="Código" sortKey="codigo" />
                          <SortableHeader label="NCM" sortKey="ncm" />
                          <SortableHeader label="Descrição" sortKey="descricao" className="min-w-[200px]" />
                          <SortableHeader label="Valor" sortKey="valor_total" />
                          <SortableHeader label="ICMS %" sortKey="aliquotas.icms" />
                          <SortableHeader label="PIS %" sortKey="aliquotas.pis" />
                          <SortableHeader label="COFINS %" sortKey="aliquotas.cofins" />
                          {filtro === 'divergentes' && (
                            <>
                              <th className="px-3 py-2 text-right text-[#A1A1AA] text-xs font-medium">Impacto PIS</th>
                              <th className="px-3 py-2 text-right text-[#A1A1AA] text-xs font-medium">Impacto COFINS</th>
                            </>
                          )}
                          <th className="px-3 py-2 text-center text-[#A1A1AA] text-xs font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processedProducts.map((produto, idx) => (
                          <tr key={idx} className={produto.is_divergente ? 'bg-red-50/50' : produto.alertas?.length > 0 ? 'bg-orange-50/50' : ''}>
                            <td className="px-3 py-2 text-white font-medium">
                              {produto.documento}
                              {viewMode === 'produto' && produto.count > 1 && (
                                <span className="ml-1 text-xs text-[#A1A1AA]">({produto.count})</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-[#E0E0E0] font-mono text-xs">{produto.codigo}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[#E0E0E0] font-mono text-xs">{produto.ncm}</span>
                                {produto.ncm_aliq_zero && (
                                  <span className="px-1 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-medium" title="NCM com alíquota zero">
                                    AZ
                                  </span>
                                )}
                                {produto.is_divergente && (
                                  <span className="px-1 py-0.5 bg-red-100 text-red-700 text-[10px] rounded font-medium" title="Tributado indevidamente">
                                    DIV
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <p className="text-white truncate max-w-[200px]" title={produto.descricao}>
                                {produto.descricao}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-white">
                              {formatCurrency(produto.valor_total)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                produto.aliquotas?.icms === 0 ? 'bg-gray-100 text-[#A1A1AA]' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {formatPercent(produto.aliquotas?.icms)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                produto.aliquotas?.pis === 0 
                                  ? (produto.ncm_aliq_zero ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#A1A1AA]')
                                  : produto.is_divergente ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {formatPercent(produto.aliquotas?.pis)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                produto.aliquotas?.cofins === 0 
                                  ? (produto.ncm_aliq_zero ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#A1A1AA]')
                                  : produto.is_divergente ? 'bg-red-100 text-red-800' : 'bg-pink-100 text-pink-800'
                              }`}>
                                {formatPercent(produto.aliquotas?.cofins)}
                              </span>
                            </td>
                            {filtro === 'divergentes' && (
                              <>
                                <td className="px-3 py-2 text-right text-red-600 font-semibold">
                                  {formatCurrency(produto.impacto_pis)}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 font-semibold">
                                  {formatCurrency(produto.impacto_cofins)}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2 text-center">
                              {produto.is_divergente ? (
                                <div className="relative group">
                                  <AlertTriangle className="w-5 h-5 text-red-500 mx-auto cursor-help" />
                                  <div className="absolute right-0 top-6 z-10 hidden group-hover:block w-64 p-2 bg-[#141414] border rounded-lg shadow-lg">
                                    <div className="p-2 rounded text-xs border bg-red-50 border-red-200 text-red-700">
                                      <strong>NCM Alíq Zero:</strong> Produto deveria ter CST 06 (sem débito), mas está sendo tributado.
                                    </div>
                                  </div>
                                </div>
                              ) : produto.alertas?.length === 0 ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <div className="relative group">
                                  <AlertTriangle className="w-5 h-5 text-orange-500 mx-auto cursor-help" />
                                  <div className="absolute right-0 top-6 z-10 hidden group-hover:block w-72 p-2 bg-[#141414] border rounded-lg shadow-lg">
                                    {produto.alertas?.map((alerta, i) => (
                                      <div key={i} className={`p-2 mb-1 rounded text-xs border ${getAlertColor(alerta.tipo)}`}>
                                        <strong>{alerta.imposto}:</strong> {alerta.mensagem}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default AnaliseSaidas;
