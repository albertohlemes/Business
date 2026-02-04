import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
    XCircle, ChevronLeft, ChevronRight, Upload, X, RefreshCw, CheckCircle2,
    Users, MapPin, FileText, Plus, Trash2, FileDown, Copy,
    User, Sparkles, Building2, AlertTriangle, Scale, Archive
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

const MOTIVOS_BAIXA = [
    { value: 'vontade_socios', label: 'Encerramento por vontade dos sócios' },
    { value: 'termino_prazo', label: 'Término do prazo de duração' },
    { value: 'falencia', label: 'Falência' },
    { value: 'incorporacao', label: 'Incorporação por outra empresa' },
    { value: 'fusao', label: 'Fusão com outra empresa' },
    { value: 'cisao_total', label: 'Cisão total' },
    { value: 'inatividade', label: 'Inatividade prolongada' },
    { value: 'outros', label: 'Outros motivos' }
];

// Componente de qualificação de sócio para baixa
const SocioBaixaCard = ({ socio, index, onChange, onRemove, canRemove }) => {
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
                toast.success('Dados extraídos!');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.error('Erro ao extrair dados');
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
                        Corrigir com IA
                    </button>
                    {canRemove && (
                        <button onClick={onRemove} className="text-zinc-500 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            
            <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} />
            
            {/* Dados Pessoais */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-zinc-500 text-xs">Nome Completo <span className="text-red-500">*</span></Label>
                    <Input
                        value={socio.nome}
                        onChange={(e) => onChange({ ...socio, nome: e.target.value.toUpperCase() })}
                        placeholder="NOME COMPLETO"
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
                    <div>
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
            
            <div>
                <Label className="text-zinc-500 text-xs">Endereço Completo <span className="text-red-500">*</span></Label>
                <Input
                    value={socio.endereco}
                    onChange={(e) => onChange({ ...socio, endereco: e.target.value })}
                    placeholder="Rua, número, bairro, cidade-UF, CEP"
                    className="bg-zinc-900 border-zinc-700 mt-1"
                    required
                />
            </div>
            
            <div>
                <Label className="text-zinc-500 text-xs">Participação no Capital (%)</Label>
                <Input
                    value={socio.participacao}
                    onChange={(e) => onChange({ ...socio, participacao: e.target.value })}
                    placeholder="50%"
                    className="bg-zinc-900 border-zinc-700 mt-1 w-32"
                />
            </div>
        </div>
    );
};

const WizardBaixa = ({ open, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [processoId, setProcessoId] = useState(null);
    const [extraindoContrato, setExtraindoContrato] = useState(false);
    const contratoInputRef = useRef(null);
    
    // Step 1 - Upload do Contrato
    const [arquivoContrato, setArquivoContrato] = useState(null);
    const [dadosExtraidos, setDadosExtraidos] = useState(null);
    
    // Step 2 - Dados da Empresa
    const [razaoSocial, setRazaoSocial] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [nire, setNire] = useState('');
    const [capitalSocial, setCapitalSocial] = useState('');
    const [dataRegistro, setDataRegistro] = useState('');
    const [juntaComercial, setJuntaComercial] = useState('');
    const [endereco, setEndereco] = useState('');
    
    // Step 3 - Sócios
    const [socios, setSocios] = useState([]);
    
    // Step 4 - Motivo da Baixa
    const [motivoBaixa, setMotivoBaixa] = useState('');
    const [motivoDetalhado, setMotivoDetalhado] = useState('');
    const [dataEncerramentoAtividades, setDataEncerramentoAtividades] = useState('');
    const [destinacaoAcervo, setDestinacaoAcervo] = useState('');
    
    // Step 5 - Patrimônio
    const [declaracaoQuitacao, setDeclaracaoQuitacao] = useState(true);
    const [distribuicaoPatrimonio, setDistribuicaoPatrimonio] = useState('');
    const [responsavelGuarda, setResponsavelGuarda] = useState('');
    const [prazoGuarda, setPrazoGuarda] = useState('5 anos');
    
    // Step 6 - Resultado
    const [distratoGerado, setDistratoGerado] = useState('');

    const resetWizard = () => {
        setStep(1);
        setArquivoContrato(null);
        setDadosExtraidos(null);
        setRazaoSocial('');
        setCnpj('');
        setNire('');
        setCapitalSocial('');
        setDataRegistro('');
        setJuntaComercial('');
        setEndereco('');
        setSocios([]);
        setMotivoBaixa('');
        setMotivoDetalhado('');
        setDataEncerramentoAtividades('');
        setDestinacaoAcervo('');
        setDeclaracaoQuitacao(true);
        setDistribuicaoPatrimonio('');
        setResponsavelGuarda('');
        setPrazoGuarda('5 anos');
        setDistratoGerado('');
        setProcessoId(null);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // Upload e extração do contrato
    const handleContratoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setArquivoContrato(file);
        setExtraindoContrato(true);
        toast.info('Extraindo dados do contrato social...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axios.post(`${API_URL}/api/baixa/extrair-contrato`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.dados) {
                const dados = response.data.dados;
                setDadosExtraidos(dados);
                
                // Preencher dados da empresa
                if (dados.empresa) {
                    setRazaoSocial(dados.empresa.razao_social || '');
                    setCnpj(dados.empresa.cnpj || '');
                    setNire(dados.empresa.nire || '');
                    setCapitalSocial(dados.empresa.capital_social?.valor || dados.empresa.capital_social || '');
                    setDataRegistro(dados.empresa.data_registro || '');
                    setJuntaComercial(dados.empresa.junta_comercial || '');
                    
                    // Montar endereço
                    if (dados.empresa.endereco) {
                        if (typeof dados.empresa.endereco === 'object') {
                            const end = dados.empresa.endereco;
                            const enderecoStr = [
                                end.logradouro,
                                end.numero,
                                end.complemento,
                                end.bairro,
                                end.cidade && end.estado ? `${end.cidade}-${end.estado}` : '',
                                end.cep ? `CEP ${end.cep}` : ''
                            ].filter(Boolean).join(', ');
                            setEndereco(enderecoStr);
                        } else {
                            setEndereco(dados.empresa.endereco);
                        }
                    }
                }
                
                // Preencher sócios
                if (dados.socios && dados.socios.length > 0) {
                    const sociosFormatados = dados.socios.map(s => ({
                        nome: s.nome || '',
                        cpf: s.cpf || '',
                        rg: s.rg || '',
                        orgaoEmissor: s.orgao_emissor || '',
                        nacionalidade: s.nacionalidade || 'Brasileiro(a)',
                        estadoCivil: s.estado_civil || '',
                        regimeCasamento: s.regime_casamento || '',
                        profissao: s.profissao || '',
                        endereco: s.endereco || '',
                        participacao: s.participacao?.percentual || s.participacao || ''
                    }));
                    setSocios(sociosFormatados);
                }
                
                toast.success('Dados extraídos com sucesso!');
            } else {
                toast.warning('Não foi possível extrair todos os dados. Preencha manualmente.');
            }
        } catch (error) {
            console.error('Erro ao extrair:', error);
            toast.error('Erro ao extrair dados do contrato');
        } finally {
            setExtraindoContrato(false);
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
    };

    const handleAddSocio = () => {
        setSocios(prev => [...prev, {
            nome: '', cpf: '', rg: '', orgaoEmissor: '', nacionalidade: 'Brasileiro(a)',
            estadoCivil: '', regimeCasamento: '', profissao: '', endereco: '', participacao: ''
        }]);
    };

    const handleGerarDistrato = async () => {
        setProcessing(true);
        try {
            // Criar processo
            const formData = new FormData();
            formData.append('tipo_alteracao', 'baixa');
            formData.append('descricao', `Distrato Social de ${razaoSocial}`);
            if (arquivoContrato) {
                formData.append('file', arquivoContrato);
            }
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setProcessoId(uploadRes.data.id);
            
            // Gerar distrato
            const response = await axios.post(`${API_URL}/api/baixa/gerar-distrato`, {
                minuta_id: uploadRes.data.id,
                empresa: {
                    razao_social: razaoSocial,
                    cnpj: cnpj,
                    nire: nire,
                    capital_social: capitalSocial,
                    data_registro: dataRegistro,
                    junta_comercial: juntaComercial,
                    endereco: endereco
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
                    participacao: s.participacao
                })),
                baixa: {
                    motivo: motivoBaixa,
                    motivo_detalhado: motivoDetalhado,
                    data_encerramento: dataEncerramentoAtividades,
                    destinacao_acervo: destinacaoAcervo,
                    declaracao_quitacao: declaracaoQuitacao,
                    distribuicao_patrimonio: distribuicaoPatrimonio,
                    responsavel_guarda: responsavelGuarda,
                    prazo_guarda: prazoGuarda
                }
            });
            
            if (response.data.distrato) {
                setDistratoGerado(response.data.distrato);
                setProcessoId(response.data.minuta_id || uploadRes.data.id);
                toast.success('Distrato social gerado!');
                setStep(6);
                onComplete();
            }
        } catch (error) {
            console.error('Erro ao gerar distrato:', error);
            toast.error('Erro ao gerar distrato social');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(distratoGerado);
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
            link.setAttribute('download', `distrato_social_${razaoSocial.replace(/\s+/g, '_')}.pdf`);
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
            link.setAttribute('download', `distrato_social_${razaoSocial.replace(/\s+/g, '_')}.docx`);
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
                return arquivoContrato !== null || (razaoSocial && cnpj);
            case 2:
                return razaoSocial.trim() && cnpj.trim();
            case 3:
                return socios.length > 0 && socios.every(s => s.nome.trim() && s.cpf.trim());
            case 4:
                return motivoBaixa && dataEncerramentoAtividades;
            case 5:
                return responsavelGuarda.trim();
            default:
                return true;
        }
    };

    const stepLabels = ['Contrato', 'Empresa', 'Sócios', 'Motivo', 'Patrimônio', 'Resultado'];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        Distrato Social - Baixa de Empresa
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
                    {/* Step 1: Upload do Contrato */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-red-500" />
                                    Upload do Contrato Social Atual
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Faça upload do último contrato social consolidado. A IA irá extrair automaticamente todos os dados necessários para o distrato.
                                </p>
                            </div>
                            
                            <input 
                                ref={contratoInputRef} 
                                type="file" 
                                accept=".pdf,.jpg,.jpeg,.png,.docx" 
                                className="hidden" 
                                onChange={handleContratoUpload} 
                            />
                            
                            <div 
                                onClick={() => contratoInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                                    arquivoContrato 
                                        ? 'border-green-600/50 bg-green-950/20' 
                                        : 'border-zinc-700 hover:border-red-600/50 hover:bg-red-950/10'
                                }`}
                            >
                                {extraindoContrato ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <RefreshCw className="w-12 h-12 text-red-500 animate-spin" />
                                        <p className="text-zinc-300">Extraindo dados do contrato...</p>
                                        <p className="text-xs text-zinc-500">Isso pode levar alguns segundos</p>
                                    </div>
                                ) : arquivoContrato ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <CheckCircle2 className="w-12 h-12 text-green-500" />
                                        <p className="text-white font-medium">{arquivoContrato.name}</p>
                                        <p className="text-xs text-green-400">Dados extraídos com sucesso!</p>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="mt-2 border-zinc-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setArquivoContrato(null);
                                                setDadosExtraidos(null);
                                            }}
                                        >
                                            <X className="w-4 h-4 mr-1" /> Remover
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <Upload className="w-12 h-12 text-zinc-500" />
                                        <p className="text-zinc-300">Clique para fazer upload do contrato social</p>
                                        <p className="text-xs text-zinc-500">PDF, DOCX ou imagem (JPG, PNG)</p>
                                    </div>
                                )}
                            </div>
                            
                            {dadosExtraidos && (
                                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-red-500" />
                                        Dados Extraídos
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-zinc-500">Razão Social:</span>
                                            <span className="text-white ml-2">{razaoSocial || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">CNPJ:</span>
                                            <span className="text-white ml-2">{cnpj || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">NIRE:</span>
                                            <span className="text-white ml-2">{nire || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-500">Sócios:</span>
                                            <span className="text-white ml-2">{socios.length} encontrado(s)</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <div>
                                        <p className="text-amber-200 text-sm font-medium">Não tem o contrato em formato digital?</p>
                                        <p className="text-amber-200/70 text-xs mt-1">
                                            Você pode pular esta etapa e preencher os dados manualmente nas próximas telas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Dados da Empresa */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-red-500" />
                                    Dados da Empresa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    {dadosExtraidos ? 'Confira os dados extraídos e ajuste se necessário.' : 'Preencha os dados da empresa que será encerrada.'}
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
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            CNPJ <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            value={cnpj}
                                            onChange={(e) => setCnpj(e.target.value)}
                                            placeholder="00.000.000/0000-00"
                                            className="bg-zinc-950 border-zinc-800"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            NIRE
                                        </Label>
                                        <Input
                                            value={nire}
                                            onChange={(e) => setNire(e.target.value)}
                                            placeholder="00000000000"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Capital Social
                                        </Label>
                                        <Input
                                            value={capitalSocial}
                                            onChange={(e) => setCapitalSocial(e.target.value)}
                                            placeholder="R$ 100.000,00"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Junta Comercial
                                        </Label>
                                        <Input
                                            value={juntaComercial}
                                            onChange={(e) => setJuntaComercial(e.target.value)}
                                            placeholder="JUCESP"
                                            className="bg-zinc-950 border-zinc-800"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Data de Registro na Junta
                                    </Label>
                                    <Input
                                        value={dataRegistro}
                                        onChange={(e) => setDataRegistro(e.target.value)}
                                        placeholder="01/01/2020"
                                        className="bg-zinc-950 border-zinc-800 w-48"
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Endereço Completo da Sede
                                    </Label>
                                    <Textarea
                                        value={endereco}
                                        onChange={(e) => setEndereco(e.target.value)}
                                        placeholder="Rua, número, complemento, bairro, cidade-UF, CEP"
                                        className="bg-zinc-950 border-zinc-800"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Qualificação dos Sócios */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-500" />
                                    Qualificação dos Sócios
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    {dadosExtraidos ? 'Confira os dados dos sócios extraídos. Use o botão "Corrigir com IA" para ajustar se necessário.' : 'Adicione os dados de todos os sócios da empresa.'}
                                </p>
                            </div>
                            
                            {socios.length === 0 && (
                                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-8 text-center">
                                    <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <p className="text-zinc-400 mb-4">Nenhum sócio adicionado</p>
                                    <Button onClick={handleAddSocio} className="bg-red-600 hover:bg-red-700">
                                        <Plus className="w-4 h-4 mr-2" /> Adicionar Sócio
                                    </Button>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                {socios.map((socio, index) => (
                                    <SocioBaixaCard
                                        key={index}
                                        socio={socio}
                                        index={index}
                                        onChange={(s) => handleSocioChange(index, s)}
                                        onRemove={() => handleRemoveSocio(index)}
                                        canRemove={socios.length > 1}
                                    />
                                ))}
                            </div>
                            
                            {socios.length > 0 && (
                                <Button 
                                    variant="outline" 
                                    onClick={handleAddSocio} 
                                    className="w-full border-zinc-700 border-dashed"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar Outro Sócio
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Step 4: Motivo da Baixa */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                    Motivo e Detalhes da Baixa
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Informe o motivo do encerramento da empresa e a data de cessação das atividades.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Motivo do Encerramento <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={motivoBaixa} onValueChange={setMotivoBaixa}>
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                            <SelectValue placeholder="Selecione o motivo" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                            {MOTIVOS_BAIXA.map(m => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                {motivoBaixa === 'outros' && (
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Especifique o Motivo
                                        </Label>
                                        <Textarea
                                            value={motivoDetalhado}
                                            onChange={(e) => setMotivoDetalhado(e.target.value)}
                                            placeholder="Descreva o motivo do encerramento..."
                                            className="bg-zinc-950 border-zinc-800"
                                            rows={3}
                                        />
                                    </div>
                                )}
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Data de Encerramento das Atividades <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={dataEncerramentoAtividades}
                                        onChange={(e) => setDataEncerramentoAtividades(e.target.value)}
                                        className="bg-zinc-950 border-zinc-800 w-48"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Destinação do Acervo (Livros e Documentos)
                                    </Label>
                                    <Textarea
                                        value={destinacaoAcervo}
                                        onChange={(e) => setDestinacaoAcervo(e.target.value)}
                                        placeholder="Ex: Os livros e documentos ficarão sob a guarda de [Nome do Sócio], no endereço [Endereço]"
                                        className="bg-zinc-950 border-zinc-800"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Patrimônio */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-red-500" />
                                    Distribuição do Patrimônio
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Defina como será distribuído o patrimônio remanescente e quem será responsável pela guarda dos documentos.
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={declaracaoQuitacao}
                                            onChange={(e) => setDeclaracaoQuitacao(e.target.checked)}
                                            className="w-5 h-5 accent-red-600"
                                        />
                                        <div>
                                            <p className="text-white font-medium">Declaração de Quitação de Débitos</p>
                                            <p className="text-zinc-500 text-sm">
                                                Declaro que a empresa não possui dívidas pendentes com terceiros, funcionários, tributos ou obrigações sociais.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Distribuição do Patrimônio Remanescente
                                    </Label>
                                    <Textarea
                                        value={distribuicaoPatrimonio}
                                        onChange={(e) => setDistribuicaoPatrimonio(e.target.value)}
                                        placeholder="Ex: O patrimônio líquido remanescente será dividido entre os sócios na proporção de suas quotas..."
                                        className="bg-zinc-950 border-zinc-800"
                                        rows={3}
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Responsável pela Guarda dos Documentos <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={responsavelGuarda}
                                        onChange={(e) => setResponsavelGuarda(e.target.value)}
                                        placeholder="Nome completo do responsável"
                                        className="bg-zinc-950 border-zinc-800"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                        Prazo de Guarda dos Documentos
                                    </Label>
                                    <Select value={prazoGuarda} onValueChange={setPrazoGuarda}>
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800 w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700">
                                            <SelectItem value="5 anos">5 anos</SelectItem>
                                            <SelectItem value="10 anos">10 anos</SelectItem>
                                            <SelectItem value="Prazo legal">Prazo legal aplicável</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Resultado */}
                    {step === 6 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    Distrato Social Gerado
                                </h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    O distrato social foi gerado com sucesso. Revise o documento e faça o download.
                                </p>
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                                <Button onClick={downloadWord} className="bg-blue-600 hover:bg-blue-700">
                                    <FileDown className="w-4 h-4 mr-2" /> Baixar Word
                                </Button>
                                <Button onClick={downloadPDF} className="bg-red-600 hover:bg-red-700">
                                    <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
                                </Button>
                                <Button variant="outline" onClick={copyToClipboard} className="border-zinc-700">
                                    <Copy className="w-4 h-4 mr-2" /> Copiar Texto
                                </Button>
                            </div>
                            
                            <div className="bg-white text-black rounded-lg p-6 max-h-[400px] overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>
                                    {distratoGerado}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer com botões de navegação */}
                <div className="flex justify-between items-center p-4 border-t border-zinc-800">
                    <Button
                        variant="outline"
                        onClick={() => step === 1 ? handleClose() : setStep(step - 1)}
                        className="border-zinc-700"
                        disabled={processing}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </Button>
                    
                    {step < 5 && (
                        <Button
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed() || processing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    )}
                    
                    {step === 5 && (
                        <Button
                            onClick={handleGerarDistrato}
                            disabled={!canProceed() || processing}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {processing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Gerar Distrato
                                </>
                            )}
                        </Button>
                    )}
                    
                    {step === 6 && (
                        <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Concluir
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WizardBaixa;
