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
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const AlertasCfop = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expandedDocs, setExpandedDocs] = useState({});
  const [converting, setConverting] = useState({});

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

  const converterCfop = async (docId, prodCodigo, novoCfop, aplicarRegra = false) => {
    const key = `${docId}_${prodCodigo}`;
    setConverting(prev => ({ ...prev, [key]: true }));
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/converter-cfop?documento_id=${docId}&produto_codigo=${encodeURIComponent(prodCodigo)}&novo_cfop=${novoCfop}&aplicar_regra=${aplicarRegra}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`CFOP convertido para ${novoCfop}`);
      fetchAlertas(); // Recarregar dados
    } catch (err) {
      console.error('Erro ao converter CFOP:', err);
      toast.error('Erro ao converter CFOP');
    } finally {
      setConverting(prev => ({ ...prev, [key]: false }));
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
            <h4 className="font-semibold text-amber-800">O que são esses alertas?</h4>
            <p className="text-sm text-amber-700">
              Quando um fornecedor emite uma NF com CFOPs de <strong>operações distintas de venda</strong> 
              (como remessas, bonificações, devoluções, consignações), você precisa decidir como tratar 
              essa entrada. Você pode <strong>manter a natureza original</strong> (reclassificando apenas 
              para CFOP de entrada) ou <strong>converter para CFOP de compra</strong>.
            </p>
          </div>
        </div>

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
                <p className="text-sm text-amber-700">Documentos com Alerta</p>
                <p className="text-2xl font-bold text-amber-600">{data.documentos_com_alerta}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200 bg-green-50">
                <p className="text-sm text-green-700">Documentos OK</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.total_documentos_entrada - data.documentos_com_alerta}
                </p>
              </div>
            </div>

            {/* Lista de Alertas */}
            {data.alertas.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-green-700 font-semibold">
                  Nenhum alerta de CFOP encontrado!
                </p>
                <p className="text-green-600 text-sm">
                  Todos os documentos de entrada possuem CFOPs regulares.
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
                            {alerta.produtos_com_alerta.length} produto(s) com alerta
                          </p>
                        </div>
                        {expandedDocs[alerta.documento_id] ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Produtos com alerta */}
                    {expandedDocs[alerta.documento_id] && (
                      <div className="p-4 space-y-3">
                        {alerta.produtos_com_alerta.map((prod, idx) => {
                          const key = `${alerta.documento_id}_${prod.produto_codigo}`;
                          const isConverting = converting[key];
                          
                          return (
                            <div 
                              key={idx}
                              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {prod.produto_descricao || prod.produto_codigo}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Código: {prod.produto_codigo} | Valor: {formatCurrency(prod.valor)}
                                  </p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-mono">
                                      CFOP {prod.cfop_atual}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {prod.cfop_descricao}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  {/* Opção 1: Manter natureza */}
                                  {prod.sugestao_manter_natureza && (
                                    <button
                                      onClick={() => converterCfop(
                                        alerta.documento_id, 
                                        prod.produto_codigo, 
                                        prod.sugestao_manter_natureza,
                                        false
                                      )}
                                      disabled={isConverting}
                                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                                    >
                                      {isConverting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <ArrowRight className="w-4 h-4" />
                                      )}
                                      Manter natureza → {prod.sugestao_manter_natureza}
                                    </button>
                                  )}

                                  {/* Opção 2: Converter para compra */}
                                  {prod.sugestao_converter_compra && prod.sugestao_converter_compra !== prod.sugestao_manter_natureza && (
                                    <button
                                      onClick={() => converterCfop(
                                        alerta.documento_id, 
                                        prod.produto_codigo, 
                                        prod.sugestao_converter_compra,
                                        true
                                      )}
                                      disabled={isConverting}
                                      className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                                    >
                                      {isConverting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                      Converter p/ compra → {prod.sugestao_converter_compra}
                                    </button>
                                  )}
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
