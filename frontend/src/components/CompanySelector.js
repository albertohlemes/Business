import React, { useState, useEffect } from 'react';
import { Building2, Calendar, ChevronRight, X, Cloud, CloudDownload, CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const CompanySelector = () => {
  const { 
    companies, 
    selectedCompany, 
    selectedCompetencia, 
    showSelector,
    selectCompany, 
    selectCompetencia, 
    closeSelector,
    // SIEG
    siegStatus,
    siegSyncing,
    checkSiegCount,
    syncFromSieg
  } = useAppContext();

  // Inicializar com data atual se competência estiver vazia
  const getInitialCompetencia = () => {
    if (selectedCompetencia) return selectedCompetencia;
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}/${year}`;
  };

  const [tempCompany, setTempCompany] = useState(selectedCompany);
  const [tempCompetencia, setTempCompetencia] = useState(getInitialCompetencia());
  const [syncResult, setSyncResult] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  
  // Progress state para SSE
  const [syncProgress, setSyncProgress] = useState({
    active: false,
    step: '',
    percent: 0
  });

  // Verificar SIEG quando empresa e competência mudarem
  useEffect(() => {
    if (tempCompany && tempCompetencia && tempCompetencia.length === 7) {
      checkSiegCount(tempCompany.id, tempCompetencia);
    }
  }, [tempCompany, tempCompetencia]);

  // Formatar competência automaticamente (só números → MM/AAAA)
  const handleCompetenciaChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    
    // Limitar a 6 dígitos (MMAAAA)
    if (value.length > 6) {
      value = value.slice(0, 6);
    }
    
    // Formatar como MM/AAAA
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
      // Se auto-sync está habilitado e há XMLs disponíveis, sincroniza
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

  if (!showSelector) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-business.png" 
                alt="Business Contabilidade" 
                className="h-12 w-auto"
              />
              <div>
                <h2 className="text-xl font-bold">Selecione a Empresa</h2>
                <p className="text-red-100 text-sm">Escolha a empresa e competência para trabalhar</p>
              </div>
            </div>
            {selectedCompany && (
              <button 
                onClick={closeSelector}
                className="p-2 hover:bg-red-500 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Empresa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-600" />
              Empresa
            </label>
            {companies.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">Nenhuma empresa cadastrada</p>
                <a href="/companies" className="text-red-600 font-semibold hover:underline">
                  Cadastrar primeira empresa →
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => setTempCompany(company)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      tempCompany?.id === company.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {company.codigo_empresa && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold text-sm">
                          #{company.codigo_empresa}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{company.razao_social}</p>
                        <p className="text-sm text-gray-500">{company.cnpj}</p>
                        {company.cidade && (
                          <p className="text-xs text-gray-400">{company.cidade}/{company.uf}</p>
                        )}
                      </div>
                    </div>
                    {tempCompany?.id === company.id && (
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Competência */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Competência (Mês/Ano)
            </label>
            <input
              type="text"
              value={tempCompetencia}
              onChange={handleCompetenciaChange}
              placeholder="122025"
              maxLength="7"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-0 text-lg font-mono text-center"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">Digite apenas números (ex: 122025 → 12/2025)</p>
          </div>

          {/* SIEG Integration */}
          {tempCompany && tempCompetencia.length === 7 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">SIEG - Cofre de XMLs</span>
              </div>
              
              {siegStatus.loading ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Consultando SIEG...</span>
                </div>
              ) : siegStatus.error ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{siegStatus.error}</span>
                </div>
              ) : siegStatus.count ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-gray-500">Entradas</p>
                      <p className="text-2xl font-bold text-green-600">{siegStatus.count.entrada?.total || 0}</p>
                      {siegStatus.count.entrada?.nfe > 0 && (
                        <p className="text-xs text-gray-400">{siegStatus.count.entrada.nfe} NF-e</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-orange-200">
                      <p className="text-xs text-gray-500">Saídas</p>
                      <p className="text-2xl font-bold text-orange-600">{siegStatus.count.saida?.total || 0}</p>
                      {siegStatus.count.saida?.nfe > 0 && (
                        <p className="text-xs text-gray-400">{siegStatus.count.saida.nfe} NF-e</p>
                      )}
                    </div>
                  </div>
                  
                  {getTotalSieg() > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoSyncEnabled}
                            onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={siegSyncing || syncProgress.active}
                          />
                          Importar automaticamente ao confirmar
                        </label>
                        
                        <button
                          onClick={handleSyncNow}
                          disabled={siegSyncing || syncProgress.active}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {(siegSyncing || syncProgress.active) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CloudDownload className="w-4 h-4" />
                          )}
                          {(siegSyncing || syncProgress.active) ? 'Importando...' : 'Importar Agora'}
                        </button>
                      </div>
                      
                      {/* Barra de progresso */}
                      {syncProgress.active && (
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            <span className="text-sm font-medium text-gray-700">{syncProgress.step}</span>
                            <span className="text-sm font-bold text-blue-600 ml-auto">{syncProgress.percent}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                              style={{ width: `${syncProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {syncResult && (
                    <div className={`mt-2 p-3 rounded-lg text-sm ${syncResult.error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {syncResult.error ? (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {syncResult.error}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-semibold">Importação concluída!</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white/50 p-2 rounded">
                              <span className="text-green-800">Entradas: </span>
                              <span className="font-bold">{syncResult.processados?.entrada || 0}</span>
                            </div>
                            <div className="bg-white/50 p-2 rounded">
                              <span className="text-green-800">Saídas: </span>
                              <span className="font-bold">{syncResult.processados?.saida || 0}</span>
                            </div>
                          </div>
                          {syncResult.classificados && (syncResult.classificados.cache > 0 || syncResult.classificados.ia > 0) && (
                            <div className="flex items-center gap-2 text-xs bg-purple-50 text-purple-700 p-2 rounded border border-purple-200">
                              <Sparkles className="w-3 h-3" />
                              <span>
                                Classificação IA: 
                                {syncResult.classificados.cache > 0 && ` ${syncResult.classificados.cache} do cache`}
                                {syncResult.classificados.ia > 0 && ` ${syncResult.classificados.ia} pela IA`}
                              </span>
                            </div>
                          )}
                          {syncResult.duplicados?.length > 0 && (
                            <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              {syncResult.duplicados.length} nota(s) já importada(s)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Selecione empresa e competência para verificar</p>
              )}
            </div>
          )}

          {/* Botão Confirmar */}
          <button
            onClick={handleConfirm}
            disabled={!tempCompany || siegSyncing || syncProgress.active}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            {(siegSyncing || syncProgress.active) ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sincronizando SIEG... {syncProgress.percent}%
              </>
            ) : (
              'Confirmar e Continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelector;
