import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Calculator, AlertTriangle, AlertCircle, Info, RefreshCw, 
  FileText, ChevronDown, ChevronUp, Search, Filter,
  CheckCircle, XCircle, MapPin, Building2, Package,
  DollarSign, Percent, ArrowRight, ExternalLink
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const DifaLPage = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('apuracao');
  const [apuracaoData, setApuracaoData] = useState(null);
  const [detalhamentoData, setDetalhamentoData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedNotas, setExpandedNotas] = useState({});

  const fetchApuracao = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/simples-nacional/difal/apuracao`, {
        company_id: selectedCompany.id,
        competencia: selectedCompetencia
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setApuracaoData(response.data);
    } catch (err) {
      console.error('Erro ao carregar apuração DIFAL:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar apuração do DIFAL');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, selectedCompetencia]);

  const fetchDetalhamento = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/simples-nacional/difal/detalhamento/${selectedCompany.id}/${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDetalhamentoData(response.data);
    } catch (err) {
      console.error('Erro ao carregar detalhamento DIFAL:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar detalhamento do DIFAL');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, selectedCompetencia]);

  useEffect(() => {
    if (activeTab === 'apuracao') {
      fetchApuracao();
    } else {
      fetchDetalhamento();
    }
  }, [activeTab, fetchApuracao, fetchDetalhamento]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const toggleNotaExpanded = (chave) => {
    setExpandedNotas(prev => ({
      ...prev,
      [chave]: !prev[chave]
    }));
  };

  // Verificar se não é Simples Nacional
  if (selectedCompany && selectedCompany.regime_tributario !== 'simples_nacional') {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div data-testid="difal-not-applicable" className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">DIFAL não aplicável</h2>
          <p className="text-[#A1A1AA] max-w-md">
            O módulo DIFAL é exclusivo para empresas do <span className="text-[#C8A951] font-medium">Simples Nacional</span>.
            Esta empresa está cadastrada como {selectedCompany.regime_tributario === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'}.
          </p>
        </div>
      </Layout>
    );
  }

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Building2 className="w-16 h-16 text-[#A1A1AA] mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Nenhuma empresa selecionada</h2>
          <p className="text-[#A1A1AA]">Selecione uma empresa para visualizar o DIFAL.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="difal-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              DIFAL - Diferencial de Alíquota
            </h1>
            <p className="text-[#A1A1AA] text-sm">
              Apuração de ICMS nas entradas interestaduais • {selectedCompetencia}
            </p>
          </div>
          <button
            onClick={activeTab === 'apuracao' ? fetchApuracao : fetchDetalhamento}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('apuracao')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'apuracao'
                ? 'text-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Apuração
            {activeTab === 'apuracao' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A951]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('detalhamento')}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'detalhamento'
                ? 'text-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Detalhamento por Produto
            {activeTab === 'detalhamento' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8A951]" />
            )}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* TAB: Apuração */}
        {!loading && activeTab === 'apuracao' && apuracaoData && (
          <div className="space-y-6">
            {/* Alertas */}
            {apuracaoData.alertas?.length > 0 && (
              <div className="space-y-2">
                {apuracaoData.alertas.map((alerta, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-amber-500/10 border-amber-500/30"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-300">{alerta.mensagem}</p>
                      {alerta.embasamento && (
                        <p className="text-xs text-[#666] mt-1">{alerta.embasamento}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total DIFAL */}
              <div className="bg-gradient-to-br from-[#C8A951]/20 to-[#C8A951]/5 rounded-lg border border-[#C8A951]/30 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#C8A951] text-sm font-medium">DIFAL a Recolher</span>
                  <Calculator className="w-5 h-5 text-[#C8A951]" />
                </div>
                <p className="text-3xl font-bold text-[#C8A951]">
                  {formatCurrency(apuracaoData.resumo?.total_difal_a_recolher)}
                </p>
                <p className="text-xs text-[#666] mt-2">
                  Base de cálculo: {formatCurrency(apuracaoData.resumo?.total_base_calculo)}
                </p>
              </div>

              {/* Notas Interestaduais */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Notas Interestaduais</span>
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {apuracaoData.resumo?.total_notas_interestaduais || 0}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  documentos de entrada
                </p>
              </div>

              {/* Produtos com DIFAL */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Com DIFAL</span>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {apuracaoData.resumo?.total_produtos_com_difal || 0}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  produtos tributados
                </p>
              </div>

              {/* Produtos sem DIFAL */}
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Sem DIFAL (ST)</span>
                  <XCircle className="w-5 h-5 text-[#666]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {apuracaoData.resumo?.total_produtos_sem_difal || 0}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  produtos com ST
                </p>
              </div>
            </div>

            {/* Alíquota Interna */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C8A951]" />
                  <span className="text-white font-medium">Alíquota Interna {apuracaoData.empresa?.uf}:</span>
                  <span className="text-[#C8A951] font-bold">{formatPercent(apuracaoData.aliquota_interna?.percentual)}</span>
                </div>
                <span className="text-xs text-[#666]">
                  {apuracaoData.aliquota_interna?.embasamento}
                </span>
              </div>
            </div>

            {/* Resumo por UF de Origem */}
            {apuracaoData.resumo_por_uf_origem?.length > 0 && (
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C8A951]" />
                  Resumo por UF de Origem
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A]">
                        <th className="text-left py-2 px-3 text-[#A1A1AA] font-medium">UF Origem</th>
                        <th className="text-center py-2 px-3 text-[#A1A1AA] font-medium">Alíq. Interestadual</th>
                        <th className="text-center py-2 px-3 text-[#A1A1AA] font-medium">Diferença</th>
                        <th className="text-center py-2 px-3 text-[#A1A1AA] font-medium">Notas</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA] font-medium">Base Cálculo</th>
                        <th className="text-right py-2 px-3 text-[#A1A1AA] font-medium">DIFAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apuracaoData.resumo_por_uf_origem.map((uf, idx) => {
                        const diferenca = (apuracaoData.aliquota_interna?.percentual || 0) - uf.aliquota_interestadual;
                        return (
                          <tr key={idx} className="border-b border-[#2A2A2A]/50 hover:bg-white/5">
                            <td className="py-3 px-3">
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                                {uf.uf}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-white">
                              {formatPercent(uf.aliquota_interestadual)}
                            </td>
                            <td className="py-3 px-3 text-center text-[#C8A951] font-medium">
                              {formatPercent(diferenca)}
                            </td>
                            <td className="py-3 px-3 text-center text-[#A1A1AA]">
                              {uf.qtd_notas}
                            </td>
                            <td className="py-3 px-3 text-right text-white">
                              {formatCurrency(uf.total_base)}
                            </td>
                            <td className="py-3 px-3 text-right text-[#C8A951] font-semibold">
                              {formatCurrency(uf.total_difal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#0C0C0C]">
                        <td colSpan="4" className="py-3 px-3 text-[#C8A951] font-semibold">TOTAL</td>
                        <td className="py-3 px-3 text-right text-white font-semibold">
                          {formatCurrency(apuracaoData.resumo?.total_base_calculo)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#C8A951] font-bold">
                          {formatCurrency(apuracaoData.resumo?.total_difal_a_recolher)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Lista de Notas */}
            {apuracaoData.documentos?.length > 0 && (
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-5">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C8A951]" />
                  Notas Fiscais de Entrada Interestaduais
                </h3>
                <div className="space-y-2">
                  {apuracaoData.documentos.map((doc, idx) => (
                    <div key={idx} className="border border-[#2A2A2A] rounded-lg overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                        onClick={() => toggleNotaExpanded(doc.chave || idx)}
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-white font-medium">NF {doc.numero_nf}</span>
                            <span className="text-[#666] text-sm ml-2">Série {doc.serie}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {doc.uf_origem} → {doc.uf_destino}
                          </span>
                          <span className="text-[#A1A1AA] text-sm">{doc.emitente}</span>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-[#666]">Valor NF</p>
                            <p className="text-white">{formatCurrency(doc.valor_total_nf)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#666]">DIFAL</p>
                            <p className="text-[#C8A951] font-semibold">{formatCurrency(doc.total_difal)}</p>
                          </div>
                          {expandedNotas[doc.chave || idx] ? (
                            <ChevronUp className="w-5 h-5 text-[#666]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#666]" />
                          )}
                        </div>
                      </div>
                      
                      {expandedNotas[doc.chave || idx] && (
                        <div className="px-4 pb-4 border-t border-[#2A2A2A]">
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-[#666]">Alíq. Interestadual</p>
                              <p className="text-white">{formatPercent(doc.aliquota_interestadual_padrao)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#666]">Alíq. Interna</p>
                              <p className="text-white">{formatPercent(doc.aliquota_interna)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#666]">Produtos c/ DIFAL</p>
                              <p className="text-emerald-400">{doc.qtd_produtos_com_difal}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#666]">Produtos s/ DIFAL (ST)</p>
                              <p className="text-[#A1A1AA]">{doc.qtd_produtos_sem_difal}</p>
                            </div>
                          </div>
                          <p className="text-xs text-[#666] mt-3">
                            {doc.embasamento_aliquota_interna}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Embasamento Legal */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Fundamentação Legal
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-[#A1A1AA]">
                  <strong className="text-white">Base:</strong> {apuracaoData.embasamento_legal?.principal}
                </p>
                <p className="text-[#A1A1AA]">
                  <strong className="text-white">Cálculo:</strong> {apuracaoData.embasamento_legal?.calculo}
                </p>
                <p className="text-[#A1A1AA]">
                  <strong className="text-white">Vencimento:</strong> {apuracaoData.embasamento_legal?.vencimento}
                </p>
              </div>
            </div>

            {/* Sem documentos */}
            {!apuracaoData.documentos?.length && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-[#666] mx-auto mb-3" />
                <p className="text-[#A1A1AA]">Nenhuma nota de entrada interestadual encontrada na competência.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: Detalhamento */}
        {!loading && activeTab === 'detalhamento' && detalhamentoData && (
          <div className="space-y-6">
            {/* Produtos COM DIFAL */}
            <div className="bg-[#141414] rounded-lg border border-emerald-500/30 overflow-hidden">
              <div className="bg-emerald-500/10 px-5 py-4 border-b border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-emerald-400 font-medium flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      {detalhamentoData.produtos_com_difal?.titulo}
                    </h3>
                    <p className="text-xs text-[#666] mt-1">{detalhamentoData.produtos_com_difal?.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#666]">Total DIFAL</p>
                    <p className="text-xl font-bold text-emerald-400">
                      {formatCurrency(detalhamentoData.produtos_com_difal?.total_difal)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] bg-[#0C0C0C]">
                      <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">NF</th>
                      <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">NCM</th>
                      <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">Descrição</th>
                      <th className="text-center py-3 px-3 text-[#A1A1AA] font-medium">UF</th>
                      <th className="text-center py-3 px-3 text-[#A1A1AA] font-medium">Alíq. Inter.</th>
                      <th className="text-center py-3 px-3 text-[#A1A1AA] font-medium">Alíq. Int.</th>
                      <th className="text-center py-3 px-3 text-[#A1A1AA] font-medium">Dif.</th>
                      <th className="text-right py-3 px-3 text-[#A1A1AA] font-medium">Valor Prod.</th>
                      <th className="text-right py-3 px-3 text-[#A1A1AA] font-medium">DIFAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhamentoData.produtos_com_difal?.itens?.map((prod, idx) => (
                      <tr key={idx} className="border-b border-[#2A2A2A]/50 hover:bg-white/5">
                        <td className="py-2 px-3 text-white font-medium">{prod.numero_nf}</td>
                        <td className="py-2 px-3 text-[#A1A1AA] font-mono text-xs">{prod.ncm}</td>
                        <td className="py-2 px-3 text-white max-w-[200px] truncate" title={prod.descricao}>
                          {prod.descricao?.substring(0, 40)}{prod.descricao?.length > 40 ? '...' : ''}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {prod.uf_origem}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-[#A1A1AA]">
                          {formatPercent(prod.aliquota_interestadual)}
                        </td>
                        <td className="py-2 px-3 text-center text-white">
                          {formatPercent(prod.aliquota_interna)}
                        </td>
                        <td className="py-2 px-3 text-center text-[#C8A951] font-medium">
                          {formatPercent(prod.diferenca_aliquota)}
                        </td>
                        <td className="py-2 px-3 text-right text-white">
                          {formatCurrency(prod.valor_produto)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                          {formatCurrency(prod.valor_difal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#0C0C0C]">
                      <td colSpan="7" className="py-3 px-3 text-emerald-400 font-semibold">
                        TOTAL ({detalhamentoData.produtos_com_difal?.quantidade} produtos)
                      </td>
                      <td className="py-3 px-3 text-right text-white font-semibold">
                        {formatCurrency(detalhamentoData.produtos_com_difal?.total_base_calculo)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                        {formatCurrency(detalhamentoData.produtos_com_difal?.total_difal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="px-5 py-3 bg-[#0C0C0C] border-t border-[#2A2A2A]">
                <p className="text-xs text-[#666]">
                  <strong className="text-emerald-400">Embasamento:</strong> {detalhamentoData.produtos_com_difal?.embasamento}
                </p>
              </div>
            </div>

            {/* Produtos SEM DIFAL */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] overflow-hidden">
              <div className="bg-[#1A1A1A] px-5 py-4 border-b border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[#A1A1AA] font-medium flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-[#666]" />
                      {detalhamentoData.produtos_sem_difal?.titulo}
                    </h3>
                    <p className="text-xs text-[#666] mt-1">{detalhamentoData.produtos_sem_difal?.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#666]">Total Base</p>
                    <p className="text-xl font-bold text-[#A1A1AA]">
                      {formatCurrency(detalhamentoData.produtos_sem_difal?.total_base_calculo)}
                    </p>
                  </div>
                </div>
              </div>
              
              {detalhamentoData.produtos_sem_difal?.itens?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] bg-[#0C0C0C]">
                        <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">NF</th>
                        <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">NCM</th>
                        <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">Descrição</th>
                        <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">CST</th>
                        <th className="text-right py-3 px-3 text-[#A1A1AA] font-medium">Valor</th>
                        <th className="text-left py-3 px-3 text-[#A1A1AA] font-medium">Motivo Isenção</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalhamentoData.produtos_sem_difal?.itens?.map((prod, idx) => (
                        <tr key={idx} className="border-b border-[#2A2A2A]/50 hover:bg-white/5">
                          <td className="py-2 px-3 text-white font-medium">{prod.numero_nf}</td>
                          <td className="py-2 px-3 text-[#A1A1AA] font-mono text-xs">{prod.ncm}</td>
                          <td className="py-2 px-3 text-white max-w-[200px] truncate" title={prod.descricao}>
                            {prod.descricao?.substring(0, 40)}{prod.descricao?.length > 40 ? '...' : ''}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs">
                              {prod.cst}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-white">
                            {formatCurrency(prod.valor_produto)}
                          </td>
                          <td className="py-2 px-3 text-[#666] text-xs">
                            {prod.motivo_isencao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#666]">Nenhum produto com ST nesta competência</p>
                </div>
              )}
              
              <div className="px-5 py-3 bg-[#0C0C0C] border-t border-[#2A2A2A]">
                <p className="text-xs text-[#666]">
                  <strong className="text-[#A1A1AA]">Embasamento:</strong> {detalhamentoData.produtos_sem_difal?.embasamento}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DifaLPage;
