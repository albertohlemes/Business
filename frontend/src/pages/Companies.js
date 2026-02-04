import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Building2, Plus, Search, RefreshCw, Trash2, Edit, X, Settings } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Companies = ({ user, onLogout }) => {
  const { refreshCompanies } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null); // null = novo, objeto = edição
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  
  const emptyFormData = {
    cnpj: '',
    codigo_empresa: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    endereco: '',
    cidade: '',
    uf: 'SP',
    cep: '',
    cnae_principal: '',
    cnae_principal_descricao: '',
    atividade_principal: '',
    produtos_comercializados: [],
    insumos_producao: [],
    produtos_despesa: [],
    regime_tributario: 'lucro_presumido',
    anexos_simples: [],
    tipo_atividade: 'comercio',
    tipos_servico: [],
    percentual_presuncao_irpj: 8.0,
    percentual_presuncao_csll: 12.0,
    estoque_inicial: 0,
    estoque_final: 0
  };
  
  const [formData, setFormData] = useState(emptyFormData);
  const [produtoInput, setProdutoInput] = useState('');
  const [insumoInput, setInsumoInput] = useState('');
  const [despesaInput, setDespesaInput] = useState('');
  const [servicoInput, setServicoInput] = useState('');

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
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja excluir a empresa "${razaoSocial}"?\n\nEsta ação apagará TODOS os documentos e regras associadas a esta empresa.\n\nEssa ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Empresa excluída com sucesso!');
      
      // Se a empresa excluída for a selecionada no contexto, limpar a seleção
      const storedCompany = localStorage.getItem('selectedCompanyId');
      if (storedCompany === companyId) {
        localStorage.removeItem('selectedCompanyId');
        localStorage.removeItem('selectedCompetencia');
        refreshCompanies(); // Isso deve forçar o contexto a atualizar
      } else {
        fetchCompanies(); // Apenas atualiza a lista local
      }
      
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir empresa');
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      ...emptyFormData,
      ...company,
      codigo_empresa: company.codigo_empresa || '',
      produtos_comercializados: company.produtos_comercializados || [],
      insumos_producao: company.insumos_producao || [],
      produtos_despesa: company.produtos_despesa || [],
      anexos_simples: company.anexos_simples || [],
      tipos_servico: company.tipos_servico || []
    });
    setShowForm(true);
  };

  const handleNewCompany = () => {
    setEditingCompany(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCompany(null);
    setFormData(emptyFormData);
  };

  const buscarCNPJ = async () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    
    if (!cnpjLimpo || cnpjLimpo.length !== 14) {
      alert('Digite um CNPJ válido com 14 dígitos');
      return;
    }

    setLoadingCNPJ(true);
    try {
      console.log('Buscando CNPJ:', cnpjLimpo);
      const response = await axios.get(API + '/cnpj/' + cnpjLimpo);
      const data = response.data;
      
      console.log('Dados recebidos:', data);
      
      setFormData({
        ...formData,
        cnpj: formData.cnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        endereco: data.logradouro || '',
        cidade: data.municipio || '',
        uf: data.uf || 'SP',
        cnae_principal: data.cnae_principal || '',
        cnae_principal_descricao: data.cnae_principal_descricao || ''
      });
      
      alert('✓ Dados da Receita Federal carregados com sucesso!');
    } catch (err) {
      console.error('Erro ao buscar CNPJ:', err);
      alert(err.response?.data?.detail || 'Erro ao consultar CNPJ na Receita Federal. Verifique se o CNPJ está correto.');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingCompany) {
        // Atualizar empresa existente
        await axios.put(API + '/companies/' + editingCompany.id, formData, {
          headers: { Authorization: 'Bearer ' + token }
        });
        alert('Empresa atualizada com sucesso!');
      } else {
        // Criar nova empresa
        await axios.post(API + '/companies', formData, {
          headers: { Authorization: 'Bearer ' + token }
        });
        alert('Empresa cadastrada com sucesso!');
      }
      
      setShowForm(false);
      setEditingCompany(null);
      setFormData(emptyFormData);
      fetchCompanies();
      refreshCompanies();
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      // Extrair mensagem de erro detalhada se disponível (ex: validação Pydantic)
      let msg = 'Erro ao salvar empresa';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          msg = err.response.data.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('\n');
        } else {
          msg = err.response.data.detail;
        }
      }
      alert(msg);
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

  // Atualizar presunção baseado na atividade
  const atualizarPresuncao = (atividade) => {
    let irpj = 8.0;
    let csll = 12.0;
    
    if (atividade === 'servicos') {
      irpj = 32.0;
      csll = 32.0;
    } else if (atividade === 'industria') {
      irpj = 8.0;
      csll = 12.0;
    } else if (atividade === 'mista') {
      irpj = 16.0; // Média entre comércio e serviços
      csll = 20.0;
    }
    
    setFormData({
      ...formData,
      tipo_atividade: atividade,
      percentual_presuncao_irpj: irpj,
      percentual_presuncao_csll: csll
    });
  };

  const toggleAnexoSimples = (anexo) => {
    const anexos = formData.anexos_simples.includes(anexo)
      ? formData.anexos_simples.filter(a => a !== anexo)
      : [...formData.anexos_simples, anexo];
    setFormData({ ...formData, anexos_simples: anexos });
  };

  const adicionarServico = () => {
    if (servicoInput.trim()) {
      setFormData({
        ...formData,
        tipos_servico: [...formData.tipos_servico, servicoInput.trim()]
      });
      setServicoInput('');
    }
  };

  const removerServico = (index) => {
    const novosServicos = formData.tipos_servico.filter((_, i) => i !== index);
    setFormData({ ...formData, tipos_servico: novosServicos });
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

  const adicionarDespesa = () => {
    if (despesaInput.trim()) {
      setFormData({
        ...formData,
        produtos_despesa: [...formData.produtos_despesa, despesaInput.trim()]
      });
      setDespesaInput('');
    }
  };

  const removerDespesa = (index) => {
    const novasDespesas = formData.produtos_despesa.filter((_, i) => i !== index);
    setFormData({ ...formData, produtos_despesa: novasDespesas });
  };

  const filteredCompanies = companies.filter(company =>
    company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj.includes(searchTerm) ||
    (company.codigo_empresa && company.codigo_empresa.toLowerCase().includes(searchTerm.toLowerCase()))
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
              onClick={handleNewCompany}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nova Empresa
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
              </h2>
              <button
                type="button"
                onClick={handleCancelForm}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo ID da Empresa */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <label className="block text-sm font-medium text-blue-800 mb-2">Código/ID da Empresa (opcional)</label>
                <input
                  data-testid="company-codigo-input"
                  type="text"
                  value={formData.codigo_empresa}
                  onChange={(e) => setFormData({ ...formData, codigo_empresa: e.target.value })}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg"
                  placeholder="Ex: 001, CLI-2024, etc."
                />
                <p className="text-xs text-blue-600 mt-1">Use para identificar a empresa no sistema (aparece ao lado do nome)</p>
              </div>
              
              {!editingCompany && (
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
              )}
              
              {editingCompany && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
                  <p className="text-lg font-mono text-gray-800">{formData.cnpj}</p>
                  <p className="text-xs text-gray-500 mt-1">O CNPJ não pode ser alterado</p>
                </div>
              )}

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

              {/* REGIME TRIBUTÁRIO */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Regime Tributário
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Regime *</label>
                    <select
                      value={formData.regime_tributario}
                      onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Atividade *</label>
                    <select
                      value={formData.tipo_atividade}
                      onChange={(e) => atualizarPresuncao(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="comercio">Comércio</option>
                      <option value="industria">Indústria</option>
                      <option value="servicos">Serviços</option>
                      <option value="mista">Mista (Comércio + Serviços)</option>
                    </select>
                  </div>
                </div>

                {/* Anexos do Simples Nacional */}
                {formData.regime_tributario === 'simples_nacional' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Anexos do Simples Nacional</label>
                    <div className="flex flex-wrap gap-2">
                      {['I', 'II', 'III', 'IV', 'V'].map((anexo) => (
                        <button
                          key={anexo}
                          type="button"
                          onClick={() => toggleAnexoSimples(anexo)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            formData.anexos_simples.includes(anexo)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Anexo {anexo}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">I=Comércio, II=Indústria, III=Serviços, IV=Serviços específicos, V=Serviços profissionais</p>
                  </div>
                )}

                {/* Presunção do Lucro Presumido */}
                {formData.regime_tributario === 'lucro_presumido' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Presunção IRPJ (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.percentual_presuncao_irpj}
                        onChange={(e) => setFormData({ ...formData, percentual_presuncao_irpj: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comércio: 8% | Serviços: 32%</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Presunção CSLL (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.percentual_presuncao_csll}
                        onChange={(e) => setFormData({ ...formData, percentual_presuncao_csll: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Comércio: 12% | Serviços: 32%</p>
                    </div>
                  </div>
                )}

                {/* Estoque para Lucro Real */}
                {formData.regime_tributario === 'lucro_real' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estoque Inicial (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.estoque_inicial}
                        onChange={(e) => setFormData({ ...formData, estoque_inicial: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estoque Final (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.estoque_final}
                        onChange={(e) => setFormData({ ...formData, estoque_final: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Tipos de Serviço */}
                {(formData.tipo_atividade === 'servicos' || formData.tipo_atividade === 'mista') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipos de Serviço Prestados</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={servicoInput}
                        onChange={(e) => setServicoInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarServico())}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Ex: Transporte, Consultoria, TI..."
                      />
                      <button
                        type="button"
                        onClick={adicionarServico}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Adicionar
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tipos_servico.map((servico, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                          {servico}
                          <button type="button" onClick={() => removerServico(index)} className="hover:text-blue-600">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Produtos de Despesa (sempre classificados como DESPESA)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={despesaInput}
                    onChange={(e) => setDespesaInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarDespesa())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: Material de Limpeza, Escritório, Combustível..."
                  />
                  <button
                    type="button"
                    onClick={adicionarDespesa}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.produtos_despesa.map((despesa, index) => (
                    <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center gap-2">
                      {despesa}
                      <button type="button" onClick={() => removerDespesa(index)} className="hover:text-orange-600">×</button>
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
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-red-600" />
                    </div>
                    {company.codigo_empresa && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-bold">
                        #{company.codigo_empresa}
                      </span>
                    )}
                  </div>
                  {user.role === 'admin' && (
                    <div className="flex gap-1">
                      <button
                        data-testid={'edit-company-btn-' + company.id}
                        onClick={() => handleEdit(company)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar empresa"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {/* Botão excluir removido a pedido do usuário */}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{company.razao_social}</h3>
                {company.nome_fantasia && (
                  <p className="text-sm text-gray-600 mb-3">{company.nome_fantasia}</p>
                )}
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">CNPJ:</span> {company.cnpj}
                  </p>
                  {company.regime_tributario && (
                    <p className="text-gray-600">
                      <span className="font-medium">Regime:</span>{' '}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        company.regime_tributario === 'lucro_real' ? 'bg-green-100 text-green-800' :
                        company.regime_tributario === 'lucro_presumido' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {company.regime_tributario === 'lucro_real' ? 'Lucro Real' :
                         company.regime_tributario === 'lucro_presumido' ? 'Lucro Presumido' :
                         'Simples Nacional'}
                      </span>
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