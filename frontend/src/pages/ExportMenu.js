import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Download, FileText, Calendar, AlertCircle, ArrowUpRight, ArrowDownRight, FileSpreadsheet, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ExportMenu = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [availableCompetencias, setAvailableCompetencias] = useState([]);
  const [activeTab, setActiveTab] = useState('sped'); // sped, entrada, saida
  const [excluirCreditosDespesaST, setExcluirCreditosDespesaST] = useState(true); // Default: excluir
  const [validacao, setValidacao] = useState(null);
  const [loadingValidacao, setLoadingValidacao] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (ctxCompany && !selectedCompany) {
      setSelectedCompany(ctxCompany.id);
      fetchDocumentsAndCompetencias(ctxCompany.id);
    }
    if (ctxCompetencia && !competencia) {
      setCompetencia(ctxCompetencia);
    } else if (!competencia) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCompetencia(`${month}/${year}`);
    }
  }, [ctxCompany, ctxCompetencia]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
        fetchDocumentsAndCompetencias(response.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const fetchDocumentsAndCompetencias = async (companyId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/xml/documents?company_id=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const competencias = [...new Set(response.data.map(d => d.competencia))].filter(Boolean).sort();
      setAvailableCompetencias(competencias);
      setDocumentsCount(response.data.length);
      
      if (competencias.length > 0 && !competencias.includes(competencia)) {
        setCompetencia(competencias[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    setValidacao(null); // Limpar validação ao trocar empresa
    if (companyId) {
      fetchDocumentsAndCompetencias(companyId);
    }
  };

  const handleValidar = async () => {
    if (!selectedCompany || !competencia) {
      alert('Selecione uma empresa e competência');
      return;
    }

    setLoadingValidacao(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/sped/validar/${selectedCompany}?competencia=${competencia}&excluir_creditos_despesa_st=${excluirCreditosDespesaST}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setValidacao(response.data);
    } catch (error) {
      console.error('Erro na validação:', error);
      alert('Erro ao validar SPED');
    } finally {
      setLoadingValidacao(false);
    }
  };

  const handleExport = async () => {
    if (!selectedCompany || !competencia) {
      alert('Selecione uma empresa e competência');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let url, filename, response;
      
      if (activeTab === 'sped') {
          const periodoFormatado = competencia.replace('/', '');
          response = await axios.get(
            `${API}/sped/export/${selectedCompany}?competencia=${competencia}&periodo=${periodoFormatado}&excluir_creditos_despesa_st=${excluirCreditosDespesaST}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          filename = response.data.filename;
          const blob = new Blob([response.data.content], { type: 'text/plain' });
          downloadBlob(blob, filename);
          alert('SPED Fiscal exportado com sucesso!');
      } else {
          // CSV Export
          const endpoint = activeTab === 'entrada' ? 'csv/entrada' : 'csv/saida';
          response = await axios.get(
            `${API}/export/${endpoint}?company_id=${selectedCompany}&competencia=${encodeURIComponent(competencia)}`,
            { 
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            }
          );
          
          // Extract filename from header if possible, or generate default
          const contentDisposition = response.headers['content-disposition'];
          if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
              if (filenameMatch.length === 2) filename = filenameMatch[1];
          } 
          if (!filename) {
              filename = `${activeTab}s_${selectedCompany}_${competencia.replace('/', '-')}.txt`;
          }
          
          downloadBlob(response.data, filename);
          alert(`CSV de ${activeTab === 'entrada' ? 'Entradas' : 'Saídas'} exportado com sucesso!`);
      }

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao exportar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="export-menu-page" className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Central de Exportação</h1>
          <p className="text-gray-600">Gere arquivos fiscais e relatórios para integração contábil</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex space-x-1">
            <button
                onClick={() => setActiveTab('sped')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'sped' 
                    ? 'bg-red-50 text-red-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
                <FileText className="w-5 h-5" />
                SPED Fiscal
            </button>
            <button
                onClick={() => setActiveTab('entrada')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'entrada' 
                    ? 'bg-red-50 text-red-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
                <ArrowDownRight className="w-5 h-5" />
                CSV Entradas
            </button>
            <button
                onClick={() => setActiveTab('saida')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                    activeTab === 'saida' 
                    ? 'bg-red-50 text-red-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
                <ArrowUpRight className="w-5 h-5" />
                CSV Saídas
            </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="space-y-6">
            
            {/* Common Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecione uma empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.razao_social} ({company.cnpj})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Competência *</label>
                  {availableCompetencias.length > 0 ? (
                    <select
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">Selecione a competência</option>
                      {availableCompetencias.map((comp) => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      placeholder="MM/AAAA"
                      maxLength="7"
                    />
                  )}
                </div>
            </div>

            {/* Info Box based on Tab */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                {activeTab === 'sped' && (
                    <div className="flex items-start gap-3">
                        <FileText className="w-6 h-6 text-red-600 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Arquivo SPED Fiscal ICMS/IPI</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Gera o arquivo oficial para validação no PVA e importação no sistema contábil (SCI Único).
                                Contém Blocos 0, C (Documentos), E (Apuração), H (Inventário) e 9.
                            </p>
                            
                            {/* Opção de Créditos ICMS */}
                            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={excluirCreditosDespesaST}
                                  onChange={(e) => setExcluirCreditosDespesaST(e.target.checked)}
                                  className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <div>
                                  <span className="font-medium text-gray-900">Excluir créditos de ICMS de Despesa e ST</span>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {excluirCreditosDespesaST 
                                      ? "✓ CFOPs 1556, 2556, 1403, 2403, etc. NÃO gerarão crédito na apuração (E110)" 
                                      : "⚠ Todos os créditos do XML serão considerados na apuração (E110)"}
                                  </p>
                                </div>
                              </label>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'entrada' && (
                    <div className="flex items-start gap-3">
                        <FileSpreadsheet className="w-6 h-6 text-blue-600 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Relatório de Entradas (CSV/TXT)</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Exporta todas as notas fiscais de entrada da competência selecionada.
                                Layout personalizado com 300+ colunas para importação.
                            </p>
                        </div>
                    </div>
                )}
                {activeTab === 'saida' && (
                    <div className="flex items-start gap-3">
                        <FileSpreadsheet className="w-6 h-6 text-green-600 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Relatório de Saídas (CSV/TXT)</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Exporta todas as notas fiscais de saída da competência selecionada.
                                Layout personalizado com 300+ colunas para importação.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={loading || !selectedCompany || !competencia}
              className={`w-full text-white py-4 rounded-lg font-semibold shadow-lg flex items-center justify-center gap-3 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeTab === 'sped' ? 'bg-red-600 hover:bg-red-700' :
                  activeTab === 'entrada' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Gerando Arquivo...
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Exportar {activeTab === 'sped' ? 'SPED Fiscal' : activeTab === 'entrada' ? 'CSV Entradas' : 'CSV Saídas'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExportMenu;
