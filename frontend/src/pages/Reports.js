import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  FileBarChart, Download, TrendingUp, TrendingDown, Package, Boxes, 
  ArrowDownCircle, ArrowUpCircle, ArrowUp, ArrowDown, ArrowUpDown,
  FileSpreadsheet, FileText, CheckSquare, Square, Check, X,
  RefreshCw, Building2, Calendar, DollarSign, Calculator, Percent,
  BarChart3, PieChart, Scale, Loader2, Filter
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Reports = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  
  // Estados para relatório consolidado
  const [activeTab, setActiveTab] = useState('consolidado'); // consolidado, produtos, ncm, aliquota
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Seções selecionadas para exportação
  const [selectedSections, setSelectedSections] = useState({
    resumo: true,
    icms: true,
    icms_st: false,
    pis_cofins: true,
    ipi: false,
    iss: false,
    difal: false,
    impostos_retidos: false,
    documentos: true,
    produtos_entrada: true,
    produtos_saida: true,
    divergencias: false,
    classificacao: false,
    indicadores: false,
    evolucao: false,
    viloes: false
  });
  
  // Dados carregados
  const [consolidadoData, setConsolidadoData] = useState(null);
  const [produtosData, setProdutosData] = useState([]);
  const [aliquotaData, setAliquotaData] = useState(null);
  
  // Filtros
  const [tipoOperacao, setTipoOperacao] = useState('entrada');
  const [sortField, setSortField] = useState('valor_total');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Formato de exportação
  const [exportFormat, setExportFormat] = useState('xlsx');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  };

  // Carregar dados consolidados
  const loadConsolidado = async () => {
    if (!ctxCompany?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Carregar múltiplos endpoints em paralelo
      const [dashboardRes, icmsRes, pisCofinsRes] = await Promise.all([
        axios.get(`${API}/dashboard/${ctxCompany.id}?competencia=${encodeURIComponent(ctxCompetencia)}`, { headers }),
        axios.get(`${API}/icms/${ctxCompany.id}?competencia=${encodeURIComponent(ctxCompetencia)}`, { headers }),
        axios.get(`${API}/pis-cofins/apuracao/${ctxCompany.id}?competencia=${encodeURIComponent(ctxCompetencia)}`, { headers })
      ]);
      
      setConsolidadoData({
        dashboard: dashboardRes.data,
        icms: icmsRes.data,
        pis_cofins: pisCofinsRes.data
      });
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados consolidados');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados de produtos por alíquota
  const loadAliquotaData = async () => {
    if (!ctxCompany?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/relatorio-agrupado-aliquota/${ctxCompany.id}?competencia=${encodeURIComponent(ctxCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAliquotaData(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados de alíquota:', err);
      toast.error('Erro ao carregar relatório por alíquota');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados de produtos
  const loadProdutos = async () => {
    if (!ctxCompany?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/reports/by-product/${ctxCompany.id}?competencia=${encodeURIComponent(ctxCompetencia)}&tipo=${tipoOperacao}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProdutosData(response.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      toast.error('Erro ao carregar relatório de produtos');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando muda a aba
  useEffect(() => {
    if (activeTab === 'consolidado') loadConsolidado();
    else if (activeTab === 'aliquota') loadAliquotaData();
    else if (activeTab === 'produtos') loadProdutos();
  }, [activeTab, ctxCompany?.id, ctxCompetencia, tipoOperacao]);

  // Toggle seção
  const toggleSection = (section) => {
    setSelectedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Selecionar/desmarcar todas
  const selectAll = () => {
    const allSelected = Object.fromEntries(Object.keys(selectedSections).map(k => [k, true]));
    setSelectedSections(allSelected);
  };

  const deselectAll = () => {
    const allDeselected = Object.fromEntries(Object.keys(selectedSections).map(k => [k, false]));
    setSelectedSections(allDeselected);
  };

  // Exportar relatório consolidado
  const exportarRelatorio = async () => {
    if (!ctxCompany?.id) {
      toast.error('Selecione uma empresa');
      return;
    }
    
    const secoesSelecionadas = Object.entries(selectedSections)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    
    if (secoesSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma seção para exportar');
      return;
    }
    
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/relatorio-consolidado/${ctxCompany.id}/exportar?competencia=${encodeURIComponent(ctxCompetencia)}&formato=${exportFormat}&secoes=${secoesSelecionadas.join(',')}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data], { 
        type: exportFormat === 'xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${ctxCompany.razao_social?.substring(0, 20)}_${ctxCompetencia?.replace('/', '-')}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      toast.error('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  // Exportar relatório por alíquota
  const exportarPorAliquota = async () => {
    if (!ctxCompany?.id) return;
    
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/relatorio-agrupado-aliquota/${ctxCompany.id}/exportar?competencia=${encodeURIComponent(ctxCompetencia)}&formato=${exportFormat}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_aliquota_${ctxCompetencia?.replace('/', '-')}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado!');
    } catch (err) {
      toast.error('Erro ao exportar');
    } finally {
      setExporting(false);
    }
  };

  // Ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProdutos = useMemo(() => {
    return [...produtosData].sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [produtosData, sortField, sortDirection]);

  // Componente de header ordenável
  const SortableHeader = ({ field, label, align = "left" }) => (
    <th 
      className={`px-4 py-3 text-${align} text-xs font-semibold text-[#A1A1AA] uppercase cursor-pointer hover:text-white transition-colors`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  // Seções disponíveis - Todas as informações de todos os menus
  const secoes = [
    // Resumo
    { key: 'resumo', label: 'Resumo Executivo', icon: BarChart3, desc: 'Totais de faturamento, compras e indicadores', category: 'Resumo' },
    
    // Apurações
    { key: 'icms', label: 'Apuração ICMS', icon: Calculator, desc: 'Créditos, débitos e saldo de ICMS', category: 'Apurações' },
    { key: 'icms_st', label: 'Apuração ICMS ST', icon: Calculator, desc: 'Substituição Tributária de ICMS', category: 'Apurações' },
    { key: 'pis_cofins', label: 'PIS/COFINS', icon: Scale, desc: 'Apuração de PIS e COFINS', category: 'Apurações' },
    { key: 'ipi', label: 'Apuração IPI', icon: Calculator, desc: 'Imposto sobre Produtos Industrializados', category: 'Apurações' },
    { key: 'iss', label: 'Apuração ISS', icon: Calculator, desc: 'Imposto Sobre Serviços', category: 'Apurações' },
    { key: 'difal', label: 'DIFAL', icon: Calculator, desc: 'Diferencial de Alíquota', category: 'Apurações' },
    { key: 'impostos_retidos', label: 'Impostos Retidos', icon: DollarSign, desc: 'IR, CSLL, PIS, COFINS retidos', category: 'Apurações' },
    
    // Documentos
    { key: 'documentos', label: 'Documentos Fiscais', icon: FileText, desc: 'Lista de NF-e, NFC-e e outros documentos', category: 'Documentos' },
    { key: 'produtos_entrada', label: 'Produtos (Entradas)', icon: ArrowDownCircle, desc: 'Produtos adquiridos na competência', category: 'Documentos' },
    { key: 'produtos_saida', label: 'Produtos (Saídas)', icon: ArrowUpCircle, desc: 'Produtos vendidos na competência', category: 'Documentos' },
    
    // Análises
    { key: 'divergencias', label: 'Divergências Fiscais', icon: TrendingDown, desc: 'Divergências de PIS/COFINS identificadas', category: 'Análises' },
    { key: 'classificacao', label: 'Classificação Produtos', icon: Package, desc: 'Status da classificação de produtos', category: 'Análises' },
    { key: 'indicadores', label: 'Indicadores Fiscais', icon: BarChart3, desc: 'KPIs e métricas fiscais', category: 'Análises' },
    { key: 'evolucao', label: 'Evolução Fiscal', icon: TrendingUp, desc: 'Análise horizontal comparativa', category: 'Análises' },
    { key: 'viloes', label: 'Vilões e Oportunidades', icon: TrendingDown, desc: 'NCMs com maior carga tributária', category: 'Análises' },
  ];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="reports-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileBarChart className="w-7 h-7 text-[#C8A951]" />
              Relatórios Gerenciais
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Exporte dados completos em Excel ou Word com formatação profissional
            </p>
          </div>
          
          {/* Info da empresa */}
          {ctxCompany && (
            <div className="flex items-center gap-3 bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2">
              {ctxCompany.logo_url ? (
                <img src={ctxCompany.logo_url} alt="" className="w-10 h-10 rounded object-contain bg-white" />
              ) : (
                <Building2 className="w-8 h-8 text-[#A1A1AA]" />
              )}
              <div>
                <p className="text-white font-medium">{ctxCompany.razao_social?.substring(0, 30)}</p>
                <p className="text-[#666] text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {ctxCompetencia}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#2A2A2A] pb-4">
          {[
            { key: 'consolidado', label: 'Consolidado', icon: FileBarChart },
            { key: 'aliquota', label: 'Por Alíquota PIS/COFINS', icon: Percent },
            { key: 'produtos', label: 'Por Produto', icon: Package },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#C8A951] text-black'
                  : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Relatório Consolidado */}
        {activeTab === 'consolidado' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel de Seleção de Seções */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Seções do Relatório</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-2 py-1 bg-[#2A2A2A] text-white rounded hover:bg-[#3A3A3A]"
                    >
                      Todos
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs px-2 py-1 bg-[#2A2A2A] text-[#A1A1AA] rounded hover:bg-[#3A3A3A]"
                    >
                      Nenhum
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Agrupar seções por categoria */}
                  {['Resumo', 'Apurações', 'Documentos', 'Análises'].map(categoria => {
                    const secoesCategoria = secoes.filter(s => s.category === categoria);
                    return (
                      <div key={categoria}>
                        <h4 className="text-xs font-semibold text-[#C8A951] uppercase mb-2">{categoria}</h4>
                        <div className="space-y-2">
                          {secoesCategoria.map(secao => (
                            <button
                              key={secao.key}
                              onClick={() => toggleSection(secao.key)}
                              className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                                selectedSections[secao.key]
                                  ? 'bg-[#C8A951]/10 border border-[#C8A951]/30'
                                  : 'bg-[#0C0C0C] border border-[#2A2A2A] hover:border-[#3A3A3A]'
                              }`}
                            >
                              <div className={`mt-0.5 ${selectedSections[secao.key] ? 'text-[#C8A951]' : 'text-[#666]'}`}>
                                {selectedSections[secao.key] ? (
                                  <CheckSquare className="w-5 h-5" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <secao.icon className={`w-4 h-4 ${selectedSections[secao.key] ? 'text-[#C8A951]' : 'text-[#A1A1AA]'}`} />
                                  <span className={`font-medium text-sm ${selectedSections[secao.key] ? 'text-white' : 'text-[#A1A1AA]'}`}>
                                    {secao.label}
                                  </span>
                                </div>
                                <p className="text-xs text-[#666] mt-1">{secao.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Formato e Exportação */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                <h3 className="text-white font-semibold mb-4">Formato de Exportação</h3>
                
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setExportFormat('xlsx')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      exportFormat === 'xlsx'
                        ? 'bg-green-600 text-white'
                        : 'bg-[#0C0C0C] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Excel
                  </button>
                  <button
                    onClick={() => setExportFormat('docx')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      exportFormat === 'docx'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0C0C0C] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    Word
                  </button>
                  <button
                    onClick={() => setExportFormat('pdf')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      exportFormat === 'pdf'
                        ? 'bg-red-600 text-white'
                        : 'bg-[#0C0C0C] border border-[#2A2A2A] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <FileBarChart className="w-5 h-5" />
                    PDF
                  </button>
                </div>
                
                <button
                  onClick={exportarRelatorio}
                  disabled={exporting || !ctxCompany}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#C8A951] hover:bg-[#D4B962] text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Exportar Relatório
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview dos Dados */}
            <div className="lg:col-span-2 space-y-4">
              {loading ? (
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                  <RefreshCw className="w-12 h-12 text-[#C8A951] animate-spin mx-auto mb-4" />
                  <p className="text-[#A1A1AA]">Carregando dados...</p>
                </div>
              ) : consolidadoData ? (
                <>
                  {/* Resumo */}
                  {selectedSections.resumo && (
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#C8A951]" />
                        Resumo Executivo
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#0C0C0C] rounded-lg p-3">
                          <p className="text-[#666] text-xs">Faturamento</p>
                          <p className="text-white font-bold text-lg">{formatCurrency(consolidadoData.dashboard?.faturamento)}</p>
                        </div>
                        <div className="bg-[#0C0C0C] rounded-lg p-3">
                          <p className="text-[#666] text-xs">Compras</p>
                          <p className="text-white font-bold text-lg">{formatCurrency(consolidadoData.dashboard?.compras)}</p>
                        </div>
                        <div className="bg-[#0C0C0C] rounded-lg p-3">
                          <p className="text-[#666] text-xs">Documentos</p>
                          <p className="text-white font-bold text-lg">{formatNumber(consolidadoData.dashboard?.total_documentos)}</p>
                        </div>
                        <div className="bg-[#0C0C0C] rounded-lg p-3">
                          <p className="text-[#666] text-xs">Produtos</p>
                          <p className="text-white font-bold text-lg">{formatNumber(consolidadoData.dashboard?.total_produtos)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ICMS */}
                  {selectedSections.icms && consolidadoData.icms && (
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-[#C8A951]" />
                        Apuração ICMS
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-900/20 rounded-lg p-3 border border-green-500/20">
                          <p className="text-green-400 text-xs">Crédito</p>
                          <p className="text-green-400 font-bold text-lg">{formatCurrency(consolidadoData.icms?.credito_icms)}</p>
                        </div>
                        <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/20">
                          <p className="text-red-400 text-xs">Débito</p>
                          <p className="text-red-400 font-bold text-lg">{formatCurrency(consolidadoData.icms?.debito_icms)}</p>
                        </div>
                        <div className={`rounded-lg p-3 border ${
                          consolidadoData.icms?.saldo_icms >= 0 
                            ? 'bg-green-900/20 border-green-500/20' 
                            : 'bg-red-900/20 border-red-500/20'
                        }`}>
                          <p className={consolidadoData.icms?.saldo_icms >= 0 ? 'text-green-400' : 'text-red-400'} style={{fontSize: '0.75rem'}}>
                            {consolidadoData.icms?.saldo_icms >= 0 ? 'A Recuperar' : 'A Pagar'}
                          </p>
                          <p className={`font-bold text-lg ${consolidadoData.icms?.saldo_icms >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(Math.abs(consolidadoData.icms?.saldo_icms || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PIS/COFINS Unificado */}
                  {selectedSections.pis_cofins && consolidadoData.pis_cofins && (
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-[#C8A951]" />
                        PIS/COFINS Unificado
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#2A2A2A]">
                              <th className="text-left py-2 text-[#666]"></th>
                              <th className="text-right py-2 text-[#666]">PIS</th>
                              <th className="text-right py-2 text-[#666]">COFINS</th>
                              <th className="text-right py-2 text-[#666]">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-[#1A1A1A]">
                              <td className="py-2 text-green-400">Créditos</td>
                              <td className="py-2 text-right text-green-400">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.creditos?.pis)}</td>
                              <td className="py-2 text-right text-green-400">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.creditos?.cofins)}</td>
                              <td className="py-2 text-right text-green-400 font-semibold">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.creditos?.total)}</td>
                            </tr>
                            <tr className="border-b border-[#1A1A1A]">
                              <td className="py-2 text-red-400">Débitos</td>
                              <td className="py-2 text-right text-red-400">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.debitos_total?.pis)}</td>
                              <td className="py-2 text-right text-red-400">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.debitos_total?.cofins)}</td>
                              <td className="py-2 text-right text-red-400 font-semibold">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.debitos_total?.total)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 text-white font-semibold">Imposto a Pagar</td>
                              <td className="py-2 text-right text-[#C8A951]">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.imposto_a_pagar?.pis)}</td>
                              <td className="py-2 text-right text-[#C8A951]">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.imposto_a_pagar?.cofins)}</td>
                              <td className="py-2 text-right text-[#C8A951] font-bold">{formatCurrency(consolidadoData.pis_cofins?.lucro_real?.imposto_a_pagar?.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                  <FileBarChart className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
                  <p className="text-[#A1A1AA]">Selecione uma empresa para visualizar os dados</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Por Alíquota */}
        {activeTab === 'aliquota' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Relatório por Alíquota de PIS/COFINS</h3>
                <p className="text-[#666] text-sm">Produtos agrupados por alíquota tributária</p>
              </div>
              <button
                onClick={exportarPorAliquota}
                disabled={exporting || !aliquotaData}
                className="flex items-center gap-2 px-4 py-2 bg-[#C8A951] hover:bg-[#D4B962] text-black font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exportar
              </button>
            </div>
            
            {loading ? (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin mx-auto" />
              </div>
            ) : aliquotaData?.grupos?.length > 0 ? (
              <div className="space-y-4">
                {aliquotaData.grupos.map((grupo, idx) => (
                  <div key={idx} className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    <div className="p-4 bg-[#0C0C0C] border-b border-[#2A2A2A] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded-lg font-mono font-bold ${
                          grupo.aliquota_pis === 0 ? 'bg-gray-600 text-gray-200' :
                          grupo.aliquota_pis === 1.65 ? 'bg-blue-600 text-white' :
                          'bg-purple-600 text-white'
                        }`}>
                          PIS {grupo.aliquota_pis}% | COFINS {grupo.aliquota_cofins}%
                        </div>
                        <span className="text-[#A1A1AA]">{grupo.produtos?.length || 0} produto(s)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[#666] text-xs">Valor Total</p>
                        <p className="text-white font-bold">{formatCurrency(grupo.valor_total)}</p>
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#0C0C0C] sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2 text-[#666]">Produto</th>
                            <th className="text-left px-4 py-2 text-[#666]">NCM</th>
                            <th className="text-right px-4 py-2 text-[#666]">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                          {grupo.produtos?.slice(0, 20).map((prod, pIdx) => (
                            <tr key={pIdx} className="hover:bg-[#1A1A1A]">
                              <td className="px-4 py-2 text-white truncate max-w-[300px]">{prod.descricao}</td>
                              <td className="px-4 py-2 text-[#A1A1AA] font-mono">{prod.ncm}</td>
                              <td className="px-4 py-2 text-right text-white">{formatCurrency(prod.valor_total)}</td>
                            </tr>
                          ))}
                          {grupo.produtos?.length > 20 && (
                            <tr>
                              <td colSpan="3" className="px-4 py-2 text-center text-[#666]">
                                + {grupo.produtos.length - 20} produtos (exportar para ver todos)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <Percent className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Nenhum dado disponível</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Por Produto */}
        {activeTab === 'produtos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipoOperacao('entrada')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tipoOperacao === 'entrada'
                        ? 'bg-green-600 text-white'
                        : 'bg-[#1A1A1A] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                    Entradas
                  </button>
                  <button
                    onClick={() => setTipoOperacao('saida')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tipoOperacao === 'saida'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#1A1A1A] text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    Saídas
                  </button>
                </div>
              </div>
              <span className="text-[#666] text-sm">{sortedProdutos.length} produto(s)</span>
            </div>
            
            {loading ? (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin mx-auto" />
              </div>
            ) : sortedProdutos.length > 0 ? (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0C0C0C]">
                      <tr>
                        <SortableHeader field="codigo" label="Código" />
                        <SortableHeader field="descricao" label="Descrição" />
                        <SortableHeader field="ncm" label="NCM" />
                        <SortableHeader field="quantidade" label="Qtd" align="right" />
                        <SortableHeader field="valor_total" label="Valor Total" align="right" />
                        <SortableHeader field="credito_icms" label="ICMS" align="right" />
                        <SortableHeader field="credito_pis" label="PIS" align="right" />
                        <SortableHeader field="credito_cofins" label="COFINS" align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]">
                      {sortedProdutos.slice(0, 100).map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1A1A1A]">
                          <td className="px-4 py-3 text-[#A1A1AA] font-mono text-xs">{item.codigo || '-'}</td>
                          <td className="px-4 py-3 text-white max-w-[250px] truncate">{item.descricao}</td>
                          <td className="px-4 py-3 text-[#A1A1AA] font-mono">{item.ncm}</td>
                          <td className="px-4 py-3 text-right text-white">{formatNumber(item.quantidade)}</td>
                          <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(item.valor_total)}</td>
                          <td className="px-4 py-3 text-right text-green-400">{formatCurrency(item.credito_icms)}</td>
                          <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(item.credito_pis)}</td>
                          <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(item.credito_cofins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
                <Package className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
