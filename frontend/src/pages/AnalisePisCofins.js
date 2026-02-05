import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, CheckCircle, TrendingUp, TrendingDown, RefreshCw, 
  Filter, Download, ChevronUp, ChevronDown, DollarSign, FileText, 
  Package, ArrowRight, Info, X, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Componente de ícone de ordenação (fora do componente principal)
const SortIconComponent = ({ sortKey, currentKey, direction }) => {
  if (currentKey !== sortKey) return <ChevronUp className="w-4 h-4 opacity-30" />;
  return direction === 'asc' 
    ? <ChevronUp className="w-4 h-4" /> 
    : <ChevronDown className="w-4 h-4" />;
};

const AnalisePisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'impacto_total', direction: 'desc' });
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [visualizacao, setVisualizacao] = useState('nf'); // 'nf', 'produto', 'ncm'

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analise-pis-cofins-completa/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDados(response.data);
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

  const formatPercent = (value) => `${(value || 0).toFixed(2)}%`;

  // Ordenação
  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtrar e ordenar divergências
  const divergenciasFiltradas = useMemo(() => {
    if (!dados?.divergencias) return [];
    
    let result = [...dados.divergencias];
    
    // Filtrar por tipo
    if (filtroTipo !== 'todos') {
      result = result.map(doc => ({
        ...doc,
        produtos: doc.produtos.filter(p => p.tipo_divergencia === filtroTipo)
      })).filter(doc => doc.produtos.length > 0);
    }
    
    // Filtrar por busca
    if (busca) {
      const searchLower = busca.toLowerCase();
      result = result.map(doc => ({
        ...doc,
        produtos: doc.produtos.filter(p => 
          p.descricao?.toLowerCase().includes(searchLower) ||
          p.ncm?.includes(busca) ||
          p.codigo?.toLowerCase().includes(searchLower)
        )
      })).filter(doc => 
        doc.produtos.length > 0 ||
        doc.numero_nfe?.includes(busca) ||
        doc.cliente?.toLowerCase().includes(searchLower)
      );
    }
    
    // Calcular totais por documento
    result = result.map(doc => ({
      ...doc,
      impacto_total: doc.produtos.reduce((sum, p) => sum + Math.abs(p.impacto_pis || 0) + Math.abs(p.impacto_cofins || 0), 0),
      qtd_divergencias: doc.produtos.length
    }));
    
    // Ordenar
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [dados, filtroTipo, busca, sortConfig]);

  // Exportar CSV
  const exportCSV = () => {
    if (!dados) return;
    
    const headers = [
      'NF', 'Cliente', 'Produto', 'NCM', 'CFOP', 'Valor Produto',
      'CST PIS Atual', 'CST PIS Correto', 'Aliq PIS Atual', 'Aliq PIS Correta', 'PIS Atual', 'PIS Correto', 'Diferença PIS',
      'CST COFINS Atual', 'CST COFINS Correto', 'Aliq COFINS Atual', 'Aliq COFINS Correta', 'COFINS Atual', 'COFINS Correto', 'Diferença COFINS',
      'Tipo Divergência', 'Motivo'
    ];
    
    const rows = [];
    divergenciasFiltradas.forEach(doc => {
      doc.produtos.forEach(p => {
        rows.push([
          doc.numero_nfe,
          doc.cliente,
          p.descricao,
          p.ncm,
          p.cfop,
          p.valor_produto,
          p.cst_pis_atual,
          p.cst_pis_correto,
          p.aliq_pis_atual,
          p.aliq_pis_correto,
          p.v_pis_atual,
          p.v_pis_correto,
          p.impacto_pis,
          p.cst_cofins_atual,
          p.cst_cofins_correto,
          p.aliq_cofins_atual,
          p.aliq_cofins_correto,
          p.v_cofins_atual,
          p.v_cofins_correto,
          p.impacto_cofins,
          p.tipo_divergencia,
          p.motivo
        ]);
      });
    });
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analise_pis_cofins_${selectedCompetencia.replace('/', '-')}.csv`;
    link.click();
  };

  const getTipoDivergenciaLabel = (tipo) => {
    const labels = {
      'CFOP_SEM_DEBITO': 'CFOP sem débito',
      'NCM_MONOFASICO': 'NCM Monofásico',
      'NCM_ALIQUOTA_ZERO': 'NCM Alíq. Zero',
      'ALIQUOTA_INCORRETA': 'Alíquota Incorreta'
    };
    return labels[tipo] || tipo;
  };

  const getTipoDivergenciaColor = (tipo) => {
    const colors = {
      'CFOP_SEM_DEBITO': 'bg-purple-100 text-purple-800',
      'NCM_MONOFASICO': 'bg-blue-100 text-blue-800',
      'NCM_ALIQUOTA_ZERO': 'bg-green-100 text-green-800',
      'ALIQUOTA_INCORRETA': 'bg-orange-100 text-orange-800'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  if (!selectedCompany || !selectedCompetencia) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Selecione uma empresa e competência</h2>
            <p className="text-gray-500 mt-2">Use o seletor no topo da página</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-pis-cofins-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="w-7 h-7" />
                Análise de PIS/COFINS - Saídas
              </h1>
              <p className="text-indigo-100 mt-1">
                Verificação de divergências em NCMs e CFOPs • {selectedCompetencia}
              </p>
              {dados && (
                <p className="text-indigo-200 text-sm mt-1">
                  Regime: {dados.regime_tributario} (PIS {dados.aliquotas_regime?.pis}% / COFINS {dados.aliquotas_regime?.cofins}%)
                </p>
              )}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : dados ? (
          <>
            {/* Cards de Resumo - Compactos */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Total Saídas */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">Total Saídas</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dados.resumo.total_valor_saidas)}</p>
                <p className="text-xs text-gray-400">{dados.total_documentos} NFs • {dados.total_produtos} itens</p>
              </div>

              {/* PIS */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">PIS</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dados.resumo.total_pis_declarado)}</p>
                <p className="text-xs text-gray-400">Correto: {formatCurrency(dados.resumo.total_pis_correto)}</p>
              </div>

              {/* COFINS */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">COFINS</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dados.resumo.total_cofins_declarado)}</p>
                <p className="text-xs text-gray-400">Correto: {formatCurrency(dados.resumo.total_cofins_correto)}</p>
              </div>

              {/* Pagou a MAIS */}
              <div className={`rounded-lg p-4 border ${dados.resumo.diferenca_total > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-red-600 uppercase font-semibold">⬆ Pagou a Mais</p>
                <p className={`text-lg font-bold ${dados.resumo.diferenca_total > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {formatCurrency(dados.resumo.diferenca_total > 0 ? dados.resumo.diferenca_total : 0)}
                </p>
                <p className="text-xs text-red-500">{dados.total_divergentes} divergências</p>
              </div>

              {/* Pagou a MENOS */}
              <div className={`rounded-lg p-4 border ${dados.resumo.diferenca_total < 0 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-amber-600 uppercase font-semibold">⬇ Pagou a Menos</p>
                <p className={`text-lg font-bold ${dados.resumo.diferenca_total < 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {formatCurrency(dados.resumo.diferenca_total < 0 ? Math.abs(dados.resumo.diferenca_total) : 0)}
                </p>
                <p className="text-xs text-amber-500">Risco fiscal</p>
              </div>
            </div>
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    ) : dados.resumo.diferenca_total < 0 ? (
                      <TrendingDown className="w-6 h-6 text-green-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                </div>
            {/* Resumo por Tipo de Divergência - Compacto */}
            {dados.total_divergentes > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Por Tipo de Divergência (clique para filtrar)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dados.resumo.por_tipo_divergencia).map(([tipo, info]) => (
                    info.qtd > 0 && (
                      <button 
                        key={tipo} 
                        onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                          filtroTipo === tipo 
                            ? 'ring-2 ring-indigo-500 ' + getTipoDivergenciaColor(tipo)
                            : getTipoDivergenciaColor(tipo) + ' hover:opacity-80'
                        }`}
                      >
                        {getTipoDivergenciaLabel(tipo)}: {info.qtd} • {formatCurrency(info.impacto_total)}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Filtros e Busca */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar NF, produto, NCM..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                
                <button
                  onClick={exportCSV}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
              
              {/* Abas de Visualização */}
              <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
                <button
                  onClick={() => setVisualizacao('nf')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    visualizacao === 'nf' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Por NF
                </button>
                <button
                  onClick={() => setVisualizacao('produto')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    visualizacao === 'produto' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Por Produto
                </button>
                <button
                  onClick={() => setVisualizacao('ncm')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    visualizacao === 'ncm' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Por NCM
                </button>
                <span className="ml-auto text-xs text-gray-500">
                  {dados.total_divergentes} divergências
                </span>
              </div>
            </div>

            {/* Visualização por Produto - Compacta */}
            {visualizacao === 'produto' && dados.agrupamentos?.por_produto?.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Produto</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">NCM</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Qtd</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Valor</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Impacto</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dados.agrupamentos.por_produto.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 truncate max-w-[200px]" title={item.descricao}>{item.descricao}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs">{item.ncm}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.qtd_ocorrencias}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(item.valor_total)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{formatCurrency(item.impacto_total)}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getTipoDivergenciaColor(item.tipo_divergencia)}`}>
                              {getTipoDivergenciaLabel(item.tipo_divergencia)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visualização por NCM - Compacta */}
            {visualizacao === 'ncm' && dados.agrupamentos?.por_ncm?.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">NCM</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Exemplos</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Qtd</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Valor</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Impacto</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dados.agrupamentos.por_ncm.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-bold text-gray-900">{item.ncm}</td>
                          <td className="px-3 py-2">
                            <div className="text-xs text-gray-600 max-w-[180px] truncate" title={item.produtos?.join(', ')}>
                              {item.produtos?.slice(0, 2).join(', ')}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.qtd_ocorrencias}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(item.valor_total)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{formatCurrency(item.impacto_total)}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getTipoDivergenciaColor(item.tipo_divergencia)}`}>
                              {getTipoDivergenciaLabel(item.tipo_divergencia)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visualização por NF - Com mais informações diretas */}
            {visualizacao === 'nf' && divergenciasFiltradas.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                          <button onClick={() => requestSort('numero_nfe')} className="flex items-center gap-1">
                            NF
                            <SortIconComponent sortKey="numero_nfe" currentKey={sortConfig.key} direction={sortConfig.direction} />
                          </button>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Produto / NCM</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">CST</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Valor</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">PIS Atual→Correto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">COFINS Atual→Correto</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                          <button onClick={() => requestSort('impacto_total')} className="flex items-center gap-1 ml-auto">
                            Impacto
                            <SortIconComponent sortKey="impacto_total" currentKey={sortConfig.key} direction={sortConfig.direction} />
                          </button>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {divergenciasFiltradas.map((doc, idx) => (
                        doc.produtos.map((prod, pIdx) => (
                          <tr key={`${idx}-${pIdx}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-semibold text-gray-900">{doc.numero_nfe}</div>
                              <div className="text-xs text-gray-400 truncate max-w-[100px]" title={doc.cliente}>{doc.cliente}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900 truncate max-w-[150px]" title={prod.descricao}>{prod.descricao}</div>
                              <div className="text-xs text-gray-500 font-mono">{prod.ncm} • {prod.cfop}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="text-xs">
                                <span className="text-red-600">{prod.cst_pis_atual || '-'}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600">{prod.cst_pis_correto || '-'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(prod.valor_produto)}</td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-red-600">{formatCurrency(prod.v_pis_atual)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600">{formatCurrency(prod.v_pis_correto)}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-red-600">{formatCurrency(prod.v_cofins_atual)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-600">{formatCurrency(prod.v_cofins_correto)}</span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-bold ${(prod.impacto_pis + prod.impacto_cofins) > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                {formatCurrency(Math.abs(prod.impacto_pis || 0) + Math.abs(prod.impacto_cofins || 0))}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${getTipoDivergenciaColor(prod.tipo_divergencia)}`}>
                                {getTipoDivergenciaLabel(prod.tipo_divergencia)}
                              </span>
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
                          <button onClick={() => requestSort('qtd_divergencias')} className="flex items-center gap-1 hover:text-gray-900">
                            Divergências
                            <SortIconComponent sortKey="qtd_divergencias" currentKey={sortConfig.key} direction={sortConfig.direction} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('valor_total')} className="flex items-center gap-1 hover:text-gray-900">
                            Valor NF
                            <SortIconComponent sortKey="valor_total" currentKey={sortConfig.key} direction={sortConfig.direction} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          <button onClick={() => requestSort('impacto_total')} className="flex items-center gap-1 hover:text-gray-900">
                            Impacto Fiscal
                            <SortIconComponent sortKey="impacto_total" currentKey={sortConfig.key} direction={sortConfig.direction} />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                          Detalhes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {divergenciasFiltradas.map((doc, idx) => (
                        <React.Fragment key={doc.documento_id || idx}>
                          <tr className={`hover:bg-gray-50 ${expandedDoc === idx ? 'bg-indigo-50' : ''}`}>
                            <td className="px-4 py-4">
                              <div className="font-semibold text-gray-900">NF {doc.numero_nfe}</div>
                              <div className="text-sm text-gray-500 truncate max-w-[250px]">{doc.cliente}</div>
                              <div className="text-xs text-gray-400">{doc.data_emissao}</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                {doc.qtd_divergencias} {doc.qtd_divergencias === 1 ? 'item' : 'itens'}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-medium text-gray-900">
                              {formatCurrency(doc.valor_total)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-bold text-red-600">{formatCurrency(doc.impacto_total)}</div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => setExpandedDoc(expandedDoc === idx ? null : idx)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition"
                              >
                                {expandedDoc === idx ? (
                                  <ChevronUp className="w-5 h-5 text-indigo-600" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600" />
                                )}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Detalhes expandidos */}
                          {expandedDoc === idx && (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 bg-gray-50">
                                <div className="space-y-3">
                                  {doc.produtos.map((prod, pIdx) => (
                                    <div key={pIdx} className="bg-white rounded-lg border border-gray-200 p-4">
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <div className="font-semibold text-gray-900">{prod.descricao}</div>
                                          <div className="text-sm text-gray-500">
                                            NCM: {prod.ncm} | CFOP: {prod.cfop} | Código: {prod.codigo}
                                          </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTipoDivergenciaColor(prod.tipo_divergencia)}`}>
                                          {getTipoDivergenciaLabel(prod.tipo_divergencia)}
                                        </span>
                                      </div>
                                      
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                                        <div className="flex items-center gap-2 text-amber-800 text-sm">
                                          <Info className="w-4 h-4" />
                                          <span className="font-medium">{prod.motivo}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-4">
                                        {/* Coluna: Como está */}
                                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                          <h4 className="text-xs font-semibold text-red-800 uppercase mb-2">Como Está (Atual)</h4>
                                          <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">CST PIS:</span>
                                              <span className="font-medium">{prod.cst_pis_atual || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Alíq PIS:</span>
                                              <span className="font-medium">{formatPercent(prod.aliq_pis_atual)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Valor PIS:</span>
                                              <span className="font-bold text-red-700">{formatCurrency(prod.v_pis_atual)}</span>
                                            </div>
                                            <div className="border-t border-red-200 my-2" />
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">CST COFINS:</span>
                                              <span className="font-medium">{prod.cst_cofins_atual || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Alíq COFINS:</span>
                                              <span className="font-medium">{formatPercent(prod.aliq_cofins_atual)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Valor COFINS:</span>
                                              <span className="font-bold text-red-700">{formatCurrency(prod.v_cofins_atual)}</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Coluna: Como deveria */}
                                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                          <h4 className="text-xs font-semibold text-green-800 uppercase mb-2">Como Deveria (Correto)</h4>
                                          <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">CST PIS:</span>
                                              <span className="font-medium">{prod.cst_pis_correto || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Alíq PIS:</span>
                                              <span className="font-medium">{formatPercent(prod.aliq_pis_correto)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Valor PIS:</span>
                                              <span className="font-bold text-green-700">{formatCurrency(prod.v_pis_correto)}</span>
                                            </div>
                                            <div className="border-t border-green-200 my-2" />
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">CST COFINS:</span>
                                              <span className="font-medium">{prod.cst_cofins_correto || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Alíq COFINS:</span>
                                              <span className="font-medium">{formatPercent(prod.aliq_cofins_correto)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Valor COFINS:</span>
                                              <span className="font-bold text-green-700">{formatCurrency(prod.v_cofins_correto)}</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Coluna: Diferença */}
                                        <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
                                          <h4 className="text-xs font-semibold text-gray-800 uppercase mb-2">Diferença (Impacto)</h4>
                                          <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Valor Produto:</span>
                                              <span className="font-medium">{formatCurrency(prod.valor_produto)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Base Cálculo:</span>
                                              <span className="font-medium">{formatCurrency(prod.bc_pis)}</span>
                                            </div>
                                            <div className="border-t border-gray-300 my-2" />
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Dif. PIS:</span>
                                              <span className={`font-bold ${prod.impacto_pis > 0 ? 'text-red-600' : prod.impacto_pis < 0 ? 'text-green-600' : ''}`}>
                                                {prod.impacto_pis > 0 ? '+' : ''}{formatCurrency(prod.impacto_pis)}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Dif. COFINS:</span>
                                              <span className={`font-bold ${prod.impacto_cofins > 0 ? 'text-red-600' : prod.impacto_cofins < 0 ? 'text-green-600' : ''}`}>
                                                {prod.impacto_cofins > 0 ? '+' : ''}{formatCurrency(prod.impacto_cofins)}
                                              </span>
                                            </div>
                                            <div className="border-t border-gray-300 my-2" />
                                            <div className="flex justify-between text-base">
                                              <span className="font-semibold">TOTAL:</span>
                                              <span className={`font-bold ${(prod.impacto_pis + prod.impacto_cofins) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {formatCurrency(Math.abs(prod.impacto_pis || 0) + Math.abs(prod.impacto_cofins || 0))}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mensagem quando não há divergências */}
            {dados.total_divergentes === 0 && (
              <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Nenhuma divergência encontrada!</h2>
                <p className="text-gray-500 mt-2">
                  Todos os produtos estão com CST e alíquotas de PIS/COFINS corretos.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Carregando dados...</h2>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalisePisCofins;
