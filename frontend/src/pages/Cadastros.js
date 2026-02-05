import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
    Database, Send, Building2, Users, MapPin, FileText, 
    Loader2, CheckCircle, Download, Plus, Trash2, Sparkles,
    History, RefreshCw, Eye, Search, Upload, Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Estados brasileiros
const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const Cadastros = () => {
    const [activeTab, setActiveTab] = useState('gclick');
    const fileInputRef = useRef(null);
    const sciFileInputRef = useRef(null);
    
    // Histórico
    const [historico, setHistorico] = useState([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);
    
    // Extração IA
    const [extraindo, setExtraindo] = useState(false);
    const [extraindoSci, setExtraindoSci] = useState(false);
    
    // Busca IE
    const [buscandoIE, setBuscandoIE] = useState(false);
    
    // GClick Form State
    const [gclickLoading, setGclickLoading] = useState(false);
    const [gclickForm, setGclickForm] = useState({
        codigoCliente: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        inscricaoEstadual: '',
        inscricaoMunicipal: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: 'SP',
        cep: '',
        telefone: '',
        email: '',
        observacoes: ''
    });
    const [gclickSocios, setGclickSocios] = useState([
        { nome: '', cpf: '', participacao: '', administrador: true }
    ]);

    // SCI Único Form State
    const [sciForm, setSciForm] = useState({
        codigoCliente: '',
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        inscricaoEstadual: '',
        inscricaoMunicipal: '',
        regime: 'simples',
        dataAbertura: '',
        capitalSocial: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: 'SP',
        cep: '',
        responsavel: '',
        cpfResponsavel: '',
        telefone: '',
        email: ''
    });

    // Carregar histórico ao montar
    useEffect(() => {
        carregarHistorico();
    }, []);

    const carregarHistorico = async () => {
        setLoadingHistorico(true);
        try {
            const response = await axios.get(`${API_URL}/api/cadastros/historico`);
            setHistorico(response.data.cadastros || []);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        } finally {
            setLoadingHistorico(false);
        }
    };

    // Extração por IA - GClick (Múltiplos documentos)
    const handleExtrairIA = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setExtraindo(true);
        const qtdArquivos = files.length;
        toast.info(`Extraindo dados de ${qtdArquivos} documento${qtdArquivos > 1 ? 's' : ''} com IA...`);
        
        try {
            const formData = new FormData();
            
            // Adicionar todos os arquivos
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            
            // Usar endpoint de múltiplos documentos
            const response = await axios.post(`${API_URL}/api/cadastros/extrair-dados-multiplos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.dados) {
                const dados = response.data.dados;
                
                // Preencher formulário GClick
                setGclickForm(prev => ({
                    ...prev,
                    razaoSocial: dados.razao_social || prev.razaoSocial,
                    nomeFantasia: dados.nome_fantasia || prev.nomeFantasia,
                    cnpj: dados.cnpj || prev.cnpj,
                    inscricaoEstadual: dados.inscricao_estadual || prev.inscricaoEstadual,
                    inscricaoMunicipal: dados.inscricao_municipal || prev.inscricaoMunicipal,
                    endereco: dados.endereco?.logradouro || prev.endereco,
                    numero: dados.endereco?.numero || prev.numero,
                    complemento: dados.endereco?.complemento || prev.complemento,
                    bairro: dados.endereco?.bairro || prev.bairro,
                    cidade: dados.endereco?.cidade || prev.cidade,
                    estado: dados.endereco?.estado || prev.estado,
                    cep: dados.endereco?.cep || prev.cep,
                    telefone: dados.telefone || prev.telefone,
                    email: dados.email || prev.email
                }));
                
                // Preencher sócios se houver
                if (dados.socios && dados.socios.length > 0) {
                    setGclickSocios(dados.socios.map(s => ({
                        nome: s.nome || '',
                        cpf: s.cpf || '',
                        participacao: s.participacao || '',
                        administrador: s.administrador || false
                    })));
                }
                
                // Mostrar quais documentos foram analisados
                const docsAnalisados = dados.documentos_analisados;
                if (docsAnalisados && docsAnalisados.length > 0) {
                    toast.success(`Dados consolidados de ${qtdArquivos} documento${qtdArquivos > 1 ? 's' : ''}: ${docsAnalisados.join(', ')}`);
                } else {
                    toast.success(`Dados extraídos de ${qtdArquivos} documento${qtdArquivos > 1 ? 's' : ''}!`);
                }
                
                // Buscar IE automaticamente se tiver CNPJ e estado
                if (dados.cnpj && dados.endereco?.estado) {
                    buscarInscricaoEstadual(dados.cnpj, dados.endereco.estado, 'gclick');
                }
            } else {
                toast.error(response.data.message || 'Não foi possível extrair os dados');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.error('Erro ao extrair dados do documento');
        } finally {
            setExtraindo(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Extração por IA - SCI Único
    const handleExtrairIASci = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setExtraindoSci(true);
        toast.info('Extraindo dados do documento com IA...');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await axios.post(`${API_URL}/api/cadastros/extrair-dados`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (response.data.success && response.data.dados) {
                const dados = response.data.dados;
                
                // Preencher formulário SCI
                setSciForm(prev => ({
                    ...prev,
                    razaoSocial: dados.razao_social || prev.razaoSocial,
                    nomeFantasia: dados.nome_fantasia || prev.nomeFantasia,
                    cnpj: dados.cnpj || prev.cnpj,
                    inscricaoEstadual: dados.inscricao_estadual || prev.inscricaoEstadual,
                    inscricaoMunicipal: dados.inscricao_municipal || prev.inscricaoMunicipal,
                    regime: dados.regime_tributario?.toLowerCase().includes('simples') ? 'simples' : 
                            dados.regime_tributario?.toLowerCase().includes('presumido') ? 'presumido' : 'real',
                    dataAbertura: dados.data_abertura || prev.dataAbertura,
                    capitalSocial: dados.capital_social || prev.capitalSocial,
                    endereco: dados.endereco?.logradouro || prev.endereco,
                    numero: dados.endereco?.numero || prev.numero,
                    bairro: dados.endereco?.bairro || prev.bairro,
                    cidade: dados.endereco?.cidade || prev.cidade,
                    estado: dados.endereco?.estado || prev.estado,
                    cep: dados.endereco?.cep || prev.cep,
                    telefone: dados.telefone || prev.telefone,
                    email: dados.email || prev.email
                }));
                
                toast.success('Dados extraídos com sucesso!');
                
                // Buscar IE automaticamente
                if (dados.cnpj && dados.endereco?.estado) {
                    buscarInscricaoEstadual(dados.cnpj, dados.endereco.estado, 'sci');
                }
            } else {
                toast.error(response.data.message || 'Não foi possível extrair os dados');
            }
        } catch (error) {
            console.error('Erro na extração:', error);
            toast.error('Erro ao extrair dados do documento');
        } finally {
            setExtraindoSci(false);
            if (sciFileInputRef.current) sciFileInputRef.current.value = '';
        }
    };

    // Buscar Inscrição Estadual no SINTEGRA
    const buscarInscricaoEstadual = async (cnpj, uf, form = 'gclick') => {
        if (!cnpj || !uf) return;
        
        setBuscandoIE(true);
        try {
            const response = await axios.get(`${API_URL}/api/sintegra/${uf}/${cnpj}`);
            
            if (response.data.inscricao_estadual) {
                if (form === 'gclick') {
                    setGclickForm(prev => ({ ...prev, inscricaoEstadual: response.data.inscricao_estadual }));
                } else {
                    setSciForm(prev => ({ ...prev, inscricaoEstadual: response.data.inscricao_estadual }));
                }
                toast.success('Inscrição Estadual encontrada!');
            } else {
                // Deixar em branco se não encontrar
                toast.info('IE não encontrada no SINTEGRA. Verifique manualmente se necessário.');
            }
        } catch (error) {
            console.error('Erro ao buscar IE:', error);
        } finally {
            setBuscandoIE(false);
        }
    };

    // Handlers GClick
    const handleGclickChange = (field, value) => {
        setGclickForm(prev => ({ ...prev, [field]: value }));
    };

    const addSocio = () => {
        setGclickSocios(prev => [...prev, { nome: '', cpf: '', participacao: '', administrador: false }]);
    };

    const removeSocio = (index) => {
        if (gclickSocios.length > 1) {
            setGclickSocios(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateSocio = (index, field, value) => {
        setGclickSocios(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleEnviarGClick = async () => {
        if (!gclickForm.razaoSocial || !gclickForm.cnpj) {
            toast.error('Preencha pelo menos a Razão Social e CNPJ');
            return;
        }

        setGclickLoading(true);
        try {
            // Montar nome no formato ID - RAZÃO SOCIAL
            const nomeGclick = gclickForm.codigoCliente 
                ? `${gclickForm.codigoCliente} - ${gclickForm.razaoSocial}`
                : gclickForm.razaoSocial;

            // Montar endereço completo
            let enderecoCompleto = gclickForm.endereco;
            if (gclickForm.numero) enderecoCompleto += `, ${gclickForm.numero}`;
            if (gclickForm.complemento) enderecoCompleto += `, ${gclickForm.complemento}`;

            // Montar observações com sócios
            let observacoes = gclickForm.observacoes || '';
            if (gclickSocios.length > 0 && gclickSocios[0].nome) {
                observacoes += '\n\nSÓCIOS:\n';
                gclickSocios.forEach(s => {
                    if (s.nome) {
                        observacoes += `- ${s.nome} (CPF: ${s.cpf || 'N/A'}) - ${s.participacao || '?'}%`;
                        if (s.administrador) observacoes += ' [ADMINISTRADOR]';
                        observacoes += '\n';
                    }
                });
            }

            const response = await axios.post(`${API_URL}/api/gclick/cadastrar-direto`, {
                nome: nomeGclick,
                nome_fantasia: gclickForm.nomeFantasia,
                cpf_cnpj: gclickForm.cnpj,
                inscricao_estadual: gclickForm.inscricaoEstadual,
                inscricao_municipal: gclickForm.inscricaoMunicipal,
                endereco: enderecoCompleto,
                bairro: gclickForm.bairro,
                cidade: gclickForm.cidade,
                estado: gclickForm.estado,
                cep: gclickForm.cep,
                telefone: gclickForm.telefone,
                email: gclickForm.email,
                observacoes: observacoes
            });

            if (response.data.success) {
                toast.success('Empresa cadastrada com sucesso no GClick!');
                // Recarregar histórico
                carregarHistorico();
                // Limpar formulário
                limparFormularioGClick();
            } else {
                toast.error(response.data.message || 'Erro ao cadastrar no GClick');
            }
        } catch (error) {
            console.error('Erro GClick:', error);
            toast.error(error.response?.data?.detail || 'Erro ao enviar para GClick');
        } finally {
            setGclickLoading(false);
        }
    };

    const limparFormularioGClick = () => {
        setGclickForm({
            codigoCliente: '', razaoSocial: '', nomeFantasia: '', cnpj: '',
            inscricaoEstadual: '', inscricaoMunicipal: '', endereco: '', numero: '',
            complemento: '', bairro: '', cidade: '', estado: 'SP', cep: '',
            telefone: '', email: '', observacoes: ''
        });
        setGclickSocios([{ nome: '', cpf: '', participacao: '', administrador: true }]);
    };

    // Handler SCI Único - Exportar dados
    const handleExportarSCI = async () => {
        if (!sciForm.razaoSocial || !sciForm.cnpj) {
            toast.error('Preencha pelo menos a Razão Social e CNPJ');
            return;
        }

        // Gerar texto formatado para copiar/importar no SCI
        const dados = `
========================================
DADOS PARA CADASTRO NO SCI ÚNICO
========================================

CÓDIGO CLIENTE: ${sciForm.codigoCliente || 'N/A'}
RAZÃO SOCIAL: ${sciForm.razaoSocial}
NOME FANTASIA: ${sciForm.nomeFantasia || 'N/A'}
CNPJ: ${sciForm.cnpj}
INSCRIÇÃO ESTADUAL: ${sciForm.inscricaoEstadual || 'ISENTO'}
INSCRIÇÃO MUNICIPAL: ${sciForm.inscricaoMunicipal || 'N/A'}

REGIME TRIBUTÁRIO: ${sciForm.regime === 'simples' ? 'Simples Nacional' : sciForm.regime === 'presumido' ? 'Lucro Presumido' : 'Lucro Real'}
DATA DE ABERTURA: ${sciForm.dataAbertura || 'N/A'}
CAPITAL SOCIAL: ${sciForm.capitalSocial || 'N/A'}

ENDEREÇO: ${sciForm.endereco}${sciForm.numero ? `, ${sciForm.numero}` : ''}
BAIRRO: ${sciForm.bairro}
CIDADE/UF: ${sciForm.cidade}/${sciForm.estado}
CEP: ${sciForm.cep}

RESPONSÁVEL: ${sciForm.responsavel || 'N/A'}
CPF RESPONSÁVEL: ${sciForm.cpfResponsavel || 'N/A'}
TELEFONE: ${sciForm.telefone || 'N/A'}
E-MAIL: ${sciForm.email || 'N/A'}

========================================
        `.trim();

        // Copiar para clipboard
        navigator.clipboard.writeText(dados);
        toast.success('Dados copiados para a área de transferência!');

        // Salvar no histórico
        try {
            await axios.post(`${API_URL}/api/cadastros/salvar-sci`, {
                razao_social: sciForm.razaoSocial,
                cnpj: sciForm.cnpj,
                nome_fantasia: sciForm.nomeFantasia,
                inscricao_estadual: sciForm.inscricaoEstadual,
                inscricao_municipal: sciForm.inscricaoMunicipal,
                regime_tributario: sciForm.regime,
                data_abertura: sciForm.dataAbertura,
                capital_social: sciForm.capitalSocial,
                endereco: sciForm.endereco + (sciForm.numero ? `, ${sciForm.numero}` : ''),
                bairro: sciForm.bairro,
                cidade: sciForm.cidade,
                estado: sciForm.estado,
                cep: sciForm.cep,
                responsavel: sciForm.responsavel,
                cpf_responsavel: sciForm.cpfResponsavel,
                telefone: sciForm.telefone,
                email: sciForm.email
            });
            carregarHistorico();
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    };

    const handleSciChange = (field, value) => {
        setSciForm(prev => ({ ...prev, [field]: value }));
    };

    // Carregar dados do histórico para o formulário (Reenviar/Editar)
    const carregarDoHistorico = (item) => {
        const dados = item.dados_enviados || {};
        
        if (item.tipo === 'cadastro_direto_gclick') {
            // Carregar no formulário GClick
            // Separar nome e código se estiver no formato "CÓDIGO - RAZÃO SOCIAL"
            let razaoSocial = dados.nome || '';
            let codigoCliente = '';
            if (razaoSocial.includes(' - ')) {
                const parts = razaoSocial.split(' - ');
                codigoCliente = parts[0];
                razaoSocial = parts.slice(1).join(' - ');
            }
            
            // Separar endereço se tiver número
            let endereco = dados.endereco || '';
            let numero = '';
            let complemento = '';
            if (endereco.includes(', ')) {
                const parts = endereco.split(', ');
                endereco = parts[0];
                if (parts[1]) numero = parts[1];
                if (parts[2]) complemento = parts[2];
            }
            
            setGclickForm({
                codigoCliente: codigoCliente,
                razaoSocial: razaoSocial,
                nomeFantasia: dados.nome_fantasia || '',
                cnpj: dados.cpf_cnpj || '',
                inscricaoEstadual: dados.inscricao_estadual || '',
                inscricaoMunicipal: dados.inscricao_municipal || '',
                endereco: endereco,
                numero: numero,
                complemento: complemento,
                bairro: dados.bairro || '',
                cidade: dados.cidade || '',
                estado: dados.estado || 'SP',
                cep: dados.cep || '',
                telefone: dados.telefone || '',
                email: dados.email || '',
                observacoes: dados.observacoes || ''
            });
            
            // Mudar para aba GClick
            setActiveTab('gclick');
            setShowHistorico(false);
            toast.info('Dados carregados no formulário GClick. Faça as alterações e reenvie.');
            
        } else if (item.tipo === 'sci_unico') {
            // Carregar no formulário SCI
            let endereco = dados.endereco || '';
            let numero = '';
            if (endereco.includes(', ')) {
                const parts = endereco.split(', ');
                endereco = parts[0];
                if (parts[1]) numero = parts[1];
            }
            
            setSciForm({
                codigoCliente: '',
                razaoSocial: dados.razao_social || '',
                nomeFantasia: dados.nome_fantasia || '',
                cnpj: dados.cnpj || '',
                inscricaoEstadual: dados.inscricao_estadual || '',
                inscricaoMunicipal: dados.inscricao_municipal || '',
                regime: dados.regime_tributario || 'simples',
                dataAbertura: dados.data_abertura || '',
                capitalSocial: dados.capital_social || '',
                endereco: endereco,
                numero: numero,
                bairro: dados.bairro || '',
                cidade: dados.cidade || '',
                estado: dados.estado || 'SP',
                cep: dados.cep || '',
                responsavel: dados.responsavel || '',
                cpfResponsavel: dados.cpf_responsavel || '',
                telefone: dados.telefone || '',
                email: dados.email || ''
            });
            
            // Mudar para aba SCI
            setActiveTab('sci');
            setShowHistorico(false);
            toast.info('Dados carregados no formulário SCI. Faça as alterações e exporte novamente.');
        }
    };

    // Excluir do histórico
    const excluirDoHistorico = async (id) => {
        if (!window.confirm('Deseja remover este registro do histórico?')) return;
        
        try {
            await axios.delete(`${API_URL}/api/cadastros/historico/${id}`);
            toast.success('Registro removido do histórico');
            carregarHistorico();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            toast.error('Erro ao remover registro');
        }
    };

    const limparFormularioSCI = () => {
        setSciForm({
            codigoCliente: '', razaoSocial: '', nomeFantasia: '', cnpj: '',
            inscricaoEstadual: '', inscricaoMunicipal: '', regime: 'simples',
            dataAbertura: '', capitalSocial: '', endereco: '', numero: '',
            bairro: '', cidade: '', estado: 'SP', cep: '', responsavel: '',
            cpfResponsavel: '', telefone: '', email: ''
        });
    };

    // Formatar data
    const formatarData = (dataStr) => {
        if (!dataStr) return '-';
        const data = new Date(dataStr);
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-8" data-testid="cadastros-page">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-red-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Cadastros</h1>
                        <p className="text-zinc-500 text-sm">Integração com sistemas externos</p>
                    </div>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setShowHistorico(!showHistorico)}
                    className="border-zinc-700 gap-2"
                >
                    <History className="w-4 h-4" />
                    {showHistorico ? 'Ocultar Histórico' : 'Ver Histórico'}
                    {historico.length > 0 && (
                        <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{historico.length}</span>
                    )}
                </Button>
            </div>

            {/* Histórico de Cadastros */}
            {showHistorico && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-zinc-400" />
                            <h2 className="text-lg font-semibold text-white">Histórico de Cadastros</h2>
                        </div>
                        <Button size="sm" variant="ghost" onClick={carregarHistorico} disabled={loadingHistorico}>
                            <RefreshCw className={`w-4 h-4 ${loadingHistorico ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    
                    {loadingHistorico ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                        </div>
                    ) : historico.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">Nenhum cadastro realizado ainda</p>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {historico.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 hover:bg-zinc-800/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${item.tipo === 'cadastro_direto_gclick' ? 'bg-green-600/20' : 'bg-blue-600/20'}`}>
                                            {item.tipo === 'cadastro_direto_gclick' ? (
                                                <Send className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-blue-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">
                                                {item.dados_enviados?.nome || item.dados_enviados?.razao_social || 'Empresa'}
                                            </p>
                                            <p className="text-zinc-500 text-xs">
                                                {item.dados_enviados?.cpf_cnpj || item.dados_enviados?.cnpj || '-'} • {item.tipo === 'cadastro_direto_gclick' ? 'GClick' : 'SCI Único'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-zinc-500 text-xs">{formatarData(item.created_at)}</span>
                                        {item.gclick_response?.id && (
                                            <CheckCircle className="w-4 h-4 text-green-500" title="Enviado com sucesso" />
                                        )}
                                        <div className="flex items-center gap-1 ml-2">
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => carregarDoHistorico(item)}
                                                className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                                title={item.tipo === 'cadastro_direto_gclick' ? 'Reenviar para GClick' : 'Editar e Exportar'}
                                            >
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                {item.tipo === 'cadastro_direto_gclick' ? 'Reenviar' : 'Editar'}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => excluirDoHistorico(item.id)}
                                                className="h-7 px-2 text-zinc-400 hover:text-red-500 hover:bg-red-600/10"
                                                title="Excluir do histórico"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
                    <TabsTrigger value="gclick" className="data-[state=active]:bg-red-600">
                        <Send className="w-4 h-4 mr-2" />
                        GClick
                    </TabsTrigger>
                    <TabsTrigger value="sci" className="data-[state=active]:bg-red-600">
                        <FileText className="w-4 h-4 mr-2" />
                        SCI Único
                    </TabsTrigger>
                </TabsList>

                {/* Aba GClick */}
                <TabsContent value="gclick">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                                    <Send className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Cadastro GClick</h2>
                                    <p className="text-zinc-500 text-sm">Envie dados diretamente para o GClick</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleExtrairIA} />
                                <Button 
                                    variant="outline" 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={extraindo}
                                    className="border-red-600/50 text-red-500 hover:bg-red-600/20 gap-2"
                                >
                                    {extraindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Preencher com IA
                                </Button>
                                <Button variant="ghost" onClick={limparFormularioGClick} className="text-zinc-500">
                                    Limpar
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 mb-4 bg-zinc-800/50 p-2 rounded">
                            💡 Anexe Cartão CNPJ, Contrato Social ou Certidão da Junta para preenchimento automático
                        </p>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Coluna Esquerda - Dados da Empresa */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Dados da Empresa</span>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">ID/Código</Label>
                                        <Input
                                            value={gclickForm.codigoCliente}
                                            onChange={(e) => handleGclickChange('codigoCliente', e.target.value)}
                                            placeholder="0000"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-zinc-500 text-xs">Razão Social <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={gclickForm.razaoSocial}
                                            onChange={(e) => handleGclickChange('razaoSocial', e.target.value.toUpperCase())}
                                            placeholder="EMPRESA EXEMPLO LTDA"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-zinc-500 text-xs">Nome Fantasia</Label>
                                    <Input
                                        value={gclickForm.nomeFantasia}
                                        onChange={(e) => handleGclickChange('nomeFantasia', e.target.value)}
                                        placeholder="Nome comercial"
                                        className="bg-zinc-800 border-zinc-700 mt-1"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">CNPJ <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={gclickForm.cnpj}
                                            onChange={(e) => handleGclickChange('cnpj', e.target.value)}
                                            placeholder="00.000.000/0001-00"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs flex items-center gap-1">
                                            Insc. Estadual
                                            {buscandoIE && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </Label>
                                        <Input
                                            value={gclickForm.inscricaoEstadual}
                                            onChange={(e) => handleGclickChange('inscricaoEstadual', e.target.value)}
                                            placeholder="Automático"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Insc. Municipal</Label>
                                        <Input
                                            value={gclickForm.inscricaoMunicipal}
                                            onChange={(e) => handleGclickChange('inscricaoMunicipal', e.target.value)}
                                            placeholder="000.000.000"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Endereço */}
                                <div className="flex items-center gap-2 text-zinc-400 mt-4 mb-2">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm font-medium">Endereço</span>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-3">
                                        <Label className="text-zinc-500 text-xs">Logradouro</Label>
                                        <Input
                                            value={gclickForm.endereco}
                                            onChange={(e) => handleGclickChange('endereco', e.target.value)}
                                            placeholder="Rua, Av, etc"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Número</Label>
                                        <Input
                                            value={gclickForm.numero}
                                            onChange={(e) => handleGclickChange('numero', e.target.value)}
                                            placeholder="000"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Bairro</Label>
                                        <Input
                                            value={gclickForm.bairro}
                                            onChange={(e) => handleGclickChange('bairro', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Cidade</Label>
                                        <Input
                                            value={gclickForm.cidade}
                                            onChange={(e) => handleGclickChange('cidade', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">UF</Label>
                                        <select
                                            value={gclickForm.estado}
                                            onChange={(e) => handleGclickChange('estado', e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 mt-1 text-white text-sm"
                                        >
                                            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">CEP</Label>
                                        <Input
                                            value={gclickForm.cep}
                                            onChange={(e) => handleGclickChange('cep', e.target.value)}
                                            placeholder="00000-000"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Telefone</Label>
                                        <Input
                                            value={gclickForm.telefone}
                                            onChange={(e) => handleGclickChange('telefone', e.target.value)}
                                            placeholder="(00) 00000-0000"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">E-mail</Label>
                                        <Input
                                            value={gclickForm.email}
                                            onChange={(e) => handleGclickChange('email', e.target.value)}
                                            placeholder="email@empresa.com"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita - Sócios e Observações */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Users className="w-4 h-4" />
                                        <span className="text-sm font-medium">Sócios</span>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addSocio} className="border-zinc-700 h-7">
                                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                                    </Button>
                                </div>

                                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                                    {gclickSocios.map((socio, idx) => (
                                        <div key={idx} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-zinc-500">Sócio {idx + 1}</span>
                                                {gclickSocios.length > 1 && (
                                                    <Button size="sm" variant="ghost" onClick={() => removeSocio(idx)} className="h-6 w-6 p-0 text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="col-span-2">
                                                    <Input
                                                        value={socio.nome}
                                                        onChange={(e) => updateSocio(idx, 'nome', e.target.value.toUpperCase())}
                                                        placeholder="Nome completo"
                                                        className="bg-zinc-900 border-zinc-700 text-sm h-8"
                                                    />
                                                </div>
                                                <div>
                                                    <Input
                                                        value={socio.participacao}
                                                        onChange={(e) => updateSocio(idx, 'participacao', e.target.value)}
                                                        placeholder="%"
                                                        className="bg-zinc-900 border-zinc-700 text-sm h-8"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <Input
                                                    value={socio.cpf}
                                                    onChange={(e) => updateSocio(idx, 'cpf', e.target.value)}
                                                    placeholder="CPF"
                                                    className="bg-zinc-900 border-zinc-700 text-sm h-8"
                                                />
                                                <label className="flex items-center gap-2 text-xs text-zinc-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={socio.administrador}
                                                        onChange={(e) => updateSocio(idx, 'administrador', e.target.checked)}
                                                        className="accent-green-600"
                                                    />
                                                    Administrador
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <Label className="text-zinc-500 text-xs">Observações</Label>
                                    <Textarea
                                        value={gclickForm.observacoes}
                                        onChange={(e) => handleGclickChange('observacoes', e.target.value)}
                                        placeholder="Informações adicionais..."
                                        className="bg-zinc-800 border-zinc-700 mt-1 h-24"
                                    />
                                </div>

                                <Button 
                                    onClick={handleEnviarGClick} 
                                    disabled={gclickLoading}
                                    className="w-full bg-green-600 hover:bg-green-700 mt-4"
                                >
                                    {gclickLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Enviar para GClick</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Aba SCI Único */}
                <TabsContent value="sci">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Exportar para SCI Único</h2>
                                    <p className="text-zinc-500 text-sm">Gere os dados formatados para importar manualmente no SCI</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input ref={sciFileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleExtrairIASci} />
                                <Button 
                                    variant="outline" 
                                    onClick={() => sciFileInputRef.current?.click()}
                                    disabled={extraindoSci}
                                    className="border-red-600/50 text-red-500 hover:bg-red-600/20 gap-2"
                                >
                                    {extraindoSci ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Preencher com IA
                                </Button>
                                <Button variant="ghost" onClick={limparFormularioSCI} className="text-zinc-500">
                                    Limpar
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-zinc-500 mb-4 bg-zinc-800/50 p-2 rounded">
                            💡 Anexe Cartão CNPJ, Contrato Social ou Certidão da Junta para preenchimento automático
                        </p>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Coluna Esquerda */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Dados da Empresa</span>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">ID/Código</Label>
                                        <Input
                                            value={sciForm.codigoCliente}
                                            onChange={(e) => handleSciChange('codigoCliente', e.target.value)}
                                            placeholder="0000"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-zinc-500 text-xs">Razão Social <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={sciForm.razaoSocial}
                                            onChange={(e) => handleSciChange('razaoSocial', e.target.value.toUpperCase())}
                                            placeholder="EMPRESA EXEMPLO LTDA"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-zinc-500 text-xs">Nome Fantasia</Label>
                                    <Input
                                        value={sciForm.nomeFantasia}
                                        onChange={(e) => handleSciChange('nomeFantasia', e.target.value)}
                                        placeholder="Nome comercial"
                                        className="bg-zinc-800 border-zinc-700 mt-1"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">CNPJ <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={sciForm.cnpj}
                                            onChange={(e) => handleSciChange('cnpj', e.target.value)}
                                            placeholder="00.000.000/0001-00"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs flex items-center gap-1">
                                            Insc. Estadual
                                            {buscandoIE && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </Label>
                                        <Input
                                            value={sciForm.inscricaoEstadual}
                                            onChange={(e) => handleSciChange('inscricaoEstadual', e.target.value)}
                                            placeholder="Automático"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Insc. Municipal</Label>
                                        <Input
                                            value={sciForm.inscricaoMunicipal}
                                            onChange={(e) => handleSciChange('inscricaoMunicipal', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Regime Tributário</Label>
                                        <select
                                            value={sciForm.regime}
                                            onChange={(e) => handleSciChange('regime', e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 mt-1 text-white text-sm"
                                        >
                                            <option value="simples">Simples Nacional</option>
                                            <option value="presumido">Lucro Presumido</option>
                                            <option value="real">Lucro Real</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Data Abertura</Label>
                                        <Input
                                            type="date"
                                            value={sciForm.dataAbertura}
                                            onChange={(e) => handleSciChange('dataAbertura', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Capital Social</Label>
                                        <Input
                                            value={sciForm.capitalSocial}
                                            onChange={(e) => handleSciChange('capitalSocial', e.target.value)}
                                            placeholder="R$ 0,00"
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Coluna Direita */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-sm font-medium">Endereço e Contato</span>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-3">
                                        <Label className="text-zinc-500 text-xs">Logradouro</Label>
                                        <Input
                                            value={sciForm.endereco}
                                            onChange={(e) => handleSciChange('endereco', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Número</Label>
                                        <Input
                                            value={sciForm.numero}
                                            onChange={(e) => handleSciChange('numero', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Bairro</Label>
                                        <Input
                                            value={sciForm.bairro}
                                            onChange={(e) => handleSciChange('bairro', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Cidade</Label>
                                        <Input
                                            value={sciForm.cidade}
                                            onChange={(e) => handleSciChange('cidade', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">UF</Label>
                                        <select
                                            value={sciForm.estado}
                                            onChange={(e) => handleSciChange('estado', e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 mt-1 text-white text-sm"
                                        >
                                            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Responsável</Label>
                                        <Input
                                            value={sciForm.responsavel}
                                            onChange={(e) => handleSciChange('responsavel', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">CPF Responsável</Label>
                                        <Input
                                            value={sciForm.cpfResponsavel}
                                            onChange={(e) => handleSciChange('cpfResponsavel', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-zinc-500 text-xs">Telefone</Label>
                                        <Input
                                            value={sciForm.telefone}
                                            onChange={(e) => handleSciChange('telefone', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-500 text-xs">E-mail</Label>
                                        <Input
                                            value={sciForm.email}
                                            onChange={(e) => handleSciChange('email', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4 mt-4">
                                    <p className="text-blue-400 text-sm mb-3">
                                        <strong>Como funciona:</strong> Ao clicar em "Copiar Dados", os dados serão copiados em formato texto para você colar no SCI Único.
                                    </p>
                                    <Button 
                                        onClick={handleExportarSCI}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Download className="w-4 h-4 mr-2" /> Copiar Dados para SCI Único
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Cadastros;
