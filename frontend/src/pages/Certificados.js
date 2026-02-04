import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
    Shield, Upload, Trash2, Key, Building2,
    RefreshCw, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Certificados = () => {
    const [certificados, setCertificados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Form state
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [cnpjs, setCnpjs] = useState('');
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchCertificados();
    }, []);

    const fetchCertificados = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/certificados`);
            setCertificados(response.data);
        } catch (error) {
            toast.error('Erro ao carregar certificados');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.pfx')) {
                toast.error('O arquivo deve ser um certificado .pfx');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !nome || !senha) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('nome', nome);
        formData.append('senha', senha);
        formData.append('cnpjs', cnpjs);

        try {
            const response = await axios.post(`${API_URL}/api/certificados/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Certificado cadastrado com sucesso!');
            setCertificados([response.data, ...certificados]);
            resetForm();
            setDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Erro ao cadastrar certificado');
        } finally {
            setUploading(false);
        }
    };

    const deleteCertificado = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/certificados/${id}`);
            toast.success('Certificado removido');
            setCertificados(certificados.filter(c => c.id !== id));
        } catch (error) {
            toast.error('Erro ao remover certificado');
        }
    };

    const resetForm = () => {
        setNome('');
        setSenha('');
        setCnpjs('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusInfo = (cert) => {
        if (!cert.validade) return { status: 'pendente', color: 'zinc', icon: Clock };
        
        const validade = new Date(cert.validade);
        const hoje = new Date();
        const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
        
        if (diasRestantes < 0) return { status: 'Vencido', color: 'red', icon: AlertTriangle };
        if (diasRestantes <= 30) return { status: `${diasRestantes} dias`, color: 'amber', icon: AlertTriangle };
        return { status: 'Ativo', color: 'emerald', icon: CheckCircle2 };
    };

    return (
        <div className="p-8 fade-in" data-testid="certificados-page">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Certificados Digitais</h1>
                    <p className="text-zinc-500">
                        Gerencie os certificados digitais A1 para consultas automatizadas
                    </p>
                </div>
                <Button
                    data-testid="novo-certificado-btn"
                    onClick={() => setDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-700 btn-business"
                >
                    <Upload className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Novo Certificado
                </Button>
            </div>

            {/* Certificados Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin" />
                </div>
            ) : certificados.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded p-12 text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-zinc-700" strokeWidth={1.5} />
                    <h3 className="text-xl font-semibold text-white mb-2">Nenhum certificado cadastrado</h3>
                    <p className="text-zinc-500 mb-6">
                        Cadastre seu primeiro certificado digital para começar a consultar licenças
                    </p>
                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="bg-red-600 hover:bg-red-700 btn-business"
                    >
                        <Upload className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Cadastrar Certificado
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificados.map((cert) => {
                        const statusInfo = getStatusInfo(cert);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                            <div
                                key={cert.id}
                                className="bg-zinc-900 border border-zinc-800 rounded p-6 card-hover"
                                data-testid={`certificado-card-${cert.id}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{cert.nome}</h3>
                                            <p className="text-xs text-zinc-500">{cert.arquivo}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        data-testid={`delete-cert-${cert.id}`}
                                        onClick={() => deleteCertificado(cert.id)}
                                        className="text-zinc-500 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500 uppercase">Status</span>
                                        <span className={`flex items-center gap-1 text-sm text-${statusInfo.color}-500`}>
                                            <StatusIcon className="w-4 h-4" strokeWidth={1.5} />
                                            {statusInfo.status}
                                        </span>
                                    </div>

                                    {cert.validade && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-zinc-500 uppercase">Validade</span>
                                            <span className="text-sm text-zinc-300">
                                                {new Date(cert.validade).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500 uppercase">CNPJs</span>
                                        <span className="text-sm text-zinc-300">
                                            {cert.cnpjs?.length || 0} cadastrado(s)
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-zinc-800">
                                    <div className="flex flex-wrap gap-2">
                                        {cert.cnpjs?.slice(0, 3).map((cnpj, idx) => (
                                            <span 
                                                key={idx}
                                                className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded"
                                            >
                                                {cnpj}
                                            </span>
                                        ))}
                                        {cert.cnpjs?.length > 3 && (
                                            <span className="text-xs text-zinc-500">
                                                +{cert.cnpjs.length - 3} mais
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upload Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            Cadastrar Certificado Digital
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                Nome do Certificado *
                            </Label>
                            <Input
                                data-testid="cert-nome-input"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Ex: Certificado Escritório"
                                className="bg-zinc-950 border-zinc-800 focus:border-red-600"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                Senha do Certificado *
                            </Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                                <Input
                                    data-testid="cert-senha-input"
                                    type="password"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    placeholder="••••••••"
                                    className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                CNPJs (separados por vírgula)
                            </Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                                <Input
                                    data-testid="cert-cnpjs-input"
                                    value={cnpjs}
                                    onChange={(e) => setCnpjs(e.target.value)}
                                    placeholder="00.000.000/0001-00, 00.000.000/0001-01"
                                    className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-600"
                                />
                            </div>
                            <p className="text-xs text-zinc-600">
                                Você poderá adicionar mais CNPJs posteriormente
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                Arquivo .pfx *
                            </Label>
                            <div 
                                className={`drop-zone rounded p-6 text-center cursor-pointer ${file ? 'active' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    data-testid="cert-file-input"
                                    onChange={handleFileChange}
                                    accept=".pfx"
                                    className="hidden"
                                />
                                {file ? (
                                    <div className="flex items-center justify-center gap-2 text-red-500">
                                        <Shield className="w-5 h-5" strokeWidth={1.5} />
                                        <span className="text-sm">{file.name}</span>
                                    </div>
                                ) : (
                                    <div className="text-zinc-500">
                                        <Upload className="w-8 h-8 mx-auto mb-2" strokeWidth={1.5} />
                                        <p className="text-sm">Arraste ou clique para enviar</p>
                                        <p className="text-xs mt-1">Apenas arquivos .pfx</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    resetForm();
                                    setDialogOpen(false);
                                }}
                                className="border-zinc-700"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                data-testid="submit-cert-btn"
                                disabled={uploading || !file || !nome || !senha}
                                className="bg-red-600 hover:bg-red-700 btn-business"
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Cadastrando...
                                    </>
                                ) : (
                                    'Cadastrar'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Certificados;
