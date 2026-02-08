import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  FileText, Eye, Trash2, CheckCircle2, XCircle, Shield, X, ArrowUpDown, 
  ArrowUp, ArrowDown, Search, Download, FileSpreadsheet, AlertTriangle, 
  FileDown, Upload, ArrowLeft, ArrowDownCircle, ArrowUpCircle, Zap, 
  Truck, Building2, Wifi, RefreshCw, Plus, FolderOpen, DollarSign
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Categorias de documentos com configurações de importação
const CATEGORIAS = {
  entrada: {
    label: 'Entradas',
    icon: ArrowDownCircle,
    color: 'emerald',
    tipos: [
      { id: 'nfe', label: 'NF-e', icon: FileText, modelo: '55', importType: 'xml', accept: '.xml' },
      { id: 'servicos_tomados', label: 'Serviços Tomados', icon: Building2, modelo: 'nfse_tomado', importType: 'both', accept: '.xml,.pdf,.png,.jpg,.jpeg' },
      { id: 'cte', label: 'CT-e', icon: Truck, modelo: '57', importType: 'xml', accept: '.xml' },
      { id: 'outros', label: 'Demais Documentos', icon: Zap, modelo: 'outros', hint: 'Energia, Internet, etc.', importType: 'ai', accept: '.pdf,.png,.jpg,.jpeg' }
    ]
  },
  saida: {
    label: 'Saídas',
    icon: ArrowUpCircle,
    color: 'blue',
    tipos: [
      { id: 'nfe', label: 'NF-e', icon: FileText, modelo: '55', importType: 'xml', accept: '.xml' },
      { id: 'nfce', label: 'NFC-e', icon: FileText, modelo: '65', importType: 'xml', accept: '.xml' },
      { id: 'cte', label: 'CT-e', icon: Truck, modelo: '57', importType: 'xml', accept: '.xml' },
      { id: 'servicos_prestados', label: 'Serviços Prestados', icon: Building2, modelo: 'nfse_prestado', importType: 'both', accept: '.xml,.pdf,.png,.jpg,.jpeg' }
    ]
  }
};

