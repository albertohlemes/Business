import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Calculator, Upload, Loader2, FileUp, Download, CheckCircle2, AlertTriangle, Pencil, Trash2, Plus, FileSpreadsheet, FileText, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEmpresa } from '../contexts/EmpresaContext';
import { ImportMediasProgress } from '../components/ProcessingBar';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Medias = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [importacoes, setImportacoes] = useState([]);
  const [exportFormat, setExportFormat] = useState('xlsx');
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
      const [clientesRes, importacoesRes] = await Promise.all([
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/medias/importacoes`)
      ]);
      setClientes(clientesRes.data);
      setImportacoes(importacoesRes.data);
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

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/medias/extrair`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedData(response.data);
      setDialogOpen(false);
      setReviewDialogOpen(true);
      toast.success('Dados extraídos! Revise antes de gerar o arquivo.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao processar relatório');
    } finally {
      setUploading(false);
    }
  }, [selectedCliente]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });

  const handleUpdateFuncionario = (index, field, value) => {
    setExtractedData(prev => {
      const newFuncionarios = [...prev.funcionarios];
      newFuncionarios[index] = { ...newFuncionarios[index], [field]: value };
      return { ...prev, funcionarios: newFuncionarios };
    });
  };

  const handleUpdateMedia = (funcIndex, mediaIndex, field, value) => {
    setExtractedData(prev => {
      const newFuncionarios = [...prev.funcionarios];
      const newMedias = [...newFuncionarios[funcIndex].medias];
      newMedias[mediaIndex] = { ...newMedias[mediaIndex], [field]: parseFloat(value) || 0 };
      newFuncionarios[funcIndex] = { ...newFuncionarios[funcIndex], medias: newMedias };
      return { ...prev, funcionarios: newFuncionarios };
    });
  };

  const handleRemoveFuncionario = (index) => {
    setExtractedData(prev => ({
      ...prev,
      funcionarios: prev.funcionarios.filter((_, i) => i !== index)
    }));
  };

  const handleAddMedia = (funcIndex) => {
    setExtractedData(prev => {
      const newFuncionarios = [...prev.funcionarios];
      newFuncionarios[funcIndex].medias.push({
        competencia: '',
        salario_bruto: 0,
        horas_extras: 0,
        comissoes: 0,
        dsr: 0,
        adicional_noturno: 0,
        outros: 0
      });
      return { ...prev, funcionarios: newFuncionarios };
    });
  };

  const handleRemoveMedia = (funcIndex, mediaIndex) => {
    setExtractedData(prev => {
      const newFuncionarios = [...prev.funcionarios];
      newFuncionarios[funcIndex].medias = newFuncionarios[funcIndex].medias.filter((_, i) => i !== mediaIndex);
      return { ...prev, funcionarios: newFuncionarios };
    });
  };

  const handleGenerateFile = async () => {
    if (!extractedData || !extractedData.funcionarios.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/medias/gerar-importacao`,
        {
          cliente_id: selectedCliente,
          funcionarios: extractedData.funcionarios,
          formato: exportFormat
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = exportFormat === 'xlsx' ? 'xlsx' : 'txt';
      link.setAttribute('download', `importacao_medias_sci_unico.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Arquivo ${ext.toUpperCase()} gerado para importação no SCI Único!`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao gerar arquivo');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveImportacao = async () => {
    if (!extractedData || !extractedData.funcionarios.length) {
      toast.error('Nenhum dado para salvar');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/medias/salvar`, {
        cliente_id: selectedCliente,
        funcionarios: extractedData.funcionarios
      });
      toast.success('Dados salvos com sucesso!');
      setReviewDialogOpen(false);
      setExtractedData(null);
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar dados');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  const resetDialog = () => {
    setSelectedCliente(empresaSelecionada?.id || '');
    setExtractedData(null);
    setExportFormat('xlsx');
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
    <div data-testid="medias-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Importação de Médias</h1>
          <p className="text-slate-500 mt-1">Extraia médias do relatório da antiga contabilidade e gere arquivo para o SCI Único</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
          <Button
            data-testid="importar-medias-btn"
            onClick={() => setDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
            disabled={clientes.length === 0}
          >
            <Upload size={18} className="mr-2" />
            Importar Relatório
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="text-red-500" size={20} />
                Importar Relatório de Médias
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="border-red-500/30 bg-red-500/10">
                <CardContent className="p-3 text-sm text-indigo-800">
                  <p className="font-medium">Como funciona:</p>
                  <ol className="list-decimal list-inside mt-1 text-red-600 space-y-1">
                    <li>Faça upload do relatório da antiga contabilidade</li>
                    <li>A IA extrai os dados de médias automaticamente</li>
                    <li>Revise e ajuste os valores se necessário</li>
                    <li>Gere o arquivo para importar no SCI Único</li>
                  </ol>
                </CardContent>
              </Card>

              <div>
                <Label>Empresa</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger data-testid="select-cliente-import">
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

              <div
                {...getRootProps()}
                data-testid="dropzone-medias"
                className={`upload-zone ${isDragActive ? 'active' : ''} ${!selectedCliente ? 'opacity-50 cursor-not-allowed' : ''} ${uploading ? 'pointer-events-none' : ''}`}
              >
                <input {...getInputProps()} disabled={!selectedCliente || uploading} />
                {uploading ? (
                  <div className="py-2">
                    <ImportMediasProgress isProcessing={uploading} />
                  </div>
                ) : (
                  <>
                    <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-slate-600">Arraste o relatório de médias ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, Excel, CSV, TXT ou Imagem</p>
                  </>
                )}
              </div>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-3 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Formatos aceitos:</p>
                      <p className="text-amber-700">Relatório de médias, histórico de proventos, planilhas de variáveis, holerites consolidados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { setReviewDialogOpen(open); if (!open) setExtractedData(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={20} />
              Revisar Dados Extraídos
            </DialogTitle>
          </DialogHeader>

          {extractedData && (
            <div className="space-y-4 mt-4">
              {/* Extraction Info */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{extractedData.funcionarios?.length || 0}</span> funcionários encontrados
                  {extractedData.confianca && (
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      extractedData.confianca === 'alta' ? 'bg-emerald-100 text-emerald-700' :
                      extractedData.confianca === 'media' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      Confiança: {extractedData.confianca}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Formato:</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="txt">Texto (.txt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employees and their medias */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {extractedData.funcionarios?.map((func, funcIndex) => (
                  <Card key={funcIndex} className="border-slate-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">
                            {func.nome?.charAt(0) || '?'}
                          </div>
                          <div>
                            <Input
                              value={func.nome || ''}
                              onChange={(e) => handleUpdateFuncionario(funcIndex, 'nome', e.target.value)}
                              className="font-medium text-white h-8 px-2"
                              placeholder="Nome do funcionário"
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                value={func.cpf || ''}
                                onChange={(e) => handleUpdateFuncionario(funcIndex, 'cpf', e.target.value)}
                                className="h-6 px-2 text-xs font-mono w-32"
                                placeholder="CPF"
                              />
                              <Input
                                value={func.matricula || ''}
                                onChange={(e) => handleUpdateFuncionario(funcIndex, 'matricula', e.target.value)}
                                className="h-6 px-2 text-xs w-24"
                                placeholder="Matrícula"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => handleRemoveFuncionario(funcIndex)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left py-2 px-1 text-xs text-slate-500">Competência</th>
                              <th className="text-right py-2 px-1 text-xs text-slate-500">Salário</th>
                              <th className="text-right py-2 px-1 text-xs text-slate-500">Horas Extras</th>
                              <th className="text-right py-2 px-1 text-xs text-slate-500">Comissões</th>
                              <th className="text-right py-2 px-1 text-xs text-slate-500">DSR</th>
                              <th className="text-right py-2 px-1 text-xs text-slate-500">Ad. Noturno</th>
                              <th className="text-right py-2 px-1 text-xs text-slate-500">Outros</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {func.medias?.map((media, mediaIndex) => (
                              <tr key={mediaIndex} className="border-b border-slate-100">
                                <td className="py-1 px-1">
                                  <Input
                                    value={media.competencia || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'competencia', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono w-20"
                                    placeholder="MM/AAAA"
                                  />
                                </td>
                                <td className="py-1 px-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={media.salario_bruto || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'salario_bruto', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono text-right w-24"
                                  />
                                </td>
                                <td className="py-1 px-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={media.horas_extras || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'horas_extras', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono text-right w-20"
                                  />
                                </td>
                                <td className="py-1 px-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={media.comissoes || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'comissoes', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono text-right w-20"
                                  />
                                </td>
                                <td className="py-1 px-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={media.dsr || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'dsr', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono text-right w-20"
                                  />
                                </td>
                                <td className="py-1 px-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={media.adicional_noturno || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'adicional_noturno', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono text-right w-20"
                                  />
                                </td>
                                <td className="py-1 px-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={media.outros || ''}
                                    onChange={(e) => handleUpdateMedia(funcIndex, mediaIndex, 'outros', e.target.value)}
                                    className="h-7 px-1 text-xs font-mono text-right w-20"
                                  />
                                </td>
                                <td className="py-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                                    onClick={() => handleRemoveMedia(funcIndex, mediaIndex)}
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-500"
                        onClick={() => handleAddMedia(funcIndex)}
                      >
                        <Plus size={14} className="mr-1" /> Adicionar mês
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {extractedData.observacoes && (
                <Card className="border-slate-700 bg-slate-800/50">
                  <CardContent className="p-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-700 mb-1">Observações da IA:</p>
                    {extractedData.observacoes}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleSaveImportacao}>
                  Salvar Dados
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerateFile}
                    disabled={generating || !extractedData?.funcionarios?.length}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="gerar-arquivo-btn"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Download size={16} className="mr-2" />
                        Gerar Arquivo para SCI Único
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Histórico de Importações */}
      {importacoes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {importacoes.map((imp) => (
            <Card key={imp.id} className="border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="text-red-500" size={20} />
                    <span className="font-medium text-white">
                      {getClienteName(imp.cliente_id)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(imp.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="text-slate-400">Funcionários:</span> <span className="font-mono">{imp.total_funcionarios}</span></p>
                  <p><span className="text-slate-400">Meses:</span> <span className="font-mono">{imp.total_meses}</span></p>
                  {imp.formato_exportado && (
                    <p><span className="text-slate-400">Exportado:</span> <span className="uppercase">{imp.formato_exportado}</span></p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-700">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Calculator className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">Nenhuma importação realizada</p>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Importe o relatório de médias da antiga contabilidade para extrair os dados e gerar o arquivo de importação do SCI Único
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Medias;
