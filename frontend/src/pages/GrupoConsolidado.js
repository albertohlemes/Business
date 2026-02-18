import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Building2, Users,
  BarChart3, Calculator, Scale, RefreshCw, AlertTriangle,
  Package, ShoppingCart, Zap, Info, Award, Calendar, Target,
  ArrowRight, ArrowDown, ArrowUp, CheckCircle, Loader2, Settings,
  FileText, Truck, Percent, Download
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Página de Grupo Consolidado
 * Exibe dados consolidados de todas as empresas do grupo (matriz + filiais)
 * Replica EXATAMENTE as telas originais de cada módulo fiscal
 */
const GrupoConsolidado = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [activeTab, setActiveTab] = useState('indicadores');
  const [loading, setLoading] = useState(true);
  const [grupoInfo, setGrupoInfo] = useState(null);
  const [dadosGrupo, setDadosGrupo] = useState(null);
  const [dadosRet, setDadosRet] = useState(null);
  const [dadosReforma, setDadosReforma] = useState(null);
  const [error, setError] = useState(null);
  
  // Estado para RET
  const [retActiveTab, setRetActiveTab] = useState('periodo');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  // Buscar informações do grupo
  const fetchGrupoInfo = useCallback(async () => {
    if (!selectedCompany?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/empresa/${selectedCompany.id}/grupo-info`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGrupoInfo(response.data);
    } catch (err) {
      console.error('Erro ao buscar info do grupo:', err);
      setGrupoInfo(null);
    }
  }, [selectedCompany?.id]);

  // Buscar dados consolidados do grupo
  const fetchDadosGrupo = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar dados em paralelo
      const [grupoRes, retRes, reformaRes] = await Promise.all([
        axios.get(`${API}/empresa/${selectedCompany.id}/impostos-grupo?competencia=${selectedCompetencia}`, { headers }),
        axios.get(`${API}/empresa/${selectedCompany.id}/grupo-ret?competencia=${selectedCompetencia}&tipo=periodo`, { headers }).catch(() => null),
        axios.get(`${API}/empresa/${selectedCompany.id}/grupo-reforma?competencia=${selectedCompetencia}`, { headers }).catch(() => null)
      ]);
      
      if (grupoRes.data.is_grupo) {
        setDadosGrupo(grupoRes.data);
        setDadosRet(retRes?.data);
        setDadosReforma(reformaRes?.data);
      } else {
        setError('Esta empresa não é matriz de nenhum grupo empresarial');
      }
    } catch (err) {
      console.error('Erro ao buscar dados do grupo:', err);
      setError('Erro ao carregar dados do grupo');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, selectedCompetencia]);

  useEffect(() => {
    fetchGrupoInfo();
  }, [fetchGrupoInfo]);

  useEffect(() => {
    if (grupoInfo?.is_matriz) {
      fetchDadosGrupo();
    } else if (grupoInfo) {
      setLoading(false);
    }
  }, [grupoInfo, fetchDadosGrupo]);

  const tabs = [
    { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
    { id: 'icms', label: 'ICMS', icon: Calculator },
    { id: 'pis_cofins', label: 'PIS/COFINS', icon: DollarSign },
    { id: 'irpj_csll', label: 'IRPJ/CSLL', icon: Calculator },
    { id: 'ret', label: 'RET', icon: Scale },
    { id: 'reforma', label: 'Reforma Tributária', icon: Zap },
  ];

  // ==============================
  // COMPONENTES REPLICADOS DO ICMS
  // ==============================
  
  // Card de Empresa com layout replicado
  const EmpresaCard = ({ titulo, empresa, tipo = 'individual', children }) => (
    <div className={`bg-[#0C0C0C] rounded-xl border ${
      tipo === 'consolidado' 
        ? 'border-[#C8A951]/50 bg-gradient-to-br from-[#0C0C0C] to-[#1A1A1A]' 
        : tipo === 'matriz'
          ? 'border-blue-500/30'
          : 'border-[#2A2A2A]'
    } overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${
        tipo === 'consolidado' ? 'border-[#C8A951]/30 bg-[#C8A951]/10' :
        tipo === 'matriz' ? 'border-blue-500/30 bg-blue-500/10' :
        'border-[#2A2A2A] bg-[#141414]'
      }`}>
        <div className="flex items-center gap-2">
          {tipo === 'consolidado' ? (
            <Users className="w-5 h-5 text-[#C8A951]" />
          ) : (
            <Building2 className={`w-5 h-5 ${tipo === 'matriz' ? 'text-blue-400' : 'text-[#A1A1AA]'}`} />
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${
              tipo === 'consolidado' ? 'text-[#C8A951]' : 'text-white'
            }`}>{titulo}</h3>
            {empresa?.cnpj && (
              <p className="text-xs text-[#A1A1AA]">{empresa.cnpj} {empresa.uf && `- ${empresa.uf}`}</p>
            )}
          </div>
          {tipo !== 'consolidado' && (
            <span className={`ml-auto text-xs px-2 py-0.5 rounded flex-shrink-0 ${
              tipo === 'matriz' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#2A2A2A] text-[#A1A1AA]'
            }`}>
              {tipo === 'matriz' ? 'MATRIZ' : 'FILIAL'}
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );

  // Linha de valor
  const ValorLinha = ({ label, valor, color = 'text-white', bold = false }) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-[#A1A1AA] text-sm">{label}</span>
      <span className={`${color} ${bold ? 'font-bold text-lg' : 'font-medium'}`}>
        {formatCurrency(valor)}
      </span>
    </div>
  );

  // ==============================
  // RENDERIZAÇÃO DAS ABAS
  // ==============================

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
        </div>
      );
    }

    if (error || !dadosGrupo) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <p className="text-white text-lg mb-2">Não foi possível carregar os dados</p>
          <p className="text-[#A1A1AA]">{error || 'Dados não disponíveis'}</p>
        </div>
      );
    }

    const { matriz, filiais, consolidado } = dadosGrupo;

    // Funções auxiliares
    const calcMarkup = (vendas, compras) => {
      if (!compras || compras === 0) return 0;
      return ((vendas / compras) - 1) * 100;
    };

    const getSaldoImposto = (imposto) => {
      const saldo = imposto?.saldo || 0;
      if (saldo < 0) {
        return { valor: Math.abs(saldo), tipo: 'recuperar', color: 'text-green-400' };
      } else if (saldo > 0) {
        return { valor: saldo, tipo: 'pagar', color: 'text-red-400' };
      }
      return { valor: 0, tipo: 'neutro', color: 'text-[#A1A1AA]' };
    };

    // Card de Imposto Individual
    const ImpostoCard = ({ nome, imposto, faturamento, corNome = 'text-white' }) => {
      const saldo = getSaldoImposto(imposto);
      const percentual = faturamento > 0 ? (saldo.valor / faturamento * 100) : 0;
      
      return (
        <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex justify-between items-center mb-3">
            <h4 className={`font-semibold ${corNome}`}>{nome}</h4>
            <span className={`text-xs px-2 py-0.5 rounded ${
              saldo.tipo === 'recuperar' ? 'bg-green-500/20 text-green-400' :
              saldo.tipo === 'pagar' ? 'bg-red-500/20 text-red-400' :
              'bg-[#2A2A2A] text-[#A1A1AA]'
            }`}>
              {saldo.tipo === 'recuperar' ? 'CREDOR' : saldo.tipo === 'pagar' ? 'DEVEDOR' : 'NEUTRO'}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Débito</span>
              <span className="text-red-400">{formatCurrency(imposto?.debito)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Crédito</span>
              <span className="text-green-400">{formatCurrency(imposto?.credito)}</span>
            </div>
            <div className="border-t border-[#2A2A2A] my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-white">{saldo.tipo === 'recuperar' ? 'A Recuperar' : 'A Pagar'}</span>
              <span className={saldo.color}>{formatCurrency(saldo.valor)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#A1A1AA]">% s/ Faturamento</span>
              <span className="text-[#A1A1AA]">{formatPercent(percentual)}</span>
            </div>
          </div>
        </div>
      );
    };

    switch (activeTab) {
      // ==============================
      // ABA INDICADORES (JÁ IMPLEMENTADA)
      // ==============================
      case 'indicadores':
        const markupMatriz = calcMarkup(matriz?.indicadores?.vendas, matriz?.indicadores?.compras);
        const markupConsolidado = calcMarkup(consolidado?.indicadores?.vendas, consolidado?.indicadores?.compras);
        
        return (
          <div className="space-y-6">
            {/* Cards de Indicadores Consolidados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#0C0C0C] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs">Total Entradas</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(consolidado?.indicadores?.entradas)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs">Total Compras</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(consolidado?.indicadores?.compras)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs">Total Saídas</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(consolidado?.indicadores?.saidas)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C8A951]/20 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-[#C8A951]" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs">Total Vendas</p>
                    <p className="text-xl font-bold text-[#C8A951]">{formatCurrency(consolidado?.indicadores?.vendas)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-5 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs">Markup Consolidado</p>
                    <p className={`text-xl font-bold ${markupConsolidado >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {markupConsolidado >= 0 ? '+' : ''}{formatPercent(markupConsolidado)}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">Vendas / Compras</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Impostos Individualizados */}
            <div className="bg-[#0C0C0C] rounded-xl p-6 border border-[#C8A951]/30">
              <h3 className="text-lg font-semibold text-[#C8A951] mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Impostos Consolidados do Grupo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <ImpostoCard nome="PIS" imposto={consolidado?.pis} faturamento={consolidado?.faturamento} corNome="text-blue-400" />
                <ImpostoCard nome="COFINS" imposto={consolidado?.cofins} faturamento={consolidado?.faturamento} corNome="text-blue-400" />
                <ImpostoCard nome="ICMS" imposto={consolidado?.icms} faturamento={consolidado?.faturamento} corNome="text-orange-400" />
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                  <h4 className="font-semibold text-purple-400 mb-3">IRPJ</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Base</span>
                      <span className="text-white">{formatCurrency(consolidado?.irpj?.base)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">IRPJ 15%</span>
                      <span className="text-purple-400">{formatCurrency(consolidado?.irpj?.devido)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Adicional</span>
                      <span className="text-purple-400">{formatCurrency(consolidado?.irpj?.adicional)}</span>
                    </div>
                    <div className="border-t border-[#2A2A2A] my-2" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Total IRPJ</span>
                      <span className="text-red-400">{formatCurrency(consolidado?.irpj?.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                  <h4 className="font-semibold text-purple-400 mb-3">CSLL</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Base</span>
                      <span className="text-white">{formatCurrency(consolidado?.csll?.base)}</span>
                    </div>
                    <div className="border-t border-[#2A2A2A] my-2" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">CSLL 9%</span>
                      <span className="text-red-400">{formatCurrency(consolidado?.csll?.devido)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Totalizador por Imposto */}
              <div className="mt-4 p-4 bg-[#C8A951]/10 rounded-lg border border-[#C8A951]/30">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-sm text-[#A1A1AA]">PIS</p>
                    <p className={`text-xl font-bold ${(consolidado?.pis?.saldo || 0) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(Math.abs(consolidado?.pis?.saldo || 0))}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">
                      {(consolidado?.pis?.saldo || 0) < 0 ? 'A Recuperar' : 'A Pagar'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">COFINS</p>
                    <p className={`text-xl font-bold ${(consolidado?.cofins?.saldo || 0) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(Math.abs(consolidado?.cofins?.saldo || 0))}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">
                      {(consolidado?.cofins?.saldo || 0) < 0 ? 'A Recuperar' : 'A Pagar'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">ICMS</p>
                    <p className={`text-xl font-bold ${(consolidado?.icms?.saldo || 0) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(Math.abs(consolidado?.icms?.saldo || 0))}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">
                      {(consolidado?.icms?.saldo || 0) < 0 ? 'A Recuperar' : 'A Pagar'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">IRPJ</p>
                    <p className="text-xl font-bold text-red-400">
                      {formatCurrency(consolidado?.irpj?.total || 0)}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">A Pagar</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">CSLL</p>
                    <p className="text-xl font-bold text-red-400">
                      {formatCurrency(consolidado?.csll?.devido || 0)}
                    </p>
                    <p className="text-xs text-[#A1A1AA]">A Pagar</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo por Empresa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <ValorLinha label="Entradas" valor={matriz?.indicadores?.entradas} />
                <ValorLinha label="Compras" valor={matriz?.indicadores?.compras} />
                <ValorLinha label="Saídas" valor={matriz?.indicadores?.saidas} />
                <ValorLinha label="Vendas" valor={matriz?.indicadores?.vendas} />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#A1A1AA] text-sm">Markup</span>
                    <span className={`font-bold ${markupMatriz >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {markupMatriz >= 0 ? '+' : ''}{formatPercent(markupMatriz)}
                    </span>
                  </div>
                  <ValorLinha label="Total Federal" valor={matriz?.total_federal} color="text-[#C8A951]" bold />
                </div>
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => {
                  const markupFilial = calcMarkup(filial?.indicadores?.vendas, filial?.indicadores?.compras);
                  return (
                    <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                      <ValorLinha label="Entradas" valor={filial?.indicadores?.entradas} />
                      <ValorLinha label="Compras" valor={filial?.indicadores?.compras} />
                      <ValorLinha label="Saídas" valor={filial?.indicadores?.saidas} />
                      <ValorLinha label="Vendas" valor={filial?.indicadores?.vendas} />
                      <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-[#A1A1AA] text-sm">Markup</span>
                          <span className={`font-bold ${markupFilial >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                            {markupFilial >= 0 ? '+' : ''}{formatPercent(markupFilial)}
                          </span>
                        </div>
                        <ValorLinha label="Total Federal" valor={filial?.total_federal} color="text-[#C8A951]" bold />
                      </div>
                    </EmpresaCard>
                  );
                })}
              </div>

              <EmpresaCard titulo="CONSOLIDADO DO GRUPO" tipo="consolidado">
                <ValorLinha label="Entradas" valor={consolidado?.indicadores?.entradas} />
                <ValorLinha label="Compras" valor={consolidado?.indicadores?.compras} />
                <ValorLinha label="Saídas" valor={consolidado?.indicadores?.saidas} />
                <ValorLinha label="Vendas" valor={consolidado?.indicadores?.vendas} />
                <div className="border-t border-[#C8A951]/30 mt-2 pt-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#A1A1AA] text-sm">Markup</span>
                    <span className={`font-bold ${markupConsolidado >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                      {markupConsolidado >= 0 ? '+' : ''}{formatPercent(markupConsolidado)}
                    </span>
                  </div>
                  <ValorLinha label="Total Federal" valor={consolidado?.total_federal} color="text-[#C8A951]" bold />
                  <p className="text-center text-sm text-[#A1A1AA] mt-2">
                    {formatPercent(consolidado?.percentual)} do faturamento
                  </p>
                </div>
              </EmpresaCard>
            </div>
          </div>
        );

      // ==============================
      // ABA ICMS - REPLICA ValidadorICMS
      // ==============================
      case 'icms':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-500 font-medium">Importante</p>
                <p className="text-sm text-[#A1A1AA]">
                  O ICMS é recolhido separadamente por cada empresa (UF de origem). 
                  O consolidado é apenas para fins de análise gerencial.
                </p>
              </div>
            </div>

            {/* Cards de ICMS por empresa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <ValorLinha label="ICMS Débito" valor={matriz?.icms?.debito} color="text-red-400" />
                <ValorLinha label="ICMS Crédito" valor={matriz?.icms?.credito} color="text-green-400" />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  {matriz?.icms?.a_pagar > 0 ? (
                    <ValorLinha label="A Pagar" valor={matriz?.icms?.a_pagar} color="text-red-400" bold />
                  ) : (
                    <ValorLinha label="A Recuperar" valor={matriz?.icms?.a_recuperar} color="text-green-400" bold />
                  )}
                </div>
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <ValorLinha label="ICMS Débito" valor={filial?.icms?.debito} color="text-red-400" />
                    <ValorLinha label="ICMS Crédito" valor={filial?.icms?.credito} color="text-green-400" />
                    <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                      {filial?.icms?.a_pagar > 0 ? (
                        <ValorLinha label="A Pagar" valor={filial?.icms?.a_pagar} color="text-red-400" bold />
                      ) : (
                        <ValorLinha label="A Recuperar" valor={filial?.icms?.a_recuperar} color="text-green-400" bold />
                      )}
                    </div>
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <ValorLinha label="ICMS Débito Total" valor={consolidado?.icms?.debito} color="text-red-400" />
                <ValorLinha label="ICMS Crédito Total" valor={consolidado?.icms?.credito} color="text-green-400" />
                <div className="border-t border-[#C8A951]/30 mt-2 pt-2">
                  {consolidado?.icms?.a_pagar > 0 ? (
                    <ValorLinha label="A Pagar" valor={consolidado?.icms?.a_pagar} color="text-red-400" bold />
                  ) : (
                    <ValorLinha label="A Recuperar" valor={consolidado?.icms?.a_recuperar} color="text-green-400" bold />
                  )}
                </div>
                <p className="text-center text-xs text-[#A1A1AA] mt-2 italic">
                  * Apenas para análise gerencial - recolhimento é por empresa
                </p>
              </EmpresaCard>
            </div>

            {/* Tabela Consolidada ICMS */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A]">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-400" />
                  Resumo ICMS Consolidado
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0C0C0C]">
                      <th className="text-left p-3 text-[#A1A1AA]">Empresa</th>
                      <th className="text-right p-3 text-red-400">Débito</th>
                      <th className="text-right p-3 text-green-400">Crédito</th>
                      <th className="text-right p-3 text-[#C8A951]">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-white">{matriz?.razao_social}</td>
                      <td className="p-3 text-right text-red-400">{formatCurrency(matriz?.icms?.debito)}</td>
                      <td className="p-3 text-right text-green-400">{formatCurrency(matriz?.icms?.credito)}</td>
                      <td className={`p-3 text-right font-semibold ${matriz?.icms?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(matriz?.icms?.saldo)}
                      </td>
                    </tr>
                    {filiais?.map((filial) => (
                      <tr key={filial.id} className="border-t border-[#2A2A2A]">
                        <td className="p-3 text-white">{filial?.razao_social}</td>
                        <td className="p-3 text-right text-red-400">{formatCurrency(filial?.icms?.debito)}</td>
                        <td className="p-3 text-right text-green-400">{formatCurrency(filial?.icms?.credito)}</td>
                        <td className={`p-3 text-right font-semibold ${filial?.icms?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency(filial?.icms?.saldo)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#C8A951] bg-[#C8A951]/10">
                      <td className="p-3 font-bold text-[#C8A951]">TOTAL CONSOLIDADO</td>
                      <td className="p-3 text-right font-bold text-red-400">{formatCurrency(consolidado?.icms?.debito)}</td>
                      <td className="p-3 text-right font-bold text-green-400">{formatCurrency(consolidado?.icms?.credito)}</td>
                      <td className={`p-3 text-right font-bold ${consolidado?.icms?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(consolidado?.icms?.saldo)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      // ==============================
      // ABA PIS/COFINS - REPLICA ValidadorPisCofins
      // ==============================
      case 'pis_cofins':
        const PisCofinsCard = ({ titulo, empresa, tipo }) => {
          const pisSaldo = getSaldoImposto(empresa?.pis);
          const cofinsSaldo = getSaldoImposto(empresa?.cofins);
          const totalSaldo = (empresa?.pis?.saldo || 0) + (empresa?.cofins?.saldo || 0);
          
          return (
            <EmpresaCard titulo={titulo} empresa={empresa} tipo={tipo}>
              <h4 className="text-sm text-blue-400 font-medium mb-2">PIS</h4>
              <ValorLinha label="Débito" valor={empresa?.pis?.debito} color="text-red-400" />
              <ValorLinha label="Crédito" valor={empresa?.pis?.credito} color="text-green-400" />
              <div className="flex justify-between items-center py-1">
                <span className="text-white text-sm font-semibold">
                  {pisSaldo.tipo === 'recuperar' ? 'A Recuperar' : 'A Pagar'}
                </span>
                <span className={`${pisSaldo.color} font-bold`}>
                  {formatCurrency(pisSaldo.valor)}
                </span>
              </div>
              
              <h4 className="text-sm text-blue-400 font-medium mb-2 mt-4">COFINS</h4>
              <ValorLinha label="Débito" valor={empresa?.cofins?.debito} color="text-red-400" />
              <ValorLinha label="Crédito" valor={empresa?.cofins?.credito} color="text-green-400" />
              <div className="flex justify-between items-center py-1">
                <span className="text-white text-sm font-semibold">
                  {cofinsSaldo.tipo === 'recuperar' ? 'A Recuperar' : 'A Pagar'}
                </span>
                <span className={`${cofinsSaldo.color} font-bold`}>
                  {formatCurrency(cofinsSaldo.valor)}
                </span>
              </div>
              
              <div className="border-t border-[#2A2A2A] mt-4 pt-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-white text-sm font-semibold">Total PIS + COFINS</span>
                  <span className={`font-bold text-lg ${totalSaldo < 0 ? 'text-green-400' : totalSaldo > 0 ? 'text-red-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(Math.abs(totalSaldo))}
                  </span>
                </div>
                {totalSaldo !== 0 && (
                  <p className={`text-center text-xs mt-1 ${totalSaldo < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalSaldo < 0 ? 'Saldo Credor (A Recuperar)' : 'A Pagar'}
                  </p>
                )}
              </div>
            </EmpresaCard>
          );
        };
        
        return (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium">Impostos Federais Centralizados</p>
                <p className="text-sm text-[#A1A1AA]">
                  PIS e COFINS podem ser apurados de forma centralizada na matriz. 
                  Operações de transferência entre matriz e filiais não geram crédito/débito.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PisCofinsCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz" />

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <PisCofinsCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial" />
                ))}
              </div>

              <PisCofinsCard titulo="CONSOLIDADO" empresa={consolidado} tipo="consolidado" />
            </div>

            {/* Tabela Consolidada PIS/COFINS */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A]">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  Resumo PIS/COFINS Consolidado
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0C0C0C]">
                      <th className="text-left p-3 text-[#A1A1AA]">Empresa</th>
                      <th className="text-right p-3 text-blue-400">PIS</th>
                      <th className="text-right p-3 text-blue-400">COFINS</th>
                      <th className="text-right p-3 text-[#C8A951]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-white">{matriz?.razao_social}</td>
                      <td className={`p-3 text-right ${matriz?.pis?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(matriz?.pis?.saldo)}
                      </td>
                      <td className={`p-3 text-right ${matriz?.cofins?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(matriz?.cofins?.saldo)}
                      </td>
                      <td className={`p-3 text-right font-semibold ${(matriz?.pis?.saldo + matriz?.cofins?.saldo) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency((matriz?.pis?.saldo || 0) + (matriz?.cofins?.saldo || 0))}
                      </td>
                    </tr>
                    {filiais?.map((filial) => (
                      <tr key={filial.id} className="border-t border-[#2A2A2A]">
                        <td className="p-3 text-white">{filial?.razao_social}</td>
                        <td className={`p-3 text-right ${filial?.pis?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency(filial?.pis?.saldo)}
                        </td>
                        <td className={`p-3 text-right ${filial?.cofins?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency(filial?.cofins?.saldo)}
                        </td>
                        <td className={`p-3 text-right font-semibold ${(filial?.pis?.saldo + filial?.cofins?.saldo) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency((filial?.pis?.saldo || 0) + (filial?.cofins?.saldo || 0))}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#C8A951] bg-[#C8A951]/10">
                      <td className="p-3 font-bold text-[#C8A951]">TOTAL CONSOLIDADO</td>
                      <td className={`p-3 text-right font-bold ${consolidado?.pis?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(consolidado?.pis?.saldo)}
                      </td>
                      <td className={`p-3 text-right font-bold ${consolidado?.cofins?.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(consolidado?.cofins?.saldo)}
                      </td>
                      <td className={`p-3 text-right font-bold ${(consolidado?.pis?.saldo + consolidado?.cofins?.saldo) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency((consolidado?.pis?.saldo || 0) + (consolidado?.cofins?.saldo || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      // ==============================
      // ABA IRPJ/CSLL
      // ==============================
      case 'irpj_csll':
        return (
          <div className="space-y-6">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-purple-400 font-medium">IRPJ e CSLL por Regime Tributário</p>
                <p className="text-sm text-[#A1A1AA]">
                  Os cálculos são baseados no regime tributário de cada empresa. 
                  Empresas com atividade de serviço usam presunção diferente (32%).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <h4 className="text-sm text-purple-400 font-medium mb-2">IRPJ</h4>
                <ValorLinha label="Base Presumida" valor={matriz?.irpj?.base} color="text-white" />
                <ValorLinha label="IRPJ 15%" valor={matriz?.irpj?.devido} color="text-purple-400" />
                <ValorLinha label="Adicional 10%" valor={matriz?.irpj?.adicional} color="text-purple-400" />
                <ValorLinha label="Total IRPJ" valor={matriz?.irpj?.total} color="text-purple-400" bold />
                
                <h4 className="text-sm text-purple-400 font-medium mb-2 mt-4">CSLL</h4>
                <ValorLinha label="Base Presumida" valor={matriz?.csll?.base} color="text-white" />
                <ValorLinha label="CSLL 9%" valor={matriz?.csll?.devido} color="text-purple-400" bold />
                
                <div className="border-t border-[#2A2A2A] mt-4 pt-2">
                  <ValorLinha label="Total IRPJ + CSLL" valor={(matriz?.irpj?.total || 0) + (matriz?.csll?.devido || 0)} color="text-[#C8A951]" bold />
                </div>
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <h4 className="text-sm text-purple-400 font-medium mb-2">IRPJ</h4>
                    <ValorLinha label="Base Presumida" valor={filial?.irpj?.base} color="text-white" />
                    <ValorLinha label="Total IRPJ" valor={filial?.irpj?.total} color="text-purple-400" bold />
                    
                    <h4 className="text-sm text-purple-400 font-medium mb-2 mt-4">CSLL</h4>
                    <ValorLinha label="Base Presumida" valor={filial?.csll?.base} color="text-white" />
                    <ValorLinha label="CSLL 9%" valor={filial?.csll?.devido} color="text-purple-400" bold />
                    
                    <div className="border-t border-[#2A2A2A] mt-4 pt-2">
                      <ValorLinha label="Total" valor={(filial?.irpj?.total || 0) + (filial?.csll?.devido || 0)} color="text-[#C8A951]" bold />
                    </div>
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <h4 className="text-sm text-[#C8A951] font-medium mb-2">IRPJ Consolidado</h4>
                <ValorLinha label="Base Total" valor={consolidado?.irpj?.base} color="text-white" />
                <ValorLinha label="IRPJ 15%" valor={consolidado?.irpj?.devido} color="text-[#C8A951]" />
                <ValorLinha label="Adicional 10%" valor={consolidado?.irpj?.adicional} color="text-[#C8A951]" />
                <ValorLinha label="Total IRPJ" valor={consolidado?.irpj?.total} color="text-[#C8A951]" bold />
                
                <h4 className="text-sm text-[#C8A951] font-medium mb-2 mt-4">CSLL Consolidado</h4>
                <ValorLinha label="Base Total" valor={consolidado?.csll?.base} color="text-white" />
                <ValorLinha label="Total CSLL" valor={consolidado?.csll?.devido} color="text-[#C8A951]" bold />
                
                <div className="border-t border-[#C8A951]/30 mt-4 pt-4">
                  <ValorLinha label="Total IRPJ + CSLL" valor={(consolidado?.irpj?.total || 0) + (consolidado?.csll?.devido || 0)} color="text-[#C8A951]" bold />
                </div>
              </EmpresaCard>
            </div>
          </div>
        );

      // ==============================
      // ABA RET - REPLICA RET.js EXATAMENTE
      // ==============================
      case 'ret':
        const dadosRET = dadosRet?.consolidado || {};
        const LIMITE_SIMPLES_MENSAL = 400000;
        const faturamentoRET = dadosRET.faturamento || 0;
        const simplesIndisponivel = faturamentoRET > LIMITE_SIMPLES_MENSAL;
        
        // Identificar melhor regime
        const valores = [];
        if (!simplesIndisponivel && dadosRET.simples?.total) {
          valores.push({ regime: 'simples', total: dadosRET.simples.total, nome: 'Simples Nacional' });
        }
        if (dadosRET.presumido?.total !== undefined) {
          valores.push({ regime: 'presumido', total: dadosRET.presumido.total, nome: 'Lucro Presumido' });
        }
        if (dadosRET.real?.total !== undefined) {
          valores.push({ regime: 'real', total: dadosRET.real.total, nome: 'Lucro Real' });
        }
        valores.sort((a, b) => a.total - b.total);
        const melhorRegime = valores[0];
        const segundoMelhorRegime = valores[1];

        const ImpostoItem = ({ label, valor, color = "text-white" }) => (
          <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] last:border-0">
            <span className="text-[#A1A1AA] text-sm">{label}</span>
            <span className={`font-semibold ${color}`}>{formatCurrency(valor)}</span>
          </div>
        );

        const RegimeCard = ({ regime, nome, dados, isMelhor, simplesIndisponivel, corBorda }) => {
          if (simplesIndisponivel) {
            return (
              <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl p-4 opacity-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${corBorda}`}></div>
                  <h3 className="text-white font-semibold text-lg">{nome}</h3>
                </div>
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-amber-400 text-sm">Faturamento excede limite</p>
                </div>
              </div>
            );
          }

          return (
            <div className={`bg-[#0C0C0C] border-2 rounded-xl overflow-hidden transition-all ${
              isMelhor ? 'border-green-500 ring-2 ring-green-500/20' : 'border-[#2A2A2A]'
            }`}>
              <div className={`p-4 ${isMelhor ? 'bg-green-500/10' : 'bg-[#141414]'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${corBorda}`}></div>
                    <h3 className="text-white font-semibold text-lg">{nome}</h3>
                    {isMelhor && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" /> MAIS ECONÔMICO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-1">
                <ImpostoItem label="ICMS" valor={dados?.icms || 0} />
                <ImpostoItem label="PIS" valor={dados?.pis || 0} />
                <ImpostoItem label="COFINS" valor={dados?.cofins || 0} />
                {regime === 'simples' && <ImpostoItem label="CPP" valor={dados?.cpp || 0} />}
                <ImpostoItem label="IRPJ" valor={dados?.irpj || 0} />
                <ImpostoItem label="CSLL" valor={dados?.csll || 0} />
              </div>

              <div className={`p-4 ${isMelhor ? 'bg-green-500/20' : 'bg-[#1A1A1A]'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">TOTAL DE IMPOSTOS</span>
                  <span className={`text-2xl font-bold ${isMelhor ? 'text-green-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(dados?.total || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[#A1A1AA] text-sm">% sobre Faturamento</span>
                  <span className="text-[#C8A951] font-medium">
                    {formatPercent(((dados?.total || 0) / (faturamentoRET || 1)) * 100)}
                  </span>
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* Header RET */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#C8A951]/20 rounded-xl">
                <Zap className="w-6 h-6 text-[#C8A951]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">RET Consolidado - Rota de Eficiência Tributária</h2>
                <p className="text-[#A1A1AA] text-sm">Comparativo de regimes: Simples Nacional, Lucro Presumido e Lucro Real</p>
              </div>
            </div>

            {/* Resumo do Período */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[#666] text-sm">Competência</p>
                  <p className="text-white font-semibold">{selectedCompetencia}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#666] text-sm">Faturamento Consolidado</p>
                  <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(faturamentoRET)}</p>
                </div>
              </div>
            </div>

            {/* Melhor Regime */}
            {melhorRegime && segundoMelhorRegime && (
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Award className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-green-400 font-bold text-xl">Regime Mais Econômico: {melhorRegime.nome}</h3>
                    <p className="text-[#A1A1AA]">
                      Economia de {formatCurrency(segundoMelhorRegime.total - melhorRegime.total)} em comparação com {segundoMelhorRegime.nome}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#666] text-sm">Total de Impostos</p>
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(melhorRegime.total)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cards de Regimes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RegimeCard 
                regime="simples" 
                nome="Simples Nacional" 
                dados={dadosRET.simples}
                isMelhor={melhorRegime?.regime === 'simples'}
                simplesIndisponivel={simplesIndisponivel}
                corBorda="bg-blue-500"
              />
              <RegimeCard 
                regime="presumido" 
                nome="Lucro Presumido" 
                dados={dadosRET.presumido}
                isMelhor={melhorRegime?.regime === 'presumido'}
                simplesIndisponivel={false}
                corBorda="bg-amber-500"
              />
              <RegimeCard 
                regime="real" 
                nome="Lucro Real" 
                dados={dadosRET.real}
                isMelhor={melhorRegime?.regime === 'real'}
                simplesIndisponivel={false}
                corBorda="bg-purple-500"
              />
            </div>

            {/* Tabela Comparativa */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A]">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#C8A951]" />
                  Tabela Comparativa Consolidada
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0C0C0C]">
                      <th className="text-left p-3 text-[#A1A1AA] font-medium">Imposto</th>
                      <th className="text-right p-3 text-blue-400 font-medium">Simples</th>
                      <th className="text-right p-3 text-amber-400 font-medium">Presumido</th>
                      <th className="text-right p-3 text-purple-400 font-medium">Lucro Real</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">ICMS</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosRET.simples?.icms)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.presumido?.icms)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.real?.icms)}</td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">PIS</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosRET.simples?.pis)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.presumido?.pis)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.real?.pis)}</td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">COFINS</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosRET.simples?.cofins)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.presumido?.cofins)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.real?.cofins)}</td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">IRPJ</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosRET.simples?.irpj)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.presumido?.irpj)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.real?.irpj)}</td>
                    </tr>
                    <tr className="border-t border-[#2A2A2A]">
                      <td className="p-3 text-[#A1A1AA]">CSLL</td>
                      <td className="p-3 text-right text-white">{simplesIndisponivel ? '-' : formatCurrency(dadosRET.simples?.csll)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.presumido?.csll)}</td>
                      <td className="p-3 text-right text-white">{formatCurrency(dadosRET.real?.csll)}</td>
                    </tr>
                    {!simplesIndisponivel && (
                      <tr className="border-t border-[#2A2A2A]">
                        <td className="p-3 text-[#A1A1AA]">CPP (Simples)</td>
                        <td className="p-3 text-right text-white">{formatCurrency(dadosRET.simples?.cpp)}</td>
                        <td className="p-3 text-right text-[#666]">-</td>
                        <td className="p-3 text-right text-[#666]">-</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-[#C8A951] bg-[#0C0C0C]">
                      <td className="p-3 text-[#C8A951] font-bold">TOTAL A PAGAR</td>
                      <td className={`p-3 text-right font-bold ${melhorRegime?.regime === 'simples' ? 'text-green-400' : 'text-white'}`}>
                        {simplesIndisponivel ? '-' : formatCurrency(dadosRET.simples?.total)}
                        {melhorRegime?.regime === 'simples' && <Award className="w-4 h-4 inline ml-1" />}
                      </td>
                      <td className={`p-3 text-right font-bold ${melhorRegime?.regime === 'presumido' ? 'text-green-400' : 'text-white'}`}>
                        {formatCurrency(dadosRET.presumido?.total)}
                        {melhorRegime?.regime === 'presumido' && <Award className="w-4 h-4 inline ml-1" />}
                      </td>
                      <td className={`p-3 text-right font-bold ${melhorRegime?.regime === 'real' ? 'text-green-400' : 'text-white'}`}>
                        {formatCurrency(dadosRET.real?.total)}
                        {melhorRegime?.regime === 'real' && <Award className="w-4 h-4 inline ml-1" />}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      // ==============================
      // ABA REFORMA TRIBUTÁRIA - REPLICA ReformaTributaria.js EXATAMENTE
      // ==============================
      case 'reforma':
        const dadosRef = dadosReforma || {};
        const config = dadosRef.config || { aliquota_cbs: 8.8, aliquota_ibs: 17.7, aliquota_total: 26.5 };
        const apuracao = dadosRef.apuracao || {};
        const comparativo = dadosRef.comparativo_regime_atual || {};

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Reforma Tributária Consolidada</h2>
                <p className="text-[#A1A1AA] text-sm">Simulação IVA Dual (CBS + IBS) - Cenário 2027</p>
              </div>
            </div>

            {/* Cards Principais */}
            <div className="grid grid-cols-4 gap-4">
              {/* Créditos */}
              <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Créditos (Entradas)</span>
                  <ArrowDown className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(apuracao.creditos?.total)}
                </p>
                <div className="mt-2 text-xs text-[#666] space-y-1">
                  <p>CBS: {formatCurrency(apuracao.creditos?.cbs)}</p>
                  <p>IBS: {formatCurrency(apuracao.creditos?.ibs)}</p>
                </div>
              </div>

              {/* Débitos */}
              <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-red-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Débitos (Saídas)</span>
                  <ArrowUp className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(apuracao.debitos?.total)}
                </p>
                <div className="mt-2 text-xs text-[#666] space-y-1">
                  <p>CBS: {formatCurrency(apuracao.debitos?.cbs)}</p>
                  <p>IBS: {formatCurrency(apuracao.debitos?.ibs)}</p>
                </div>
              </div>

              {/* Imposto Seletivo */}
              <div className="bg-gradient-to-br from-[#141414] to-[#1a1a1a] border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">Imposto Seletivo</span>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400">
                  {formatCurrency(apuracao.imposto_seletivo?.total || 0)}
                </p>
              </div>

              {/* Saldo */}
              <div className={`bg-gradient-to-br from-[#141414] to-[#1a1a1a] border rounded-xl p-5 ${
                apuracao.saldo?.situacao === 'a_pagar' ? 'border-red-500/50' : 'border-emerald-500/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#A1A1AA] text-sm">
                    {apuracao.saldo?.situacao === 'a_pagar' ? 'Saldo a Pagar' : 'Resultado IVA Dual'}
                  </span>
                  <DollarSign className={`w-5 h-5 ${
                    apuracao.saldo?.situacao === 'a_pagar' ? 'text-red-400' : 'text-emerald-400'
                  }`} />
                </div>
                
                {apuracao.saldo?.situacao === 'a_pagar' ? (
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(apuracao.saldo?.total)}
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-400">R$ 0,00</p>
                    <p className="text-xs text-emerald-400 mt-1">Nada a pagar!</p>
                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <p className="text-xs text-[#A1A1AA] mb-1">Crédito Acumulado:</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {formatCurrency(Math.abs(apuracao.saldo?.total || 0))}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Comparativo PIS/COFINS vs CBS (Cenário 2027) */}
            <div className="bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#141414] border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Calculator className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-white">Cenário 2027: PIS/COFINS → CBS</span>
                    <p className="text-xs text-[#A1A1AA] font-normal mt-1">CBS substitui PIS e COFINS</p>
                  </div>
                </h3>
                <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <span className="text-blue-400 font-bold">CENÁRIO 2027</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* PIS/COFINS Atual */}
                <div className="bg-[#0C0C0C] rounded-xl border border-[#333] p-4">
                  <h4 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    PIS/COFINS ATUAL
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">PIS Crédito:</span>
                      <span className="text-emerald-400">{formatCurrency(comparativo.credito_bruto?.pis)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">PIS Débito:</span>
                      <span className="text-red-400">{formatCurrency(comparativo.debito_bruto?.pis)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">COFINS Crédito:</span>
                      <span className="text-emerald-400">{formatCurrency(comparativo.credito_bruto?.cofins)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">COFINS Débito:</span>
                      <span className="text-red-400">{formatCurrency(comparativo.debito_bruto?.cofins)}</span>
                    </div>
                    <div className="border-t border-[#333] pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-amber-400">Saldo PIS/COFINS:</span>
                        {(() => {
                          const saldo = (comparativo.detalhamento?.pis_saldo || 0) + (comparativo.detalhamento?.cofins_saldo || 0);
                          return saldo > 0 
                            ? <span className="text-red-400">Pagar {formatCurrency(saldo)}</span>
                            : <span className="text-[#C8A951]">Recuperar {formatCurrency(Math.abs(saldo))}</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* CBS */}
                <div className="bg-[#0C0C0C] rounded-xl border border-[#333] p-4">
                  <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    CBS ({config.aliquota_cbs}%)
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">CBS Crédito:</span>
                      <span className="text-emerald-400">{formatCurrency(apuracao.creditos?.cbs)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">CBS Débito:</span>
                      <span className="text-red-400">{formatCurrency(apuracao.debitos?.cbs)}</span>
                    </div>
                    <div className="border-t border-[#333] pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-emerald-400">Saldo CBS:</span>
                        {(() => {
                          const saldo = apuracao.saldo?.cbs || 0;
                          return saldo > 0 
                            ? <span className="text-red-400">Pagar {formatCurrency(saldo)}</span>
                            : <span className="text-[#C8A951]">Recuperar {formatCurrency(Math.abs(saldo))}</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Economia/Aumento Cenário 2027 */}
              {(() => {
                const saldoPisCofins = (comparativo.detalhamento?.pis_saldo || 0) + (comparativo.detalhamento?.cofins_saldo || 0);
                const saldoCbs = apuracao.saldo?.cbs || 0;
                const diferenca = saldoPisCofins - saldoCbs;
                const temEconomia = diferenca > 0;
                
                return (
                  <div className={`mt-4 p-4 rounded-xl flex items-center justify-between ${
                    temEconomia ? 'bg-emerald-500/10 border border-emerald-500/30' : 
                    diferenca < 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#333] border border-[#444]'
                  }`}>
                    <div className="flex items-center gap-3">
                      {temEconomia ? <TrendingDown className="w-6 h-6 text-emerald-400" /> : 
                       diferenca < 0 ? <TrendingUp className="w-6 h-6 text-red-400" /> : 
                       <ArrowRight className="w-6 h-6 text-[#666]" />}
                      <div>
                        <p className={`font-bold ${temEconomia ? 'text-emerald-400' : diferenca < 0 ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
                          {temEconomia ? 'Economia com CBS' : diferenca < 0 ? 'Aumento com CBS' : 'Valores Equivalentes'}
                        </p>
                        <p className="text-xs text-[#666]">CBS vs PIS/COFINS (sem ICMS)</p>
                      </div>
                    </div>
                    <p className={`text-xl font-bold ${temEconomia ? 'text-emerald-400' : diferenca < 0 ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
                      {temEconomia ? '-' : diferenca < 0 ? '+' : ''} {formatCurrency(Math.abs(diferenca))}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Comparativo Reforma Completa */}
            <div className="bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#141414] border border-amber-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Calculator className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-white">Reforma Completa: PIS/COFINS + ICMS → CBS + IBS</span>
                    <p className="text-xs text-[#A1A1AA] font-normal mt-1">IVA Dual substitui PIS, COFINS e ICMS</p>
                  </div>
                </h3>
                <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                  <span className="text-amber-400 font-bold">REFORMA COMPLETA</span>
                </div>
              </div>
              
              {/* Tabela Regime Atual */}
              <div className="bg-[#0C0C0C] rounded-xl overflow-hidden border border-[#333]">
                <div className="grid grid-cols-4 gap-0 bg-[#1a1a1a] text-sm font-semibold">
                  <div className="p-3 text-[#A1A1AA]">REGIME ATUAL</div>
                  <div className="p-3 text-emerald-400 text-center">CRÉDITO</div>
                  <div className="p-3 text-red-400 text-center">DÉBITO</div>
                  <div className="p-3 text-[#C8A951] text-center">SALDO</div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t border-[#333]">
                  <div className="p-3 text-amber-400 font-medium">PIS</div>
                  <div className="p-3 text-center text-emerald-400">{formatCurrency(comparativo.credito_bruto?.pis)}</div>
                  <div className="p-3 text-center text-red-400">{formatCurrency(comparativo.debito_bruto?.pis)}</div>
                  <div className={`p-3 text-center font-medium ${(comparativo.detalhamento?.pis_saldo || 0) > 0 ? 'text-red-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(comparativo.detalhamento?.pis_saldo)}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t border-[#333]">
                  <div className="p-3 text-amber-400 font-medium">COFINS</div>
                  <div className="p-3 text-center text-emerald-400">{formatCurrency(comparativo.credito_bruto?.cofins)}</div>
                  <div className="p-3 text-center text-red-400">{formatCurrency(comparativo.debito_bruto?.cofins)}</div>
                  <div className={`p-3 text-center font-medium ${(comparativo.detalhamento?.cofins_saldo || 0) > 0 ? 'text-red-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(comparativo.detalhamento?.cofins_saldo)}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t border-[#333]">
                  <div className="p-3 text-amber-400 font-medium">ICMS</div>
                  <div className="p-3 text-center text-emerald-400">{formatCurrency(comparativo.detalhamento?.icms_credito)}</div>
                  <div className="p-3 text-center text-red-400">{formatCurrency(comparativo.detalhamento?.icms_debito)}</div>
                  <div className={`p-3 text-center font-medium ${(comparativo.detalhamento?.icms_saldo || 0) > 0 ? 'text-red-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(comparativo.detalhamento?.icms_saldo)}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t-2 border-amber-500/30 bg-amber-500/5">
                  <div className="p-3 font-bold text-amber-400">TOTAL ATUAL</div>
                  <div className="p-3 text-center text-emerald-400 font-bold">
                    {formatCurrency(
                      (comparativo.credito_bruto?.pis || 0) +
                      (comparativo.credito_bruto?.cofins || 0) +
                      (comparativo.detalhamento?.icms_credito || 0)
                    )}
                  </div>
                  <div className="p-3 text-center text-red-400 font-bold">
                    {formatCurrency(
                      (comparativo.debito_bruto?.pis || 0) +
                      (comparativo.debito_bruto?.cofins || 0) +
                      (comparativo.detalhamento?.icms_debito || 0)
                    )}
                  </div>
                  <div className="p-3 text-center">
                    {(() => {
                      const saldoTotal = (comparativo.detalhamento?.pis_saldo || 0) + 
                                        (comparativo.detalhamento?.cofins_saldo || 0) + 
                                        (comparativo.detalhamento?.icms_saldo || 0);
                      return saldoTotal > 0 
                        ? <span className="text-red-400 font-bold">Pagar {formatCurrency(saldoTotal)}</span>
                        : <span className="text-[#C8A951] font-bold">Recuperar {formatCurrency(Math.abs(saldoTotal))}</span>;
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Seta */}
              <div className="flex justify-center my-4">
                <div className="flex items-center gap-2 text-[#666]">
                  <ArrowRight className="w-8 h-8" />
                  <span className="text-sm">substitui por</span>
                  <ArrowRight className="w-8 h-8" />
                </div>
              </div>
              
              {/* Tabela IVA Dual */}
              <div className="bg-[#0C0C0C] rounded-xl overflow-hidden border border-emerald-500/30">
                <div className="grid grid-cols-4 gap-0 bg-emerald-500/10 text-sm font-semibold">
                  <div className="p-3 text-emerald-400">IVA DUAL</div>
                  <div className="p-3 text-emerald-400 text-center">CRÉDITO</div>
                  <div className="p-3 text-red-400 text-center">DÉBITO</div>
                  <div className="p-3 text-[#C8A951] text-center">SALDO</div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t border-[#333]">
                  <div className="p-3 text-emerald-400 font-medium">CBS ({config.aliquota_cbs}%)</div>
                  <div className="p-3 text-center text-emerald-400">{formatCurrency(apuracao.creditos?.cbs)}</div>
                  <div className="p-3 text-center text-red-400">{formatCurrency(apuracao.debitos?.cbs)}</div>
                  <div className={`p-3 text-center font-medium ${(apuracao.saldo?.cbs || 0) > 0 ? 'text-red-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(apuracao.saldo?.cbs)}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t border-[#333]">
                  <div className="p-3 text-emerald-400 font-medium">IBS ({config.aliquota_ibs}%)</div>
                  <div className="p-3 text-center text-emerald-400">{formatCurrency(apuracao.creditos?.ibs)}</div>
                  <div className="p-3 text-center text-red-400">{formatCurrency(apuracao.debitos?.ibs)}</div>
                  <div className={`p-3 text-center font-medium ${(apuracao.saldo?.ibs || 0) > 0 ? 'text-red-400' : 'text-[#C8A951]'}`}>
                    {formatCurrency(apuracao.saldo?.ibs)}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-0 border-t-2 border-emerald-500/30 bg-emerald-500/5">
                  <div className="p-3 font-bold text-emerald-400">TOTAL IVA</div>
                  <div className="p-3 text-center text-emerald-400 font-bold">{formatCurrency(apuracao.creditos?.total)}</div>
                  <div className="p-3 text-center text-red-400 font-bold">{formatCurrency(apuracao.debitos?.total)}</div>
                  <div className="p-3 text-center">
                    {(() => {
                      const saldo = apuracao.saldo?.total || 0;
                      return saldo > 0 
                        ? <span className="text-red-400 font-bold">Pagar {formatCurrency(saldo)}</span>
                        : <span className="text-[#C8A951] font-bold">Recuperar {formatCurrency(Math.abs(saldo))}</span>;
                    })()}
                  </div>
                </div>
              </div>
              
              {/* Economia/Aumento Reforma Completa */}
              {(() => {
                const totalAtual = (comparativo.detalhamento?.pis_saldo || 0) + 
                                  (comparativo.detalhamento?.cofins_saldo || 0) + 
                                  (comparativo.detalhamento?.icms_saldo || 0);
                const totalIva = apuracao.saldo?.total || 0;
                const diferenca = totalAtual - totalIva;
                const temEconomia = diferenca > 0;
                
                return (
                  <div className={`mt-4 p-5 rounded-xl flex items-center justify-between ${
                    temEconomia ? 'bg-emerald-500/10 border border-emerald-500/30' : 
                    diferenca < 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#333] border border-[#444]'
                  }`}>
                    <div className="flex items-center gap-4">
                      {temEconomia ? <CheckCircle className="w-8 h-8 text-emerald-400" /> : 
                       diferenca < 0 ? <TrendingUp className="w-8 h-8 text-red-400" /> : 
                       <ArrowRight className="w-8 h-8 text-[#666]" />}
                      <div>
                        <p className={`font-bold text-lg ${temEconomia ? 'text-emerald-400' : diferenca < 0 ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
                          {temEconomia ? 'Economia com Reforma Completa' : diferenca < 0 ? 'Aumento com Reforma Completa' : 'Valores Equivalentes'}
                        </p>
                        <p className="text-xs text-[#666]">IVA Dual (CBS + IBS) vs Regime Atual (PIS/COFINS + ICMS)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${temEconomia ? 'text-emerald-400' : diferenca < 0 ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
                        {temEconomia ? '- ' : diferenca < 0 ? '+ ' : ''}{formatCurrency(Math.abs(diferenca))}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Se não é matriz, mostrar mensagem
  if (grupoInfo && !grupoInfo.is_matriz) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-16 h-16 text-[#A1A1AA] mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Empresa não é matriz</h2>
          <p className="text-[#A1A1AA] max-w-md">
            Esta funcionalidade está disponível apenas para empresas que são matriz de um grupo empresarial.
            {grupoInfo.is_filial && (
              <span className="block mt-2 text-yellow-500">
                Esta empresa é filial de um grupo. Acesse pela matriz para ver os dados consolidados.
              </span>
            )}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-[#C8A951]" />
              Grupo Consolidado
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              {dadosGrupo?.grupo_nome || 'Carregando...'} - {1 + (dadosGrupo?.filiais?.length || 0)} empresas - {selectedCompetencia}
            </p>
          </div>
          <button
            onClick={fetchDadosGrupo}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8A951] text-black rounded-lg hover:bg-[#B8993F] transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0C0C0C] rounded-xl p-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#C8A951] text-black'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {renderTabContent()}
      </div>
    </Layout>
  );
};

export default GrupoConsolidado;
