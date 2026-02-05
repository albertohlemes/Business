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
  progress = null, // 0-100 or null for indeterminate
  customSteps = null, // Array of custom step labels
  estimatedTime = null, // Estimated time in seconds
  showPercentage = true
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  useEffect(() => {
    let interval;
    if (isProcessing) {
      setElapsedTime(0);
      setSimulatedProgress(0);
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        // Simulate progress if not provided
        setSimulatedProgress(prev => {
          if (prev >= 95) return prev;
          // Slower as it gets higher
          const increment = Math.max(0.5, (100 - prev) / 50);
          return Math.min(95, prev + increment);
        });
      }, 1000);
    } else {
      setSimulatedProgress(100);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  if (!isProcessing && simulatedProgress < 100) return null;

  const displayProgress = progress !== null ? progress : simulatedProgress;
  const stepInfo = steps[currentStep] || steps.processing;
  const StepIcon = stepInfo.icon;

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full space-y-3 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {isProcessing ? (
            <Loader2 className="animate-spin text-indigo-600" size={18} />
          ) : (
            <StepIcon className="text-emerald-600" size={18} />
          )}
          <span>{stepInfo.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {showPercentage && (
            <span className="font-mono font-semibold text-indigo-600">
              {Math.round(displayProgress)}%
            </span>
          )}
          {isProcessing && (
            <span className="font-mono">
              {formatTime(elapsedTime)}
              {estimatedTime && elapsedTime < estimatedTime && (
                <span className="text-slate-400"> / ~{formatTime(estimatedTime)}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isProcessing 
              ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-500 animate-pulse' 
              : 'bg-emerald-500'
          }`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Custom steps indicator */}
      {customSteps && customSteps.length > 0 && (
        <div className="flex justify-between text-xs text-slate-400 px-1">
          {customSteps.map((step, index) => {
            const stepProgress = ((index + 1) / customSteps.length) * 100;
            const isActive = displayProgress >= stepProgress - 10 && displayProgress < stepProgress + 10;
            const isComplete = displayProgress >= stepProgress;
            return (
              <div 
                key={index} 
                className={`flex items-center gap-1 transition-colors ${
                  isComplete ? 'text-emerald-600' : isActive ? 'text-indigo-600 font-medium' : ''
                }`}
              >
                {isComplete && <CheckCircle2 size={12} />}
                <span>{step}</span>
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
    customSteps={['Upload', 'Leitura IA', 'Extração', 'Revisão']}
    estimatedTime={30}
  />
);

export const ValidacaoFolhaProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'comparing' : 'complete'}
    customSteps={['Upload', 'Análise', 'Comparação', 'Validação']}
    estimatedTime={60}
  />
);

export const ImportMediasProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'extracting' : 'complete'}
    customSteps={['Upload', 'Leitura', 'Extração', 'Processamento']}
    estimatedTime={45}
  />
);

export const DissidioProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'analyzing' : 'complete'}
    customSteps={['Upload', 'Análise IA', 'Cálculos', 'Prévia']}
    estimatedTime={40}
  />
);

export const InformesProgress = ({ isProcessing }) => (
  <ProcessingBar 
    isProcessing={isProcessing}
    currentStep={isProcessing ? 'comparing' : 'complete'}
    customSteps={['Upload', 'Leitura', 'Comparação', 'Relatório']}
    estimatedTime={50}
  />
);

export default ProcessingBar;
