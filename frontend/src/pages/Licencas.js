import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { 
    FileCheck, Search, RefreshCw, Trash2, Plus,
    CheckCircle2, AlertTriangle, Clock, Building2,
    Download, ExternalLink, Monitor, X, Info, ArrowUpRight
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const VNC_PORT = 6080; // Porta do noVNC

const Licencas = () => {
    const [licencas, setLicencas] = useState([]);
    const [certificados, setCertificados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [consultando, setConsultando] = useState(null);
    const [renovando, setRenovando] = useState(null);
    const [baixando, setBaixando] = useState(null);
    
    // Visualização licença
    const [licencaViewOpen, setLicencaViewOpen] = useState(false);
    const [licencaContent, setLicencaContent] = useState('');
    
    // VNC Dialog (browser remoto)
    const [vncOpen, setVncOpen] = useState(false);
    const [vncCnpj, setVncCnpj] = useState('');
    const [vncStatus, setVncStatus] = useState('');
    const [aguardandoLogin, setAguardandoLogin] = useState(false);
    
    // Instruções REDESIM (fallback)
    const [instrucoesOpen, setInstrucoesOpen] = useState(false);
    const [instrucoesCnpj, setInstrucoesCnpj] = useState('');
    const [screenshotRedesim, setScreenshotRedesim] = useState('');

    // Form state
    const [cnpj, setCnpj] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [certificadoId, setCertificadoId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [licRes, certRes] = await Promise.all([
                axios.get(`${API_URL}/api/licencas`),
                axios.get(`${API_URL}/api/certificados`)
            ]);
            setLicencas(licRes.data);
            setCertificados(certRes.data);
        } catch (error) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const formatCNPJ = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    };

    const handleAddCNPJ = async (e) => {
        e.preventDefault();
        if (!cnpj || !razaoSocial || !certificadoId) {
            toast.error('Preencha todos os campos');
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/certificados/${certificadoId}/cnpjs`, {
                cnpj,
                razao_social: razaoSocial,
                certificado_id: certificadoId
            });
            toast.success('CNPJ cadastrado com sucesso!');
            setLicencas([response.data, ...licencas]);
            setCnpj('');
            setRazaoSocial('');
            setCertificadoId('');
            setDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Erro ao cadastrar CNPJ');
        }
    };

    const consultarLicenca = async (id) => {
        // Encontrar licença
        const licenca = licencas.find(l => l.id === id);
        if (!licenca) return;
        
        setConsultando(id);
        setVncCnpj(licenca.cnpj);
        setVncStatus('Iniciando navegador...');
        
        try {
            // Iniciar consulta com VNC (browser visível)
            const response = await axios.post(`${API_URL}/api/redesim-vnc/iniciar?cnpj=${encodeURIComponent(licenca.cnpj)}`);
            
            if (response.data.aguardando_login) {
                setVncStatus('Faça login com seu certificado digital!');
                setAguardandoLogin(true);
                setVncOpen(true);
                toast.info('Olhe a tela abaixo e faça login no Gov.br');
                
                // Iniciar polling
                iniciarPollingVNC(licenca.cnpj);
            } else if (response.data.success) {
                toast.success('Consulta realizada!');
                fetchData();
            } else if (response.data.error) {
                toast.error(`Erro: ${response.data.error}`);
            }
            
        } catch (error) {
            console.error('Erro VNC:', error);
            // Fallback para consulta simulada
            try {
                const response = await axios.post(`${API_URL}/api/licencas/${id}/consultar`);
                toast.success('Status atualizado (simulado)');
                setLicencas(licencas.map(l => l.id === id ? response.data : l));
            } catch (e) {
                toast.error('Erro ao consultar licença');
            }
        } finally {
            setConsultando(null);
        }
    };

    // Polling para verificar login VNC
    const pollingRef = useRef(null);
    
    const iniciarPollingVNC = (cnpjParam) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        
        let tentativas = 0;
        pollingRef.current = setInterval(async () => {
            tentativas++;
            
            if (tentativas > 60) { // 5 minutos (60 x 5s)
                clearInterval(pollingRef.current);
                setVncStatus('Tempo limite. Clique em "Continuar" após fazer login.');
                return;
            }
            
            try {
                const status = await axios.get(`${API_URL}/api/redesim-vnc/status`);
                
                if (status.data.status === 'logado' || status.data.status === 'na_consulta') {
                    // Login detectado, continuar automação
                    setVncStatus('Login detectado! Fazendo consulta...');
                    clearInterval(pollingRef.current);
                    
                    const resultado = await axios.post(`${API_URL}/api/redesim-vnc/continuar?cnpj=${encodeURIComponent(cnpjParam)}`);
                    
                    if (resultado.data.success) {
                        toast.success('Consulta realizada com sucesso!');
                        setVncStatus('Consulta concluída!');
                        setAguardandoLogin(false);
                        fetchData();
                        
                        // Fechar após 3 segundos
                        setTimeout(() => {
                            setVncOpen(false);
                            axios.post(`${API_URL}/api/redesim-vnc/fechar`);
                        }, 3000);
                    }
                }
            } catch (e) {
                // Silenciosamente continua tentando
            }
        }, 5000);
    };
    
    const continuarVNC = async () => {
        setVncStatus('Verificando login e continuando consulta...');
        try {
            const resultado = await axios.post(`${API_URL}/api/redesim-vnc/continuar?cnpj=${encodeURIComponent(vncCnpj)}`);
            
            if (resultado.data.success) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                toast.success('Consulta realizada!');
                setAguardandoLogin(false);
                fetchData();
                setTimeout(() => setVncOpen(false), 2000);
            } else {
                setVncStatus(resultado.data.message || 'Login não detectado. Continue o login no Gov.br.');
            }
        } catch (e) {
            toast.error('Erro ao continuar');
        }
    };
    
    const fecharVNC = async () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        try {
            await axios.post(`${API_URL}/api/redesim-vnc/fechar`);
        } catch (e) {}
        setVncOpen(false);
        setAguardandoLogin(false);
    };
    
    // Cleanup ao desmontar
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const abrirRedesim = (cnpj) => {
        window.open('https://vreredesim.sp.gov.br', '_blank');
        toast.info(`Consulte o CNPJ: ${cnpj}`);
    };

    const renovarLicenca = async (id) => {
        setRenovando(id);
        try {
            const response = await axios.post(`${API_URL}/api/licencas/${id}/renovar`);
            toast.success('Renovação solicitada com sucesso!');
            setLicencas(licencas.map(l => l.id === id ? response.data : l));
        } catch (error) {
            toast.error('Erro ao renovar licença');
        } finally {
            setRenovando(null);
        }
    };

    const downloadLicenca = async (id) => {
        setBaixando(id);
        try {
            const response = await axios.get(`${API_URL}/api/licencas/${id}/download`);
            const { conteudo } = response.data;
            
            // Exibir em tela ao invés de baixar
            setLicencaContent(conteudo);
            setLicencaViewOpen(true);
            toast.success('Licença carregada!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Erro ao carregar licença');
        } finally {
            setBaixando(null);
        }
    };

    const deleteLicenca = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/licencas/${id}`);
            toast.success('CNPJ removido');
            setLicencas(licencas.filter(l => l.id !== id));
        } catch (error) {
            toast.error('Erro ao remover CNPJ');
        }
    };

    const getStatusBadge = (status) => {
        const configs = {
            ativa: { class: 'badge-success', label: 'Ativa', Icon: CheckCircle2 },
            proxima_vencimento: { class: 'badge-warning', label: 'Próx. Vencimento', Icon: AlertTriangle },
            vencida: { class: 'badge-error', label: 'Vencida', Icon: AlertTriangle },
            pendente: { class: 'badge-pending', label: 'Pendente', Icon: Clock }
        };
        const config = configs[status] || configs.pendente;
        const Icon = config.Icon;
        
        return (
            <span className={`badge ${config.class} flex items-center gap-1`}>
                <Icon className="w-3 h-3" strokeWidth={1.5} />
                {config.label}
            </span>
        );
    };

    const consultarTodos = async () => {
        toast.info('Consultando todas as licenças...');
        for (const licenca of licencas) {
            if (licenca.status === 'pendente' || !licenca.ultima_consulta) {
                await consultarLicenca(licenca.id);
            }
        }
        toast.success('Consulta em massa concluída!');
    };

    // Stats
    const stats = {
        total: licencas.length,
        ativas: licencas.filter(l => l.status === 'ativa').length,
        alerta: licencas.filter(l => ['proxima_vencimento', 'vencida'].includes(l.status)).length,
        pendentes: licencas.filter(l => l.status === 'pendente').length
    };

    return (
        <div className="p-8 fade-in" data-testid="licencas-page">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Licenças REDESIM</h1>
                    <p className="text-zinc-500">
                        Gerencie licenças de funcionamento - 
                        <a href="https://vreredesim.sp.gov.br" target="_blank" rel="noopener noreferrer" 
                           className="text-red-500 hover:text-red-400 ml-1">
                            Acessar Portal REDESIM SP ↗
                        </a>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {licencas.length > 0 && (
                        <Button
                            data-testid="consultar-todos-btn"
                            variant="outline"
                            onClick={consultarTodos}
                            className="border-zinc-700 hover:border-red-600"
                        >
                            <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            Consultar Todos
                        </Button>
                    )}
                    <Button
                        data-testid="novo-cnpj-btn"
                        onClick={() => setDialogOpen(true)}
                        className="bg-red-600 hover:bg-red-700 btn-business"
                        disabled={certificados.length === 0}
                    >
                        <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Adicionar CNPJ
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-zinc-500 uppercase">Total</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
                    <div className="text-2xl font-bold text-emerald-500">{stats.ativas}</div>
                    <div className="text-xs text-zinc-500 uppercase">Ativas</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
                    <div className="text-2xl font-bold text-amber-500">{stats.alerta}</div>
                    <div className="text-xs text-zinc-500 uppercase">Atenção</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded p-4">
                    <div className="text-2xl font-bold text-zinc-400">{stats.pendentes}</div>
                    <div className="text-xs text-zinc-500 uppercase">Pendentes</div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" />
                    </div>
                ) : certificados.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileCheck className="w-16 h-16 mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Cadastre um certificado primeiro
                        </h3>
                        <p className="text-zinc-500 mb-4">
                            Para consultar licenças, você precisa cadastrar um certificado digital
                        </p>
                        <Button
                            onClick={() => window.location.href = '/certificados'}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Ir para Certificados
                        </Button>
                    </div>
                ) : licencas.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building2 className="w-16 h-16 mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
                        <h3 className="text-xl font-semibold text-white mb-2">
                            Nenhum CNPJ cadastrado
                        </h3>
                        <p className="text-zinc-500 mb-4">
                            Adicione CNPJs para consultar suas licenças de funcionamento
                        </p>
                        <Button
                            onClick={() => setDialogOpen(true)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            Adicionar CNPJ
                        </Button>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>CNPJ</th>
                                <th>Razão Social</th>
                                <th>Status</th>
                                <th>Vencimento</th>
                                <th>Última Consulta</th>
                                <th className="text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {licencas.map((licenca) => (
                                <tr key={licenca.id} data-testid={`licenca-row-${licenca.id}`}>
                                    <td className="font-mono text-sm">{licenca.cnpj}</td>
                                    <td className="max-w-[200px] truncate">{licenca.razao_social}</td>
                                    <td>{getStatusBadge(licenca.status)}</td>
                                    <td>
                                        {licenca.vencimento 
                                            ? new Date(licenca.vencimento).toLocaleDateString('pt-BR')
                                            : '-'
                                        }
                                    </td>
                                    <td className="text-zinc-500 text-sm">
                                        {licenca.ultima_consulta 
                                            ? new Date(licenca.ultima_consulta).toLocaleDateString('pt-BR')
                                            : 'Nunca'
                                        }
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                data-testid={`consultar-btn-${licenca.id}`}
                                                onClick={() => consultarLicenca(licenca.id)}
                                                disabled={consultando === licenca.id}
                                                className="border-zinc-700 hover:border-red-600"
                                            >
                                                {consultando === licenca.id ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Search className="w-4 h-4" strokeWidth={1.5} />
                                                )}
                                            </Button>
                                            
                                            {['proxima_vencimento', 'vencida'].includes(licenca.status) && (
                                                <Button
                                                    size="sm"
                                                    data-testid={`renovar-btn-${licenca.id}`}
                                                    onClick={() => renovarLicenca(licenca.id)}
                                                    disabled={renovando === licenca.id}
                                                    className="bg-amber-600 hover:bg-amber-700"
                                                >
                                                    {renovando === licenca.id ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                                                    )}
                                                </Button>
                                            )}

                                            {licenca.status === 'ativa' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    data-testid={`download-btn-${licenca.id}`}
                                                    onClick={() => downloadLicenca(licenca.id)}
                                                    disabled={baixando === licenca.id}
                                                    className="border-emerald-700 text-emerald-500 hover:bg-emerald-950"
                                                >
                                                    {baixando === licenca.id ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4" strokeWidth={1.5} />
                                                    )}
                                                </Button>
                                            )}

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                data-testid={`delete-licenca-btn-${licenca.id}`}
                                                onClick={() => deleteLicenca(licenca.id)}
                                                className="border-zinc-700 hover:border-red-600 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add CNPJ Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            Adicionar CNPJ
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddCNPJ} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                Certificado Digital
                            </Label>
                            <Select value={certificadoId} onValueChange={setCertificadoId}>
                                <SelectTrigger 
                                    data-testid="select-certificado"
                                    className="bg-zinc-950 border-zinc-800 focus:border-red-600"
                                >
                                    <SelectValue placeholder="Selecione o certificado" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                    {certificados.map(cert => (
                                        <SelectItem 
                                            key={cert.id} 
                                            value={cert.id}
                                            className="focus:bg-zinc-800"
                                        >
                                            {cert.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                CNPJ
                            </Label>
                            <Input
                                data-testid="input-cnpj"
                                value={cnpj}
                                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                                placeholder="00.000.000/0001-00"
                                className="bg-zinc-950 border-zinc-800 focus:border-red-600 font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                Razão Social
                            </Label>
                            <Input
                                data-testid="input-razao-social"
                                value={razaoSocial}
                                onChange={(e) => setRazaoSocial(e.target.value)}
                                placeholder="Nome da empresa"
                                className="bg-zinc-950 border-zinc-800 focus:border-red-600"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                className="border-zinc-700"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                data-testid="submit-cnpj-btn"
                                disabled={!cnpj || !razaoSocial || !certificadoId}
                                className="bg-red-600 hover:bg-red-700 btn-business"
                            >
                                Adicionar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Licença View Dialog */}
            <Dialog open={licencaViewOpen} onOpenChange={setLicencaViewOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                                Licença de Funcionamento
                            </DialogTitle>
                            <Button size="sm" onClick={() => { navigator.clipboard.writeText(licencaContent); toast.success('Copiado!'); }}
                                className="bg-red-600 hover:bg-red-700">
                                Copiar Tudo
                            </Button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                            Selecione e copie o texto, ou use o botão "Copiar Tudo"
                        </p>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="bg-white text-black rounded-lg p-6">
                            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                {licencaContent}
                            </pre>
                        </div>
                    </div>
                    <div className="flex justify-end p-4 border-t border-zinc-800">
                        <Button variant="outline" onClick={() => setLicencaViewOpen(false)} className="border-zinc-700">
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Instruções REDESIM Dialog */}
            <Dialog open={instrucoesOpen} onOpenChange={setInstrucoesOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Info className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            Consulta no Portal REDESIM
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                            <p className="text-sm text-zinc-400 mb-2">CNPJ consultando:</p>
                            <p className="text-lg font-mono text-white">{instrucoesCnpj}</p>
                            <Button size="sm" variant="outline" className="mt-2 border-zinc-700"
                                onClick={() => { navigator.clipboard.writeText(instrucoesCnpj); toast.success('CNPJ copiado!'); }}>
                                Copiar CNPJ
                            </Button>
                        </div>
                        
                        {screenshotRedesim && (
                            <div className="space-y-2">
                                <p className="text-sm text-zinc-400">Tela atual do navegador:</p>
                                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                                    <img 
                                        src={`data:image/png;base64,${screenshotRedesim}`} 
                                        alt="Tela REDESIM" 
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {aguardandoLogin && (
                            <div className="bg-amber-950/30 border border-amber-800 rounded-lg p-4">
                                <p className="text-amber-400 font-medium mb-2">⚠️ Aguardando login</p>
                                <p className="text-sm text-zinc-400 mb-3">
                                    O sistema navegou até a tela de login. Faça login com seu certificado digital no Gov.br.
                                    <br/><br/>
                                    <strong className="text-amber-300">A consulta será feita automaticamente após você fazer o login!</strong>
                                </p>
                                <div className="flex gap-2">
                                    <Button onClick={continuarAposLogin} className="bg-amber-600 hover:bg-amber-700">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Verificar Login Manualmente
                                    </Button>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">
                                    Verificando automaticamente a cada 5 segundos...
                                </p>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <p className="text-sm text-zinc-400">Instruções:</p>
                            <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
                                <li>Clique no botão abaixo para abrir o portal em nova aba</li>
                                <li>Faça login com seu <strong>Gov.br</strong> (certificado digital)</li>
                                <li>Acesse "Consultar Licenças" ou "Meu Espaço"</li>
                                <li>Pesquise pelo CNPJ acima</li>
                                <li>Verifique status e vencimento da licença</li>
                            </ol>
                        </div>

                        <Button onClick={() => abrirRedesim(instrucoesCnpj)} className="w-full bg-red-600 hover:bg-red-700">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir Portal REDESIM SP
                        </Button>
                        
                        <p className="text-xs text-zinc-500 text-center">
                            O portal requer login via Gov.br com certificado digital
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* VNC Browser Dialog - Automação Visível */}
            <Dialog open={vncOpen} onOpenChange={(open) => { if (!open) fecharVNC(); }}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-6xl h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="border-b border-zinc-800 p-4">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Monitor className="w-5 h-5 text-red-500" />
                                Consulta REDESIM - Navegador Remoto
                            </DialogTitle>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-400">{vncStatus}</span>
                                {aguardandoLogin && (
                                    <Button 
                                        size="sm" 
                                        onClick={continuarVNC}
                                        className="bg-amber-600 hover:bg-amber-700"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Verificar Login
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={fecharVNC}
                                    className="border-zinc-700"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        {aguardandoLogin && (
                            <div className="mt-2 bg-amber-950/50 border border-amber-800 rounded p-3">
                                <p className="text-amber-400 text-sm">
                                    <strong>⚠️ Faça login com seu certificado digital na tela abaixo!</strong>
                                    <br/>
                                    Após fazer login no Gov.br, o sistema continuará automaticamente.
                                </p>
                            </div>
                        )}
                    </DialogHeader>
                    <div className="flex-1 bg-black">
                        <iframe 
                            src={`${API_URL}/api/novnc/vnc.html?autoconnect=true&resize=scale&quality=6`}
                            className="w-full h-full border-0"
                            title="Navegador Remoto - REDESIM"
                            allow="clipboard-write"
                        />
                    </div>
                    <div className="border-t border-zinc-800 p-3 flex items-center justify-between bg-zinc-950">
                        <span className="text-xs text-zinc-500">
                            CNPJ: <span className="font-mono text-zinc-400">{vncCnpj}</span>
                        </span>
                        <span className="text-xs text-zinc-500">
                            Use o navegador acima para fazer login no Gov.br. A consulta será feita automaticamente.
                        </span>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Licencas;
