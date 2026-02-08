import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  Download, RefreshCw, Building2, BarChart3, 
  AlertTriangle, CheckCircle, Sparkles, Calculator,
  Scale, ArrowRight, Lightbulb, Target, Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RET = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [analiseIA, setAnaliseIA] = useState(null);

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar dados de apuração consolidados
      const [icmsRes, issRes, pisRes] = await Promise.all([
        axios.get(`${API}/apuracao-icms/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-iss/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/pis-cofins/apuracao/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null)
      ]);
      
      // Buscar análise tributária IA
      const analiseRes = await axios.get(
        `${API}/analise-tributaria-ia/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers }
      ).catch(() => null);
      
      setDados({
        icms: icmsRes?.data,
        iss: issRes?.data,
        pis_cofins: pisRes?.data
      });
      setAnaliseIA(analiseRes?.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia, fetchData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Card de Imposto
  const ImpostoCard = ({ titulo, icone: Icon, corIcone, apagar, arecuperar, situacao }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold">{titulo}</span>
      </div>
      <div className="space-y-2">
        {apagar > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1AA] text-sm">A Pagar</span>
            <span className="text-red-400 font-bold">{formatCurrency(apagar)}</span>
          </div>
        )}
        {arecuperar > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1AA] text-sm">A Recuperar</span>
            <span className="text-green-400 font-bold">{formatCurrency(arecuperar)}</span>
          </div>
        )}
        {!apagar && !arecuperar && (
          <div className="text-center py-2">
            <span className="text-[#666] text-sm">Sem movimentação</span>
          </div>
        )}
      </div>
    </div>
  );

  // Card de Insight IA
  const InsightCard = ({ tipo, titulo, descricao, impacto, prioridade }) => {
    const corBorda = prioridade === 'alta' ? 'border-red-500/50' : prioridade === 'media' ? 'border-amber-500/50' : 'border-blue-500/50';
    const corBg = prioridade === 'alta' ? 'bg-red-500/10' : prioridade === 'media' ? 'bg-amber-500/10' : 'bg-blue-500/10';
    
    return (
      <div className={`${corBg} border ${corBorda} rounded-xl p-4`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${prioridade === 'alta' ? 'bg-red-600' : prioridade === 'media' ? 'bg-amber-600' : 'bg-blue-600'}`}>
            {tipo === 'oportunidade' ? <Lightbulb className="w-4 h-4 text-white" /> : 
             tipo === 'risco' ? <AlertTriangle className="w-4 h-4 text-white" /> : 
             <Target className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <h4 className="text-white font-medium">{titulo}</h4>
            <p className="text-[#A1A1AA] text-sm mt-1">{descricao}</p>
            {impacto && (
              <p className="text-[#C8A951] text-sm mt-2 font-semibold">
                Impacto: {formatCurrency(impacto)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calcular totais
  const calcularTotais = () => {
    if (!dados) return { total_pagar: 0, total_recuperar: 0, saldo_liquido: 0 };
    
    const icms_pagar = dados.icms?.apuracao?.situacao === 'A_PAGAR' ? dados.icms?.apuracao?.saldo || 0 : 0;
    const icms_recuperar = dados.icms?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.icms?.apuracao?.saldo || 0) : 0;
    
    const iss_pagar = dados.iss?.resumo?.iss_a_pagar || 0;
    
    const pis_pagar = dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total > 0 ? dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total : 0;
    const pis_recuperar = dados.pis_cofins?.lucro_real?.saldo?.total < 0 ? Math.abs(dados.pis_cofins?.lucro_real?.saldo?.total) : 0;
    
    const icms_st_pagar = dados.icms?.icms_st?.apuracao?.icms_st_a_recolher || 0;
    
    const total_pagar = icms_pagar + iss_pagar + pis_pagar + icms_st_pagar;
    const total_recuperar = icms_recuperar + pis_recuperar;
    
    return {
      total_pagar,
      total_recuperar,
      saldo_liquido: total_pagar - total_recuperar,
      detalhes: {
        icms: { pagar: icms_pagar, recuperar: icms_recuperar },
        iss: { pagar: iss_pagar, recuperar: 0 },
        pis_cofins: { pagar: pis_pagar, recuperar: pis_recuperar },
        icms_st: { pagar: icms_st_pagar, recuperar: 0 }
      }
    };
  };

  const totais = calcularTotais();

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-[#C8A951]" />
              RET - Rota de Eficiência Tributária
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Visão consolidada e análise inteligente dos tributos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              data-testid="btn-atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-2 rounded-lg transition-colors font-medium"
              data-testid="btn-exportar"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Info da Empresa */}
        {selectedCompany && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-[#C8A951]" />
              <div className="flex-1">
                <h2 className="text-white font-semibold">{selectedCompany.razao_social}</h2>
                <p className="text-[#A1A1AA] text-sm">
                  CNPJ: {selectedCompany.cnpj} | Competência: {selectedCompetencia} | 
                  Regime: <span className="text-[#C8A951]">{selectedCompany.regime_tributario?.replace('_', ' ')?.toUpperCase() || 'N/D'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a rota de eficiência tributária</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo Consolidado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                  <span className="text-[#A1A1AA]">Total a Pagar</span>
                </div>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(totais.total_pagar)}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <span className="text-[#A1A1AA]">Total a Recuperar</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(totais.total_recuperar)}</p>
              </div>
              <div className={`rounded-xl p-6 border ${
                totais.saldo_liquido > 0 
                  ? 'bg-amber-500/10 border-amber-500/50' 
                  : totais.saldo_liquido < 0
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-[#141414] border-[#2A2A2A]'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <Scale className="w-6 h-6 text-[#C8A951]" />
                  <span className="text-[#A1A1AA]">Saldo Líquido</span>
                </div>
                <p className={`text-3xl font-bold ${
                  totais.saldo_liquido > 0 ? 'text-amber-400' : totais.saldo_liquido < 0 ? 'text-green-400' : 'text-white'
                }`}>
                  {formatCurrency(Math.abs(totais.saldo_liquido))}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  {totais.saldo_liquido > 0 ? 'Débito líquido' : totais.saldo_liquido < 0 ? 'Crédito líquido' : 'Equilibrado'}
                </p>
              </div>
            </div>

            {/* Cards de Impostos */}
            <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#C8A951]" />
                Detalhamento por Tributo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ImpostoCard
                  titulo="ICMS Próprio"
                  icone={BarChart3}
                  corIcone="bg-blue-600"
                  apagar={totais.detalhes?.icms?.pagar}
                  arecuperar={totais.detalhes?.icms?.recuperar}
                />
                <ImpostoCard
                  titulo="ICMS ST"
                  icone={BarChart3}
                  corIcone="bg-amber-600"
                  apagar={totais.detalhes?.icms_st?.pagar}
                  arecuperar={0}
                />
                <ImpostoCard
                  titulo="PIS/COFINS"
                  icone={DollarSign}
                  corIcone="bg-purple-600"
                  apagar={totais.detalhes?.pis_cofins?.pagar}
                  arecuperar={totais.detalhes?.pis_cofins?.recuperar}
                />
                <ImpostoCard
                  titulo="ISS"
                  icone={FileText}
                  corIcone="bg-teal-600"
                  apagar={totais.detalhes?.iss?.pagar}
                  arecuperar={0}
                />
              </div>
            </div>

            {/* Análise IA */}
            {analiseIA && (
              <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C8A951]" />
                  Análise Inteligente
                </h3>
                
                {analiseIA.oportunidades?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Oportunidades Identificadas
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analiseIA.oportunidades.slice(0, 4).map((op, idx) => (
                        <InsightCard
                          key={idx}
                          tipo="oportunidade"
                          titulo={op.titulo || op.tipo}
                          descricao={op.descricao}
                          impacto={op.impacto}
                          prioridade={op.prioridade || 'media'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {analiseIA.alertas?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Alertas e Riscos
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analiseIA.alertas.slice(0, 4).map((alerta, idx) => (
                        <InsightCard
                          key={idx}
                          tipo="risco"
                          titulo={alerta.titulo || alerta.tipo}
                          descricao={alerta.descricao}
                          impacto={alerta.impacto}
                          prioridade={alerta.prioridade || 'alta'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!analiseIA.oportunidades?.length && !analiseIA.alertas?.length && (
                  <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-white font-bold text-lg">Tudo em ordem!</h3>
                    <p className="text-[#A1A1AA]">
                      Nenhuma oportunidade ou alerta identificado para esta competência.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comparativo de Regimes (PIS/COFINS) */}
            {dados?.pis_cofins?.comparativo && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#C8A951]" />
                  Comparativo de Regimes (PIS/COFINS)
                </h3>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30 min-w-[200px]">
                    <p className="text-[#A1A1AA] text-sm">Lucro Real</p>
                    <p className="text-green-400 text-2xl font-bold">
                      {formatCurrency(dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total)}
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-[#666]" />
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 min-w-[200px]">
                    <p className="text-[#A1A1AA] text-sm">Lucro Presumido</p>
                    <p className="text-blue-400 text-2xl font-bold">
                      {formatCurrency(dados.pis_cofins?.lucro_presumido?.imposto_a_pagar?.total)}
                    </p>
                  </div>
                  {dados.pis_cofins?.comparativo?.economia > 0 && (
                    <>
                      <ArrowRight className="w-6 h-6 text-[#C8A951]" />
                      <div className="text-center p-4 bg-[#C8A951]/10 rounded-lg border border-[#C8A951]/30 min-w-[200px]">
                        <p className="text-[#A1A1AA] text-sm">Economia Potencial</p>
                        <p className="text-[#C8A951] text-2xl font-bold">
                          {formatCurrency(dados.pis_cofins?.comparativo?.economia)}
                        </p>
                        <p className="text-xs text-[#666]">{dados.pis_cofins?.comparativo?.regime_mais_economico?.replace('_', ' ')}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RET;
