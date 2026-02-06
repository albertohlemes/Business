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
  FileText, Trash2, Building2, DollarSign, Calendar, User, Shield
} from 'lucide-react';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ValidacaoRescisao = () => {
  const [convencao, setConvencao] = useState(null);
  const [apoio, setApoio] = useState([]);
  const [termoRescisao, setTermoRescisao] = useState(null);
  const [extratoFgts, setExtratoFgts] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada } = useEmpresa();

  // Dropzones individuais para cada tipo de arquivo
  const onDropConvencao = useCallback((files) => {
    if (files.length > 0) setConvencao(files[0]);
  }, []);
  
  const onDropApoio = useCallback((files) => {
    setApoio(prev => [...prev, ...files]);
  }, []);
  
  const onDropTermo = useCallback((files) => {
    if (files.length > 0) setTermoRescisao(files[0]);
  }, []);
  
  const onDropFgts = useCallback((files) => {
    if (files.length > 0) setExtratoFgts(files[0]);
  }, []);

  const convencaoDropzone = useDropzone({
    onDrop: onDropConvencao,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });
  
  const apoioDropzone = useDropzone({
    onDrop: onDropApoio,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: true
  });
  
  const termoDropzone = useDropzone({
    onDrop: onDropTermo,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });
  
  const fgtsDropzone = useDropzone({
    onDrop: onDropFgts,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false
  });

  const validarRescisao = async () => {
    if (!termoRescisao) { toast.error('Faça upload do termo de rescisão'); return; }
    if (!empresaSelecionada) { toast.error('Selecione uma empresa'); setSelectorOpen(true); return; }
    
    setProcessing(true); setResult(null);
    try {
      const formData = new FormData();
      formData.append('cliente_id', empresaSelecionada.id);
      if (convencao) formData.append('convencao', convencao);
      apoio.forEach(f => formData.append('apoio', f));
      formData.append('termo_rescisao', termoRescisao);
      if (extratoFgts) formData.append('extrato_fgts', extratoFgts);

      const response = await axios.post(`${API_URL}/api/validacao/rescisao`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      setResult(response.data);
      response.data.divergencias?.length > 0 
        ? toast.warning('Divergências encontradas na rescisão') 
        : toast.success('Rescisão validada com sucesso!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  const UploadBox = ({ dropzone, label, file, files, icon: Icon, color, onRemove }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <Icon size={16} className={color} /> {label}
      </p>
      <div 
        {...dropzone.getRootProps()} 
        className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
          dropzone.isDragActive ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        <input {...dropzone.getInputProps()} />
        {file ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-white truncate">{file.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ) : files?.length > 0 ? (
          <div className="space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-white truncate">{f.name}</span>
                <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Clique ou arraste</p>
        )}
      </div>
    </div>
  );

  return (
    <div data-testid="validacao-rescisao-page" className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Validação de Rescisão</h1>
          <p className="text-slate-500 mt-1">Valide os cálculos e verbas rescisórias</p>
        </div>
        <Button onClick={() => setSelectorOpen(true)} variant="outline" className="border-slate-700 text-slate-300">
          <Building2 size={16} className="mr-2" />
          {empresaSelecionada ? (
            <><span className="text-red-500 font-mono mr-1">{getEmpresaCodigo(empresaSelecionada.id)}</span>{getEmpresaNome(empresaSelecionada)}</>
          ) : 'Selecionar Empresa'}
        </Button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <p className="text-sm text-amber-300">
          <strong>Como funciona:</strong> Faça upload da convenção coletiva, documentos de apoio, termo de rescisão e extrato FGTS. 
          A IA vai analisar e validar se os cálculos estão corretos, apontando divergências.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white">Documentos para Análise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <UploadBox 
              dropzone={convencaoDropzone} 
              label="Convenção Coletiva (opcional)" 
              file={convencao} 
              icon={FileText} 
              color="text-blue-500"
              onRemove={() => setConvencao(null)}
            />
            <UploadBox 
              dropzone={apoioDropzone} 
              label="Arquivos de Apoio (opcional)" 
              files={apoio} 
              icon={FileText} 
              color="text-purple-500"
              onRemove={(i) => setApoio(prev => prev.filter((_, idx) => idx !== i))}
            />
            <UploadBox 
              dropzone={termoDropzone} 
              label="Termo de Rescisão *" 
              file={termoRescisao} 
              icon={FileCheck} 
              color="text-red-500"
              onRemove={() => setTermoRescisao(null)}
            />
            <UploadBox 
              dropzone={fgtsDropzone} 
              label="Extrato FGTS / Multa (opcional)" 
              file={extratoFgts} 
              icon={Shield} 
              color="text-emerald-500"
              onRemove={() => setExtratoFgts(null)}
            />
            
            <Button onClick={validarRescisao} disabled={processing || !termoRescisao} className="w-full bg-red-600 hover:bg-red-700 h-12 mt-4">
              {processing ? <><Loader2 className="animate-spin mr-2" size={20} />Analisando com IA...</> : <><FileCheck size={20} className="mr-2" />Validar Rescisão</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Itens Verificados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['Saldo de salário', 'Aviso prévio', 'Férias vencidas + 1/3', 'Férias proporcionais + 1/3', '13º proporcional', 'Multa 40% FGTS', 'FGTS sobre verbas', 'Descontos legais', 'Valor líquido'].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm p-2 rounded ${
                  result?.itens_corretos?.includes(item) ? 'bg-emerald-500/10 text-emerald-400' :
                  result?.itens_divergentes?.includes(item) ? 'bg-red-500/10 text-red-400' : 'text-slate-500'
                }`}>
                  {result?.itens_corretos?.includes(item) ? <CheckCircle2 size={14} /> : 
                   result?.itens_divergentes?.includes(item) ? <XCircle size={14} /> : 
                   <div className="w-3 h-3 rounded-full border border-slate-600" />}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className={`border ${result.divergencias?.length === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {result.divergencias?.length === 0 ? <CheckCircle2 className="text-emerald-500" size={40} /> : <AlertTriangle className="text-red-500" size={40} />}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {result.colaborador || 'Resultado da Validação'}
                </h3>
                
                {result.resumo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Data Admissão</p>
                      <p className="text-sm text-white font-mono">{result.resumo.data_admissao || '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Data Demissão</p>
                      <p className="text-sm text-white font-mono">{result.resumo.data_demissao || '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Tipo Rescisão</p>
                      <p className="text-sm text-white">{result.resumo.tipo_rescisao || '-'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Valor Líquido</p>
                      <p className="text-sm text-emerald-400 font-mono font-bold">R$ {result.resumo.valor_liquido || '-'}</p>
                    </div>
                  </div>
                )}

                {result.divergencias?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-red-400 text-sm font-medium mb-2">Divergências encontradas:</p>
                    <div className="space-y-2">
                      {result.divergencias.map((div, i) => (
                        <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-sm text-white font-medium">{div.item}</p>
                          <div className="flex gap-4 mt-1 text-xs">
                            <span className="text-slate-400">Informado: <span className="text-red-400 font-mono">{div.valor_informado}</span></span>
                            <span className="text-slate-400">Esperado: <span className="text-emerald-400 font-mono">{div.valor_esperado}</span></span>
                          </div>
                          {div.observacao && <p className="text-xs text-slate-500 mt-1">{div.observacao}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.observacoes && (
                  <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-slate-500 mb-1">Observações da IA:</p>
                    <p className="text-sm text-slate-300 whitespace-pre-line">{result.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default ValidacaoRescisao;
