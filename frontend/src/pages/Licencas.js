import { useState, useEffect } from 'react';
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
    Download, ArrowUpRight
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
        setConsultando(id);
        try {
            const response = await axios.post(`${API_URL}/api/licencas/${id}/consultar`);
            toast.success('Consulta realizada com sucesso!');
            setLicencas(licencas.map(l => l.id === id ? response.data : l));
        } catch (error) {
            toast.error('Erro ao consultar licença');
        } finally {
            setConsultando(null);
        }
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
                        Consulte e gerencie licenças de funcionamento via portal REDESIM SP
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
        </div>
    );
};

export default Licencas;
