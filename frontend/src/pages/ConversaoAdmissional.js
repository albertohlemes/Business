import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getEmpresaCodigo, getEmpresaNome } from '../utils/empresaUtils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { 
  FileScan, Upload, Loader2, Download, CheckCircle2, AlertTriangle,
  FileText, Image, Trash2, Building2, User, FileCheck, XCircle
} from 'lucide-react';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ConversaoAdmissional = () => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada } = useEmpresa();

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file, id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const processarDocumentos = async () => {
    if (!files.length) { toast.error('Selecione pelo menos um arquivo'); return; }
    if (!empresaSelecionada) { toast.error('Selecione uma empresa'); setSelectorOpen(true); return; }
    setProcessing(true); setResult(null);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('arquivos', f.file));
      formData.append('cliente_id', empresaSelecionada.id);
      const response = await axios.post(`${API_URL}/api/conversao/admissional`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
      response.data.campos_faltantes?.length > 0 
        ? toast.warning('Campos obrigatórios faltando') 
        : toast.success('Documentos processados!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  const camposObrigatorios = ['Nome completo', 'CPF', 'RG', 'Data nascimento', 'Endereço', 'Cargo', 'Salário', 'Data admissão', 'PIS/PASEP', 'CTPS', 'Dados bancários'];

  return (
    <div data-testid="conversao-admissional-page" className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documentos Admissionais</h1>
          <p className="text-slate-500 mt-1">Converta e valide documentos de admissão</p>
        </div>
        <Button onClick={() => setSelectorOpen(true)} variant="outline" className="border-slate-700 text-slate-300">
          <Building2 size={16} className="mr-2" />
          {empresaSelecionada ? empresaSelecionada.nome_fantasia : 'Selecionar Empresa'}
        </Button>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
        <p className="text-sm text-emerald-300">Faça upload de fotos, PDFs ou planilhas com documentos admissionais. A IA extrai as informações e valida o que está faltando.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Upload size={20} className="text-red-500" />Documentos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${isDragActive ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-red-500/50'}`}>
                <input {...getInputProps()} />
                <FileScan className="mx-auto text-red-500 mb-3" size={40} />
                <p className="text-white">Arraste os documentos aqui</p>
                <p className="text-sm text-slate-500">Ficha, RG, CPF, comprovantes...</p>
              </div>
              {files.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                      <FileText size={18} className="text-slate-400" />
                      <span className="flex-1 text-sm text-white truncate">{f.file.name}</span>
                      <button onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={processarDocumentos} disabled={processing || !files.length} className="w-full bg-red-600 hover:bg-red-700 h-12">
                {processing ? <><Loader2 className="animate-spin mr-2" size={20} />Analisando...</> : <><FileCheck size={20} className="mr-2" />Processar e Validar</>}
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base"><User size={18} className="inline mr-2 text-purple-500" />Dados Necessários</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {camposObrigatorios.map((campo, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm p-1.5 rounded ${result?.campos_encontrados?.includes(campo) ? 'text-emerald-400' : result?.campos_faltantes?.includes(campo) ? 'text-red-400' : 'text-slate-500'}`}>
                  {result?.campos_encontrados?.includes(campo) ? <CheckCircle2 size={14} /> : result?.campos_faltantes?.includes(campo) ? <XCircle size={14} /> : <div className="w-3 h-3 rounded-full border border-slate-600" />}
                  <span>{campo}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className={`border ${result.campos_faltantes?.length === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {result.campos_faltantes?.length === 0 ? <CheckCircle2 className="text-emerald-500" size={40} /> : <AlertTriangle className="text-amber-500" size={40} />}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{result.colaborador_nome || 'Dados Extraídos'}</h3>
                {result.campos_faltantes?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-amber-400 text-sm mb-2">{result.campos_faltantes.length} campo(s) faltando:</p>
                    <div className="flex flex-wrap gap-2">{result.campos_faltantes.map((c, i) => <span key={i} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">{c}</span>)}</div>
                  </div>
                )}
                <Button className="bg-emerald-600 hover:bg-emerald-700"><Download size={16} className="mr-2" />Baixar Ficha</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default ConversaoAdmissional;
