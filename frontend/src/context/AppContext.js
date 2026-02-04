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
    
    if (savedCompany) {
      // Será carregado quando companies estiver disponível
    }
  }, []);

  useEffect(() => {
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    
    if (companies.length > 0) {
      if (savedCompanyId) {
        const company = companies.find(c => c.id === savedCompanyId);
        if (company) {
          setSelectedCompany(company);
          setShowSelector(false);
        } else {
          // Se não encontrou a empresa salva, mostra seletor
          setShowSelector(true);
        }
      } else {
        // Primeira vez com empresas, mostra seletor
        setShowSelector(true);
      }
      setLoading(false);
    }
  }, [companies]);

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
      refreshCompanies
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
