import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getEmpresaCodigo, getEmpresaNome } from '../utils/empresaUtils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { 
  FileInput, Upload, Loader2, Download, CheckCircle2, AlertCircle,
  FileSpreadsheet, Image, Mail, FileText, Trash2, Building2,
  ArrowRight, Table2, Eye, Sparkles, FileUp, AlertTriangle
} from 'lucide-react';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ConversaoApontamentos = () => {
  // Arquivos de apontamentos (fonte de dados)
  const [apontamentos, setApontamentos] = useState([]);
  // Planilha modelo SCI (template)
  const [templateSCI, setTemplateSCI] = useState(null);
  
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { empresaSelecionada, competencia } = useEmpresa();

  // Dropzone para apontamentos
  const onDropApontamentos = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setApontamentos(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps: getApontamentosProps, getInputProps: getApontamentosInput, isDragActive: isDragApontamentos } = useDropzone({
    onDrop: onDropApontamentos,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/csv': ['.csv'],
      'message/rfc822': ['.eml'],
      'application/vnd.ms-outlook': ['.msg']
    }
  });

  // Dropzone para template SCI
  const onDropTemplate = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setTemplateSCI({
        file: acceptedFiles[0],
        id: Math.random().toString(36).substr(2, 9)
      });
    }
  }, []);

  const { getRootProps: getTemplateProps, getInputProps: getTemplateInput, isDragActive: isDragTemplate } = useDropzone({
    onDrop: onDropTemplate,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const removeApontamento = (id) => {
    setApontamentos(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <Image size={18} className="text-blue-500" />;
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.csv')) 
      return <FileSpreadsheet size={18} className="text-emerald-500" />;
    if (file.type.includes('pdf')) return <FileText size={18} className="text-red-500" />;
    if (file.type.includes('word') || file.name.endsWith('.doc')) return <FileText size={18} className="text-blue-500" />;
    if (file.name.endsWith('.eml') || file.name.endsWith('.msg')) return <Mail size={18} className="text-amber-500" />;
    return <FileText size={18} className="text-slate-400" />;
  };

  const processarApontamentos = async () => {
    if (apontamentos.length === 0) {
      toast.error('Envie os apontamentos do cliente');
      return;
    }
    if (!templateSCI) {
      toast.error('Envie a planilha modelo do SCI');
      return;
    }
    if (!empresaSelecionada) {
      toast.error('Selecione uma empresa primeiro');
      setSelectorOpen(true);
      return;
    }

    setProcessing(true);
    setResult(null);
    setPreviewData(null);

    try {
      const formData = new FormData();
      
      // Adicionar arquivos de apontamentos
      apontamentos.forEach(f => formData.append('apontamentos', f.file));
      
      // Adicionar template SCI
      formData.append('template_sci', templateSCI.file);
      
      // Metadados
      formData.append('cliente_id', empresaSelecionada.id);
      formData.append('competencia', competencia);

      const response = await axios.post(`${API_URL}/api/conversao/apontamentos-sci`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000 // 3 minutos para processamento
      });

      setResult(response.data);
      setPreviewData(response.data.preview_dados);
      
      if (response.data.success) {
        toast.success(`${response.data.registros_extraidos || 0} registros extraídos!`);
      } else {
        toast.error('Erro no processamento');
      }
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
      setResult({ success: false, error: error.response?.data?.detail || error.message });
    } finally {
      setProcessing(false);
    }
  };

  const downloadPlanilha = () => {
    if (result?.arquivo_base64) {
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
      toast.success('Planilha baixada!');
    }
  };

  return (
    <div data-testid="conversao-apontamentos-page" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversão de Apontamentos SCI</h1>
          <p className="text-slate-500 mt-1">Converta apontamentos do cliente para o layout da sua planilha SCI</p>
        </div>
        <Button
          onClick={() => setSelectorOpen(true)}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          <Building2 size={16} className="mr-2" />
          {empresaSelecionada ? (
            <><span className="text-red-500 font-mono mr-1">{getEmpresaCodigo(empresaSelecionada.id)}</span>{getEmpresaNome(empresaSelecionada)}</>
          ) : 'Selecionar Empresa'}
        </Button>
      </div>

      {/* Instrução */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="text-blue-500 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-blue-300 font-medium">Como funciona?</p>
            <ol className="text-xs text-blue-400/80 mt-2 space-y-1 list-decimal list-inside">
              <li><strong>Envie os apontamentos</strong> do cliente (imagens, prints, planilhas, PDFs, emails)</li>
              <li><strong>Envie sua planilha modelo</strong> do SCI vazia (exportada do sistema)</li>
              <li>A IA analisa a estrutura do modelo, identifica <strong>colaboradores, eventos, referências e valores</strong></li>
              <li>Baixe a <strong>planilha preenchida</strong> pronta para importação</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Grid com os dois uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Apontamentos */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <FileUp size={18} className="text-amber-500" />
              1. Apontamentos do Cliente
              <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-400 text-xs">
                {apontamentos.length} arquivo(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              {...getApontamentosProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragApontamentos 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-slate-700 hover:border-amber-500/50 hover:bg-slate-800/50'
              }`}
            >
              <input {...getApontamentosInput()} />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Upload className="text-amber-500" size={24} />
                </div>
                <p className="text-white text-sm font-medium">Arraste os apontamentos</p>
                <p className="text-xs text-slate-500">Imagens, PDFs, Excel, Word, Emails</p>
              </div>
            </div>

            {/* Lista de apontamentos */}
            {apontamentos.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {apontamentos.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                        {getFileIcon(f.file)}
                      </div>
                    )}
                    <span className="flex-1 text-xs text-white truncate">{f.file.name}</span>
                    <button onClick={() => removeApontamento(f.id)} className="text-slate-500 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Template SCI */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Table2 size={18} className="text-emerald-500" />
              2. Planilha Modelo SCI
              {templateSCI && (
                <Badge variant="outline" className="ml-auto border-emerald-500/50 text-emerald-400 text-xs">
                  <CheckCircle2 size={12} className="mr-1" /> Carregado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              {...getTemplateProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragTemplate 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : templateSCI 
                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                    : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50'
              }`}
            >
              <input {...getTemplateInput()} />
              <div className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  templateSCI 
                    ? 'bg-emerald-500/20 border-emerald-500/30' 
                    : 'bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  <FileSpreadsheet className="text-emerald-500" size={24} />
                </div>
                {templateSCI ? (
                  <>
                    <p className="text-emerald-400 text-sm font-medium">{templateSCI.file.name}</p>
                    <p className="text-xs text-slate-500">Clique para trocar</p>
                  </>
                ) : (
                  <>
                    <p className="text-white text-sm font-medium">Planilha modelo vazia</p>
                    <p className="text-xs text-slate-500">Exporte do SCI e arraste aqui</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400">
              <p className="font-medium text-slate-300 mb-1">💡 Dica:</p>
              <p>A planilha modelo define a estrutura de saída. A IA vai identificar automaticamente:</p>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-500">
                <li>Coluna de <strong className="text-white">Colaborador</strong> (matrícula, nome)</li>
                <li>Coluna de <strong className="text-white">Evento</strong> (código, descrição)</li>
                <li>Coluna de <strong className="text-white">Referência</strong> (horas, dias, qtd)</li>
                <li>Coluna de <strong className="text-white">Valor</strong> (R$)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de Processar */}
      <div className="flex justify-center">
        <Button
          onClick={processarApontamentos}
          disabled={processing || apontamentos.length === 0 || !templateSCI}
          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 h-14 px-8 text-lg gap-3"
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Processando com IA...
            </>
          ) : (
            <>
              <Sparkles size={24} />
              Converter Apontamentos
              <ArrowRight size={20} />
            </>
          )}
        </Button>
      </div>

      {/* Preview dos Dados Extraídos */}
      {previewData && previewData.length > 0 && (
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white flex items-center gap-2">
              <Eye size={18} className="text-blue-500" />
              Preview dos Dados Extraídos
              <Badge variant="outline" className="ml-2 border-blue-500/50 text-blue-400">
                {previewData.length} registros
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    {Object.keys(previewData[0] || {}).map((col, i) => (
                      <th key={i} className="text-left p-3 font-medium text-slate-300 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {previewData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="p-3 text-slate-400 whitespace-nowrap">
                          {val || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.length > 10 && (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-800/30">
                Mostrando 10 de {previewData.length} registros
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card className={`border ${result.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {result.success ? (
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={40} />
              ) : (
                <AlertCircle className="text-red-500 flex-shrink-0" size={40} />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {result.success ? 'Conversão Concluída!' : 'Erro na Conversão'}
                </h3>
                {result.success ? (
                  <>
                    <div className="flex flex-wrap gap-4 mb-4">
                      <div className="bg-slate-800/50 px-4 py-2 rounded-lg">
                        <p className="text-xs text-slate-500">Registros Extraídos</p>
                        <p className="text-2xl font-bold text-emerald-400">{result.registros_extraidos || 0}</p>
                      </div>
                      <div className="bg-slate-800/50 px-4 py-2 rounded-lg">
                        <p className="text-xs text-slate-500">Colaboradores</p>
                        <p className="text-2xl font-bold text-blue-400">{result.colaboradores_identificados || 0}</p>
                      </div>
                      <div className="bg-slate-800/50 px-4 py-2 rounded-lg">
                        <p className="text-xs text-slate-500">Eventos</p>
                        <p className="text-2xl font-bold text-purple-400">{result.eventos_identificados || 0}</p>
                      </div>
                    </div>
                    
                    {result.observacoes && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                        <p className="text-xs text-amber-400 flex items-center gap-1 mb-1">
                          <AlertTriangle size={12} />
                          Observações da IA:
                        </p>
                        <p className="text-sm text-amber-300">{result.observacoes}</p>
                      </div>
                    )}
                    
                    <Button onClick={downloadPlanilha} className="bg-emerald-600 hover:bg-emerald-700">
                      <Download size={16} className="mr-2" />
                      Baixar Planilha Preenchida
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
