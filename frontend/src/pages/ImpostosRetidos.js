import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  FileText, Download, Building2, User, DollarSign, AlertTriangle,
  Search, RefreshCw, FileSpreadsheet, Loader2, ArrowRight, Info,
  Landmark, Receipt, Percent, Users, ChevronDown, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImpostosRetidos = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [guias, setGuias] = useState(null);
  const [loadingGuias, setLoadingGuias] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tomados'); // 'tomados', 'prestados' ou 'guias'
  const [searchTerm, setSearchTerm] = useState('');

  // Determinar se a empresa tem atividade de serviços
  const temAtividadeServicos = ctxCompany?.tipo_atividade === 'servicos' || ctxCompany?.tipo_atividade === 'mista';

  useEffect(() => {
    if (ctxCompany?.id && selectedCompetencia) {
      fetchDados();
    }
  }, [ctxCompany?.id, selectedCompetencia]);

  const fetchDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/impostos-retidos/${ctxCompany.id}?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDados(response.data);
    } catch (err) {
      console.error('Erro ao buscar impostos retidos:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Buscar relatório de guias
  const fetchGuias = async () => {
    setLoadingGuias(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/impostos-retidos/${ctxCompany.id}/guias?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuias(response.data);
    } catch (err) {
      console.error('Erro ao buscar guias:', err);
    } finally {
      setLoadingGuias(false);
    }
  };

  // Buscar guias quando mudar para a aba de guias
  useEffect(() => {
    if (activeTab === 'guias' && ctxCompany?.id && selectedCompetencia && !guias) {
      fetchGuias();
    }
  }, [activeTab, ctxCompany?.id, selectedCompetencia]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Filtrar detalhes por termo de busca
  const filtrarDetalhes = (detalhes) => {
    if (!searchTerm) return detalhes;
    const term = searchTerm.toLowerCase();
    return detalhes.filter(item => 
      item.numero_nf?.toLowerCase().includes(term) ||
      item.prestador?.toLowerCase().includes(term) ||
      item.tomador?.toLowerCase().includes(term) ||
      item.cnpj?.includes(term)
    );
  };

  // Exportar para Excel
  const exportarExcel = () => {
    if (!dados) return;
    
    const dadosTomados = dados.servicos_tomados?.detalhes?.map(item => ({
      'Número NF': item.numero_nf,
      'Data Emissão': formatDate(item.data_emissao),
      'Prestador': item.prestador,
      'CNPJ': item.cnpj,
      'Valor Serviços': item.valor_servicos,
      'ISS Retido': item.retencoes?.iss || 0,
      'IR Retido': item.retencoes?.ir || 0,
      'PIS Retido': item.retencoes?.pis || 0,
      'COFINS Retido': item.retencoes?.cofins || 0,
      'CSLL Retido': item.retencoes?.csll || 0,
      'INSS Retido': item.retencoes?.inss || 0,
      'Total Retido': item.total_retido
    })) || [];
    
    const dadosPrestados = dados.servicos_prestados?.detalhes?.map(item => ({
      'Número NF': item.numero_nf,
      'Data Emissão': formatDate(item.data_emissao),
      'Tomador': item.tomador,
      'CNPJ': item.cnpj,
      'Valor Serviços': item.valor_servicos,
      'ISS Retido': item.retencoes?.iss || 0,
      'IR Retido': item.retencoes?.ir || 0,
      'PIS Retido': item.retencoes?.pis || 0,
      'COFINS Retido': item.retencoes?.cofins || 0,
      'CSLL Retido': item.retencoes?.csll || 0,
      'INSS Retido': item.retencoes?.inss || 0,
      'Total Retido': item.total_retido
    })) || [];
    
    const wb = XLSX.utils.book_new();
    
    if (dadosTomados.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(dadosTomados);
      XLSX.utils.book_append_sheet(wb, ws1, 'Serviços Tomados');
    }
    
    if (temAtividadeServicos && dadosPrestados.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(dadosPrestados);
      XLSX.utils.book_append_sheet(wb, ws2, 'Serviços Prestados');
    }
    
    // Resumo
    const resumo = [
      { 'Descrição': 'Total Retido como Tomador', 'Valor': dados.resumo?.total_retido_como_tomador || 0 },
      { 'Descrição': 'Total Retido como Prestador', 'Valor': dados.resumo?.total_retido_como_prestador || 0 },
      { 'Descrição': 'Líquido', 'Valor': dados.resumo?.liquido || 0 }
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    
    XLSX.writeFile(wb, `impostos_retidos_${ctxCompany?.razao_social?.substring(0, 20)}_${selectedCompetencia?.replace('/', '-')}.xlsx`);
  };

  // Calcular totalizadores por grupo de imposto
  const calcularTotaisPorGrupo = (detalhes) => {
    const totais = {
      iss: { valor: 0, detalhes: [] },
      ir: { valor: 0, detalhes: [] },
      contribuicoes: { valor: 0, detalhes: [], pis: 0, cofins: 0, csll: 0 },
      inss: { valor: 0, detalhes: [] }
    };
    
    // ISS por município
    const issPorMunicipio = {};
    
    (detalhes || []).forEach(item => {
      const ret = item.retencoes || {};
      const municipio = item.municipio_prestador || item.municipio || 'Não informado';
      
      // ISS
      if (ret.iss > 0) {
        totais.iss.valor += ret.iss;
        totais.iss.detalhes.push(item);
        
        if (!issPorMunicipio[municipio]) {
          issPorMunicipio[municipio] = { valor: 0, qtd: 0 };
        }
        issPorMunicipio[municipio].valor += ret.iss;
        issPorMunicipio[municipio].qtd += 1;
      }
      
      // IR
      if (ret.ir > 0) {
        totais.ir.valor += ret.ir;
        totais.ir.detalhes.push(item);
      }
      
      // PIS + COFINS + CSLL
      const pisVal = ret.pis || 0;
      const cofinsVal = ret.cofins || 0;
      const csllVal = ret.csll || 0;
      if (pisVal > 0 || cofinsVal > 0 || csllVal > 0) {
        totais.contribuicoes.pis += pisVal;
        totais.contribuicoes.cofins += cofinsVal;
        totais.contribuicoes.csll += csllVal;
        totais.contribuicoes.valor += pisVal + cofinsVal + csllVal;
        totais.contribuicoes.detalhes.push(item);
      }
      
      // INSS
      if (ret.inss > 0) {
        totais.inss.valor += ret.inss;
        totais.inss.detalhes.push(item);
      }
    });
    
    totais.issPorMunicipio = issPorMunicipio;
    totais.total = totais.iss.valor + totais.ir.valor + totais.contribuicoes.valor + totais.inss.valor;
    
    return totais;
  };

  // Componente de Card de Grupo de Imposto
  const GrupoImpostoCard = ({ titulo, valor, cor, icone: Icone, detalhes, expanded, onToggle, children }) => {
    if (valor <= 0) return null;
    
    const cores = {
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', accent: 'bg-blue-500/20' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', accent: 'bg-green-500/20' },
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', accent: 'bg-purple-500/20' },
      red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', accent: 'bg-red-500/20' },
      amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', accent: 'bg-amber-500/20' }
    };
    
    const c = cores[cor] || cores.blue;
    
    return (
      <div className={`rounded-xl ${c.bg} border ${c.border} overflow-hidden`}>
        <button 
          onClick={onToggle}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.accent} flex items-center justify-center`}>
              <Icone className={`w-6 h-6 ${c.text}`} />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">{titulo}</h3>
              <p className="text-xs text-[#A1A1AA]">{detalhes?.length || 0} documento(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className={`text-2xl font-bold ${c.text}`}>{formatCurrency(valor)}</p>
            <ArrowRight className={`w-5 h-5 ${c.text} transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </button>
        
        {expanded && children && (
          <div className="border-t border-[#2A2A2A] p-4 bg-black/20">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Estado para controlar expansão dos grupos
  const [expandedGroups, setExpandedGroups] = React.useState({});
  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Componente de Tabela de Detalhes
  const TabelaDetalhes = ({ detalhes, tipo }) => {
    const detalhesFiltrados = filtrarDetalhes(detalhes || []);
    
    if (detalhesFiltrados.length === 0) {
      return (
        <div className="text-center py-8 text-[#A1A1AA]">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum documento com retenção encontrado</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">NF</th>
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Data</th>
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">{tipo === 'tomados' ? 'Prestador' : 'Tomador'}</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Serviços</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ISS</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">IR</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">PIS</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">COFINS</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">CSLL</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">INSS</th>
              <th className="text-right py-3 px-4 text-[#C8A951] font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {detalhesFiltrados.map((item, idx) => (
              <tr key={idx} className="border-b border-[#2A2A2A]/50 hover:bg-white/5">
                <td className="py-3 px-4 text-white font-medium">{item.numero_nf}</td>
                <td className="py-3 px-4 text-[#A1A1AA]">{formatDate(item.data_emissao)}</td>
                <td className="py-3 px-4">
                  <p className="text-white truncate max-w-[200px]">{item.prestador || item.tomador || '-'}</p>
                  <p className="text-xs text-[#666]">{item.cnpj || '-'}</p>
                </td>
                <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_servicos)}</td>
                <td className="py-3 px-4 text-right text-blue-400">{item.retencoes?.iss > 0 ? formatCurrency(item.retencoes.iss) : '-'}</td>
                <td className="py-3 px-4 text-right text-green-400">{item.retencoes?.ir > 0 ? formatCurrency(item.retencoes.ir) : '-'}</td>
                <td className="py-3 px-4 text-right text-purple-400">{item.retencoes?.pis > 0 ? formatCurrency(item.retencoes.pis) : '-'}</td>
                <td className="py-3 px-4 text-right text-amber-400">{item.retencoes?.cofins > 0 ? formatCurrency(item.retencoes.cofins) : '-'}</td>
                <td className="py-3 px-4 text-right text-cyan-400">{item.retencoes?.csll > 0 ? formatCurrency(item.retencoes.csll) : '-'}</td>
                <td className="py-3 px-4 text-right text-red-400">{item.retencoes?.inss > 0 ? formatCurrency(item.retencoes.inss) : '-'}</td>
                <td className="py-3 px-4 text-right text-[#C8A951] font-bold">{formatCurrency(item.total_retido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!ctxCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-[#C8A951] mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar os impostos retidos</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <DollarSign className="w-7 h-7 text-[#C8A951]" />
              Impostos Retidos
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              {ctxCompany.razao_social} • Competência {selectedCompetencia}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDados}
              disabled={loading}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            
            <button
              onClick={exportarExcel}
              disabled={!dados || loading}
              className="px-4 py-2 bg-[#C8A951] text-black rounded-lg hover:bg-[#D4B85C] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        {dados && !loading && (
          <>
            {/* Resumo Geral */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-6">
              <h2 className="text-white font-medium mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#C8A951]" />
                Resumo da Competência
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-sm text-amber-300">Retido como Tomador</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(dados.resumo?.total_retido_como_tomador)}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Obrigação de recolhimento
                  </p>
                </div>
                
                {temAtividadeServicos && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300">Retido como Prestador</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(dados.resumo?.total_retido_como_prestador)}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Já retido na fonte
                    </p>
                  </div>
                )}
                
                <div className={`rounded-lg p-4 border ${
                  (dados.resumo?.liquido || 0) > 0 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-green-500/10 border-green-500/30'
                }`}>
                  <p className={`text-sm ${(dados.resumo?.liquido || 0) > 0 ? 'text-red-300' : 'text-green-300'}`}>
                    Líquido
                  </p>
                  <p className={`text-2xl font-bold ${(dados.resumo?.liquido || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(Math.abs(dados.resumo?.liquido || 0))}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    {(dados.resumo?.liquido || 0) > 0 ? 'A recolher' : 'Já compensado'}
                  </p>
                </div>
              </div>
              
              {dados.resumo?.orientacao && (
                <div className="mt-4 p-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg">
                  <p className="text-sm text-[#A1A1AA]">{dados.resumo.orientacao}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A]">
              <div className="flex border-b border-[#2A2A2A]">
                <button
                  onClick={() => setActiveTab('tomados')}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
                    activeTab === 'tomados'
                      ? 'text-[#C8A951] border-b-2 border-[#C8A951] bg-[#C8A951]/5'
                      : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-5 h-5" />
                    Serviços Tomados
                    {dados.servicos_tomados?.qtd_documentos > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                        {dados.servicos_tomados.qtd_documentos}
                      </span>
                    )}
                  </div>
                </button>
                
                {temAtividadeServicos && (
                  <button
                    onClick={() => setActiveTab('prestados')}
                    className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
                      activeTab === 'prestados'
                        ? 'text-[#C8A951] border-b-2 border-[#C8A951] bg-[#C8A951]/5'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Serviços Prestados
                      {dados.servicos_prestados?.qtd_documentos > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {dados.servicos_prestados.qtd_documentos}
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>

              {/* Content Area */}
              <div className="p-6">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                    <input
                      type="text"
                      placeholder="Buscar por NF, prestador, tomador ou CNPJ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#C8A951]"
                    />
                  </div>
                </div>

                {/* Visualização por Grupos de Imposto */}
                {activeTab === 'tomados' && dados.servicos_tomados && (
                  <>
                    {/* Totalizadores por Grupo */}
                    {(() => {
                      const totais = calcularTotaisPorGrupo(dados.servicos_tomados.detalhes);
                      return (
                        <div className="space-y-4 mb-6">
                          {/* ISS com sub-lista por município */}
                          <GrupoImpostoCard 
                            titulo="ISS - Imposto sobre Serviços" 
                            valor={totais.iss.valor}
                            cor="blue"
                            icone={Landmark}
                            detalhes={totais.iss.detalhes}
                            expanded={expandedGroups.iss}
                            onToggle={() => toggleGroup('iss')}
                          >
                            {Object.keys(totais.issPorMunicipio).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm text-[#A1A1AA] flex items-center gap-2 mb-3">
                                  <MapPin className="w-4 h-4" />
                                  Por Município
                                </p>
                                {Object.entries(totais.issPorMunicipio)
                                  .sort((a, b) => b[1].valor - a[1].valor)
                                  .map(([municipio, dados]) => (
                                    <div key={municipio} className="flex items-center justify-between bg-blue-500/5 rounded-lg px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-400" />
                                        <span className="text-white">{municipio}</span>
                                        <span className="text-xs text-[#666]">({dados.qtd} doc{dados.qtd > 1 ? 's' : ''})</span>
                                      </div>
                                      <span className="text-blue-400 font-bold">{formatCurrency(dados.valor)}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                          </GrupoImpostoCard>
                          
                          {/* IR */}
                          <GrupoImpostoCard 
                            titulo="IR - Imposto de Renda" 
                            valor={totais.ir.valor}
                            cor="green"
                            icone={Receipt}
                            detalhes={totais.ir.detalhes}
                            expanded={expandedGroups.ir}
                            onToggle={() => toggleGroup('ir')}
                          >
                            <p className="text-sm text-[#A1A1AA]">
                              Total de IR retido na fonte sobre serviços tomados de pessoas jurídicas.
                            </p>
                          </GrupoImpostoCard>
                          
                          {/* CSLL + PIS + COFINS */}
                          <GrupoImpostoCard 
                            titulo="Contribuições Sociais (CSLL + PIS + COFINS)" 
                            valor={totais.contribuicoes.valor}
                            cor="purple"
                            icone={Percent}
                            detalhes={totais.contribuicoes.detalhes}
                            expanded={expandedGroups.contrib}
                            onToggle={() => toggleGroup('contrib')}
                          >
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                <p className="text-xs text-[#A1A1AA]">CSLL</p>
                                <p className="text-lg font-bold text-purple-400">{formatCurrency(totais.contribuicoes.csll)}</p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                <p className="text-xs text-[#A1A1AA]">PIS</p>
                                <p className="text-lg font-bold text-purple-400">{formatCurrency(totais.contribuicoes.pis)}</p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                <p className="text-xs text-[#A1A1AA]">COFINS</p>
                                <p className="text-lg font-bold text-purple-400">{formatCurrency(totais.contribuicoes.cofins)}</p>
                              </div>
                            </div>
                          </GrupoImpostoCard>
                          
                          {/* INSS */}
                          <GrupoImpostoCard 
                            titulo="INSS - Contribuição Previdenciária" 
                            valor={totais.inss.valor}
                            cor="red"
                            icone={Users}
                            detalhes={totais.inss.detalhes}
                            expanded={expandedGroups.inss}
                            onToggle={() => toggleGroup('inss')}
                          >
                            <p className="text-sm text-[#A1A1AA]">
                              Retenção de 11% sobre serviços prestados com cessão de mão de obra.
                            </p>
                          </GrupoImpostoCard>
                          
                          {/* Total Geral */}
                          <div className="bg-[#C8A951]/10 border-2 border-[#C8A951]/50 rounded-xl p-5 mt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#C8A951]/20 flex items-center justify-center">
                                  <DollarSign className="w-6 h-6 text-[#C8A951]" />
                                </div>
                                <div>
                                  <h3 className="text-white font-semibold">Total Geral de Retenções</h3>
                                  <p className="text-xs text-[#A1A1AA]">{dados.servicos_tomados.qtd_documentos} documento(s) com retenção</p>
                                </div>
                              </div>
                              <p className="text-3xl font-bold text-[#C8A951]">{formatCurrency(totais.total)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Tabela de Detalhes */}
                    <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                      <h3 className="text-white font-medium mb-4">Detalhamento por Documento</h3>
                      <TabelaDetalhes detalhes={dados.servicos_tomados.detalhes} tipo="tomados" />
                    </div>
                  </>
                )}

                {activeTab === 'prestados' && temAtividadeServicos && dados.servicos_prestados && (
                  <>
                    {/* Totalizadores por Grupo - Prestados */}
                    {(() => {
                      const totais = calcularTotaisPorGrupo(dados.servicos_prestados.detalhes);
                      return (
                        <div className="space-y-4 mb-6">
                          {/* ISS com sub-lista por município */}
                          <GrupoImpostoCard 
                            titulo="ISS Retido pelo Tomador" 
                            valor={totais.iss.valor}
                            cor="blue"
                            icone={Landmark}
                            detalhes={totais.iss.detalhes}
                            expanded={expandedGroups.issP}
                            onToggle={() => toggleGroup('issP')}
                          >
                            {Object.keys(totais.issPorMunicipio).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm text-[#A1A1AA] flex items-center gap-2 mb-3">
                                  <MapPin className="w-4 h-4" />
                                  ISS retido por Município do Tomador
                                </p>
                                {Object.entries(totais.issPorMunicipio)
                                  .sort((a, b) => b[1].valor - a[1].valor)
                                  .map(([municipio, dados]) => (
                                    <div key={municipio} className="flex items-center justify-between bg-blue-500/5 rounded-lg px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-400" />
                                        <span className="text-white">{municipio}</span>
                                        <span className="text-xs text-[#666]">({dados.qtd} doc{dados.qtd > 1 ? 's' : ''})</span>
                                      </div>
                                      <span className="text-blue-400 font-bold">{formatCurrency(dados.valor)}</span>
                                    </div>
                                  ))
                                }
                              </div>
                            )}
                          </GrupoImpostoCard>
                          
                          {/* IR */}
                          <GrupoImpostoCard 
                            titulo="IR Retido pelo Tomador" 
                            valor={totais.ir.valor}
                            cor="green"
                            icone={Receipt}
                            detalhes={totais.ir.detalhes}
                            expanded={expandedGroups.irP}
                            onToggle={() => toggleGroup('irP')}
                          >
                            <p className="text-sm text-[#A1A1AA]">
                              Valor já retido na fonte - pode ser compensado na apuração do IR.
                            </p>
                          </GrupoImpostoCard>
                          
                          {/* CSLL + PIS + COFINS */}
                          <GrupoImpostoCard 
                            titulo="Contribuições Retidas (CSLL + PIS + COFINS)" 
                            valor={totais.contribuicoes.valor}
                            cor="purple"
                            icone={Percent}
                            detalhes={totais.contribuicoes.detalhes}
                            expanded={expandedGroups.contribP}
                            onToggle={() => toggleGroup('contribP')}
                          >
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                <p className="text-xs text-[#A1A1AA]">CSLL</p>
                                <p className="text-lg font-bold text-purple-400">{formatCurrency(totais.contribuicoes.csll)}</p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                <p className="text-xs text-[#A1A1AA]">PIS</p>
                                <p className="text-lg font-bold text-purple-400">{formatCurrency(totais.contribuicoes.pis)}</p>
                              </div>
                              <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                                <p className="text-xs text-[#A1A1AA]">COFINS</p>
                                <p className="text-lg font-bold text-purple-400">{formatCurrency(totais.contribuicoes.cofins)}</p>
                              </div>
                            </div>
                          </GrupoImpostoCard>
                          
                          {/* INSS */}
                          <GrupoImpostoCard 
                            titulo="INSS Retido pelo Tomador" 
                            valor={totais.inss.valor}
                            cor="red"
                            icone={Users}
                            detalhes={totais.inss.detalhes}
                            expanded={expandedGroups.inssP}
                            onToggle={() => toggleGroup('inssP')}
                          >
                            <p className="text-sm text-[#A1A1AA]">
                              Valor já retido - compensável na guia GPS.
                            </p>
                          </GrupoImpostoCard>
                          
                          {/* Total Geral */}
                          <div className="bg-blue-500/10 border-2 border-blue-500/50 rounded-xl p-5 mt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                  <DollarSign className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="text-white font-semibold">Total Retido na Fonte</h3>
                                  <p className="text-xs text-[#A1A1AA]">Valores já recolhidos pelo tomador</p>
                                </div>
                              </div>
                              <p className="text-3xl font-bold text-blue-400">{formatCurrency(totais.total)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Tabela de Detalhes */}
                    <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                      <h3 className="text-white font-medium mb-4">Detalhamento por Documento</h3>
                      <TabelaDetalhes detalhes={dados.servicos_prestados.detalhes} tipo="prestados" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ImpostosRetidos;
