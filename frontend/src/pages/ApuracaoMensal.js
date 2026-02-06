import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Calculator, TrendingUp, TrendingDown, Package, DollarSign, Receipt,
  ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Download,
  Loader2, Save, AlertCircle, CheckCircle, Target, FileText,
  ArrowUp, ArrowDown, ArrowUpDown, FileSpreadsheet, File
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [pisCofinsExpanded, setPisCofinsExpanded] = useState(null); // 'credito', 'sem_credito', 'debito', 'debito_zero'
  
  // Ordenação das tabelas
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Estado para modal de exportação
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('cfop'); // cfop ou ncm
  const [exportFormat, setExportFormat] = useState('excel'); // excel ou pdf

  // Função para exportar Excel
  const exportToExcel = (tipoAgrupamento) => {
    if (!data) return;
    
    const wb = XLSX.utils.book_new();
    const competencia = selectedCompetencia || 'Competência';
    const empresa = selectedCompany?.razao_social || 'Empresa';
    
    // Preparar dados de entradas
    const entradasData = [];
    if (data.entradas?.lista) {
      data.entradas.lista.forEach(item => {
        entradasData.push({
          [tipoAgrupamento.toUpperCase()]: item[tipoAgrupamento] || item.cfop || '',
          'Descrição': item.descricao || '',
          'Valor Total': item.valor || 0,
          'BC ICMS': item.bc_icms || 0,
          'ICMS': item.v_icms || 0,
          'PIS': item.v_pis || 0,
          'COFINS': item.v_cofins || 0,
          'Qtd Itens': item.qtd_itens || 0
        });
      });
    }
    
    // Preparar dados de saídas
    const saidasData = [];
    if (data.saidas?.lista) {
      data.saidas.lista.forEach(item => {
        saidasData.push({
          [tipoAgrupamento.toUpperCase()]: item[tipoAgrupamento] || item.cfop || '',
          'Descrição': item.descricao || '',
          'Valor Total': item.valor || 0,
          'BC ICMS': item.bc_icms || 0,
          'ICMS': item.v_icms || 0,
          'PIS': item.v_pis || 0,
          'COFINS': item.v_cofins || 0,
          'Qtd Itens': item.qtd_itens || 0
        });
      });
    }
    
    // Criar planilha de entradas
    if (entradasData.length > 0) {
      const wsEntradas = XLSX.utils.json_to_sheet(entradasData);
      XLSX.utils.book_append_sheet(wb, wsEntradas, `Entradas por ${tipoAgrupamento.toUpperCase()}`);
    }
    
    // Criar planilha de saídas
    if (saidasData.length > 0) {
      const wsSaidas = XLSX.utils.json_to_sheet(saidasData);
      XLSX.utils.book_append_sheet(wb, wsSaidas, `Saídas por ${tipoAgrupamento.toUpperCase()}`);
    }
    
    // Criar planilha de resumo
    const resumoData = [
      { 'Descrição': 'ENTRADAS', 'Valor': data.entradas?.subtotal?.valor || 0 },
      { 'Descrição': 'ICMS Crédito', 'Valor': data.entradas?.subtotal?.v_icms || 0 },
      { 'Descrição': 'PIS Crédito', 'Valor': pisCofinsData?.apuracao?.pis?.credito || 0 },
      { 'Descrição': 'COFINS Crédito', 'Valor': pisCofinsData?.apuracao?.cofins?.credito || 0 },
      { 'Descrição': '', 'Valor': '' },
      { 'Descrição': 'SAÍDAS', 'Valor': data.saidas?.subtotal?.valor || 0 },
      { 'Descrição': 'ICMS Débito', 'Valor': data.saidas?.subtotal?.v_icms || 0 },
      { 'Descrição': 'PIS Débito', 'Valor': data.saidas?.subtotal?.v_pis || 0 },
      { 'Descrição': 'COFINS Débito', 'Valor': data.saidas?.subtotal?.v_cofins || 0 },
      { 'Descrição': '', 'Valor': '' },
      { 'Descrição': 'ICMS A PAGAR', 'Valor': Math.max(0, (data.saidas?.subtotal?.v_icms || 0) - (data.entradas?.subtotal?.v_icms || 0)) },
      { 'Descrição': 'PIS A PAGAR', 'Valor': pisCofinsData?.apuracao?.pis?.a_pagar || 0 },
      { 'Descrição': 'COFINS A PAGAR', 'Valor': pisCofinsData?.apuracao?.cofins?.a_pagar || 0 },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    
    // Baixar arquivo
    XLSX.writeFile(wb, `Apuracao_${tipoAgrupamento.toUpperCase()}_${empresa.substring(0, 20)}_${competencia.replace('/', '-')}.xlsx`);
    setShowExportModal(false);
  };
  
  // Função para exportar PDF
  const exportToPDF = (tipoAgrupamento) => {
    if (!data) return;
    
    const doc = new jsPDF('landscape');
    const competencia = selectedCompetencia || 'Competência';
    const empresa = selectedCompany?.razao_social || 'Empresa';
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Apuração Mensal por ${tipoAgrupamento.toUpperCase()}`, 14, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Empresa: ${empresa}`, 14, 22);
    doc.text(`Competência: ${competencia}`, 14, 28);
    
    let yPos = 35;
    
    // Tabela de Entradas
    if (data.entradas?.lista?.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ENTRADAS', 14, yPos);
      yPos += 5;
      
      const entradasRows = data.entradas.lista.map(item => [
        item[tipoAgrupamento] || item.cfop || '',
        (item.descricao || '').substring(0, 30),
        formatCurrencySimple(item.valor || 0),
        formatCurrencySimple(item.bc_icms || 0),
        formatCurrencySimple(item.v_icms || 0),
        formatCurrencySimple(item.v_pis || 0),
        formatCurrencySimple(item.v_cofins || 0)
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [[tipoAgrupamento.toUpperCase(), 'Descrição', 'Valor', 'BC ICMS', 'ICMS', 'PIS', 'COFINS']],
        body: entradasRows,
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;
    }
    
    // Nova página para saídas se necessário
    if (yPos > 150) {
      doc.addPage();
      yPos = 20;
    }
    
    // Tabela de Saídas
    if (data.saidas?.lista?.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SAÍDAS', 14, yPos);
      yPos += 5;
      
      const saidasRows = data.saidas.lista.map(item => [
        item[tipoAgrupamento] || item.cfop || '',
        (item.descricao || '').substring(0, 30),
        formatCurrencySimple(item.valor || 0),
        formatCurrencySimple(item.bc_icms || 0),
        formatCurrencySimple(item.v_icms || 0),
        formatCurrencySimple(item.v_pis || 0),
        formatCurrencySimple(item.v_cofins || 0)
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [[tipoAgrupamento.toUpperCase(), 'Descrição', 'Valor', 'BC ICMS', 'ICMS', 'PIS', 'COFINS']],
        body: saidasRows,
        theme: 'grid',
        headStyles: { fillColor: [40, 167, 69], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' }
        }
      });
    }
    
    // Salvar PDF
    doc.save(`Apuracao_${tipoAgrupamento.toUpperCase()}_${empresa.substring(0, 20)}_${competencia.replace('/', '-')}.pdf`);
    setShowExportModal(false);
  };
  
  // Função auxiliar para formatar moeda simples (sem R$)
  const formatCurrencySimple = (value) => {
    return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
    
    // ICMS - separando crédito válido do ST e Despesa desconsiderados
    const icmsCredito = data.entradas?.subtotal?.v_icms || 0;  // Já exclui ST e Despesa no backend
    const icmsSTDesconsiderado = data.entradas?.subtotal?.st_desconsiderado?.v_icms || 0;
    const icmsDespesaDesconsiderado = data.entradas?.subtotal?.despesa_desconsiderada?.v_icms || 0;
    const icmsTotalDesconsiderado = icmsSTDesconsiderado + icmsDespesaDesconsiderado;
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
      icms: { credito: icmsCredito, debito: icmsDebito, aPagar: icmsAPagar, saldo: icmsSaldo, stDesconsiderado: icmsSTDesconsiderado, despesaDesconsiderada: icmsDespesaDesconsiderado, totalDesconsiderado: icmsTotalDesconsiderado },
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
  const TaxCard = ({ title, credito, debito, aPagar, color, stDesconsiderado, despesaDesconsiderada }) => (
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
        {/* ICMS Despesa Desconsiderado - riscado em vermelho */}
        {despesaDesconsiderada > 0 && (
          <div className="flex justify-between items-center bg-orange-50 -mx-4 px-4 py-2 border-y border-orange-200">
            <span className="text-sm text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              ICMS Despesa (sem crédito)
            </span>
            <span className="font-medium text-orange-500 line-through">{formatCurrency(despesaDesconsiderada)}</span>
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

  // Tabela de detalhamento com totalizadores
  const DetailTable = ({ items, tipo }) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-center py-4">Nenhum registro</p>;
    }
    
    // Calcular totais - EXCLUIR itens sem crédito (ST/Despesa) do total de ICMS para entradas
    const totais = items.reduce((acc, item) => {
      const isSemCredito = item.is_st || item.is_despesa || item.sem_credito_icms;
      const icmsParaSomar = (tipo === 'entrada' && isSemCredito) ? 0 : (item.v_icms || 0);
      
      return {
        valor: acc.valor + (item.valor || 0),
        v_icms: acc.v_icms + icmsParaSomar,
        v_icms_desconsiderado: acc.v_icms_desconsiderado + (tipo === 'entrada' && isSemCredito ? (item.v_icms || 0) : 0),
        v_pis: acc.v_pis + (item.v_pis || item.pis || 0),
        v_cofins: acc.v_cofins + (item.v_cofins || item.cofins || 0)
      };
    }, { valor: 0, v_icms: 0, v_icms_desconsiderado: 0, v_pis: 0, v_cofins: 0 });
    
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
              const isSemCredito = item.is_st || item.is_despesa || item.sem_credito_icms;
              return (
                <tr 
                  key={idx} 
                  className={`border-b border-gray-100 ${isSemCredito && tipo === 'entrada' ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-2 font-mono font-medium">
                    {item.cfop || item.cst || item.codigo}
                    {isSemCredito && tipo === 'entrada' && (
                      <span className="ml-2 text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded font-normal">
                        {item.is_st ? 'ST' : item.is_despesa ? 'DESP' : 'S/CRED'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.valor)}</td>
                  <td className={`px-4 py-2 text-right ${isSemCredito && tipo === 'entrada' ? 'text-red-500 line-through' : ''}`}>
                    {formatCurrency(item.v_icms)}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.v_pis || item.pis)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.v_cofins || item.cofins)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
              <td className="px-4 py-3">
                TOTAL ({items.length})
                {tipo === 'entrada' && totais.v_icms_desconsiderado > 0 && (
                  <span className="ml-2 text-xs font-normal text-red-600">
                    (ICMS s/ crédito: {formatCurrency(totais.v_icms_desconsiderado)})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">{formatCurrency(totais.valor)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totais.v_icms)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totais.v_pis)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(totais.v_cofins)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // Tabela de detalhamento PIS/COFINS com ordenação
  const PisCofinsTable = ({ items, tipo, viewMode }) => {
    const [localSort, setLocalSort] = useState({ key: 'valor', direction: 'desc' });
    
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-center py-4">Nenhum registro encontrado</p>;
    }

    // Mapear labels do CST
    const cstLabels = {
      '01': 'Tributável',
      '04': 'Monofásico',
      '06': 'Alíq. zero',
      '49': 'Outras saídas',
      '50': 'Com crédito',
      '70': 'Sem crédito',
      '73': 'Alíq. zero',
      '98': 'Sem incidência'
    };

    const getColumnLabel = () => {
      switch(viewMode) {
        case 'cfop': return 'CFOP';
        case 'ncm': return 'NCM';
        case 'cst': return 'CST';
        default: return 'Código';
      }
    };

    // Função de ordenação
    const handleSort = (key) => {
      setLocalSort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    };

    // Ordenar items
    const sortedItems = [...items].sort((a, b) => {
      if (!localSort.key) return 0;
      
      let aVal = a[localSort.key];
      let bVal = b[localSort.key];
      
      // Para código, ordenar como string
      if (localSort.key === 'codigo') {
        aVal = String(aVal || '');
        bVal = String(bVal || '');
        return localSort.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      // Para valores numéricos
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return localSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Ícone de ordenação
    const SortIcon = ({ columnKey }) => {
      if (localSort.key !== columnKey) {
        return <ArrowUpDown className="w-3 h-3 opacity-30" />;
      }
      return localSort.direction === 'asc' 
        ? <ArrowUp className="w-3 h-3" />
        : <ArrowDown className="w-3 h-3" />;
    };

    // Definir cores baseado no tipo
    const isCredito = tipo === 'credito';
    const isDebito = tipo === 'debito';
    const isSemImposto = tipo === 'sem_credito' || tipo === 'debito_zero';

    const getRowHoverClass = () => {
      if (isCredito) return 'hover:bg-green-50';
      if (isDebito) return 'hover:bg-red-50';
      return 'hover:bg-gray-50';
    };

    const getValueClass = () => {
      if (isCredito) return 'text-green-600';
      if (isDebito) return 'text-red-600';
      return 'text-gray-400 line-through';
    };

    const getFooterClass = () => {
      if (isCredito) return 'bg-green-100';
      if (isDebito) return 'bg-red-100';
      return 'bg-gray-100';
    };

    const getFooterValueClass = () => {
      if (isCredito) return 'text-green-700';
      if (isDebito) return 'text-red-700';
      return 'text-gray-400';
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th 
                className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center gap-2">
                  {getColumnLabel()}
                  <SortIcon columnKey="codigo" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('valor')}
              >
                <div className="flex items-center justify-end gap-2">
                  Valor Operação
                  <SortIcon columnKey="valor" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('pis')}
              >
                <div className="flex items-center justify-end gap-2">
                  PIS {isDebito ? '(Débito)' : '(Crédito)'}
                  <SortIcon columnKey="pis" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('cofins')}
              >
                <div className="flex items-center justify-end gap-2">
                  COFINS {isDebito ? '(Débito)' : '(Crédito)'}
                  <SortIcon columnKey="cofins" />
                </div>
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">CST</th>
              <th 
                className="px-4 py-3 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 select-none"
                onClick={() => handleSort('qtd')}
              >
                <div className="flex items-center justify-center gap-2">
                  Qtd
                  <SortIcon columnKey="qtd" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, idx) => {
              const cst = item.cst || '-';
              
              return (
                <tr 
                  key={idx} 
                  className={`border-b border-gray-100 ${getRowHoverClass()}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{item.codigo || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(item.valor || 0)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isSemImposto ? 'text-gray-400 line-through' : getValueClass()}`}>
                    {formatCurrency(item.pis || 0)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isSemImposto ? 'text-gray-400 line-through' : getValueClass()}`}>
                    {formatCurrency(item.cofins || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      cst === '50' || cst === '01' ? 'bg-green-100 text-green-800' :
                      cst === '73' || cst === '06' ? 'bg-yellow-100 text-yellow-800' :
                      cst === '98' || cst === '49' ? 'bg-orange-100 text-orange-800' :
                      cst === '04' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {cst}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {item.qtd || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`font-bold ${getFooterClass()}`}>
              <td className="px-4 py-3">TOTAL ({sortedItems.length})</td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(items.reduce((sum, i) => sum + (i.valor || 0), 0))}
              </td>
              <td className={`px-4 py-3 text-right ${getFooterValueClass()}`}>
                {formatCurrency(items.reduce((sum, i) => sum + (i.pis || 0), 0))}
              </td>
              <td className={`px-4 py-3 text-right ${getFooterValueClass()}`}>
                {formatCurrency(items.reduce((sum, i) => sum + (i.cofins || 0), 0))}
              </td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-center text-gray-600">
                {items.reduce((sum, i) => sum + (i.qtd || 0), 0)}
              </td>
            </tr>
          </tfoot>
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
                      type="text"
                      value={estoqueInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      onChange={(e) => { 
                        const valor = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0;
                        setEstoqueInicial(valor); 
                        setEstoqueModified(true); 
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estoque Final</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={estoqueFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      onChange={(e) => { 
                        const valor = parseFloat(e.target.value.replace(/\./g, '').replace(',', '.')) || 0;
                        setEstoqueFinal(valor); 
                        setEstoqueModified(true); 
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-right"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compras do Período</label>
                  <div className="px-4 py-2 bg-gray-100 rounded-lg font-medium text-gray-900 text-right">
                    {formatCurrency(calculos.compras)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CMV Calculado</label>
                  <div className="px-4 py-2 bg-indigo-100 rounded-lg font-bold text-indigo-900 text-right">
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
                  despesaDesconsiderada={calculos.icms.despesaDesconsiderada}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-amber-100 text-sm">Margem de Contribuição</p>
                    <p className="text-2xl font-bold">{calculos.margemBruta.toFixed(1)}%</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4">
                    <p className="text-amber-100 text-sm">Impostos do Mês</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculos.totalImpostos)}</p>
                  </div>
                  <div className="bg-white/30 rounded-lg p-4">
                    <p className="text-white text-sm font-semibold">Faturamento Mínimo</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculos.pontoEquilibrio)}</p>
                  </div>
                  <div className="bg-green-600/80 rounded-lg p-4 border-2 border-white/50">
                    <p className="text-green-100 text-sm font-semibold">Despesa Máx. (lucro=0)</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculos.lucroBruto - calculos.totalImpostos)}</p>
                    <p className="text-xs text-green-200 mt-1">Lucro Bruto - Impostos</p>
                  </div>
                </div>
                <p className="text-amber-200 text-sm mt-3 italic">
                  💡 Se suas despesas operacionais ultrapassarem {formatCurrency(calculos.lucroBruto - calculos.totalImpostos)}, você terá prejuízo. 
                  Este valor flutua conforme o estoque e as compras do período.
                </p>
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

            {/* Detalhamento PIS/COFINS */}
            {pisCofinsData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6" />
                      <h2 className="font-bold text-lg">Detalhamento PIS/COFINS</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPisCofinsViewMode('cfop')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          pisCofinsViewMode === 'cfop' 
                            ? 'bg-white text-purple-700' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Por CFOP
                      </button>
                      <button
                        onClick={() => setPisCofinsViewMode('ncm')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          pisCofinsViewMode === 'ncm' 
                            ? 'bg-white text-purple-700' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Por NCM
                      </button>
                      <button
                        onClick={() => setPisCofinsViewMode('cst')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          pisCofinsViewMode === 'cst' 
                            ? 'bg-white text-purple-700' 
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Por CST
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Com Crédito (CST 50) */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => setPisCofinsExpanded(pisCofinsExpanded === 'credito' ? null : 'credito')}
                    className="w-full px-5 py-4 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-semibold text-green-900">Com Direito a Crédito</span>
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded font-medium">CST 50</span>
                      <span className="text-sm text-green-600">
                        {(pisCofinsData?.creditos?.com_credito?.[`por_${pisCofinsViewMode}`] || []).length} registros
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">PIS</span>
                        <span className="font-bold text-green-700">{formatCurrency(pisCofinsData?.creditos?.com_credito?.pis || 0)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">COFINS</span>
                        <span className="font-bold text-green-700">{formatCurrency(pisCofinsData?.creditos?.com_credito?.cofins || 0)}</span>
                      </div>
                      {pisCofinsExpanded === 'credito' ? <ChevronDown className="w-5 h-5 text-green-600" /> : <ChevronRight className="w-5 h-5 text-green-600" />}
                    </div>
                  </button>
                  {pisCofinsExpanded === 'credito' && (
                    <div className="p-4 bg-green-50/50">
                      <PisCofinsTable 
                        items={pisCofinsData?.creditos?.com_credito?.[`por_${pisCofinsViewMode}`] || []} 
                        tipo="credito"
                        viewMode={pisCofinsViewMode}
                      />
                    </div>
                  )}
                </div>
                
                {/* Sem Crédito (Alíquota Zero / Sem Incidência) */}
                <div>
                  <button
                    onClick={() => setPisCofinsExpanded(pisCofinsExpanded === 'sem_credito' ? null : 'sem_credito')}
                    className="w-full px-5 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="font-semibold text-gray-700">Sem Direito a Crédito</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-medium">CST 70/73/98</span>
                      <span className="text-sm text-gray-500">
                        {(pisCofinsData?.creditos?.aliquota_zero?.[`por_${pisCofinsViewMode}`] || []).length} registros
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Total</span>
                        <span className="font-bold text-gray-600">{formatCurrency(pisCofinsData?.creditos?.aliquota_zero?.total || 0)}</span>
                      </div>
                      {pisCofinsExpanded === 'sem_credito' ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    </div>
                  </button>
                  {pisCofinsExpanded === 'sem_credito' && (
                    <div className="p-4">
                      <PisCofinsTable 
                        items={pisCofinsData?.creditos?.aliquota_zero?.[`por_${pisCofinsViewMode}`] || []} 
                        tipo="sem_credito"
                        viewMode={pisCofinsViewMode}
                      />
                    </div>
                  )}
                </div>

                {/* Separador visual entre Entradas e Saídas */}
                <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 px-5 py-2">
                  <span className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4" />
                    SAÍDAS (DÉBITOS)
                  </span>
                </div>

                {/* Com Débito (CST 01 - Tributável) */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => setPisCofinsExpanded(pisCofinsExpanded === 'debito' ? null : 'debito')}
                    className="w-full px-5 py-4 flex items-center justify-between bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-semibold text-red-900">Operações Tributadas</span>
                      <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded font-medium">CST 01</span>
                      <span className="text-sm text-red-600">
                        {(pisCofinsData?.debitos?.com_debito?.[`por_${pisCofinsViewMode}`] || []).length} registros
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">PIS</span>
                        <span className="font-bold text-red-700">{formatCurrency(pisCofinsData?.debitos?.com_debito?.pis || 0)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">COFINS</span>
                        <span className="font-bold text-red-700">{formatCurrency(pisCofinsData?.debitos?.com_debito?.cofins || 0)}</span>
                      </div>
                      {pisCofinsExpanded === 'debito' ? <ChevronDown className="w-5 h-5 text-red-600" /> : <ChevronRight className="w-5 h-5 text-red-600" />}
                    </div>
                  </button>
                  {pisCofinsExpanded === 'debito' && (
                    <div className="p-4 bg-red-50/50">
                      <PisCofinsTable 
                        items={pisCofinsData?.debitos?.com_debito?.[`por_${pisCofinsViewMode}`] || []} 
                        tipo="debito"
                        viewMode={pisCofinsViewMode}
                      />
                    </div>
                  )}
                </div>

                {/* Sem Débito (Alíquota Zero / Isentas) */}
                <div>
                  <button
                    onClick={() => setPisCofinsExpanded(pisCofinsExpanded === 'debito_zero' ? null : 'debito_zero')}
                    className="w-full px-5 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="font-semibold text-gray-700">Operações Não Tributadas</span>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-medium">CST 04/06/49</span>
                      <span className="text-sm text-gray-500">
                        {(pisCofinsData?.debitos?.aliquota_zero?.[`por_${pisCofinsViewMode}`] || []).length} registros
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Total</span>
                        <span className="font-bold text-gray-600">{formatCurrency(pisCofinsData?.debitos?.aliquota_zero?.total || 0)}</span>
                      </div>
                      {pisCofinsExpanded === 'debito_zero' ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    </div>
                  </button>
                  {pisCofinsExpanded === 'debito_zero' && (
                    <div className="p-4">
                      <PisCofinsTable 
                        items={pisCofinsData?.debitos?.aliquota_zero?.[`por_${pisCofinsViewMode}`] || []} 
                        tipo="debito_zero"
                        viewMode={pisCofinsViewMode}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoMensal;
