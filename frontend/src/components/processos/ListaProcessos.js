import { useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { 
    FileText, Trash2, Eye, Building2, Hash, FileDown, FileType, RefreshCw, Copy, Edit
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClienteCard = ({ cliente, onView, onEdit, onDownloadWord, onDownloadPDF, onDelete }) => {
    const getStatus = (s) => {
        const cfg = { pendente: 'badge-pending', em_analise: 'badge-warning', concluida: 'badge-success' };
        const lbl = { pendente: 'Pendente', em_analise: 'Em Análise', concluida: 'Concluída' };
        return <span className={`badge ${cfg[s] || 'badge-pending'}`}>{lbl[s] || s}</span>;
    };

    return (
        <div className="p-4" data-testid={`cliente-${cliente.key}`}>
            {/* Cabeçalho do Cliente */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-red-500" />
                    <div>
                        <p className="font-medium text-white">
                            {cliente.razao_social || cliente.nome_empresa || 'Empresa não identificada'}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">
                            {cliente.cnpj || 'CNPJ não informado'}
                        </p>
                    </div>
                </div>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                    {cliente.processos.length} processo{cliente.processos.length === 1 ? '' : 's'}
                </span>
            </div>
            
            {/* Lista de Processos do Cliente */}
            <div className="ml-8 space-y-2">
                {cliente.processos.map(m => (
                    <div 
                        key={m.id} 
                        className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-3 hover:border-zinc-700 transition-colors"
                        data-testid={`processo-${m.id}`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-red-500 font-mono font-medium text-sm">
                                <Hash className="w-3 h-3" />
                                {m.numero_alteracao || '-'}
                            </span>
                            <span className="text-zinc-300">
                                {m.tipo_processo === 'constituicao' ? 'Constituição' : 
                                 m.tipo_processo === 'baixa' ? 'Baixa' : 
                                 m.tipo_alteracao || 'Alteração'}
                            </span>
                            {getStatus(m.status)}
                            <span className="text-xs text-zinc-500">
                                {new Date(m.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {m.conteudo_gerado && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => onDownloadWord(m.id)} className="border-zinc-700 h-8" title="Baixar Word">
                                        <FileType className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => onDownloadPDF(m.id)} className="border-zinc-700 h-8" title="Baixar PDF">
                                        <FileDown className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => onView(m)} className="border-zinc-700 h-8" title="Visualizar">
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onEdit(m)} className="border-zinc-700 hover:border-blue-600 h-8" title="Editar">
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onDelete(m.id)} className="border-zinc-700 hover:border-red-600 h-8" title="Excluir">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ListaProcessos = ({ minutas, loading, tipoProcesso, onRefresh, emptyMessage, emptyDescription }) => {
    const [viewOpen, setViewOpen] = useState(false);
    const [viewContent, setViewContent] = useState('');
    const [viewProcessoId, setViewProcessoId] = useState(null);

    // Agrupar processos por cliente
    const processosAgrupados = useMemo(() => {
        const grupos = {};
        for (let i = 0; i < minutas.length; i++) {
            const m = minutas[i];
            const key = m.cnpj || m.razao_social || 'sem-identificacao';
            if (!grupos[key]) {
                grupos[key] = {
                    cnpj: m.cnpj,
                    razao_social: m.razao_social,
                    processos: []
                };
            }
            grupos[key].processos.push(m);
        }
        return Object.keys(grupos).map(k => ({ key: k, ...grupos[k] }));
    }, [minutas]);

    const downloadWord = async (processoId) => {
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${processoId}/download/word`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `processo_${processoId}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Word baixado!');
        } catch (e) {
            toast.error('Erro ao baixar Word');
        }
    };
    
    const downloadPDF = async (processoId) => {
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${processoId}/download/pdf`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `processo_${processoId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('PDF baixado!');
        } catch (e) {
            toast.error('Erro ao baixar PDF');
        }
    };

    const deleteProcesso = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/minutas/${id}`);
            toast.success('Processo removido');
            onRefresh();
        } catch (e) {
            toast.error('Erro ao remover');
        }
    };

    const viewProcesso = async (processo) => {
        try {
            const res = await axios.get(`${API_URL}/api/minutas/${processo.id}`);
            if (res.data.conteudo_gerado) {
                setViewContent(res.data.conteudo_gerado);
            } else {
                const msgs = res.data.mensagens || [];
                const lastAi = msgs.filter(m => m.assistant).pop();
                setViewContent(lastAi?.assistant || 'Sem conteúdo');
            }
            setViewProcessoId(processo.id);
            setViewOpen(true);
        } catch (e) {
            toast.error('Erro ao carregar');
        }
    };

    return (
        <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-500" />
                        {tipoProcesso === 'constituicao' ? 'Constituições de Empresas' : 
                         tipoProcesso === 'alteracao' ? 'Alterações Contratuais' : 
                         tipoProcesso === 'baixa' ? 'Baixas de Empresas' : 'Processos'}
                    </h2>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" />
                    </div>
                ) : minutas.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">{emptyMessage}</p>
                        <p className="text-sm mt-1">{emptyDescription}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {processosAgrupados.map(cliente => (
                            <ClienteCard 
                                key={cliente.key}
                                cliente={cliente}
                                onView={viewProcesso}
                                onDownloadWord={downloadWord}
                                onDownloadPDF={downloadPDF}
                                onDelete={deleteProcesso}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-500" />
                                Visualizar Documento
                            </DialogTitle>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    onClick={() => downloadWord(viewProcessoId)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <FileType className="w-4 h-4 mr-2" /> Word
                                </Button>
                                <Button 
                                    size="sm" 
                                    onClick={() => downloadPDF(viewProcessoId)}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <FileDown className="w-4 h-4 mr-2" /> PDF
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => { navigator.clipboard.writeText(viewContent); toast.success('Copiado!'); }}
                                    className="border-zinc-700"
                                >
                                    <Copy className="w-4 h-4 mr-2" /> Copiar
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="bg-white text-black rounded-lg p-6">
                            <pre className="whitespace-pre-wrap text-sm font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>
                                {viewContent}
                            </pre>
                        </div>
                    </div>
                    <div className="flex justify-end p-4 border-t border-zinc-800">
                        <Button variant="outline" onClick={() => setViewOpen(false)} className="border-zinc-700">
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ListaProcessos;
