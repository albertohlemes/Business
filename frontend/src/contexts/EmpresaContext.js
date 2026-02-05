import { createContext, useContext, useState, useEffect } from 'react';

const EmpresaContext = createContext(null);

export const EmpresaProvider = ({ children }) => {
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [competencia, setCompetencia] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });

  useEffect(() => {
    // Load from localStorage
    const savedEmpresa = localStorage.getItem('empresaSelecionada');
    const savedCompetencia = localStorage.getItem('competencia');
    if (savedEmpresa) {
      try {
        setEmpresaSelecionada(JSON.parse(savedEmpresa));
      } catch (e) {
        console.error('Error parsing empresa from localStorage');
      }
    }
    if (savedCompetencia) {
      setCompetencia(savedCompetencia);
    }
  }, []);

  const selecionarEmpresa = (empresa, comp = competencia) => {
    setEmpresaSelecionada(empresa);
    setCompetencia(comp);
    localStorage.setItem('empresaSelecionada', JSON.stringify(empresa));
    localStorage.setItem('competencia', comp);
  };

  const limparSelecao = () => {
    setEmpresaSelecionada(null);
    localStorage.removeItem('empresaSelecionada');
  };

  const atualizarCompetencia = (novaCompetencia) => {
    setCompetencia(novaCompetencia);
    localStorage.setItem('competencia', novaCompetencia);
  };

  return (
    <EmpresaContext.Provider value={{
      empresaSelecionada,
      competencia,
      selecionarEmpresa,
      limparSelecao,
      atualizarCompetencia
    }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => {
  const context = useContext(EmpresaContext);
  if (!context) {
    throw new Error('useEmpresa must be used within an EmpresaProvider');
  }
  return context;
};
