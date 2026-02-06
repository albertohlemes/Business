import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getEmpresaCodigo, getEmpresaNome } from '../utils/empresaUtils';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { 
  FileScan, Upload, Loader2, Download, CheckCircle2, AlertTriangle,
  FileText, Trash2, Building2, User, FileCheck, XCircle, Copy, FileJson,
  MapPin, Phone, Mail, CreditCard, Calendar, Briefcase, Edit2
} from 'lucide-react';
import EmpresaSelectorModal from '../components/EmpresaSelectorModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ConversaoAdmissional = () => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const { empresaSelecionada } = useEmpresa();

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file, id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });
  
  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const processarDocumentos = async () => {
    if (!files.length) { toast.error('Selecione pelo menos um arquivo'); return; }
    if (!empresaSelecionada) { toast.error('Selecione uma empresa'); setSelectorOpen(true); return; }
    setProcessing(true); setResult(null); setEditedData(null);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('arquivos', f.file));
      formData.append('cliente_id', empresaSelecionada.id);
      const response = await axios.post(`${API_URL}/api/conversao/admissional`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      setResult(response.data);
      setEditedData(response.data.json_importacao || {});
      response.data.campos_faltantes?.length > 0 
        ? toast.warning(`Campos faltando: ${response.data.campos_faltantes.length}`) 
        : toast.success('Documentos processados com sucesso!');
    } catch (error) {
      toast.error('Erro: ' + (error.response?.data?.detail || error.message));
    } finally { setProcessing(false); }
  };

  const exportarJSON = () => {
    if (!editedData) return;
    
    // Criar array com um colaborador (ou múltiplos no futuro)
    const jsonExport = [editedData];
    
    const blob = new Blob([JSON.stringify(jsonExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nomeArquivo = `admissao_${editedData.nome?.replace(/\s+/g, '_').substring(0, 20) || 'colaborador'}_${new Date().toISOString().split('T')[0]}.json`;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado com sucesso!');
  };

  const copiarJSON = () => {
    if (!editedData) return;
    navigator.clipboard.writeText(JSON.stringify([editedData], null, 2));
    toast.success('JSON copiado para a área de transferência!');
  };

  const updateField = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const camposObrigatorios = [
    'Nome completo', 'CPF', 'RG', 'Data nascimento', 'Sexo', 'Estado civil',
    'Endereço', 'CEP', 'Cargo', 'Salário', 'Data admissão', 'PIS/PASEP', 
    'CTPS', 'Dados bancários', 'Telefone', 'Email'
  ];

  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div data-testid="conversao-admissional-page" className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversão Admissional</h1>
          <p className="text-slate-500 mt-1">Extraia dados de documentos e exporte para importação no sistema</p>
        </div>
        <Button onClick={() => setSelectorOpen(true)} variant="outline" className="border-slate-700 text-slate-300">
          <Building2 size={16} className="mr-2" />
          {empresaSelecionada ? (
            <><span className="text-red-500 font-mono mr-1">{getEmpresaCodigo(empresaSelecionada.id)}</span>{getEmpresaNome(empresaSelecionada)}</>
          ) : 'Selecionar Empresa'}
        </Button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <strong>Como funciona:</strong> Faça upload de fotos ou PDFs dos documentos admissionais (RG, CPF, comprovante de endereço, ficha de registro, etc). 
          A IA extrai os dados automaticamente e gera um arquivo JSON pronto para importação no seu sistema de folha.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload de Documentos */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload size={20} className="text-red-500" />
                Documentos do Colaborador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-red-500 bg-red-500/10' : 'border-slate-700 hover:border-red-500/50'}`}>
                <input {...getInputProps()} />
                <FileScan className="mx-auto text-red-500 mb-3" size={40} />
                <p className="text-white font-medium">Arraste os documentos aqui</p>
                <p className="text-sm text-slate-500 mt-1">RG, CPF, Comprovante de Endereço, Ficha de Registro, CTPS...</p>
                <p className="text-xs text-slate-600 mt-2">PDF, Imagens (JPG, PNG)</p>
              </div>
              
              {files.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                      <FileText size={18} className="text-slate-400" />
                      <span className="flex-1 text-sm text-white truncate">{f.file.name}</span>
                      <Badge variant="outline" className="text-xs text-slate-400">
                        {(f.file.size / 1024).toFixed(0)} KB
                      </Badge>
                      <button onClick={() => removeFile(f.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={processarDocumentos} 
                disabled={processing || !files.length} 
                className="w-full bg-red-600 hover:bg-red-700 h-12"
              >
                {processing ? (
                  <><Loader2 className="animate-spin mr-2" size={20} />Analisando com IA...</>
                ) : (
                  <><FileCheck size={20} className="mr-2" />Processar Documentos</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Checklist de Campos */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">
              <User size={18} className="inline mr-2 text-purple-500" />
              Campos para Importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {camposObrigatorios.map((campo, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm p-1.5 rounded ${
                  result?.campos_encontrados?.includes(campo) ? 'text-emerald-400 bg-emerald-500/10' : 
                  result?.campos_faltantes?.includes(campo) ? 'text-red-400 bg-red-500/10' : 
                  'text-slate-500'
                }`}>
                  {result?.campos_encontrados?.includes(campo) ? (
                    <CheckCircle2 size={14} />
                  ) : result?.campos_faltantes?.includes(campo) ? (
                    <XCircle size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />
                  )}
                  <span>{campo}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultado da Extração */}
      {result && editedData && (
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                {result.campos_faltantes?.length === 0 ? (
                  <CheckCircle2 className="text-emerald-500" size={24} />
                ) : (
                  <AlertTriangle className="text-amber-500" size={24} />
                )}
                Dados Extraídos: {result.colaborador_nome || 'Colaborador'}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                  className="border-slate-600 text-slate-300"
                >
                  <FileJson size={16} className="mr-1" />
                  {showJsonPreview ? 'Ocultar' : 'Ver'} JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copiarJSON}
                  className="border-slate-600 text-slate-300"
                >
                  <Copy size={16} className="mr-1" />
                  Copiar
                </Button>
                <Button 
                  onClick={exportarJSON}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download size={16} className="mr-2" />
                  Exportar JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Alerta de campos faltantes */}
            {result.campos_faltantes?.length > 0 && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-sm font-medium mb-2">
                  <AlertTriangle size={16} className="inline mr-1" />
                  {result.campos_faltantes.length} campo(s) não encontrado(s):
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.campos_faltantes.map((c, i) => (
                    <Badge key={i} variant="outline" className="border-amber-500/50 text-amber-400">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Observações da IA */}
            {result.observacoes && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Observações:</strong> {result.observacoes}
                </p>
              </div>
            )}

            {/* Dados em Grid Editável */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Dados Pessoais */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <User size={14} className="text-purple-500" />
                  Dados Pessoais
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-500">Nome Completo</Label>
                    <Input 
                      value={editedData.nome || ''} 
                      onChange={(e) => updateField('nome', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">CPF</Label>
                      <Input 
                        value={editedData.cpf || ''} 
                        onChange={(e) => updateField('cpf', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">RG</Label>
                      <Input 
                        value={editedData.rg || ''} 
                        onChange={(e) => updateField('rg', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">Órgão Emissor</Label>
                      <Input 
                        value={editedData.rgOrgaoEmissor || ''} 
                        onChange={(e) => updateField('rgOrgaoEmissor', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">UF RG</Label>
                      <Input 
                        value={editedData.rgUf || ''} 
                        onChange={(e) => updateField('rgUf', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">Data Nascimento</Label>
                      <Input 
                        value={editedData.nascimentoData || ''} 
                        onChange={(e) => updateField('nascimentoData', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                        placeholder="AAAA-MM-DD"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Sexo (M/F)</Label>
                      <Input 
                        value={editedData.sexo || ''} 
                        onChange={(e) => updateField('sexo', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Nome da Mãe</Label>
                    <Input 
                      value={editedData.maeNome || ''} 
                      onChange={(e) => updateField('maeNome', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Nome do Pai</Label>
                    <Input 
                      value={editedData.paiNome || ''} 
                      onChange={(e) => updateField('paiNome', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <MapPin size={14} className="text-blue-500" />
                  Endereço
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-500">CEP</Label>
                    <Input 
                      value={editedData.enderecoCep || ''} 
                      onChange={(e) => updateField('enderecoCep', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Logradouro</Label>
                    <Input 
                      value={editedData.endereco || ''} 
                      onChange={(e) => updateField('endereco', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">Número</Label>
                      <Input 
                        value={editedData.enderecoNumero || ''} 
                        onChange={(e) => updateField('enderecoNumero', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Complemento</Label>
                      <Input 
                        value={editedData.enderecoComplemento || ''} 
                        onChange={(e) => updateField('enderecoComplemento', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Bairro</Label>
                    <Input 
                      value={editedData.enderecoBairro || ''} 
                      onChange={(e) => updateField('enderecoBairro', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Código Cidade IBGE</Label>
                    <Input 
                      value={editedData.enderecoCidadeId || ''} 
                      onChange={(e) => updateField('enderecoCidadeId', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                      placeholder="Ex: 4214805"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">DDD Telefone</Label>
                      <Input 
                        value={editedData.dddTelefone || ''} 
                        onChange={(e) => updateField('dddTelefone', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Telefone</Label>
                      <Input 
                        value={editedData.telefone || ''} 
                        onChange={(e) => updateField('telefone', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">DDD Celular</Label>
                      <Input 
                        value={editedData.dddCelular || ''} 
                        onChange={(e) => updateField('dddCelular', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Celular</Label>
                      <Input 
                        value={editedData.celular || ''} 
                        onChange={(e) => updateField('celular', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Email</Label>
                    <Input 
                      value={editedData.email || ''} 
                      onChange={(e) => updateField('email', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Contrato de Trabalho */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 border-b border-slate-700 pb-2">
                  <Briefcase size={14} className="text-emerald-500" />
                  Contrato de Trabalho
                </h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-500">Data Admissão</Label>
                    <Input 
                      value={editedData.admissaoData || ''} 
                      onChange={(e) => updateField('admissaoData', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                      placeholder="AAAA-MM-DD"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">Salário Inicial</Label>
                      <Input 
                        value={editedData.salarioInicial || ''} 
                        onChange={(e) => updateField('salarioInicial', parseFloat(e.target.value) || null)}
                        className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                        type="number"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Remuneração</Label>
                      <Input 
                        value={editedData.remuneracao || ''} 
                        onChange={(e) => updateField('remuneracao', parseFloat(e.target.value) || null)}
                        className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">PIS/PASEP</Label>
                    <Input 
                      value={editedData.pisNumero || ''} 
                      onChange={(e) => updateField('pisNumero', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-500">CTPS Número</Label>
                      <Input 
                        value={editedData.carteiraTrabalho || ''} 
                        onChange={(e) => updateField('carteiraTrabalho', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">CTPS Série</Label>
                      <Input 
                        value={editedData.carteiraTrabalhoSerie || ''} 
                        onChange={(e) => updateField('carteiraTrabalhoSerie', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">CTPS UF</Label>
                    <Input 
                      value={editedData.carteiraTrabalhoUf || ''} 
                      onChange={(e) => updateField('carteiraTrabalhoUf', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white h-9"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-3">
                <CreditCard size={14} className="text-amber-500" />
                Dados Bancários
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Banco (ID)</Label>
                  <Input 
                    value={editedData.bancoId || ''} 
                    onChange={(e) => updateField('bancoId', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                    placeholder="Ex: 001"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Agência</Label>
                  <Input 
                    value={editedData.bancoContaAgencia || ''} 
                    onChange={(e) => updateField('bancoContaAgencia', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Conta</Label>
                  <Input 
                    value={editedData.bancoConta || ''} 
                    onChange={(e) => updateField('bancoConta', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Dígito</Label>
                  <Input 
                    value={editedData.bancoContaDigito || ''} 
                    onChange={(e) => updateField('bancoContaDigito', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-9 font-mono"
                    maxLength={1}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Tipo (1=CC, 2=CP)</Label>
                  <Input 
                    value={editedData.bancoContaTipoId || ''} 
                    onChange={(e) => updateField('bancoContaTipoId', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-9"
                  />
                </div>
              </div>
            </div>

            {/* Preview do JSON */}
            {showJsonPreview && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-3">
                  <FileJson size={14} className="text-cyan-500" />
                  Preview do JSON para Importação
                </h4>
                <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify([editedData], null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <EmpresaSelectorModal open={selectorOpen} onOpenChange={setSelectorOpen} />
    </div>
  );
};

export default ConversaoAdmissional;
