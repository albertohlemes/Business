import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Calculator, TrendingUp, TrendingDown, Package, DollarSign, Receipt,
  ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Download,
  Loader2, Save, AlertCircle, CheckCircle, Target, FileText
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const ApuracaoMensal = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [pisCofinsData, setPisCofinsData] = useState(null);
  const [error, setError] = useState('');
  
  // Estoque
  const [estoqueInicial, setEstoqueInicial] = useState(0);
  const [estoqueFinal, setEstoqueFinal] = useState(0);
  const [estoqueModified, setEstoqueModified] = useState(false);
  
  // Abas expandidas
  const [expandedTab, setExpandedTab] = useState(null);
  const [viewMode, setViewMode] = useState('cfop'); // cfop, cst, ncm
  
  // Detalhamento PIS/COFINS
  const [pisCofinsViewMode, setPisCofinsViewMode] = useState('cfop'); // cfop, ncm, cst
  const [pisCofinsExpanded, setPisCofinsExpanded] = useState(null); // 'credito', 'sem_credito'

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchData = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Buscar dados de apuração e PIS/COFINS em paralelo
      const [apuracaoRes, pisCofinsRes, estoqueRes] = await Promise.all([
        axios.get(
          `${API}/apuracao-periodo/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API}/apuracao-pis-cofins/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API}/estoque-competencia/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => ({ data: { estoque_inicial: 0, estoque_final: 0 } }))
      ]);
      
      setData(apuracaoRes.data);
      setPisCofinsData(pisCofinsRes.data);
      setEstoqueInicial(estoqueRes.data.estoque_inicial || 0);
      setEstoqueFinal(estoqueRes.data.estoque_final || 0);
      setEstoqueModified(false);
    } catch (err) {
      console.error('Erro ao carregar apuração:', err);
      setError('Erro ao carregar dados da apuração');
    } finally {
      setLoading(false);
    }
  };

  const saveEstoque = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/estoque-competencia/${selectedCompany.id}`,
        {
          competencia: selectedCompetencia,
          estoque_inicial: estoqueInicial,
          estoque_final: estoqueFinal
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEstoqueModified(false);
    } catch (err) {
      console.error('Erro ao salvar estoque:', err);
      alert('Erro ao salvar estoque');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  // Cálculos
  const calculos = useMemo(() => {
    if (!data) return null;
    
    const faturamentoBruto = data.saidas?.subtotal?.valor || 0;
    const compras = data.entradas?.subtotal?.valor || 0;
    const cmv = compras + estoqueInicial - estoqueFinal;
    const lucroBruto = faturamentoBruto - cmv;
    const margemBruta = faturamentoBruto > 0 ? (lucroBruto / faturamentoBruto) * 100 : 0;
    
    // ICMS - separando crédito válido do ST desconsiderado
    const icmsCredito = data.entradas?.subtotal?.v_icms || 0;  // Já exclui ST no backend
    const icmsSTDesconsiderado = data.entradas?.subtotal?.st_desconsiderado?.v_icms || 0;
    const icmsDebito = data.saidas?.subtotal?.v_icms || 0;
    const icmsAPagar = Math.max(0, icmsDebito - icmsCredito);
    const icmsSaldo = icmsCredito - icmsDebito;
    
    // PIS/COFINS
    const pisCredito = pisCofinsData?.apuracao?.pis?.credito || 0;
    const pisDebito = pisCofinsData?.apuracao?.pis?.debito || 0;
    const pisAPagar = pisCofinsData?.apuracao?.pis?.a_pagar || 0;
    
    const cofinsCredito = pisCofinsData?.apuracao?.cofins?.credito || 0;
    const cofinsDebito = pisCofinsData?.apuracao?.cofins?.debito || 0;
    const cofinsAPagar = pisCofinsData?.apuracao?.cofins?.a_pagar || 0;
    
    const totalImpostos = icmsAPagar + pisAPagar + cofinsAPagar;
    
    // Ponto de Equilíbrio (para Lucro Real)
    const despesasFixas = totalImpostos; // Simplificado - em um cenário real seria mais complexo
    const pontoEquilibrio = margemBruta > 0 ? (despesasFixas / (margemBruta / 100)) : 0;
    
    return {
      faturamentoBruto,
      compras,
      cmv,
      lucroBruto,
      margemBruta,
      icms: { credito: icmsCredito, debito: icmsDebito, aPagar: icmsAPagar, saldo: icmsSaldo, stDesconsiderado: icmsSTDesconsiderado },
      pis: { credito: pisCredito, debito: pisDebito, aPagar: pisAPagar },
      cofins: { credito: cofinsCredito, debito: cofinsDebito, aPagar: cofinsAPagar },
      totalImpostos,
      pontoEquilibrio
    };
  }, [data, pisCofinsData, estoqueInicial, estoqueFinal]);

  // Exportar CSV
  const exportCSV = () => {
    if (!data || !calculos) return;

    let csv = '\uFEFF';
    csv += `APURAÇÃO MENSAL - ${data.empresa.razao_social}\n`;
    csv += `Competência: ${data.competencia}\n\n`;
    
    csv += 'RESUMO\n';
    csv += `Faturamento Bruto;${calculos.faturamentoBruto}\n`;
    csv += `Compras;${calculos.compras}\n`;
    csv += `Estoque Inicial;${estoqueInicial}\n`;
    csv += `Estoque Final;${estoqueFinal}\n`;
    csv += `CMV;${calculos.cmv}\n`;
    csv += `Lucro Bruto;${calculos.lucroBruto}\n`;
    csv += `Margem Bruta;${calculos.margemBruta.toFixed(2)}%\n\n`;
    
    csv += 'IMPOSTOS A PAGAR\n';
    csv += `ICMS;${calculos.icms.aPagar}\n`;
    csv += `PIS;${calculos.pis.aPagar}\n`;
    csv += `COFINS;${calculos.cofins.aPagar}\n`;
    csv += `TOTAL;${calculos.totalImpostos}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apuracao_${selectedCompetencia.replace('/', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Card de resumo
  const SummaryCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${color ? `border-l-4 ${color}` : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color ? color.replace('border-l-', 'bg-').replace('-600', '-100') : 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${color ? color.replace('border-l-', 'text-') : 'text-gray-600'}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-2 flex items-center text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );

  // Card de imposto
  const TaxCard = ({ title, credito, debito, aPagar, color, stDesconsiderado }) => (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200`}>
      <div className={`${color} text-white px-4 py-3`}>
        <h3 className="font-bold">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Crédito</span>
          <span className="font-medium text-green-600">{formatCurrency(credito)}</span>
        </div>
        {/* ICMS-ST Desconsiderado - riscado em vermelho */}
        {stDesconsiderado > 0 && (
          <div className="flex justify-between items-center bg-red-50 -mx-4 px-4 py-2 border-y border-red-200">
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              ICMS-ST (sem crédito)
            </span>
            <span className="font-medium text-red-500 line-through">{formatCurrency(stDesconsiderado)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Débito</span>
          <span className="font-medium text-red-600">{formatCurrency(debito)}</span>
        </div>
        <div className="border-t pt-3 flex justify-between items-center">
          <span className="font-semibold text-gray-900">A Pagar</span>
          <span className={`text-lg font-bold ${aPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(aPagar)}
          </span>
        </div>
      </div>
    </div>
  );

  // Tabela de detalhamento
  const DetailTable = ({ items, tipo }) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-center py-4">Nenhum registro</p>;
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left font-medium text-gray-600">Código</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">ICMS</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">PIS</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">COFINS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isST = item.is_st || item.sem_credito_icms;
              return (
                <tr 
                  key={idx} 
                  className={`border-b border-gray-100 ${isST && tipo === 'entrada' ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-2 font-mono font-medium">
                    {item.cfop || item.cst || item.codigo}
                    {isST && tipo === 'entrada' && (
                      <span className="ml-2 text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded font-normal">ST</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.valor)}</td>
                  <td className={`px-4 py-2 text-right ${isST && tipo === 'entrada' ? 'text-red-500 line-through' : ''}`}>
                    {formatCurrency(item.v_icms)}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.v_pis || item.pis)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.v_cofins || item.cofins)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="apuracao-mensal-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Calculator className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Apuração Mensal</h1>
                {selectedCompany ? (
                  <p className="text-indigo-100">
                    {selectedCompany.razao_social} • {selectedCompetencia}
                  </p>
                ) : (
                  <p className="text-indigo-100">Selecione uma empresa no header</p>
                )}
              </div>
            </div>
            
            {data && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            )}
          </div>
        </div>

        {!selectedCompany ? (
          <div className="bg-yellow-50 rounded-xl p-8 text-center border border-yellow-200">
            <FileText className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-yellow-900 mb-2">Selecione uma Empresa</h3>
            <p className="text-yellow-700">Clique no botão no header para escolher</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando apuração...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-xl p-8 text-center border border-red-200">
            <p className="text-red-700">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Tentar novamente
            </button>
          </div>
        ) : data && calculos ? (
          <div className="space-y-6">
            {/* Estoque do Mês */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Estoque do Mês
                </h2>
                {estoqueModified && (
                  <button
                    onClick={saveEstoque}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={estoqueInicial}
                      onChange={(e) => { setEstoqueInicial(parseFloat(e.target.value) || 0); setEstoqueModified(true); }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Final</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={estoqueFinal}
                      onChange={(e) => { setEstoqueFinal(parseFloat(e.target.value) || 0); setEstoqueModified(true); }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compras do Período</label>
                  <div className="px-4 py-2 bg-gray-100 rounded-lg font-medium text-gray-900">
                    {formatCurrency(calculos.compras)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CMV Calculado</label>
                  <div className="px-4 py-2 bg-indigo-100 rounded-lg font-bold text-indigo-900">
                    {formatCurrency(calculos.cmv)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Compras + Est. Inicial - Est. Final</p>
                </div>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                icon={TrendingUp}
                title="Faturamento Bruto"
                value={formatCurrency(calculos.faturamentoBruto)}
                subtitle="Total de vendas"
                color="border-l-green-600"
              />
              <SummaryCard
                icon={ArrowDownCircle}
                title="Compras"
                value={formatCurrency(calculos.compras)}
                subtitle="Total de entradas"
                color="border-l-blue-600"
              />
              <SummaryCard
                icon={Package}
                title="CMV / CPV"
                value={formatCurrency(calculos.cmv)}
                subtitle="Custo das mercadorias"
                color="border-l-orange-600"
              />
              <SummaryCard
                icon={DollarSign}
                title="Lucro Bruto"
                value={formatCurrency(calculos.lucroBruto)}
                subtitle={`Margem: ${calculos.margemBruta.toFixed(1)}%`}
                color={calculos.lucroBruto >= 0 ? "border-l-emerald-600" : "border-l-red-600"}
              />
            </div>

            {/* Impostos a Pagar */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                Impostos a Pagar
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TaxCard
                  title="ICMS"
                  credito={calculos.icms.credito}
                  debito={calculos.icms.debito}
                  aPagar={calculos.icms.aPagar}
                  color="bg-blue-600"
                  stDesconsiderado={calculos.icms.stDesconsiderado}
                />
                <TaxCard
                  title="PIS"
                  credito={calculos.pis.credito}
                  debito={calculos.pis.debito}
                  aPagar={calculos.pis.aPagar}
                  color="bg-purple-600"
                />
                <TaxCard
                  title="COFINS"
                  credito={calculos.cofins.credito}
                  debito={calculos.cofins.debito}
                  aPagar={calculos.cofins.aPagar}
                  color="bg-pink-600"
                />
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 text-white">
                  <h3 className="font-bold mb-4">TOTAL</h3>
                  <div className="text-3xl font-bold">
                    {formatCurrency(calculos.totalImpostos)}
                  </div>
                  <p className="text-gray-400 text-sm mt-2">Total a recolher</p>
                </div>
              </div>
            </div>

            {/* Ponto de Equilíbrio */}
            {pisCofinsData?.empresa?.regime_tributario === 'lucro_real' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-6 h-6" />
                  <h2 className="text-lg font-bold">Ponto de Equilíbrio</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-amber-100 text-sm">Margem de Contribuição</p>
                    <p className="text-2xl font-bold">{calculos.margemBruta.toFixed(1)}%</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-amber-100 text-sm">Custos/Despesas Fixas</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculos.totalImpostos)}</p>
                  </div>
                  <div className="bg-white/30 rounded-lg p-4">
                    <p className="text-white text-sm font-semibold">Faturamento Mínimo</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculos.pontoEquilibrio)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhamento */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Detalhamento</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('cfop')}
                    className={`px-3 py-1 rounded text-sm font-medium ${viewMode === 'cfop' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Por CFOP
                  </button>
                  <button
                    onClick={() => setViewMode('cst')}
                    className={`px-3 py-1 rounded text-sm font-medium ${viewMode === 'cst' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Por CST
                  </button>
                </div>
              </div>
              
              {/* Entradas */}
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setExpandedTab(expandedTab === 'entradas' ? null : 'entradas')}
                  className="w-full px-5 py-4 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Entradas (Créditos)</span>
                    <span className="text-sm text-blue-600">{data.entradas?.itens?.length || 0} registros</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-blue-900">{formatCurrency(calculos.compras)}</span>
                    {expandedTab === 'entradas' ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>
                {expandedTab === 'entradas' && (
                  <div className="p-4">
                    <DetailTable items={data.entradas?.itens} tipo="entrada" />
                  </div>
                )}
              </div>
              
              {/* Saídas */}
              <div>
                <button
                  onClick={() => setExpandedTab(expandedTab === 'saidas' ? null : 'saidas')}
                  className="w-full px-5 py-4 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Saídas (Débitos)</span>
                    <span className="text-sm text-green-600">{data.saidas?.itens?.length || 0} registros</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-900">{formatCurrency(calculos.faturamentoBruto)}</span>
                    {expandedTab === 'saidas' ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>
                {expandedTab === 'saidas' && (
                  <div className="p-4">
                    <DetailTable items={data.saidas?.itens} tipo="saida" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoMensal;
