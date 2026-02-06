import { useState, useEffect, useCallback } from 'react';
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
  const [expandedCalculo, setExpandedCalculo] = useState(null);
  
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
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-emerald-800">Cálculo Concluído!</h2>
                  <p className="text-emerald-600">
                    {calculoResult.meses_processados} mês(es) • {calculoResult.total_colaboradores} colaborador(es)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-emerald-600">Total Retroativo</p>
                  <p className="text-3xl font-bold text-emerald-800">
                    R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela por Colaborador */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Retroativo por Colaborador</CardTitle>
              <Button variant="outline" onClick={() => exportarExcel(calculoResult.id)}>
                <Download size={16} className="mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3">Colaborador</th>
                      <th className="text-left p-3">CPF</th>
                      <th className="text-right p-3">Total Retroativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculoResult.colaboradores_consolidado?.map((colab, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{colab.nome}</td>
                        <td className="p-3 text-slate-500">{colab.cpf || '-'}</td>
                        <td className="p-3 text-right font-mono font-medium text-emerald-600">
                          R$ {colab.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-3" colSpan={2}>TOTAL</td>
                      <td className="p-3 text-right font-mono text-emerald-700">
                        R$ {calculoResult.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cálculos Anteriores */}
      {calculosAnteriores.length > 0 && step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-slate-400" />
              Cálculos Anteriores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {calculosAnteriores.map((calc) => (
                <div key={calc.id} className="border rounded-lg">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedCalculo(expandedCalculo === calc.id ? null : calc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Percent className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <p className="font-medium">{calc.cliente_nome || getClienteName(calc.cliente_id)}</p>
                        <p className="text-sm text-slate-500">
                          {calc.percentual_reajuste}% • {calc.meses_processados} mês(es) • 
                          {new Date(calc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Total Retroativo</p>
                        <p className="font-mono font-bold text-emerald-600">
                          R$ {calc.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); exportarExcel(calc.id); }}>
                        <Download size={16} />
                      </Button>
                      {expandedCalculo === calc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  
                  {expandedCalculo === calc.id && (
                    <div className="border-t p-4 bg-slate-50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-xs">
                            <th className="text-left pb-2">Colaborador</th>
                            <th className="text-right pb-2">Retroativo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calc.colaboradores_consolidado?.slice(0, 10).map((c, i) => (
                            <tr key={i}>
                              <td className="py-1">{c.nome}</td>
                              <td className="py-1 text-right font-mono">
                                R$ {c.total_retroativo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          {calc.colaboradores_consolidado?.length > 10 && (
                            <tr>
                              <td colSpan={2} className="py-1 text-slate-400 text-center text-xs">
                                ... e mais {calc.colaboradores_consolidado.length - 10} colaborador(es)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
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
