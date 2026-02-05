import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Users, Pencil, Trash2, Search, X, Upload, FileUp, Loader2, CheckCircle2, AlertTriangle, FileText, User, FileCheck, Briefcase, CreditCard, UsersRound, Eye, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getErrorMessage } from '../utils/errorHandler';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Initial empty form state with all eSocial fields
const initialFormData = {
  cliente_id: '',
  nome: '', cpf: '', endereco: '', numero: '', bairro: '', complemento: '', cep: '', cidade: '', uf: '',
  email: '', celular: '', ddd: '', deficiencia: false, tipo_deficiencia: '', cidade_nascimento: '',
  uf_nascimento: '', data_nascimento: '', estado_civil: '', grau_instrucao: '', data_admissao: '',
  cargo: '', etnia: '', recebendo_seguro_desemprego: false, sexo: '', rg: '', rg_orgao_emissor: '',
  rg_data_emissao: '', rg_uf: '', reservista: '', pis: '', ctps: '', ctps_serie: '', ctps_data_emissao: '',
  ctps_uf: '', titulo_eleitor: '', titulo_zona: '', titulo_secao: '', cnh: '', cnh_uf: '', cnh_categoria: '',
  cnh_vencimento: '', cnh_emissao: '', cnh_primeira_habilitacao: '', nome_mae: '', nome_pai: '',
  nome_conjuge: '', salario_base: '', horista: false, insalubridade_percentual: '',
  periculosidade_percentual: '', prazo_experiencia: '', quadro_horario: '', vale_transporte: false,
  adiantamento_salarial: false, desconto_sindical: false, data_exame_admissional: '', departamento: '',
  banco: '', agencia: '', conta: '', dependentes: []
};

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [viewingColaborador, setViewingColaborador] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [extractedColaboradores, setExtractedColaboradores] = useState([]);
  const [currentColabIndex, setCurrentColabIndex] = useState(0);
  const [tipoDocumento, setTipoDocumento] = useState('auto');
  const [activeTab, setActiveTab] = useState('cadastrais');
  const { empresaSelecionada } = useEmpresa();

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchData();
  }, [filterCliente]);

  useEffect(() => {
    if (empresaSelecionada && !formData.cliente_id) {
      setFormData(prev => ({ ...prev, cliente_id: empresaSelecionada.id }));
      setFilterCliente(empresaSelecionada.id);
    }
  }, [empresaSelecionada]);

  const fetchData = async () => {
    try {
      const [colabRes, clientesRes] = await Promise.all([
        axios.get(`${API_URL}/api/colaboradores${filterCliente !== 'all' ? `?cliente_id=${filterCliente}` : ''}`),
        axios.get(`${API_URL}/api/clientes`)
      ]);
      setColaboradores(colabRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const clienteId = formData.cliente_id || empresaSelecionada?.id;
    if (!clienteId) {
      toast.error('Selecione uma empresa primeiro');
      return;
    }

    const file = acceptedFiles[0];
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('cliente_id', clienteId);
    formDataUpload.append('tipo_documento', tipoDocumento);

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/colaboradores/importar`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportResult(response.data);
      
      // Handle multiple colaboradores
      const colabs = response.data.colaboradores || [];
      if (colabs.length > 0) {
        // Add cliente_id and normalize data for each colaborador
        const normalizedColabs = colabs.map(c => ({
          ...initialFormData,
          ...c,
          cliente_id: clienteId,
          salario_base: c.salario_base?.toString() || '',
          insalubridade_percentual: c.insalubridade_percentual?.toString() || '',
          periculosidade_percentual: c.periculosidade_percentual?.toString() || '',
          dependentes: c.dependentes || []
        }));
        
        setExtractedColaboradores(normalizedColabs);
        setCurrentColabIndex(0);
        setFormData(normalizedColabs[0]);
      }
      
      setImportDialogOpen(false);
      setReviewDialogOpen(true);
      setActiveTab('cadastrais');
      toast.success(`${colabs.length} colaborador(es) extraído(s)! Revise os dados.`);
      
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao processar documento'));
    } finally {
      setUploading(false);
    }
  }, [formData.cliente_id, empresaSelecionada, tipoDocumento]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  // Update current colaborador in the array when form changes
  const updateCurrentColaborador = (newFormData) => {
    setFormData(newFormData);
    if (extractedColaboradores.length > 0) {
      const updated = [...extractedColaboradores];
      updated[currentColabIndex] = newFormData;
      setExtractedColaboradores(updated);
    }
  };

  // Navigate between colaboradores
  const goToColaborador = (index) => {
    if (index >= 0 && index < extractedColaboradores.length) {
      setCurrentColabIndex(index);
      setFormData(extractedColaboradores[index]);
      setActiveTab('cadastrais');
    }
  };

  // Remove a colaborador from the list
  const removeColaborador = (index) => {
    if (extractedColaboradores.length <= 1) {
      toast.error('Deve haver pelo menos um colaborador');
      return;
    }
    const updated = extractedColaboradores.filter((_, i) => i !== index);
    setExtractedColaboradores(updated);
    if (currentColabIndex >= updated.length) {
      setCurrentColabIndex(updated.length - 1);
      setFormData(updated[updated.length - 1]);
    } else {
      setFormData(updated[currentColabIndex]);
    }
    toast.success('Colaborador removido da lista');
  };

  // Save all colaboradores at once
  const handleSaveAll = async () => {
    if (extractedColaboradores.length === 0) {
      toast.error('Nenhum colaborador para salvar');
      return;
    }

    // Validate required fields
    const invalidColabs = extractedColaboradores.filter((c, i) => !c.nome || !c.cpf);
    if (invalidColabs.length > 0) {
      toast.error(`${invalidColabs.length} colaborador(es) sem nome ou CPF. Revise antes de salvar.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cliente_id: formData.cliente_id,
        colaboradores: extractedColaboradores.map(c => ({
          ...c,
          salario_base: parseFloat(c.salario_base) || 0,
          insalubridade_percentual: c.insalubridade_percentual ? parseFloat(c.insalubridade_percentual) : null,
          periculosidade_percentual: c.periculosidade_percentual ? parseFloat(c.periculosidade_percentual) : null
        }))
      };

      const response = await axios.post(`${API_URL}/api/colaboradores/salvar-lote`, payload);
      
      toast.success(`${response.data.total_salvos} colaborador(es) cadastrado(s) com sucesso!`);
      
      if (response.data.total_erros > 0) {
        toast.error(`${response.data.total_erros} erro(s) ao salvar`);
      }
      
      setReviewDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao salvar colaboradores'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salario_base: parseFloat(formData.salario_base) || 0,
        insalubridade_percentual: formData.insalubridade_percentual ? parseFloat(formData.insalubridade_percentual) : null,
        periculosidade_percentual: formData.periculosidade_percentual ? parseFloat(formData.periculosidade_percentual) : null
      };
      
      if (editingColaborador) {
        await axios.put(`${API_URL}/api/colaboradores/${editingColaborador.id}`, payload);
        toast.success('Colaborador atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/colaboradores`, payload);
        toast.success('Colaborador cadastrado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao salvar colaborador'));
    }
  };

  const handleEdit = (colaborador) => {
    setEditingColaborador(colaborador);
    setFormData({
      ...initialFormData,
      ...colaborador,
      salario_base: colaborador.salario_base?.toString() || '',
      insalubridade_percentual: colaborador.insalubridade_percentual?.toString() || '',
      periculosidade_percentual: colaborador.periculosidade_percentual?.toString() || '',
      dependentes: colaborador.dependentes || []
    });
    setActiveTab('cadastrais');
    setDialogOpen(true);
  };

  const handleView = (colaborador) => {
    setViewingColaborador(colaborador);
    setViewDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este colaborador?')) return;
    try {
      await axios.delete(`${API_URL}/api/colaboradores/${id}`);
      toast.success('Colaborador excluído com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir colaborador');
    }
  };

  const resetForm = () => {
    setEditingColaborador(null);
    setImportResult(null);
    setExtractedColaboradores([]);
    setCurrentColabIndex(0);
    setFormData({
      ...initialFormData,
      cliente_id: empresaSelecionada?.id || ''
    });
    setActiveTab('cadastrais');
  };

  const addDependente = () => {
    const newFormData = {
      ...formData,
      dependentes: [...(formData.dependentes || []), {
        nome: '', data_nascimento: '', cpf: '', parentesco: '', ir: false, salario_familia: false
      }]
    };
    updateCurrentColaborador(newFormData);
  };

  const updateDependente = (index, field, value) => {
    const deps = [...(formData.dependentes || [])];
    deps[index] = { ...deps[index], [field]: value };
    updateCurrentColaborador({ ...formData, dependentes: deps });
  };

  const removeDependente = (index) => {
    const newFormData = {
      ...formData,
      dependentes: (formData.dependentes || []).filter((_, i) => i !== index)
    };
    updateCurrentColaborador(newFormData);
  };

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredColaboradores = colaboradores.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm) ||
    (c.cargo && c.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Simplified form fields renderer for each tab
  const renderFormFields = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="cadastrais" className="text-xs sm:text-sm"><User size={14} className="mr-1 hidden sm:inline" />Cadastrais</TabsTrigger>
        <TabsTrigger value="documentos" className="text-xs sm:text-sm"><FileCheck size={14} className="mr-1 hidden sm:inline" />Documentos</TabsTrigger>
        <TabsTrigger value="contrato" className="text-xs sm:text-sm"><Briefcase size={14} className="mr-1 hidden sm:inline" />Contrato</TabsTrigger>
        <TabsTrigger value="bancarios" className="text-xs sm:text-sm"><CreditCard size={14} className="mr-1 hidden sm:inline" />Bancários</TabsTrigger>
        <TabsTrigger value="dependentes" className="text-xs sm:text-sm"><UsersRound size={14} className="mr-1 hidden sm:inline" />Dependentes</TabsTrigger>
      </TabsList>

      <TabsContent value="cadastrais" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Empresa *</Label>
            <Select value={formData.cliente_id} onValueChange={(v) => updateCurrentColaborador({ ...formData, cliente_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Nome Completo *</Label>
            <Input value={formData.nome} onChange={(e) => updateCurrentColaborador({ ...formData, nome: e.target.value })} required className={!formData.nome ? 'border-amber-300 bg-amber-50' : ''} />
          </div>
          <div><Label>CPF *</Label><Input value={formData.cpf} onChange={(e) => updateCurrentColaborador({ ...formData, cpf: e.target.value })} required className={!formData.cpf ? 'border-amber-300 bg-amber-50' : ''} /></div>
          <div><Label>Sexo</Label><Select value={formData.sexo} onValueChange={(v) => updateCurrentColaborador({ ...formData, sexo: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="masculino">Masculino</SelectItem><SelectItem value="feminino">Feminino</SelectItem></SelectContent></Select></div>
          <div><Label>Data Nascimento</Label><Input placeholder="DD/MM/AAAA" value={formData.data_nascimento} onChange={(e) => updateCurrentColaborador({ ...formData, data_nascimento: e.target.value })} /></div>
          <div><Label>Estado Civil</Label><Select value={formData.estado_civil} onValueChange={(v) => updateCurrentColaborador({ ...formData, estado_civil: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="solteiro">Solteiro(a)</SelectItem><SelectItem value="casado">Casado(a)</SelectItem><SelectItem value="divorciado">Divorciado(a)</SelectItem><SelectItem value="viuvo">Viúvo(a)</SelectItem><SelectItem value="uniao_estavel">União Estável</SelectItem></SelectContent></Select></div>
          <div><Label>Cidade Nascimento</Label><Input value={formData.cidade_nascimento} onChange={(e) => updateCurrentColaborador({ ...formData, cidade_nascimento: e.target.value })} /></div>
          <div><Label>UF Nascimento</Label><Select value={formData.uf_nascimento} onValueChange={(v) => updateCurrentColaborador({ ...formData, uf_nascimento: v })}><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">Endereço</p></div>
          <div className="col-span-2 grid grid-cols-4 gap-2"><div className="col-span-3"><Label>Logradouro</Label><Input value={formData.endereco} onChange={(e) => updateCurrentColaborador({ ...formData, endereco: e.target.value })} /></div><div><Label>Número</Label><Input value={formData.numero} onChange={(e) => updateCurrentColaborador({ ...formData, numero: e.target.value })} /></div></div>
          <div><Label>Bairro</Label><Input value={formData.bairro} onChange={(e) => updateCurrentColaborador({ ...formData, bairro: e.target.value })} /></div>
          <div><Label>CEP</Label><Input value={formData.cep} onChange={(e) => updateCurrentColaborador({ ...formData, cep: e.target.value })} /></div>
          <div><Label>Cidade</Label><Input value={formData.cidade} onChange={(e) => updateCurrentColaborador({ ...formData, cidade: e.target.value })} /></div>
          <div><Label>UF</Label><Select value={formData.uf} onValueChange={(v) => updateCurrentColaborador({ ...formData, uf: v })}><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">Contato</p></div>
          <div><Label>Celular</Label><Input value={formData.celular} onChange={(e) => updateCurrentColaborador({ ...formData, celular: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={formData.email} onChange={(e) => updateCurrentColaborador({ ...formData, email: e.target.value })} /></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">Filiação</p></div>
          <div><Label>Nome da Mãe</Label><Input value={formData.nome_mae} onChange={(e) => updateCurrentColaborador({ ...formData, nome_mae: e.target.value })} /></div>
          <div><Label>Nome do Pai</Label><Input value={formData.nome_pai} onChange={(e) => updateCurrentColaborador({ ...formData, nome_pai: e.target.value })} /></div>
        </div>
      </TabsContent>

      <TabsContent value="documentos" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>RG</Label><Input value={formData.rg} onChange={(e) => updateCurrentColaborador({ ...formData, rg: e.target.value })} /></div>
          <div><Label>Órgão Emissor</Label><Input value={formData.rg_orgao_emissor} onChange={(e) => updateCurrentColaborador({ ...formData, rg_orgao_emissor: e.target.value })} /></div>
          <div><Label>Data Emissão RG</Label><Input placeholder="DD/MM/AAAA" value={formData.rg_data_emissao} onChange={(e) => updateCurrentColaborador({ ...formData, rg_data_emissao: e.target.value })} /></div>
          <div><Label>UF RG</Label><Select value={formData.rg_uf} onValueChange={(v) => updateCurrentColaborador({ ...formData, rg_uf: v })}><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">CTPS</p></div>
          <div><Label>CTPS</Label><Input value={formData.ctps} onChange={(e) => updateCurrentColaborador({ ...formData, ctps: e.target.value })} /></div>
          <div><Label>Série</Label><Input value={formData.ctps_serie} onChange={(e) => updateCurrentColaborador({ ...formData, ctps_serie: e.target.value })} /></div>
          <div><Label>Data Emissão</Label><Input placeholder="DD/MM/AAAA" value={formData.ctps_data_emissao} onChange={(e) => updateCurrentColaborador({ ...formData, ctps_data_emissao: e.target.value })} /></div>
          <div><Label>UF</Label><Select value={formData.ctps_uf} onValueChange={(v) => updateCurrentColaborador({ ...formData, ctps_uf: v })}><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent></Select></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">PIS/PASEP</p></div>
          <div className="sm:col-span-2"><Label>PIS</Label><Input value={formData.pis} onChange={(e) => updateCurrentColaborador({ ...formData, pis: e.target.value })} /></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">CNH</p></div>
          <div><Label>CNH</Label><Input value={formData.cnh} onChange={(e) => updateCurrentColaborador({ ...formData, cnh: e.target.value })} /></div>
          <div><Label>Categoria</Label><Select value={formData.cnh_categoria} onValueChange={(v) => updateCurrentColaborador({ ...formData, cnh_categoria: v })}><SelectTrigger><SelectValue placeholder="Cat." /></SelectTrigger><SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="AB">AB</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem><SelectItem value="E">E</SelectItem></SelectContent></Select></div>
          <div><Label>Vencimento</Label><Input placeholder="DD/MM/AAAA" value={formData.cnh_vencimento} onChange={(e) => updateCurrentColaborador({ ...formData, cnh_vencimento: e.target.value })} /></div>
        </div>
      </TabsContent>

      <TabsContent value="contrato" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Data Admissão</Label><Input placeholder="DD/MM/AAAA" value={formData.data_admissao} onChange={(e) => updateCurrentColaborador({ ...formData, data_admissao: e.target.value })} /></div>
          <div><Label>Cargo</Label><Input value={formData.cargo} onChange={(e) => updateCurrentColaborador({ ...formData, cargo: e.target.value })} /></div>
          <div><Label>Departamento</Label><Input value={formData.departamento} onChange={(e) => updateCurrentColaborador({ ...formData, departamento: e.target.value })} /></div>
          <div><Label>Salário Base (R$)</Label><Input type="number" step="0.01" value={formData.salario_base} onChange={(e) => updateCurrentColaborador({ ...formData, salario_base: e.target.value })} /></div>
          <div><Label>Prazo Experiência</Label><Select value={formData.prazo_experiencia} onValueChange={(v) => updateCurrentColaborador({ ...formData, prazo_experiencia: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="30">30 dias</SelectItem><SelectItem value="45">45 dias</SelectItem><SelectItem value="60">60 dias</SelectItem><SelectItem value="90">90 dias</SelectItem><SelectItem value="30+60">30+60 dias</SelectItem></SelectContent></Select></div>
          <div><Label>Horário</Label><Input placeholder="08:00 às 17:00" value={formData.quadro_horario} onChange={(e) => updateCurrentColaborador({ ...formData, quadro_horario: e.target.value })} /></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">Adicionais</p></div>
          <div><Label>Insalubridade (%)</Label><Select value={formData.insalubridade_percentual?.toString() || 'none'} onValueChange={(v) => updateCurrentColaborador({ ...formData, insalubridade_percentual: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não se aplica</SelectItem><SelectItem value="10">10%</SelectItem><SelectItem value="20">20%</SelectItem><SelectItem value="40">40%</SelectItem></SelectContent></Select></div>
          <div><Label>Periculosidade (%)</Label><Select value={formData.periculosidade_percentual?.toString() || 'none'} onValueChange={(v) => updateCurrentColaborador({ ...formData, periculosidade_percentual: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não se aplica</SelectItem><SelectItem value="30">30%</SelectItem></SelectContent></Select></div>
          <div className="sm:col-span-2 border-t pt-4"><p className="text-sm font-medium text-slate-700">Benefícios</p></div>
          <div className="flex items-center gap-2"><Checkbox checked={formData.vale_transporte} onCheckedChange={(c) => updateCurrentColaborador({ ...formData, vale_transporte: c })} /><Label className="cursor-pointer">Vale Transporte</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formData.adiantamento_salarial} onCheckedChange={(c) => updateCurrentColaborador({ ...formData, adiantamento_salarial: c })} /><Label className="cursor-pointer">Adiantamento Salarial</Label></div>
          <div className="flex items-center gap-2"><Checkbox checked={formData.desconto_sindical} onCheckedChange={(c) => updateCurrentColaborador({ ...formData, desconto_sindical: c })} /><Label className="cursor-pointer">Desconto Sindical</Label></div>
        </div>
      </TabsContent>

      <TabsContent value="bancarios" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>Banco</Label><Input placeholder="Nome ou código" value={formData.banco} onChange={(e) => updateCurrentColaborador({ ...formData, banco: e.target.value })} /></div>
          <div><Label>Agência</Label><Input value={formData.agencia} onChange={(e) => updateCurrentColaborador({ ...formData, agencia: e.target.value })} /></div>
          <div><Label>Conta</Label><Input value={formData.conta} onChange={(e) => updateCurrentColaborador({ ...formData, conta: e.target.value })} /></div>
        </div>
      </TabsContent>

      <TabsContent value="dependentes" className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">Cadastre os dependentes para IR e Salário Família</p>
          <Button type="button" variant="outline" size="sm" onClick={addDependente}><Plus size={14} className="mr-1" /> Adicionar</Button>
        </div>
        {(formData.dependentes || []).length === 0 ? (
          <Card className="border-dashed border-2"><CardContent className="py-8 text-center"><UsersRound className="mx-auto text-slate-300 mb-2" size={32} /><p className="text-slate-400">Nenhum dependente</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {(formData.dependentes || []).map((dep, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Dependente {idx + 1}</p>
                    <Button type="button" variant="ghost" size="sm" className="text-rose-600 h-6 w-6 p-0" onClick={() => removeDependente(idx)}><Trash2 size={12} /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2"><Input placeholder="Nome" value={dep.nome || ''} onChange={(e) => updateDependente(idx, 'nome', e.target.value)} className="h-8 text-sm" /></div>
                    <Input placeholder="CPF" value={dep.cpf || ''} onChange={(e) => updateDependente(idx, 'cpf', e.target.value)} className="h-8 text-sm" />
                    <Input placeholder="DD/MM/AAAA" value={dep.data_nascimento || ''} onChange={(e) => updateDependente(idx, 'data_nascimento', e.target.value)} className="h-8 text-sm" />
                    <Select value={dep.parentesco || ''} onValueChange={(v) => updateDependente(idx, 'parentesco', v)}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Parentesco" /></SelectTrigger><SelectContent><SelectItem value="filho">Filho(a)</SelectItem><SelectItem value="conjuge">Cônjuge</SelectItem><SelectItem value="pai">Pai</SelectItem><SelectItem value="mae">Mãe</SelectItem></SelectContent></Select>
                    <div className="flex gap-3 items-center">
                      <div className="flex items-center gap-1"><Checkbox checked={dep.ir || false} onCheckedChange={(c) => updateDependente(idx, 'ir', c)} /><span className="text-xs">IR</span></div>
                      <div className="flex items-center gap-1"><Checkbox checked={dep.salario_familia || false} onCheckedChange={(c) => updateDependente(idx, 'salario_familia', c)} /><span className="text-xs">Sal.Fam.</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  if (loading) return <div className="space-y-6"><div className="skeleton h-12 w-48 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>;

  return (
    <div data-testid="colaboradores-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Colaboradores</h1>
          <p className="text-slate-500 mt-1">Gerencie os funcionários das empresas</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={(o) => { setImportDialogOpen(o); if (!o) { setImportResult(null); setTipoDocumento('auto'); } }}>
            <DialogTrigger asChild>
              <Button data-testid="import-colaborador-btn" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" disabled={clientes.length === 0}>
                <Upload size={18} className="mr-2" />Importar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText size={24} className="text-indigo-600" />Importar Colaboradores por Documento</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <Card className="border-indigo-200 bg-indigo-50"><CardContent className="p-3 text-sm text-indigo-800"><p className="font-medium">Suporte a múltiplos vínculos!</p><p className="text-indigo-600">Envie uma ficha de registro com vários colaboradores. A IA extrai todos automaticamente.</p></CardContent></Card>
                <div><Label>Empresa</Label><Select value={formData.cliente_id || empresaSelecionada?.id || ''} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Tipo de Documento</Label><Select value={tipoDocumento} onValueChange={setTipoDocumento}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Detectar automaticamente</SelectItem><SelectItem value="ficha_registro">Ficha de Registro (multi-vínculos)</SelectItem><SelectItem value="ficha_esocial">Ficha eSocial</SelectItem><SelectItem value="holerite">Holerite</SelectItem></SelectContent></Select></div>
                <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''} ${!formData.cliente_id && !empresaSelecionada?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input {...getInputProps()} disabled={(!formData.cliente_id && !empresaSelecionada?.id) || uploading} />
                  {uploading ? <div className="flex flex-col items-center"><Loader2 className="animate-spin text-indigo-600 mb-2" size={32} /><p className="text-slate-600">Extraindo colaboradores com IA...</p></div> : <><FileUp className="mx-auto text-slate-400 mb-2" size={32} /><p className="text-slate-600">Arraste o documento ou clique</p><p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, Excel</p></>}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button data-testid="add-colaborador-btn" className="bg-indigo-600 hover:bg-indigo-700" disabled={clientes.length === 0}><Plus size={18} className="mr-2" />Novo Colaborador</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4">
                {renderFormFields()}
                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{editingColaborador ? 'Atualizar' : 'Cadastrar'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Review Dialog - After Import (Multiple Colaboradores) */}
      <Dialog open={reviewDialogOpen} onOpenChange={(o) => { setReviewDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={24} />
              Revisar Colaboradores Extraídos
            </DialogTitle>
          </DialogHeader>
          
          {importResult && extractedColaboradores.length > 0 && (
            <div className="space-y-4 mt-4">
              {/* Navigation between colaboradores */}
              <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${importResult.confianca === 'alta' ? 'bg-emerald-100 text-emerald-700' : importResult.confianca === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                    Confiança: {importResult.confianca}
                  </span>
                  <span className="text-sm text-slate-500">
                    {importResult.tipo_documento === 'ficha_registro' ? 'Ficha de Registro' : importResult.tipo_documento}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentColabIndex === 0} onClick={() => goToColaborador(currentColabIndex - 1)}>
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-sm font-medium px-3">
                    {currentColabIndex + 1} de {extractedColaboradores.length}
                  </span>
                  <Button variant="outline" size="sm" disabled={currentColabIndex === extractedColaboradores.length - 1} onClick={() => goToColaborador(currentColabIndex + 1)}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              {/* Colaboradores tabs/cards */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {extractedColaboradores.map((colab, idx) => (
                  <div
                    key={idx}
                    onClick={() => goToColaborador(idx)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg cursor-pointer transition-all ${idx === currentColabIndex ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-slate-100 border border-slate-200 hover:bg-slate-200'}`}
                  >
                    <p className="text-sm font-medium truncate max-w-[120px]">{colab.nome || `Colaborador ${idx + 1}`}</p>
                    <p className="text-xs text-slate-500 font-mono">{colab.cpf || 'Sem CPF'}</p>
                    {idx === currentColabIndex && extractedColaboradores.length > 1 && (
                      <Button variant="ghost" size="sm" className="mt-1 h-5 text-xs text-rose-600 p-0" onClick={(e) => { e.stopPropagation(); removeColaborador(idx); }}>
                        <Trash2 size={10} className="mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Current colaborador form */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{formData.nome || 'Colaborador sem nome'}</span>
                    {!formData.nome && <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={12} />Preencha o nome</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderFormFields()}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between gap-3 pt-4 border-t">
                <div className="text-sm text-slate-500">
                  {extractedColaboradores.filter(c => c.nome && c.cpf).length} de {extractedColaboradores.length} completos
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || extractedColaboradores.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="salvar-todos-btn"
                  >
                    {saving ? <><Loader2 className="animate-spin mr-2" size={16} />Salvando...</> : <><Save size={16} className="mr-2" />Salvar Todos ({extractedColaboradores.length})</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="text-indigo-600" size={20} />Detalhes do Colaborador</DialogTitle></DialogHeader>
          {viewingColaborador && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2 pb-2 border-b"><p className="text-xs text-slate-400">Nome</p><p className="font-medium text-lg">{viewingColaborador.nome}</p></div>
                <div><p className="text-xs text-slate-400">CPF</p><p className="font-mono">{viewingColaborador.cpf}</p></div>
                <div><p className="text-xs text-slate-400">Cargo</p><p>{viewingColaborador.cargo || '-'}</p></div>
                <div><p className="text-xs text-slate-400">Salário</p><p className="font-mono">{formatCurrency(viewingColaborador.salario_base || 0)}</p></div>
                <div><p className="text-xs text-slate-400">Admissão</p><p>{viewingColaborador.data_admissao || '-'}</p></div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setViewDialogOpen(false); handleEdit(viewingColaborador); }}><Pencil size={14} className="mr-2" />Editar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input placeholder="Buscar..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSearchTerm('')}><X size={16} /></button>}
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filtrar por empresa" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as empresas</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredColaboradores.length > 0 ? (
        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-dp">
              <thead><tr><th>Colaborador</th><th>CPF</th><th>Empresa</th><th>Cargo</th><th>Salário</th><th className="text-right">Ações</th></tr></thead>
              <tbody>
                {filteredColaboradores.map((colab) => (
                  <tr key={colab.id}>
                    <td><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Users className="text-slate-500" size={18} /></div><div><p className="font-medium text-slate-900">{colab.nome}</p>{colab.email && <p className="text-xs text-slate-500">{colab.email}</p>}</div></div></td>
                    <td className="font-mono text-sm">{colab.cpf}</td>
                    <td className="text-sm">{getClienteName(colab.cliente_id)}</td>
                    <td className="text-sm">{colab.cargo || '-'}</td>
                    <td className="font-mono text-sm">{formatCurrency(colab.salario_base || 0)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(colab)}><Eye size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(colab)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(colab.id)} className="text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"><Users className="text-slate-400" size={32} /></div>
            <p className="text-slate-500">{searchTerm || filterCliente !== 'all' ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador cadastrado'}</p>
            <p className="text-sm text-slate-400 mt-1">{clientes.length === 0 ? 'Cadastre uma empresa primeiro' : 'Importe um documento ou cadastre manualmente'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Colaboradores;
