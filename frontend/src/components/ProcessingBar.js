import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, FileSearch, Brain, Database, FileCheck } from 'lucide-react';

const steps = {
  upload: { icon: FileSearch, label: 'Enviando arquivo...' },
  analyzing: { icon: Brain, label: 'Analisando com IA...' },
  extracting: { icon: FileSearch, label: 'Extraindo dados...' },
  processing: { icon: Brain, label: 'Processando...' },
  comparing: { icon: FileCheck, label: 'Comparando documentos...' },
  validating: { icon: FileCheck, label: 'Validando informações...' },
  saving: { icon: Database, label: 'Salvando dados...' },
  complete: { icon: CheckCircle2, label: 'Concluído!' }
};

const ProcessingBar = ({ 
  isProcessing, 
  currentStep = 'processing',
  progress = null,
  customSteps = null,
  estimatedTime = null,
  showPercentage = true
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (isProcessing) {
      setElapsedTime(0);
      setCurrentStepIndex(0);
      setDisplayProgress(0);
      
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        
        // Progresso mais suave que nunca trava
        setDisplayProgress(prev => {
          if (prev >= 99) return 99;
          // Progresso logarítmico - começa rápido, desacelera gradualmente
          const target = 99;
          const speed = 0.3; // Velocidade base
          const remaining = target - prev;
          const increment = Math.max(0.1, remaining * speed * 0.1);
          return Math.min(99, prev + increment);
        });
        
        // Avança os steps automaticamente
        if (customSteps) {
          setCurrentStepIndex(prev => {
            const maxIndex = customSteps.length - 1;
            // Muda de step a cada ~10 segundos
            const newIndex = Math.min(maxIndex, Math.floor(elapsedTime / 10));
            return newIndex;
          });
        }
      }, 1000);
    } else {
      setDisplayProgress(100);
      if (customSteps) {
        setCurrentStepIndex(customSteps.length - 1);
      }
    }
    return () => clearInterval(interval);
  }, [isProcessing, customSteps, elapsedTime]);

  if (!isProcessing && displayProgress < 100) return null;

  const actualProgress = progress !== null ? progress : displayProgress;
  const stepInfo = steps[currentStep] || steps.processing;
  const StepIcon = stepInfo.icon;

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Mensagens dinâmicas baseadas no tempo
  const getDynamicMessage = () => {
    if (!isProcessing) return 'Concluído!';
    if (elapsedTime < 10) return customSteps?.[0] || 'Iniciando...';
    if (elapsedTime < 20) return customSteps?.[1] || 'Processando documento...';
    if (elapsedTime < 40) return customSteps?.[2] || 'Analisando com IA...';
    if (elapsedTime < 60) return customSteps?.[3] || 'Extraindo informações...';
    if (elapsedTime < 90) return 'Quase lá, finalizando análise...';
    return 'Processamento extenso, aguarde...';
  };

  return (
    <div className="w-full space-y-3 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {isProcessing ? (
            <Loader2 className="animate-spin text-indigo-600" size={18} />
          ) : (
            <CheckCircle2 className="text-emerald-600" size={18} />
          )}
          <span>{getDynamicMessage()}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {isProcessing && (
            <span className="font-mono">
              {formatTime(elapsedTime)}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar com animação contínua */}
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
            isProcessing 
              ? 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500' 
              : 'bg-emerald-500'
          }`}
          style={{ width: `${actualProgress}%` }}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* Steps indicator visual */}
      {customSteps && customSteps.length > 0 && (
        <div className="flex justify-between items-center px-1">
          {customSteps.map((step, index) => {
            const isComplete = index < currentStepIndex || !isProcessing;
            const isActive = index === currentStepIndex && isProcessing;
            return (
              <div 
                key={index} 
                className={`flex items-center gap-1.5 text-xs transition-all duration-300 ${
                  isComplete ? 'text-emerald-600' : isActive ? 'text-indigo-600 font-semibold' : 'text-slate-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-emerald-500' : isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'
                }`} />
                <span className="hidden sm:inline">{step}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Preset configurations for different operations
export const ImportColaboradoresProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'extracting' : 'complete'}
    customSteps={['Enviando', 'Lendo documento', 'Extraindo dados', 'Finalizando']}
  />
);

export const ValidacaoFolhaProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'comparing' : 'complete'}
    customSteps={['Enviando', 'Analisando', 'Comparando', 'Validando']}
  />
);

export const ImportMediasProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'extracting' : 'complete'}
    customSteps={['Enviando', 'Lendo', 'Extraindo', 'Processando']}
  />
);

export const DissidioProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'analyzing' : 'complete'}
    customSteps={['Enviando', 'Analisando', 'Calculando', 'Prévia']}
  />
);

export const InformesProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'comparing' : 'complete'}
    customSteps={['Enviando', 'Lendo', 'Comparando', 'Relatório']}
  />
);

export default ProcessingBar;
