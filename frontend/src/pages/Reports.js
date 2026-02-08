import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FileBarChart, Download, TrendingUp, Package, Boxes, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Reports = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  const [reportType, setReportType] = useState('product');
  const [tipoOperacao, setTipoOperacao] = useState('entrada'); // entrada, saida, todos
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Usar valores diretamente do contexto
  const selectedCompany = ctxCompany?.id || '';
  const competencia = ctxCompetencia || '';

  const generateReport = async () => {
    if (!selectedCompany) {
      alert('Selecione uma empresa');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = reportType === 'product' ? 'by-product' : 'by-ncm';
      let params = competencia ? '?competencia=' + competencia : '';
      if (tipoOperacao !== 'todos') {
        params += (params ? '&' : '?') + 'tipo=' + tipoOperacao;
      }
      const response = await axios.get(API + '/reports/' + endpoint + '/' + selectedCompany + params, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setReportData(response.data);
    } catch (err) {
      alert('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    console.log('exportToCSV called, reportData:', reportData);
    
    if (!reportData || reportData.length === 0) {
      alert('Nenhum dado para exportar. Gere o relatório primeiro.');
      return;
    }

    try {
      let headers = '';
      let rows = '';

      if (reportType === 'product') {
        headers = 'Codigo,Descricao,NCM,Quantidade,Valor Total,Credito ICMS,Credito PIS,Credito COFINS,Documentos\n';
        rows = reportData.map(item => {
          const codigo = String(item.codigo || '');
          const descricao = String(item.descricao || '').replace(/"/g, '""');
          const ncm = String(item.ncm || '');
          const quantidade = parseFloat(item.quantidade) || 0;
          const valor_total = parseFloat(item.valor_total) || 0;
          const credito_icms = parseFloat(item.credito_icms) || 0;
          const credito_pis = parseFloat(item.credito_pis) || 0;
          const credito_cofins = parseFloat(item.credito_cofins) || 0;
          const documentos = parseInt(item.documentos) || 0;
          
          return [
            codigo,
            '"' + descricao + '"',
            ncm,
            quantidade.toFixed(2),
            valor_total.toFixed(2),
            credito_icms.toFixed(2),
            credito_pis.toFixed(2),
            credito_cofins.toFixed(2),
            documentos
          ].join(',');
        }).join('\n');
      } else {
        headers = 'NCM,Qtd Produtos,Quantidade,Valor Total,Credito ICMS,Credito PIS,Credito COFINS,Documentos\n';
        rows = reportData.map(item => {
          const ncm = String(item.ncm || '');
          const quantidade_produtos = parseInt(item.quantidade_produtos) || 0;
          const quantidade = parseFloat(item.quantidade) || 0;
          const valor_total = parseFloat(item.valor_total) || 0;
          const credito_icms = parseFloat(item.credito_icms) || 0;
          const credito_pis = parseFloat(item.credito_pis) || 0;
          const credito_cofins = parseFloat(item.credito_cofins) || 0;
          const documentos = parseInt(item.documentos) || 0;
          
          return [
            ncm,
            quantidade_produtos,
            quantidade.toFixed(2),
            valor_total.toFixed(2),
            credito_icms.toFixed(2),
            credito_pis.toFixed(2),
            credito_cofins.toFixed(2),
            documentos
          ].join(',');
        }).join('\n');
      }

      // Adicionar BOM para UTF-8
      const BOM = '\uFEFF';
      const csv = BOM + headers + rows;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relatorio_' + reportType + '_' + (competencia || 'todas').replace('/', '-') + '.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('CSV exported successfully');
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
      alert('Erro ao exportar CSV: ' + err.message);
    }
  };

  const totals = reportData.reduce((acc, item) => ({
    valor_total: acc.valor_total + (item.valor_total || 0),
    credito_icms: acc.credito_icms + (item.credito_icms || 0),
    credito_pis: acc.credito_pis + (item.credito_pis || 0),
    credito_cofins: acc.credito_cofins + (item.credito_cofins || 0)
  }), { valor_total: 0, credito_icms: 0, credito_pis: 0, credito_cofins: 0 });

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="reports-page" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios Gerenciais</h1>
          <p className="text-[#A1A1AA]">Análise detalhada de produtos e NCMs por competência para conferência fiscal</p>
        </div>

        <div className="bg-[#141414] rounded-lg p-6 shadow-md border border-[#2A2A2A]">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">Empresa</label>
              <div 
                data-testid="report-company-select"
                className="w-full px-4 py-3 border border-[#333333] rounded-lg bg-[#0C0C0C] cursor-not-allowed"
              >
                {ctxCompany ? (
                  <span>{ctxCompany.codigo_empresa ? `#${ctxCompany.codigo_empresa} - ` : ''}{ctxCompany.razao_social}</span>
                ) : (
                  <span className="text-[#A1A1AA]">Selecione no header</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">Competência</label>
              <div 
                data-testid="report-competencia-select"
                className="w-full px-4 py-3 border border-[#333333] rounded-lg bg-[#0C0C0C] cursor-not-allowed"
              >
                {competencia || <span className="text-[#A1A1AA]">Selecione no header</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">Tipo de Relatório</label>
              <select
                data-testid="report-type-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-3 border border-[#333333] rounded-lg bg-[#0C0C0C] text-white"
              >
                <option value="product">Por Produto</option>
                <option value="ncm">Por NCM</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">Operação</label>
              <select
                data-testid="report-tipo-operacao-select"
                value={tipoOperacao}
                onChange={(e) => setTipoOperacao(e.target.value)}
                className="w-full px-4 py-3 border border-[#333333] rounded-lg bg-[#0C0C0C] text-white"
              >
                <option value="entrada">Entrada (Compras)</option>
                <option value="saida">Saída (Vendas)</option>
                <option value="todos">Todos</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                data-testid="generate-report-button"
                onClick={generateReport}
                disabled={loading || !selectedCompany}
                className="w-full bg-[#C8A951] text-black py-3 rounded-lg font-semibold hover:bg-[#B09240] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileBarChart className="w-5 h-5" />
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </div>
          </div>

          {/* Indicador de tipo de operação */}
          {reportData.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {tipoOperacao === 'entrada' ? (
                  <span className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg font-medium">
                    <ArrowDownCircle className="w-4 h-4" />
                    Relatório de Entrada (Compras) - Créditos
                  </span>
                ) : tipoOperacao === 'saida' ? (
                  <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium">
                    <ArrowUpCircle className="w-4 h-4" />
                    Relatório de Saída (Vendas) - Débitos
                  </span>
                ) : (
                  <span className="flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] text-white rounded-lg font-medium">
                    Todos os Documentos
                  </span>
                )}
              </div>
              <button
                data-testid="export-csv-button"
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV - {competencia || 'Todas'}
              </button>
            </div>
          )}
        </div>

        {reportData.length > 0 && (
          <>
            <div className="bg-[#C8A951]/10 rounded-lg p-6 border border-[#C8A951]/30">
              <h3 className="font-bold text-[#C8A951] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Totalizadores - Conferência Fiscal {competencia && '(' + competencia + ')'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-[#A1A1AA]">Valor Total Operações</p>
                  <p className="text-2xl font-bold text-white">
                    R$ {totals.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#A1A1AA]">Crédito ICMS</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {totals.credito_icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-red-700">Crédito PIS</p>
                  <p className="text-2xl font-bold text-green-700">
                    R$ {totals.credito_pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-red-700">Crédito COFINS</p>
                  <p className="text-2xl font-bold text-green-700">
                    R$ {totals.credito_cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#141414] rounded-lg shadow-md border border-[#2A2A2A] overflow-hidden">
              <div className="bg-[#0C0C0C] px-6 py-4 border-b border-[#2A2A2A] flex items-center gap-2">
                {reportType === 'product' ? (
                  <><Package className="w-5 h-5 text-[#C8A951]" /><h3 className="font-bold text-white">Relatório por Produto {competencia && '- ' + competencia}</h3></>
                ) : (
                  <><Boxes className="w-5 h-5 text-[#C8A951]" /><h3 className="font-bold text-white">Relatório por NCM {competencia && '- ' + competencia}</h3></>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0C0C0C] border-b border-[#2A2A2A]">
                    <tr>
                      {reportType === 'product' ? (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#E0E0E0] uppercase">Código</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#E0E0E0] uppercase">Descrição</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#E0E0E0] uppercase">NCM</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">Qtd</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">Valor</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">ICMS</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">PIS</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">COFINS</th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-[#E0E0E0] uppercase">NCM</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">Produtos</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">Qtd</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">Valor</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">ICMS</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">PIS</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-[#E0E0E0] uppercase">COFINS</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {reportData.map((item, index) => (
                      <tr key={index} className="hover:bg-[#0C0C0C]">
                        {reportType === 'product' ? (
                          <>
                            <td className="px-6 py-4 text-sm text-white">{item.codigo}</td>
                            <td className="px-6 py-4 text-sm text-white">{item.descricao}</td>
                            <td className="px-6 py-4 text-sm text-white">{item.ncm}</td>
                            <td className="px-6 py-4 text-sm text-white text-right">{item.quantidade.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-white text-right">
                              R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 text-right">
                              R$ {item.credito_icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 text-right">
                              R$ {item.credito_pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 text-right">
                              R$ {item.credito_cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-sm font-semibold text-white">{item.ncm}</td>
                            <td className="px-6 py-4 text-sm text-white text-right">{item.quantidade_produtos}</td>
                            <td className="px-6 py-4 text-sm text-white text-right">{item.quantidade.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-white text-right">
                              R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 text-right">
                              R$ {item.credito_icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 text-right">
                              R$ {item.credito_pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 text-right">
                              R$ {item.credito_cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && reportData.length === 0 && selectedCompany && (
          <div className="text-center py-12 bg-[#141414] rounded-lg">
            <FileBarChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-[#A1A1AA]">Clique em "Gerar Relatório" para visualizar os dados</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;