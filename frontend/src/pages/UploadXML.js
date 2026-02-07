import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Upload, FileText, Check, AlertCircle, Sparkles, Calendar, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useUpload } from '../context/UploadContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const UploadXML = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  const { 
    isUploading: globalUploading, 
    progress: globalProgress, 
    uploadResults: globalResults,
    uploadError: globalError,
    startUpload: startGlobalUpload,
    clearResults: clearGlobalResults
  } = useUpload();
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  
  // Progress state (local, usado quando não estiver usando o global)
  const [progress, setProgress] = useState({
    percent: 0,
    currentFile: '',
    currentStep: '',
    processedFiles: 0,
    totalFiles: 0
  });
  
  const eventSourceRef = useRef(null);

  useEffect(() => {
    fetchCompanies();
    return () => {
      // Cleanup SSE connection on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // Sincronizar resultados do upload global - SEMPRE que a página carrega
  useEffect(() => {
    if (globalResults) {
      setResults(globalResults);
      setUploading(false);
    }
    if (globalUploading) {
      setUploading(true);
    }
  }, [globalResults, globalUploading]);
  
  // Sincronizar estado de uploading global
  useEffect(() => {
    if (globalUploading) {
      setUploading(true);
      setProgress({
        percent: globalProgress.percent,
        currentFile: '',
        currentStep: 'Processando...',
        processedFiles: globalProgress.current,
        totalFiles: globalProgress.total
      });
    } else if (globalResults) {
      setUploading(false);
      setResults(globalResults);
    }
  }, [globalUploading, globalProgress, globalResults]);

  // SEMPRE priorizar empresa/competência do contexto global
  useEffect(() => {
    if (ctxCompany) {
      setSelectedCompany(ctxCompany.id);
    }
    if (ctxCompetencia) {
      setCompetencia(ctxCompetencia);
    } else if (!competencia) {
      // Fallback para data atual se não houver contexto
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCompetencia(month + '/' + year);
    }
  }, [ctxCompany, ctxCompetencia]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/companies', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setCompanies(response.data);
      // Não sobrescrever se já tiver empresa do contexto
      if (response.data.length > 0 && !ctxCompany) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setResults(null);
    setProgress({
      percent: 0,
      currentFile: '',
      currentStep: '',
      processedFiles: 0,
      totalFiles: 0
    });
  };

  // Constante para tamanho do lote
  // Reduzido para 500 para evitar timeouts e problemas de conexão
  const BATCH_SIZE = 500;

  const handleUpload = async () => {
    if (!selectedCompany || files.length === 0 || !competencia) {
      alert('Selecione empresa, competência e pelo menos um arquivo XML');
      return;
    }

    const company = companies.find(c => c.id === selectedCompany);
    const empresaNome = company?.razao_social || company?.nome_fantasia || 'Empresa';
    
    // Usar upload global para permitir navegação durante o processo
    const success = await startGlobalUpload(files, selectedCompany, competencia, empresaNome);
    
    if (success) {
      // Limpar arquivos selecionados
      setFiles([]);
    }
  };

  // Manter função antiga como backup (não usada por padrão)
  const handleUploadLegacy = async () => {
    if (!selectedCompany || files.length === 0 || !competencia) {
      alert('Selecione empresa, competência e pelo menos um arquivo XML');
      return;
    }

    setUploading(true);
    setResults(null);
    
    const totalFiles = files.length;
    const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
    
    setProgress({
      percent: 0,
      currentFile: '',
      currentStep: totalBatches > 1 
        ? `Preparando upload em ${totalBatches} lotes de até ${BATCH_SIZE} arquivos...`
        : 'Iniciando upload...',
      processedFiles: 0,
      totalFiles: totalFiles,
      currentBatch: 1,
      totalBatches: totalBatches
    });

    const token = localStorage.getItem('token');
    let allResults = {
      total: 0,
      success: 0,
      errors: 0,
      already_exists: 0,
      conversions: [],
      error_details: [],
      exists_details: []
    };

    try {
      // Processar em lotes de BATCH_SIZE
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, totalFiles);
        const batchFiles = files.slice(start, end);
        const currentBatch = batchIndex + 1;
        
        setProgress(prev => ({
          ...prev,
          currentStep: totalBatches > 1 
            ? `Processando lote ${currentBatch} de ${totalBatches} (${batchFiles.length} arquivos)...`
            : 'Iniciando upload...',
          currentBatch: currentBatch
        }));

        // 1. Iniciar sessão de upload para este lote
        const initFormData = new FormData();
        initFormData.append('company_id', selectedCompany);
        initFormData.append('competencia', competencia);
        initFormData.append('tipo', tipo);
        initFormData.append('total_files', batchFiles.length);

        const initResponse = await axios.post(API + '/xml/upload-init', initFormData, {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'multipart/form-data'
          }
        });

        const uploadId = initResponse.data.upload_id;

        // 2. Criar promise para aguardar conclusão do lote
        const batchResult = await new Promise((resolve, reject) => {
          // Conectar ao SSE para receber progresso
          const eventSource = new EventSource(`${API}/xml/upload-progress/${uploadId}`);
          eventSourceRef.current = eventSource;

          eventSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              
              // Calcular progresso global considerando lotes anteriores
              const filesProcessedInPreviousBatches = batchIndex * BATCH_SIZE;
              const currentTotalProcessed = filesProcessedInPreviousBatches + (data.processed_files || 0);
              const globalPercent = Math.round((currentTotalProcessed / totalFiles) * 100);
              
              setProgress({
                percent: globalPercent,
                currentFile: data.current_file || '',
                currentStep: totalBatches > 1 
                  ? `Lote ${currentBatch}/${totalBatches}: ${data.current_step || ''}`
                  : (data.current_step || ''),
                processedFiles: currentTotalProcessed,
                totalFiles: totalFiles,
                currentBatch: currentBatch,
                totalBatches: totalBatches
              });

              if (data.completed && data.results) {
                eventSource.close();
                eventSourceRef.current = null;
                resolve(data.results);
              }

              if (data.error) {
                console.error('SSE Error:', data.error);
                eventSource.close();
                eventSourceRef.current = null;
                reject(new Error(data.error));
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          };

          eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
          };

          // 3. Enviar arquivos do lote
          const uploadFormData = new FormData();
          uploadFormData.append('upload_id', uploadId);
          batchFiles.forEach((file) => {
            uploadFormData.append('files', file);
          });

          axios.post(API + '/xml/upload-stream', uploadFormData, {
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'multipart/form-data'
            }
          }).catch(err => {
            eventSource.close();
            eventSourceRef.current = null;
            reject(err);
          });
        });

        // Agregar resultados do lote
        if (batchResult) {
          console.log(`Lote ${currentBatch} resultado:`, batchResult);
          allResults.total += batchResult.total || 0;
          allResults.success += batchResult.success || 0;
          allResults.errors += batchResult.errors || 0;
          allResults.already_exists += batchResult.already_exists || 0;
          if (batchResult.conversions) {
            allResults.conversions = [...allResults.conversions, ...batchResult.conversions];
          }
          if (batchResult.error_details) {
            allResults.error_details = [...allResults.error_details, ...batchResult.error_details];
          }
          if (batchResult.exists_details) {
            allResults.exists_details = [...allResults.exists_details, ...batchResult.exists_details];
          }
          // Agregar campos extras do backend
          if (batchResult.rejeitadas_cnpj) {
            allResults.rejeitadas_cnpj = [...(allResults.rejeitadas_cnpj || []), ...batchResult.rejeitadas_cnpj];
          }
          if (batchResult.rejeitadas_competencia) {
            allResults.rejeitadas_competencia = [...(allResults.rejeitadas_competencia || []), ...batchResult.rejeitadas_competencia];
          }
          if (batchResult.alertas_cfop) {
            allResults.alertas_cfop = [...(allResults.alertas_cfop || []), ...batchResult.alertas_cfop];
          }
          if (batchResult.relatorio_conversoes) {
            allResults.relatorio_conversoes = [...(allResults.relatorio_conversoes || []), ...batchResult.relatorio_conversoes];
          }
          console.log(`Total acumulado após lote ${currentBatch}:`, allResults.total);
        }
      }

      // Finalizado todos os lotes
      setResults(allResults);
      setUploading(false);
      setFiles([]);
      document.getElementById('file-input').value = '';

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.detail 
        || err.message 
        || 'Erro ao enviar arquivos';
      alert(`Erro no upload: ${errorMessage}\n\nSe o problema persistir, tente com menos arquivos por vez.`);
      setUploading(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  };

  const FileItem = ({ file, index }) => (
    <div key={index} className="flex items-center gap-2 text-sm bg-white p-2 rounded">
      <FileText className="w-4 h-4 text-red-600" />
      <span className="text-gray-700 flex-1">{file.name}</span>
      <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
    </div>
  );

  // Componente da barra de progresso
  const ProgressBar = () => (
    <div data-testid="upload-progress-bar" className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg border-b-2 border-red-600">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4 mb-3">
          <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-gray-900">
                Processando arquivos XML
                {progress.totalBatches > 1 && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    (Lote {progress.currentBatch} de {progress.totalBatches})
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-red-600">
                {progress.percent}%
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {progress.currentStep}
            </p>
          </div>
        </div>
        
        {/* Barra de progresso principal */}
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
          {/* Efeito de brilho animado */}
          <div 
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
            style={{ 
              transform: `translateX(${progress.percent - 100}%)`,
              transition: 'transform 0.3s ease-out'
            }}
          />
        </div>
        
        {/* Info detalhada */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>
            {progress.processedFiles} de {progress.totalFiles} arquivos processados
            {progress.totalBatches > 1 && (
              <span className="ml-2 text-orange-600 font-medium">
                • Upload em lotes de {BATCH_SIZE}
              </span>
            )}
          </span>
          {progress.currentFile && (
            <span className="truncate max-w-xs">
              Arquivo atual: <span className="font-medium text-gray-700">{progress.currentFile}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      {/* Barra de progresso fixa no topo - usa dados do contexto global */}
      {(uploading || globalUploading) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <div>
                  <p className="font-bold">Importando XMLs...</p>
                  <p className="text-sm text-red-200">
                    {globalProgress.current} de {globalProgress.total} arquivos processados
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{globalProgress.percent}%</p>
              </div>
            </div>
            <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${globalProgress.percent}%` }}
              />
            </div>
            <p className="text-xs text-red-200 mt-2">
              💡 Você pode navegar para outras páginas. O progresso será exibido no canto inferior direito.
            </p>
          </div>
        </div>
      )}
      
      <div data-testid="upload-xml-page" className={`space-y-6 max-w-5xl mx-auto ${(uploading || globalUploading) ? 'pt-32' : ''}`}>
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Upload com Análise Inteligente</h1>
          </div>
          <p className="text-red-100">A CONVERSÃO DE CFOP ACONTECE AUTOMATICAMENTE ao fazer o upload! Veja o relatório detalhado após enviar.</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                <select
                  data-testid="select-company-dropdown"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  disabled={uploading}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Competência (Mês/Ano) *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    data-testid="competencia-input"
                    type="text"
                    value={competencia}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="01/2024"
                    maxLength="7"
                    disabled={uploading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Formato: MM/AAAA (Ex: 01/2024)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Operação *</label>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid="tipo-entrada-radio"
                    type="radio"
                    value="entrada"
                    checked={tipo === 'entrada'}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-4 h-4 text-red-600"
                    disabled={uploading}
                  />
                  <span className="text-gray-700">Entrada (Compras)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid="tipo-saida-radio"
                    type="radio"
                    value="saida"
                    checked={tipo === 'saida'}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-4 h-4 text-red-600"
                    disabled={uploading}
                  />
                  <span className="text-gray-700">Saída (Vendas)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                O sistema detecta automaticamente se é NF-e, NFC-e (cupom) ou NFS-e (serviço)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arquivos XML *</label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${uploading ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-red-500'}`}>
                <Upload className={`w-12 h-12 mx-auto mb-4 ${uploading ? 'text-gray-300' : 'text-gray-400'}`} />
                <input
                  id="file-input"
                  data-testid="xml-file-input"
                  type="file"
                  multiple
                  accept=".xml"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="file-input" className={uploading ? 'cursor-not-allowed' : 'cursor-pointer'}>
                  <span className={`font-semibold ${uploading ? 'text-gray-400' : 'text-red-600 hover:text-red-700'}`}>
                    {uploading ? 'Upload em andamento...' : 'Clique para selecionar'}
                  </span>
                  {!uploading && <span className="text-gray-600"> ou arraste os arquivos aqui</span>}
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Aceita múltiplos arquivos .xml
                  <span className="block text-xs text-orange-600 font-medium mt-1">
                    ✨ Suporta mais de 1.000 arquivos! O sistema processa automaticamente em lotes.
                  </span>
                </p>
              </div>
            </div>

            {files.length > 0 && !uploading && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Arquivos Selecionados ({files.length.toLocaleString('pt-BR')})
                  {files.length > BATCH_SIZE && (
                    <span className="ml-2 text-sm font-normal text-orange-600">
                      → Serão processados em {Math.ceil(files.length / BATCH_SIZE)} lotes
                    </span>
                  )}
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.slice(0, 20).map((file, index) => (
                    <FileItem key={index} file={file} index={index} />
                  ))}
                  {files.length > 20 && (
                    <div className="text-center text-sm text-gray-500 py-2">
                      ... e mais {(files.length - 20).toLocaleString('pt-BR')} arquivos
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              data-testid="upload-files-button"
              onClick={handleUpload}
              disabled={uploading || globalUploading || !selectedCompany || !competencia || files.length === 0}
              className="w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg flex items-center justify-center gap-2"
            >
              {uploading || globalUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Processando... {globalUploading ? globalProgress.percent : progress.percent}%
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Importar {files.length.toLocaleString('pt-BR')} arquivo(s)
                  {files.length > BATCH_SIZE && ` (${Math.ceil(files.length / BATCH_SIZE)} lotes)`}
                </>
              )}
            </button>
            
            {(uploading || globalUploading) && (
              <p className="text-sm text-slate-600 mt-3 text-center">
                💡 Você pode navegar para outras páginas. O progresso será exibido no canto inferior direito.
              </p>
            )}
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resultado do Upload</h2>
            
            {/* Resumo geral */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                <p className="text-2xl font-bold text-green-700">{results.resumo?.importados || results.success?.length || 0}</p>
                <p className="text-sm text-green-600">Importados</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                <p className="text-2xl font-bold text-yellow-700">{results.resumo?.duplicados || results.duplicadas?.length || 0}</p>
                <p className="text-sm text-yellow-600">Duplicados</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                <p className="text-2xl font-bold text-red-700">{results.resumo?.erros || results.errors?.length || 0}</p>
                <p className="text-sm text-red-600">Erros</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                <p className="text-2xl font-bold text-blue-700">{results.resumo?.total_arquivos || 0}</p>
                <p className="text-sm text-blue-600">Total</p>
              </div>
            </div>

            {/* Conversões CFOP */}
            {results.relatorio_conversoes && results.relatorio_conversoes.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Conversões de CFOP ({results.total_conversoes || 0})</h3>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.relatorio_conversoes.slice(0, 10).map((arquivo, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-900">NF {arquivo.nfe} - {arquivo.arquivo}</p>
                      <p className="text-xs text-green-700">
                        {arquivo.conversoes?.map(c => `${c.cfop_original}→${c.cfop_convertido}`).join(', ')}
                      </p>
                    </div>
                  ))}
                  {results.relatorio_conversoes.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      ... e mais {results.relatorio_conversoes.length - 10} arquivos com conversões
                    </p>
                  )}
                </div>
              </div>
            )}

            {results.duplicadas && results.duplicadas.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-900">Notas Duplicadas ({results.duplicadas.length})</h3>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.duplicadas.slice(0, 10).map((item, index) => (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-900">{typeof item === 'string' ? item : (item.filename || item.numero_nfe || 'Duplicada')}</p>
                    </div>
                  ))}
                  {results.duplicadas.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      ... e mais {results.duplicadas.length - 10} duplicadas
                    </p>
                  )}
                </div>
              </div>
            )}

            {results.errors && results.errors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Erros ({results.errors.length})</h3>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.errors.slice(0, 10).map((item, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">{typeof item === 'string' ? item : (item.filename || 'Erro')}</p>
                      <p className="text-xs text-red-700">{typeof item === 'object' ? (item.error || item.motivo || '') : ''}</p>
                    </div>
                  ))}
                  {results.errors.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      ... e mais {results.errors.length - 10} erros
                    </p>
                  )}
                </div>
              </div>
            )}

            {results.rejeitadas_cnpj && results.rejeitadas_cnpj.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Rejeitadas - CNPJ Não Corresponde ({results.rejeitadas_cnpj.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.rejeitadas_cnpj.map((item, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">{item.filename} - NF-e {item.numero_nfe}</p>
                      <p className="text-xs text-red-700">{item.motivo}</p>
                      <p className="text-xs text-gray-600 mt-1">Emitente: {item.emitente} | Destinatário: {item.destinatario}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.rejeitadas_competencia && results.rejeitadas_competencia.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">Rejeitadas - Competência Diferente ({results.rejeitadas_competencia.length})</h3>
                </div>
                <div className="space-y-2">
                  {results.rejeitadas_competencia.map((item, index) => (
                    <div key={index} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-900">{item.filename} - NF-e {item.numero_nfe}</p>
                      <p className="text-xs text-orange-700">{item.motivo}</p>
                      <p className="text-xs text-gray-600 mt-1">Data de Emissão: {item.data_emissao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALERTAS DE CFOP - Operações Distintas de Venda */}
            {results.alertas_cfop && results.alertas_cfop.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg p-4 mb-3">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
                    ⚠️ ALERTAS DE CFOP - Operações Distintas
                  </h3>
                  <p className="text-amber-100">
                    Foram detectadas {results.total_alertas_cfop} notas com CFOPs de operações diferentes de venda (bonificação, remessa, devolução, etc.)
                  </p>
                  <p className="text-amber-200 text-sm mt-1">
                    Acesse o menu "Alertas CFOP" para revisar e converter os CFOPs se necessário.
                  </p>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {results.alertas_cfop.map((arquivo, idx) => (
                    <div key={idx} className="bg-amber-50 p-4 rounded-lg border-2 border-amber-300">
                      <p className="font-bold text-amber-900 mb-2">📄 NF-e {arquivo.nfe} - {arquivo.emitente}</p>
                      <div className="space-y-2">
                        {arquivo.alertas.map((alerta, i) => (
                          <div key={i} className="bg-white p-2 rounded border border-amber-200 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{alerta.produto}</p>
                              <p className="text-xs text-gray-600">Código: {alerta.codigo}</p>
                            </div>
                            <div className="text-right">
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-mono text-sm font-bold">
                                CFOP {alerta.cfop}
                              </span>
                              <p className="text-xs text-amber-700 mt-1">{alerta.descricao_cfop}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTAS DESCONSIDERADAS POR DEVOLUÇÃO DO FORNECEDOR */}
            {results.notas_desconsideradas_devolucao && results.notas_desconsideradas_devolucao.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg p-4 mb-3">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
                    🚫 NOTAS DESCONSIDERADAS - Devolução do Fornecedor
                  </h3>
                  <p className="text-slate-200">
                    {results.notas_desconsideradas_devolucao.length} notas identificadas como devolução emitida pelo fornecedor.
                  </p>
                  <p className="text-slate-300 text-sm mt-1">
                    Estas notas e suas referências serão excluídas de todas as apurações fiscais.
                  </p>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {results.notas_desconsideradas_devolucao.map((nota, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-2 ${
                      nota.tipo === 'devolucao_entrada' 
                        ? 'bg-slate-100 border-slate-400' 
                        : nota.tipo === 'saida_original'
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-gray-100 border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {nota.tipo === 'devolucao_entrada' && (
                          <span className="px-2 py-1 bg-slate-700 text-white text-xs rounded font-bold">DEVOLUÇÃO</span>
                        )}
                        {nota.tipo === 'saida_original' && (
                          <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded font-bold">ORIGINAL VINCULADA</span>
                        )}
                        {nota.tipo === 'saida_original_nao_encontrada' && (
                          <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded font-bold">NÃO ENCONTRADA</span>
                        )}
                        <p className="font-bold text-gray-900">
                          NF-e {nota.numero_nfe}
                          {nota.valor_total > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-600">
                              R$ {nota.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700">{nota.motivo}</p>
                      {nota.emitente && (
                        <p className="text-xs text-gray-600 mt-1">Emitente: {nota.emitente}</p>
                      )}
                      {nota.destinatario && (
                        <p className="text-xs text-gray-600">Destinatário: {nota.destinatario}</p>
                      )}
                      {nota.nfe_referenciada && (
                        <p className="text-xs text-blue-600 mt-1">
                          📎 Referência: {nota.nfe_referenciada.substring(0, 30)}...
                        </p>
                      )}
                      {nota.vinculada_a && (
                        <p className="text-xs text-orange-600 mt-1">
                          ↳ Vinculada à NF {nota.vinculada_a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.resumo && (
              <div className="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3">Resumo da Importação</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{results.resumo.total_arquivos}</p>
                    <p className="text-xs text-gray-600">Total Enviados</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{results.resumo.importados}</p>
                    <p className="text-xs text-green-600">Importados</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-700">{results.resumo.duplicados}</p>
                    <p className="text-xs text-yellow-600">Duplicados</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{results.resumo.rejeitados_cnpj}</p>
                    <p className="text-xs text-red-600">CNPJ Errado</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-orange-700">{results.resumo.rejeitados_competencia}</p>
                    <p className="text-xs text-orange-600">Comp. Errada</p>
                  </div>
                  <div className="bg-gray-200 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-700">{results.resumo.erros}</p>
                    <p className="text-xs text-gray-600">Erros</p>
                  </div>
                  {results.resumo.alertas_cfop > 0 && (
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">{results.resumo.alertas_cfop}</p>
                      <p className="text-xs text-amber-600">Alertas CFOP</p>
                    </div>
                  )}
                  {results.resumo.desconsideradas_devolucao > 0 && (
                    <div className="bg-slate-200 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-slate-700">{results.resumo.desconsideradas_devolucao}</p>
                      <p className="text-xs text-slate-600">Dev. Fornecedor</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {results.relatorio_conversoes && results.relatorio_conversoes.length > 0 && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-4 mb-3">
                  <h3 className="font-bold text-xl mb-1 flex items-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    RELATÓRIO DE CONVERSÕES AUTOMÁTICAS
                  </h3>
                  <p className="text-purple-100">Total: {results.total_conversoes} produtos classificados</p>
                  
                  {/* Performance Stats */}
                  {results.performance && (
                    <div className="flex gap-4 mt-2 text-sm">
                      {results.performance.produtos_do_cache > 0 && (
                        <span className="bg-green-500 px-2 py-1 rounded">
                          ⚡ {results.performance.produtos_do_cache} do cache
                        </span>
                      )}
                      {results.performance.produtos_de_regras > 0 && (
                        <span className="bg-blue-500 px-2 py-1 rounded">
                          📋 {results.performance.produtos_de_regras} de regras
                        </span>
                      )}
                      {results.performance.produtos_da_ia > 0 && (
                        <span className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded">
                          🤖 {results.performance.produtos_da_ia} da IA
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {results.relatorio_conversoes.map((arquivo, idx) => (
                    <div key={idx} className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                      <p className="font-bold text-purple-900 mb-3">📄 NF-e {arquivo.nfe} - {arquivo.arquivo}</p>
                      <div className="space-y-3">
                        {arquivo.conversoes.map((conv, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-gray-900">{conv.produto}</p>
                              {/* Origem da classificação */}
                              {conv.origem && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  conv.origem === 'cache' ? 'bg-green-100 text-green-700' :
                                  conv.origem === 'regra' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {conv.origem === 'cache' ? '⚡ Cache' : 
                                   conv.origem === 'regra' ? '📋 Regra' : '🤖 IA'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Original:</span>
                                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded font-mono font-bold">
                                  {conv.cfop_original}
                                </span>
                              </div>
                              <span className="text-xl text-gray-400">→</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Convertido:</span>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-mono font-bold">
                                  {conv.cfop_convertido}
                                </span>
                              </div>
                              <span className={'px-3 py-1 rounded-full font-bold text-xs ' + 
                                (conv.categoria === 'revenda' ? 'bg-purple-600 text-white' :
                                 conv.categoria === 'insumo' ? 'bg-blue-600 text-white' :
                                 conv.categoria === 'despesa' ? 'bg-orange-600 text-white' :
                                 'bg-yellow-600 text-white')}>
                                {conv.categoria.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2 font-medium">Critério: {conv.motivo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UploadXML;
