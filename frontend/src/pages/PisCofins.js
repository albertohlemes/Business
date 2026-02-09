import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Download, RefreshCw, BarChart3, Search, 
  Building2, Calculator, Scale, Package, ArrowUp, ArrowDown,
  ArrowUpDown, Layers
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [apuracao, setApuracao] = useState(null);
  const [divergencias, setDivergencias] = useState(null);
  const [detalhamento, setDetalhamento] = useState(null);
  const [activeTab, setActiveTab] = useState('apuracao'); // apuracao, detalhamento, comparativo, divergencias
  const [expandedSections, setExpandedSections] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [agrupamentoDivergencias, setAgrupamentoDivergencias] = useState('notas'); // notas, ncms, produtos
  const [loadingDivergencias, setLoadingDivergencias] = useState(false);
  const [loadingDetalhamento, setLoadingDetalhamento] = useState(false);
  
  // Estados para ordenação
  const [sortField, setSortField] = useState('valor_base');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar apuração e detalhamento em paralelo
      const [apuracaoRes, detalhamentoRes] = await Promise.all([
        axios.get(`${API}/pis-cofins/apuracao/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/pis-cofins/detalhamento/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers })
      ]);
      
      setApuracao(apuracaoRes.data);
      setDetalhamento(detalhamentoRes.data);
      
      // Buscar divergências com agrupamento padrão
      fetchDivergencias('notas');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchDivergencias = async (agrupamento) => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoadingDivergencias(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/pis-cofins/divergencias/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&agrupamento=${agrupamento}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDivergencias(response.data);
      setAgrupamentoDivergencias(agrupamento);
    } catch (err) {
      console.error('Erro ao carregar divergências:', err);
    } finally {
      setLoadingDivergencias(false);
    }
  };

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia, fetchData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Card de Resumo
  const ResumoCard = ({ titulo, valor, subtitulo, icon: Icon, corIcone = 'bg-[#C8A951]', corValor = 'text-white' }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[#A1A1AA] text-sm">{titulo}</p>
          <p className={`text-xl font-bold ${corValor}`}>{formatCurrency(valor)}</p>
          {subtitulo && <p className="text-xs text-[#666]">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  // Seção colapsável com detalhes
  const SecaoColapsavel = ({ titulo, subtitulo, children, sectionKey, badgeValue }) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">{titulo}</span>
            {badgeValue && (
              <span className="bg-[#C8A951]/20 text-[#C8A951] text-xs px-2 py-0.5 rounded-full">
                {badgeValue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#A1A1AA] text-sm">{subtitulo}</span>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-[#A1A1AA]" /> : <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />}
          </div>
        </button>
        {isExpanded && (
          <div className="border-t border-[#2A2A2A] p-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Tab de Apuração
  const TabApuracao = () => {
    if (!apuracao) return null;
    
    const regime = apuracao.empresa?.regime_tributario || 'LUCRO_REAL';
    const dadosRegime = regime.toUpperCase().includes('REAL') ? apuracao.lucro_real : apuracao.lucro_presumido;
    
    return (
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResumoCard
            titulo="Créditos PIS/COFINS"
            valor={dadosRegime.creditos.total}
            subtitulo={`PIS: ${formatCurrency(dadosRegime.creditos.pis)} | COFINS: ${formatCurrency(dadosRegime.creditos.cofins)}`}
            icon={TrendingUp}
            corIcone="bg-green-600"
            corValor="text-green-400"
          />
          <ResumoCard
            titulo="Débitos PIS/COFINS"
            valor={dadosRegime.debitos_total.total}
            subtitulo={`PIS: ${formatCurrency(dadosRegime.debitos_total.pis)} | COFINS: ${formatCurrency(dadosRegime.debitos_total.cofins)}`}
            icon={TrendingDown}
            corIcone="bg-red-600"
            corValor="text-red-400"
          />
          <ResumoCard
            titulo="Saldo"
            valor={dadosRegime.saldo.total}
            subtitulo={dadosRegime.saldo.total < 0 ? 'Crédito acumulado' : 'Imposto devido'}
            icon={Scale}
            corIcone="bg-blue-600"
            corValor={dadosRegime.saldo.total < 0 ? 'text-green-400' : 'text-amber-400'}
          />
          <ResumoCard
            titulo="Imposto a Pagar"
            valor={dadosRegime.imposto_a_pagar.total}
            subtitulo={`PIS: ${formatCurrency(dadosRegime.imposto_a_pagar.pis)} | COFINS: ${formatCurrency(dadosRegime.imposto_a_pagar.cofins)}`}
            icon={DollarSign}
            corIcone="bg-[#C8A951]"
            corValor="text-[#C8A951]"
          />
        </div>

        {/* Detalhamento de Créditos */}
        <SecaoColapsavel
          titulo="Detalhamento de Créditos"
          subtitulo={formatCurrency(dadosRegime.creditos.total)}
          sectionKey="creditos"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#C8A951]" />
                PIS (Crédito)
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Base de Cálculo</span>
                  <span className="text-white">{formatCurrency(dadosRegime.creditos.total / 0.0925)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Alíquota</span>
                  <span className="text-white">1,65%</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-[#2A2A2A] pt-2 mt-2">
                  <span className="text-[#A1A1AA]">Crédito PIS</span>
                  <span className="text-green-400">{formatCurrency(dadosRegime.creditos.pis)}</span>
                </div>
              </div>
            </div>
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#C8A951]" />
                COFINS (Crédito)
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Base de Cálculo</span>
                  <span className="text-white">{formatCurrency(dadosRegime.creditos.total / 0.0925)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#A1A1AA]">Alíquota</span>
                  <span className="text-white">7,60%</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-[#2A2A2A] pt-2 mt-2">
                  <span className="text-[#A1A1AA]">Crédito COFINS</span>
                  <span className="text-green-400">{formatCurrency(dadosRegime.creditos.cofins)}</span>
                </div>
              </div>
            </div>
          </div>
        </SecaoColapsavel>

        {/* Detalhamento de Débitos */}
        <SecaoColapsavel
          titulo="Detalhamento de Débitos"
          subtitulo={formatCurrency(dadosRegime.debitos_total.total)}
          sectionKey="debitos"
        >
          <div className="space-y-4">
            {/* Débitos de Comércio */}
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                Débitos de Comércio
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[#A1A1AA] text-xs">PIS</p>
                  <p className="text-white font-semibold">{formatCurrency(dadosRegime.debitos_comercio.pis)}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs">COFINS</p>
                  <p className="text-white font-semibold">{formatCurrency(dadosRegime.debitos_comercio.cofins)}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs">Total</p>
                  <p className="text-red-400 font-semibold">{formatCurrency(dadosRegime.debitos_comercio.total)}</p>
                </div>
              </div>
            </div>
            
            {/* Débitos de Serviços */}
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Débitos de Serviços
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[#A1A1AA] text-xs">PIS</p>
                  <p className="text-white font-semibold">{formatCurrency(dadosRegime.debitos_servicos.pis)}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs">COFINS</p>
                  <p className="text-white font-semibold">{formatCurrency(dadosRegime.debitos_servicos.cofins)}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs">Total</p>
                  <p className="text-red-400 font-semibold">{formatCurrency(dadosRegime.debitos_servicos.total)}</p>
                </div>
              </div>
            </div>
          </div>
        </SecaoColapsavel>

        {/* Agrupamento por CFOP + CST */}
        {apuracao.por_cfop_cst && apuracao.por_cfop_cst.length > 0 && (
          <SecaoColapsavel
            titulo="Detalhamento por CFOP + CST"
            subtitulo={`${apuracao.por_cfop_cst.length} combinação(ões)`}
            sectionKey="cfop_cst"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left py-2 px-3 text-[#A1A1AA]">CFOP</th>
                    <th className="text-left py-2 px-3 text-[#A1A1AA]">CST</th>
                    <th className="text-center py-2 px-3 text-[#A1A1AA]">Tipo</th>
                    <th className="text-right py-2 px-3 text-[#A1A1AA]">Qtd</th>
                    <th className="text-right py-2 px-3 text-[#A1A1AA]">Valor Base</th>
                    <th className="text-right py-2 px-3 text-[#A1A1AA]">PIS</th>
                    <th className="text-right py-2 px-3 text-[#A1A1AA]">COFINS</th>
                  </tr>
                </thead>
                <tbody>
                  {apuracao.por_cfop_cst.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                      <td className="py-2 px-3">
                        <span className="font-mono text-white">{item.cfop}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-[#C8A951]">{item.cst}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          item.tipo === 'ENTRADA' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                        }`}>
                          {item.tipo}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-[#A1A1AA]">{item.qtd}</td>
                      <td className="py-2 px-3 text-right text-white">{formatCurrency(item.valor_base)}</td>
                      <td className={`py-2 px-3 text-right ${item.tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(item.valor_pis)}
                      </td>
                      <td className={`py-2 px-3 text-right ${item.tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(item.valor_cofins)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SecaoColapsavel>
        )}

        {/* Top 10 Rankings */}
        {apuracao.top_10 && (
          <>
            <h3 className="text-white font-bold mt-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#C8A951]" />
              Rankings - Maiores Geradores de PIS/COFINS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top 10 Produtos Crédito */}
              <SecaoColapsavel
                titulo="Top 10 Produtos - Crédito"
                subtitulo={`${apuracao.top_10.produtos_credito?.length || 0} produto(s)`}
                sectionKey="top_prod_cred"
                badgeValue={apuracao.top_10.produtos_credito?.length}
              >
                {apuracao.top_10.produtos_credito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.produtos_credito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm truncate">{item.descricao}</span>
                          </div>
                          <span className="text-xs text-[#666] font-mono">NCM: {item.ncm}</span>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-green-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>

              {/* Top 10 Produtos Débito */}
              <SecaoColapsavel
                titulo="Top 10 Produtos - Débito"
                subtitulo={`${apuracao.top_10.produtos_debito?.length || 0} produto(s)`}
                sectionKey="top_prod_deb"
                badgeValue={apuracao.top_10.produtos_debito?.length}
              >
                {apuracao.top_10.produtos_debito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.produtos_debito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm truncate">{item.descricao}</span>
                          </div>
                          <span className="text-xs text-[#666] font-mono">NCM: {item.ncm}</span>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-red-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>

              {/* Top 10 NCMs Crédito */}
              <SecaoColapsavel
                titulo="Top 10 NCMs - Crédito"
                subtitulo={`${apuracao.top_10.ncms_credito?.length || 0} NCM(s)`}
                sectionKey="top_ncm_cred"
                badgeValue={apuracao.top_10.ncms_credito?.length}
              >
                {apuracao.top_10.ncms_credito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.ncms_credito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm font-mono">{item.ncm}</span>
                          </div>
                          {item.produtos && (
                            <span className="text-xs text-[#666]">Ex: {item.produtos.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-green-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>

              {/* Top 10 NCMs Débito */}
              <SecaoColapsavel
                titulo="Top 10 NCMs - Débito"
                subtitulo={`${apuracao.top_10.ncms_debito?.length || 0} NCM(s)`}
                sectionKey="top_ncm_deb"
                badgeValue={apuracao.top_10.ncms_debito?.length}
              >
                {apuracao.top_10.ncms_debito?.length > 0 ? (
                  <div className="space-y-2">
                    {apuracao.top_10.ncms_debito.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                            <span className="text-white text-sm font-mono">{item.ncm}</span>
                          </div>
                          {item.produtos && (
                            <span className="text-xs text-[#666]">Ex: {item.produtos.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-red-400 font-bold">{formatCurrency(item.valor_total)}</p>
                          <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[#666] py-4">Nenhum registro</p>
                )}
              </SecaoColapsavel>
            </div>
          </>
        )}
      </div>
    );
  };

  // Tab Comparativo
  const TabComparativo = () => {
    if (!apuracao) return null;
    
    const { lucro_real, lucro_presumido, comparativo } = apuracao;
    const maisEconomico = comparativo?.regime_mais_economico || 'IGUAL';
    
    return (
      <div className="space-y-6">
        {/* Banner de Indicação */}
        <div className={`rounded-xl p-6 border-2 ${
          maisEconomico === 'LUCRO_REAL' 
            ? 'bg-green-500/10 border-green-500/50' 
            : maisEconomico === 'LUCRO_PRESUMIDO'
            ? 'bg-blue-500/10 border-blue-500/50'
            : 'bg-[#141414] border-[#2A2A2A]'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              maisEconomico === 'LUCRO_REAL' 
                ? 'bg-green-500' 
                : maisEconomico === 'LUCRO_PRESUMIDO'
                ? 'bg-blue-500'
                : 'bg-[#C8A951]'
            }`}>
              {maisEconomico !== 'IGUAL' ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <Scale className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-white text-xl font-bold">
                {maisEconomico === 'LUCRO_REAL' && 'Lucro Real é mais econômico'}
                {maisEconomico === 'LUCRO_PRESUMIDO' && 'Lucro Presumido é mais econômico'}
                {maisEconomico === 'IGUAL' && 'Ambos os regimes são equivalentes'}
              </h3>
              {comparativo?.economia > 0 && (
                <p className="text-[#A1A1AA]">
                  Economia de <span className="text-[#C8A951] font-bold">{formatCurrency(comparativo.economia)}</span> neste período
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Comparativo lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lucro Real */}
          <div className={`bg-[#141414] border-2 rounded-xl overflow-hidden ${
            maisEconomico === 'LUCRO_REAL' ? 'border-green-500' : 'border-[#2A2A2A]'
          }`}>
            <div className="bg-green-600/20 p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Lucro Real
                </h3>
                {maisEconomico === 'LUCRO_REAL' && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">RECOMENDADO</span>
                )}
              </div>
              <p className="text-[#A1A1AA] text-sm mt-1">PIS 1,65% + COFINS 7,60% (não cumulativo)</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(-) Créditos</span>
                <span className="text-green-400 font-semibold">{formatCurrency(lucro_real.creditos.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débitos Comércio</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_real.debitos_comercio.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débitos Serviços</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_real.debitos_servicos.total)}</span>
              </div>
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">(=) Imposto a Pagar</span>
                  <span className="text-[#C8A951] font-bold text-xl">{formatCurrency(lucro_real.imposto_a_pagar.total)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#666]">PIS</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_real.imposto_a_pagar.pis)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">COFINS</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_real.imposto_a_pagar.cofins)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lucro Presumido */}
          <div className={`bg-[#141414] border-2 rounded-xl overflow-hidden ${
            maisEconomico === 'LUCRO_PRESUMIDO' ? 'border-blue-500' : 'border-[#2A2A2A]'
          }`}>
            <div className="bg-blue-600/20 p-4 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Lucro Presumido
                </h3>
                {maisEconomico === 'LUCRO_PRESUMIDO' && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">RECOMENDADO</span>
                )}
              </div>
              <p className="text-[#A1A1AA] text-sm mt-1">PIS 0,65% + COFINS 3,00% (cumulativo)</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(-) Créditos</span>
                <span className="text-green-400 font-semibold">{formatCurrency(lucro_presumido.creditos.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débitos Comércio</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_presumido.debitos_comercio.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">(+) Débitos Serviços</span>
                <span className="text-red-400 font-semibold">{formatCurrency(lucro_presumido.debitos_servicos.total)}</span>
              </div>
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">(=) Imposto a Pagar</span>
                  <span className="text-[#C8A951] font-bold text-xl">{formatCurrency(lucro_presumido.imposto_a_pagar.total)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-[#666]">PIS</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_presumido.imposto_a_pagar.pis)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">COFINS</span>
                  <span className="text-[#A1A1AA]">{formatCurrency(lucro_presumido.imposto_a_pagar.cofins)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras Simples */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#C8A951]" />
            Comparativo Visual
          </h3>
          <div className="space-y-4">
            {/* Barra Lucro Real */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#A1A1AA]">Lucro Real</span>
                <span className="text-white font-semibold">{formatCurrency(lucro_real.imposto_a_pagar.total)}</span>
              </div>
              <div className="bg-[#2A2A2A] rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (lucro_real.imposto_a_pagar.total / Math.max(lucro_real.imposto_a_pagar.total, lucro_presumido.imposto_a_pagar.total, 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
            {/* Barra Lucro Presumido */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#A1A1AA]">Lucro Presumido</span>
                <span className="text-white font-semibold">{formatCurrency(lucro_presumido.imposto_a_pagar.total)}</span>
              </div>
              <div className="bg-[#2A2A2A] rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (lucro_presumido.imposto_a_pagar.total / Math.max(lucro_real.imposto_a_pagar.total, lucro_presumido.imposto_a_pagar.total, 1)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tab Divergências
  const TabDivergencias = () => {
    if (!divergencias) return null;
    
    const { totais, itens, agrupamento } = divergencias;
    
    // Filtrar itens pela busca
    const itensFiltrados = searchTerm
      ? itens.filter(item => {
          const termo = searchTerm.toLowerCase();
          if (agrupamento === 'notas') {
            return item.numero_nfe?.toLowerCase().includes(termo) ||
                   item.emitente?.toLowerCase().includes(termo) ||
                   item.destinatario?.toLowerCase().includes(termo);
          } else if (agrupamento === 'ncms') {
            return item.ncm?.includes(termo) ||
                   item.classificacao?.toLowerCase().includes(termo);
          } else {
            return item.produto?.toLowerCase().includes(termo) ||
                   item.ncm?.includes(termo);
          }
        })
      : itens || [];
    
    return (
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <ResumoCard
            titulo="Documentos"
            valor={null}
            subtitulo={`${totais?.documentos_com_divergencia || 0} de ${totais?.total_documentos || 0}`}
            icon={FileText}
            corIcone="bg-blue-600"
          />
          <ResumoCard
            titulo="Produtos Divergentes"
            valor={null}
            subtitulo={`${totais?.produtos_divergentes || 0} produto(s)`}
            icon={Package}
            corIcone="bg-orange-600"
          />
          <ResumoCard
            titulo="Recolhido a Maior"
            valor={totais?.recolhido_a_maior || 0}
            subtitulo="Crédito a recuperar"
            icon={TrendingUp}
            corIcone="bg-green-600"
            corValor="text-green-400"
          />
          <ResumoCard
            titulo="Recolhido a Menor"
            valor={totais?.recolhido_a_menor || 0}
            subtitulo="Passivo tributário"
            icon={TrendingDown}
            corIcone="bg-red-600"
            corValor="text-red-400"
          />
          <ResumoCard
            titulo="Diferença Total"
            valor={Math.abs((totais?.diferenca_pis_total || 0) + (totais?.diferenca_cofins_total || 0))}
            subtitulo="PIS + COFINS"
            icon={Scale}
            corIcone="bg-[#C8A951]"
            corValor="text-[#C8A951]"
          />
        </div>

        {/* Seletor de Agrupamento */}
        <div className="flex flex-wrap items-center gap-4 bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
          <span className="text-[#A1A1AA] text-sm">Agrupar por:</span>
          <div className="flex gap-2">
            {[
              { key: 'notas', label: 'Notas Fiscais', icon: FileText },
              { key: 'ncms', label: 'NCMs', icon: BarChart3 },
              { key: 'produtos', label: 'Produtos', icon: Package }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => fetchDivergencias(key)}
                disabled={loadingDivergencias}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  agrupamentoDivergencias === key
                    ? 'bg-[#C8A951] text-black'
                    : 'bg-[#2A2A2A] text-white hover:bg-[#333]'
                } disabled:opacity-50`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          {/* Barra de Busca */}
          <div className="flex-1 relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder={`Buscar ${agrupamento === 'notas' ? 'NF, emitente...' : agrupamento === 'ncms' ? 'NCM...' : 'produto, NCM...'}` }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-[#666] focus:border-[#C8A951] focus:outline-none"
            />
          </div>
        </div>

        {/* Loading */}
        {loadingDivergencias && (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* Lista de Divergências */}
        {!loadingDivergencias && itensFiltrados.length === 0 ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg">Nenhuma divergência encontrada</h3>
            <p className="text-[#A1A1AA]">
              {searchTerm ? 'Nenhum item corresponde à busca.' : 'Todos os itens estão com a classificação correta de PIS/COFINS.'}
            </p>
          </div>
        ) : !loadingDivergencias && (
          <div className="space-y-3">
            {/* Agrupamento por NOTAS */}
            {agrupamento === 'notas' && itensFiltrados.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#C8A951]/50 transition-colors"
              >
                <button
                  onClick={() => toggleSection(`nota_${idx}`)}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${item.diferenca_total > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">NF {item.numero_nfe}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${item.tipo_operacao === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {item.tipo_operacao?.toUpperCase()}
                        </span>
                        <span className="text-[#A1A1AA] text-sm">{item.emitente || item.destinatario}</span>
                      </div>
                      <p className="text-[#666] text-xs mt-1">{item.data_emissao} | {item.produtos_divergentes} produto(s) divergente(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[#666] text-xs">Impacto</p>
                      <p className={`text-lg font-bold ${item.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.diferenca_total > 0 ? '+' : ''}{formatCurrency(item.diferenca_total)}
                      </p>
                    </div>
                    {expandedSections[`nota_${idx}`] ? <ChevronUp className="w-5 h-5 text-[#A1A1AA]" /> : <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />}
                  </div>
                </button>
                {expandedSections[`nota_${idx}`] && (
                  <div className="border-t border-[#2A2A2A] p-4 bg-[#0C0C0C]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#666] text-left">
                          <th className="pb-2">Produto</th>
                          <th className="pb-2">NCM</th>
                          <th className="pb-2">CFOP</th>
                          <th className="pb-2">Divergência</th>
                          <th className="pb-2 text-right">Impacto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A2A]">
                        {item.produtos?.map((prod, pIdx) => (
                          <tr key={pIdx} className="text-white">
                            <td className="py-2 max-w-[200px] truncate">{prod.produto}</td>
                            <td className="py-2 font-mono text-[#A1A1AA]">{prod.ncm}</td>
                            <td className="py-2">{prod.cfop}</td>
                            <td className="py-2">
                              {prod.divergencias?.map((d, dIdx) => (
                                <span key={dIdx} className="inline-flex items-center gap-1 mr-2 text-xs bg-[#2A2A2A] px-2 py-0.5 rounded">
                                  {d.campo}: <span className="text-red-400">{d.xml}</span> → <span className="text-green-400">{d.calculado}</span>
                                </span>
                              ))}
                            </td>
                            <td className={`py-2 text-right font-medium ${prod.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {prod.diferenca_total > 0 ? '+' : ''}{formatCurrency(prod.diferenca_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Agrupamento por NCMs */}
            {agrupamento === 'ncms' && itensFiltrados.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#C8A951]/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${item.diferenca_total > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold font-mono">NCM {item.ncm}</span>
                      <span className="bg-[#C8A951]/20 text-[#C8A951] text-xs px-2 py-0.5 rounded">
                        {item.classificacao}
                      </span>
                      <span className="bg-[#2A2A2A] text-[#A1A1AA] text-xs px-2 py-0.5 rounded">
                        {item.ocorrencias} ocorrência(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-[#666] text-xs">Valor Base Total</p>
                        <p className="text-white font-medium">{formatCurrency(item.valor_base_total)}</p>
                      </div>
                      <div>
                        <p className="text-[#666] text-xs">Diferença PIS</p>
                        <p className={`font-medium ${item.diferenca_pis > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diferenca_pis > 0 ? '+' : ''}{formatCurrency(item.diferenca_pis)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#666] text-xs">Diferença COFINS</p>
                        <p className={`font-medium ${item.diferenca_cofins > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diferenca_cofins > 0 ? '+' : ''}{formatCurrency(item.diferenca_cofins)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#666] text-xs">Impacto Total</p>
                        <p className={`text-xl font-bold ${item.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diferenca_total > 0 ? '+' : ''}{formatCurrency(item.diferenca_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Agrupamento por PRODUTOS */}
            {agrupamento === 'produtos' && itensFiltrados.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#C8A951]/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${item.diferenca_total > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{item.produto}</span>
                      <span className="bg-[#2A2A2A] text-[#A1A1AA] text-xs px-2 py-0.5 rounded font-mono">
                        NCM {item.ncm}
                      </span>
                      <span className="bg-[#C8A951]/20 text-[#C8A951] text-xs px-2 py-0.5 rounded">
                        {item.ocorrencias} NF(s)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-[#666] text-xs">Valor Base Total</p>
                        <p className="text-white font-medium">{formatCurrency(item.valor_base_total)}</p>
                      </div>
                      <div>
                        <p className="text-[#666] text-xs">Diferença PIS</p>
                        <p className={`font-medium ${item.diferenca_pis > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diferenca_pis > 0 ? '+' : ''}{formatCurrency(item.diferenca_pis)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#666] text-xs">Diferença COFINS</p>
                        <p className={`font-medium ${item.diferenca_cofins > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diferenca_cofins > 0 ? '+' : ''}{formatCurrency(item.diferenca_cofins)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#666] text-xs">Impacto Total</p>
                        <p className={`text-xl font-bold ${item.diferenca_total > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.diferenca_total > 0 ? '+' : ''}{formatCurrency(item.diferenca_total)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render principal
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-[#C8A951]" />
              PIS e COFINS
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Apuração, comparativo de regimes e análise de divergências
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-2 rounded-lg transition-colors font-medium"
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
                  Regime: <span className="text-[#C8A951]">{selectedCompany.regime_tributario?.replace('_', ' ')?.toUpperCase() || 'NÃO DEFINIDO'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2A2A2A] pb-3">
          <button
            onClick={() => setActiveTab('apuracao')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'apuracao'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-apuracao"
          >
            <Calculator className="w-4 h-4" />
            Apuração
          </button>
          <button
            onClick={() => setActiveTab('comparativo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'comparativo'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-comparativo"
          >
            <Scale className="w-4 h-4" />
            Comparativo
          </button>
          <button
            onClick={() => setActiveTab('divergencias')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'divergencias'
                ? 'bg-[#C8A951] text-black'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-divergencias"
          >
            <AlertTriangle className="w-4 h-4" />
            Divergências
            {divergencias?.totais?.produtos_divergentes > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {divergencias.totais.produtos_divergentes}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a apuração de PIS/COFINS</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'apuracao' && <TabApuracao />}
            {activeTab === 'comparativo' && <TabComparativo />}
            {activeTab === 'divergencias' && <TabDivergencias />}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PisCofins;
