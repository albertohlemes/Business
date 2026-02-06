import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getEmpresaCodigo, getEmpresaNome } from '../utils/empresaUtils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { 
  FileCheck, Upload, Loader2, CheckCircle2, AlertTriangle, XCircle,
  FileText, Trash2, Building2, DollarSign, Calendar, User, Shield,
  ChevronRight, ChevronLeft, ArrowRight, Check, FileSpreadsheet, Scale
} from 'lucide-react';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Etapas do wizard
const STEPS = [
  { id: 1, title: 'Termo de Rescisão', subtitle: 'Identificar colaborador e valores', icon: FileCheck, color: 'text-red-500' },
  { id: 2, title: 'Apontamento de Apoio', subtitle: 'Verificar variáveis lançadas', icon: FileSpreadsheet, color: 'text-purple-500' },
  { id: 3, title: 'Convenção Coletiva', subtitle: 'Validar termos e direitos', icon: Scale, color: 'text-blue-500' },
  { id: 4, title: 'Extrato FGTS', subtitle: 'Conferir multa rescisória', icon: Shield, color: 'text-emerald-500' },
];

const ValidacaoRescisao = () => {
  // Estado do wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [stepCompleted, setStepCompleted] = useState({});
  
  // Arquivos
  const [termoRescisao, setTermoRescisao] = useState(null);
  const [apoio, setApoio] = useState([]);
  const [convencao, setConvencao] = useState(null);
  const [extratoFgts, setExtratoFgts] = useState(null);
  
  // Resultados por etapa
  const [termoData, setTermoData] = useState(null);
  const [apoioData, setApoioData] = useState(null);
  const [convencaoData, setConvencaoData] = useState(null);
  const [fgtsData, setFgtsData] = useState(null);
  
  // Estados de UI
  const [processing, setProcessing] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada } = useEmpresa();

  // Dropzones
  const termoDropzone = useDropzone({
    onDrop: useCallback((files) => { if (files.length > 0) setTermoRescisao(files[0]); }, []),
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });
  
  const apoioDropzone = useDropzone({
    onDrop: useCallback((files) => { setApoio(prev => [...prev, ...files]); }, []),
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: true
  });
  
  const convencaoDropzone = useDropzone({
    onDrop: useCallback((files) => { if (files.length > 0) setConvencao(files[0]); }, []),
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });
  
  const fgtsDropzone = useDropzone({
    onDrop: useCallback((files) => { if (files.length > 0) setExtratoFgts(files[0]); }, []),
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });

  // Processar Etapa 1 - Termo de Rescisão
  const processarTermo = async () => {
    if (!termoRescisao) { toast.error('Faça upload do termo de rescisão'); return; }
    if (!empresaSelecionada) { toast.error('Selecione uma empresa'); setSelectorOpen(true); return; }
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('cliente_id', empresaSelecionada.id);
      formData.append('termo_rescisao', termoRescisao);
      formData.append('etapa', '1');

      const response = await axios.post(`${API_URL}/api/validacao/rescisao/etapa1`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      setTermoData(response.data);
      setStepCompleted(prev => ({ ...prev, 1: true }));
      toast.success('Termo analisado com sucesso!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  // Processar Etapa 2 - Apontamento de Apoio
  const processarApoio = async () => {
    if (apoio.length === 0) { toast.error('Faça upload do apontamento de apoio'); return; }
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('cliente_id', empresaSelecionada.id);
      formData.append('termo_data', JSON.stringify(termoData));
      apoio.forEach(f => formData.append('apoio', f));

      const response = await axios.post(`${API_URL}/api/validacao/rescisao/etapa2`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      setApoioData(response.data);
      setStepCompleted(prev => ({ ...prev, 2: true }));
      toast.success('Apontamento validado!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  // Processar Etapa 3 - Convenção Coletiva
  const processarConvencao = async () => {
    if (!convencao) { toast.error('Faça upload da convenção coletiva'); return; }
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('cliente_id', empresaSelecionada.id);
      formData.append('termo_data', JSON.stringify(termoData));
      formData.append('convencao', convencao);

      const response = await axios.post(`${API_URL}/api/validacao/rescisao/etapa3`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      setConvencaoData(response.data);
      setStepCompleted(prev => ({ ...prev, 3: true }));
      toast.success('Convenção analisada!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  // Processar Etapa 4 - Extrato FGTS
  const processarFgts = async () => {
    if (!extratoFgts) { toast.error('Faça upload do extrato FGTS'); return; }
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('cliente_id', empresaSelecionada.id);
      formData.append('termo_data', JSON.stringify(termoData));
      formData.append('extrato_fgts', extratoFgts);

      const response = await axios.post(`${API_URL}/api/validacao/rescisao/etapa4`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      setFgtsData(response.data);
      setStepCompleted(prev => ({ ...prev, 4: true }));
      toast.success('FGTS validado!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  // Resetar tudo
  const resetar = () => {
    setCurrentStep(1);
    setStepCompleted({});
    setTermoRescisao(null);
    setApoio([]);
    setConvencao(null);
    setExtratoFgts(null);
    setTermoData(null);
    setApoioData(null);
    setConvencaoData(null);
    setFgtsData(null);
  };

  // Componente de Upload Box
  const UploadBox = ({ dropzone, label, file, files, icon: Icon, color, onRemove, description }) => (
    <div className="space-y-2">
      <div 
        {...dropzone.getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dropzone.isDragActive ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
        }`}
      >
        <input {...dropzone.getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <Trash2 size={14} className="mr-1" /> Remover
            </Button>
          </div>
        ) : files?.length > 0 ? (
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <p className="text-white font-medium">{files.length} arquivo(s) selecionado(s)</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-slate-800 rounded px-3 py-1.5">
                  <span className="text-slate-300 truncate">{f.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="text-slate-500 hover:text-red-500 ml-2">
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center ${color}`}>
              <Icon size={32} />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">{label}</p>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
            <p className="text-xs text-slate-600">Clique ou arraste arquivos aqui</p>
          </div>
        )}
      </div>
    </div>
  );

  // Componente de Resultado Card
  const ResultCard = ({ data, title, icon: Icon, color }) => {
    if (!data) return null;
    const hasIssues = data.divergencias?.length > 0 || data.alertas?.length > 0;
    
    return (
      <Card className={`border ${hasIssues ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/30'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon size={18} className={color} />
            {title}
            {hasIssues ? (
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                {(data.divergencias?.length || 0) + (data.alertas?.length || 0)} alerta(s)
              </span>
            ) : (
              <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> OK
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.resumo && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(data.resumo).map(([key, value]) => (
                <div key={key} className="bg-slate-800/50 rounded p-2">
                  <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-white font-mono text-sm">{value || '-'}</p>
                </div>
              ))}
            </div>
          )}
          
          {data.itens_validados?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-medium">Itens validados:</p>
              <div className="flex flex-wrap gap-1">
                {data.itens_validados.map((item, i) => (
                  <span key={i} className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                    <CheckCircle2 size={10} className="inline mr-1" />{item}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {data.divergencias?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400 font-medium">Divergências:</p>
              {data.divergencias.map((div, i) => (
                <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-sm text-white font-medium">{div.item}</p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-slate-400">Informado: <span className="text-red-400 font-mono">{div.valor_informado}</span></span>
                    <span className="text-slate-400">Esperado: <span className="text-emerald-400 font-mono">{div.valor_esperado}</span></span>
                  </div>
                  {div.observacao && <p className="text-xs text-slate-500 mt-1">{div.observacao}</p>}
                </div>
              ))}
            </div>
          )}
          
          {data.alertas?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-amber-400 font-medium">Alertas:</p>
              {data.alertas.map((alerta, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-amber-300 bg-amber-500/10 p-2 rounded">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{alerta}</span>
                </div>
              ))}
            </div>
          )}
          
          {data.observacoes && (
            <div className="bg-slate-800/50 rounded p-2">
              <p className="text-xs text-slate-500 mb-1">Observações:</p>
              <p className="text-sm text-slate-300">{data.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Renderizar conteúdo da etapa atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <FileCheck size={18} className="text-red-500" />
                Etapa 1: Termo de Rescisão
              </h3>
              <p className="text-sm text-slate-400">
                Faça upload do termo de rescisão (TRCT). A IA vai identificar o colaborador, datas de admissão/demissão, 
                tipo de rescisão, valores das verbas e totais.
              </p>
            </div>
            
            <UploadBox 
              dropzone={termoDropzone}
              label="Upload do Termo de Rescisão"
              description="PDF ou imagem do TRCT"
              file={termoRescisao}
              icon={FileCheck}
              color="text-red-500"
              onRemove={() => setTermoRescisao(null)}
            />
            
            <Button 
              onClick={processarTermo} 
              disabled={processing || !termoRescisao} 
              className="w-full bg-red-600 hover:bg-red-700 h-12"
            >
              {processing ? (
                <><Loader2 className="animate-spin mr-2" size={20} />Analisando termo...</>
              ) : (
                <><FileCheck size={20} className="mr-2" />Analisar Termo de Rescisão</>
              )}
            </Button>
            
            {termoData && (
              <ResultCard 
                data={termoData} 
                title="Dados Extraídos do Termo"
                icon={FileCheck}
                color="text-red-500"
              />
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-purple-500" />
                Etapa 2: Apontamento de Apoio
              </h3>
              <p className="text-sm text-slate-400">
                Faça upload do apontamento ou arquivo de apoio (planilha, relatório do sistema). 
                Vamos verificar se todas as variáveis foram lançadas corretamente.
              </p>
            </div>
            
            {termoData && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-300">
                  <strong>Colaborador:</strong> {termoData.resumo?.colaborador || termoData.colaborador || 'N/A'}
                  {' • '}
                  <strong>Tipo:</strong> {termoData.resumo?.tipo_rescisao || 'N/A'}
                </p>
              </div>
            )}
            
            <UploadBox 
              dropzone={apoioDropzone}
              label="Upload do Apontamento de Apoio"
              description="Planilha, PDF ou relatório do sistema"
              files={apoio}
              icon={FileSpreadsheet}
              color="text-purple-500"
              onRemove={(i) => setApoio(prev => prev.filter((_, idx) => idx !== i))}
            />
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => { setStepCompleted(prev => ({ ...prev, 2: true })); setCurrentStep(3); }}
                className="flex-1 border-slate-700"
              >
                Pular esta etapa
              </Button>
              <Button 
                onClick={processarApoio} 
                disabled={processing || apoio.length === 0} 
                className="flex-1 bg-purple-600 hover:bg-purple-700 h-12"
              >
                {processing ? (
                  <><Loader2 className="animate-spin mr-2" size={20} />Validando...</>
                ) : (
                  <><FileSpreadsheet size={20} className="mr-2" />Validar Apontamento</>
                )}
              </Button>
            </div>
            
            {apoioData && (
              <ResultCard 
                data={apoioData} 
                title="Validação do Apontamento"
                icon={FileSpreadsheet}
                color="text-purple-500"
              />
            )}
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <Scale size={18} className="text-blue-500" />
                Etapa 3: Convenção Coletiva
              </h3>
              <p className="text-sm text-slate-400">
                Faça upload da convenção coletiva aplicável. Vamos verificar se a rescisão atende aos 
                termos previstos (aviso prévio adicional, multas, estabilidades, etc.).
              </p>
            </div>
            
            {termoData && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-300">
                  <strong>Colaborador:</strong> {termoData.resumo?.colaborador || termoData.colaborador || 'N/A'}
                  {' • '}
                  <strong>Admissão:</strong> {termoData.resumo?.data_admissao || 'N/A'}
                  {' • '}
                  <strong>Demissão:</strong> {termoData.resumo?.data_demissao || 'N/A'}
                </p>
              </div>
            )}
            
            <UploadBox 
              dropzone={convencaoDropzone}
              label="Upload da Convenção Coletiva"
              description="PDF da CCT vigente"
              file={convencao}
              icon={Scale}
              color="text-blue-500"
              onRemove={() => setConvencao(null)}
            />
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => { setStepCompleted(prev => ({ ...prev, 3: true })); setCurrentStep(4); }}
                className="flex-1 border-slate-700"
              >
                Pular esta etapa
              </Button>
              <Button 
                onClick={processarConvencao} 
                disabled={processing || !convencao} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-12"
              >
                {processing ? (
                  <><Loader2 className="animate-spin mr-2" size={20} />Analisando...</>
                ) : (
                  <><Scale size={20} className="mr-2" />Validar Convenção</>
                )}
              </Button>
            </div>
            
            {convencaoData && (
              <ResultCard 
                data={convencaoData} 
                title="Validação da Convenção"
                icon={Scale}
                color="text-blue-500"
              />
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                <Shield size={18} className="text-emerald-500" />
                Etapa 4: Extrato FGTS / Multa Rescisória
              </h3>
              <p className="text-sm text-slate-400">
                {termoData?.resumo?.tipo_rescisao?.toLowerCase().includes('justa causa') || 
                 termoData?.resumo?.tipo_rescisao?.toLowerCase().includes('pedido') ? (
                  'Neste tipo de rescisão, geralmente não há multa de FGTS. Mas você pode enviar o extrato para conferência.'
                ) : (
                  'Faça upload do extrato de FGTS ou relatório de fins rescisórios. Vamos verificar se o valor da multa 40% está correto.'
                )}
              </p>
            </div>
            
            {termoData && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-300">
                  <strong>Tipo Rescisão:</strong> {termoData.resumo?.tipo_rescisao || 'N/A'}
                  {termoData.resumo?.valor_liquido && (
                    <>
                      {' • '}
                      <strong>Valor Líquido:</strong> R$ {termoData.resumo?.valor_liquido}
                    </>
                  )}
                </p>
              </div>
            )}
            
            <UploadBox 
              dropzone={fgtsDropzone}
              label="Upload do Extrato FGTS"
              description="Extrato ou relatório de fins rescisórios"
              file={extratoFgts}
              icon={Shield}
              color="text-emerald-500"
              onRemove={() => setExtratoFgts(null)}
            />
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => { setStepCompleted(prev => ({ ...prev, 4: true })); }}
                className="flex-1 border-slate-700"
              >
                Pular esta etapa
              </Button>
              <Button 
                onClick={processarFgts} 
                disabled={processing || !extratoFgts} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12"
              >
                {processing ? (
                  <><Loader2 className="animate-spin mr-2" size={20} />Validando...</>
                ) : (
                  <><Shield size={20} className="mr-2" />Validar FGTS</>
                )}
              </Button>
            </div>
            
            {fgtsData && (
              <ResultCard 
                data={fgtsData} 
                title="Validação do FGTS"
                icon={Shield}
                color="text-emerald-500"
              />
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  // Calcular se pode avançar
  const canGoNext = () => {
    if (currentStep === 1) return stepCompleted[1];
    return true;
  };

  return (
    <div data-testid="validacao-rescisao-page" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Validação de Rescisão</h1>
          <p className="text-slate-500 mt-1">Processo guiado de validação em 4 etapas</p>
        </div>
        <div className="flex gap-2">
          {termoData && (
            <Button onClick={resetar} variant="outline" className="border-slate-700 text-slate-300">
              Nova Validação
            </Button>
          )}
          <Button onClick={() => setSelectorOpen(true)} variant="outline" className="border-slate-700 text-slate-300">
            <Building2 size={16} className="mr-2" />
            {empresaSelecionada ? (
              <><span className="text-red-500 font-mono mr-1">{getEmpresaCodigo(empresaSelecionada.id)}</span>{getEmpresaNome(empresaSelecionada)}</>
            ) : 'Selecionar Empresa'}
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = stepCompleted[step.id];
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => step.id <= currentStep || stepCompleted[step.id - 1] ? setCurrentStep(step.id) : null}
                  disabled={step.id > 1 && !stepCompleted[step.id - 1]}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${
                    isActive 
                      ? 'bg-slate-800 border border-slate-700' 
                      : isCompleted 
                        ? 'hover:bg-slate-800/50 cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted 
                      ? 'bg-emerald-500/20' 
                      : isActive 
                        ? 'bg-slate-700' 
                        : 'bg-slate-800'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="text-emerald-500" size={20} />
                    ) : (
                      <Icon className={isActive ? step.color : 'text-slate-500'} size={20} />
                    )}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-600">{step.subtitle}</p>
                  </div>
                </button>
                
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 hidden md:block ${
                    stepCompleted[step.id] ? 'bg-emerald-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
        
        {/* Resumo lateral */}
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white">Resumo da Validação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!termoData ? (
                <p className="text-sm text-slate-500">Faça upload do termo de rescisão para começar.</p>
              ) : (
                <>
                  <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-500" />
                      <span className="text-sm text-white font-medium">
                        {termoData.resumo?.colaborador || termoData.colaborador || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-400">
                        Admissão: {termoData.resumo?.data_admissao || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-400">
                        Demissão: {termoData.resumo?.data_demissao || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-500" />
                      <span className="text-xs text-slate-400">
                        Tipo: {termoData.resumo?.tipo_rescisao || 'N/A'}
                      </span>
                    </div>
                    {termoData.resumo?.valor_liquido && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
                        <DollarSign size={14} className="text-emerald-500" />
                        <span className="text-sm text-emerald-400 font-bold">
                          R$ {termoData.resumo?.valor_liquido}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status das etapas */}
                  <div className="space-y-1 pt-2">
                    <p className="text-xs text-slate-500 font-medium mb-2">Etapas concluídas:</p>
                    {STEPS.map(step => {
                      const data = step.id === 1 ? termoData : step.id === 2 ? apoioData : step.id === 3 ? convencaoData : fgtsData;
                      const hasIssues = data?.divergencias?.length > 0 || data?.alertas?.length > 0;
                      
                      return (
                        <div key={step.id} className="flex items-center gap-2 text-sm">
                          {stepCompleted[step.id] ? (
                            hasIssues ? (
                              <AlertTriangle size={14} className="text-amber-500" />
                            ) : (
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            )
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />
                          )}
                          <span className={stepCompleted[step.id] ? (hasIssues ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}>
                            {step.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Navegação entre etapas */}
          {termoData && (
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex-1 border-slate-700"
                >
                  <ChevronLeft size={16} className="mr-1" /> Anterior
                </Button>
              )}
              {currentStep < 4 && stepCompleted[currentStep] && (
                <Button 
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Próxima <ChevronRight size={16} className="ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default ValidacaoRescisao;
