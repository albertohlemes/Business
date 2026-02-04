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
  Download,
  RefreshCw,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const RelatorioDivergencias = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expandedDocs, setExpandedDocs] = useState({});

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchDivergencias();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchDivergencias = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/relatorio-divergencias-saida/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Erro ao carregar divergências:', err);
      setError('Erro ao carregar relatório de divergências');
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

  const exportCSV = () => {
    if (!data || !data.divergencias.length) return;

    let csv = '\uFEFF'; // BOM UTF-8
    csv += 'RELATÓRIO DE DIVERGÊNCIAS PIS/COFINS - SAÍDAS\n';
    csv += 'Empresa: ' + data.empresa + '\n';
    csv += 'Competência: ' + data.competencia + '\n\n';
    
    csv += 'NF-e;Cliente;Produto;NCM;Valor;CST PIS Atual;CST COFINS Atual;CST Correto;PIS Cobrado;COFINS Cobrado;Tipo Divergência\n';
    
    data.divergencias.forEach(doc => {
      doc.produtos.forEach(prod => {
        csv += `${doc.numero_nfe};${doc.cliente};${prod.produto};${prod.ncm};${prod.valor};${prod.cst_pis_atual};${prod.cst_cofins_atual};${prod.cst_pis_correto};${prod.v_pis_cobrado};${prod.v_cofins_cobrado};${prod.tipo_divergencia}\n`;
      });
    });
    
    csv += '\nRESUMO\n';
    csv += `Total Documentos com Divergência;${data.documentos_com_divergencia}\n`;
    csv += `Total Produtos Divergentes;${data.total_produtos_divergentes}\n`;
    csv += `Valor Total Divergente;${data.valor_total_divergente}\n`;
    csv += `PIS Indevido;${data.impacto_fiscal.pis_indevido}\n`;
    csv += `COFINS Indevido;${data.impacto_fiscal.cofins_indevido}\n`;
    csv += `Total Imposto Indevido;${data.impacto_fiscal.total_indevido}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `divergencias_saida_${data.competencia.replace('/', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado com sucesso!');
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="relatorio-divergencias-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Divergências PIS/COFINS - Saídas</h1>
                {selectedCompany ? (
                  <p className="text-red-100">
                    {selectedCompany.razao_social} - Competência: {selectedCompetencia}
                  </p>
                ) : (
                  <p className="text-red-200">Selecione uma empresa no cabeçalho</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchDivergencias}
                disabled={loading || !selectedCompany}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              {data && data.divergencias.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Exportar CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-800">O que este relatório mostra?</h4>
            <p className="text-sm text-red-700">
              Identifica produtos nas <strong>notas de saída</strong> que possuem NCMs com <strong>alíquota zero</strong> 
              (conforme Tabela 4.3.13 do SPED) mas estão sendo tributados com PIS/COFINS indevidamente. 
              Esses produtos deveriam ter <strong>CST 06</strong> (sem débito) ao invés de CST 01/02.
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            <span className="ml-3 text-gray-600">Analisando documentos de saída...</span>
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
            <p className="text-lg">Selecione uma empresa para ver o relatório</p>
          </div>
        )}

        {/* Resultados */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500">Documentos de Saída</p>
                <p className="text-2xl font-bold text-gray-900">{data.total_documentos_saida}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200 bg-red-50">
                <p className="text-sm text-red-700">Com Divergência</p>
                <p className="text-2xl font-bold text-red-600">{data.documentos_com_divergencia}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-700">Produtos Divergentes</p>
                <p className="text-2xl font-bold text-amber-600">{data.total_produtos_divergentes}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200 bg-purple-50">
                <p className="text-sm text-purple-700">Imposto Indevido</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(data.impacto_fiscal.total_indevido)}</p>
              </div>
            </div>

            {/* Detalhamento do Impacto */}
            {data.impacto_fiscal.total_indevido > 0 && (
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Impacto Fiscal Estimado</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-purple-200 text-sm">PIS Cobrado Indevidamente</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.impacto_fiscal.pis_indevido)}</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-purple-200 text-sm">COFINS Cobrado Indevidamente</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.impacto_fiscal.cofins_indevido)}</p>
                  </div>
                  <div className="bg-white/30 rounded-lg p-4">
                    <p className="text-white text-sm font-semibold">TOTAL A RECUPERAR</p>
                    <p className="text-3xl font-bold">{formatCurrency(data.impacto_fiscal.total_indevido)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Divergências */}
            {data.divergencias.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-green-700 font-semibold">
                  Nenhuma divergência encontrada!
                </p>
                <p className="text-green-600 text-sm">
                  Todos os produtos de saída estão com a tributação correta de PIS/COFINS.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-900">Documentos com Divergência</h3>
                {data.divergencias.map((doc) => (
                  <div 
                    key={doc.documento_id}
                    className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden"
                  >
                    {/* Header do documento */}
                    <button
                      onClick={() => toggleDoc(doc.documento_id)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="w-6 h-6 text-red-600" />
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900">
                            NF-e {doc.numero_nfe}
                          </h3>
                          <p className="text-sm text-gray-600">{doc.cliente}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(doc.valor_total)}</p>
                          <p className="text-sm text-red-600">
                            {doc.qtd_divergencias} produto(s) divergente(s)
                          </p>
                        </div>
                        {expandedDocs[doc.documento_id] ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Produtos divergentes */}
                    {expandedDocs[doc.documento_id] && (
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-semibold">Produto</th>
                              <th className="px-3 py-2 text-center font-semibold">NCM</th>
                              <th className="px-3 py-2 text-right font-semibold">Valor</th>
                              <th className="px-3 py-2 text-center font-semibold">CST Atual</th>
                              <th className="px-3 py-2 text-center font-semibold">CST Correto</th>
                              <th className="px-3 py-2 text-right font-semibold">PIS Indevido</th>
                              <th className="px-3 py-2 text-right font-semibold">COFINS Indevido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.produtos.map((prod, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <p className="font-medium text-gray-900">{prod.produto}</p>
                                  <p className="text-xs text-gray-500">Cód: {prod.codigo}</p>
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-gray-700">{prod.ncm}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(prod.valor)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-mono">
                                    {prod.cst_pis_atual}/{prod.cst_cofins_atual}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-mono">
                                    {prod.cst_pis_correto}/{prod.cst_cofins_correto}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 font-semibold">
                                  {formatCurrency(prod.impacto_pis)}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 font-semibold">
                                  {formatCurrency(prod.impacto_cofins)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

export default RelatorioDivergencias;
