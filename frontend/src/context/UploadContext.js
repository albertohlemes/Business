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
  const startUpload = useCallback(async (files, companyId, competencia, empresaNome) => {
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
    setUploadInfo({ empresa: empresaNome, competencia });
    setMinimized(false);

    try {
      // 1. Inicializar upload e obter ID
      const initResponse = await fetch(`${API}/xml/upload-init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          competencia: competencia,
          total_files: files.length
        })
      });

      if (!initResponse.ok) {
        throw new Error('Falha ao inicializar upload');
      }

      const { upload_id } = await initResponse.json();
      uploadIdRef.current = upload_id;

      // 2. Conectar ao SSE para receber progresso
      const eventSource = new EventSource(`${API}/xml/upload-progress/${upload_id}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.status === 'processing') {
            setProgress({
              current: data.current,
              total: data.total,
              percent: Math.round((data.current / data.total) * 100)
            });
            setCurrentFile(data.filename || `Processando ${data.current}/${data.total}...`);
          } else if (data.status === 'completed') {
            setProgress({ current: data.total, total: data.total, percent: 100 });
            setCurrentFile('Concluído!');
            setUploadResults(data.results);
            setIsUploading(false);
            eventSource.close();
            eventSourceRef.current = null;
          } else if (data.status === 'error') {
            setUploadError(data.message || 'Erro durante o upload');
            setIsUploading(false);
            eventSource.close();
            eventSourceRef.current = null;
          }
        } catch (e) {
          console.error('Erro ao processar evento SSE:', e);
        }
      };

      eventSource.onerror = () => {
        console.error('Erro na conexão SSE');
        // Não fechar imediatamente, pode ser reconexão
      };

      // 3. Enviar arquivos em lotes
      const BATCH_SIZE = 50;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const formData = new FormData();
        
        batch.forEach(file => {
          formData.append('files', file);
        });

        const uploadResponse = await fetch(
          `${API}/xml/upload-with-progress/${upload_id}?company_id=${companyId}&competencia=${encodeURIComponent(competencia)}`,
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
