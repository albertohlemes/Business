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
  CheckCircle2,
  AlertTriangle,
  Gift,
  Briefcase,
  Shield,
  Users,
  Percent,
  Ban,
  FileWarning,
  Heart,
  Car,
  Baby,
  Stethoscope,
  GraduationCap,
  Home,
  AlertCircle,
  Info,
  BookOpen,
  Gavel,
  UserX,
  CalendarOff,
  Umbrella,
  Coffee,
  Moon,
  Sun,
  Banknote,
  Award,
  Plane,
  Download
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper para formatar moeda
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Helper para extrair valor de objeto ou primitivo
const getValue = (obj, ...paths) => {
  for (const path of paths) {
    const keys = path.split('.');
    let val = obj;
    for (const key of keys) {
      val = val?.[key];
      if (val === undefined || val === null) break;
    }
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return null;
};

// Componente de seção expansível
const Section = ({ title, icon: Icon, color = 'bg-slate-700', children, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${color}`}>
            <Icon size={14} className="text-white" />
          </div>
          <span className="font-medium text-white text-sm">{title}</span>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-3 bg-slate-900/50 border-t border-slate-700 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

// Item de informação
const InfoItem = ({ label, value, highlight = false, className = '' }) => {
  if (!value && value !== 0) return null;
  
  // Se for objeto, tentar converter - ignorar objetos vazios ou só com nulls
  let displayValue = value;
  if (typeof value === 'object' && value !== null) {
    // Verificar se tem algum valor útil
    const val = value.valor || value.percentual || value.dias || value.meses;
    if (val !== undefined && val !== null) {
      displayValue = val;
    } else {
      // Verificar se todos os valores são null/undefined
      const hasValue = Object.values(value).some(v => v !== null && v !== undefined && v !== '');
      if (!hasValue) return null;
      // Tentar serializar apenas se tiver algo útil
      const filtered = Object.fromEntries(
        Object.entries(value).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );
      if (Object.keys(filtered).length === 0) return null;
      displayValue = JSON.stringify(filtered);
    }
  }
  
  return (
    <div className={`flex justify-between items-start gap-2 text-sm ${className}`}>
      <span className="text-slate-400 shrink-0">{label}:</span>
      <span className={`text-right ${highlight ? 'text-emerald-400 font-medium' : 'text-white'}`}>
        {displayValue}
      </span>
    </div>
  );
};

// Grid de informações
const InfoGrid = ({ children, cols = 2 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-2`}>
    {children}
  </div>
);

// Componente para uma convenção
const ConvencaoDetalhada = ({ convencao, isAtual, isExpanded, onToggle, onRemove, removing }) => {
  const vigencia = convencao?.vigencia || {};
  const identificacao = convencao?.identificacao || {};
  const reajuste = convencao?.reajuste_salarial || convencao?.reajuste || {};
  const pisos = convencao?.pisos_salariais || convencao?.piso_salarial || {};
  const beneficios = convencao?.beneficios || {};
  const jornada = convencao?.jornada_trabalho || {};
  const descontos = convencao?.descontos || convencao?.descontos_autorizados || {};
  const estabilidades = convencao?.estabilidades_garantias || convencao?.estabilidades || {};
  const rescisao = convencao?.rescisao_contrato || convencao?.rescisao || {};
  const ferias = convencao?.ferias || {};
  const licencas = convencao?.licencas_afastamentos || {};
  const saude = convencao?.saude_seguranca || {};
  const penalidades = convencao?.penalidades_multas || convencao?.penalidades || {};
  const clausulas = convencao?.clausulas_especiais || [];
  const alertas = convencao?.alertas_importantes || [];
  const meta = convencao?._meta || {};

  const getStatusColor = () => {
    const status = vigencia.status;
    if (status === 'vencida') return 'bg-red-500';
    if (status === 'a_vencer') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusText = () => {
    const status = vigencia.status;
    if (status === 'vencida') return 'VENCIDA';
    if (status === 'a_vencer') return 'A VENCER';
    return 'VIGENTE';
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isAtual ? 'border-blue-500/50 bg-slate-900' : 'border-slate-700 bg-slate-900/50'
    }`}>
      {/* Header */}
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">
                {vigencia.data_inicio || '?'} a {vigencia.data_fim || '?'}
              </span>
              {isAtual && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">ATUAL</Badge>}
              <Badge className={`${getStatusColor()}/20 text-white border-${getStatusColor()}/30 text-xs`}>
                {getStatusText()}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 truncate max-w-md">
              {identificacao.sindicato_laboral || 'Sindicato não identificado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(reajuste.percentual || reajuste.percentual_reajuste) > 0 && (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
              {reajuste.percentual || reajuste.percentual_reajuste}%
            </Badge>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-700 space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Alertas importantes */}
          {alertas && alertas.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="font-medium text-red-400 text-sm">Alertas Importantes</span>
              </div>
              <ul className="space-y-1">
                {alertas.map((alerta, i) => (
                  <li key={i} className="text-sm text-red-300 flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    {typeof alerta === 'string' ? alerta : alerta.texto || JSON.stringify(alerta)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-800">
            <span><FileText size={12} className="inline mr-1" />{meta.arquivo_nome || 'Arquivo'}</span>
            <span><Calendar size={12} className="inline mr-1" />Enviado: {meta.data_upload ? new Date(meta.data_upload).toLocaleDateString('pt-BR') : '-'}</span>
          </div>

          {/* Resumo rápido */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Data Base</p>
              <p className="text-lg font-bold text-white">{vigencia.data_base || '-'}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Reajuste</p>
              <p className="text-lg font-bold text-emerald-400">{reajuste.percentual || reajuste.percentual_reajuste || 0}%</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Piso Geral</p>
              <p className="text-lg font-bold text-white">{formatCurrency(pisos.piso_geral || pisos.valor_geral)}</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500">Jornada</p>
              <p className="text-lg font-bold text-white">{jornada.carga_horaria_semanal || 44}h/sem</p>
            </div>
          </div>

          {/* Identificação */}
          <Section title="Identificação e Abrangência" icon={Building2} color="bg-blue-600" defaultOpen>
            <InfoGrid cols={2}>
              <InfoItem label="Sindicato Laboral" value={identificacao.sindicato_laboral} />
              <InfoItem label="Sindicato Patronal" value={identificacao.sindicato_patronal} />
              <InfoItem label="CNPJ Laboral" value={identificacao.cnpj_sindicato_laboral} />
              <InfoItem label="CNPJ Patronal" value={identificacao.cnpj_sindicato_patronal} />
              <InfoItem label="Abrangência" value={identificacao.abrangencia} />
              <InfoItem label="Base Territorial" value={identificacao.base_territorial} />
              <InfoItem label="Empresas Abrangidas" value={identificacao.empresas_abrangidas} />
            </InfoGrid>
          </Section>

          {/* Reajuste e Pisos */}
          <Section title="Reajuste Salarial e Pisos" icon={DollarSign} color="bg-emerald-600" defaultOpen>
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Percentual</p>
                    <p className="text-emerald-400 font-bold text-lg">{reajuste.percentual || reajuste.percentual_reajuste || 0}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Tipo</p>
                    <p className="text-white">{reajuste.tipo || reajuste.tipo_reajuste || 'Linear'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Data Aplicação</p>
                    <p className="text-white">{reajuste.data_aplicacao || vigencia.data_inicio || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Retroativo</p>
                    <p className="text-white">{reajuste.retroativo ? `Sim - ${reajuste.data_retroativo || ''}` : 'Não'}</p>
                  </div>
                </div>
                {reajuste.forma_calculo && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20">
                    <p className="text-xs text-slate-400">Forma de Cálculo:</p>
                    <p className="text-sm text-white">{reajuste.forma_calculo}</p>
                  </div>
                )}
              </div>

              {/* Pisos */}
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Pisos Salariais</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="bg-slate-700/50 rounded p-2">
                    <p className="text-xs text-slate-500">Piso Geral</p>
                    <p className="font-bold text-white">{formatCurrency(pisos.piso_geral || pisos.valor_geral)}</p>
                  </div>
                  {pisos.piso_geral_hora && (
                    <div className="bg-slate-700/50 rounded p-2">
                      <p className="text-xs text-slate-500">Piso/Hora</p>
                      <p className="font-bold text-white">{formatCurrency(pisos.piso_geral_hora)}</p>
                    </div>
                  )}
                </div>
                
                {/* Pisos por função */}
                {(pisos.pisos_por_funcao?.length > 0) && (
                  <div className="mt-3">
                    <p className="text-xs text-slate-400 mb-2">Por Função/Cargo:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {pisos.pisos_por_funcao.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-700/30 rounded px-2 py-1">
                          <span className="text-sm text-slate-300">{p.funcao || p.cargo}</span>
                          <span className="font-mono text-emerald-400">{formatCurrency(p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {(pisos.observacoes || pisos.observacoes_piso) && (
                  <p className="text-xs text-slate-500 mt-2 italic">{pisos.observacoes || pisos.observacoes_piso}</p>
                )}
              </div>

              {/* Tabela de proporcionalidade */}
              {reajuste.tabela_proporcionalidade?.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Tabela de Proporcionalidade (por mês de admissão):</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                    {reajuste.tabela_proporcionalidade.map((t, i) => (
                      <div key={i} className="text-center bg-slate-700/30 rounded p-1">
                        <p className="text-xs text-slate-400">{t.mes_admissao?.substring(0, 3)}</p>
                        <p className="text-sm font-bold text-white">{t.percentual}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Benefícios */}
          <Section title="Benefícios" icon={Gift} color="bg-purple-600" badge={Object.keys(beneficios).filter(k => beneficios[k]?.valor || beneficios[k]?.valor_diario).length + ' itens'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Vale Refeição */}
              {(beneficios.vale_refeicao?.valor || beneficios.vale_refeicao?.valor_diario) && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee size={14} className="text-orange-400" />
                    <span className="text-sm font-medium text-white">Vale Refeição</span>
                  </div>
                  <InfoItem label="Valor" value={formatCurrency(beneficios.vale_refeicao.valor || beneficios.vale_refeicao.valor_diario)} highlight />
                  <InfoItem label="Dias" value={beneficios.vale_refeicao.dias_pagos} />
                  <InfoItem label="Desconto" value={beneficios.vale_refeicao.desconto_permitido} />
                  {beneficios.vale_refeicao.observacoes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beneficios.vale_refeicao.observacoes}</p>
                  )}
                </div>
              )}

              {/* Vale Alimentação */}
              {beneficios.vale_alimentacao?.valor && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Home size={14} className="text-green-400" />
                    <span className="text-sm font-medium text-white">Vale Alimentação</span>
                  </div>
                  <InfoItem label="Valor" value={formatCurrency(beneficios.vale_alimentacao.valor)} highlight />
                  <InfoItem label="Periodicidade" value={beneficios.vale_alimentacao.periodicidade} />
                  <InfoItem label="Desconto" value={beneficios.vale_alimentacao.desconto_permitido} />
                  {beneficios.vale_alimentacao.observacoes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beneficios.vale_alimentacao.observacoes}</p>
                  )}
                </div>
              )}

              {/* Cesta Básica */}
              {beneficios.cesta_basica?.valor && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift size={14} className="text-yellow-400" />
                    <span className="text-sm font-medium text-white">Cesta Básica</span>
                  </div>
                  <InfoItem label="Valor" value={formatCurrency(beneficios.cesta_basica.valor)} highlight />
                  <InfoItem label="Tipo" value={beneficios.cesta_basica.tipo} />
                  <InfoItem label="Condições" value={beneficios.cesta_basica.condicoes} />
                </div>
              )}

              {/* Vale Transporte */}
              {beneficios.vale_transporte && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Car size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-white">Vale Transporte</span>
                  </div>
                  <InfoItem label="Desconto Máximo" value={beneficios.vale_transporte.desconto_maximo || '6%'} />
                  <InfoItem label="Base Cálculo" value={beneficios.vale_transporte.base_calculo} />
                  {beneficios.vale_transporte.observacoes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beneficios.vale_transporte.observacoes}</p>
                  )}
                </div>
              )}

              {/* Plano de Saúde */}
              {beneficios.plano_saude && (beneficios.plano_saude.tipo || beneficios.plano_saude.obrigatorio) && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={14} className="text-red-400" />
                    <span className="text-sm font-medium text-white">Plano de Saúde</span>
                  </div>
                  <InfoItem label="Obrigatório" value={beneficios.plano_saude.obrigatorio ? 'Sim' : 'Não'} />
                  <InfoItem label="Tipo" value={beneficios.plano_saude.tipo} />
                  <InfoItem label="Coparticipação" value={beneficios.plano_saude.coparticipacao} />
                  <InfoItem label="Manutenção Demitidos" value={beneficios.plano_saude.manutencao_demitidos} />
                  {beneficios.plano_saude.observacoes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beneficios.plano_saude.observacoes}</p>
                  )}
                </div>
              )}

              {/* Seguro de Vida */}
              {beneficios.seguro_vida && (beneficios.seguro_vida.valor_cobertura_minimo || beneficios.seguro_vida.valor_minimo) && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Umbrella size={14} className="text-cyan-400" />
                    <span className="text-sm font-medium text-white">Seguro de Vida</span>
                  </div>
                  <InfoItem label="Cobertura Mínima" value={formatCurrency(beneficios.seguro_vida.valor_cobertura_minimo || beneficios.seguro_vida.valor_minimo)} />
                  <InfoItem label="Coberturas" value={beneficios.seguro_vida.coberturas} />
                  <InfoItem label="Custeio" value={beneficios.seguro_vida.custeio} />
                </div>
              )}

              {/* Auxílio Creche */}
              {beneficios.auxilio_creche?.valor && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Baby size={14} className="text-pink-400" />
                    <span className="text-sm font-medium text-white">Auxílio Creche</span>
                  </div>
                  <InfoItem label="Valor" value={formatCurrency(beneficios.auxilio_creche.valor)} highlight />
                  <InfoItem label="Idade Limite" value={beneficios.auxilio_creche.idade_limite} />
                </div>
              )}

              {/* Auxílio Educação */}
              {beneficios.auxilio_educacao?.valor && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap size={14} className="text-indigo-400" />
                    <span className="text-sm font-medium text-white">Auxílio Educação</span>
                  </div>
                  <InfoItem label="Valor" value={formatCurrency(beneficios.auxilio_educacao.valor)} highlight />
                  <InfoItem label="Níveis" value={beneficios.auxilio_educacao.niveis_cobertos} />
                </div>
              )}

              {/* Auxílio Funeral */}
              {(beneficios.auxilio_funeral?.valor || beneficios.auxilio_funeral?.calculo) && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={14} className="text-gray-400" />
                    <span className="text-sm font-medium text-white">Auxílio Funeral</span>
                  </div>
                  <InfoItem label="Valor" value={beneficios.auxilio_funeral.valor ? formatCurrency(beneficios.auxilio_funeral.valor) : beneficios.auxilio_funeral.calculo} highlight />
                  <InfoItem label="Beneficiários" value={beneficios.auxilio_funeral.beneficiarios} />
                  {beneficios.auxilio_funeral.observacoes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beneficios.auxilio_funeral.observacoes}</p>
                  )}
                </div>
              )}

              {/* Auxílio Filho Excepcional */}
              {beneficios.auxilio_filho_excepcional?.valor && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={14} className="text-rose-400" />
                    <span className="text-sm font-medium text-white">Auxílio Filho Excepcional</span>
                  </div>
                  <InfoItem label="Valor" value={formatCurrency(beneficios.auxilio_filho_excepcional.valor)} highlight />
                  {beneficios.auxilio_filho_excepcional.observacoes && (
                    <p className="text-xs text-slate-500 mt-1 italic">{beneficios.auxilio_filho_excepcional.observacoes}</p>
                  )}
                </div>
              )}

              {/* Diárias de Viagem */}
              {beneficios.diarias_viagem && (beneficios.diarias_viagem.almoco || beneficios.diarias_viagem.jantar || beneficios.diarias_viagem.pernoite) && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Car size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-white">Diárias de Viagem</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {beneficios.diarias_viagem.almoco && (
                      <div>
                        <p className="text-xs text-slate-500">Almoço</p>
                        <p className="text-emerald-400 font-medium">{formatCurrency(beneficios.diarias_viagem.almoco)}</p>
                      </div>
                    )}
                    {beneficios.diarias_viagem.jantar && (
                      <div>
                        <p className="text-xs text-slate-500">Jantar</p>
                        <p className="text-emerald-400 font-medium">{formatCurrency(beneficios.diarias_viagem.jantar)}</p>
                      </div>
                    )}
                    {beneficios.diarias_viagem.pernoite && (
                      <div>
                        <p className="text-xs text-slate-500">Pernoite</p>
                        <p className="text-emerald-400 font-medium">{formatCurrency(beneficios.diarias_viagem.pernoite)}</p>
                      </div>
                    )}
                  </div>
                  {beneficios.diarias_viagem.observacoes && (
                    <p className="text-xs text-slate-500 mt-2 italic">{beneficios.diarias_viagem.observacoes}</p>
                  )}
                </div>
              )}

              {/* Prêmio por Tempo de Serviço - DESTAQUE */}
              {beneficios.premio_tempo_servico?.possui && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Award size={16} className="text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Prêmio por Tempo de Serviço (PTS)</span>
                  </div>
                  {beneficios.premio_tempo_servico.tabela?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      {beneficios.premio_tempo_servico.tabela.map((t, i) => (
                        <div key={i} className="bg-slate-800/50 rounded p-2 text-center">
                          <p className="text-xs text-slate-400">{t.anos} anos</p>
                          <p className="text-amber-400 font-bold">{t.percentual}%</p>
                          {t.valor_limite > 0 && <p className="text-xs text-slate-500">Limite: {formatCurrency(t.valor_limite)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  <InfoItem label="Base de Cálculo" value={beneficios.premio_tempo_servico.base_calculo} />
                  <InfoItem label="Limite" value={beneficios.premio_tempo_servico.limite_valor} />
                  <InfoItem label="Pagamento" value={beneficios.premio_tempo_servico.forma_pagamento} />
                  {beneficios.premio_tempo_servico.observacoes && (
                    <p className="text-xs text-slate-500 mt-2 italic">{beneficios.premio_tempo_servico.observacoes}</p>
                  )}
                </div>
              )}

              {/* PLR - Participação nos Lucros - DESTAQUE */}
              {beneficios.plr_participacao_lucros?.possui && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Participação nos Lucros e Resultados (PLR)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                    <div className="bg-slate-800/50 rounded p-2">
                      <p className="text-xs text-slate-400">Valor Anual</p>
                      <p className="text-emerald-400 font-bold text-lg">{formatCurrency(beneficios.plr_participacao_lucros.valor_anual)}</p>
                    </div>
                    {beneficios.plr_participacao_lucros.parcelas?.map((p, i) => (
                      <div key={i} className="bg-slate-800/50 rounded p-2">
                        <p className="text-xs text-slate-400">{p.mes}</p>
                        <p className="text-white font-medium">{formatCurrency(p.valor)}</p>
                      </div>
                    ))}
                  </div>
                  <InfoItem label="Critérios" value={beneficios.plr_participacao_lucros.criterios} />
                  <InfoItem label="Proporcionalidade" value={beneficios.plr_participacao_lucros.proporcionalidade} />
                  <InfoItem label="Desconto Sindical" value={beneficios.plr_participacao_lucros.descontos_sindicais} />
                  {beneficios.plr_participacao_lucros.observacoes && (
                    <p className="text-xs text-slate-500 mt-2 italic">{beneficios.plr_participacao_lucros.observacoes}</p>
                  )}
                </div>
              )}

              {/* Adicional Periculosidade */}
              {beneficios.adicional_periculosidade?.percentual && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-sm font-medium text-red-400">Adicional Periculosidade</span>
                  </div>
                  <InfoItem label="Percentual" value={`${beneficios.adicional_periculosidade.percentual}%`} highlight />
                  <InfoItem label="Funções" value={beneficios.adicional_periculosidade.funcoes_aplicaveis} />
                  <InfoItem label="Base" value={beneficios.adicional_periculosidade.base_calculo} />
                </div>
              )}

              {/* Adicional Insalubridade */}
              {beneficios.adicional_insalubridade && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-orange-400" />
                    <span className="text-sm font-medium text-orange-400">Adicional Insalubridade</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-slate-500">Mínimo</p>
                      <p className="text-white">{beneficios.adicional_insalubridade.percentual_minimo || 10}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Médio</p>
                      <p className="text-white">{beneficios.adicional_insalubridade.percentual_medio || 20}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Máximo</p>
                      <p className="text-white">{beneficios.adicional_insalubridade.percentual_maximo || 40}%</p>
                    </div>
                  </div>
                  <InfoItem label="Base" value={beneficios.adicional_insalubridade.base_calculo} />
                </div>
              )}

              {/* Outros benefícios - tratando string e objeto */}
              {beneficios.outros_beneficios?.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-3 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-white">Outros Benefícios</span>
                  </div>
                  <ul className="space-y-1">
                    {beneficios.outros_beneficios.map((b, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        <span>{typeof b === 'string' ? b : (b.nome ? `${b.nome}: ${b.valor ? formatCurrency(b.valor) : ''} ${b.condicoes || ''} ${b.observacoes || ''}` : JSON.stringify(b))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          {/* Jornada de Trabalho */}
          <Section title="Jornada de Trabalho" icon={Clock} color="bg-amber-600">
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-slate-800 rounded p-2 text-center">
                  <p className="text-xs text-slate-400">Semanal</p>
                  <p className="font-bold text-white">{jornada.carga_horaria_semanal || 44}h</p>
                </div>
                <div className="bg-slate-800 rounded p-2 text-center">
                  <p className="text-xs text-slate-400">Mensal</p>
                  <p className="font-bold text-white">{jornada.carga_horaria_mensal || 220}h</p>
                </div>
                <div className="bg-slate-800 rounded p-2 text-center">
                  <p className="text-xs text-slate-400">Diária</p>
                  <p className="font-bold text-white">{jornada.carga_horaria_diaria || '8h'}</p>
                </div>
                <div className="bg-slate-800 rounded p-2 text-center">
                  <p className="text-xs text-slate-400">Intervalo</p>
                  <p className="font-bold text-white">
                    {typeof jornada.intervalo_refeicao === 'object' 
                      ? (jornada.intervalo_refeicao?.minimo || '1h')
                      : (jornada.intervalo_minimo || '1h')}
                  </p>
                </div>
              </div>

              {/* Banco de Horas */}
              {jornada.banco_horas && typeof jornada.banco_horas === 'object' && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-white">Banco de Horas</span>
                    <Badge variant="outline" className={jornada.banco_horas.permitido ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}>
                      {jornada.banco_horas.permitido ? 'Permitido' : 'Não Permitido'}
                    </Badge>
                  </div>
                  {jornada.banco_horas.permitido && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {jornada.banco_horas.prazo_compensacao && (
                        <div>
                          <p className="text-slate-400 text-xs">Compensação</p>
                          <p className="text-white">{jornada.banco_horas.prazo_compensacao}</p>
                        </div>
                      )}
                      {jornada.banco_horas.acordo_individual && (
                        <div>
                          <p className="text-slate-400 text-xs">Acordo Individual</p>
                          <p className="text-white">{jornada.banco_horas.acordo_individual}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Escala e Trabalho aos Domingos/Feriados */}
              {(jornada.escala_permitida || jornada.trabalho_aos_domingos || jornada.trabalho_aos_feriados) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {jornada.escala_permitida && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-xs text-slate-400">Escalas Permitidas</p>
                      <p className="text-white text-sm">{jornada.escala_permitida}</p>
                    </div>
                  )}
                  {jornada.trabalho_aos_domingos && typeof jornada.trabalho_aos_domingos === 'object' && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-xs text-slate-400">Trabalho aos Domingos</p>
                      <p className="text-white text-sm">{jornada.trabalho_aos_domingos.permitido ? 'Permitido' : 'Não Permitido'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* HORAS EXTRAS - Seção Separada */}
          <Section title="Horas Extras" icon={Clock} color="bg-orange-600" defaultOpen>
            <div className="space-y-3">
              {/* Percentuais de Hora Extra */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-orange-400 font-medium mb-3">Percentuais de Hora Extra</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Dias Úteis</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {typeof jornada.hora_extra_50 === 'object' 
                        ? (jornada.hora_extra_50?.percentual || 50)
                        : (jornada.hora_extra?.percentual_dias_uteis || 50)}%
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Sábados</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {jornada.hora_extra?.percentual_sabados || 50}%
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Domingos</p>
                    <p className="text-2xl font-bold text-red-400">
                      {typeof jornada.hora_extra_100 === 'object' 
                        ? (jornada.hora_extra_100?.percentual || 100)
                        : (jornada.hora_extra?.percentual_domingos || 100)}%
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Feriados</p>
                    <p className="text-2xl font-bold text-red-400">
                      {jornada.hora_extra?.percentual_feriados || 100}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Limites e Regras */}
              {(jornada.hora_extra?.limite_diario || jornada.hora_extra?.limite_mensal || jornada.hora_extra?.forma_pagamento) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(jornada.hora_extra?.limite_diario || jornada.hora_extra?.limite_mensal) && (
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-2">Limites</p>
                      {jornada.hora_extra?.limite_diario && (
                        <p className="text-sm text-white">Diário: <span className="text-amber-400">{jornada.hora_extra.limite_diario}</span></p>
                      )}
                      {jornada.hora_extra?.limite_mensal && (
                        <p className="text-sm text-white">Mensal: <span className="text-amber-400">{jornada.hora_extra.limite_mensal}</span></p>
                      )}
                    </div>
                  )}
                  
                  {jornada.hora_extra?.forma_pagamento && (
                    <div className="bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-2">Forma de Pagamento</p>
                      <p className="text-sm text-white">{jornada.hora_extra.forma_pagamento}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          {/* ADICIONAL NOTURNO - Seção Separada */}
          <Section title="Adicional Noturno" icon={Moon} color="bg-indigo-600" defaultOpen>
            <div className="space-y-3">
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Percentual</p>
                    <p className="text-2xl font-bold text-indigo-400">
                      {typeof jornada.adicional_noturno === 'object' 
                        ? (jornada.adicional_noturno?.percentual || 20)
                        : (jornada.adicional_noturno || 20)}%
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Início</p>
                    <p className="text-xl font-bold text-white">
                      {typeof jornada.adicional_noturno === 'object' 
                        ? (jornada.adicional_noturno?.horario_inicio || '22:00')
                        : '22:00'}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Término</p>
                    <p className="text-xl font-bold text-white">
                      {typeof jornada.adicional_noturno === 'object' 
                        ? (jornada.adicional_noturno?.horario_fim || '05:00')
                        : '05:00'}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Hora Reduzida</p>
                    <p className="text-lg font-bold text-indigo-300">
                      {typeof jornada.adicional_noturno === 'object' 
                        ? (jornada.adicional_noturno?.hora_noturna_reduzida || '52m30s')
                        : '52m30s'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prorrogação do Noturno */}
              {typeof jornada.adicional_noturno === 'object' && jornada.adicional_noturno?.prorrogacao && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Prorrogação (HE Noturna)</p>
                  <p className="text-sm text-white">{jornada.adicional_noturno.prorrogacao}</p>
                </div>
              )}

              {/* Observações */}
              {typeof jornada.adicional_noturno === 'object' && jornada.adicional_noturno?.observacoes && (
                <div className="bg-slate-800/50 rounded p-2">
                  <p className="text-xs text-slate-400">{jornada.adicional_noturno.observacoes}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Descontos */}
          <Section title="Descontos Autorizados" icon={Banknote} color="bg-red-600">
            <div className="space-y-2">
              {descontos.contribuicao_sindical && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-2">Contribuição Sindical</p>
                  <InfoGrid>
                    <InfoItem label="Obrigatória" value={descontos.contribuicao_sindical.obrigatoria ? 'Sim' : 'Não'} />
                    <InfoItem label="Percentual/Valor" value={descontos.contribuicao_sindical.percentual || descontos.contribuicao_sindical.valor_fixo} />
                    <InfoItem label="Mês Desconto" value={descontos.contribuicao_sindical.mes_desconto} />
                    <InfoItem label="Autorização" value={descontos.contribuicao_sindical.autorizacao_necessaria} />
                  </InfoGrid>
                </div>
              )}

              {descontos.contribuicao_assistencial && (descontos.contribuicao_assistencial.valor || descontos.contribuicao_assistencial.percentual) && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-2">Contribuição Assistencial</p>
                  <InfoGrid>
                    <InfoItem label="Valor" value={descontos.contribuicao_assistencial.valor ? formatCurrency(descontos.contribuicao_assistencial.valor) : `${descontos.contribuicao_assistencial.percentual}%`} />
                    <InfoItem label="Periodicidade" value={descontos.contribuicao_assistencial.periodicidade} />
                    <InfoItem label="Como se Opor" value={descontos.contribuicao_assistencial.oposicao} />
                  </InfoGrid>
                </div>
              )}

              {descontos.limite_total_descontos && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                  <p className="text-sm text-red-400"><strong>Limite Total:</strong> {descontos.limite_total_descontos}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Estabilidades */}
          <Section title="Estabilidades e Garantias de Emprego" icon={Shield} color="bg-green-600">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {estabilidades.gestante && (
                  <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Baby size={14} className="text-pink-400" />
                      <span className="text-sm font-medium text-pink-400">Gestante</span>
                    </div>
                    <p className="text-sm text-white">{estabilidades.gestante.periodo || `${estabilidades.gestante.meses_apos_parto || 5} meses após o parto`}</p>
                    {estabilidades.gestante.observacoes && <p className="text-xs text-slate-400 mt-1">{estabilidades.gestante.observacoes}</p>}
                  </div>
                )}

                {estabilidades.acidente_trabalho && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope size={14} className="text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">Acidente de Trabalho</span>
                    </div>
                    <p className="text-sm text-white">{estabilidades.acidente_trabalho.periodo || `${estabilidades.acidente_trabalho.meses_apos_alta || 12} meses após alta`}</p>
                    {estabilidades.acidente_trabalho.observacoes && <p className="text-xs text-slate-400 mt-1">{estabilidades.acidente_trabalho.observacoes}</p>}
                  </div>
                )}

                {estabilidades.pre_aposentadoria && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Pré-Aposentadoria</span>
                    </div>
                    <p className="text-sm text-white">{estabilidades.pre_aposentadoria.periodo || `${estabilidades.pre_aposentadoria.meses_antes || 24} meses antes`}</p>
                    <p className="text-xs text-slate-400">Tempo mínimo: {estabilidades.pre_aposentadoria.tempo_minimo_empresa || '5 anos'}</p>
                  </div>
                )}

                {estabilidades.membro_cipa && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={14} className="text-green-400" />
                      <span className="text-sm font-medium text-green-400">Membro CIPA</span>
                    </div>
                    <p className="text-sm text-white">{estabilidades.membro_cipa.periodo || 'Durante mandato + 1 ano'}</p>
                  </div>
                )}
              </div>

              {/* Períodos vedados para demissão */}
              {estabilidades.periodos_vedados_demissao?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Ban size={14} className="text-red-400" />
                    <span className="text-sm font-medium text-red-400">Períodos em que NÃO PODE Demitir</span>
                  </div>
                  <ul className="space-y-1">
                    {estabilidades.periodos_vedados_demissao.map((p, i) => (
                      <li key={i} className="text-sm text-white flex items-start gap-2">
                        <CalendarOff size={12} className="text-red-400 mt-1 shrink-0" />
                        <span>{p.periodo} {p.excecao ? `(exceto: ${p.excecao})` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Section>

          {/* Rescisão */}
          <Section title="Rescisão Contratual" icon={UserX} color="bg-rose-600">
            <div className="space-y-3">
              {/* Aviso Prévio */}
              {rescisao.aviso_previo && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-2">Aviso Prévio</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Dias Base</p>
                      <p className="text-white font-bold">{rescisao.aviso_previo.dias_base || 30}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Adicional/Ano</p>
                      <p className="text-white font-bold">+{rescisao.aviso_previo.adicional_por_ano || rescisao.aviso_previo_adicional?.dias_por_ano || 3} dias</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Máximo</p>
                      <p className="text-white font-bold">{rescisao.aviso_previo.limite_maximo_dias || rescisao.aviso_previo_adicional?.limite_maximo || 90} dias</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Redução Jornada</p>
                      <p className="text-white">{rescisao.aviso_previo.reducao_jornada || '2h ou 7 dias'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Multa adicional */}
              {(rescisao.multa_rescisoria_adicional?.valor || rescisao.multa_adicional_rescisao?.valor) && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-400 mb-2">Multa Rescisória Adicional</p>
                  <InfoItem label="Valor" value={formatCurrency(rescisao.multa_rescisoria_adicional?.valor || rescisao.multa_adicional_rescisao?.valor)} highlight />
                  <InfoItem label="Situações" value={rescisao.multa_rescisoria_adicional?.situacoes_aplicaveis || rescisao.multa_adicional_rescisao?.situacoes} />
                </div>
              )}

              {/* Homologação */}
              {rescisao.homologacao && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-white mb-2">Homologação</p>
                  <InfoGrid>
                    <InfoItem label="Obrigatória no Sindicato" value={rescisao.homologacao.obrigatoria_sindicato ? 'Sim' : 'Não'} />
                    <InfoItem label="Tempo Serviço Mínimo" value={rescisao.homologacao.tempo_servico_minimo} />
                    <InfoItem label="Prazo Pagamento" value={rescisao.homologacao.prazo_pagamento || rescisao.homologacao.prazo} />
                  </InfoGrid>
                </div>
              )}
            </div>
          </Section>

          {/* Férias */}
          {ferias && Object.keys(ferias).length > 0 && (
            <Section title="Férias" icon={Sun} color="bg-cyan-600">
              <div className="space-y-2">
                <InfoGrid cols={2}>
                  <InfoItem label="Vedações de Início" value={ferias.vedacoes_inicio || ferias.inicio_periodo} />
                  <InfoItem label="Comunicação Prévia" value={ferias.comunicacao_previa} />
                  <InfoItem label="Abono Pecuniário" value={ferias.abono_pecuniario?.permitido ? 'Permitido' : 'Não'} />
                  <InfoItem label="Fracionamento" value={ferias.fracionamento?.permitido ? `Sim - ${ferias.fracionamento.numero_periodos || 3} períodos` : 'Não'} />
                  <InfoItem label="Mínimo por Período" value={ferias.fracionamento?.minimo_dias_periodo || ferias.fracionamento?.minimo_dias ? `${ferias.fracionamento.minimo_dias_periodo || ferias.fracionamento.minimo_dias} dias` : '-'} />
                </InfoGrid>
              </div>
            </Section>
          )}

          {/* Licenças */}
          {licencas && Object.keys(licencas).length > 0 && (
            <Section title="Licenças e Afastamentos" icon={Calendar} color="bg-teal-600">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {licencas.licenca_paternidade?.dias && (
                  <div className="bg-slate-800 rounded p-2">
                    <p className="text-xs text-slate-400">Paternidade</p>
                    <p className="text-white font-bold">{licencas.licenca_paternidade.dias} dias</p>
                  </div>
                )}
                {licencas.licenca_casamento?.dias && (
                  <div className="bg-slate-800 rounded p-2">
                    <p className="text-xs text-slate-400">Casamento</p>
                    <p className="text-white font-bold">{licencas.licenca_casamento.dias} dias</p>
                  </div>
                )}
                {licencas.licenca_falecimento?.dias && (
                  <div className="bg-slate-800 rounded p-2">
                    <p className="text-xs text-slate-400">Falecimento</p>
                    <p className="text-white font-bold">{licencas.licenca_falecimento.dias} dias</p>
                  </div>
                )}
                {licencas.acompanhamento_medico_filhos?.dias && (
                  <div className="bg-slate-800 rounded p-2">
                    <p className="text-xs text-slate-400">Acomp. Médico Filhos</p>
                    <p className="text-white font-bold">{licencas.acompanhamento_medico_filhos.dias} dia/ano</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Cláusulas Especiais */}
          {clausulas && clausulas.length > 0 && (
            <Section title="Cláusulas Especiais" icon={BookOpen} color="bg-violet-600" badge={`${clausulas.length} cláusulas`}>
              <div className="space-y-2">
                {clausulas.map((cl, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{cl.numero_clausula ? `Cláusula ${cl.numero_clausula} - ` : ''}{cl.titulo}</p>
                        {cl.tipo && <Badge variant="outline" className="text-xs mt-1">{cl.tipo}</Badge>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mt-2">{cl.resumo}</p>
                    {cl.impacto_pratico && (
                      <p className="text-xs text-amber-400 mt-2"><strong>Impacto:</strong> {cl.impacto_pratico}</p>
                    )}
                    {cl.texto_completo && cl.texto_completo !== cl.resumo && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-400 cursor-pointer">Ver texto completo</summary>
                        <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{cl.texto_completo}</p>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Penalidades */}
          {penalidades && (penalidades.multa_descumprimento_geral || penalidades.multa_descumprimento) && (
            <Section title="Penalidades e Multas" icon={Gavel} color="bg-red-700">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm font-medium text-red-400 mb-2">Multa por Descumprimento</p>
                <InfoItem 
                  label="Valor" 
                  value={formatCurrency(penalidades.multa_descumprimento_geral?.valor || penalidades.multa_descumprimento?.valor)} 
                  highlight 
                />
                <InfoItem 
                  label="Por Empregado" 
                  value={(penalidades.multa_descumprimento_geral?.por_empregado || penalidades.multa_descumprimento?.por_empregado) ? 'Sim' : 'Não'} 
                />
                <InfoItem label="Reincidência" value={penalidades.multa_descumprimento_geral?.dobra_reincidencia ? 'Dobra o valor' : '-'} />
              </div>
            </Section>
          )}

          {/* Observações Gerais */}
          {convencao.observacoes_gerais && (
            <div className="bg-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-400">Observações Gerais</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{convencao.observacoes_gerais}</p>
            </div>
          )}

          {/* Botão remover */}
          {isAtual && onRemove && (
            <div className="pt-3 border-t border-slate-700">
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
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState(convencaoAtual ? 'atual' : null);

  // Função para exportar PDF
  const handleExportPDF = async () => {
    if (!convencaoAtual) {
      toast.error('Nenhuma convenção para exportar');
      return;
    }
    
    setExporting(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/clientes/${clienteId}/convencao/export-pdf`,
        { 
          responseType: 'blob',
          timeout: 60000 
        }
      );
      
      // Criar URL do blob e fazer download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Extrair nome do arquivo do header ou usar padrão
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'CCT_Resumo.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      // Criar link e disparar download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF: ' + (error.response?.data?.detail || error.message));
    } finally {
      setExporting(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('convencao', acceptedFiles[0]);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/clientes/${clienteId}/convencao`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 }
      );
      
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
      toast.success('Convenção removida!');
      if (onUpdate) onUpdate({ convencao_coletiva: null });
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
          {convencaoAtual && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              data-testid="export-cct-pdf-btn"
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : (
                <Download size={14} className="mr-1" />
              )}
              Exportar PDF
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Área de Upload */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-blue-500 bg-blue-500/10' 
              : uploading ? 'border-slate-600 bg-slate-800/50 cursor-wait'
              : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/30'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-white font-medium">Analisando convenção...</p>
              <p className="text-xs text-slate-500">A análise é detalhada e pode levar até 2 minutos</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={28} className="text-blue-500" />
              <p className="text-white font-medium">
                {convencaoAtual ? 'Enviar Nova Convenção' : 'Enviar Convenção Coletiva'}
              </p>
              <p className="text-sm text-slate-500">PDF, imagem ou texto da CCT</p>
            </div>
          )}
        </div>

        {/* Lista de Convenções */}
        {temConvencoes && (
          <div className="space-y-3">
            {convencaoAtual && (
              <ConvencaoDetalhada
                convencao={convencaoAtual}
                isAtual={true}
                isExpanded={expandedId === 'atual'}
                onToggle={() => setExpandedId(expandedId === 'atual' ? null : 'atual')}
                onRemove={handleRemove}
                removing={removing}
              />
            )}

            {historicoConvencoes && historicoConvencoes.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <History size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Histórico</span>
                </div>
                {historicoConvencoes.map((conv, index) => (
                  <ConvencaoDetalhada
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
