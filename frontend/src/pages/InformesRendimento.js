import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { FileSpreadsheet, Upload, Loader2, FileUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InformesRendimento = () => {
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [esocialFile, setEsocialFile] = useState(null);
  const [sistemaFile, setSistemaFile] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);

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
      }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
      maxFiles: 1
    });

    return (
      <div
        {...getRootProps()}
        data-testid="dropzone-esocial"
        className={`upload-zone ${isDragActive ? 'active' : ''} ${esocialFile ? 'border-emerald-500 bg-emerald-50' : ''}`}
      >
        <input {...getInputProps()} />
        {esocialFile ? (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={20} />
            <span className="font-medium">{esocialFile.name}</span>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto text-slate-400 mb-2" size={24} />
            <p className="text-slate-600 text-sm">Arquivo do eSocial</p>
          </>
        )}
      </div>
    );
  };

  const SistemaDropzone = () => {
    const onDrop = useCallback((acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSistemaFile(acceptedFiles[0]);
      }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
      maxFiles: 1
    });

    return (
      <div
        {...getRootProps()}
        data-testid="dropzone-sistema"
        className={`upload-zone ${isDragActive ? 'active' : ''} ${sistemaFile ? 'border-emerald-500 bg-emerald-50' : ''}`}
      >
        <input {...getInputProps()} />
        {sistemaFile ? (
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={20} />
            <span className="font-medium">{sistemaFile.name}</span>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto text-slate-400 mb-2" size={24} />
            <p className="text-slate-600 text-sm">Arquivo do Sistema</p>
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div data-testid="informes-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Informes de Rendimento</h1>
          <p className="text-slate-500 mt-1">Compare eSocial com o sistema interno e detecte divergências</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEsocialFile(null); setSistemaFile(null); } }}>
          <Button
            data-testid="comparar-informes-btn"
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <FileSpreadsheet size={18} className="mr-2" />
            Comparar Informes
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Comparar Informes de Rendimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-slate-500">
                Faça upload dos dois arquivos para comparação automática
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">eSocial</p>
                  <EsocialDropzone />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Sistema Interno</p>
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
                  'Iniciar Comparação'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Comparação</DialogTitle>
          </DialogHeader>
          {comparisonResult && (
            <div className="space-y-4 mt-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-slate-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 font-mono">{comparisonResult.total_comparados || 0}</p>
                    <p className="text-xs text-slate-500">Comparados</p>
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

              {/* Divergências */}
              {comparisonResult.divergencias && comparisonResult.divergencias.length > 0 && (
                <Card className="border-slate-200 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Divergências Encontradas</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="table-dp">
                      <thead>
                        <tr>
                          <th>Funcionário</th>
                          <th>Campo</th>
                          <th className="text-right">eSocial</th>
                          <th className="text-right">Sistema</th>
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
                            <td className="text-right font-mono text-sm">{formatCurrency(d.valor_sistema)}</td>
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

      {/* Instructions Card */}
      <Card className="border-slate-200">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="text-slate-400" size={32} />
          </div>
          <p className="text-slate-500">Compare informes de rendimento</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Faça upload do arquivo gerado pelo eSocial e do relatório do seu sistema
            para verificar automaticamente se os valores estão corretos
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
    </div>
  );
};

export default InformesRendimento;
