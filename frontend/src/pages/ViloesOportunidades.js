import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, TrendingUp, ChevronDown, ChevronRight, Package, 
  Layers, DollarSign, ArrowUpRight, ArrowDownRight, Filter,
  RefreshCw, Search, Info, ArrowUpDown, Lightbulb, Target,
  AlertCircle, CheckCircle2, ChevronUp
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ViloesOportunidades = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ncm');
  const [activeType, setActiveType] = useState('viloes');
  const [expandedItems, setExpandedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'impacto', direction: 'desc' });
  const [productSortConfig, setProductSortConfig] = useState({ key: 'origem', direction: 'asc' });
  const [showAnalise, setShowAnalise] = useState(true);

  useEffect(() => {
    if (selectedCompany?.id && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchData = async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/viloes-oportunidades/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  // Função de ordenação
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Função de ordenação de produtos
  const handleProductSort = (key) => {
    setProductSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtrar e ordenar dados
  const filteredData = useMemo(() => {
    if (!data) return { viloes: [], oportunidades: [] };
    
    const source = activeTab === 'ncm' ? data.por_ncm : data.por_keyword;
    let viloes = [...(source?.viloes || [])];
    let oportunidades = [...(source?.oportunidades || [])];
    
    // Filtrar por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      viloes = viloes.filter(item => 
        (item.ncm && item.ncm.includes(term)) ||
        (item.keyword && item.keyword.includes(term)) ||
        (item.descricao && item.descricao.toLowerCase().includes(term))
      );
      oportunidades = oportunidades.filter(item => 
        (item.ncm && item.ncm.includes(term)) ||
        (item.keyword && item.keyword.includes(term)) ||
        (item.descricao && item.descricao.toLowerCase().includes(term))
      );
    }
    
    // Ordenar
    const sortFn = (a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'ncm':
          aVal = a.ncm || a.keyword || '';
          bVal = b.ncm || b.keyword || '';
          break;
        case 'descricao':
          aVal = a.descricao || '';
          bVal = b.descricao || '';
          break;
        case 'impacto':
          aVal = a.impacto_total || a.beneficio_total || 0;
          bVal = b.impacto_total || b.beneficio_total || 0;
          break;
        case 'entrada':
          aVal = a.entrada_valor || 0;
          bVal = b.entrada_valor || 0;
          break;
        case 'saida':
          aVal = a.saida_valor || 0;
          bVal = b.saida_valor || 0;
          break;
        case 'margem':
          aVal = a.margem_percentual || 0;
          bVal = b.margem_percentual || 0;
          break;
        default:
          aVal = a.impacto_total || a.beneficio_total || 0;
          bVal = b.impacto_total || b.beneficio_total || 0;
      }
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    };
    
    viloes.sort(sortFn);
    oportunidades.sort(sortFn);
    
    return { viloes, oportunidades };
  }, [data, activeTab, searchTerm, sortConfig]);

  const currentItems = activeType === 'viloes' ? filteredData.viloes : filteredData.oportunidades;

  // Ordenar produtos dentro do item expandido
  const sortProducts = (produtos, tipo) => {
    if (!produtos) return [];
    let sorted = [...produtos];
    
    const sortFn = (a, b) => {
      let aVal, bVal;
      switch (productSortConfig.key) {
        case 'descricao':
          aVal = a.descricao || '';
          bVal = b.descricao || '';
          break;
        case 'valor':
          aVal = a.valor || 0;
          bVal = b.valor || 0;
          break;
        case 'icms':
          aVal = a.icms || 0;
          bVal = b.icms || 0;
          break;
        case 'pis':
          aVal = a.pis || 0;
          bVal = b.pis || 0;
          break;
        case 'cofins':
          aVal = a.cofins || 0;
          bVal = b.cofins || 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string') {
        return productSortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return productSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    };
    
    sorted.sort(sortFn);
    return sorted;
  };

  // Componente de cabeçalho de coluna ordenável
  const SortableHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className={`flex items-center gap-1 text-xs font-medium hover:text-[#C8A951] transition-colors ${isActive ? 'text-[#C8A951]' : 'text-[#666]'} ${className}`}
      >
        {label}
        {isActive ? (
          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    );
  };

  // Componente de cabeçalho de coluna ordenável para produtos
  const ProductSortableHeader = ({ label, sortKey, className = '' }) => {
    const isActive = productSortConfig.key === sortKey;
    return (
      <button
        onClick={() => handleProductSort(sortKey)}
        className={`flex items-center gap-1 hover:text-[#C8A951] transition-colors ${isActive ? 'text-[#C8A951]' : 'text-[#666]'} ${className}`}
      >
        {label}
        {isActive ? (
          productSortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    );
  };

  // Renderizar linha de item
  const renderItem = (item, index) => {
    const id = activeTab === 'ncm' ? item.ncm : item.keyword;
    const isExpanded = expandedItems[id];
    const isVilao = activeType === 'viloes';
    
    const impacto = isVilao ? item.impacto_total : item.beneficio_total;
    const icmsImpacto = isVilao 
      ? (item.icms?.impacto || item.icms?.debito - item.icms?.credito) 
      : (item.icms?.beneficio || item.icms?.credito - item.icms?.debito);
    const pisImpacto = isVilao 
      ? (item.pis?.impacto || item.pis?.debito - item.pis?.credito) 
      : (item.pis?.beneficio || item.pis?.credito - item.pis?.debito);
    const cofinsImpacto = isVilao 
      ? (item.cofins?.impacto || item.cofins?.debito - item.cofins?.credito) 
      : (item.cofins?.beneficio || item.cofins?.credito - item.cofins?.debito);

    // Combinar e ordenar todos os produtos
    const allProducts = [];
    (item.produtos_entrada || []).forEach(p => allProducts.push({ ...p, origem: 'entrada' }));
    (item.produtos_saida || []).forEach(p => allProducts.push({ ...p, origem: 'saida' }));
    (item.produtos || []).forEach(p => allProducts.push({ ...p, origem: p.ncm ? 'geral' : 'geral' }));

    // Calcular percentuais em relação às vendas
    const percIcmsVenda = item.saida_valor > 0 ? (icmsImpacto / item.saida_valor * 100) : 0;
    const percPisVenda = item.saida_valor > 0 ? (pisImpacto / item.saida_valor * 100) : 0;
    const percCofinsVenda = item.saida_valor > 0 ? (cofinsImpacto / item.saida_valor * 100) : 0;
    const totalImposto = icmsImpacto + pisImpacto + cofinsImpacto;
    const percTotalVenda = item.saida_valor > 0 ? (totalImposto / item.saida_valor * 100) : 0;

    return (
      <div key={id} className="border-b border-[#2A2A2A] last:border-b-0">
        {/* Linha principal - Compacta */}
        <div 
          className={`px-4 py-3 cursor-pointer hover:bg-[#1A1A1A] transition-colors ${isExpanded ? 'bg-[#1A1A1A]' : ''}`}
          onClick={() => toggleExpand(id)}
        >
          {/* Header com NCM/Categoria */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#666]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#666]" />
                )}
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${isVilao ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                #{index + 1}
              </span>
              <div>
                <span className="font-mono text-sm text-white font-semibold">
                  {activeTab === 'ncm' ? item.ncm : item.keyword?.toUpperCase()}
                </span>
                {item.descricao && (
                  <span className="text-xs text-[#666] ml-2">• {item.descricao}</span>
                )}
              </div>
            </div>
            <div className={`text-right px-3 py-1.5 rounded-lg ${isVilao ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <p className="text-xs text-[#666]">Total Imposto | % s/ Venda</p>
              <p className={`text-base font-bold ${isVilao ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(Math.abs(totalImposto))} <span className="text-xs">({formatNumber(Math.abs(percTotalVenda))}%)</span>
              </p>
            </div>
          </div>
          
          {/* Grid de informações detalhadas */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
            {/* Entradas */}
            <div className="bg-[#0D0D0D] rounded-lg p-2">
              <p className="text-[10px] text-[#666] uppercase">Entradas</p>
              <p className="text-sm font-semibold text-blue-400">{formatCurrency(item.entrada_valor)}</p>
            </div>
            
            {/* Saídas */}
            <div className="bg-[#0D0D0D] rounded-lg p-2">
              <p className="text-[10px] text-[#666] uppercase">Saídas</p>
              <p className="text-sm font-semibold text-orange-400">{formatCurrency(item.saida_valor)}</p>
            </div>
            
            {/* ICMS - Crédito | Débito | Diferença | % */}
            <div className="bg-[#0D0D0D] rounded-lg p-2">
              <p className="text-[10px] text-[#666] uppercase">ICMS</p>
              <div className="flex items-center justify-center gap-1 text-xs">
                <span className="text-green-400" title="Crédito">{formatNumber(item.icms?.credito || 0)}</span>
                <span className="text-[#444]">|</span>
                <span className="text-red-400" title="Débito">{formatNumber(item.icms?.debito || 0)}</span>
              </div>
              <p className={`text-sm font-semibold ${
                isVilao 
                  ? (icmsImpacto > 0 ? 'text-red-400' : icmsImpacto < 0 ? 'text-green-400' : 'text-[#666]')
                  : (icmsImpacto > 0 ? 'text-green-400' : icmsImpacto < 0 ? 'text-red-400' : 'text-[#666]')
              }`}>
                {isVilao ? (icmsImpacto >= 0 ? '+' : '') : (icmsImpacto > 0 ? '+' : '')}{formatNumber(icmsImpacto)} <span className="text-[10px]">({formatNumber(Math.abs(percIcmsVenda))}%)</span>
              </p>
            </div>
            
            {/* PIS - Crédito | Débito | Diferença | % */}
            <div className="bg-[#0D0D0D] rounded-lg p-2">
              <p className="text-[10px] text-[#666] uppercase">PIS</p>
              <div className="flex items-center justify-center gap-1 text-xs">
                <span className="text-green-400" title="Crédito">{formatNumber(item.pis?.credito || 0)}</span>
                <span className="text-[#444]">|</span>
                <span className="text-red-400" title="Débito">{formatNumber(item.pis?.debito || 0)}</span>
              </div>
              <p className={`text-sm font-semibold ${
                isVilao 
                  ? (pisImpacto > 0 ? 'text-red-400' : pisImpacto < 0 ? 'text-green-400' : 'text-[#666]')
                  : (pisImpacto > 0 ? 'text-green-400' : pisImpacto < 0 ? 'text-red-400' : 'text-[#666]')
              }`}>
                {isVilao ? (pisImpacto >= 0 ? '+' : '') : (pisImpacto > 0 ? '+' : '')}{formatNumber(pisImpacto)} <span className="text-[10px]">({formatNumber(Math.abs(percPisVenda))}%)</span>
              </p>
            </div>
            
            {/* COFINS - Crédito | Débito | Diferença | % */}
            <div className="bg-[#0D0D0D] rounded-lg p-2">
              <p className="text-[10px] text-[#666] uppercase">COFINS</p>
              <div className="flex items-center justify-center gap-1 text-xs">
                <span className="text-green-400" title="Crédito">{formatNumber(item.cofins?.credito || 0)}</span>
                <span className="text-[#444]">|</span>
                <span className="text-red-400" title="Débito">{formatNumber(item.cofins?.debito || 0)}</span>
              </div>
              <p className={`text-sm font-semibold ${cofinsImpacto > 0 ? 'text-red-400' : cofinsImpacto < 0 ? 'text-green-400' : 'text-[#666]'}`}>
                {cofinsImpacto >= 0 ? '+' : ''}{formatNumber(cofinsImpacto)} <span className="text-[10px]">({formatNumber(Math.abs(percCofinsVenda))}%)</span>
              </p>
            </div>
            
            {/* Total Impostos */}
            <div className={`rounded-lg p-2 ${isVilao ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <p className="text-[10px] text-[#666] uppercase">Impacto Total</p>
              <p className={`text-sm font-bold ${isVilao ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(Math.abs(impacto))}
              </p>
              <p className={`text-xs ${isVilao ? 'text-red-400/70' : 'text-green-400/70'}`}>
                {formatNumber(Math.abs(percTotalVenda))}% s/ venda
              </p>
            </div>
            
            {/* Margem e Qtd */}
            <div className="bg-[#0D0D0D] rounded-lg p-2">
              <p className="text-[10px] text-[#666] uppercase">Margem | Itens</p>
              <p className={`text-sm font-semibold ${item.margem_percentual < 15 ? 'text-red-400' : item.margem_percentual < 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                {formatNumber(item.margem_percentual || 0)}%
              </p>
              <p className="text-xs text-[#A1A1AA]">{(item.qtd_entrada || 0) + (item.qtd_saida || 0)} produtos</p>
            </div>
          </div>
        </div>
        
        {/* Detalhes expandidos */}
        {isExpanded && (
          <div className="bg-[#0D0D0D] px-4 py-4 border-t border-[#2A2A2A]">
            {/* Motivo da classificação */}
            {item.motivo_classificacao && (
              <div className={`mb-4 p-3 rounded-lg border ${isVilao ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                <p className="text-xs font-medium text-white mb-1 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Por que este NCM é {isVilao ? 'vilão' : 'oportunidade'}?
                </p>
                <p className={`text-sm ${isVilao ? 'text-red-300' : 'text-green-300'}`}>
                  {item.motivo_classificacao}
                </p>
                {item.analise_preco && (
                  <p className="text-xs text-[#A1A1AA] mt-2 italic">
                    {item.analise_preco}
                  </p>
                )}
              </div>
            )}
            
            {/* Resumo de créditos e débitos */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-[#141414] rounded-lg p-3">
                <p className="text-xs text-[#666] mb-1">Entradas (Crédito)</p>
                <p className="text-lg font-semibold text-blue-400">{formatCurrency(item.entrada_valor)}</p>
                <div className="flex gap-2 mt-1 text-xs text-[#A1A1AA]">
                  <span>ICMS: {formatNumber(item.icms?.credito)}</span>
                  <span>PIS: {formatNumber(item.pis?.credito)}</span>
                  <span>COFINS: {formatNumber(item.cofins?.credito)}</span>
                </div>
              </div>
              <div className="bg-[#141414] rounded-lg p-3">
                <p className="text-xs text-[#666] mb-1">Saídas (Débito)</p>
                <p className="text-lg font-semibold text-orange-400">{formatCurrency(item.saida_valor)}</p>
                <div className="flex gap-2 mt-1 text-xs text-[#A1A1AA]">
                  <span>ICMS: {formatNumber(item.icms?.debito)}</span>
                  <span>PIS: {formatNumber(item.pis?.debito)}</span>
                  <span>COFINS: {formatNumber(item.cofins?.debito)}</span>
                </div>
              </div>
              <div className="bg-[#141414] rounded-lg p-3">
                <p className="text-xs text-[#666] mb-1">Diferença por Imposto</p>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#A1A1AA]">ICMS:</span>
                    <span className={icmsImpacto > 0 ? 'text-red-400' : 'text-green-400'}>{formatNumber(icmsImpacto)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#A1A1AA]">PIS:</span>
                    <span className={pisImpacto > 0 ? 'text-red-400' : 'text-green-400'}>{formatNumber(pisImpacto)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#A1A1AA]">COFINS:</span>
                    <span className={cofinsImpacto > 0 ? 'text-red-400' : 'text-green-400'}>{formatNumber(cofinsImpacto)}</span>
                  </div>
                </div>
              </div>
              <div className={`rounded-lg p-3 ${isVilao ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <p className="text-xs text-[#666] mb-1">{isVilao ? 'Impacto Total' : 'Benefício Total'}</p>
                <p className={`text-2xl font-bold ${isVilao ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(impacto)}
                </p>
                {item.margem_percentual !== undefined && (
                  <p className={`text-xs mt-1 ${item.margem_percentual < 15 ? 'text-red-400' : 'text-[#666]'}`}>
                    Margem: {formatNumber(item.margem_percentual)}%
                  </p>
                )}
              </div>
            </div>
            
            {/* Lista de produtos com ordenação */}
            <div className="mt-4">
              <p className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos ({allProducts.length} itens)
              </p>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#1A1A1A] sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-2">
                        <ProductSortableHeader label="Descrição" sortKey="descricao" />
                      </th>
                      <th className="text-right px-2 py-2">
                        <ProductSortableHeader label="Valor" sortKey="valor" className="justify-end" />
                      </th>
                      <th className="text-right px-2 py-2">
                        <ProductSortableHeader label="ICMS" sortKey="icms" className="justify-end" />
                      </th>
                      <th className="text-right px-2 py-2">
                        <ProductSortableHeader label="PIS" sortKey="pis" className="justify-end" />
                      </th>
                      <th className="text-right px-2 py-2">
                        <ProductSortableHeader label="COFINS" sortKey="cofins" className="justify-end" />
                      </th>
                      <th className="text-left px-2 py-2 text-[#666]">Origem</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#A1A1AA]">
                    {sortProducts(allProducts).map((prod, idx) => (
                      <tr key={idx} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]">
                        <td className="px-2 py-2 max-w-[300px] truncate">{prod.descricao}</td>
                        <td className={`px-2 py-2 text-right ${prod.origem === 'entrada' ? 'text-blue-400' : 'text-orange-400'}`}>
                          {formatNumber(prod.valor)}
                        </td>
                        <td className="px-2 py-2 text-right">{formatNumber(prod.icms)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(prod.pis)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(prod.cofins)}</td>
                        <td className="px-2 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            prod.origem === 'entrada' 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : prod.origem === 'saida'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {prod.origem === 'entrada' ? `Entrada ${prod.nota ? `#${prod.nota}` : ''}` : 
                             prod.origem === 'saida' ? `Saída ${prod.nota ? `#${prod.nota}` : ''}` :
                             prod.ncm || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        <div data-testid="viloes-page" className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-[#C8A951] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-[#A1A1AA]">
              Use o seletor no topo da página para escolher uma empresa.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="viloes-page" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500/20 to-green-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-[#C8A951]" />
              </div>
              Vilões e Oportunidades
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Análise tributária de ICMS, PIS e COFINS por NCM e categoria
            </p>
          </div>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8A951] hover:bg-[#B09240] text-black rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Info da empresa */}
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-[#666]">Empresa</p>
                <p className="text-white font-medium">{selectedCompany?.razao_social}</p>
              </div>
              <div className="h-8 w-px bg-[#2A2A2A]" />
              <div>
                <p className="text-xs text-[#666]">Competência</p>
                <p className="text-white font-medium">{selectedCompetencia}</p>
              </div>
              {data?.regime_tributario && (
                <>
                  <div className="h-8 w-px bg-[#2A2A2A]" />
                  <div>
                    <p className="text-xs text-[#666]">Regime</p>
                    <p className="text-white font-medium capitalize">{data.regime_tributario.replace(/_/g, ' ')}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-8 text-center">
            <RefreshCw className="w-8 h-8 text-[#C8A951] mx-auto mb-4 animate-spin" />
            <p className="text-[#A1A1AA]">Analisando documentos...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Dados */}
        {data && !loading && (
          <>
            {/* Análise Geral por IA */}
            {data.analise_geral && (
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#141414] rounded-xl border border-[#C8A951]/30 overflow-hidden">
                <button 
                  onClick={() => setShowAnalise(!showAnalise)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A]/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C8A951]/20 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-[#C8A951]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold">Análise Inteligente</h3>
                      <p className="text-xs text-[#666]">Conclusão e pontos de atenção sobre precificação e equilíbrio fiscal</p>
                    </div>
                  </div>
                  {showAnalise ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
                </button>
                
                {showAnalise && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Conclusão */}
                    <div className="p-4 bg-[#0D0D0D] rounded-lg border border-[#2A2A2A]">
                      <p className="text-sm text-white leading-relaxed">
                        {data.analise_geral.conclusao}
                      </p>
                      {data.resumo?.saldo_tributario !== undefined && (
                        <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex items-center gap-4 text-xs">
                          <span className="text-[#666]">Saldo Tributário:</span>
                          <span className={`font-semibold ${data.resumo.saldo_tributario >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(data.resumo.saldo_tributario)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Pontos de Atenção e Recomendações */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Pontos de Atenção */}
                      {data.analise_geral.pontos_atencao?.length > 0 && (
                        <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                          <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Pontos de Atenção
                          </h4>
                          <ul className="space-y-2">
                            {data.analise_geral.pontos_atencao.map((ponto, idx) => (
                              <li key={idx} className="text-xs text-[#A1A1AA] flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>{ponto}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Recomendações */}
                      {data.analise_geral.recomendacoes?.length > 0 && (
                        <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                          <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Recomendações
                          </h4>
                          <ul className="space-y-2">
                            {data.analise_geral.recomendacoes.map((rec, idx) => (
                              <li key={idx} className="text-xs text-[#A1A1AA] flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cards de resumo */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-red-500/10 to-red-900/10 rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowDownRight className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400">Total de Vilões</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.resumo?.total_viloes || 0}</p>
                <p className="text-xs text-[#666] mt-1">NCMs com impacto negativo</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-500/10 to-red-900/10 rounded-xl border border-red-500/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400">Impacto Total</span>
                </div>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(data.resumo?.impacto_total_viloes)}</p>
                <p className="text-xs text-[#666] mt-1">Débito excedente de impostos</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-900/10 rounded-xl border border-green-500/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowUpRight className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400">Total de Oportunidades</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.resumo?.total_oportunidades || 0}</p>
                <p className="text-xs text-[#666] mt-1">NCMs com crédito excedente</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/10 to-green-900/10 rounded-xl border border-green-500/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400">Benefício Total</span>
                </div>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(data.resumo?.beneficio_total_oportunidades)}</p>
                <p className="text-xs text-[#666] mt-1">Crédito excedente de impostos</p>
              </div>
            </div>

            {/* Abas e filtros */}
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
              {/* Tabs de agrupamento */}
              <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('ncm')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'ncm' 
                        ? 'border-[#C8A951] text-[#C8A951]' 
                        : 'border-transparent text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4 inline mr-2" />
                    Por NCM
                  </button>
                  <button
                    onClick={() => setActiveTab('keyword')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'keyword' 
                        ? 'border-[#C8A951] text-[#C8A951]' 
                        : 'border-transparent text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Filter className="w-4 h-4 inline mr-2" />
                    Por Categoria
                  </button>
                </div>
                
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar NCM ou categoria..."
                    className="pl-9 pr-4 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#C8A951] w-64"
                  />
                </div>
              </div>
              
              {/* Tabs de tipo + Ordenação */}
              <div className="flex items-center justify-between p-4 bg-[#0D0D0D]">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveType('viloes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeType === 'viloes'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#1A1A1A] text-[#A1A1AA] hover:text-white border border-transparent'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Vilões ({filteredData.viloes.length})
                  </button>
                  <button
                    onClick={() => setActiveType('oportunidades')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeType === 'oportunidades'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-[#1A1A1A] text-[#A1A1AA] hover:text-white border border-transparent'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Oportunidades ({filteredData.oportunidades.length})
                  </button>
                </div>
                
                {/* Ordenação */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[#666]">Ordenar por:</span>
                  <SortableHeader label="NCM" sortKey="ncm" />
                  <SortableHeader label="Descrição" sortKey="descricao" />
                  <SortableHeader label="Impacto" sortKey="impacto" />
                  <SortableHeader label="Entrada" sortKey="entrada" />
                  <SortableHeader label="Saída" sortKey="saida" />
                  <SortableHeader label="Margem" sortKey="margem" />
                </div>
              </div>
              
              {/* Lista de itens */}
              <div className="max-h-[600px] overflow-y-auto">
                {currentItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <Info className="w-12 h-12 text-[#666] mx-auto mb-3" />
                    <p className="text-[#A1A1AA]">
                      {searchTerm 
                        ? `Nenhum resultado para "${searchTerm}"`
                        : `Nenhum ${activeType === 'viloes' ? 'vilão' : 'oportunidade'} identificado`
                      }
                    </p>
                  </div>
                ) : (
                  currentItems.map((item, index) => renderItem(item, index))
                )}
              </div>
            </div>
            
            {/* Legenda */}
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4">
              <p className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Como interpretar
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs text-[#A1A1AA]">
                <div>
                  <p className="font-medium text-red-400 mb-1">Vilões (Impacto Negativo)</p>
                  <p>NCMs/categorias onde você paga mais impostos na saída do que recupera de crédito na entrada. Esses itens aumentam sua carga tributária. Atenção especial para itens com margem baixa - podem estar gerando prejuízo.</p>
                </div>
                <div>
                  <p className="font-medium text-green-400 mb-1">Oportunidades (Benefício)</p>
                  <p>NCMs/categorias onde você tem mais crédito de impostos na entrada do que débito na saída. Esses itens reduzem sua carga tributária e geram crédito acumulado.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ViloesOportunidades;
