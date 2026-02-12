import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { useUpload } from '../context/UploadContext';
import { 
  Building2, FileText, CheckCircle, AlertTriangle, TrendingUp, 
  ArrowDownCircle, ArrowUpCircle, Receipt, FileCheck, 
  DollarSign, Percent, Calculator, ChevronRight, Scale, Lightbulb, X, Gift
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia, openSelector } = useAppContext();
  const { documentsVersion } = useUpload();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBeneficioModal, setShowBeneficioModal] = useState(false);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchStats();
    }
  }, [selectedCompany, selectedCompetencia, documentsVersion]);  // Adiciona documentsVersion

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

  // Card de estatística simples com animações melhoradas
  const StatCard = ({ icon: Icon, title, value, color, link, subtitle }) => (
    <Link to={link} className="block group animate-fade-in">
      <div className="bg-[#141414] rounded-lg p-5 border border-[#2A2A2A] card-interactive">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
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
                    link="/documents?operacao=entrada&tipo=nfe"
                    subtitle="Mercadorias"
                  />
                  <StatCard
                    icon={FileText}
                    title="CT-e Entrada"
                    value={stats.quantidades.cte_entrada || 0}
                    color="bg-cyan-600"
                    link="/documents?operacao=entrada&tipo=cte"
                    subtitle="Frete Tomado"
                  />
                  <StatCard
                    icon={FileCheck}
                    title="NFS-e Tomados"
                    value={stats.quantidades.nfse_tomados || 0}
                    color="bg-orange-600"
                    link="/documents?operacao=entrada&tipo=servicos_tomados"
                    subtitle="Serviços Tomados"
                  />
                  <StatCard
                    icon={FileText}
                    title="Outros Docs"
                    value={stats.quantidades.outros_entrada || 0}
                    color="bg-slate-600"
                    link="/documents?operacao=entrada&tipo=outros"
                    subtitle="Energia, Internet..."
                  />
                  <div className="bg-[#0C0C0C] rounded-lg p-5 border border-[#2A2A2A]">
                    <h3 className="text-[#666] text-sm font-medium mb-1">Total Entradas</h3>
                    <p className="text-2xl font-bold text-blue-400">{stats.quantidades.total_entradas || (stats.quantidades.nfe_entrada + (stats.quantidades.cte_entrada || 0) + (stats.quantidades.nfse_tomados || 0) + (stats.quantidades.outros_entrada || 0))}</p>
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
                      link="/documents?operacao=saida&tipo=nfe"
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
                      link="/documents?operacao=saida&tipo=nfce"
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
                      link="/documents?operacao=saida&tipo=cte"
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
                      link="/documents?operacao=saida&tipo=servicos_prestados"
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
                <div className="flex flex-col gap-4">
                  <div className="bg-[#141414] rounded-lg p-5 border border-blue-500/30 flex-1">
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
                      {/* Outros Documentos - sempre exibido */}
                      <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA]">Outros Documentos</span>
                        <span className="text-white font-medium">{formatCurrency(stats.valores.entradas?.outros || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicador COMPRAS */}
                  <div className="bg-gradient-to-r from-blue-900/30 to-blue-950/30 rounded-lg p-4 border border-blue-500/30 h-[120px] flex items-center">
                    <div className="flex items-center justify-between w-full">
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

                {/* Card de Saídas - Dinâmico por tipo de atividade */}
                <div className="flex flex-col gap-4">
                  <div className="bg-[#141414] rounded-lg p-5 border border-green-500/30 flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                        <ArrowUpCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {stats.empresa.tipo_atividade === 'servicos' ? 'Serviços Prestados' : 'Total Saídas'}
                        </h3>
                        <p className="text-green-400 text-xl font-bold">{formatCurrency(stats.valores.saidas?.total || (stats.valores.total_vendas + stats.valores.total_cupons + stats.valores.total_servicos))}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {/* NF-e (Vendas) - apenas para comércio/indústria/mista */}
                      {stats.empresa.tipo_atividade !== 'servicos' && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">NF-e (Vendas)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.nfe || stats.valores.total_vendas)}</span>
                        </div>
                      )}
                      {/* NFC-e (Cupons) - apenas para comércio/mista */}
                      {['comercio', 'mista'].includes(stats.empresa.tipo_atividade) && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">NFC-e (Cupons)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.nfce || stats.valores.total_cupons)}</span>
                        </div>
                      )}
                      {/* NFS-e (Serviços) - sempre mostra para serviços/mista */}
                      {['servicos', 'mista'].includes(stats.empresa.tipo_atividade) && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">NFS-e (Serviços Prestados)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.servicos_prestados || 0)}</span>
                        </div>
                      )}
                      {/* CT-e (Frete Prestado) - se houver */}
                      {(stats.valores.saidas?.cte || 0) > 0 && (
                        <div className="flex justify-between py-1 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">CT-e (Frete Prestado)</span>
                          <span className="text-white font-medium">{formatCurrency(stats.valores.saidas?.cte || 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicador VENDAS ou SERVIÇOS PRESTADOS - Dinâmico */}
                  <div className="bg-gradient-to-r from-green-900/30 to-green-950/30 rounded-lg p-4 border border-green-500/30 h-[120px] flex items-center">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h3 className="text-[#A1A1AA] text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          {stats.empresa.tipo_atividade === 'servicos' ? 'SERVIÇOS PRESTADOS' : 'VENDAS (Líquidas)'}
                        </h3>
                        <p className="text-green-400 text-2xl font-bold">
                          {formatCurrency(
                            stats.empresa.tipo_atividade === 'servicos' 
                              ? (stats.valores.saidas?.servicos_prestados || 0)
                              : (stats.valores.vendas_liquidas?.liquidas || 0)
                          )}
                        </p>
                        <p className="text-xs text-[#666] mt-1">
                          {stats.empresa.tipo_atividade === 'servicos' 
                            ? 'Total de NFS-e emitidas' 
                            : 'Vendas − Devoluções de Clientes'}
                        </p>
                      </div>
                      {stats.empresa.tipo_atividade !== 'servicos' && stats.valores.vendas_liquidas?.devolucoes > 0 && (
                        <div className="text-right">
                          <span className="text-xs text-red-400">Devoluções</span>
                          <p className="text-sm text-red-400 line-through">{formatCurrency(stats.valores.vendas_liquidas.devolucoes)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Markup - Apenas para comércio/indústria/mista (não para serviços puros) */}
              {stats.empresa.tipo_atividade !== 'servicos' && (
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
              )}
            </div>

            {/* Impostos - Diferenciado por regime tributário */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Impostos</h2>
              
              {/* === SIMPLES NACIONAL === */}
              {stats.empresa?.regime_tributario === 'simples_nacional' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* DAS do Mês */}
                    <div className="bg-gradient-to-br from-[#C8A951]/20 to-[#C8A951]/5 rounded-lg border border-[#C8A951]/30 p-4">
                      <h4 className="font-semibold text-[#C8A951] mb-3">DAS do Mês</h4>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-[#C8A951]">
                          {formatCurrency(stats.simples?.das_valor || 0)}
                        </p>
                        <div className="text-xs text-[#A1A1AA] space-y-0.5">
                          {stats.simples?.iss_retido?.valor > 0 ? (
                            <>
                              <div>Alíquota: <span className="text-[#C8A951] font-semibold">{formatPercent(stats.simples?.aliquota_sem_iss || stats.simples?.aliquota_efetiva || 0)}</span></div>
                              <div className="text-[#666]">(sem ISS retido)</div>
                            </>
                          ) : (
                            <div>Alíquota Efetiva: <span className="text-[#C8A951] font-semibold">{formatPercent(stats.simples?.aliquota_efetiva || 0)}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* DIFAL do Mês */}
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg border border-purple-500/30 p-4">
                      <h4 className="font-semibold text-purple-400 mb-3">DIFAL do Mês</h4>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-purple-400">
                          {formatCurrency(stats.simples?.difal_valor || 0)}
                        </p>
                        <div className="text-xs text-[#A1A1AA] space-y-0.5">
                          <div>% Compras Inter.: <span className="text-purple-400 font-semibold">{formatPercent(stats.simples?.difal_percentual_compras || 0)}</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Compras Interestaduais */}
                    <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                      <h4 className="font-semibold text-white mb-3">Compras Interestaduais</h4>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(stats.simples?.compras_interestaduais || 0)}
                        </p>
                        <div className="text-xs text-[#A1A1AA] space-y-0.5">
                          <div>{stats.simples?.qtd_notas_interestaduais || 0} notas de outros estados</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Total de Impostos (DAS + DIFAL) */}
                    <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-lg border border-emerald-500/30 p-4">
                      <h4 className="font-semibold text-emerald-400 mb-3">Total Impostos</h4>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-emerald-400">
                          {formatCurrency((stats.simples?.das_valor || 0) + (stats.simples?.difal_valor || 0))}
                        </p>
                        <div className="text-xs text-[#A1A1AA] space-y-0.5">
                          <div>% Saídas: <span className="text-emerald-400 font-semibold">{formatPercent(stats.simples?.percentual_sobre_saidas || 0)}</span></div>
                          <div>% Vendas: <span className="text-emerald-400 font-semibold">{formatPercent(stats.simples?.percentual_sobre_vendas || 0)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* ISS Retido na Fonte - Mostrar se houver */}
                  {stats.simples?.iss_retido?.valor > 0 && (
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-400">ISS Retido na Fonte</h4>
                            <p className="text-xs text-[#A1A1AA]">Deduzido do DAS - {stats.simples?.iss_retido?.faturamento_com_iss_retido > 0 ? formatCurrency(stats.simples.iss_retido.faturamento_com_iss_retido) + ' com retenção' : ''}</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-amber-400">
                          {formatCurrency(stats.simples?.iss_retido?.valor || 0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Total de Impostos - Simples Nacional */}
                  <div className="mt-4 bg-[#0C0C0C] border border-[#C8A951]/30 rounded-lg p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Total de Impostos a Pagar</h3>
                        <p className="text-[#A1A1AA] text-sm">DAS + DIFAL</p>
                        <p className="text-sm text-[#C8A951] mt-1">
                          {formatPercent(stats.simples?.percentual_sobre_vendas || 0)} sobre vendas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-[#C8A951]">
                          {formatCurrency((stats.simples?.das_valor || 0) + (stats.simples?.difal_valor || 0))}
                        </p>
                        <p className="text-sm text-[#A1A1AA]">Competência {selectedCompetencia}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* === LUCRO PRESUMIDO / LUCRO REAL === */
                <>
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
                          {stats.creditos.icms_beneficio_desconsiderado > 0 && (
                            <button 
                              onClick={() => setShowBeneficioModal(true)}
                              className="w-full bg-purple-500/10 -mx-2 px-2 py-2 rounded space-y-1 hover:bg-purple-500/20 transition-colors cursor-pointer text-left border border-purple-500/30"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <Gift className="w-4 h-4 text-purple-400" />
                                  <span className="text-purple-400 font-medium">Benefício Fiscal (dedução):</span>
                                </div>
                                <span className="font-bold text-purple-400">{formatCurrency(stats.creditos.icms_beneficio_desconsiderado)}</span>
                              </div>
                              {stats.creditos.total_produtos_beneficio_excluidos > 0 && (
                                <div className="text-xs text-purple-300/70 flex items-center gap-1">
                                  <span>📋 {stats.creditos.total_produtos_beneficio_excluidos} produtos sem crédito</span>
                                  <span className="text-purple-400">• Clique para ver lista</span>
                                </div>
                              )}
                            </button>
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
                          <div className="text-xs text-[#666] pt-1 space-y-0.5">
                            <div>% Saídas: {((stats.impostos_pagar.icms / (stats.valores.saidas?.total || 1)) * 100).toFixed(2)}%</div>
                            <div>% Vendas: {((stats.impostos_pagar.icms / (stats.valores.vendas_liquidas?.liquidas || 1)) * 100).toFixed(2)}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* PIS */}
                    <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                      <h4 className="font-semibold text-white mb-3">PIS</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400">Crédito:</span>
                          <span className="font-medium text-emerald-400">{formatCurrency(stats.creditos.pis)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400">Débito:</span>
                          <span className="font-medium text-red-400">{formatCurrency(stats.debitos.pis)}</span>
                        </div>
                        <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold">
                          <span className="text-[#A1A1AA]">A Pagar:</span>
                          <span className={stats.impostos_pagar.pis > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {formatCurrency(stats.impostos_pagar.pis)}
                          </span>
                        </div>
                        <div className="text-xs text-[#666] pt-1 space-y-0.5">
                          <div>% Saídas: {((stats.impostos_pagar.pis / (stats.valores.saidas?.total || 1)) * 100).toFixed(2)}%</div>
                          <div>% Vendas: {((stats.impostos_pagar.pis / (stats.valores.vendas_liquidas?.liquidas || 1)) * 100).toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>

                    {/* COFINS */}
                    <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                      <h4 className="font-semibold text-white mb-3">COFINS</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400">Crédito:</span>
                          <span className="font-medium text-emerald-400">{formatCurrency(stats.creditos.cofins)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400">Débito:</span>
                          <span className="font-medium text-red-400">{formatCurrency(stats.debitos.cofins)}</span>
                        </div>
                        <div className="border-t border-[#2A2A2A] pt-2 flex justify-between text-sm font-bold">
                          <span className="text-[#A1A1AA]">A Pagar:</span>
                          <span className={stats.impostos_pagar.cofins > 0 ? 'text-red-400' : 'text-emerald-400'}>
                            {formatCurrency(stats.impostos_pagar.cofins)}
                          </span>
                        </div>
                        <div className="text-xs text-[#666] pt-1 space-y-0.5">
                          <div>% Saídas: {((stats.impostos_pagar.cofins / (stats.valores.saidas?.total || 1)) * 100).toFixed(2)}%</div>
                          <div>% Vendas: {((stats.impostos_pagar.cofins / (stats.valores.vendas_liquidas?.liquidas || 1)) * 100).toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>
                    
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
                          <div className="text-xs text-[#666] pt-1 space-y-0.5">
                            <div>% Saídas: {((stats.impostos_pagar.iss / (stats.valores.saidas?.total || 1)) * 100).toFixed(2)}%</div>
                            <div>% Vendas: {((stats.impostos_pagar.iss / (stats.valores.vendas_liquidas?.liquidas || 1)) * 100).toFixed(2)}%</div>
                          </div>
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
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Modal de Benefício Fiscal - Lista de Produtos Desconsiderados */}
      {showBeneficioModal && stats?.creditos?.produtos_beneficio_excluidos && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Benefício Fiscal - ICMS</h3>
                  <p className="text-sm text-[#A1A1AA]">
                    Produtos sem aproveitamento de crédito ({stats.creditos.total_produtos_beneficio_excluidos} itens)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowBeneficioModal(false)}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#666]" />
              </button>
            </div>

            {/* Resumo */}
            <div className="p-4 bg-purple-500/10 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <span className="text-purple-300">Total ICMS não aproveitado:</span>
                <span className="text-2xl font-bold text-purple-400">
                  {formatCurrency(stats.creditos.icms_beneficio_desconsiderado)}
                </span>
              </div>
              <p className="text-xs text-purple-300/70 mt-1">
                Estes produtos tiveram o crédito de ICMS desconsiderado conforme configuração do benefício fiscal da empresa.
              </p>
            </div>

            {/* Lista de Produtos */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#141414]">
                  <tr className="text-left text-xs text-[#666] border-b border-[#2A2A2A]">
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium text-center">NCM</th>
                    <th className="pb-2 font-medium text-right">ICMS Desconsiderado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.creditos.produtos_beneficio_excluidos.map((produto, idx) => (
                    <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                      <td className="py-2 text-sm text-white">{produto.descricao}</td>
                      <td className="py-2 text-sm text-[#A1A1AA] text-center font-mono">{produto.ncm || '-'}</td>
                      <td className="py-2 text-sm text-purple-400 text-right font-medium">
                        {formatCurrency(produto.valor_icms)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {stats.creditos.total_produtos_beneficio_excluidos > 50 && (
                <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg text-center">
                  <p className="text-sm text-[#666]">
                    Mostrando os primeiros 50 de {stats.creditos.total_produtos_beneficio_excluidos} produtos.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2A2A2A] flex justify-end">
              <button
                onClick={() => setShowBeneficioModal(false)}
                className="px-4 py-2 bg-[#C8A951] hover:bg-[#D4B962] text-black font-medium rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
