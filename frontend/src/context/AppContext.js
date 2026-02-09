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
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  // Flag para controlar se o usuário já fez a seleção inicial nesta sessão
  const [hasCompanySelection, setHasCompanySelection] = useState(() => {
    return !!localStorage.getItem('selectedCompanyId');
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCompanies();
    } else {
      setLoading(false);
    }
    
    // Carregar seleção salva
    const savedCompany = localStorage.getItem('selectedCompanyId');
    const savedCompetencia = localStorage.getItem('selectedCompetencia');
    
    if (savedCompetencia) {
      setSelectedCompetencia(savedCompetencia);
    } else {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setSelectedCompetencia(`${month}/${year}`);
    }
    
    // Marcar que temos uma seleção prévia
    if (savedCompany) {
      setHasCompanySelection(true);
    }
  }, []);

  useEffect(() => {
    // Este efeito só deve rodar na carga inicial, não quando o usuário abre o seletor manualmente
    if (initialLoadDone) return;
    
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    
    if (companies.length > 0) {
      if (savedCompanyId) {
        const company = companies.find(c => c.id === savedCompanyId);
        if (company) {
          setSelectedCompany(company);
          // IMPORTANTE: Fechar o seletor - já temos uma empresa válida salva
          setShowSelector(false);
          setHasCompanySelection(true);
        } else {
          // Se não encontrou a empresa salva, mostra seletor
          setShowSelector(true);
          setHasCompanySelection(false);
        }
      } else if (!hasCompanySelection) {
        // Primeira vez com empresas E não tem seleção prévia, mostra seletor
        setShowSelector(true);
      }
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [companies, initialLoadDone, hasCompanySelection]);

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
    setHasCompanySelection(true);
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
      syncFromSieg
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
