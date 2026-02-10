import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, TrendingUp, ChevronDown, ChevronRight, Package, 
  Layers, DollarSign, ArrowUpRight, ArrowDownRight, Filter,
  RefreshCw, Search, Info
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ViloesOportunidades = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ncm'); // 'ncm' ou 'keyword'
  const [activeType, setActiveType] = useState('viloes'); // 'viloes' ou 'oportunidades'
  const [expandedItems, setExpandedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filtrar dados por busca
  const filteredData = useMemo(() => {
    if (!data) return { viloes: [], oportunidades: [] };
    
    const source = activeTab === 'ncm' ? data.por_ncm : data.por_keyword;
    const viloes = source?.viloes || [];
    const oportunidades = source?.oportunidades || [];
    
    if (!searchTerm.trim()) {
      return { viloes, oportunidades };
    }
    
    const term = searchTerm.toLowerCase();
    
    return {
      viloes: viloes.filter(item => 
        (item.ncm && item.ncm.includes(term)) ||
        (item.keyword && item.keyword.includes(term)) ||
        (item.descricao && item.descricao.toLowerCase().includes(term))
      ),
      oportunidades: oportunidades.filter(item => 
        (item.ncm && item.ncm.includes(term)) ||
        (item.keyword && item.keyword.includes(term)) ||
        (item.descricao && item.descricao.toLowerCase().includes(term))
      )
    };
  }, [data, activeTab, searchTerm]);

  const currentItems = activeType === 'viloes' ? filteredData.viloes : filteredData.oportunidades;

  // Renderizar linha de item (vilão ou oportunidade)
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

    return (
      <div key={id} className="border-b border-[#2A2A2A] last:border-b-0">
        {/* Linha principal - compacta */}
        <div 
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1A1A1A] transition-colors ${isExpanded ? 'bg-[#1A1A1A]' : ''}`}
          onClick={() => toggleExpand(id)}
        >
          {/* Expand icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#666]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#666]" />
            )}
          </div>
          
          {/* Índice e identificador */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${isVilao ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              #{index + 1}
            </span>
            <div>
              <span className="font-mono text-sm text-white">
                {activeTab === 'ncm' ? item.ncm : item.keyword?.toUpperCase()}
              </span>
              {item.descricao && (
                <p className="text-xs text-[#666] truncate max-w-[150px]">{item.descricao}</p>
              )}
            </div>
          </div>
          
          {/* Valores compactos */}
          <div className="flex-1 flex items-center justify-between gap-4">
            {/* ICMS */}
            <div className="text-center min-w-[100px]">
              <p className="text-xs text-[#666]">ICMS</p>
              <p className={`text-sm font-medium ${icmsImpacto > 0 ? (isVilao ? 'text-red-400' : 'text-green-400') : 'text-[#A1A1AA]'}`}>
                {isVilao ? '+' : ''}{formatNumber(Math.abs(icmsImpacto))}
              </p>
            </div>
            
            {/* PIS */}
            <div className="text-center min-w-[100px]">
              <p className="text-xs text-[#666]">PIS</p>
              <p className={`text-sm font-medium ${pisImpacto > 0 ? (isVilao ? 'text-red-400' : 'text-green-400') : 'text-[#A1A1AA]'}`}>
                {isVilao ? '+' : ''}{formatNumber(Math.abs(pisImpacto))}
              </p>
            </div>
            
            {/* COFINS */}
            <div className="text-center min-w-[100px]">
              <p className="text-xs text-[#666]">COFINS</p>
              <p className={`text-sm font-medium ${cofinsImpacto > 0 ? (isVilao ? 'text-red-400' : 'text-green-400') : 'text-[#A1A1AA]'}`}>
                {isVilao ? '+' : ''}{formatNumber(Math.abs(cofinsImpacto))}
              </p>
            </div>
            
            {/* Impacto Total */}
            <div className={`text-right min-w-[130px] px-3 py-1.5 rounded-lg ${isVilao ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              <p className="text-xs text-[#666]">{isVilao ? 'Impacto' : 'Benefício'}</p>
              <p className={`text-base font-bold ${isVilao ? 'text-red-400' : 'text-green-400'}`}>
                {formatCurrency(impacto)}
              </p>
            </div>
            
            {/* Qtd de itens */}
            <div className="text-center min-w-[60px]">
              <p className="text-xs text-[#666]">Itens</p>
              <p className="text-sm text-[#A1A1AA]">{(item.qtd_entrada || 0) + (item.qtd_saida || 0)}</p>
            </div>
          </div>
        </div>
        
        {/* Detalhes expandidos */}
        {isExpanded && (
          <div className="bg-[#0D0D0D] px-4 py-4 border-t border-[#2A2A2A]">
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
                {item.explicacao && (
                  <p className="text-xs text-[#666] mt-1">{item.explicacao}</p>
                )}
              </div>
            </div>
            
            {/* Lista de produtos */}
            <div className="mt-4">
              <p className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos ({(item.produtos_entrada?.length || 0) + (item.produtos_saida?.length || 0) + (item.produtos?.length || 0)} itens)
              </p>
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#1A1A1A] sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 text-[#666]">Descrição</th>
                      <th className="text-right px-2 py-1.5 text-[#666]">Valor</th>
                      <th className="text-right px-2 py-1.5 text-[#666]">ICMS</th>
                      <th className="text-right px-2 py-1.5 text-[#666]">PIS</th>
                      <th className="text-right px-2 py-1.5 text-[#666]">COFINS</th>
                      <th className="text-left px-2 py-1.5 text-[#666]">Origem</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#A1A1AA]">
                    {/* Produtos de entrada */}
                    {(item.produtos_entrada || []).map((prod, idx) => (
                      <tr key={`ent-${idx}`} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]">
                        <td className="px-2 py-1.5 max-w-[300px] truncate">{prod.descricao}</td>
                        <td className="px-2 py-1.5 text-right text-blue-400">{formatNumber(prod.valor)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.icms)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.pis)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.cofins)}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            Entrada {prod.nota && `#${prod.nota}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Produtos de saída */}
                    {(item.produtos_saida || []).map((prod, idx) => (
                      <tr key={`sai-${idx}`} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]">
                        <td className="px-2 py-1.5 max-w-[300px] truncate">{prod.descricao}</td>
                        <td className="px-2 py-1.5 text-right text-orange-400">{formatNumber(prod.valor)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.icms)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.pis)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.cofins)}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">
                            Saída {prod.nota && `#${prod.nota}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Produtos genéricos (por keyword) */}
                    {(item.produtos || []).map((prod, idx) => (
                      <tr key={`gen-${idx}`} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]">
                        <td className="px-2 py-1.5 max-w-[300px] truncate">{prod.descricao}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.valor)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.icms)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.pis)}</td>
                        <td className="px-2 py-1.5 text-right">{formatNumber(prod.cofins)}</td>
                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">
                            {prod.ncm}
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

        {/* Info da empresa e competência */}
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
              
              {/* Tabs de tipo (vilões/oportunidades) */}
              <div className="flex gap-2 p-4 bg-[#0D0D0D]">
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
                    <p className="text-xs text-[#666] mt-1">
                      {activeType === 'viloes' 
                        ? 'Vilões são NCMs onde o débito excede o crédito em mais de R$ 100'
                        : 'Oportunidades são NCMs onde o crédito excede o débito em mais de R$ 100'
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
                  <p>NCMs/categorias onde você paga mais impostos na saída do que recupera de crédito na entrada. Esses itens aumentam sua carga tributária.</p>
                </div>
                <div>
                  <p className="font-medium text-green-400 mb-1">Oportunidades (Benefício)</p>
                  <p>NCMs/categorias onde você tem mais crédito de impostos na entrada do que débito na saída. Esses itens reduzem sua carga tributária.</p>
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
