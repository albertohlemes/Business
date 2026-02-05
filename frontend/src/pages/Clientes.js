import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Building2, Users, Pencil, Trash2, Search, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    nome_fantasia: '',
    endereco: '',
    telefone: '',
    email: '',
    sindicato: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await axios.put(`${API_URL}/api/clientes/${editingCliente.id}`, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/clientes`, formData);
        toast.success('Cliente cadastrado com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar cliente');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      razao_social: cliente.razao_social,
      cnpj: cliente.cnpj,
      nome_fantasia: cliente.nome_fantasia || '',
      endereco: cliente.endereco || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      sindicato: cliente.sindicato || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await axios.delete(`${API_URL}/api/clientes/${id}`);
      toast.success('Cliente excluído com sucesso!');
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao excluir cliente');
    }
  };

  const resetForm = () => {
    setEditingCliente(null);
    setFormData({
      razao_social: '',
      cnpj: '',
      nome_fantasia: '',
      endereco: '',
      telefone: '',
      email: '',
      sindicato: ''
    });
  };

  const filteredClientes = clientes.filter(c =>
    c.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj.includes(searchTerm) ||
    (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="clientes-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie as empresas cadastradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-cliente-btn" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus size={18} className="mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input
                    id="razao_social"
                    data-testid="input-razao-social"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    data-testid="input-cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input
                    id="nome_fantasia"
                    data-testid="input-nome-fantasia"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
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
                  <Label htmlFor="sindicato">Sindicato</Label>
                  <Input
                    id="sindicato"
                    data-testid="input-sindicato"
                    value={formData.sindicato}
                    onChange={(e) => setFormData({ ...formData, sindicato: e.target.value })}
                    placeholder="Ex: SINDCOMÉRCIO"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="save-cliente-btn" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingCliente ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input
          data-testid="search-clientes"
          placeholder="Buscar por nome ou CNPJ..."
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

      {/* Clients Grid */}
      {filteredClientes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClientes.map((cliente) => (
            <Card key={cliente.id} data-testid={`cliente-card-${cliente.id}`} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Building2 className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
                        {cliente.nome_fantasia || cliente.razao_social}
                      </CardTitle>
                      <p className="text-xs text-slate-500 font-mono">{cliente.cnpj}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-slate-600">
                  {cliente.razao_social !== cliente.nome_fantasia && cliente.nome_fantasia && (
                    <p className="text-xs text-slate-400">{cliente.razao_social}</p>
                  )}
                  {cliente.sindicato && (
                    <p><span className="text-slate-400">Sindicato:</span> {cliente.sindicato}</p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Users size={14} className="text-slate-400" />
                    <span className="font-mono">{cliente.total_colaboradores}</span>
                    <span className="text-slate-400">colaboradores</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`edit-cliente-${cliente.id}`}
                    onClick={() => handleEdit(cliente)}
                    className="flex-1"
                  >
                    <Pencil size={14} className="mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`delete-cliente-${cliente.id}`}
                    onClick={() => handleDelete(cliente.id)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {searchTerm ? 'Tente outro termo de busca' : 'Clique em "Novo Cliente" para começar'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Clientes;
