import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Upload, CheckCircle2, XCircle, Clock, Loader2, FileUp, TrendingUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dissidio = () => {
  const [dissidios, setDissidios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [formData, setFormData] = useState({
    cliente_id: '',
    sindicato: '',
    percentual_reajuste: '',
    data_base: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dissidiosRes, clientesRes] = await Promise.all([
        axios.get(`${API_URL}/api/dissidios`),
        axios.get(`${API_URL}/api/clientes`)
      ]);
      setDissidios(dissidiosRes.data);
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

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/convencao/analisar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedData(response.data.dados_convencao);
      toast.success('Convenção analisada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar convenção');
    } finally {
      setUploading(false);
    }
  }, [selectedCliente]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  const handleCreateFromExtracted = () => {
    if (!extractedData) return;
    setFormData({
      cliente_id: selectedCliente,
      sindicato: extractedData.sindicato || '',
      percentual_reajuste: extractedData.percentual_reajuste?.toString() || '',
      data_base: extractedData.data_base || '',
      observacoes: extractedData.resumo || ''
    });
    setUploadDialogOpen(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/dissidios`, {
        ...formData,
        percentual_reajuste: parseFloat(formData.percentual_reajuste)
      });
      toast.success('Dissídio criado com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar dissídio');
    }
  };

  const handleAprovar = async (id) => {
    if (!window.confirm('Tem certeza que deseja aprovar este dissídio? Os salários serão atualizados.')) return;
    try {
      await axios.put(`${API_URL}/api/dissidios/${id}/aprovar`);
      toast.success('Dissídio aprovado! Salários atualizados.');
      fetchData();
    } catch (error) {
      toast.error('Erro ao aprovar dissídio');
    }
  };

  const handleRejeitar = async (id) => {
    if (!window.confirm('Tem certeza que deseja rejeitar este dissídio?')) return;
    try {
      await axios.put(`${API_URL}/api/dissidios/${id}/rejeitar`);
      toast.success('Dissídio rejeitado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao rejeitar dissídio');
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      sindicato: '',
      percentual_reajuste: '',
      data_base: '',
      observacoes: ''
    });
    setExtractedData(null);
    setSelectedCliente('');
  };

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente':
        return <span className="badge-pending"><Clock size={12} className="mr-1" />Pendente</span>;
      case 'aprovado':
        return <span className="badge-success"><CheckCircle2 size={12} className="mr-1" />Aprovado</span>;
      case 'rejeitado':
        return <span className="badge-error"><XCircle size={12} className="mr-1" />Rejeitado</span>;
      default:
        return <span className="badge-processing">Processando</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <div key={i} className="skeleton h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dissidio-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dissídio</h1>
          <p className="text-slate-500 mt-1">Gerencie reajustes salariais por convenção coletiva</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) { setExtractedData(null); setSelectedCliente(''); } }}>
            <DialogTrigger asChild>
              <Button data-testid="upload-convencao-btn" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                <Upload size={18} className="mr-2" />
                Analisar Convenção
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Analisar Convenção Coletiva</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Empresa</Label>
                  <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                    <SelectTrigger data-testid="select-cliente-upload">
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
                  className={`upload-zone ${isDragActive ? 'active' : ''} ${!selectedCliente ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} disabled={!selectedCliente || uploading} />
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                      <p className="text-slate-600">Analisando convenção com IA...</p>
                    </div>
                  ) : (
                    <>
                      <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
                      <p className="text-slate-600">Arraste o PDF da convenção coletiva ou clique para selecionar</p>
                      <p className="text-xs text-slate-400 mt-1">Apenas arquivos PDF</p>
                    </>
                  )}
                </div>

                {extractedData && !extractedData.parsing_error && (
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-emerald-800 mb-2">Dados Extraídos</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-slate-500">Sindicato:</span> {extractedData.sindicato}</p>
                        <p><span className="text-slate-500">Reajuste:</span> <span className="font-mono font-bold text-emerald-700">{extractedData.percentual_reajuste}%</span></p>
                        <p><span className="text-slate-500">Data-base:</span> {extractedData.data_base}</p>
                        {extractedData.piso_salarial && (
                          <p><span className="text-slate-500">Piso:</span> {formatCurrency(extractedData.piso_salarial)}</p>
                        )}
                      </div>
                      <Button
                        onClick={handleCreateFromExtracted}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
                        data-testid="create-from-extracted-btn"
                      >
                        Criar Dissídio com esses dados
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-dissidio-btn" className="bg-indigo-600 hover:bg-indigo-700">
                <FileText size={18} className="mr-2" />
                Novo Dissídio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Dissídio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label>Empresa *</Label>
                  <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
                    <SelectTrigger data-testid="select-cliente-form">
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
                  <Label htmlFor="sindicato">Sindicato *</Label>
                  <Input
                    id="sindicato"
                    data-testid="input-sindicato"
                    value={formData.sindicato}
                    onChange={(e) => setFormData({ ...formData, sindicato: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="percentual">Percentual de Reajuste (%) *</Label>
                    <Input
                      id="percentual"
                      data-testid="input-percentual"
                      type="number"
                      step="0.01"
                      value={formData.percentual_reajuste}
                      onChange={(e) => setFormData({ ...formData, percentual_reajuste: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="data_base">Data-Base *</Label>
                    <Input
                      id="data_base"
                      data-testid="input-data-base"
                      placeholder="MM/YYYY"
                      value={formData.data_base}
                      onChange={(e) => setFormData({ ...formData, data_base: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    data-testid="input-observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="save-dissidio-btn" className="bg-indigo-600 hover:bg-indigo-700">
                    Criar Dissídio
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dissídios List */}
      {dissidios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dissidios.map((dissidio) => (
            <Card key={dissidio.id} data-testid={`dissidio-card-${dissidio.id}`} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {dissidio.sindicato}
                    </CardTitle>
                    <p className="text-sm text-slate-500">{getClienteName(dissidio.cliente_id)}</p>
                  </div>
                  {getStatusBadge(dissidio.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <TrendingUp size={14} />
                      Reajuste
                    </div>
                    <p className="text-xl font-bold text-indigo-600 font-mono">
                      {dissidio.percentual_reajuste}%
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-500 text-xs mb-1">Data-base</p>
                    <p className="font-mono font-medium">{dissidio.data_base}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-600 space-y-1 mb-4">
                  <p><span className="text-slate-400">Colaboradores:</span> <span className="font-mono">{dissidio.colaboradores_afetados}</span></p>
                  <p><span className="text-slate-400">Valor Total:</span> <span className="font-mono">{formatCurrency(dissidio.valor_total_reajuste)}</span></p>
                </div>

                {dissidio.status === 'pendente' && (
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => handleAprovar(dissidio.id)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      data-testid={`aprovar-${dissidio.id}`}
                    >
                      <CheckCircle2 size={16} className="mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRejeitar(dissidio.id)}
                      className="flex-1 text-rose-600 hover:bg-rose-50"
                      data-testid={`rejeitar-${dissidio.id}`}
                    >
                      <XCircle size={16} className="mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}

                {dissidio.aprovado_em && (
                  <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                    Aprovado em {new Date(dissidio.aprovado_em).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">Nenhum dissídio cadastrado</p>
            <p className="text-sm text-slate-400 mt-1">
              Faça upload de uma convenção coletiva ou crie manualmente
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dissidio;
