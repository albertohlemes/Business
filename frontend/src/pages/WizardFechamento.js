import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, XCircle, AlertTriangle, Loader2, ArrowRight, ArrowLeft,
  FileX, RotateCcw, Package, Receipt, Calculator, Flag, RefreshCw,
  ChevronDown, ChevronUp, AlertOctagon
} from 'lucide-react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Ícones para cada etapa (8 etapas agora)
const STEP_ICONS = {
  1: FileX,           // Notas Canceladas
  2: RotateCcw,       // Devoluções
  3: AlertOctagon,    // Alertas de CFOP
  4: Package,         // Classificação CFOPs
  5: Receipt,         // PIS/COFINS Entradas
  6: Receipt,         // PIS/COFINS Saídas
  7: Calculator,      // Reforma Tributária
  8: Flag             // Concluído
};

const WizardFechamento = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStepData, setCurrentStepData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [stepProgress, setStepProgress] = useState(null);  // Progresso da etapa atual
  const [initialStepLoaded, setInitialStepLoaded] = useState(false);  // Flag para carregar etapa inicial

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
      
      const wizardData = response.data.wizard;
      setWizard(wizardData);
      setSteps(response.data.steps);
      
      // Verificar se tem step na URL para ir direto para aquela etapa
      const stepFromUrl = searchParams.get('step');
      if (stepFromUrl && !initialStepLoaded) {
        const targetStep = parseInt(stepFromUrl);
        if (targetStep >= 1 && targetStep <= 7) {
          // Navegar diretamente para a etapa especificada na URL
          try {
            await axios.post(
              `${API}/api/wizard-fechamento/step/${selectedCompany.id}/${targetStep}/go?competencia=${encodeURIComponent(selectedCompetencia)}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setWizard(prev => ({ ...prev, current_step: targetStep }));
            await loadStepData(targetStep);
            setInitialStepLoaded(true);
            return;
          } catch (err) {
            console.error('Erro ao navegar para etapa da URL:', err);
          }
        }
      }
      
      // Carregar dados da etapa atual
      await loadStepData(wizardData.current_step);
    } catch (err) {
      console.error('Erro ao carregar wizard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia, searchParams, initialStepLoaded]);

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
      
      // Progresso baseado na etapa com velocidade proporcional ao tempo real
      let progressInterval;
      const step = wizard.current_step;
      
      if (step === 3 || step === 4 || step === 5) {
        // Etapas que processam muitos itens - progresso mais lento e proporcional
        let percent = 0;
        const phases = {
          3: ['Carregando produtos...', 'Classificando com IA...', 'Aplicando memorizações...', 'Salvando classificações...'],
          4: ['Analisando entradas...', 'Calculando CSTs...', 'Corrigindo divergências...', 'Finalizando...'],
          5: ['Analisando saídas...', 'Calculando CSTs...', 'Aplicando correções...', 'Finalizando...']
        };
        
        const stepPhases = phases[step] || ['Processando...'];
        let phaseIdx = 0;
        
        // Progresso mais lento: step 3 com IA demora mais
        const incrementSpeed = step === 3 ? 1.5 : 3;
        
        progressInterval = setInterval(() => {
          // Desacelerar à medida que se aproxima do fim
          const speedFactor = percent < 30 ? 1.0 : (percent < 60 ? 0.6 : (percent < 80 ? 0.3 : 0.1));
          percent += incrementSpeed * speedFactor * Math.random();
          
          // Mudar fase baseado no progresso
          if (percent >= 20 && phaseIdx === 0) phaseIdx = 1;
          if (percent >= 50 && phaseIdx === 1) phaseIdx = 2;
          if (percent >= 80 && phaseIdx === 2) phaseIdx = 3;
          
          // Limitar a 85% para deixar espaço para o salvamento real
          const displayPercent = Math.min(percent, 85);
          
          setStepProgress({
            phase: stepPhases[Math.min(phaseIdx, stepPhases.length - 1)],
            percent: displayPercent,
            detail: displayPercent > 80 ? 'Aguarde, salvando no banco de dados...' : ''
          });
        }, 500);  // Intervalo mais longo
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
      
      case 2: // Devoluções - Notas de entrada emitidas por terceiros
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Identifique notas de entrada emitidas por terceiros que podem ser devoluções de vendas da sua empresa.
              Ao lado de cada nota, é exibida a nota de venda original referenciada (se encontrada).
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{data.total || 0}</p>
                <p className="text-xs text-[#666]">Notas de Terceiros</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{data.total_com_original || 0}</p>
                <p className="text-xs text-[#666]">Com Original</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{data.total_sem_original || 0}</p>
                <p className="text-xs text-[#666]">Sem Original</p>
              </div>
            </div>
            
            {data.notas_devolucao?.length > 0 ? (
              <div className="space-y-2">
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {data.notas_devolucao.map((nota, idx) => (
                    <div key={idx} className={`bg-[#0C0C0C] rounded-lg p-3 ${nota.desconsiderada ? 'opacity-60' : ''}`}>
                      {/* Layout em duas colunas */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Coluna 1: Nota de entrada (devolução) */}
                        <div className="border-r border-[#333] pr-4">
                          <p className="text-xs text-amber-400 font-medium mb-1">NOTA DE ENTRADA (TERCEIRO)</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-bold">NF {nota.numero_nfe}</p>
                              <p className="text-xs text-[#666] truncate">{nota.emitente_nome}</p>
                              <p className="text-xs text-[#888]">{nota.data_emissao?.slice(0,10) || ''}</p>
                            </div>
                            <p className="text-white font-medium">R$ {(nota.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                          </div>
                          {nota.cfops?.length > 0 && (
                            <div className="mt-1 flex gap-1 flex-wrap">
                              {nota.cfops.map((c, i) => (
                                <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-1 rounded">{c}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Coluna 2: Nota original referenciada */}
                        <div className="pl-2">
                          <p className="text-xs text-emerald-400 font-medium mb-1">NOTA ORIGINAL (SUA VENDA)</p>
                          {nota.nota_original_encontrada && nota.nota_original ? (
                            <div>
                              <p className="text-white font-bold">NF {nota.nota_original.numero_nfe}</p>
                              <p className="text-xs text-[#888]">{nota.nota_original.data_emissao?.slice(0,10) || ''}</p>
                              <p className="text-white">R$ {(nota.nota_original.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              {nota.nota_original.cfops?.length > 0 && (
                                <div className="mt-1 flex gap-1 flex-wrap">
                                  {nota.nota_original.cfops.map((c, i) => (
                                    <span key={i} className="text-xs bg-emerald-500/20 text-emerald-300 px-1 rounded">{c}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-amber-500/10 rounded p-2">
                              <p className="text-amber-400 text-xs">⚠ Nota original não encontrada</p>
                              <p className="text-[#666] text-xs mt-1">
                                {nota.nfe_referenciada ? `Ref: ${nota.nfe_referenciada.slice(-15)}` : 'Sem referência no XML'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status de desconsideração */}
                      {nota.desconsiderada && (
                        <div className="mt-2 bg-emerald-500/10 rounded p-2">
                          <p className="text-emerald-400 text-xs">✓ Já desconsiderada: {nota.motivo_desconsideracao}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhuma nota de entrada de terceiros encontrada</p>
              </div>
            )}
            
            <button
              onClick={() => completeStep({ 
                notas_desconsiderar: data.notas_devolucao?.filter(n => !n.desconsiderada && n.nota_original_encontrada).map(n => ({ devolucao_id: n.id, original_id: n.nota_original?.id })) || [],
                desconsiderar_sem_original: data.notas_devolucao?.filter(n => !n.desconsiderada && !n.nota_original_encontrada).map(n => n.id) || []
              })}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Continuar
            </button>
          </div>
        );
      
      case 3: // Alertas de CFOP - Mesmo visual da Classificação Inteligente
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Revise os CFOPs de operações distintas pendentes de classificação. Apenas notas de entrada são exibidas.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{data.total_cfops || 0}</p>
                <p className="text-xs text-[#666]">Alertas CFOP</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{data.total_pendentes || data.total_produtos || 0}</p>
                <p className="text-xs text-[#666]">Produtos Pendentes</p>
              </div>
            </div>
            
            {(data.alertas_cfop?.length > 0 || data.cfops_distintos?.length > 0) ? (
              <div className="space-y-4 max-h-[450px] overflow-y-auto">
                {(data.alertas_cfop || data.cfops_distintos || []).map((cfopItem, idx) => (
                  <div key={idx} className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl overflow-hidden">
                    {/* Header do grupo CFOP */}
                    <div className="p-4 bg-gradient-to-r from-[#1A1A1A] to-[#141414]">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                          <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                            <span className="text-2xl font-bold font-mono text-amber-400">{cfopItem.cfop}</span>
                          </div>
                          <div>
                            <p className="text-white font-semibold">{cfopItem.descricao}</p>
                            <p className="text-sm text-[#A1A1AA]">
                              {cfopItem.cfop_original && cfopItem.cfop_original !== cfopItem.cfop && (
                                <span className="text-purple-400 mr-2">Original: {cfopItem.cfop_original} →</span>
                              )}
                              <span className="text-amber-400 font-medium">{cfopItem.total_produtos}</span> produto(s) • 
                              <span className="text-[#C8A951] ml-1">R$ {(cfopItem.total_valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </p>
                          </div>
                        </div>
                        
                        {/* Botões de ação em lote */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Botão Manter */}
                          <button
                            onClick={() => {
                              const acoes = JSON.parse(localStorage.getItem('wizard_acoes_cfops') || '{}');
                              acoes[cfopItem.cfop] = { acao: 'manter', cfop_destino: cfopItem.cfop };
                              localStorage.setItem('wizard_acoes_cfops', JSON.stringify(acoes));
                              // Visual feedback
                              document.getElementById(`btn-group-${cfopItem.cfop}`)?.classList.add('ring-2', 'ring-blue-500');
                            }}
                            className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Manter {cfopItem.cfop}
                          </button>
                          
                          {/* Botão Converter para Compra */}
                          <button
                            onClick={() => {
                              const acoes = JSON.parse(localStorage.getItem('wizard_acoes_cfops') || '{}');
                              acoes[cfopItem.cfop] = { acao: 'converter_compra', cfop_destino: cfopItem.sugestao_compra?.cfop || '1102' };
                              localStorage.setItem('wizard_acoes_cfops', JSON.stringify(acoes));
                            }}
                            className="px-3 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Converter → {cfopItem.sugestao_compra?.cfop || '1102'}
                            {cfopItem.sugestao_compra?.categoria_nome && (
                              <span className="px-2 py-0.5 bg-green-500/30 rounded text-xs">
                                {cfopItem.sugestao_compra.categoria_nome}
                              </span>
                            )}
                          </button>
                          
                          {/* Botão Outro CFOP */}
                          <button
                            onClick={() => {
                              const inputEl = document.getElementById(`input-cfop-wizard-${cfopItem.cfop}`);
                              if (inputEl) inputEl.classList.toggle('hidden');
                            }}
                            className="px-3 py-2 bg-[#2A2A2A] text-[#A1A1AA] border border-[#333] rounded-lg hover:bg-[#333] hover:text-white text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            Outro CFOP
                          </button>
                          
                          {/* Botão Expandir/Recolher */}
                          <button
                            onClick={(e) => {
                              const target = document.getElementById(`content-${cfopItem.cfop}`);
                              if (target) target.classList.toggle('hidden');
                              e.currentTarget.querySelector('svg')?.classList.toggle('rotate-180');
                            }}
                            className="p-2 bg-[#2A2A2A] text-[#A1A1AA] border border-[#333] rounded-lg hover:bg-[#333] hover:text-white transition-colors"
                          >
                            <ChevronDown className="w-5 h-5 transition-transform" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Input para CFOP manual */}
                      <div id={`input-cfop-wizard-${cfopItem.cfop}`} className="mt-3 hidden">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Digite o CFOP (ex: 1949)"
                            maxLength={4}
                            className="flex-1 bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-sm text-white"
                            onChange={(e) => {
                              const cfopDigitado = e.target.value.replace(/\D/g, '');
                              if (cfopDigitado.length === 4) {
                                const acoes = JSON.parse(localStorage.getItem('wizard_acoes_cfops') || '{}');
                                acoes[cfopItem.cfop] = { acao: 'converter_manual', cfop_destino: cfopDigitado };
                                localStorage.setItem('wizard_acoes_cfops', JSON.stringify(acoes));
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-[#666] mt-1">Digite 4 dígitos do CFOP de destino</p>
                      </div>
                      
                      {/* Info de categoria que será atribuída */}
                      {cfopItem.sugestao_manter && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#666]">
                          <span>
                            Ao resolver: 
                            <span className="text-[#C8A951] ml-1">
                              {cfopItem.sugestao_manter.categoria_nome || 'Pendente'} (manter)
                            </span>
                            {cfopItem.sugestao_compra && (
                              <>
                                {' ou '}
                                <span className="text-green-400">
                                  {cfopItem.sugestao_compra.categoria_nome || 'Compra para Revenda'} (converter)
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Conteúdo expandível - Notas e Produtos */}
                    <div id={`content-${cfopItem.cfop}`} className="hidden border-t border-[#333] bg-[#0a0a0a] max-h-64 overflow-y-auto">
                      {cfopItem.notas?.map((nota, nIdx) => (
                        <div key={nIdx} className="p-3 border-b border-[#222] last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">NF {nota.numero_nfe}</span>
                              <span className="text-xs text-[#666]">{nota.data_emissao?.slice(0, 10)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-[#888]">{nota.emitente?.slice(0, 30)}</span>
                            </div>
                          </div>
                          
                          {/* Produtos da nota */}
                          <div className="space-y-1 mt-2">
                            {nota.produtos?.map((prod, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between text-xs bg-[#111] rounded p-2">
                                <div className="flex-1">
                                  <p className="text-white truncate">{prod.descricao}</p>
                                  <p className="text-[#666]">
                                    NCM: {prod.ncm || 'N/A'} 
                                    {prod.cfop_original_emissor && (
                                      <span className="ml-2 text-purple-400">CFOP Original: {prod.cfop_original_emissor}</span>
                                    )}
                                  </p>
                                </div>
                                <span className="text-white ml-2">
                                  R$ {(prod.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhum alerta de CFOP pendente de revisão</p>
              </div>
            )}
            
            <button
              onClick={() => {
                const acoes = JSON.parse(localStorage.getItem('wizard_acoes_cfops') || '{}');
                completeStep({ acoes_cfops: acoes });
                localStorage.removeItem('wizard_acoes_cfops');
              }}
              disabled={processing}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Continuar
            </button>
          </div>
        );
      
      case 4: // Classificação de CFOPs (antigo case 3)
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
      
      case 5: // PIS/COFINS Entradas
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
      
      case 6: // PIS/COFINS Saídas
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
      
      case 7: // Reforma Tributária
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

          {/* Histórico de Processamento */}
          {wizard?.steps_completed?.length > 0 && (
            <div className="mt-8 bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Histórico do Processamento
              </h3>
              
              <div className="space-y-3">
                {steps.filter(s => wizard?.steps_completed?.includes(s.id)).map((step) => {
                  const stepData = wizard?.steps_data?.[{1: 'canceladas', 2: 'devolucoes', 3: 'cfops_distintos', 4: 'classificacao', 5: 'pis_cofins_entrada', 6: 'pis_cofins_saida'}[step.id] || ''] || {};
                  const Icon = STEP_ICONS[step.id] || CheckCircle;
                  
                  return (
                    <div key={step.id} className="flex items-center justify-between bg-[#0C0C0C] rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{step.title}</p>
                          {stepData.actions?.length > 0 && (
                            <p className="text-xs text-[#888]">{stepData.actions.slice(0, 2).join(' • ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {stepData.completed_at && (
                          <p className="text-xs text-emerald-400">
                            ✓ {new Date(stepData.completed_at).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default WizardFechamento;
