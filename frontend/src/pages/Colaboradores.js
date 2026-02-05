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
import { Plus, Users, Pencil, Trash2, Search, X, Upload, FileUp, Loader2, CheckCircle2, AlertTriangle, FileText, User, FileCheck, Briefcase, CreditCard, UsersRound, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEmpresa } from '../contexts/EmpresaContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Initial empty form state with all eSocial fields
const initialFormData = {
  cliente_id: '',
  // Dados Cadastrais
  nome: '',
  cpf: '',
  endereco: '',
  numero: '',
  bairro: '',
  complemento: '',
  cep: '',
  cidade: '',
  uf: '',
  email: '',
  celular: '',
  ddd: '',
  // Dados Admissionais
  deficiencia: false,
  tipo_deficiencia: '',
  cidade_nascimento: '',
  uf_nascimento: '',
  data_nascimento: '',
  estado_civil: '',
  grau_instrucao: '',
  data_admissao: '',
  cargo: '',
  etnia: '',
  recebendo_seguro_desemprego: false,
  sexo: '',
  // Documentos
  rg: '',
  rg_orgao_emissor: '',
  rg_data_emissao: '',
  rg_uf: '',
  reservista: '',
  pis: '',
  ctps: '',
  ctps_serie: '',
  ctps_data_emissao: '',
  ctps_uf: '',
  titulo_eleitor: '',
  titulo_zona: '',
  titulo_secao: '',
  cnh: '',
  cnh_uf: '',
  cnh_categoria: '',
  cnh_vencimento: '',
  cnh_emissao: '',
  cnh_primeira_habilitacao: '',
  // Dados Adicionais
  nome_mae: '',
  nome_pai: '',
  nome_conjuge: '',
  // Informações Contratuais
  salario_base: '',
  horista: false,
  insalubridade_percentual: '',
  periculosidade_percentual: '',
  prazo_experiencia: '',
  quadro_horario: '',
  vale_transporte: false,
  adiantamento_salarial: false,
  desconto_sindical: false,
  data_exame_admissional: '',
  departamento: '',
  // Dados Bancários
  banco: '',
  agencia: '',
  conta: '',
  // Dependentes
  dependentes: []
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
  const [importResult, setImportResult] = useState(null);
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
      
      // Pre-fill form with extracted data
      const dados = response.data.dados_extraidos || {};
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteId,
        // Dados Cadastrais
        nome: dados.nome || '',
        cpf: dados.cpf || '',
        endereco: dados.endereco || '',
        numero: dados.numero || '',
        bairro: dados.bairro || '',
        complemento: dados.complemento || '',
        cep: dados.cep || '',
        cidade: dados.cidade || '',
        uf: dados.uf || '',
        email: dados.email || '',
        celular: dados.celular || dados.telefone || '',
        ddd: dados.ddd || '',
        // Dados Admissionais
        deficiencia: dados.deficiencia || false,
        tipo_deficiencia: dados.tipo_deficiencia || '',
        cidade_nascimento: dados.cidade_nascimento || '',
        uf_nascimento: dados.uf_nascimento || '',
        data_nascimento: dados.data_nascimento || '',
        estado_civil: dados.estado_civil || '',
        grau_instrucao: dados.grau_instrucao || dados.escolaridade || '',
        data_admissao: dados.data_admissao || '',
        cargo: dados.cargo || '',
        etnia: dados.etnia || '',
        recebendo_seguro_desemprego: dados.recebendo_seguro_desemprego || false,
        sexo: dados.sexo || '',
        // Documentos
        rg: dados.rg || '',
        rg_orgao_emissor: dados.rg_orgao_emissor || '',
        rg_data_emissao: dados.rg_data_emissao || '',
        rg_uf: dados.rg_uf || '',
        reservista: dados.reservista || '',
        pis: dados.pis || '',
        ctps: dados.ctps || '',
        ctps_serie: dados.ctps_serie || '',
        ctps_data_emissao: dados.ctps_data_emissao || '',
        ctps_uf: dados.ctps_uf || '',
        titulo_eleitor: dados.titulo_eleitor || '',
        titulo_zona: dados.titulo_zona || '',
        titulo_secao: dados.titulo_secao || '',
        cnh: dados.cnh || '',
        cnh_uf: dados.cnh_uf || '',
        cnh_categoria: dados.cnh_categoria || '',
        cnh_vencimento: dados.cnh_vencimento || '',
        cnh_emissao: dados.cnh_emissao || '',
        cnh_primeira_habilitacao: dados.cnh_primeira_habilitacao || '',
        // Dados Adicionais
        nome_mae: dados.nome_mae || '',
        nome_pai: dados.nome_pai || '',
        nome_conjuge: dados.nome_conjuge || '',
        // Informações Contratuais
        salario_base: dados.salario_base?.toString() || '',
        horista: dados.horista || false,
        insalubridade_percentual: dados.insalubridade_percentual?.toString() || '',
        periculosidade_percentual: dados.periculosidade_percentual?.toString() || '',
        prazo_experiencia: dados.prazo_experiencia || '',
        quadro_horario: dados.quadro_horario || '',
        vale_transporte: dados.vale_transporte || false,
        adiantamento_salarial: dados.adiantamento_salarial || false,
        desconto_sindical: dados.desconto_sindical || false,
        data_exame_admissional: dados.data_exame_admissional || '',
        departamento: dados.departamento || '',
        // Dados Bancários
        banco: dados.banco || '',
        agencia: dados.agencia || '',
        conta: dados.conta || '',
        // Dependentes
        dependentes: dados.dependentes || []
      }));
      
      setImportDialogOpen(false);
      setReviewDialogOpen(true);
      setActiveTab('cadastrais');
      toast.success('Documento processado! Revise os dados extraídos.');
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao processar documento');
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
      setReviewDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar colaborador');
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
    setFormData({
      ...initialFormData,
      cliente_id: empresaSelecionada?.id || ''
    });
    setActiveTab('cadastrais');
  };

  const addDependente = () => {
    setFormData(prev => ({
      ...prev,
      dependentes: [...(prev.dependentes || []), {
        nome: '',
        data_nascimento: '',
        cpf: '',
        parentesco: '',
        ir: false,
        salario_familia: false
      }]
    }));
  };

  const updateDependente = (index, field, value) => {
    setFormData(prev => {
      const deps = [...(prev.dependentes || [])];
      deps[index] = { ...deps[index], [field]: value };
      return { ...prev, dependentes: deps };
    });
  };

  const removeDependente = (index) => {
    setFormData(prev => ({
      ...prev,
      dependentes: (prev.dependentes || []).filter((_, i) => i !== index)
    }));
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

  // Render form fields for each tab
  const renderFormContent = (isReview = false) => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="cadastrais" className="text-xs sm:text-sm">
          <User size={14} className="mr-1 hidden sm:inline" />
          Cadastrais
        </TabsTrigger>
        <TabsTrigger value="documentos" className="text-xs sm:text-sm">
          <FileCheck size={14} className="mr-1 hidden sm:inline" />
          Documentos
        </TabsTrigger>
        <TabsTrigger value="contrato" className="text-xs sm:text-sm">
          <Briefcase size={14} className="mr-1 hidden sm:inline" />
          Contrato
        </TabsTrigger>
        <TabsTrigger value="bancarios" className="text-xs sm:text-sm">
          <CreditCard size={14} className="mr-1 hidden sm:inline" />
          Bancários
        </TabsTrigger>
        <TabsTrigger value="dependentes" className="text-xs sm:text-sm">
          <UsersRound size={14} className="mr-1 hidden sm:inline" />
          Dependentes
        </TabsTrigger>
      </TabsList>

      {/* Tab 1: Dados Cadastrais */}
      <TabsContent value="cadastrais" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Empresa *</Label>
            <Select value={formData.cliente_id} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
              <SelectTrigger data-testid="select-cliente">
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
          <div className="sm:col-span-2">
            <Label>Nome Completo *</Label>
            <Input data-testid="input-nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required className={isReview && !formData.nome ? 'border-amber-300 bg-amber-50' : ''} />
          </div>
          <div>
            <Label>CPF *</Label>
            <Input data-testid="input-cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} required className={isReview && !formData.cpf ? 'border-amber-300 bg-amber-50' : ''} />
          </div>
          <div>
            <Label>Sexo</Label>
            <Select value={formData.sexo} onValueChange={(value) => setFormData({ ...formData, sexo: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input type="text" placeholder="DD/MM/AAAA" value={formData.data_nascimento} onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })} />
          </div>
          <div>
            <Label>Estado Civil</Label>
            <Select value={formData.estado_civil} onValueChange={(value) => setFormData({ ...formData, estado_civil: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="separado">Separado(a)</SelectItem>
                <SelectItem value="uniao_estavel">União Estável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cidade de Nascimento</Label>
            <Input value={formData.cidade_nascimento} onChange={(e) => setFormData({ ...formData, cidade_nascimento: e.target.value })} />
          </div>
          <div>
            <Label>UF Nascimento</Label>
            <Select value={formData.uf_nascimento} onValueChange={(value) => setFormData({ ...formData, uf_nascimento: value })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Etnia</Label>
            <Select value={formData.etnia} onValueChange={(value) => setFormData({ ...formData, etnia: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="branca">Branca</SelectItem>
                <SelectItem value="preta">Preta</SelectItem>
                <SelectItem value="parda">Parda</SelectItem>
                <SelectItem value="amarela">Amarela</SelectItem>
                <SelectItem value="indigena">Indígena</SelectItem>
                <SelectItem value="nao_declarado">Não Declarado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grau de Instrução</Label>
            <Select value={formData.grau_instrucao} onValueChange={(value) => setFormData({ ...formData, grau_instrucao: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                <SelectItem value="fundamental">Fundamental Completo</SelectItem>
                <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                <SelectItem value="medio">Médio Completo</SelectItem>
                <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                <SelectItem value="superior">Superior Completo</SelectItem>
                <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                <SelectItem value="mestrado">Mestrado</SelectItem>
                <SelectItem value="doutorado">Doutorado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Endereço</p>
          </div>
          <div className="sm:col-span-2 grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <Label>Logradouro</Label>
              <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={formData.bairro} onChange={(e) => setFormData({ ...formData, bairro: e.target.value })} />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input value={formData.complemento} onChange={(e) => setFormData({ ...formData, complemento: e.target.value })} />
          </div>
          <div>
            <Label>CEP</Label>
            <Input value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
          </div>
          <div>
            <Label>UF</Label>
            <Select value={formData.uf} onValueChange={(value) => setFormData({ ...formData, uf: value })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Contato</p>
          </div>
          <div className="flex gap-2">
            <div className="w-20">
              <Label>DDD</Label>
              <Input value={formData.ddd} onChange={(e) => setFormData({ ...formData, ddd: e.target.value })} />
            </div>
            <div className="flex-1">
              <Label>Celular</Label>
              <Input value={formData.celular} onChange={(e) => setFormData({ ...formData, celular: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Filiação</p>
          </div>
          <div>
            <Label>Nome da Mãe</Label>
            <Input value={formData.nome_mae} onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })} />
          </div>
          <div>
            <Label>Nome do Pai</Label>
            <Input value={formData.nome_pai} onChange={(e) => setFormData({ ...formData, nome_pai: e.target.value })} />
          </div>
          <div>
            <Label>Nome do Cônjuge</Label>
            <Input value={formData.nome_conjuge} onChange={(e) => setFormData({ ...formData, nome_conjuge: e.target.value })} />
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Deficiência</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="deficiencia" checked={formData.deficiencia} onCheckedChange={(checked) => setFormData({ ...formData, deficiencia: checked })} />
            <Label htmlFor="deficiencia" className="cursor-pointer">Pessoa com Deficiência (PcD)</Label>
          </div>
          {formData.deficiencia && (
            <div>
              <Label>Tipo de Deficiência</Label>
              <Select value={formData.tipo_deficiencia} onValueChange={(value) => setFormData({ ...formData, tipo_deficiencia: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Física</SelectItem>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="auditiva">Auditiva</SelectItem>
                  <SelectItem value="mental">Mental</SelectItem>
                  <SelectItem value="intelectual">Intelectual</SelectItem>
                  <SelectItem value="reabilitado">Reabilitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Tab 2: Documentos */}
      <TabsContent value="documentos" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-slate-700 mb-3">RG</p>
          </div>
          <div>
            <Label>Número do RG</Label>
            <Input value={formData.rg} onChange={(e) => setFormData({ ...formData, rg: e.target.value })} />
          </div>
          <div>
            <Label>Órgão Emissor</Label>
            <Input placeholder="SSP, IFP, etc" value={formData.rg_orgao_emissor} onChange={(e) => setFormData({ ...formData, rg_orgao_emissor: e.target.value })} />
          </div>
          <div>
            <Label>Data de Emissão</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.rg_data_emissao} onChange={(e) => setFormData({ ...formData, rg_data_emissao: e.target.value })} />
          </div>
          <div>
            <Label>UF</Label>
            <Select value={formData.rg_uf} onValueChange={(value) => setFormData({ ...formData, rg_uf: value })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">CTPS</p>
          </div>
          <div>
            <Label>Número CTPS</Label>
            <Input value={formData.ctps} onChange={(e) => setFormData({ ...formData, ctps: e.target.value })} />
          </div>
          <div>
            <Label>Série</Label>
            <Input value={formData.ctps_serie} onChange={(e) => setFormData({ ...formData, ctps_serie: e.target.value })} />
          </div>
          <div>
            <Label>Data de Emissão</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.ctps_data_emissao} onChange={(e) => setFormData({ ...formData, ctps_data_emissao: e.target.value })} />
          </div>
          <div>
            <Label>UF</Label>
            <Select value={formData.ctps_uf} onValueChange={(value) => setFormData({ ...formData, ctps_uf: value })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">PIS/PASEP</p>
          </div>
          <div className="sm:col-span-2">
            <Label>Número PIS/PASEP</Label>
            <Input value={formData.pis} onChange={(e) => setFormData({ ...formData, pis: e.target.value })} />
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Título de Eleitor</p>
          </div>
          <div>
            <Label>Número</Label>
            <Input value={formData.titulo_eleitor} onChange={(e) => setFormData({ ...formData, titulo_eleitor: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Zona</Label>
              <Input value={formData.titulo_zona} onChange={(e) => setFormData({ ...formData, titulo_zona: e.target.value })} />
            </div>
            <div className="flex-1">
              <Label>Seção</Label>
              <Input value={formData.titulo_secao} onChange={(e) => setFormData({ ...formData, titulo_secao: e.target.value })} />
            </div>
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Certificado de Reservista</p>
          </div>
          <div className="sm:col-span-2">
            <Label>Número</Label>
            <Input value={formData.reservista} onChange={(e) => setFormData({ ...formData, reservista: e.target.value })} />
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">CNH</p>
          </div>
          <div>
            <Label>Número CNH</Label>
            <Input value={formData.cnh} onChange={(e) => setFormData({ ...formData, cnh: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={formData.cnh_categoria} onValueChange={(value) => setFormData({ ...formData, cnh_categoria: value })}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="AB">AB</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="ACC">ACC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>UF</Label>
            <Select value={formData.cnh_uf} onValueChange={(value) => setFormData({ ...formData, cnh_uf: value })}>
              <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de Emissão</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.cnh_emissao} onChange={(e) => setFormData({ ...formData, cnh_emissao: e.target.value })} />
          </div>
          <div>
            <Label>Vencimento</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.cnh_vencimento} onChange={(e) => setFormData({ ...formData, cnh_vencimento: e.target.value })} />
          </div>
          <div>
            <Label>1ª Habilitação</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.cnh_primeira_habilitacao} onChange={(e) => setFormData({ ...formData, cnh_primeira_habilitacao: e.target.value })} />
          </div>
        </div>
      </TabsContent>

      {/* Tab 3: Contrato */}
      <TabsContent value="contrato" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Data de Admissão</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.data_admissao} onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })} />
          </div>
          <div>
            <Label>Data Exame Admissional</Label>
            <Input placeholder="DD/MM/AAAA" value={formData.data_exame_admissional} onChange={(e) => setFormData({ ...formData, data_exame_admissional: e.target.value })} />
          </div>
          <div>
            <Label>Cargo</Label>
            <Input value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} />
          </div>
          <div>
            <Label>Departamento/Setor</Label>
            <Input value={formData.departamento} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} />
          </div>
          <div>
            <Label>Salário Base (R$)</Label>
            <Input type="number" step="0.01" value={formData.salario_base} onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox id="horista" checked={formData.horista} onCheckedChange={(checked) => setFormData({ ...formData, horista: checked })} />
            <Label htmlFor="horista" className="cursor-pointer">Horista (salário por hora)</Label>
          </div>
          <div>
            <Label>Prazo de Experiência (dias)</Label>
            <Select value={formData.prazo_experiencia} onValueChange={(value) => setFormData({ ...formData, prazo_experiencia: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="45">45 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="30+60">30 + 60 dias</SelectItem>
                <SelectItem value="45+45">45 + 45 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quadro de Horário</Label>
            <Input placeholder="Ex: 08:00 às 17:00" value={formData.quadro_horario} onChange={(e) => setFormData({ ...formData, quadro_horario: e.target.value })} />
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Adicionais</p>
          </div>
          <div>
            <Label>Insalubridade (%)</Label>
            <Select value={formData.insalubridade_percentual?.toString() || ''} onValueChange={(value) => setFormData({ ...formData, insalubridade_percentual: value })}>
              <SelectTrigger><SelectValue placeholder="Não se aplica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não se aplica</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="20">20%</SelectItem>
                <SelectItem value="40">40%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Periculosidade (%)</Label>
            <Select value={formData.periculosidade_percentual?.toString() || ''} onValueChange={(value) => setFormData({ ...formData, periculosidade_percentual: value })}>
              <SelectTrigger><SelectValue placeholder="Não se aplica" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Não se aplica</SelectItem>
                <SelectItem value="30">30%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 border-t pt-4 mt-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Benefícios e Descontos</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="vale_transporte" checked={formData.vale_transporte} onCheckedChange={(checked) => setFormData({ ...formData, vale_transporte: checked })} />
            <Label htmlFor="vale_transporte" className="cursor-pointer">Vale Transporte</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="adiantamento_salarial" checked={formData.adiantamento_salarial} onCheckedChange={(checked) => setFormData({ ...formData, adiantamento_salarial: checked })} />
            <Label htmlFor="adiantamento_salarial" className="cursor-pointer">Adiantamento Salarial</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="desconto_sindical" checked={formData.desconto_sindical} onCheckedChange={(checked) => setFormData({ ...formData, desconto_sindical: checked })} />
            <Label htmlFor="desconto_sindical" className="cursor-pointer">Desconto Sindical</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="recebendo_seguro" checked={formData.recebendo_seguro_desemprego} onCheckedChange={(checked) => setFormData({ ...formData, recebendo_seguro_desemprego: checked })} />
            <Label htmlFor="recebendo_seguro" className="cursor-pointer">Recebendo Seguro Desemprego</Label>
          </div>
        </div>
      </TabsContent>

      {/* Tab 4: Dados Bancários */}
      <TabsContent value="bancarios" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Banco</Label>
            <Input placeholder="Nome ou código do banco" value={formData.banco} onChange={(e) => setFormData({ ...formData, banco: e.target.value })} />
          </div>
          <div>
            <Label>Agência</Label>
            <Input value={formData.agencia} onChange={(e) => setFormData({ ...formData, agencia: e.target.value })} />
          </div>
          <div>
            <Label>Conta</Label>
            <Input value={formData.conta} onChange={(e) => setFormData({ ...formData, conta: e.target.value })} />
          </div>
        </div>
      </TabsContent>

      {/* Tab 5: Dependentes */}
      <TabsContent value="dependentes" className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">Cadastre os dependentes para IR e Salário Família</p>
          <Button type="button" variant="outline" size="sm" onClick={addDependente}>
            <Plus size={14} className="mr-1" /> Adicionar
          </Button>
        </div>
        {(formData.dependentes || []).length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="py-8 text-center">
              <UsersRound className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-slate-400">Nenhum dependente cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(formData.dependentes || []).map((dep, index) => (
              <Card key={index} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-slate-700">Dependente {index + 1}</p>
                    <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => removeDependente(index)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label>Nome Completo</Label>
                      <Input value={dep.nome || ''} onChange={(e) => updateDependente(index, 'nome', e.target.value)} />
                    </div>
                    <div>
                      <Label>CPF</Label>
                      <Input value={dep.cpf || ''} onChange={(e) => updateDependente(index, 'cpf', e.target.value)} />
                    </div>
                    <div>
                      <Label>Data de Nascimento</Label>
                      <Input placeholder="DD/MM/AAAA" value={dep.data_nascimento || ''} onChange={(e) => updateDependente(index, 'data_nascimento', e.target.value)} />
                    </div>
                    <div>
                      <Label>Parentesco</Label>
                      <Select value={dep.parentesco || ''} onValueChange={(value) => updateDependente(index, 'parentesco', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="filho">Filho(a)</SelectItem>
                          <SelectItem value="conjuge">Cônjuge</SelectItem>
                          <SelectItem value="companheiro">Companheiro(a)</SelectItem>
                          <SelectItem value="pai">Pai</SelectItem>
                          <SelectItem value="mae">Mãe</SelectItem>
                          <SelectItem value="avo">Avô/Avó</SelectItem>
                          <SelectItem value="neto">Neto(a)</SelectItem>
                          <SelectItem value="enteado">Enteado(a)</SelectItem>
                          <SelectItem value="tutelado">Menor Tutelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-4 pt-5">
                      <div className="flex items-center gap-2">
                        <Checkbox id={`ir-${index}`} checked={dep.ir || false} onCheckedChange={(checked) => updateDependente(index, 'ir', checked)} />
                        <Label htmlFor={`ir-${index}`} className="cursor-pointer text-sm">IR</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`sf-${index}`} checked={dep.salario_familia || false} onCheckedChange={(checked) => updateDependente(index, 'salario_familia', checked)} />
                        <Label htmlFor={`sf-${index}`} className="cursor-pointer text-sm">Sal. Família</Label>
                      </div>
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div data-testid="colaboradores-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Colaboradores</h1>
          <p className="text-slate-500 mt-1">Gerencie os funcionários das empresas</p>
        </div>
        <div className="flex gap-2">
          {/* Import Button */}
          <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) { setImportResult(null); setTipoDocumento('auto'); } }}>
            <DialogTrigger asChild>
              <Button data-testid="import-colaborador-btn" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" disabled={clientes.length === 0}>
                <Upload size={18} className="mr-2" />
                Importar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText size={24} className="text-indigo-600" />
                  Importar Colaborador por Documento
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-slate-500">
                  Faça upload da <strong>Ficha de Admissão eSocial</strong>, <strong>Ficha de Registro</strong> ou <strong>Holerite</strong> para extrair automaticamente os dados do colaborador.
                </p>
                <div>
                  <Label>Empresa</Label>
                  <Select value={formData.cliente_id || empresaSelecionada?.id || ''} onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}>
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
                <div>
                  <Label>Tipo de Documento</Label>
                  <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                    <SelectTrigger data-testid="select-tipo-doc">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Detectar automaticamente</SelectItem>
                      <SelectItem value="ficha_esocial">Ficha de Admissão eSocial</SelectItem>
                      <SelectItem value="ficha_registro">Ficha de Registro</SelectItem>
                      <SelectItem value="holerite">Holerite / Contracheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div
                  {...getRootProps()}
                  data-testid="dropzone-colaborador"
                  className={`upload-zone ${isDragActive ? 'active' : ''} ${!formData.cliente_id && !empresaSelecionada?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} disabled={(!formData.cliente_id && !empresaSelecionada?.id) || uploading} />
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                      <p className="text-slate-600">Extraindo dados com IA...</p>
                      <p className="text-xs text-slate-400 mt-1">Analisando documento (pode levar alguns segundos)</p>
                    </div>
                  ) : (
                    <>
                      <FileUp className="mx-auto text-slate-400 mb-2" size={32} />
                      <p className="text-slate-600">Arraste o documento ou clique para selecionar</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG ou Excel (Ficha eSocial, Registro ou Holerite)</p>
                    </>
                  )}
                </div>
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-3 text-sm text-emerald-800">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Suporte a documentos manuscritos e escaneados</p>
                        <p className="text-emerald-700">A IA extrai dados mesmo de documentos com baixa qualidade ou preenchidos à mão.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual Add Button */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-colaborador-btn" className="bg-indigo-600 hover:bg-indigo-700" disabled={clientes.length === 0}>
                <Plus size={18} className="mr-2" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4">
                {renderFormContent()}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" data-testid="save-colaborador-btn" className="bg-indigo-600 hover:bg-indigo-700">
                    {editingColaborador ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Review Dialog - After Import */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { setReviewDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={24} />
              Revisar Dados Extraídos
            </DialogTitle>
          </DialogHeader>
          
          {importResult && (
            <div className="space-y-4 mt-4">
              {/* Extraction Info */}
              <Card className={`border-2 ${importResult.confianca === 'alta' ? 'border-emerald-200 bg-emerald-50' : importResult.confianca === 'media' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Tipo de Documento: <span className="text-indigo-600">{importResult.tipo_documento === 'ficha_registro' ? 'Ficha de Registro' : importResult.tipo_documento === 'holerite' ? 'Holerite' : importResult.tipo_documento === 'ficha_esocial' ? 'Ficha eSocial' : importResult.tipo_documento}</span>
                      </p>
                      <p className="text-sm text-slate-500">
                        Confiança da extração: <span className={`font-medium ${importResult.confianca === 'alta' ? 'text-emerald-600' : importResult.confianca === 'media' ? 'text-amber-600' : 'text-rose-600'}`}>{importResult.confianca}</span>
                      </p>
                    </div>
                    {importResult.confianca === 'alta' ? (
                      <CheckCircle2 className="text-emerald-600" size={24} />
                    ) : (
                      <AlertTriangle className={importResult.confianca === 'media' ? 'text-amber-600' : 'text-rose-600'} size={24} />
                    )}
                  </div>
                  {importResult.campos_extraidos?.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Campos extraídos: {importResult.campos_extraidos.slice(0, 10).join(', ')}{importResult.campos_extraidos.length > 10 ? ` e mais ${importResult.campos_extraidos.length - 10}...` : ''}
                    </p>
                  )}
                  {importResult.campos_incertos?.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Campos incertos (revise): {importResult.campos_incertos.join(', ')}
                    </p>
                  )}
                  {importResult.observacoes && (
                    <p className="text-xs text-slate-400 mt-1 italic">{importResult.observacoes}</p>
                  )}
                </CardContent>
              </Card>

              {/* Form to review and edit */}
              <form onSubmit={handleSubmit}>
                {renderFormContent(true)}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6">
                  <Button type="button" variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" data-testid="confirm-import-btn" className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 size={16} className="mr-2" />
                    Confirmar e Cadastrar
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog - Show colaborador details */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="text-indigo-600" size={20} />
              Detalhes do Colaborador
            </DialogTitle>
          </DialogHeader>
          {viewingColaborador && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2 pb-2 border-b">
                  <p className="text-xs text-slate-400">Nome Completo</p>
                  <p className="font-medium text-lg">{viewingColaborador.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">CPF</p>
                  <p className="font-mono">{viewingColaborador.cpf}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Cargo</p>
                  <p>{viewingColaborador.cargo || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Salário Base</p>
                  <p className="font-mono">{formatCurrency(viewingColaborador.salario_base || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Data de Admissão</p>
                  <p>{viewingColaborador.data_admissao || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Departamento</p>
                  <p>{viewingColaborador.departamento || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p>{viewingColaborador.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Celular</p>
                  <p>{viewingColaborador.ddd ? `(${viewingColaborador.ddd}) ` : ''}{viewingColaborador.celular || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">PIS</p>
                  <p className="font-mono">{viewingColaborador.pis || '-'}</p>
                </div>
                {viewingColaborador.endereco && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Endereço</p>
                    <p>{viewingColaborador.endereco}{viewingColaborador.numero ? `, ${viewingColaborador.numero}` : ''}{viewingColaborador.bairro ? ` - ${viewingColaborador.bairro}` : ''}{viewingColaborador.cidade ? `, ${viewingColaborador.cidade}` : ''}{viewingColaborador.uf ? `/${viewingColaborador.uf}` : ''}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fechar</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setViewDialogOpen(false); handleEdit(viewingColaborador); }}>
                  <Pencil size={14} className="mr-2" /> Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            data-testid="search-colaboradores"
            placeholder="Buscar por nome, CPF ou cargo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>
        <Select value={filterCliente} onValueChange={setFilterCliente}>
          <SelectTrigger data-testid="filter-cliente" className="w-full sm:w-64">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome_fantasia || c.razao_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredColaboradores.length > 0 ? (
        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-dp">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>CPF</th>
                  <th>Empresa</th>
                  <th>Cargo</th>
                  <th>Salário</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredColaboradores.map((colab) => (
                  <tr key={colab.id} data-testid={`colaborador-row-${colab.id}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="text-slate-500" size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{colab.nome}</p>
                          {colab.email && (
                            <p className="text-xs text-slate-500">{colab.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{colab.cpf}</td>
                    <td className="text-sm">{getClienteName(colab.cliente_id)}</td>
                    <td className="text-sm">{colab.cargo || '-'}</td>
                    <td className="font-mono text-sm">{formatCurrency(colab.salario_base || 0)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" data-testid={`view-colaborador-${colab.id}`} onClick={() => handleView(colab)}>
                          <Eye size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`edit-colaborador-${colab.id}`} onClick={() => handleEdit(colab)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`delete-colaborador-${colab.id}`} onClick={() => handleDelete(colab.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                          <Trash2 size={14} />
                        </Button>
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
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">
              {searchTerm || filterCliente !== 'all' ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador cadastrado'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {clientes.length === 0 ? 'Cadastre uma empresa primeiro' : 'Importe um documento ou cadastre manualmente'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Colaboradores;
