import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { FileSpreadsheet, Upload, Loader2, FileUp, AlertTriangle, CheckCircle2, XCircle, Download, History, ArrowLeftRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { InformesProgress } from '../components/ProcessingBar';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InformesRendimento = () => {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [esocialFile, setEsocialFile] = useState(null);
  const [sistemaFile, setSistemaFile] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  useEffect(() => {
    fetchHistorico();
  }, []);

  const fetchHistorico = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/informes/historico`);
      setHistorico(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico');
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleCompare = async () => {
    if (!esocialFile || !sistemaFile) {
      toast.error('Selecione os dois arquivos para comparação');
      return;
    }

    const formData = new FormData();
    formData.append('file_esocial', esocialFile);
    formData.append('file_sistema', sistemaFile);

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/informes/comparar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setComparisonResult(response.data);
      setDialogOpen(false);
      setResultDialogOpen(true);
      toast.success('Comparação concluída!');
      fetchHistorico();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao comparar informes');
    } finally {
      setUploading(false);
    }
  };

  const EsocialDropzone = () => {
    const onDrop = useCallback((acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setEsocialFile(acceptedFiles[0]);
        toast.success('Arquivo eSocial carregado');
      }
    }, []);

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

    return (
      <div
        {...getRootProps()}
        data-testid="dropzone-esocial"
        className={`upload-zone min-h-[120px] ${isDragActive ? 'active' : ''} ${esocialFile ? 'border-emerald-300 bg-emerald-50' : ''}`}
      >
        <input {...getInputProps()} />
        {esocialFile ? (
          <div className="flex flex-col items-center text-emerald-700">
            <CheckCircle2 size={24} className="mb-1" />
            <span className="font-medium text-sm">{esocialFile.name}</span>
            <span className="text-xs text-slate-400 mt-1">Clique para trocar</span>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto text-indigo-400 mb-2" size={28} />
            <p className="text-slate-600 text-sm font-medium">eSocial</p>
            <p className="text-xs text-slate-400">PDF, Excel ou CSV</p>
          </>
        )}
      </div>
    );
  };

  const SistemaDropzone = () => {
    const onDrop = useCallback((acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSistemaFile(acceptedFiles[0]);
        toast.success('Arquivo SCI Único carregado');
      }
    }, []);

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

    return (
      <div
        {...getRootProps()}
        data-testid="dropzone-sistema"
        className={`upload-zone min-h-[120px] ${isDragActive ? 'active' : ''} ${sistemaFile ? 'border-emerald-300 bg-emerald-50' : ''}`}
      >
        <input {...getInputProps()} />
        {sistemaFile ? (
          <div className="flex flex-col items-center text-emerald-700">
            <CheckCircle2 size={24} className="mb-1" />
            <span className="font-medium text-sm">{sistemaFile.name}</span>
            <span className="text-xs text-slate-400 mt-1">Clique para trocar</span>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto text-amber-500 mb-2" size={28} />
            <p className="text-slate-600 text-sm font-medium">SCI Único</p>
            <p className="text-xs text-slate-400">PDF, Excel ou CSV</p>
          </>
        )}
      </div>
    );
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

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div data-testid="informes-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Informes de Rendimento</h1>
          <p className="text-slate-500 mt-1">Compare eSocial com o SCI Único e detecte divergências</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEsocialFile(null); setSistemaFile(null); } }}>
          <Button
            data-testid="comparar-informes-btn"
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeftRight size={18} className="mr-2" />
            Comparar Informes
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="text-indigo-600" size={20} />
                Comparar Informes de Rendimento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="p-3 text-sm text-indigo-800">
                  <p className="font-medium">eSocial vs SCI Único</p>
                  <p className="text-indigo-600">Faça upload dos relatórios para verificar divergências em rendimentos, IR, INSS e FGTS.</p>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Relatório eSocial
                  </p>
                  <EsocialDropzone />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Relatório SCI Único
                  </p>
                  <SistemaDropzone />
                </div>
              </div>

              <Button
                onClick={handleCompare}
                disabled={!esocialFile || !sistemaFile || uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                data-testid="start-comparison-btn"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Comparando com IA...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight size={18} className="mr-2" />
                    Iniciar Comparação
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Comparação - eSocial vs SCI Único</DialogTitle>
          </DialogHeader>
          {comparisonResult && (
            <div className="space-y-4 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 font-mono">{comparisonResult.total_comparados || 0}</p>
                    <p className="text-xs text-slate-500">Funcionários Comparados</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${comparisonResult.divergencias_encontradas > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold font-mono ${comparisonResult.divergencias_encontradas > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {comparisonResult.divergencias_encontradas || 0}
                    </p>
                    <p className="text-xs text-slate-500">Divergências</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    {comparisonResult.divergencias_encontradas === 0 ? (
                      <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                    ) : (
                      <AlertTriangle className="mx-auto text-amber-500" size={32} />
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {comparisonResult.divergencias_encontradas === 0 ? 'Conferido' : 'Revisar'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Funcionários apenas em um sistema */}
              {(comparisonResult.funcionarios_apenas_esocial?.length > 0 || comparisonResult.funcionarios_apenas_sci?.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {comparisonResult.funcionarios_apenas_esocial?.length > 0 && (
                    <Card className="border-indigo-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-indigo-800">Apenas no eSocial</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="text-sm text-indigo-700 space-y-1">
                          {comparisonResult.funcionarios_apenas_esocial.map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                  {comparisonResult.funcionarios_apenas_sci?.length > 0 && (
                    <Card className="border-amber-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-amber-800">Apenas no SCI Único</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="text-sm text-amber-700 space-y-1">
                          {comparisonResult.funcionarios_apenas_sci.map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Divergências */}
              {comparisonResult.divergencias && comparisonResult.divergencias.length > 0 && (
                <Card className="border-slate-200 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Divergências Encontradas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="table-dp text-sm">
                      <thead>
                        <tr>
                          <th>Funcionário</th>
                          <th>Campo</th>
                          <th className="text-right">eSocial</th>
                          <th className="text-right">SCI Único</th>
                          <th className="text-right">Diferença</th>
                          <th>Severidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonResult.divergencias.map((d, index) => (
                          <tr key={index}>
                            <td>
                              <p className="font-medium">{d.funcionario}</p>
                              {d.cpf && <p className="text-xs text-slate-400 font-mono">{d.cpf}</p>}
                            </td>
                            <td className="text-sm">{d.campo}</td>
                            <td className="text-right font-mono text-sm">{formatCurrency(d.valor_esocial)}</td>
                            <td className="text-right font-mono text-sm">{formatCurrency(d.valor_sci_unico || d.valor_sistema)}</td>
                            <td className="text-right font-mono text-sm font-semibold text-rose-600">
                              {formatCurrency(d.diferenca)}
                            </td>
                            <td>{getSeverityBadge(d.severidade)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Resumo */}
              {comparisonResult.resumo && (
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-slate-900 mb-2">Resumo</h4>
                    <p className="text-sm text-slate-600">{comparisonResult.resumo}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              {comparisonResult.recomendacoes && comparisonResult.recomendacoes.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-amber-800 mb-2">Recomendações</h4>
                    <ul className="space-y-1">
                      {comparisonResult.recomendacoes.map((rec, index) => (
                        <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                          <span className="mt-1">•</span>
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

      {/* Histórico de Comparações */}
      {!loadingHistorico && historico.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <History size={18} />
            Histórico de Comparações
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historico.slice(0, 6).map((comp) => (
              <Card key={comp.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">
                      {new Date(comp.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {comp.divergencias_encontradas === 0 ? (
                      <span className="badge-success"><CheckCircle2 size={12} className="mr-1" />OK</span>
                    ) : (
                      <span className="badge-error"><AlertTriangle size={12} className="mr-1" />{comp.divergencias_encontradas}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p><span className="text-slate-400">Comparados:</span> <span className="font-mono">{comp.total_comparados || 0}</span></p>
                    <p><span className="text-slate-400">Divergências:</span> <span className="font-mono">{comp.divergencias_encontradas || 0}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Instructions Card - Only show if no history */}
      {!loadingHistorico && historico.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">Compare informes de rendimento</p>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Faça upload do arquivo gerado pelo <strong>eSocial</strong> e do relatório do <strong>SCI Único</strong> para verificar automaticamente se os valores estão corretos
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700"
              data-testid="start-comparison-cta"
            >
              Iniciar Comparação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InformesRendimento;
