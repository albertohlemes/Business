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
  Calculator,
  PieChart,
  FileText,
  Scale
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

    const dados = analysis.dados_calculados;
    let content = `ANÁLISE TRIBUTÁRIA INTELIGENTE\n`;
    content += `${'='.repeat(60)}\n`;
    content += `Empresa: ${selectedCompany?.razao_social}\n`;
    content += `Competência: ${selectedCompetencia}\n`;
    content += `Regime: ${analysis.regime_tributario?.toUpperCase()}\n`;
    content += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

    // Faturamento
    content += `FATURAMENTO\n`;
    content += `-`.repeat(40) + `\n`;
    content += `Total: R$ ${dados.faturamento.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `Serviços: R$ ${dados.faturamento.servicos.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${dados.faturamento.percentual_servicos}%)\n`;
    content += `Vendas: R$ ${dados.faturamento.vendas.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${dados.faturamento.percentual_vendas}%)\n\n`;

    // Vendas por tributação
    content += `VENDAS POR TRIBUTAÇÃO ICMS\n`;
    content += `-`.repeat(40) + `\n`;
    content += `ST: ${dados.vendas_por_tributacao.percentual_st}%\n`;
    content += `Tributado: ${dados.vendas_por_tributacao.percentual_tributado}%\n`;
    content += `Isento: ${dados.vendas_por_tributacao.percentual_isento}%\n\n`;

    // Créditos
    content += `CRÉDITOS (ENTRADAS)\n`;
    content += `-`.repeat(40) + `\n`;
    content += `ICMS Tributado: R$ ${dados.creditos.icms_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `ICMS ST (sem crédito): R$ ${dados.creditos.icms_st_sem_credito.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `PIS Tributado: R$ ${dados.creditos.pis_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `PIS Alíq. Zero: R$ ${dados.creditos.pis_aliquota_zero.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `COFINS Tributado: R$ ${dados.creditos.cofins_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `COFINS Alíq. Zero: R$ ${dados.creditos.cofins_aliquota_zero.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;

    // Débitos
    content += `DÉBITOS (SAÍDAS)\n`;
    content += `-`.repeat(40) + `\n`;
    content += `ICMS Tributado: R$ ${dados.debitos.icms_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `ICMS ST: R$ ${dados.debitos.icms_st.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `ICMS Isento: R$ ${dados.debitos.icms_isento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `PIS Tributado: R$ ${dados.debitos.pis_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `COFINS Tributado: R$ ${dados.debitos.cofins_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;

    // Apuração
    content += `APURAÇÃO DO PERÍODO\n`;
    content += `-`.repeat(40) + `\n`;
    content += `ICMS a Pagar: R$ ${dados.apuracao.icms_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `PIS a Pagar: R$ ${dados.apuracao.pis_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `COFINS a Pagar: R$ ${dados.apuracao.cofins_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
    content += `TOTAL: R$ ${dados.apuracao.total_impostos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;

    // IRPJ/CSLL
    if (analysis.irpj_csll) {
      content += `IRPJ / CSLL (LUCRO PRESUMIDO)\n`;
      content += `-`.repeat(40) + `\n`;
      content += `IRPJ Devido: R$ ${analysis.irpj_csll.irpj_devido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      content += `CSLL Devido: R$ ${analysis.irpj_csll.csll_devido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;
    }

    // Ponto de Equilíbrio
    if (analysis.ponto_equilibrio) {
      content += `PONTO DE EQUILÍBRIO (LUCRO REAL)\n`;
      content += `-`.repeat(40) + `\n`;
      content += `Faturamento: R$ ${analysis.ponto_equilibrio.faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      content += `CMV: R$ ${analysis.ponto_equilibrio.cmv.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      content += `Lucro Bruto: R$ ${analysis.ponto_equilibrio.lucro_bruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n`;
      content += `Despesa p/ Equilíbrio: R$ ${analysis.ponto_equilibrio.despesa_para_equilibrio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\n`;
    }

    // Alertas
    if (analysis.alertas?.length > 0) {
      content += `ALERTAS E PONTOS DE ATENÇÃO\n`;
      content += `-`.repeat(40) + `\n`;
      analysis.alertas.forEach((alerta, idx) => {
        content += `${idx + 1}. [${alerta.tipo?.toUpperCase()}] ${alerta.titulo}\n`;
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

  const dados = analysis?.dados_calculados;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-tributaria-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Brain className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Análise Tributária Inteligente</h1>
                <p className="text-red-100">
                  Insights estratégicos por IA • Créditos e Débitos separados
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
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-600">Analisando</p>
              <p className="font-bold text-gray-900">{selectedCompany.razao_social}</p>
              <p className="text-sm text-gray-500">
                Competência: {selectedCompetencia} • {documents.length} documentos • 
                Regime: {selectedCompany.regime_tributario?.replace('_', ' ').toUpperCase() || 'Não informado'}
              </p>
            </div>
            {documents.length === 0 && (
              <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">Importe XMLs para gerar análise</p>
              </div>
            )}
          </div>
        )}

        {/* Faturamento */}
        {dados?.faturamento && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Composição do Faturamento
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-blue-700">Faturamento Total</p>
                  <p className="text-2xl font-bold text-blue-900">
                    R$ {dados.faturamento.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-purple-700">Serviços</p>
                  <p className="text-xl font-bold text-purple-900">
                    {dados.faturamento.percentual_servicos}%
                  </p>
                  <p className="text-xs text-purple-600">
                    R$ {dados.faturamento.servicos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-green-700">Vendas</p>
                  <p className="text-xl font-bold text-green-900">
                    {dados.faturamento.percentual_vendas}%
                  </p>
                  <p className="text-xs text-green-600">
                    R$ {dados.faturamento.vendas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-gray-700">PIS/COFINS Tributado</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dados.percentuais_pis_cofins?.pis_tributado || 0}%
                  </p>
                  <p className="text-xs text-gray-600">
                    vs {100 - (dados.percentuais_pis_cofins?.pis_tributado || 0)}% alíq. zero
                  </p>
                </div>
              </div>

              {/* Vendas por tributação ICMS */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="font-semibold text-gray-700 mb-3">Vendas por Tributação ICMS</p>
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-sm">ST: {dados.vendas_por_tributacao.percentual_st}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Tributado: {dados.vendas_por_tributacao.percentual_tributado}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Isento: {dados.vendas_por_tributacao.percentual_isento}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Créditos e Débitos */}
        {dados && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Créditos */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
                <h3 className="font-bold text-green-900 flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-green-600" />
                  Créditos (Entradas)
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-green-800">ICMS</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-green-700">Tributado (gera crédito)</span>
                    <span className="font-bold text-green-900">R$ {dados.creditos.icms_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">ST (não gera crédito)</span>
                    <span className="text-gray-500">R$ {dados.creditos.icms_st_sem_credito.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800">PIS</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-blue-700">Base com Crédito</span>
                    <span className="font-bold text-blue-900">R$ {(dados.creditos.pis_base || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-blue-700">Crédito Calculado</span>
                    <span className="font-bold text-blue-900">R$ {(dados.creditos.pis_calculado || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Alíquota Zero (CST 73)</span>
                    <span className="text-gray-500">R$ {(dados.creditos.pis_aliquota_zero || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Sem Incidência (CST 98)</span>
                    <span className="text-gray-500">R$ {(dados.creditos.pis_sem_incidencia || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-purple-800">COFINS</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-purple-700">Base com Crédito</span>
                    <span className="font-bold text-purple-900">R$ {(dados.creditos.cofins_base || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-purple-700">Crédito Calculado</span>
                    <span className="font-bold text-purple-900">R$ {(dados.creditos.cofins_calculado || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Alíquota Zero (CST 73)</span>
                    <span className="text-gray-500">R$ {(dados.creditos.cofins_aliquota_zero || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Sem Incidência (CST 98)</span>
                    <span className="text-gray-500">R$ {(dados.creditos.cofins_sem_incidencia || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Débitos */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-red-200">
                <h3 className="font-bold text-red-900 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-red-600" />
                  Débitos (Saídas)
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-red-800">ICMS</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-red-700">Tributado</span>
                    <span className="font-bold text-red-900">R$ {dados.debitos.icms_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">ST</span>
                    <span className="text-gray-500">R$ {dados.debitos.icms_st.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Isento</span>
                    <span className="text-gray-500">R$ {dados.debitos.icms_isento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-orange-800">PIS</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-orange-700">Tributado</span>
                    <span className="font-bold text-orange-900">R$ {dados.debitos.pis_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Alíquota Zero</span>
                    <span className="text-gray-500">R$ {dados.debitos.pis_aliquota_zero.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">COFINS</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-yellow-700">Tributado</span>
                    <span className="font-bold text-yellow-900">R$ {dados.debitos.cofins_tributado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Alíquota Zero</span>
                    <span className="text-gray-500">R$ {dados.debitos.cofins_aliquota_zero.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apuração */}
        {dados?.apuracao && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4 border-b border-indigo-200">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                Apuração do Período
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-indigo-700">ICMS a Pagar</p>
                  <p className="text-xl font-bold text-indigo-900">
                    R$ {dados.apuracao.icms_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-blue-700">PIS a Pagar</p>
                  <p className="text-xl font-bold text-blue-900">
                    R$ {dados.apuracao.pis_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-purple-700">COFINS a Pagar</p>
                  <p className="text-xl font-bold text-purple-900">
                    R$ {dados.apuracao.cofins_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-red-100 p-4 rounded-xl text-center">
                  <p className="text-sm text-red-700 font-semibold">TOTAL</p>
                  <p className="text-2xl font-bold text-red-900">
                    R$ {dados.apuracao.total_impostos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IRPJ/CSLL */}
        {analysis?.irpj_csll && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4 border-b border-amber-200">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-600" />
                IRPJ / CSLL (Lucro Presumido)
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-amber-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-amber-700">Presunção IRPJ</p>
                  <p className="text-xl font-bold text-amber-900">{analysis.irpj_csll.percentual_presuncao_irpj}%</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-amber-700">Presunção CSLL</p>
                  <p className="text-xl font-bold text-amber-900">{analysis.irpj_csll.percentual_presuncao_csll}%</p>
                </div>
                <div className="bg-amber-100 p-4 rounded-xl text-center">
                  <p className="text-sm text-amber-700">IRPJ Devido</p>
                  <p className="text-xl font-bold text-amber-900">
                    R$ {analysis.irpj_csll.irpj_devido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-amber-100 p-4 rounded-xl text-center">
                  <p className="text-sm text-amber-700">CSLL Devido</p>
                  <p className="text-xl font-bold text-amber-900">
                    R$ {analysis.irpj_csll.csll_devido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ponto de Equilíbrio */}
        {analysis?.ponto_equilibrio && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 border-b border-teal-200">
              <h3 className="font-bold text-teal-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-600" />
                Ponto de Equilíbrio (Lucro Real)
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-teal-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-teal-700">Faturamento</p>
                  <p className="text-lg font-bold text-teal-900">
                    R$ {analysis.ponto_equilibrio.faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-red-700">CMV</p>
                  <p className="text-lg font-bold text-red-900">
                    R$ {analysis.ponto_equilibrio.cmv.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-green-700">Lucro Bruto</p>
                  <p className="text-lg font-bold text-green-900">
                    R$ {analysis.ponto_equilibrio.lucro_bruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl text-center">
                  <p className="text-sm text-purple-700">Impostos</p>
                  <p className="text-lg font-bold text-purple-900">
                    R$ {analysis.ponto_equilibrio.impostos_apurados.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="bg-cyan-100 p-4 rounded-xl text-center border-2 border-cyan-300">
                  <p className="text-sm text-cyan-700 font-semibold">Despesa p/ Equilíbrio</p>
                  <p className="text-xl font-bold text-cyan-900">
                    R$ {analysis.ponto_equilibrio.despesa_para_equilibrio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Este é o valor de despesas necessário para zerar o lucro no período, considerando estoques informados.
              </p>
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
                        <p className="text-sm mt-2 font-semibold">💰 Impacto: {alerta.impacto}</p>
                      )}
                      {alerta.base_legal && (
                        <p className="text-xs mt-2 opacity-75">📚 {alerta.base_legal}</p>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!analysis && !loading && (
          <div className="bg-white rounded-xl p-12 text-center shadow-md">
            <Brain className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Análise Tributária por IA</h3>
            <p className="text-gray-600 mb-6">
              Clique em "Gerar Análise" para obter insights estratégicos.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AnaliseTributaria;
