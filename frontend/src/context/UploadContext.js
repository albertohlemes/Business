import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const UploadContext = createContext();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  const location = useLocation();
  
  // Estado do upload
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [currentFile, setCurrentFile] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadInfo, setUploadInfo] = useState({ empresa: '', competencia: '' });
  const [minimized, setMinimized] = useState(false);
  
  // Estado para rastrear mudanças em documentos (incrementa a cada mudança)
  const [documentsVersion, setDocumentsVersion] = useState(0);
  
  // Função para notificar que houve mudança nos documentos (exclusão, importação, etc.)
  const notifyDocumentsChanged = useCallback(() => {
    setDocumentsVersion(prev => prev + 1);
  }, []);
  
  // Referência para o EventSource e polling
  const eventSourceRef = useRef(null);
  const uploadIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  // Referência para a rota anterior
  const previousPathRef = useRef(location.pathname);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;
  
  // Limpar resultados quando navegar para outra página (e não estiver fazendo upload)
  useEffect(() => {
    // Se a rota mudou e não está fazendo upload, limpar os resultados
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      
      // Se não está fazendo upload, limpar os resultados para não ficar "congelado"
      if (!isUploading && (uploadResults || uploadError)) {
        console.log('UploadContext: Navegação detectada, limpando resultados do upload');
        setUploadResults(null);
        setUploadError(null);
        setProgress({ current: 0, total: 0, percent: 0 });
        setCurrentFile('');
        setMinimized(false);
      }
    }
  }, [location.pathname, isUploading, uploadResults, uploadError]);

  // Função de polling fallback
  const startPollingFallback = useCallback(async (uploadId, token) => {
    if (pollingIntervalRef.current) return; // Já está rodando
    
    console.log('Iniciando polling de fallback para upload:', uploadId);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API}/xml/upload-status/${uploadId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.completed === true && data.results) {
          console.log('Polling: Upload concluído!');
          setProgress({ 
            current: data.total_files || data.processed_files, 
            total: data.total_files, 
            percent: 100 
          });
          setCurrentFile('Concluído!');
          setUploadResults(data.results);
          setIsUploading(false);
          
          // Limpar polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (data.error) {
          setUploadError(data.error);
          setIsUploading(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else {
          // Atualizar progresso
          const processed = data.processed_files || 0;
          const total = data.total_files || 1;
          const percent = data.progress_percent || Math.round((processed / total) * 100);
          
          setProgress({ current: processed, total: total, percent: percent });
          setCurrentFile(data.current_file || data.current_step || `Processando ${processed}/${total}...`);
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 2000); // Poll a cada 2 segundos
  }, [API]);

  // Iniciar upload em segundo plano
  const startUpload = useCallback(async (files, companyId, competencia, empresaNome, tipo = 'entrada', existingUploadId = null) => {
    if (isUploading) {
      alert('Já existe um upload em andamento. Aguarde a conclusão.');
      return false;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setUploadError('Token de autenticação não encontrado');
      return false;
    }

    setIsUploading(true);
    setProgress({ current: 0, total: files ? files.length : 0, percent: 0 });
    setCurrentFile('Iniciando...');
    setUploadResults(null);
    setUploadError(null);
    setUploadInfo({ empresa: empresaNome, competencia, tipo });
    setMinimized(false);

    try {
      let upload_id = existingUploadId;
      
      // Se não temos um upload_id existente (ex: ZIP já processado), criar uma nova sessão
      if (!upload_id && files) {
        // 1. Inicializar upload e obter ID (usando FormData)
        const initFormData = new FormData();
        initFormData.append('company_id', companyId);
        initFormData.append('competencia', competencia);
        initFormData.append('tipo', tipo);  // Usar o tipo passado como parâmetro
        initFormData.append('total_files', files.length.toString());
        
        console.log('UploadContext: Iniciando upload com tipo:', tipo);
        
        const initResponse = await fetch(`${API}/xml/upload-init`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: initFormData
        });

        if (!initResponse.ok) {
          const errData = await initResponse.json().catch(() => ({}));
          throw new Error(errData.detail || 'Falha ao inicializar upload');
        }

        const initData = await initResponse.json();
        upload_id = initData.upload_id;
      }
      
      uploadIdRef.current = upload_id;

      // 2. Conectar ao SSE para receber progresso
      const eventSource = new EventSource(`${API}/xml/upload-progress/${upload_id}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE Event:', data); // Debug
          
          // Verificar se realmente concluiu (completed=true E results presente)
          if (data.completed === true && data.results) {
            console.log('Upload REALMENTE concluído com resultados');
            setProgress({ 
              current: data.total_files || data.processed_files, 
              total: data.total_files, 
              percent: 100 
            });
            setCurrentFile('Concluído!');
            setUploadResults(data.results);
            setIsUploading(false);
            eventSource.close();
            eventSourceRef.current = null;
          } else if (data.error) {
            // Erro explícito
            console.log('Erro no upload:', data.error);
            setUploadError(data.error || 'Erro durante o upload');
            setIsUploading(false);
            eventSource.close();
            eventSourceRef.current = null;
          } else {
            // Ainda processando (completed=false ou ausente)
            const processed = data.processed_files || 0;
            const total = data.total_files || 1;
            const percent = data.progress_percent || Math.round((processed / total) * 100);
            
            setProgress({
              current: processed,
              total: total,
              percent: percent
            });
            setCurrentFile(data.current_file || data.current_step || `Processando ${processed}/${total}...`);
          }
        } catch (e) {
          console.error('Erro ao processar evento SSE:', e);
        }
      };

      eventSource.onerror = () => {
        console.error('Erro na conexão SSE, iniciando polling de fallback...');
        // Iniciar polling de fallback quando SSE falha
        if (!pollingIntervalRef.current) {
          startPollingFallback(upload_id, token);
        }
      };

      // 3. Enviar arquivos em lotes (apenas se temos arquivos - não no caso de ZIP já processado)
      if (files && files.length > 0) {
        // Lotes menores para evitar timeout (30 arquivos por lote)
        const BATCH_SIZE = 30;
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          const batch = files.slice(i, i + BATCH_SIZE);
          const formData = new FormData();
          
          // upload_id deve ser enviado via FormData, não query string
          formData.append('upload_id', upload_id);
          
          batch.forEach(file => {
            formData.append('files', file);
          });

          // Timeout de 10 minutos por lote (600000ms)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 600000);

          try {
            const uploadResponse = await fetch(
              `${API}/xml/upload-stream`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: formData,
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({}));
              throw new Error(errorData.detail || 'Erro no upload do lote');
            }
          } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
              throw new Error('Timeout: o servidor demorou muito para responder. Tente novamente ou use uploads menores.');
            }
            throw err;
          }
        }
      } else if (existingUploadId) {
        // Para uploads de ZIP, o backend precisa processar os XMLs extraídos
        // Enviar uma chamada para iniciar o processamento
        console.log('UploadContext: ZIP upload - aguardando processamento do backend');
        // O backend já tem os XMLs, apenas monitoramos o progresso via SSE/polling
      }

      return true;
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploadError(error.message || 'Erro desconhecido no upload');
      setIsUploading(false);
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      return false;
    }
  }, [isUploading, API]);

  // Cancelar upload
  const cancelUpload = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsUploading(false);
    setProgress({ current: 0, total: 0, percent: 0 });
    setCurrentFile('');
    setUploadError('Upload cancelado pelo usuário');
  }, []);

  // Limpar resultados
  const clearResults = useCallback(() => {
    setUploadResults(null);
    setUploadError(null);
    setProgress({ current: 0, total: 0, percent: 0 });
    setCurrentFile('');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Minimizar/expandir barra
  const toggleMinimize = useCallback(() => {
    setMinimized(prev => !prev);
  }, []);

  const value = {
    // Estado
    isUploading,
    progress,
    currentFile,
    uploadResults,
    uploadError,
    uploadInfo,
    minimized,
    
    // Rastreamento de mudanças em documentos
    documentsVersion,
    notifyDocumentsChanged,
    
    // Ações
    startUpload,
    cancelUpload,
    clearResults,
    toggleMinimize
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export default UploadContext;
