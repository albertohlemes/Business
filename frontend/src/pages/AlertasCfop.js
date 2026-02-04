import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowRight,
  Info,
  RefreshCw,
  Wand2,
  CheckCircle2,
  Send,
  Package,
  BarChart3,
  Layers
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const AlertasCfop = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expandedDocs, setExpandedDocs] = useState({});
  const [processing, setProcessing] = useState({});
  const [comandoIA, setComandoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);
  const [processandoLote, setProcessandoLote] = useState({});
  const [viewMode, setViewMode] = useState('resumo'); // 'resumo' | 'documentos'

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchAlertas();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchAlertas = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/alertas-cfop/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
      setError('Erro ao carregar alertas de CFOP');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por CFOP para o painel de resumo
  const resumoPorCfop = useMemo(() => {
    if (!data || !data.alertas) return [];
    
    const agrupado = {};
    
    data.alertas.forEach(alerta => {
      alerta.produtos.forEach(prod => {
        const cfopOriginal = prod.cfop_original_emissor || prod.cfop_atual;
        const cfopAtual = prod.cfop_atual;
        const natureza = prod.natureza_operacao || 'Não identificada';
        
        const key = cfopOriginal;
        
        if (!agrupado[key]) {
          agrupado[key] = {
            cfop_original: cfopOriginal,
            cfop_atual: cfopAtual,
            natureza: natureza,
            quantidade: 0,
            valor_total: 0,
            produtos: [],
            sugestao_compra: prod.opcoes?.converter_compra?.cfop || '1102',
            sugestao_manter: prod.opcoes?.manter_natureza?.cfop || cfopAtual
          };
        }
        
        agrupado[key].quantidade += 1;
        agrupado[key].valor_total += prod.valor || 0;
        agrupado[key].produtos.push({
          ...prod,
          documento_id: alerta.documento_id,
          numero_nfe: alerta.numero_nfe
        });
      });
    });
    
    return Object.values(agrupado).sort((a, b) => b.quantidade - a.quantidade);
  }, [data]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const toggleDoc = (docId) => {
    setExpandedDocs(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  // Resolver individual
  const resolverIndividual = async (docId, prodIdx, novoCfop, salvarRegra = false) => {
    const key = `${docId}_${prodIdx}`;
    setProcessing(prev => ({ ...prev, [key]: true }));
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/alertas-cfop/resolver-individual?documento_id=${docId}&produto_idx=${prodIdx}&novo_cfop=${novoCfop}&salvar_regra=${salvarRegra}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`CFOP alterado para ${novoCfop}`);
      fetchAlertas();
    } catch (err) {
      console.error('Erro ao resolver alerta:', err);
      toast.error('Erro ao resolver alerta');
    } finally {
      setProcessing(prev => ({ ...prev, [key]: false }));
    }
  };

  // Resolver em lote por CFOP específico
  const resolverLotePorCfop = async (cfopOriginal, acao, novoCfop) => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    const key = `${cfopOriginal}_${acao}`;
    setProcessandoLote(prev => ({ ...prev, [key]: true }));
    
    try {
      const token = localStorage.getItem('token');
      
      // Encontrar todos os produtos com esse CFOP
      const grupo = resumoPorCfop.find(g => g.cfop_original === cfopOriginal);
      if (!grupo) return;
      
      // Processar cada produto do grupo
      let processados = 0;
      for (const prod of grupo.produtos) {
        try {
          await axios.post(
            `${API}/alertas-cfop/resolver-individual?documento_id=${prod.documento_id}&produto_idx=${prod.produto_idx}&novo_cfop=${novoCfop}&salvar_regra=false`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          processados++;
        } catch (e) {
          console.error('Erro ao processar produto:', e);
        }
      }
      
      toast.success(`${processados} produtos do CFOP ${cfopOriginal} atualizados para ${novoCfop}!`);
      fetchAlertas();
    } catch (err) {
      console.error('Erro ao resolver em lote:', err);
      toast.error('Erro ao resolver em lote');
    } finally {
      setProcessandoLote(prev => ({ ...prev, [key]: false }));
    }
  };

  // Resolver todos em lote
  const resolverTodosLote = async (acao) => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setProcessandoLote(prev => ({ ...prev, todos: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/alertas-cfop/resolver-lote?company_id=${selectedCompany.id}&competencia=${encodeURIComponent(selectedCompetencia)}&acao=${acao}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`${response.data.total_resolvidos} produtos atualizados!`);
      fetchAlertas();
    } catch (err) {
      console.error('Erro ao resolver em lote:', err);
      toast.error('Erro ao resolver em lote');
    } finally {
      setProcessandoLote(prev => ({ ...prev, todos: false }));
    }
  };

  // Resolver por IA
  const resolverIA = async () => {
    if (!comandoIA.trim() || !selectedCompany || !selectedCompetencia) return;
    
    setProcessandoIA(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/alertas-cfop/resolver-ia?company_id=${selectedCompany.id}&competencia=${encodeURIComponent(selectedCompetencia)}&comando=${encodeURIComponent(comandoIA)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(`${response.data.total_alteracoes} alterações aplicadas pela IA!`);
        setComandoIA('');
        fetchAlertas();
      } else {
        toast.info(response.data.message || 'Nenhuma alteração necessária');
      }
    } catch (err) {
      console.error('Erro ao resolver por IA:', err);
      toast.error('Erro ao processar comando de IA');
    } finally {
      setProcessandoIA(false);
    }
  };

  // Descrição do CFOP
  const getCfopDescricao = (cfop) => {
    const descricoes = {
      '1910': 'Entrada de bonificação, doação ou brinde',
      '1911': 'Entrada de amostra grátis',
      '1912': 'Entrada de mercadoria/bem em demonstração',
      '1913': 'Retorno de mercadoria/bem em demonstração',
      '1914': 'Retorno de mercadoria/bem em consignação',
      '1915': 'Entrada de mercadoria/bem em consignação',
      '1916': 'Retorno de mercadoria/bem em comodato',
      '1917': 'Entrada de mercadoria em consignação mercantil',
      '1918': 'Devolução de venda em consignação',
      '1919': 'Devolução de remessa para industrialização',
      '1920': 'Entrada de vasilhame/sacaria',
      '1921': 'Retorno de vasilhame/sacaria',
      '1949': 'Outra entrada não especificada',
      '2910': 'Entrada de bonificação (interestadual)',
      '2911': 'Entrada de amostra grátis (interestadual)',
      '2949': 'Outra entrada não especificada (interestadual)',
      '1102': 'Compra para comercialização',
      '2102': 'Compra para comercialização (interestadual)'
    };
    return descricoes[cfop] || `CFOP ${cfop}`;
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="alertas-cfop-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Classificação Inteligente de CFOPs</h1>
                {selectedCompany ? (
                  <p className="text-amber-100">
                    {selectedCompany.razao_social} - Competência: {selectedCompetencia}
                  </p>
                ) : (
                  <p className="text-amber-200">Selecione uma empresa no cabeçalho</p>
                )}
              </div>
            </div>
            <button
              onClick={fetchAlertas}
              disabled={loading || !selectedCompany}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Toggle de Visualização */}
        {data && data.total_produtos_pendentes > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('resumo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'resumo' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Resumo por CFOP
            </button>
            <button
              onClick={() => setViewMode('documentos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'documentos' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              Por Documento
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="ml-3 text-gray-600">Analisando documentos...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Sem empresa selecionada */}
        {!selectedCompany && !loading && (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Selecione uma empresa para ver os alertas</p>
          </div>
        )}

        {/* Resultados */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Resumo Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Total de Documentos</p>
                <p className="text-2xl font-bold text-gray-900">{data.total_documentos_entrada}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-700">Docs com Pendências</p>
                <p className="text-2xl font-bold text-amber-600">{data.documentos_com_alerta}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200 bg-orange-50">
                <p className="text-sm text-orange-700">Produtos Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">{data.total_produtos_pendentes || 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 bg-purple-50">
                <p className="text-sm text-purple-700">CFOPs Diferentes</p>
                <p className="text-2xl font-bold text-purple-600">{resumoPorCfop.length}</p>
              </div>
            </div>

            {/* Nenhum pendente */}
            {data.total_produtos_pendentes === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-green-700 font-semibold">
                  Nenhum produto pendente de revisão!
                </p>
                <p className="text-green-600 text-sm">
                  Todos os CFOPs foram revisados ou não há operações distintas.
                </p>
              </div>
            )}

            {/* PAINEL DE RESUMO POR CFOP */}
            {viewMode === 'resumo' && resumoPorCfop.length > 0 && (
              <div className="space-y-4">
                {/* Ações Globais */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-gray-600" />
                    Ações Globais (Todos os CFOPs)
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => resolverTodosLote('manter_natureza')}
                      disabled={processandoLote.todos}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processandoLote.todos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Manter Natureza em TODOS
                    </button>
                    <button
                      onClick={() => resolverTodosLote('converter_compra')}
                      disabled={processandoLote.todos}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processandoLote.todos ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Converter TODOS para Compra
                    </button>
                  </div>
                  
                  {/* Comando IA */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                      Comando por IA
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={comandoIA}
                        onChange={(e) => setComandoIA(e.target.value)}
                        placeholder="Ex: 'bonificações manter como 1910' ou 'converter remessas para 1102'"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        onKeyPress={(e) => e.key === 'Enter' && resolverIA()}
                      />
                      <button
                        onClick={resolverIA}
                        disabled={processandoIA || !comandoIA.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processandoIA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Executar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cards por CFOP */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {resumoPorCfop.map((grupo) => (
                    <div 
                      key={grupo.cfop_original}
                      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                    >
                      {/* Header do CFOP */}
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 border-b border-amber-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-500 text-white px-3 py-2 rounded-lg font-mono font-bold text-lg">
                              {grupo.cfop_original}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{grupo.natureza}</p>
                              <p className="text-xs text-gray-600">{getCfopDescricao(grupo.cfop_original)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-amber-600">{grupo.quantidade}</p>
                            <p className="text-xs text-gray-500">produtos</p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Valor Total: <span className="font-semibold">{formatCurrency(grupo.valor_total)}</span>
                        </div>
                      </div>
                      
                      {/* Ações do CFOP */}
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-gray-600 font-medium">Ação em lote para este CFOP:</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {/* Manter Natureza */}
                          <button
                            onClick={() => resolverLotePorCfop(grupo.cfop_original, 'manter', grupo.sugestao_manter)}
                            disabled={processandoLote[`${grupo.cfop_original}_manter`]}
                            className="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all disabled:opacity-50"
                          >
                            {processandoLote[`${grupo.cfop_original}_manter`] ? (
                              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            ) : (
                              <Check className="w-6 h-6 text-blue-600" />
                            )}
                            <span className="font-semibold text-blue-700">Manter Natureza</span>
                            <span className="text-xs text-blue-600 font-mono bg-blue-100 px-2 py-0.5 rounded">
                              → {grupo.sugestao_manter}
                            </span>
                          </button>
                          
                          {/* Converter para Compra */}
                          <button
                            onClick={() => resolverLotePorCfop(grupo.cfop_original, 'compra', grupo.sugestao_compra)}
                            disabled={processandoLote[`${grupo.cfop_original}_compra`]}
                            className="flex flex-col items-center gap-1 p-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-lg transition-all disabled:opacity-50"
                          >
                            {processandoLote[`${grupo.cfop_original}_compra`] ? (
                              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                            ) : (
                              <ArrowRight className="w-6 h-6 text-green-600" />
                            )}
                            <span className="font-semibold text-green-700">Converter p/ Compra</span>
                            <span className="text-xs text-green-600 font-mono bg-green-100 px-2 py-0.5 rounded">
                              → {grupo.sugestao_compra}
                            </span>
                          </button>
                        </div>
                        
                        {/* Lista resumida de produtos */}
                        <details className="mt-3">
                          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                            Ver {grupo.quantidade} produto(s) afetado(s)
                          </summary>
                          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                            {grupo.produtos.map((prod, idx) => (
                              <div key={idx} className="text-xs bg-gray-50 p-2 rounded flex justify-between">
                                <span className="truncate flex-1">{prod.produto_descricao || prod.produto_codigo}</span>
                                <span className="text-gray-500 ml-2">NF {prod.numero_nfe}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISÃO POR DOCUMENTO */}
            {viewMode === 'documentos' && data.alertas.length > 0 && (
              <div className="space-y-3">
                {data.alertas.map((alerta) => (
                  <div 
                    key={alerta.documento_id}
                    className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden"
                  >
                    {/* Header do documento */}
                    <button
                      onClick={() => toggleDoc(alerta.documento_id)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="w-6 h-6 text-amber-600" />
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900">
                            NF-e {alerta.numero_nfe}
                          </h3>
                          <p className="text-sm text-gray-600">{alerta.emitente}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(alerta.valor_total)}</p>
                          <p className="text-sm text-amber-600">
                            {alerta.qtd_pendentes} produto(s) pendente(s)
                          </p>
                        </div>
                        {expandedDocs[alerta.documento_id] ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Produtos pendentes */}
                    {expandedDocs[alerta.documento_id] && (
                      <div className="p-4 space-y-3">
                        {alerta.produtos.map((prod) => {
                          const key = `${alerta.documento_id}_${prod.produto_idx}`;
                          const isProcessing = processing[key];
                          
                          return (
                            <div 
                              key={prod.produto_idx}
                              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {prod.produto_descricao || prod.produto_codigo}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Código: {prod.produto_codigo} | NCM: {prod.ncm} | Valor: {formatCurrency(prod.valor)}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-mono">
                                      Emissor: {prod.cfop_original_emissor}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-gray-400" />
                                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-mono">
                                      Atual: {prod.cfop_atual}
                                    </span>
                                    <span className="text-sm text-gray-600 ml-2">
                                      ({prod.natureza_operacao})
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => resolverIndividual(
                                      alerta.documento_id, 
                                      prod.produto_idx, 
                                      prod.opcoes.manter_natureza.cfop,
                                      false
                                    )}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                    Manter ({prod.opcoes.manter_natureza.cfop})
                                  </button>
                                  <button
                                    onClick={() => resolverIndividual(
                                      alerta.documento_id, 
                                      prod.produto_idx, 
                                      prod.opcoes.converter_compra.cfop,
                                      false
                                    )}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <ArrowRight className="w-4 h-4" />
                                    )}
                                    Compra ({prod.opcoes.converter_compra.cfop})
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AlertasCfop;
