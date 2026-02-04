import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
    Building2, ChevronLeft, ChevronRight, Upload, X, RefreshCw, CheckCircle2,
    Users, MapPin, Briefcase, DollarSign, FileText, Plus, Trash2, FileDown, Copy,
    User, Percent, Sparkles
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

// Estados brasileiros
const ESTADOS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
    'SP', 'SE', 'TO'
];

const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
const REGIMES_CASAMENTO = ['Comunhão Parcial de Bens', 'Comunhão Universal de Bens', 'Separação Total de Bens', 'Participação Final nos Aquestos'];

// Função para converter número para extenso
const numeroParaExtenso = (valor) => {
    if (!valor || valor === 0) return '';
    
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    
    const converterGrupo = (n) => {
        if (n === 0) return '';
        if (n === 100) return 'cem';
        
        let resultado = '';
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;
        
        if (c > 0) resultado += centenas[c];
        
        if (d === 1) {
            if (resultado) resultado += ' e ';
            resultado += especiais[u];
        } else {
            if (d > 1) {
                if (resultado) resultado += ' e ';
                resultado += dezenas[d];
            }
            if (u > 0) {
                if (resultado) resultado += ' e ';
                resultado += unidades[u];
            }
        }
        return resultado;
    };
    
    const num = Math.floor(valor);
    const centavos = Math.round((valor - num) * 100);
    
    if (num === 0 && centavos > 0) {
        return `${converterGrupo(centavos)} centavo${centavos > 1 ? 's' : ''}`;
    }
    
    let resultado = '';
    
    // Milhões
    const milhoes = Math.floor(num / 1000000);
    if (milhoes > 0) {
        resultado += converterGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
    }
    
    // Milhares
    const milhares = Math.floor((num % 1000000) / 1000);
    if (milhares > 0) {
        if (resultado) resultado += ' ';
        if (milhares === 1) {
            resultado += 'mil';
        } else {
            resultado += converterGrupo(milhares) + ' mil';
        }
    }
    
    // Centenas
    const resto = num % 1000;
    if (resto > 0) {
        if (resultado) {
            resultado += (resto < 100 ? ' e ' : ' ');
        }
        resultado += converterGrupo(resto);
    }
    
    resultado += ' rea' + (num === 1 ? 'l' : 'is');
    
    if (centavos > 0) {
        resultado += ' e ' + converterGrupo(centavos) + ' centavo' + (centavos > 1 ? 's' : '');
    }
    
    // Capitalizar primeira letra
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

// Função para formatar moeda
const formatarMoeda = (valor) => {
    const numero = valor.replace(/\D/g, '');
    const valorNumerico = parseFloat(numero) / 100;
    return valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Componente de qualificação de sócio com extração por IA
const SocioCard = ({ socio, index, onChange, onRemove, canRemove }) => {
    const docInputRef = useRef(null);
    const [extraindo, setExtraindo] = useState(false);
    
    const handleDocUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindo(true);
        toast.info('Extraindo dados do documento...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('campo', 'socio');
            
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
                    endereco: dados.endereco || socio.endereco,
                    documentos: [...(socio.documentos || []), file]
                });
                toast.success('Dados extraídos com sucesso!');
            } else {
                // Apenas anexar o documento
                onChange({
                    ...socio,
                    documentos: [...(socio.documentos || []), file]
                });
                toast.info('Documento anexado');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            // Anexar documento mesmo com erro
            onChange({
                ...socio,
                documentos: [...(socio.documentos || []), file]
            });
            toast.warning('Documento anexado (extração indisponível)');
        } finally {
            setExtraindo(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };
    
    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="font-medium text-white">Sócio {index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        disabled={extraindo}
                        className="text-xs bg-red-600/20 text-red-500 hover:bg-red-600/30 px-3 py-1.5 rounded flex items-center gap-1"
                    >
                        {extraindo ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Preencher com IA
                    </button>
                    {canRemove && (
                        <button onClick={onRemove} className="text-zinc-500 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            
            <input 
                ref={docInputRef} 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png" 
                className="hidden" 
                onChange={handleDocUpload}
            />
            
            <p className="text-xs text-zinc-500">
                Anexe CNH, RG ou outro documento para preenchimento automático
            </p>
            
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Nome Completo *</Label>
                    <Input
                        value={socio.nome}
                        onChange={(e) => onChange({ ...socio, nome: e.target.value.toUpperCase() })}
                        placeholder="NOME COMPLETO EM MAIÚSCULAS"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">CPF *</Label>
                    <Input
                        value={socio.cpf}
                        onChange={(e) => onChange({ ...socio, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">RG</Label>
                    <Input
                        value={socio.rg}
                        onChange={(e) => onChange({ ...socio, rg: e.target.value })}
                        placeholder="00.000.000-0"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Órgão Emissor</Label>
                    <Input
                        value={socio.orgaoEmissor}
                        onChange={(e) => onChange({ ...socio, orgaoEmissor: e.target.value })}
                        placeholder="SSP/SP"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Nacionalidade</Label>
                    <Input
                        value={socio.nacionalidade}
                        onChange={(e) => onChange({ ...socio, nacionalidade: e.target.value })}
                        placeholder="Brasileiro(a)"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Estado Civil</Label>
                    <Select value={socio.estadoCivil} onValueChange={(v) => onChange({ ...socio, estadoCivil: v })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
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
                        <Label className="text-zinc-500 text-xs">Regime de Casamento</Label>
                        <Select value={socio.regimeCasamento} onValueChange={(v) => onChange({ ...socio, regimeCasamento: v })}>
                            <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
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
                {socio.estadoCivil !== 'Casado(a)' && (
                    <>
                        <div>
                            <Label className="text-zinc-500 text-xs">Profissão</Label>
                            <Input
                                value={socio.profissao}
                                onChange={(e) => onChange({ ...socio, profissao: e.target.value })}
                                placeholder="Empresário"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                            />
                        </div>
                        <div></div>
                    </>
                )}
            </div>
            
            {socio.estadoCivil === 'Casado(a)' && (
                <div>
                    <Label className="text-zinc-500 text-xs">Profissão</Label>
                    <Input
                        value={socio.profissao}
                        onChange={(e) => onChange({ ...socio, profissao: e.target.value })}
                        placeholder="Empresário"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                    />
                </div>
            )}
            
            <div>
                <Label className="text-zinc-500 text-xs">Endereço Completo</Label>
                <Input
                    value={socio.endereco}
                    onChange={(e) => onChange({ ...socio, endereco: e.target.value })}
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                    className="bg-zinc-900 border-zinc-700 mt-1"
                />
            </div>
            
            {/* Documentos anexados */}
            {socio.documentos && socio.documentos.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                    <Label className="text-zinc-500 text-xs mb-2 block">Documentos anexados</Label>
                    <div className="flex flex-wrap gap-2">
                        {socio.documentos.map((doc, i) => (
                            <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {doc.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente de tabela de participação
const TabelaParticipacao = ({ socios, capitalSocial, onUpdateParticipacao }) => {
    const capitalNumerico = parseFloat(capitalSocial?.replace(/\./g, '').replace(',', '.') || 0);
    const totalParticipacao = socios.reduce((acc, s) => acc + (parseFloat(s.participacao) || 0), 0);
    
    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
                <thead className="bg-zinc-900">
                    <tr>
                        <th className="text-left p-3 text-xs text-zinc-400 uppercase">Sócio</th>
                        <th className="text-center p-3 text-xs text-zinc-400 uppercase">% Participação</th>
                        <th className="text-right p-3 text-xs text-zinc-400 uppercase">Valor (R$)</th>
                        <th className="text-center p-3 text-xs text-zinc-400 uppercase">Administrador</th>
                    </tr>
                </thead>
                <tbody>
                    {socios.map((socio, index) => {
                        const valorQuotas = capitalNumerico * (parseFloat(socio.participacao) || 0) / 100;
                        return (
                            <tr key={index} className="border-t border-zinc-800">
                                <td className="p-3 text-white">{socio.nome || `Sócio ${index + 1}`}</td>
                                <td className="p-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={socio.participacao || ''}
                                            onChange={(e) => onUpdateParticipacao(index, 'participacao', e.target.value)}
                                            className="bg-zinc-900 border-zinc-700 w-20 text-center"
                                        />
                                        <Percent className="w-4 h-4 text-zinc-500" />
                                    </div>
                                </td>
                                <td className="p-3 text-right text-zinc-400">
                                    {valorQuotas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={socio.administrador || false}
                                        onChange={(e) => onUpdateParticipacao(index, 'administrador', e.target.checked)}
                                        className="w-4 h-4 accent-red-600"
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="bg-zinc-900">
                    <tr>
                        <td className="p-3 text-white font-medium">Total</td>
                        <td className={`p-3 text-center font-medium ${totalParticipacao === 100 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalParticipacao}%
                        </td>
                        <td className="p-3 text-right text-white font-medium">
                            {capitalNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3"></td>
                    </tr>
                </tfoot>
            </table>
            {totalParticipacao !== 100 && (
                <div className="p-3 bg-red-950/30 border-t border-red-900/50 text-red-400 text-sm">
                    ⚠️ A soma das participações deve ser exatamente 100%
                </div>
            )}
        </div>
    );
};

const WizardConstituicao = ({ open, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processoId, setProcessoId] = useState(null);
    
    // Step 1 - Dados da Empresa
    const [razaoSocial, setRazaoSocial] = useState('');
    const [nomeFantasia, setNomeFantasia] = useState('');
    const [capitalSocial, setCapitalSocial] = useState('');
    const [capitalExtenso, setCapitalExtenso] = useState('');
    
    // Step 2 - Sócios
    const [numSocios, setNumSocios] = useState(2);
    const [socios, setSocios] = useState([
        { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: '', participacao: '50', administrador: true, documentos: [] },
        { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: '', participacao: '50', administrador: false, documentos: [] }
    ]);
    
    // Step 4 - Endereço
    const [endereco, setEndereco] = useState({
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: 'SP',
        cep: ''
    });
    const [extraindoEndereco, setExtraindoEndereco] = useState(false);
    const enderecoInputRef = useRef(null);
    
    // Step 5 - CNAEs
    const [cnaes, setCnaes] = useState([]);
    const [cnaeInput, setCnaeInput] = useState('');
    const [objetoSocial, setObjetoSocial] = useState('');
    const [gerandoObjeto, setGerandoObjeto] = useState(false);
    
    // Step 6 - Resultado
    const [contratoGerado, setContratoGerado] = useState('');

    const TOTAL_STEPS = 6;

    // Atualizar capital por extenso automaticamente
    useEffect(() => {
        if (capitalSocial) {
            const valorNumerico = parseFloat(capitalSocial.replace(/\./g, '').replace(',', '.')) || 0;
            if (valorNumerico > 0) {
                setCapitalExtenso(numeroParaExtenso(valorNumerico));
            }
        }
    }, [capitalSocial]);

    // Ajustar array de sócios quando numSocios muda
    const ajustarSocios = useCallback(() => {
        setSocios(prevSocios => {
            if (numSocios > prevSocios.length) {
                const novos = [...prevSocios];
                for (let i = prevSocios.length; i < numSocios; i++) {
                    novos.push({ 
                        nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', 
                        estadoCivil: '', regimeCasamento: '', profissao: '', endereco: '', 
                        participacao: '', administrador: false, documentos: [] 
                    });
                }
                return novos;
            } else if (numSocios < prevSocios.length) {
                return prevSocios.slice(0, numSocios);
            }
            return prevSocios;
        });
    }, [numSocios]);

    useEffect(() => {
        ajustarSocios();
    }, [ajustarSocios]);

    const resetWizard = () => {
        setStep(1);
        setRazaoSocial('');
        setNomeFantasia('');
        setCapitalSocial('');
        setCapitalExtenso('');
        setNumSocios(2);
        setSocios([
            { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: '', participacao: '50', administrador: true, documentos: [] },
            { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: '', participacao: '50', administrador: false, documentos: [] }
        ]);
        setEndereco({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' });
        setCnaes([]);
        setCnaeInput('');
        setObjetoSocial('');
        setContratoGerado('');
        setProcessoId(null);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // Handler para input de capital social com formatação
    const handleCapitalChange = (e) => {
        const valor = e.target.value.replace(/\D/g, '');
        if (valor) {
            setCapitalSocial(formatarMoeda(valor));
        } else {
            setCapitalSocial('');
        }
    };

    // Extração de endereço via IA
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
                    setEndereco(prev => ({
                        ...prev,
                        logradouro: dados.logradouro || prev.logradouro,
                        numero: dados.numero || prev.numero,
                        complemento: dados.complemento || prev.complemento,
                        bairro: dados.bairro || prev.bairro,
                        cidade: dados.cidade || prev.cidade,
                        estado: dados.estado || prev.estado,
                        cep: dados.cep || prev.cep
                    }));
                    toast.success('Endereço extraído com sucesso!');
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

    // Atualizar sócio
    const handleSocioChange = (index, socioAtualizado) => {
        setSocios(prev => {
            const novos = [...prev];
            novos[index] = socioAtualizado;
            return novos;
        });
    };

    // Remover sócio
    const handleRemoveSocio = (index) => {
        if (socios.length <= 1) return;
        setSocios(prev => prev.filter((_, i) => i !== index));
        setNumSocios(prev => prev - 1);
    };

    // Atualizar participação
    const handleUpdateParticipacao = (index, field, value) => {
        setSocios(prev => {
            const novos = [...prev];
            novos[index] = { ...novos[index], [field]: value };
            return novos;
        });
    };

    // Adicionar CNAE
    const handleAddCnae = () => {
        if (!cnaeInput.trim()) return;
        setCnaes(prev => [...prev, cnaeInput.trim()]);
        setCnaeInput('');
    };

    // Remover CNAE
    const handleRemoveCnae = (index) => {
        setCnaes(prev => prev.filter((_, i) => i !== index));
    };

    // Gerar objeto social via IA
    const handleGerarObjetoSocial = async () => {
        if (cnaes.length === 0) {
            toast.error('Adicione pelo menos um CNAE');
            return;
        }
        
        setGerandoObjeto(true);
        try {
            const response = await axios.post(`${API_URL}/api/constituicao/gerar-objeto-social`, {
                cnaes: cnaes
            });
            
            if (response.data.objeto_social) {
                setObjetoSocial(response.data.objeto_social);
                toast.success('Objeto social gerado!');
            }
        } catch (error) {
            console.error('Erro ao gerar objeto social:', error);
            toast.error('Erro ao gerar objeto social');
        } finally {
            setGerandoObjeto(false);
        }
    };

    // Gerar contrato final
    const handleGerarContrato = async () => {
        setProcessing(true);
        try {
            // Criar registro do processo
            const formData = new FormData();
            formData.append('tipo_alteracao', 'constituicao');
            formData.append('descricao', `Constituição de ${razaoSocial}`);
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setProcessoId(uploadRes.data.id);
            
            // Gerar contrato via IA
            const response = await axios.post(`${API_URL}/api/constituicao/gerar-contrato`, {
                minuta_id: uploadRes.data.id,
                empresa: {
                    razao_social: razaoSocial,
                    nome_fantasia: nomeFantasia,
                    capital_social: capitalSocial,
                    capital_extenso: capitalExtenso,
                    endereco: endereco,
                    objeto_social: objetoSocial
                },
                socios: socios.map(s => ({
                    nome: s.nome,
                    cpf: s.cpf,
                    rg: s.rg,
                    orgao_emissor: s.orgaoEmissor,
                    nacionalidade: s.nacionalidade,
                    estado_civil: s.estadoCivil,
                    regime_casamento: s.regimeCasamento,
                    profissao: s.profissao,
                    endereco: s.endereco,
                    participacao: s.participacao,
                    administrador: s.administrador
                })),
                cnaes: cnaes
            });
            
            if (response.data.contrato) {
                setContratoGerado(response.data.contrato);
                setProcessoId(response.data.minuta_id || uploadRes.data.id);
                toast.success('Contrato social gerado!');
                setStep(6);
                onComplete();
            }
        } catch (error) {
            console.error('Erro ao gerar contrato:', error);
            toast.error('Erro ao gerar contrato social');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(contratoGerado);
        toast.success('Texto copiado!');
    };

    const downloadPDF = async () => {
        if (!processoId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${processoId}/download/pdf`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contrato_social_${razaoSocial.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('PDF baixado!');
        } catch (e) {
            toast.error('Erro ao baixar PDF');
        }
    };

    const downloadWord = async () => {
        if (!processoId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${processoId}/download/word`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contrato_social_${razaoSocial.replace(/\s+/g, '_')}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Word baixado!');
        } catch (e) {
            toast.error('Erro ao baixar Word');
        }
    };

    // Validação de cada etapa
    const canProceed = () => {
        switch (step) {
            case 1:
                return razaoSocial.trim() && capitalSocial.trim();
            case 2:
                return socios.every(s => s.nome.trim() && s.cpf.trim());
            case 3:
                const total = socios.reduce((acc, s) => acc + (parseFloat(s.participacao) || 0), 0);
                return total === 100;
            case 4:
                return endereco.logradouro && endereco.cidade && endereco.estado;
            case 5:
                return cnaes.length > 0 && objetoSocial.trim();
            default:
                return true;
        }
    };

    const stepLabels = ['Empresa', 'Sócios', 'Participação', 'Endereço', 'CNAEs', 'Resultado'];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-red-500" />
                        Nova Constituição de Empresa
                    </DialogTitle>
                    {/* Progress */}
                    <div className="flex items-center gap-1 mt-4">
                        {[1,2,3,4,5,6].map(s => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    step >= s ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'
                                }`}>
                                    {s}
                                </div>
                                {s < 6 && <div className={`w-8 h-1 ${step > s ? 'bg-red-600' : 'bg-zinc-800'}`} />}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 mt-1 px-1">
                        {stepLabels.map((label, i) => (
                            <span key={i} className={step === i + 1 ? 'text-red-500' : ''}>{label}</span>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Dados da Empresa */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-red-500" />
                                    Dados da Empresa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Preencha os dados básicos da empresa.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Razão Social <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={razaoSocial}
                                        onChange={(e) => setRazaoSocial(e.target.value.toUpperCase())}
                                        placeholder="EMPRESA EXEMPLO LTDA"
                                        className="bg-zinc-950 border-zinc-800"
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Nome Fantasia (opcional)
                                    </Label>
                                    <Input
                                        value={nomeFantasia}
                                        onChange={(e) => setNomeFantasia(e.target.value)}
                                        placeholder="Nome comercial"
                                        className="bg-zinc-950 border-zinc-800"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Capital Social <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">R$</span>
                                            <Input
                                                type="text"
                                                value={capitalSocial}
                                                onChange={handleCapitalChange}
                                                placeholder="0,00"
                                                className="bg-zinc-950 border-zinc-800 pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block flex items-center gap-2">
                                            Capital por Extenso
                                            <Sparkles className="w-3 h-3 text-red-500" />
                                            <span className="text-red-500 text-[10px] font-normal">(automático)</span>
                                        </Label>
                                        <Input
                                            value={capitalExtenso}
                                            onChange={(e) => setCapitalExtenso(e.target.value)}
                                            placeholder="Gerado automaticamente"
                                            className="bg-zinc-950 border-zinc-800 text-zinc-400"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Qualificação dos Sócios */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-500" />
                                    Qualificação dos Sócios
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Preencha os dados de cada sócio ou use <span className="text-red-500">"Preencher com IA"</span> para extrair automaticamente de documentos (CNH, RG, etc).
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <Label className="text-zinc-400 text-sm">Número de sócios:</Label>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => setNumSocios(Math.max(1, numSocios - 1))}
                                        className="border-zinc-700 h-8 w-8 p-0"
                                    >
                                        -
                                    </Button>
                                    <span className="text-white font-medium w-8 text-center">{numSocios}</span>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => setNumSocios(numSocios + 1)}
                                        className="border-zinc-700 h-8 w-8 p-0"
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {socios.map((socio, index) => (
                                    <SocioCard
                                        key={index}
                                        socio={socio}
                                        index={index}
                                        onChange={(s) => handleSocioChange(index, s)}
                                        onRemove={() => handleRemoveSocio(index)}
                                        canRemove={socios.length > 1}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Participação Societária */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-red-500" />
                                    Participação Societária
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Defina a participação de cada sócio no capital social. A soma deve ser 100%.
                                </p>
                            </div>
                            
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">Capital Social Total:</span>
                                    <span className="text-xl font-bold text-white">R$ {capitalSocial || '0,00'}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">{capitalExtenso}</div>
                            </div>
                            
                            <TabelaParticipacao
                                socios={socios}
                                capitalSocial={capitalSocial}
                                onUpdateParticipacao={handleUpdateParticipacao}
                            />
                        </div>
                    )}

                    {/* Step 4: Endereço */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-red-500" />
                                    Endereço da Empresa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Informe o endereço da sede ou use <span className="text-red-500">"Preencher com IA"</span> para extrair de um documento.
                                </p>
                            </div>
                            
                            <div className="flex justify-end mb-4">
                                <input 
                                    ref={enderecoInputRef} 
                                    type="file" 
                                    accept=".pdf,.jpg,.jpeg,.png" 
                                    className="hidden" 
                                    onChange={handleEnderecoUpload}
                                />
                                <Button 
                                    variant="outline"
                                    onClick={() => enderecoInputRef.current?.click()}
                                    disabled={extraindoEndereco}
                                    className="border-red-600/50 text-red-500 hover:bg-red-600/10"
                                >
                                    {extraindoEndereco ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Preencher com IA
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Logradouro *</Label>
                                        <Input
                                            value={endereco.logradouro}
                                            onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })}
                                            placeholder="Rua, Avenida, etc."
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Número *</Label>
                                        <Input
                                            value={endereco.numero}
                                            onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
                                            placeholder="123"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Complemento</Label>
                                        <Input
                                            value={endereco.complemento}
                                            onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                                            placeholder="Sala, Andar, etc."
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Bairro *</Label>
                                        <Input
                                            value={endereco.bairro}
                                            onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
                                            placeholder="Bairro"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Cidade *</Label>
                                        <Input
                                            value={endereco.cidade}
                                            onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })}
                                            placeholder="São Paulo"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Estado *</Label>
                                        <Select value={endereco.estado} onValueChange={(v) => setEndereco({ ...endereco, estado: v })}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800">
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
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">CEP</Label>
                                        <Input
                                            value={endereco.cep}
                                            onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })}
                                            placeholder="00000-000"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: CNAEs e Objeto Social */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-red-500" />
                                    CNAEs e Objeto Social
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Adicione os CNAEs da empresa. A IA irá gerar automaticamente o objeto social.
                                </p>
                            </div>
                            
                            {/* Adicionar CNAEs */}
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase mb-2 block">CNAEs</Label>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={cnaeInput}
                                        onChange={(e) => setCnaeInput(e.target.value)}
                                        placeholder="00.00-0-00 - Descrição da atividade"
                                        className="bg-zinc-950 border-zinc-800 flex-1"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddCnae()}
                                    />
                                    <Button onClick={handleAddCnae} className="bg-red-600 hover:bg-red-700">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                
                                {cnaes.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {cnaes.map((cnae, index) => (
                                            <div key={index} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-3">
                                                <span className="text-sm text-zinc-300">{cnae}</span>
                                                <button onClick={() => handleRemoveCnae(index)} className="text-zinc-500 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Gerar Objeto Social */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-zinc-400 text-xs uppercase">Objeto Social *</Label>
                                    <Button 
                                        size="sm" 
                                        onClick={handleGerarObjetoSocial}
                                        disabled={cnaes.length === 0 || gerandoObjeto}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {gerandoObjeto ? (
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-4 h-4 mr-2" />
                                        )}
                                        Gerar com IA
                                    </Button>
                                </div>
                                <Textarea
                                    value={objetoSocial}
                                    onChange={(e) => setObjetoSocial(e.target.value)}
                                    placeholder="Descreva o objeto social da empresa ou clique em 'Gerar com IA'..."
                                    className="bg-zinc-950 border-zinc-800 min-h-[150px]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 6: Resultado */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Contrato Social Gerado</h3>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        onClick={downloadWord}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <FileText className="w-4 h-4 mr-2" /> Word
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        onClick={downloadPDF}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        <FileDown className="w-4 h-4 mr-2" /> PDF
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={copyToClipboard}
                                        className="border-zinc-700"
                                    >
                                        <Copy className="w-4 h-4 mr-2" /> Copiar
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="bg-white text-black rounded-lg p-6 max-h-[450px] overflow-y-auto border">
                                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>
                                    {contratoGerado}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 p-4 flex justify-between">
                    <Button 
                        variant="outline" 
                        onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
                        className="border-zinc-700"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </Button>
                    
                    {step < 6 ? (
                        <Button 
                            onClick={() => {
                                if (step === 5) {
                                    handleGerarContrato();
                                } else {
                                    setStep(step + 1);
                                }
                            }}
                            disabled={!canProceed() || processing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {processing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                    Gerando...
                                </>
                            ) : step === 5 ? (
                                <>
                                    Gerar Contrato
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            ) : (
                                <>
                                    Próximo
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Concluir
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WizardConstituicao;
