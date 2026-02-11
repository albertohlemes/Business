import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState('');
  const [companies, setCompanies] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);

  // Efeito inicial: carregar empresas e competência salva
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCompanies();
    } else {
      setLoading(false);
    }
    
    // Carregar competência salva ou usar atual
    const savedCompetencia = localStorage.getItem('selectedCompetencia');
    if (savedCompetencia) {
      setSelectedCompetencia(savedCompetencia);
    } else {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setSelectedCompetencia(`${month}/${year}`);
    }
  }, []);

  // Efeito para restaurar empresa salva quando empresas forem carregadas
  useEffect(() => {
    if (companies.length === 0) return;
    
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    
    // Se já temos uma empresa selecionada, não fazer nada
    if (selectedCompany) {
      setLoading(false);
      setCompaniesLoaded(true);
      return;
    }
    
    if (savedCompanyId) {
      // Tentar restaurar a empresa salva
      const company = companies.find(c => c.id === savedCompanyId);
      if (company) {
        setSelectedCompany(company);
        setShowSelector(false);
      } else {
        // Empresa salva não existe mais, limpar e mostrar seletor
        localStorage.removeItem('selectedCompanyId');
        setShowSelector(true);
      }
    } else {
      // Nenhuma empresa salva, mostrar seletor apenas se ainda não carregou
      if (!companiesLoaded) {
        setShowSelector(true);
      }
    }
    
    setLoading(false);
    setCompaniesLoaded(true);
  }, [companies, selectedCompany, companiesLoaded]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/companies', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setCompanies(response.data);
      if (response.data.length === 0) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setLoading(false);
    }
  };

  // SIEG Functions
  const [siegStatus, setSiegStatus] = useState({ loading: false, count: null, error: null });
  const [siegSyncing, setSiegSyncing] = useState(false);

  // Upload Progress - Global para ficar visível em todas as telas
  const [uploadProgress, setUploadProgress] = useState({
    isUploading: false,
    uploadId: null,
    percent: 0,
    current: 0,
    total: 0,
    companyName: '',
    tipo: '',
    error: null,
    completedResults: null,  // Resultados quando upload completa
    showResults: false,      // Flag para mostrar o modal de resultados
    startTime: null          // Timestamp do início para calcular tempo restante
  });

  const startUpload = (uploadId, total, companyName, tipo = 'entrada') => {
    setUploadProgress({
      isUploading: true,
      uploadId,
      percent: 0,
      current: 0,
      total,
      companyName,
      tipo,
      error: null,
      completedResults: null,
      showResults: false,
      startTime: Date.now()  // Registrar início
    });
  };

  const updateUploadProgress = (percent, current, total) => {
    setUploadProgress(prev => ({
      ...prev,
      percent,
      current,
      total: total || prev.total,
      error: null,
      startTime: prev.startTime || Date.now()  // Manter startTime original
    }));
  };

  const setUploadError = (errorMessage) => {
    setUploadProgress(prev => ({
      ...prev,
      error: errorMessage,
      percent: 0
    }));
  };

  const finishUpload = () => {
    setUploadProgress({
      isUploading: false,
      uploadId: null,
      percent: 100,
      current: 0,
      total: 0,
      companyName: '',
      tipo: '',
      error: null,
      completedResults: null,
      showResults: false
    });
  };

  const clearUploadResults = () => {
    setUploadProgress(prev => ({
      ...prev,
      completedResults: null,
      showResults: false
    }));
  };

  // Polling persistente para acompanhar upload mesmo ao navegar
  useEffect(() => {
    if (!uploadProgress.isUploading || !uploadProgress.uploadId) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;
    
    console.log('AppContext: Iniciando polling persistente para upload:', uploadProgress.uploadId);
    
    const pollUploadStatus = async () => {
      try {
        const response = await axios.get(
          `${API}/xml/upload-status/${uploadProgress.uploadId}`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
        );
        
        const data = response.data;
        
        if (data.completed === true && data.results) {
          console.log('AppContext: Upload concluído! Armazenando resultados.');
          // Armazenar resultados para serem exibidos pelo Documents.js
          setUploadProgress(prev => ({
            ...prev,
            isUploading: false,
            percent: 100,
            completedResults: data.results,
            showResults: true
          }));
        } else if (data.error) {
          setUploadError(data.error);
        } else {
          const processed = data.processed_files || 0;
          const total = data.total_files || uploadProgress.total || 1;
          const percent = data.progress_percent || Math.round((processed / total) * 100);
          
          setUploadProgress(prev => ({
            ...prev,
            percent,
            current: processed,
            total,
            error: null
          }));
        }
      } catch (err) {
        console.error('AppContext: Erro no polling:', err.message);
      }
    };
    
    // Polling a cada 2 segundos
    const intervalId = setInterval(pollUploadStatus, 2000);
    
    // Executar imediatamente também
    pollUploadStatus();
    
    return () => {
      console.log('AppContext: Limpando polling');
      clearInterval(intervalId);
    };
  }, [uploadProgress.isUploading, uploadProgress.uploadId]);

  const checkSiegCount = async (companyId, competencia) => {
    if (!companyId || !competencia) return;
    
    setSiegStatus({ loading: true, count: null, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/sieg/count/${companyId}?competencia=${encodeURIComponent(competencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSiegStatus({ loading: false, count: response.data.contagem, error: null });
      return response.data.contagem;
    } catch (err) {
      console.error('[SIEG] Erro ao contar XMLs:', err);
      setSiegStatus({ loading: false, count: null, error: err.response?.data?.detail || 'Erro ao consultar SIEG' });
      return null;
    }
  };

  const syncFromSieg = async (companyId, competencia, onProgress = null) => {
    if (!companyId || !competencia) return null;
    
    setSiegSyncing(true);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Inicializar sessão de sync
      const initFormData = new FormData();
      initFormData.append('competencia', competencia);
      
      const initResponse = await axios.post(
        `${API}/sieg/sync-init/${companyId}`,
        initFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const syncId = initResponse.data.sync_id;
      
      // 2. Conectar ao SSE para progresso
      const eventSource = new EventSource(`${API}/sieg/sync-progress/${syncId}`);
      
      let finalResult = null;
      
      await new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (onProgress) {
              onProgress(data);
            }
            
            if (data.completed) {
              finalResult = data.results;
              eventSource.close();
              resolve();
            }
            
            if (data.error) {
              eventSource.close();
              reject(new Error(data.error));
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          // Continue, don't reject yet
        };
        
        // 3. Executar sincronização
        axios.post(
          `${API}/sieg/sync-execute/${syncId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(err => {
          eventSource.close();
          reject(err);
        });
      });
      
      setSiegSyncing(false);
      return finalResult;
    } catch (err) {
      console.error('[SIEG] Erro na sincronização:', err);
      setSiegSyncing(false);
      throw err;
    }
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    localStorage.setItem('selectedCompanyId', company.id);
    setShowSelector(false);
  };

  const selectCompetencia = (competencia) => {
    setSelectedCompetencia(competencia);
    localStorage.setItem('selectedCompetencia', competencia);
  };

  const openSelector = () => {
    // Recarregar empresas ao abrir o modal
    fetchCompanies();
    setShowSelector(true);
  };

  const closeSelector = () => {
    if (selectedCompany) {
      setShowSelector(false);
    }
  };

  const clearSelection = () => {
    setSelectedCompany(null);
    setSelectedCompetencia('');
    setCompaniesLoaded(false);
    localStorage.removeItem('selectedCompanyId');
    localStorage.removeItem('selectedCompetencia');
  };

  const refreshCompanies = () => {
    fetchCompanies();
  };

  return (
    <AppContext.Provider value={{
      selectedCompany,
      selectedCompetencia,
      companies,
      showSelector,
      loading,
      selectCompany,
      selectCompetencia,
      openSelector,
      closeSelector,
      clearSelection,
      refreshCompanies,
      // SIEG
      siegStatus,
      siegSyncing,
      checkSiegCount,
      syncFromSieg,
      // Upload Progress
      uploadProgress,
      startUpload,
      updateUploadProgress,
      setUploadError,
      finishUpload,
      clearUploadResults
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
