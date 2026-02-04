import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Truck, 
  Building, 
  BarChart3,
  RefreshCw,
  Download,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Calculator
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const AnaliseTributaria = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchDocuments();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/xml/documents?company_id=${selectedCompany.id}&competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocuments(response.data);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  };

  const generateAnalysis = async () => {
    if (!selectedCompany || documents.length === 0) {
      alert('Importe documentos XML primeiro para gerar a análise');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/ai/analise-tributaria`,
        {
          company_id: selectedCompany.id,
          competencia: selectedCompetencia
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalysis(response.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao gerar análise');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalysis = () => {
    if (!analysis) return;

    let content = `ANÁLISE TRIBUTÁRIA - ${selectedCompany?.razao_social}\n`;
    content += `Competência: ${selectedCompetencia}\n`;
    content += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
    content += `${'='.repeat(60)}\n\n`;

    // Indicadores
    if (analysis.indicadores) {
      content += `INDICADORES TRIBUTÁRIOS\n`;
      content += `-`.repeat(40) + `\n`;
      for (const [key, value] of Object.entries(analysis.indicadores)) {
        content += `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}\n`;
      }
      content += `\n`;
    }

    // Alertas
    if (analysis.alertas?.length > 0) {
      content += `ALERTAS E PONTOS DE ATENÇÃO\n`;
      content += `-`.repeat(40) + `\n`;
      analysis.alertas.forEach((alerta, idx) => {
        content += `${idx + 1}. [${alerta.tipo}] ${alerta.titulo}\n`;
        content += `   ${alerta.descricao}\n`;
        if (alerta.impacto) content += `   Impacto: ${alerta.impacto}\n`;
        content += `\n`;
      });
    }

    // Recomendações
    if (analysis.recomendacoes?.length > 0) {
      content += `RECOMENDAÇÕES ESTRATÉGICAS\n`;
      content += `-`.repeat(40) + `\n`;
      analysis.recomendacoes.forEach((rec, idx) => {
        content += `${idx + 1}. ${rec.titulo}\n`;
        content += `   ${rec.descricao}\n`;
        if (rec.economia_potencial) content += `   Economia Potencial: R$ ${rec.economia_potencial.toLocaleString('pt-BR')}\n`;
        content += `\n`;
      });
    }

    // Análise de Markup
    if (analysis.markup) {
      content += `ANÁLISE DE MARKUP\n`;
      content += `-`.repeat(40) + `\n`;
      content += `Markup Médio: ${analysis.markup.medio?.toFixed(2)}%\n`;
      content += `Análise: ${analysis.markup.analise}\n\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analise_tributaria_${selectedCompetencia.replace('/', '-')}.txt`;
    link.click();
  };

  const getAlertaColor = (tipo) => {
    const colors = {
      'critico': 'bg-red-100 border-red-300 text-red-900',
      'atencao': 'bg-yellow-100 border-yellow-300 text-yellow-900',
      'oportunidade': 'bg-green-100 border-green-300 text-green-900',
      'info': 'bg-blue-100 border-blue-300 text-blue-900'
    };
    return colors[tipo] || colors['info'];
  };

  const getAlertaIcon = (tipo) => {
    const icons = {
      'critico': <AlertTriangle className="w-5 h-5 text-red-600" />,
      'atencao': <AlertTriangle className="w-5 h-5 text-yellow-600" />,
      'oportunidade': <Lightbulb className="w-5 h-5 text-green-600" />,
      'info': <CheckCircle className="w-5 h-5 text-blue-600" />
    };
    return icons[tipo] || icons['info'];
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-tributaria-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Análise Tributária Inteligente</h1>
                <p className="text-red-100">
                  Insights estratégicos gerados por IA para otimização fiscal
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {analysis && (
                <button
                  onClick={exportAnalysis}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Exportar
                </button>
              )}
              <button
                onClick={generateAnalysis}
                disabled={loading || !selectedCompany || documents.length === 0}
                className="px-6 py-2 bg-white text-red-600 rounded-lg font-bold hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Gerar Análise
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        {selectedCompany && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Analisando</p>
              <p className="font-bold text-gray-900">{selectedCompany.razao_social}</p>
              <p className="text-sm text-gray-500">Competência: {selectedCompetencia} • {documents.length} documentos</p>
            </div>
            {documents.length === 0 && (
              <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">Importe XMLs para gerar análise</p>
              </div>
            )}
          </div>
        )}

        {/* Indicadores Grid */}
        {analysis?.indicadores && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Compras Interestaduais</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.indicadores.percentual_interestadual?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">do total de entradas</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-600">Fornecedores Simples</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.indicadores.percentual_simples_nacional?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">sem direito a crédito</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Diferencial Alíquota</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.indicadores.diferencial_aliquota?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">média entrada vs saída</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Markup Médio</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.indicadores.markup_medio?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">margem praticada</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-600">Carga Tributária</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.indicadores.carga_tributaria?.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">sobre faturamento</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Créditos Aproveitados</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                R$ {(analysis.indicadores.total_creditos || 0).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500">ICMS + PIS + COFINS</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
                <span className="text-sm text-gray-600">Débitos Gerados</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                R$ {(analysis.indicadores.total_debitos || 0).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-gray-500">a recolher no período</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Clientes Simples</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.indicadores.clientes_simples_nacional?.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">sem redução BC ICMS</p>
            </div>
          </div>
        )}

        {/* Alertas */}
        {analysis?.alertas?.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Alertas e Pontos de Atenção
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {analysis.alertas.map((alerta, idx) => (
                <div key={idx} className={`p-4 rounded-xl border-2 ${getAlertaColor(alerta.tipo)}`}>
                  <div className="flex items-start gap-3">
                    {getAlertaIcon(alerta.tipo)}
                    <div className="flex-1">
                      <h4 className="font-bold">{alerta.titulo}</h4>
                      <p className="text-sm mt-1">{alerta.descricao}</p>
                      {alerta.impacto && (
                        <p className="text-sm mt-2 font-semibold">
                          💰 Impacto estimado: {alerta.impacto}
                        </p>
                      )}
                      {alerta.base_legal && (
                        <p className="text-xs mt-2 opacity-75">
                          📚 Base Legal: {alerta.base_legal}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendações */}
        {analysis?.recomendacoes?.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <h3 className="font-bold text-green-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-green-600" />
                Recomendações Estratégicas
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {analysis.recomendacoes.map((rec, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-900">{rec.titulo}</h4>
                      <p className="text-sm text-green-800 mt-1">{rec.descricao}</p>
                      {rec.economia_potencial && (
                        <p className="text-sm mt-2 font-bold text-green-700">
                          💵 Economia Potencial: R$ {rec.economia_potencial.toLocaleString('pt-BR')}
                        </p>
                      )}
                      {rec.prazo && (
                        <p className="text-xs mt-1 text-green-600">
                          ⏰ Prazo sugerido: {rec.prazo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Análise de Markup */}
        {analysis?.markup && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Análise de Markup e Margem
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-purple-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-purple-700">Markup Mínimo</p>
                  <p className="text-2xl font-bold text-purple-900">{analysis.markup.minimo?.toFixed(1)}%</p>
                </div>
                <div className="bg-purple-100 p-4 rounded-xl text-center">
                  <p className="text-sm text-purple-700">Markup Médio</p>
                  <p className="text-3xl font-bold text-purple-900">{analysis.markup.medio?.toFixed(1)}%</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-purple-700">Markup Máximo</p>
                  <p className="text-2xl font-bold text-purple-900">{analysis.markup.maximo?.toFixed(1)}%</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-gray-700">{analysis.markup.analise}</p>
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!analysis && !loading && (
          <div className="bg-white rounded-xl p-12 text-center shadow-md">
            <Brain className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Análise Tributária por IA</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Clique em "Gerar Análise" para obter insights estratégicos sobre a situação tributária da empresa.
            </p>
            <div className="text-left max-w-lg mx-auto bg-gray-50 p-4 rounded-xl">
              <p className="font-semibold text-gray-900 mb-2">A análise inclui:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Percentual de compras interestaduais vs internas</li>
                <li>• Análise de fornecedores Simples Nacional</li>
                <li>• Diferencial de alíquotas entrada/saída</li>
                <li>• Análise de markup e margem praticada</li>
                <li>• Carga tributária efetiva</li>
                <li>• Oportunidades de economia fiscal</li>
                <li>• Alertas de conformidade</li>
                <li>• Recomendações estratégicas</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnaliseTributaria;
