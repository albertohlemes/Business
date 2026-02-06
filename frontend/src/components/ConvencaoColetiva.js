import { useState, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { 
  FileText, Upload, Loader2, ChevronDown, ChevronUp, Trash2,
  Calendar, DollarSign, Users, Clock, Shield, AlertTriangle,
  CheckCircle2, Building2, Scale, Briefcase, Heart, Bus, Coffee,
  Gift, FileCheck, XCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Componente de Card Expansível
const ExpandableCard = ({ title, icon: Icon, color, children, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon size={18} />
          </div>
          <span className="font-medium text-white">{title}</span>
          {badge && (
            <Badge variant="outline" className={badge.className}>
              {badge.text}
            </Badge>
          )}
        </div>
        {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-slate-900/50 border-t border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
};

// Componente de Item de Detalhe
const DetailItem = ({ label, value, highlight = false }) => (
  <div className="flex justify-between py-1.5 border-b border-slate-800 last:border-0">
    <span className="text-slate-500 text-sm">{label}</span>
    <span className={`text-sm ${highlight ? 'text-emerald-400 font-medium' : 'text-white'}`}>
      {value || '-'}
    </span>
  </div>
);

const ConvencaoColetiva = ({ clienteId, convencao, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

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
      
      toast.success('Convenção analisada e salva com sucesso!');
      if (onUpdate) onUpdate(response.data.convencao);
    } catch (error) {
      toast.error('Erro ao processar convenção: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  }, [clienteId, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  const handleRemove = async () => {
    if (!window.confirm('Tem certeza que deseja remover a convenção coletiva?')) return;
    
    setRemoving(true);
    try {
      await axios.delete(`${API_URL}/api/clientes/${clienteId}/convencao`);
      toast.success('Convenção removida com sucesso!');
      if (onUpdate) onUpdate(null);
    } catch (error) {
      toast.error('Erro ao remover convenção');
    } finally {
      setRemoving(false);
    }
  };

  // Se não tem convenção, mostrar área de upload
  if (!convencao) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Scale size={18} className="text-blue-500" />
            Convenção Coletiva de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-white">Analisando convenção com IA...</p>
                <p className="text-xs text-slate-500">Isso pode levar alguns segundos</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-blue-500">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Upload da Convenção Coletiva</p>
                  <p className="text-sm text-slate-500">PDF da CCT vigente</p>
                </div>
                <p className="text-xs text-slate-600">Clique ou arraste o arquivo aqui</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tem convenção - mostrar dados extraídos
  const { identificacao, vigencia, reajuste, piso_salarial, beneficios, jornada_trabalho, descontos_autorizados, estabilidades, rescisao, ferias, clausulas_especiais, penalidades, _meta } = convencao;

  // Determinar cor do status
  const getStatusBadge = () => {
    const status = vigencia?.status;
    if (status === 'vencida') return { text: 'VENCIDA', className: 'border-red-500 text-red-400 bg-red-500/10' };
    if (status === 'a_vencer' || status === 'critico') return { text: `Vence em ${vigencia?.dias_restantes} dias`, className: 'border-amber-500 text-amber-400 bg-amber-500/10' };
    if (status === 'vigente') return { text: 'VIGENTE', className: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' };
    return { text: 'Status desconhecido', className: 'border-slate-500 text-slate-400' };
  };

  const statusBadge = getStatusBadge();

  return (
    <Card className="border-slate-700 bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Scale size={18} className="text-blue-500" />
            Convenção Coletiva de Trabalho
            <Badge variant="outline" className={statusBadge.className}>
              {statusBadge.text}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <Button variant="outline" size="sm" className="border-slate-700" disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                <span className="ml-1">Atualizar</span>
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            </Button>
          </div>
        </div>
        {_meta && (
          <p className="text-xs text-slate-500 mt-2">
            Arquivo: {_meta.arquivo_nome} • Enviado em: {new Date(_meta.data_upload).toLocaleDateString('pt-BR')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-4 space-y-3">
        {/* Cards principais em destaque */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Vigência */}
          <div className={`p-4 rounded-lg border ${vigencia?.status === 'vencida' ? 'border-red-500/50 bg-red-500/5' : vigencia?.status === 'a_vencer' ? 'border-amber-500/50 bg-amber-500/5' : 'border-emerald-500/50 bg-emerald-500/5'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className={vigencia?.status === 'vencida' ? 'text-red-400' : vigencia?.status === 'a_vencer' ? 'text-amber-400' : 'text-emerald-400'} />
              <span className="text-sm text-slate-400">Vigência</span>
            </div>
            <p className="text-white font-medium">{vigencia?.data_inicio} a {vigencia?.data_fim}</p>
            <p className="text-xs text-slate-500 mt-1">Data base: {vigencia?.data_base}</p>
          </div>
          
          {/* Reajuste */}
          <div className="p-4 rounded-lg border border-blue-500/50 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-blue-400" />
              <span className="text-sm text-slate-400">Reajuste</span>
            </div>
            <p className="text-white font-medium text-xl">{reajuste?.percentual_reajuste}%</p>
            <p className="text-xs text-slate-500 mt-1">{reajuste?.tipo_reajuste} {reajuste?.retroativo ? '• Retroativo' : ''}</p>
          </div>
          
          {/* Piso Salarial */}
          <div className="p-4 rounded-lg border border-purple-500/50 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-purple-400" />
              <span className="text-sm text-slate-400">Piso Salarial</span>
            </div>
            <p className="text-white font-medium text-xl">R$ {piso_salarial?.valor_geral?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-1">{piso_salarial?.pisos_por_funcao?.length || 0} pisos específicos</p>
          </div>
        </div>

        {/* Sindicato */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-slate-400" />
            <span className="text-sm text-slate-400">Sindicato</span>
          </div>
          <p className="text-white font-medium">{identificacao?.sindicato_laboral}</p>
          <p className="text-xs text-slate-500 mt-1">Base: {identificacao?.base_territorial}</p>
        </div>

        {/* Cards expansíveis */}
        <div className="space-y-2 pt-2">
          {/* Benefícios */}
          <ExpandableCard title="Benefícios" icon={Gift} color="bg-emerald-500/20 text-emerald-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {beneficios?.vale_refeicao?.valor > 0 && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Coffee size={14} className="text-orange-400" />
                    <span className="text-sm text-white">Vale Refeição</span>
                  </div>
                  <p className="text-lg font-medium text-emerald-400">R$ {beneficios.vale_refeicao.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500">Desconto: {beneficios.vale_refeicao.desconto_permitido}</p>
                </div>
              )}
              {beneficios?.vale_alimentacao?.valor > 0 && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift size={14} className="text-green-400" />
                    <span className="text-sm text-white">Vale Alimentação</span>
                  </div>
                  <p className="text-lg font-medium text-emerald-400">R$ {beneficios.vale_alimentacao.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-500">Desconto: {beneficios.vale_alimentacao.desconto_permitido}</p>
                </div>
              )}
              {beneficios?.vale_transporte && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Bus size={14} className="text-blue-400" />
                    <span className="text-sm text-white">Vale Transporte</span>
                  </div>
                  <p className="text-sm text-white">Desconto máximo: {beneficios.vale_transporte.desconto_maximo}</p>
                </div>
              )}
              {beneficios?.plano_saude?.tipo && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart size={14} className="text-red-400" />
                    <span className="text-sm text-white">Plano de Saúde</span>
                  </div>
                  <p className="text-sm text-white">{beneficios.plano_saude.tipo}</p>
                  <p className="text-xs text-slate-500">{beneficios.plano_saude.observacoes}</p>
                </div>
              )}
              {beneficios?.seguro_vida?.valor_minimo > 0 && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className="text-purple-400" />
                    <span className="text-sm text-white">Seguro de Vida</span>
                  </div>
                  <p className="text-lg font-medium text-emerald-400">R$ {beneficios.seguro_vida.valor_minimo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              {beneficios?.cesta_basica?.valor > 0 && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift size={14} className="text-amber-400" />
                    <span className="text-sm text-white">Cesta Básica</span>
                  </div>
                  <p className="text-lg font-medium text-emerald-400">R$ {beneficios.cesta_basica.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </ExpandableCard>

          {/* Jornada de Trabalho */}
          <ExpandableCard title="Jornada de Trabalho" icon={Clock} color="bg-blue-500/20 text-blue-400">
            <div className="space-y-2">
              <DetailItem label="Carga Horária Semanal" value={`${jornada_trabalho?.carga_horaria_semanal}h`} />
              <DetailItem label="Carga Horária Mensal" value={`${jornada_trabalho?.carga_horaria_mensal}h`} />
              <DetailItem label="Intervalo Mínimo" value={jornada_trabalho?.intervalo_minimo} />
              <DetailItem label="Hora Extra 50%" value={`${jornada_trabalho?.hora_extra_50?.percentual}%`} highlight />
              <DetailItem label="Hora Extra 100%" value={`${jornada_trabalho?.hora_extra_100?.percentual}% - ${jornada_trabalho?.hora_extra_100?.observacoes}`} highlight />
              <DetailItem label="Adicional Noturno" value={`${jornada_trabalho?.adicional_noturno?.percentual}% (${jornada_trabalho?.adicional_noturno?.horario})`} highlight />
              {jornada_trabalho?.banco_horas?.permitido && (
                <DetailItem label="Banco de Horas" value={`Permitido - Compensar em ${jornada_trabalho?.banco_horas?.prazo_compensacao}`} />
              )}
            </div>
          </ExpandableCard>

          {/* Pisos por Função */}
          {piso_salarial?.pisos_por_funcao?.length > 0 && (
            <ExpandableCard title="Pisos Salariais por Função" icon={Users} color="bg-purple-500/20 text-purple-400">
              <div className="space-y-2">
                {piso_salarial.pisos_por_funcao.map((piso, i) => (
                  <DetailItem key={i} label={piso.funcao} value={`R$ ${piso.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight />
                ))}
              </div>
            </ExpandableCard>
          )}

          {/* Tabela de Proporcionalidade */}
          {reajuste?.tabela_proporcionalidade?.length > 0 && (
            <ExpandableCard title="Tabela de Proporcionalidade" icon={Calendar} color="bg-amber-500/20 text-amber-400">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {reajuste.tabela_proporcionalidade.map((item, i) => (
                  <div key={i} className="p-2 bg-slate-800/50 rounded text-center">
                    <p className="text-xs text-slate-500">{item.mes_admissao}</p>
                    <p className="text-white font-medium">{item.percentual}%</p>
                  </div>
                ))}
              </div>
            </ExpandableCard>
          )}

          {/* Estabilidades */}
          <ExpandableCard title="Estabilidades" icon={Shield} color="bg-red-500/20 text-red-400">
            <div className="space-y-2">
              {estabilidades?.gestante && (
                <DetailItem label="Gestante" value={`${estabilidades.gestante.meses_apos_parto} meses após parto`} />
              )}
              {estabilidades?.acidente_trabalho && (
                <DetailItem label="Acidente de Trabalho" value={`${estabilidades.acidente_trabalho.meses_apos_alta} meses após alta`} />
              )}
              {estabilidades?.pre_aposentadoria && (
                <DetailItem label="Pré-aposentadoria" value={`${estabilidades.pre_aposentadoria.meses_antes} meses antes (mín. ${estabilidades.pre_aposentadoria.tempo_minimo_empresa})`} />
              )}
            </div>
          </ExpandableCard>

          {/* Rescisão */}
          <ExpandableCard title="Rescisão" icon={FileCheck} color="bg-orange-500/20 text-orange-400">
            <div className="space-y-2">
              {rescisao?.aviso_previo_adicional && (
                <DetailItem 
                  label="Aviso Prévio Adicional" 
                  value={`${rescisao.aviso_previo_adicional.dias_por_ano} dias por ano (máx. ${rescisao.aviso_previo_adicional.limite_maximo} dias)`} 
                  highlight 
                />
              )}
              {rescisao?.multa_adicional_rescisao?.valor > 0 && (
                <DetailItem 
                  label="Multa Adicional" 
                  value={`R$ ${rescisao.multa_adicional_rescisao.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                />
              )}
              {rescisao?.homologacao && (
                <DetailItem 
                  label="Homologação Sindicato" 
                  value={rescisao.homologacao.obrigatoria_sindicato ? 'Obrigatória' : 'Não obrigatória'} 
                />
              )}
            </div>
          </ExpandableCard>

          {/* Descontos Autorizados */}
          <ExpandableCard title="Descontos Autorizados" icon={DollarSign} color="bg-slate-500/20 text-slate-400">
            <div className="space-y-2">
              {descontos_autorizados?.contribuicao_sindical && (
                <DetailItem 
                  label="Contribuição Sindical" 
                  value={descontos_autorizados.contribuicao_sindical.obrigatoria ? 'Obrigatória' : 'Opcional'} 
                />
              )}
              {descontos_autorizados?.contribuicao_assistencial?.valor > 0 && (
                <DetailItem 
                  label="Contribuição Assistencial" 
                  value={`R$ ${descontos_autorizados.contribuicao_assistencial.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${descontos_autorizados.contribuicao_assistencial.periodicidade}`} 
                />
              )}
              {descontos_autorizados?.taxa_negocial?.valor > 0 && (
                <DetailItem 
                  label="Taxa Negocial" 
                  value={`R$ ${descontos_autorizados.taxa_negocial.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                />
              )}
            </div>
          </ExpandableCard>

          {/* Cláusulas Especiais */}
          {clausulas_especiais?.length > 0 && (
            <ExpandableCard title="Cláusulas Especiais" icon={FileText} color="bg-cyan-500/20 text-cyan-400">
              <div className="space-y-3">
                {clausulas_especiais.map((clausula, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg">
                    <p className="text-white font-medium mb-1">{clausula.titulo}</p>
                    <p className="text-sm text-slate-400">{clausula.resumo}</p>
                    {clausula.detalhes && (
                      <p className="text-xs text-slate-500 mt-2 italic">{clausula.detalhes}</p>
                    )}
                  </div>
                ))}
              </div>
            </ExpandableCard>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConvencaoColetiva;
