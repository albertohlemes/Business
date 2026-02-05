import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { ClipboardCheck, Upload, Loader2, FileUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ValidacaoFolha = () => {
  const [validacoes, setValidacoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [mesReferencia, setMesReferencia] = useState('');
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear().toString());
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [validacoesRes, clientesRes] = await Promise.all([
        axios.get(`${API_URL}/api/validacoes`),
        axios.get(`${API_URL}/api/clientes`)
      ]);
      setValidacoes(validacoesRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    if (!selectedCliente) {
      toast.error('Selecione uma empresa primeiro');
      return;
    }

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cliente_id', selectedCliente);
    formData.append('mes_referencia', mesReferencia);
    formData.append('ano_referencia', parseInt(anoReferencia));

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/validacoes/analisar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnalysisResult(response.data);
      setDialogOpen(false);
      setResultDialogOpen(true);
      toast.success('Análise concluída!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar folha');
    } finally {
      setUploading(false);
    }
  }, [selectedCliente, mesReferencia, anoReferencia]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'alta':
        return <XCircle className="text-rose-500" size={16} />;
      case 'media':
        return <AlertTriangle className="text-amber-500" size={16} />;
      default:
        return <AlertTriangle className="text-blue-500" size={16} />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'alta':
        return <span className="badge-error">Alta</span>;
      case 'media':
        return <span className="badge-pending">Média</span>;
      default:
        return <span className="badge-processing">Baixa</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div data-testid="validacao-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Validação de Folha</h1>
          <p className="text-slate-500 mt-1">Analise holerites e detecte discrepâncias automaticamente</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button
            data-testid="nova-validacao-btn"
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={clientes.length === 0}
          >
            <ClipboardCheck size={18} className="mr-2" />
            Nova Validação
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Validar Folha de Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Empresa</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger data-testid="select-cliente-validacao">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_fantasia || c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mês de Referência</Label>
                  <Select value={mesReferencia} onValueChange={setMesReferencia}>
                    <SelectTrigger data-testid="select-mes">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input
                    data-testid="input-ano"
                    type="number"
                    value={anoReferencia}
                    onChange={(e) => setAnoReferencia(e.target.value)}
                  />
                </div>
              </div>

              <div
                {...getRootProps()}
                data-testid="dropzone-validacao"
                className={`upload-zone ${isDragActive ? 'active' : ''} ${!selectedCliente ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} disabled={!selectedCliente || uploading} />
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                    <p className="text-slate-600">Analisando folha com IA...</p>
                    <p className="text-xs text-slate-400 mt-1">Verificando valores e detectando discrepâncias</p>
                  </div>
                ) : (
                  <>
                    <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-slate-600">Arraste a folha de pagamento ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, Excel ou CSV</p>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Análise</DialogTitle>
          </DialogHeader>
          {analysisResult && (
            <div className="space-y-4 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 font-mono">{analysisResult.total_verificados || 0}</p>
                    <p className="text-xs text-slate-500">Verificados</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${analysisResult.total_erros > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold font-mono ${analysisResult.total_erros > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {analysisResult.total_erros || 0}
                    </p>
                    <p className="text-xs text-slate-500">Erros</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    {analysisResult.total_erros === 0 ? (
                      <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                    ) : (
                      <AlertTriangle className="mx-auto text-amber-500" size={32} />
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {analysisResult.total_erros === 0 ? 'Aprovado' : 'Revisar'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Discrepancies */}
              {analysisResult.discrepancias && analysisResult.discrepancias.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">Discrepâncias Encontradas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {analysisResult.discrepancias.map((d, index) => (
                        <div key={index} className="p-4 hover:bg-slate-50">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(d.severidade)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-slate-900">{d.funcionario}</p>
                                {getSeverityBadge(d.severidade)}
                              </div>
                              <p className="text-sm text-slate-600 mt-1">{d.tipo}</p>
                              <p className="text-sm text-slate-500">{d.descricao}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Text */}
              {analysisResult.resumo && (
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600">{analysisResult.resumo}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Validações List */}
      {validacoes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validacoes.map((validacao) => (
            <Card key={validacao.id} data-testid={`validacao-card-${validacao.id}`} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {validacao.mes_referencia}/{validacao.ano_referencia}
                    </CardTitle>
                    <p className="text-sm text-slate-500">{getClienteName(validacao.cliente_id)}</p>
                  </div>
                  {validacao.total_erros === 0 ? (
                    <span className="badge-success"><CheckCircle2 size={12} className="mr-1" />OK</span>
                  ) : (
                    <span className="badge-error"><AlertTriangle size={12} className="mr-1" />{validacao.total_erros} erros</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="text-slate-400">Verificados:</span> <span className="font-mono">{validacao.total_verificados}</span></p>
                  <p className="text-xs text-slate-400 pt-2">
                    {new Date(validacao.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">Nenhuma validação realizada</p>
            <p className="text-sm text-slate-400 mt-1">
              Faça upload de uma folha de pagamento para análise automática
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidacaoFolha;
