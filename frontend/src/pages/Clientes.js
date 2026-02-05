import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Building2, Users, Pencil, Trash2, Search, X, RefreshCw, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [buscandoReceita, setBuscandoReceita] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    nome_fantasia: '',
    endereco: '',
    telefone: '',
    email: '',
    sindicato: '',
    codigo_interno: ''
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

  const buscarReceita = async () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    setBuscandoReceita(true);
    try {
      const response = await axios.get(`${API_URL}/api/receita/${cnpjLimpo}`);
      const dados = response.data;
      
      setFormData(prev => ({
        ...prev,
        razao_social: dados.razao_social || prev.razao_social,
        nome_fantasia: dados.nome_fantasia || prev.nome_fantasia,
        endereco: dados.endereco || prev.endereco,
        telefone: dados.telefone || prev.telefone,
        email: dados.email || prev.email,
        cnpj: dados.cnpj || prev.cnpj
      }));
      
      toast.success('Dados carregados da Receita Federal!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao buscar CNPJ na Receita Federal');
    } finally {
      setBuscandoReceita(false);
    }
  };

  const formatCNPJ = (value) => {
    const cnpj = value.replace(/\D/g, '').slice(0, 14);
    if (cnpj.length <= 2) return cnpj;
    if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
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
      sindicato: cliente.sindicato || '',
      codigo_interno: cliente.codigo_interno || ''
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
      sindicato: '',
      codigo_interno: ''
    });
  };

  const generateCode = (id) => {
    return `#${id.slice(0, 4).toUpperCase()}`;
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
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 mt-1">Gerencie as empresas cadastradas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-cliente-btn" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus size={18} className="mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingCliente ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Código Interno */}
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="p-4">
                  <Label htmlFor="codigo_interno" className="text-slate-600">Código/ID da Empresa (opcional)</Label>
                  <Input
                    id="codigo_interno"
                    data-testid="input-codigo"
                    placeholder="Ex: 001, CLI-2024, etc."
                    value={formData.codigo_interno}
                    onChange={(e) => setFormData({ ...formData, codigo_interno: e.target.value })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-400 mt-1">Use para identificar a empresa no sistema (aparece ao lado do nome)</p>
                </CardContent>
              </Card>

              {/* Busca Receita Federal */}
              <Card className="border-indigo-200 bg-indigo-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-3">
                    <RefreshCw size={18} />
                    Busca Automática na Receita Federal
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        data-testid="input-cnpj"
                        placeholder="00.000.000/0000-00"
                        value={formatCNPJ(formData.cnpj)}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, '') })}
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        data-testid="buscar-receita-btn"
                        onClick={buscarReceita}
                        disabled={buscandoReceita || formData.cnpj.replace(/\D/g, '').length !== 14}
                        className="bg-indigo-600 hover:bg-indigo-700 h-10"
                      >
                        {buscandoReceita ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <>
                            <RefreshCw size={16} className="mr-2" />
                            Buscar Receita
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-600 mt-2">
                    Digite o CNPJ e clique no botão para preencher automaticamente os dados
                  </p>
                </CardContent>
              </Card>

              {/* Dados da Empresa */}
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
                <div className="sm:col-span-2">
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
                    placeholder="Ex: SINDCOMÉRCIO, SINDILOJAS..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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

      {/* Clients Grid - Visual similar to FiscalFlow */}
      {filteredClientes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClientes.map((cliente) => (
            <Card key={cliente.id} data-testid={`cliente-card-${cliente.id}`} className="border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-0">
                {/* Card Header with actions */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Building2 className="text-indigo-600" size={20} />
                    </div>
                    <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded">
                      {cliente.codigo_interno || generateCode(cliente.id)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`edit-cliente-${cliente.id}`}
                      onClick={() => handleEdit(cliente)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`delete-cliente-${cliente.id}`}
                      onClick={() => handleDelete(cliente.id)}
                      className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">
                    {cliente.nome_fantasia || cliente.razao_social}
                  </h3>
                  {cliente.nome_fantasia && (
                    <p className="text-sm text-slate-500 mb-2">{cliente.razao_social}</p>
                  )}
                  <p className="text-sm font-mono text-slate-600 mb-3">
                    CNPJ: {formatCNPJ(cliente.cnpj)}
                  </p>
                  
                  {cliente.sindicato && (
                    <div className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded mb-3">
                      {cliente.sindicato}
                    </div>
                  )}

                  {cliente.endereco && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                      {cliente.endereco}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-sm">
                      <span className="font-mono font-bold">{cliente.total_colaboradores}</span>
                      <span className="text-slate-400 ml-1">colaboradores</span>
                    </span>
                  </div>
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
              {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {searchTerm ? 'Tente outro termo de busca' : 'Clique em "Nova Empresa" para começar'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Clientes;
