import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FileText, Eye, Filter, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Documents = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia } = useAppContext();
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [ctxCompany]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const companyParam = ctxCompany ? `?company_id=${ctxCompany.id}` : '';
      const [companiesRes, documentsRes] = await Promise.all([
        axios.get(`${API}/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/xml/documents${companyParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCompanies(companiesRes.data);
      setDocuments(documentsRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId, numeroNfe) => {
    if (!window.confirm(`Tem certeza que deseja apagar a NF-e ${numeroNfe}?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Documento apagado com sucesso!');
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar documento:', err);
      alert(err.response?.data?.detail || 'Erro ao apagar documento');
    }
  };

  const handleDeleteAllCompetencia = async () => {
    if (!ctxCompany || !selectedCompetencia) {
      alert('Selecione uma empresa e competência');
      return;
    }
    
    // Texto do que será apagado baseado nos filtros
    let tipoLabel = '';
    if (selectedTipo === 'entrada') tipoLabel = ' de ENTRADA';
    else if (selectedTipo === 'saida') tipoLabel = ' de SAÍDA';
    
    let statusLabel = '';
    if (selectedStatus === 'pendente') statusLabel = ' PENDENTES';
    else if (selectedStatus === 'validado') statusLabel = ' VALIDADOS';
    else if (selectedStatus === 'com_excecao') statusLabel = ' com EXCEÇÃO';
    
    // Contagem local (apenas para confirmação visual, backend fará a deleção real)
    const count = filteredDocuments.length;
    
    if (count === 0) {
      alert('Nenhum documento para apagar com os filtros selecionados');
      return;
    }
    
    const confirmMessage = `ATENÇÃO: Tem certeza que deseja apagar ${count} documento(s)${tipoLabel}${statusLabel} da competência ${selectedCompetencia}?\n\nEsta ação não pode ser desfeita.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      // Construir query params
      const params = new URLSearchParams();
      if (selectedTipo) params.append('tipo', selectedTipo);
      if (selectedStatus) params.append('status', selectedStatus);
      
      const response = await axios.delete(
        `${API}/documents/${ctxCompany.id}/competencia/${encodeURIComponent(selectedCompetencia)}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert(`${response.data.deleted_count} documento(s) apagado(s) com sucesso!`);
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar:', err);
      alert(err.response?.data?.detail || 'Erro ao apagar documentos');
    } finally {
      setDeleting(false);
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.razao_social : 'N/A';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      validado: 'bg-green-100 text-green-800 border-green-200',
      com_excecao: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    const labels = {
      pendente: 'Pendente',
      validado: 'Validado',
      com_excecao: 'Com Exceção'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const filteredDocuments = documents.filter(doc => {
    // Filtrar pela empresa do contexto
    if (ctxCompany && doc.company_id !== ctxCompany.id) return false;
    // Filtrar pela competência do contexto
    if (selectedCompetencia && doc.competencia !== selectedCompetencia) return false;
    if (selectedStatus && doc.status_validacao !== selectedStatus) return false;
    if (selectedTipo && doc.tipo !== selectedTipo) return false;
    return true;
  });

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="documents-page" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentos Fiscais</h1>
            <p className="text-gray-600">Gerencie e valide os XMLs importados</p>
          </div>
          <Link
            data-testid="go-to-upload-button"
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Novo Upload
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Filtros</h2>
            </div>
            
            {/* Botão apagar em lote - visível para admin */}
            {ctxCompany && selectedCompetencia && user.role === 'admin' && (
              <button
                data-testid="btn-apagar-lote"
                onClick={handleDeleteAllCompetencia}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Apagando...' : 'Apagar em Lote'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                data-testid="filter-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="validado">Validado</option>
                <option value="com_excecao">Com Exceção</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                data-testid="filter-tipo-select"
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">NF-e</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Emitente</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Valor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} data-testid={`document-row-${doc.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.numero_nfe}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getCompanyName(doc.company_id)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          doc.tipo === 'entrada' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {doc.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{doc.emitente_nome}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        R$ {doc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(doc.data_emissao).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(doc.status_validacao)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/validation?doc=${doc.id}`}
                            className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </Link>
                          {/* Botão apagar individual removido a pedido do usuário */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {!loading && filteredDocuments.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total de Documentos</p>
                <p className="text-2xl font-bold text-gray-900">{filteredDocuments.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {filteredDocuments.reduce((sum, doc) => sum + doc.valor_total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Entradas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredDocuments.filter(d => d.tipo === 'entrada').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Saídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredDocuments.filter(d => d.tipo === 'saida').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Documents;