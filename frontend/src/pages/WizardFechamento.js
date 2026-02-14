import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, XCircle, AlertTriangle, Loader2, ArrowRight, ArrowLeft,
  FileX, RotateCcw, Package, Receipt, Calculator, Flag, RefreshCw,
  ChevronDown, ChevronUp, AlertOctagon, Download, FileText, FileSpreadsheet, Zap, Home
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

// Componente para a etapa de conclusão - mais dinâmico
const WizardConcluidoStep = ({ 
  selectedCompany, 
  selectedCompetencia, 
  data, 
  downloadReport, 
  downloadingReport, 
  resetWizard,
  navigate 
}) => {
  const [reportDownloaded, setReportDownloaded] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Handler para baixar e depois mostrar opção de voltar
  const handleDownloadAndClose = async (formato) => {
    await downloadReport(formato);
    setReportDownloaded(true);
    setShowSuccessMessage(true);
    
    // Após 2 segundos, redirecionar automaticamente
    setTimeout(() => {
      navigate('/alertas');
    }, 2500);
  };

  // Handler para voltar direto
  const handleVoltar = () => {
    navigate('/alertas');
  };

  return (
    <div className="space-y-6 text-center">
      {/* Ícone de Sucesso Animado */}
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
        <Flag className="w-10 h-10 text-emerald-400" />
      </div>
      
      <h3 className="text-2xl font-bold text-white">Fechamento Concluído!</h3>
      
      <p className="text-[#A1A1AA]">
        Todas as etapas do fechamento fiscal foram concluídas com sucesso.
      </p>
      
      {/* Resumo */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
        <p className="text-emerald-400">
          ✓ Empresa: {selectedCompany?.razao_social}<br />
          ✓ Competência: {selectedCompetencia}<br />
          ✓ Etapas concluídas: {data?.steps_completed?.length || 7} de 7
        </p>
      </div>
      
      {/* Mensagem de sucesso após download */}
      {showSuccessMessage && (
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 animate-pulse">
          <p className="text-purple-400 font-medium">
            ✓ Relatório baixado! Redirecionando para a Central de Fechamento...
          </p>
        </div>
      )}
      
      {/* Seção de Relatórios - Destacada */}
      {!reportDownloaded ? (
        <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/10 border-2 border-purple-500/40 rounded-xl p-6 animate-pulse-slow">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Download className="w-6 h-6 text-purple-400" />
            <h4 className="text-xl font-bold text-white">Baixe seu Relatório</h4>
          </div>
          <p className="text-sm text-[#A1A1AA] mb-5">
            Exporte o histórico completo de todas as alterações realizadas pelo wizard.
            <br />
            <span className="text-purple-300">Após o download, você será redirecionado automaticamente.</span>
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => handleDownloadAndClose('pdf')}
              disabled={downloadingReport}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg inline-flex items-center gap-2 transition-all hover:scale-105 font-medium"
            >
              {downloadingReport === 'pdf' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              Baixar PDF
            </button>
            <button
              onClick={() => handleDownloadAndClose('excel')}
              disabled={downloadingReport}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 px-6 rounded-lg inline-flex items-center gap-2 transition-all hover:scale-105 font-medium"
            >
              {downloadingReport === 'excel' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
              Baixar Excel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-400">Relatório baixado com sucesso!</p>
        </div>
      )}
      
      {/* Botões de Ação */}
      <div className="flex justify-center gap-4 pt-2">
        <button
          onClick={handleVoltar}
          className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg inline-flex items-center gap-2 font-medium transition-all hover:scale-105"
        >
          <Home className="w-5 h-5" />
          Voltar para Central de Fechamento
        </button>
        <button
          onClick={resetWizard}
          className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 px-6 rounded-lg inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reiniciar Wizard
        </button>
      </div>
    </div>
  );
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
  const [downloadingReport, setDownloadingReport] = useState(null);  // 'pdf' ou 'excel'
  const [cfopSelections, setCfopSelections] = useState({});  // { cfop: { acao: 'manter'|'converter'|'manual', cfop_destino: '...' } }
  const [manualCfopInputs, setManualCfopInputs] = useState({});  // { cfop: '1234' } - valores dos inputs manuais
  const [showConfirmModal, setShowConfirmModal] = useState(false);  // Modal de confirmação para reclassificação IA
  const [decisoesOriginais, setDecisoesOriginais] = useState({});  // { nota_id: 'manter'|'excluir' } - decisões para devoluções com divergência
  const [cfopsPorProduto, setCfopsPorProduto] = useState({});  // { `${cfop}_${docId}_${prodIdx}`: 'cfop_destino' } - CFOP individual por produto

  // Função para baixar relatório do wizard
  const downloadReport = async (formato) => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    
    setDownloadingReport(formato);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/wizard-fechamento/relatorio/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&formato=${formato}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const ext = formato === 'excel' ? 'xlsx' : 'pdf';
      const compFmt = selectedCompetencia.replace('/', '-');
      const empresaNome = (selectedCompany.razao_social || selectedCompany.nome || 'Empresa').substring(0, 30).replace(/\s+/g, '_');
      link.setAttribute('download', `Wizard_Fechamento_${empresaNome}_${compFmt}.${ext}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setDownloadingReport(null);
    }
  };

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
      case 1: // Notas Canceladas - Separadas por Entradas e Saídas
        const entradas_canceladas = (data.notas_canceladas || []).filter(n => n.tipo === 'entrada');
        const saidas_canceladas = (data.notas_canceladas || []).filter(n => n.tipo === 'saida');
        
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Revise e confirme as notas fiscais canceladas. Notas confirmadas como canceladas não serão contabilizadas nos totais.
            </p>
            
            {data.notas_canceladas?.length > 0 ? (
              <div className="space-y-4">
                {/* Resumo com separação */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0C0C0C] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">{data.total || 0}</p>
                    <p className="text-xs text-[#666]">Total Canceladas</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-3 text-center border border-blue-500/30">
                    <p className="text-2xl font-bold text-blue-400">{entradas_canceladas.length}</p>
                    <p className="text-xs text-blue-400">Entradas</p>
                  </div>
                  <div className="bg-[#0C0C0C] rounded-lg p-3 text-center border border-emerald-500/30">
                    <p className="text-2xl font-bold text-emerald-400">{saidas_canceladas.length}</p>
                    <p className="text-xs text-emerald-400">Saídas</p>
                  </div>
                </div>
                
                {/* Lista de Entradas Canceladas */}
                {entradas_canceladas.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <p className="text-sm font-medium text-blue-400">ENTRADAS ({entradas_canceladas.length})</p>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {entradas_canceladas.map((nota, idx) => (
                        <div key={`entrada-${idx}`} className="bg-[#0C0C0C] border-l-4 border-blue-500 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">NF {nota.numero_nfe}</p>
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">ENTRADA</span>
                            </div>
                            <p className="text-xs text-[#666]">{nota.emitente_nome}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white">R$ {(nota.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            <p className="text-xs text-[#666]">{nota.data_emissao?.substring(0, 10)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Lista de Saídas Canceladas */}
                {saidas_canceladas.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <p className="text-sm font-medium text-emerald-400">SAÍDAS ({saidas_canceladas.length})</p>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {saidas_canceladas.map((nota, idx) => (
                        <div key={`saida-${idx}`} className="bg-[#0C0C0C] border-l-4 border-emerald-500 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">NF {nota.numero_nfe}</p>
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">SAÍDA</span>
                            </div>
                            <p className="text-xs text-[#666]">{nota.emitente_nome}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white">R$ {(nota.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                            <p className="text-xs text-[#666]">{nota.data_emissao?.substring(0, 10)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhuma nota cancelada encontrada</p>
              </div>
            )}
            
            <button
              onClick={() => completeStep({ notas_confirmar: data.notas_canceladas?.map(n => n.id) || [] })}
              disabled={processing}
              data-testid="wizard-step1-confirm"
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Continuar
            </button>
          </div>
        );
      
      case 2: // Devoluções - Notas de entrada emitidas por terceiros com alerta de diferença de valor
        // Calcular diferenças de valor para destacar
        const notasComDiferenca = (data.notas_devolucao || []).filter(nota => {
          if (!nota.nota_original_encontrada || !nota.nota_original) return false;
          const valorDev = nota.valor_total || 0;
          const valorOrig = nota.nota_original.valor_total || 0;
          return Math.abs(valorDev - valorOrig) > 0.01; // Diferença significativa
        });
        
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Identifique notas de entrada emitidas por terceiros que podem ser devoluções de vendas da sua empresa.
              Ao lado de cada nota, é exibida a nota de venda original referenciada (se encontrada).
            </p>
            
            <div className="grid grid-cols-4 gap-3">
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
              {notasComDiferenca.length > 0 && (
                <div className="bg-[#0C0C0C] border border-red-500/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{notasComDiferenca.length}</p>
                  <p className="text-xs text-red-400">Com Divergência</p>
                </div>
              )}
            </div>
            
            {data.notas_devolucao?.length > 0 ? (
              <div className="space-y-2">
                <div className="max-h-[420px] overflow-y-auto space-y-3">
                  {data.notas_devolucao.map((nota, idx) => {
                    // Calcular diferença de valor
                    const valorDev = nota.valor_total || 0;
                    const valorOrig = nota.nota_original?.valor_total || 0;
                    const diferenca = nota.nota_original_encontrada ? valorOrig - valorDev : 0;
                    const temDiferenca = Math.abs(diferenca) > 0.01;
                    const decisao = decisoesOriginais[nota.id] || 'excluir'; // default: excluir original
                    
                    return (
                      <div key={idx} className={`bg-[#0C0C0C] rounded-lg p-3 ${nota.desconsiderada ? 'opacity-60' : ''} ${temDiferenca ? 'border border-red-500/50' : ''}`}>
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
                        
                        {/* ALERTA DE DIFERENÇA DE VALOR */}
                        {temDiferenca && nota.nota_original_encontrada && (
                          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                              <p className="text-red-400 font-medium">Diferença de Valor Detectada!</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                              <div className="text-center">
                                <p className="text-[#666]">Devolução</p>
                                <p className="text-amber-400 font-bold">R$ {valorDev.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[#666]">Original</p>
                                <p className="text-emerald-400 font-bold">R$ {valorOrig.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[#666]">Diferença</p>
                                <p className={`font-bold ${diferenca > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {diferenca > 0 ? '+' : ''}R$ {diferenca.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </p>
                              </div>
                            </div>
                            
                            {/* Opções para o usuário */}
                            <p className="text-xs text-[#A1A1AA] mb-2">O que fazer com a nota original?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDecisoesOriginais(prev => ({ ...prev, [nota.id]: 'manter' }))}
                                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                                  decisao === 'manter'
                                    ? 'bg-emerald-600 text-white border-2 border-emerald-400'
                                    : 'bg-[#1A1A1A] text-[#A1A1AA] border border-[#333] hover:border-emerald-500/50'
                                }`}
                                data-testid={`devolucao-manter-${nota.id}`}
                              >
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                MANTER Original
                              </button>
                              <button
                                onClick={() => setDecisoesOriginais(prev => ({ ...prev, [nota.id]: 'excluir' }))}
                                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                                  decisao === 'excluir'
                                    ? 'bg-red-600 text-white border-2 border-red-400'
                                    : 'bg-[#1A1A1A] text-[#A1A1AA] border border-[#333] hover:border-red-500/50'
                                }`}
                                data-testid={`devolucao-excluir-${nota.id}`}
                              >
                                <XCircle className="w-4 h-4 inline mr-1" />
                                EXCLUIR Original
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Status de desconsideração */}
                        {nota.desconsiderada && (
                          <div className="mt-2 bg-emerald-500/10 rounded p-2">
                            <p className="text-emerald-400 text-xs">✓ Já desconsiderada: {nota.motivo_desconsideracao}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhuma nota de entrada de terceiros encontrada</p>
              </div>
            )}
            
            <button
              onClick={() => {
                // Filtrar notas COM base nas decisões do usuário
                // REGRA: 
                // - Notas SEM divergência de valor → excluir original automaticamente
                // - Notas COM divergência de valor → só excluir se usuário escolheu 'excluir' explicitamente
                const notasParaExcluir = data.notas_devolucao?.filter(n => {
                  if (n.desconsiderada) return false;
                  if (!n.nota_original_encontrada) return false;
                  
                  const valorDev = n.valor_total || 0;
                  const valorOrig = n.nota_original?.valor_total || 0;
                  const temDiferenca = Math.abs(valorOrig - valorDev) > 0.01;
                  
                  if (temDiferenca) {
                    // COM divergência: só excluir se usuário EXPLICITAMENTE escolheu 'excluir'
                    // Se não decidiu ou escolheu 'manter', NÃO excluir (manter por padrão)
                    return decisoesOriginais[n.id] === 'excluir';
                  }
                  
                  // SEM divergência: valores iguais = excluir original automaticamente
                  return true;
                }).map(n => ({ devolucao_id: n.id, original_id: n.nota_original?.id })) || [];
                
                completeStep({ 
                  notas_desconsiderar: notasParaExcluir,
                  desconsiderar_sem_original: data.notas_devolucao?.filter(n => !n.desconsiderada && !n.nota_original_encontrada).map(n => n.id) || [],
                  decisoes_divergencia: decisoesOriginais
                });
              }}
              disabled={processing}
              data-testid="wizard-step2-confirm"
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Confirmar e Continuar
            </button>
          </div>
        );
      
      case 3: // Alertas de CFOP - Com seleção visual para cada CFOP
        return (
          <div className="space-y-4">
            <p className="text-[#A1A1AA]">
              Revise os CFOPs de operações distintas. <span className="text-amber-400 font-medium">Selecione uma ação para cada CFOP</span> e clique em "Confirmar e Continuar" para aplicar todas as alterações.
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
                {(data.alertas_cfop || data.cfops_distintos || []).map((cfopItem, idx) => {
                  // cfopItem.cfop agora é o CFOP ORIGINAL do emissor (5xxx, 6xxx)
                  const selectedAction = cfopSelections[cfopItem.cfop] || { acao: null };
                  const isManterSelected = selectedAction.acao === 'manter';
                  const isConverterSelected = selectedAction.acao === 'converter_compra';
                  const isManualSelected = selectedAction.acao === 'converter_manual';
                  const hasSelection = selectedAction.acao !== null;
                  
                  // CFOP de entrada equivalente sugerido pelo backend
                  const cfopEntradaSugerido = cfopItem.cfop_entrada_sugerido || cfopItem.sugestao_manter?.cfop;
                  const cfopCompra = cfopItem.sugestao_compra?.cfop || '1102';
                  
                  return (
                    <div key={idx} className={`bg-[#0C0C0C] border rounded-xl overflow-hidden transition-all ${hasSelection ? 'border-emerald-500/50' : 'border-[#2A2A2A]'}`}>
                      {/* Header do grupo CFOP - Mostrando CFOP ORIGINAL */}
                      <div className="p-4 bg-gradient-to-r from-[#1A1A1A] to-[#141414]">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                              <span className="text-2xl font-bold font-mono text-amber-400">{cfopItem.cfop}</span>
                            </div>
                            <div>
                              <p className="text-white font-semibold">{cfopItem.descricao}</p>
                              <p className="text-sm text-[#A1A1AA]">
                                <span className="text-purple-400 mr-2">CFOP Original do Emissor</span>
                                <span className="text-amber-400 font-medium">{cfopItem.total_produtos}</span> produto(s) • 
                                <span className="text-[#C8A951] ml-1">R$ {(cfopItem.total_valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                              </p>
                            </div>
                          </div>
                          
                          {/* Indicador de seleção */}
                          {hasSelection && (
                            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span className="text-emerald-400 text-sm font-medium">
                                {isManterSelected && `Converter → ${selectedAction.cfop_destino}`}
                                {isConverterSelected && `Converter → ${selectedAction.cfop_destino}`}
                                {isManualSelected && `Converter → ${selectedAction.cfop_destino}`}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Botões de seleção - Estilo Radio */}
                        <div className="flex items-center gap-3 mt-4 flex-wrap">
                          {/* Opção Entrada Equivalente (baseado no CFOP original) */}
                          <button
                            onClick={() => {
                              setCfopSelections(prev => ({
                                ...prev,
                                [cfopItem.cfop]: { acao: 'manter', cfop_destino: cfopEntradaSugerido }
                              }));
                            }}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border-2 ${
                              isManterSelected 
                                ? 'bg-blue-500/30 text-blue-300 border-blue-500 ring-2 ring-blue-500/50' 
                                : 'bg-[#1A1A1A] text-[#A1A1AA] border-[#333] hover:border-blue-500/50 hover:text-blue-400'
                            }`}
                            data-testid={`cfop-manter-${cfopItem.cfop}`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isManterSelected ? 'border-blue-400' : 'border-[#666]'}`}>
                              {isManterSelected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                            </div>
                            <ArrowRight className="w-4 h-4" />
                            Converter → {cfopEntradaSugerido}
                            {cfopItem.sugestao_manter?.categoria_nome && (
                              <span className="px-2 py-0.5 bg-blue-500/30 rounded text-xs">
                                {cfopItem.sugestao_manter.categoria_nome}
                              </span>
                            )}
                          </button>
                          
                          {/* Opção Converter para Compra (1102/2102) */}
                          <button
                            onClick={() => {
                              setCfopSelections(prev => ({
                                ...prev,
                                [cfopItem.cfop]: { acao: 'converter_compra', cfop_destino: cfopCompra }
                              }));
                            }}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border-2 ${
                              isConverterSelected 
                                ? 'bg-green-500/30 text-green-300 border-green-500 ring-2 ring-green-500/50' 
                                : 'bg-[#1A1A1A] text-[#A1A1AA] border-[#333] hover:border-green-500/50 hover:text-green-400'
                            }`}
                            data-testid={`cfop-converter-${cfopItem.cfop}`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isConverterSelected ? 'border-green-400' : 'border-[#666]'}`}>
                              {isConverterSelected && <div className="w-2 h-2 rounded-full bg-green-400" />}
                            </div>
                            <ArrowRight className="w-4 h-4" />
                            Converter → {cfopCompra}
                            {cfopItem.sugestao_compra?.categoria_nome && (
                              <span className="px-2 py-0.5 bg-green-500/30 rounded text-xs">
                                {cfopItem.sugestao_compra.categoria_nome}
                              </span>
                            )}
                          </button>
                          
                          {/* Opção Outro CFOP */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const currentManual = manualCfopInputs[cfopItem.cfop] || '';
                                if (currentManual.length === 4) {
                                  setCfopSelections(prev => ({
                                    ...prev,
                                    [cfopItem.cfop]: { acao: 'converter_manual', cfop_destino: currentManual }
                                  }));
                                } else {
                                  // Mostrar input
                                  setCfopSelections(prev => ({
                                    ...prev,
                                    [cfopItem.cfop]: { acao: 'converter_manual', cfop_destino: '' }
                                  }));
                                }
                              }}
                              className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border-2 ${
                                isManualSelected 
                                  ? 'bg-purple-500/30 text-purple-300 border-purple-500 ring-2 ring-purple-500/50' 
                                  : 'bg-[#1A1A1A] text-[#A1A1AA] border-[#333] hover:border-purple-500/50 hover:text-purple-400'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isManualSelected ? 'border-purple-400' : 'border-[#666]'}`}>
                                {isManualSelected && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                              </div>
                              Outro CFOP
                            </button>
                            
                            {/* Input para CFOP manual - sempre visível quando selecionado */}
                            {isManualSelected && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="CFOP"
                                  maxLength={4}
                                  value={manualCfopInputs[cfopItem.cfop] || ''}
                                  onChange={(e) => {
                                    const cfopDigitado = e.target.value.replace(/\D/g, '');
                                    setManualCfopInputs(prev => ({ ...prev, [cfopItem.cfop]: cfopDigitado }));
                                    if (cfopDigitado.length === 4) {
                                      setCfopSelections(prev => ({
                                        ...prev,
                                        [cfopItem.cfop]: { acao: 'converter_manual', cfop_destino: cfopDigitado }
                                      }));
                                    }
                                  }}
                                  className="w-20 bg-[#1a1a1a] border border-purple-500/50 rounded px-3 py-2 text-sm text-white text-center font-mono"
                                />
                                {manualCfopInputs[cfopItem.cfop]?.length === 4 && (
                                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Botão Expandir/Recolher */}
                          <button
                            onClick={() => {
                              setExpandedItems(prev => ({
                                ...prev,
                                [`cfop-${cfopItem.cfop}`]: !prev[`cfop-${cfopItem.cfop}`]
                              }));
                            }}
                            className="p-2 bg-[#2A2A2A] text-[#A1A1AA] border border-[#333] rounded-lg hover:bg-[#333] hover:text-white transition-colors ml-auto"
                          >
                            <ChevronDown className={`w-5 h-5 transition-transform ${expandedItems[`cfop-${cfopItem.cfop}`] ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        
                        {/* Info de categoria que será atribuída */}
                        {cfopItem.sugestao_manter && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-[#666]">
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
                      
                      {/* Conteúdo expandível - Notas e Produtos com CFOP individual */}
                      {expandedItems[`cfop-${cfopItem.cfop}`] && (
                        <div className="border-t border-[#333] bg-[#0a0a0a] max-h-80 overflow-y-auto">
                          {/* Dica sobre CFOP individual */}
                          <div className="px-3 py-2 bg-purple-500/10 border-b border-purple-500/20">
                            <p className="text-xs text-purple-300">
                              💡 Você pode definir um CFOP diferente para cada produto individualmente, ou deixar em branco para usar a ação padrão do CFOP acima.
                            </p>
                          </div>
                          
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
                              
                              {/* Produtos da nota com CFOP individual */}
                              <div className="space-y-2 mt-2">
                                {nota.produtos?.map((prod, pIdx) => {
                                  const prodKey = `${cfopItem.cfop}_${nota.doc_id}_${prod.produto_idx}`;
                                  const cfopIndividual = cfopsPorProduto[prodKey] || '';
                                  const temCfopIndividual = cfopIndividual.length === 4;
                                  
                                  return (
                                    <div key={pIdx} className={`bg-[#111] rounded-lg p-3 transition-all ${temCfopIndividual ? 'border border-cyan-500/30' : ''}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex-1">
                                          <p className="text-white text-sm font-medium truncate">{prod.descricao}</p>
                                          <p className="text-xs text-[#666]">
                                            NCM: {prod.ncm || 'N/A'} 
                                            {prod.cfop_original_emissor && (
                                              <span className="ml-2 text-purple-400">CFOP Original: {prod.cfop_original_emissor}</span>
                                            )}
                                          </p>
                                        </div>
                                        <span className="text-white text-sm ml-2">
                                          R$ {(prod.valor_total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </span>
                                      </div>
                                      
                                      {/* Input de CFOP individual por produto */}
                                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#222]">
                                        <span className="text-xs text-[#A1A1AA]">CFOP Individual:</span>
                                        <input
                                          type="text"
                                          placeholder={selectedAction.cfop_destino || cfopItem.cfop}
                                          maxLength={4}
                                          value={cfopIndividual}
                                          onChange={(e) => {
                                            const cfopDigitado = e.target.value.replace(/\D/g, '');
                                            setCfopsPorProduto(prev => ({
                                              ...prev,
                                              [prodKey]: cfopDigitado
                                            }));
                                          }}
                                          className={`w-24 bg-[#1a1a1a] border rounded px-2 py-1.5 text-sm text-white text-center font-mono transition-all ${
                                            temCfopIndividual 
                                              ? 'border-cyan-500 bg-cyan-500/10' 
                                              : 'border-[#333] hover:border-[#555]'
                                          }`}
                                          data-testid={`cfop-produto-${prodKey}`}
                                        />
                                        {temCfopIndividual ? (
                                          <div className="flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4 text-cyan-400" />
                                            <span className="text-xs text-cyan-400">Personalizado</span>
                                            <button
                                              onClick={() => {
                                                setCfopsPorProduto(prev => {
                                                  const newState = { ...prev };
                                                  delete newState[prodKey];
                                                  return newState;
                                                });
                                              }}
                                              className="ml-1 text-[#666] hover:text-red-400"
                                              title="Limpar CFOP individual"
                                            >
                                              <XCircle className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-[#666]">
                                            → Usar padrão: {selectedAction.cfop_destino || cfopItem.cfop}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-400">✓ Nenhum alerta de CFOP pendente de revisão</p>
              </div>
            )}
            
            {/* Resumo das seleções */}
            {(Object.keys(cfopSelections).length > 0 || Object.keys(cfopsPorProduto).length > 0) && (
              <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Resumo das Alterações
                </h4>
                
                {/* CFOPs em lote */}
                {Object.keys(cfopSelections).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-[#A1A1AA] mb-2">{Object.keys(cfopSelections).length} CFOPs selecionados (em lote):</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cfopSelections).map(([cfop, selection]) => (
                        <span key={cfop} className={`px-3 py-1 rounded-lg text-sm ${
                          selection.acao === 'manter' ? 'bg-blue-500/20 text-blue-400' :
                          selection.acao === 'converter_compra' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {cfop} → {selection.cfop_destino}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* CFOPs individuais por produto */}
                {Object.keys(cfopsPorProduto).length > 0 && (
                  <div>
                    <p className="text-xs text-[#A1A1AA] mb-2">{Object.keys(cfopsPorProduto).length} produtos com CFOP individual:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(cfopsPorProduto).filter(([, cfop]) => cfop.length === 4).map(([key, cfop]) => (
                        <span key={key} className="px-3 py-1 rounded-lg text-sm bg-cyan-500/20 text-cyan-400">
                          → {cfop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => {
                // Preparar ações em lote para enviar ao backend
                const acoes_cfops = {};
                Object.entries(cfopSelections).forEach(([cfop, selection]) => {
                  if (selection.acao && selection.cfop_destino) {
                    acoes_cfops[cfop] = selection;
                  }
                });
                
                // Se não selecionou nenhuma ação, aplicar "manter" como padrão para todos
                const allCfops = data.alertas_cfop || data.cfops_distintos || [];
                allCfops.forEach(cfopItem => {
                  if (!acoes_cfops[cfopItem.cfop]) {
                    acoes_cfops[cfopItem.cfop] = { acao: 'manter', cfop_destino: cfopItem.cfop };
                  }
                });
                
                // Preparar CFOPs individuais por produto
                // Formato: { "cfop_docId_prodIdx": "cfop_destino" }
                const cfops_individuais = {};
                Object.entries(cfopsPorProduto).forEach(([key, cfop]) => {
                  if (cfop.length === 4) {
                    cfops_individuais[key] = cfop;
                  }
                });
                
                completeStep({ 
                  acoes_cfops, 
                  cfops_individuais 
                });
                
                // Limpar seleções após confirmar
                setCfopSelections({});
                setManualCfopInputs({});
                setCfopsPorProduto({});
              }}
              disabled={processing}
              data-testid="wizard-step3-confirm"
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
              Classifique os produtos das notas de entrada. A classificação segue uma hierarquia inteligente de 6 regras.
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
                <p className="text-sm text-white font-medium">Produtos pendentes (primeiros 20):</p>
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
            
            {/* Hierarquia de Classificação - Info Box */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Hierarquia de Classificação (6 Regras)
              </h4>
              <ol className="text-sm text-[#A1A1AA] space-y-1 list-decimal list-inside">
                <li>CFOP de Devolução (automático)</li>
                <li>Cache de Regras Aprendidas</li>
                <li>Aprendizado por NCM (match com vendas)</li>
                <li>Aprendizado por Palavras-Chave (match com vendas)</li>
                <li>Palavras-Chave Cadastradas pela Empresa</li>
                <li>Classificação por IA (Gemini) como último recurso</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              {/* Botão para classificar em lote com padrão da empresa */}
              {(data.total_pendentes || 0) > 0 && (
                <button
                  onClick={async () => {
                    setProcessing(true);
                    try {
                      const token = localStorage.getItem('token');
                      const res = await axios.post(
                        `${API}/api/wizard-fechamento/classificar-pendentes/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      if (res.data.success) {
                        alert(`${res.data.total_produtos_classificados} produtos classificados como ${res.data.categoria_aplicada?.toUpperCase() || 'REVENDA'}`);
                        loadStepData(wizard.current_step);
                      }
                    } catch (err) {
                      alert('Erro ao classificar produtos');
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Classificar Todos com Padrão da Empresa (Rápido)
                </button>
              )}
              
              {/* Botão para classificar com IA - agora sempre pergunta */}
              <button
                onClick={() => setShowConfirmModal(true)}
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
            
            {/* Modal de Confirmação para Reclassificação */}
            {showConfirmModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 max-w-lg w-full">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    Confirmar Reclassificação
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-[#A1A1AA]">
                      {(data.total_classificados || 0) > 0 
                        ? `Existem ${data.total_classificados} produtos já classificados. Deseja reclassificar TODOS os produtos usando a hierarquia inteligente?`
                        : `Deseja classificar ${data.total_pendentes || 0} produtos pendentes usando a hierarquia inteligente?`
                      }
                    </p>
                    
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-sm text-amber-400">
                        <strong>Atenção:</strong> Produtos já classificados serão reclassificados seguindo a nova hierarquia de regras.
                      </p>
                    </div>
                    
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-sm text-purple-400 font-medium mb-2">Ordem de prioridade:</p>
                      <ol className="text-xs text-[#A1A1AA] space-y-0.5 list-decimal list-inside">
                        <li>CFOP de Devolução</li>
                        <li>Regras Aprendidas (learned_rules)</li>
                        <li>NCM encontrado em vendas</li>
                        <li>Palavras-chave encontradas em vendas</li>
                        <li>Palavras-chave cadastradas pela empresa</li>
                        <li>IA Gemini (último recurso)</li>
                      </ol>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowConfirmModal(false);
                          completeStep({ classificar_produtos: true, forcar_reclassificacao: true });
                        }}
                        disabled={processing}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] text-white py-3 rounded-lg font-medium"
                      >
                        {processing ? 'Processando...' : 'Sim, Reclassificar'}
                      </button>
                      <button
                        onClick={() => setShowConfirmModal(false)}
                        className="flex-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3 rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
      
      case 8: // Concluído
        return (
          <WizardConcluidoStep 
            selectedCompany={selectedCompany}
            selectedCompetencia={selectedCompetencia}
            data={data}
            downloadReport={downloadReport}
            downloadingReport={downloadingReport}
            resetWizard={resetWizard}
            navigate={navigate}
          />
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
                  const stepData = wizard?.steps_data?.[{1: 'canceladas', 2: 'devolucoes', 3: 'alertas_cfop', 4: 'classificacao', 5: 'pis_cofins_entrada', 6: 'pis_cofins_saida'}[step.id] || ''] || {};
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
