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
    User, Percent, Sparkles, Search
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

// Banco de CNAEs mais comuns
const BANCO_CNAES = [
    { codigo: '47.81-4-00', descricao: 'Comércio varejista de artigos do vestuário e acessórios' },
    { codigo: '47.89-0-99', descricao: 'Comércio varejista de outros produtos não especificados anteriormente' },
    { codigo: '56.11-2-01', descricao: 'Restaurantes e similares' },
    { codigo: '56.11-2-03', descricao: 'Lanchonetes, casas de chá, de sucos e similares' },
    { codigo: '62.01-5-01', descricao: 'Desenvolvimento de programas de computador sob encomenda' },
    { codigo: '62.02-3-00', descricao: 'Desenvolvimento e licenciamento de programas de computador customizáveis' },
    { codigo: '62.03-1-00', descricao: 'Desenvolvimento e licenciamento de programas de computador não-customizáveis' },
    { codigo: '62.04-0-00', descricao: 'Consultoria em tecnologia da informação' },
    { codigo: '62.09-1-00', descricao: 'Suporte técnico, manutenção e outros serviços em tecnologia da informação' },
    { codigo: '63.11-9-00', descricao: 'Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet' },
    { codigo: '63.19-4-00', descricao: 'Portais, provedores de conteúdo e outros serviços de informação na internet' },
    { codigo: '69.11-7-01', descricao: 'Serviços advocatícios' },
    { codigo: '69.20-6-01', descricao: 'Atividades de contabilidade' },
    { codigo: '69.20-6-02', descricao: 'Atividades de consultoria e auditoria contábil e tributária' },
    { codigo: '70.20-4-00', descricao: 'Atividades de consultoria em gestão empresarial' },
    { codigo: '70.22-6-00', descricao: 'Consultoria em propaganda e marketing' },
    { codigo: '73.11-4-00', descricao: 'Agências de publicidade' },
    { codigo: '73.19-0-99', descricao: 'Outras atividades de publicidade não especificadas anteriormente' },
    { codigo: '74.10-2-02', descricao: 'Design de interiores' },
    { codigo: '74.10-2-03', descricao: 'Design de produto' },
    { codigo: '74.90-1-04', descricao: 'Atividades de intermediação e agenciamento de serviços e negócios em geral' },
    { codigo: '77.39-0-99', descricao: 'Aluguel de outras máquinas e equipamentos comerciais e industriais' },
    { codigo: '78.10-8-00', descricao: 'Seleção e agenciamento de mão-de-obra' },
    { codigo: '82.11-3-00', descricao: 'Serviços combinados de escritório e apoio administrativo' },
    { codigo: '82.19-9-99', descricao: 'Preparação de documentos e serviços especializados de apoio administrativo' },
    { codigo: '85.99-6-04', descricao: 'Treinamento em desenvolvimento profissional e gerencial' },
    { codigo: '96.02-5-01', descricao: 'Cabeleireiros, manicure e pedicure' },
    { codigo: '96.02-5-02', descricao: 'Atividades de estética e outros serviços de cuidados com a beleza' },
    { codigo: '41.20-4-00', descricao: 'Construção de edifícios' },
    { codigo: '43.30-4-99', descricao: 'Outras obras de acabamento da construção' },
    { codigo: '43.99-1-99', descricao: 'Serviços especializados para construção não especificados anteriormente' },
    { codigo: '45.11-1-01', descricao: 'Comércio a varejo de automóveis, camionetas e utilitários novos' },
    { codigo: '45.20-0-01', descricao: 'Serviços de manutenção e reparação mecânica de veículos automotores' },
    { codigo: '46.93-1-00', descricao: 'Comércio atacadista de mercadorias em geral, sem predominância de alimentos' },
    { codigo: '47.11-3-01', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados' },
    { codigo: '47.11-3-02', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados' },
    { codigo: '47.12-1-00', descricao: 'Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns' },
    { codigo: '47.51-2-01', descricao: 'Comércio varejista especializado de equipamentos e suprimentos de informática' },
    { codigo: '47.52-1-00', descricao: 'Comércio varejista especializado de equipamentos de telefonia e comunicação' },
    { codigo: '49.30-2-02', descricao: 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional' },
    { codigo: '52.11-7-99', descricao: 'Depósitos de mercadorias para terceiros, exceto armazéns gerais e guarda-móveis' },
];

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
    
    const milhoes = Math.floor(num / 1000000);
    if (milhoes > 0) {
        resultado += converterGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões');
    }
    
    const milhares = Math.floor((num % 1000000) / 1000);
    if (milhares > 0) {
        if (resultado) resultado += ' ';
        if (milhares === 1) {
            resultado += 'mil';
        } else {
            resultado += converterGrupo(milhares) + ' mil';
        }
    }
    
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
    
    return resultado.charAt(0).toUpperCase() + resultado.slice(1);
};

// Função para formatar moeda
const formatarMoeda = (valor) => {
    const numero = valor.replace(/\D/g, '');
    const valorNumerico = parseFloat(numero) / 100;
    return valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Componente de qualificação de sócio com endereço completo
const SocioCard = ({ socio, index, onChange, onRemove, canRemove }) => {
    const docInputRef = useRef(null);
    const enderecoInputRef = useRef(null);
    const [extraindo, setExtraindo] = useState(false);
    const [extraindoEndereco, setExtraindoEndereco] = useState(false);
    
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
                    documentos: [...(socio.documentos || []), file]
                });
                toast.success('Dados pessoais extraídos!');
            } else {
                onChange({
                    ...socio,
                    documentos: [...(socio.documentos || []), file]
                });
                toast.info('Documento anexado');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
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

    // Inicializar endereço como objeto se não existir
    const enderecoSocio = socio.endereco && typeof socio.endereco === 'object' 
        ? socio.endereco 
        : { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' };
    
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
                        Preencher Dados com IA
                    </button>
                    {canRemove && (
                        <button onClick={onRemove} className="text-zinc-500 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
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
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">CPF <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.cpf}
                        onChange={(e) => onChange({ ...socio, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
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
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Órgão Emissor <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.orgaoEmissor}
                        onChange={(e) => onChange({ ...socio, orgaoEmissor: e.target.value })}
                        placeholder="SSP/SP"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
                <div>
                    <Label className="text-zinc-500 text-xs">Nacionalidade <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.nacionalidade}
                        onChange={(e) => onChange({ ...socio, nacionalidade: e.target.value })}
                        placeholder="Brasileiro(a)"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Estado Civil <span className="text-red-500">*</span></Label>
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
                        <Label className="text-zinc-500 text-xs">Regime de Casamento <span className="text-red-500">*</span></Label>
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
                <div className={socio.estadoCivil === 'Casado(a)' ? '' : 'col-span-2'}>
                    <Label className="text-zinc-500 text-xs">Profissão <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.profissao}
                        onChange={(e) => onChange({ ...socio, profissao: e.target.value })}
                        placeholder="Empresário(a)"
                        className="bg-zinc-900 border-zinc-700 mt-1"
                        required
                    />
                </div>
            </div>
            
            {/* Endereço do Sócio */}
            <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-zinc-400 text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        Endereço Residencial
                    </Label>
                    <button 
                        type="button"
                        onClick={() => enderecoInputRef.current?.click()}
                        disabled={extraindoEndereco}
                        className="text-xs bg-red-600/20 text-red-500 hover:bg-red-600/30 px-3 py-1.5 rounded flex items-center gap-1"
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
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Número <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.numero}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, numero: e.target.value } })}
                                placeholder="123"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Complemento</Label>
                            <Input
                                value={enderecoSocio.complemento}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, complemento: e.target.value } })}
                                placeholder="Apto, Sala"
                                className="bg-zinc-900 border-zinc-700 mt-1"
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
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Cidade <span className="text-red-500">*</span></Label>
                            <Input
                                value={enderecoSocio.cidade}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, cidade: e.target.value } })}
                                placeholder="Cidade"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                        <div>
                            <Label className="text-zinc-500 text-xs">Estado <span className="text-red-500">*</span></Label>
                            <Select 
                                value={enderecoSocio.estado} 
                                onValueChange={(v) => onChange({ ...socio, endereco: { ...enderecoSocio, estado: v } })}
                            >
                                <SelectTrigger className="bg-zinc-900 border-zinc-700 mt-1">
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
                            <Input
                                value={enderecoSocio.cep}
                                onChange={(e) => onChange({ ...socio, endereco: { ...enderecoSocio, cep: e.target.value } })}
                                placeholder="00000-000"
                                className="bg-zinc-900 border-zinc-700 mt-1"
                                required
                            />
                        </div>
                    </div>
                </div>
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
                        <th className="text-center p-3 text-xs text-zinc-400 uppercase">% Participação <span className="text-red-500">*</span></th>
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
                                            required
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

