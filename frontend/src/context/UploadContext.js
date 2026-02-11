import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const UploadContext = createContext();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  // Estado do upload
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [currentFile, setCurrentFile] = useState('');
  const [uploadResults, setUploadResults] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadInfo, setUploadInfo] = useState({ empresa: '', competencia: '' });
  const [minimized, setMinimized] = useState(false);
  
  // Referência para o EventSource
  const eventSourceRef = useRef(null);
  const uploadIdRef = useRef(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  // Iniciar upload em segundo plano
  const startUpload = useCallback(async (files, companyId, competencia, empresaNome, tipo = 'entrada') => {
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
    setProgress({ current: 0, total: files.length, percent: 0 });
    setCurrentFile('Iniciando...');
    setUploadResults(null);
    setUploadError(null);
    setUploadInfo({ empresa: empresaNome, competencia, tipo });
    setMinimized(false);

    try {
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

      const { upload_id } = await initResponse.json();
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

      // 3. Enviar arquivos em lotes
      const BATCH_SIZE = 50;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        
        // upload_id deve ser enviado via FormData, não query string
        formData.append('upload_id', upload_id);
        
        batch.forEach(file => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch(
          `${API}/xml/upload-stream`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Erro no upload do lote');
        }
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
