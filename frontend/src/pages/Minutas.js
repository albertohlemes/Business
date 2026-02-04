import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { 
    FileText, Upload, Send, Download, Trash2, 
    MessageSquare, FileUp, Clock, CheckCircle2,
    RefreshCw, Plus, X, File
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIPOS_ALTERACAO = [
    { value: 'alteracao_socios', label: 'Alteração de Sócios', docs: ['CNH/RG do novo sócio', 'Comprovante de endereço'] },
    { value: 'alteracao_endereco', label: 'Alteração de Endereço', docs: ['Comprovante do novo endereço'] },
    { value: 'alteracao_atividade', label: 'Alteração de Atividade/Objeto Social', docs: ['Lista de CNAEs'] },
    { value: 'alteracao_capital', label: 'Alteração de Capital Social', docs: [] },
    { value: 'alteracao_nome', label: 'Alteração de Razão Social/Nome Fantasia', docs: [] },
    { value: 'alteracao_administracao', label: 'Alteração de Administração', docs: ['CNH/RG do administrador'] },
    { value: 'consolidacao', label: 'Consolidação do Contrato Social', docs: [] },
    { value: 'outro', label: 'Outro', docs: [] },
];

const TIPOS_DOC = [
    { value: 'cnh', label: 'CNH' },
    { value: 'rg', label: 'RG' },
    { value: 'comprovante', label: 'Comprovante Endereço' },
    { value: 'cnaes', label: 'Lista CNAEs' },
    { value: 'outro', label: 'Outro' },
];

const Minutas = () => {
    const [minutas, setMinutas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedMinuta, setSelectedMinuta] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    // Upload form state
    const [tipoAlteracao, setTipoAlteracao] = useState('');
    const [descricao, setDescricao] = useState('');
    const [file, setFile] = useState(null);
    const [docsSuporte, setDocsSuporte] = useState([]);
    const [docsChat, setDocsChat] = useState([]);
    const fileInputRef = useRef(null);
    const docInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => {
        fetchMinutas();
    }, []);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchMinutas = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/minutas`);
            setMinutas(response.data);
        } catch (error) {
            toast.error('Erro ao carregar minutas');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!validTypes.includes(selectedFile.type)) {
                toast.error('Formato inválido. Use PDF, JPG ou PNG.');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !tipoAlteracao) {
            toast.error('Selecione o tipo de alteração e o arquivo');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipo_alteracao', tipoAlteracao);
        formData.append('descricao', descricao);

        try {
            const response = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Documento enviado com sucesso!');
            setMinutas([response.data, ...minutas]);
            setFile(null);
            setTipoAlteracao('');
            setDescricao('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            // Open chat automatically
            openChat(response.data);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Erro ao enviar documento');
        } finally {
            setUploading(false);
        }
    };

    const openChat = async (minuta) => {
        setSelectedMinuta(minuta);
        setChatOpen(true);
        
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${minuta.id}`);
            const mensagens = response.data.mensagens || [];
            const formattedMessages = mensagens.flatMap(m => [
                { type: 'user', text: m.user },
                { type: 'ai', text: m.assistant }
            ]);
            setMessages(formattedMessages);
        } catch (error) {
            setMessages([]);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedMinuta) return;

        const userMsg = newMessage.trim();
        setNewMessage('');
        setMessages(prev => [...prev, { type: 'user', text: userMsg }]);
        setSendingMessage(true);

        try {
            const response = await axios.post(`${API_URL}/api/minutas/${selectedMinuta.id}/chat`, {
                message: userMsg,
                minuta_id: selectedMinuta.id
            });
            setMessages(prev => [...prev, { type: 'ai', text: response.data.response }]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = error.response?.status === 520 
                ? 'Serviço de IA temporariamente indisponível. Tente novamente em alguns instantes.'
                : 'Erro ao processar mensagem. Verifique sua conexão e tente novamente.';
            toast.error(errorMsg);
            setMessages(prev => [...prev, { 
                type: 'ai', 
                text: 'Desculpe, não foi possível processar sua mensagem no momento. Por favor, tente novamente.' 
            }]);
        } finally {
            setSendingMessage(false);
        }
    };

    const gerarMinuta = async () => {
        if (!selectedMinuta) return;
        
        setGenerating(true);
        try {
            const response = await axios.post(`${API_URL}/api/minutas/${selectedMinuta.id}/gerar`);
            toast.success('Minuta gerada com sucesso!');
            setPreviewContent(response.data.conteudo);
            setPreviewOpen(true);
            fetchMinutas();
        } catch (error) {
            toast.error('Erro ao gerar minuta');
        } finally {
            setGenerating(false);
        }
    };

    const deleteMinuta = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/minutas/${id}`);
            toast.success('Minuta removida');
            setMinutas(minutas.filter(m => m.id !== id));
            if (selectedMinuta?.id === id) {
                setChatOpen(false);
                setSelectedMinuta(null);
            }
        } catch (error) {
            toast.error('Erro ao remover minuta');
        }
    };

    const viewMinuta = async (minuta) => {
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${minuta.id}`);
            if (response.data.conteudo_gerado) {
                setPreviewContent(response.data.conteudo_gerado);
                setPreviewOpen(true);
            } else {
                openChat(minuta);
            }
        } catch (error) {
            toast.error('Erro ao carregar minuta');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pendente: 'badge-pending',
            em_analise: 'badge-warning',
            concluida: 'badge-success'
        };
        const labels = {
            pendente: 'Pendente',
            em_analise: 'Em Análise',
            concluida: 'Concluída'
        };
        return <span className={`badge ${styles[status] || 'badge-pending'}`}>{labels[status] || status}</span>;
    };

    return (
        <div className="p-8 fade-in" data-testid="minutas-page">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Minutas Contratuais</h1>
                <p className="text-zinc-500">
                    Crie minutas de alteração contratual com auxílio de inteligência artificial
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Form */}
                <div className="lg:col-span-1">
                    <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FileUp className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            Novo Documento
                        </h2>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                    Tipo de Alteração
                                </Label>
                                <Select value={tipoAlteracao} onValueChange={setTipoAlteracao}>
                                    <SelectTrigger 
                                        data-testid="tipo-alteracao-select"
                                        className="bg-zinc-950 border-zinc-800 focus:border-red-600"
                                    >
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                        {TIPOS_ALTERACAO.map(tipo => (
                                            <SelectItem 
                                                key={tipo.value} 
                                                value={tipo.value}
                                                className="focus:bg-zinc-800"
                                            >
                                                {tipo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                    Descrição (opcional)
                                </Label>
                                <Textarea
                                    data-testid="descricao-input"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Descreva brevemente a alteração..."
                                    className="bg-zinc-950 border-zinc-800 focus:border-red-600 min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wider">
                                    Contrato Social (PDF ou Imagem)
                                </Label>
                                <div 
                                    className={`drop-zone rounded p-6 text-center cursor-pointer ${file ? 'active' : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        data-testid="file-upload-input"
                                        onChange={handleFileChange}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                    />
                                    {file ? (
                                        <div className="flex items-center justify-center gap-2 text-red-500">
                                            <FileText className="w-5 h-5" strokeWidth={1.5} />
                                            <span className="text-sm truncate max-w-[180px]">{file.name}</span>
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500">
                                            <Upload className="w-8 h-8 mx-auto mb-2" strokeWidth={1.5} />
                                            <p className="text-sm">Arraste ou clique para enviar</p>
                                            <p className="text-xs mt-1">PDF, JPG ou PNG</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                data-testid="upload-submit-btn"
                                disabled={uploading || !file || !tipoAlteracao}
                                className="w-full bg-red-600 hover:bg-red-700 btn-business"
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Enviar Documento
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Minutas List */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                                Histórico de Minutas
                            </h2>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" />
                            </div>
                        ) : minutas.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" strokeWidth={1.5} />
                                <p>Nenhuma minuta cadastrada</p>
                                <p className="text-sm mt-1">Envie um documento para começar</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                {minutas.map((minuta) => (
                                    <div 
                                        key={minuta.id} 
                                        className="p-4 hover:bg-zinc-800/50 transition-colors"
                                        data-testid={`minuta-item-${minuta.id}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium">
                                                        {TIPOS_ALTERACAO.find(t => t.value === minuta.tipo_alteracao)?.label || minuta.tipo_alteracao}
                                                    </span>
                                                    {getStatusBadge(minuta.status)}
                                                </div>
                                                <p className="text-sm text-zinc-500 truncate">
                                                    {minuta.arquivo_original || 'Sem arquivo'}
                                                </p>
                                                <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" strokeWidth={1.5} />
                                                    {new Date(minuta.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    data-testid={`chat-btn-${minuta.id}`}
                                                    onClick={() => openChat(minuta)}
                                                    className="border-zinc-700 hover:border-red-600 hover:text-red-500"
                                                >
                                                    <MessageSquare className="w-4 h-4" strokeWidth={1.5} />
                                                </Button>
                                                {minuta.status === 'concluida' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        data-testid={`view-btn-${minuta.id}`}
                                                        onClick={() => viewMinuta(minuta)}
                                                        className="border-zinc-700 hover:border-emerald-600 hover:text-emerald-500"
                                                    >
                                                        <Download className="w-4 h-4" strokeWidth={1.5} />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    data-testid={`delete-btn-${minuta.id}`}
                                                    onClick={() => deleteMinuta(minuta.id)}
                                                    className="border-zinc-700 hover:border-red-600 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Dialog */}
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl h-[80vh] flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            Chat - {TIPOS_ALTERACAO.find(t => t.value === selectedMinuta?.tipo_alteracao)?.label}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
                        {messages.length === 0 && (
                            <div className="text-center text-zinc-500 py-8">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" strokeWidth={1.5} />
                                <p>Inicie a conversa descrevendo a alteração desejada.</p>
                                <p className="text-sm mt-2">A IA irá analisar o documento e auxiliar na criação da minuta.</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-4 ${
                                        msg.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'
                                    }`}
                                >
                                    <p className="text-sm text-white whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {sendingMessage && (
                            <div className="flex justify-start">
                                <div className="chat-bubble-ai p-4">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Analisando...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="border-t border-zinc-800 p-4 space-y-3">
                        <div className="flex gap-2">
                            <Input
                                data-testid="chat-input"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Descreva a alteração desejada..."
                                className="bg-zinc-950 border-zinc-800 focus:border-red-600"
                                disabled={sendingMessage}
                            />
                            <Button
                                data-testid="send-message-btn"
                                onClick={sendMessage}
                                disabled={sendingMessage || !newMessage.trim()}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <Send className="w-4 h-4" strokeWidth={1.5} />
                            </Button>
                        </div>
                        <Button
                            data-testid="gerar-minuta-btn"
                            onClick={gerarMinuta}
                            disabled={generating || messages.length < 2}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                        >
                            {generating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Gerando Minuta...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} />
                                    Gerar Minuta Final
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                            Minuta Gerada
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono bg-zinc-950 p-6 rounded border border-zinc-800">
                            {previewContent}
                        </pre>
                    </div>
                    <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewOpen(false)}
                            className="border-zinc-700"
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={() => {
                                navigator.clipboard.writeText(previewContent);
                                toast.success('Conteúdo copiado!');
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            Copiar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Minutas;