// Componente de seleção de CNAEs
const SeletorCNAEs = ({ cnaes, onAdd, onRemove }) => {
    const [busca, setBusca] = useState('');
    const [showLista, setShowLista] = useState(false);
    const [cnaeManual, setCnaeManual] = useState('');
    
    const cnaesFiltrados = BANCO_CNAES.filter(cnae => 
        cnae.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        cnae.descricao.toLowerCase().includes(busca.toLowerCase())
    );
    
    const handleSelectCnae = (cnae) => {
        const cnaeStr = `${cnae.codigo} - ${cnae.descricao}`;
        if (!cnaes.includes(cnaeStr)) {
            onAdd(cnaeStr);
        }
        setBusca('');
        setShowLista(false);
    };
    
    const handleAddManual = () => {
        if (cnaeManual.trim() && !cnaes.includes(cnaeManual.trim())) {
            onAdd(cnaeManual.trim());
            setCnaeManual('');
        }
    };
    
    return (
        <div className="space-y-4">
            {/* Busca no banco de CNAEs */}
            <div>
                <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                    Buscar CNAE <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                        value={busca}
                        onChange={(e) => {
                            setBusca(e.target.value);
                            setShowLista(true);
                        }}
                        onFocus={() => setShowLista(true)}
                        placeholder="Digite o código ou descrição do CNAE..."
                        className="bg-zinc-950 border-zinc-800 pl-10"
                    />
                    
                    {showLista && busca && (
                        <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg max-h-60 overflow-y-auto">
                            {cnaesFiltrados.length > 0 ? (
                                cnaesFiltrados.map((cnae, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelectCnae(cnae)}
                                        className="w-full text-left p-3 hover:bg-zinc-800 border-b border-zinc-800 last:border-0"
                                    >
                                        <span className="text-red-500 font-mono text-sm">{cnae.codigo}</span>
                                        <span className="text-zinc-300 text-sm ml-2">{cnae.descricao}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-3 text-zinc-500 text-sm">
                                    Nenhum CNAE encontrado. Use o campo abaixo para adicionar manualmente.
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                    Pesquise entre os CNAEs mais comuns ou adicione manualmente abaixo
                </p>
            </div>
            
            {/* Adicionar CNAE manual */}
            <div>
                <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                    Adicionar CNAE Manualmente
                </Label>
                <div className="flex gap-2">
                    <Input
                        value={cnaeManual}
                        onChange={(e) => setCnaeManual(e.target.value)}
                        placeholder="00.00-0-00 - Descrição da atividade"
                        className="bg-zinc-950 border-zinc-800 flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddManual()}
                    />
                    <Button onClick={handleAddManual} className="bg-red-600 hover:bg-red-700">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            
            {/* CNAEs selecionados */}
            {cnaes.length > 0 && (
                <div>
                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                        CNAEs Selecionados ({cnaes.length})
                    </Label>
                    <div className="space-y-2">
                        {cnaes.map((cnae, index) => (
                            <div key={index} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-3">
                                <span className="text-sm text-zinc-300">{cnae}</span>
                                <button onClick={() => onRemove(index)} className="text-zinc-500 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
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
        { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: true, documentos: [] },
        { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: false, documentos: [] }
    ]);
    
    // Step 4 - Endereço da Empresa
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
    const [objetoSocial, setObjetoSocial] = useState('');
    const [gerandoObjeto, setGerandoObjeto] = useState(false);
    
    // Step 6 - Resultado
    const [contratoGerado, setContratoGerado] = useState('');

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
                        estadoCivil: '', regimeCasamento: '', profissao: '', 
                        endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' },
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
            { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: true, documentos: [] },
            { nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)', estadoCivil: '', regimeCasamento: '', profissao: '', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' }, participacao: '50', administrador: false, documentos: [] }
        ]);
        setEndereco({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '' });
        setCnaes([]);
        setObjetoSocial('');
        setContratoGerado('');
        setProcessoId(null);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    const handleCapitalChange = (e) => {
        const valor = e.target.value.replace(/\D/g, '');
        if (valor) {
            setCapitalSocial(formatarMoeda(valor));
        } else {
            setCapitalSocial('');
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

    const handleSocioChange = (index, socioAtualizado) => {
        setSocios(prev => {
            const novos = [...prev];
            novos[index] = socioAtualizado;
            return novos;
        });
    };

    const handleRemoveSocio = (index) => {
        if (socios.length <= 1) return;
        setSocios(prev => prev.filter((_, i) => i !== index));
        setNumSocios(prev => prev - 1);
    };

    const handleUpdateParticipacao = (index, field, value) => {
        setSocios(prev => {
            const novos = [...prev];
            novos[index] = { ...novos[index], [field]: value };
            return novos;
        });
    };

    const handleAddCnae = (cnae) => {
        setCnaes(prev => [...prev, cnae]);
    };

    const handleRemoveCnae = (index) => {
        setCnaes(prev => prev.filter((_, i) => i !== index));
    };

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

    const formatarEnderecoSocio = (endereco) => {
        if (!endereco || typeof endereco !== 'object') return '';
        const parts = [];
        if (endereco.logradouro) parts.push(endereco.logradouro);
        if (endereco.numero) parts.push(endereco.numero);
        if (endereco.complemento) parts.push(endereco.complemento);
        if (endereco.bairro) parts.push(endereco.bairro);
        if (endereco.cidade && endereco.estado) parts.push(`${endereco.cidade}-${endereco.estado}`);
        if (endereco.cep) parts.push(`CEP ${endereco.cep}`);
        return parts.join(', ');
    };

    const handleGerarContrato = async () => {
        setProcessing(true);
        try {
            const formData = new FormData();
            formData.append('tipo_alteracao', 'constituicao');
            formData.append('descricao', `Constituição de ${razaoSocial}`);
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setProcessoId(uploadRes.data.id);
            
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
                    endereco: formatarEnderecoSocio(s.endereco),
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
                return socios.every(s => {
                    const end = s.endereco && typeof s.endereco === 'object' ? s.endereco : {};
                    return s.nome.trim() && s.cpf.trim() && s.rg.trim() && s.orgaoEmissor.trim() && 
                           s.nacionalidade.trim() && s.estadoCivil && s.profissao.trim() &&
                           end.logradouro && end.numero && end.bairro && end.cidade && end.estado && end.cep;
                });
            case 3:
                const total = socios.reduce((acc, s) => acc + (parseFloat(s.participacao) || 0), 0);
                return total === 100;
            case 4:
                return endereco.logradouro && endereco.numero && endereco.bairro && 
                       endereco.cidade && endereco.estado && endereco.cep;
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
                    <div className="flex items-center gap-1 mt-4">
                        {[1,2,3,4,5,6].map(s => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    step >= s ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'
                                }`}>{s}</div>
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
                                    Preencha os dados básicos. Campos com <span className="text-red-500">*</span> são obrigatórios.
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
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Nome Fantasia
                                    </Label>
                                    <Input
                                        value={nomeFantasia}
                                        onChange={(e) => setNomeFantasia(e.target.value)}
                                        placeholder="Nome comercial (opcional)"
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
                                                required
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
                                            readOnly
                                            placeholder="Gerado automaticamente"
                                            className="bg-zinc-950 border-zinc-800 text-zinc-400"
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
                                    Todos os campos são <span className="text-red-500">obrigatórios</span> para evitar exigências da Junta Comercial.
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-4">
                                <Label className="text-zinc-400 text-sm">Número de sócios:</Label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setNumSocios(Math.max(1, numSocios - 1))} className="border-zinc-700 h-8 w-8 p-0">-</Button>
                                    <span className="text-white font-medium w-8 text-center">{numSocios}</span>
                                    <Button size="sm" variant="outline" onClick={() => setNumSocios(numSocios + 1)} className="border-zinc-700 h-8 w-8 p-0">+</Button>
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
                                    Defina a participação de cada sócio. A soma deve ser <span className="text-red-500">exatamente 100%</span>.
                                </p>
                            </div>
                            
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">Capital Social Total:</span>
                                    <span className="text-xl font-bold text-white">R$ {capitalSocial || '0,00'}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">{capitalExtenso}</div>
                            </div>
                            
                            <TabelaParticipacao socios={socios} capitalSocial={capitalSocial} onUpdateParticipacao={handleUpdateParticipacao} />
                        </div>
                    )}

                    {/* Step 4: Endereço da Empresa */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-red-500" />
                                    Endereço da Empresa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Todos os campos são <span className="text-red-500">obrigatórios</span>.
                                </p>
                            </div>
                            
                            <div className="flex justify-end mb-4">
                                <input ref={enderecoInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleEnderecoUpload} />
                                <Button variant="outline" onClick={() => enderecoInputRef.current?.click()} disabled={extraindoEndereco} className="border-red-600/50 text-red-500 hover:bg-red-600/10">
                                    {extraindoEndereco ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    Preencher com IA
                                </Button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Logradouro <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} placeholder="Rua, Avenida, etc." className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Número <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} placeholder="123" className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Complemento</Label>
                                        <Input value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} placeholder="Sala, Andar, etc." className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Bairro <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} placeholder="Bairro" className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Cidade <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} placeholder="São Paulo" className="bg-zinc-950 border-zinc-800" required />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">Estado <span className="text-red-500">*</span></Label>
                                        <Select value={endereco.estado} onValueChange={(v) => setEndereco({ ...endereco, estado: v })}>
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700">
                                                {ESTADOS.map(uf => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">CEP <span className="text-red-500">*</span></Label>
                                        <Input value={endereco.cep} onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })} placeholder="00000-000" className="bg-zinc-950 border-zinc-800" required />
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
                                    Selecione os CNAEs e gere o objeto social automaticamente.
                                </p>
                            </div>
                            
                            <SeletorCNAEs cnaes={cnaes} onAdd={handleAddCnae} onRemove={handleRemoveCnae} />
                            
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-zinc-400 text-xs uppercase">Objeto Social <span className="text-red-500">*</span></Label>
                                    <Button size="sm" onClick={handleGerarObjetoSocial} disabled={cnaes.length === 0 || gerandoObjeto} className="bg-red-600 hover:bg-red-700">
                                        {gerandoObjeto ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        Gerar com IA
                                    </Button>
                                </div>
                                <Textarea value={objetoSocial} onChange={(e) => setObjetoSocial(e.target.value)} placeholder="Selecione os CNAEs e clique em 'Gerar com IA'..." className="bg-zinc-950 border-zinc-800 min-h-[150px]" required />
                            </div>
                        </div>
                    )}

                    {/* Step 6: Resultado */}
                    {step === 6 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Contrato Social Gerado</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={downloadWord} className="bg-blue-600 hover:bg-blue-700">
                                        <FileText className="w-4 h-4 mr-2" /> Word
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
                                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>{contratoGerado}</pre>
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
                    
                    {step < 6 ? (
                        <Button onClick={() => step === 5 ? handleGerarContrato() : setStep(step + 1)} disabled={!canProceed() || processing} className="bg-red-600 hover:bg-red-700">
                            {processing ? (<><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Gerando...</>) : step === 5 ? (<>Gerar Contrato<ChevronRight className="w-4 h-4 ml-1" /></>) : (<>Próximo<ChevronRight className="w-4 h-4 ml-1" /></>)}
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
