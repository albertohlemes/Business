import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

import { 
  ClipboardCheck, Upload, Loader2, FileUp, AlertTriangle, CheckCircle2, 
  XCircle, FileText, Calendar, Building2, X, Eye, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, History, Search, Filter, Trash2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEmpresa } from '../contexts/EmpresaContext';
import { getErrorMessage } from '../utils/errorHandler';
import { generateEmpresaCode, getEmpresaLabel, sortClientesBySelection } from '../utils/empresaHelpers';

const ValidacaoFolha = () => {
  const [validacoes, setValidacoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [mesReferencia, setMesReferencia] = useState('');
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear().toString());
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedValidacao, setSelectedValidacao] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Files state
  const [holeriteAtual, setHoleriteAtual] = useState(null);
  const [holeriteAnterior, setHoleriteAnterior] = useState(null);
  const [apoioFiles, setApoioFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  
  // Selection state for batch delete
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  
  // Filters
  const [filterCliente, setFilterCliente] = useState('all');
  const [filterCompetencia, setFilterCompetencia] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  
  const { empresaSelecionada, competenciaSelecionada } = useEmpresa();

  useEffect(() => {
    fetchData();
  }, [filterCliente]);

  useEffect(() => {
    if (empresaSelecionada) {
      setSelectedCliente(empresaSelecionada.id);
      setFilterCliente(empresaSelecionada.id);
    }
    if (competenciaSelecionada) {
      const [mes, ano] = competenciaSelecionada.split('/');
      setMesReferencia(mes);
      setAnoReferencia(ano);
    }
  }, [empresaSelecionada, competenciaSelecionada]);

  const fetchData = async () => {
    try {
      const params = filterCliente !== 'all' ? `?cliente_id=${filterCliente}` : '';
      const [validacoesRes, clientesRes] = await Promise.all([
        axios.get(`${API_URL}/api/validacoes${params}`),
        axios.get(`${API_URL}/api/clientes`)
      ]);
      setValidacoes(validacoesRes.data);
      setClientes(clientesRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchValidacaoDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const response = await axios.get(`${API_URL}/api/validacoes/${id}`);
      setSelectedValidacao(response.data);
      setDetailDialogOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoadingDetail(false);
    }
  };

  const deleteValidacao = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta validação?')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/api/validacoes/${id}`);
      toast.success('Validação excluída');
      setValidacoes(prev => prev.filter(v => v.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (error) {
      toast.error('Erro ao excluir validação');
    }
  };

  const toggleSelect = (id, e) => {
    e?.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllInCompetencia = (competencia, validacoesComp) => {
    const ids = validacoesComp.map(v => v.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const deleteSelectedBatch = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.length} validação(ões)?`)) return;
    
    setDeleting(true);
    try {
      await axios.post(`${API_URL}/api/validacoes/delete-batch`, selectedIds);
      toast.success(`${selectedIds.length} validação(ões) excluída(s)`);
      setValidacoes(prev => prev.filter(v => !selectedIds.includes(v.id)));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Erro ao excluir validações');
    } finally {
      setDeleting(false);
    }
  };

  // Dropzones
  const onDropHoleriteAtual = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setHoleriteAtual(acceptedFiles[0]);
      toast.success('Holerite atual carregado');
    }
  }, []);

  const onDropHoleriteAnterior = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setHoleriteAnterior(acceptedFiles[0]);
      toast.success('Holerite mês anterior carregado');
    }
  }, []);

  const onDropApoio = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setApoioFiles(prev => [...prev, ...acceptedFiles]);
      toast.success(`${acceptedFiles.length} arquivo(s) de apoio carregado(s)`);
    }
  }, []);

  const fileAcceptConfig = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  };

  const apoioAcceptConfig = {
    ...fileAcceptConfig,
    'text/plain': ['.txt'],
    'message/rfc822': ['.eml']
  };

  const { getRootProps: getRootPropsAtual, getInputProps: getInputPropsAtual, isDragActive: isDragActiveAtual } = useDropzone({
    onDrop: onDropHoleriteAtual,
    accept: fileAcceptConfig,
    maxFiles: 1
  });

  const { getRootProps: getRootPropsAnterior, getInputProps: getInputPropsAnterior, isDragActive: isDragActiveAnterior } = useDropzone({
    onDrop: onDropHoleriteAnterior,
    accept: fileAcceptConfig,
    maxFiles: 1
  });

  const { getRootProps: getRootPropsApoio, getInputProps: getInputPropsApoio, isDragActive: isDragActiveApoio } = useDropzone({
    onDrop: onDropApoio,
    accept: apoioAcceptConfig,
    multiple: true
  });

  const removeApoioFile = (index) => {
    setApoioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleValidar = async () => {
    if (!selectedCliente) {
      toast.error('Selecione uma empresa');
      return;
    }
    if (!holeriteAtual) {
      toast.error('Carregue o holerite do mês atual');
      return;
    }
    if (!mesReferencia || !anoReferencia) {
      toast.error('Informe a competência');
      return;
    }

    const formData = new FormData();
    formData.append('holerite_atual', holeriteAtual);
    formData.append('cliente_id', selectedCliente);
    formData.append('mes_referencia', mesReferencia);
    formData.append('ano_referencia', parseInt(anoReferencia));
    
    if (holeriteAnterior) {
      formData.append('holerite_anterior', holeriteAnterior);
    }
    
    apoioFiles.forEach(file => {
      formData.append('apoio_files', file);
    });

    setUploading(true);
    setUploadProgress(5);
    setProcessingStep('Enviando arquivos...');
    
    try {
      // Passo 1: Enviar arquivos e iniciar job
      const response = await axios.post(`${API_URL}/api/validacoes/validar-completa`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 1 minuto para upload
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 20) / progressEvent.total);
          setUploadProgress(progress);
        }
      });
      
      const { job_id } = response.data;
      setCurrentJobId(job_id);
      setUploadProgress(25);
      setProcessingStep('Processando validação...');
      
      // Passo 2: Iniciar polling
      const pollStatus = async () => {
        try {
          const statusRes = await axios.get(`${API_URL}/api/validacoes/job-status/${job_id}`);
          const { status, progress, step, result, error } = statusRes.data;
          
          setUploadProgress(25 + Math.floor(progress * 0.75)); // 25-100%
          setProcessingStep(step);
          
          if (status === 'completed' && result) {
            // Validação concluída!
            clearInterval(pollingInterval);
            setPollingInterval(null);
            setUploading(false);
            setUploadProgress(100);
            setCurrentJobId(null);
            setAnalysisResult(result);
            setDialogOpen(false);
            setResultDialogOpen(true);
            toast.success(`Validação concluída! ${result.funcionarios_analisados || 0} colaborador(es) analisado(s)`);
            fetchData();
          } else if (status === 'failed') {
            // Falha na validação
            clearInterval(pollingInterval);
            setPollingInterval(null);
            setUploading(false);
            setCurrentJobId(null);
            toast.error(error || 'Erro ao validar folha');
          }
          // Se ainda está "processing", o polling continua
        } catch (pollError) {
          console.error('Erro no polling:', pollError);
          // Não parar o polling por erros temporários
        }
      };
      
      // Iniciar intervalo de polling a cada 2 segundos
      const interval = setInterval(pollStatus, 2000);
      setPollingInterval(interval);
      
      // Fazer primeira verificação imediatamente
      pollStatus();
      
    } catch (error) {
      setUploading(false);
      setCurrentJobId(null);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      toast.error(getErrorMessage(error, 'Erro ao iniciar validação'));
    }
  };

  // Limpar polling quando componente desmonta
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const resetDialog = () => {
    setSelectedCliente(empresaSelecionada?.id || '');
    if (competenciaSelecionada) {
      const [mes, ano] = competenciaSelecionada.split('/');
      setMesReferencia(mes);
      setAnoReferencia(ano);
    } else {
      setMesReferencia('');
      setAnoReferencia(new Date().getFullYear().toString());
    }
    setHoleriteAtual(null);
    setHoleriteAnterior(null);
    setApoioFiles([]);
    setAnalysisResult(null);
  };

  const getClienteName = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'alta':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'media':
        return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Média</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
    }
  };

  const getTipoValidacaoLabel = (tipo) => {
    switch (tipo) {
      case 'completa':
        return <Badge className="bg-indigo-600">Completa</Badge>;
      case 'comparacao_mensal':
        return <Badge className="bg-blue-600">Comparação Mensal</Badge>;
      case 'comparacao_apoio':
        return <Badge className="bg-emerald-600">Com Apoio</Badge>;
      case 'analise_isolada':
        return <Badge variant="outline">Análise Isolada</Badge>;
      default:
        return <Badge variant="secondary">{tipo || 'Análise'}</Badge>;
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredValidacoes = validacoes.filter(v => {
    if (filterCompetencia) {
      const comp = `${v.mes_referencia}/${v.ano_referencia}`;
      if (!comp.includes(filterCompetencia)) return false;
    }
    return true;
  });

  // Group validacoes by competencia
  const groupedValidacoes = filteredValidacoes.reduce((acc, v) => {
    const key = `${v.mes_referencia}/${v.ano_referencia}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
    <div data-testid="validacao-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Validação de Folha</h1>
          <p className="text-slate-500 mt-1">Análise cirúrgica de holerites com comparação inteligente</p>
        </div>
        <Button
          data-testid="nova-validacao-btn"
          onClick={() => setDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={clientes.length === 0}
        >
          <ClipboardCheck size={18} className="mr-2" />
          Nova Validação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-xs">
          <Select value={filterCliente} onValueChange={setFilterCliente}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {sortClientesBySelection(clientes, empresaSelecionada?.id).map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-mono text-xs text-indigo-600 mr-2">{generateEmpresaCode(c.id, c.codigo_interno)}</span>
                  {c.nome_fantasia || c.razao_social}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative max-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Buscar competência..."
            className="pl-9"
            value={filterCompetencia}
            onChange={(e) => setFilterCompetencia(e.target.value)}
          />
        </div>
      </div>

      {/* Validações Agrupadas por Competência */}
      {Object.keys(groupedValidacoes).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedValidacoes)
            .sort(([a], [b]) => {
              const [ma, ya] = a.split('/').map(Number);
              const [mb, yb] = b.split('/').map(Number);
              return (yb * 12 + mb) - (ya * 12 + ma);
            })
            .map(([competencia, vals]) => {
              // Ordenar por data (mais antigo primeiro, mais novo por último)
              const sortedVals = [...vals].sort((a, b) => 
                new Date(a.created_at) - new Date(b.created_at)
              );
              
              return (
              <Card key={competencia} className="border-slate-200 overflow-hidden">
                <CardHeader className="py-3 bg-slate-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={sortedVals.every(v => selectedIds.includes(v.id))}
                        onCheckedChange={() => selectAllInCompetencia(competencia, sortedVals)}
                      />
                      <Calendar className="text-indigo-600" size={20} />
                      <CardTitle className="text-base font-semibold">Competência {competencia}</CardTitle>
                      <Badge variant="outline" className="text-xs">{sortedVals.length} validação(ões)</Badge>
                    </div>
                    {selectedIds.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteSelectedBatch}
                        disabled={deleting}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Excluir {selectedIds.length}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {sortedVals.map((v, idx) => (
                      <div key={v.id} className="hover:bg-slate-50 transition-colors group">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedIds.includes(v.id)}
                              onCheckedChange={(e) => toggleSelect(v.id, e)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div 
                              className="flex items-center gap-3 flex-1 cursor-pointer"
                              onClick={() => toggleRow(v.id)}
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-indigo-600">#{idx + 1}</span>
                              </div>
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                {(v.total_divergencias || v.total_erros) > 0 ? (
                                  <AlertTriangle className="text-amber-500" size={16} />
                                ) : (
                                  <CheckCircle2 className="text-emerald-500" size={16} />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">{v.cliente_nome || getClienteName(v.cliente_id)}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(v.created_at).toLocaleDateString('pt-BR')} às {new Date(v.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTipoValidacaoLabel(v.tipo_validacao)}
                            <div className="flex items-center gap-2 text-sm">
                              {(v.total_divergencias || v.total_erros) > 0 && (
                                <span className="text-rose-600 font-medium text-xs">
                                  {v.total_divergencias || v.total_erros} div.
                                </span>
                              )}
                              {(v.total_conferidos > 0) && (
                                <span className="text-emerald-600 text-xs">
                                  {v.total_conferidos} ok
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => deleteValidacao(v.id, e)}
                              className="p-1.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Excluir validação"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => toggleRow(v.id)}
                              className="p-1.5 rounded hover:bg-slate-200 text-slate-400"
                            >
                              {expandedRows[v.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>
                        
                        {expandedRows[v.id] && (
                          <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                            <div className="pt-3 space-y-3">
                              {/* Arquivos */}
                              {v.arquivos && (
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {v.arquivos.holerite_atual && (
                                    <Badge variant="outline" className="font-normal">
                                      <FileText size={12} className="mr-1" />
                                      Atual: {v.arquivos.holerite_atual}
                                    </Badge>
                                  )}
                                  {v.arquivos.holerite_anterior && (
                                    <Badge variant="outline" className="font-normal">
                                      <History size={12} className="mr-1" />
                                      Anterior: {v.arquivos.holerite_anterior}
                                    </Badge>
                                  )}
                                  {v.arquivos.apoio?.map((f, i) => (
                                    <Badge key={i} variant="outline" className="font-normal">
                                      Apoio: {f}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Tabela de Colaboradores (se existir) */}
                              {v.colaboradores?.length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                  <div className="bg-indigo-50 px-3 py-2 border-b border-slate-200">
                                    <p className="text-sm font-medium text-indigo-700">Validação por Colaborador</p>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead className="bg-slate-50">
                                        <tr>
                                          <th className="text-left p-2 font-medium">Status</th>
                                          <th className="text-left p-2 font-medium">Colaborador</th>
                                          <th className="text-right p-2 font-medium">Líquido</th>
                                          <th className="text-center p-2 font-medium">Var.</th>
                                          <th className="text-left p-2 font-medium">Problemas</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {v.colaboradores.slice(0, 5).map((colab, idx) => (
                                          <tr key={idx} className={colab.status === 'divergente' ? 'bg-rose-50/50' : colab.status === 'atencao' ? 'bg-amber-50/50' : ''}>
                                            <td className="p-2">
                                              {colab.status === 'ok' && <CheckCircle2 className="text-emerald-500" size={14} />}
                                              {colab.status === 'atencao' && <AlertTriangle className="text-amber-500" size={14} />}
                                              {colab.status === 'divergente' && <XCircle className="text-rose-500" size={14} />}
                                            </td>
                                            <td className="p-2">
                                              <span className="font-medium">{colab.nome}</span>
                                            </td>
                                            <td className="p-2 text-right font-mono">
                                              {formatCurrency(colab.dados_atuais?.liquido || 0)}
                                            </td>
                                            <td className="p-2 text-center">
                                              {colab.comparacao_anterior?.encontrado ? (
                                                colab.comparacao_anterior.campos?.filter(c => c.campo === 'Líquido').map((c, i) => (
                                                  <span key={i} className={c.percentual > 0 ? 'text-emerald-600' : c.percentual < 0 ? 'text-rose-600' : 'text-slate-500'}>
                                                    {c.percentual > 0 ? '+' : ''}{c.percentual.toFixed(1)}%
                                                  </span>
                                                ))
                                              ) : colab.comparacao_anterior?.encontrado === false ? (
                                                <span className="text-blue-500">Novo</span>
                                              ) : '-'}
                                            </td>
                                            <td className="p-2">
                                              {(colab.divergencias?.length > 0 || colab.divergencias_apoio?.length > 0) ? (
                                                <span className="text-rose-600">
                                                  {(colab.divergencias?.length || 0) + (colab.divergencias_apoio?.length || 0)} problema(s)
                                                </span>
                                              ) : (
                                                <span className="text-emerald-600">OK</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {v.colaboradores.length > 5 && (
                                      <div className="px-3 py-2 bg-slate-50 text-xs text-slate-500 text-center">
                                        ... e mais {v.colaboradores.length - 5} colaborador(es)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Divergências resumidas (fallback para validações antigas sem colaboradores) */}
                              {!v.colaboradores?.length && (v.divergencias?.length > 0 || v.discrepancias?.length > 0) && (
                                <div className="bg-rose-50 rounded-lg p-3">
                                  <p className="text-sm font-medium text-rose-700 mb-2">Divergências encontradas:</p>
                                  <ul className="space-y-1">
                                    {(v.divergencias || v.discrepancias)?.slice(0, 3).map((d, i) => (
                                      <li key={i} className="text-xs text-rose-600 flex items-start gap-2">
                                        <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>
                                          <strong>{d.funcionario || 'Geral'}:</strong> {d.descricao || d.tipo}
                                          {d.valor_esperado && d.valor_encontrado && (
                                            <span className="text-rose-500"> (esperado: {d.valor_esperado}, encontrado: {d.valor_encontrado})</span>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                    {(v.divergencias || v.discrepancias)?.length > 3 && (
                                      <li className="text-xs text-rose-500">
                                        ... e mais {(v.divergencias || v.discrepancias).length - 3} divergência(s)
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Impacto financeiro */}
                              {v.impacto_financeiro_total > 0 && (
                                <div className="bg-amber-50 rounded-lg p-3">
                                  <p className="text-sm font-medium text-amber-700">
                                    Impacto financeiro estimado: {formatCurrency(v.impacto_financeiro_total)}
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); fetchValidacaoDetail(v.id); }}
                                  disabled={loadingDetail}
                                >
                                  {loadingDetail ? <Loader2 className="animate-spin mr-2" size={14} /> : <Eye size={14} className="mr-2" />}
                                  Ver detalhes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  onClick={(e) => deleteValidacao(v.id, e)}
                                  data-testid={`delete-validacao-${v.id}`}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500">Nenhuma validação encontrada</p>
            <p className="text-sm text-slate-400 mt-1">Clique em &quot;Nova Validação&quot; para começar</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Nova Validação */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="text-indigo-600" size={24} />
              Nova Validação de Folha
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {/* Info Card */}
            <Card className="border-indigo-200 bg-indigo-50">
              <CardContent className="p-4 text-sm text-indigo-800">
                <p className="font-medium mb-2">Análise Inteligente de Folha de Pagamento</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-600">
                  <li><strong>Holerite Atual</strong>: Documento principal a ser validado (obrigatório)</li>
                  <li><strong>Mês Anterior</strong>: Compare variações mês a mês (opcional)</li>
                  <li><strong>Arquivos de Apoio</strong>: Emails, planilhas, imagens para cruzar dados (opcional, múltiplos)</li>
                </ul>
              </CardContent>
            </Card>

            {/* Empresa e Competência */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Empresa *</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger data-testid="select-cliente-validacao">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortClientesBySelection(clientes, empresaSelecionada?.id).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-mono text-xs text-indigo-600 mr-2">{generateEmpresaCode(c.id, c.codigo_interno)}</span>
                        {c.nome_fantasia || c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mês *</Label>
                <Select value={mesReferencia} onValueChange={setMesReferencia}>
                  <SelectTrigger data-testid="select-mes">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano *</Label>
                <Input
                  data-testid="input-ano"
                  type="number"
                  value={anoReferencia}
                  onChange={(e) => setAnoReferencia(e.target.value)}
                />
              </div>
            </div>

            {/* Upload Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Holerite Atual */}
              <div>
                <Label className="mb-2 block font-medium">
                  Holerite do Mês Atual <span className="text-rose-500">*</span>
                </Label>
                <div
                  {...getRootPropsAtual()}
                  data-testid="dropzone-holerite-atual"
                  className={`upload-zone min-h-[140px] ${isDragActiveAtual ? 'active' : ''} ${holeriteAtual ? 'border-emerald-300 bg-emerald-50' : ''}`}
                >
                  <input {...getInputPropsAtual()} />
                  {holeriteAtual ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="text-emerald-600 mb-2" size={28} />
                      <p className="text-sm text-emerald-700 font-medium truncate max-w-full px-2">{holeriteAtual.name}</p>
                      <button 
                        className="text-xs text-slate-400 hover:text-rose-500 mt-1"
                        onClick={(e) => { e.stopPropagation(); setHoleriteAtual(null); }}
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileUp className="mx-auto text-indigo-400 mb-2" size={28} />
                      <p className="text-sm text-slate-600">Arraste ou clique</p>
                      <p className="text-xs text-slate-400">PDF, Excel, Imagem</p>
                    </>
                  )}
                </div>
              </div>

              {/* Holerite Mês Anterior */}
              <div>
                <Label className="mb-2 block font-medium text-slate-600">
                  Holerite Mês Anterior <span className="text-slate-400 text-xs">(opcional)</span>
                </Label>
                <div
                  {...getRootPropsAnterior()}
                  data-testid="dropzone-holerite-anterior"
                  className={`upload-zone min-h-[140px] ${isDragActiveAnterior ? 'active' : ''} ${holeriteAnterior ? 'border-blue-300 bg-blue-50' : 'border-dashed'}`}
                >
                  <input {...getInputPropsAnterior()} />
                  {holeriteAnterior ? (
                    <div className="flex flex-col items-center">
                      <History className="text-blue-600 mb-2" size={28} />
                      <p className="text-sm text-blue-700 font-medium truncate max-w-full px-2">{holeriteAnterior.name}</p>
                      <button 
                        className="text-xs text-slate-400 hover:text-rose-500 mt-1"
                        onClick={(e) => { e.stopPropagation(); setHoleriteAnterior(null); }}
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <History className="mx-auto text-slate-300 mb-2" size={28} />
                      <p className="text-sm text-slate-500">Comparar com mês anterior</p>
                      <p className="text-xs text-slate-400">PDF, Excel, Imagem</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Arquivos de Apoio */}
            <div>
              <Label className="mb-2 block font-medium text-slate-600">
                Arquivos de Apoio <span className="text-slate-400 text-xs">(opcional, múltiplos)</span>
              </Label>
              <div
                {...getRootPropsApoio()}
                data-testid="dropzone-apoio"
                className={`upload-zone min-h-[100px] ${isDragActiveApoio ? 'active' : ''} border-dashed`}
              >
                <input {...getInputPropsApoio()} />
                <Upload className="mx-auto text-slate-300 mb-2" size={24} />
                <p className="text-sm text-slate-500">Arraste emails, planilhas, imagens ou PDFs de referência</p>
                <p className="text-xs text-slate-400">Horas extras, comissões, faltas, etc.</p>
              </div>
              
              {apoioFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {apoioFiles.map((file, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1">
                      <FileText size={12} />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button
                        onClick={() => removeApoioFile(index)}
                        className="ml-1 hover:text-rose-500"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="py-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{processingStep || 'Processando...'}</span>
                  <span className="text-slate-500">{uploadProgress}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {uploadProgress < 25 ? 'Enviando arquivos para o servidor...' :
                   uploadProgress < 50 ? 'Extraindo dados dos documentos...' :
                   uploadProgress < 75 ? 'Analisando com inteligência artificial...' :
                   uploadProgress < 95 ? 'Comparando e validando...' : 'Finalizando validação...'}
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Cancelar</Button>
              <Button
                onClick={handleValidar}
                disabled={uploading || !holeriteAtual || !selectedCliente || !mesReferencia}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="btn-validar"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    {processingStep || 'Processando...'}
                  </>
                ) : (
                  <>
                    <ClipboardCheck size={16} className="mr-2" />
                    Validar Folha
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Resultado */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {analysisResult?.total_divergencias > 0 ? (
                <AlertTriangle className="text-amber-500" size={24} />
              ) : (
                <CheckCircle2 className="text-emerald-500" size={24} />
              )}
              Resultado da Validação
            </DialogTitle>
          </DialogHeader>
          
          {analysisResult && (
            <div className="space-y-6 mt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="border-slate-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">{analysisResult.funcionarios_analisados || 0}</p>
                    <p className="text-xs text-slate-500">Colaboradores</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-emerald-50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{analysisResult.estatisticas?.ok || 0}</p>
                    <p className="text-xs text-slate-500">OK</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-amber-50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{analysisResult.estatisticas?.atencao || 0}</p>
                    <p className="text-xs text-slate-500">Atenção</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-rose-50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-rose-600">{analysisResult.estatisticas?.divergente || 0}</p>
                    <p className="text-xs text-slate-500">Divergente</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(analysisResult.impacto_financeiro_total || 0)}</p>
                    <p className="text-xs text-slate-500">Impacto</p>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo */}
              {analysisResult.resumo_executivo && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-700">{analysisResult.resumo_executivo}</p>
                </div>
              )}

              {/* Tabela de Colaboradores */}
              {analysisResult.colaboradores?.length > 0 && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-2 bg-slate-50 border-b">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 size={16} className="text-indigo-600" />
                      Validação por Colaborador
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Colaborador</th>
                            <th className="text-right p-3 font-medium">Líquido</th>
                            <th className="text-center p-3 font-medium">Var. Mês Ant.</th>
                            <th className="text-left p-3 font-medium">Divergências</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analysisResult.colaboradores.map((colab, idx) => (
                            <tr key={idx} className={`hover:bg-slate-50 ${colab.status === 'divergente' ? 'bg-rose-50/50' : colab.status === 'atencao' ? 'bg-amber-50/50' : ''}`}>
                              <td className="p-3">
                                {colab.status === 'ok' && <CheckCircle2 className="text-emerald-500" size={20} />}
                                {colab.status === 'atencao' && <AlertTriangle className="text-amber-500" size={20} />}
                                {colab.status === 'divergente' && <XCircle className="text-rose-500" size={20} />}
                              </td>
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-slate-900">{colab.nome}</p>
                                  <p className="text-xs text-slate-500">
                                    {colab.cpf && <span className="mr-2">{colab.cpf}</span>}
                                    {colab.cargo && <span className="text-indigo-600">{colab.cargo}</span>}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3 text-right font-mono font-medium">
                                {formatCurrency(colab.dados_atuais?.liquido || 0)}
                              </td>
                              <td className="p-3 text-center">
                                {colab.comparacao_anterior?.encontrado ? (
                                  <div className="flex flex-col items-center">
                                    {colab.comparacao_anterior.campos?.filter(c => c.campo === 'Líquido').map((c, i) => (
                                      <span key={i} className={`text-xs font-medium ${c.percentual > 0 ? 'text-emerald-600' : c.percentual < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                        {c.percentual > 0 ? '+' : ''}{c.percentual.toFixed(1)}%
                                        <span className="block text-[10px] text-slate-400">
                                          {c.diferenca > 0 ? '+' : ''}{formatCurrency(c.diferenca)}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : colab.comparacao_anterior?.encontrado === false ? (
                                  <Badge variant="outline" className="text-xs">Novo</Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3">
                                {(colab.divergencias?.length > 0 || colab.divergencias_apoio?.length > 0) ? (
                                  <div className="space-y-1">
                                    {colab.divergencias?.map((div, i) => (
                                      <div key={`d-${i}`} className="text-xs text-rose-600 bg-rose-100 px-2 py-1 rounded">
                                        <strong>{div.campo}:</strong> {div.esperado?.toLocaleString('pt-BR')} → {div.encontrado?.toLocaleString('pt-BR')}
                                        {div.percentual && <span className="ml-1">({div.percentual > 0 ? '+' : ''}{div.percentual.toFixed(1)}%)</span>}
                                      </div>
                                    ))}
                                    {colab.divergencias_apoio?.map((div, i) => (
                                      <div key={`da-${i}`} className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                        <strong>{div.campo}:</strong> Apoio={div.valor_apoio} ≠ Holerite={div.valor_holerite}
                                        <span className="block text-[10px] text-amber-600">{div.arquivo}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-emerald-600 text-xs">Sem divergências</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Referências Extraídas do Apoio */}
              {analysisResult.referencias_apoio?.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-2 bg-blue-50">
                    <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                      <FileText size={16} />
                      Referências dos Arquivos de Apoio
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.referencias_apoio.map((ref, i) => (
                        <Badge key={i} variant="outline" className="text-blue-600 border-blue-300">
                          {ref.nome || ref.identificador}: {ref.campo || ref.tipo ? (ref.campo || ref.tipo).replace('_', ' ') : ''} = {ref.valor}
                          <span className="text-[10px] text-slate-400 ml-1">({ref.arquivo})</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              {analysisResult.recomendacoes?.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-2 bg-blue-50">
                    <CardTitle className="text-sm text-blue-700">Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.recomendacoes.map((r, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setResultDialogOpen(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="text-indigo-600" size={24} />
              Detalhes da Validação
            </DialogTitle>
          </DialogHeader>
          
          {selectedValidacao && (
            <div className="space-y-6 mt-4">
              {/* Header Info */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{selectedValidacao.cliente_nome || getClienteName(selectedValidacao.cliente_id)}</p>
                  <p className="text-sm text-slate-500">Competência: {selectedValidacao.mes_referencia}/{selectedValidacao.ano_referencia}</p>
                </div>
                {getTipoValidacaoLabel(selectedValidacao.tipo_validacao)}
              </div>

              {/* Arquivos utilizados */}
              {selectedValidacao.arquivos && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Arquivos analisados:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedValidacao.arquivos.holerite_atual && (
                      <Badge variant="outline"><FileText size={12} className="mr-1" />Atual: {selectedValidacao.arquivos.holerite_atual}</Badge>
                    )}
                    {selectedValidacao.arquivos.holerite_anterior && (
                      <Badge variant="outline"><History size={12} className="mr-1" />Anterior: {selectedValidacao.arquivos.holerite_anterior}</Badge>
                    )}
                    {selectedValidacao.arquivos.apoio?.map((f, i) => (
                      <Badge key={i} variant="outline">Apoio: {f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo */}
              {selectedValidacao.resumo_executivo && (
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resumo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 whitespace-pre-line">{selectedValidacao.resumo_executivo}</p>
                  </CardContent>
                </Card>
              )}

              {/* Comparações */}
              {selectedValidacao.comparacoes?.com_mes_anterior?.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-2 bg-blue-50">
                    <CardTitle className="text-sm text-blue-700">Comparação com Mês Anterior</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="text-left p-3">Funcionário</th>
                            <th className="text-left p-3">Campo</th>
                            <th className="text-right p-3">Anterior</th>
                            <th className="text-right p-3">Atual</th>
                            <th className="text-right p-3">Diferença</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedValidacao.comparacoes.com_mes_anterior.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-3">{c.funcionario}</td>
                              <td className="p-3">{c.campo}</td>
                              <td className="p-3 text-right font-mono">{formatCurrency(c.valor_anterior)}</td>
                              <td className="p-3 text-right font-mono">{formatCurrency(c.valor_atual)}</td>
                              <td className={`p-3 text-right font-mono ${c.diferenca > 0 ? 'text-emerald-600' : c.diferenca < 0 ? 'text-rose-600' : ''}`}>
                                {c.diferenca > 0 ? '+' : ''}{formatCurrency(c.diferenca)}
                                {c.percentual ? ` (${c.percentual > 0 ? '+' : ''}${c.percentual.toFixed(1)}%)` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Divergências detalhadas */}
              {(selectedValidacao.divergencias?.length > 0 || selectedValidacao.discrepancias?.length > 0) && (
                <Card className="border-rose-200">
                  <CardHeader className="pb-2 bg-rose-50">
                    <CardTitle className="text-sm text-rose-700">Divergências</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {(selectedValidacao.divergencias || selectedValidacao.discrepancias).map((d, i) => (
                        <div key={i} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium">{d.funcionario || 'Geral'}</span>
                            {getSeverityBadge(d.severidade)}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{d.descricao}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            {d.valor_esperado && <span>Esperado: <strong className="text-emerald-600">{d.valor_esperado}</strong></span>}
                            {d.valor_encontrado && <span>Encontrado: <strong className="text-rose-600">{d.valor_encontrado}</strong></span>}
                            {d.fonte_referencia && <span>Fonte: {d.fonte_referencia}</span>}
                            {d.impacto_financeiro > 0 && <span>Impacto: <strong className="text-amber-600">{formatCurrency(d.impacto_financeiro)}</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              {selectedValidacao.recomendacoes?.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-2 bg-blue-50">
                    <CardTitle className="text-sm text-blue-700">Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedValidacao.recomendacoes.map((r, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-blue-500">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setDetailDialogOpen(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ValidacaoFolha;
