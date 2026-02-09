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
  Percent, PiggyBank, Minus, Plus, Save, Edit3
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Indicadores = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia, refreshCompanies } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [analiseIA, setAnaliseIA] = useState(null);
  const [activeTab, setActiveTab] = useState('impostos');
  
  // Estoque para CMV/CPV
  const [estoqueInicial, setEstoqueInicial] = useState(0);
  const [estoqueFinal, setEstoqueFinal] = useState(0);
  const [savingEstoque, setSavingEstoque] = useState(false);
  
  // DRE Flutuante - Despesa Real
  const [despesaReal, setDespesaReal] = useState(0);

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Carregar estoque e despesa da empresa
      setEstoqueInicial(selectedCompany.estoque_inicial || 0);
      setEstoqueFinal(selectedCompany.estoque_final || 0);
      setDespesaReal(selectedCompany.despesa_real || 0);
      
      // Buscar dados de apuração consolidados
      const [icmsRes, issRes, pisRes, ipiRes, simplesRes] = await Promise.all([
        axios.get(`${API}/apuracao-icms/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-iss/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/pis-cofins/apuracao/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        axios.get(`${API}/apuracao-ipi/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }).catch(() => null),
        selectedCompany?.regime_tributario === 'simples_nacional' 
          ? axios.post(`${API}/dashboard/simples-nacional`, {
              company_id: selectedCompany.id,
              ano: parseInt(selectedCompetencia.split('/')[1]),
              mes: parseInt(selectedCompetencia.split('/')[0])
            }, { headers }).catch(() => null)
          : null
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
        ipi: ipiRes?.data,
        simples: simplesRes?.data
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

  // Salvar estoque e despesa na empresa
  const salvarDados = async () => {
    if (!selectedCompany?.id) return;
    setSavingEstoque(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/companies/${selectedCompany.id}`, {
        estoque_inicial: estoqueInicial,
        estoque_final: estoqueFinal,
        despesa_real: despesaReal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshCompanies && refreshCompanies();
      alert('Dados salvos com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar dados:', err);
      alert('Erro ao salvar dados');
    } finally {
      setSavingEstoque(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatPercentual = (value) => {
    return `${(value || 0).toFixed(2)}%`;
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
  
  // Verificar se empresa é Simples Nacional
  const isSimples = () => {
    return selectedCompany?.regime_tributario === 'simples_nacional';
  };

  // Calcular receitas (vendas de mercadorias + serviços)
  const calcularReceitas = () => {
    const receitaComercio = dados?.icms?.saidas?.totais?.valor_total || 0;
    const receitaServicos = dados?.iss?.resumo?.receita_servicos || dados?.iss?.resumo?.total_servicos || 0;
    
    return {
      comercio: receitaComercio,
      servicos: receitaServicos,
      total: receitaComercio + receitaServicos
    };
  };

  // Calcular CMV/CPV
  const calcularCMV = () => {
    const compras = dados?.icms?.entradas?.totais?.valor_total || 0;
    return estoqueInicial + compras - estoqueFinal;
  };

  // Calcular Lucro Bruto
  const calcularLucroBruto = () => {
    const receitas = calcularReceitas();
    const cmv = calcularCMV();
    return receitas.total - cmv;
  };

  // Calcular Lucro Contábil (com despesa real informada)
  const calcularLucroContabil = () => {
    const lucroBruto = calcularLucroBruto();
    return lucroBruto - despesaReal;
  };

  // Calcular totais de impostos
  const calcularTotais = () => {
    if (!dados) return { total_pagar: 0, total_recuperar: 0, saldo_liquido: 0, detalhes: {} };
    
    const icms_pagar = isContribuinteICMS() && dados.icms?.apuracao?.situacao === 'A_PAGAR' ? dados.icms?.apuracao?.saldo || 0 : 0;
    const icms_recuperar = isContribuinteICMS() && dados.icms?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.icms?.apuracao?.saldo || 0) : 0;
    
    const iss_pagar = isContribuinteISS() ? dados.iss?.resumo?.iss_a_pagar || 0 : 0;
    
    // Determinar regime para PIS/COFINS
    const isLucroPresumido = selectedCompany?.regime_tributario === 'lucro_presumido';
    const pisCofinsData = isLucroPresumido 
      ? dados.pis_cofins?.lucro_presumido 
      : dados.pis_cofins?.lucro_real;
    
    // PIS e COFINS separados - usar dados do regime correto
    const pis_pagar = pisCofinsData?.imposto_a_pagar?.pis > 0 ? pisCofinsData?.imposto_a_pagar?.pis : 0;
    const cofins_pagar = pisCofinsData?.imposto_a_pagar?.cofins > 0 ? pisCofinsData?.imposto_a_pagar?.cofins : 0;
    const pis_recuperar = pisCofinsData?.saldo?.pis < 0 ? Math.abs(pisCofinsData?.saldo?.pis) : 0;
    const cofins_recuperar = pisCofinsData?.saldo?.cofins < 0 ? Math.abs(pisCofinsData?.saldo?.cofins) : 0;
    
    const icms_st_pagar = isContribuinteICMSST() ? dados.icms?.icms_st?.apuracao?.icms_st_a_recolher || 0 : 0;
    
    const ipi_pagar = isContribuinteIPI() && dados.ipi?.apuracao?.situacao === 'A_PAGAR' ? dados.ipi?.apuracao?.saldo || 0 : 0;
    const ipi_recuperar = isContribuinteIPI() && dados.ipi?.apuracao?.situacao === 'A_RECUPERAR' ? Math.abs(dados.ipi?.apuracao?.saldo || 0) : 0;
    
    const total_pagar = icms_pagar + iss_pagar + pis_pagar + cofins_pagar + icms_st_pagar + ipi_pagar;
    const total_recuperar = icms_recuperar + pis_recuperar + cofins_recuperar + ipi_recuperar;
    
    return {
      total_pagar,
      total_recuperar,
      saldo_liquido: total_pagar - total_recuperar,
      detalhes: {
        icms: { pagar: icms_pagar, recuperar: icms_recuperar },
        iss: { pagar: iss_pagar, recuperar: 0 },
        pis: { pagar: pis_pagar, recuperar: pis_recuperar },
        cofins: { pagar: cofins_pagar, recuperar: cofins_recuperar },
        icms_st: { pagar: icms_st_pagar, recuperar: 0 },
        ipi: { pagar: ipi_pagar, recuperar: ipi_recuperar }
      }
    };
  };

  // Calcular percentuais de impostos
  const calcularPercentuais = () => {
    const receitas = calcularReceitas();
    const saidas = receitas.total; // Total de saídas (vendas + serviços)
    const vendas = receitas.comercio; // Só vendas de mercadorias
    const totais = calcularTotais();
    
    const calcPercent = (valor, base) => base > 0 ? (valor / base) * 100 : 0;
    
    return {
      icms: {
        valor: totais.detalhes.icms?.pagar || 0,
        sobre_saidas: calcPercent(totais.detalhes.icms?.pagar || 0, saidas),
        sobre_vendas: calcPercent(totais.detalhes.icms?.pagar || 0, vendas)
      },
      pis: {
        valor: totais.detalhes.pis?.pagar || 0,
        sobre_saidas: calcPercent(totais.detalhes.pis?.pagar || 0, saidas),
        sobre_vendas: calcPercent(totais.detalhes.pis?.pagar || 0, vendas)
      },
      cofins: {
        valor: totais.detalhes.cofins?.pagar || 0,
        sobre_saidas: calcPercent(totais.detalhes.cofins?.pagar || 0, saidas),
        sobre_vendas: calcPercent(totais.detalhes.cofins?.pagar || 0, vendas)
      },
      iss: {
        valor: totais.detalhes.iss?.pagar || 0,
        sobre_saidas: calcPercent(totais.detalhes.iss?.pagar || 0, saidas),
        sobre_vendas: calcPercent(totais.detalhes.iss?.pagar || 0, vendas)
      },
      ipi: {
        valor: totais.detalhes.ipi?.pagar || 0,
        sobre_saidas: calcPercent(totais.detalhes.ipi?.pagar || 0, saidas),
        sobre_vendas: calcPercent(totais.detalhes.ipi?.pagar || 0, vendas)
      },
      icms_st: {
        valor: totais.detalhes.icms_st?.pagar || 0,
        sobre_saidas: calcPercent(totais.detalhes.icms_st?.pagar || 0, saidas),
        sobre_vendas: calcPercent(totais.detalhes.icms_st?.pagar || 0, vendas)
      },
      total: {
        valor: totais.total_pagar,
        sobre_saidas: calcPercent(totais.total_pagar, saidas),
        sobre_vendas: calcPercent(totais.total_pagar, vendas)
      }
    };
  };

  // Calcular Ponto de Equilíbrio
  const calcularPontoEquilibrio = () => {
    const lucroBruto = calcularLucroBruto();
    // Despesas para zerar o lucro tributável
    const despesasParaEquilibrio = lucroBruto > 0 ? lucroBruto : 0;
    
    return {
      lucro_bruto: lucroBruto,
      despesas_para_equilibrio: despesasParaEquilibrio,
      economia_potencial: despesasParaEquilibrio * 0.34 // IRPJ 25% + CSLL 9%
    };
  };

  // Calcular Indicadores
  const calcularIndicadores = () => {
    const receitas = calcularReceitas();
    const cmv = calcularCMV();
    const lucroBruto = calcularLucroBruto();
    
    // Margem de Contribuição
    const margemAbsoluta = lucroBruto;
    const margemPercentual = receitas.total > 0 ? (margemAbsoluta / receitas.total) * 100 : 0;
    
    // Markup
    const markup = cmv > 0 ? ((receitas.total - cmv) / cmv) * 100 : 0;
    
    // Entradas por tipo
    const entradas = dados?.icms?.entradas || {};
    const cfops = entradas.por_cfop || [];
    
    let insumo = 0, revenda = 0, despesa = 0, ativo = 0;
    const cfopsRevenda = ['1102', '2102', '1403', '2403', '1101', '2101'];
    const cfopsInsumo = ['1101', '2101', '1201', '2201'];
    const cfopsDespesa = ['1556', '2556', '1407', '2407', '1653', '2653', '1128', '2128', '1126', '2126'];
    const cfopsAtivo = ['1551', '2551'];
    
    cfops.forEach(c => {
      const cfop = String(c.cfop || '');
      const valor = c.valor_total || c.total_produtos || c.valor || 0;
      
      if (cfopsAtivo.some(x => cfop.startsWith(x))) ativo += valor;
      else if (cfopsDespesa.some(x => cfop.startsWith(x))) despesa += valor;
      else if (cfopsInsumo.some(x => cfop.startsWith(x))) insumo += valor;
      else if (cfopsRevenda.some(x => cfop.startsWith(x))) revenda += valor;
      else revenda += valor;
    });
    
    return {
      margem: { absoluta: margemAbsoluta, percentual: margemPercentual },
      markup,
      entradas: { insumo, revenda, despesa, ativo, total: insumo + revenda + despesa + ativo }
    };
  };

  const totais = calcularTotais();
  const percentuais = calcularPercentuais();
  const pontoEquilibrio = calcularPontoEquilibrio();
  const indicadores = calcularIndicadores();
  const receitas = calcularReceitas();
  const lucroContabil = calcularLucroContabil();

  // Card de Imposto Individualizado
  const ImpostoCard = ({ titulo, icone: Icon, cor, valor, percentSaidas, percentVendas, visible = true, saldoCredor = 0, showSempre = false }) => {
    // Mostrar card se: visible AND (tem valor a pagar OU tem saldo credor OU showSempre)
    if (!visible) return null;
    if (!showSempre && valor <= 0 && saldoCredor <= 0) return null;
    
    const temAPagar = valor > 0;
    const temCredor = saldoCredor > 0;
    
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`${cor} p-2 rounded-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold">{titulo}</span>
          {temCredor && !temAPagar && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              Credor
            </span>
          )}
        </div>
        <div className="space-y-2">
          {temAPagar ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA] text-sm">A Pagar</span>
                <span className="text-red-400 font-bold">{formatCurrency(valor)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA] text-sm">% s/ Saídas</span>
                <span className="text-[#C8A951] font-medium">{formatPercentual(percentSaidas)}</span>
              </div>
            </>
          ) : temCredor ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA] text-sm">Saldo Credor</span>
                <span className="text-green-400 font-bold">{formatCurrency(saldoCredor)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA] text-sm">A Pagar</span>
                <span className="text-[#666] font-medium">R$ 0,00</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA] text-sm">Valor</span>
              <span className="text-[#666] font-medium">R$ 0,00</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar insights IA
  const renderInsightsIA = (texto) => {
    if (!texto) return null;
    return texto.split('\n').map((line, idx) => {
      const cleanLine = line.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^#+\s*/, '').trim();
      if (!cleanLine) return null;
      
      const isTitulo = /^(\d+\.|[A-ZÁÉÍÓÚÀÃÕÇ\s]{5,}:)/.test(cleanLine);
      const isListItem = /^[-•*]\s/.test(cleanLine) || /^\d+\)\s/.test(cleanLine);
      
      if (isTitulo) {
        return <h4 key={idx} className="text-lg font-bold text-[#C8A951] mt-4 mb-2 border-b border-[#2A2A2A] pb-1">{cleanLine}</h4>;
      } else if (isListItem) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-1">
            <span className="text-[#C8A951] mt-1">•</span>
            <span className="text-[#E0E0E0]">{cleanLine.replace(/^[-•*]\s*/, '').replace(/^\d+\)\s*/, '')}</span>
          </div>
        );
      }
      return <p key={idx} className="text-[#E0E0E0] my-2">{cleanLine}</p>;
    });
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#C8A951]" />
              Indicadores
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Impostos, CMV/CPV, Ponto de Equilíbrio e DRE Flutuante
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
              onClick={() => setActiveTab('impostos')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'impostos' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Impostos
            </button>
            <button
              onClick={() => setActiveTab('cmv_equilibrio')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'cmv_equilibrio' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Scale className="w-4 h-4" />
              CMV/CPV e Ponto de Equilíbrio
            </button>
            <button
              onClick={() => setActiveTab('indicadores')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'indicadores' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
              }`}
            >
              <Percent className="w-4 h-4" />
              Margens e Markup
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

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="text-center py-12 text-[#A1A1AA]">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Selecione uma empresa para visualizar os indicadores</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-[#C8A951]" />
            <p className="text-[#A1A1AA]">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* Tab Impostos */}
            {activeTab === 'impostos' && (
              <div className="space-y-6">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                      <span className="text-[#A1A1AA]">Total Saídas</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(receitas.total)}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-6 h-6 text-green-400" />
                      <span className="text-[#A1A1AA]">Vendas Merc.</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(receitas.comercio)}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                      <span className="text-[#A1A1AA]">{isSimples() ? 'DAS a Pagar' : 'Total Impostos'}</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(isSimples() ? (dados?.simples?.das_mes_atual?.valor_das_final || dados?.simples?.impostos_mes?.das || 0) : totais.total_pagar)}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-[#C8A951]/20 to-[#C8A951]/10 border border-[#C8A951]/30 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Percent className="w-6 h-6 text-[#C8A951]" />
                      <span className="text-[#A1A1AA]">{isSimples() ? 'Alíquota Efetiva' : '% s/ Saídas'}</span>
                    </div>
                    <p className="text-2xl font-bold text-[#C8A951]">
                      {isSimples() 
                        ? formatPercentual(dados?.simples?.enquadramento?.aliquota_efetiva || 0)
                        : formatPercentual(percentuais.total.sobre_saidas)}
                    </p>
                  </div>
                </div>

                {/* Simples Nacional - Composição do DAS */}
                {isSimples() ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white mt-6 mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-[#C8A951]" />
                      Composição do DAS - Simples Nacional
                    </h3>
                    
                    {/* Info do Anexo e Faixa */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                        <p className="text-[#666] text-sm mb-1">Anexo</p>
                        <p className="text-white font-bold text-lg">{dados?.simples?.enquadramento?.anexo_principal || 'I'}</p>
                      </div>
                      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                        <p className="text-[#666] text-sm mb-1">Faixa</p>
                        <p className="text-white font-bold text-lg">{dados?.simples?.enquadramento?.faixa?.faixa || '1'}</p>
                      </div>
                      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                        <p className="text-[#666] text-sm mb-1">RBT12 (Receita Bruta)</p>
                        <p className="text-white font-bold text-lg">{formatCurrency(dados?.simples?.faturamento?.rbt12)}</p>
                      </div>
                    </div>
                    
                    {/* Tabela de Composição do DAS */}
                    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#0C0C0C]">
                          <tr>
                            <th className="text-left px-4 py-3 text-[#A1A1AA] font-medium">Tributo</th>
                            <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">% no DAS</th>
                            <th className="text-right px-4 py-3 text-[#A1A1AA] font-medium">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]">
                          {(() => {
                            const reparticao = dados?.simples?.das_mes_atual?.reparticao || {};
                            const dasValor = dados?.simples?.das_mes_atual?.valor_das_final || 0;
                            return (
                              <>
                                <tr className="hover:bg-[#1A1A1A]">
                                  <td className="px-4 py-3 text-white">IRPJ</td>
                                  <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatPercentual(reparticao.irpj_percent || 5.5)}</td>
                                  <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(reparticao.irpj || (dasValor * 0.055))}</td>
                                </tr>
                                <tr className="hover:bg-[#1A1A1A]">
                                  <td className="px-4 py-3 text-white">CSLL</td>
                                  <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatPercentual(reparticao.csll_percent || 3.5)}</td>
                                  <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(reparticao.csll || (dasValor * 0.035))}</td>
                                </tr>
                                <tr className="hover:bg-[#1A1A1A]">
                                  <td className="px-4 py-3 text-white">COFINS</td>
                                  <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatPercentual(reparticao.cofins_percent || 11.51)}</td>
                                  <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(reparticao.cofins || (dasValor * 0.1151))}</td>
                                </tr>
                                <tr className="hover:bg-[#1A1A1A]">
                                  <td className="px-4 py-3 text-white">PIS</td>
                                  <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatPercentual(reparticao.pis_percent || 2.76)}</td>
                                  <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(reparticao.pis || (dasValor * 0.0276))}</td>
                                </tr>
                                <tr className="hover:bg-[#1A1A1A]">
                                  <td className="px-4 py-3 text-white">CPP</td>
                                  <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatPercentual(reparticao.cpp_percent || 41.5)}</td>
                                  <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(reparticao.cpp || (dasValor * 0.415))}</td>
                                </tr>
                                <tr className="hover:bg-[#1A1A1A]">
                                  <td className="px-4 py-3 text-white">ICMS</td>
                                  <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatPercentual(reparticao.icms_percent || 33.5)}</td>
                                  <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(reparticao.icms || (dasValor * 0.335))}</td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                        <tfoot className="bg-[#C8A951]/10 border-t-2 border-[#C8A951]">
                          <tr>
                            <td className="px-4 py-3 text-[#C8A951] font-bold">TOTAL DAS</td>
                            <td className="px-4 py-3 text-right text-[#C8A951] font-bold">{formatPercentual(dados?.simples?.enquadramento?.aliquota_efetiva || 0)}</td>
                            <td className="px-4 py-3 text-right text-[#C8A951] font-bold text-lg">{formatCurrency(dados?.simples?.das_mes_atual?.valor_das_final || dados?.simples?.impostos_mes?.das)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    {/* Nota informativa */}
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mt-4">
                      <p className="text-sm text-blue-300">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        No Simples Nacional, todos os tributos federais, estaduais e municipais são unificados no DAS (Documento de Arrecadação do Simples Nacional). 
                        O percentual de cada tributo varia conforme o Anexo e a faixa de faturamento da empresa.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Demais Regimes - Grid de Impostos Individualizados */
                  <>
                    <h3 className="text-lg font-semibold text-white mt-6 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#C8A951]" />
                      Impostos Individualizados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <ImpostoCard
                        titulo="ICMS"
                        icone={FileText}
                        cor="bg-blue-600"
                        valor={percentuais.icms.valor}
                        saldoCredor={totais.detalhes.icms?.recuperar || 0}
                        percentSaidas={percentuais.icms.sobre_saidas}
                        percentVendas={percentuais.icms.sobre_vendas}
                        visible={isContribuinteICMS()}
                        showSempre={isContribuinteICMS()}
                      />
                      <ImpostoCard
                        titulo="ICMS ST"
                        icone={FileText}
                        cor="bg-indigo-600"
                        valor={percentuais.icms_st.valor}
                        percentSaidas={percentuais.icms_st.sobre_saidas}
                        percentVendas={percentuais.icms_st.sobre_vendas}
                        visible={isContribuinteICMSST()}
                      />
                      <ImpostoCard
                        titulo="PIS"
                        icone={FileText}
                        cor="bg-emerald-600"
                        valor={percentuais.pis.valor}
                        percentSaidas={percentuais.pis.sobre_saidas}
                        percentVendas={percentuais.pis.sobre_vendas}
                        visible={true}
                      />
                      <ImpostoCard
                        titulo="COFINS"
                        icone={FileText}
                        cor="bg-teal-600"
                        valor={percentuais.cofins.valor}
                        percentSaidas={percentuais.cofins.sobre_saidas}
                        percentVendas={percentuais.cofins.sobre_vendas}
                        visible={true}
                      />
                      <ImpostoCard
                        titulo="ISS"
                        icone={FileText}
                        cor="bg-purple-600"
                        valor={percentuais.iss.valor}
                        percentSaidas={percentuais.iss.sobre_saidas}
                        percentVendas={percentuais.iss.sobre_vendas}
                        visible={isContribuinteISS()}
                      />
                      <ImpostoCard
                        titulo="IPI"
                        icone={FileText}
                        cor="bg-orange-600"
                        valor={percentuais.ipi.valor}
                        percentSaidas={percentuais.ipi.sobre_saidas}
                        percentVendas={percentuais.ipi.sobre_vendas}
                        visible={isContribuinteIPI()}
                      />
                    </div>

                    {/* Card Total */}
                    <div className="bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/10 border border-[#C8A951]/30 rounded-xl p-5 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calculator className="w-6 h-6 text-[#C8A951]" />
                          <span className="text-white font-semibold text-lg">TOTAL DE IMPOSTOS</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(totais.total_pagar)}</p>
                          <p className="text-sm text-[#A1A1AA]">
                            {formatPercentual(percentuais.total.sobre_saidas)} s/ Saídas | {formatPercentual(percentuais.total.sobre_vendas)} s/ Vendas
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab CMV/CPV e Ponto de Equilíbrio */}
            {activeTab === 'cmv_equilibrio' && (
              <div className="space-y-6">
                {/* Campos de Estoque */}
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Package className="w-6 h-6 text-[#C8A951]" />
                    <h3 className="text-lg font-semibold text-white">Estoque para CMV/CPV</h3>
                  </div>
                  
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
                        onClick={salvarDados}
                        disabled={savingEstoque}
                        className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {savingEstoque ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>

                  {/* Cálculo do CMV */}
                  <div className="bg-[#0C0C0C] rounded-lg p-4">
                    <p className="text-[#A1A1AA] text-sm mb-3 font-mono">CMV = Estoque Inicial + Compras - Estoque Final</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA]">Estoque Inicial</span>
                        <span className="text-white font-medium">{formatCurrency(estoqueInicial)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA] flex items-center gap-2">
                          <Plus className="w-4 h-4 text-green-400" /> Compras do Período
                        </span>
                        <span className="text-green-400 font-medium">{formatCurrency(dados?.icms?.entradas?.totais?.valor_total || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                        <span className="text-[#A1A1AA] flex items-center gap-2">
                          <Minus className="w-4 h-4 text-red-400" /> Estoque Final
                        </span>
                        <span className="text-red-400 font-medium">{formatCurrency(estoqueFinal)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 bg-[#C8A951]/10 rounded-lg px-3 mt-2">
                        <span className="text-[#C8A951] font-semibold">= CMV/CPV</span>
                        <span className="text-[#C8A951] font-bold text-xl">{formatCurrency(calcularCMV())}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ponto de Equilíbrio */}
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Scale className="w-6 h-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Ponto de Equilíbrio</h3>
                  </div>
                  <p className="text-[#A1A1AA] text-sm mb-4">
                    Valor de despesa necessário para zerar o lucro tributável.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-3">Demonstrativo</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">Receita Total</span>
                          <span className="text-white font-medium">{formatCurrency(receitas.total)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">(-) CMV/CPV</span>
                          <span className="text-red-400 font-medium">{formatCurrency(calcularCMV())}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-[#C8A951]/10 rounded-lg px-3">
                          <span className="text-[#C8A951] font-medium">= Lucro Bruto</span>
                          <span className="text-[#C8A951] font-bold">{formatCurrency(pontoEquilibrio.lucro_bruto)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-5 h-5 text-amber-400" />
                          <span className="text-amber-400 font-medium">Despesas para Equilibrar</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-400">{formatCurrency(pontoEquilibrio.despesas_para_equilibrio)}</p>
                        <p className="text-xs text-[#A1A1AA] mt-1">Valor para zerar o lucro tributável</p>
                      </div>
                      
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <PiggyBank className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 font-medium">Economia em IRPJ+CSLL</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(pontoEquilibrio.economia_potencial)}</p>
                        <p className="text-xs text-[#A1A1AA] mt-1">(IRPJ 25% + CSLL 9% = 34%)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DRE Flutuante */}
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Edit3 className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">DRE Flutuante</h3>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Interativo</span>
                  </div>
                  <p className="text-[#A1A1AA] text-sm mb-4">
                    Informe o valor da sua despesa real para calcular o lucro contábil. Este valor será usado no comparativo de regimes (RET).
                  </p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lado Esquerdo - Input */}
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-purple-400" />
                        Informe sua Despesa Real
                      </h4>
                      <div className="mb-4">
                        <label className="block text-xs text-[#A1A1AA] mb-2">Despesa Operacional Real (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={despesaReal}
                          onChange={(e) => setDespesaReal(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 bg-[#141414] border border-purple-500/30 rounded-lg text-white text-lg font-bold focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                          placeholder="0,00"
                        />
                      </div>
                      <button
                        onClick={salvarDados}
                        disabled={savingEstoque}
                        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {savingEstoque ? 'Salvando...' : 'Salvar Despesa'}
                      </button>
                      
                      <div className="mt-4 p-3 bg-[#141414] rounded-lg">
                        <p className="text-xs text-[#A1A1AA] mb-2">Sugestão (Ponto de Equilíbrio):</p>
                        <p className="text-lg font-bold text-amber-400">{formatCurrency(pontoEquilibrio.despesas_para_equilibrio)}</p>
                      </div>
                    </div>

                    {/* Lado Direito - DRE Calculado */}
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <h4 className="text-white font-medium mb-4">DRE Simplificado</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">Receita Bruta</span>
                          <span className="text-green-400 font-medium">{formatCurrency(receitas.total)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] pl-4">
                          <span className="text-[#666] text-sm">└ Vendas</span>
                          <span className="text-[#A1A1AA]">{formatCurrency(receitas.comercio)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A] pl-4">
                          <span className="text-[#666] text-sm">└ Serviços</span>
                          <span className="text-[#A1A1AA]">{formatCurrency(receitas.servicos)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">(-) CMV/CPV</span>
                          <span className="text-red-400 font-medium">{formatCurrency(calcularCMV())}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#C8A951]">= Lucro Bruto</span>
                          <span className="text-[#C8A951] font-bold">{formatCurrency(calcularLucroBruto())}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#2A2A2A]">
                          <span className="text-[#A1A1AA]">(-) Despesa Real</span>
                          <span className="text-purple-400 font-bold">{formatCurrency(despesaReal)}</span>
                        </div>
                        <div className={`flex justify-between items-center py-3 rounded-lg px-3 mt-2 ${lucroContabil >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <span className={`font-semibold ${lucroContabil >= 0 ? 'text-green-400' : 'text-red-400'}`}>= LUCRO CONTÁBIL</span>
                          <span className={`font-bold text-xl ${lucroContabil >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(lucroContabil)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <p className="text-xs text-[#A1A1AA]">
                          <strong className="text-purple-400">Este lucro contábil</strong> será usado para calcular o IRPJ e CSLL 
                          no comparativo de regimes tributários (RET).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Indicadores (Margens e Markup) */}
            {activeTab === 'indicadores' && (
              <div className="space-y-6">
                {/* Cards de Indicadores */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <span className="text-[#A1A1AA] text-sm">Margem de Contribuição</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(indicadores.margem.absoluta)}</p>
                    <p className="text-sm text-green-300/70 mt-1">{formatPercentual(indicadores.margem.percentual)} sobre receita</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="w-5 h-5 text-purple-400" />
                      <span className="text-[#A1A1AA] text-sm">Markup</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">{formatPercentual(indicadores.markup)}</p>
                    <p className="text-sm text-purple-300/70 mt-1">Sobre o custo</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      <span className="text-[#A1A1AA] text-sm">Total Saídas</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(receitas.total)}</p>
                    <p className="text-sm text-blue-300/70 mt-1">Receita bruta</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-900/30 to-amber-950/30 border border-amber-500/30 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-amber-400" />
                      <span className="text-[#A1A1AA] text-sm">Total Entradas</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(indicadores.entradas.total)}</p>
                    <p className="text-sm text-amber-300/70 mt-1">Compras do período</p>
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
                      <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(indicadores.entradas.revenda)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Insumo</span>
                      <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(indicadores.entradas.insumo)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Despesa</span>
                      <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(indicadores.entradas.despesa)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <span className="text-xs text-[#A1A1AA]">Ativo Imob.</span>
                      <p className="text-xl font-bold text-purple-400 mt-1">{formatCurrency(indicadores.entradas.ativo)}</p>
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
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-semibold">{vilao.descricao || vilao.produto || vilao.ncm || `Item ${idx + 1}`}</h4>
                            <span className="text-xs px-2 py-1 bg-[#2A2A2A] text-[#A1A1AA] rounded font-mono">
                              NCM: {vilao.ncm}
                            </span>
                          </div>
                          
                          {/* Indicadores de alíquota */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[#A1A1AA]">Entrada:</span>
                              <span className={`font-bold px-2 py-0.5 rounded ${vilao.aliq_entrada > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                                {vilao.aliq_entrada || 0}% ICMS
                              </span>
                            </div>
                            <span className="text-[#666]">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#A1A1AA]">Saída:</span>
                              <span className="font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                {vilao.aliq_saida || 0}% ICMS
                              </span>
                            </div>
                            <div className="text-[#666]">|</div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#A1A1AA]">Diferença:</span>
                              <span className="font-bold text-red-400">
                                +{vilao.diferenca_aliquota || (vilao.aliq_saida - vilao.aliq_entrada)}pp
                              </span>
                            </div>
                          </div>
                          
                          {/* Explicação */}
                          <p className="text-[#A1A1AA] text-sm mt-3 bg-[#0C0C0C] p-3 rounded-lg">
                            💡 {vilao.explicacao || vilao.motivo || 'Produto gera mais débito do que crédito de ICMS'}
                          </p>
                          
                          {/* Valores */}
                          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-red-500/20">
                            <div>
                              <span className="text-xs text-[#666]">Crédito ICMS</span>
                              <p className="text-blue-400 font-medium">{formatCurrency(vilao.icms_credito || 0)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[#666]">Débito ICMS</span>
                              <p className="text-red-400 font-medium">{formatCurrency(vilao.icms_debito || 0)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[#666]">Impacto Negativo</span>
                              <p className="text-red-400 font-bold">{formatCurrency(vilao.impacto_negativo || vilao.valor || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#A1A1AA]">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400/50" />
                    <p>Nenhum vilão tributário identificado nesta competência</p>
                    <p className="text-sm mt-2 text-[#666]">Todos os produtos estão com tributação adequada</p>
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
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-semibold">{oportunidade.descricao || oportunidade.titulo || `Oportunidade ${idx + 1}`}</h4>
                            <span className="text-xs px-2 py-1 bg-[#2A2A2A] text-[#A1A1AA] rounded font-mono">
                              NCM: {oportunidade.ncm}
                            </span>
                          </div>
                          
                          {/* Indicadores de alíquota */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[#A1A1AA]">Entrada:</span>
                              <span className="font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                                {oportunidade.aliq_entrada || 0}% ICMS
                              </span>
                            </div>
                            <span className="text-[#666]">→</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#A1A1AA]">Saída:</span>
                              <span className={`font-bold px-2 py-0.5 rounded ${oportunidade.aliq_saida > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                {oportunidade.aliq_saida || 0}% ICMS
                              </span>
                            </div>
                            {oportunidade.diferenca_aliquota && (
                              <>
                                <div className="text-[#666]">|</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[#A1A1AA]">Vantagem:</span>
                                  <span className="font-bold text-green-400">
                                    {oportunidade.diferenca_aliquota}pp
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Explicação */}
                          <p className="text-[#A1A1AA] text-sm mt-3 bg-[#0C0C0C] p-3 rounded-lg">
                            🎯 {oportunidade.explicacao || 'Produto gera mais crédito do que débito de ICMS'}
                          </p>
                          
                          {/* Valores */}
                          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-green-500/20">
                            <div>
                              <span className="text-xs text-[#666]">Crédito ICMS</span>
                              <p className="text-green-400 font-medium">{formatCurrency(oportunidade.icms_credito || 0)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[#666]">Débito ICMS</span>
                              <p className="text-blue-400 font-medium">{formatCurrency(oportunidade.icms_debito || 0)}</p>
                            </div>
                            <div>
                              <span className="text-xs text-[#666]">Benefício</span>
                              <p className="text-green-400 font-bold">{formatCurrency(oportunidade.beneficio || oportunidade.economia_potencial || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-[#A1A1AA]">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma oportunidade de economia identificada nesta competência</p>
                    <p className="text-sm mt-2 text-[#666]">Continue importando documentos para análise</p>
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
                {(analiseIA?.insights_ia || analiseIA?.insights) ? (
                  <div className="prose prose-invert max-w-none">
                    {renderInsightsIA(analiseIA.insights_ia || analiseIA.insights)}
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
