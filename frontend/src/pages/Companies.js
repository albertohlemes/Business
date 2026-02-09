import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  Building2, Plus, Search, RefreshCw, Trash2, Edit, X, Settings, 
  Users, ChevronDown, ChevronRight, Filter, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const Companies = ({ user, onLogout }) => {
  const { refreshCompanies } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState(null);
  
  // Importação em lote
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: [] });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  const isMasterOrAdmin = user?.role === 'admin' || user?.role === 'master' || user?.role === 'super_admin';
  
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
    cnaes: [],
    atividade_principal: '',
    produtos_comercializados: [],
    insumos_producao: [],
    produtos_despesa: [],
    ativo_imobilizado: [],
    combustivel: [],
    regime_tributario: 'lucro_presumido',
    anexos_simples: [],
    tipo_atividade: 'comercio',
    tipos_servico: [],
    // Flags de contribuinte
    equiparado_industria: false,
    apura_icms: false,
    apura_icms_st: false,
    // Classificação inteligente
    classificacao_inteligente: '',
    percentual_presuncao_irpj: 8.0,
    percentual_presuncao_csll: 12.0,
    responsavel_ids: []
  };
  
  const [formData, setFormData] = useState(emptyFormData);
  const [keywordInputs, setKeywordInputs] = useState({
    produto: '', insumo: '', despesa: '', ativo: '', combustivel: '', servico: ''
  });

  useEffect(() => {
    fetchCompanies();
    if (isMasterOrAdmin) {
      fetchUsers();
    }
  }, [filterResponsavel]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/companies`;
      if (filterResponsavel) {
        url += `?responsavel_id=${filterResponsavel}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(response.data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/companies/responsaveis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const handleDelete = async (companyId, razaoSocial) => {
    if (window.confirm(`ATENÇÃO: Tem certeza que deseja excluir a empresa "${razaoSocial}"?\n\nEsta ação apagará TODOS os documentos e regras associadas.\n\nEssa ação não pode ser desfeita.`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        alert('Empresa excluída com sucesso!');
        
        const storedCompany = localStorage.getItem('selectedCompanyId');
        if (storedCompany === companyId) {
          localStorage.removeItem('selectedCompanyId');
          localStorage.removeItem('selectedCompetencia');
          refreshCompanies();
        } else {
          fetchCompanies();
        }
      } catch (err) {
        console.error('Erro ao excluir:', err);
        alert(err.response?.data?.detail || 'Erro ao excluir empresa');
      }
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
      ativo_imobilizado: company.ativo_imobilizado || [],
      combustivel: company.combustivel || [],
      anexos_simples: company.anexos_simples || [],
      tipos_servico: company.tipos_servico || [],
      responsavel_ids: company.responsavel_ids || []
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
      const response = await axios.get(`${API}/cnpj/${cnpjLimpo}`);
      const data = response.data;
      
      setFormData({
        ...formData,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        endereco: data.logradouro || '',
        cidade: data.municipio || '',
        uf: data.uf || 'SP',
        cnae_principal: data.cnae_principal || '',
        cnae_principal_descricao: data.cnae_principal_descricao || ''
      });
      
      alert('✓ Dados carregados da Receita Federal!');
    } catch (err) {
      console.error('Erro ao buscar CNPJ:', err);
      alert(err.response?.data?.detail || 'Erro ao consultar CNPJ');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      if (editingCompany) {
        await axios.put(`${API}/companies/${editingCompany.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Empresa atualizada com sucesso!');
      } else {
        await axios.post(`${API}/companies`, formData, {
          headers: { Authorization: `Bearer ${token}` }
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

  // Keyword handlers
  const addKeyword = (field, inputKey) => {
    const value = keywordInputs[inputKey]?.trim();
    if (value && !formData[field].includes(value)) {
      setFormData({ ...formData, [field]: [...formData[field], value] });
      setKeywordInputs({ ...keywordInputs, [inputKey]: '' });
    }
  };

  const removeKeyword = (field, index) => {
    setFormData({ ...formData, [field]: formData[field].filter((_, i) => i !== index) });
  };

  const toggleResponsavel = (userId) => {
    const current = formData.responsavel_ids || [];
    if (current.includes(userId)) {
      setFormData({ ...formData, responsavel_ids: current.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, responsavel_ids: [...current, userId] });
    }
  };

  const getRegimeLabel = (regime) => {
    if (regime === 'lucro_real') return 'Lucro Real';
    if (regime === 'lucro_presumido') return 'Lucro Presumido';
    return 'Simples Nacional';
  };

  const getRegimeBadgeClass = (regime) => {
    if (regime === 'lucro_real') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (regime === 'lucro_presumido') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  };

  // ========== IMPORTAÇÃO EM LOTE ==========
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target.result, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        // Mapear colunas
        const mappedData = data.map((row, idx) => ({
          _index: idx + 1,
          cnpj: String(row['CNPJ'] || row['cnpj'] || '').replace(/\D/g, ''),
          codigo_empresa: String(row['Código'] || row['codigo'] || row['ID'] || ''),
          razao_social: row['Razão Social'] || row['razao_social'] || row['Empresa'] || '',
          nome_fantasia: row['Nome Fantasia'] || row['nome_fantasia'] || '',
          inscricao_estadual: row['IE'] || row['inscricao_estadual'] || '',
          cidade: row['Cidade'] || row['cidade'] || '',
          uf: row['UF'] || row['uf'] || 'SP',
          regime_tributario: (row['Regime'] || row['regime_tributario'] || 'lucro_presumido').toLowerCase().includes('real') 
            ? 'lucro_real' 
            : (row['Regime'] || '').toLowerCase().includes('simples') 
              ? 'simples_nacional' 
              : 'lucro_presumido',
          tipo_atividade: (row['Atividade'] || row['tipo_atividade'] || 'comercio').toLowerCase().includes('ind') 
            ? 'industria' 
            : (row['Atividade'] || '').toLowerCase().includes('serv') 
              ? 'servicos' 
              : 'comercio',
          _valid: true,
          _error: ''
        }));
        
        // Validar
        mappedData.forEach(row => {
          if (!row.cnpj || row.cnpj.length !== 14) {
            row._valid = false;
            row._error = 'CNPJ inválido';
          } else if (!row.razao_social) {
            row._valid = false;
            row._error = 'Razão Social obrigatória';
          }
        });
        
        setImportData(mappedData);
        setShowImportModal(true);
      } catch (err) {
        console.error('Erro ao ler arquivo:', err);
        alert('Erro ao ler arquivo. Certifique-se que é um arquivo Excel válido.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Código': '001',
        'CNPJ': '00.000.000/0001-00',
        'Razão Social': 'Empresa Exemplo Ltda',
        'Nome Fantasia': 'Exemplo',
        'IE': '123456789',
        'Cidade': 'São Paulo',
        'UF': 'SP',
        'Regime': 'Lucro Presumido',
        'Atividade': 'Comércio'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    XLSX.writeFile(wb, 'modelo_importacao_empresas.xlsx');
  };

  const executeImport = async () => {
    const validRows = importData.filter(r => r._valid);
    if (validRows.length === 0) {
      alert('Nenhuma empresa válida para importar');
      return;
    }
    
    setImporting(true);
    setImportProgress({ current: 0, total: validRows.length, errors: [] });
    
    const token = localStorage.getItem('token');
    const errors = [];
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await axios.post(`${API}/companies`, {
          cnpj: row.cnpj.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
          codigo_empresa: row.codigo_empresa,
          razao_social: row.razao_social,
          nome_fantasia: row.nome_fantasia,
          inscricao_estadual: row.inscricao_estadual,
          cidade: row.cidade,
          uf: row.uf,
          regime_tributario: row.regime_tributario,
          tipo_atividade: row.tipo_atividade,
          responsavel_ids: []
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        errors.push({
          row: row._index,
          empresa: row.razao_social,
          error: err.response?.data?.detail || 'Erro desconhecido'
        });
      }
      setImportProgress({ current: i + 1, total: validRows.length, errors });
    }
    
    setImporting(false);
    
    if (errors.length === 0) {
      alert(`✓ ${validRows.length} empresa(s) importada(s) com sucesso!`);
      setShowImportModal(false);
      setImportData([]);
      fetchCompanies();
      refreshCompanies();
    } else {
      alert(`Importação concluída com ${errors.length} erro(s). Verifique o relatório.`);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.cnpj?.includes(searchTerm) ||
    company.codigo_empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="companies-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Empresas
            </h1>
            <p className="text-[#A1A1AA] text-sm">
              {companies.length} empresa(s) cadastrada(s)
            </p>
          </div>
          {isMasterOrAdmin && (
            <div className="flex items-center gap-2">
              {/* Botão Importar em Lote */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                data-testid="import-companies-button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2A2A2A] text-white rounded font-medium hover:bg-[#333333] border border-[#333333] transition-all"
              >
                <Upload className="w-5 h-5" />
                Importar
              </button>
              {/* Botão Nova Empresa */}
              <button
                data-testid="add-company-button"
                onClick={handleNewCompany}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nova Empresa
            </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#A1A1AA]" />
            <input
              data-testid="search-companies-input"
              type="text"
              placeholder="Buscar por nome, CNPJ ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
            />
          </div>
          {isMasterOrAdmin && allUsers.length > 0 && (
            <select
              value={filterResponsavel}
              onChange={(e) => setFilterResponsavel(e.target.value)}
              className="px-4 py-2.5 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
            >
              <option value="">Todos os responsáveis</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Companies List */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin mx-auto" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 bg-[#141414] rounded border border-[#2A2A2A]">
            <Building2 className="w-12 h-12 text-[#A1A1AA] mx-auto mb-3" />
            <p className="text-[#A1A1AA]">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="bg-[#141414] rounded border border-[#2A2A2A] overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-[#0C0C0C] border-b border-[#2A2A2A] text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
              <div className="col-span-1">Código</div>
              <div className="col-span-4">Empresa</div>
              <div className="col-span-2">CNPJ</div>
              <div className="col-span-2">Regime</div>
              <div className="col-span-2">Responsáveis</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>
            
            {/* Company Rows */}
            <div className="divide-y divide-[#2A2A2A]">
              {filteredCompanies.map((company) => (
                <div 
                  key={company.id}
                  data-testid={`company-row-${company.id}`}
                  className="hover:bg-white/5 transition-colors"
                >
                  {/* Main Row */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                    {/* Código */}
                    <div className="col-span-12 md:col-span-1 flex items-center gap-2">
                      <button 
                        onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                        className="p-1 text-[#A1A1AA] hover:text-white md:hidden"
                      >
                        {expandedCompany === company.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      {company.codigo_empresa ? (
                        <span className="px-2 py-1 bg-[#C8A951]/10 text-[#C8A951] rounded text-xs font-semibold">
                          #{company.codigo_empresa}
                        </span>
                      ) : (
                        <span className="text-[#A1A1AA] text-xs">—</span>
                      )}
                    </div>
                    
                    {/* Empresa */}
                    <div className="col-span-12 md:col-span-4">
                      <p className="font-medium text-white truncate">{company.razao_social}</p>
                      {company.nome_fantasia && (
                        <p className="text-xs text-[#A1A1AA] truncate">{company.nome_fantasia}</p>
                      )}
                    </div>
                    
                    {/* CNPJ */}
                    <div className="hidden md:block col-span-2 text-[#A1A1AA] text-sm font-mono">
                      {company.cnpj}
                    </div>
                    
                    {/* Regime */}
                    <div className="hidden md:block col-span-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getRegimeBadgeClass(company.regime_tributario)}`}>
                        {getRegimeLabel(company.regime_tributario)}
                      </span>
                    </div>
                    
                    {/* Responsáveis */}
                    <div className="hidden md:block col-span-2">
                      {(company.responsavel_ids || []).length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-[#A1A1AA]" />
                          <span className="text-sm text-[#A1A1AA]">
                            {company.responsavel_ids.length}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#A1A1AA]">—</span>
                      )}
                    </div>
                    
                    {/* Ações */}
                    <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-1">
                      {isMasterOrAdmin && (
                        <>
                          <button
                            data-testid={`edit-company-btn-${company.id}`}
                            onClick={() => handleEdit(company)}
                            className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            data-testid={`delete-company-btn-${company.id}`}
                            onClick={() => handleDelete(company.id, company.razao_social)}
                            className="p-2 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Mobile Expanded Info */}
                  {expandedCompany === company.id && (
                    <div className="md:hidden px-4 pb-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">CNPJ:</span>
                        <span className="text-white font-mono">{company.cnpj}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#A1A1AA]">Regime:</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRegimeBadgeClass(company.regime_tributario)}`}>
                          {getRegimeLabel(company.regime_tributario)}
                        </span>
                      </div>
                      {company.cidade && (
                        <div className="flex justify-between">
                          <span className="text-[#A1A1AA]">Cidade:</span>
                          <span className="text-white">{company.cidade}/{company.uf}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] sticky top-0 bg-[#141414]">
                <h2 className="text-lg font-medium text-white">
                  {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                </h2>
                <button onClick={handleCancelForm} className="p-1 text-[#A1A1AA] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Código da Empresa */}
                <div className="bg-[#C8A951]/5 border border-[#C8A951]/20 rounded p-4">
                  <label className="block text-sm font-medium text-[#C8A951] mb-2">Código/ID da Empresa</label>
                  <input
                    data-testid="company-codigo-input"
                    type="text"
                    value={formData.codigo_empresa}
                    onChange={(e) => setFormData({ ...formData, codigo_empresa: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    placeholder="Ex: 001, CLI-2024"
                  />
                  <p className="text-xs text-[#A1A1AA] mt-1">Identificador interno para facilitar a busca</p>
                </div>

                {/* CNPJ */}
                {!editingCompany ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Busca Automática na Receita Federal</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        data-testid="company-cnpj-input"
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                        className="flex-1 px-4 py-2 bg-[#0C0C0C] border border-emerald-500/30 rounded text-white placeholder:text-white/20 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        required
                        placeholder="00.000.000/0000-00"
                      />
                      <button
                        type="button"
                        data-testid="buscar-cnpj-button"
                        onClick={buscarCNPJ}
                        disabled={loadingCNPJ}
                        className="px-4 py-2 bg-emerald-500 text-white rounded font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={loadingCNPJ ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                        Buscar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                    <label className="block text-xs text-[#A1A1AA] mb-1">CNPJ</label>
                    <p className="text-white font-mono">{formData.cnpj}</p>
                  </div>
                )}

                {/* Nome */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Razão Social *</label>
                    <input
                      data-testid="company-razao-input"
                      type="text"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-2">Nome Fantasia</label>
                    <input
                      type="text"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    />
                  </div>
                </div>

                {/* Regime Tributário */}
                <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-[#C8A951]" />
                    <span className="text-sm font-medium text-white">Regime Tributário</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Regime</label>
                      <select
                        value={formData.regime_tributario}
                        onChange={(e) => setFormData({ ...formData, regime_tributario: e.target.value })}
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      >
                        <option value="simples_nacional">Simples Nacional</option>
                        <option value="lucro_presumido">Lucro Presumido</option>
                        <option value="lucro_real">Lucro Real</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Tipo de Atividade</label>
                      <select
                        value={formData.tipo_atividade}
                        onChange={(e) => setFormData({ ...formData, tipo_atividade: e.target.value })}
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      >
                        <option value="comercio">Comércio</option>
                        <option value="industria">Indústria</option>
                        <option value="servicos">Serviços</option>
                        <option value="mista">Mista</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Responsáveis */}
                {allUsers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA] mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Usuários Responsáveis
                    </label>
                    <div className="max-h-32 overflow-y-auto bg-[#0C0C0C] border border-[#2A2A2A] rounded p-2 space-y-1">
                      {allUsers.map(u => (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.responsavel_ids?.includes(u.id)}
                            onChange={() => toggleResponsavel(u.id)}
                            className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
                          />
                          <span className="text-sm text-white">{u.name}</span>
                          <span className="text-xs text-[#A1A1AA]">({u.email})</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-1">Usuários operacionais só verão empresas das quais são responsáveis</p>
                  </div>
                )}

                {/* Localização */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-[#A1A1AA] mb-2">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-2">UF</label>
                    <input
                      type="text"
                      value={formData.uf}
                      onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                      maxLength="2"
                      className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-2">IE</label>
                    <input
                      type="text"
                      value={formData.inscricao_estadual}
                      onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                  <button
                    data-testid="save-company-button"
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] transition-all"
                  >
                    {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-4 py-2.5 bg-[#2A2A2A] text-white rounded font-medium hover:bg-[#333333] transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Importação em Lote */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-[#C8A951]" />
                  <div>
                    <h2 className="text-lg font-medium text-white">Importação em Lote</h2>
                    <p className="text-xs text-[#A1A1AA]">{importData.length} empresa(s) encontrada(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#2A2A2A] text-white rounded text-sm hover:bg-[#333333] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Modelo
                  </button>
                  <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="p-1 text-[#A1A1AA] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Preview da Tabela */}
              <div className="max-h-[50vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0C0C0C] sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase">Código</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase">CNPJ</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase">Razão Social</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase">Regime</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase">UF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {importData.map((row, idx) => (
                      <tr key={idx} className={row._valid ? 'hover:bg-white/5' : 'bg-red-500/10'}>
                        <td className="px-4 py-2">
                          {row._valid ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="text-xs text-red-400">{row._error}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-white">{row.codigo_empresa || '-'}</td>
                        <td className="px-4 py-2 text-white font-mono text-xs">{row.cnpj}</td>
                        <td className="px-4 py-2 text-white">{row.razao_social}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs rounded border ${getRegimeBadgeClass(row.regime_tributario)}`}>
                            {getRegimeLabel(row.regime_tributario)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[#A1A1AA]">{row.uf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Progress */}
              {importing && (
                <div className="p-4 border-t border-[#2A2A2A] bg-[#0C0C0C]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white">Importando...</span>
                    <span className="text-sm text-[#C8A951]">{importProgress.current} / {importProgress.total}</span>
                  </div>
                  <div className="h-2 bg-[#2A2A2A] rounded overflow-hidden">
                    <div 
                      className="h-full bg-[#C8A951] transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                  {importProgress.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-400">
                      {importProgress.errors.length} erro(s) encontrado(s)
                    </div>
                  )}
                </div>
              )}
              
              {/* Erros */}
              {!importing && importProgress.errors.length > 0 && (
                <div className="p-4 border-t border-[#2A2A2A] bg-red-500/5">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Erros na importação:</h4>
                  <div className="max-h-32 overflow-auto space-y-1">
                    {importProgress.errors.map((err, idx) => (
                      <div key={idx} className="text-xs text-red-400">
                        Linha {err.row} ({err.empresa}): {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center justify-between p-4 border-t border-[#2A2A2A]">
                <div className="text-sm text-[#A1A1AA]">
                  <span className="text-emerald-400 font-medium">{importData.filter(r => r._valid).length}</span> válida(s), 
                  <span className="text-red-400 font-medium ml-1">{importData.filter(r => !r._valid).length}</span> inválida(s)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowImportModal(false); setImportData([]); }}
                    className="px-4 py-2 bg-[#2A2A2A] text-white rounded font-medium hover:bg-[#333333] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={executeImport}
                    disabled={importing || importData.filter(r => r._valid).length === 0}
                    className="px-6 py-2 bg-[#C8A951] text-black rounded font-medium hover:bg-[#B09240] disabled:opacity-50 transition-all"
                  >
                    {importing ? 'Importando...' : `Importar ${importData.filter(r => r._valid).length} Empresa(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Companies;
