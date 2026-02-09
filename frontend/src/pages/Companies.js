import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import CoffeeProgress from '../components/CoffeeProgress';
import { 
  Building2, Plus, Search, RefreshCw, Trash2, Edit, X, Settings, 
  Users, ChevronDown, ChevronRight, Filter, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Shield, Eye, EyeOff
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
    anexos_confirmados: false,
    controla_fator_r: false,
    folha_pagamento_12m: 0,
    tipo_atividade: 'comercio',
    tipos_servico: [],
    // Perfis comerciais (múltipla escolha)
    perfis_comerciais: ['varejo'],  // industria, distribuidor, varejo
    // Flags de contribuinte
    equiparado_industria: false,
    apura_icms: false,
    apura_icms_st: false,
    // Flags de desconsiderar ICMS
    desconsiderar_icms_despesas: false,
    desconsiderar_icms_st: false,
    // Classificação inteligente
    classificacao_inteligente: '',
    // Presunção geral (para atividade única)
    percentual_presuncao_irpj: 8.0,
    percentual_presuncao_csll: 12.0,
    // Presunção por atividade (para atividade mista)
    percentual_presuncao_irpj_comercio: 8.0,
    percentual_presuncao_csll_comercio: 12.0,
    percentual_presuncao_irpj_servico: 32.0,
    percentual_presuncao_csll_servico: 32.0,
    percentual_presuncao_irpj_industria: 8.0,
    percentual_presuncao_csll_industria: 12.0,
    responsavel_ids: [],
    // Certificado Digital
    certificado_digital_arquivo: '',
    certificado_digital_senha: '',
    certificado_digital_validade: ''
  };
  
  const [formData, setFormData] = useState(emptyFormData);
  const [keywordInputs, setKeywordInputs] = useState({
    produto: '', insumo: '', despesa: '', ativo: '', combustivel: '', servico: '', cnae: ''
  });
  const [showCertificadoSenha, setShowCertificadoSenha] = useState(false);
  
  // Estado para anexos do Simples Nacional
  const [anexosSugeridos, setAnexosSugeridos] = useState([]);
  const [showAnexoConfirmModal, setShowAnexoConfirmModal] = useState(false);
  const [anexoParaAlterar, setAnexoParaAlterar] = useState(null);

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
      cnae_principal: company.cnae_principal || '',
      cnae_principal_descricao: company.cnae_principal_descricao || '',
      cnaes: company.cnaes || [],
      produtos_comercializados: company.produtos_comercializados || [],
      insumos_producao: company.insumos_producao || [],
      produtos_despesa: company.produtos_despesa || [],
      ativo_imobilizado: company.ativo_imobilizado || [],
      combustivel: company.combustivel || [],
      anexos_simples: company.anexos_simples || [],
      anexos_confirmados: company.anexos_confirmados || false,
      controla_fator_r: company.controla_fator_r || false,
      folha_pagamento_12m: company.folha_pagamento_12m || 0,
      tipos_servico: company.tipos_servico || [],
      // Flags de contribuinte
      equiparado_industria: company.equiparado_industria || false,
      apura_icms: company.apura_icms || false,
      apura_icms_st: company.apura_icms_st || false,
      // Flags de desconsiderar ICMS
      desconsiderar_icms_despesas: company.desconsiderar_icms_despesas || false,
      desconsiderar_icms_st: company.desconsiderar_icms_st || false,
      // Classificação inteligente
      classificacao_inteligente: company.classificacao_inteligente || '',
      // Presunção por atividade
      percentual_presuncao_irpj_comercio: company.percentual_presuncao_irpj_comercio ?? 8.0,
      percentual_presuncao_csll_comercio: company.percentual_presuncao_csll_comercio ?? 12.0,
      percentual_presuncao_irpj_servico: company.percentual_presuncao_irpj_servico ?? 32.0,
      percentual_presuncao_csll_servico: company.percentual_presuncao_csll_servico ?? 32.0,
      percentual_presuncao_irpj_industria: company.percentual_presuncao_irpj_industria ?? 8.0,
      percentual_presuncao_csll_industria: company.percentual_presuncao_csll_industria ?? 12.0,
      responsavel_ids: company.responsavel_ids || [],
      // Certificado Digital
      certificado_digital_arquivo: company.certificado_digital_arquivo || '',
      certificado_digital_senha: company.certificado_digital_senha || '',
      certificado_digital_validade: company.certificado_digital_validade || ''
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
    setAnexosSugeridos([]);
  };

  // Função para sugerir anexos do Simples com base nos CNAEs
  const sugerirAnexosPorCnaes = (cnaes) => {
    const todosAnexos = new Set();
    
    cnaes.forEach(cnae => {
      const codigo = cnae?.toString().replace(/\D/g, '').substring(0, 2) || '';
      
      // Divisões de atividades - mapeamento simplificado
      const divisaoComercio = ['45', '46', '47']; // Comércio
      const divisaoIndustria = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33']; // Indústria
      const divisaoServicosFatorR = ['62', '63', '69', '70', '71', '72', '73', '74', '75', '85', '86', '87', '88']; // Serviços - Fator R (V ou III)
      const divisaoServicosIII = ['55', '56', '58', '59', '60', '61', '64', '65', '66', '68', '77', '79', '80', '81', '82', '90', '91', '92', '93', '94', '95', '96']; // Serviços - Anexo III
      const divisaoServicosIV = ['41', '42', '43']; // Construção - Anexo IV
      
      if (divisaoComercio.includes(codigo)) todosAnexos.add('I');
      if (divisaoIndustria.includes(codigo)) todosAnexos.add('II');
      if (divisaoServicosIII.includes(codigo)) todosAnexos.add('III');
      if (divisaoServicosIV.includes(codigo)) todosAnexos.add('IV');
      if (divisaoServicosFatorR.includes(codigo)) todosAnexos.add('V');
    });
    
    // Se nenhum anexo foi identificado, assume Anexo I (Comércio)
    if (todosAnexos.size === 0) todosAnexos.add('I');
    
    return Array.from(todosAnexos).sort();
  };

  // Descrições dos anexos
  const descricaoAnexos = {
    'I': 'Comércio - Revenda de mercadorias',
    'II': 'Indústria - Produção/transformação',
    'III': 'Serviços com CPP na guia',
    'IV': 'Construção, vigilância, limpeza (sem CPP)',
    'V': 'Serviços intelectuais, técnicos (Fator R)'
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
      
      // Combinar CNAE principal com secundários
      const todosOsCnaes = [data.cnae_principal, ...(data.cnaes_secundarios || [])].filter(Boolean);
      
      // Sugerir anexos automaticamente
      const anexos = sugerirAnexosPorCnaes(todosOsCnaes);
      setAnexosSugeridos(anexos);
      
      setFormData({
        ...formData,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cep: data.cep || '',
        endereco: data.logradouro || '',
        cidade: data.municipio || '',
        uf: data.uf || 'SP',
        cnae_principal: data.cnae_principal || '',
        cnae_principal_descricao: data.cnae_principal_descricao || '',
        cnaes: data.cnaes_secundarios || [],
        anexos_simples: anexos, // Preenche automaticamente
        anexos_confirmados: false // Marca como não confirmado
      });
      
      const qtdCnaes = data.cnaes_secundarios?.length || 0;
      alert(`✓ Dados carregados da Receita Federal!\n${qtdCnaes > 0 ? `${qtdCnaes} CNAEs secundários importados.` : ''}\n\nAnexos sugeridos: ${anexos.join(', ')}`);
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Regime *</label>
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
                      <label className="block text-xs text-[#A1A1AA] mb-2">Tipo de Atividade *</label>
                      <select
                        value={formData.tipo_atividade}
                        onChange={(e) => setFormData({ ...formData, tipo_atividade: e.target.value })}
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      >
                        <option value="comercio">Comércio</option>
                        <option value="industria">Indústria</option>
                        <option value="servicos">Serviços</option>
                        <option value="mista">Mista (Comércio + Serviços)</option>
                      </select>
                    </div>
                  </div>

                  {/* Perfis Comerciais - apenas para Comércio, Indústria ou Mista */}
                  {(formData.tipo_atividade === 'comercio' || formData.tipo_atividade === 'industria' || formData.tipo_atividade === 'mista') && (
                    <div className="pt-4 border-t border-[#2A2A2A]">
                      <label className="block text-xs text-[#A1A1AA] mb-3">Perfis de Atividade Comercial (pode selecionar múltiplos)</label>
                      <div className="flex flex-wrap gap-4">
                        {[
                          { key: 'industria', label: 'Indústria', desc: 'Fabricante (alíquotas concentradas PIS/COFINS)' },
                          { key: 'distribuidor', label: 'Distribuidor/Atacadista', desc: 'Alíquotas diferenciadas monofásicos' },
                          { key: 'varejo', label: 'Varejo', desc: 'Alíquota zero para revendedor final' }
                        ].map(perfil => (
                          <label
                            key={perfil.key}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              formData.perfis_comerciais?.includes(perfil.key)
                                ? 'bg-[#C8A951]/10 border-[#C8A951]'
                                : 'bg-[#141414] border-[#2A2A2A] hover:border-[#444]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.perfis_comerciais?.includes(perfil.key) || false}
                              onChange={(e) => {
                                const current = formData.perfis_comerciais || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, perfis_comerciais: [...current, perfil.key] });
                                } else {
                                  setFormData({ ...formData, perfis_comerciais: current.filter(p => p !== perfil.key) });
                                }
                              }}
                              className="mt-1 w-4 h-4 text-[#C8A951] bg-[#141414] border-[#2A2A2A] rounded focus:ring-[#C8A951] focus:ring-2"
                            />
                            <div>
                              <span className="text-white font-medium">{perfil.label}</span>
                              <p className="text-xs text-[#666] mt-0.5">{perfil.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-[#666] mt-2">
                        * Perfis afetam alíquotas de PIS/COFINS em produtos monofásicos e com tributação diferenciada
                      </p>
                    </div>
                  )}
                  
                  {/* Presunção - apenas para Lucro Presumido */}
                  {formData.regime_tributario === 'lucro_presumido' && (
                    <div className="pt-4 border-t border-[#2A2A2A]">
                      {/* Atividade única (não mista) */}
                      {formData.tipo_atividade !== 'mista' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-[#A1A1AA] mb-2">Presunção IRPJ (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.percentual_presuncao_irpj}
                              onChange={(e) => setFormData({ ...formData, percentual_presuncao_irpj: parseFloat(e.target.value) || 8 })}
                              className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                            />
                            <p className="text-xs text-[#666] mt-1">
                              {formData.tipo_atividade === 'comercio' || formData.tipo_atividade === 'industria' ? 'Padrão: 8%' : 'Padrão: 32%'}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-[#A1A1AA] mb-2">Presunção CSLL (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.percentual_presuncao_csll}
                              onChange={(e) => setFormData({ ...formData, percentual_presuncao_csll: parseFloat(e.target.value) || 12 })}
                              className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                            />
                            <p className="text-xs text-[#666] mt-1">
                              {formData.tipo_atividade === 'comercio' || formData.tipo_atividade === 'industria' ? 'Padrão: 12%' : 'Padrão: 32%'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Atividade Mista - campos separados */}
                      {formData.tipo_atividade === 'mista' && (
                        <div className="space-y-4">
                          {/* Comércio */}
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                            <h4 className="text-sm font-medium text-blue-400 mb-3">📦 Atividade de Comércio</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-[#A1A1AA] mb-2">Presunção IRPJ Comércio (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.percentual_presuncao_irpj_comercio}
                                  onChange={(e) => setFormData({ ...formData, percentual_presuncao_irpj_comercio: parseFloat(e.target.value) || 8 })}
                                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="text-xs text-[#666] mt-1">Padrão: 8%</p>
                              </div>
                              <div>
                                <label className="block text-xs text-[#A1A1AA] mb-2">Presunção CSLL Comércio (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.percentual_presuncao_csll_comercio}
                                  onChange={(e) => setFormData({ ...formData, percentual_presuncao_csll_comercio: parseFloat(e.target.value) || 12 })}
                                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="text-xs text-[#666] mt-1">Padrão: 12%</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Serviços */}
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
                            <h4 className="text-sm font-medium text-purple-400 mb-3">🛠️ Atividade de Serviços</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-[#A1A1AA] mb-2">Presunção IRPJ Serviços (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.percentual_presuncao_irpj_servico}
                                  onChange={(e) => setFormData({ ...formData, percentual_presuncao_irpj_servico: parseFloat(e.target.value) || 32 })}
                                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                />
                                <p className="text-xs text-[#666] mt-1">Padrão: 32%</p>
                              </div>
                              <div>
                                <label className="block text-xs text-[#A1A1AA] mb-2">Presunção CSLL Serviços (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.percentual_presuncao_csll_servico}
                                  onChange={(e) => setFormData({ ...formData, percentual_presuncao_csll_servico: parseFloat(e.target.value) || 32 })}
                                  className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                />
                                <p className="text-xs text-[#666] mt-1">Padrão: 32%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Configuração Simples Nacional */}
                  {formData.regime_tributario === 'simples_nacional' && (
                    <div className="pt-4 border-t border-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-[#C8A951]">📋 Anexos do Simples Nacional</h4>
                        {formData.anexos_confirmados && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Confirmado
                          </span>
                        )}
                      </div>
                      
                      {/* Anexos sugeridos (se houver) */}
                      {anexosSugeridos.length > 0 && !formData.anexos_confirmados && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 mb-4">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-blue-300">
                                Anexos sugeridos com base nos CNAEs: <strong>{anexosSugeridos.join(', ')}</strong>
                              </p>
                              <p className="text-xs text-[#666] mt-1">
                                Revise e confirme os anexos abaixo. Após salvar, eles serão marcados como confirmados.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Seleção de Anexos */}
                      <div className="space-y-2 mb-4">
                        {['I', 'II', 'III', 'IV', 'V'].map(anexo => {
                          const selecionado = formData.anexos_simples?.includes(anexo);
                          const sugerido = anexosSugeridos.includes(anexo);
                          
                          return (
                            <label
                              key={anexo}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                selecionado
                                  ? 'bg-[#C8A951]/10 border-[#C8A951]'
                                  : sugerido
                                    ? 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
                                    : 'bg-[#141414] border-[#2A2A2A] hover:border-[#444]'
                              }`}
                              onClick={(e) => {
                                // Se já está confirmado e está tentando desmarcar, pedir confirmação
                                if (formData.anexos_confirmados && selecionado) {
                                  e.preventDefault();
                                  setAnexoParaAlterar({ anexo, acao: 'remover' });
                                  setShowAnexoConfirmModal(true);
                                } else if (formData.anexos_confirmados && !selecionado) {
                                  e.preventDefault();
                                  setAnexoParaAlterar({ anexo, acao: 'adicionar' });
                                  setShowAnexoConfirmModal(true);
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={(e) => {
                                  if (!formData.anexos_confirmados) {
                                    const current = formData.anexos_simples || [];
                                    if (e.target.checked) {
                                      setFormData({ ...formData, anexos_simples: [...current, anexo].sort() });
                                    } else {
                                      setFormData({ ...formData, anexos_simples: current.filter(a => a !== anexo) });
                                    }
                                  }
                                }}
                                className="mt-1 w-5 h-5 text-[#C8A951] bg-[#141414] border-[#2A2A2A] rounded focus:ring-[#C8A951] focus:ring-2"
                                style={{ accentColor: '#C8A951' }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-semibold">Anexo {anexo}</span>
                                  {sugerido && !selecionado && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded">
                                      Sugerido
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#666] mt-0.5">{descricaoAnexos[anexo]}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      
                      {/* Flag Fator R */}
                      {formData.anexos_simples?.includes('V') && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded p-4 mb-4">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.controla_fator_r || false}
                              onChange={(e) => setFormData({ ...formData, controla_fator_r: e.target.checked })}
                              className="mt-1 w-5 h-5 text-purple-500 bg-[#141414] border-[#2A2A2A] rounded focus:ring-purple-500 focus:ring-2"
                              style={{ accentColor: '#a855f7' }}
                            />
                            <div>
                              <span className="text-white font-medium">Controla Fator R</span>
                              <p className="text-xs text-[#666] mt-1">
                                Habilita o acompanhamento do Fator R (Folha/RBT12) no Dashboard do Simples Nacional.
                                <br />
                                Se Fator R ≥ 28%, a empresa pode tributar pelo <strong className="text-emerald-400">Anexo III</strong> (mais favorável).
                              </p>
                            </div>
                          </label>
                          
                          {/* Campo Folha de Pagamento se controla Fator R */}
                          {formData.controla_fator_r && (
                            <div className="mt-4 pt-4 border-t border-purple-500/30">
                              <label className="block text-xs text-[#A1A1AA] mb-2">
                                Folha de Pagamento (últimos 12 meses)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.folha_pagamento_12m || 0}
                                onChange={(e) => setFormData({ ...formData, folha_pagamento_12m: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="0,00"
                              />
                              <p className="text-xs text-[#666] mt-1">
                                Soma dos valores de pró-labore, salários e encargos pagos nos últimos 12 meses.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-[#666]">
                        * Os anexos determinam as alíquotas do DAS. Empresas com múltiplas atividades podem ter mais de um anexo.
                      </p>
                    </div>
                  )}
                </div>

                {/* CNAE e Atividade */}
                <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-[#C8A951]" />
                    <span className="text-sm font-medium text-white">CNAE e Atividade</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">CNAE Principal</label>
                      <input
                        type="text"
                        value={formData.cnae_principal}
                        onChange={(e) => setFormData({ ...formData, cnae_principal: e.target.value })}
                        placeholder="00.00-0-00"
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white font-mono placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-[#A1A1AA] mb-2">Descrição CNAE Principal</label>
                      <input
                        type="text"
                        value={formData.cnae_principal_descricao}
                        onChange={(e) => setFormData({ ...formData, cnae_principal_descricao: e.target.value })}
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                  </div>
                  
                  {/* CNAEs Secundários */}
                  <div className="pt-4 border-t border-[#2A2A2A]">
                    <label className="block text-xs text-[#A1A1AA] mb-2">CNAEs Secundários</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={keywordInputs.cnae}
                        onChange={(e) => setKeywordInputs({ ...keywordInputs, cnae: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('cnaes', 'cnae'))}
                        placeholder="Ex: 47.11-3-02 - Comércio varejista..."
                        className="flex-1 px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('cnaes', 'cnae')}
                        className="px-4 py-2 bg-[#C8A951] text-black rounded hover:bg-[#B89841] font-medium"
                      >
                        Adicionar
                      </button>
                    </div>
                    {formData.cnaes?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.cnaes.map((cnae, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-[#C8A951]/20 text-[#C8A951] text-xs rounded flex items-center gap-2">
                            <span className="font-mono">{cnae}</span>
                            <button type="button" onClick={() => removeKeyword('cnaes', idx)} className="hover:text-red-400 font-bold">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-[#666] mt-2">Adicione os CNAEs secundários da empresa conforme cartão CNPJ.</p>
                  </div>
                  
                  {formData.classificacao_inteligente && (
                    <div className="mt-4 p-3 bg-[#C8A951]/10 border border-[#C8A951]/30 rounded">
                      <label className="block text-xs text-[#C8A951] mb-1">Classificação Inteligente</label>
                      <p className="text-sm text-white">{formData.classificacao_inteligente}</p>
                    </div>
                  )}
                </div>

                {/* Flags de Contribuinte */}
                <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-white">Flags de Contribuinte</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Equiparado a Indústria - só para Comércio */}
                    {(formData.tipo_atividade === 'comercio' || formData.tipo_atividade === 'mista') && (
                      <label className="flex items-center gap-3 p-3 bg-[#141414] border border-[#2A2A2A] rounded cursor-pointer hover:border-amber-500/50">
                        <input
                          type="checkbox"
                          checked={formData.equiparado_industria}
                          onChange={(e) => setFormData({ ...formData, equiparado_industria: e.target.checked })}
                          className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <span className="text-sm text-white block">Equiparado a Indústria</span>
                          <span className="text-xs text-[#A1A1AA]">Contribuinte de IPI e ICMS ST</span>
                        </div>
                      </label>
                    )}
                    
                    {/* Apura ICMS - só para Serviços */}
                    {(formData.tipo_atividade === 'servicos' || formData.tipo_atividade === 'mista') && (
                      <label className="flex items-center gap-3 p-3 bg-[#141414] border border-[#2A2A2A] rounded cursor-pointer hover:border-blue-500/50">
                        <input
                          type="checkbox"
                          checked={formData.apura_icms}
                          onChange={(e) => setFormData({ ...formData, apura_icms: e.target.checked })}
                          className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-blue-500 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm text-white block">Apura ICMS</span>
                          <span className="text-xs text-[#A1A1AA]">CNAE secundário de comércio</span>
                        </div>
                      </label>
                    )}

                    {/* Apura ICMS ST - só para Comércio */}
                    {(formData.tipo_atividade === 'comercio' || formData.tipo_atividade === 'mista' || formData.equiparado_industria) && (
                      <label className="flex items-center gap-3 p-3 bg-[#141414] border border-[#2A2A2A] rounded cursor-pointer hover:border-purple-500/50">
                        <input
                          type="checkbox"
                          checked={formData.apura_icms_st}
                          onChange={(e) => setFormData({ ...formData, apura_icms_st: e.target.checked })}
                          className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-purple-500 focus:ring-purple-500"
                        />
                        <div>
                          <span className="text-sm text-white block">Apura ICMS ST</span>
                          <span className="text-xs text-[#A1A1AA]">Substituto tributário</span>
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-[#666] mt-3">
                    {formData.tipo_atividade === 'industria' && '✓ Indústrias são automaticamente contribuintes de IPI e ICMS ST'}
                    {formData.tipo_atividade === 'servicos' && '✓ Empresas de serviço apuram ISS. Marque "Apura ICMS" se tiver CNAE secundário de comércio.'}
                    {formData.tipo_atividade === 'comercio' && '✓ Comércios apuram ICMS próprio. Marque "Equiparado a Indústria" se contribuinte de IPI.'}
                    {formData.tipo_atividade === 'mista' && '✓ Empresas mistas podem apurar todos os tributos conforme configuração.'}
                  </p>
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

                {/* Localização e Inscrições */}
                <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-[#C8A951]" />
                    <span className="text-sm font-medium text-white">Localização e Inscrições</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-[#A1A1AA] mb-2">Cidade</label>
                      <input
                        type="text"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">UF</label>
                      <input
                        type="text"
                        value={formData.uf}
                        onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                        maxLength="2"
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">CEP</label>
                      <input
                        type="text"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                        placeholder="00000-000"
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#2A2A2A]">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Inscrição Estadual (IE)</label>
                      <input
                        type="text"
                        value={formData.inscricao_estadual}
                        onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                        placeholder="Ex: 123456789"
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Inscrição Municipal (IM)</label>
                      <input
                        type="text"
                        value={formData.inscricao_municipal}
                        onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                        placeholder="Ex: 12345678"
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
                      />
                    </div>
                  </div>
                </div>

                {/* Classificação de Produtos */}
                <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">Classificação de Produtos (para IA)</span>
                  </div>
                  
                  {/* Produtos Comercializados */}
                  <div className="mb-4">
                    <label className="block text-xs text-[#A1A1AA] mb-2">Produtos Comercializados (para classificação REVENDA)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInputs.produto}
                        onChange={(e) => setKeywordInputs({ ...keywordInputs, produto: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('produtos_comercializados', 'produto'))}
                        placeholder="Ex: Calçados, Roupas, Eletrônicos..."
                        className="flex-1 px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('produtos_comercializados', 'produto')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                      >
                        Adicionar
                      </button>
                    </div>
                    {formData.produtos_comercializados?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.produtos_comercializados.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1">
                            {item}
                            <button type="button" onClick={() => removeKeyword('produtos_comercializados', idx)} className="hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Insumos de Produção */}
                  <div className="mb-4">
                    <label className="block text-xs text-[#A1A1AA] mb-2">Insumos de Produção (para classificação INSUMO)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInputs.insumo}
                        onChange={(e) => setKeywordInputs({ ...keywordInputs, insumo: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('insumos_producao', 'insumo'))}
                        placeholder="Ex: Matéria-prima, Embalagens, Componentes..."
                        className="flex-1 px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('insumos_producao', 'insumo')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                      >
                        Adicionar
                      </button>
                    </div>
                    {formData.insumos_producao?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.insumos_producao.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1">
                            {item}
                            <button type="button" onClick={() => removeKeyword('insumos_producao', idx)} className="hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Produtos de Despesa */}
                  <div className="mb-4">
                    <label className="block text-xs text-[#A1A1AA] mb-2">Produtos de Despesa (sempre classificados como DESPESA)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInputs.despesa}
                        onChange={(e) => setKeywordInputs({ ...keywordInputs, despesa: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('produtos_despesa', 'despesa'))}
                        placeholder="Ex: Material de Limpeza, Escritório, Combustível..."
                        className="flex-1 px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('produtos_despesa', 'despesa')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                      >
                        Adicionar
                      </button>
                    </div>
                    {formData.produtos_despesa?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.produtos_despesa.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded flex items-center gap-1">
                            {item}
                            <button type="button" onClick={() => removeKeyword('produtos_despesa', idx)} className="hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ativo Imobilizado */}
                  <div className="mb-4">
                    <label className="block text-xs text-[#C8A951] mb-2">Ativo Imobilizado (Palavras-chave: máquinas, equipamentos, veículos)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInputs.ativo}
                        onChange={(e) => setKeywordInputs({ ...keywordInputs, ativo: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('ativo_imobilizado', 'ativo'))}
                        placeholder="Ex: empilhadeira, computador, ar condicionado"
                        className="flex-1 px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('ativo_imobilizado', 'ativo')}
                        className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium"
                      >
                        Adicionar
                      </button>
                    </div>
                    {formData.ativo_imobilizado?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.ativo_imobilizado.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded flex items-center gap-1">
                            {item}
                            <button type="button" onClick={() => removeKeyword('ativo_imobilizado', idx)} className="hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Combustível */}
                  <div>
                    <label className="block text-xs text-purple-400 mb-2">Combustível (Palavras-chave: gasolina, diesel, etanol)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInputs.combustivel}
                        onChange={(e) => setKeywordInputs({ ...keywordInputs, combustivel: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('combustivel', 'combustivel'))}
                        placeholder="Ex: gasolina, diesel, etanol, GNV"
                        className="flex-1 px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword('combustivel', 'combustivel')}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                      >
                        Adicionar
                      </button>
                    </div>
                    {formData.combustivel?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.combustivel.map((item, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1">
                            {item}
                            <button type="button" onClick={() => removeKeyword('combustivel', idx)} className="hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Certificado Digital */}
                <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-white">Certificado Digital</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Nome do Arquivo (.pfx)</label>
                      <input
                        data-testid="company-certificado-arquivo-input"
                        type="text"
                        value={formData.certificado_digital_arquivo}
                        onChange={(e) => setFormData({ ...formData, certificado_digital_arquivo: e.target.value })}
                        placeholder="certificado.pfx"
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Senha do Certificado</label>
                      <div className="relative">
                        <input
                          data-testid="company-certificado-senha-input"
                          type={showCertificadoSenha ? "text" : "password"}
                          value={formData.certificado_digital_senha}
                          onChange={(e) => setFormData({ ...formData, certificado_digital_senha: e.target.value })}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 pr-10 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCertificadoSenha(!showCertificadoSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white"
                        >
                          {showCertificadoSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-2">Validade</label>
                      <input
                        data-testid="company-certificado-validade-input"
                        type="date"
                        value={formData.certificado_digital_validade}
                        onChange={(e) => setFormData({ ...formData, certificado_digital_validade: e.target.value })}
                        className="w-full px-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded text-white placeholder:text-white/20 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#666] mt-3">
                    Informe os dados do certificado A1 da empresa para assinatura de documentos fiscais.
                  </p>
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
              
              {/* Progress - Contador tomando café */}
              {importing && (
                <div className="p-4 border-t border-[#2A2A2A] bg-[#0C0C0C]">
                  <CoffeeProgress 
                    progress={(importProgress.current / importProgress.total) * 100} 
                    message={`Importando empresa ${importProgress.current} de ${importProgress.total}...`}
                    showPercentage={true}
                  />
                  {importProgress.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-400 text-center">
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

        {/* Modal de Confirmação de Alteração de Anexo */}
        {showAnexoConfirmModal && anexoParaAlterar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded border border-[#2A2A2A] w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <h3 className="text-lg font-medium text-white">Confirmar Alteração</h3>
                <button 
                  onClick={() => {
                    setShowAnexoConfirmModal(false);
                    setAnexoParaAlterar(null);
                  }} 
                  className="p-1 text-[#A1A1AA] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-white mb-2">
                      Você está tentando {anexoParaAlterar.acao === 'adicionar' ? 'adicionar' : 'remover'} o <strong>Anexo {anexoParaAlterar.anexo}</strong> de uma empresa com anexos já confirmados.
                    </p>
                    <p className="text-sm text-[#A1A1AA]">
                      Esta alteração pode impactar cálculos já realizados. Deseja continuar?
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowAnexoConfirmModal(false);
                      setAnexoParaAlterar(null);
                    }}
                    className="px-4 py-2 bg-[#2A2A2A] text-white rounded hover:bg-[#333333] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const current = formData.anexos_simples || [];
                      if (anexoParaAlterar.acao === 'adicionar') {
                        setFormData({ 
                          ...formData, 
                          anexos_simples: [...current, anexoParaAlterar.anexo].sort(),
                          anexos_confirmados: false // Marca como não confirmado após alteração
                        });
                      } else {
                        setFormData({ 
                          ...formData, 
                          anexos_simples: current.filter(a => a !== anexoParaAlterar.anexo),
                          anexos_confirmados: false // Marca como não confirmado após alteração
                        });
                      }
                      setShowAnexoConfirmModal(false);
                      setAnexoParaAlterar(null);
                    }}
                    className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-600 transition-colors font-medium"
                  >
                    Confirmar Alteração
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
