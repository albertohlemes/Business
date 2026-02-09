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
            {/* Quantidade de Documentos - Filtrado por Atividade */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Documentos por Tipo</h2>
              
              {/* ENTRADAS - Sempre mostra os 4 tipos */}
              <div className="mb-4">
                <h3 className="text-sm text-[#A1A1AA] mb-2 flex items-center gap-2">
                  <ArrowDownCircle className="w-4 h-4 text-blue-400" />
                  ENTRADAS
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard
                    icon={FileText}
                    title="NF-e Entrada"
                    value={stats.quantidades.nfe_entrada}
                    color="bg-blue-600"
                    link="/documents"
                    subtitle="Mercadorias"
                  />
                  <StatCard
                    icon={FileText}
                    title="CT-e Entrada"
                    value={stats.quantidades.cte_entrada || 0}
                    color="bg-cyan-600"
                    link="/documents"
                    subtitle="Frete Tomado"
                  />
                  <StatCard
                    icon={FileCheck}
                    title="NFS-e Tomados"
                    value={stats.quantidades.nfse_tomados || 0}
                    color="bg-orange-600"
                    link="/documents"
                    subtitle="Serviços Tomados"
                  />
                  <StatCard
                    icon={FileText}
                    title="Outros"
                    value={0}
                    color="bg-slate-600"
                    link="/documents"
                    subtitle="Demais Docs"
                  />
                  <div className="bg-[#0C0C0C] rounded-lg p-5 border border-[#2A2A2A]">
                    <h3 className="text-[#666] text-sm font-medium mb-1">Total Entradas</h3>
                    <p className="text-2xl font-bold text-blue-400">{stats.quantidades.total_entradas || (stats.quantidades.nfe_entrada + (stats.quantidades.cte_entrada || 0) + (stats.quantidades.nfse_tomados || 0))}</p>
                  </div>
                </div>
              </div>

              {/* SAÍDAS - Filtrado por Atividade */}
              <div>
                <h3 className="text-sm text-[#A1A1AA] mb-2 flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-green-400" />
                  SAÍDAS
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* NF-e Saída - Comércio, Indústria, Mista */}
                  {['comercio', 'industria', 'mista'].includes(stats.empresa.tipo_atividade) && (
                    <StatCard
                      icon={ArrowUpCircle}
                      title="NF-e Saída"
                      value={stats.quantidades.nfe_saida}
                      color="bg-green-600"
                      link="/documents"
                      subtitle="Vendas"
                    />
                  )}
                  {/* NFC-e - Comércio, Mista */}
                  {['comercio', 'mista'].includes(stats.empresa.tipo_atividade) && (
                    <StatCard
                      icon={Receipt}
                      title="Cupons (NFC-e)"
                      value={stats.quantidades.nfce}
                      color="bg-purple-600"
                      link="/documents"
                      subtitle="PDV"
                    />
                  )}
                  {/* CT-e Saída - Transporte */}
                  {(stats.quantidades.cte_saida > 0 || stats.empresa.tipo_atividade === 'transporte') && (
                    <StatCard
                      icon={FileText}
                      title="CT-e Saída"
                      value={stats.quantidades.cte_saida || 0}
                      color="bg-teal-600"
                      link="/documents"
                      subtitle="Frete Prestado"
                    />
                  )}
                  {/* NFS-e Prestados - Serviços, Mista */}
                  {['servicos', 'mista'].includes(stats.empresa.tipo_atividade) && (
                    <StatCard
                      icon={FileCheck}
                      title="NFS-e Prestados"
                      value={stats.quantidades.nfse_prestados || stats.quantidades.nfse || 0}
                      color="bg-amber-600"
                      link="/documents"
                      subtitle="Serviços Prestados"
                    />
                  )}
                  <div className="bg-[#0C0C0C] rounded-lg p-5 border border-[#2A2A2A]">
                    <h3 className="text-[#666] text-sm font-medium mb-1">Total Saídas</h3>
                    <p className="text-2xl font-bold text-green-400">{stats.quantidades.total_saidas || (stats.quantidades.nfe_saida + stats.quantidades.nfce + (stats.quantidades.cte_saida || 0) + (stats.quantidades.nfse_prestados || 0))}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Valores Financeiros - Detalhamento por Documento */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Valores do Período</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card de Entradas */}
                <div className="space-y-4">
                  <div className="bg-[#141414] rounded-lg p-5 border border-blue-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <ArrowDownCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Total Entradas</h3>
                        <p className="text-blue-400 text-xl font-bold">{formatCurrency(stats.valores.entradas?.total || stats.valores.total_entradas)}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA]">NF-e (Mercadorias)</span>
                        <span className="text-white font-medium">{formatCurrency(stats.valores.entradas?.nfe || stats.valores.total_entradas)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA]">CT-e (Frete Tomado)</span>
                        <span className="text-white font-medium">{formatCurrency(stats.valores.entradas?.cte || 0)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA]">NFS-e (Serviços Tomados)</span>
                        <span className="text-white font-medium">{formatCurrency(stats.valores.entradas?.servicos_tomados || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicador COMPRAS */}
                  <div className="bg-gradient-to-r from-blue-900/30 to-blue-950/30 rounded-lg p-4 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[#A1A1AA] text-sm flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          COMPRAS (Líquidas)
                        </h3>
                        <p className="text-blue-400 text-2xl font-bold">{formatCurrency(stats.valores.compras?.liquidas || 0)}</p>
                        <p className="text-xs text-[#666] mt-1">Revenda + Insumos − Devoluções</p>
                      </div>
                      {stats.valores.compras?.devolucoes > 0 && (
                        <div className="text-right">
                          <span className="text-xs text-red-400">Devoluções</span>
                          <p className="text-sm text-red-400 line-through">{formatCurrency(stats.valores.compras.devolucoes)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card de Saídas */}
                <div className="space-y-4">
                  <div className="bg-[#141414] rounded-lg p-5 border border-green-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                        <ArrowUpCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">Total Saídas</h3>
                        <p className="text-green-400 text-xl font-bold">{formatCurrency(stats.valores.saidas?.total || (stats.valores.total_vendas + stats.valores.total_cupons + stats.valores.total_servicos))}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {['comercio', 'industria', 'mista'].includes(stats.empresa.tipo_atividade) && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">NF-e (Vendas)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.nfe || stats.valores.total_vendas)}</span>
                        </div>
                      )}
                      {['comercio', 'mista'].includes(stats.empresa.tipo_atividade) && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">NFC-e (Cupons)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.nfce || stats.valores.total_cupons)}</span>
                        </div>
                      )}
                      {(stats.valores.saidas?.cte > 0 || stats.empresa.tipo_atividade === 'transporte') && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">CT-e (Frete Prestado)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.cte || 0)}</span>
                        </div>
                      )}
                      {['servicos', 'mista'].includes(stats.empresa.tipo_atividade) && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">NFS-e (Serviços Prestados)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.servicos_prestados || stats.valores.total_servicos)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicador VENDAS */}
                  <div className="bg-gradient-to-r from-green-900/30 to-green-950/30 rounded-lg p-4 border border-green-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[#A1A1AA] text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          VENDAS (Líquidas)
                        </h3>
                        <p className="text-green-400 text-2xl font-bold">{formatCurrency(stats.valores.vendas_liquidas?.liquidas || 0)}</p>
                        <p className="text-xs text-[#666] mt-1">Vendas − Devoluções de Clientes</p>
                      </div>
                      {stats.valores.vendas_liquidas?.devolucoes > 0 && (
                        <div className="text-right">
                          <span className="text-xs text-red-400">Devoluções</span>
                          <p className="text-sm text-red-400 line-through">{formatCurrency(stats.valores.vendas_liquidas.devolucoes)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Markup */}
              <div className="mt-4 bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/10 rounded-lg p-5 border border-[#C8A951]/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Percent className="w-8 h-8 text-[#C8A951]" />
                    <div>
                      <h3 className="text-[#A1A1AA] text-sm">Markup (Vendas / Compras)</h3>
                      <p className={`text-2xl font-bold ${(stats.valores.markup || 0) >= 0 ? 'text-[#C8A951]' : 'text-red-400'}`}>
                        {formatPercent(stats.valores.markup || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-[#A1A1AA]">
                      Atividade: <span className="text-white font-medium capitalize">{stats.empresa.tipo_atividade}</span>
                    </div>
                    <div className="text-xs text-[#666] mt-1">
                      ({formatCurrency(stats.valores.vendas_liquidas?.liquidas || 0)} - {formatCurrency(stats.valores.compras?.liquidas || 0)}) / {formatCurrency(stats.valores.compras?.liquidas || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Impostos */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Impostos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* ICMS - Mostrar apenas se for contribuinte */}
                {(stats.empresa?.tipo_atividade === 'comercio' || 
                  stats.empresa?.tipo_atividade === 'industria' || 
                  stats.empresa?.tipo_atividade === 'mista' ||
                  stats.empresa?.apura_icms) && (
                  <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                    <h4 className="font-semibold text-white mb-3">ICMS</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Crédito:</span>
                        <span className="font-medium text-emerald-400">{formatCurrency(stats.creditos.icms)}</span>
                      </div>
                      {stats.creditos.icms_st_desconsiderado > 0 && (
                        <div className="flex justify-between text-xs bg-amber-500/10 -mx-2 px-2 py-1 rounded">
                          <span className="text-amber-400">ICMS-ST (sem crédito):</span>
                          <span className="font-medium text-amber-400">{formatCurrency(stats.creditos.icms_st_desconsiderado)}</span>
                        </div>
                      )}
                      {stats.creditos.icms_despesa_desconsiderado > 0 && (
                        <div className="flex justify-between text-xs bg-orange-500/10 -mx-2 px-2 py-1 rounded">
                          <span className="text-orange-400">Despesa (sem crédito):</span>
                          <span className="font-medium text-orange-400">{formatCurrency(stats.creditos.icms_despesa_desconsiderado)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-red-400">Débito:</span>
                        <span className="font-medium text-red-400">{formatCurrency(stats.debitos.icms)}</span>
                      </div>
                      <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold">
                        <span className="text-[#A1A1AA]">A Pagar:</span>
                        <span className={stats.impostos_pagar.icms > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {formatCurrency(stats.impostos_pagar.icms)}
                        </span>
                      </div>
                      {stats.indicadores?.perc_icms_vendas > 0 && (
                        <div className="text-xs text-[#666] pt-1">
                          {stats.indicadores.perc_icms_vendas.toFixed(2)}% sobre vendas
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* PIS/COFINS - Sempre mostrar */}
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
                
                {/* ISS - Mostrar apenas se for de serviços */}
                {(stats.empresa?.tipo_atividade === 'servicos' || stats.empresa?.tipo_atividade === 'mista') && (
                  <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                    <h4 className="font-semibold text-white mb-3">ISS (Serviços)</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#A1A1AA]">Retido:</span>
                        <span className="font-medium text-white">{formatCurrency(stats.debitos.iss)}</span>
                      </div>
                      <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold">
                        <span className="text-[#A1A1AA]">A Pagar:</span>
                        <span className={stats.impostos_pagar.iss > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {formatCurrency(stats.impostos_pagar.iss)}
                        </span>
                      </div>
                      {stats.indicadores?.perc_iss_faturamento > 0 && (
                        <div className="text-xs text-[#666] pt-1">
                          {stats.indicadores.perc_iss_faturamento.toFixed(2)}% sobre faturamento
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Total de Impostos */}
              <div className="mt-4 bg-[#0C0C0C] border border-[#C8A951]/30 rounded-lg p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Total de Impostos a Pagar</h3>
                    <p className="text-[#A1A1AA] text-sm">
                      {[
                        (stats.empresa?.tipo_atividade === 'comercio' || stats.empresa?.tipo_atividade === 'industria' || stats.empresa?.tipo_atividade === 'mista' || stats.empresa?.apura_icms) ? 'ICMS' : null,
                        'PIS',
                        'COFINS',
                        (stats.empresa?.tipo_atividade === 'servicos' || stats.empresa?.tipo_atividade === 'mista') ? 'ISS' : null
                      ].filter(Boolean).join(' + ')}
                    </p>
                    {stats.indicadores?.perc_total_impostos_faturamento > 0 && (
                      <p className="text-sm text-[#C8A951] mt-1">
                        {stats.indicadores.perc_total_impostos_faturamento.toFixed(2)}% do faturamento
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#C8A951]">{formatCurrency(stats.impostos_pagar.total)}</p>
                    <p className="text-sm text-[#A1A1AA]">Competência {selectedCompetencia}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicadores */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Indicadores</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#141414] rounded-lg p-5 border border-[#2A2A2A]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center">
                      <Percent className="w-6 h-6 text-teal-400" />
                    </div>
                    <div>
                      <h4 className="text-sm text-[#A1A1AA]">Markup Médio</h4>
                      <p className="text-2xl font-bold text-white">{formatPercent(stats.indicadores.markup_percentual)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-3">
                    Calculado com base nas entradas x faturamento
                  </p>
                </div>
                
                <Link to="/reports" className="block">
                  <div className="bg-[#141414] rounded-lg p-5 border border-[#2A2A2A] hover:border-[#C8A951]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-12 h-12 bg-blue-500/10 rounded-lg p-2 text-blue-400" />
                      <div>
                        <h4 className="text-sm text-[#A1A1AA]">Relatórios</h4>
                        <p className="text-lg font-bold text-white">Ver Relatórios</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-3">
                      Relatórios por produto e NCM
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Análise Comparativa Lucro Presumido vs. Lucro Real */}
            {stats.analise_comparativa && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Scale className="w-5 h-5 text-purple-400" />
                  Análise Comparativa: {stats.empresa.regime_tributario === 'lucro_presumido' ? 'Presumido vs. Real' : 'Real vs. Presumido'}
                </h2>
                
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-[#2A2A2A]">
                    {/* Regime Atual */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stats.analise_comparativa.regime_atual === 'lucro_presumido' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-emerald-500 text-white'
                        }`}>
                          REGIME ATUAL
                        </span>
                        <span className="text-sm font-medium text-[#A1A1AA]">
                          {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? 'Lucro Presumido' : 'Lucro Real'}
                        </span>
                      </div>
                      
                      {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">PIS (0.65%):</span>
                            <span className="font-medium text-white">{formatCurrency(stats.analise_comparativa.lucro_presumido.pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">COFINS (3%):</span>
                            <span className="font-medium text-white">{formatCurrency(stats.analise_comparativa.lucro_presumido.cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-[#2A2A2A] pt-2">
                            <span className="text-[#A1A1AA]">Total PIS/COFINS:</span>
                            <span className="text-blue-400">{formatCurrency(stats.analise_comparativa.lucro_presumido.total)}</span>
                          </div>
                          <p className="text-xs text-[#A1A1AA] mt-2">
                            * Sistema cumulativo - sem direito a créditos
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">PIS a pagar:</span>
                            <span className="font-medium text-white">{formatCurrency(stats.analise_comparativa.lucro_real.pis_pagar)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">COFINS a pagar:</span>
                            <span className="font-medium text-white">{formatCurrency(stats.analise_comparativa.lucro_real.cofins_pagar)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-[#2A2A2A] pt-2">
                            <span className="text-[#A1A1AA]">Total PIS/COFINS:</span>
                            <span className="text-emerald-400">{formatCurrency(stats.analise_comparativa.lucro_real.total)}</span>
                          </div>
                          <p className="text-xs text-[#A1A1AA] mt-2">
                            * Sistema não cumulativo - com direito a créditos
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Regime Hipotético */}
                    <div className="p-5 bg-[#0C0C0C]">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2A2A2A] text-[#A1A1AA]">
                          SE FOSSE
                        </span>
                        <span className="text-sm font-medium text-[#A1A1AA]">
                          {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? 'Lucro Real' : 'Lucro Presumido'}
                        </span>
                      </div>
                      
                      {stats.analise_comparativa.regime_atual === 'lucro_presumido' ? (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Débito PIS (1.65%):</span>
                            <span className="font-medium text-red-400">{formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.debito_pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Crédito PIS:</span>
                            <span className="font-medium text-emerald-400">- {formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.credito_pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Débito COFINS (7.6%):</span>
                            <span className="font-medium text-red-400">{formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.debito_cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Crédito COFINS:</span>
                            <span className="font-medium text-emerald-400">- {formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.credito_cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-[#2A2A2A] pt-2">
                            <span className="text-[#A1A1AA]">Total a pagar:</span>
                            <span className="text-emerald-400">{formatCurrency(stats.analise_comparativa.lucro_real_hipotetico.total)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">PIS (0.65%):</span>
                            <span className="font-medium text-white">{formatCurrency(stats.analise_comparativa.lucro_presumido_hipotetico.pis)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">COFINS (3%):</span>
                            <span className="font-medium text-white">{formatCurrency(stats.analise_comparativa.lucro_presumido_hipotetico.cofins)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold border-t border-[#2A2A2A] pt-2">
                            <span className="text-[#A1A1AA]">Total PIS/COFINS:</span>
                            <span className="text-blue-400">{formatCurrency(stats.analise_comparativa.lucro_presumido_hipotetico.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Conclusão */}
                  <div className={`p-4 border-t ${
                    stats.analise_comparativa.diferenca > 0 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : stats.analise_comparativa.diferenca < 0 
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-[#2A2A2A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <Lightbulb className={`w-6 h-6 ${
                          stats.analise_comparativa.diferenca > 0 ? 'text-emerald-400' : 'text-[#A1A1AA]'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {stats.analise_comparativa.diferenca > 0 ? (
                              <>
                                O <strong className="text-[#C8A951]">{stats.analise_comparativa.regime_mais_vantajoso === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'}</strong> seria mais vantajoso
                              </>
                            ) : stats.analise_comparativa.diferenca < 0 ? (
                              <>
                                O regime atual é mais vantajoso para esta competência
                              </>
                            ) : (
                              'Ambos os regimes resultam no mesmo valor'
                            )}
                          </p>
                          <p className="text-xs text-[#A1A1AA]">
                            * Esta é uma análise simplificada apenas de PIS/COFINS. Consulte seu contador para uma análise completa.
                          </p>
                        </div>
                      </div>
                      
                      {stats.analise_comparativa.economia_potencial > 0 && (
                        <div className={`px-4 py-2 rounded-lg ${
                          stats.analise_comparativa.diferenca > 0 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[#2A2A2A] text-white'
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
