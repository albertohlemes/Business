import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Upload, Loader2, FileUp, CheckCircle2, Edit3, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Admissoes = () => {
  const [admissoes, setAdmissoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [currentAdmissao, setCurrentAdmissao] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [admissoesRes, clientesRes] = await Promise.all([
        axios.get(`${API_URL}/api/admissoes`),
        axios.get(`${API_URL}/api/clientes`)
      ]);
      setAdmissoes(admissoesRes.data);
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
      const response = await axios.post(`${API_URL}/api/admissoes/extrair`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedData(response.data);
      setCurrentAdmissao({ id: response.data.id, cliente_id: selectedCliente });
      setFormData(response.data.dados_extraidos || {});
      toast.success('Dados extraídos com sucesso! Revise antes de confirmar.');
      setUploadDialogOpen(false);
      setReviewDialogOpen(true);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao processar documento');
    } finally {
      setUploading(false);
    }
  }, [selectedCliente]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxFiles: 1
  });

  const handleReview = (admissao) => {
    setCurrentAdmissao(admissao);
    setFormData(admissao.dados_extraidos || {});
    setReviewDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!currentAdmissao) return;
    
    try {
      await axios.post(`${API_URL}/api/admissoes/${currentAdmissao.id}/confirmar`, {
        cliente_id: currentAdmissao.cliente_id,
        nome: formData.nome || '',
        cpf: formData.cpf || '',
        rg: formData.rg || '',
        data_nascimento: formData.data_nascimento || '',
        endereco: formData.endereco || '',
        telefone: formData.telefone || '',
        email: formData.email || '',
        pis: formData.pis || '',
        ctps: formData.ctps || '',
        cargo: formData.cargo || '',
        salario_base: parseFloat(formData.salario_base) || 0,
        data_admissao: formData.data_admissao || '',
        banco: formData.banco || '',
        agencia: formData.agencia || '',
        conta: formData.conta || ''
      });
      toast.success('Admissão confirmada! Colaborador cadastrado.');
      setReviewDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao confirmar admissão');
    }
  };

  const resetForm = () => {
    setExtractedData(null);
    setCurrentAdmissao(null);
    setFormData({});
    setSelectedCliente('');
  };

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente':
        return <span className="badge-pending">Pendente</span>;
      case 'confirmado':
        return <span className="badge-success">Confirmado</span>;
      default:
        return <span className="badge-processing">Processando</span>;
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
    <div data-testid="admissoes-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admissões</h1>
          <p className="text-slate-500 mt-1">Extraia dados de documentos automaticamente com IA</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) resetForm(); }}>
          <Button
            data-testid="nova-admissao-btn"
            onClick={() => setUploadDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={clientes.length === 0}
          >
            <UserPlus size={18} className="mr-2" />
            Nova Admissão
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Admissão - Upload de Documentos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Empresa</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger data-testid="select-cliente-admissao">
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
                data-testid="dropzone-admissao"
                className={`upload-zone ${isDragActive ? 'active' : ''} ${!selectedCliente ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} disabled={!selectedCliente || uploading} />
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                    <p className="text-slate-600">Extraindo dados com IA...</p>
                    <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos</p>
                  </div>
                ) : (
                  <>
                    <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
                    <p className="text-slate-600">Arraste os documentos do funcionário ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG ou PNG (RG, CPF, Comprovante de Endereço, etc.)</p>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { setReviewDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Dados da Admissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-medium">Revise os dados extraídos pela IA antes de confirmar.</p>
              <p className="text-amber-600 mt-1">Corrija qualquer informação incorreta ou faltante.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  data-testid="review-nome"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input
                  data-testid="review-cpf"
                  value={formData.cpf || ''}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                />
              </div>
              <div>
                <Label>RG</Label>
                <Input
                  data-testid="review-rg"
                  value={formData.rg || ''}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  data-testid="review-nascimento"
                  value={formData.data_nascimento || ''}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Admissão</Label>
                <Input
                  data-testid="review-admissao"
                  value={formData.data_admissao || ''}
                  onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input
                  data-testid="review-cargo"
                  value={formData.cargo || ''}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                />
              </div>
              <div>
                <Label>Salário Base (R$)</Label>
                <Input
                  data-testid="review-salario"
                  type="number"
                  step="0.01"
                  value={formData.salario_base || ''}
                  onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço</Label>
                <Input
                  data-testid="review-endereco"
                  value={formData.endereco || ''}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  data-testid="review-telefone"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  data-testid="review-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>PIS/PASEP</Label>
                <Input
                  data-testid="review-pis"
                  value={formData.pis || ''}
                  onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                />
              </div>
              <div>
                <Label>CTPS</Label>
                <Input
                  data-testid="review-ctps"
                  value={formData.ctps || ''}
                  onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                />
              </div>
              <div>
                <Label>Banco</Label>
                <Input
                  data-testid="review-banco"
                  value={formData.banco || ''}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                />
              </div>
              <div>
                <Label>Agência</Label>
                <Input
                  data-testid="review-agencia"
                  value={formData.agencia || ''}
                  onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Input
                  data-testid="review-conta"
                  value={formData.conta || ''}
                  onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                data-testid="confirm-admissao-btn"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 size={16} className="mr-1" />
                Confirmar e Cadastrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admissões List */}
      {admissoes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admissoes.map((admissao) => (
            <Card key={admissao.id} data-testid={`admissao-card-${admissao.id}`} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {admissao.dados_extraidos?.nome || 'Novo Funcionário'}
                    </CardTitle>
                    <p className="text-sm text-slate-500">{getClienteName(admissao.cliente_id)}</p>
                  </div>
                  {getStatusBadge(admissao.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-slate-600 space-y-1">
                  {admissao.dados_extraidos?.cpf && (
                    <p><span className="text-slate-400">CPF:</span> <span className="font-mono">{admissao.dados_extraidos.cpf}</span></p>
                  )}
                  {admissao.dados_extraidos?.cargo && (
                    <p><span className="text-slate-400">Cargo:</span> {admissao.dados_extraidos.cargo}</p>
                  )}
                  <p className="text-xs text-slate-400 pt-2">
                    {new Date(admissao.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {admissao.status === 'pendente' && (
                  <Button
                    onClick={() => handleReview(admissao)}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
                    data-testid={`review-${admissao.id}`}
                  >
                    <Edit3 size={16} className="mr-1" />
                    Revisar e Confirmar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">Nenhuma admissão em andamento</p>
            <p className="text-sm text-slate-400 mt-1">
              {clientes.length === 0 ? 'Cadastre um cliente primeiro' : 'Clique em "Nova Admissão" para começar'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Admissoes;