const Documents = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia, openSelector } = useAppContext();
  const [searchParams] = useSearchParams();
  const highlightDocId = searchParams.get('highlight');
  
  // Estados de navegação
  const [operacao, setOperacao] = useState(null); // 'entrada' ou 'saida'
  const [tipoDoc, setTipoDoc] = useState(null); // tipo selecionado dentro da operação
  
  // Estados de dados
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);
  
  // Ordenação
  const [sortField, setSortField] = useState('numero_nfe');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Modal de detalhamento
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal de exclusão em massa
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFilters, setDeleteFilters] = useState({
    dataInicio: '',
    dataFim: '',
    emitenteCnpj: '',
    emitenteNome: '',
    numeroInicio: '',
    numeroFim: '',
    cfops: []
  });
  const [deletePreview, setDeletePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [availableCfops, setAvailableCfops] = useState([]);
  const [availableEmitentes, setAvailableEmitentes] = useState([]);
  const [emitenteSearch, setEmitenteSearch] = useState('');

  // Carregar documentos quando selecionar tipo
  useEffect(() => {
    if (ctxCompany && operacao && tipoDoc) {
      fetchDocuments();
    }
  }, [ctxCompany, operacao, tipoDoc, selectedCompetencia]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('company_id', ctxCompany.id);
      params.append('competencia', selectedCompetencia);
      
      // Filtrar por tipo de operação
      if (operacao === 'entrada') {
        params.append('tipo_operacao', 'entrada');
      } else {
        params.append('tipo_operacao', 'saida');
      }
      
      // Filtrar por modelo se específico
      const tipoConfig = CATEGORIAS[operacao]?.tipos.find(t => t.id === tipoDoc);
      if (tipoConfig && tipoConfig.modelo !== 'outros') {
        params.append('modelo', tipoConfig.modelo);
      }
      
      const res = await axios.get(`${API}/xml/documents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filtrar localmente para demais documentos
      let docs = res.data || [];
      if (tipoDoc === 'outros') {
        docs = docs.filter(d => !['55', '65', '57'].includes(d.modelo));
      }
      
      setDocuments(docs);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentDetail = async (docId) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/xml/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDocument(res.data);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteDocument = async (docId, numeroNfe) => {
    if (!window.confirm(`Tem certeza que deseja apagar o documento ${numeroNfe}?`)) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/xml/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir documento');
    }
  };

  // Estado para modal de resultado de upload
  const [uploadResult, setUploadResult] = useState(null);
  const [showUploadResult, setShowUploadResult] = useState(false);

  // ========== UPLOAD ==========
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const tipoConfig = getTipoConfig();
    if (!tipoConfig) return;
    
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    
    const token = localStorage.getItem('token');
    
    try {
      const formData = new FormData();
      formData.append('company_id', ctxCompany.id);
      formData.append('competencia', selectedCompetencia);
      formData.append('tipo_operacao', operacao);
      formData.append('tipo_documento', tipoConfig.modelo);
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      setUploadProgress({ current: files.length, total: files.length });
      
      let response;
      
      // Escolher endpoint baseado no tipo de importação
      if (tipoConfig.importType === 'ai' || 
          (tipoConfig.importType === 'both' && !files[0].name.toLowerCase().endsWith('.xml'))) {
        // Usar endpoint de IA para imagens/PDFs
        response = await axios.post(`${API}/documents/process-ai`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setUploadResult({
          tipo: 'ia',
          total: response.data.total_processados,
          sucesso: response.data.total_sucesso,
          erros: response.data.total_erros,
          processados: response.data.processados || [],
          rejeitados: response.data.erros || []
        });
      } else {
        // Usar endpoint validado para XMLs
        response = await axios.post(`${API}/xml/upload-validated`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setUploadResult({
          tipo: 'xml',
          total: response.data.total_processados,
          sucesso: response.data.total_aceitos,
          erros: response.data.total_rejeitados,
          processados: response.data.aceitos || [],
          rejeitados: response.data.rejeitados || []
        });
      }
      
      setShowUploadResult(true);
      
      if (response.data.total_aceitos > 0 || response.data.total_sucesso > 0) {
        fetchDocuments();
      }
      
    } catch (err) {
      console.error('Erro no upload:', err);
      setUploadResult({
        tipo: 'erro',
        total: files.length,
        sucesso: 0,
        erros: files.length,
        processados: [],
        rejeitados: [{
          arquivo: 'Todos os arquivos',
          motivo: err.response?.data?.detail || err.message || 'Erro de conexão'
        }]
      });
      setShowUploadResult(true);
    }
    
    setUploading(false);
    e.target.value = '';
  };

  // Ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ========== EXCLUSÃO EM MASSA ==========
  const openDeleteModal = async () => {
    setShowDeleteModal(true);
    setDeletePreview(null);
    setDeleteFilters({
      dataInicio: '',
      dataFim: '',
      emitenteCnpj: '',
      emitenteNome: '',
      numeroInicio: '',
      numeroFim: '',
      cfops: []
    });
    
    // Carregar CFOPs disponíveis
    const token = localStorage.getItem('token');
    const tipoConfig = getTipoConfig();
    try {
      const response = await axios.get(
        `${API}/xml/documents/cfops/${ctxCompany.id}?competencia=${selectedCompetencia}&tipo_operacao=${operacao}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableCfops(response.data);
    } catch (err) {
      console.error('Erro ao carregar CFOPs:', err);
    }
  };

  const searchEmitentes = async (search) => {
    if (!search || search.length < 2) {
      setAvailableEmitentes([]);
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(
        `${API}/xml/documents/emitentes/${ctxCompany.id}?competencia=${selectedCompetencia}&tipo_operacao=${operacao}&search=${search}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailableEmitentes(response.data);
    } catch (err) {
      console.error('Erro ao buscar emitentes:', err);
    }
  };

  const previewDelete = async () => {
    setLoadingPreview(true);
    const token = localStorage.getItem('token');
    const tipoConfig = getTipoConfig();
    
    try {
      const payload = {
        company_id: ctxCompany.id,
        competencia: selectedCompetencia,
        tipo_operacao: operacao,
        tipo_documento: tipoConfig.modelo,
        data_inicio: deleteFilters.dataInicio || null,
        data_fim: deleteFilters.dataFim || null,
        emitente_cnpj: deleteFilters.emitenteCnpj || null,
        emitente_nome: deleteFilters.emitenteNome || null,
        numero_inicio: deleteFilters.numeroInicio ? parseInt(deleteFilters.numeroInicio) : null,
        numero_fim: deleteFilters.numeroFim ? parseInt(deleteFilters.numeroFim) : null,
        cfops: deleteFilters.cfops.length > 0 ? deleteFilters.cfops : null
      };
      
      const response = await axios.post(`${API}/xml/documents/preview-delete`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDeletePreview(response.data);
    } catch (err) {
      console.error('Erro ao gerar preview:', err);
      alert('Erro ao gerar preview de exclusão');
    }
    setLoadingPreview(false);
  };

  const executeDelete = async () => {
    if (!deletePreview || deletePreview.total_documentos === 0) return;
    
    if (!window.confirm(`Tem certeza que deseja excluir ${deletePreview.total_documentos} documento(s)?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    setDeleting(true);
    const token = localStorage.getItem('token');
    const tipoConfig = getTipoConfig();
    
    try {
      const payload = {
        company_id: ctxCompany.id,
        competencia: selectedCompetencia,
        tipo_operacao: operacao,
        tipo_documento: tipoConfig.modelo,
        document_ids: deletePreview.ids_para_excluir
      };
      
      const response = await axios.post(`${API}/xml/documents/delete-bulk`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(response.data.message);
      setShowDeleteModal(false);
      fetchDocuments();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir documentos: ' + (err.response?.data?.detail || err.message));
    }
    setDeleting(false);
  };

  const toggleCfop = (cfop) => {
    setDeleteFilters(prev => ({
      ...prev,
      cfops: prev.cfops.includes(cfop) 
        ? prev.cfops.filter(c => c !== cfop)
        : [...prev.cfops, cfop]
    }));
  };

  // Apagar todos os documentos de uma operação (entrada ou saída)
  const [deletingAll, setDeletingAll] = useState(null); // 'entrada' ou 'saida'
  
  const handleDeleteAllByOperacao = async (tipoOperacao) => {
    const tipoLabel = tipoOperacao === 'entrada' ? 'ENTRADAS' : 'SAÍDAS';
    
    // Primeiro, buscar preview para saber quantos documentos serão excluídos
    const token = localStorage.getItem('token');
    
    try {
      setDeletingAll(tipoOperacao);
      
      // Buscar contagem de documentos
      const previewResponse = await axios.post(`${API}/xml/documents/preview-delete`, {
        company_id: ctxCompany.id,
        competencia: selectedCompetencia,
        tipo_operacao: tipoOperacao,
        tipo_documento: 'all' // Todos os modelos
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const totalDocs = previewResponse.data.total_documentos;
      const totalValor = previewResponse.data.total_valor;
      
      if (totalDocs === 0) {
        alert(`Não há documentos de ${tipoLabel} para excluir nesta competência.`);
        setDeletingAll(null);
        return;
      }
      
      const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor);
      
      if (!window.confirm(
        `⚠️ ATENÇÃO!\n\n` +
        `Você está prestes a excluir TODOS os documentos de ${tipoLabel}:\n\n` +
        `📄 ${totalDocs} documento(s)\n` +
        `💰 ${valorFormatado}\n\n` +
        `Empresa: ${ctxCompany.razao_social}\n` +
        `Competência: ${selectedCompetencia}\n\n` +
        `Esta ação NÃO pode ser desfeita!\n\n` +
        `Deseja continuar?`
      )) {
        setDeletingAll(null);
        return;
      }
      
      // Segunda confirmação para segurança
      if (!window.confirm(
        `ÚLTIMA CONFIRMAÇÃO\n\n` +
        `Digite "CONFIRMAR" mentalmente e clique OK para excluir ${totalDocs} documentos de ${tipoLabel}.`
      )) {
        setDeletingAll(null);
        return;
      }
      
      // Executar exclusão
      const deleteResponse = await axios.post(`${API}/xml/documents/delete-bulk`, {
        company_id: ctxCompany.id,
        competencia: selectedCompetencia,
        tipo_operacao: tipoOperacao,
        tipo_documento: 'all',
        document_ids: previewResponse.data.ids_para_excluir
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`✅ ${deleteResponse.data.deleted_count} documento(s) de ${tipoLabel} excluído(s) com sucesso!`);
      
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir documentos: ' + (err.response?.data?.detail || err.message));
    }
    
    setDeletingAll(null);
  };

  // Filtrar e ordenar documentos
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    
    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.numero_nfe?.toString().includes(term) ||
        doc.emitente_nome?.toLowerCase().includes(term) ||
        doc.emitente_cnpj?.includes(term) ||
        doc.chave_acesso?.includes(term)
      );
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (sortField === 'numero_nfe' || sortField === 'valor_total') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return filtered;
  }, [documents, searchTerm, sortField, sortDirection]);

  // Calcular totais dos documentos filtrados
  const totais = useMemo(() => {
    const total = filteredDocuments.reduce((sum, doc) => sum + (parseFloat(doc.valor_total) || 0), 0);
    return {
      quantidade: filteredDocuments.length,
      valorTotal: total
    };
  }, [filteredDocuments]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Voltar para seleção de tipo
  const handleBackToTipos = () => {
    setTipoDoc(null);
    setDocuments([]);
  };

  // Voltar para seleção de operação
  const handleBackToOperacao = () => {
    setOperacao(null);
    setTipoDoc(null);
    setDocuments([]);
  };

  // Obter configuração do tipo atual
  const getTipoConfig = () => {
    if (!operacao || !tipoDoc) return null;
    return CATEGORIAS[operacao]?.tipos.find(t => t.id === tipoDoc);
  };

  // ========== RENDERIZAÇÃO ==========
  
  // Tela inicial - Selecionar Empresa
  if (!ctxCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FolderOpen className="w-16 h-16 text-[#C8A951] mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">Documentos Fiscais</h2>
            <p className="text-[#A1A1AA] mb-6">Selecione uma empresa para gerenciar documentos</p>
            <button
              onClick={openSelector}
              className="px-6 py-3 bg-[#C8A951] text-black rounded-lg font-semibold hover:bg-[#B09240] transition-all"
            >
              Selecionar Empresa
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Tela de seleção de operação (Entradas ou Saídas)
  if (!operacao) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div data-testid="documents-page" className="space-y-8">
          {/* Header */}
          <div className="text-center pt-8">
            <h1 className="text-3xl font-semibold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Documentos Fiscais
            </h1>
            <p className="text-[#A1A1AA]">
              {ctxCompany.razao_social} • Competência: {selectedCompetencia}
            </p>
          </div>

          {/* Botões de Operação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-12">
            {/* Card ENTRADAS */}
            <div className="flex flex-col items-center gap-3">
              <button
                data-testid="btn-entradas"
                onClick={() => setOperacao('entrada')}
                className="group w-64 h-48 bg-[#141414] border-2 border-emerald-500/30 rounded-xl hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                  <ArrowDownCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">ENTRADAS</h3>
                  <p className="text-sm text-[#A1A1AA]">Compras e Aquisições</p>
                </div>
              </button>
              
              {/* Botão Apagar Tudo Entradas */}
              <button
                data-testid="btn-delete-all-entradas"
                onClick={() => handleDeleteAllByOperacao('entrada')}
                disabled={deletingAll === 'entrada'}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-all"
              >
                {deletingAll === 'entrada' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Apagar Todas Entradas
                  </>
                )}
              </button>
            </div>

            {/* Card SAÍDAS */}
            <div className="flex flex-col items-center gap-3">
              <button
                data-testid="btn-saidas"
                onClick={() => setOperacao('saida')}
                className="group w-64 h-48 bg-[#141414] border-2 border-blue-500/30 rounded-xl hover:border-blue-500 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                  <ArrowUpCircle className="w-10 h-10 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">SAÍDAS</h3>
                  <p className="text-sm text-[#A1A1AA]">Vendas e Prestações</p>
                </div>
              </button>
              
              {/* Botão Apagar Tudo Saídas */}
              <button
                data-testid="btn-delete-all-saidas"
                onClick={() => handleDeleteAllByOperacao('saida')}
                disabled={deletingAll === 'saida'}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-all"
              >
                {deletingAll === 'saida' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Apagar Todas Saídas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Tela de seleção de tipo de documento
  if (!tipoDoc) {
    const categoria = CATEGORIAS[operacao];
    const isEntrada = operacao === 'entrada';
    
    return (
      <Layout user={user} onLogout={onLogout}>
        <div data-testid="documents-tipos" className="space-y-6">
          {/* Header com voltar */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToOperacao}
              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <categoria.icon className={isEntrada ? "w-6 h-6 text-emerald-400" : "w-6 h-6 text-blue-400"} />
                {categoria.label}
              </h1>
              <p className="text-[#A1A1AA] text-sm">
                {ctxCompany.razao_social} • {selectedCompetencia}
              </p>
            </div>
          </div>

          {/* Grid de tipos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
            {categoria.tipos.map((tipo) => {
              const TipoIcon = tipo.icon;
              return (
                <button
                  key={tipo.id}
                  data-testid={`btn-tipo-${tipo.id}`}
                  onClick={() => setTipoDoc(tipo.id)}
                  className={`group p-6 bg-[#141414] border border-[#2A2A2A] rounded-xl transition-all text-center ${
                    isEntrada 
                      ? 'hover:border-emerald-500/50 hover:bg-emerald-500/5' 
                      : 'hover:border-blue-500/50 hover:bg-blue-500/5'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all ${
                    isEntrada 
                      ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' 
                      : 'bg-blue-500/10 group-hover:bg-blue-500/20'
                  }`}>
                    <TipoIcon className={isEntrada ? "w-7 h-7 text-emerald-400" : "w-7 h-7 text-blue-400"} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">{tipo.label}</h3>
                  {tipo.hint && (
                    <p className="text-xs text-[#A1A1AA]">{tipo.hint}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  // Tela de listagem de documentos
  const tipoConfig = getTipoConfig();
  const TipoIcon = tipoConfig?.icon || FileText;
  const isEntrada = operacao === 'entrada';

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="documents-list" className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header fixo */}
        <div className="flex-shrink-0 space-y-4 pb-4">
          {/* Navegação e título */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToTipos}
                className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <TipoIcon className={isEntrada ? "w-6 h-6 text-emerald-400" : "w-6 h-6 text-blue-400"} />
                  {tipoConfig?.label}
                  <span className={isEntrada 
                    ? "px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "px-2 py-0.5 text-xs rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }>
                    {CATEGORIAS[operacao].label}
                  </span>
                </h1>
                <p className="text-[#A1A1AA] text-sm">
                  {ctxCompany.razao_social} • {selectedCompetencia}
                </p>
              </div>
            </div>

            {/* Botão de Upload */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept={tipoConfig?.accept || '.xml'}
                multiple
                className="hidden"
              />
              <button
                data-testid="btn-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={isEntrada 
                  ? "inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-all"
                  : "inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-all"
                }
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {tipoConfig?.importType === 'ai' ? 'Importar PDF/Imagem' : 
                     tipoConfig?.importType === 'both' ? 'Importar XML ou PDF' : 
                     'Importar XML'}
                  </>
                )}
              </button>
              
              {/* Botão Apagar */}
              <button
                data-testid="btn-delete"
                onClick={openDeleteModal}
                disabled={filteredDocuments.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg font-medium hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 className="w-5 h-5" />
                Apagar
              </button>
            </div>
          </div>

          {/* Totalizador e Busca em linha */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-6 py-2 px-4 bg-[#141414] rounded-lg border border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#A1A1AA]" />
                <span className="text-sm text-[#A1A1AA]">Documentos:</span>
                <span className="text-sm font-semibold text-white">{totais.quantidade}</span>
              </div>
              <div className="w-px h-4 bg-[#2A2A2A]" />
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#A1A1AA]" />
                <span className="text-sm text-[#A1A1AA]">Total:</span>
                <span className="text-sm font-semibold text-[#C8A951]">{formatCurrency(totais.valorTotal)}</span>
              </div>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A1A1AA]" />
              <input
                type="text"
                placeholder="Buscar por número, emitente, CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder:text-white/20 focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
              />
            </div>
          </div>
        </div>

        {/* Área de conteúdo com scroll */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin mx-auto" />
                <p className="mt-4 text-[#A1A1AA]">Carregando documentos...</p>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 text-[#A1A1AA] mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Nenhum documento encontrado</h3>
                <p className="text-[#A1A1AA] mb-6">Importe seus arquivos XML para começar</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={isEntrada 
                    ? "inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-all"
                    : "inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
                  }
                >
                  <Upload className="w-5 h-5" />
                  Importar XML
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] h-full flex flex-col overflow-hidden">
              {/* Cabeçalho da tabela fixo */}
              <div className="flex-shrink-0 bg-[#0C0C0C] border-b border-[#2A2A2A]">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th 
                        className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white w-24"
                        onClick={() => handleSort('numero_nfe')}
                      >
                        <div className="flex items-center gap-1">
                          Número
                          {sortField === 'numero_nfe' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
                        {operacao === 'entrada' ? 'Emitente' : 'Destinatário'}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider hidden md:table-cell w-40">
                        CNPJ
                      </th>
                      <th 
                        className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white w-28"
                        onClick={() => handleSort('data_emissao')}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          {sortField === 'data_emissao' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-right px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white w-32"
                        onClick={() => handleSort('valor_total')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor
                          {sortField === 'valor_total' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider w-24">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider w-24">
                        Ações
                      </th>
                    </tr>
                  </thead>
                </table>
              </div>
              
              {/* Corpo da tabela com scroll */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {filteredDocuments.map((doc) => (
                      <tr 
                        key={doc.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="px-4 py-3 w-24">
                          <span className="font-medium text-white">{doc.numero_nfe}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white truncate max-w-[200px]">
                            {operacao === 'entrada' ? doc.emitente_nome : doc.destinatario_nome}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell w-40">
                          <span className="text-[#A1A1AA] font-mono text-sm">
                            {operacao === 'entrada' ? doc.emitente_cnpj : doc.destinatario_cnpj}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA] w-28">
                          {formatDate(doc.data_emissao)}
                        </td>
                        <td className="px-4 py-3 text-right w-32">
                          <span className="text-[#C8A951] font-medium">
                            {formatCurrency(doc.valor_total)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center w-24">
                          {doc.status === 'autorizada' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          ) : doc.status === 'cancelada' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs">
                              <XCircle className="w-3 h-3" />
                              Cancelada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right w-24">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => fetchDocumentDetail(doc.id)}
                              className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.numero_nfe)}
                              className="p-2 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal de detalhes */}
        {selectedDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div>
                  <h2 className="text-lg font-medium text-white">
                    Documento {selectedDocument.numero_nfe}
                  </h2>
                  <p className="text-sm text-[#A1A1AA]">{selectedDocument.chave_acesso}</p>
                </div>
                <button 
                  onClick={() => setSelectedDocument(null)}
                  className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
                {/* Info Geral */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0C0C0C] rounded-lg p-3">
                    <p className="text-xs text-[#A1A1AA]">Valor Total</p>
                    <p className="text-lg font-bold text-[#C8A951]">{formatCurrency(selectedDocument.valor_total)}</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-3">
                    <p className="text-xs text-[#A1A1AA]">Data Emissão</p>
                    <p className="text-lg font-medium text-white">{formatDate(selectedDocument.data_emissao)}</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-3">
                    <p className="text-xs text-[#A1A1AA]">ICMS</p>
                    <p className="text-lg font-medium text-white">{formatCurrency(selectedDocument.icms_total)}</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-3">
                    <p className="text-xs text-[#A1A1AA]">Produtos</p>
                    <p className="text-lg font-medium text-white">{selectedDocument.produtos?.length || 0}</p>
                  </div>
                </div>
                
                {/* Emitente/Destinatário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0C0C0C] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#A1A1AA] mb-2">Emitente</h4>
                    <p className="text-white font-medium">{selectedDocument.emitente_nome}</p>
                    <p className="text-sm text-[#A1A1AA] font-mono">{selectedDocument.emitente_cnpj}</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-[#A1A1AA] mb-2">Destinatário</h4>
                    <p className="text-white font-medium">{selectedDocument.destinatario_nome}</p>
                    <p className="text-sm text-[#A1A1AA] font-mono">{selectedDocument.destinatario_cnpj}</p>
                  </div>
                </div>

                {/* Produtos */}
                {selectedDocument.produtos && selectedDocument.produtos.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[#A1A1AA] mb-2">Produtos ({selectedDocument.produtos.length})</h4>
                    <div className="bg-[#0C0C0C] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#1A1A1A]">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs text-[#A1A1AA]">Descrição</th>
                            <th className="text-left px-3 py-2 text-xs text-[#A1A1AA]">NCM</th>
                            <th className="text-right px-3 py-2 text-xs text-[#A1A1AA]">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]">
                          {selectedDocument.produtos.slice(0, 10).map((prod, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-white truncate max-w-[300px]">{prod.descricao}</td>
                              <td className="px-3 py-2 text-[#A1A1AA] font-mono">{prod.ncm}</td>
                              <td className="px-3 py-2 text-right text-[#C8A951]">{formatCurrency(prod.valor_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {selectedDocument.produtos.length > 10 && (
                        <p className="text-center py-2 text-xs text-[#A1A1AA]">
                          +{selectedDocument.produtos.length - 10} produtos
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Resultado do Upload */}
        {showUploadResult && uploadResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  {uploadResult.erros === 0 ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : uploadResult.sucesso === 0 ? (
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-medium text-white">
                      Resultado da Importação
                    </h2>
                    <p className="text-sm text-[#A1A1AA]">
                      {uploadResult.tipo === 'ia' ? 'Processamento com IA' : 'Importação de XML'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowUploadResult(false)}
                  className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Resumo */}
              <div className="p-4 border-b border-[#2A2A2A]">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-white">{uploadResult.total}</p>
                    <p className="text-xs text-[#A1A1AA]">Total</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{uploadResult.sucesso}</p>
                    <p className="text-xs text-emerald-400">Aceitos</p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{uploadResult.erros}</p>
                    <p className="text-xs text-red-400">Rejeitados</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 max-h-[50vh] overflow-y-auto space-y-4">
                {/* Arquivos aceitos */}
                {uploadResult.processados.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Documentos Importados
                    </h3>
                    <div className="space-y-1">
                      {uploadResult.processados.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 bg-emerald-500/5 rounded border border-emerald-500/20">
                          <div>
                            <p className="text-sm text-white">{item.arquivo}</p>
                            <p className="text-xs text-[#A1A1AA]">
                              {item.emitente && `${item.emitente} • `}Nº {item.numero}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-[#C8A951]">
                            {formatCurrency(item.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Arquivos rejeitados */}
                {uploadResult.rejeitados.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Documentos Rejeitados
                    </h3>
                    <div className="space-y-1">
                      {uploadResult.rejeitados.map((item, idx) => (
                        <div key={idx} className="py-2 px-3 bg-red-500/5 rounded border border-red-500/20">
                          <p className="text-sm text-white">{item.arquivo}</p>
                          <p className="text-xs text-red-400 mt-1">{item.motivo}</p>
                          {item.tipo_detectado && (
                            <p className="text-xs text-[#A1A1AA] mt-1">
                              Tipo detectado: {item.tipo_detectado}
                              {item.operacao_detectada && ` (${item.operacao_detectada})`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => setShowUploadResult(false)}
                  className="w-full py-2.5 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#D4B85C] transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Exclusão em Massa */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-3xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-white">Excluir Documentos</h2>
                    <p className="text-sm text-[#A1A1AA]">
                      {getTipoConfig()?.label} • {CATEGORIAS[operacao].label} • {selectedCompetencia}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Filtros */}
              <div className="p-4 border-b border-[#2A2A2A] space-y-4 max-h-[40vh] overflow-y-auto">
                <p className="text-sm text-[#A1A1AA]">
                  Configure os filtros para selecionar os documentos a excluir. Deixe em branco para não filtrar.
                </p>
                
                {/* Intervalo de Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={deleteFilters.dataInicio}
                      onChange={(e) => setDeleteFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Data Final</label>
                    <input
                      type="date"
                      value={deleteFilters.dataFim}
                      onChange={(e) => setDeleteFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
                
                {/* Intervalo de Notas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Número Inicial</label>
                    <input
                      type="number"
                      value={deleteFilters.numeroInicio}
                      onChange={(e) => setDeleteFilters(prev => ({ ...prev, numeroInicio: e.target.value }))}
                      placeholder="Ex: 1"
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder:text-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-1">Número Final</label>
                    <input
                      type="number"
                      value={deleteFilters.numeroFim}
                      onChange={(e) => setDeleteFilters(prev => ({ ...prev, numeroFim: e.target.value }))}
                      placeholder="Ex: 1000"
                      className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder:text-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
                
                {/* Emitente/Fornecedor */}
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Emitente/Fornecedor</label>
                  <input
                    type="text"
                    value={deleteFilters.emitenteNome}
                    onChange={(e) => {
                      setDeleteFilters(prev => ({ ...prev, emitenteNome: e.target.value }));
                      searchEmitentes(e.target.value);
                    }}
                    placeholder="Buscar por nome ou CNPJ..."
                    className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder:text-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  {availableEmitentes.length > 0 && (
                    <div className="mt-1 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg max-h-32 overflow-y-auto">
                      {availableEmitentes.map((emit, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setDeleteFilters(prev => ({ ...prev, emitenteNome: emit.nome, emitenteCnpj: emit.cnpj }));
                            setAvailableEmitentes([]);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5 border-b border-[#2A2A2A] last:border-0"
                        >
                          <span className="font-medium">{emit.nome}</span>
                          <span className="text-[#A1A1AA] ml-2">({emit.cnpj})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* CFOPs */}
                {availableCfops.length > 0 && (
                  <div>
                    <label className="block text-xs text-[#A1A1AA] mb-2">CFOPs</label>
                    <div className="flex flex-wrap gap-2">
                      {availableCfops.map(cfop => (
                        <button
                          key={cfop}
                          onClick={() => toggleCfop(cfop)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                            deleteFilters.cfops.includes(cfop)
                              ? 'bg-red-500/20 border-red-500/50 text-red-400'
                              : 'bg-[#0C0C0C] border-[#2A2A2A] text-[#A1A1AA] hover:border-[#3A3A3A]'
                          }`}
                        >
                          {cfop}
                        </button>
                      ))}
                    </div>
                    {deleteFilters.cfops.length > 0 && (
                      <button
                        onClick={() => setDeleteFilters(prev => ({ ...prev, cfops: [] }))}
                        className="mt-2 text-xs text-red-400 hover:underline"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>
                )}
                
                {/* Botão Preview */}
                <button
                  onClick={previewDelete}
                  disabled={loadingPreview}
                  className="w-full py-2.5 bg-[#2A2A2A] text-white rounded-lg font-medium hover:bg-[#3A3A3A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loadingPreview ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Visualizar Documentos
                    </>
                  )}
                </button>
              </div>
              
              {/* Preview dos documentos */}
              {deletePreview && (
                <div className="p-4 border-b border-[#2A2A2A]">
                  {/* Resumo */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-red-500/10 rounded-lg px-4 py-2">
                        <p className="text-2xl font-bold text-red-400">{deletePreview.total_documentos}</p>
                        <p className="text-xs text-red-400">Documentos</p>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg px-4 py-2">
                        <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(deletePreview.total_valor)}</p>
                        <p className="text-xs text-[#A1A1AA]">Valor Total</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Lista de preview */}
                  {deletePreview.preview.length > 0 && (
                    <div className="bg-[#0C0C0C] rounded-lg border border-[#2A2A2A] max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#141414] sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs text-[#A1A1AA]">Número</th>
                            <th className="text-left px-3 py-2 text-xs text-[#A1A1AA]">Emitente</th>
                            <th className="text-left px-3 py-2 text-xs text-[#A1A1AA]">Data</th>
                            <th className="text-right px-3 py-2 text-xs text-[#A1A1AA]">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2A]">
                          {deletePreview.preview.map((doc, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="px-3 py-2 text-white">{doc.numero_nfe}</td>
                              <td className="px-3 py-2 text-[#A1A1AA] truncate max-w-[200px]">{doc.emitente_nome}</td>
                              <td className="px-3 py-2 text-[#A1A1AA]">{formatDate(doc.data_emissao)}</td>
                              <td className="px-3 py-2 text-right text-[#C8A951]">{formatCurrency(doc.valor_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {deletePreview.tem_mais && (
                        <p className="text-center py-2 text-xs text-[#A1A1AA] border-t border-[#2A2A2A]">
                          +{deletePreview.total_documentos - 100} documentos não exibidos
                        </p>
                      )}
                    </div>
                  )}
                  
                  {deletePreview.total_documentos === 0 && (
                    <p className="text-center py-4 text-[#A1A1AA]">
                      Nenhum documento encontrado com os filtros selecionados.
                    </p>
                  )}
                </div>
              )}
              
              {/* Ações */}
              <div className="p-4 flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 bg-[#2A2A2A] text-white rounded-lg font-medium hover:bg-[#3A3A3A] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  disabled={!deletePreview || deletePreview.total_documentos === 0 || deleting}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir {deletePreview?.total_documentos || 0} Documento(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Documents;
