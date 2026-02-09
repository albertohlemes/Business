import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  Download, RefreshCw, Building2, BarChart3, 
  AlertTriangle, CheckCircle, Sparkles, Calculator,
  Scale, ArrowRight, Lightbulb, Target, Zap,
  Package, Brain, ChevronDown, ChevronUp, AlertCircle,
  Percent, PiggyBank, Minus, Plus, Save
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Indicadores = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia, refreshCompanies } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [analiseIA, setAnaliseIA] = useState(null);
  const [activeTab, setActiveTab] = useState('resumo');
  const [expandedSections, setExpandedSections] = useState({});
  
  // Estoque para CMV/CPV
  const [estoqueInicial, setEstoqueInicial] = useState(0);
  const [estoqueFinal, setEstoqueFinal] = useState(0);
  const [savingEstoque, setSavingEstoque] = useState(false);

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Carregar estoque da empresa
      setEstoqueInicial(selectedCompany.estoque_inicial || 0);
      setEstoqueFinal(selectedCompany.estoque_final || 0);
      
      // Buscar dados de apuração consolidados
      const [icmsRes, issRes, pisRes, ipiRes] = await Promise.all([
        axios.get(`${API}/apuracao-icms/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-iss/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/pis-cofins/apuracao/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-ipi/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null)
      ]);
      
      // Buscar análise tributária IA
      const analiseRes = await axios.get(
        `${API}/analise-tributaria-ia/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers }
      ).catch(() => null);
      
      setDados({
        icms: icmsRes?.data,
        iss: issRes?.data,
        pis_cofins: pisRes?.data,
        ipi: ipiRes?.data
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

  // Salvar estoque na empresa
  const salvarEstoque = async () => {
    if (!selectedCompany?.id) return;
    setSavingEstoque(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/companies/${selectedCompany.id}`, {
        estoque_inicial: estoqueInicial,
        estoque_final: estoqueFinal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshCompanies && refreshCompanies();
      alert('Estoque salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar estoque:', err);
      alert('Erro ao salvar estoque');
    } finally {
      setSavingEstoque(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercent = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(value || 0);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Verificar se empresa é contribuinte de cada imposto
  const isContribuinteICMS = () => {
    const tipo = selectedCompany?.tipo_atividade || '';
    return tipo === 'comercio' || tipo === 'industria' || tipo === 'mista' || selectedCompany?.apura_icms;
  };

  const isContribuinteISS = () => {
    const tipo = selectedCompany?.tipo_atividade || '';
    return tipo === 'servicos' || tipo === 'mista';
  };

  const isContribuinteIPI = () => {
    const tipo = selectedCompany?.tipo_atividade || '';
    return tipo === 'industria' || selectedCompany?.equiparado_industria;
  };

  const isContribuinteICMSST = () => {
    return selectedCompany?.apura_icms_st;
  };

  // Calcular CMV/CPV (Custo da Mercadoria/Produto Vendido)
  const calcularCMV = () => {
    // CMV = Estoque Inicial + Compras - Estoque Final
    // Usar totais.valor_total das entradas (formato correto do backend)
    const compras = dados?.icms?.entradas?.totais?.valor_total || 
                    dados?.icms?.entradas?.total_produtos ||
                    dados?.pis_cofins?.compras?.total || 0;
    return estoqueInicial + compras - estoqueFinal;
  };

  // Calcular receitas
  const calcularReceitas = () => {
    // Receita de vendas de mercadorias (usar totais.valor_total)
    const receitaComercio = dados?.icms?.saidas?.totais?.valor_total || 
                           dados?.icms?.saidas?.total_produtos || 0;
    // Receita de serviços
    const receitaServicos = dados?.iss?.resumo?.receita_servicos || 
                           dados?.iss?.resumo?.total_servicos || 0;
    
    return {
      comercio: receitaComercio,
      servicos: receitaServicos,
      total: receitaComercio + receitaServicos
    };
  };

  // Calcular Entradas por tipo (Insumo, Revenda, Despesa)
  const calcularEntradasPorTipo = () => {
    const entradas = dados?.icms?.entradas || dados?.pis_cofins?.compras || {};
    const cfops = entradas.por_cfop || [];
    
    let insumo = 0;
    let revenda = 0;
    let despesa = 0;
    let ativo = 0;
    
    // CFOPs de Revenda: 1102, 2102, 1403, 2403
    const cfopsRevenda = ['1102', '2102', '1403', '2403', '1101', '2101'];
    // CFOPs de Insumo/Matéria-prima: 1101, 2101, 1201, 2201
    const cfopsInsumo = ['1101', '2101', '1201', '2201'];
    // CFOPs de Despesa: 1556, 2556, 1407, 2407, 1653, 2653
    const cfopsDespesa = ['1556', '2556', '1407', '2407', '1653', '2653', '1128', '2128', '1126', '2126'];
    // CFOPs de Ativo: 1551, 2551
    const cfopsAtivo = ['1551', '2551'];
    
    cfops.forEach(c => {
      const cfop = String(c.cfop || '');
      // Usar valor_total (formato do backend atual)
      const valor = c.valor_total || c.total_produtos || c.valor || 0;
      
      if (cfopsAtivo.some(x => cfop.startsWith(x))) ativo += valor;
      else if (cfopsDespesa.some(x => cfop.startsWith(x))) despesa += valor;
      else if (cfopsInsumo.some(x => cfop.startsWith(x))) insumo += valor;
      else if (cfopsRevenda.some(x => cfop.startsWith(x))) revenda += valor;
      else revenda += valor; // Default para revenda
    });
    
    return { insumo, revenda, despesa, ativo, total: insumo + revenda + despesa + ativo };
  };

  // Calcular Margem de Contribuição
  const calcularMargemContribuicao = () => {
    const receitas = calcularReceitas();
    const cmv = calcularCMV();
    const margemAbsoluta = receitas.total - cmv;
    const margemPercentual = receitas.total > 0 ? (margemAbsoluta / receitas.total) * 100 : 0;
    
    return {
      absoluta: margemAbsoluta,
      percentual: margemPercentual
    };
  };

  // Calcular Markup
  const calcularMarkup = () => {
    const receitas = calcularReceitas();
    const cmv = calcularCMV();
    // Markup = (Preço de Venda - Custo) / Custo * 100
    const markup = cmv > 0 ? ((receitas.total - cmv) / cmv) * 100 : 0;
    return markup;
  };

  // Calcular percentuais de impostos
  const calcularPercentuaisImpostos = () => {
    const receitas = calcularReceitas();
    const vendas = receitas.comercio; // Só vendas de mercadorias
    const total = receitas.total; // Total com serviços
    
    const impostos = calcularTotais();
    
    return {
      // Sobre total de saídas (vendas + serviços)
      icms_sobre_total: total > 0 ? (impostos.detalhes.icms?.pagar || 0) / total * 100 : 0,
      pis_sobre_total: total > 0 ? (impostos.detalhes.pis_cofins?.pagar || 0) * 0.35 / total * 100 : 0, // PIS ~35% do PIS+COFINS
      cofins_sobre_total: total > 0 ? (impostos.detalhes.pis_cofins?.pagar || 0) * 0.65 / total * 100 : 0, // COFINS ~65%
      iss_sobre_total: total > 0 ? (impostos.detalhes.iss?.pagar || 0) / total * 100 : 0,
      total_impostos_sobre_total: total > 0 ? impostos.total_pagar / total * 100 : 0,
      
      // Sobre só vendas (sem serviços)
      icms_sobre_vendas: vendas > 0 ? (impostos.detalhes.icms?.pagar || 0) / vendas * 100 : 0,
      pis_sobre_vendas: vendas > 0 ? (impostos.detalhes.pis_cofins?.pagar || 0) * 0.35 / vendas * 100 : 0,
      cofins_sobre_vendas: vendas > 0 ? (impostos.detalhes.pis_cofins?.pagar || 0) * 0.65 / vendas * 100 : 0,
      total_impostos_sobre_vendas: vendas > 0 ? (impostos.detalhes.icms?.pagar || 0 + impostos.detalhes.pis_cofins?.pagar || 0) / vendas * 100 : 0
    };
  };

  // Calcular Lucro Bruto
  const calcularLucroBruto = () => {
    const receitas = calcularReceitas();
    const cmv = calcularCMV();
    return receitas.total - cmv;
  };

  // Calcular Ponto de Equilíbrio para Lucro Real
  const calcularPontoEquilibrio = () => {
    // Para Lucro Real, o objetivo é minimizar o lucro tributável
    // Lucro = Receita - CMV - Despesas
    // Para lucro zero: Despesas = Receita - CMV
    const receitas = calcularReceitas();
    const cmv = calcularCMV();
    const lucroBruto = receitas.total - cmv;
    
    // Despesas necessárias para zerar o lucro tributável
    const despesasParaEquilibrio = lucroBruto > 0 ? lucroBruto : 0;
    
    return {
      receita_total: receitas.total,
      cmv: cmv,
      lucro_bruto: lucroBruto,
      despesas_para_equilibrio: despesasParaEquilibrio,
      economia_potencial: despesasParaEquilibrio * 0.34 // IRPJ 25% + CSLL 9%
    };
  };

  // Calcular Lucro Presumido por atividade
  const calcularLucroPresumido = () => {
    const receitas = calcularReceitas();
    const isMista = selectedCompany?.tipo_atividade === 'mista';
    
    // Percentuais de presunção
    const presuncaoIRPJComercio = selectedCompany?.percentual_presuncao_irpj_comercio || selectedCompany?.percentual_presuncao_irpj || 8;
    const presuncaoCSLLComercio = selectedCompany?.percentual_presuncao_csll_comercio || selectedCompany?.percentual_presuncao_csll || 12;
    const presuncaoIRPJServico = selectedCompany?.percentual_presuncao_irpj_servico || 32;
    const presuncaoCSLLServico = selectedCompany?.percentual_presuncao_csll_servico || 32;
    
    // Base de cálculo
    const baseIRPJComercio = receitas.comercio * (presuncaoIRPJComercio / 100);
    const baseCSLLComercio = receitas.comercio * (presuncaoCSLLComercio / 100);
    const baseIRPJServico = receitas.servicos * (presuncaoIRPJServico / 100);
    const baseCSLLServico = receitas.servicos * (presuncaoCSLLServico / 100);
    
    // IRPJ 15% + Adicional 10% sobre excedente de R$ 20.000/mês
    const calcularIRPJ = (base) => {
      const irpjBase = base * 0.15;
      const adicional = base > 20000 ? (base - 20000) * 0.10 : 0;
      return irpjBase + adicional;
    };
    
    // CSLL 9%
    const calcularCSLL = (base) => base * 0.09;
    
    const irpjComercio = calcularIRPJ(baseIRPJComercio);
    const csllComercio = calcularCSLL(baseCSLLComercio);
    const irpjServico = calcularIRPJ(baseIRPJServico);
    const csllServico = calcularCSLL(baseCSLLServico);
    
    return {
      comercio: {
        receita: receitas.comercio,
        presuncao_irpj: presuncaoIRPJComercio,
        presuncao_csll: presuncaoCSLLComercio,
        base_irpj: baseIRPJComercio,
        base_csll: baseCSLLComercio,
        irpj: irpjComercio,
        csll: csllComercio,
        total: irpjComercio + csllComercio
      },
      servicos: {
        receita: receitas.servicos,
        presuncao_irpj: presuncaoIRPJServico,
        presuncao_csll: presuncaoCSLLServico,
        base_irpj: baseIRPJServico,
        base_csll: baseCSLLServico,
        irpj: irpjServico,
        csll: csllServico,
        total: irpjServico + csllServico
      },
      total: {
        irpj: irpjComercio + irpjServico,
        csll: csllComercio + csllServico,
        total: irpjComercio + csllComercio + irpjServico + csllServico
      },
      is_mista: isMista
    };
  };

  // Calcular totais de impostos
  const calcularTotais = () => {
    if (!dados) return { total_pagar: 0, total_recuperar: 0, saldo_liquido: 0, detalhes: {} };
    
    const icms_pagar = isContribuinteICMS() && dados.icms?.apuracao?.situacao === 'A_PAGAR' ? dados.icms?.apuracao?.saldo || 0 : 0;
    const icms_recuperar = isContribuinteICMS() && dados.icms?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.icms?.apuracao?.saldo || 0) : 0;
    
    const iss_pagar = isContribuinteISS() ? dados.iss?.resumo?.iss_a_pagar || 0 : 0;
    
    const pis_pagar = dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total > 0 ? dados.pis_cofins?.lucro_real?.imposto_a_pagar?.total : 0;
    const pis_recuperar = dados.pis_cofins?.lucro_real?.saldo?.total < 0 ? Math.abs(dados.pis_cofins?.lucro_real?.saldo?.total) : 0;
    
    const icms_st_pagar = isContribuinteICMSST() ? dados.icms?.icms_st?.apuracao?.icms_st_a_recolher || 0 : 0;
    
    const ipi_pagar = isContribuinteIPI() && dados.ipi?.apuracao?.situacao === 'A_PAGAR' ? dados.ipi?.apuracao?.saldo || 0 : 0;
    const ipi_recuperar = isContribuinteIPI() && dados.ipi?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.ipi?.apuracao?.saldo || 0) : 0;
    
    const total_pagar = icms_pagar + iss_pagar + pis_pagar + icms_st_pagar + ipi_pagar;
    const total_recuperar = icms_recuperar + pis_recuperar + ipi_recuperar;
    
    return {
      total_pagar,
      total_recuperar,
      saldo_liquido: total_pagar - total_recuperar,
      detalhes: {
        icms: { pagar: icms_pagar, recuperar: icms_recuperar },
        iss: { pagar: iss_pagar, recuperar: 0 },
        pis_cofins: { pagar: pis_pagar, recuperar: pis_recuperar },
        icms_st: { pagar: icms_st_pagar, recuperar: 0 },
        ipi: { pagar: ipi_pagar, recuperar: ipi_recuperar }
      }
    };
  };

  const totais = calcularTotais();
  const pontoEquilibrio = calcularPontoEquilibrio();
  const lucroPresumido = calcularLucroPresumido();

  // Card de Imposto (só renderiza se empresa for contribuinte)
  const ImpostoCard = ({ titulo, icone: Icon, corIcone, apagar, arecuperar, visible = true }) => {
    if (!visible) return null;
    
    return (
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
  };

  // Renderizar insights IA formatados
  const renderInsightsIA = (texto) => {
    if (!texto) return null;
    return texto.split('\n').map((line, idx) => {
      const cleanLine = line
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#+\s*/, '')
        .trim();
      
      if (!cleanLine) return null;
      
      const isTitulo = /^(\d+\.|[A-ZÁÉÍÓÚÀÃÕÇ\s]{5,}:)/.test(cleanLine);
      const isListItem = /^[-•*]\s/.test(cleanLine) || /^\d+\)\s/.test(cleanLine);
      
      if (isTitulo) {
        return (
          <h4 key={idx} className="text-lg font-bold text-[#C8A951] mt-4 mb-2 border-b border-[#2A2A2A] pb-1">
            {cleanLine}
          </h4>
        );
      } else if (isListItem) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-1">
            <span className="text-[#C8A951] mt-1">•</span>
            <span className="text-[#E0E0E0]">{cleanLine.replace(/^[-•*]\s*/, '').replace(/^\d+\)\s*/, '')}</span>
          </div>
        );
      } else {
        return <p key={idx} className="text-[#E0E0E0] my-2">{cleanLine}</p>;
      }
    });
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="w-7 h-7 text-[#C8A951]" />
              Indicadores
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              CMV/CPV, Margens, Ponto de Equilíbrio e Análise de Indicadores Financeiros
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
                  Regime: <span className="text-[#C8A951]">{selectedCompany.regime_tributario?.replace('_', ' ')?.toUpperCase() || 'N/D'}</span> |
                  Atividade: <span className="text-blue-400">{selectedCompany.tipo_atividade?.toUpperCase() || 'N/D'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {selectedCompany && !loading && (
          <div className="flex gap-2 mb-6 border-b border-[#2A2A2A] pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('resumo')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'resumo' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Resumo
            </button>
            <button
              onClick={() => setActiveTab('cmv')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cmv' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Package className="w-4 h-4" />
              CMV/CPV
            </button>
            <button
              onClick={() => setActiveTab('indicadores')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'indicadores' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Percent className="w-4 h-4" />
              Indicadores
            </button>
            <button
              onClick={() => setActiveTab('equilibrio')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'equilibrio' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Scale className="w-4 h-4" />
              Ponto de Equilíbrio
            </button>
            <button
              onClick={() => setActiveTab('comparativo')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'comparativo' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Comparativo Regimes
            </button>
            <button
              onClick={() => setActiveTab('viloes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'viloes' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Vilões
              {analiseIA?.viloes_tributarios?.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {analiseIA.viloes_tributarios.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('oportunidades')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'oportunidades' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Oportunidades
              {analiseIA?.oportunidades_economia?.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {analiseIA.oportunidades_economia.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'insights' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Insights IA
            </button>
          </div>
        )}

        {/* Conteúdo das Tabs */}
        {!selectedCompany ? (
          <div className="text-center py-12 text-[#A1A1AA]">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Selecione uma empresa para visualizar a rota de eficiência tributária</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-[#C8A951]" />
            <p className="text-[#A1A1AA]">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* Tab Resumo */}
            {activeTab === 'resumo' && (
              <div className="space-y-6">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                      <span className="text-[#A1A1AA]">Total a Pagar</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totais.total_pagar)}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-green-400" />
                      <span className="text-[#A1A1AA]">Total a Recuperar</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(totais.total_recuperar)}</p>
                  </div>
                  
                  <div className={`bg-gradient-to-br ${totais.saldo_liquido > 0 ? 'from-red-900/30 to-red-950/30 border-red-500/30' : 'from-green-900/30 to-green-950/30 border-green-500/30'} border rounded-xl p-5`}>
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className={`w-6 h-6 ${totais.saldo_liquido > 0 ? 'text-red-400' : 'text-green-400'}`} />
                      <span className="text-[#A1A1AA]">Saldo Líquido</span>
                    </div>
                    <p className={`text-2xl font-bold ${totais.saldo_liquido > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(Math.abs(totais.saldo_liquido))}
                    </p>
                  </div>
                </div>

                {/* Grid de Impostos - Dinâmico baseado nos contribuintes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ImpostoCard
                    titulo="ICMS"
                    icone={FileText}
                    corIcone="bg-blue-600"
                    apagar={totais.detalhes.icms?.pagar}
                    arecuperar={totais.detalhes.icms?.recuperar}
                    visible={isContribuinteICMS()}
                  />
                  <ImpostoCard
                    titulo="ICMS ST"
                    icone={FileText}
                    corIcone="bg-indigo-600"
                    apagar={totais.detalhes.icms_st?.pagar}
                    arecuperar={0}
                    visible={isContribuinteICMSST()}
                  />
                  <ImpostoCard
                    titulo="ISS"
                    icone={FileText}
                    corIcone="bg-purple-600"
                    apagar={totais.detalhes.iss?.pagar}
                    arecuperar={0}
                    visible={isContribuinteISS()}
                  />
                  <ImpostoCard
                    titulo="IPI"
                    icone={FileText}
                    corIcone="bg-orange-600"
                    apagar={totais.detalhes.ipi?.pagar}
                    arecuperar={totais.detalhes.ipi?.recuperar}
                    visible={isContribuinteIPI()}
                  />
                  <ImpostoCard
                    titulo="PIS/COFINS"
                    icone={FileText}
                    corIcone="bg-emerald-600"
                    apagar={totais.detalhes.pis_cofins?.pagar}
                    arecuperar={totais.detalhes.pis_cofins?.recuperar}
                    visible={true}
                  />
                </div>
              </div>
            )}

            {/* Tab CMV/CPV */}
            {activeTab === 'cmv' && (
              <div className="space-y-6">
                {/* Campos de Estoque */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-6 h-6 text-[#C8A951]" />
                    <h3 className="text-lg font-semibold text-white">Estoque para CMV/CPV</h3>
                  </div>
                  <p className="text-[#A1A1AA] text-sm mb-4">
                    Informe o estoque inicial e final do período para calcular o Custo da Mercadoria Vendida (CMV) ou Custo do Produto Vendido (CPV).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Estoque Inicial (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={estoqueInicial}
                        onChange={(e) => setEstoqueInicial(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Estoque Final (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={estoqueFinal}
                        onChange={(e) => setEstoqueFinal(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={salvarEstoque}
                        disabled={savingEstoque}
                        className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {savingEstoque ? 'Salvando...' : 'Salvar Estoque'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cálculo do CMV */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calculator className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Cálculo do CMV/CPV</h3>
                  </div>
                  
                  <div className="bg-[#0C0C0C] rounded-lg p-4 mb-4 font-mono text-sm">
                    <p className="text-[#A1A1AA]">CMV = Estoque Inicial + Compras - Estoque Final</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-[#A1A1AA]">Estoque Inicial</span>
                      <span className="text-white font-medium">{formatCurrency(estoqueInicial)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-400" />
                        Compras do Período
                      </span>
                      <span className="text-green-400 font-medium">
                        {formatCurrency(dados?.icms?.entradas?.total_produtos || dados?.pis_cofins?.compras?.total || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Minus className="w-4 h-4 text-red-400" />
                        Estoque Final
                      </span>
                      <span className="text-red-400 font-medium">{formatCurrency(estoqueFinal)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-[#C8A951]/10 rounded-lg px-3">
                      <span className="text-[#C8A951] font-semibold">= CMV/CPV</span>
                      <span className="text-[#C8A951] font-bold text-xl">{formatCurrency(calcularCMV())}</span>
                    </div>
                  </div>
                </div>

                {/* Lucro Bruto */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Lucro Bruto</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-[#A1A1AA]">Receita Total</span>
                      <span className="text-green-400 font-medium">{formatCurrency(calcularReceitas().total)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Minus className="w-4 h-4 text-red-400" />
                        CMV/CPV
                      </span>
                      <span className="text-red-400 font-medium">{formatCurrency(calcularCMV())}</span>
                    </div>
                    <div className={`flex justify-between items-center py-3 rounded-lg px-3 ${calcularLucroBruto() >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <span className={`font-semibold ${calcularLucroBruto() >= 0 ? 'text-green-400' : 'text-red-400'}`}>= Lucro Bruto</span>
                      <span className={`font-bold text-xl ${calcularLucroBruto() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(calcularLucroBruto())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Indicadores */}
            {activeTab === 'indicadores' && (
              <div className="space-y-6">
                {/* Cards de Indicadores Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Margem de Contribuição */}
                  <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <span className="text-[#A1A1AA] text-sm">Margem de Contribuição</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(calcularMargemContribuicao().absoluta)}</p>
                    <p className="text-sm text-green-300/70 mt-1">{calcularMargemContribuicao().percentual.toFixed(2)}% sobre receita</p>
                  </div>
                  
                  {/* Markup */}
                  <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="w-5 h-5 text-purple-400" />
                      <span className="text-[#A1A1AA] text-sm">Markup</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">{calcularMarkup().toFixed(2)}%</p>
                    <p className="text-sm text-purple-300/70 mt-1">Sobre o custo</p>
                  </div>

                  {/* Total de Vendas */}
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      <span className="text-[#A1A1AA] text-sm">Total de Vendas</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(calcularReceitas().total)}</p>
                    <p className="text-sm text-blue-300/70 mt-1">Receita bruta do período</p>
                  </div>

                  {/* Total de Entradas */}
                  <div className="bg-gradient-to-br from-amber-900/30 to-amber-950/30 border border-amber-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-amber-400" />
                      <span className="text-[#A1A1AA] text-sm">Total de Entradas</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(calcularEntradasPorTipo().total)}</p>
                    <p className="text-sm text-amber-300/70 mt-1">Insumo + Revenda + Despesa</p>
                  </div>
                </div>

                {/* Detalhamento de Entradas por Tipo */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-6 h-6 text-[#C8A951]" />
                    <h3 className="text-lg font-semibold text-white">Entradas por Tipo</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Revenda</span>
                      <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(calcularEntradasPorTipo().revenda)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Insumo</span>
                      <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(calcularEntradasPorTipo().insumo)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Despesa</span>
                      <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(calcularEntradasPorTipo().despesa)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Ativo Imob.</span>
                      <p className="text-xl font-bold text-purple-400 mt-1">{formatCurrency(calcularEntradasPorTipo().ativo)}</p>
                    </div>
                  </div>
                </div>

                {/* Percentuais de Impostos */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Percent className="w-6 h-6 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">Percentual de Impostos sobre Faturamento</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                      <span className="text-xs text-[#A1A1AA]">ICMS</span>
                      <p className="text-xl font-bold text-blue-400 mt-1">{calcularPercentuaisImpostos().icms_sobre_total.toFixed(2)}%</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                      <span className="text-xs text-[#A1A1AA]">PIS</span>
                      <p className="text-xl font-bold text-green-400 mt-1">{calcularPercentuaisImpostos().pis_sobre_total.toFixed(2)}%</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                      <span className="text-xs text-[#A1A1AA]">COFINS</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">{calcularPercentuaisImpostos().cofins_sobre_total.toFixed(2)}%</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                      <span className="text-xs text-[#A1A1AA]">ISS</span>
                      <p className="text-xl font-bold text-purple-400 mt-1">{calcularPercentuaisImpostos().iss_sobre_total.toFixed(2)}%</p>
                    </div>
                    <div className="bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/10 rounded-lg p-4 text-center border border-[#C8A951]/30">
                      <span className="text-xs text-[#A1A1AA]">Total Impostos</span>
                      <p className="text-xl font-bold text-[#C8A951] mt-1">{calcularPercentuaisImpostos().total_impostos_sobre_total.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* DRE Simplificado */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="w-6 h-6 text-[#C8A951]" />
                    <h3 className="text-lg font-semibold text-white">DRE Simplificado</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
                      <span className="text-white font-medium">Receita Bruta (Vendas + Serviços)</span>
                      <span className="text-green-400 font-bold text-lg">{formatCurrency(calcularReceitas().total)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A] pl-4">
                      <span className="text-[#A1A1AA]">└ Vendas de Mercadorias</span>
                      <span className="text-white">{formatCurrency(calcularReceitas().comercio)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A] pl-4">
                      <span className="text-[#A1A1AA]">└ Prestação de Serviços</span>
                      <span className="text-white">{formatCurrency(calcularReceitas().servicos)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-[#2A2A2A]">
                      <span className="text-white font-medium flex items-center gap-2">
                        <Minus className="w-4 h-4 text-red-400" />
                        CMV/CPV
                      </span>
                      <span className="text-red-400 font-bold text-lg">{formatCurrency(calcularCMV())}</span>
                    </div>
                    <div className={`flex justify-between items-center py-4 rounded-lg px-3 ${calcularLucroBruto() >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <span className={`font-semibold ${calcularLucroBruto() >= 0 ? 'text-green-400' : 'text-red-400'}`}>= Lucro Bruto</span>
                      <span className={`font-bold text-xl ${calcularLucroBruto() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(calcularLucroBruto())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Ponto de Equilíbrio */}
            {activeTab === 'equilibrio' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Scale className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Ponto de Equilíbrio - Lucro Real</h3>
                  </div>
                  <p className="text-[#A1A1AA] text-sm mb-4">
                    Para empresas do <span className="text-blue-400 font-medium">Lucro Real</span>, quanto menor o lucro tributável, menor o imposto. 
                    Esta análise mostra quanto de despesa você precisaria ter para zerar o lucro e a economia potencial.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Demonstrativo */}
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Demonstrativo</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">Receita Total</span>
                          <span className="text-white font-medium">{formatCurrency(pontoEquilibrio.receita_total)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">(-) CMV/CPV</span>
                          <span className="text-red-400 font-medium">{formatCurrency(pontoEquilibrio.cmv)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">= Lucro Bruto</span>
                          <span className="text-[#C8A951] font-medium">{formatCurrency(pontoEquilibrio.lucro_bruto)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Análise */}
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Análise de Ponto de Equilíbrio</h4>
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-400 font-medium">Despesas para Equilibrar</span>
                          </div>
                          <p className="text-2xl font-bold text-amber-400">
                            {formatCurrency(pontoEquilibrio.despesas_para_equilibrio)}
                          </p>
                          <p className="text-xs text-[#A1A1AA] mt-1">
                            Valor de despesas operacionais necessário para zerar o lucro tributável
                          </p>
                        </div>
                        
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <PiggyBank className="w-5 h-5 text-green-400" />
                            <span className="text-green-400 font-medium">Economia Potencial em IRPJ+CSLL</span>
                          </div>
                          <p className="text-2xl font-bold text-green-400">
                            {formatCurrency(pontoEquilibrio.economia_potencial)}
                          </p>
                          <p className="text-xs text-[#A1A1AA] mt-1">
                            Economia se conseguir despesas até o ponto de equilíbrio (IRPJ 25% + CSLL 9%)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-[#2A2A2A] rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-[#C8A951] mt-0.5" />
                      <div>
                        <p className="text-white font-medium">Dica para o empresário</p>
                        <p className="text-[#A1A1AA] text-sm mt-1">
                          Considere investimentos, manutenções, treinamentos ou outras despesas operacionais dedutíveis
                          para aproveitar o lucro bruto sem pagar imposto desnecessário. Consulte seu contador para 
                          avaliar as melhores opções de despesas dedutíveis.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Comparativo de Regimes */}
            {activeTab === 'comparativo' && (
              <div className="space-y-6">
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calculator className="w-6 h-6 text-[#C8A951]" />
                    <h3 className="text-lg font-semibold text-white">Simulação Lucro Presumido</h3>
                  </div>
                  <p className="text-[#A1A1AA] text-sm mb-4">
                    Simulação do IRPJ e CSLL caso a empresa fosse do Lucro Presumido, com base nas receitas escrituradas.
                  </p>

                  {/* Atividade de Comércio */}
                  {(calcularReceitas().comercio > 0 || selectedCompany?.tipo_atividade === 'comercio' || selectedCompany?.tipo_atividade === 'mista') && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h4 className="text-blue-400 font-medium">Atividade de Comércio/Indústria</h4>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Receita</span>
                            <p className="text-white font-medium">{formatCurrency(lucroPresumido.comercio.receita)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Presunção IRPJ</span>
                            <p className="text-white font-medium">{lucroPresumido.comercio.presuncao_irpj}%</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Presunção CSLL</span>
                            <p className="text-white font-medium">{lucroPresumido.comercio.presuncao_csll}%</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-[#2A2A2A]">
                          <div>
                            <span className="text-xs text-[#A1A1AA]">IRPJ (15% + adicional)</span>
                            <p className="text-red-400 font-bold">{formatCurrency(lucroPresumido.comercio.irpj)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">CSLL (9%)</span>
                            <p className="text-red-400 font-bold">{formatCurrency(lucroPresumido.comercio.csll)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Total Comércio</span>
                            <p className="text-[#C8A951] font-bold">{formatCurrency(lucroPresumido.comercio.total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Atividade de Serviços */}
                  {(calcularReceitas().servicos > 0 || selectedCompany?.tipo_atividade === 'servicos' || selectedCompany?.tipo_atividade === 'mista') && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h4 className="text-purple-400 font-medium">Atividade de Serviços</h4>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Receita</span>
                            <p className="text-white font-medium">{formatCurrency(lucroPresumido.servicos.receita)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Presunção IRPJ</span>
                            <p className="text-white font-medium">{lucroPresumido.servicos.presuncao_irpj}%</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Presunção CSLL</span>
                            <p className="text-white font-medium">{lucroPresumido.servicos.presuncao_csll}%</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-[#2A2A2A]">
                          <div>
                            <span className="text-xs text-[#A1A1AA]">IRPJ (15% + adicional)</span>
                            <p className="text-red-400 font-bold">{formatCurrency(lucroPresumido.servicos.irpj)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">CSLL (9%)</span>
                            <p className="text-red-400 font-bold">{formatCurrency(lucroPresumido.servicos.csll)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-[#A1A1AA]">Total Serviços</span>
                            <p className="text-[#C8A951] font-bold">{formatCurrency(lucroPresumido.servicos.total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Consolidado */}
                  <div className="bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/10 border border-[#C8A951]/30 rounded-lg p-4">
                    <h4 className="text-[#C8A951] font-semibold mb-3">Total Lucro Presumido (IRPJ + CSLL)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-[#A1A1AA]">IRPJ Total</span>
                        <p className="text-xl font-bold text-white">{formatCurrency(lucroPresumido.total.irpj)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#A1A1AA]">CSLL Total</span>
                        <p className="text-xl font-bold text-white">{formatCurrency(lucroPresumido.total.csll)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#A1A1AA]">Total a Pagar</span>
                        <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(lucroPresumido.total.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Vilões */}
            {activeTab === 'viloes' && (
              <div className="space-y-4">
                {analiseIA?.viloes_tributarios?.length > 0 ? (
                  analiseIA.viloes_tributarios.map((vilao, idx) => (
                    <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{vilao.produto || vilao.ncm || `Item ${idx + 1}`}</h4>
                          <p className="text-[#A1A1AA] text-sm mt-1">{vilao.motivo || vilao.descricao}</p>
                          {vilao.valor && (
                            <p className="text-red-400 font-bold mt-2">Impacto: {formatCurrency(vilao.valor)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#A1A1AA]">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400/50" />
                    <p>Nenhum vilão tributário identificado nesta competência</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Oportunidades */}
            {activeTab === 'oportunidades' && (
              <div className="space-y-4">
                {analiseIA?.oportunidades_economia?.length > 0 ? (
                  analiseIA.oportunidades_economia.map((oportunidade, idx) => (
                    <div key={idx} className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{oportunidade.titulo || `Oportunidade ${idx + 1}`}</h4>
                          <p className="text-[#A1A1AA] text-sm mt-1">{oportunidade.descricao}</p>
                          {oportunidade.economia_potencial && (
                            <p className="text-green-400 font-bold mt-2">
                              Economia potencial: {formatCurrency(oportunidade.economia_potencial)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#A1A1AA]">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma oportunidade de economia identificada nesta competência</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab Insights IA */}
            {activeTab === 'insights' && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">Análise Inteligente</h3>
                </div>
                {analiseIA?.insights ? (
                  <div className="prose prose-invert max-w-none">
                    {renderInsightsIA(analiseIA.insights)}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#A1A1AA]">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum insight disponível para esta competência</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Indicadores;
