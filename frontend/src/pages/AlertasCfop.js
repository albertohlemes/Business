import React, { useState, useEffect } from 'react';
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
  XCircle,
  Send
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
  const [processandoLote, setProcessandoLote] = useState(false);

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
      
      // Expandir automaticamente se houver poucos alertas
      if (response.data.alertas.length <= 3) {
        const expanded = {};
        response.data.alertas.forEach(a => expanded[a.documento_id] = true);
        setExpandedDocs(expanded);
      }
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
      setError('Erro ao carregar alertas de CFOP');
    } finally {
      setLoading(false);
    }
  };

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

  // Resolver em lote
  const resolverLote = async (acao) => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setProcessandoLote(true);
    
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
      setProcessandoLote(false);
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
        toast.error(response.data.message || 'Erro ao processar comando');
      }
    } catch (err) {
      console.error('Erro ao resolver por IA:', err);
      toast.error('Erro ao processar comando de IA');
    } finally {
      setProcessandoIA(false);
    }
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
                <h1 className="text-2xl font-bold">Alertas de CFOP</h1>
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

        {/* Info Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800">Produtos Pendentes de Revisão</h4>
            <p className="text-sm text-amber-700">
              Durante o upload, CFOPs de <strong>operações distintas de venda</strong> 
              (bonificação, remessa, devolução) foram automaticamente convertidos para entrada.
              Revise cada produto e decida: <strong>manter a natureza</strong> original ou 
              <strong>converter para compra</strong>.
            </p>
          </div>
        </div>

        {/* Ações em Lote */}
        {data && data.total_produtos_pendentes > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Ações em Lote ({data.total_produtos_pendentes} produtos pendentes)
            </h3>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={() => resolverLote('manter_natureza')}
                disabled={processandoLote}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {processandoLote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Manter Natureza em Todos
              </button>
              <button
                onClick={() => resolverLote('converter_compra')}
                disabled={processandoLote}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {processandoLote ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Converter Todos para Compra
              </button>
            </div>

            {/* Comando por IA */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-600" />
                Comando por IA
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={comandoIA}
                  onChange={(e) => setComandoIA(e.target.value)}
                  placeholder="Ex: 'classificar bonificações como 1910' ou 'converter remessas para compra'"
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
              <p className="text-xs text-gray-500 mt-1">
                Use linguagem natural para classificar produtos. A IA interpretará seu comando.
              </p>
            </div>
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
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Total de Documentos Entrada</p>
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
            </div>

            {/* Lista de Alertas */}
            {data.alertas.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-green-700 font-semibold">
                  Nenhum produto pendente de revisão!
                </p>
                <p className="text-green-600 text-sm">
                  Todos os CFOPs foram revisados ou não há operações distintas.
                </p>
              </div>
            ) : (
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
                                  {/* Manter Natureza */}
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
                                    Manter → {prod.opcoes.manter_natureza.cfop}
                                  </button>

                                  {/* Converter para Compra */}
                                  <button
                                    onClick={() => resolverIndividual(
                                      alerta.documento_id, 
                                      prod.produto_idx, 
                                      prod.opcoes.converter_compra.cfop,
                                      true
                                    )}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <ArrowRight className="w-4 h-4" />
                                    )}
                                    Compra → {prod.opcoes.converter_compra.cfop}
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
