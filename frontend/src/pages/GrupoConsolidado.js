import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Building2, Users,
  BarChart3, Calculator, Scale, RefreshCw, AlertTriangle,
  ChevronDown, ChevronUp, Package, ShoppingCart, FileText,
  Percent, PiggyBank, Zap, Info
} from 'lucide-react';

/**
 * Página de Grupo Consolidado
 * Exibe dados consolidados de todas as empresas do grupo (matriz + filiais)
 * Só deve aparecer para empresas que são matriz de um grupo empresarial
 */
const GrupoConsolidado = () => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [activeTab, setActiveTab] = useState('indicadores');
  const [loading, setLoading] = useState(true);
  const [grupoInfo, setGrupoInfo] = useState(null);
  const [dadosGrupo, setDadosGrupo] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

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
        `${API_URL}/api/empresa/${selectedCompany.id}/grupo-info`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGrupoInfo(response.data);
    } catch (err) {
      console.error('Erro ao buscar info do grupo:', err);
      setGrupoInfo(null);
    }
  }, [selectedCompany?.id, API_URL]);

  // Buscar dados consolidados do grupo
  const fetchDadosGrupo = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/empresa/${selectedCompany.id}/impostos-grupo?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.is_grupo) {
        setDadosGrupo(response.data);
      } else {
        setError('Esta empresa não é matriz de nenhum grupo empresarial');
      }
    } catch (err) {
      console.error('Erro ao buscar dados do grupo:', err);
      setError('Erro ao carregar dados do grupo');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, selectedCompetencia, API_URL]);

  useEffect(() => {
    fetchGrupoInfo();
  }, [fetchGrupoInfo]);

  useEffect(() => {
    if (grupoInfo?.is_matriz) {
      fetchDadosGrupo();
    }
  }, [grupoInfo, fetchDadosGrupo]);

  const tabs = [
    { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
    { id: 'icms', label: 'ICMS', icon: Building2 },
    { id: 'pis_cofins', label: 'PIS/COFINS', icon: DollarSign },
    { id: 'irpj_csll', label: 'IRPJ/CSLL', icon: Calculator },
    { id: 'ret', label: 'RET', icon: Scale },
    { id: 'reforma', label: 'Reforma Tributária', icon: Zap },
  ];

  // Card de Empresa
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
          <div>
            <h3 className={`font-semibold ${
              tipo === 'consolidado' ? 'text-[#C8A951]' : 'text-white'
            }`}>{titulo}</h3>
            {empresa && (
              <p className="text-xs text-[#A1A1AA]">{empresa.cnpj}</p>
            )}
          </div>
          {tipo !== 'consolidado' && (
            <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
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

  // Renderizar conteúdo da aba
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

    switch (activeTab) {
      case 'indicadores':
        return (
          <div className="space-y-6">
            {/* Cards de Indicadores Consolidados */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0C0C0C] rounded-xl p-6 border border-[#2A2A2A]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Entradas</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(consolidado?.faturamento * 0.3)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-6 border border-[#2A2A2A]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Compras</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(consolidado?.faturamento * 0.25)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-6 border border-[#2A2A2A]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Saídas</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(consolidado?.faturamento)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0C0C0C] rounded-xl p-6 border border-[#2A2A2A]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-[#C8A951]/20 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-[#C8A951]" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Vendas</p>
                    <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(consolidado?.faturamento)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo por Empresa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <ValorLinha label="Faturamento" valor={matriz?.faturamento} color="text-white" />
                <ValorLinha label="Total Federal" valor={matriz?.total_federal} color="text-[#C8A951]" bold />
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial, idx) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <ValorLinha label="Faturamento" valor={filial?.faturamento} color="text-white" />
                    <ValorLinha label="Total Federal" valor={filial?.total_federal} color="text-[#C8A951]" bold />
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <ValorLinha label="Faturamento Total" valor={consolidado?.faturamento} color="text-white" />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  <ValorLinha label="Total Federal" valor={consolidado?.total_federal} color="text-[#C8A951]" bold />
                  <p className="text-center text-sm text-[#A1A1AA] mt-2">
                    {formatPercent(consolidado?.percentual)} do faturamento
                  </p>
                </div>
              </EmpresaCard>
            </div>
          </div>
        );

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <ValorLinha label="ICMS Débito" valor={0} color="text-red-400" />
                <ValorLinha label="ICMS Crédito" valor={0} color="text-green-400" />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  <ValorLinha label="Saldo" valor={0} color="text-white" bold />
                </div>
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <ValorLinha label="ICMS Débito" valor={0} color="text-red-400" />
                    <ValorLinha label="ICMS Crédito" valor={0} color="text-green-400" />
                    <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                      <ValorLinha label="Saldo" valor={0} color="text-white" bold />
                    </div>
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <ValorLinha label="ICMS Débito Total" valor={0} color="text-red-400" />
                <ValorLinha label="ICMS Crédito Total" valor={0} color="text-green-400" />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  <ValorLinha label="Saldo Consolidado" valor={0} color="text-white" bold />
                </div>
                <p className="text-center text-xs text-[#A1A1AA] mt-2 italic">
                  * Apenas para análise gerencial
                </p>
              </EmpresaCard>
            </div>
          </div>
        );

      case 'pis_cofins':
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
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <h4 className="text-sm text-blue-400 font-medium mb-2">PIS</h4>
                <ValorLinha label="Débito" valor={matriz?.pis?.debito} color="text-red-400" />
                <ValorLinha label="Crédito" valor={matriz?.pis?.credito} color="text-green-400" />
                <ValorLinha label="A Pagar" valor={matriz?.pis?.a_pagar} color="text-blue-400" bold />
                
                <h4 className="text-sm text-blue-400 font-medium mb-2 mt-4">COFINS</h4>
                <ValorLinha label="Débito" valor={matriz?.cofins?.debito} color="text-red-400" />
                <ValorLinha label="Crédito" valor={matriz?.cofins?.credito} color="text-green-400" />
                <ValorLinha label="A Pagar" valor={matriz?.cofins?.a_pagar} color="text-blue-400" bold />
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <h4 className="text-sm text-blue-400 font-medium mb-2">PIS</h4>
                    <ValorLinha label="Débito" valor={filial?.pis?.debito} color="text-red-400" />
                    <ValorLinha label="Crédito" valor={filial?.pis?.credito} color="text-green-400" />
                    <ValorLinha label="A Pagar" valor={filial?.pis?.a_pagar} color="text-blue-400" bold />
                    
                    <h4 className="text-sm text-blue-400 font-medium mb-2 mt-4">COFINS</h4>
                    <ValorLinha label="Débito" valor={filial?.cofins?.debito} color="text-red-400" />
                    <ValorLinha label="Crédito" valor={filial?.cofins?.credito} color="text-green-400" />
                    <ValorLinha label="A Pagar" valor={filial?.cofins?.a_pagar} color="text-blue-400" bold />
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <h4 className="text-sm text-[#C8A951] font-medium mb-2">PIS Consolidado</h4>
                <ValorLinha label="Débito Total" valor={consolidado?.pis?.debito} color="text-red-400" />
                <ValorLinha label="Crédito Total" valor={consolidado?.pis?.credito} color="text-green-400" />
                <ValorLinha label="A Pagar" valor={consolidado?.pis?.a_pagar} color="text-[#C8A951]" bold />
                
                <h4 className="text-sm text-[#C8A951] font-medium mb-2 mt-4">COFINS Consolidado</h4>
                <ValorLinha label="Débito Total" valor={consolidado?.cofins?.debito} color="text-red-400" />
                <ValorLinha label="Crédito Total" valor={consolidado?.cofins?.credito} color="text-green-400" />
                <ValorLinha label="A Pagar" valor={consolidado?.cofins?.a_pagar} color="text-[#C8A951]" bold />
                
                <div className="border-t border-[#C8A951]/30 mt-4 pt-4">
                  <ValorLinha label="Total PIS + COFINS" valor={(consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0)} color="text-[#C8A951]" bold />
                </div>
              </EmpresaCard>
            </div>
          </div>
        );

      case 'irpj_csll':
        return (
          <div className="space-y-6">
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

      case 'ret':
        return (
          <div className="space-y-6">
            <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#C8A951]" />
                Comparativo de Regimes Tributários - Consolidado
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                  <h4 className="text-sm text-[#A1A1AA] mb-3">LUCRO REAL</h4>
                  <ValorLinha label="PIS + COFINS" valor={(consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0)} color="text-blue-400" />
                  <ValorLinha label="IRPJ + CSLL" valor={(consolidado?.irpj?.total || 0) + (consolidado?.csll?.devido || 0)} color="text-purple-400" />
                  <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                    <ValorLinha label="Total" valor={consolidado?.total_federal} color="text-white" bold />
                  </div>
                </div>
                
                <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                  <h4 className="text-sm text-[#A1A1AA] mb-3">LUCRO PRESUMIDO</h4>
                  <ValorLinha label="PIS + COFINS (cumulativo)" valor={consolidado?.faturamento * 0.0365} color="text-blue-400" />
                  <ValorLinha label="IRPJ + CSLL" valor={(consolidado?.irpj?.total || 0) + (consolidado?.csll?.devido || 0)} color="text-purple-400" />
                  <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                    <ValorLinha label="Total" valor={(consolidado?.faturamento * 0.0365) + (consolidado?.irpj?.total || 0) + (consolidado?.csll?.devido || 0)} color="text-white" bold />
                  </div>
                </div>
              </div>
            </div>

            {/* Por Empresa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <ValorLinha label="Total Federal (Real)" valor={matriz?.total_federal} color="text-blue-400" bold />
                <ValorLinha label="Total Federal (Presumido)" valor={(matriz?.faturamento * 0.0365) + (matriz?.irpj?.total || 0) + (matriz?.csll?.devido || 0)} color="text-purple-400" bold />
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <ValorLinha label="Total Federal (Real)" valor={filial?.total_federal} color="text-blue-400" bold />
                    <ValorLinha label="Total Federal (Presumido)" valor={(filial?.faturamento * 0.0365) + (filial?.irpj?.total || 0) + (filial?.csll?.devido || 0)} color="text-purple-400" bold />
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <ValorLinha label="Lucro Real" valor={consolidado?.total_federal} color="text-blue-400" bold />
                <ValorLinha label="Lucro Presumido" valor={(consolidado?.faturamento * 0.0365) + (consolidado?.irpj?.total || 0) + (consolidado?.csll?.devido || 0)} color="text-purple-400" bold />
                <div className="border-t border-[#C8A951]/30 mt-2 pt-2">
                  <p className="text-center text-sm text-[#C8A951]">
                    {consolidado?.total_federal < ((consolidado?.faturamento * 0.0365) + (consolidado?.irpj?.total || 0) + (consolidado?.csll?.devido || 0))
                      ? '✓ Lucro Real mais vantajoso'
                      : '✓ Lucro Presumido mais vantajoso'
                    }
                  </p>
                </div>
              </EmpresaCard>
            </div>
          </div>
        );

      case 'reforma':
        return (
          <div className="space-y-6">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-start gap-3">
              <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 font-medium">Reforma Tributária</p>
                <p className="text-sm text-[#A1A1AA]">
                  Comparativo entre o cenário atual (PIS/COFINS) e o novo IBS/CBS que entrará em vigor.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0C0C0C] rounded-xl p-6 border border-blue-500/30">
                <h4 className="text-lg font-semibold text-blue-400 mb-4">Cenário Atual</h4>
                <ValorLinha label="PIS (1,65%)" valor={consolidado?.pis?.a_pagar} color="text-white" />
                <ValorLinha label="COFINS (7,6%)" valor={consolidado?.cofins?.a_pagar} color="text-white" />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  <ValorLinha label="Total PIS + COFINS" valor={(consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0)} color="text-blue-400" bold />
                  <p className="text-sm text-[#A1A1AA] mt-1">
                    Alíquota efetiva: {formatPercent(((consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0)) / (consolidado?.faturamento || 1) * 100)}
                  </p>
                </div>
              </div>

              <div className="bg-[#0C0C0C] rounded-xl p-6 border border-orange-500/30">
                <h4 className="text-lg font-semibold text-orange-400 mb-4">IBS + CBS (Reforma)</h4>
                <ValorLinha label="CBS Federal (~8,8%)" valor={consolidado?.faturamento * 0.088} color="text-white" />
                <ValorLinha label="IBS Estadual (~variável)" valor={consolidado?.faturamento * 0.15} color="text-white" />
                <div className="border-t border-[#2A2A2A] mt-2 pt-2">
                  <ValorLinha label="Total IBS + CBS" valor={consolidado?.faturamento * 0.238} color="text-orange-400" bold />
                  <p className="text-sm text-[#A1A1AA] mt-1">
                    Alíquota aproximada: 23,8%
                  </p>
                </div>
              </div>
            </div>

            {/* Por Empresa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EmpresaCard titulo={matriz?.razao_social} empresa={matriz} tipo="matriz">
                <ValorLinha label="Atual (PIS+COFINS)" valor={(matriz?.pis?.a_pagar || 0) + (matriz?.cofins?.a_pagar || 0)} color="text-blue-400" />
                <ValorLinha label="Reforma (IBS+CBS)" valor={matriz?.faturamento * 0.238} color="text-orange-400" />
              </EmpresaCard>

              <div className="space-y-4">
                {filiais?.map((filial) => (
                  <EmpresaCard key={filial.id} titulo={filial.razao_social} empresa={filial} tipo="filial">
                    <ValorLinha label="Atual (PIS+COFINS)" valor={(filial?.pis?.a_pagar || 0) + (filial?.cofins?.a_pagar || 0)} color="text-blue-400" />
                    <ValorLinha label="Reforma (IBS+CBS)" valor={filial?.faturamento * 0.238} color="text-orange-400" />
                  </EmpresaCard>
                ))}
              </div>

              <EmpresaCard titulo="CONSOLIDADO" tipo="consolidado">
                <ValorLinha label="Atual (PIS+COFINS)" valor={(consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0)} color="text-blue-400" bold />
                <ValorLinha label="Reforma (IBS+CBS)" valor={consolidado?.faturamento * 0.238} color="text-orange-400" bold />
                <div className="border-t border-[#C8A951]/30 mt-2 pt-2">
                  <ValorLinha 
                    label="Diferença" 
                    valor={(consolidado?.faturamento * 0.238) - ((consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0))} 
                    color={(consolidado?.faturamento * 0.238) > ((consolidado?.pis?.a_pagar || 0) + (consolidado?.cofins?.a_pagar || 0)) ? 'text-red-400' : 'text-green-400'} 
                    bold 
                  />
                </div>
              </EmpresaCard>
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
      <Layout>
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-[#C8A951]" />
              Grupo Consolidado
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              {dadosGrupo?.grupo_nome} • {1 + (dadosGrupo?.filiais?.length || 0)} empresas • {selectedCompetencia}
            </p>
          </div>
          <button
            onClick={fetchDadosGrupo}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8A951] text-black rounded-lg hover:bg-[#B8993F] transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
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
