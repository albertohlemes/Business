import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  FileText, Eye, Trash2, CheckCircle2, XCircle, Shield, X, ArrowUpDown, 
  ArrowUp, ArrowDown, Search, Download, FileSpreadsheet, AlertTriangle, 
  FileDown, Upload, ArrowLeft, ArrowDownCircle, ArrowUpCircle, Zap, 
  Truck, Building2, Wifi, RefreshCw, Plus, FolderOpen, DollarSign, Cloud,
  Filter, CheckCircle, Ban, Receipt
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useUpload } from '../context/UploadContext';
import DocumentDetailModal from '../components/DocumentDetailModal';
import NfseCancellationModal from '../components/NfseCancellationModal';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Categorias de documentos com configurações de importação
// ENTRADAS: todos os tipos disponíveis para qualquer empresa
// SAÍDAS: filtrados pela atividade da empresa
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
      { id: 'nfe', label: 'NF-e', icon: FileText, modelo: '55', importType: 'xml', accept: '.xml', atividades: ['comercio', 'industria', 'mista'] },
      { id: 'nfce', label: 'NFC-e', icon: FileText, modelo: '65', importType: 'xml', accept: '.xml', atividades: ['comercio', 'mista'] },
      { id: 'cte', label: 'CT-e', icon: Truck, modelo: '57', importType: 'xml', accept: '.xml', atividades: ['transporte'] },
      { id: 'servicos_prestados', label: 'Serviços Prestados', icon: Building2, modelo: 'nfse_prestado', importType: 'both', accept: '.xml,.pdf,.png,.jpg,.jpeg', atividades: ['servicos', 'mista'] },
      { id: 'faturas_recibos', label: 'Faturas / Recibos', icon: Receipt, modelo: 'fatura_recibo', hint: 'Locação de bens', importType: 'ai', accept: '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx', atividades: ['locacao'] }
    ]
  }
};

