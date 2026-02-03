import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Building2, Plus, Search, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Companies = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_estadual: '',
    endereco: '',
    cidade: '',
    uf: 'SP',
    cep: '',
    cnae_principal: '',
    cnae_principal_descricao: '',
    atividade_principal: '',
    produtos_comercializados: [],
    insumos_producao: []
  });
  const [produtoInput, setProdutoInput] = useState('');
  const [insumoInput, setInsumoInput] = useState('');

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
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId, razaoSocial) => {
    if (!window.confirm('Tem certeza que deseja excluir a empresa ' + razaoSocial + '?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(API + '/companies/' + companyId, {
        headers: { Authorization: 'Bearer ' + token }
      });
      alert('Empresa excluída com sucesso!');
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir empresa');
    }
  };

  const buscarCNPJ = async () => {
    if (!formData.cnpj || formData.cnpj.length < 14) {
      alert('Digite um CNPJ válido');
      return;
    }

    setLoadingCNPJ(true);
    try {
      const response = await axios.get(API + '/cnpj/' + formData.cnpj);
      const data = response.data;
      
      setFormData({
        ...formData,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        endereco: data.logradouro || '',
        cidade: data.municipio || '',
        uf: data.uf || 'SP',
        cnae_principal: data.cnae_principal,
        cnae_principal_descricao: data.cnae_principal_descricao
      });
      
      alert('Dados da Receita Federal carregados com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao consultar CNPJ');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(API + '/companies', formData, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setShowForm(false);
      setFormData({
        cnpj: '',
        razao_social: '',
        nome_fantasia: '',
        inscricao_estadual: '',
        endereco: '',
        cidade: '',
        uf: 'SP',
        cep: '',
        cnae_principal: '',
        cnae_principal_descricao: '',
        atividade_principal: '',
        produtos_comercializados: [],
        insumos_producao: []
      });
      fetchCompanies();
      alert('Empresa cadastrada com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar empresa');
    }
  };

  const formatCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const adicionarProduto = () => {
    if (produtoInput.trim()) {
      setFormData({
        ...formData,
        produtos_comercializados: [...formData.produtos_comercializados, produtoInput.trim()]
      });
      setProdutoInput('');
    }
  };

  const removerProduto = (index) => {
    const novosProdutos = formData.produtos_comercializados.filter((_, i) => i !== index);
    setFormData({ ...formData, produtos_comercializados: novosProdutos });
  };

  const adicionarInsumo = () => {
    if (insumoInput.trim()) {
      setFormData({
        ...formData,
        insumos_producao: [...formData.insumos_producao, insumoInput.trim()]
      });
      setInsumoInput('');
    }
  };

  const removerInsumo = (index) => {
    const novosInsumos = formData.insumos_producao.filter((_, i) => i !== index);
    setFormData({ ...formData, insumos_producao: novosInsumos });
  };

  const filteredCompanies = companies.filter(company =>
    company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj.includes(searchTerm)
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="companies-page" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Empresas</h1>
            <p className="text-gray-600">Gerencie as empresas cadastradas</p>
          </div>
          {user.role === 'admin' && (
            <button
              data-testid="add-company-button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nova Empresa
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cadastrar Nova Empresa</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-green-900">Busca Automática na Receita Federal</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ *</label>
                    <input
                      data-testid="company-cnpj-input"
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg text-lg font-semibold"
                      required
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      data-testid="buscar-cnpj-button"
                      onClick={buscarCNPJ}
                      disabled={loadingCNPJ}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-base"
                    >
                      <RefreshCw className={loadingCNPJ ? 'w-5 h-5 animate-spin' : 'w-5 h-5'} />
                      {loadingCNPJ ? 'Consultando...' : 'Buscar Receita'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-green-700 mt-2">Digite o CNPJ e clique no botão para preencher automaticamente os dados</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Razão Social *</label>
                  <input
                    data-testid="company-razao-input"
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNAE Principal</label>
                  <input
                    type="text"
                    value={formData.cnae_principal}
                    onChange={(e) => setFormData({ ...formData, cnae_principal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0000-0/00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição CNAE</label>
                  <input
                    type="text"
                    value={formData.cnae_principal_descricao}
                    onChange={(e) => setFormData({ ...formData, cnae_principal_descricao: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Produtos Comercializados (para classificação REVENDA)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={produtoInput}
                    onChange={(e) => setProdutoInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarProduto())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: Calçados, Roupas, Eletrônicos..."
                  />
                  <button
                    type="button"
                    onClick={adicionarProduto}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.produtos_comercializados.map((produto, index) => (
                    <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2">
                      {produto}
                      <button type="button" onClick={() => removerProduto(index)} className="hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insumos de Produção (para classificação INSUMO)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={insumoInput}
                    onChange={(e) => setInsumoInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarInsumo())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: Matéria-prima, Embalagens, Componentes..."
                  />
                  <button
                    type="button"
                    onClick={adicionarInsumo}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.insumos_producao.map((insumo, index) => (
                    <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2">
                      {insumo}
                      <button type="button" onClick={() => removerInsumo(index)} className="hover:text-green-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inscrição Estadual</label>
                  <input
                    type="text"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade/UF</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Cidade"
                    />
                    <input
                      type="text"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      className="w-20 px-4 py-2 border border-gray-300 rounded-lg"
                      maxLength="2"
                      placeholder="UF"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  data-testid="save-company-button"
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                >
                  Salvar Empresa
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            data-testid="search-companies-input"
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg bg-white"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                data-testid={'company-card-' + company.id}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-100 card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{company.razao_social}</h3>
                {company.nome_fantasia && (
                  <p className="text-sm text-gray-600 mb-3">{company.nome_fantasia}</p>
                )}
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">CNPJ:</span> {company.cnpj}
                  </p>
                  {company.cnae_principal && (
                    <p className="text-gray-600">
                      <span className="font-medium">CNAE:</span> {company.cnae_principal}
                    </p>
                  )}
                  {company.cidade && (
                    <p className="text-gray-600">
                      <span className="font-medium">Cidade:</span> {company.cidade}/{company.uf}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Companies;