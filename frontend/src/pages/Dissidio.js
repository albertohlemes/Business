import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  FileText, Upload, CheckCircle2, Clock, Loader2, TrendingUp, 
  Users, DollarSign, Percent, Download, Calendar, Building2,
  ChevronRight, FileUp, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEmpresa } from '../contexts/EmpresaContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dissidio = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState('');
  
  // Fluxo de Dissídio
  const [step, setStep] = useState(1); // 1: Upload Convenção, 2: Revisar Dados, 3: Upload Holerites, 4: Resultado
  const [uploading, setUploading] = useState(false);
  const [convencaoData, setConvencaoData] = useState(null);
  const [holeriteFiles, setHoleriteFiles] = useState([]);
  const [calculoResult, setCalculoResult] = useState(null);
  const [calculosAnteriores, setCalculosAnteriores] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // Helper para toggle de expansão
  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const isExpanded = (id) => expandedItems.has(id);
  
  const { empresaSelecionada } = useEmpresa();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      setSelectedCliente(empresaSelecionada.id);
    }
  }, [empresaSelecionada]);

  const fetchData = async () => {
    try {
      const [clientesRes, calculosRes] = await Promise.all([
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/calculos-dissidio`)
      ]);
      setClientes(clientesRes.data);
      setCalculosAnteriores(calculosRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Upload Convenção
  const onDropConvencao = useCallback(async (acceptedFiles) => {
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
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      setConvencaoData(response.data.dados_convencao);
      setStep(2);
      toast.success('Convenção analisada com sucesso!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar convenção');
    } finally {
      setUploading(false);
    }
  }, [selectedCliente]);

  const { getRootProps: getConvencaoProps, getInputProps: getConvencaoInput, isDragActive: isDragConvencao } = useDropzone({
    onDrop: onDropConvencao,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  // Upload Holerites
  const onDropHolerites = useCallback((acceptedFiles) => {
    setHoleriteFiles(prev => [...prev, ...acceptedFiles]);
    toast.success(`${acceptedFiles.length} arquivo(s) adicionado(s)`);
  }, []);

  const { getRootProps: getHoleritesProps, getInputProps: getHoleritesInput, isDragActive: isDragHolerites } = useDropzone({
    onDrop: onDropHolerites,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const removeHolerite = (index) => {
    setHoleriteFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Calcular Dissídio
  const calcularDissidio = async () => {
    if (holeriteFiles.length === 0) {
      toast.error('Adicione pelo menos um holerite');
      return;
    }

    const formData = new FormData();
    formData.append('convencao_dados', JSON.stringify(convencaoData));
    formData.append('cliente_id', selectedCliente);
    holeriteFiles.forEach(file => {
      formData.append('holerites', file);
    });

    setUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/dissidio/calcular-retroativo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000
      });
      setCalculoResult(response.data);
      setStep(4);
      toast.success('Cálculo concluído!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao calcular dissídio');
    } finally {
      setUploading(false);
    }
  };

  // Exportar Excel
  const exportarExcel = async (calculoId) => {
    try {
      const response = await axios.get(`${API_URL}/api/calculos-dissidio/${calculoId}/excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dissidio_${calculoId.substring(0, 8)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Erro ao exportar');
    }
  };

  // Calcular meses retroativos baseado na data base e mês que recebeu
  const calcularMesesRetroativos = (dataBase, mesRecebimento) => {
    if (!dataBase || !mesRecebimento) return null;
    
    try {
      const [mesBase, anoBase] = dataBase.split('/').map(Number);
      const [mesReceb, anoReceb] = mesRecebimento.split('/').map(Number);
      
      if (!mesBase || !anoBase || !mesReceb || !anoReceb) return null;
      
      // Calcular diferença em meses
      const meses = (anoReceb - anoBase) * 12 + (mesReceb - mesBase);
      return Math.max(0, meses);
    } catch {
      return null;
    }
  };

  // Reset
  const resetFluxo = () => {
    setStep(1);
    setConvencaoData(null);
    setHoleriteFiles([]);
    setCalculoResult(null);
  };

  const getClienteName = (id) => {
    const cliente = clientes.find(c => c.id === id);
    return cliente?.nome_fantasia || cliente?.razao_social || 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cálculo de Dissídio</h1>
          <p className="text-slate-500 text-sm mt-1">Análise automática de convenção e cálculo de retroativo</p>
        </div>
        {step > 1 && (
          <Button variant="outline" onClick={resetFluxo}>
            Novo Cálculo
          </Button>
        )}
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg">
        {[
          { num: 1, label: 'Convenção' },
          { num: 2, label: 'Revisar Dados' },
          { num: 3, label: 'Holerites' },
          { num: 4, label: 'Resultado' }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s.num ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s.num ? <CheckCircle2 size={16} /> : s.num}
            </div>
            <span className={`ml-2 text-sm ${step >= s.num ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
              {s.label}
            </span>
            {i < 3 && <ChevronRight className="mx-3 text-slate-300" size={16} />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Convenção */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="text-indigo-600" />
              Upload da Convenção Coletiva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Empresa</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger>
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
              {...getConvencaoProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragConvencao ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
              }`}
            >
              <input {...getConvencaoInput()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin text-indigo-600 mb-2" size={40} />
                  <p className="text-indigo-600 font-medium">Analisando convenção com IA...</p>
                  <p className="text-sm text-slate-500">Isso pode levar alguns segundos</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto text-slate-400 mb-3" size={40} />
                  <p className="text-slate-600 font-medium">Arraste o PDF da convenção coletiva</p>
                  <p className="text-sm text-slate-400 mt-1">ou clique para selecionar</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Revisar Dados da Convenção */}
      {step === 2 && convencaoData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" />
              Revisar e Ajustar Dados da Convenção
            </CardTitle>
            <p className="text-sm text-slate-500">Confira os dados extraídos e ajuste se necessário</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados principais EDITÁVEIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-indigo-600 font-medium">Percentual de Reajuste (%)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={convencaoData.percentual_reajuste || ''} 
                  onChange={(e) => setConvencaoData({...convencaoData, percentual_reajuste: parseFloat(e.target.value) || 0})}
                  className="text-lg font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium">Data Base (MM/AAAA)</Label>
                <Input 
                  value={convencaoData.data_base || ''} 
                  onChange={(e) => {
                    const newDataBase = e.target.value;
                    setConvencaoData(prev => ({
                      ...prev, 
                      data_base: newDataBase,
                      meses_retroativos: calcularMesesRetroativos(newDataBase, prev.mes_convencao)
                    }));
                  }}
                  placeholder="05/2025"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-medium">Mês que Recebi a Convenção</Label>
                <Input 
                  value={convencaoData.mes_convencao || ''} 
                  onChange={(e) => {
                    const newMesConvencao = e.target.value;
                    setConvencaoData(prev => ({
                      ...prev, 
                      mes_convencao: newMesConvencao,
                      meses_retroativos: calcularMesesRetroativos(prev.data_base, newMesConvencao)
                    }));
                  }}
                  placeholder="08/2025"
                />
                <p className="text-xs text-slate-400">Ajuste se demorou para descobrir que saiu</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg flex flex-col justify-center">
                <p className="text-xs text-amber-600 font-medium">Meses Retroativos</p>
                <p className="text-3xl font-bold text-amber-700">{convencaoData.meses_retroativos || '?'}</p>
                <p className="text-xs text-amber-600">calculado automaticamente</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sindicato</Label>
              <Input 
                value={convencaoData.sindicato || ''} 
                onChange={(e) => setConvencaoData({...convencaoData, sindicato: e.target.value})}
              />
            </div>

            {/* Verbas */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Verbas COM Reajuste
                </p>
                <div className="flex flex-wrap gap-1">
                  {convencaoData.verbas_com_reajuste?.map((v, i) => (
                    <Badge key={i} variant="outline" className="text-emerald-600 border-emerald-300">
                      {v.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-slate-400 text-sm">Não identificado</span>}
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium text-rose-700 mb-2 flex items-center gap-1">
                  <AlertTriangle size={14} /> Verbas SEM Reajuste
                </p>
                <div className="flex flex-wrap gap-1">
                  {convencaoData.verbas_sem_reajuste?.map((v, i) => (
                    <Badge key={i} variant="outline" className="text-rose-600 border-rose-300">
                      {v.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-slate-400 text-sm">Não identificado</span>}
                </div>
              </div>
            </div>

            {/* Piso Salarial */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Piso Salarial Novo (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={convencaoData.piso_salarial || ''} 
                  onChange={(e) => setConvencaoData({...convencaoData, piso_salarial: parseFloat(e.target.value) || null})}
                  placeholder="1.500,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Piso Salarial Anterior (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={convencaoData.piso_salarial_anterior || ''} 
                  onChange={(e) => setConvencaoData({...convencaoData, piso_salarial_anterior: parseFloat(e.target.value) || null})}
                  placeholder="1.412,00"
                />
              </div>
            </div>

            {/* Benefícios */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-blue-700 flex items-center gap-1">
                  <TrendingUp size={14} /> Benefícios (Valores Novos)
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setConvencaoData({
                    ...convencaoData, 
                    beneficios: [...(convencaoData.beneficios || []), {tipo: '', nome: '', valor_novo: 0, valor_anterior: 0}]
                  })}
                >
                  + Adicionar
                </Button>
              </div>
              {convencaoData.beneficios?.length > 0 ? (
                <div className="space-y-2">
                  {convencaoData.beneficios.map((ben, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 items-center bg-blue-50 p-2 rounded">
                      <Input 
                        placeholder="Nome"
                        value={ben.nome || ''} 
                        onChange={(e) => {
                          const newBen = [...convencaoData.beneficios];
                          newBen[i] = {...newBen[i], nome: e.target.value};
                          setConvencaoData({...convencaoData, beneficios: newBen});
                        }}
                        className="text-sm"
                      />
                      <Input 
                        type="number"
                        placeholder="Valor Anterior"
                        value={ben.valor_anterior || ''} 
                        onChange={(e) => {
                          const newBen = [...convencaoData.beneficios];
                          newBen[i] = {...newBen[i], valor_anterior: parseFloat(e.target.value) || 0};
                          setConvencaoData({...convencaoData, beneficios: newBen});
                        }}
                        className="text-sm"
                      />
                      <Input 
                        type="number"
                        placeholder="Valor Novo"
                        value={ben.valor_novo || ''} 
                        onChange={(e) => {
                          const newBen = [...convencaoData.beneficios];
                          newBen[i] = {...newBen[i], valor_novo: parseFloat(e.target.value) || 0};
                          setConvencaoData({...convencaoData, beneficios: newBen});
                        }}
                        className="text-sm"
                      />
                      <span className={`text-xs font-medium ${ben.valor_novo > ben.valor_anterior ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {ben.valor_anterior && ben.valor_novo ? 
                          `${((ben.valor_novo - ben.valor_anterior) / ben.valor_anterior * 100).toFixed(1)}%` : '-'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const newBen = convencaoData.beneficios.filter((_, idx) => idx !== i);
                          setConvencaoData({...convencaoData, beneficios: newBen});
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Nenhum benefício identificado. Clique em "Adicionar" para incluir.</p>
              )}
            </div>

            {/* Descontos */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-amber-700 flex items-center gap-1">
                  <AlertTriangle size={14} /> Descontos (Valores Novos)
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setConvencaoData({
                    ...convencaoData, 
                    descontos: [...(convencaoData.descontos || []), {tipo: '', nome: '', valor_novo: 0, valor_anterior: 0}]
                  })}
                >
                  + Adicionar
                </Button>
              </div>
              {convencaoData.descontos?.length > 0 ? (
                <div className="space-y-2">
                  {convencaoData.descontos.map((desc, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 items-center bg-amber-50 p-2 rounded">
                      <Input 
                        placeholder="Nome"
                        value={desc.nome || ''} 
                        onChange={(e) => {
                          const newDesc = [...convencaoData.descontos];
                          newDesc[i] = {...newDesc[i], nome: e.target.value};
                          setConvencaoData({...convencaoData, descontos: newDesc});
                        }}
                        className="text-sm"
                      />
                      <Input 
                        type="number"
                        placeholder="Valor Anterior"
                        value={desc.valor_anterior || ''} 
                        onChange={(e) => {
                          const newDesc = [...convencaoData.descontos];
                          newDesc[i] = {...newDesc[i], valor_anterior: parseFloat(e.target.value) || 0};
                          setConvencaoData({...convencaoData, descontos: newDesc});
                        }}
                        className="text-sm"
                      />
                      <Input 
                        type="number"
                        placeholder="Valor Novo"
                        value={desc.valor_novo || ''} 
                        onChange={(e) => {
                          const newDesc = [...convencaoData.descontos];
                          newDesc[i] = {...newDesc[i], valor_novo: parseFloat(e.target.value) || 0};
                          setConvencaoData({...convencaoData, descontos: newDesc});
                        }}
                        className="text-sm"
                      />
                      <span className={`text-xs font-medium ${desc.valor_novo > desc.valor_anterior ? 'text-rose-600' : 'text-emerald-500'}`}>
                        {desc.valor_anterior && desc.valor_novo ? 
                          `${((desc.valor_novo - desc.valor_anterior) / desc.valor_anterior * 100).toFixed(1)}%` : '-'}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const newDesc = convencaoData.descontos.filter((_, idx) => idx !== i);
                          setConvencaoData({...convencaoData, descontos: newDesc});
                        }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Nenhum desconto identificado. Clique em "Adicionar" para incluir.</p>
              )}
            </div>

            {convencaoData.resumo && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-1">Resumo</p>
                <p className="text-slate-600 text-sm">{convencaoData.resumo}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700">
                Continuar para Upload dos Holerites
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Upload Holerites */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="text-indigo-600" />
              Upload dos Holerites Retroativos
            </CardTitle>
            <p className="text-sm text-slate-500">
              Envie os holerites dos {convencaoData?.meses_retroativos || 'X'} meses retroativos para cálculo
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...getHoleritesProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragHolerites ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'
              }`}
            >
              <input {...getHoleritesInput()} />
              <Upload className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-slate-600">Arraste os PDFs dos holerites ou clique para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">Pode selecionar múltiplos arquivos</p>
            </div>

            {holeriteFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{holeriteFiles.length} arquivo(s) selecionado(s):</p>
                {holeriteFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeHolerite(i)}>
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button 
                onClick={calcularDissidio} 
                disabled={holeriteFiles.length === 0 || uploading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Calculando...
                  </>
                ) : (
                  <>
                    Calcular Retroativo
                    <TrendingUp size={16} className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Resultado */}
      {step === 4 && calculoResult && (
        <div className="space-y-6">
          {/* Header com resultado principal */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-8 text-white shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 size={28} className="text-emerald-200" />
                  <h2 className="text-2xl font-bold">Cálculo Concluído!</h2>
                </div>
                <div className="flex items-center gap-4 text-emerald-100">
                  <span className="flex items-center gap-1">
                    <Calendar size={16} />
                    {calculoResult.meses_processados} mês(es)
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={16} />
                    {calculoResult.total_colaboradores} colaborador(es)
                  </span>
                  <span className="flex items-center gap-1">
                    <Percent size={16} />
                    {calculoResult.percentual_reajuste}% reajuste
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-200 text-sm mb-1">Total Retroativo a Pagar</p>
                <p className="text-4xl font-bold tracking-tight">
                  R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            {/* Mini totalizadores */}
            <div className="relative mt-6 pt-6 border-t border-white/20 grid grid-cols-3 gap-6">
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Soma Verbas Anteriores</p>
                <p className="text-xl font-semibold mt-1">
                  R$ {calculoResult.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_anterior || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Soma Verbas Reajustadas</p>
                <p className="text-xl font-semibold mt-1">
                  R$ {calculoResult.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_novo || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-emerald-200 text-xs uppercase tracking-wide">Diferença Total</p>
                <p className="text-xl font-semibold mt-1">
                  R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Nota sobre impostos */}
          {calculoResult.impostos_excluidos && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-amber-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">Encargos não incluídos</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {calculoResult.nota_impostos || 'INSS, IRRF e demais encargos serão calculados e descontados na competência de pagamento do retroativo.'}
                </p>
              </div>
            </div>
          )}

          {/* Resumo Geral por Colaborador */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Users className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <span>Resumo por Colaborador</span>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">{calculoResult.total_colaboradores} colaborador(es) • Todos os meses consolidados</p>
                  </div>
                </CardTitle>
                <Button variant="outline" onClick={() => exportarExcel(calculoResult.id)} className="gap-2">
                  <Download size={16} />
                  Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <th className="text-left p-4 font-semibold">Colaborador</th>
                      <th className="text-left p-4 font-semibold">CPF</th>
                      <th className="text-right p-4 font-semibold">Total Verbas (Era)</th>
                      <th className="text-right p-4 font-semibold">Total Verbas (Ficou)</th>
                      <th className="text-right p-4 font-semibold text-emerald-600">Retroativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculoResult.colaboradores_consolidado?.map((colab, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                              {colab.nome?.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800">{colab.nome}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-sm">{colab.cpf || '-'}</td>
                        <td className="p-4 text-right font-mono text-sm text-slate-600">
                          R$ {(colab.total_valor_anterior || 0)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-mono text-sm text-indigo-600 font-medium">
                          R$ {(colab.total_valor_novo || 0)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold text-sm">
                            R$ {colab.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold">
                      <td className="p-4" colSpan={2}>
                        <span className="text-slate-700">TOTAL GERAL</span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600">
                        R$ {calculoResult.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_anterior || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono text-indigo-700">
                        R$ {calculoResult.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_novo || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right">
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500 text-white font-mono font-bold">
                          R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Memória de Cálculo - Por Mês */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Calendar className="text-blue-600" size={20} />
                </div>
                <div>
                  <span>Memória de Cálculo por Mês</span>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">Detalhamento de cada competência processada</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {calculoResult.resultados_por_mes?.map((mes, mesIdx) => (
                <div key={mesIdx} className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(`mes-${mesIdx}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                        {mes.competencia?.split('/')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{mes.competencia}</span>
                          <Badge variant="outline" className="text-xs">{mes.colaboradores?.length || 0} colaboradores</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{mes.arquivo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Retroativo do Mês</p>
                        <p className="font-mono font-bold text-lg text-blue-700">
                          R$ {mes.total_retroativo_mes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
                        {isExpanded(`mes-${mesIdx}`) ? <ChevronUp size={18} className="text-slate-600" /> : <ChevronDown size={18} className="text-slate-600" />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded(`mes-${mesIdx}`) && (
                    <div className="bg-white border-t">
                      {/* Subtotais do mês */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50/50 border-b">
                        <div className="text-center p-3 rounded-lg bg-white border">
                          <p className="text-xs text-slate-500 mb-1">Soma Era</p>
                          <p className="font-mono font-semibold text-slate-700">
                            R$ {mes.colaboradores?.reduce((acc, c) => acc + (c.total_valor_anterior || c.valor_base_reajuste || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white border">
                          <p className="text-xs text-slate-500 mb-1">Soma Ficou</p>
                          <p className="font-mono font-semibold text-indigo-600">
                            R$ {mes.colaboradores?.reduce((acc, c) => acc + (c.total_valor_novo || (c.valor_base_reajuste || 0) * (1 + calculoResult.percentual_reajuste/100)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                          <p className="text-xs text-emerald-600 mb-1">Total Retroativo</p>
                          <p className="font-mono font-bold text-emerald-700">
                            R$ {mes.total_retroativo_mes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Tabela detalhada */}
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs uppercase tracking-wider text-slate-500">
                              <th className="text-left p-3 font-semibold">Colaborador</th>
                              <th className="text-left p-3 font-semibold">Verba</th>
                              <th className="text-right p-3 font-semibold">Era (R$)</th>
                              <th className="text-center p-3 font-semibold">Reajuste</th>
                              <th className="text-right p-3 font-semibold">Ficou (R$)</th>
                              <th className="text-right p-3 font-semibold text-emerald-600">Diferença</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {mes.colaboradores?.map((colab, colabIdx) => (
                              <React.Fragment key={`colab-${colabIdx}`}>
                                {colab.verbas?.map((verba, verbaIdx) => (
                                  <tr key={`${colabIdx}-${verbaIdx}`} className="hover:bg-slate-50/50">
                                    {verbaIdx === 0 && (
                                      <td className="p-3 align-top" rowSpan={colab.verbas.length + 1}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold">
                                            {colab.nome?.charAt(0)}
                                          </div>
                                          <span className="font-medium text-slate-700">{colab.nome}</span>
                                        </div>
                                      </td>
                                    )}
                                    <td className="p-3 text-slate-600 capitalize">{verba.verba?.replace(/_/g, ' ')}</td>
                                    <td className="p-3 text-right font-mono text-slate-500">
                                      {(verba.valor_anterior || verba.valor_original)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                                        +{calculoResult.percentual_reajuste}%
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-mono text-indigo-600 font-medium">
                                      {verba.valor_novo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}
                                    </td>
                                    <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                                      +{verba.diferenca?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                                {/* Subtotal por colaborador */}
                                <tr className="bg-slate-50">
                                  <td className="p-2 text-right text-xs text-slate-500 font-medium" colSpan={4}>
                                    Subtotal {colab.nome?.split(' ')[0]}:
                                  </td>
                                  <td className="p-2 text-right font-mono text-sm text-emerald-700 font-bold">
                                    R$ {colab.retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gradient-to-r from-blue-100 to-indigo-100">
                              <td className="p-4 font-bold text-slate-700" colSpan={5}>
                                TOTAL DO MÊS {mes.competencia}
                              </td>
                              <td className="p-4 text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold">
                                  R$ {mes.total_retroativo_mes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Total geral dos meses */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={24} />
                  <span className="font-semibold">TOTAL GERAL DE TODOS OS MESES</span>
                </div>
                <span className="text-2xl font-mono font-bold">
                  R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Memória de Cálculo - Por Colaborador */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="text-purple-600" size={20} />
                </div>
                <div>
                  <span>Memória de Cálculo por Colaborador</span>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">Histórico de cada funcionário ao longo dos meses</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {calculoResult.colaboradores_consolidado?.map((colab, colabIdx) => (
                <div key={colabIdx} className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(`colab-${colabIdx}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {colab.nome?.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">{colab.nome}</span>
                        {colab.cpf && <p className="text-xs text-slate-500 mt-0.5">CPF: {colab.cpf}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Retroativo Total</p>
                        <p className="font-mono font-bold text-lg text-purple-700">
                          R$ {colab.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
                        {isExpanded(`colab-${colabIdx}`) ? <ChevronUp size={18} className="text-slate-600" /> : <ChevronDown size={18} className="text-slate-600" />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded(`colab-${colabIdx}`) && (
                    <div className="bg-white border-t p-4 space-y-4">
                      {colab.meses?.map((mes, mesIdx) => (
                        <div key={mesIdx} className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <span className="font-medium text-slate-700">{mes.competencia}</span>
                            </div>
                            <span className="font-mono font-semibold text-purple-600">
                              R$ {mes.retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {mes.verbas && mes.verbas.length > 0 && (
                            <div className="p-3">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-slate-500">
                                    <th className="text-left p-2 font-medium">Verba</th>
                                    <th className="text-right p-2 font-medium">Era</th>
                                    <th className="text-center p-2 font-medium">%</th>
                                    <th className="text-right p-2 font-medium">Ficou</th>
                                    <th className="text-right p-2 font-medium text-emerald-600">Diferença</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {mes.verbas.map((verba, verbaIdx) => (
                                    <tr key={verbaIdx} className="hover:bg-slate-50/50">
                                      <td className="p-2 text-slate-700 capitalize">{verba.verba?.replace(/_/g, ' ')}</td>
                                      <td className="p-2 text-right font-mono text-slate-500">
                                        {(verba.valor_anterior || verba.valor_original)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="p-2 text-center">
                                        <span className="text-xs text-indigo-600 font-medium">+{calculoResult.percentual_reajuste}%</span>
                                      </td>
                                      <td className="p-2 text-right font-mono text-indigo-600">
                                        {verba.valor_novo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}
                                      </td>
                                      <td className="p-2 text-right font-mono text-emerald-600 font-semibold">
                                        +{verba.diferenca?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-purple-50">
                                    <td className="p-2 font-medium text-slate-600" colSpan={4}>Subtotal {mes.competencia}</td>
                                    <td className="p-2 text-right font-mono font-bold text-purple-700">
                                      R$ {mes.retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Total do colaborador */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm">Total de {colab.nome?.split(' ')[0]}</p>
                          <p className="text-xs text-purple-200 mt-0.5">{colab.meses?.length} mês(es) processados</p>
                        </div>
                        <span className="text-2xl font-mono font-bold">
                          R$ {colab.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Total geral dos colaboradores */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp size={24} />
                  <span className="font-semibold">TOTAL GERAL DE TODOS OS COLABORADORES</span>
                </div>
                <span className="text-2xl font-mono font-bold">
                  R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cálculos Anteriores */}
      {calculosAnteriores.length > 0 && step === 1 && (
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Clock className="text-slate-600" size={20} />
              </div>
              <div>
                <span>Cálculos Anteriores</span>
                <p className="text-xs text-slate-500 font-normal mt-0.5">{calculosAnteriores.length} cálculo(s) realizados</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {calculosAnteriores.map((calc) => (
                <div key={calc.id} className="rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(calc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {calc.percentual_reajuste}%
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{calc.cliente_nome || getClienteName(calc.cliente_id)}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {calc.meses_processados} mês(es)
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(calc.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total Retroativo</p>
                        <p className="font-mono font-bold text-lg text-emerald-600">
                          R$ {calc.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); exportarExcel(calc.id); }} className="gap-1">
                        <Download size={14} />
                        Excel
                      </Button>
                      <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
                        {isExpanded(calc.id) ? <ChevronUp size={18} className="text-slate-600" /> : <ChevronDown size={18} className="text-slate-600" />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded(calc.id) && (
                    <div className="border-t bg-white">
                      {/* Nota sobre impostos */}
                      {calc.impostos_excluidos && (
                        <div className="mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="text-amber-600" size={16} />
                          </div>
                          <p className="text-xs text-amber-700">
                            {calc.nota_impostos || 'INSS, IRRF e demais encargos serão calculados na competência de pagamento.'}
                          </p>
                        </div>
                      )}
                      
                      {/* Totalizadores Gerais */}
                      <div className="grid grid-cols-3 gap-4 p-4">
                        <div className="text-center p-4 rounded-xl bg-slate-50 border">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Era</p>
                          <p className="font-mono font-semibold text-slate-700">
                            R$ {calc.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_anterior || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                          <p className="text-xs text-indigo-600 uppercase tracking-wide mb-1">Total Ficou</p>
                          <p className="font-mono font-semibold text-indigo-700">
                            R$ {calc.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_novo || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                          <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Total Retroativo</p>
                          <p className="font-mono font-bold text-emerald-700">
                            R$ {calc.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Memória de Cálculo por Mês */}
                      <div className="px-4 pb-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Calendar size={16} className="text-blue-600" />
                          Memória de Cálculo por Mês
                        </p>
                        {calc.resultados_por_mes?.map((mes, mesIdx) => (
                          <div key={mesIdx} className="rounded-lg border border-slate-200 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 flex items-center justify-between cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(`${calc.id}-mes-${mesIdx}`); }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                                  {mes.competencia?.split('/')[0]}
                                </div>
                                <div>
                                  <span className="font-medium text-slate-800">{mes.competencia}</span>
                                  <span className="text-xs text-slate-500 ml-2">({mes.colaboradores?.length} colaboradores)</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-blue-700">
                                  R$ {mes.total_retroativo_mes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                {isExpanded(`${calc.id}-mes-${mesIdx}`) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                            
                            {isExpanded(`${calc.id}-mes-${mesIdx}`) && (
                              <div className="border-t bg-white p-3 max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="sticky top-0 bg-white">
                                    <tr className="text-xs uppercase tracking-wider text-slate-500 border-b">
                                      <th className="text-left p-2 font-semibold">Colaborador</th>
                                      <th className="text-left p-2 font-semibold">Verba</th>
                                      <th className="text-right p-2 font-semibold">Era</th>
                                      <th className="text-center p-2 font-semibold">%</th>
                                      <th className="text-right p-2 font-semibold">Ficou</th>
                                      <th className="text-right p-2 font-semibold text-emerald-600">Diferença</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {mes.colaboradores?.map((colab, colabIdx) => (
                                      <React.Fragment key={`calc-colab-${colabIdx}`}>
                                        {colab.verbas?.map((verba, verbaIdx) => (
                                          <tr key={`${colabIdx}-${verbaIdx}`} className="hover:bg-slate-50/50">
                                            {verbaIdx === 0 && (
                                              <td className="p-2 align-top" rowSpan={colab.verbas.length}>
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {colab.nome?.charAt(0)}
                                                  </div>
                                                  <span className="font-medium text-slate-700">{colab.nome}</span>
                                                </div>
                                              </td>
                                            )}
                                            <td className="p-2 text-slate-600 capitalize">{verba.verba?.replace(/_/g, ' ')}</td>
                                            <td className="p-2 text-right font-mono text-slate-500">
                                              {(verba.valor_anterior || verba.valor_original)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 text-center">
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                                                +{calc.percentual_reajuste}%
                                              </span>
                                            </td>
                                            <td className="p-2 text-right font-mono text-indigo-600">
                                              {verba.valor_novo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '-'}
                                            </td>
                                            <td className="p-2 text-right font-mono text-emerald-600 font-semibold">
                                              +{verba.diferenca?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        ))}
                                        {/* Subtotal por colaborador */}
                                        <tr className="bg-slate-50">
                                          <td className="p-2 text-right text-xs text-slate-500 font-medium" colSpan={5}>
                                            Subtotal {colab.nome?.split(' ')[0]}:
                                          </td>
                                          <td className="p-2 text-right font-mono text-sm text-emerald-700 font-bold">
                                            R$ {colab.retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-gradient-to-r from-blue-100 to-indigo-100">
                                      <td className="p-3 font-bold text-slate-700" colSpan={5}>
                                        TOTAL DO MÊS {mes.competencia}
                                      </td>
                                      <td className="p-3 text-right">
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold text-sm">
                                          R$ {mes.total_retroativo_mes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Total dos meses */}
                        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                          <span className="font-medium flex items-center gap-2">
                            <DollarSign size={18} />
                            Total de Todos os Meses
                          </span>
                          <span className="font-mono font-bold text-lg">
                            R$ {calc.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Resumo por Colaborador */}
                      <div className="border-t px-4 py-4">
                        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Users size={16} className="text-purple-600" />
                          Resumo por Colaborador
                        </p>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                <th className="text-left p-3 font-semibold">Colaborador</th>
                                <th className="text-right p-3 font-semibold">Total Era</th>
                                <th className="text-right p-3 font-semibold">Total Ficou</th>
                                <th className="text-right p-3 font-semibold text-emerald-600">Retroativo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {calc.colaboradores_consolidado?.map((c, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                        {c.nome?.charAt(0)}
                                      </div>
                                      <span className="font-medium text-slate-700">{c.nome}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-500">
                                    R$ {(c.total_valor_anterior || 0)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right font-mono text-indigo-600">
                                    R$ {(c.total_valor_novo || 0)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-3 text-right">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold text-sm">
                                      R$ {c.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gradient-to-r from-slate-100 to-slate-50 font-bold">
                                <td className="p-3 text-slate-700">TOTAL GERAL</td>
                                <td className="p-3 text-right font-mono text-slate-600">
                                  R$ {calc.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_anterior || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right font-mono text-indigo-700">
                                  R$ {calc.colaboradores_consolidado?.reduce((acc, c) => acc + (c.total_valor_novo || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-right">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500 text-white font-mono font-bold">
                                    R$ {calc.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dissidio;
