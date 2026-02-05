import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { ClipboardCheck, Upload, Loader2, FileUp, AlertTriangle, CheckCircle2, XCircle, FileText, ArrowLeftRight, Calendar, Building2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEmpresa } from '../contexts/EmpresaContext';

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
  const [validationType, setValidationType] = useState('folha'); // 'folha' or 'apoio'
  const [holeriteFile, setHoleriteFile] = useState(null);
  const [apoioFile, setApoioFile] = useState(null);
  const { empresaSelecionada } = useEmpresa();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (empresaSelecionada && !selectedCliente) {
      setSelectedCliente(empresaSelecionada.id);
    }
  }, [empresaSelecionada]);

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

  // Dropzone for folha analysis
  const onDropFolha = useCallback(async (acceptedFiles) => {
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

  const { getRootProps: getRootPropsFolha, getInputProps: getInputPropsFolha, isDragActive: isDragActiveFolha } = useDropzone({
    onDrop: onDropFolha,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: validationType !== 'folha'
  });

  // Dropzones for holerite and apoio comparison
  const onDropHolerite = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setHoleriteFile(acceptedFiles[0]);
      toast.success('Holerite carregado');
    }
  }, []);

  const onDropApoio = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setApoioFile(acceptedFiles[0]);
      toast.success('Relatório de apoio carregado');
    }
  }, []);

  const { getRootProps: getRootPropsHolerite, getInputProps: getInputPropsHolerite, isDragActive: isDragActiveHolerite } = useDropzone({
    onDrop: onDropHolerite,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 1
  });

  const { getRootProps: getRootPropsApoio, getInputProps: getInputPropsApoio, isDragActive: isDragActiveApoio } = useDropzone({
    onDrop: onDropApoio,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'text/plain': ['.txt'],
      'message/rfc822': ['.eml'],
      'application/vnd.ms-outlook': ['.msg']
    },
    maxFiles: 1
  });

  const handleCompareDocuments = async () => {
    if (!selectedCliente) {
      toast.error('Selecione uma empresa primeiro');
      return;
    }
    if (!holeriteFile || !apoioFile) {
      toast.error('Carregue ambos os documentos');
      return;
    }

    const formData = new FormData();
    formData.append('holerite', holeriteFile);
    formData.append('apoio', apoioFile);
    formData.append('cliente_id', selectedCliente);
    formData.append('mes_referencia', mesReferencia);
    formData.append('ano_referencia', parseInt(anoReferencia));

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/validacoes/comparar-apoio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnalysisResult(response.data);
      setDialogOpen(false);
      setResultDialogOpen(true);
      toast.success('Comparação concluída!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao comparar documentos');
    } finally {
      setUploading(false);
    }
  };

  const resetDialog = () => {
    setSelectedCliente(empresaSelecionada?.id || '');
    setMesReferencia('');
    setAnoReferencia(new Date().getFullYear().toString());
    setValidationType('folha');
    setHoleriteFile(null);
    setApoioFile(null);
    setAnalysisResult(null);
  };

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
          <p className="text-slate-500 mt-1">Analise holerites e compare com relatórios de apoio</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
          <Button
            data-testid="nova-validacao-btn"
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={clientes.length === 0}
          >
            <ClipboardCheck size={18} className="mr-2" />
            Nova Validação
          </Button>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Validar Folha de Pagamento</DialogTitle>
            </DialogHeader>
            
            <Tabs value={validationType} onValueChange={setValidationType} className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="folha" className="flex items-center gap-2">
                  <FileText size={16} />
                  Análise da Folha
                </TabsTrigger>
                <TabsTrigger value="apoio" className="flex items-center gap-2">
                  <ArrowLeftRight size={16} />
                  Comparar com Apoio
                </TabsTrigger>
              </TabsList>

              {/* Common Fields */}
              <div className="mt-4 space-y-4">
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
              </div>

              {/* Tab 1: Análise simples da Folha */}
              <TabsContent value="folha" className="mt-4">
                <div className="space-y-4">
                  <Card className="border-slate-200 bg-slate-50">
                    <CardContent className="p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-700 mb-1">O que será analisado:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-500">
                        <li>Erros de cálculo nos valores</li>
                        <li>Inconsistências entre funcionários</li>
                        <li>Valores fora do padrão</li>
                        <li>Comparação com mês anterior (se disponível)</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <div
                    {...getRootPropsFolha()}
                    data-testid="dropzone-validacao"
                    className={`upload-zone ${isDragActiveFolha ? 'active' : ''} ${!selectedCliente ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input {...getInputPropsFolha()} disabled={!selectedCliente || uploading} />
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
              </TabsContent>

              {/* Tab 2: Comparação com Relatório de Apoio */}
              <TabsContent value="apoio" className="mt-4">
                <div className="space-y-4">
                  <Card className="border-indigo-200 bg-indigo-50">
                    <CardContent className="p-4 text-sm text-indigo-800">
                      <p className="font-medium mb-1">Compare holerite com relatório de apoio</p>
                      <p className="text-indigo-600">
                        Envie o holerite gerado e qualquer documento de referência (email, planilha, imagem, PDF) 
                        para verificar se as informações estão corretas (horas extras, faltas, comissões, etc).
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Holerite Upload */}
                    <div>
                      <Label className="mb-2 block">Holerite Gerado</Label>
                      <div
                        {...getRootPropsHolerite()}
                        data-testid="dropzone-holerite"
                        className={`upload-zone min-h-[150px] ${isDragActiveHolerite ? 'active' : ''} ${holeriteFile ? 'border-emerald-300 bg-emerald-50' : ''}`}
                      >
                        <input {...getInputPropsHolerite()} />
                        {holeriteFile ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="text-emerald-600 mb-2" size={28} />
                            <p className="text-sm text-emerald-700 font-medium">{holeriteFile.name}</p>
                            <p className="text-xs text-slate-400 mt-1">Clique para trocar</p>
                          </div>
                        ) : (
                          <>
                            <FileText className="mx-auto text-slate-400 mb-2" size={28} />
                            <p className="text-sm text-slate-600">Holerite/Folha</p>
                            <p className="text-xs text-slate-400">PDF, Excel, CSV ou Imagem</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Apoio Upload */}
                    <div>
                      <Label className="mb-2 block">Relatório de Apoio</Label>
                      <div
                        {...getRootPropsApoio()}
                        data-testid="dropzone-apoio"
                        className={`upload-zone min-h-[150px] ${isDragActiveApoio ? 'active' : ''} ${apoioFile ? 'border-emerald-300 bg-emerald-50' : ''}`}
                      >
                        <input {...getInputPropsApoio()} />
                        {apoioFile ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="text-emerald-600 mb-2" size={28} />
                            <p className="text-sm text-emerald-700 font-medium">{apoioFile.name}</p>
                            <p className="text-xs text-slate-400 mt-1">Clique para trocar</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto text-slate-400 mb-2" size={28} />
                            <p className="text-sm text-slate-600">Documento de Apoio</p>
                            <p className="text-xs text-slate-400">Email, PDF, Imagem, Excel, TXT</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-3 text-sm text-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Exemplos de relatórios de apoio:</p>
                          <ul className="text-amber-700 text-xs mt-1 space-y-0.5">
                            <li>• Email do RH com horas extras do mês</li>
                            <li>• Planilha de comissões de vendas</li>
                            <li>• Foto do espelho de ponto</li>
                            <li>• Relatório de faltas/atrasos</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={handleCompareDocuments}
                    disabled={!holeriteFile || !apoioFile || !selectedCliente || uploading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    data-testid="btn-comparar"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Comparando documentos...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight size={18} className="mr-2" />
                        Comparar Documentos
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
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
              {/* Type indicator */}
              {analysisResult.tipo_validacao && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  {analysisResult.tipo_validacao === 'comparacao_apoio' ? (
                    <><ArrowLeftRight size={16} /> Comparação com Relatório de Apoio</>
                  ) : (
                    <><FileText size={16} /> Análise da Folha de Pagamento</>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 font-mono">{analysisResult.total_verificados || 0}</p>
                    <p className="text-xs text-slate-500">Itens Verificados</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${(analysisResult.total_erros || analysisResult.divergencias_encontradas) > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold font-mono ${(analysisResult.total_erros || analysisResult.divergencias_encontradas) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {analysisResult.total_erros || analysisResult.divergencias_encontradas || 0}
                    </p>
                    <p className="text-xs text-slate-500">Divergências</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    {(analysisResult.total_erros || analysisResult.divergencias_encontradas) === 0 ? (
                      <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                    ) : (
                      <AlertTriangle className="mx-auto text-amber-500" size={32} />
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {(analysisResult.total_erros || analysisResult.divergencias_encontradas) === 0 ? 'Aprovado' : 'Revisar'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Discrepancies/Divergencias */}
              {((analysisResult.discrepancias && analysisResult.discrepancias.length > 0) || 
                (analysisResult.divergencias && analysisResult.divergencias.length > 0)) && (
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {analysisResult.tipo_validacao === 'comparacao_apoio' ? 'Divergências Encontradas' : 'Discrepâncias Detectadas'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {(analysisResult.discrepancias || analysisResult.divergencias || []).map((d, index) => (
                        <div key={index} className="p-4 hover:bg-slate-50">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(d.severidade)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-slate-900">{d.funcionario || d.campo}</p>
                                {getSeverityBadge(d.severidade)}
                              </div>
                              <p className="text-sm text-slate-600 mt-1">{d.tipo}</p>
                              <p className="text-sm text-slate-500">{d.descricao}</p>
                              {d.valor_holerite !== undefined && d.valor_apoio !== undefined && (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-slate-100 rounded p-2">
                                    <p className="text-slate-400">No Holerite</p>
                                    <p className="font-mono font-medium">{d.valor_holerite}</p>
                                  </div>
                                  <div className="bg-amber-100 rounded p-2">
                                    <p className="text-slate-400">No Apoio</p>
                                    <p className="font-mono font-medium">{d.valor_apoio}</p>
                                  </div>
                                </div>
                              )}
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

              {/* Recommendations */}
              {analysisResult.recomendacoes && analysisResult.recomendacoes.length > 0 && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-indigo-800">Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="text-sm text-indigo-700 space-y-1">
                      {analysisResult.recomendacoes.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
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
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      <CardTitle className="text-base font-semibold text-slate-900">
                        {validacao.mes_referencia}/{validacao.ano_referencia}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 size={12} className="text-slate-400" />
                      <p className="text-sm text-slate-500">{getClienteName(validacao.cliente_id)}</p>
                    </div>
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
                  {validacao.tipo_validacao && (
                    <p className="text-xs text-indigo-600">
                      {validacao.tipo_validacao === 'comparacao_apoio' ? 'Comparação com Apoio' : 'Análise da Folha'}
                    </p>
                  )}
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
              Faça upload de uma folha de pagamento ou compare com relatório de apoio
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidacaoFolha;
