import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
    FileText, Upload, X, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft,
    Users, MapPin, Briefcase, DollarSign, Building2, Calendar, FileDown, Copy,
    Plus, Trash2, Sparkles, Search, UserPlus, UserMinus, ArrowLeftRight, User
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ESTADOS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
    'SP', 'SE', 'TO'
];

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
const REGIMES_CASAMENTO = ['Comunhão Parcial de Bens', 'Comunhão Universal de Bens', 'Separação Total de Bens', 'Participação Final nos Aquestos'];

const TIPOS_ALTERACAO = [
    { id: 'socios', label: 'Alteração de Sócios (QSA)', icon: Users, description: 'Entrada, saída ou redistribuição de cotas' },
    { id: 'endereco', label: 'Alteração de Endereço', icon: MapPin, description: 'Mudança de sede da empresa' },
    { id: 'atividade', label: 'Alteração de Atividades', icon: Briefcase, description: 'Inclusão ou exclusão de CNAEs' },
    { id: 'capital', label: 'Alteração de Capital', icon: DollarSign, description: 'Aumento ou redução do capital social' },
    { id: 'nome', label: 'Alteração de Nome', icon: Building2, description: 'Mudança de razão social ou nome fantasia' },
    { id: 'administracao', label: 'Alteração de Administração', icon: Users, description: 'Mudança nos administradores' },
    { id: 'outras', label: 'Outras Alterações', icon: FileText, description: 'Alterar cláusulas específicas do contrato' },
];

// Banco de CNAEs simplificado para busca
const BANCO_CNAES = [
    { codigo: '47.81-4-00', descricao: 'Comércio varejista de artigos do vestuário e acessórios' },
    { codigo: '56.11-2-01', descricao: 'Restaurantes e similares' },
    { codigo: '62.01-5-01', descricao: 'Desenvolvimento de programas de computador sob encomenda' },
    { codigo: '62.04-0-00', descricao: 'Consultoria em tecnologia da informação' },
    { codigo: '69.20-6-01', descricao: 'Atividades de contabilidade' },
    { codigo: '70.20-4-00', descricao: 'Atividades de consultoria em gestão empresarial' },
    { codigo: '73.11-4-00', descricao: 'Agências de publicidade' },
    { codigo: '74.10-2-02', descricao: 'Design de interiores' },
    { codigo: '82.11-3-00', descricao: 'Serviços combinados de escritório e apoio administrativo' },
    { codigo: '96.02-5-01', descricao: 'Cabeleireiros, manicure e pedicure' },
    { codigo: '41.20-4-00', descricao: 'Construção de edifícios' },
    { codigo: '45.11-1-01', descricao: 'Comércio a varejo de automóveis novos' },
    { codigo: '46.93-1-00', descricao: 'Comércio atacadista de mercadorias em geral' },
    { codigo: '49.30-2-02', descricao: 'Transporte rodoviário de carga' },
    { codigo: '86.30-5-03', descricao: 'Atividade médica ambulatorial restrita a consultas' },
    { codigo: '85.99-6-04', descricao: 'Treinamento em desenvolvimento profissional e gerencial' },
];

