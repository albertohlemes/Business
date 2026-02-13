import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, XCircle, AlertTriangle, Loader2, ArrowRight, ArrowLeft,
  FileX, RotateCcw, Package, Receipt, Calculator, Flag, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Ícones para cada etapa
const STEP_ICONS = {
  1: FileX,
  2: RotateCcw,
  3: Package,
  4: Receipt,
  5: Receipt,
  6: Calculator,
  7: Flag
};

const WizardFechamento = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStepData, setCurrentStepData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [stepProgress, setStepProgress] = useState(null);  // Progresso da etapa atual

  // Carregar status do wizard
  const loadWizardStatus = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/wizard-fechamento/status/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setWizard(response.data.wizard);
      setSteps(response.data.steps);
      
      // Carregar dados da etapa atual
      await loadStepData(response.data.wizard.current_step);
    } catch (err) {
      console.error('Erro ao carregar wizard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  // Carregar dados de uma etapa específica
  const loadStepData = async (stepId) => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/wizard-fechamento/step/${selectedCompany.id}/${stepId}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCurrentStepData(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados da etapa:', err);
    }
  };

  // Completar etapa com progresso
  const completeStep = async (stepData = {}) => {
    if (!wizard) return;
    
    setProcessing(true);
    setStepProgress({ phase: 'Iniciando...', percent: 0, detail: '' });
    
    try {
      const token = localStorage.getItem('token');
      
      // Simular progresso baseado na etapa
      let progressInterval;
      const step = wizard.current_step;
      
      if (step === 3 || step === 4 || step === 5) {
        // Etapas que processam muitos itens - simular progresso
        let percent = 0;
        const phases = {
          3: ['Carregando produtos...', 'Classificando com IA...', 'Aplicando memorizações...', 'Salvando...'],
          4: ['Analisando entradas...', 'Calculando CSTs...', 'Corrigindo divergências...', 'Salvando...'],
          5: ['Analisando saídas...', 'Calculando CSTs...', 'Aplicando correções...', 'Salvando...']
        };
        
        const stepPhases = phases[step] || ['Processando...'];
        let phaseIdx = 0;
        
        progressInterval = setInterval(() => {
          percent += Math.random() * 8;
          if (percent >= 25 && phaseIdx === 0) phaseIdx = 1;
          if (percent >= 50 && phaseIdx === 1) phaseIdx = 2;
          if (percent >= 75 && phaseIdx === 2) phaseIdx = 3;
          
          setStepProgress({
            phase: stepPhases[Math.min(phaseIdx, stepPhases.length - 1)],
            percent: Math.min(percent, 95),
            detail: ''
          });
        }, 300);
      } else {
        // Etapas simples
        setStepProgress({ phase: 'Processando...', percent: 50, detail: '' });
      }
      
      const response = await axios.post(
        `${API}/api/wizard-fechamento/step/${selectedCompany.id}/${wizard.current_step}/complete?competencia=${encodeURIComponent(selectedCompetencia)}`,
        stepData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (progressInterval) clearInterval(progressInterval);
      setStepProgress({ phase: 'Concluído!', percent: 100, detail: '' });
      
      // Aguardar um pouco antes de recarregar
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarregar wizard
      await loadWizardStatus();
    } catch (err) {
      console.error('Erro ao completar etapa:', err);
      setStepProgress({ phase: 'Erro!', percent: 0, detail: err.message });
    } finally {
      setProcessing(false);
      setTimeout(() => setStepProgress(null), 1500);
    }
  };

  // Navegar para etapa
  const goToStep = async (stepId) => {
    if (!wizard) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/wizard-fechamento/step/${selectedCompany.id}/${stepId}/go?competencia=${encodeURIComponent(selectedCompetencia)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setWizard(prev => ({ ...prev, current_step: stepId }));
      await loadStepData(stepId);
    } catch (err) {
      console.error('Erro ao navegar:', err);
    }
  };

  // Reiniciar wizard
  const resetWizard = async () => {
    if (!confirm('Tem certeza que deseja reiniciar o wizard? Todo o progresso será perdido.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/wizard-fechamento/reset/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await loadWizardStatus();
    } catch (err) {
      console.error('Erro ao reiniciar:', err);
    }
  };

  useEffect(() => {
    loadWizardStatus();
  }, [loadWizardStatus]);

  // Renderizar conteúdo de cada etapa
  const renderStepContent = () => {
    if (!currentStepData || !wizard) return null;
    
    const step = wizard.current_step;
    const data = currentStepData.data || {};
    
    switch (step) {
      case 1: // Notas Canceladas
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Revise e confirme as notas fiscais canceladas. Notas confirmadas como canceladas não serão contabilizadas nos totais.
            </p>
            
            {data.notas_canceladas?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-400">
                  {data.total} notas potencialmente canceladas encontradas
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {data.notas_canceladas.map((nota, idx) => (
                    <div key={idx} className="bg-[#0C0C0C] rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">NF {nota.numero_nfe}</p>
                        <p className="text-xs text-[#666]">{nota.emitente_nome}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">R$ {(nota.valor_total || 0).toFixed(2)}</p>
                        <p className="text-xs text-[#666]">{nota.data_emissao?.substring(0, 10)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhuma nota cancelada encontrada</p>
              </div>
            )}
            
            <button
              onClick={() => completeStep({ notas_confirmar: data.notas_canceladas?.map(n => n.id) || [] })}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Continuar
            </button>
          </div>
        );
      
      case 2: // Devoluções
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Identifique notas de devolução de fornecedores que devem ser desconsideradas da apuração.
            </p>
            
            {data.notas_devolucao?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-amber-400">
                  {data.total} notas de devolução encontradas
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {data.notas_devolucao.map((nota, idx) => (
                    <div key={idx} className="bg-[#0C0C0C] rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">NF {nota.numero_nfe}</p>
                          <p className="text-xs text-[#666]">{nota.emitente_nome}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white">R$ {(nota.valor_total || 0).toFixed(2)}</p>
                          {nota.desconsiderada_devolucao && (
                            <span className="text-xs text-amber-400">Já desconsiderada</span>
                          )}
                        </div>
                      </div>
                      {nota.motivo_desconsideracao && (
                        <p className="text-xs text-[#666] mt-2">{nota.motivo_desconsideracao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhuma nota de devolução pendente</p>
              </div>
            )}
            
            <button
              onClick={() => completeStep({ notas_desconsiderar: data.notas_devolucao?.filter(n => !n.desconsiderada_devolucao).map(n => n.id) || [] })}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Continuar
            </button>
          </div>
        );
      
      case 3: // Classificação de CFOPs
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Classifique os produtos das notas de entrada. Produtos já memorizados serão classificados automaticamente.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">{data.total_classificados || 0}</p>
                <p className="text-sm text-[#666]">Já Classificados</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-400">{data.total_pendentes || 0}</p>
                <p className="text-sm text-[#666]">Pendentes</p>
              </div>
            </div>
            
            {data.produtos_pendentes?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-white font-medium">Produtos pendentes (primeiros 100):</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {data.produtos_pendentes.slice(0, 20).map((prod, idx) => (
                    <div key={idx} className="bg-[#0C0C0C] rounded-lg p-2 text-sm">
                      <p className="text-white truncate">{prod.descricao}</p>
                      <div className="flex items-center gap-4 text-xs text-[#666]">
                        <span>NCM: {prod.ncm}</span>
                        <span>CFOP: {prod.cfop}</span>
                        <span>NF: {prod.nfe}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={() => completeStep({ classificar_produtos: true })}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                Classificar Produtos com IA
              </button>
              
              <button
                onClick={() => completeStep({ classificar_produtos: false })}
                disabled={processing}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg text-sm"
              >
                Pular (não classificar agora)
              </button>
            </div>
          </div>
        );
      
      case 4: // PIS/COFINS Entradas
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Revise e corrija os CSTs de PIS e COFINS dos documentos de entrada.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{data.total_documentos || 0}</p>
                <p className="text-sm text-[#666]">Documentos de Entrada</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-400">{data.total_divergencias || 0}</p>
                <p className="text-sm text-[#666]">Com Divergências</p>
              </div>
            </div>
            
            {data.docs_com_divergencia?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-amber-400">Documentos com divergências de CST:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {data.docs_com_divergencia.slice(0, 10).map((doc, idx) => (
                    <div key={idx} className="bg-[#0C0C0C] rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">NF {doc.nfe}</p>
                        <span className="text-xs text-amber-400">{doc.divergencias?.length} divergências</span>
                      </div>
                      <p className="text-xs text-[#666]">{doc.emitente}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={() => completeStep({ recalcular_cst: true })}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
                Recalcular e Corrigir CSTs
              </button>
              
              <button
                onClick={() => completeStep({ recalcular_cst: false })}
                disabled={processing}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg text-sm"
              >
                Manter CSTs Atuais
              </button>
            </div>
          </div>
        );
      
      case 5: // PIS/COFINS Saídas
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Revise os CSTs de PIS e COFINS dos documentos de saída.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{data.total_documentos || 0}</p>
                <p className="text-sm text-[#666]">Documentos de Saída</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-400">{data.resumo?.nfce || 0}</p>
                <p className="text-sm text-[#666]">NFC-e</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => completeStep({ recalcular_cst: true })}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />}
                Recalcular CSTs de Saída
              </button>
              
              <button
                onClick={() => completeStep({ recalcular_cst: false })}
                disabled={processing}
                className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 rounded-lg text-sm"
              >
                Manter CSTs Atuais
              </button>
            </div>
          </div>
        );
      
      case 6: // Reforma Tributária
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Visualize o cálculo do IVA Dual (CBS + IBS) da Reforma Tributária.
            </p>
            
            {data.apuracao ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      R$ {(data.apuracao.debitos?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-[#666]">Débitos</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      R$ {(data.apuracao.creditos?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-[#666]">Créditos</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                    <p className={`text-2xl font-bold ${(data.apuracao.saldo?.total || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      R$ {Math.abs(data.apuracao.saldo?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-[#666]">
                      {(data.apuracao.saldo?.total || 0) > 0 ? 'A Pagar' : 'Crédito'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <p className="text-sm text-purple-400">
                    Alíquotas: CBS {data.config?.aliquota_cbs}% + IBS {data.config?.aliquota_ibs}% = {data.config?.aliquota_total}%
                  </p>
                </div>
              </div>
            ) : data.error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400">Erro: {data.error}</p>
              </div>
            ) : (
              <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                <p className="text-[#666] mt-2">Calculando...</p>
              </div>
            )}
            
            <button
              onClick={() => completeStep({})}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Finalizar
            </button>
          </div>
        );
      
      case 7: // Concluído
        return (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <Flag className="w-10 h-10 text-emerald-400" />
            </div>
            
            <h3 className="text-2xl font-bold text-white">Fechamento Concluído!</h3>
            
            <p className="text-[#A1A1AA]">
              Todas as etapas do fechamento fiscal foram concluídas com sucesso.
            </p>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <p className="text-emerald-400">
                ✓ Empresa: {selectedCompany?.razao_social}<br />
                ✓ Competência: {selectedCompetencia}<br />
                ✓ Etapas concluídas: {data.steps_completed?.length || 0} de 6
              </p>
            </div>
            
            <button
              onClick={resetWizard}
              className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-2 px-6 rounded-lg inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reiniciar Wizard
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!selectedCompany || !selectedCompetencia) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="min-h-full bg-[#0C0C0C] text-white p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Selecione uma empresa e competência</h2>
            <p className="text-[#A1A1AA]">Use o seletor no topo da página para escolher a empresa e competência.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="min-h-full bg-[#0C0C0C] text-white p-6 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
        </div>
      </Layout>
    );
  }

  const currentStep = steps.find(s => s.id === wizard?.current_step) || steps[0];
  const StepIcon = STEP_ICONS[wizard?.current_step] || CheckCircle;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="min-h-full bg-[#0C0C0C] text-white p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Wizard de Fechamento</h1>
                <p className="text-[#A1A1AA]">
                  {selectedCompany?.razao_social} • {selectedCompetencia}
                </p>
              </div>
              <button
                onClick={resetWizard}
                className="text-[#666] hover:text-white flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reiniciar
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, idx) => {
                const isCompleted = wizard?.steps_completed?.includes(step.id);
                const isCurrent = wizard?.current_step === step.id;
                const Icon = STEP_ICONS[step.id] || CheckCircle;
                
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => goToStep(step.id)}
                      className={`flex flex-col items-center gap-2 ${
                        isCurrent ? 'text-purple-400' : isCompleted ? 'text-emerald-400' : 'text-[#666]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCurrent ? 'bg-purple-500/20 border-2 border-purple-500' : 
                        isCompleted ? 'bg-emerald-500/20 border-2 border-emerald-500' : 
                        'bg-[#1A1A1A] border border-[#2A2A2A]'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span className="text-xs hidden md:block max-w-[80px] text-center truncate">
                        {step.title}
                      </span>
                    </button>
                    
                    {idx < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${
                        wizard?.steps_completed?.includes(step.id) ? 'bg-emerald-500/50' : 'bg-[#2A2A2A]'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Current Step Card */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <StepIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{currentStep?.title}</h2>
                <p className="text-sm text-[#A1A1AA]">{currentStep?.description}</p>
              </div>
            </div>
            
            {/* Barra de Progresso durante processamento */}
            {stepProgress && (
              <div className="mb-6 bg-[#0C0C0C] rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-300 font-medium">{stepProgress.phase}</span>
                  <span className="text-sm text-white font-bold">{Math.round(stepProgress.percent)}%</span>
                </div>
                <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300 ease-out"
                    style={{ width: `${stepProgress.percent}%` }}
                  />
                </div>
                {stepProgress.detail && (
                  <p className="text-xs text-[#666] mt-2">{stepProgress.detail}</p>
                )}
              </div>
            )}
            
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => navigate('/alertas')}
              className="text-[#666] hover:text-white flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Central
            </button>
            
            <div className="flex items-center gap-3">
              {wizard?.current_step > 1 && (
                <button
                  onClick={() => goToStep(wizard.current_step - 1)}
                  className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Etapa Anterior
                </button>
              )}
              
              {wizard?.current_step < 7 && wizard?.steps_completed?.includes(wizard.current_step) && (
                <button
                  onClick={() => goToStep(wizard.current_step + 1)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  Próxima Etapa
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default WizardFechamento;
