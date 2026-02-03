import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FileBarChart, Download, TrendingUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Reports = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [reportType, setReportType] = useState('product');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/companies', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const generateReport = async () => {
    if (!selectedCompany) {
      alert('Selecione uma empresa');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = reportType === 'product' ? 'by-product' : 'by-ncm';
      const response = await axios.get(API + '/reports/' + endpoint + '/' + selectedCompany, {
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
    if (reportData.length === 0) return;

    let headers = '';
    let rows = '';

    if (reportType === 'product') {
      headers = 'Código,Descrição,NCM,Quantidade,Valor Total,Crédito ICMS,Crédito PIS,Crédito COFINS,Documentos' + String.fromCharCode(10);
      rows = reportData.map(item => 
        item.codigo + ',' +
        '\"' + item.descricao + '\",' +
        item.ncm + ',' +
        item.quantidade + ',' +
        item.valor_total.toFixed(2) + ',' +
        item.credito_icms.toFixed(2) + ',' +
        item.credito_pis.toFixed(2) + ',' +
        item.credito_cofins.toFixed(2) + ',' +
        item.documentos
      ).join(String.fromCharCode(10));
    } else {
      headers = 'NCM,Qtd Produtos,Quantidade,Valor Total,Crédito ICMS,Crédito PIS,Crédito COFINS,Documentos' + String.fromCharCode(10);
      rows = reportData.map(item =>
        item.ncm + ',' +
        item.quantidade_produtos + ',' +
        item.quantidade + ',' +
        item.valor_total.toFixed(2) + ',' +
        item.credito_icms.toFixed(2) + ',' +
        item.credito_pis.toFixed(2) + ',' +
        item.credito_cofins.toFixed(2) + ',' +
        item.documentos
      ).join(String.fromCharCode(10));
    }

    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_' + reportType + '_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

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
          <h1 className=\"text-3xl font-bold text-gray-900 mb-2\">Relatórios Gerenciais</h1>
          <p className=\"text-gray-600\">Análise detalhada de produtos e NCMs para conferência fiscal</p>
        </div>

        <div className=\"bg-white rounded-xl p-6 shadow-md border border-gray-100\">
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 mb-4\">
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">Empresa</label>
              <select
                data-testid=\"report-company-select\"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className=\"w-full px-4 py-3 border border-gray-300 rounded-lg\"
              >
                <option value=\"\">Selecione</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">Tipo de Relatório</label>
              <select
                data-testid=\"report-type-select\"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className=\"w-full px-4 py-3 border border-gray-300 rounded-lg\"
              >
                <option value=\"product\">Por Produto</option>
                <option value=\"ncm\">Por NCM</option>
              </select>
            </div>

            <div className=\"flex items-end\">
              <button
                data-testid=\"generate-report-button\"
                onClick={generateReport}
                disabled={loading || !selectedCompany}
                className=\"w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2\"
              >
                <FileBarChart className=\"w-5 h-5\" />
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </div>
          </div>

          {reportData.length > 0 && (
            <div className=\"flex justify-end mb-4\">
              <button
                data-testid=\"export-csv-button\"
                onClick={exportToCSV}
                className=\"px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2\"
              >
                <Download className=\"w-4 h-4\" />
                Exportar CSV
              </button>
            </div>
          )}
        </div>

        {reportData.length > 0 && (
          <>
            <div className=\"bg-red-50 rounded-xl p-6 border border-red-200\">
              <h3 className=\"font-bold text-red-900 mb-4 flex items-center gap-2\">
                <TrendingUp className=\"w-5 h-5\" />
                Totalizadores
              </h3>
              <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
                <div>
                  <p className=\"text-sm text-red-700\">Valor Total</p>
                  <p className=\"text-2xl font-bold text-red-900\">
                    R$ {totals.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className=\"text-sm text-red-700\">Crédito ICMS</p>
                  <p className=\"text-2xl font-bold text-red-900\">
                    R$ {totals.credito_icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className=\"text-sm text-red-700\">Crédito PIS</p>
                  <p className=\"text-2xl font-bold text-red-900\">
                    R$ {totals.credito_pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className=\"text-sm text-red-700\">Crédito COFINS</p>
                  <p className=\"text-2xl font-bold text-red-900\">
                    R$ {totals.credito_cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className=\"bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden\">
              <div className=\"overflow-x-auto\">
                <table className=\"w-full\">
                  <thead className=\"bg-gray-50 border-b border-gray-200\">
                    <tr>
                      {reportType === 'product' ? (
                        <>
                          <th className=\"px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase\">Código</th>
                          <th className=\"px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase\">Descrição</th>
                          <th className=\"px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase\">NCM</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">Quantidade</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">Valor</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">ICMS</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">PIS</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">COFINS</th>
                        </>
                      ) : (
                        <>
                          <th className=\"px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase\">NCM</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">Produtos</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">Quantidade</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">Valor</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">ICMS</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">PIS</th>
                          <th className=\"px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase\">COFINS</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className=\"divide-y divide-gray-200\">
                    {reportData.map((item, index) => (
                      <tr key={index} className=\"hover:bg-gray-50\">
                        {reportType === 'product' ? (
                          <>
                            <td className=\"px-6 py-4 text-sm text-gray-900\">{item.codigo}</td>
                            <td className=\"px-6 py-4 text-sm text-gray-900\">{item.descricao}</td>
                            <td className=\"px-6 py-4 text-sm text-gray-900\">{item.ncm}</td>
                            <td className=\"px-6 py-4 text-sm text-gray-900 text-right\">{item.quantidade.toFixed(2)}</td>
                            <td className=\"px-6 py-4 text-sm font-semibold text-gray-900 text-right\">
                              R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className=\"px-6 py-4 text-sm text-green-600 text-right\">
                              R$ {item.credito_icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className=\"px-6 py-4 text-sm text-green-600 text-right\">
                              R$ {item.credito_pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className=\"px-6 py-4 text-sm text-green-600 text-right\">
                              R$ {item.credito_cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className=\"px-6 py-4 text-sm font-semibold text-gray-900\">{item.ncm}</td>
                            <td className=\"px-6 py-4 text-sm text-gray-900 text-right\">{item.quantidade_produtos}</td>
                            <td className=\"px-6 py-4 text-sm text-gray-900 text-right\">{item.quantidade.toFixed(2)}</td>
                            <td className=\"px-6 py-4 text-sm font-semibold text-gray-900 text-right\">
                              R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className=\"px-6 py-4 text-sm text-green-600 text-right\">
                              R$ {item.credito_icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className=\"px-6 py-4 text-sm text-green-600 text-right\">
                              R$ {item.credito_pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className=\"px-6 py-4 text-sm text-green-600 text-right\">
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
          <div className=\"text-center py-12 bg-white rounded-xl\">
            <FileBarChart className=\"w-16 h-16 text-gray-300 mx-auto mb-4\" />
            <p className=\"text-gray-600\">Clique em \"Gerar Relatório\" para visualizar os dados</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;
