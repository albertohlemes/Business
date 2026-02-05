import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Calculator, Upload, Loader2, FileUp, Database, TrendingUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Medias = () => {
  const [clientes, setClientes] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState('');
  const [mediasData, setMediasData] = useState(null);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      fetchColaboradores();
    }
  }, [selectedCliente]);

  useEffect(() => {
    if (selectedColaborador) {
      fetchMedias();
    }
  }, [selectedColaborador]);

  const fetchClientes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clientes`);
      setClientes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchColaboradores = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/colaboradores?cliente_id=${selectedCliente}`);
      setColaboradores(response.data);
    } catch (error) {
      toast.error('Erro ao carregar colaboradores');
    }
  };

  const fetchMedias = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/medias/${selectedColaborador}?meses=24`);
      setMediasData(response.data);
    } catch (error) {
      console.error('Erro ao carregar médias:', error);
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
      const response = await axios.post(`${API_URL}/api/medias/importar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(response.data);
      toast.success(`Importação concluída! ${response.data.registros_salvos} registros salvos.`);
      if (selectedColaborador) fetchMedias();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao importar médias');
    } finally {
      setUploading(false);
    }
  }, [selectedCliente, selectedColaborador]);

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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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
          <h1 className="text-2xl font-bold text-slate-900">Recomposição de Médias</h1>
          <p className="text-slate-500 mt-1">Importe histórico salarial para cálculo de férias e rescisão</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <Button
            data-testid="importar-medias-btn"
            onClick={() => setUploadDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={clientes.length === 0}
          >
            <Upload size={18} className="mr-2" />
            Importar Histórico
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Importar Histórico de Médias</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
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
                className={`upload-zone ${isDragActive ? 'active' : ''} ${!selectedCliente ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} disabled={!selectedCliente || uploading} />
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                    <p className="text-slate-600">Processando histórico com IA...</p>
                    <p className="text-xs text-slate-400 mt-1">Extraindo dados de 12-24 meses</p>
                  </div>
                ) : (
                  <>
                    <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-slate-600">Arraste a planilha de histórico ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, Excel ou CSV com dados de 12-24 meses</p>
                  </>
                )}
              </div>

              {importResult && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <Database size={18} />
                      {importResult.registros_salvos} registros importados
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Empresa</Label>
          <Select value={selectedCliente} onValueChange={(value) => { setSelectedCliente(value); setSelectedColaborador(''); setMediasData(null); }}>
            <SelectTrigger data-testid="filter-cliente">
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
        <div>
          <Label>Colaborador</Label>
          <Select value={selectedColaborador} onValueChange={setSelectedColaborador} disabled={!selectedCliente}>
            <SelectTrigger data-testid="filter-colaborador">
              <SelectValue placeholder="Selecione o colaborador" />
            </SelectTrigger>
            <SelectContent>
              {colaboradores.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Médias Display */}
      {mediasData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <TrendingUp size={14} />
                  Média Salário
                </div>
                <p className="text-xl font-bold text-slate-900 font-mono">
                  {formatCurrency(mediasData.media_salario)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-slate-500 text-xs mb-1">Média HE</p>
                <p className="text-xl font-bold text-slate-900 font-mono">
                  {formatCurrency(mediasData.media_horas_extras)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-slate-500 text-xs mb-1">Média Comissões</p>
                <p className="text-xl font-bold text-slate-900 font-mono">
                  {formatCurrency(mediasData.media_comissoes)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-slate-500 text-xs mb-1">Média Adicionais</p>
                <p className="text-xl font-bold text-slate-900 font-mono">
                  {formatCurrency(mediasData.media_adicionais)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-indigo-200 bg-indigo-50">
              <CardContent className="p-4">
                <p className="text-indigo-600 text-xs mb-1 font-medium">MÉDIA TOTAL</p>
                <p className="text-xl font-bold text-indigo-700 font-mono">
                  {formatCurrency(mediasData.media_total)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Historical Data Table */}
          {mediasData.medias && mediasData.medias.length > 0 && (
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Histórico ({mediasData.periodo_meses} meses)</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="table-dp">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th className="text-right">Salário</th>
                      <th className="text-right">Horas Extras</th>
                      <th className="text-right">Comissões</th>
                      <th className="text-right">Adicionais</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediasData.medias.map((m, index) => (
                      <tr key={index}>
                        <td className="font-mono">{m.competencia}</td>
                        <td className="text-right font-mono">{formatCurrency(m.salario_bruto)}</td>
                        <td className="text-right font-mono">{formatCurrency(m.horas_extras)}</td>
                        <td className="text-right font-mono">{formatCurrency(m.comissoes)}</td>
                        <td className="text-right font-mono">{formatCurrency(m.adicionais)}</td>
                        <td className="text-right font-mono font-semibold">
                          {formatCurrency((m.salario_bruto || 0) + (m.horas_extras || 0) + (m.comissoes || 0) + (m.adicionais || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Calculator className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">
              {!selectedCliente ? 'Selecione uma empresa' : !selectedColaborador ? 'Selecione um colaborador' : 'Nenhum histórico encontrado'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Importe planilhas com histórico de 12-24 meses para calcular médias
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Medias;