const Documents = ({ user, onLogout }) => {
  const { 
    selectedCompany: ctxCompany, 
    selectedCompetencia, 
    openSelector, 
    siegStatus, 
    siegSyncing, 
    checkSiegCount, 
    syncFromSieg,
    // Upload global
    startUpload: startGlobalUpload,
    updateUploadProgress: updateGlobalProgress,
    finishUpload: finishGlobalUpload,
    uploadProgress: globalUploadProgress
  } = useAppContext();
  const { startUpload, isUploading: globalUploading, progress: globalProgress, currentFile, uploadResults: globalResults, uploadError: globalError, clearResults } = useUpload();
  const [searchParams] = useSearchParams();
  const highlightDocId = searchParams.get('highlight');
  
  // Estados de navegação
  const [operacao, setOperacao] = useState(null); // 'entrada' ou 'saida'
  const [tipoDoc, setTipoDoc] = useState(null); // tipo selecionado dentro da operação
  
  // Estados de dados
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload local (para quando não usa streaming)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percent: 0 });
  const fileInputRef = useRef(null);
  const eventSourceRef = useRef(null);
  
  // SIEG
  const [siegProgress, setSiegProgress] = useState({ step: '', percent: 0 });
  const [siegResult, setSiegResult] = useState(null);
  
  // Ordenação
  const [sortField, setSortField] = useState('numero_nfe');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Modal de detalhamento
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Filtro de divergências
  const [filterDivergencia, setFilterDivergencia] = useState('all'); // 'all', 'divergente', 'ok'

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

  // Modal de cancelamento de NFS-e
  const [showNfseCancellation, setShowNfseCancellation] = useState(false);
  const [nfseFilesForCancellation, setNfseFilesForCancellation] = useState([]);

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

  // Limpar EventSource ao desmontar
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Recarregar documentos quando upload global terminar
  useEffect(() => {
    if (globalResults && !globalUploading && operacao && tipoDoc) {
      fetchDocuments();
    }
  }, [globalResults, globalUploading]);

  // ========== UPLOAD COM SSE ==========
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const tipoConfig = getTipoConfig();
    if (!tipoConfig) return;
    
    const token = localStorage.getItem('token');
    const isXmlUpload = tipoConfig.importType === 'xml' || 
      (tipoConfig.importType === 'both' && files[0].name.toLowerCase().endsWith('.xml'));
    
    // Se for NFS-e prestados (saída de serviços), abrir modal de cancelamento
    if (tipoDoc === 'servicos_prestados' && isXmlUpload) {
      setNfseFilesForCancellation(files);
      setShowNfseCancellation(true);
      e.target.value = '';
      return;
    }
    
    // Para poucos arquivos XML ou arquivos não-XML, usar upload direto
    if (!isXmlUpload || files.length <= 10) {
      await handleDirectUpload(files, tipoConfig, token);
    } else {
      // Para muitos XMLs, usar upload com streaming e SSE
      await handleStreamingUpload(files, tipoConfig, token);
    }
    
    e.target.value = '';
  };

  // Callback quando importação de NFS-e com cancelamentos é concluída
  const handleNfseImportComplete = (result) => {
    // Mapear resultado para o formato do modal de upload
    setUploadResult({
      tipo: 'nfse',
      total: result.resumo?.total_notas || 0,
      sucesso: (result.resumo?.ativas || 0) + (result.resumo?.canceladas || 0),
      erros: (result.resumo?.duplicadas || 0) + (result.resumo?.rejeitadas || 0) + (result.resumo?.erros || 0),
      canceladas: result.resumo?.canceladas || 0,
      processados: (result.notas_importadas || []).map(n => ({
        arquivo: n.arquivo,
        numero: n.numero,
        valor: n.valor,
        emitente: n.emitente,
        status: n.status
      })),
      rejeitados: [
        ...(result.duplicadas || []).map(d => ({ arquivo: d.arquivo, motivo: 'Nota duplicada' })),
        ...(result.rejeitadas_cnpj || []).map(r => ({ arquivo: r.arquivo, motivo: r.motivo || 'CNPJ não corresponde' })),
        ...(result.errors || []).map(e => ({ arquivo: e.arquivo, motivo: e.erro }))
      ],
      notas_canceladas: result.notas_canceladas || []
    });
    setShowUploadResult(true);
    fetchDocuments();
  };

  // Upload direto (para poucos arquivos ou não-XML)
  const handleDirectUpload = async (files, tipoConfig, token) => {
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, percent: 0 });
    
    try {
      const formData = new FormData();
      formData.append('company_id', ctxCompany.id);
      formData.append('competencia', selectedCompetencia);
      formData.append('tipo_operacao', operacao);
      formData.append('tipo_documento', tipoConfig.modelo);
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Simular progresso durante o upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newPercent = Math.min(prev.percent + 5, 90);
          return { ...prev, percent: newPercent };
        });
      }, 200);
      
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
        
        clearInterval(progressInterval);
        setUploadProgress({ current: files.length, total: files.length, percent: 100 });
        
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
        
        clearInterval(progressInterval);
        setUploadProgress({ current: files.length, total: files.length, percent: 100 });
        
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
    
    setTimeout(() => setUploading(false), 500);
  };

  // Upload com streaming (para muitos XMLs)
  const handleStreamingUpload = async (files, tipoConfig, token) => {
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length, percent: 0 });
    
    // Iniciar progresso global (visível em todas as telas)
    startGlobalUpload(null, files.length, ctxCompany?.razao_social || 'Empresa', operacao);
    
    try {
      // 1. Iniciar upload
      const initFormData = new FormData();
      initFormData.append('company_id', ctxCompany.id);
      initFormData.append('competencia', selectedCompetencia);
      initFormData.append('tipo', operacao);
      initFormData.append('total_files', files.length);
      
      const initResponse = await axios.post(`${API}/xml/upload-init`, initFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const uploadId = initResponse.data.upload_id;
      
      // Variável para controlar se recebemos eventos SSE
      let sseWorking = false;
      let pollingInterval = null;
      
      // Função de polling como fallback
      const pollProgress = async () => {
        try {
          const pollResponse = await axios.get(`${API}/xml/upload-status/${uploadId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = pollResponse.data;
          
          if (data.completed === true && data.results) {
            if (pollingInterval) clearInterval(pollingInterval);
            setUploadProgress({ current: files.length, total: files.length, percent: 100 });
            
            const resumo = data.results.resumo || {};
            const successList = data.results.success || [];
            const errorsList = [
              ...(data.results.errors || []),
              ...(data.results.duplicadas || []).map(d => ({ arquivo: d.arquivo || d.filename, motivo: 'Documento duplicado', numero: d.numero })),
              ...(data.results.rejeitadas_cnpj || []).map(d => ({ arquivo: d.arquivo || d.filename, motivo: `CNPJ não corresponde à empresa (encontrado: ${d.cnpj_encontrado})` }))
            ];
            
            setUploadResult({
              tipo: 'xml',
              total: resumo.total_arquivos || files.length,
              sucesso: resumo.importados || successList.length,
              erros: (resumo.erros || 0) + (resumo.duplicados || 0) + (resumo.rejeitados_cnpj || 0),
              processados: successList.map(s => ({
                arquivo: s.arquivo || s.filename,
                numero: s.numero || s.numero_nfe,
                valor: s.valor || 0,
                emitente: s.emitente || s.emitente_nome,
                modelo: s.modelo
              })),
              rejeitados: errorsList.map(e => ({
                arquivo: e.arquivo || e.filename,
                motivo: e.motivo || e.erro || e.error || 'Erro desconhecido'
              })),
              alertas_cfop: data.results.alertas_cfop || [],
              duplicadas: data.results.duplicadas || [],
              rejeitadas_cnpj: data.results.rejeitadas_cnpj || [],
              performance: data.results.performance || {}
            });
            setShowUploadResult(true);
            setUploading(false);
            fetchDocuments();
          } else if (data.error) {
            if (pollingInterval) clearInterval(pollingInterval);
            setUploadResult({
              tipo: 'erro',
              total: files.length,
              sucesso: 0,
              erros: files.length,
              processados: [],
              rejeitados: [{ arquivo: 'Erro', motivo: data.error }]
            });
            setShowUploadResult(true);
            setUploading(false);
          } else {
            const processed = data.processed_files || 0;
            const total = data.total_files || files.length;
            const percent = data.progress_percent || Math.round((processed / total) * 100);
            
            setUploadProgress({
              current: processed,
              total: total,
              percent: percent
            });
            
            // Atualizar progresso global
            updateGlobalProgress(percent, processed, total);
          }
        } catch (pollError) {
          console.error('Erro no polling:', pollError);
        }
      };
      
      // 2. Tentar SSE primeiro, com fallback para polling
      let eventSource = null;
      try {
        eventSource = new EventSource(`${BACKEND_URL}/api/xml/upload-progress/${uploadId}`);
        eventSourceRef.current = eventSource;
        
        // Timeout para verificar se SSE está funcionando
        const sseTimeout = setTimeout(() => {
          if (!sseWorking) {
            console.log('SSE não respondeu, ativando polling...');
            if (eventSource) eventSource.close();
            pollingInterval = setInterval(pollProgress, 500);
          }
        }, 3000);
        
        eventSource.onmessage = (event) => {
          try {
            sseWorking = true;
            clearTimeout(sseTimeout);
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            
            const data = JSON.parse(event.data);
            console.log('SSE Event:', data);
            
            if (data.completed === true && data.results) {
              setUploadProgress({ current: files.length, total: files.length, percent: 100 });
              
              // Mapear campos do backend para o formato esperado pelo modal
              const resumo = data.results.resumo || {};
              const successList = data.results.success || [];
              const errorsList = [
                ...(data.results.errors || []),
                ...(data.results.duplicadas || []).map(d => ({ arquivo: d.arquivo || d.filename, motivo: 'Documento duplicado', numero: d.numero })),
                ...(data.results.rejeitadas_cnpj || []).map(d => ({ arquivo: d.arquivo || d.filename, motivo: `CNPJ não corresponde à empresa (encontrado: ${d.cnpj_encontrado})` }))
              ];
              
              setUploadResult({
                tipo: 'xml',
                total: resumo.total_arquivos || files.length,
                sucesso: resumo.importados || successList.length,
                erros: (resumo.erros || 0) + (resumo.duplicados || 0) + (resumo.rejeitados_cnpj || 0),
                processados: successList.map(s => ({
                  arquivo: s.arquivo || s.filename,
                  numero: s.numero || s.numero_nfe,
                  valor: s.valor || 0,
                  emitente: s.emitente || s.emitente_nome,
                  modelo: s.modelo
                })),
                rejeitados: errorsList.map(e => ({
                  arquivo: e.arquivo || e.filename,
                  motivo: e.motivo || e.erro || e.error || 'Erro desconhecido'
                })),
                alertas_cfop: data.results.alertas_cfop || [],
                duplicadas: data.results.duplicadas || [],
                rejeitadas_cnpj: data.results.rejeitadas_cnpj || [],
                performance: data.results.performance || {}
              });
              setShowUploadResult(true);
              setUploading(false);
              finishGlobalUpload(); // Finalizar progresso global
              fetchDocuments();
              eventSource.close();
              eventSourceRef.current = null;
            } else if (data.error) {
              setUploadResult({
                tipo: 'erro',
                total: files.length,
                sucesso: 0,
                erros: files.length,
                processados: [],
                rejeitados: [{ arquivo: 'Erro', motivo: data.error }]
              });
              setShowUploadResult(true);
              setUploading(false);
              eventSource.close();
              eventSourceRef.current = null;
            } else {
              const processed = data.processed_files || 0;
              const total = data.total_files || files.length;
              const percent = data.progress_percent || Math.round((processed / total) * 100);
              
              setUploadProgress({
                current: processed,
                total: total,
                percent: percent
              });
            }
          } catch (e) {
            console.error('Erro ao processar evento SSE:', e);
          }
        };
        
        eventSource.onerror = () => {
          console.error('Erro na conexão SSE, ativando polling...');
          clearTimeout(sseTimeout);
          if (eventSource) eventSource.close();
          if (!pollingInterval) {
            pollingInterval = setInterval(pollProgress, 500);
          }
        };
      } catch (sseError) {
        console.error('Falha ao criar EventSource:', sseError);
        pollingInterval = setInterval(pollProgress, 500);
      }
      
      // 3. Enviar arquivos em lotes
      const BATCH_SIZE = 100; // Aumentado para reduzir número de requisições
      let batchErrors = 0;
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        formData.append('upload_id', uploadId);
        
        batch.forEach(file => {
          formData.append('files', file);
        });
        
        try {
          await axios.post(`${API}/xml/upload-stream`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            timeout: 120000 // 2 minutos por lote
          });
        } catch (batchErr) {
          console.warn(`Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, batchErr.message);
          batchErrors++;
          // Continuar com o próximo lote mesmo com erro
        }
      }
      
      // 4. Aguardar o polling/SSE detectar a conclusão (fallback de segurança)
      // Esperar mais tempo para uploads grandes
      const waitTime = Math.min(10000, Math.max(3000, files.length * 2));
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Verificar se o resultado já foi processado pelo SSE/polling
      if (!showUploadResult) {
        // Buscar resultado manualmente como fallback (com retry)
        let retries = 3;
        let resultFound = false;
        
        while (retries > 0 && !resultFound) {
          try {
            const statusResponse = await axios.get(`${API}/xml/upload-status/${uploadId}`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 30000
            });
            const data = statusResponse.data;
            
            if (data.completed && data.results) {
              const resumo = data.results.resumo || {};
              const successList = data.results.success || [];
              const errorsList = [
                ...(data.results.errors || []),
                ...(data.results.duplicadas || []).map(d => ({ arquivo: d.arquivo || d.filename, motivo: 'Documento duplicado', numero: d.numero })),
                ...(data.results.rejeitadas_cnpj || []).map(d => ({ arquivo: d.arquivo || d.filename, motivo: `CNPJ não corresponde à empresa (encontrado: ${d.cnpj_encontrado})` }))
              ];
              
              setUploadResult({
                tipo: 'xml',
                total: resumo.total_arquivos || files.length,
                sucesso: resumo.importados || successList.length,
                erros: (resumo.erros || 0) + (resumo.duplicados || 0) + (resumo.rejeitados_cnpj || 0),
                processados: successList.map(s => ({
                  arquivo: s.arquivo || s.filename,
                  numero: s.numero || s.numero_nfe,
                  valor: s.valor || 0,
                  emitente: s.emitente || s.emitente_nome,
                  modelo: s.modelo
                })),
                rejeitados: errorsList.map(e => ({
                  arquivo: e.arquivo || e.filename,
                  motivo: e.motivo || e.erro || e.error || 'Erro desconhecido'
                })),
                alertas_cfop: data.results.alertas_cfop || [],
                duplicadas: data.results.duplicadas || [],
                rejeitadas_cnpj: data.results.rejeitadas_cnpj || [],
                performance: data.results.performance || {}
              });
              setShowUploadResult(true);
              setUploading(false);
              resultFound = true;
              
              // Limpar SSE/polling
              if (eventSource) eventSource.close();
              if (pollingInterval) clearInterval(pollingInterval);
              
              fetchDocuments();
            } else if (!data.completed) {
              // Ainda processando, aguardar mais
              await new Promise(resolve => setTimeout(resolve, 3000));
              retries--;
            }
          } catch (fallbackErr) {
            console.error(`Erro ao buscar resultado (tentativa ${4 - retries}/3):`, fallbackErr);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
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
      setUploading(false);
      finishGlobalUpload(); // Finalizar progresso global em caso de erro
    }
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

  // Função de verificação de divergência - CRITÉRIO UNIFICADO
  // Definida antes do useMemo que a utiliza
  const verificarDivergenciaDoc = (doc) => {
    if (doc.produtos && doc.produtos.length > 0) {
      // Soma dos valores dos produtos
      const somaProdutos = doc.produtos.reduce((sum, p) => {
        const valorProd = parseFloat(p.valor_total) || parseFloat(p.valor_produto) || 0;
        return sum + valorProd;
      }, 0);
      
      // Valor total do documento
      const valorDoc = parseFloat(doc.valor_total) || 0;
      
      // Considerar validado se diferença for menor que R$ 0.10 (tolerância)
      const diferenca = Math.abs(valorDoc - somaProdutos);
      return diferenca >= 0.10; // true = tem divergência
    }
    // Documento sem produtos = sem divergência
    return false;
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
    
    // Filtro por divergência - USANDO CRITÉRIO UNIFICADO
    if (filterDivergencia !== 'all') {
      filtered = filtered.filter(doc => {
        // Usar a mesma lógica da barra de validação
        const temDivergencia = verificarDivergenciaDoc(doc);
        
        if (filterDivergencia === 'divergente') return temDivergencia;
        if (filterDivergencia === 'ok') return !temDivergencia;
        return true;
      });
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
  }, [documents, searchTerm, sortField, sortDirection, filterDivergencia]);

  // Calcular totais dos documentos filtrados
  const totais = useMemo(() => {
    const total = filteredDocuments.reduce((sum, doc) => sum + (parseFloat(doc.valor_total) || 0), 0);
    return {
      quantidade: filteredDocuments.length,
      valorTotal: total
    };
  }, [filteredDocuments]);

  // Extrair CFOPs únicos e classificações de um documento
  const getDocumentCfops = (doc) => {
    if (!doc.produtos || doc.produtos.length === 0) return [];
    const cfops = [...new Set(doc.produtos.map(p => p.cfop).filter(Boolean))];
    return cfops.sort();
  };

  const getDocumentClassificacoes = (doc) => {
    if (!doc.produtos || doc.produtos.length === 0) return [];
    const categorias = doc.produtos.map(p => p.categoria_classificada || 'pendente');
    const uniqueCategorias = [...new Set(categorias)];
    return uniqueCategorias;
  };

  // Função para renderizar badge de classificação
  const renderClassificacaoBadge = (categoria) => {
    const styles = {
      revenda: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      insumo: 'bg-green-500/20 text-green-400 border-green-500/30',
      despesa: 'bg-red-500/20 text-red-400 border-red-500/30',
      ativo_imobilizado: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      combustivel: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      pendente: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    const labels = {
      revenda: 'REV',
      insumo: 'INS',
      despesa: 'DES',
      ativo_imobilizado: 'ATI',
      combustivel: 'CMB',
      pendente: 'PEN'
    };
    return (
      <span 
        key={categoria} 
        className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${styles[categoria] || styles.pendente}`}
        title={categoria}
      >
        {labels[categoria] || 'PEN'}
      </span>
    );
  };

  const validacaoNotas = useMemo(() => {
    let validadas = 0;
    let comDivergencia = 0;
    
    // Usar TODOS os documentos para o cálculo total da barra
    documents.forEach(doc => {
      if (verificarDivergenciaDoc(doc)) {
        comDivergencia++;
      } else {
        validadas++;
      }
    });
    
    return {
      total: documents.length,
      validadas,
      comDivergencia,
      percentual: documents.length > 0 ? Math.round((validadas / documents.length) * 100) : 0
    };
  }, [documents]);

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

  // ========== SIEG ==========
  
  // Verificar quantidade de XMLs disponíveis no SIEG
  const handleCheckSieg = async () => {
    if (!ctxCompany || !selectedCompetencia) return;
    setSiegResult(null);
    await checkSiegCount(ctxCompany.id, selectedCompetencia);
  };

  // Sincronizar XMLs do SIEG
  const handleSyncSieg = async () => {
    if (!ctxCompany || !selectedCompetencia) return;
    
    setSiegProgress({ step: 'Iniciando...', percent: 0 });
    setSiegResult(null);
    
    try {
      const result = await syncFromSieg(ctxCompany.id, selectedCompetencia, (progressData) => {
        setSiegProgress({
          step: progressData.step || '',
          percent: progressData.progress_percent || 0
        });
      });
      setSiegResult(result);
      // Recarregar documentos após sincronização bem-sucedida
      if (operacao && tipoDoc) {
        fetchDocuments();
      }
    } catch (err) {
      setSiegResult({ error: err.response?.data?.detail || err.message || 'Erro na sincronização' });
    } finally {
      setSiegProgress({ step: '', percent: 0 });
    }
  };

  // Verificar SIEG ao mudar empresa/competência
  useEffect(() => {
    if (ctxCompany && selectedCompetencia) {
      handleCheckSieg();
    }
  }, [ctxCompany?.id, selectedCompetencia]);

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

          {/* Sincronização SIEG */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Cloud className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      SIEG Soluções
                      {siegStatus?.count && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                          {(siegStatus.count.entrada?.total || 0) + (siegStatus.count.saida?.total || 0)} novos
                        </span>
                      )}
                    </h3>
                    <p className="text-[#A1A1AA] text-sm">Importar XMLs automaticamente do cofre SIEG</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheckSieg}
                    disabled={siegSyncing}
                    className="px-4 py-2 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${siegSyncing ? 'animate-spin' : ''}`} />
                    Verificar
                  </button>
                  <button
                    onClick={handleSyncSieg}
                    disabled={siegSyncing || !siegStatus?.count}
                    className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Sincronizar
                  </button>
                </div>
              </div>
              
              {/* Progress bar durante sincronização */}
              {siegSyncing && siegProgress?.step && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-purple-300">{siegProgress.step}</span>
                    <span className="text-[#A1A1AA]">{siegProgress.percent}%</span>
                  </div>
                  <div className="h-2 bg-purple-500/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${siegProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Resultado da sincronização */}
              {siegResult && (
                <div className={`mt-4 pt-4 border-t border-purple-500/20 text-sm ${siegResult.error ? 'text-red-400' : 'text-emerald-400'}`}>
                  {siegResult.error ? (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {siegResult.error}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Sincronização concluída! {siegResult.entrada?.importados || 0} entradas e {siegResult.saida?.importados || 0} saídas importadas.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botões de Operação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-8">
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
    
    // Filtrar tipos de documento pela atividade da empresa
    const atividadeEmpresa = ctxCompany?.tipo_atividade || 'comercio';
    const temLocacao = ctxCompany?.atividade_locacao || false;
    
    const tiposFiltrados = categoria.tipos.filter(tipo => {
      // Se não tem filtro de atividade, mostra sempre
      if (!tipo.atividades) return true;
      // Verificar se é tipo de locação e empresa tem atividade de locação
      if (tipo.atividades.includes('locacao') && temLocacao) return true;
      // Mostra se a atividade da empresa está na lista de atividades do tipo
      return tipo.atividades.includes(atividadeEmpresa);
    });
    
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
            {tiposFiltrados.map((tipo) => {
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
          
          {/* Info sobre atividade */}
          {tiposFiltrados.length < categoria.tipos.length && (
            <div className="text-center text-sm text-[#666] mt-4">
              <p>Exibindo opções para: <span className="text-[#A1A1AA]">{atividadeEmpresa.toUpperCase()}</span></p>
            </div>
          )}
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

          {/* Totalizador, Filtros e Busca em linha */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Totalizador - mostra "X de Y" quando há filtro */}
              <div className="flex items-center gap-4 py-2 px-3 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#A1A1AA]" />
                  <span className="text-sm text-[#A1A1AA]">Docs:</span>
                  {(filterDivergencia !== 'all' || searchTerm) ? (
                    <span className="text-sm font-semibold">
                      <span className="text-[#C8A951]">{totais.quantidade}</span>
                      <span className="text-[#A1A1AA]"> de </span>
                      <span className="text-white">{documents.length}</span>
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-white">{totais.quantidade}</span>
                  )}
                </div>
                <div className="w-px h-4 bg-[#2A2A2A]" />
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#A1A1AA]" />
                  <span className="text-sm font-semibold text-[#C8A951]">{formatCurrency(totais.valorTotal)}</span>
                </div>
              </div>
              
              {/* Filtro de Divergências */}
              <div className="flex items-center gap-1 p-1 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <button
                  onClick={() => setFilterDivergencia('all')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    filterDivergencia === 'all' 
                      ? 'bg-[#C8A951]/20 text-[#C8A951]' 
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterDivergencia('divergente')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    filterDivergencia === 'divergente' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  Divergente
                </button>
                <button
                  onClick={() => setFilterDivergencia('ok')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    filterDivergencia === 'ok' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  OK
                </button>
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

          {/* Barra de Validação */}
          {filteredDocuments.length > 0 && (
            <div className="mt-3">
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${
                validacaoNotas.percentual === 100 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : validacaoNotas.percentual >= 80 
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {validacaoNotas.percentual === 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    validacaoNotas.percentual === 100 ? 'text-green-400' : 'text-amber-400'
                  }`}>
                    Validação de Notas
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white">
                    <span className="text-green-400 font-semibold">{validacaoNotas.validadas}</span>
                    <span className="text-[#A1A1AA]"> de </span>
                    <span className="font-semibold">{validacaoNotas.total}</span>
                    <span className="text-[#A1A1AA]"> notas validadas</span>
                  </span>
                  {validacaoNotas.comDivergencia > 0 && (
                    <span className="text-sm text-amber-400">
                      ({validacaoNotas.comDivergencia} com divergência)
                    </span>
                  )}
                  <div className="w-32 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        validacaoNotas.percentual === 100 ? 'bg-green-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${validacaoNotas.percentual}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${
                    validacaoNotas.percentual === 100 ? 'text-green-400' : 'text-amber-400'
                  }`}>
                    {validacaoNotas.percentual}%
                  </span>
                </div>
              </div>
            </div>
          )}
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
                        className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white w-20"
                        onClick={() => handleSort('numero_nfe')}
                      >
                        <div className="flex items-center gap-1">
                          Número
                          {sortField === 'numero_nfe' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white"
                        onClick={() => handleSort(operacao === 'entrada' ? 'emitente_nome' : 'destinatario_nome')}
                      >
                        <div className="flex items-center gap-1">
                          {operacao === 'entrada' ? 'Emitente' : 'Destinatário'}
                          {(sortField === 'emitente_nome' || sortField === 'destinatario_nome') && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white hidden lg:table-cell w-32"
                        onClick={() => handleSort(operacao === 'entrada' ? 'emitente_cnpj' : 'destinatario_cnpj')}
                      >
                        <div className="flex items-center gap-1">
                          CNPJ
                          {(sortField === 'emitente_cnpj' || sortField === 'destinatario_cnpj') && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-left px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white w-24 hidden md:table-cell"
                        onClick={() => handleSort('data_emissao')}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          {sortField === 'data_emissao' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-left px-2 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white hidden xl:table-cell w-28"
                        onClick={() => handleSort('cfops')}
                      >
                        <div className="flex items-center gap-1">
                          CFOPs
                          {sortField === 'cfops' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-left px-2 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white hidden xl:table-cell w-32"
                        onClick={() => handleSort('status_validacao')}
                      >
                        <div className="flex items-center gap-1">
                          Classif.
                          {sortField === 'status_validacao' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="text-right px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-white w-28"
                        onClick={() => handleSort('valor_total')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Valor
                          {sortField === 'valor_total' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="text-center px-2 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider w-16">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#A1A1AA] uppercase tracking-wider w-20">
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
                          <p className="text-white truncate max-w-[180px]">
                            {operacao === 'entrada' ? doc.emitente_nome : doc.destinatario_nome}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell w-32">
                          <span className="text-[#A1A1AA] font-mono text-xs">
                            {operacao === 'entrada' ? doc.emitente_cnpj : doc.destinatario_cnpj}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA] w-24 hidden md:table-cell">
                          {formatDate(doc.data_emissao)}
                        </td>
                        {/* CFOPs */}
                        <td className="px-2 py-3 hidden xl:table-cell w-28">
                          <div className="flex flex-wrap gap-1">
                            {getDocumentCfops(doc).slice(0, 3).map(cfop => (
                              <span key={cfop} className="px-1.5 py-0.5 text-[10px] font-mono bg-[#2A2A2A] text-[#A1A1AA] rounded">
                                {cfop}
                              </span>
                            ))}
                            {getDocumentCfops(doc).length > 3 && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-[#2A2A2A] text-[#666] rounded">
                                +{getDocumentCfops(doc).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Classificações */}
                        <td className="px-2 py-3 hidden xl:table-cell w-32">
                          <div className="flex flex-wrap gap-1">
                            {getDocumentClassificacoes(doc).map(cat => renderClassificacaoBadge(cat))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right w-28">
                          <span className="text-[#C8A951] font-medium">
                            {formatCurrency(doc.valor_total)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center w-16">
                          {doc.cancelada ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-xs" title="Cancelada">
                              <XCircle className="w-3 h-3" />
                            </span>
                          ) : doc.status === 'autorizada' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs" title="Autorizada">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs" title="Pendente">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right w-20">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => fetchDocumentDetail(doc.id)}
                              className="p-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.numero_nfe)}
                              className="p-1.5 text-[#A1A1AA] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
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

        {/* Modal de detalhes - Usando novo componente */}
        {selectedDocument && (
          <DocumentDetailModal 
            document={selectedDocument} 
            onClose={() => setSelectedDocument(null)} 
          />
        )}

        {/* Barra de progresso agora está no Layout.js - GLOBAL */}

        {/* Modal de Resultado do Upload */}
        {showUploadResult && uploadResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  {(uploadResult.erros || 0) === 0 ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  ) : (uploadResult.sucesso || 0) === 0 ? (
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
                      Relatório de Importação
                    </h2>
                    <p className="text-sm text-[#A1A1AA]">
                      {uploadResult.tipo === 'ia' ? 'Processamento com IA' : 
                       uploadResult.tipo === 'erro' ? 'Erro na importação' : 
                       'Importação de XML'}
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
              
              {/* Resumo com números grandes */}
              <div className="p-4 border-b border-[#2A2A2A]">
                <div className={`grid ${uploadResult.canceladas ? 'grid-cols-4' : 'grid-cols-3'} gap-4`}>
                  <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">{uploadResult.total || (uploadResult.processados?.length || 0) + (uploadResult.rejeitados?.length || 0)}</p>
                    <p className="text-sm text-[#A1A1AA] mt-1">Total</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-lg p-4 text-center border border-emerald-500/20">
                    <p className="text-3xl font-bold text-emerald-400">{uploadResult.sucesso || uploadResult.processados?.length || 0}</p>
                    <p className="text-sm text-emerald-400 mt-1">Aceitos</p>
                  </div>
                  {uploadResult.canceladas > 0 && (
                    <div className="bg-amber-500/10 rounded-lg p-4 text-center border border-amber-500/20">
                      <p className="text-3xl font-bold text-amber-400">{uploadResult.canceladas}</p>
                      <p className="text-sm text-amber-400 mt-1">Canceladas</p>
                    </div>
                  )}
                  <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                    <p className="text-3xl font-bold text-red-400">{uploadResult.erros || 0}</p>
                    <p className="text-sm text-red-400 mt-1">Rejeitados</p>
                  </div>
                </div>
                
                {/* Valor total importado */}
                {uploadResult.processados && uploadResult.processados.length > 0 && (
                  <div className="mt-4 p-3 bg-[#C8A951]/10 border border-[#C8A951]/30 rounded-lg text-center">
                    <p className="text-sm text-[#A1A1AA]">Valor Total Importado</p>
                    <p className="text-2xl font-bold text-[#C8A951]">
                      {formatCurrency(uploadResult.processados.reduce((sum, item) => sum + (item.valor || 0), 0))}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 max-h-[40vh] overflow-y-auto space-y-4">
                {/* Arquivos aceitos */}
                {uploadResult.processados && uploadResult.processados.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Documentos Importados ({uploadResult.processados.length})
                    </h3>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {uploadResult.processados.map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between py-2 px-3 rounded border ${
                          item.status === 'cancelada' 
                            ? 'bg-amber-500/5 border-amber-500/20' 
                            : 'bg-emerald-500/5 border-emerald-500/20'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate flex items-center gap-2">
                              {item.arquivo || `Documento ${idx + 1}`}
                              {item.status === 'cancelada' && (
                                <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                                  Cancelada
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[#A1A1AA]">
                              {item.emitente && `${item.emitente} • `}
                              {item.numero && `NF-e Nº ${item.numero}`}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-[#C8A951] ml-2">
                            {formatCurrency(item.valor || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Arquivos rejeitados */}
                {uploadResult.rejeitados && uploadResult.rejeitados.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Documentos Rejeitados ({uploadResult.rejeitados.length})
                    </h3>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {uploadResult.rejeitados.map((item, idx) => (
                        <div key={idx} className="py-2 px-3 bg-red-500/5 rounded border border-red-500/20">
                          <p className="text-sm text-white">{item.arquivo || `Arquivo ${idx + 1}`}</p>
                          <p className="text-xs text-red-400 mt-1">{item.motivo || 'Motivo não informado'}</p>
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
                
                {/* Mensagem se não houver nenhum dado */}
                {(!uploadResult.processados || uploadResult.processados.length === 0) && 
                 (!uploadResult.rejeitados || uploadResult.rejeitados.length === 0) && (
                  <div className="text-center py-8 text-[#A1A1AA]">
                    <p>Nenhum detalhe disponível</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-[#2A2A2A] flex gap-3">
                {/* Botão de Download do Relatório - CSV */}
                {((uploadResult.processados && uploadResult.processados.length > 0) || 
                  (uploadResult.rejeitados && uploadResult.rejeitados.length > 0)) && (
                  <>
                    <button
                      onClick={() => {
                        // Gerar CSV do relatório
                        let csv = 'Status,Arquivo,Número,Emitente,Valor,Motivo\n';
                        
                        if (uploadResult.processados) {
                          uploadResult.processados.forEach(item => {
                            csv += `Aceito,"${item.arquivo || ''}","${item.numero || ''}","${item.emitente || ''}",${item.valor || 0},""\n`;
                          });
                        }
                        
                        if (uploadResult.rejeitados) {
                          uploadResult.rejeitados.forEach(item => {
                            csv += `Rejeitado,"${item.arquivo || ''}","","","","${(item.motivo || '').replace(/"/g, '""')}"\n`;
                          });
                        }
                        
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `relatorio_importacao_${new Date().toISOString().slice(0,10)}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="py-2.5 px-4 bg-[#2A2A2A] text-white rounded-lg font-medium hover:bg-[#333] transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    
                    {/* Botão de Download Word */}
                    <button
                      onClick={async () => {
                        try {
                          const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = await import('docx');
                          const { saveAs } = await import('file-saver');
                          
                          const rows = [];
                          
                          // Header
                          rows.push(new TableRow({
                            children: ['Status', 'Arquivo', 'Número', 'Emitente', 'Valor', 'Motivo'].map(text => 
                              new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                                shading: { fill: 'C8A951' }
                              })
                            )
                          }));
                          
                          // Aceitos
                          if (uploadResult.processados) {
                            uploadResult.processados.forEach(item => {
                              rows.push(new TableRow({
                                children: [
                                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Aceito', color: '22C55E' })] })] }),
                                  new TableCell({ children: [new Paragraph(item.arquivo || '')] }),
                                  new TableCell({ children: [new Paragraph(item.numero || '')] }),
                                  new TableCell({ children: [new Paragraph(item.emitente || '')] }),
                                  new TableCell({ children: [new Paragraph(formatCurrency(item.valor || 0))] }),
                                  new TableCell({ children: [new Paragraph('')] })
                                ]
                              }));
                            });
                          }
                          
                          // Rejeitados
                          if (uploadResult.rejeitados) {
                            uploadResult.rejeitados.forEach(item => {
                              rows.push(new TableRow({
                                children: [
                                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rejeitado', color: 'EF4444' })] })] }),
                                  new TableCell({ children: [new Paragraph(item.arquivo || '')] }),
                                  new TableCell({ children: [new Paragraph('')] }),
                                  new TableCell({ children: [new Paragraph('')] }),
                                  new TableCell({ children: [new Paragraph('')] }),
                                  new TableCell({ children: [new Paragraph(item.motivo || '')] })
                                ]
                              }));
                            });
                          }
                          
                          const doc = new Document({
                            sections: [{
                              children: [
                                new Paragraph({
                                  children: [new TextRun({ text: 'Relatório de Importação', bold: true, size: 32 })],
                                  alignment: AlignmentType.CENTER
                                }),
                                new Paragraph({
                                  children: [new TextRun({ text: `Empresa: ${ctxCompany?.razao_social || ''} | Competência: ${selectedCompetencia}`, size: 20 })],
                                  alignment: AlignmentType.CENTER
                                }),
                                new Paragraph({ children: [] }),
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: `Total: ${uploadResult.total || 0}  |  ` }),
                                    new TextRun({ text: `Aceitos: ${uploadResult.sucesso || uploadResult.processados?.length || 0}`, color: '22C55E' }),
                                    new TextRun({ text: `  |  Rejeitados: ${uploadResult.erros || 0}`, color: 'EF4444' })
                                  ]
                                }),
                                new Paragraph({ children: [] }),
                                new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } })
                              ]
                            }]
                          });
                          
                          const { Packer } = await import('docx');
                          const blob = await Packer.toBlob(doc);
                          saveAs(blob, `relatorio_importacao_${new Date().toISOString().slice(0,10)}.docx`);
                        } catch (err) {
                          console.error('Erro ao gerar Word:', err);
                          alert('Erro ao gerar documento Word');
                        }
                      }}
                      className="py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Word
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setShowUploadResult(false)}
                  className="flex-1 py-2.5 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#D4B85C] transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cancelamento de NFS-e */}
        <NfseCancellationModal
          isOpen={showNfseCancellation}
          onClose={() => {
            setShowNfseCancellation(false);
            setNfseFilesForCancellation([]);
          }}
          files={nfseFilesForCancellation}
          companyId={ctxCompany?.id}
          competencia={selectedCompetencia}
          tipo={operacao}
          onImportComplete={handleNfseImportComplete}
        />

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
                {/* Opção Apagar Tudo */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-red-400">Apagar Todos</h3>
                      <p className="text-xs text-[#A1A1AA] mt-1">
                        Exclui todos os documentos de {getTipoConfig()?.label} desta competência
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const tipoConfig = getTipoConfig();
                        const token = localStorage.getItem('token');
                        
                        try {
                          // Buscar contagem
                          const previewResponse = await axios.post(`${API}/xml/documents/preview-delete`, {
                            company_id: ctxCompany.id,
                            competencia: selectedCompetencia,
                            tipo_operacao: operacao,
                            tipo_documento: tipoConfig.modelo
                          }, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          
                          const totalDocs = previewResponse.data.total_documentos;
                          const totalValor = previewResponse.data.total_valor;
                          
                          if (totalDocs === 0) {
                            alert(`Não há documentos de ${tipoConfig.label} para excluir.`);
                            return;
                          }
                          
                          const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor);
                          
                          if (!window.confirm(
                            `⚠️ ATENÇÃO!\n\n` +
                            `Você está prestes a excluir TODOS os documentos de ${tipoConfig.label}:\n\n` +
                            `📄 ${totalDocs} documento(s)\n` +
                            `💰 ${valorFormatado}\n\n` +
                            `Empresa: ${ctxCompany.razao_social}\n` +
                            `Competência: ${selectedCompetencia}\n\n` +
                            `Esta ação NÃO pode ser desfeita!\n\n` +
                            `Deseja continuar?`
                          )) {
                            return;
                          }
                          
                          if (!window.confirm(
                            `ÚLTIMA CONFIRMAÇÃO\n\n` +
                            `Clique OK para excluir ${totalDocs} documentos de ${tipoConfig.label}.`
                          )) {
                            return;
                          }
                          
                          // Executar exclusão
                          const deleteResponse = await axios.post(`${API}/xml/documents/delete-bulk`, {
                            company_id: ctxCompany.id,
                            competencia: selectedCompetencia,
                            tipo_operacao: operacao,
                            tipo_documento: tipoConfig.modelo,
                            document_ids: previewResponse.data.ids_para_excluir
                          }, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          
                          alert(`✅ ${deleteResponse.data.deleted_count} documento(s) excluído(s) com sucesso!`);
                          setShowDeleteModal(false);
                          fetchDocuments();
                          
                        } catch (err) {
                          console.error('Erro ao excluir:', err);
                          alert('Erro ao excluir documentos: ' + (err.response?.data?.detail || err.message));
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Apagar Todos
                    </button>
                  </div>
                </div>
                
                {/* Divisor */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-[#2A2A2A]"></div>
                  <span className="text-xs text-[#A1A1AA]">ou use filtros</span>
                  <div className="flex-1 h-px bg-[#2A2A2A]"></div>
                </div>
                
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