// Componente para formulário de alteração de sócios (QSA) - Multi-opção
const FormularioQSA = ({ dados, onChange, dadosExtraidos, onExtrairIA }) => {
    const sociosAtuais = dadosExtraidos?.socios || [];
    
    // Toggle de tipos de QSA (permite múltiplos)
    const toggleTipoQSA = (tipo) => {
        const tipos = dados.tiposQSA || [];
        const novos = tipos.includes(tipo) 
            ? tipos.filter(t => t !== tipo)
            : [...tipos, tipo];
        onChange({...dados, tiposQSA: novos});
    };
    
    const tiposSelecionados = dados.tiposQSA || [];
    
    return (
        <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-500" />
                    Tipos de Alteração no QSA
                </h4>
                <p className="text-zinc-500 text-xs mb-4">Selecione uma ou mais opções:</p>
                
                <div className="grid grid-cols-3 gap-3">
                    <button 
                        type="button"
                        onClick={() => toggleTipoQSA('saida')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer border transition-all ${
                            tiposSelecionados.includes('saida') 
                                ? 'border-red-500 bg-red-500/10' 
                                : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            tiposSelecionados.includes('saida') ? 'border-red-500 bg-red-500' : 'border-zinc-600'
                        }`}>
                            {tiposSelecionados.includes('saida') && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <UserMinus className="w-6 h-6 text-red-500" />
                        <span className="text-white text-sm font-medium">Saída de Sócio</span>
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => toggleTipoQSA('entrada')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer border transition-all ${
                            tiposSelecionados.includes('entrada') 
                                ? 'border-green-500 bg-green-500/10' 
                                : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            tiposSelecionados.includes('entrada') ? 'border-green-500 bg-green-500' : 'border-zinc-600'
                        }`}>
                            {tiposSelecionados.includes('entrada') && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <UserPlus className="w-6 h-6 text-green-500" />
                        <span className="text-white text-sm font-medium">Entrada de Sócio</span>
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => toggleTipoQSA('redistribuicao')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg cursor-pointer border transition-all ${
                            tiposSelecionados.includes('redistribuicao') 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                    >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            tiposSelecionados.includes('redistribuicao') ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                        }`}>
                            {tiposSelecionados.includes('redistribuicao') && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <ArrowLeftRight className="w-6 h-6 text-blue-500" />
                        <span className="text-white text-sm font-medium">Redistribuição</span>
                    </button>
                </div>
            </div>

            {/* Seção de Saída de Sócios */}
            {tiposSelecionados.includes('saida') && (
                <SociosRetirantes dados={dados} onChange={onChange} sociosAtuais={sociosAtuais} />
            )}

            {/* Seção de Entrada de Sócios */}
            {tiposSelecionados.includes('entrada') && (
                <SociosEntrando dados={dados} onChange={onChange} />
            )}

            {/* Seção de Redistribuição */}
            {tiposSelecionados.includes('redistribuicao') && (
                <RedistribuicaoCotas dados={dados} onChange={onChange} sociosAtuais={sociosAtuais} />
            )}
        </div>
    );
};

// Sub-componente para sócios retirantes
const SociosRetirantes = ({ dados, onChange, sociosAtuais }) => {
    return (
        <div className="bg-zinc-950 border border-red-500/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-red-500" />
                Sócios Retirantes
            </h4>
            
            {sociosAtuais.length > 0 ? (
                <div className="space-y-2 mb-4">
                    <p className="text-zinc-500 text-xs mb-2">Selecione os sócios que estão saindo:</p>
                    {sociosAtuais.map((socio, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                            <Checkbox 
                                checked={dados.sociosSaindo?.includes(idx)}
                                onCheckedChange={(checked) => {
                                    const novos = checked 
                                        ? [...(dados.sociosSaindo || []), idx]
                                        : (dados.sociosSaindo || []).filter(i => i !== idx);
                                    onChange({...dados, sociosSaindo: novos});
                                }}
                            />
                            <div className="flex-1">
                                <p className="text-white font-medium">{socio.nome || `Sócio ${idx + 1}`}</p>
                                <p className="text-zinc-500 text-xs">CPF: {socio.cpf || 'N/I'} | Participação: {socio.participacao || 'N/A'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mb-4">
                    <div className="text-center py-4 border border-dashed border-zinc-700 rounded-lg mb-4">
                        <Users className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                        <p className="text-zinc-400 text-sm">Nenhum sócio identificado no contrato</p>
                        <p className="text-zinc-500 text-xs">Adicione os sócios retirantes manualmente</p>
                    </div>
                </div>
            )}
            
            {/* Formulário manual para retirantes */}
            <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-zinc-400 text-sm">Adicionar retirante manualmente:</span>
                    <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() => onChange({
                            ...dados,
                            sociosRetirantes: [...(dados.sociosRetirantes || []), { nome: '', cpf: '', participacao: '' }]
                        })}
                    >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar Retirante
                    </Button>
                </div>
                
                {(dados.sociosRetirantes || []).map((socio, idx) => (
                    <div key={idx} className="bg-zinc-900 rounded-lg p-4 space-y-3 mb-3">
                        <div className="flex items-center justify-between">
                            <span className="text-red-400 font-medium text-sm">Sócio Retirante {idx + 1}</span>
                            <Button 
                                type="button" 
                                size="sm" 
                                variant="ghost" 
                                className="text-zinc-500 hover:text-red-500 h-8 w-8 p-0"
                                onClick={() => onChange({
                                    ...dados,
                                    sociosRetirantes: dados.sociosRetirantes.filter((_, i) => i !== idx)
                                })}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label className="text-zinc-500 text-xs">Nome Completo *</Label>
                                <Input 
                                    value={socio.nome} 
                                    onChange={(e) => {
                                        const novos = [...dados.sociosRetirantes];
                                        novos[idx] = {...novos[idx], nome: e.target.value.toUpperCase()};
                                        onChange({...dados, sociosRetirantes: novos});
                                    }}
                                    placeholder="NOME COMPLETO"
                                    className="bg-zinc-800 border-zinc-700 mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-500 text-xs">Participação (%)</Label>
                                <Input 
                                    value={socio.participacao} 
                                    onChange={(e) => {
                                        const novos = [...dados.sociosRetirantes];
                                        novos[idx] = {...novos[idx], participacao: e.target.value};
                                        onChange({...dados, sociosRetirantes: novos});
                                    }}
                                    placeholder="50"
                                    className="bg-zinc-800 border-zinc-700 mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">CPF *</Label>
                            <Input 
                                value={socio.cpf} 
                                onChange={(e) => {
                                    const novos = [...dados.sociosRetirantes];
                                    novos[idx] = {...novos[idx], cpf: e.target.value};
                                    onChange({...dados, sociosRetirantes: novos});
                                }}
                                placeholder="000.000.000-00"
                                className="bg-zinc-800 border-zinc-700 mt-1 w-48"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Sub-componente para redistribuição de cotas
const RedistribuicaoCotas = ({ dados, onChange, sociosAtuais }) => {
    return (
        <div className="bg-zinc-950 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                Redistribuição de Cotas
            </h4>
            
            {sociosAtuais.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-zinc-500 text-xs mb-2">Informe a nova participação de cada sócio:</p>
                    {sociosAtuais.map((socio, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                            <div className="flex-1">
                                <p className="text-white font-medium">{socio.nome || `Sócio ${idx + 1}`}</p>
                                <p className="text-zinc-500 text-xs">Participação atual: {socio.participacao || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500 text-sm">Nova %:</span>
                                <Input 
                                    className="w-20 bg-zinc-800 border-zinc-700 text-center"
                                    placeholder="50"
                                    value={dados.novasParticipacoes?.[idx] || ''}
                                    onChange={(e) => {
                                        const novas = {...(dados.novasParticipacoes || {})};
                                        novas[idx] = e.target.value;
                                        onChange({...dados, novasParticipacoes: novas});
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-center py-4 border border-dashed border-zinc-700 rounded-lg">
                        <Users className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                        <p className="text-zinc-400 text-sm">Nenhum sócio identificado no contrato</p>
                        <p className="text-zinc-500 text-xs">Adicione os sócios manualmente para redistribuição</p>
                    </div>
                    
                    {/* Formulário manual para redistribuição */}
                    <div className="border-t border-zinc-800 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-zinc-400 text-sm">Sócios para redistribuição:</span>
                            <Button 
                                type="button" 
                                size="sm" 
                                variant="outline" 
                                className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                                onClick={() => onChange({
                                    ...dados,
                                    sociosRedistribuicao: [...(dados.sociosRedistribuicao || []), { 
                                        nome: '', cpf: '', participacaoAtual: '', novaParticipacao: '' 
                                    }]
                                })}
                            >
                                <Plus className="w-4 h-4 mr-1" /> Adicionar Sócio
                            </Button>
                        </div>
                        
                        {(dados.sociosRedistribuicao || []).length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-2">
                                Clique em "Adicionar Sócio" para informar os dados
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {(dados.sociosRedistribuicao || []).map((socio, idx) => (
                                    <div key={idx} className="bg-zinc-900 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-blue-400 font-medium text-sm">Sócio {idx + 1}</span>
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant="ghost" 
                                                className="text-zinc-500 hover:text-red-500 h-8 w-8 p-0"
                                                onClick={() => onChange({
                                                    ...dados,
                                                    sociosRedistribuicao: dados.sociosRedistribuicao.filter((_, i) => i !== idx)
                                                })}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-zinc-500 text-xs">Nome Completo *</Label>
                                                <Input 
                                                    value={socio.nome} 
                                                    onChange={(e) => {
                                                        const novos = [...dados.sociosRedistribuicao];
                                                        novos[idx] = {...novos[idx], nome: e.target.value.toUpperCase()};
                                                        onChange({...dados, sociosRedistribuicao: novos});
                                                    }}
                                                    placeholder="NOME COMPLETO"
                                                    className="bg-zinc-800 border-zinc-700 mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-zinc-500 text-xs">CPF</Label>
                                                <Input 
                                                    value={socio.cpf} 
                                                    onChange={(e) => {
                                                        const novos = [...dados.sociosRedistribuicao];
                                                        novos[idx] = {...novos[idx], cpf: e.target.value};
                                                        onChange({...dados, sociosRedistribuicao: novos});
                                                    }}
                                                    placeholder="000.000.000-00"
                                                    className="bg-zinc-800 border-zinc-700 mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-zinc-500 text-xs">Participação Atual (%)</Label>
                                                <Input 
                                                    value={socio.participacaoAtual} 
                                                    onChange={(e) => {
                                                        const novos = [...dados.sociosRedistribuicao];
                                                        novos[idx] = {...novos[idx], participacaoAtual: e.target.value};
                                                        onChange({...dados, sociosRedistribuicao: novos});
                                                    }}
                                                    placeholder="50"
                                                    className="bg-zinc-800 border-zinc-700 mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-zinc-500 text-xs">Nova Participação (%) *</Label>
                                                <Input 
                                                    value={socio.novaParticipacao} 
                                                    onChange={(e) => {
                                                        const novos = [...dados.sociosRedistribuicao];
                                                        novos[idx] = {...novos[idx], novaParticipacao: e.target.value};
                                                        onChange({...dados, sociosRedistribuicao: novos});
                                                    }}
                                                    placeholder="60"
                                                    className="bg-zinc-800 border-zinc-700 mt-1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-componente para novos sócios - igual ao da Constituição
const SociosEntrando = ({ dados, onChange }) => {
    return (
        <div className="bg-zinc-950 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-green-500" />
                    Novos Sócios
                </h4>
                <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                    onClick={() => onChange({
                        ...dados,
                        sociosEntrando: [...(dados.sociosEntrando || []), {
                            nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)',
                            estadoCivil: '', regimeCasamento: '', profissao: '', participacao: '',
                            endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }
                        }]
                    })}
                >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Sócio
                </Button>
            </div>
            
            {(dados.sociosEntrando || []).length === 0 ? (
                <div className="text-center py-6 border border-dashed border-zinc-700 rounded-lg">
                    <UserPlus className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-400 text-sm">Nenhum sócio adicionado</p>
                    <p className="text-zinc-500 text-xs">Clique em "Adicionar Sócio" para incluir novos sócios</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {(dados.sociosEntrando || []).map((socio, idx) => (
                        <SocioCardAlteracao 
                            key={idx}
                            socio={socio}
                            index={idx}
                            onChange={(novoSocio) => {
                                const novos = [...dados.sociosEntrando];
                                novos[idx] = novoSocio;
                                onChange({...dados, sociosEntrando: novos});
                            }}
                            onRemove={() => onChange({
                                ...dados,
                                sociosEntrando: dados.sociosEntrando.filter((_, i) => i !== idx)
                            })}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Componente de card de sócio - igual ao da Constituição
const SocioCardAlteracao = ({ socio, index, onChange, onRemove }) => {
    const docInputRef = useRef(null);
    const enderecoInputRef = useRef(null);
    const [extraindo, setExtraindo] = useState(false);
    const [extraindoEndereco, setExtraindoEndereco] = useState(false);
    const [buscandoCep, setBuscandoCep] = useState(false);
    
    const handleDocUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindo(true);
        toast.info('Extraindo dados do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axios.post(`${API_URL}/api/constituicao/extrair-socio`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.dados) {
                const dados = response.data.dados;
                onChange({
                    ...socio,
                    nome: dados.nome || socio.nome,
                    cpf: dados.cpf || socio.cpf,
                    rg: dados.rg || socio.rg,
                    orgaoEmissor: dados.orgao_emissor || socio.orgaoEmissor,
                    nacionalidade: dados.nacionalidade || socio.nacionalidade,
                    estadoCivil: dados.estado_civil || socio.estadoCivil,
                    profissao: dados.profissao || socio.profissao,
                });
                toast.success('Dados pessoais extraídos!');
            } else {
                toast.info('Documento anexado');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.warning('Extração indisponível');
        } finally {
            setExtraindo(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };

    const handleEnderecoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindoEndereco(true);
        toast.info('Extraindo endereço do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('campo', 'endereco');
            
            const response = await axios.post(`${API_URL}/api/constituicao/extrair-campo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.valor) {
                const dados = response.data.valor;
                if (typeof dados === 'object') {
                    onChange({
                        ...socio,
                        endereco: {
                            ...socio.endereco,
                            logradouro: dados.logradouro || socio.endereco?.logradouro || '',
                            numero: dados.numero || socio.endereco?.numero || '',
                            complemento: dados.complemento || socio.endereco?.complemento || '',
                            bairro: dados.bairro || socio.endereco?.bairro || '',
                            cidade: dados.cidade || socio.endereco?.cidade || '',
                            estado: dados.estado || socio.endereco?.estado || 'SP',
                            cep: dados.cep || socio.endereco?.cep || ''
                        }
                    });
                    toast.success('Endereço extraído!');
                }
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.error('Erro ao extrair endereço');
        } finally {
            setExtraindoEndereco(false);
            if (enderecoInputRef.current) enderecoInputRef.current.value = '';
        }
    };

    const handleBuscarCep = async () => {
        const cepLimpo = enderecoSocio.cep?.replace(/\D/g, '') || '';
        if (cepLimpo.length !== 8) {
            toast.error('CEP deve ter 8 dígitos');
            return;
        }
        
        setBuscandoCep(true);
        try {
            const response = await axios.get(`${API_URL}/api/cep/${cepLimpo}`);
            if (response.data.success && response.data.endereco) {
                const dados = response.data.endereco;
                onChange({
                    ...socio,
                    endereco: {
                        ...enderecoSocio,
                        logradouro: dados.logradouro || enderecoSocio.logradouro,
                        bairro: dados.bairro || enderecoSocio.bairro,
                        cidade: dados.cidade || enderecoSocio.cidade,
                        estado: dados.estado || enderecoSocio.estado,
                        cep: dados.cep || enderecoSocio.cep
                    }
                });
                toast.success('Endereço atualizado via Correios!');
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            toast.error('CEP não encontrado');
        } finally {
            setBuscandoCep(false);
        }
    };

    const enderecoSocio = socio.endereco && typeof socio.endereco === 'object' 
        ? socio.endereco 
        : { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' };
    
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="font-medium text-white">Novo Sócio {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        disabled={extraindo}
                        className="text-xs bg-green-600/20 text-green-500 hover:bg-green-600/30 px-3 py-1.5 rounded flex items-center gap-1"
                    >
                        {extraindo ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Preencher com IA
                    </button>
                    <button onClick={onRemove} className="text-zinc-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
            <input ref={enderecoInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleEnderecoUpload} />
            
            <p className="text-xs text-zinc-500">
                Anexe CNH ou RG para preenchimento automático dos dados pessoais
            </p>
            
            {/* Dados Pessoais */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Nome Completo <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.nome}
                        onChange={(e) => onChange({ ...socio, nome: e.target.value.toUpperCase() })}
                        placeholder="NOME COMPLETO EM MAIÚSCULAS"
                        className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">CPF <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.cpf}
                        onChange={(e) => onChange({ ...socio, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">RG <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.rg}
                        onChange={(e) => onChange({ ...socio, rg: e.target.value })}
                        placeholder="00.000.000-0"
                        className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Órgão Emissor <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.orgaoEmissor}
                        onChange={(e) => onChange({ ...socio, orgaoEmissor: e.target.value })}
                        placeholder="SSP/SP"
                        className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Nacionalidade <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.nacionalidade}
                        onChange={(e) => onChange({ ...socio, nacionalidade: e.target.value })}
                        placeholder="Brasileiro(a)"
                        className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Estado Civil <span className="text-red-500">*</span></Label>
                    <Select value={socio.estadoCivil} onValueChange={(v) => onChange({ ...socio, estadoCivil: v })}>
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                            <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            {ESTADOS_CIVIS.map(ec => (
                                <SelectItem key={ec} value={ec}>{ec}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {socio.estadoCivil === 'Casado(a)' && (
                    <div className="col-span-2">
                        <Label className="text-zinc-500 text-xs">Regime de Casamento <span className="text-red-500">*</span></Label>
                        <Select value={socio.regimeCasamento} onValueChange={(v) => onChange({ ...socio, regimeCasamento: v })}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-700">
                                {REGIMES_CASAMENTO.map(rc => (
                                    <SelectItem key={rc} value={rc}>{rc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className={socio.estadoCivil === 'Casado(a)' ? '' : 'col-span-2'}>
                    <Label className="text-zinc-500 text-xs">Profissão <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.profissao}
                        onChange={(e) => onChange({ ...socio, profissao: e.target.value })}
                        placeholder="Empresário(a)"
                        className="bg-zinc-800 border-zinc-700 mt-1"
                    />
                </div>
            </div>
            
            {/* Participação */}
            <div className="w-32">
                <Label className="text-zinc-500 text-xs">Participação (%) <span className="text-red-500">*</span></Label>
                <Input
                    value={socio.participacao}
                    onChange={(e) => onChange({ ...socio, participacao: e.target.value })}
                    placeholder="50"
                    className="bg-zinc-800 border-zinc-700 mt-1"
                />
            </div>
            
            {/* Endereço do Sócio */}
            <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-500" />
                        Endereço Residencial
                    </Label>
                    <button 
                        type="button"
                        onClick={() => enderecoInputRef.current?.click()}
                        disabled={extraindoEndereco}
                        className="text-xs bg-green-600/20 text-green-500 hover:bg-green-600/30 px-3 py-1.5 rounded flex items-center gap-1"
                    >
                        {extraindoEndereco ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Preencher Endereço com IA
                    </button>
                </div>
                
                <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                            <Label className="text-zinc-500 text-xs">Logradouro <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.logradouro}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, logradouro: e.target.value } })}
                                placeholder="Rua, Avenida, etc."
                                className="bg-zinc-800 border-zinc-700 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Número <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.numero}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, numero: e.target.value } })}
                                placeholder="123"
                                className="bg-zinc-800 border-zinc-700 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Complemento</Label>
                            <Input
                                value={enderecoSocio.complemento}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, complemento: e.target.value } })}
                                placeholder="Apto, Sala"
                                className="bg-zinc-800 border-zinc-700 mt-1"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <Label className="text-zinc-500 text-xs">Bairro <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.bairro}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, bairro: e.target.value } })}
                                placeholder="Bairro"
                                className="bg-zinc-800 border-zinc-700 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Cidade <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.cidade}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, cidade: e.target.value } })}
                                placeholder="Cidade"
                                className="bg-zinc-800 border-zinc-700 mt-1"
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Estado <span className="text-red-500">*</span></Label>
                            <Select 
                                value={enderecoSocio.estado} 
                                onValueChange={(v) => onChange({ ...socio, endereco: { ...enderecoSocio, estado: v } })}
                            >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                    {ESTADOS.map(uf => (
                                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">CEP <span className="text-red-500">*</span></Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    value={enderecoSocio.cep}
                                    onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, cep: e.target.value } })}
                                    placeholder="00000-000"
                                    className="bg-zinc-800 border-zinc-700"
                                />
                                <Button 
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-zinc-700 px-2"
                                    onClick={handleBuscarCep}
                                    disabled={buscandoCep}
                                >
                                    {buscandoCep ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
// Componente para alteração de endereço
const FormularioEndereco = ({ dados, onChange, dadosExtraidos }) => {
    const docInputRef = useRef(null);
    const [extraindo, setExtraindo] = useState(false);
    const [buscandoCep, setBuscandoCep] = useState(false);
    
    const enderecoAtual = dadosExtraidos?.empresa?.endereco || '';
    
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindo(true);
        toast.info('Extraindo endereço do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('campo', 'endereco');
            
            const response = await axios.post(`${API_URL}/api/constituicao/extrair-campo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.valor) {
                const end = response.data.valor;
                if (typeof end === 'object') {
                    onChange({
                        ...dados,
                        logradouro: end.logradouro || dados.logradouro,
                        numero: end.numero || dados.numero,
                        complemento: end.complemento || dados.complemento,
                        bairro: end.bairro || dados.bairro,
                        cidade: end.cidade || dados.cidade,
                        estado: end.estado || dados.estado,
                        cep: end.cep || dados.cep,
                    });
                }
                toast.success('Endereço extraído!');
            }
        } catch (error) {
            toast.error('Erro ao extrair endereço');
        } finally {
            setExtraindo(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };
    
    const buscarCep = async () => {
        const cepLimpo = dados.cep?.replace(/\D/g, '') || '';
        if (cepLimpo.length !== 8) {
            toast.error('CEP deve ter 8 dígitos');
            return;
        }
        
        setBuscandoCep(true);
        try {
            const response = await axios.get(`${API_URL}/api/cep/${cepLimpo}`);
            if (response.data.success && response.data.endereco) {
                const end = response.data.endereco;
                onChange({
                    ...dados,
                    logradouro: end.logradouro || dados.logradouro,
                    bairro: end.bairro || dados.bairro,
                    cidade: end.cidade || dados.cidade,
                    estado: end.estado || dados.estado,
                    cep: end.cep || dados.cep,
                });
                toast.success('Endereço atualizado via Correios!');
            }
        } catch (error) {
            toast.error('CEP não encontrado');
        } finally {
            setBuscandoCep(false);
        }
    };
    
    return (
        <div className="space-y-6">
            {enderecoAtual && (
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
                    <h4 className="text-amber-200 font-medium mb-2">Endereço Atual</h4>
                    <p className="text-amber-200/70 text-sm">{typeof enderecoAtual === 'string' ? enderecoAtual : JSON.stringify(enderecoAtual)}</p>
                </div>
            )}
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        Novo Endereço
                    </h4>
                    <div className="flex gap-2">
                        <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
                        <Button 
                            type="button" 
                            size="sm" 
                            className="bg-red-600/20 text-red-500 hover:bg-red-600/30"
                            onClick={() => docInputRef.current?.click()}
                            disabled={extraindo}
                        >
                            {extraindo ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Preencher com IA
                        </Button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">Logradouro *</Label>
                            <Input value={dados.logradouro || ''} onChange={(e) => onChange({...dados, logradouro: e.target.value})} placeholder="Rua, Avenida, etc." className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">Número *</Label>
                            <Input value={dados.numero || ''} onChange={(e) => onChange({...dados, numero: e.target.value})} placeholder="123" className="bg-zinc-900 border-zinc-700" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">Complemento</Label>
                            <Input value={dados.complemento || ''} onChange={(e) => onChange({...dados, complemento: e.target.value})} placeholder="Sala 101" className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">Bairro *</Label>
                            <Input value={dados.bairro || ''} onChange={(e) => onChange({...dados, bairro: e.target.value})} placeholder="Centro" className="bg-zinc-900 border-zinc-700" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">Cidade *</Label>
                            <Input value={dados.cidade || ''} onChange={(e) => onChange({...dados, cidade: e.target.value})} placeholder="São Paulo" className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">Estado *</Label>
                            <Select value={dados.estado || 'SP'} onValueChange={(v) => onChange({...dados, estado: v})}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                    {ESTADOS.map(uf => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase mb-2 block">CEP *</Label>
                            <div className="flex gap-2">
                                <Input value={dados.cep || ''} onChange={(e) => onChange({...dados, cep: e.target.value})} placeholder="00000-000" className="bg-zinc-900 border-zinc-700" />
                                <Button type="button" size="sm" onClick={buscarCep} disabled={buscandoCep} className="bg-blue-600 hover:bg-blue-700 px-3">
                                    {buscandoCep ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para alteração de atividades (CNAEs)
const FormularioAtividades = ({ dados, onChange, dadosExtraidos }) => {
    const [buscaCnae, setBuscaCnae] = useState('');
    
    const cnaesAtuais = dadosExtraidos?.cnaes || [];
    const cnaesParaExcluir = dados.cnaesExcluir || [];
    const cnaesParaAdicionar = dados.cnaesAdicionar || [];
    
    const cnaesFiltrados = BANCO_CNAES.filter(cnae => 
        cnae.codigo.toLowerCase().includes(buscaCnae.toLowerCase()) ||
        cnae.descricao.toLowerCase().includes(buscaCnae.toLowerCase())
    ).slice(0, 10);
    
    const toggleExcluirCnae = (cnae) => {
        const existe = cnaesParaExcluir.find(c => c.codigo === cnae.codigo);
        if (existe) {
            onChange({...dados, cnaesExcluir: cnaesParaExcluir.filter(c => c.codigo !== cnae.codigo)});
        } else {
            onChange({...dados, cnaesExcluir: [...cnaesParaExcluir, cnae]});
        }
    };
    
    const adicionarCnae = (cnae) => {
        if (!cnaesParaAdicionar.find(c => c.codigo === cnae.codigo)) {
            onChange({...dados, cnaesAdicionar: [...cnaesParaAdicionar, cnae]});
        }
        setBuscaCnae('');
    };
    
    const removerCnaeAdicionado = (codigo) => {
        onChange({...dados, cnaesAdicionar: cnaesParaAdicionar.filter(c => c.codigo !== codigo)});
    };
    
    return (
        <div className="space-y-6">
            {/* CNAEs atuais */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-red-500" />
                    CNAEs Atuais da Empresa
                </h4>
                
                {cnaesAtuais.length > 0 ? (
                    <div className="space-y-2">
                        {cnaesAtuais.map((cnae, idx) => {
                            const codigo = typeof cnae === 'string' ? cnae.split(' - ')[0] : cnae.codigo;
                            const descricao = typeof cnae === 'string' ? cnae.split(' - ')[1] : cnae.descricao;
                            const marcadoExcluir = cnaesParaExcluir.find(c => c.codigo === codigo);
                            
                            return (
                                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${marcadoExcluir ? 'bg-red-950/30 border border-red-900/50' : 'bg-zinc-900'}`}>
                                    <div className="flex items-center gap-3">
                                        <Checkbox 
                                            checked={!!marcadoExcluir}
                                            onCheckedChange={() => toggleExcluirCnae({codigo, descricao})}
                                        />
                                        <div>
                                            <p className={`font-mono text-sm ${marcadoExcluir ? 'text-red-400 line-through' : 'text-white'}`}>{codigo}</p>
                                            <p className={`text-xs ${marcadoExcluir ? 'text-red-400/70 line-through' : 'text-zinc-500'}`}>{descricao || 'Descrição não disponível'}</p>
                                        </div>
                                    </div>
                                    {marcadoExcluir && (
                                        <span className="text-xs text-red-500 bg-red-500/20 px-2 py-1 rounded">EXCLUIR</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-zinc-500 text-sm text-center py-4">
                        Nenhum CNAE encontrado no contrato. Faça o upload do contrato na etapa 1.
                    </p>
                )}
                
                {cnaesAtuais.length > 0 && (
                    <p className="text-zinc-500 text-xs mt-3">
                        ✓ Marque os CNAEs que deseja <span className="text-red-500">excluir</span>
                    </p>
                )}
            </div>
            
            {/* Adicionar novos CNAEs */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-500" />
                    Adicionar Novos CNAEs
                </h4>
                
                <div className="relative mb-4">
                    <Input 
                        value={buscaCnae}
                        onChange={(e) => setBuscaCnae(e.target.value)}
                        placeholder="Buscar por código ou descrição..."
                        className="bg-zinc-900 border-zinc-700"
                    />
                    
                    {buscaCnae && cnaesFiltrados.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {cnaesFiltrados.map(cnae => (
                                <button
                                    key={cnae.codigo}
                                    type="button"
                                    onClick={() => adicionarCnae(cnae)}
                                    className="w-full text-left p-3 hover:bg-zinc-800 border-b border-zinc-800 last:border-0"
                                >
                                    <p className="text-white font-mono text-sm">{cnae.codigo}</p>
                                    <p className="text-zinc-500 text-xs">{cnae.descricao}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {cnaesParaAdicionar.length > 0 && (
                    <div className="space-y-2">
                        {cnaesParaAdicionar.map(cnae => (
                            <div key={cnae.codigo} className="flex items-center justify-between p-3 bg-green-950/30 border border-green-900/50 rounded-lg">
                                <div>
                                    <p className="text-green-400 font-mono text-sm">{cnae.codigo}</p>
                                    <p className="text-green-400/70 text-xs">{cnae.descricao}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-green-500 bg-green-500/20 px-2 py-1 rounded">ADICIONAR</span>
                                    <Button 
                                        type="button" 
                                        size="sm" 
                                        variant="ghost" 
                                        className="text-zinc-500 hover:text-red-500"
                                        onClick={() => removerCnaeAdicionado(cnae.codigo)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente para alteração de capital
const FormularioCapital = ({ dados, onChange, dadosExtraidos }) => {
    const capitalAtual = dadosExtraidos?.empresa?.capital_social || '';
    
    return (
        <div className="space-y-6">
            {capitalAtual && (
                <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
                    <h4 className="text-amber-200 font-medium mb-2">Capital Social Atual</h4>
                    <p className="text-amber-200/70 text-2xl font-bold">R$ {capitalAtual}</p>
                </div>
            )}
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-red-500" />
                    Alteração de Capital
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border ${dados.tipoCapital === 'aumento' ? 'border-green-500 bg-green-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}>
                        <input type="radio" name="tipoCapital" value="aumento" checked={dados.tipoCapital === 'aumento'} onChange={(e) => onChange({...dados, tipoCapital: e.target.value})} className="accent-green-500" />
                        <div>
                            <span className="text-white font-medium">Aumento de Capital</span>
                            <p className="text-zinc-500 text-xs">Integralização de novos valores</p>
                        </div>
                    </label>
                    
                    <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border ${dados.tipoCapital === 'reducao' ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}>
                        <input type="radio" name="tipoCapital" value="reducao" checked={dados.tipoCapital === 'reducao'} onChange={(e) => onChange({...dados, tipoCapital: e.target.value})} className="accent-red-500" />
                        <div>
                            <span className="text-white font-medium">Redução de Capital</span>
                            <p className="text-zinc-500 text-xs">Diminuição do capital social</p>
                        </div>
                    </label>
                </div>
                
                <div>
                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">Novo Valor do Capital Social *</Label>
                    <Input 
                        value={dados.novoCapital || ''} 
                        onChange={(e) => onChange({...dados, novoCapital: e.target.value})} 
                        placeholder="150.000,00" 
                        className="bg-zinc-900 border-zinc-700 text-lg"
                    />
                </div>
                
                <div className="mt-4">
                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">Motivo da Alteração</Label>
                    <Textarea 
                        value={dados.motivoCapital || ''} 
                        onChange={(e) => onChange({...dados, motivoCapital: e.target.value})} 
                        placeholder="Descreva o motivo do aumento/redução de capital..."
                        className="bg-zinc-900 border-zinc-700"
                        rows={3}
                    />
                </div>
            </div>
        </div>
    );
};

// Componente para alteração de nome
const FormularioNome = ({ dados, onChange, dadosExtraidos }) => {
    const nomeAtual = dadosExtraidos?.empresa?.razao_social || '';
    const fantasiaAtual = dadosExtraidos?.empresa?.nome_fantasia || '';
    
    return (
        <div className="space-y-6">
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
                <h4 className="text-amber-200 font-medium mb-2">Dados Atuais</h4>
                <p className="text-amber-200/70"><strong>Razão Social:</strong> {nomeAtual || 'Não identificado'}</p>
                {fantasiaAtual && <p className="text-amber-200/70"><strong>Nome Fantasia:</strong> {fantasiaAtual}</p>}
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
                <h4 className="text-white font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-500" />
                    Novos Dados
                </h4>
                
                <div>
                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">Nova Razão Social *</Label>
                    <Input 
                        value={dados.novaRazaoSocial || ''} 
                        onChange={(e) => onChange({...dados, novaRazaoSocial: e.target.value.toUpperCase()})} 
                        placeholder="NOVA RAZÃO SOCIAL LTDA"
                        className="bg-zinc-900 border-zinc-700"
                    />
                </div>
                
                <div>
                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">Novo Nome Fantasia</Label>
                    <Input 
                        value={dados.novoNomeFantasia || ''} 
                        onChange={(e) => onChange({...dados, novoNomeFantasia: e.target.value})} 
                        placeholder="Novo Nome Fantasia"
                        className="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>
        </div>
    );
};

// Componente para alteração de administração
const FormularioAdministracao = ({ dados, onChange, dadosExtraidos }) => {
    const sociosAtuais = dadosExtraidos?.socios || [];
    
    return (
        <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-red-500" />
                    Selecione o(s) Novo(s) Administrador(es)
                </h4>
                
                {sociosAtuais.length > 0 ? (
                    <div className="space-y-2">
                        {sociosAtuais.map((socio, idx) => (
                            <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${dados.novosAdministradores?.includes(idx) ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}>
                                <Checkbox 
                                    checked={dados.novosAdministradores?.includes(idx)}
                                    onCheckedChange={(checked) => {
                                        const novos = checked 
                                            ? [...(dados.novosAdministradores || []), idx]
                                            : (dados.novosAdministradores || []).filter(i => i !== idx);
                                        onChange({...dados, novosAdministradores: novos});
                                    }}
                                />
                                <div>
                                    <p className="text-white font-medium">{socio.nome || `Sócio ${idx + 1}`}</p>
                                    <p className="text-zinc-500 text-xs">
                                        {socio.administrador ? '✓ Administrador atual' : 'Não é administrador'}
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                ) : (
                    <p className="text-zinc-500 text-sm text-center py-4">
                        Nenhum sócio encontrado. Faça o upload do contrato na etapa 1.
                    </p>
                )}
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <Label className="text-zinc-400 text-xs uppercase mb-2 block">Poderes dos Administradores</Label>
                <Textarea 
                    value={dados.poderesAdmin || 'Os administradores terão poderes para, em conjunto ou isoladamente, praticar todos os atos necessários à administração da sociedade, podendo representá-la ativa e passivamente, em juízo ou fora dele.'}
                    onChange={(e) => onChange({...dados, poderesAdmin: e.target.value})}
                    className="bg-zinc-900 border-zinc-700"
                    rows={4}
                />
            </div>
        </div>
    );
};

// Componente para outras alterações (cláusulas específicas)
const FormularioOutras = ({ dados, onChange, dadosExtraidos }) => {
    const clausulas = dadosExtraidos?.clausulas || [];
    
    const toggleClausula = (idx) => {
        const clausulasParaAlterar = dados.clausulasParaAlterar || [];
        const existe = clausulasParaAlterar.find(c => c.indice === idx);
        if (existe) {
            onChange({
                ...dados, 
                clausulasParaAlterar: clausulasParaAlterar.filter(c => c.indice !== idx)
            });
        } else {
            onChange({
                ...dados, 
                clausulasParaAlterar: [...clausulasParaAlterar, { 
                    indice: idx, 
                    textoOriginal: clausulas[idx]?.texto || clausulas[idx],
                    textoNovo: '' 
                }]
            });
        }
    };
    
    const atualizarTextoNovo = (idx, texto) => {
        const clausulasParaAlterar = dados.clausulasParaAlterar || [];
        onChange({
            ...dados,
            clausulasParaAlterar: clausulasParaAlterar.map(c => 
                c.indice === idx ? { ...c, textoNovo: texto } : c
            )
        });
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    Cláusulas do Contrato
                </h4>
                <p className="text-zinc-500 text-sm mb-4">
                    Selecione as cláusulas que deseja alterar e insira o novo texto.
                </p>
                
                {clausulas.length > 0 ? (
                    <div className="space-y-3">
                        {clausulas.map((clausula, idx) => {
                            const texto = typeof clausula === 'string' ? clausula : clausula.texto;
                            const titulo = typeof clausula === 'object' ? clausula.titulo : `Cláusula ${idx + 1}`;
                            const selecionada = dados.clausulasParaAlterar?.find(c => c.indice === idx);
                            
                            return (
                                <div key={idx} className={`rounded-lg border ${selecionada ? 'border-red-500 bg-red-500/5' : 'border-zinc-800'}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleClausula(idx)}
                                        className="w-full p-3 flex items-start gap-3 text-left"
                                    >
                                        <Checkbox checked={!!selecionada} />
                                        <div className="flex-1">
                                            <p className="text-white font-medium text-sm">{titulo}</p>
                                            <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{texto?.substring(0, 150)}...</p>
                                        </div>
                                    </button>
                                    
                                    {selecionada && (
                                        <div className="p-3 pt-0 space-y-3 border-t border-zinc-800">
                                            <div>
                                                <Label className="text-zinc-500 text-xs">Texto Original</Label>
                                                <div className="bg-zinc-900 p-2 rounded text-xs text-zinc-400 max-h-24 overflow-y-auto mt-1">
                                                    {selecionada.textoOriginal}
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-zinc-400 text-xs">Novo Texto da Cláusula *</Label>
                                                <Textarea
                                                    value={selecionada.textoNovo}
                                                    onChange={(e) => atualizarTextoNovo(idx, e.target.value)}
                                                    placeholder="Digite o novo texto para esta cláusula..."
                                                    className="bg-zinc-900 border-zinc-700 mt-1"
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            Nenhuma cláusula identificada no contrato.
                        </p>
                        <p className="text-zinc-600 text-xs mt-1">
                            Faça o upload do contrato na etapa 1 para extrair as cláusulas.
                        </p>
                    </div>
                )}
            </div>
            
            {/* Campo para adicionar cláusula manualmente */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-500" />
                    Adicionar Alteração Manual
                </h4>
                <div className="space-y-3">
                    <div>
                        <Label className="text-zinc-400 text-xs">Identificação da Cláusula</Label>
                        <Input
                            value={dados.clausulaManualTitulo || ''}
                            onChange={(e) => onChange({...dados, clausulaManualTitulo: e.target.value})}
                            placeholder="Ex: Cláusula 5ª - Do Objeto Social"
                            className="bg-zinc-900 border-zinc-700 mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400 text-xs">Novo Texto</Label>
                        <Textarea
                            value={dados.clausulaManualTexto || ''}
                            onChange={(e) => onChange({...dados, clausulaManualTexto: e.target.value})}
                            placeholder="Digite o novo texto que deve constar na cláusula..."
                            className="bg-zinc-900 border-zinc-700 mt-1"
                            rows={4}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente principal do Wizard
const WizardAlteracao = ({ open, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [buscandoCnpj, setBuscandoCnpj] = useState(false);
    
    // Step 1 - Contrato
    const [contratoFile, setContratoFile] = useState(null);
    const [dadosExtraidos, setDadosExtraidos] = useState(null);
    const [minutaId, setMinutaId] = useState(null);
    const [cnpjInput, setCnpjInput] = useState('');
    const [textoContratoOriginal, setTextoContratoOriginal] = useState(''); // Texto completo do contrato original
    
    // Step 2 - Tipos de alteração
    const [alteracoesSelecionadas, setAlteracoesSelecionadas] = useState([]);
    
    // Step 3 - Dados específicos por tipo
    const [dadosQSA, setDadosQSA] = useState({ tiposQSA: [], sociosSaindo: [], sociosEntrando: [], sociosRetirantes: [], sociosRedistribuicao: [], novasParticipacoes: {} });
    const [dadosEndereco, setDadosEndereco] = useState({});
    const [dadosAtividades, setDadosAtividades] = useState({ cnaesExcluir: [], cnaesAdicionar: [] });
    const [dadosCapital, setDadosCapital] = useState({ tipoCapital: 'aumento', novoCapital: '', motivoCapital: '' });
    const [dadosNome, setDadosNome] = useState({ novaRazaoSocial: '', novoNomeFantasia: '' });
    const [dadosAdministracao, setDadosAdministracao] = useState({ novosAdministradores: [], poderesAdmin: '' });
    const [dadosOutras, setDadosOutras] = useState({ clausulasParaAlterar: [], clausulaManualTitulo: '', clausulaManualTexto: '' });
    
    // Step 4 - Resultado
    const [minutaGerada, setMinutaGerada] = useState('');
    const [temRascunhoSalvo, setTemRascunhoSalvo] = useState(false);
    
    const contratoInputRef = useRef(null);
    
    const STORAGE_KEY = 'wizard_alteracao_rascunho';

    // Verificar se há rascunho salvo ao abrir
    useEffect(() => {
        if (open) {
            const rascunho = localStorage.getItem(STORAGE_KEY);
            if (rascunho) {
                setTemRascunhoSalvo(true);
            }
        }
    }, [open]);

    // Salvar rascunho automaticamente quando houver progresso
    useEffect(() => {
        if (step > 1 || dadosExtraidos || alteracoesSelecionadas.length > 0) {
            const rascunho = {
                step,
                minutaId,
                dadosExtraidos,
                alteracoesSelecionadas,
                dadosQSA,
                dadosEndereco,
                dadosAtividades,
                dadosCapital,
                dadosNome,
                dadosAdministracao,
                dadosOutras,
                cnpjInput,
                textoContratoOriginal,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rascunho));
        }
    }, [step, minutaId, dadosExtraidos, alteracoesSelecionadas, dadosQSA, dadosEndereco, dadosAtividades, dadosCapital, dadosNome, dadosAdministracao, dadosOutras, cnpjInput, textoContratoOriginal]);

    // Função para restaurar rascunho
    const restaurarRascunho = () => {
        const rascunhoStr = localStorage.getItem(STORAGE_KEY);
        if (rascunhoStr) {
            try {
                const rascunho = JSON.parse(rascunhoStr);
                setStep(rascunho.step || 1);
                setMinutaId(rascunho.minutaId);
                setDadosExtraidos(rascunho.dadosExtraidos);
                setAlteracoesSelecionadas(rascunho.alteracoesSelecionadas || []);
                setDadosQSA(rascunho.dadosQSA || { tiposQSA: [], sociosSaindo: [], sociosEntrando: [], sociosRetirantes: [], sociosRedistribuicao: [], novasParticipacoes: {} });
                setDadosEndereco(rascunho.dadosEndereco || {});
                setDadosAtividades(rascunho.dadosAtividades || { cnaesExcluir: [], cnaesAdicionar: [] });
                setDadosCapital(rascunho.dadosCapital || { tipoCapital: 'aumento', novoCapital: '', motivoCapital: '' });
                setDadosNome(rascunho.dadosNome || { novaRazaoSocial: '', novoNomeFantasia: '' });
                setDadosAdministracao(rascunho.dadosAdministracao || { novosAdministradores: [], poderesAdmin: '' });
                setDadosOutras(rascunho.dadosOutras || { clausulasParaAlterar: [], clausulaManualTitulo: '', clausulaManualTexto: '' });
                setCnpjInput(rascunho.cnpjInput || '');
                setTextoContratoOriginal(rascunho.textoContratoOriginal || '');
                setTemRascunhoSalvo(false);
                toast.success('Rascunho restaurado! Continue de onde parou.');
            } catch (e) {
                console.error('Erro ao restaurar rascunho:', e);
                toast.error('Erro ao restaurar rascunho');
            }
        }
    };

    // Limpar rascunho
    const limparRascunho = () => {
        localStorage.removeItem(STORAGE_KEY);
        setTemRascunhoSalvo(false);
    };

    const resetWizard = () => {
        setStep(1);
        setContratoFile(null);
        setDadosExtraidos(null);
        setAlteracoesSelecionadas([]);
        setDadosQSA({ tiposQSA: [], sociosSaindo: [], sociosEntrando: [], sociosRetirantes: [], sociosRedistribuicao: [], novasParticipacoes: {} });
        setDadosEndereco({});
        setDadosAtividades({ cnaesExcluir: [], cnaesAdicionar: [] });
        setDadosCapital({ tipoCapital: 'aumento', novoCapital: '', motivoCapital: '' });
        setDadosNome({ novaRazaoSocial: '', novoNomeFantasia: '' });
        setDadosAdministracao({ novosAdministradores: [], poderesAdmin: '' });
        setDadosOutras({ clausulasParaAlterar: [], clausulaManualTitulo: '', clausulaManualTexto: '' });
        setMinutaGerada('');
        setMinutaId(null);
        setCnpjInput('');
        setTextoContratoOriginal('');
        setTemRascunhoSalvo(false);
        limparRascunho();
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // Buscar dados na Receita Federal pelo CNPJ
    const handleBuscarCnpj = async () => {
        const cnpjLimpo = cnpjInput.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14) {
            toast.error('CNPJ deve ter 14 dígitos');
            return;
        }
        
        setBuscandoCnpj(true);
        try {
            const response = await axios.get(`${API_URL}/api/cnpj/${cnpjLimpo}`);
            if (response.data.success) {
                const { empresa, cnaes, qsa } = response.data;
                
                // Mesclar com dados existentes ou criar novos
                setDadosExtraidos(prev => ({
                    ...prev,
                    empresa: {
                        ...prev?.empresa,
                        ...empresa,
                        cnpj: empresa.cnpj,
                        razao_social: empresa.razao_social,
                        nome_fantasia: empresa.nome_fantasia,
                        endereco: empresa.endereco,
                        capital_social: empresa.capital_social
                    },
                    cnaes: cnaes,
                    socios: qsa?.map(s => ({
                        nome: s.nome,
                        qualificacao: s.qual
                    })) || prev?.socios || []
                }));
                
                toast.success(`CNAEs da empresa carregados: ${cnaes.length} atividade(s)`);
            }
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            const msg = error.response?.data?.detail || 'Erro ao consultar Receita Federal';
            toast.error(msg);
        } finally {
            setBuscandoCnpj(false);
        }
    };

    // Step 1: Upload e análise do contrato
    const handleContratoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setContratoFile(file);
        setProcessing(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tipo_alteracao', 'alteracao');
            formData.append('tipo_processo', 'alteracao');
            formData.append('descricao', 'Análise inicial do contrato para alteração');
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setMinutaId(uploadRes.data.id);
            
            // Extração estruturada
            const extractRes = await axios.post(`${API_URL}/api/minutas/${uploadRes.data.id}/extrair-dados`);
            
            if (extractRes.data.success && extractRes.data.dados) {
                const dados = extractRes.data.dados;
                setDadosExtraidos(dados);
                
                // Armazenar as cláusulas originais para consolidação
                if (dados.clausulas && dados.clausulas.length > 0) {
                    const textoClausulas = dados.clausulas.map(c => 
                        `CLÁUSULA ${c.numero || ''} - ${c.titulo || ''}\n${c.texto || ''}`
                    ).join('\n\n');
                    setTextoContratoOriginal(textoClausulas);
                }
                
                // Se extraiu CNPJ, buscar CNAEs automaticamente na Receita
                if (dados.empresa?.cnpj) {
                    setCnpjInput(dados.empresa.cnpj);
                    try {
                        const cnpjLimpo = dados.empresa.cnpj.replace(/\D/g, '');
                        if (cnpjLimpo.length === 14) {
                            const receitaRes = await axios.get(`${API_URL}/api/cnpj/${cnpjLimpo}`);
                            if (receitaRes.data.success) {
                                setDadosExtraidos(prev => ({
                                    ...prev,
                                    cnaes: receitaRes.data.cnaes,
                                    empresa: {
                                        ...prev?.empresa,
                                        ...receitaRes.data.empresa
                                    }
                                }));
                                toast.success(`CNAEs carregados da Receita Federal: ${receitaRes.data.cnaes?.length || 0} atividade(s)`);
                            }
                        }
                    } catch (receitaError) {
                        console.log('Não foi possível buscar CNAEs na Receita:', receitaError.message);
                    }
                }
                
                toast.success('Contrato analisado com sucesso!');
            } else {
                toast.warning('Análise parcial. Alguns dados podem não estar disponíveis.');
            }
        } catch (e) {
            console.error('Erro ao analisar:', e);
            toast.error('Erro ao analisar contrato');
        } finally {
            setProcessing(false);
        }
    };

    const toggleAlteracao = (id) => {
        setAlteracoesSelecionadas(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const gerarMinutaFinal = async () => {
        if (!minutaId) return;
        
        setProcessing(true);
        try {
            const empresa = dadosExtraidos?.empresa || {};
            const socios = dadosExtraidos?.socios || [];
            
            // Montar descrição detalhada das alterações
            let descricaoCompleta = '';
            
            if (alteracoesSelecionadas.includes('socios')) {
                descricaoCompleta += `\n\nALTERAÇÃO DE SÓCIOS (QSA):\n`;
                const tiposQSA = dadosQSA.tiposQSA || [];
                
                // Saída de sócios
                if (tiposQSA.includes('saida')) {
                    descricaoCompleta += `\n[SAÍDA DE SÓCIOS]\n`;
                    // Sócios selecionados da lista extraída
                    if (dadosQSA.sociosSaindo?.length > 0) {
                        const sociosSaindo = dadosQSA.sociosSaindo.map(idx => socios[idx]?.nome || `Sócio ${idx+1}`);
                        descricaoCompleta += `- Sócios retirantes: ${sociosSaindo.join(', ')}\n`;
                    }
                    // Sócios adicionados manualmente
                    if (dadosQSA.sociosRetirantes?.length > 0) {
                        dadosQSA.sociosRetirantes.forEach(s => {
                            descricaoCompleta += `- Sócio retirante: ${s.nome}, CPF ${s.cpf}, participação ${s.participacao}%\n`;
                        });
                    }
                }
                
                // Entrada de sócios
                if (tiposQSA.includes('entrada') && dadosQSA.sociosEntrando?.length > 0) {
                    descricaoCompleta += `\n[ENTRADA DE SÓCIOS]\n`;
                    dadosQSA.sociosEntrando.forEach(s => {
                        const endereco = s.endereco || {};
                        descricaoCompleta += `- Novo sócio: ${s.nome}, ${s.nacionalidade}, ${s.estadoCivil}, ${s.profissao}\n`;
                        descricaoCompleta += `  CPF: ${s.cpf}, RG: ${s.rg} ${s.orgaoEmissor}\n`;
                        descricaoCompleta += `  Endereço: ${endereco.logradouro || ''}, ${endereco.numero || ''}, ${endereco.bairro || ''}, ${endereco.cidade || ''}-${endereco.estado || ''}, CEP ${endereco.cep || ''}\n`;
                        descricaoCompleta += `  Participação: ${s.participacao}%\n`;
                    });
                }
                
                // Redistribuição de cotas
                if (tiposQSA.includes('redistribuicao')) {
                    descricaoCompleta += `\n[REDISTRIBUIÇÃO DE COTAS]\n`;
                    descricaoCompleta += `- Nova distribuição do capital social:\n`;
                    // Sócios extraídos
                    Object.entries(dadosQSA.novasParticipacoes || {}).forEach(([idx, valor]) => {
                        descricaoCompleta += `  - ${socios[idx]?.nome || `Sócio ${parseInt(idx)+1}`}: ${valor}%\n`;
                    });
                    // Sócios adicionados manualmente
                    if (dadosQSA.sociosRedistribuicao?.length > 0) {
                        dadosQSA.sociosRedistribuicao.forEach(s => {
                            descricaoCompleta += `  - ${s.nome}${s.cpf ? `, CPF ${s.cpf}` : ''}: de ${s.participacaoAtual || '?'}% para ${s.novaParticipacao}%\n`;
                        });
                    }
                }
            }
            
            if (alteracoesSelecionadas.includes('endereco')) {
                descricaoCompleta += `\n\nALTERAÇÃO DE ENDEREÇO:\n`;
                descricaoCompleta += `Novo endereço: ${dadosEndereco.logradouro}, ${dadosEndereco.numero}`;
                if (dadosEndereco.complemento) descricaoCompleta += `, ${dadosEndereco.complemento}`;
                descricaoCompleta += `, ${dadosEndereco.bairro}, ${dadosEndereco.cidade}-${dadosEndereco.estado}, CEP ${dadosEndereco.cep}\n`;
            }
            
            if (alteracoesSelecionadas.includes('atividade')) {
                descricaoCompleta += `\n\nALTERAÇÃO DE ATIVIDADES:\n`;
                if (dadosAtividades.cnaesExcluir?.length > 0) {
                    descricaoCompleta += `- CNAEs a excluir:\n`;
                    dadosAtividades.cnaesExcluir.forEach(c => {
                        descricaoCompleta += `  - ${c.codigo} - ${c.descricao}\n`;
                    });
                }
                if (dadosAtividades.cnaesAdicionar?.length > 0) {
                    descricaoCompleta += `- CNAEs a adicionar:\n`;
                    dadosAtividades.cnaesAdicionar.forEach(c => {
                        descricaoCompleta += `  - ${c.codigo} - ${c.descricao}\n`;
                    });
                }
            }
            
            if (alteracoesSelecionadas.includes('capital')) {
                descricaoCompleta += `\n\nALTERAÇÃO DE CAPITAL:\n`;
                descricaoCompleta += `- Tipo: ${dadosCapital.tipoCapital === 'aumento' ? 'Aumento' : 'Redução'} de capital\n`;
                descricaoCompleta += `- Novo valor: R$ ${dadosCapital.novoCapital}\n`;
                if (dadosCapital.motivoCapital) {
                    descricaoCompleta += `- Motivo: ${dadosCapital.motivoCapital}\n`;
                }
            }
            
            if (alteracoesSelecionadas.includes('nome')) {
                descricaoCompleta += `\n\nALTERAÇÃO DE NOME:\n`;
                if (dadosNome.novaRazaoSocial) {
                    descricaoCompleta += `- Nova razão social: ${dadosNome.novaRazaoSocial}\n`;
                }
                if (dadosNome.novoNomeFantasia) {
                    descricaoCompleta += `- Novo nome fantasia: ${dadosNome.novoNomeFantasia}\n`;
                }
            }
            
            if (alteracoesSelecionadas.includes('administracao')) {
                descricaoCompleta += `\n\nALTERAÇÃO DE ADMINISTRAÇÃO:\n`;
                const novosAdmins = dadosAdministracao.novosAdministradores?.map(idx => socios[idx]?.nome || `Sócio ${idx+1}`);
                descricaoCompleta += `- Novos administradores: ${novosAdmins?.join(', ') || 'Não definidos'}\n`;
            }
            
            if (alteracoesSelecionadas.includes('outras')) {
                descricaoCompleta += `\n\nOUTRAS ALTERAÇÕES DE CLÁUSULAS:\n`;
                if (dadosOutras.clausulasParaAlterar?.length > 0) {
                    dadosOutras.clausulasParaAlterar.forEach(c => {
                        if (c.textoNovo) {
                            descricaoCompleta += `\n- Cláusula alterada:\n`;
                            descricaoCompleta += `  Texto anterior: ${c.textoOriginal?.substring(0, 100)}...\n`;
                            descricaoCompleta += `  Novo texto: ${c.textoNovo}\n`;
                        }
                    });
                }
                if (dadosOutras.clausulaManualTitulo || dadosOutras.clausulaManualTexto) {
                    descricaoCompleta += `\n- Alteração manual:\n`;
                    if (dadosOutras.clausulaManualTitulo) descricaoCompleta += `  ${dadosOutras.clausulaManualTitulo}\n`;
                    if (dadosOutras.clausulaManualTexto) descricaoCompleta += `  ${dadosOutras.clausulaManualTexto}\n`;
                }
            }
            
            const tiposStr = alteracoesSelecionadas.map(id => 
                TIPOS_ALTERACAO.find(t => t.id === id)?.label
            ).join(', ');

            const prompt = `GERE UMA MINUTA DE ALTERAÇÃO CONTRATUAL completa e formal:

DADOS DA EMPRESA:
- Razão Social: ${empresa.razao_social || '[RAZÃO SOCIAL]'}
- CNPJ: ${empresa.cnpj || '[CNPJ]'}
- Endereço: ${empresa.endereco || '[ENDEREÇO]'}

QUADRO SOCIETÁRIO ATUAL:
${socios.map((s, i) => `${i+1}. ${s.nome}, CPF ${s.cpf}, ${s.participacao || 'participação não informada'}${s.administrador ? ' - ADMINISTRADOR' : ''}`).join('\n') || '[LISTAR SÓCIOS]'}

TIPOS DE ALTERAÇÃO: ${tiposStr}

DETALHES DAS ALTERAÇÕES:
${descricaoCompleta}

${textoContratoOriginal ? `CLÁUSULAS DO CONTRATO ORIGINAL (para consolidação):
${textoContratoOriginal}

INSTRUÇÃO IMPORTANTE PARA CONSOLIDAÇÃO:
A consolidação do contrato deve MANTER TODAS as cláusulas originais listadas acima, modificando APENAS as informações que foram alteradas. Não omita ou exclua cláusulas que não foram alteradas.
` : ''}

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO CENTRALIZADO: ALTERAÇÃO DO CONTRATO SOCIAL DE ${empresa.razao_social || '[RAZÃO SOCIAL]'}

2. PREÂMBULO: Identificação do instrumento e dos sócios

3. CLÁUSULAS DE ALTERAÇÃO: Uma cláusula para cada tipo de alteração realizada

4. CONSOLIDAÇÃO DO CONTRATO SOCIAL: Contrato social completo e atualizado, mantendo TODAS as cláusulas originais e atualizando apenas as informações que foram alteradas. A consolidação deve ser completa, incluindo todas as cláusulas do contrato original.

5. ENCERRAMENTO: Local, data e espaço para assinaturas

Use linguagem jurídica formal. O documento deve estar pronto para registro na Junta Comercial.`;

            const chatRes = await axios.post(`${API_URL}/api/minutas/${minutaId}/chat`, {
                message: prompt,
                minuta_id: minutaId
            });
            
            setMinutaGerada(chatRes.data.response);
            
            await axios.post(`${API_URL}/api/minutas/${minutaId}/gerar`);
            
            // Limpar rascunho após sucesso
            limparRascunho();
            
            toast.success('Minuta gerada!');
            setStep(4);
            onComplete();
        } catch (e) {
            console.error('Erro:', e);
            toast.error('Erro ao gerar minuta');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(minutaGerada);
        toast.success('Texto copiado!');
    };

    const downloadPDF = async () => {
        if (!minutaId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${minutaId}/download/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `alteracao_contratual.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('PDF baixado!');
        } catch (e) {
            toast.error('Erro ao baixar PDF');
        }
    };

    const downloadWord = async () => {
        if (!minutaId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${minutaId}/download/word`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `alteracao_contratual.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Word baixado!');
        } catch (e) {
            toast.error('Erro ao baixar Word');
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return contratoFile !== null;
            case 2: return alteracoesSelecionadas.length > 0;
            case 3: return true; // Validação específica por tipo seria aqui
            default: return true;
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-500" />
                        Nova Alteração Contratual
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-4">
                        {[1,2,3,4].map(s => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {s}
                                </div>
                                {s < 4 && <div className={`w-16 h-1 ${step > s ? 'bg-red-600' : 'bg-zinc-800'}`} />}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 mt-1 px-2">
                        <span>Contrato</span>
                        <span>Tipos</span>
                        <span>Detalhes</span>
                        <span>Resultado</span>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Upload Contrato */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Banner para restaurar rascunho */}
                            {temRascunhoSalvo && (
                                <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <RefreshCw className="w-5 h-5 text-blue-500" />
                                            <div>
                                                <p className="text-white font-medium">Processo não finalizado encontrado</p>
                                                <p className="text-zinc-400 text-xs">Você tem um rascunho salvo. Deseja continuar de onde parou?</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant="outline" 
                                                className="border-zinc-600"
                                                onClick={() => { limparRascunho(); setTemRascunhoSalvo(false); }}
                                            >
                                                Descartar
                                            </Button>
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={restaurarRascunho}
                                            >
                                                Continuar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Upload do Contrato Atual</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Envie o contrato social atual. A IA irá extrair os dados da empresa, sócios e buscar os CNAEs na Receita Federal.
                                </p>
                                
                                <div 
                                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${contratoFile ? 'border-green-600/50 bg-green-950/20' : 'border-zinc-700 hover:border-red-600/50 hover:bg-red-950/10'}`}
                                    onClick={() => contratoInputRef.current?.click()}
                                >
                                    <input ref={contratoInputRef} type="file" onChange={handleContratoUpload} accept=".pdf,.jpg,.jpeg,.png,.docx" className="hidden" />
                                    
                                    {processing ? (
                                        <div className="text-red-500">
                                            <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin" />
                                            <p className="font-medium">Analisando contrato...</p>
                                            <p className="text-xs text-zinc-500 mt-1">Extraindo dados e buscando CNAEs na Receita Federal</p>
                                        </div>
                                    ) : contratoFile ? (
                                        <div className="text-green-500">
                                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                                            <p className="font-medium">{contratoFile.name}</p>
                                            <p className="text-xs text-green-400 mt-1">Contrato analisado com sucesso!</p>
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500">
                                            <Upload className="w-12 h-12 mx-auto mb-3" />
                                            <p className="font-medium text-zinc-300">Clique para fazer upload</p>
                                            <p className="text-xs mt-1">PDF, DOCX ou Imagem</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Busca manual por CNPJ */}
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                    <Search className="w-4 h-4 text-red-500" />
                                    Buscar CNAEs na Receita Federal
                                </h4>
                                <p className="text-zinc-500 text-xs mb-3">
                                    Informe o CNPJ para buscar os CNAEs diretamente na Receita Federal.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        value={cnpjInput}
                                        onChange={(e) => setCnpjInput(e.target.value)}
                                        placeholder="00.000.000/0000-00"
                                        className="bg-zinc-900 border-zinc-700"
                                    />
                                    <Button 
                                        type="button"
                                        onClick={handleBuscarCnpj}
                                        disabled={buscandoCnpj || !cnpjInput}
                                        className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                    >
                                        {buscandoCnpj ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                                        {buscandoCnpj ? 'Buscando...' : 'Buscar'}
                                    </Button>
                                </div>
                            </div>
                            
                            {dadosExtraidos && (
                                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-white font-medium mb-3">Dados Extraídos</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-zinc-500">Razão Social:</span>
                                            <p className="text-white">{dadosExtraidos.empresa?.razao_social || 'Não identificado'}</p>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">CNPJ:</span>
                                            <p className="text-white">{dadosExtraidos.empresa?.cnpj || 'Não identificado'}</p>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">Sócios:</span>
                                            <p className="text-white">{dadosExtraidos.socios?.length || 0} encontrado(s)</p>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">CNAEs (Receita Federal):</span>
                                            <p className="text-white">{dadosExtraidos.cnaes?.length || 0} atividade(s)</p>
                                        </div>
                                    </div>
                                    
                                    {/* Listar CNAEs carregados */}
                                    {dadosExtraidos.cnaes?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-zinc-800">
                                            <p className="text-zinc-500 text-xs mb-2">Atividades cadastradas na Receita:</p>
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {dadosExtraidos.cnaes.map((cnae, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        <span className={`font-mono ${cnae.principal ? 'text-green-400' : 'text-zinc-400'}`}>
                                                            {cnae.codigo}
                                                        </span>
                                                        <span className="text-zinc-500">-</span>
                                                        <span className="text-zinc-400 truncate">{cnae.descricao}</span>
                                                        {cnae.principal && <span className="text-green-500 text-[10px]">(Principal)</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Seleção de tipos */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">O que será alterado?</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Selecione todos os tipos de alteração que serão realizados neste processo.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {TIPOS_ALTERACAO.map(tipo => {
                                    const Icon = tipo.icon;
                                    const selecionado = alteracoesSelecionadas.includes(tipo.id);
                                    return (
                                        <button
                                            key={tipo.id}
                                            type="button"
                                            onClick={() => toggleAlteracao(tipo.id)}
                                            className={`p-4 rounded-lg border text-left transition-all ${selecionado ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selecionado ? 'bg-red-500' : 'bg-zinc-800'}`}>
                                                    <Icon className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className={`font-medium ${selecionado ? 'text-red-400' : 'text-white'}`}>{tipo.label}</p>
                                                    <p className="text-xs text-zinc-500 mt-1">{tipo.description}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Formulários específicos */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Detalhes das Alterações</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Preencha os detalhes de cada alteração selecionada. Use os botões de IA para preencher automaticamente.
                                </p>
                            </div>
                            
                            {alteracoesSelecionadas.includes('socios') && (
                                <div className="border-b border-zinc-800 pb-6">
                                    <FormularioQSA dados={dadosQSA} onChange={setDadosQSA} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                            
                            {alteracoesSelecionadas.includes('endereco') && (
                                <div className="border-b border-zinc-800 pb-6">
                                    <FormularioEndereco dados={dadosEndereco} onChange={setDadosEndereco} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                            
                            {alteracoesSelecionadas.includes('atividade') && (
                                <div className="border-b border-zinc-800 pb-6">
                                    <FormularioAtividades dados={dadosAtividades} onChange={setDadosAtividades} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                            
                            {alteracoesSelecionadas.includes('capital') && (
                                <div className="border-b border-zinc-800 pb-6">
                                    <FormularioCapital dados={dadosCapital} onChange={setDadosCapital} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                            
                            {alteracoesSelecionadas.includes('nome') && (
                                <div className="border-b border-zinc-800 pb-6">
                                    <FormularioNome dados={dadosNome} onChange={setDadosNome} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                            
                            {alteracoesSelecionadas.includes('administracao') && (
                                <div className="border-b border-zinc-800 pb-6">
                                    <FormularioAdministracao dados={dadosAdministracao} onChange={setDadosAdministracao} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                            
                            {alteracoesSelecionadas.includes('outras') && (
                                <div>
                                    <FormularioOutras dados={dadosOutras} onChange={setDadosOutras} dadosExtraidos={dadosExtraidos} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Resultado */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Minuta de Alteração Gerada</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={downloadWord} className="bg-blue-600 hover:bg-blue-700">
                                        <FileDown className="w-4 h-4 mr-2" /> Word
                                    </Button>
                                    <Button size="sm" onClick={downloadPDF} className="bg-red-600 hover:bg-red-700">
                                        <FileDown className="w-4 h-4 mr-2" /> PDF
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-zinc-700">
                                        <Copy className="w-4 h-4 mr-2" /> Copiar
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-white text-black rounded-lg p-6 max-h-[450px] overflow-y-auto border">
                                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>{minutaGerada}</pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 p-4 flex justify-between">
                    <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : handleClose()} className="border-zinc-700">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </Button>
                    
                    {step < 3 && (
                        <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="bg-red-600 hover:bg-red-700">
                            Próximo <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                    
                    {step === 3 && (
                        <Button onClick={gerarMinutaFinal} disabled={processing} className="bg-red-600 hover:bg-red-700">
                            {processing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar Minuta</>}
                        </Button>
                    )}
                    
                    {step === 4 && (
                        <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WizardAlteracao;
