import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Building2, Users, Pencil, Trash2, Search, X, RefreshCw, Loader2, MapPin, FileText, Briefcase, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Scale } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ConvencoesColetivas from '../components/ConvencoesColetivas';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [buscandoReceita, setBuscandoReceita] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    nome_fantasia: '',
    endereco: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    email: '',
    sindicato: '',
    codigo_interno: '',
    cnae_principal: '',
    cnae_descricao: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    regime_tributario: '',
    tipo_atividade: '',
    data_abertura: '',
    natureza_juridica: '',
    porte: '',
    situacao: '',
    responsavel_dp: '',
    contador_responsavel: '',
    observacoes: '',
    data_base_dissidio: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clientes`);
      setClientes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar empresas');
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
        cidade: dados.cidade || prev.cidade,
        uf: dados.uf || prev.uf,
        cep: dados.cep || prev.cep,
        telefone: dados.telefone || prev.telefone,
        email: dados.email || prev.email,
        cnpj: dados.cnpj || prev.cnpj,
        cnae_principal: dados.cnae_principal || prev.cnae_principal,
        cnae_descricao: dados.cnae_descricao || prev.cnae_descricao,
        data_abertura: dados.data_abertura || prev.data_abertura,
        natureza_juridica: dados.natureza_juridica || prev.natureza_juridica,
        porte: dados.porte || prev.porte,
        situacao: dados.situacao || prev.situacao
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
        toast.success('Empresa atualizada com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/clientes`, formData);
        toast.success('Empresa cadastrada com sucesso!');
      }
      setDialogOpen(false);
      resetForm();
      fetchClientes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar empresa');
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      razao_social: cliente.razao_social || '',
      cnpj: cliente.cnpj || '',
      nome_fantasia: cliente.nome_fantasia || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      uf: cliente.uf || '',
      cep: cliente.cep || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      sindicato: cliente.sindicato || '',
      codigo_interno: cliente.codigo_interno || '',
      cnae_principal: cliente.cnae_principal || '',
      cnae_descricao: cliente.cnae_descricao || '',
      inscricao_estadual: cliente.inscricao_estadual || '',
      inscricao_municipal: cliente.inscricao_municipal || '',
      regime_tributario: cliente.regime_tributario || '',
      tipo_atividade: cliente.tipo_atividade || '',
      data_abertura: cliente.data_abertura || '',
      natureza_juridica: cliente.natureza_juridica || '',
      porte: cliente.porte || '',
      situacao: cliente.situacao || '',
      responsavel_dp: cliente.responsavel_dp || '',
      contador_responsavel: cliente.contador_responsavel || '',
      observacoes: cliente.observacoes || '',
      data_base_dissidio: cliente.data_base_dissidio || ''
    });
    setDialogOpen(true);
  };

  const handleConvencaoUpdate = async (dados) => {
    if (editingCliente) {
      // Atualizar o estado local imediatamente
      const updatedCliente = { 
        ...editingCliente, 
        convencao_coletiva: dados.convencao_coletiva,
        historico_convencoes: dados.historico_convencoes || editingCliente.historico_convencoes
      };
      setEditingCliente(updatedCliente);
      
      // Atualizar também na lista de clientes para quando reabrir
      setClientes(prevClientes => 
        prevClientes.map(c => 
          c.id === editingCliente.id 
            ? { 
                ...c, 
                convencao_coletiva: dados.convencao_coletiva,
                historico_convencoes: dados.historico_convencoes || c.historico_convencoes
              }
            : c
        )
      );
      
      // Recarregar a lista de clientes em background para sincronizar com o banco
      try {
        await fetchClientes();
      } catch (error) {
        console.error('Erro ao recarregar clientes:', error);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
      await axios.delete(`${API_URL}/api/clientes/${id}`);
      toast.success('Empresa excluída com sucesso!');
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao excluir empresa');
    }
  };

  // Importação em lote
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setImporting(true);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append('arquivo', file);
      
      const response = await axios.post(`${API_URL}/api/clientes/importar-lote`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportResult(response.data);
      
      if (response.data.importadas > 0) {
        toast.success(`${response.data.importadas} empresa(s) importada(s) com sucesso!`);
        fetchClientes();
      }
      
      if (response.data.erros > 0) {
        toast.warning(`${response.data.erros} empresa(s) com erro na importação`);
      }
      
    } catch (error) {
      toast.error('Erro ao importar arquivo: ' + (error.response?.data?.detail || error.message));
    } finally {
      setImporting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const downloadModelo = () => {
    const csvContent = "CNPJ;Razão Social;Nome Fantasia;Endereço;Telefone;Email;Tipo Atividade;Data Base Dissídio;Sindicato\n" +
      "12.345.678/0001-90;Empresa Exemplo LTDA;Empresa Exemplo;Rua das Flores, 123;(11) 99999-9999;contato@exemplo.com;Comércio;05/2026;Sindicato do Comércio";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_importacao_empresas.csv';
    link.click();
  };

  const resetForm = () => {
    setEditingCliente(null);
    setFormData({
      razao_social: '',
      cnpj: '',
      nome_fantasia: '',
      endereco: '',
      cidade: '',
      uf: '',
      cep: '',
      telefone: '',
      email: '',
      sindicato: '',
      codigo_interno: '',
      cnae_principal: '',
      cnae_descricao: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      regime_tributario: '',
      tipo_atividade: '',
      data_abertura: '',
      natureza_juridica: '',
      porte: '',
      situacao: '',
      responsavel_dp: '',
      contador_responsavel: '',
      observacoes: '',
      data_base_dissidio: ''
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
          <h1 className="text-2xl font-bold text-white">Empresas</h1>
          <p className="text-slate-500 mt-1">Gerencie as empresas cadastradas no sistema</p>
        </div>
        <div className="flex gap-3">
          {/* Botão Importar em Lote */}
          <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) setImportResult(null); }}>
            <DialogTrigger asChild>
              <Button data-testid="import-clientes-btn" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Upload size={18} className="mr-2" />
                Importar em Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <FileSpreadsheet size={24} className="text-red-500" />
                  Importar Empresas em Lote
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {!importResult ? (
                  <>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        isDragActive 
                          ? 'border-red-500 bg-red-500/10' 
                          : 'border-slate-700 hover:border-red-500/50 hover:bg-slate-800/50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      {importing ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin text-red-500" size={40} />
                          <p className="text-slate-400">Processando arquivo...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <Upload className="text-red-500" size={32} />
                          </div>
                          <div>
                            <p className="text-white font-medium">Arraste o arquivo aqui</p>
                            <p className="text-sm text-slate-500 mt-1">ou clique para selecionar</p>
                          </div>
                          <p className="text-xs text-slate-600">Formatos: CSV, XLS, XLSX</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <p className="text-sm text-slate-400 mb-3">
                        O arquivo deve conter as colunas: <span className="text-white">CNPJ, Razão Social</span> (obrigatórias), 
                        Nome Fantasia, Endereço, Telefone, Email, Tipo Atividade, Data Base Dissídio, Sindicato.
                      </p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadModelo}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Download size={16} className="mr-2" />
                        Baixar modelo CSV
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {/* Resultado da importação */}
                    <div className={`rounded-xl p-6 border ${
                      importResult.erros === 0 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}>
                      <div className="flex items-center gap-4">
                        {importResult.erros === 0 ? (
                          <CheckCircle2 className="text-emerald-500" size={40} />
                        ) : (
                          <AlertCircle className="text-amber-500" size={40} />
                        )}
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {importResult.importadas} empresa(s) importada(s)
                          </p>
                          <p className="text-sm text-slate-400">
                            de {importResult.total_processadas} linha(s) processadas
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {importResult.erros > 0 && (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 max-h-48 overflow-y-auto">
                        <p className="text-sm font-medium text-amber-500 mb-2">
                          {importResult.erros} erro(s) encontrado(s):
                        </p>
                        <div className="space-y-2">
                          {importResult.empresas_erros?.map((erro, idx) => (
                            <div key={idx} className="text-xs text-slate-400">
                              <span className="text-slate-500">Linha {erro.linha}:</span> {erro.erro}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => { setImportResult(null); }}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Importar outro arquivo
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Botão Nova Empresa */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-cliente-btn" className="bg-red-600 hover:bg-red-700">
                <Plus size={18} className="mr-2" />
                Nova Empresa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Building2 size={24} className="text-red-500" />
                {editingCliente ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              
              {/* Busca Receita Federal */}
              <Card className="border-red-500/30 bg-gradient-to-r from-indigo-50 to-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-600 font-semibold mb-3">
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
                        className="text-lg font-mono"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        data-testid="buscar-receita-btn"
                        onClick={buscarReceita}
                        disabled={buscandoReceita || formData.cnpj.replace(/\D/g, '').length !== 14}
                        className="bg-red-600 hover:bg-red-700 h-10"
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
                  <p className="text-xs text-red-500 mt-2">
                    Digite o CNPJ completo e clique no botão para preencher automaticamente
                  </p>
                </CardContent>
              </Card>

              {/* Dados Básicos */}
              <Card className="border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 size={18} className="text-slate-500" />
                    Dados da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <Label htmlFor="codigo_interno">Código Interno</Label>
                      <Input
                        id="codigo_interno"
                        data-testid="input-codigo"
                        placeholder="Ex: 001"
                        value={formData.codigo_interno}
                        onChange={(e) => setFormData({ ...formData, codigo_interno: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor="razao_social">Razão Social *</Label>
                      <Input
                        id="razao_social"
                        data-testid="input-razao-social"
                        value={formData.razao_social}
                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                      <Input
                        id="nome_fantasia"
                        data-testid="input-nome-fantasia"
                        value={formData.nome_fantasia}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sindicato">Sindicato da Categoria</Label>
                      <Input
                        id="sindicato"
                        data-testid="input-sindicato"
                        value={formData.sindicato}
                        onChange={(e) => setFormData({ ...formData, sindicato: e.target.value })}
                        placeholder="Ex: SINDCOMÉRCIO, SINDILOJAS..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CNAE e Atividade */}
              <Card className="border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Briefcase size={18} className="text-slate-500" />
                    Atividade Econômica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cnae_principal">CNAE Principal</Label>
                      <Input
                        id="cnae_principal"
                        data-testid="input-cnae"
                        value={formData.cnae_principal}
                        onChange={(e) => setFormData({ ...formData, cnae_principal: e.target.value })}
                        placeholder="0000-0/00"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="cnae_descricao">Descrição CNAE</Label>
                      <Input
                        id="cnae_descricao"
                        data-testid="input-cnae-desc"
                        value={formData.cnae_descricao}
                        onChange={(e) => setFormData({ ...formData, cnae_descricao: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="regime_tributario">Regime Tributário</Label>
                      <Select value={formData.regime_tributario} onValueChange={(value) => setFormData({ ...formData, regime_tributario: value })}>
                        <SelectTrigger data-testid="select-regime">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simples">Simples Nacional</SelectItem>
                          <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                          <SelectItem value="lucro_real">Lucro Real</SelectItem>
                          <SelectItem value="mei">MEI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tipo_atividade">Tipo de Atividade</Label>
                      <Select value={formData.tipo_atividade} onValueChange={(value) => setFormData({ ...formData, tipo_atividade: value })}>
                        <SelectTrigger data-testid="select-tipo">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comercio">Comércio</SelectItem>
                          <SelectItem value="servicos">Serviços</SelectItem>
                          <SelectItem value="industria">Indústria</SelectItem>
                          <SelectItem value="misto">Misto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="porte">Porte da Empresa</Label>
                      <Input
                        id="porte"
                        data-testid="input-porte"
                        value={formData.porte}
                        onChange={(e) => setFormData({ ...formData, porte: e.target.value })}
                        placeholder="Ex: ME, EPP, DEMAIS"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                      <Input
                        id="inscricao_estadual"
                        data-testid="input-ie"
                        value={formData.inscricao_estadual}
                        onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                        placeholder="ISENTO ou número"
                      />
                    </div>
                    <div>
                      <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                      <Input
                        id="inscricao_municipal"
                        data-testid="input-im"
                        value={formData.inscricao_municipal}
                        onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="data_abertura">Data de Abertura</Label>
                      <Input
                        id="data_abertura"
                        data-testid="input-abertura"
                        value={formData.data_abertura}
                        onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço e Contato */}
              <Card className="border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin size={18} className="text-slate-500" />
                    Endereço e Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        data-testid="input-endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        data-testid="input-cep"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        data-testid="input-cidade"
                        value={formData.cidade}
                        onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="uf">UF</Label>
                      <Input
                        id="uf"
                        data-testid="input-uf"
                        value={formData.uf}
                        onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase().slice(0, 2) })}
                        maxLength={2}
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
                </CardContent>
              </Card>

              {/* Responsáveis e Observações */}
              <Card className="border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText size={18} className="text-slate-500" />
                    Responsáveis e Observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="responsavel_dp">Responsável DP</Label>
                      <Input
                        id="responsavel_dp"
                        data-testid="input-responsavel-dp"
                        value={formData.responsavel_dp}
                        onChange={(e) => setFormData({ ...formData, responsavel_dp: e.target.value })}
                        placeholder="Nome do responsável interno"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contador_responsavel">Contador Responsável</Label>
                      <Input
                        id="contador_responsavel"
                        data-testid="input-contador"
                        value={formData.contador_responsavel}
                        onChange={(e) => setFormData({ ...formData, contador_responsavel: e.target.value })}
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
                      placeholder="Anotações importantes sobre a empresa..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Convenção Coletiva - Apenas ao editar */}
              {editingCliente && (
                <ConvencaoColetiva 
                  clienteId={editingCliente.id}
                  convencao={editingCliente.convencao_coletiva}
                  onUpdate={handleConvencaoUpdate}
                />
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="save-cliente-btn" className="bg-red-600 hover:bg-red-700">
                  {editingCliente ? 'Atualizar Empresa' : 'Cadastrar Empresa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
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
            <Card key={cliente.id} data-testid={`cliente-card-${cliente.id}`} className="border-slate-700 hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-0">
                {/* Card Header */}
                <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Building2 className="text-red-500" size={20} />
                    </div>
                    <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
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
                  <h3 className="font-bold text-white text-lg leading-tight mb-1">
                    <span className="text-red-500 font-mono mr-2">#{cliente.id?.slice(0, 4).toUpperCase()}</span>
                    {cliente.nome_fantasia || cliente.razao_social}
                  </h3>
                  {cliente.nome_fantasia && (
                    <p className="text-sm text-slate-500 mb-2">{cliente.razao_social}</p>
                  )}
                  <p className="text-sm font-mono text-slate-600 mb-3">
                    CNPJ: {formatCNPJ(cliente.cnpj)}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {cliente.regime_tributario && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {cliente.regime_tributario === 'simples' ? 'Simples' : 
                         cliente.regime_tributario === 'lucro_presumido' ? 'L. Presumido' :
                         cliente.regime_tributario === 'lucro_real' ? 'L. Real' : cliente.regime_tributario}
                      </span>
                    )}
                    {cliente.sindicato && (
                      <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                        {cliente.sindicato}
                      </span>
                    )}
                    {cliente.convencao_coletiva && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                        cliente.convencao_coletiva?.vigencia?.status === 'vencida'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : cliente.convencao_coletiva?.vigencia?.status === 'a_vencer'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        <Scale size={10} />
                        CCT {cliente.convencao_coletiva?.vigencia?.status === 'vencida' ? 'Vencida' : cliente.convencao_coletiva?.vigencia?.status === 'a_vencer' ? 'A Vencer' : 'OK'}
                      </span>
                    )}
                  </div>

                  {cliente.cidade && cliente.uf && (
                    <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                      <MapPin size={12} />
                      {cliente.cidade}/{cliente.uf}
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
        <Card className="border-slate-700">
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
