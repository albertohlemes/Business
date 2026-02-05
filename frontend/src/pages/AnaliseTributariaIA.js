import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, TrendingDown, TrendingUp, Brain, RefreshCw, 
  ChevronDown, ChevronUp, DollarSign, Package, FileText,
  AlertCircle, CheckCircle, XCircle, Lightbulb, Target
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnaliseTributariaIA = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedVilao, setExpandedVilao] = useState(null);
  const [expandedOportunidade, setExpandedOportunidade] = useState(null);
  const [activeTab, setActiveTab] = useState('viloes'); // viloes, oportunidades, ncm, insights

  const fetchAnalise = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analise-tributaria-ia/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Erro ao buscar análise:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar análise tributária');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    if (selectedCompany?.id && selectedCompetencia) {
      fetchAnalise();
    }
  }, [selectedCompany, selectedCompetencia, fetchAnalise]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Selecione uma Empresa</h2>
            <p className="text-gray-500 mt-2">Clique no seletor no header para escolher uma empresa</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-tributaria-ia-page" className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              Análise Tributária Inteligente
            </h1>
            <p className="text-gray-600 mt-1">
              Identificação de vilões tributários, oportunidades e insights estratégicos
            </p>
          </div>
          <button
            onClick={fetchAnalise}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analisando...' : 'Atualizar Análise'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analisando dados tributários com IA...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">Documentos</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.resumo?.total_documentos || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.resumo?.total_entradas || 0} entradas • {data.resumo?.total_saidas || 0} saídas
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">Crédito ICMS</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.resumo?.credito_icms)}</p>
                <p className="text-xs text-gray-500 mt-1">Total de entradas</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-600">Débito ICMS</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(data.resumo?.debito_icms)}</p>
                <p className="text-xs text-gray-500 mt-1">Total de saídas</p>
              </div>

              <div className={`rounded-xl p-5 shadow-sm border ${data.resumo?.saldo_icms > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${data.resumo?.saldo_icms > 0 ? 'bg-yellow-200' : 'bg-blue-200'}`}>
                    <DollarSign className={`w-5 h-5 ${data.resumo?.saldo_icms > 0 ? 'text-yellow-700' : 'text-blue-700'}`} />
                  </div>
                  <span className="text-sm text-gray-600">Saldo ICMS</span>
                </div>
                <p className={`text-2xl font-bold ${data.resumo?.saldo_icms > 0 ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {formatCurrency(data.resumo?.saldo_icms)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.resumo?.saldo_icms > 0 ? 'A pagar' : 'Crédito acumulado'}
                </p>
              </div>
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vilões */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-lg">Vilões Tributários</h3>
                    <p className="text-red-100 text-sm">Produtos com prejuízo tributário</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold">{data.resumo?.total_viloes || 0}</p>
                    <p className="text-red-100 text-sm">produtos identificados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(data.resumo?.impacto_viloes)}</p>
                    <p className="text-red-100 text-sm">impacto negativo</p>
                  </div>
                </div>
              </div>

              {/* Oportunidades */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Lightbulb className="w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-lg">Oportunidades</h3>
                    <p className="text-green-100 text-sm">Situações tributárias favoráveis</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold">{data.resumo?.total_oportunidades || 0}</p>
                    <p className="text-green-100 text-sm">produtos identificados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(data.resumo?.beneficio_oportunidades)}</p>
                    <p className="text-green-100 text-sm">benefício total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('viloes')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'viloes'
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Vilões ({data.viloes_tributarios?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('oportunidades')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'oportunidades'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-2" />
                    Oportunidades ({data.oportunidades?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('ncm')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'ncm'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Package className="w-4 h-4 inline mr-2" />
                    Por NCM ({data.analise_por_ncm?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'insights'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Brain className="w-4 h-4 inline mr-2" />
                    Insights IA
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Vilões Tab */}
                {activeTab === 'viloes' && (
                  <div className="space-y-4">
                    {data.viloes_tributarios?.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-gray-600">Nenhum vilão tributário identificado!</p>
                        <p className="text-gray-500 text-sm">Sua tributação está equilibrada.</p>
                      </div>
                    ) : (
                      data.viloes_tributarios?.map((vilao, idx) => (
                        <div key={idx} className="border border-red-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedVilao(expandedVilao === idx ? null : idx)}
                            className="w-full px-4 py-3 bg-red-50 flex items-center justify-between hover:bg-red-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-gray-900">{vilao.descricao}</p>
                                <p className="text-sm text-gray-600">NCM: {vilao.ncm}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-red-600">{formatCurrency(vilao.impacto_negativo)}</p>
                                <p className="text-xs text-gray-500">impacto negativo</p>
                              </div>
                              {expandedVilao === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </button>
                          
                          {expandedVilao === idx && (
                            <div className="p-4 bg-white border-t border-red-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Alíquota Entrada</p>
                                  <p className="font-bold text-gray-900">{vilao.aliq_entrada}%</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Alíquota Saída</p>
                                  <p className="font-bold text-gray-900">{vilao.aliq_saida}%</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Crédito ICMS</p>
                                  <p className="font-bold text-green-600">{formatCurrency(vilao.icms_credito)}</p>
                                </div>
                                <div className="bg-red-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Débito ICMS</p>
                                  <p className="font-bold text-red-600">{formatCurrency(vilao.icms_debito)}</p>
                                </div>
                              </div>
                              
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                  <p className="text-sm text-yellow-800">{vilao.explicacao}</p>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex gap-4 text-sm text-gray-600">
                                <span>Qtd Entrada: <strong>{vilao.qtd_entrada}</strong></span>
                                <span>Valor Entrada: <strong>{formatCurrency(vilao.valor_entrada)}</strong></span>
                                <span>Qtd Saída: <strong>{vilao.qtd_saida}</strong></span>
                                <span>Valor Saída: <strong>{formatCurrency(vilao.valor_saida)}</strong></span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Oportunidades Tab */}
                {activeTab === 'oportunidades' && (
                  <div className="space-y-4">
                    {data.oportunidades?.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Nenhuma oportunidade identificada</p>
                        <p className="text-gray-500 text-sm">Continue monitorando para identificar benefícios.</p>
                      </div>
                    ) : (
                      data.oportunidades?.map((op, idx) => (
                        <div key={idx} className="border border-green-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedOportunidade(expandedOportunidade === idx ? null : idx)}
                            className="w-full px-4 py-3 bg-green-50 flex items-center justify-between hover:bg-green-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-gray-900">{op.descricao}</p>
                                <p className="text-sm text-gray-600">NCM: {op.ncm} • Tipo: {op.tipo?.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-green-600">{formatCurrency(op.beneficio)}</p>
                                <p className="text-xs text-gray-500">benefício</p>
                              </div>
                              {expandedOportunidade === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </button>
                          
                          {expandedOportunidade === idx && (
                            <div className="p-4 bg-white border-t border-green-200">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                                <div className="flex items-start gap-2">
                                  <Lightbulb className="w-5 h-5 text-green-600 mt-0.5" />
                                  <p className="text-sm text-green-800">{op.explicacao}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Crédito ICMS</p>
                                  <p className="font-bold text-green-600">{formatCurrency(op.icms_credito)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">Débito ICMS</p>
                                  <p className="font-bold text-gray-600">{formatCurrency(op.icms_debito)}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* NCM Tab */}
                {activeTab === 'ncm' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">NCM</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Descrição</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Entrada (R$)</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ICMS Créd.</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saída (R$)</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ICMS Déb.</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Saldo ICMS</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Margem %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.analise_por_ncm?.map((ncm, idx) => (
                          <tr key={idx} className={ncm.saldo_icms > 0 ? 'bg-red-50' : ncm.saldo_icms < 0 ? 'bg-green-50' : ''}>
                            <td className="px-4 py-3 font-mono text-sm">{ncm.ncm}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[200px]">{ncm.descricao}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(ncm.entrada_valor)}</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(ncm.entrada_icms)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(ncm.saida_valor)}</td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(ncm.saida_icms)}</td>
                            <td className={`px-4 py-3 text-sm text-right font-semibold ${ncm.saldo_icms > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(ncm.saldo_icms)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right ${ncm.margem_icms > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                              {ncm.margem_icms}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Insights IA Tab */}
                {activeTab === 'insights' && (
                  <div className="prose max-w-none">
                    {data.insights_ia ? (
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center gap-3 mb-4">
                          <Brain className="w-8 h-8 text-purple-600" />
                          <h3 className="text-xl font-bold text-purple-900 m-0">Análise Inteligente</h3>
                        </div>
                        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                          {data.insights_ia}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">Insights não disponíveis</p>
                        <p className="text-gray-500 text-sm">Clique em "Atualizar Análise" para gerar insights com IA.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AnaliseTributariaIA;
