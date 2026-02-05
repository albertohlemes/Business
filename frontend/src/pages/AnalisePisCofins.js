import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, CheckCircle, RefreshCw, 
  Download, ChevronUp, ChevronDown, DollarSign, 
  Info, Search, TrendingUp, TrendingDown
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

// Header de coluna ordenável
const SortableHeader = ({ label, sortKey, sortConfig, onSort, className = '' }) => (
  <th className={`px-2 py-2 text-xs font-semibold text-gray-600 whitespace-nowrap ${className}`}>
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

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatPercent = (value) => `${(value || 0).toFixed(2)}%`;

  const requestSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const renderSortableHeader = (label, sortKey, className = '') => (
    <SortableHeader label={label} sortKey={sortKey} sortConfig={sortConfig} onSort={requestSort} className={className} />
  );

  // Lista plana de produtos divergentes
  const produtosDivergentes = useMemo(() => {
    if (!dados?.divergencias) return [];
    let lista = [];
    dados.divergencias.forEach(doc => {
      doc.produtos.forEach(prod => {
        if (prod.divergente !== false) {
          lista.push({
            ...prod,
            numero_nfe: doc.numero_nfe,
            cliente: doc.cliente,
            impacto_total: Math.abs(prod.impacto_pis || 0) + Math.abs(prod.impacto_cofins || 0)
          });
        }
      });
    });
    
    if (filtroTipo !== 'todos') lista = lista.filter(p => p.tipo_divergencia === filtroTipo);
    if (busca) {
      const s = busca.toLowerCase();
      lista = lista.filter(p => 
        p.descricao?.toLowerCase().includes(s) || p.ncm?.includes(busca) ||
        p.numero_nfe?.includes(busca) || p.cliente?.toLowerCase().includes(s)
      );
    }
    
    lista.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? 0, bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'number') return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });
    return lista;
  }, [dados, filtroTipo, busca, sortConfig]);

  // Agrupamentos
  const agrupadoPorProduto = useMemo(() => {
    if (!dados?.agrupamentos?.por_produto) return [];
    let lista = [...dados.agrupamentos.por_produto];
    if (filtroTipo !== 'todos') lista = lista.filter(p => p.tipo_divergencia === filtroTipo);
    if (busca) {
      const s = busca.toLowerCase();
      lista = lista.filter(p => p.descricao?.toLowerCase().includes(s) || p.ncm?.includes(busca));
    }
    lista.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? 0, bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'number') return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      return 0;
    });
    return lista;
  }, [dados, filtroTipo, busca, sortConfig]);

  const agrupadoPorNCM = useMemo(() => {
    if (!dados?.agrupamentos?.por_ncm) return [];
    let lista = [...dados.agrupamentos.por_ncm];
    if (filtroTipo !== 'todos') lista = lista.filter(p => p.tipo_divergencia === filtroTipo);
    if (busca) lista = lista.filter(p => p.ncm?.includes(busca));
    lista.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? 0, bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'number') return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      return 0;
    });
    return lista;
  }, [dados, filtroTipo, busca, sortConfig]);

  // CSV Export
  const exportCSV = () => {
    if (!produtosDivergentes.length) return;
    const headers = ['NF','Cliente','Produto','NCM','CFOP','Valor','CST PIS XML','CST PIS Correto','Aliq PIS XML','Aliq PIS Correta','PIS XML','PIS Correto','Dif PIS','CST COF XML','CST COF Correto','Aliq COF XML','Aliq COF Correta','COF XML','COF Correto','Dif COF','Tipo','Motivo'];
    const rows = produtosDivergentes.map(p => [p.numero_nfe,p.cliente,p.descricao,p.ncm,p.cfop,p.valor_produto,p.cst_pis_atual,p.cst_pis_correto,p.aliq_pis_atual,p.aliq_pis_correto,p.v_pis_atual,p.v_pis_correto,p.impacto_pis,p.cst_cofins_atual,p.cst_cofins_correto,p.aliq_cofins_atual,p.aliq_cofins_correto,p.v_cofins_atual,p.v_cofins_correto,p.impacto_cofins,p.tipo_divergencia,p.motivo]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_pis_cofins_${selectedCompetencia.replace('/', '-')}.csv`;
    link.click();
  };

  const getTipoDivergenciaLabel = (tipo) => ({
    'CFOP_SEM_DEBITO': 'CFOP s/ débito', 'NCM_MONOFASICO': 'Monofásico',
    'NCM_ALIQUOTA_ZERO': 'Alíq. Zero', 'ALIQUOTA_INCORRETA': 'Alíq. Incorreta'
  }[tipo] || tipo);

  const getTipoDivergenciaColor = (tipo) => ({
    'CFOP_SEM_DEBITO': 'bg-purple-100 text-purple-800', 'NCM_MONOFASICO': 'bg-blue-100 text-blue-800',
    'NCM_ALIQUOTA_ZERO': 'bg-green-100 text-green-800', 'ALIQUOTA_INCORRETA': 'bg-orange-100 text-orange-800'
  }[tipo] || 'bg-gray-100 text-gray-800');

  if (!selectedCompany || !selectedCompetencia) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Selecione uma empresa e competência</h2>
          </div>
        </div>
      </Layout>
    );
  }

  // Calcular valores para cards
  const diferenca = dados?.resumo?.diferenca_total || 0;
  const pagoAMais = diferenca > 0 ? diferenca : 0;
  const pagoAMenos = diferenca < 0 ? Math.abs(diferenca) : 0;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-pis-cofins-page" className="space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 to-red-800 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Auditoria de PIS/COFINS nas Operações de Saída
              </h1>
              <p className="text-red-100 text-sm mt-1">
                Competência {selectedCompetencia} • Regime: {dados?.regime_tributario || '-'}
                {dados?.aliquotas_regime && ` (PIS ${dados.aliquotas_regime.pis}% / COFINS ${dados.aliquotas_regime.cofins}%)`}
              </p>
            </div>
            <button onClick={fetchData} disabled={loading} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-red-600" /></div>
        ) : dados ? (
          <>
            {/* Cards Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-[10px] text-gray-500 uppercase">Total Saídas</p>
                <p className="text-base font-bold">{formatCurrency(dados.resumo?.total_valor_saidas)}</p>
                <p className="text-[10px] text-gray-400">{dados.total_documentos} NFs • {dados.total_produtos} itens</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-[10px] text-gray-500 uppercase">PIS no XML</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(dados.resumo?.total_pis_declarado)}</p>
                <p className="text-[10px] text-gray-400">Correto: {formatCurrency(dados.resumo?.total_pis_correto)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-[10px] text-gray-500 uppercase">COFINS no XML</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(dados.resumo?.total_cofins_declarado)}</p>
                <p className="text-[10px] text-gray-400">Correto: {formatCurrency(dados.resumo?.total_cofins_correto)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border">
                <p className="text-[10px] text-gray-500 uppercase">Total Divergências</p>
                <p className="text-base font-bold text-amber-600">{dados.total_divergentes}</p>
                <p className="text-[10px] text-gray-400">itens com problema</p>
              </div>
              <div className={`rounded-lg p-3 border ${pagoAMais > 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
                <p className="text-[10px] text-green-700 uppercase font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tributo Pago a Maior
                </p>
                <p className={`text-base font-bold ${pagoAMais > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formatCurrency(pagoAMais)}
                </p>
                <p className="text-[10px] text-green-600">Crédito a recuperar</p>
              </div>
              <div className={`rounded-lg p-3 border ${pagoAMenos > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50'}`}>
                <p className="text-[10px] text-red-700 uppercase font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Tributo Pago a Menor
                </p>
                <p className={`text-base font-bold ${pagoAMenos > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {formatCurrency(pagoAMenos)}
                </p>
                <p className="text-[10px] text-red-600">Passivo tributário</p>
              </div>
            </div>

            {/* Filtros */}
            {dados.total_divergentes > 0 && (
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Filtrar:</span>
                  <button onClick={() => setFiltroTipo('todos')}
                    className={`px-2 py-1 rounded text-xs font-medium ${filtroTipo === 'todos' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    Todos ({dados.total_divergentes})
                  </button>
                  {dados.resumo?.por_tipo_divergencia && Object.entries(dados.resumo.por_tipo_divergencia).map(([tipo, info]) => (
                    info.qtd > 0 && (
                      <button key={tipo} onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
                        className={`px-2 py-1 rounded text-xs font-medium ${filtroTipo === tipo ? 'ring-2 ring-red-500 ' + getTipoDivergenciaColor(tipo) : getTipoDivergenciaColor(tipo)}`}>
                        {getTipoDivergenciaLabel(tipo)}: {info.qtd}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Busca e Abas */}
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border rounded text-sm" />
                </div>
                <button onClick={exportCSV} disabled={!produtosDivergentes.length}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 flex items-center gap-1 disabled:opacity-50">
                  <Download className="w-3 h-3" /> CSV
                </button>
                <div className="flex gap-1 ml-auto">
                  {['nf', 'produto', 'ncm'].map(v => (
                    <button key={v} onClick={() => setVisualizacao(v)}
                      className={`px-3 py-1.5 rounded text-xs font-medium ${visualizacao === v ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {v === 'nf' ? 'Por NF' : v === 'produto' ? 'Por Produto' : 'Por NCM'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabela Por NF */}
            {visualizacao === 'nf' && produtosDivergentes.length > 0 && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        {renderSortableHeader("NF", "numero_nfe", "text-left")}
                        {renderSortableHeader("Produto", "descricao", "text-left")}
                        {renderSortableHeader("NCM", "ncm", "text-left")}
                        {renderSortableHeader("Valor", "valor_produto", "text-right")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>CST PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Alíq PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Valor PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>CST COF</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Alíq COF</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Valor COF</th>
                        {renderSortableHeader("Impacto", "impacto_total", "text-right")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600">Tipo</th>
                      </tr>
                      <tr className="bg-gray-50 text-[10px] text-gray-500">
                        <th colSpan={4}></th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th colSpan={2}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {produtosDivergentes.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5"><div className="font-medium">{p.numero_nfe}</div><div className="text-[10px] text-gray-400 truncate max-w-[80px]">{p.cliente}</div></td>
                          <td className="px-2 py-1.5"><div className="truncate max-w-[150px]" title={p.descricao}>{p.descricao}</div></td>
                          <td className="px-2 py-1.5 font-mono">{p.ncm}</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(p.valor_produto)}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{p.cst_pis_atual || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{p.cst_pis_correto || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{formatPercent(p.aliq_pis_atual)}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{formatPercent(p.aliq_pis_correto)}</td>
                          <td className="px-1 py-1.5 text-right text-red-600">{formatCurrency(p.v_pis_atual)}</td>
                          <td className="px-1 py-1.5 text-right text-green-600">{formatCurrency(p.v_pis_correto)}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{p.cst_cofins_atual || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{p.cst_cofins_correto || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{formatPercent(p.aliq_cofins_atual)}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{formatPercent(p.aliq_cofins_correto)}</td>
                          <td className="px-1 py-1.5 text-right text-red-600">{formatCurrency(p.v_cofins_atual)}</td>
                          <td className="px-1 py-1.5 text-right text-green-600">{formatCurrency(p.v_cofins_correto)}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-amber-600">{formatCurrency(p.impacto_total)}</td>
                          <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] ${getTipoDivergenciaColor(p.tipo_divergencia)}`}>{getTipoDivergenciaLabel(p.tipo_divergencia)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabela Por Produto */}
            {visualizacao === 'produto' && agrupadoPorProduto.length > 0 && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        {renderSortableHeader("Produto", "descricao", "text-left")}
                        {renderSortableHeader("NCM", "ncm", "text-left")}
                        {renderSortableHeader("Qtd", "qtd_ocorrencias", "text-center")}
                        {renderSortableHeader("Valor Total", "valor_total", "text-right")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>CST PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Alíq PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Valor PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>CST COF</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Alíq COF</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Valor COF</th>
                        {renderSortableHeader("Impacto", "impacto_total", "text-right")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600">Tipo</th>
                      </tr>
                      <tr className="bg-gray-50 text-[10px] text-gray-500">
                        <th colSpan={4}></th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th colSpan={2}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agrupadoPorProduto.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5"><div className="truncate max-w-[180px] font-medium" title={p.descricao}>{p.descricao}</div></td>
                          <td className="px-2 py-1.5 font-mono">{p.ncm}</td>
                          <td className="px-2 py-1.5 text-center">{p.qtd_ocorrencias}</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(p.valor_total)}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{p.cst_pis_atual || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{p.cst_pis_correto || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{formatPercent(p.aliq_pis_atual)}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{formatPercent(p.aliq_pis_correto)}</td>
                          <td className="px-1 py-1.5 text-right text-red-600">{formatCurrency(p.v_pis_atual)}</td>
                          <td className="px-1 py-1.5 text-right text-green-600">{formatCurrency(p.v_pis_correto)}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{p.cst_cofins_atual || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{p.cst_cofins_correto || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{formatPercent(p.aliq_cofins_atual)}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{formatPercent(p.aliq_cofins_correto)}</td>
                          <td className="px-1 py-1.5 text-right text-red-600">{formatCurrency(p.v_cofins_atual)}</td>
                          <td className="px-1 py-1.5 text-right text-green-600">{formatCurrency(p.v_cofins_correto)}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-amber-600">{formatCurrency(p.impacto_total)}</td>
                          <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] ${getTipoDivergenciaColor(p.tipo_divergencia)}`}>{getTipoDivergenciaLabel(p.tipo_divergencia)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tabela Por NCM */}
            {visualizacao === 'ncm' && agrupadoPorNCM.length > 0 && (
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        {renderSortableHeader("NCM", "ncm", "text-left")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-left">Produtos</th>
                        {renderSortableHeader("Qtd", "qtd_ocorrencias", "text-center")}
                        {renderSortableHeader("Valor Total", "valor_total", "text-right")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>CST PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Alíq PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Valor PIS</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>CST COF</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Alíq COF</th>
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600 text-center" colSpan={2}>Valor COF</th>
                        {renderSortableHeader("Impacto", "impacto_total", "text-right")}
                        <th className="px-2 py-2 text-xs font-semibold text-gray-600">Tipo</th>
                      </tr>
                      <tr className="bg-gray-50 text-[10px] text-gray-500">
                        <th colSpan={4}></th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th className="px-1 py-0.5 text-red-600">XML</th><th className="px-1 py-0.5 text-green-600">OK</th>
                        <th colSpan={2}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {agrupadoPorNCM.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 font-mono font-bold">{p.ncm}</td>
                          <td className="px-2 py-1.5"><div className="text-[10px] text-gray-500 truncate max-w-[150px]" title={p.produtos?.join(', ')}>{p.produtos?.slice(0,2).join(', ')}</div></td>
                          <td className="px-2 py-1.5 text-center">{p.qtd_ocorrencias}</td>
                          <td className="px-2 py-1.5 text-right">{formatCurrency(p.valor_total)}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{p.cst_pis_atual || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{p.cst_pis_correto || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{formatPercent(p.aliq_pis_atual)}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{formatPercent(p.aliq_pis_correto)}</td>
                          <td className="px-1 py-1.5 text-right text-red-600">{formatCurrency(p.v_pis_atual)}</td>
                          <td className="px-1 py-1.5 text-right text-green-600">{formatCurrency(p.v_pis_correto)}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{p.cst_cofins_atual || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{p.cst_cofins_correto || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-600">{formatPercent(p.aliq_cofins_atual)}</td>
                          <td className="px-1 py-1.5 text-center text-green-600">{formatPercent(p.aliq_cofins_correto)}</td>
                          <td className="px-1 py-1.5 text-right text-red-600">{formatCurrency(p.v_cofins_atual)}</td>
                          <td className="px-1 py-1.5 text-right text-green-600">{formatCurrency(p.v_cofins_correto)}</td>
                          <td className="px-2 py-1.5 text-right font-bold text-amber-600">{formatCurrency(p.impacto_total)}</td>
                          <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] ${getTipoDivergenciaColor(p.tipo_divergencia)}`}>{getTipoDivergenciaLabel(p.tipo_divergencia)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sem divergências */}
            {dados.total_divergentes === 0 && (
              <div className="bg-white rounded-xl p-10 border text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-900">Nenhuma divergência identificada</h2>
                <p className="text-gray-500 text-sm mt-1">Todos os produtos estão com CST e alíquotas corretos.</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl p-10 border text-center">
            <Info className="w-14 h-14 text-gray-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-700">Carregando dados...</h2>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnalisePisCofins;
