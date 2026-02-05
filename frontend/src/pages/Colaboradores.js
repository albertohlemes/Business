import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Users, Pencil, Trash2, Search, X, Briefcase, Phone, Mail } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Colaboradores = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCliente, setFilterCliente] = useState('all');
  const [formData, setFormData] = useState({
    cliente_id: '',
    nome: '',
    cpf: '',
    data_nascimento: '',
    cargo: '',
    salario_base: '',
    data_admissao: '',
    departamento: '',
    pis: '',
    ctps: '',
    rg: '',
    endereco: '',
    telefone: '',
    email: '',
    banco: '',
    agencia: '',
    conta: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterCliente]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salario_base: parseFloat(formData.salario_base) || 0
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
      toast.error(error.response?.data?.detail || 'Erro ao salvar colaborador');
    }
  };

  const handleEdit = (colaborador) => {
    setEditingColaborador(colaborador);
    setFormData({
      cliente_id: colaborador.cliente_id,
      nome: colaborador.nome,
      cpf: colaborador.cpf,
      data_nascimento: colaborador.data_nascimento || '',
      cargo: colaborador.cargo || '',
      salario_base: colaborador.salario_base?.toString() || '',
      data_admissao: colaborador.data_admissao || '',
      departamento: colaborador.departamento || '',
      pis: colaborador.pis || '',
      ctps: colaborador.ctps || '',
      rg: colaborador.rg || '',
      endereco: colaborador.endereco || '',
      telefone: colaborador.telefone || '',
      email: colaborador.email || '',
      banco: colaborador.banco || '',
      agencia: colaborador.agencia || '',
      conta: colaborador.conta || ''
    });
    setDialogOpen(true);
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
    setFormData({
      cliente_id: '',
      nome: '',
      cpf: '',
      data_nascimento: '',
      cargo: '',
      salario_base: '',
      data_admissao: '',
      departamento: '',
      pis: '',
      ctps: '',
      rg: '',
      endereco: '',
      telefone: '',
      email: '',
      banco: '',
      agencia: '',
      conta: ''
    });
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
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-colaborador-btn" className="bg-indigo-600 hover:bg-indigo-700" disabled={clientes.length === 0}>
              <Plus size={18} className="mr-2" />
              Novo Colaborador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="cliente_id">Empresa *</Label>
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
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    data-testid="input-nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    data-testid="input-cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    data-testid="input-rg"
                    value={formData.rg}
                    onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    data-testid="input-data-nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="data_admissao">Data de Admissão</Label>
                  <Input
                    id="data_admissao"
                    data-testid="input-data-admissao"
                    type="date"
                    value={formData.data_admissao}
                    onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    data-testid="input-cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    data-testid="input-departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="salario_base">Salário Base (R$)</Label>
                  <Input
                    id="salario_base"
                    data-testid="input-salario"
                    type="number"
                    step="0.01"
                    value={formData.salario_base}
                    onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pis">PIS/PASEP</Label>
                  <Input
                    id="pis"
                    data-testid="input-pis"
                    value={formData.pis}
                    onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ctps">CTPS</Label>
                  <Input
                    id="ctps"
                    data-testid="input-ctps"
                    value={formData.ctps}
                    onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    data-testid="input-telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    data-testid="input-endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    data-testid="input-banco"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    data-testid="input-agencia"
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    data-testid="input-conta"
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="save-colaborador-btn" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingColaborador ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setSearchTerm('')}
            >
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
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-colaborador-${colab.id}`}
                          onClick={() => handleEdit(colab)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-colaborador-${colab.id}`}
                          onClick={() => handleDelete(colab.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
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
              {clientes.length === 0 ? 'Cadastre um cliente primeiro' : 'Clique em "Novo Colaborador" para começar'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Colaboradores;
