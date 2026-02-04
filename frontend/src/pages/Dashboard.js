import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, FileText, CheckCircle, AlertTriangle, TrendingUp, 
  ArrowDownCircle, ArrowUpCircle, Receipt, FileCheck, 
  DollarSign, Percent, Calculator, ChevronRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
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
      <div className="bg-white rounded-xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all hover:border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </Link>
  );

  // Card de valor financeiro
  const ValueCard = ({ title, value, icon: Icon, color, description }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h4 className="text-sm text-gray-600">{title}</h4>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(value)}</p>
        </div>
      </div>
      {description && <p className="text-xs text-gray-500 ml-12">{description}</p>}
    </div>
  );

  // Card de imposto
  const TaxCard = ({ title, credito, debito, pagar }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-green-600">Crédito:</span>
          <span className="font-medium text-green-700">{formatCurrency(credito)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-red-600">Débito:</span>
          <span className="font-medium text-red-700">{formatCurrency(debito)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between text-sm font-bold">
          <span className="text-gray-700">A Pagar:</span>
          <span className={pagar > 0 ? 'text-red-700' : 'text-green-700'}>
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
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          {selectedCompany ? (
            <div>
              <p className="text-red-100">{selectedCompany.razao_social}</p>
              <p className="text-sm text-red-200">Competência: {selectedCompetencia}</p>
            </div>
          ) : (
            <p className="text-red-100">Selecione uma empresa no header para ver as estatísticas</p>
          )}
        </div>

        {!selectedCompany ? (
          <div className="bg-yellow-50 rounded-xl p-8 text-center border border-yellow-200">
            <Building2 className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-yellow-900 mb-2">Selecione uma Empresa</h3>
            <p className="text-yellow-700">
              Clique no botão no header para selecionar a empresa e competência
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
          </div>
        ) : stats ? (
          <>
            {/* Quantidade de Documentos */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Documentos por Tipo</h2>
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

            {/* Validação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/validation" className="block">
                <div className="bg-green-50 rounded-xl p-5 border-2 border-green-200 hover:border-green-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                      <div>
                        <h3 className="font-bold text-green-900">Notas Validadas</h3>
                        <p className="text-sm text-green-700">{stats.validacao.produtos_validados} produtos aprovados</p>
                      </div>
                    </div>
                    <span className="text-4xl font-bold text-green-700">{stats.validacao.notas_validadas}</span>
                  </div>
                </div>
              </Link>
              <Link to="/validation" className="block">
                <div className="bg-orange-50 rounded-xl p-5 border-2 border-orange-200 hover:border-orange-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-10 h-10 text-orange-600" />
                      <div>
                        <h3 className="font-bold text-orange-900">Notas a Validar</h3>
                        <p className="text-sm text-orange-700">{stats.validacao.produtos_total - stats.validacao.produtos_validados} produtos pendentes</p>
                      </div>
                    </div>
                    <span className="text-4xl font-bold text-orange-700">{stats.validacao.notas_pendentes}</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Valores Financeiros */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Valores do Período</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <TaxCard
                  title="ICMS"
                  credito={stats.creditos.icms}
                  debito={stats.debitos.icms}
                  pagar={stats.impostos_pagar.icms}
                />
                <TaxCard
                  title="PIS"
                  credito={stats.creditos.pis}
                  debito={stats.debitos.pis}
                  pagar={stats.impostos_pagar.pis}
                />
                <TaxCard
                  title="COFINS"
                  credito={stats.creditos.cofins}
                  debito={stats.debitos.cofins}
                  pagar={stats.impostos_pagar.cofins}
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
                
                <Link to="/analise-tributaria" className="block">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-5 text-white hover:from-purple-700 hover:to-pink-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Calculator className="w-12 h-12 bg-white/20 rounded-lg p-2" />
                      <div>
                        <h4 className="text-sm text-purple-100">Análise Completa</h4>
                        <p className="text-lg font-bold">Ver Análise Tributária</p>
                      </div>
                    </div>
                    <p className="text-xs text-purple-200 mt-3">
                      Análise detalhada com IA, alertas e recomendações
                    </p>
                  </div>
                </Link>

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
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default Dashboard;
