import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Clock, CheckCircle, AlertTriangle, ChevronRight, 
  RefreshCw, FileX, RotateCcw, Package, Receipt, Calculator, Flag
} from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';
import DashboardInconsistencias from './DashboardInconsistencias';
import { useAppContext } from '../context/AppContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Ícones para cada etapa - SINCRONIZADO COM BACKEND (WIZARD_STEPS)
const STEP_ICONS = {
  1: FileX,           // Notas Canceladas
  2: RotateCcw,       // Devoluções
  3: AlertTriangle,   // Alertas de CFOP
  4: Package,         // Classificação CFOPs
  5: Receipt,         // PIS/COFINS Entradas
  6: Receipt,         // PIS/COFINS Saídas
  7: Calculator       // Reforma Tributária
};

// IMPORTANTE: Nomes sincronizados com WIZARD_STEPS do backend
const STEP_NAMES = {
  1: 'Notas Canceladas',
  2: 'Devoluções',
  3: 'Alertas CFOP',
  4: 'Classif. Produtos',
  5: 'PIS/COFINS Entradas',
  6: 'PIS/COFINS Saídas',
  7: 'Reforma Tributária'
};

const AlertasPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [wizardSummary, setWizardSummary] = useState(null);
  const [loadingWizard, setLoadingWizard] = useState(true);

  // Carregar status do wizard
  const loadWizardSummary = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) {
      setWizardSummary(null);
      setLoadingWizard(false);
      return;
    }
    
    setLoadingWizard(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/wizard-fechamento/summary/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWizardSummary(response.data);
    } catch (err) {
      console.error('Erro ao carregar resumo do wizard:', err);
      setWizardSummary(null);
    } finally {
      setLoadingWizard(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    loadWizardSummary();
  }, [loadWizardSummary]);

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Card do Wizard de Fechamento */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Flag className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Wizard de Fechamento Fiscal</h2>
                <p className="text-sm text-[#A1A1AA]">
                  {selectedCompany?.razao_social || 'Selecione uma empresa'} • {selectedCompetencia || 'Selecione a competência'}
                </p>
              </div>
            </div>
            
            {selectedCompany && selectedCompetencia && (
              <button
                onClick={() => navigate('/wizard-fechamento')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors"
              >
                <Play className="w-5 h-5" />
                {wizardSummary?.has_wizard ? 'Continuar Wizard' : 'Iniciar Wizard'}
              </button>
            )}
          </div>

          {/* Status das Etapas */}
          {loadingWizard ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : !selectedCompany || !selectedCompetencia ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-400">Selecione uma empresa e competência para ver o status do fechamento</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((stepId) => {
                const stepSummary = wizardSummary?.steps_summary?.find(s => s.step_id === stepId);
                const isCompleted = stepSummary?.completed || false;
                const lastRun = stepSummary?.completed_at;
                const Icon = STEP_ICONS[stepId] || Calculator;
                
                return (
                  <div 
                    key={stepId}
                    className={`bg-[#0C0C0C] rounded-xl p-3 border cursor-pointer hover:bg-[#1A1A1A] transition-colors ${
                      isCompleted ? 'border-emerald-500/30' : 'border-[#2A2A2A]'
                    }`}
                    onClick={() => navigate(`/wizard-fechamento?step=${stepId}`)}
                    data-testid={`wizard-step-${stepId}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-emerald-500/20' : 'bg-[#1A1A1A]'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Icon className="w-3.5 h-3.5 text-[#666]" />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-400' : 'text-[#666]'}`}>
                        {stepId}/7
                      </span>
                    </div>
                    
                    <h3 className={`text-xs font-medium mb-1 leading-tight ${isCompleted ? 'text-white' : 'text-[#A1A1AA]'}`}>
                      {STEP_NAMES[stepId]}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-[10px] mb-2">
                      <Clock className="w-2.5 h-2.5 text-[#666]" />
                      <span className="text-[#666] truncate">
                        {lastRun ? formatDate(lastRun) : 'Pendente'}
                      </span>
                    </div>
                    
                    {/* Botão Processar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/wizard-fechamento?step=${stepId}`);
                      }}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                        isCompleted 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5" />
                      {isCompleted ? 'Revisar' : 'Processar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo Geral */}
          {wizardSummary?.has_wizard && (
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#A1A1AA]">
                  Progresso: <span className="text-white font-bold">{wizardSummary.steps_completed}/{wizardSummary.total_steps}</span> etapas
                </span>
                {wizardSummary.status === 'completed' && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">
                    Concluído
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/wizard-fechamento')}
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
              >
                Ver detalhes
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dashboard de Inconsistências (componente existente) */}
        <DashboardInconsistencias />
      </div>
    </Layout>
  );
};

export default AlertasPage;
