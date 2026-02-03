import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FileText, Eye, Filter, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Documents = ({ user, onLogout }) => {
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [companiesRes, documentsRes] = await Promise.all([
        axios.get(`${API}/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/xml/documents${selectedCompany ? `?company_id=${selectedCompany}` : ''}`, {
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
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
              <select
                data-testid="filter-company-select"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.razao_social}
                  </option>
                ))}
              </select>
            </div>
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
                        <Link
                          to={`/validation?doc=${doc.id}`}
                          className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Link>
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
                <p className="text-gray-600 text-sm mb-1">Produtos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredDocuments.reduce((sum, doc) => sum + doc.produtos.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Validados</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredDocuments.filter(d => d.status_validacao === 'validado').length}
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