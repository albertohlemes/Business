import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  FileText, Download, Building2, DollarSign, AlertTriangle,
  RefreshCw, FileSpreadsheet, Loader2, FileDown, CheckCircle,
  ArrowDownCircle, ArrowUpCircle, Calculator, PiggyBank, Truck,
  ClipboardList, BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RelatorioUnificado = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (ctxCompany?.id && selectedCompetencia) {
      fetchDados();
    }
  }, [ctxCompany?.id, selectedCompetencia]);

  const fetchDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Buscar dados de múltiplos endpoints em paralelo
      const [
        dashboardRes,
        indicadoresRes,
        apuracaoRes
      ] = await Promise.all([
        axios.get(`${API}/dashboard/${ctxCompany.id}?competencia=${selectedCompetencia}`, 
          { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`${API}/indicadores/${ctxCompany.id}?competencia=${selectedCompetencia}`, 
          { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`${API}/apuracao-movimento/${ctxCompany.id}?competencia=${selectedCompetencia}`, 
          { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null }))
      ]);
      
      setDados({
        dashboard: dashboardRes.data,
        indicadores: indicadoresRes.data,
        apuracao: apuracaoRes.data,
        empresa: ctxCompany,
        competencia: selectedCompetencia
      });
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  };

  // Exportar para Excel
  const exportarExcel = () => {
    if (!dados) return;
    setExportando(true);
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Aba 1: Resumo
      const resumo = [
        ['RELATÓRIO UNIFICADO - FECHAMENTO FISCAL'],
        [''],
        ['Empresa:', dados.empresa?.razao_social || ''],
        ['CNPJ:', dados.empresa?.cnpj || ''],
        ['Competência:', dados.competencia],
        ['Regime Tributário:', dados.empresa?.regime_tributario?.toUpperCase() || ''],
        [''],
        ['MOVIMENTAÇÃO'],
        ['Total Entradas:', dados.dashboard?.total_entradas || 0],
        ['Total Saídas:', dados.dashboard?.total_saidas || 0],
        ['Qtd. Documentos Entrada:', dados.dashboard?.qtd_entradas || 0],
        ['Qtd. Documentos Saída:', dados.dashboard?.qtd_saidas || 0],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      
      // Aba 2: Indicadores
      if (dados.indicadores) {
        const indicadores = [
          ['INDICADORES FISCAIS'],
          [''],
          ['Tributo', 'Débito', 'Crédito', 'Saldo', 'Situação'],
        ];
        
        if (dados.indicadores.icms) {
          indicadores.push(['ICMS', dados.indicadores.icms.debito, dados.indicadores.icms.credito, dados.indicadores.icms.saldo, dados.indicadores.icms.situacao]);
        }
        if (dados.indicadores.pis) {
          indicadores.push(['PIS', dados.indicadores.pis.debito, dados.indicadores.pis.credito, dados.indicadores.pis.saldo, dados.indicadores.pis.situacao]);
        }
        if (dados.indicadores.cofins) {
          indicadores.push(['COFINS', dados.indicadores.cofins.debito, dados.indicadores.cofins.credito, dados.indicadores.cofins.saldo, dados.indicadores.cofins.situacao]);
        }
        
        const wsIndicadores = XLSX.utils.aoa_to_sheet(indicadores);
        XLSX.utils.book_append_sheet(wb, wsIndicadores, 'Indicadores');
      }
      
      // Aba 3: Apuração por CFOP
      if (dados.apuracao?.entradas) {
        const entradas = [
          ['APURAÇÃO POR CFOP - ENTRADAS'],
          [''],
          ['CFOP', 'Descrição', 'Quantidade', 'Valor Total', 'Base ICMS', 'ICMS', 'Base PIS/COFINS', 'PIS', 'COFINS'],
        ];
        
        dados.apuracao.entradas.forEach(item => {
          entradas.push([
            item.cfop,
            item.descricao,
            item.quantidade,
            item.valor_total,
            item.base_icms,
            item.valor_icms,
            item.base_pis_cofins,
            item.valor_pis,
            item.valor_cofins
          ]);
        });
        
        const wsEntradas = XLSX.utils.aoa_to_sheet(entradas);
        XLSX.utils.book_append_sheet(wb, wsEntradas, 'Entradas por CFOP');
      }
      
      if (dados.apuracao?.saidas) {
        const saidas = [
          ['APURAÇÃO POR CFOP - SAÍDAS'],
          [''],
          ['CFOP', 'Descrição', 'Quantidade', 'Valor Total', 'Base ICMS', 'ICMS', 'Base PIS/COFINS', 'PIS', 'COFINS'],
        ];
        
        dados.apuracao.saidas.forEach(item => {
          saidas.push([
            item.cfop,
            item.descricao,
            item.quantidade,
            item.valor_total,
            item.base_icms,
            item.valor_icms,
            item.base_pis_cofins,
            item.valor_pis,
            item.valor_cofins
          ]);
        });
        
        const wsSaidas = XLSX.utils.aoa_to_sheet(saidas);
        XLSX.utils.book_append_sheet(wb, wsSaidas, 'Saídas por CFOP');
      }
      
      XLSX.writeFile(wb, `relatorio_unificado_${dados.empresa?.razao_social?.substring(0, 20)}_${dados.competencia?.replace('/', '-')}.xlsx`);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar para Excel');
    } finally {
      setExportando(false);
    }
  };

  // Exportar para Word
  const exportarWord = async () => {
    if (!dados) return;
    setExportando(true);
    
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Título
            new Paragraph({
              children: [
                new TextRun({
                  text: 'RELATÓRIO UNIFICADO - FECHAMENTO FISCAL',
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            
            // Dados da Empresa
            new Paragraph({
              children: [
                new TextRun({ text: 'DADOS DA EMPRESA', bold: true, size: 24 }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Razão Social: ', bold: true }),
                new TextRun({ text: dados.empresa?.razao_social || '' }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'CNPJ: ', bold: true }),
                new TextRun({ text: dados.empresa?.cnpj || '' }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Competência: ', bold: true }),
                new TextRun({ text: dados.competencia }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Regime Tributário: ', bold: true }),
                new TextRun({ text: dados.empresa?.regime_tributario?.toUpperCase() || '' }),
              ],
            }),
            
            // Movimentação
            new Paragraph({
              children: [
                new TextRun({ text: 'MOVIMENTAÇÃO DO PERÍODO', bold: true, size: 24 }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Total de Entradas: ', bold: true }),
                new TextRun({ text: formatCurrency(dados.dashboard?.total_entradas) }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Total de Saídas: ', bold: true }),
                new TextRun({ text: formatCurrency(dados.dashboard?.total_saidas) }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Documentos de Entrada: ', bold: true }),
                new TextRun({ text: String(dados.dashboard?.qtd_entradas || 0) }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'Documentos de Saída: ', bold: true }),
                new TextRun({ text: String(dados.dashboard?.qtd_saidas || 0) }),
              ],
            }),
            
            // Indicadores
            new Paragraph({
              children: [
                new TextRun({ text: 'INDICADORES FISCAIS', bold: true, size: 24 }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            ...(dados.indicadores?.icms ? [
              new Paragraph({
                children: [
                  new TextRun({ text: 'ICMS - Débito: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.icms.debito) }),
                  new TextRun({ text: ' | Crédito: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.icms.credito) }),
                  new TextRun({ text: ' | Saldo: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.icms.saldo) }),
                ],
              }),
            ] : []),
            ...(dados.indicadores?.pis ? [
              new Paragraph({
                children: [
                  new TextRun({ text: 'PIS - Débito: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.pis.debito) }),
                  new TextRun({ text: ' | Crédito: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.pis.credito) }),
                  new TextRun({ text: ' | Saldo: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.pis.saldo) }),
                ],
              }),
            ] : []),
            ...(dados.indicadores?.cofins ? [
              new Paragraph({
                children: [
                  new TextRun({ text: 'COFINS - Débito: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.cofins.debito) }),
                  new TextRun({ text: ' | Crédito: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.cofins.credito) }),
                  new TextRun({ text: ' | Saldo: ', bold: true }),
                  new TextRun({ text: formatCurrency(dados.indicadores.cofins.saldo) }),
                ],
              }),
            ] : []),
            
            // Rodapé
            new Paragraph({
              children: [
                new TextRun({ text: `\n\nGerado em: ${new Date().toLocaleString('pt-BR')}`, italics: true, size: 18 }),
              ],
              spacing: { before: 600 },
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `relatorio_unificado_${dados.empresa?.razao_social?.substring(0, 20)}_${dados.competencia?.replace('/', '-')}.docx`);
    } catch (err) {
      console.error('Erro ao exportar Word:', err);
      alert('Erro ao exportar para Word');
    } finally {
      setExportando(false);
    }
  };

  // Exportar para PDF (via print)
  const exportarPDF = () => {
    window.print();
  };

  if (!ctxCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-[#C8A951] mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-[#A1A1AA]">Escolha uma empresa para gerar o relatório unificado</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ClipboardList className="w-7 h-7 text-[#C8A951]" />
              Relatório Unificado
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              {ctxCompany.razao_social} • Competência {selectedCompetencia}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDados}
              disabled={loading}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={exportarExcel}
                disabled={!dados || loading || exportando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              
              <button
                onClick={exportarWord}
                disabled={!dados || loading || exportando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Word
              </button>
              
              <button
                onClick={exportarPDF}
                disabled={!dados || loading || exportando}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 print:hidden">
            <Loader2 className="w-12 h-12 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3 print:hidden">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Content - Print Friendly */}
        {dados && !loading && (
          <div className="space-y-6 print:space-y-4">
            {/* Cabeçalho para impressão */}
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-2xl font-bold">RELATÓRIO UNIFICADO - FECHAMENTO FISCAL</h1>
              <p className="text-lg mt-2">{dados.empresa?.razao_social}</p>
              <p>CNPJ: {dados.empresa?.cnpj} • Competência: {dados.competencia}</p>
            </div>

            {/* Dados da Empresa */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-6 print:bg-white print:border-gray-300">
              <h2 className="text-white font-medium mb-4 flex items-center gap-2 print:text-black">
                <Building2 className="w-5 h-5 text-[#C8A951] print:text-gray-600" />
                Dados da Empresa
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#A1A1AA] print:text-gray-500">Razão Social</p>
                  <p className="text-white font-medium print:text-black">{dados.empresa?.razao_social}</p>
                </div>
                <div>
                  <p className="text-xs text-[#A1A1AA] print:text-gray-500">CNPJ</p>
                  <p className="text-white font-medium print:text-black">{dados.empresa?.cnpj}</p>
                </div>
                <div>
                  <p className="text-xs text-[#A1A1AA] print:text-gray-500">Regime Tributário</p>
                  <p className="text-white font-medium print:text-black">{dados.empresa?.regime_tributario?.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#A1A1AA] print:text-gray-500">Tipo de Atividade</p>
                  <p className="text-white font-medium print:text-black">{dados.empresa?.tipo_atividade?.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Movimentação */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-6 print:bg-white print:border-gray-300">
              <h2 className="text-white font-medium mb-4 flex items-center gap-2 print:text-black">
                <BarChart3 className="w-5 h-5 text-[#C8A951] print:text-gray-600" />
                Movimentação do Período
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="w-5 h-5 text-emerald-400 print:text-gray-600" />
                    <span className="text-xs text-emerald-400 print:text-gray-600">Entradas</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-400 print:text-black">{formatCurrency(dados.dashboard?.total_entradas)}</p>
                  <p className="text-xs text-[#A1A1AA] print:text-gray-500">{dados.dashboard?.qtd_entradas || 0} documentos</p>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpCircle className="w-5 h-5 text-blue-400 print:text-gray-600" />
                    <span className="text-xs text-blue-400 print:text-gray-600">Saídas</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400 print:text-black">{formatCurrency(dados.dashboard?.total_saidas)}</p>
                  <p className="text-xs text-[#A1A1AA] print:text-gray-500">{dados.dashboard?.qtd_saidas || 0} documentos</p>
                </div>
                
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-purple-400 print:text-gray-600" />
                    <span className="text-xs text-purple-400 print:text-gray-600">Serviços Tomados</span>
                  </div>
                  <p className="text-xl font-bold text-purple-400 print:text-black">{formatCurrency(dados.dashboard?.total_servicos_tomados)}</p>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 print:bg-gray-50 print:border-gray-300">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-amber-400 print:text-gray-600" />
                    <span className="text-xs text-amber-400 print:text-gray-600">Serviços Prestados</span>
                  </div>
                  <p className="text-xl font-bold text-amber-400 print:text-black">{formatCurrency(dados.dashboard?.total_servicos_prestados)}</p>
                </div>
              </div>
            </div>

            {/* Indicadores Fiscais */}
            {dados.indicadores && (
              <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-6 print:bg-white print:border-gray-300">
                <h2 className="text-white font-medium mb-4 flex items-center gap-2 print:text-black">
                  <Calculator className="w-5 h-5 text-[#C8A951] print:text-gray-600" />
                  Indicadores Fiscais
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] print:border-gray-300">
                        <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium print:text-gray-600">Tributo</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium print:text-gray-600">Débito</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium print:text-gray-600">Crédito</th>
                        <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium print:text-gray-600">Saldo</th>
                        <th className="text-center py-3 px-4 text-[#A1A1AA] font-medium print:text-gray-600">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.indicadores.icms && (
                        <tr className="border-b border-[#2A2A2A]/50 print:border-gray-200">
                          <td className="py-3 px-4 text-white font-medium print:text-black">ICMS</td>
                          <td className="py-3 px-4 text-right text-red-400 print:text-black">{formatCurrency(dados.indicadores.icms.debito)}</td>
                          <td className="py-3 px-4 text-right text-green-400 print:text-black">{formatCurrency(dados.indicadores.icms.credito)}</td>
                          <td className="py-3 px-4 text-right text-white font-bold print:text-black">{formatCurrency(dados.indicadores.icms.saldo)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              dados.indicadores.icms.situacao === 'A_PAGAR' 
                                ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-600' 
                                : 'bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-600'
                            }`}>
                              {dados.indicadores.icms.situacao === 'A_PAGAR' ? 'A Pagar' : 'Credor'}
                            </span>
                          </td>
                        </tr>
                      )}
                      {dados.indicadores.pis && (
                        <tr className="border-b border-[#2A2A2A]/50 print:border-gray-200">
                          <td className="py-3 px-4 text-white font-medium print:text-black">PIS</td>
                          <td className="py-3 px-4 text-right text-red-400 print:text-black">{formatCurrency(dados.indicadores.pis.debito)}</td>
                          <td className="py-3 px-4 text-right text-green-400 print:text-black">{formatCurrency(dados.indicadores.pis.credito)}</td>
                          <td className="py-3 px-4 text-right text-white font-bold print:text-black">{formatCurrency(dados.indicadores.pis.saldo)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              dados.indicadores.pis.situacao === 'A_PAGAR' 
                                ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-600' 
                                : 'bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-600'
                            }`}>
                              {dados.indicadores.pis.situacao === 'A_PAGAR' ? 'A Pagar' : 'Credor'}
                            </span>
                          </td>
                        </tr>
                      )}
                      {dados.indicadores.cofins && (
                        <tr className="border-b border-[#2A2A2A]/50 print:border-gray-200">
                          <td className="py-3 px-4 text-white font-medium print:text-black">COFINS</td>
                          <td className="py-3 px-4 text-right text-red-400 print:text-black">{formatCurrency(dados.indicadores.cofins.debito)}</td>
                          <td className="py-3 px-4 text-right text-green-400 print:text-black">{formatCurrency(dados.indicadores.cofins.credito)}</td>
                          <td className="py-3 px-4 text-right text-white font-bold print:text-black">{formatCurrency(dados.indicadores.cofins.saldo)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              dados.indicadores.cofins.situacao === 'A_PAGAR' 
                                ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-600' 
                                : 'bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-600'
                            }`}>
                              {dados.indicadores.cofins.situacao === 'A_PAGAR' ? 'A Pagar' : 'Credor'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div className="text-center text-[#666] text-xs print:text-gray-500 print:mt-8">
              <p>Relatório gerado em {new Date().toLocaleString('pt-BR')}</p>
              <p>Sistema de Fechamento Fiscal - AURION</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RelatorioUnificado;
