import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getEmpresaCodigo, getEmpresaNome } from '../utils/empresaUtils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { 
  FileInput, 
  Upload, 
  Loader2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Image,
  Mail,
  FileText,
  Trash2,
  Building2
} from 'lucide-react';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ConversaoApontamentos = () => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada, competencia } = useEmpresa();

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'message/rfc822': ['.eml'],
      'application/vnd.ms-outlook': ['.msg']
    }
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.csv')) 
      return <FileSpreadsheet size={20} className="text-emerald-500" />;
    if (file.type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    if (file.name.endsWith('.eml') || file.name.endsWith('.msg')) return <Mail size={20} className="text-amber-500" />;
    return <FileText size={20} className="text-slate-400" />;
  };

  const processarApontamentos = async () => {
    if (files.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }
    if (!empresaSelecionada) {
      toast.error('Selecione uma empresa primeiro');
      setSelectorOpen(true);
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('arquivos', f.file));
      formData.append('cliente_id', empresaSelecionada.id);
      formData.append('competencia', competencia);

      const response = await axios.post(`${API_URL}/api/conversao/apontamentos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
      toast.success('Apontamentos convertidos com sucesso!');
    } catch (error) {
      toast.error('Erro ao processar: ' + (error.response?.data?.detail || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const downloadPlanilha = () => {
    if (result?.arquivo_base64) {
      // Converter base64 para blob e fazer download
      const byteCharacters = atob(result.arquivo_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', result.arquivo_nome || 'apontamentos_sci.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div data-testid="conversao-apontamentos-page" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversão de Apontamentos</h1>
          <p className="text-slate-500 mt-1">Converta apontamentos do cliente para o layout SCI Único</p>
        </div>
        <Button
          onClick={() => setSelectorOpen(true)}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <Building2 size={16} className="mr-2" />
          {empresaSelecionada ? empresaSelecionada.nome_fantasia : 'Selecionar Empresa'}
        </Button>
      </div>

      {/* Instrução */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileInput className="text-blue-500 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-blue-300 font-medium">Como funciona?</p>
            <p className="text-xs text-blue-400/80 mt-1">
              Faça upload de imagens, emails, planilhas ou PDFs com os apontamentos enviados pelo cliente. 
              A IA vai extrair as informações e converter para o layout padrão SCI Único, pronto para importação.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload size={20} className="text-red-500" />
            Arquivos de Apontamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-red-500 bg-red-500/10' 
                : 'border-slate-700 hover:border-red-500/50 hover:bg-slate-800/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <Upload className="text-red-500" size={32} />
              </div>
              <div>
                <p className="text-white font-medium">Arraste os arquivos aqui</p>
                <p className="text-sm text-slate-500 mt-1">ou clique para selecionar</p>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">Imagens</span>
                <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">PDF</span>
                <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">Excel</span>
                <span className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400">Email</span>
              </div>
            </div>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400 font-medium">{files.length} arquivo(s) selecionado(s)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center">
                        {getFileIcon(f.file)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{f.file.name}</p>
                      <p className="text-xs text-slate-500">{(f.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={() => removeFile(f.id)}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process Button */}
          <Button
            onClick={processarApontamentos}
            disabled={processing || files.length === 0}
            className="w-full bg-red-600 hover:bg-red-700 h-12"
          >
            {processing ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Processando com IA...
              </>
            ) : (
              <>
                <FileInput size={20} className="mr-2" />
                Converter para SCI Único
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={`border ${result.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {result.success ? (
                <CheckCircle2 className="text-emerald-500" size={40} />
              ) : (
                <AlertCircle className="text-red-500" size={40} />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {result.success ? 'Conversão Concluída!' : 'Erro na Conversão'}
                </h3>
                {result.success ? (
                  <>
                    <p className="text-slate-400 text-sm mb-4">
                      {result.registros_extraidos || 0} registro(s) extraído(s) dos arquivos
                    </p>
                    {result.observacoes && (
                      <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-500 mb-1">Observações da IA:</p>
                        <p className="text-sm text-slate-300">{result.observacoes}</p>
                      </div>
                    )}
                    <Button onClick={downloadPlanilha} className="bg-emerald-600 hover:bg-emerald-700">
                      <Download size={16} className="mr-2" />
                      Baixar Planilha SCI Único
                    </Button>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">{result.error}</p>
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

export default ConversaoApontamentos;
