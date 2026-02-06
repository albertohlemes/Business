import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Scale, 
  Upload, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Calendar,
  Building2,
  DollarSign,
  Clock,
  FileText,
  History,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Gift,
  Briefcase,
  Shield,
  Users,
  Percent
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Componente para exibir uma convenção (atual ou do histórico)
const ConvencaoCard = ({ convencao, isAtual = false, isExpanded, onToggle, onRemove, removing }) => {
  const vigencia = convencao?.vigencia || {};
  const identificacao = convencao?.identificacao || {};
  const reajuste = convencao?.reajuste || {};
  const piso = convencao?.piso_salarial || {};
  const meta = convencao?._meta || {};
  
  const getStatusBadge = () => {
    const status = vigencia.status;
    if (status === 'vencida') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">VENCIDA</Badge>;
    } else if (status === 'a_vencer') {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">A VENCER</Badge>;
    } else {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">VIGENTE</Badge>;
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div 
      data-testid={`convencao-card-${isAtual ? 'atual' : 'historico'}`}
      className={`border rounded-xl overflow-hidden transition-all ${
        isAtual 
          ? 'border-blue-500/50 bg-slate-900' 
          : 'border-slate-700 bg-slate-900/50'
      }`}
    >
      {/* Header - sempre visível */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isAtual ? 'bg-blue-500/20' : 'bg-slate-700'}`}>
            <Scale size={18} className={isAtual ? 'text-blue-400' : 'text-slate-400'} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {vigencia.data_inicio || '?'} a {vigencia.data_fim || '?'}
              </span>
              {isAtual && <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">ATUAL</Badge>}
              {getStatusBadge()}
            </div>
            <p className="text-sm text-slate-400 truncate max-w-md">
              {identificacao.sindicato_laboral || 'Sindicato não identificado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {reajuste.percentual_reajuste > 0 && (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
              <Percent size={12} className="mr-1" />
              {reajuste.percentual_reajuste}%
            </Badge>
          )}
          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-700 space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              <FileText size={12} className="inline mr-1" />
              {meta.arquivo_nome || 'Arquivo não informado'}
            </span>
            <span>
              <Calendar size={12} className="inline mr-1" />
              Enviado em: {meta.data_upload ? new Date(meta.data_upload).toLocaleDateString('pt-BR') : '-'}
            </span>
          </div>

          {/* Grid de informações principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Data Base</p>
              <p className="text-sm font-medium text-white">{vigencia.data_base || '-'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Reajuste</p>
              <p className="text-sm font-medium text-emerald-400">{reajuste.percentual_reajuste || 0}% {reajuste.tipo_reajuste || ''}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Piso Geral</p>
              <p className="text-sm font-medium text-white">{formatCurrency(piso.valor_geral)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Base Territorial</p>
              <p className="text-sm font-medium text-white truncate">{identificacao.base_territorial || '-'}</p>
            </div>
          </div>

          {/* Sindicatos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Users size={12} /> Sindicato Laboral
              </p>
              <p className="text-sm text-white">{identificacao.sindicato_laboral || '-'}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Building2 size={12} /> Sindicato Patronal
              </p>
              <p className="text-sm text-white">{identificacao.sindicato_patronal || '-'}</p>
            </div>
          </div>

          {/* Pisos por função */}
          {piso.pisos_por_funcao && piso.pisos_por_funcao.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <DollarSign size={12} /> Pisos por Função
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {piso.pisos_por_funcao.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-400">{p.funcao}:</span>
                    <span className="text-white font-mono">{formatCurrency(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefícios */}
          {convencao?.beneficios && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Gift size={12} /> Benefícios
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {convencao.beneficios.vale_refeicao?.valor && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vale Refeição:</span>
                    <span className="text-white">{formatCurrency(convencao.beneficios.vale_refeicao.valor)}/dia</span>
                  </div>
                )}
                {convencao.beneficios.vale_alimentacao?.valor && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vale Alimentação:</span>
                    <span className="text-white">{formatCurrency(convencao.beneficios.vale_alimentacao.valor)}</span>
                  </div>
                )}
                {convencao.beneficios.vale_transporte?.percentual_desconto && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">VT Desconto:</span>
                    <span className="text-white">{convencao.beneficios.vale_transporte.percentual_desconto}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Jornada */}
          {convencao?.jornada_trabalho && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Clock size={12} /> Jornada de Trabalho
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Semanal:</span>
                  <span className="text-white">{convencao.jornada_trabalho.horas_semanais || 44}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">HE 50%:</span>
                  <span className="text-white">{convencao.jornada_trabalho.adicional_hora_extra_50 || 50}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">HE 100%:</span>
                  <span className="text-white">{convencao.jornada_trabalho.adicional_hora_extra_100 || 100}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Adic. Noturno:</span>
                  <span className="text-white">{convencao.jornada_trabalho.adicional_noturno || 20}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Estabilidades - simplificado para evitar erros */}
          {convencao?.estabilidades && typeof convencao.estabilidades === 'object' && (
            <div className="bg-slate-800/30 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Shield size={12} /> Estabilidades Previstas
              </p>
              <p className="text-sm text-slate-300">
                {convencao.estabilidades.gestante ? 'Gestante • ' : ''}
                {convencao.estabilidades.acidente_trabalho ? 'Acidente de Trabalho • ' : ''}
                {convencao.estabilidades.pre_aposentadoria ? 'Pré-Aposentadoria • ' : ''}
                {convencao.estabilidades.servico_militar ? 'Serviço Militar' : ''}
              </p>
            </div>
          )}

          {/* Botão remover (apenas para atual) */}
          {isAtual && onRemove && (
            <div className="pt-2 border-t border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                disabled={removing}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                {removing ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
                Remover Convenção
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente principal
const ConvencoesColetivas = ({ clienteId, convencaoAtual, historicoConvencoes = [], onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [expandedId, setExpandedId] = useState(convencaoAtual ? 'atual' : null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('convencao', acceptedFiles[0]);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/clientes/${clienteId}/convencao`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
      );
      
      console.log('Upload CCT - resposta:', response.data);
      toast.success('Convenção analisada e salva com sucesso!');
      
      if (onUpdate) {
        onUpdate({
          convencao_coletiva: response.data.convencao,
          historico_convencoes: response.data.historico || historicoConvencoes
        });
      }
      
      setExpandedId('atual');
    } catch (error) {
      console.error('Erro upload CCT:', error);
      toast.error('Erro ao processar convenção: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  }, [clienteId, onUpdate, historicoConvencoes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/plain': ['.txt']
    },
    multiple: false,
    disabled: uploading
  });

  const handleRemove = async () => {
    if (!window.confirm('Tem certeza que deseja remover a convenção coletiva atual?')) return;
    
    setRemoving(true);
    try {
      await axios.delete(`${API_URL}/api/clientes/${clienteId}/convencao`);
      toast.success('Convenção removida com sucesso!');
      if (onUpdate) {
        onUpdate({ convencao_coletiva: null });
      }
    } catch (error) {
      toast.error('Erro ao remover convenção');
    } finally {
      setRemoving(false);
    }
  };

  const temConvencoes = convencaoAtual || (historicoConvencoes && historicoConvencoes.length > 0);

  return (
    <Card className="border-slate-700 bg-slate-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Scale size={18} className="text-blue-500" />
            Convenções Coletivas de Trabalho
            {temConvencoes && (
              <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs ml-2">
                {1 + (historicoConvencoes?.length || 0)} registros
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Área de Upload */}
        <div
          {...getRootProps()}
          data-testid="cct-upload-area"
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : uploading 
              ? 'border-slate-600 bg-slate-800/50 cursor-wait'
              : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/30'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-white font-medium">Analisando convenção...</p>
              <p className="text-xs text-slate-500">Isso pode levar alguns segundos</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={28} className="text-blue-500" />
              <p className="text-white font-medium">
                {convencaoAtual ? 'Enviar Nova Convenção' : 'Enviar Convenção Coletiva'}
              </p>
              <p className="text-sm text-slate-500">PDF, imagem ou texto da CCT</p>
              <p className="text-xs text-slate-600">Arraste ou clique para selecionar</p>
            </div>
          )}
        </div>

        {/* Lista de Convenções */}
        {temConvencoes && (
          <div className="space-y-3">
            {/* Convenção Atual */}
            {convencaoAtual && (
              <ConvencaoCard
                convencao={convencaoAtual}
                isAtual={true}
                isExpanded={expandedId === 'atual'}
                onToggle={() => setExpandedId(expandedId === 'atual' ? null : 'atual')}
                onRemove={handleRemove}
                removing={removing}
              />
            )}

            {/* Histórico */}
            {historicoConvencoes && historicoConvencoes.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <History size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Histórico de Convenções</span>
                </div>
                {historicoConvencoes.map((conv, index) => (
                  <ConvencaoCard
                    key={index}
                    convencao={conv}
                    isAtual={false}
                    isExpanded={expandedId === `hist-${index}`}
                    onToggle={() => setExpandedId(expandedId === `hist-${index}` ? null : `hist-${index}`)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Mensagem quando não tem convenção */}
        {!temConvencoes && (
          <div className="text-center py-4">
            <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-slate-400">Nenhuma convenção cadastrada</p>
            <p className="text-xs text-slate-500">Faça upload da CCT para habilitar validações automáticas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConvencoesColetivas;
