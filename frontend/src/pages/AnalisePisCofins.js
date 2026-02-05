import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, CheckCircle, RefreshCw, 
  Download, ChevronUp, ChevronDown, DollarSign, 
  Info, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Componente de ícone de ordenação
const SortIcon = ({ active, direction }) => {
  if (!active) return <ChevronUp className="w-3 h-3 opacity-30" />;
  return direction === 'asc' 
    ? <ChevronUp className="w-3 h-3" /> 
    : <ChevronDown className="w-3 h-3" />;
};

// Header de coluna ordenável (fora do componente principal)
const SortableHeader = ({ label, sortKey, sortConfig, onSort, className = '' }) => (
  <th className={`px-3 py-2 text-xs font-semibold text-gray-600 ${className}`}>
    <button 
      onClick={() => onSort(sortKey)} 
      className="flex items-center gap-1 hover:text-gray-900 transition"
    >
      {label}
      <SortIcon active={sortConfig.key === sortKey} direction={sortConfig.direction} />
    </button>
  </th>
);

const AnalisePisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'impacto_total', direction: 'desc' });
  const [visualizacao, setVisualizacao] = useState('nf');

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

  // Criar lista plana de produtos divergentes para ordenação completa
  const produtosDivergentes = useMemo(() => {
    if (!dados?.divergencias) return [];
    
    let lista = [];
    
    // Expandir documentos em lista plana de produtos
    dados.divergencias.forEach(doc => {
      doc.produtos.forEach(prod => {
        // Só incluir produtos realmente divergentes
        if (prod.divergente !== false) {
          lista.push({
            ...prod,
            numero_nfe: doc.numero_nfe,
            cliente: doc.cliente,
            data_emissao: doc.data_emissao,
            documento_id: doc.documento_id,
            impacto_total: Math.abs(prod.impacto_pis || 0) + Math.abs(prod.impacto_cofins || 0)
          });
        }
      });
    });
    
    // Filtrar por tipo
    if (filtroTipo !== 'todos') {
      lista = lista.filter(p => p.tipo_divergencia === filtroTipo);
    }
    
    // Filtrar por busca
    if (busca) {
      const searchLower = busca.toLowerCase();
      lista = lista.filter(p => 
        p.descricao?.toLowerCase().includes(searchLower) ||
        p.ncm?.includes(busca) ||
        p.codigo?.toLowerCase().includes(searchLower) ||
        p.numero_nfe?.includes(busca) ||
        p.cliente?.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenar
    lista.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Tratar valores numéricos
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Tratar strings
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return lista;
  }, [dados, filtroTipo, busca, sortConfig]);

  // Agrupamento por produto
  const agrupadoPorProduto = useMemo(() => {
    if (!dados?.agrupamentos?.por_produto) return [];
    let lista = [...dados.agrupamentos.por_produto];
    
    if (filtroTipo !== 'todos') {
      lista = lista.filter(p => p.tipo_divergencia === filtroTipo);
    }
    
    if (busca) {
      const searchLower = busca.toLowerCase();
      lista = lista.filter(p => 
        p.descricao?.toLowerCase().includes(searchLower) ||
        p.ncm?.includes(busca)
      );
    }
    
    lista.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? 0;
      let bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'number') return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return lista;
  }, [dados, filtroTipo, busca, sortConfig]);

  // Agrupamento por NCM
  const agrupadoPorNCM = useMemo(() => {
    if (!dados?.agrupamentos?.por_ncm) return [];
    let lista = [...dados.agrupamentos.por_ncm];
    
    if (filtroTipo !== 'todos') {
      lista = lista.filter(p => p.tipo_divergencia === filtroTipo);
    }
    
    if (busca) {
      lista = lista.filter(p => p.ncm?.includes(busca));
    }
    
    lista.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? 0;
      let bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'number') return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return lista;
  }, [dados, filtroTipo, busca, sortConfig]);

  // Exportar CSV
  const exportCSV = () => {
    if (!produtosDivergentes.length) return;
    
    const headers = [
      'NF', 'Cliente', 'Produto', 'NCM', 'CFOP', 'Valor Produto',
      'CST PIS Atual', 'CST PIS Correto', 'Aliq PIS Atual', 'Aliq PIS Correta', 'PIS Atual', 'PIS Correto', 'Diferença PIS',
      'CST COFINS Atual', 'CST COFINS Correto', 'Aliq COFINS Atual', 'Aliq COFINS Correta', 'COFINS Atual', 'COFINS Correto', 'Diferença COFINS',
      'Tipo Divergência', 'Motivo'
    ];
    
    const rows = produtosDivergentes.map(p => [
      p.numero_nfe, p.cliente, p.descricao, p.ncm, p.cfop, p.valor_produto,
      p.cst_pis_atual, p.cst_pis_correto, p.aliq_pis_atual, p.aliq_pis_correto,
      p.v_pis_atual, p.v_pis_correto, p.impacto_pis,
      p.cst_cofins_atual, p.cst_cofins_correto, p.aliq_cofins_atual, p.aliq_cofins_correto,
      p.v_cofins_atual, p.v_cofins_correto, p.impacto_cofins,
      p.tipo_divergencia, p.motivo
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_pis_cofins_${selectedCompetencia.replace('/', '-')}.csv`;
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

  // Header de coluna ordenável
  const SortableHeader = ({ label, sortKey, className = '' }) => (
    <th className={`px-3 py-2 text-xs font-semibold text-gray-600 ${className}`}>
      <button 
        onClick={() => requestSort(sortKey)} 
        className="flex items-center gap-1 hover:text-gray-900 transition"
      >
        {label}
        <SortIcon active={sortConfig.key === sortKey} direction={sortConfig.direction} />
      </button>
    </th>
  );

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
        <div className="bg-gradient-to-r from-red-700 to-red-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="w-7 h-7" />
                Auditoria de PIS/COFINS nas Operações de Saída
              </h1>
              <p className="text-red-100 mt-1">
                Identificação de Divergências Tributárias • Competência {selectedCompetencia}
              </p>
              {dados && (
                <p className="text-red-200 text-sm mt-1">
                  Regime Tributário: {dados.regime_tributario === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'} 
                  {dados.aliquotas_regime && ` (PIS ${dados.aliquotas_regime.pis}% / COFINS ${dados.aliquotas_regime.cofins}%)`}
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
            <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : dados ? (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">Total em Saídas</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dados.resumo?.total_valor_saidas)}</p>
                <p className="text-xs text-gray-400">{dados.total_documentos} NFs • {dados.total_produtos} itens</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">PIS Declarado</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dados.resumo?.total_pis_declarado)}</p>
                <p className="text-xs text-gray-400">Correto: {formatCurrency(dados.resumo?.total_pis_correto)}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase">COFINS Declarado</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(dados.resumo?.total_cofins_declarado)}</p>
                <p className="text-xs text-gray-400">Correto: {formatCurrency(dados.resumo?.total_cofins_correto)}</p>
              </div>

              <div className={`rounded-lg p-4 border ${dados.resumo?.diferenca_total > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-red-700 uppercase font-semibold">Tributo Pago a Maior</p>
                <p className={`text-lg font-bold ${dados.resumo?.diferenca_total > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {formatCurrency(dados.resumo?.diferenca_total > 0 ? dados.resumo.diferenca_total : 0)}
                </p>
                <p className="text-xs text-red-500">{dados.total_divergentes} divergências</p>
              </div>

              <div className={`rounded-lg p-4 border ${dados.resumo?.diferenca_total < 0 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs text-amber-700 uppercase font-semibold">Tributo Pago a Menor</p>
                <p className={`text-lg font-bold ${dados.resumo?.diferenca_total < 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {formatCurrency(dados.resumo?.diferenca_total < 0 ? Math.abs(dados.resumo.diferenca_total) : 0)}
                </p>
                <p className="text-xs text-amber-600">Passivo Tributário</p>
              </div>
            </div>

            {/* Filtros por Tipo de Divergência */}
            {dados.total_divergentes > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Filtrar por Tipo de Divergência
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setFiltroTipo('todos')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                      filtroTipo === 'todos' 
                        ? 'ring-2 ring-red-500 bg-gray-100 text-gray-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({dados.total_divergentes})
                  </button>
                  {dados.resumo?.por_tipo_divergencia && Object.entries(dados.resumo.por_tipo_divergencia).map(([tipo, info]) => (
                    info.qtd > 0 && (
                      <button 
                        key={tipo} 
                        onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                          filtroTipo === tipo 
                            ? 'ring-2 ring-red-500 ' + getTipoDivergenciaColor(tipo)
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

            {/* Busca e Visualizações */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar NF, produto, NCM, cliente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                
                <button
                  onClick={exportCSV}
                  disabled={!produtosDivergentes.length}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
              
              {/* Abas */}
              <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
                <button
                  onClick={() => setVisualizacao('nf')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    visualizacao === 'nf' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Por Nota Fiscal
                </button>
                <button
                  onClick={() => setVisualizacao('produto')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    visualizacao === 'produto' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Por Produto
                </button>
                <button
                  onClick={() => setVisualizacao('ncm')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                    visualizacao === 'ncm' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Por NCM
                </button>
                <span className="ml-auto text-xs text-gray-500">
                  {visualizacao === 'nf' ? produtosDivergentes.length : 
                   visualizacao === 'produto' ? agrupadoPorProduto.length : agrupadoPorNCM.length} registros
                </span>
              </div>
            </div>

            {/* Tabela Por NF - Todas as colunas ordenáveis */}
            {visualizacao === 'nf' && produtosDivergentes.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <SortableHeader label="NF" sortKey="numero_nfe" className="text-left" />
                        <SortableHeader label="Produto" sortKey="descricao" className="text-left" />
                        <SortableHeader label="NCM" sortKey="ncm" className="text-left" />
                        <SortableHeader label="CFOP" sortKey="cfop" className="text-center" />
                        <SortableHeader label="Valor" sortKey="valor_produto" className="text-right" />
                        <SortableHeader label="PIS Atual" sortKey="v_pis_atual" className="text-right" />
                        <SortableHeader label="PIS Correto" sortKey="v_pis_correto" className="text-right" />
                        <SortableHeader label="COFINS Atual" sortKey="v_cofins_atual" className="text-right" />
                        <SortableHeader label="COFINS Correto" sortKey="v_cofins_correto" className="text-right" />
                        <SortableHeader label="Impacto" sortKey="impacto_total" className="text-right" />
                        <SortableHeader label="Tipo" sortKey="tipo_divergencia" className="text-left" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {produtosDivergentes.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-gray-900">{prod.numero_nfe}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[100px]" title={prod.cliente}>{prod.cliente}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 truncate max-w-[180px]" title={prod.descricao}>{prod.descricao}</div>
                            <div className="text-xs text-gray-400">{prod.codigo}</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{prod.ncm}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{prod.cfop}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(prod.valor_produto)}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">{formatCurrency(prod.v_pis_atual)}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">{formatCurrency(prod.v_pis_correto)}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">{formatCurrency(prod.v_cofins_atual)}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">{formatCurrency(prod.v_cofins_correto)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-bold ${prod.impacto_total > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                              {formatCurrency(prod.impacto_total)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getTipoDivergenciaColor(prod.tipo_divergencia)}`}>
                              {getTipoDivergenciaLabel(prod.tipo_divergencia)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabela Por Produto */}
            {visualizacao === 'produto' && agrupadoPorProduto.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <SortableHeader label="Produto" sortKey="descricao" className="text-left" />
                        <SortableHeader label="NCM" sortKey="ncm" className="text-left" />
                        <SortableHeader label="Ocorrências" sortKey="qtd_ocorrencias" className="text-center" />
                        <SortableHeader label="Valor Total" sortKey="valor_total" className="text-right" />
                        <SortableHeader label="Impacto Total" sortKey="impacto_total" className="text-right" />
                        <SortableHeader label="Tipo" sortKey="tipo_divergencia" className="text-left" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agrupadoPorProduto.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 truncate max-w-[220px]" title={item.descricao}>{item.descricao}</div>
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

            {/* Tabela Por NCM */}
            {visualizacao === 'ncm' && agrupadoPorNCM.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <SortableHeader label="NCM" sortKey="ncm" className="text-left" />
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Produtos</th>
                        <SortableHeader label="Ocorrências" sortKey="qtd_ocorrencias" className="text-center" />
                        <SortableHeader label="Valor Total" sortKey="valor_total" className="text-right" />
                        <SortableHeader label="Impacto Total" sortKey="impacto_total" className="text-right" />
                        <SortableHeader label="Tipo" sortKey="tipo_divergencia" className="text-left" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agrupadoPorNCM.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-bold text-gray-900">{item.ncm}</td>
                          <td className="px-3 py-2">
                            <div className="text-xs text-gray-600 max-w-[200px] truncate" title={item.produtos?.join(', ')}>
                              {item.produtos?.slice(0, 2).join(', ')}
                              {item.produtos?.length > 2 && ` +${item.produtos.length - 2}`}
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

            {/* Mensagem quando não há divergências */}
            {dados.total_divergentes === 0 && (
              <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Nenhuma divergência identificada</h2>
                <p className="text-gray-500 mt-2">
                  Todos os produtos nas notas de saída estão com CST e alíquotas de PIS/COFINS em conformidade.
                </p>
              </div>
            )}

            {/* Mensagem quando filtro não retorna resultados */}
            {dados.total_divergentes > 0 && produtosDivergentes.length === 0 && visualizacao === 'nf' && (
              <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-700">Nenhum resultado para o filtro aplicado</h2>
                <p className="text-gray-500 mt-2">Tente alterar os critérios de busca ou o tipo de divergência.</p>
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
