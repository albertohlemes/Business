import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, FileText, CheckCircle, AlertTriangle, TrendingUp, 
  ArrowDownCircle, ArrowUpCircle, Receipt, FileCheck, 
  DollarSign, Percent, Calculator, ChevronRight, Scale, Lightbulb
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia, openSelector } = useAppContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchStats();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchStats = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/dashboard/stats/${selectedCompany.id}?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
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

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // Card de estatística simples
  const StatCard = ({ icon: Icon, title, value, color, link, subtitle }) => (
    <Link to={link} className="block group">
      <div className="bg-[#141414] rounded-lg p-5 border border-[#2A2A2A] hover:border-[#C8A951]/30 transition-all">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <ChevronRight className="w-5 h-5 text-[#A1A1AA] group-hover:text-[#C8A951] transition-colors" />
        </div>
        <h3 className="text-[#A1A1AA] text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-[#A1A1AA] mt-1">{subtitle}</p>}
      </div>
    </Link>
  );

  // Card de valor financeiro
  const ValueCard = ({ title, value, icon: Icon, color, description }) => (
    <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="text-sm text-[#A1A1AA]">{title}</h4>
          <p className="text-lg font-bold text-white">{formatCurrency(value)}</p>
        </div>
      </div>
      {description && <p className="text-xs text-[#A1A1AA] ml-12">{description}</p>}
    </div>
  );

  // Card de imposto
  const TaxCard = ({ title, credito, debito, pagar }) => (
    <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
      <h4 className="font-semibold text-white mb-3">{title}</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-emerald-400">Crédito:</span>
          <span className="font-medium text-emerald-400">{formatCurrency(credito)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-red-400">Débito:</span>
          <span className="font-medium text-red-400">{formatCurrency(debito)}</span>
        </div>
        <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold">
          <span className="text-[#A1A1AA]">A Pagar:</span>
          <span className={pagar > 0 ? 'text-red-400' : 'text-emerald-400'}>
            {formatCurrency(pagar)}
          </span>
        </div>
      </div>
    </div>
  );

  // Card de PIS/COFINS com divergência (para Lucro Real)
  const TaxCardWithDivergence = ({ title, credito, debito, debitoXml, pagar, divergencia }) => (
    <div className={`bg-[#141414] rounded-lg p-4 border ${divergencia ? 'border-amber-500/30 bg-amber-500/5' : 'border-[#2A2A2A]'}`}>
      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
        {title}
        {divergencia && (
          <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full">
            Divergência
          </span>
        )}
      </h4>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-emerald-400">Crédito:</span>
          <span className="font-medium text-emerald-400">{formatCurrency(credito)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-red-400">Débito ({title === 'PIS' ? '1.65%' : '7.6%'}):</span>
          <span className="font-medium text-red-400">{formatCurrency(debito)}</span>
        </div>
        {divergencia && debitoXml !== null && (
          <div className="flex justify-between text-xs bg-amber-500/10 -mx-2 px-2 py-1 rounded">
            <span className="text-amber-400">Valor no XML ({divergencia.aliquota_xml}):</span>
            <span className="font-medium text-amber-400">{formatCurrency(debitoXml)}</span>
          </div>
        )}
        {divergencia && (
          <div className="flex justify-between text-xs text-amber-400">
            <span>Diferença:</span>
            <span className="font-medium">{formatCurrency(divergencia.diferenca)}</span>
          </div>
        )}
        <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold">
          <span className="text-[#A1A1AA]">A Pagar:</span>
          <span className={pagar > 0 ? 'text-red-400' : 'text-emerald-400'}>
            {formatCurrency(pagar)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="dashboard-page" className="space-y-6">
        {/* Header */}
        <div className="bg-[#141414] border border-[#2A2A2A] text-white rounded-lg p-6">
          <h1 className="text-2xl font-semibold mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>Dashboard</h1>
          {selectedCompany ? (
            <div>
              <p className="text-[#A1A1AA]">{selectedCompany.razao_social}</p>
              <p className="text-sm text-[#C8A951]">Competência: {selectedCompetencia}</p>
            </div>
          ) : (
            <p className="text-[#A1A1AA]">Selecione uma empresa no header para ver as estatísticas</p>
          )}
        </div>

        {!selectedCompany ? (
          <div className="bg-[#141414] rounded-lg p-8 text-center border border-[#2A2A2A]">
            <Building2 className="w-16 h-16 text-[#C8A951] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Selecione uma Empresa</h3>
            <p className="text-[#A1A1AA] mb-4">
              Clique no botão abaixo ou no header para selecionar a empresa e competência
            </p>
            <button
              onClick={openSelector}
              data-testid="open-selector-from-dashboard"
              className="px-6 py-3 bg-[#C8A951] text-black rounded font-bold hover:bg-[#B09240]"
            >
              Selecionar Empresa
            </button>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8A951]"></div>
            <p className="mt-4 text-[#A1A1AA]">Carregando estatísticas...</p>
          </div>
        ) : stats ? (
          <>
            {/* Quantidade de Documentos */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Documentos por Tipo</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <StatCard
                  icon={ArrowDownCircle}
                  title="NF-e Entrada"
                  value={stats.quantidades.nfe_entrada}
                  color="bg-blue-600"
                  link="/documents"
                  subtitle="Compras"
                />
                <StatCard
                  icon={ArrowUpCircle}
                  title="NF-e Saída"
                  value={stats.quantidades.nfe_saida}
                  color="bg-green-600"
                  link="/documents"
                  subtitle="Vendas"
                />
                <StatCard
                  icon={Receipt}
                  title="Cupons (NFC-e)"
                  value={stats.quantidades.nfce}
                  color="bg-purple-600"
                  link="/documents"
                  subtitle="PDV"
                />
                <StatCard
                  icon={FileCheck}
                  title="Serviços (NFS-e)"
                  value={stats.quantidades.nfse}
                  color="bg-orange-600"
                  link="/documents"
                  subtitle="Serviços"
                />
                <StatCard
                  icon={FileText}
                  title="Total"
                  value={stats.quantidades.total_documentos}
                  color="bg-gray-600"
                  link="/documents"
                />
              </div>
            </div>

            {/* Valores Financeiros */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Valores do Período</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <ValueCard
                  title="Total Entradas"
                  value={stats.valores.total_entradas}
                  icon={ArrowDownCircle}
                  color="bg-blue-600"
                  description="Compras"
                />
                <ValueCard
                  title="Total Vendas"
                  value={stats.valores.total_vendas}
                  icon={ArrowUpCircle}
                  color="bg-green-600"
                  description="NF-e Saída"
                />
                <ValueCard
                  title="Cupons Fiscais"
                  value={stats.valores.total_cupons}
                  icon={Receipt}
                  color="bg-purple-600"
                  description="NFC-e"
                />
                <ValueCard
                  title="Serviços"
                  value={stats.valores.total_servicos}
                  icon={FileCheck}
                  color="bg-orange-600"
                  description="NFS-e"
                />
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-9 h-9 bg-white/20 rounded-lg p-2" />
                    <div>
                      <h4 className="text-sm text-red-100">Faturamento Total</h4>
                      <p className="text-xl font-bold">{formatCurrency(stats.valores.faturamento_total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Impostos */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Impostos</h2>
              
              {/* Alerta de divergências para Lucro Real */}
              {stats.debitos.divergencias && stats.debitos.divergencias.length > 0 && (
                <div className="mb-4 bg-orange-50 border border-orange-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-800">Divergência de Alíquotas Detectada</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Para empresa do <strong>Lucro Real</strong>, as alíquotas de PIS (1.65%) e COFINS (7.6%) devem seguir o regime não-cumulativo. 
                        Foram encontradas divergências nos XMLs:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {stats.debitos.divergencias.map((div, idx) => (
                          <li key={idx} className="text-sm text-orange-700">
                            • <strong>{div.imposto}</strong>: XML com {div.aliquota_xml} (esperado {div.aliquota_esperada}) - 
                            Diferença: {formatCurrency(Math.abs(div.diferenca))}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ICMS com informação de ST */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3">ICMS</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Crédito:</span>
                      <span className="font-medium text-green-700">{formatCurrency(stats.creditos.icms)}</span>
                    </div>
                    {stats.creditos.icms_st_desconsiderado > 0 && (
                      <div className="flex justify-between text-xs bg-orange-50 -mx-2 px-2 py-1 rounded">
                        <span className="text-orange-600">ICMS-ST (sem crédito):</span>
                        <span className="font-medium text-orange-700">{formatCurrency(stats.creditos.icms_st_desconsiderado)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Débito:</span>
                      <span className="font-medium text-red-700">{formatCurrency(stats.debitos.icms)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm font-bold">
                      <span className="text-gray-700">A Pagar:</span>
                      <span className={stats.impostos_pagar.icms > 0 ? 'text-red-700' : 'text-green-700'}>
                        {formatCurrency(stats.impostos_pagar.icms)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <TaxCardWithDivergence
                  title="PIS"
                  credito={stats.creditos.pis}
                  debito={stats.debitos.pis}
                  debitoXml={stats.debitos.pis_xml}
                  pagar={stats.impostos_pagar.pis}
                  divergencia={stats.debitos.divergencias?.find(d => d.imposto === 'PIS')}
                />
                <TaxCardWithDivergence
                  title="COFINS"
                  credito={stats.creditos.cofins}
                  debito={stats.debitos.cofins}
                  debitoXml={stats.debitos.cofins_xml}
                  pagar={stats.impostos_pagar.cofins}
                  divergencia={stats.debitos.divergencias?.find(d => d.imposto === 'COFINS')}
                />
                
                {/* ISS */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3">ISS (Serviços)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Retido:</span>
                      <span className="font-medium">{formatCurrency(stats.debitos.iss)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-sm font-bold">
                      <span className="text-gray-700">A Pagar:</span>
                      <span className={stats.impostos_pagar.iss > 0 ? 'text-red-700' : 'text-green-700'}>
                        {formatCurrency(stats.impostos_pagar.iss)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total de Impostos */}
              <div className="mt-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Total de Impostos a Pagar</h3>
                    <p className="text-gray-400 text-sm">ICMS + PIS + COFINS + ISS</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{formatCurrency(stats.impostos_pagar.total)}</p>
                    <p className="text-sm text-gray-400">Competência {selectedCompetencia}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicadores */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Indicadores</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <Percent className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-600">Markup Médio</h4>
                      <p className="text-2xl font-bold text-gray-900">{formatPercent(stats.indicadores.markup_percentual)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Calculado com base nas entradas x faturamento
                  </p>
                </div>
                
                <Link to="/reports" className="block">
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-12 h-12 bg-blue-100 rounded-lg p-2 text-blue-600" />
                      <div>
                        <h4 className="text-sm text-gray-600">Relatórios</h4>
                        <p className="text-lg font-bold text-gray-900">Ver Relatórios</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Relatórios por produto e NCM
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Análise Comparativa Lucro Presumido vs. Lucro Real */}
            {stats.analise_comparativa && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  Análise Comparativa: {stats.empresa.regime_tributario === 'lucro_presumido' ? 'Presumido vs. Real' : 'Real vs. Presumido'}
                </h2>
                
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-indigo-200">
                    {/* Regime Atual */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stats.analise_comparativa.regime_atual === 'lucro_presumido' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-green-600 text-white'
                        }`}>
                          REGIME ATUAL
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? 'Lucro Presumido' : 'Lucro Real'}
                        </span>
                      </div>
                      
                      {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">PIS (0.65%):</span>
                            <span className="font-medium">{formatCurrency(stats.analise_comparativa.lucro_presumido.pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">COFINS (3%):</span>
                            <span className="font-medium">{formatCurrency(stats.analise_comparativa.lucro_presumido.cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-indigo-200 pt-2">
                            <span className="text-gray-700">Total PIS/COFINS:</span>
                            <span className="text-blue-700">{formatCurrency(stats.analise_comparativa.lucro_presumido.total)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            * Sistema cumulativo - sem direito a créditos
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">PIS a pagar:</span>
                            <span className="font-medium">{formatCurrency(stats.analise_comparativa.lucro_real.pis_pagar)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">COFINS a pagar:</span>
                            <span className="font-medium">{formatCurrency(stats.analise_comparativa.lucro_real.cofins_pagar)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-indigo-200 pt-2">
                            <span className="text-gray-700">Total PIS/COFINS:</span>
                            <span className="text-green-700">{formatCurrency(stats.analise_comparativa.lucro_real.total)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            * Sistema não cumulativo - com direito a créditos
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Regime Hipotético */}
                    <div className="p-5 bg-white/50">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-400 text-white">
                          SE FOSSE
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? 'Lucro Real' : 'Lucro Presumido'}
                        </span>
                      </div>
                      
                      {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Débito PIS (1.65%):</span>
                            <span className="font-medium text-red-600">{formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.debito_pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Crédito PIS:</span>
                            <span className="font-medium text-green-600">- {formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.credito_pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Débito COFINS (7.6%):</span>
                            <span className="font-medium text-red-600">{formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.debito_cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Crédito COFINS:</span>
                            <span className="font-medium text-green-600">- {formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.credito_cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-indigo-200 pt-2">
                            <span className="text-gray-700">Total a pagar:</span>
                            <span className="text-green-700">{formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.total)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">PIS (0.65%):</span>
                            <span className="font-medium">{formatCurrency(stats.analise_comparativa.lucro_presumido_hipotetico.pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">COFINS (3%):</span>
                            <span className="font-medium">{formatCurrency(stats.analise_comparativa.lucro_presumido_hipotetico.cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-indigo-200 pt-2">
                            <span className="text-gray-700">Total PIS/COFINS:</span>
                            <span className="text-blue-700">{formatCurrency(stats.analise_comparativa.lucro_presumido_hipotetico.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conclusão */}
                  <div className={`p-4 border-t ${
                    stats.analise_comparativa.diferenca > 0 
                      ? 'bg-green-50 border-green-200' 
                      : stats.analise_comparativa.diferenca < 0 
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <Lightbulb className={`w-6 h-6 ${
                          stats.analise_comparativa.diferenca > 0 ? 'text-green-600' : 'text-gray-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {stats.analise_comparativa.diferenca > 0 ? (
                              <>
                                O <strong>{stats.analise_comparativa.regime_mais_vantajoso === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'}</strong> seria mais vantajoso
                              </>
                            ) : stats.analise_comparativa.diferenca < 0 ? (
                              <>
                                O regime atual é mais vantajoso para esta competência
                              </>
                            ) : (
                              'Ambos os regimes resultam no mesmo valor'
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            * Esta é uma análise simplificada apenas de PIS/COFINS. Consulte seu contador para uma análise completa.
                          </p>
                        </div>
                      </div>
                      
                      {stats.analise_comparativa.economia_potencial > 0 && (
                        <div className={`px-4 py-2 rounded-lg ${
                          stats.analise_comparativa.diferenca > 0 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-600 text-white'
                        }`}>
                          <p className="text-xs">Economia potencial</p>
                          <p className="text-lg font-bold">{formatCurrency(stats.analise_comparativa.economia_potencial)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default Dashboard;
