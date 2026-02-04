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
    RefreshCw, Plus, X, FileImage, File
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
    { value: 'alteracao_endereco', label: 'Alteração de Endereço', docs: ['Comprovante de endereço do novo local'] },
    { value: 'alteracao_atividade', label: 'Alteração de Atividade', docs: ['Lista de CNAEs desejados'] },
    { value: 'alteracao_capital', label: 'Alteração de Capital Social', docs: [] },
    { value: 'alteracao_nome', label: 'Alteração de Razão Social', docs: [] },
    { value: 'alteracao_administracao', label: 'Alteração de Administração', docs: ['CNH/RG do novo administrador'] },
    { value: 'consolidacao', label: 'Consolidação', docs: [] },
    { value: 'outro', label: 'Outro', docs: [] },
];

const TIPOS_DOCUMENTO = [
    { value: 'cnh', label: 'CNH' },
    { value: 'rg', label: 'RG' },
    { value: 'comprovante_endereco', label: 'Comprovante de Endereço' },
    { value: 'lista_cnaes', label: 'Lista de CNAEs' },
    { value: 'outro', label: 'Outro Documento' },
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
    const [docsChat, setDocsChat] = useState([]);

    const [tipoAlteracao, setTipoAlteracao] = useState('');
    const [descricao, setDescricao] = useState('');
    const [file, setFile] = useState(null);
    const [docsSuporte, setDocsSuporte] = useState([]);
    const fileInputRef = useRef(null);
    const docInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => { fetchMinutas(); }, []);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchMinutas = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/minutas`);
            setMinutas(res.data);
        } catch (e) { toast.error('Erro ao carregar minutas'); }
        finally { setLoading(false); }
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f && ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) setFile(f);
        else if (f) toast.error('Formato inválido');
    };

    const handleDocChange = (e) => {
        const f = e.target.files?.[0];
        if (f && ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
            setDocsSuporte(prev => [...prev, { file: f, tipo: 'outro', id: Date.now() }]);
        } else if (f) toast.error('Formato inválido');
        if (docInputRef.current) docInputRef.current.value = '';
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!tipoAlteracao) { toast.error('Selecione o tipo'); return; }
        if (!file && !descricao && docsSuporte.length === 0) { toast.error('Forneça dados'); return; }

        setUploading(true);
        try {
            const formData = new FormData();
            if (file) formData.append('file', file);
            formData.append('tipo_alteracao', tipoAlteracao);
            formData.append('descricao', descricao);

            const res = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const minuta = res.data;

            for (const doc of docsSuporte) {
                const df = new FormData();
                df.append('file', doc.file);
                df.append('tipo_documento', doc.tipo);
                await axios.post(`${API_URL}/api/minutas/${minuta.id}/documentos`, df, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            toast.success('Minuta criada!');
            setMinutas([minuta, ...minutas]);
            setFile(null); setTipoAlteracao(''); setDescricao(''); setDocsSuporte([]);
            openChat(minuta);
        } catch (e) { toast.error(e.response?.data?.detail || 'Erro'); }
        finally { setUploading(false); }
    };

    const openChat = async (minuta) => {
        setSelectedMinuta(minuta);
        setChatOpen(true);
        try {
            const [mRes, dRes] = await Promise.all([
                axios.get(`${API_URL}/api/minutas/${minuta.id}`),
                axios.get(`${API_URL}/api/minutas/${minuta.id}/documentos`)
            ]);
            const msgs = mRes.data.mensagens || [];
            setMessages(msgs.flatMap(m => [{ type: 'user', text: m.user }, { type: 'ai', text: m.assistant }]));
            setDocsChat(dRes.data.documentos || []);
        } catch (e) { setMessages([]); setDocsChat([]); }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedMinuta) return;
        const msg = newMessage.trim();
        setNewMessage('');
        setMessages(prev => [...prev, { type: 'user', text: msg }]);
        setSendingMessage(true);
        try {
            const res = await axios.post(`${API_URL}/api/minutas/${selectedMinuta.id}/chat`, {
                message: msg, minuta_id: selectedMinuta.id
            });
            setMessages(prev => [...prev, { type: 'ai', text: res.data.response }]);
        } catch (e) {
            toast.error('Erro ao processar');
            setMessages(prev => [...prev, { type: 'ai', text: 'Erro ao processar. Tente novamente.' }]);
        } finally { setSendingMessage(false); }
    };

    const gerarMinuta = async () => {
        if (!selectedMinuta) return;
        setGenerating(true);
        try {
            const res = await axios.post(`${API_URL}/api/minutas/${selectedMinuta.id}/gerar`);
            toast.success('Minuta gerada!');
            setPreviewContent(res.data.conteudo);
            setPreviewOpen(true);
            fetchMinutas();
        } catch (e) { toast.error('Erro ao gerar'); }
        finally { setGenerating(false); }
    };

    const deleteMinuta = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/minutas/${id}`);
            toast.success('Removida');
            setMinutas(minutas.filter(m => m.id !== id));
            if (selectedMinuta?.id === id) { setChatOpen(false); setSelectedMinuta(null); }
        } catch (e) { toast.error('Erro ao remover'); }
    };

    const uploadDocChat = async (e) => {
        const f = e.target.files?.[0];
        if (!f || !selectedMinuta) return;
        if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) { toast.error('Formato inválido'); return; }
        try {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('tipo_documento', 'outro');
            const res = await axios.post(`${API_URL}/api/minutas/${selectedMinuta.id}/documentos`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDocsChat(prev => [...prev, res.data.documento]);
            toast.success('Documento adicionado!');
        } catch (e) { toast.error('Erro'); }
    };

    const removeDocChat = async (docId) => {
        if (!selectedMinuta) return;
        try {
            await axios.delete(`${API_URL}/api/minutas/${selectedMinuta.id}/documentos/${docId}`);
            setDocsChat(prev => prev.filter(d => d.id !== docId));
            toast.success('Removido');
        } catch (e) { toast.error('Erro'); }
    };

    const tipoSel = TIPOS_ALTERACAO.find(t => t.value === tipoAlteracao);
    const getStatus = (s) => {
        const cfg = { pendente: 'badge-pending', em_analise: 'badge-warning', concluida: 'badge-success' };
        const lbl = { pendente: 'Pendente', em_analise: 'Em Análise', concluida: 'Concluída' };
        return <span className={`badge ${cfg[s] || 'badge-pending'}`}>{lbl[s] || s}</span>;
    };

    return (
        <div className="p-8 fade-in" data-testid="minutas-page">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Minutas Contratuais</h1>
                <p className="text-zinc-500">Crie minutas com auxílio de IA - envie documentos ou descreva a alteração</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FileUp className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                            Nova Minuta
                        </h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase">Tipo de Alteração *</Label>
                                <Select value={tipoAlteracao} onValueChange={setTipoAlteracao}>
                                    <SelectTrigger data-testid="tipo-alteracao-select" className="bg-zinc-950 border-zinc-800">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                        {TIPOS_ALTERACAO.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {tipoSel?.docs?.length > 0 && (
                                <div className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs">
                                    <p className="text-zinc-500 uppercase mb-1">Documentos sugeridos:</p>
                                    {tipoSel.docs.map((d, i) => (
                                        <p key={i} className="text-zinc-400">• {d}</p>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase">Descrição</Label>
                                <Textarea
                                    data-testid="descricao-input"
                                    value={descricao}
                                    onChange={(e) => setDescricao(e.target.value)}
                                    placeholder="Ex: Adicionar sócio João Silva com 30%..."
                                    className="bg-zinc-950 border-zinc-800 min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase">Contrato Social (opcional)</Label>
                                <div className={`drop-zone rounded p-4 text-center cursor-pointer ${file ? 'active' : ''}`}
                                    onClick={() => fileInputRef.current?.click()}>
                                    <input ref={fileInputRef} type="file" data-testid="file-upload-input"
                                        onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                                    {file ? (
                                        <div className="flex items-center justify-center gap-2 text-red-500">
                                            <FileText className="w-5 h-5" />
                                            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500">
                                            <Upload className="w-6 h-6 mx-auto mb-1" />
                                            <p className="text-xs">PDF ou Imagem</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-400 text-xs uppercase">Documentos de Suporte</Label>
                                    <button type="button" onClick={() => docInputRef.current?.click()}
                                        className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Adicionar
                                    </button>
                                </div>
                                <input ref={docInputRef} type="file" data-testid="doc-upload-input"
                                    onChange={handleDocChange} accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                                
                                {docsSuporte.length === 0 ? (
                                    <div className="border border-dashed border-zinc-800 rounded p-3 text-center cursor-pointer hover:border-red-600/50"
                                        onClick={() => docInputRef.current?.click()}>
                                        <FileImage className="w-5 h-5 mx-auto mb-1 text-zinc-600" />
                                        <p className="text-xs text-zinc-600">CNH, Comprovante, CNAEs</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {docsSuporte.map(doc => (
                                            <div key={doc.id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded p-2">
                                                <File className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                <span className="text-xs text-zinc-300 truncate flex-1">{doc.file.name}</span>
                                                <Select value={doc.tipo} onValueChange={(v) => 
                                                    setDocsSuporte(prev => prev.map(d => d.id === doc.id ? {...d, tipo: v} : d))}>
                                                    <SelectTrigger className="w-28 h-6 text-xs bg-zinc-900 border-zinc-700">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-800">
                                                        {TIPOS_DOCUMENTO.map(t => (
                                                            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <button type="button" onClick={() => setDocsSuporte(prev => prev.filter(d => d.id !== doc.id))}
                                                    className="text-zinc-500 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button type="submit" data-testid="upload-submit-btn" disabled={uploading || !tipoAlteracao}
                                className="w-full bg-red-600 hover:bg-red-700 btn-business">
                                {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Criando...</> 
                                    : <><Upload className="w-4 h-4 mr-2" />Criar Minuta</>}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded">
                        <div className="p-6 border-b border-zinc-800">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-500" />Histórico
                            </h2>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" /></div>
                        ) : minutas.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhuma minuta</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                {minutas.map(m => (
                                    <div key={m.id} className="p-4 hover:bg-zinc-800/50" data-testid={`minuta-item-${m.id}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium">
                                                        {TIPOS_ALTERACAO.find(t => t.value === m.tipo_alteracao)?.label || m.tipo_alteracao}
                                                    </span>
                                                    {getStatus(m.status)}
                                                </div>
                                                {m.descricao && <p className="text-sm text-zinc-400 truncate">{m.descricao}</p>}
                                                <p className="text-xs text-zinc-600 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" data-testid={`chat-btn-${m.id}`}
                                                    onClick={() => openChat(m)} className="border-zinc-700 hover:border-red-600">
                                                    <MessageSquare className="w-4 h-4" />
                                                </Button>
                                                {m.status === 'concluida' && (
                                                    <Button size="sm" variant="outline" onClick={async () => {
                                                        const res = await axios.get(`${API_URL}/api/minutas/${m.id}`);
                                                        if (res.data.conteudo_gerado) { setPreviewContent(res.data.conteudo_gerado); setPreviewOpen(true); }
                                                    }} className="border-zinc-700 hover:border-emerald-600">
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" data-testid={`delete-btn-${m.id}`}
                                                    onClick={() => deleteMinuta(m.id)} className="border-zinc-700 hover:border-red-600">
                                                    <Trash2 className="w-4 h-4" />
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
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-red-500" />
                            Chat - {TIPOS_ALTERACAO.find(t => t.value === selectedMinuta?.tipo_alteracao)?.label}
                        </DialogTitle>
                    </DialogHeader>

                    {docsChat.length > 0 && (
                        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950">
                            <p className="text-xs text-zinc-500 uppercase mb-1">Documentos:</p>
                            <div className="flex flex-wrap gap-2">
                                {docsChat.map(d => (
                                    <div key={d.id} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-300">
                                        <File className="w-3 h-3 text-red-500" />
                                        <span className="truncate max-w-[80px]">{d.nome}</span>
                                        <button onClick={() => removeDocChat(d.id)} className="text-zinc-500 hover:text-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
                        {messages.length === 0 && (
                            <div className="text-center text-zinc-500 py-8">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Descreva a alteração ou peça para extrair dados dos documentos</p>
                                <p className="text-sm mt-2">A IA vai analisar os documentos e criar a minuta</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 ${msg.type === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
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
                            <input type="file" id="chat-doc" accept=".pdf,.jpg,.jpeg,.png" onChange={uploadDocChat} className="hidden" />
                            <Button type="button" variant="outline" size="icon" title="Anexar documento"
                                onClick={() => document.getElementById('chat-doc').click()} className="border-zinc-700">
                                <Plus className="w-4 h-4" />
                            </Button>
                            <Input data-testid="chat-input" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Descreva ou peça para extrair dados..." className="bg-zinc-950 border-zinc-800"
                                disabled={sendingMessage} />
                            <Button data-testid="send-message-btn" onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}
                                className="bg-red-600 hover:bg-red-700">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button data-testid="gerar-minuta-btn" onClick={gerarMinuta} disabled={generating || messages.length < 2}
                            className="w-full bg-zinc-800 hover:bg-zinc-700">
                            {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                                : <><FileText className="w-4 h-4 mr-2" />Gerar Minuta Final</>}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Preview */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />Minuta Gerada
                        </DialogTitle>
                    </DialogHeader>
                    <pre className="p-4 whitespace-pre-wrap text-sm text-zinc-300 font-mono bg-zinc-950 rounded border border-zinc-800 m-4">
                        {previewContent}
                    </pre>
                    <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)} className="border-zinc-700">Fechar</Button>
                        <Button onClick={() => { navigator.clipboard.writeText(previewContent); toast.success('Copiado!'); }}
                            className="bg-red-600 hover:bg-red-700">
                            <Download className="w-4 h-4 mr-2" />Copiar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Minutas;
