import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Download, FileText, Calendar, AlertCircle, ArrowUpRight, ArrowDownRight, FileSpreadsheet, CheckCircle, XCircle, RefreshCw, AlertTriangle, Edit, ExternalLink, CheckSquare, Square } from 'lucide-react';
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
  const [corrigindoItem, setCorrigindoItem] = useState(null); // Item sendo corrigido
  const [modalCorrecao, setModalCorrecao] = useState(null); // Modal de correção
  const [itensSelecionados, setItensSelecionados] = useState(new Set()); // Itens selecionados para correção em lote

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Sincronizar com o contexto global quando ele mudar
  useEffect(() => {
    // Primeiro definir a competência do contexto se existir
    if (ctxCompetencia) {
      setCompetencia(ctxCompetencia);
    }
    // Depois carregar documentos se tiver empresa (passar competência para evitar reset)
    if (ctxCompany) {
      setSelectedCompany(ctxCompany.id);
      fetchDocumentsAndCompetencias(ctxCompany.id, ctxCompetencia);
    }
  }, [ctxCompany, ctxCompetencia]);

  // Se não há contexto e empresas foram carregadas, selecionar primeira
  useEffect(() => {
    if (!ctxCompany && companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].id);
      fetchDocumentsAndCompetencias(companies[0].id);
    }
    if (!ctxCompetencia && !competencia) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCompetencia(`${month}/${year}`);
    }
  }, [companies, ctxCompany, ctxCompetencia]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data);
      // Não forçar seleção aqui - deixar o useEffect decidir baseado no contexto
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const fetchDocumentsAndCompetencias = async (companyId, preserveCompetencia = null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/xml/documents?company_id=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ordenar competências cronologicamente (mais recente primeiro)
      const competencias = [...new Set(response.data.map(d => d.competencia))]
        .filter(Boolean)
        .sort((a, b) => {
          const [mesA, anoA] = a.split('/').map(Number);
          const [mesB, anoB] = b.split('/').map(Number);
          // Ordenar por ano decrescente, depois por mês decrescente
          if (anoA !== anoB) return anoB - anoA;
          return mesB - mesA;
        });
      setAvailableCompetencias(competencias);
      setDocumentsCount(response.data.length);
      
      // Se tem competência para preservar e ela existe na lista, manter
      // Senão, se a competência atual não existe na lista, selecionar a primeira (mais recente)
      const competenciaParaUsar = preserveCompetencia || competencia;
      if (competencias.length > 0 && !competencias.includes(competenciaParaUsar)) {
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
    setValidacao(null); // Limpar validação anterior
    try {
      const token = localStorage.getItem('token');
      
      let filename, response;
      
      if (activeTab === 'sped') {
          // Usar novo endpoint que exporta e valida automaticamente
          response = await axios.post(
            `${API}/sped/exportar-e-validar/${selectedCompany}?competencia=${encodeURIComponent(competencia)}&excluir_creditos_despesa_st=${excluirCreditosDespesaST}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          filename = response.data.filename;
          const blob = new Blob([response.data.content], { type: 'text/plain' });
          downloadBlob(blob, filename);
          
          // Exibir resultado da validação automática
          setValidacao(response.data.validacao);
          
          if (response.data.validacao?.status === 'OK') {
            alert('✅ SPED Fiscal exportado e validado com sucesso!');
          } else {
            alert('⚠️ SPED exportado, mas foram encontradas divergências. Verifique o relatório abaixo.');
          }
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

  // Função para abrir modal de correção de item pendente
  const abrirCorrecaoItem = (item) => {
    setModalCorrecao({
      ...item,
      novoCst: '', // CST alternativo
      acao: null // 'manter', 'alterar_cst', 'ir_para_documento'
    });
  };

  // Função para aplicar correção
  const aplicarCorrecao = async (acao) => {
    if (!modalCorrecao) return;
    
    if (acao === 'ir_para_documento') {
      // Redirecionar para a página de documentos com filtro
      window.location.href = `/documentos?search=${encodeURIComponent(modalCorrecao.numero_nf)}&company=${selectedCompany}`;
      return;
    }
    
    if (acao === 'manter') {
      // O usuário decidiu manter como está (ICMS = 0)
      // Remover o item da lista de pendentes no estado local
      if (validacao && validacao.itens_pendentes) {
        const novosItensPendentes = validacao.itens_pendentes.filter(
          item => !(item.document_id === modalCorrecao.document_id && item.product_index === modalCorrecao.product_index)
        );
        setValidacao({
          ...validacao,
          itens_pendentes: novosItensPendentes,
          total_itens_pendentes: novosItensPendentes.length
        });
      }
      setModalCorrecao(null);
      // Não mostrar alert, apenas remover da lista
      return;
    }
    
    // Para outras ações futuras (alterar CST, etc.)
    setModalCorrecao(null);
  };

  // Funções para seleção em lote
  const toggleSelecionarItem = (item, idx) => {
    const key = `${item.document_id}_${item.product_index}`;
    const novoSet = new Set(itensSelecionados);
    if (novoSet.has(key)) {
      novoSet.delete(key);
    } else {
      novoSet.add(key);
    }
    setItensSelecionados(novoSet);
  };

  const selecionarTodos = () => {
    if (!validacao?.itens_pendentes) return;
    const novoSet = new Set();
    validacao.itens_pendentes.forEach(item => {
      novoSet.add(`${item.document_id}_${item.product_index}`);
    });
    setItensSelecionados(novoSet);
  };

  const deselecionarTodos = () => {
    setItensSelecionados(new Set());
  };

  const manterSelecionadosEmLote = () => {
    if (!validacao?.itens_pendentes || itensSelecionados.size === 0) return;
    
    // Filtrar itens que não estão selecionados
    const novosItensPendentes = validacao.itens_pendentes.filter(item => {
      const key = `${item.document_id}_${item.product_index}`;
      return !itensSelecionados.has(key);
    });
    
    setValidacao({
      ...validacao,
      itens_pendentes: novosItensPendentes,
      total_itens_pendentes: novosItensPendentes.length
    });
    
    // Limpar seleção
    setItensSelecionados(new Set());
  };

  const manterTodosEmLote = () => {
    // Manter todos os itens como estão (remover todos da lista)
    setValidacao({
      ...validacao,
      itens_pendentes: [],
      total_itens_pendentes: 0
    });
    setItensSelecionados(new Set());
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

            {/* Validação SPED - apenas para aba SPED */}
            {activeTab === 'sped' && (
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Validar Totalizadores
                  </h3>
                  <button
                    onClick={handleValidar}
                    disabled={loadingValidacao || !selectedCompany || !competencia}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingValidacao ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {loadingValidacao ? 'Validando...' : 'Pré-Validar'}
                  </button>
                </div>

                {/* Resultado da validação pós-exportação (comparativo Sistema vs SPED) */}
                {validacao && validacao.comparativo_cfop && (
                  <div className="space-y-4">
                    {/* Status da validação */}
                    <div className={`p-4 rounded-lg border flex items-center gap-3 ${
                      validacao.status === 'OK' 
                        ? 'bg-green-50 border-green-300' 
                        : validacao.status === 'PENDENTE'
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}>
                      {validacao.status === 'OK' ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-green-600" />
                          <div>
                            <h4 className="font-bold text-green-800">✅ SPED Validado com Sucesso!</h4>
                            <p className="text-sm text-green-700">O arquivo gerado está consistente com os dados do sistema.</p>
                          </div>
                        </>
                      ) : validacao.status === 'PENDENTE' ? (
                        <>
                          <AlertTriangle className="w-8 h-8 text-orange-600" />
                          <div>
                            <h4 className="font-bold text-orange-800">⚠️ Itens Pendentes de Correção</h4>
                            <p className="text-sm text-orange-700">
                              {validacao.total_itens_pendentes} item(ns) com CST tributado mas ICMS = R$ 0,00. 
                              Verifique e corrija antes de enviar o SPED.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-8 h-8 text-yellow-600" />
                          <div>
                            <h4 className="font-bold text-yellow-800">⚠️ Divergências Encontradas</h4>
                            <p className="text-sm text-yellow-700">{validacao.divergencias?.length || 0} divergência(s) entre o SPED e o sistema.</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Itens Pendentes de Correção */}
                    {validacao.itens_pendentes && validacao.itens_pendentes.length > 0 && (
                      <div className="bg-orange-50 rounded-lg border border-orange-200">
                        <div className="p-3 bg-orange-100 border-b border-orange-200 font-semibold text-orange-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Itens com ICMS Zerado (CST indica tributação)
                          </div>
                          <span className="text-sm font-normal">Clique em &quot;Corrigir&quot; para tomar uma decisão</span>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-orange-100 sticky top-0">
                              <tr>
                                <th className="px-2 py-2 text-left">NF</th>
                                <th className="px-2 py-2 text-left">CFOP</th>
                                <th className="px-2 py-2 text-left">Descrição</th>
                                <th className="px-2 py-2 text-right">Valor</th>
                                <th className="px-2 py-2 text-center">CST</th>
                                <th className="px-2 py-2 text-center">Ação</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-200">
                              {validacao.itens_pendentes.map((item, idx) => (
                                <tr key={idx} className="hover:bg-orange-100">
                                  <td className="px-2 py-2 font-mono text-xs">{item.numero_nf}</td>
                                  <td className="px-2 py-2 font-mono">{item.cfop}</td>
                                  <td className="px-2 py-2 truncate max-w-[150px]" title={item.descricao}>{item.descricao}</td>
                                  <td className="px-2 py-2 text-right font-mono">R$ {item.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-2 py-2 text-center font-mono text-orange-700 font-bold">{item.cst}</td>
                                  <td className="px-2 py-2 text-center">
                                    <button
                                      onClick={() => abrirCorrecaoItem(item)}
                                      className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium flex items-center gap-1 mx-auto"
                                      data-testid={`corrigir-item-${idx}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                      Corrigir
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {validacao.total_itens_pendentes > 100 && (
                          <div className="p-2 bg-orange-100 text-center text-sm text-orange-700">
                            Mostrando 100 de {validacao.total_itens_pendentes} itens pendentes
                          </div>
                        )}
                      </div>
                    )}

                    {/* Modal de Correção */}
                    {modalCorrecao && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalCorrecao(null)}>
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                            <AlertTriangle className="w-8 h-8 text-orange-500" />
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">Corrigir Item Pendente</h3>
                              <p className="text-sm text-gray-600">NF: {modalCorrecao.numero_nf} | CFOP: {modalCorrecao.cfop}</p>
                            </div>
                          </div>
                          
                          <div className="bg-orange-50 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-700 mb-2"><strong>Produto:</strong> {modalCorrecao.descricao}</p>
                            <p className="text-sm text-gray-700 mb-2"><strong>NCM:</strong> {modalCorrecao.ncm} | <strong>Valor:</strong> R$ {modalCorrecao.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            <p className="text-sm text-orange-700 font-medium"><strong>Problema:</strong> CST {modalCorrecao.cst} indica tributação, mas ICMS = R$ 0,00</p>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4">Escolha uma ação:</p>
                          
                          <div className="space-y-3">
                            <button
                              onClick={() => aplicarCorrecao('manter')}
                              className="w-full p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-left transition-colors"
                            >
                              <div className="font-medium text-gray-900">✓ Manter como está</div>
                              <div className="text-xs text-gray-600">O ICMS será exportado como R$ 0,00 (pode gerar alerta no PVA)</div>
                            </button>
                            
                            <button
                              onClick={() => aplicarCorrecao('ir_para_documento')}
                              className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors flex items-center gap-3"
                            >
                              <ExternalLink className="w-5 h-5 text-blue-600" />
                              <div>
                                <div className="font-medium text-blue-900">Ir para o Documento</div>
                                <div className="text-xs text-blue-700">Abrir a NF-e para editar manualmente (classificação, CST, etc.)</div>
                              </div>
                            </button>
                          </div>
                          
                          <button
                            onClick={() => setModalCorrecao(null)}
                            className="w-full mt-4 p-2 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Comparativo Totais */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">Totais do Sistema</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Entradas:</span>
                            <span className="font-mono">R$ {validacao.totais_sistema?.entradas?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ICMS Crédito:</span>
                            <span className="font-mono text-green-700">R$ {validacao.totais_sistema?.entradas?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Saídas:</span>
                            <span className="font-mono">R$ {validacao.totais_sistema?.saidas?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ICMS Débito:</span>
                            <span className="font-mono text-red-700">R$ {validacao.totais_sistema?.saidas?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h4 className="font-semibold text-purple-800 mb-2">Totais no SPED Gerado</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Entradas:</span>
                            <span className="font-mono">R$ {validacao.totais_sped?.entradas?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ICMS Crédito:</span>
                            <span className="font-mono text-green-700">R$ {validacao.totais_sped?.entradas?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Saídas:</span>
                            <span className="font-mono">R$ {validacao.totais_sped?.saidas?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ICMS Débito:</span>
                            <span className="font-mono text-red-700">R$ {validacao.totais_sped?.saidas?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comparativo por CFOP - Entradas */}
                    {validacao.comparativo_cfop?.entradas?.length > 0 && (
                      <div className="bg-white rounded-lg border">
                        <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700">
                          Comparativo por CFOP (Entradas)
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left">CFOP</th>
                                <th className="px-3 py-2 text-right">Valor Sistema</th>
                                <th className="px-3 py-2 text-right">Valor SPED</th>
                                <th className="px-3 py-2 text-right">ICMS Sistema</th>
                                <th className="px-3 py-2 text-right">ICMS SPED</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {validacao.comparativo_cfop.entradas.map((item) => (
                                <tr key={item.cfop} className={item.status === 'DIVERGENTE' ? 'bg-red-50' : ''}>
                                  <td className="px-3 py-2 font-mono font-semibold">{item.cfop}</td>
                                  <td className="px-3 py-2 text-right font-mono">R$ {item.sistema?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-right font-mono">R$ {item.sped?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-right font-mono text-green-700">R$ {item.sistema?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-right font-mono text-green-700">R$ {item.sped?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-center">
                                    {item.status === 'OK' ? (
                                      <span className="text-green-600 flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> OK
                                      </span>
                                    ) : (
                                      <span className="text-red-600 flex items-center justify-center gap-1">
                                        <XCircle className="w-4 h-4" /> Divergente
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Comparativo por CFOP - Saídas */}
                    {validacao.comparativo_cfop?.saidas?.length > 0 && (
                      <div className="bg-white rounded-lg border">
                        <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700">
                          Comparativo por CFOP (Saídas)
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left">CFOP</th>
                                <th className="px-3 py-2 text-right">Valor Sistema</th>
                                <th className="px-3 py-2 text-right">Valor SPED</th>
                                <th className="px-3 py-2 text-right">ICMS Sistema</th>
                                <th className="px-3 py-2 text-right">ICMS SPED</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {validacao.comparativo_cfop.saidas.map((item) => (
                                <tr key={item.cfop} className={item.status === 'DIVERGENTE' ? 'bg-red-50' : ''}>
                                  <td className="px-3 py-2 font-mono font-semibold">{item.cfop}</td>
                                  <td className="px-3 py-2 text-right font-mono">R$ {item.sistema?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-right font-mono">R$ {item.sped?.valor?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-right font-mono text-red-700">R$ {item.sistema?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-right font-mono text-red-700">R$ {item.sped?.icms?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                  <td className="px-3 py-2 text-center">
                                    {item.status === 'OK' ? (
                                      <span className="text-green-600 flex items-center justify-center gap-1">
                                        <CheckCircle className="w-4 h-4" /> OK
                                      </span>
                                    ) : (
                                      <span className="text-red-600 flex items-center justify-center gap-1">
                                        <XCircle className="w-4 h-4" /> Divergente
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resultado da pré-validação (formato antigo) */}
                {validacao && validacao.resumo && !validacao.comparativo_cfop && (
                  <div className="space-y-4">
                    {/* Resumo da Apuração */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">Entradas (Créditos)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Valor:</span>
                            <span className="font-mono">R$ {validacao.resumo.entradas.total_valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ICMS Creditável:</span>
                            <span className="font-mono text-green-700 font-semibold">R$ {validacao.resumo.entradas.total_icms_creditavel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          {excluirCreditosDespesaST && validacao.resumo.entradas.total_icms_excluido > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>ICMS Excluído (Desp/ST):</span>
                              <span className="font-mono">R$ {validacao.resumo.entradas.total_icms_excluido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">PIS:</span>
                            <span className="font-mono">R$ {validacao.resumo.entradas.total_pis.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">COFINS:</span>
                            <span className="font-mono">R$ {validacao.resumo.entradas.total_cofins.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <h4 className="font-semibold text-red-800 mb-2">Saídas (Débitos)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Valor:</span>
                            <span className="font-mono">R$ {validacao.resumo.saidas.total_valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ICMS Débito:</span>
                            <span className="font-mono text-red-700 font-semibold">R$ {validacao.resumo.saidas.total_icms.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">PIS:</span>
                            <span className="font-mono">R$ {validacao.resumo.saidas.total_pis.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">COFINS:</span>
                            <span className="font-mono">R$ {validacao.resumo.saidas.total_cofins.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Saldo ICMS */}
                    <div className={`p-4 rounded-lg border ${validacao.resumo.apuracao_icms.icms_a_pagar > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-200'}`}>
                      <h4 className="font-semibold mb-2">Apuração ICMS</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Saldo:</span>
                          <div className="font-mono text-lg font-bold">
                            R$ {validacao.resumo.apuracao_icms.saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">ICMS a Pagar:</span>
                          <div className={`font-mono text-lg font-bold ${validacao.resumo.apuracao_icms.icms_a_pagar > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            R$ {validacao.resumo.apuracao_icms.icms_a_pagar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Crédito a Transportar:</span>
                          <div className={`font-mono text-lg font-bold ${validacao.resumo.apuracao_icms.icms_a_compensar > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            R$ {validacao.resumo.apuracao_icms.icms_a_compensar.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalhamento por CFOP */}
                    <div className="bg-white rounded-lg border">
                      <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700">
                        Totalizadores por CFOP (Entradas)
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">CFOP</th>
                              <th className="px-3 py-2 text-right">Itens</th>
                              <th className="px-3 py-2 text-right">Valor</th>
                              <th className="px-3 py-2 text-right">ICMS</th>
                              <th className="px-3 py-2 text-center">Crédito</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {validacao.detalhamento_cfop.entradas.map((cfop) => (
                              <tr key={cfop.cfop} className={cfop.credito_excluido ? 'bg-red-50' : ''}>
                                <td className="px-3 py-2 font-mono font-semibold">{cfop.cfop}</td>
                                <td className="px-3 py-2 text-right">{cfop.qtd_itens}</td>
                                <td className="px-3 py-2 text-right font-mono">R$ {cfop.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                <td className="px-3 py-2 text-right font-mono">R$ {cfop.icms.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                <td className="px-3 py-2 text-center">
                                  {cfop.credito_excluido ? (
                                    <span className="text-red-600 flex items-center justify-center gap-1">
                                      <XCircle className="w-4 h-4" /> Excluído
                                    </span>
                                  ) : (
                                    <span className="text-green-600 flex items-center justify-center gap-1">
                                      <CheckCircle className="w-4 h-4" /> OK
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExportMenu;
