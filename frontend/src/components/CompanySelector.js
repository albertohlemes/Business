import React, { useState, useEffect } from 'react';
import { Building2, Calendar, ChevronRight, X, CheckCircle, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const CompanySelector = () => {
  const { 
    companies, 
    selectedCompany, 
    selectedCompetencia, 
    showSelector,
    selectCompany, 
    selectCompetencia, 
    closeSelector
  } = useAppContext();

  const getInitialCompetencia = () => {
    if (selectedCompetencia) return selectedCompetencia;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  };

  const [tempCompany, setTempCompany] = useState(selectedCompany);
  const [tempCompetencia, setTempCompetencia] = useState(getInitialCompetencia());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (tempCompany && tempCompetencia && tempCompetencia.length === 7) {
      checkSiegCount(tempCompany.id, tempCompetencia);
    }
  }, [tempCompany, tempCompetencia]);

  const handleCompetenciaChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    if (value.length > 2) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setTempCompetencia(value);
  };

  const handleSyncNow = async () => {
    if (!tempCompany || !tempCompetencia) return;
    
    setSyncProgress({ active: true, step: 'Iniciando...', percent: 0 });
    setSyncResult(null);
    
    try {
      const result = await syncFromSieg(tempCompany.id, tempCompetencia, (progressData) => {
        setSyncProgress({
          active: !progressData.completed,
          step: progressData.step || '',
          percent: progressData.progress_percent || 0
        });
      });
      setSyncResult(result);
    } catch (err) {
      setSyncResult({ error: err.response?.data?.detail || err.message || 'Erro na sincronização' });
    } finally {
      setSyncProgress({ active: false, step: '', percent: 0 });
    }
  };

  const handleConfirm = async () => {
    if (tempCompany) {
      if (autoSyncEnabled && siegStatus.count) {
        const totalEntrada = siegStatus.count.entrada?.total || 0;
        const totalSaida = siegStatus.count.saida?.total || 0;
        if (totalEntrada > 0 || totalSaida > 0) {
          await handleSyncNow();
        }
      }
      
      selectCompany(tempCompany);
      selectCompetencia(tempCompetencia);
    }
  };

  const getTotalSieg = () => {
    if (!siegStatus.count) return 0;
    return (siegStatus.count.entrada?.total || 0) + (siegStatus.count.saida?.total || 0);
  };

  // Filtrar e ordenar empresas por codigo_empresa
  const filteredCompanies = companies
    .filter(company =>
      company.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.cnpj?.includes(searchTerm) ||
      company.codigo_empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Ordenar por codigo_empresa numericamente
      const codeA = parseInt(a.codigo_empresa) || 999999;
      const codeB = parseInt(b.codigo_empresa) || 999999;
      return codeA - codeB;
    });

  if (!showSelector) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#141414] rounded border border-[#2A2A2A] w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-[#0C0C0C] p-5 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/aurion-logo.png" 
                alt="AURION" 
                className="h-10 w-auto"
              />
              <div>
                <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Selecione a Empresa
                </h2>
                <p className="text-[#A1A1AA] text-xs">Escolha a empresa e competência</p>
              </div>
            </div>
            {selectedCompany && (
              <button 
                onClick={closeSelector}
                className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Empresa */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C8A951]" />
              Empresa
            </label>
            
            {companies.length === 0 ? (
              <div className="text-center py-8 bg-[#0C0C0C] rounded border border-[#2A2A2A]">
                <Building2 className="w-10 h-10 text-[#A1A1AA] mx-auto mb-3" />
                <p className="text-[#A1A1AA] mb-2 text-sm">Nenhuma empresa cadastrada</p>
                <a href="/companies" className="text-[#C8A951] font-medium hover:underline text-sm">
                  Cadastrar primeira empresa →
                </a>
              </div>
            ) : (
              <>
                {/* Search - Sempre visível */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A1A1AA]" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, CNPJ ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white text-sm placeholder:text-[#666] focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951] focus:outline-none"
                    autoFocus
                  />
                </div>
                
                {/* Lista de Empresas - Linha única, ordenada por código */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {filteredCompanies.length === 0 ? (
                    <div className="text-center py-6 text-[#A1A1AA] text-sm">
                      Nenhuma empresa encontrada para "{searchTerm}"
                    </div>
                  ) : (
                    filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setTempCompany(company)}
                      className={`w-full p-3 rounded text-left transition-all flex items-center justify-between ${
                        tempCompany?.id === company.id
                          ? 'bg-[#C8A951]/10 border border-[#C8A951]/30'
                          : 'bg-[#0C0C0C] border border-[#2A2A2A] hover:border-[#C8A951]/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {company.codigo_empresa && (
                          <span className="px-2 py-0.5 bg-[#C8A951]/20 text-[#C8A951] rounded text-xs font-bold shrink-0 min-w-[40px] text-center">
                            {company.codigo_empresa}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white text-sm truncate">{company.razao_social}</p>
                          <p className="text-xs text-[#666] font-mono">{company.cnpj}</p>
                        </div>
                      </div>
                      {tempCompany?.id === company.id && (
                        <div className="w-5 h-5 bg-[#C8A951] rounded flex items-center justify-center shrink-0">
                          <CheckCircle className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                  ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Competência */}
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#C8A951]" />
              Competência (Mês/Ano)
            </label>
            <input
              type="text"
              value={tempCompetencia}
              onChange={handleCompetenciaChange}
              placeholder="122025"
              maxLength="7"
              className="w-full px-4 py-2.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded text-white text-lg font-mono text-center focus:border-[#C8A951] focus:ring-1 focus:ring-[#C8A951]"
            />
            <p className="text-xs text-[#A1A1AA] mt-1 text-center">Digite apenas números (ex: 122025 → 12/2025)</p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={!tempCompany || !tempCompetencia}
            className="w-full py-3 bg-[#C8A951] text-black rounded font-semibold hover:bg-[#B09240] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelector;
