import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { SortableHeader, useSortableData } from '../components/SortableTable';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  ChevronDown, ChevronUp, Download, RefreshCw, 
  Building2, Package, Hash, BarChart3, ArrowRight,
  ArrowLeftRight, Minus, Truck, Settings, Save, Loader2,
  Star, X, FileSpreadsheet, FileDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ApuracaoICMS = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia, refreshCompanies } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [activeTab, setActiveTab] = useState('icms'); // 'icms' ou 'icms_st'
  const [expandedSections, setExpandedSections] = useState({
    entradas: true,
    saidas: true
  });
  
  // Modal de detalhamento do Benefício Fiscal
  const [showBeneficioModal, setShowBeneficioModal] = useState(false);
  const [beneficioTab, setBeneficioTab] = useState('produto'); // 'produto' ou 'ncm'
  const [beneficioDetalhes, setBeneficioDetalhes] = useState(null);
  const [loadingBeneficioDetalhes, setLoadingBeneficioDetalhes] = useState(false);
  const [exportingBeneficio, setExportingBeneficio] = useState(false);
  
  // Modal de detalhamento de Desconsiderados (ST/Despesas)
  const [showDesconsideradosModal, setShowDesconsideradosModal] = useState(false);
  const [desconsideradosTab, setDesconsideradosTab] = useState('produto');
  const [desconsideradosDetalhes, setDesconsideradosDetalhes] = useState(null);
  const [loadingDesconsideradosDetalhes, setLoadingDesconsideradosDetalhes] = useState(false);
  const [desconsideradosTipo, setDesconsideradosTipo] = useState('todos'); // 'st', 'despesas', 'todos'
  
  // Estado para expansão de NCMs no modal de benefício fiscal
  const [expandedNcms, setExpandedNcms] = useState({});
  
  // Estado para ordenação das tabelas de benefício fiscal
  const [beneficioProdutoSort, setBeneficioProdutoSort] = useState({ column: null, direction: 'asc' });
  const [beneficioNcmSort, setBeneficioNcmSort] = useState({ column: null, direction: 'asc' });
  
  const toggleNcmExpansion = (ncm) => {
    setExpandedNcms(prev => ({
      ...prev,
      [ncm]: !prev[ncm]
    }));
  };
  
  // Função para ordenar a lista de produtos do benefício fiscal
  const sortedBeneficioProdutos = useMemo(() => {
    if (!beneficioDetalhes?.por_produto) return [];
    // Filtrar apenas produtos com ICMS > 0
    const items = beneficioDetalhes.por_produto.filter(item => {
      const valorIcms = parseFloat(item.valor_icms) || 0;
      return valorIcms > 0;
    });
    
    if (beneficioProdutoSort.column) {
      items.sort((a, b) => {
        let aVal = a[beneficioProdutoSort.column];
        let bVal = b[beneficioProdutoSort.column];
        
        // Converter para número se necessário
        if (typeof aVal === 'number' || !isNaN(parseFloat(aVal))) {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }
        
        if (aVal < bVal) return beneficioProdutoSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return beneficioProdutoSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [beneficioDetalhes?.por_produto, beneficioProdutoSort]);
  
  // Função para ordenar a lista de NCMs do benefício fiscal
  const sortedBeneficioNcms = useMemo(() => {
    if (!beneficioDetalhes?.por_ncm) return [];
    // Filtrar apenas NCMs com ICMS > 0
    const items = beneficioDetalhes.por_ncm.filter(item => {
      const valorIcms = parseFloat(item.valor_icms) || 0;
      return valorIcms > 0;
    });
    
    if (beneficioNcmSort.column) {
      items.sort((a, b) => {
        let aVal = a[beneficioNcmSort.column];
        let bVal = b[beneficioNcmSort.column];
        
        // Converter para número se necessário
        if (typeof aVal === 'number' || !isNaN(parseFloat(aVal))) {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }
        
        if (aVal < bVal) return beneficioNcmSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return beneficioNcmSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [beneficioDetalhes?.por_ncm, beneficioNcmSort]);

  // Totais do benefício fiscal filtrados (apenas produtos com ICMS > 0)
  const beneficioFiscalTotais = useMemo(() => {
    if (!beneficioDetalhes?.por_produto) {
      return { qtd_itens: 0, valor_icms: 0 };
    }
    const produtosFiltrados = beneficioDetalhes.por_produto.filter(item => {
      const valorIcms = parseFloat(item.valor_icms) || 0;
      return valorIcms > 0;
    });
    return {
      qtd_itens: produtosFiltrados.length,
      valor_icms: produtosFiltrados.reduce((acc, p) => acc + (parseFloat(p.valor_icms) || 0), 0)
    };
  }, [beneficioDetalhes?.por_produto]);
  
  // Handler para alternar ordenação de produtos
  const handleProdutoSort = (column) => {
    setBeneficioProdutoSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Handler para alternar ordenação de NCMs
  const handleNcmSort = (column) => {
    setBeneficioNcmSort(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Flags de desconsiderar ICMS - estado local com persistência
  const [desconsiderarDespesas, setDesconsiderarDespesas] = useState(false);
  const [desconsiderarST, setDesconsiderarST] = useState(false);
  const [beneficioFiscal, setBeneficioFiscal] = useState(false);
  const [savingFlags, setSavingFlags] = useState(false);
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  // Chave para localStorage baseada na empresa
  const getFlagsKey = useCallback((companyId) => `icms_flags_${companyId}`, []);

  // Carregar flags do localStorage ou da empresa
  useEffect(() => {
    if (selectedCompany?.id) {
      const savedFlags = localStorage.getItem(getFlagsKey(selectedCompany.id));
      if (savedFlags) {
        // Usar flags salvas localmente (mais recentes)
        try {
          const parsed = JSON.parse(savedFlags);
          setDesconsiderarDespesas(parsed.desconsiderarDespesas ?? selectedCompany.desconsiderar_icms_despesas ?? false);
          setDesconsiderarST(parsed.desconsiderarST ?? selectedCompany.desconsiderar_icms_st ?? false);
          setBeneficioFiscal(parsed.beneficioFiscal ?? selectedCompany.beneficio_fiscal_icms ?? false);
        } catch {
          // Se erro no parse, usar valores da empresa
          setDesconsiderarDespesas(selectedCompany.desconsiderar_icms_despesas || false);
          setDesconsiderarST(selectedCompany.desconsiderar_icms_st || false);
          setBeneficioFiscal(selectedCompany.beneficio_fiscal_icms || false);
        }
      } else {
        // Usar valores da empresa
        setDesconsiderarDespesas(selectedCompany.desconsiderar_icms_despesas || false);
        setDesconsiderarST(selectedCompany.desconsiderar_icms_st || false);
        setBeneficioFiscal(selectedCompany.beneficio_fiscal_icms || false);
      }
      setFlagsLoaded(true);
    }
  }, [selectedCompany, getFlagsKey]);

  // Salvar flags no localStorage quando alteradas
  useEffect(() => {
    if (selectedCompany?.id && flagsLoaded) {
      localStorage.setItem(getFlagsKey(selectedCompany.id), JSON.stringify({
        desconsiderarDespesas,
        desconsiderarST,
        beneficioFiscal
      }));
    }
  }, [selectedCompany?.id, desconsiderarDespesas, desconsiderarST, beneficioFiscal, flagsLoaded, getFlagsKey]);

  // Salvar flags no servidor e recarregar dados
  const salvarFlags = async () => {
    if (!selectedCompany?.id) return;
    setSavingFlags(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/companies/${selectedCompany.id}`, {
        desconsiderar_icms_despesas: desconsiderarDespesas,
        desconsiderar_icms_st: desconsiderarST,
        beneficio_fiscal_icms: beneficioFiscal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Limpar localStorage após salvar no servidor (servidor é source of truth)
      localStorage.removeItem(getFlagsKey(selectedCompany.id));
      // Atualizar contexto e recarregar dados
      if (refreshCompanies) refreshCompanies();
      await fetchData();
    } catch (err) {
      console.error('Erro ao salvar flags:', err);
      alert('Erro ao salvar configurações');
    } finally {
      setSavingFlags(false);
    }
  };

  // Verificar se há alterações não salvas no servidor
  const hasUnsavedChanges = () => {
    return (
      desconsiderarDespesas !== (selectedCompany?.desconsiderar_icms_despesas || false) ||
      desconsiderarST !== (selectedCompany?.desconsiderar_icms_st || false) ||
      beneficioFiscal !== (selectedCompany?.beneficio_fiscal_icms || false)
    );
  };

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/apuracao-icms/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
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

  // Buscar detalhes do benefício fiscal (produtos desconsiderados)
  const fetchBeneficioDetalhes = async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoadingBeneficioDetalhes(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/beneficio-fiscal-detalhes/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBeneficioDetalhes(response.data);
    } catch (err) {
      console.error('Erro ao carregar detalhes do benefício fiscal:', err);
      alert('Erro ao carregar detalhes do benefício fiscal');
    } finally {
      setLoadingBeneficioDetalhes(false);
    }
  };

  // Abrir modal de benefício fiscal
  const handleOpenBeneficioModal = () => {
    setShowBeneficioModal(true);
    fetchBeneficioDetalhes();
  };

  // Exportar relatório de benefício fiscal
  const exportarBeneficioFiscal = async (formato) => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setExportingBeneficio(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/beneficio-fiscal-detalhes/${selectedCompany.id}/exportar?competencia=${encodeURIComponent(selectedCompetencia)}&formato=${formato}&agrupamento=${beneficioTab}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `beneficio_fiscal_${beneficioTab}_${selectedCompetencia.replace('/', '_')}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar relatório');
    } finally {
      setExportingBeneficio(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Card de Resumo Principal
  const ResumoCard = ({ titulo, valor, subtitulo, icon: Icon, corIcone = 'bg-[#C8A951]', corValor = 'text-white' }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4" data-testid={`card-${titulo.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[#A1A1AA] text-sm">{titulo}</p>
          <p className={`text-xl font-bold ${corValor}`}>{formatCurrency(valor)}</p>
          {subtitulo && <p className="text-xs text-[#666]">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  // Tabela de CFOP com ordenação
  const TabelaCFOP = ({ dados, tipo }) => {
    const [sortField, setSortField] = useState('cfop');
    const [sortDirection, setSortDirection] = useState('asc');
    
    const handleSort = (field) => {
      if (sortField === field) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    };
    
    const sortedDados = useMemo(() => {
      if (!dados || dados.length === 0) return [];
      
      return [...dados].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle null/undefined
        if (aVal == null) aVal = sortField === 'cfop' ? '9999' : 0;
        if (bVal == null) bVal = sortField === 'cfop' ? '9999' : 0;
        
        // Handle numbers
        if (['qtd', 'valor_total', 'bc_icms', 'valor_icms'].includes(sortField)) {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Handle strings (CFOP)
        aVal = String(aVal);
        bVal = String(bVal);
        
        if (sortDirection === 'asc') {
          return aVal.localeCompare(bVal, 'pt-BR', { numeric: true });
        }
        return bVal.localeCompare(aVal, 'pt-BR', { numeric: true });
      });
    }, [dados, sortField, sortDirection]);
    
    if (!dados || dados.length === 0) {
      return (
        <div className="text-center py-8 text-[#666]">
          Nenhum registro encontrado
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <SortableHeader label="CFOP" field="cfop" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Status" field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              <SortableHeader label="Qtd" field="qtd" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" />
              <SortableHeader label="Valor Total" field="valor_total" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" />
              <SortableHeader label="BC ICMS" field="bc_icms" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" />
              <SortableHeader label="Valor ICMS" field="valor_icms" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {sortedDados.map((item, idx) => {
              // Verificar se CFOP está desconsiderado
              const isDesconsiderado = item.desconsiderado === true;
              const isDespesa = item.is_despesa === true;
              const isST = item.is_st === true;
              
              return (
                <tr 
                  key={idx} 
                  className={`border-b border-[#1A1A1A] transition-colors ${
                    isDesconsiderado 
                      ? 'bg-red-900/20 hover:bg-red-900/30' 
                      : 'hover:bg-[#1A1A1A]'
                  }`}
                >
                  <td className="py-3 px-4">
                    <span className={`font-mono px-2 py-1 rounded ${
                      isDesconsiderado
                        ? 'bg-red-500/30 text-red-400 line-through'
                        : 'bg-[#2A2A2A] text-white'
                    }`}>
                      {item.cfop}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {isDesconsiderado ? (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                        {isDespesa ? '⛔ DESPESA' : isST ? '⛔ ST' : '⛔ DESCONSIDERADO'}
                      </span>
                    ) : isDespesa || isST ? (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                        {isDespesa ? '📦 Despesa' : '🏷️ ST'}
                      </span>
                    ) : (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                        ✓ Normal
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right ${isDesconsiderado ? 'text-red-400/60' : 'text-[#A1A1AA]'}`}>
                    {formatNumber(item.qtd)}
                  </td>
                  <td className={`py-3 px-4 text-right ${isDesconsiderado ? 'text-red-400/60 line-through' : 'text-white'}`}>
                    {formatCurrency(item.valor_total)}
                  </td>
                  <td className={`py-3 px-4 text-right ${isDesconsiderado ? 'text-red-400/60 line-through' : 'text-white'}`}>
                    {formatCurrency(item.bc_icms)}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    isDesconsiderado 
                      ? 'text-red-400/60 line-through' 
                      : tipo === 'entrada' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(item.valor_icms)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Card de Top 10
  const Top10Card = ({ titulo, dados, tipo, icon: Icon }) => {
    const [expanded, setExpanded] = useState(false);
    const isCredito = tipo === 'credito';
    
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`${isCredito ? 'bg-green-600' : 'bg-red-600'} p-2 rounded-lg`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">{titulo}</span>
            {dados?.length > 0 && (
              <span className="bg-[#2A2A2A] text-[#A1A1AA] text-xs px-2 py-0.5 rounded-full">
                {dados.length} item(s)
              </span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
        </button>
        
        {expanded && (
          <div className="border-t border-[#2A2A2A] p-4">
            {dados?.length > 0 ? (
              <div className="space-y-2">
                {dados.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                        <span className="text-white text-sm truncate">{item.descricao || item.ncm}</span>
                      </div>
                      {item.ncm && item.descricao && (
                        <span className="text-xs text-[#666] font-mono">NCM: {item.ncm}</span>
                      )}
                      {item.produtos && (
                        <span className="text-xs text-[#666]">Ex: {item.produtos.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-bold ${isCredito ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(item.valor_icms)}
                      </p>
                      <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#666] py-4">Nenhum registro encontrado</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render principal
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#C8A951]" />
              Apuração ICMS
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Créditos e débitos de ICMS por CFOP
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              data-testid="btn-atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-2 rounded-lg transition-colors font-medium"
              data-testid="btn-exportar"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Info da Empresa */}
        {selectedCompany && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-[#C8A951]" />
              <div className="flex-1">
                <h2 className="text-white font-semibold">{selectedCompany.razao_social}</h2>
                <p className="text-[#A1A1AA] text-sm">
                  CNPJ: {selectedCompany.cnpj} | Competência: {selectedCompetencia} | 
                  UF: <span className="text-[#C8A951]">{selectedCompany.uf || 'N/D'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flags de Desconsiderar ICMS - EDITÁVEL */}
        {selectedCompany && (
          <div className={`bg-[#0C0C0C] border rounded-xl p-4 mb-6 ${hasUnsavedChanges() ? 'border-amber-500' : 'border-[#2A2A2A]'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-amber-400" />
                <span className="text-white font-medium">Configurações de ICMS</span>
                {hasUnsavedChanges() && (
                  <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-medium">
                    Não salvo
                  </span>
                )}
              </div>
              <button
                onClick={salvarFlags}
                disabled={savingFlags || !hasUnsavedChanges()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  hasUnsavedChanges() 
                    ? 'bg-[#C8A951] hover:bg-[#B8993D] text-black' 
                    : 'bg-[#2A2A2A] text-[#666] cursor-not-allowed'
                }`}
              >
                {savingFlags ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingFlags ? 'Salvando...' : 'Aplicar e Recalcular'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                desconsiderarDespesas 
                  ? 'bg-red-500/20 border-2 border-red-500' 
                  : 'bg-[#141414] border-2 border-[#2A2A2A] hover:border-red-500/50'
              }`}>
                <input
                  type="checkbox"
                  checked={desconsiderarDespesas}
                  onChange={(e) => setDesconsiderarDespesas(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-2 border-[#666] bg-[#0C0C0C] text-red-500 focus:ring-red-500 accent-red-500 cursor-pointer"
                />
                <div>
                  <span className={`text-sm font-medium block ${desconsiderarDespesas ? 'text-red-400' : 'text-white'}`}>
                    Desconsiderar ICMS CFOPs Despesas
                  </span>
                  <span className="text-xs text-[#A1A1AA] block mt-1">
                    Zera base de cálculo e ICMS de todos os CFOPs classificados como despesa (material de uso, consumo, etc.)
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                desconsiderarST 
                  ? 'bg-orange-500/20 border-2 border-orange-500' 
                  : 'bg-[#141414] border-2 border-[#2A2A2A] hover:border-orange-500/50'
              }`}>
                <input
                  type="checkbox"
                  checked={desconsiderarST}
                  onChange={(e) => setDesconsiderarST(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-2 border-[#666] bg-[#0C0C0C] text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
                />
                <div>
                  <span className={`text-sm font-medium block ${desconsiderarST ? 'text-orange-400' : 'text-white'}`}>
                    Desconsiderar ICMS sobre Operações ST
                  </span>
                  <span className="text-xs text-[#A1A1AA] block mt-1">
                    Zera base de cálculo e ICMS de todos os CFOPs com mercadorias sujeitas à Substituição Tributária
                  </span>
                </div>
              </label>
            </div>
            
            {/* Flag de Benefício Fiscal */}
            <div className="mt-4">
              <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                beneficioFiscal 
                  ? 'bg-yellow-500/20 border-2 border-yellow-500' 
                  : 'bg-[#141414] border-2 border-[#2A2A2A] hover:border-yellow-500/50'
              }`}>
                <input
                  type="checkbox"
                  checked={beneficioFiscal}
                  onChange={(e) => setBeneficioFiscal(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-2 border-[#666] bg-[#0C0C0C] text-yellow-500 focus:ring-yellow-500 accent-yellow-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium block ${beneficioFiscal ? 'text-yellow-400' : 'text-white'}`}>
                    ⭐ Benefício Fiscal ICMS
                  </span>
                  <span className="text-xs text-[#A1A1AA] block mt-1">
                    Empresa com benefício fiscal de ICMS na saída (alíquota reduzida). Desconsiderar créditos dos produtos configurados no cadastro da empresa.
                  </span>
                  {beneficioFiscal && selectedCompany?.tipo_beneficio_fiscal && (
                    <span className="text-xs text-yellow-400 block mt-2">
                      Tipo: {selectedCompany.tipo_beneficio_fiscal} | 
                      Produtos sem crédito: {selectedCompany.produtos_sem_credito_icms?.join(', ') || 'Todos'}
                    </span>
                  )}
                  {beneficioFiscal && !selectedCompany?.tipo_beneficio_fiscal && (
                    <span className="text-xs text-yellow-500 block mt-2">
                      ⚠️ Configure os produtos sem crédito no cadastro da empresa
                    </span>
                  )}
                </div>
              </label>
            </div>
            
            {hasUnsavedChanges() && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span>Você tem alterações não salvas. Clique em <strong>"Aplicar e Recalcular"</strong> para salvar no servidor e atualizar os cálculos.</span>
                </p>
              </div>
            )}
            
            <p className="text-xs text-[#666] mt-3">
              ℹ️ As opções marcadas serão lembradas ao navegar entre telas. Clique em "Aplicar e Recalcular" para salvar permanentemente.
            </p>
          </div>
        )}

        {/* Card de Resumo - Valores Desconsiderados */}
        {selectedCompany && dados && (dados.desconsiderados?.despesas?.valor_icms > 0 || dados.desconsiderados?.st?.valor_icms > 0 || dados.desconsiderados?.beneficio_fiscal?.valor_icms > 0) && (
          <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">⚠️</span>
              <span className="text-white font-medium">Valores Desconsiderados na Apuração</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {dados.desconsiderados?.despesas?.valor_icms > 0 && (
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  <span className="text-xs text-red-400 block mb-1">ICMS Despesas (Zerado)</span>
                  <span className="text-lg font-bold text-red-400 line-through">
                    {formatCurrency(dados.desconsiderados.despesas.valor_icms)}
                  </span>
                  <span className="text-xs text-[#A1A1AA] block mt-1">
                    {dados.desconsiderados.despesas.qtd_itens} itens afetados
                  </span>
                </div>
              )}
              {dados.desconsiderados?.st?.valor_icms > 0 && (
                <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                  <span className="text-xs text-orange-400 block mb-1">ICMS ST (Zerado)</span>
                  <span className="text-lg font-bold text-orange-400 line-through">
                    {formatCurrency(dados.desconsiderados.st.valor_icms)}
                  </span>
                  <span className="text-xs text-[#A1A1AA] block mt-1">
                    {dados.desconsiderados.st.qtd_itens} itens afetados
                  </span>
                </div>
              )}
              {dados.desconsiderados?.beneficio_fiscal?.valor_icms > 0 && (
                <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                  <span className="text-xs text-yellow-400 block mb-1">⭐ Benefício Fiscal (Zerado)</span>
                  <span className="text-lg font-bold text-yellow-400 line-through">
                    {formatCurrency(dados.desconsiderados.beneficio_fiscal.valor_icms)}
                  </span>
                  <span className="text-xs text-[#A1A1AA] block mt-1">
                    {dados.desconsiderados.beneficio_fiscal.qtd_itens} produtos afetados
                  </span>
                </div>
              )}
              <div className="bg-[#141414] rounded-lg p-3 border border-[#2A2A2A]">
                <span className="text-xs text-[#A1A1AA] block mb-1">Total ICMS Desconsiderado</span>
                <span className="text-lg font-bold text-white">
                  {formatCurrency(dados.desconsiderados?.total_icms_desconsiderado || 0)}
                </span>
                <span className="text-xs text-green-400 block mt-1">
                  ↓ Reduzindo seu crédito
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card de Benefício Fiscal - Clicável */}
        {beneficioFiscal && dados?.desconsiderados?.beneficio_fiscal?.valor_icms > 0 && (
          <div 
            onClick={handleOpenBeneficioModal}
            className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/50 rounded-xl p-4 mb-6 cursor-pointer hover:border-yellow-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold flex items-center gap-2">
                    Benefício Fiscal ICMS
                    <span className="text-xs bg-yellow-500/30 px-2 py-0.5 rounded">
                      {selectedCompany?.tipo_beneficio_fiscal || 'Ativo'}
                    </span>
                  </h3>
                  <p className="text-sm text-[#A1A1AA]">
                    {dados.desconsiderados.beneficio_fiscal.qtd_itens} produtos tiveram crédito de ICMS desconsiderado
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#A1A1AA] block">ICMS Desconsiderado</span>
                <span className="text-2xl font-bold text-red-400">
                  {formatCurrency(dados.desconsiderados.beneficio_fiscal.valor_icms)}
                </span>
                <span className="text-xs text-yellow-400 block mt-1 flex items-center justify-end gap-1">
                  Clique para ver detalhes <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card informativo quando benefício fiscal está marcado mas não tem dados (não salvo no servidor) */}
        {beneficioFiscal && !selectedCompany?.beneficio_fiscal_icms && (
          <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-yellow-400 font-semibold">⭐ Benefício Fiscal ICMS - Aguardando Aplicação</h3>
                <p className="text-sm text-[#A1A1AA]">
                  Clique em "Aplicar e Recalcular" para salvar a configuração e visualizar os produtos com crédito desconsiderado.
                </p>
              </div>
              <button
                onClick={salvarFlags}
                disabled={savingFlags}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingFlags ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Aplicar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Detalhamento do Benefício Fiscal */}
        {showBeneficioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Detalhamento do Benefício Fiscal</h2>
                    <p className="text-sm text-[#A1A1AA]">
                      Produtos com crédito de ICMS desconsiderado - {selectedCompetencia}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Botões de Exportação */}
                  <button
                    onClick={() => exportarBeneficioFiscal('excel')}
                    disabled={exportingBeneficio || loadingBeneficioDetalhes}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportarBeneficioFiscal('pdf')}
                    disabled={exportingBeneficio || loadingBeneficioDetalhes}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => setShowBeneficioModal(false)}
                    className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-4 border-b border-[#2A2A2A]">
                <button
                  onClick={() => setBeneficioTab('produto')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    beneficioTab === 'produto'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Por Produto
                </button>
                <button
                  onClick={() => setBeneficioTab('ncm')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    beneficioTab === 'ncm'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
                  }`}
                >
                  <Hash className="w-4 h-4 inline mr-2" />
                  Por NCM
                </button>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingBeneficioDetalhes ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
                    <p className="text-[#A1A1AA]">Carregando detalhes...</p>
                  </div>
                ) : beneficioDetalhes ? (
                  <>
                    {/* Resumo - usando dados filtrados */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#2A2A2A]">
                        <p className="text-[#A1A1AA] text-sm">Produtos com ICMS</p>
                        <p className="text-2xl font-bold text-white">{sortedBeneficioProdutos.length}</p>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#2A2A2A]">
                        <p className="text-[#A1A1AA] text-sm">Valor Total</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(sortedBeneficioProdutos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0))}</p>
                      </div>
                      <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
                        <p className="text-red-400 text-sm">ICMS Desconsiderado</p>
                        <p className="text-2xl font-bold text-red-400">{formatCurrency(sortedBeneficioProdutos.reduce((acc, p) => acc + (parseFloat(p.valor_icms) || 0), 0))}</p>
                      </div>
                    </div>

                    {/* Tabela por Produto */}
                    {beneficioTab === 'produto' && sortedBeneficioProdutos.length > 0 && (
                      <div className="bg-[#0C0C0C] rounded-lg border border-[#2A2A2A] overflow-hidden">
                        <div className="max-h-[400px] overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#1A1A1A] sticky top-0">
                              <tr>
                                <th 
                                  className="px-3 py-3 text-left text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('descricao')}
                                >
                                  <div className="flex items-center gap-1">
                                    Produto
                                    {beneficioProdutoSort.column === 'descricao' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-left text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('ncm')}
                                >
                                  <div className="flex items-center gap-1">
                                    NCM
                                    {beneficioProdutoSort.column === 'ncm' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-center text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('cfop')}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    CFOP
                                    {beneficioProdutoSort.column === 'cfop' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-center text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('qtd_notas')}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    Notas
                                    {beneficioProdutoSort.column === 'qtd_notas' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-right text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('valor_total')}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    Valor
                                    {beneficioProdutoSort.column === 'valor_total' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-right text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('bc_icms')}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    BC ICMS
                                    {beneficioProdutoSort.column === 'bc_icms' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-right text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleProdutoSort('valor_icms')}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    ICMS
                                    {beneficioProdutoSort.column === 'valor_icms' && (
                                      beneficioProdutoSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2A2A2A]">
                              {sortedBeneficioProdutos.map((item, idx) => (
                                <React.Fragment key={idx}>
                                  <tr className="hover:bg-white/5">
                                    <td className="px-3 py-3 text-white">
                                      <span className="block truncate max-w-[250px]" title={item.descricao}>
                                        {item.descricao}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3">
                                      <span className="font-mono text-[#C8A951] text-xs">{item.ncm}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                      <span className="font-mono text-blue-400">{item.cfop}</span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-[#A1A1AA]">{item.qtd_notas}</td>
                                    <td className="px-3 py-3 text-right text-white">{formatCurrency(item.valor_total)}</td>
                                    <td className="px-3 py-3 text-right text-[#A1A1AA]">{formatCurrency(item.bc_icms)}</td>
                                    <td className="px-3 py-3 text-right">
                                      <span className="text-red-400 font-semibold">{formatCurrency(item.valor_icms)}</span>
                                    </td>
                                  </tr>
                                  {/* Sub-lista de notas se houver */}
                                  {item.notas && item.notas.length > 0 && (
                                    <tr className="bg-[#0A0A0A]">
                                      <td colSpan="7" className="px-6 py-2">
                                        <div className="text-xs text-[#666]">
                                          <span className="text-[#888] mr-2">Notas:</span>
                                          {item.notas.slice(0, 5).map((nota, nidx) => (
                                            <span key={nidx} className="inline-block mr-3 mb-1">
                                              <span className="text-[#C8A951]">{nota.numero}</span>
                                              {nota.emitente && <span className="text-[#666] ml-1">({nota.emitente})</span>}
                                            </span>
                                          ))}
                                          {item.notas.length > 5 && <span className="text-[#666]">... +{item.notas.length - 5}</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                            <tfoot className="bg-[#1A1A1A] border-t border-yellow-500/30">
                              <tr className="font-semibold">
                                <td colSpan="4" className="px-3 py-3 text-yellow-400">TOTAL</td>
                                <td className="px-3 py-3 text-right text-white">{formatCurrency(beneficioDetalhes.valor_total)}</td>
                                <td className="px-3 py-3 text-right text-[#A1A1AA]">{formatCurrency(beneficioDetalhes.bc_icms_total)}</td>
                                <td className="px-3 py-3 text-right text-red-400">{formatCurrency(beneficioDetalhes.valor_icms_desconsiderado)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Tabela por NCM */}
                    {beneficioTab === 'ncm' && sortedBeneficioNcms.length > 0 && (
                      <div className="bg-[#0C0C0C] rounded-lg border border-[#2A2A2A] overflow-hidden">
                        <div className="max-h-[400px] overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#1A1A1A] sticky top-0">
                              <tr>
                                <th className="px-3 py-3 text-left text-[#A1A1AA] font-medium w-8"></th>
                                <th 
                                  className="px-3 py-3 text-left text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleNcmSort('ncm')}
                                >
                                  <div className="flex items-center gap-1">
                                    NCM
                                    {beneficioNcmSort.column === 'ncm' && (
                                      beneficioNcmSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-left text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleNcmSort('descricao_ncm')}
                                >
                                  <div className="flex items-center gap-1">
                                    Descrição
                                    {beneficioNcmSort.column === 'descricao_ncm' && (
                                      beneficioNcmSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-center text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleNcmSort('qtd_produtos')}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    Produtos
                                    {beneficioNcmSort.column === 'qtd_produtos' && (
                                      beneficioNcmSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-right text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleNcmSort('valor_total')}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    Valor
                                    {beneficioNcmSort.column === 'valor_total' && (
                                      beneficioNcmSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-right text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleNcmSort('bc_icms')}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    BC ICMS
                                    {beneficioNcmSort.column === 'bc_icms' && (
                                      beneficioNcmSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                                <th 
                                  className="px-3 py-3 text-right text-[#A1A1AA] font-medium cursor-pointer hover:bg-white/5 select-none"
                                  onClick={() => handleNcmSort('valor_icms')}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    ICMS
                                    {beneficioNcmSort.column === 'valor_icms' && (
                                      beneficioNcmSort.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                    )}
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2A2A2A]">
                              {sortedBeneficioNcms.map((item, idx) => (
                                <React.Fragment key={idx}>
                                  <tr 
                                    className="hover:bg-white/5 cursor-pointer"
                                    onClick={() => toggleNcmExpansion(item.ncm)}
                                  >
                                    <td className="px-3 py-3 text-center">
                                      <ChevronDown 
                                        className={`w-4 h-4 text-[#666] transition-transform ${expandedNcms[item.ncm] ? 'rotate-180' : ''}`}
                                      />
                                    </td>
                                    <td className="px-3 py-3">
                                      <span className="font-mono text-[#C8A951] text-lg">{item.ncm}</span>
                                    </td>
                                    <td className="px-3 py-3 text-white">{item.descricao_ncm}</td>
                                    <td className="px-3 py-3 text-center text-[#A1A1AA]">{item.qtd_produtos}</td>
                                    <td className="px-3 py-3 text-right text-white">{formatCurrency(item.valor_total)}</td>
                                    <td className="px-3 py-3 text-right text-[#A1A1AA]">{formatCurrency(item.bc_icms)}</td>
                                    <td className="px-3 py-3 text-right">
                                      <span className="text-red-400 font-semibold">{formatCurrency(item.valor_icms)}</span>
                                    </td>
                                  </tr>
                                  {/* Produtos dentro do NCM (expansível) */}
                                  {expandedNcms[item.ncm] && item.produtos && item.produtos.length > 0 && (
                                    <tr className="bg-[#0A0A0A]">
                                      <td colSpan="7" className="p-0">
                                        <table className="w-full text-xs">
                                          <thead className="bg-[#111]">
                                            <tr>
                                              <th className="px-6 py-2 text-left text-[#666] font-normal">Produto</th>
                                              <th className="px-3 py-2 text-center text-[#666] font-normal">CFOP</th>
                                              <th className="px-3 py-2 text-right text-[#666] font-normal">Valor</th>
                                              <th className="px-3 py-2 text-right text-[#666] font-normal">BC ICMS</th>
                                              <th className="px-3 py-2 text-right text-[#666] font-normal">ICMS</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {item.produtos.map((prod, pidx) => (
                                              <tr key={pidx} className="border-t border-[#222]">
                                                <td className="px-6 py-2 text-[#888]">{prod.descricao}</td>
                                                <td className="px-3 py-2 text-center text-blue-400">{prod.cfop}</td>
                                                <td className="px-3 py-2 text-right text-[#888]">{formatCurrency(prod.valor_total)}</td>
                                                <td className="px-3 py-2 text-right text-[#888]">{formatCurrency(prod.bc_icms)}</td>
                                                <td className="px-3 py-2 text-right text-red-400">{formatCurrency(prod.valor_icms)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                            <tfoot className="bg-[#1A1A1A] border-t border-yellow-500/30">
                              <tr className="font-semibold">
                                <td colSpan="4" className="px-3 py-3 text-yellow-400">TOTAL</td>
                                <td className="px-3 py-3 text-right text-white">{formatCurrency(beneficioDetalhes.valor_total)}</td>
                                <td className="px-3 py-3 text-right text-[#A1A1AA]">{formatCurrency(beneficioDetalhes.bc_icms_total)}</td>
                                <td className="px-3 py-3 text-right text-red-400">{formatCurrency(beneficioDetalhes.valor_icms_desconsiderado)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 text-yellow-500/50 mx-auto mb-4" />
                    <p className="text-[#A1A1AA]">Nenhum dado disponível</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-4 border-t border-[#2A2A2A]">
                <div className="text-sm text-[#A1A1AA]">
                  {selectedCompany?.produtos_sem_credito_icms?.length > 0 && (
                    <span>
                      Regra aplicada: <span className="text-yellow-400">{selectedCompany.produtos_sem_credito_icms.join(', ')}</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowBeneficioModal(false)}
                  className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#333] text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs ICMS / ICMS ST */}
        {selectedCompany && dados && (
          <div className="flex gap-2 mb-6 border-b border-[#2A2A2A] pb-3">
            <button
              onClick={() => setActiveTab('icms')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'icms'
                  ? 'bg-[#C8A951] text-black'
                  : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
              data-testid="tab-icms"
            >
              <BarChart3 className="w-4 h-4" />
              ICMS Próprio
            </button>
            <button
              onClick={() => setActiveTab('icms_st')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'icms_st'
                  ? 'bg-[#C8A951] text-black'
                  : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
              data-testid="tab-icms-st"
            >
              <Truck className="w-4 h-4" />
              ICMS ST
              {dados.icms_st?.apuracao?.icms_st_a_recolher > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(dados.icms_st.apuracao.icms_st_a_recolher)}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a apuração de ICMS</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : dados ? (
          <div className="space-y-6">
          {/* Aba ICMS Próprio */}
          {activeTab === 'icms' && (
          <>
            {/* Cards de Resumo - Apuração */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <ResumoCard
                titulo="Crédito ICMS"
                valor={dados.apuracao?.credito_icms}
                subtitulo={`${dados.entradas?.totais?.qtd_documentos || 0} doc(s) | ${dados.entradas?.totais?.qtd_itens || 0} item(s)`}
                icon={TrendingUp}
                corIcone="bg-green-600"
                corValor="text-green-400"
              />
              <ResumoCard
                titulo="Débito ICMS"
                valor={dados.apuracao?.debito_icms}
                subtitulo={`${dados.saidas?.totais?.qtd_documentos || 0} doc(s) | ${dados.saidas?.totais?.qtd_itens || 0} item(s)`}
                icon={TrendingDown}
                corIcone="bg-red-600"
                corValor="text-red-400"
              />
              <ResumoCard
                titulo="ICMS por Documento"
                valor={dados.apuracao?.credito_icms && dados.entradas?.totais?.qtd_documentos ? 
                  (dados.apuracao.credito_icms / dados.entradas.totais.qtd_documentos) : 0}
                subtitulo="Média de crédito por documento"
                icon={FileText}
                corIcone="bg-blue-600"
                corValor="text-blue-400"
              />
              <ResumoCard
                titulo="Saldo"
                valor={Math.abs(dados.apuracao?.saldo || 0)}
                subtitulo={dados.apuracao?.situacao === 'A_PAGAR' ? 'Imposto a pagar' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'Crédito a recuperar' : 'Zerado'}
                icon={ArrowLeftRight}
                corIcone="bg-blue-600"
                corValor={dados.apuracao?.situacao === 'A_PAGAR' ? 'text-red-400' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'text-green-400' : 'text-white'}
              />
              <div className={`rounded-xl p-4 border-2 ${
                dados.apuracao?.situacao === 'A_PAGAR' 
                  ? 'bg-red-500/10 border-red-500/50' 
                  : dados.apuracao?.situacao === 'A_RECUPERAR'
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-[#141414] border-[#2A2A2A]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    dados.apuracao?.situacao === 'A_PAGAR' 
                      ? 'bg-red-600' 
                      : dados.apuracao?.situacao === 'A_RECUPERAR'
                      ? 'bg-green-600'
                      : 'bg-[#C8A951]'
                  }`}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.apuracao?.situacao === 'A_PAGAR' ? 'ICMS a Pagar' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'ICMS a Recuperar' : 'Situação'}
                    </p>
                    <p className={`text-xl font-bold ${
                      dados.apuracao?.situacao === 'A_PAGAR' 
                        ? 'text-red-400' 
                        : dados.apuracao?.situacao === 'A_RECUPERAR'
                        ? 'text-green-400'
                        : 'text-white'
                    }`}>
                      {formatCurrency(Math.abs(dados.apuracao?.saldo || 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demonstrativo de Cálculo */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C8A951]" />
                Demonstrativo de Apuração
              </h3>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30 min-w-[180px]">
                  <p className="text-green-400 text-2xl font-bold">{formatCurrency(dados.apuracao?.credito_icms)}</p>
                  <p className="text-[#A1A1AA] text-sm">Crédito (Entradas)</p>
                </div>
                <Minus className="w-6 h-6 text-[#666]" />
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30 min-w-[180px]">
                  <p className="text-red-400 text-2xl font-bold">{formatCurrency(dados.apuracao?.debito_icms)}</p>
                  <p className="text-[#A1A1AA] text-sm">Débito (Saídas)</p>
                </div>
                
                {/* Crédito Presumido - Transportadoras */}
                {dados.apuracao?.is_transportadora && dados.apuracao?.credito_presumido_icms > 0 && (
                  <>
                    <Minus className="w-6 h-6 text-[#666]" />
                    <div className="text-center p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 min-w-[180px]">
                      <p className="text-cyan-400 text-2xl font-bold">{formatCurrency(dados.apuracao?.credito_presumido_icms)}</p>
                      <p className="text-[#A1A1AA] text-sm">Crédito Presumido</p>
                      <p className="text-xs text-cyan-300 mt-1">{dados.apuracao?.credito_presumido_percent}% s/ débito</p>
                    </div>
                  </>
                )}
                
                <ArrowRight className="w-6 h-6 text-[#C8A951]" />
                <div className={`text-center p-4 rounded-lg border min-w-[180px] ${
                  dados.apuracao?.situacao === 'A_PAGAR' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : dados.apuracao?.situacao === 'A_RECUPERAR'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-[#2A2A2A] border-[#333]'
                }`}>
                  <p className={`text-2xl font-bold ${
                    dados.apuracao?.situacao === 'A_PAGAR' 
                      ? 'text-red-400' 
                      : dados.apuracao?.situacao === 'A_RECUPERAR'
                      ? 'text-green-400'
                      : 'text-white'
                  }`}>
                    {dados.apuracao?.situacao === 'A_RECUPERAR' ? '(' : ''}{formatCurrency(Math.abs(dados.apuracao?.saldo || 0))}{dados.apuracao?.situacao === 'A_RECUPERAR' ? ')' : ''}
                  </p>
                  <p className="text-[#A1A1AA] text-sm">
                    {dados.apuracao?.situacao === 'A_PAGAR' ? 'A Pagar' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'A Recuperar' : 'Zerado'}
                  </p>
                </div>
              </div>
              
              {/* Info Transportadora */}
              {dados.apuracao?.is_transportadora && (
                <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-400" />
                  <p className="text-sm text-cyan-300">
                    <strong>Transportadora:</strong> Crédito presumido de {dados.apuracao?.credito_presumido_percent}% aplicado sobre o débito 
                    conforme Art. 70, XI do RICMS/SP
                  </p>
                </div>
              )}
            </div>

            {/* Seção de Entradas */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('entradas')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                data-testid="toggle-entradas"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-semibold">ENTRADAS (Créditos)</span>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.entradas?.totais?.qtd_documentos || 0} documentos | {dados.entradas?.totais?.qtd_itens || 0} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{formatCurrency(dados.entradas?.totais?.valor_icms)}</p>
                    <p className="text-[#666] text-xs">BC: {formatCurrency(dados.entradas?.totais?.bc_icms)}</p>
                  </div>
                  {expandedSections.entradas ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
                </div>
              </button>
              {expandedSections.entradas && (
                <div className="border-t border-[#2A2A2A]">
                  <TabelaCFOP dados={dados.entradas?.por_cfop} tipo="entrada" />
                  {/* Totalizador */}
                  <div className="bg-[#0C0C0C] p-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">TOTAL ENTRADAS</span>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Valor Total (Doc)</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.valores_por_documento?.total_entradas || dados.entradas?.totais?.valor_total_por_documento || dados.entradas?.totais?.valor_total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">BC ICMS</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.entradas?.totais?.bc_icms)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Crédito ICMS</p>
                          <p className="text-green-400 font-bold text-lg">{formatCurrency(dados.entradas?.totais?.valor_icms)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Saídas */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('saidas')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                data-testid="toggle-saidas"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-semibold">SAÍDAS (Débitos)</span>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.saidas?.totais?.qtd_documentos || 0} documentos | {dados.saidas?.totais?.qtd_itens || 0} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{formatCurrency(dados.saidas?.totais?.valor_icms)}</p>
                    <p className="text-[#666] text-xs">BC: {formatCurrency(dados.saidas?.totais?.bc_icms)}</p>
                  </div>
                  {expandedSections.saidas ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
                </div>
              </button>
              {expandedSections.saidas && (
                <div className="border-t border-[#2A2A2A]">
                  <TabelaCFOP dados={dados.saidas?.por_cfop} tipo="saida" />
                  {/* Totalizador */}
                  <div className="bg-[#0C0C0C] p-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">TOTAL SAÍDAS</span>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Valor Total (Doc)</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.valores_por_documento?.total_saidas || dados.saidas?.totais?.valor_total_por_documento || dados.saidas?.totais?.valor_total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">BC ICMS</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.saidas?.totais?.bc_icms)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Débito ICMS</p>
                          <p className="text-red-400 font-bold text-lg">{formatCurrency(dados.saidas?.totais?.valor_icms)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top 10 Rankings */}
            <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#C8A951]" />
                Rankings - Maiores Geradores de ICMS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Top10Card
                  titulo="Top 10 Produtos - Crédito"
                  dados={dados.top_10?.produtos_credito}
                  tipo="credito"
                  icon={Package}
                />
                <Top10Card
                  titulo="Top 10 Produtos - Débito"
                  dados={dados.top_10?.produtos_debito}
                  tipo="debito"
                  icon={Package}
                />
                <Top10Card
                  titulo="Top 10 NCMs - Crédito"
                  dados={dados.top_10?.ncms_credito}
                  tipo="credito"
                  icon={Hash}
                />
                <Top10Card
                  titulo="Top 10 NCMs - Débito"
                  dados={dados.top_10?.ncms_debito}
                  tipo="debito"
                  icon={Hash}
                />
              </div>
            </div>
          </>
        )}

        {/* Aba ICMS ST */}
        {activeTab === 'icms_st' && (
          <>
            {/* Cards de Resumo ICMS ST */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ResumoCard
                titulo="ICMS ST Gerado"
                valor={dados.icms_st?.apuracao?.icms_st_gerado}
                subtitulo="Saídas com ST"
                icon={TrendingDown}
                corIcone="bg-amber-600"
                corValor="text-amber-400"
              />
              <ResumoCard
                titulo="(-) Devoluções ST"
                valor={dados.icms_st?.apuracao?.icms_st_devolucoes}
                subtitulo="Dedução por devoluções"
                icon={TrendingUp}
                corIcone="bg-green-600"
                corValor="text-green-400"
              />
              <ResumoCard
                titulo="(=) ICMS ST a Recolher"
                valor={dados.icms_st?.apuracao?.icms_st_a_recolher}
                subtitulo={dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' ? 'Imposto devido' : 'Sem ICMS ST'}
                icon={DollarSign}
                corIcone="bg-[#C8A951]"
                corValor={dados.icms_st?.apuracao?.icms_st_a_recolher > 0 ? 'text-amber-400' : 'text-white'}
              />
              <div className={`rounded-xl p-4 border-2 ${
                dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' 
                  ? 'bg-amber-500/10 border-amber-500/50' 
                  : 'bg-[#141414] border-[#2A2A2A]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' 
                      ? 'bg-amber-600' 
                      : 'bg-[#C8A951]'
                  }`}>
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">ICMS ST a Recolher</p>
                    <p className={`text-xl font-bold ${
                      dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' 
                        ? 'text-amber-400' 
                        : 'text-white'
                    }`}>
                      {formatCurrency(dados.icms_st?.apuracao?.icms_st_a_recolher || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demonstrativo ICMS ST */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C8A951]" />
                Demonstrativo de Apuração ICMS ST
              </h3>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 min-w-[180px]">
                  <p className="text-amber-400 text-2xl font-bold">{formatCurrency(dados.icms_st?.apuracao?.icms_st_gerado)}</p>
                  <p className="text-[#A1A1AA] text-sm">ICMS ST Gerado</p>
                </div>
                <Minus className="w-6 h-6 text-[#666]" />
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30 min-w-[180px]">
                  <p className="text-green-400 text-2xl font-bold">{formatCurrency(dados.icms_st?.apuracao?.icms_st_devolucoes)}</p>
                  <p className="text-[#A1A1AA] text-sm">Devoluções ST</p>
                </div>
                <ArrowRight className="w-6 h-6 text-[#C8A951]" />
                <div className={`text-center p-4 rounded-lg border min-w-[180px] ${
                  dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' 
                    ? 'bg-amber-500/10 border-amber-500/30' 
                    : 'bg-[#2A2A2A] border-[#333]'
                }`}>
                  <p className={`text-2xl font-bold ${
                    dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' 
                      ? 'text-amber-400' 
                      : 'text-white'
                  }`}>
                    {formatCurrency(dados.icms_st?.apuracao?.icms_st_a_recolher || 0)}
                  </p>
                  <p className="text-[#A1A1AA] text-sm">
                    {dados.icms_st?.apuracao?.situacao === 'A_RECOLHER' ? 'A Recolher' : 'Zerado'}
                  </p>
                </div>
              </div>
            </div>

            {/* ICMS ST por CFOP - Saídas */}
            {dados.icms_st?.saidas?.por_cfop?.length > 0 && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
                  <div className="bg-amber-600 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">ICMS ST nas Saídas</span>
                    <p className="text-[#A1A1AA] text-sm">
                      Total: {formatCurrency(dados.icms_st?.saidas?.total_icms_st)}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">CFOP</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Qtd</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">BC ICMS ST</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ICMS ST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.icms_st?.saidas?.por_cfop?.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                          <td className="py-3 px-4">
                            <span className="font-mono text-white bg-[#2A2A2A] px-2 py-1 rounded">{item.cfop}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.qtd}</td>
                          <td className="py-3 px-4 text-right text-white">{formatCurrency(item.bc_icms_st)}</td>
                          <td className="py-3 px-4 text-right text-amber-400 font-semibold">{formatCurrency(item.valor_icms_st)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ICMS ST Devoluções */}
            {dados.icms_st?.devolucoes?.por_cfop?.length > 0 && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-white font-semibold">Deduções - Devoluções com ICMS ST</span>
                    <p className="text-[#A1A1AA] text-sm">
                      Total: {formatCurrency(dados.icms_st?.devolucoes?.total_icms_st)}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">CFOP</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Qtd</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">BC ICMS ST</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ICMS ST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.icms_st?.devolucoes?.por_cfop?.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                          <td className="py-3 px-4">
                            <span className="font-mono text-white bg-[#2A2A2A] px-2 py-1 rounded">{item.cfop}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.qtd}</td>
                          <td className="py-3 px-4 text-right text-white">{formatCurrency(item.bc_icms_st)}</td>
                          <td className="py-3 px-4 text-right text-green-400 font-semibold">{formatCurrency(item.valor_icms_st)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Mensagem quando não há ICMS ST */}
            {(!dados.icms_st?.saidas?.por_cfop?.length && !dados.icms_st?.devolucoes?.por_cfop?.length) && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
                <Truck className="w-12 h-12 text-[#666] mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg">Nenhum ICMS ST encontrado</h3>
                <p className="text-[#A1A1AA]">
                  Não foram encontradas operações com ICMS ST nesta competência.
                </p>
              </div>
            )}
          </>
        )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoICMS;
