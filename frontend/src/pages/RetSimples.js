import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Scale, RefreshCw, AlertCircle, Award, Zap, 
  TrendingDown, TrendingUp, Info, Calendar
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RetSimples = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia, openSelector } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [retData, setRetData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Buscar dados do RET
  const fetchComparativoRegimes = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/simples-nacional/ret/comparativo`,
        { 
          company_id: selectedCompany.id, 
          ano: selectedAno
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRetData(response.data);
    } catch (err) {
      console.error('Erro ao buscar comparativo:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar comparativo de regimes');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando empresa ou ano mudar
  useEffect(() => {
    if (selectedCompany) {
      fetchComparativoRegimes();
    }
  }, [selectedCompany, selectedAno]);

  // Gerar opções de anos
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Scale className="w-7 h-7 text-purple-400" />
              RET - Comparativo de Regimes Tributários
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Análise comparativa entre Simples Nacional, Lucro Presumido e Lucro Real
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-[#A1A1AA]" />
              <select
                value={selectedAno}
                onChange={(e) => setSelectedAno(Number(e.target.value))}
                className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
              >
                {anos.map(ano => (
                  <option key={ano} value={ano} className="bg-[#141414]">{ano}</option>
                ))}
              </select>
            </div>
            
            {/* Botão Atualizar */}
            <button
              onClick={fetchComparativoRegimes}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-500/20 text-purple-300 rounded font-medium hover:bg-purple-500/30 transition-all border border-purple-500/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Verificação de empresa selecionada */}
        {!selectedCompany ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-2">Nenhuma empresa selecionada</h3>
            <p className="text-[#A1A1AA] text-sm mb-4">
              Selecione uma empresa do Simples Nacional para ver o comparativo de regimes.
            </p>
            <button
              onClick={openSelector}
              className="px-4 py-2 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B89941] transition-colors"
            >
              Selecionar Empresa
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white">Calculando comparativo de regimes...</p>
              <p className="text-[#666] text-sm">Isso pode levar alguns segundos</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-white font-medium mb-2">Erro ao carregar dados</h3>
            <p className="text-[#A1A1AA] text-sm">{error}</p>
          </div>
        ) : retData?.mensagem ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <p className="text-white">{retData.mensagem}</p>
            <p className="text-[#666] text-sm mt-2">{retData.sugestao}</p>
          </div>
        ) : retData && (
          <div className="space-y-6">
            {/* Info Base */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-5">
              <h3 className="text-sm font-medium text-[#A1A1AA] mb-4">Dados Base para Cálculo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0C0C0C] rounded-lg p-4">
                  <p className="text-xs text-[#666]">Período</p>
                  <p className="text-lg font-bold text-white">{retData.periodo?.referencia}</p>
                </div>
                <div className="bg-[#0C0C0C] rounded-lg p-4">
                  <p className="text-xs text-[#666]">RBT12</p>
                  <p className="text-lg font-bold text-[#C8A951]">{formatCurrency(retData.periodo?.rbt12)}</p>
                </div>
                <div className="bg-[#0C0C0C] rounded-lg p-4">
                  <p className="text-xs text-[#666]">Base de Cálculo</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(retData.periodo?.faturamento_base)}</p>
                </div>
                <div className="bg-[#0C0C0C] rounded-lg p-4">
                  <p className="text-xs text-[#666]">Meses Apurados</p>
                  <p className="text-lg font-bold text-white">{retData.periodo?.meses_apurados}</p>
                </div>
              </div>
            </div>

            {/* Ranking de Regimes */}
            <div>
              <h3 className="text-sm font-medium text-[#A1A1AA] mb-4">Comparativo por Regime Tributário</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {retData.ranking?.map((regime, idx) => (
                  <div 
                    key={regime.regime}
                    className={`rounded-lg p-5 ${
                      idx === 0 
                        ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-2 border-emerald-500/50' 
                        : 'bg-[#141414] border border-[#2A2A2A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${idx === 0 ? 'text-emerald-400' : 'text-[#A1A1AA]'}`}>
                        {idx === 0 && <Award className="w-4 h-4 inline mr-1" />}
                        {idx + 1}º - {regime.nome}
                      </span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                          Melhor Opção
                        </span>
                      )}
                    </div>
                    <p className={`text-3xl font-bold ${idx === 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {formatCurrency(regime.total)}
                    </p>
                    <p className="text-xs text-[#666] mt-1">
                      {formatPercent((regime.total / (retData.periodo?.faturamento_base || 1)) * 100)} do faturamento
                    </p>
                    
                    {/* Detalhamento */}
                    <div className="mt-4 pt-4 border-t border-[#2A2A2A]/50 space-y-2 text-sm">
                      {regime.dados && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-[#666]">ICMS</span>
                            <span className="text-white">{formatCurrency(regime.dados.icms)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666]">PIS</span>
                            <span className="text-white">{formatCurrency(regime.dados.pis)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666]">COFINS</span>
                            <span className="text-white">{formatCurrency(regime.dados.cofins)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666]">IRPJ</span>
                            <span className="text-white">{formatCurrency(regime.dados.irpj)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666]">CSLL</span>
                            <span className="text-white">{formatCurrency(regime.dados.csll)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666]">CPP/INSS</span>
                            <span className="text-white">{formatCurrency(regime.dados.cpp)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Análise Comparativa */}
            {retData.analise && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
                <h4 className="text-purple-400 font-medium mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Análise Comparativa
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* vs Presumido */}
                  <div className="bg-[#0C0C0C] rounded-lg p-4">
                    <p className="text-xs text-[#666] mb-2">Simples Nacional vs Lucro Presumido</p>
                    <div className="flex items-center gap-2">
                      {retData.analise?.simples_vs_presumido?.diferenca > 0 ? (
                        <>
                          <TrendingDown className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold text-lg">
                            Economia de {formatCurrency(retData.analise.simples_vs_presumido.diferenca)}
                          </span>
                        </>
                      ) : retData.analise?.simples_vs_presumido?.diferenca < 0 ? (
                        <>
                          <TrendingUp className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-semibold text-lg">
                            Acréscimo de {formatCurrency(Math.abs(retData.analise.simples_vs_presumido.diferenca))}
                          </span>
                        </>
                      ) : (
                        <span className="text-[#A1A1AA]">Valores equivalentes</span>
                      )}
                    </div>
                    <p className="text-xs text-[#666] mt-2">
                      {retData.analise?.simples_vs_presumido?.percentual > 0 
                        ? `${formatPercent(retData.analise.simples_vs_presumido.percentual)} mais econômico`
                        : retData.analise?.simples_vs_presumido?.percentual < 0
                        ? `${formatPercent(Math.abs(retData.analise.simples_vs_presumido.percentual))} mais caro`
                        : ''}
                    </p>
                  </div>
                  
                  {/* vs Real */}
                  <div className="bg-[#0C0C0C] rounded-lg p-4">
                    <p className="text-xs text-[#666] mb-2">Simples Nacional vs Lucro Real</p>
                    <div className="flex items-center gap-2">
                      {retData.analise?.simples_vs_real?.diferenca > 0 ? (
                        <>
                          <TrendingDown className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold text-lg">
                            Economia de {formatCurrency(retData.analise.simples_vs_real.diferenca)}
                          </span>
                        </>
                      ) : retData.analise?.simples_vs_real?.diferenca < 0 ? (
                        <>
                          <TrendingUp className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-semibold text-lg">
                            Acréscimo de {formatCurrency(Math.abs(retData.analise.simples_vs_real.diferenca))}
                          </span>
                        </>
                      ) : (
                        <span className="text-[#A1A1AA]">Valores equivalentes</span>
                      )}
                    </div>
                    <p className="text-xs text-[#666] mt-2">
                      {retData.analise?.simples_vs_real?.percentual > 0 
                        ? `${formatPercent(retData.analise.simples_vs_real.percentual)} mais econômico`
                        : retData.analise?.simples_vs_real?.percentual < 0
                        ? `${formatPercent(Math.abs(retData.analise.simples_vs_real.percentual))} mais caro`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recomendação */}
            {retData.recomendacao && (
              <div className="bg-[#C8A951]/10 border border-[#C8A951]/30 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#C8A951] mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-[#C8A951] font-medium mb-1">Recomendação</h4>
                    <p className="text-white">{retData.recomendacao}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#A1A1AA] mb-2">Observações Importantes</h4>
              <ul className="text-xs text-[#666] space-y-1">
                <li>• O cálculo considera os dados de faturamento importados do PGDAS quando disponíveis</li>
                <li>• Os valores são estimativas e podem variar conforme particularidades da empresa</li>
                <li>• Lucro Real considera créditos de PIS/COFINS sobre entradas tributadas</li>
                <li>• A decisão final deve considerar outros fatores além da carga tributária</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RetSimples;
