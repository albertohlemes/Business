import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Download, FileText, Calendar, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ExportSPED = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [availableCompetencias, setAvailableCompetencias] = useState([]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-preencher com empresa/competência do contexto global
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
      
      // A resposta pode ser um array ou um objeto { documents: [...] }
      const docs = Array.isArray(response.data) ? response.data : (response.data.documents || []);
      
      // Extrair competências únicas
      const competencias = [...new Set(docs.map(d => d.competencia))].filter(Boolean).sort();
      setAvailableCompetencias(competencias);
      setDocumentsCount(docs.length);
      
      // Se existirem competências, selecionar a primeira
      if (competencias.length > 0 && !competencias.includes(competencia)) {
        setCompetencia(competencias[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    if (companyId) {
      fetchDocumentsAndCompetencias(companyId);
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
      // Converter competência MM/AAAA para formato do backend
      const periodoFormatado = competencia.replace('/', '');
      
      const response = await axios.get(
        `${API}/sped/export/${selectedCompany}?competencia=${competencia}&periodo=${periodoFormatado}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Create and download file
      const blob = new Blob([response.data.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('SPED Fiscal exportado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao exportar SPED Fiscal');
    } finally {
      setLoading(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);
  const docsInCompetencia = documentsCount; // TODO: filtrar por competência

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="export-sped-page" className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Exportar SPED Fiscal</h1>
          <p className="text-[#A1A1AA]">Gere o arquivo SPED Fiscal por competência para importação no SCI Único</p>
        </div>

        <div className="bg-[#141414] rounded-xl p-6 shadow-md border border-[#2A2A2A]">
          <div className="space-y-6">
            {/* Company Selection */}
            <div>
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">Empresa *</label>
              <select
                data-testid="export-company-select"
                value={selectedCompany}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.razao_social} ({company.cnpj})
                  </option>
                ))}
              </select>
            </div>

            {/* Competência */}
            <div>
              <label className="block text-sm font-medium text-[#E0E0E0] mb-2">Competência (Mês/Ano) *</label>
              {availableCompetencias.length > 0 ? (
                <select
                  data-testid="export-competencia-select"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
                >
                  <option value="">Selecione a competência</option>
                  {availableCompetencias.map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-[#666]" />
                  <input
                    data-testid="export-competencia-input"
                    type="text"
                    value={competencia}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:border-[#C8A951] focus:outline-none"
                    placeholder="01/2024"
                    maxLength="7"
                  />
                </div>
              )}
              <p className="text-sm text-[#A1A1AA] mt-1">Formato: MM/AAAA. Somente documentos desta competência serão exportados.</p>
            </div>

            {/* Aviso se não houver documentos */}
            {selectedCompany && availableCompetencias.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-400">Nenhum documento encontrado</p>
                  <p className="text-sm text-yellow-500/80">Esta empresa não possui XMLs importados. Faça o upload primeiro.</p>
                </div>
              </div>
            )}

            {/* Company Info */}
            {selectedCompanyData && (
              <div className="bg-[#C8A951]/10 rounded-lg p-6 border border-[#C8A951]/30">
                <h3 className="font-semibold text-[#C8A951] mb-4">Informações da Empresa</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#A1A1AA] font-medium">Razão Social</p>
                    <p className="text-white">{selectedCompanyData.razao_social}</p>
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] font-medium">CNPJ</p>
                    <p className="text-white">{selectedCompanyData.cnpj}</p>
                  </div>
                  {selectedCompanyData.inscricao_estadual && (
                    <div>
                      <p className="text-[#A1A1AA] font-medium">Inscrição Estadual</p>
                      <p className="text-white">{selectedCompanyData.inscricao_estadual}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[#A1A1AA] font-medium">Competências Disponíveis</p>
                    <p className="text-white font-semibold">{availableCompetencias.length} período(s)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Export Info */}
            <div className="bg-[#0C0C0C] rounded-lg p-6 border border-[#2A2A2A]">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[#C8A951] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2">Sobre o SPED Fiscal</h3>
                  <p className="text-sm text-[#A1A1AA] mb-3">
                    O arquivo SPED Fiscal será gerado com todos os blocos necessários:
                  </p>
                  <ul className="text-sm text-[#A1A1AA] space-y-1 list-disc list-inside">
                    <li>Bloco 0 - Abertura e Identificação</li>
                    <li>Bloco C - Documentos Fiscais (Entradas e Saídas)</li>
                    <li>Bloco E - ICMS</li>
                    <li>Bloco H - Inventário</li>
                    <li>Bloco 9 - Controle e Encerramento</li>
                  </ul>
                  <p className="text-sm text-[#A1A1AA] mt-3">
                    O arquivo poderá ser importado diretamente no sistema SCI Único.
                  </p>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              data-testid="export-sped-button"
              onClick={handleExport}
              disabled={loading || !selectedCompany || !competencia}
              className="w-full bg-[#C8A951] text-[#0C0C0C] py-4 rounded-lg font-semibold hover:bg-[#D4B85C] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-3 text-lg transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0C0C0C]"></div>
                  Gerando SPED...
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Exportar SPED Fiscal - {competencia}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExportSPED;