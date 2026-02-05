import { useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { 
    FileText, Trash2, Eye, Building2, Hash, FileDown, FileType, RefreshCw, Copy, Edit, Send, CheckCircle, Undo2, AlertTriangle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClienteCard = ({ cliente, onView, onEdit, onDownloadWord, onDownloadPDF, onDelete, onEnviarGClick, selectedIds, onToggleSelect, isLixeira, onRestore }) => {
    const getStatus = (s) => {
        const cfg = { pendente: 'badge-pending', em_analise: 'badge-warning', concluida: 'badge-success' };
        const lbl = { pendente: 'Pendente', em_analise: 'Em Análise', concluida: 'Concluída' };
        return <span className={`badge ${cfg[s] || 'badge-pending'}`}>{lbl[s] || s}</span>;
    };

    const allSelected = cliente.processos.every(p => selectedIds.includes(p.id));
    const someSelected = cliente.processos.some(p => selectedIds.includes(p.id));

    const toggleAllCliente = () => {
        if (allSelected) {
            // Desmarcar todos
            cliente.processos.forEach(p => {
                if (selectedIds.includes(p.id)) {
                    onToggleSelect(p.id);
                }
            });
        } else {
            // Marcar todos
            cliente.processos.forEach(p => {
                if (!selectedIds.includes(p.id)) {
                    onToggleSelect(p.id);
                }
            });
        }
    };

    return (
        <div className="p-4" data-testid={`cliente-${cliente.key}`}>
            {/* Cabeçalho do Cliente */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Checkbox 
                        checked={allSelected}
                        className={someSelected && !allSelected ? 'data-[state=checked]:bg-zinc-600' : ''}
                        onCheckedChange={toggleAllCliente}
                    />
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
                        className={`flex items-center justify-between bg-zinc-950 border rounded p-3 transition-colors ${
                            selectedIds.includes(m.id) ? 'border-red-600 bg-red-950/20' : 'border-zinc-800 hover:border-zinc-700'
                        }`}
                        data-testid={`processo-${m.id}`}
                    >
                        <div className="flex items-center gap-4">
                            <Checkbox 
                                checked={selectedIds.includes(m.id)}
                                onCheckedChange={() => onToggleSelect(m.id)}
                            />
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
                            {isLixeira && m.deleted_at && (
                                <span className="text-xs text-red-400">
                                    Excluído em {new Date(m.deleted_at).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {isLixeira ? (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => onRestore(m.id)} className="border-green-700 hover:border-green-600 text-green-500 h-8" title="Restaurar">
                                        <Undo2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => onDelete(m.id)} className="border-red-700 hover:border-red-600 text-red-500 h-8" title="Excluir Permanentemente">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
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
                                    {/* Botão GClick - apenas para processos concluídos */}
                                    {m.status === 'concluida' && (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => onEnviarGClick(m.id)} 
                                            className={`border-zinc-700 h-8 ${m.gclick_enviado ? 'text-green-500 border-green-600' : 'hover:border-green-600 hover:text-green-500'}`}
                                            title={m.gclick_enviado ? 'Enviado para GClick' : 'Enviar para GClick'}
                                        >
                                            {m.gclick_enviado ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => onView(m)} className="border-zinc-700 h-8" title="Visualizar">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => onEdit(m)} className="border-zinc-700 hover:border-blue-600 h-8" title="Editar">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => onDelete(m.id)} className="border-zinc-700 hover:border-red-600 h-8" title="Mover para Lixeira">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ListaProcessos = ({ minutas, loading, tipoProcesso, onRefresh, onEdit, emptyMessage, emptyDescription, isLixeira = false }) => {
    const [viewOpen, setViewOpen] = useState(false);
    const [viewContent, setViewContent] = useState('');
    const [viewProcessoId, setViewProcessoId] = useState(null);
    const [enviandoGClick, setEnviandoGClick] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    // Agrupar processos por cliente
    const processosAgrupados = useMemo(() => {
        const grupos = {};
        for (let i = 0; i < minutas.length; i++) {
            const m = minutas[i];
            const key = m.cnpj || m.razao_social || m.nome_empresa || 'sem-identificacao';
            if (!grupos[key]) {
                grupos[key] = {
                    cnpj: m.cnpj,
                    razao_social: m.razao_social || m.nome_empresa,
                    nome_empresa: m.nome_empresa,
                    processos: []
                };
            }
            grupos[key].processos.push(m);
        }
        return Object.keys(grupos).map(k => ({ key: k, ...grupos[k] }));
    }, [minutas]);

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === minutas.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(minutas.map(m => m.id));
        }
    };

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
        const msg = isLixeira 
            ? 'Tem certeza que deseja EXCLUIR PERMANENTEMENTE este processo? Esta ação NÃO pode ser desfeita.'
            : 'Deseja mover este processo para a lixeira?';
        
        if (!window.confirm(msg)) {
            return;
        }
        try {
            if (isLixeira) {
                await axios.delete(`${API_URL}/api/lixeira/${id}/permanente`);
                toast.success('Processo excluído permanentemente');
            } else {
                await axios.delete(`${API_URL}/api/minutas/${id}`);
                toast.success('Processo movido para a lixeira');
            }
            setSelectedIds(prev => prev.filter(x => x !== id));
            onRefresh();
        } catch (e) {
            console.error('Erro ao deletar:', e);
            toast.error('Erro ao remover processo');
        }
    };

    const restaurarProcesso = async (id) => {
        try {
            await axios.post(`${API_URL}/api/lixeira/${id}/restaurar`);
            toast.success('Processo restaurado com sucesso!');
            setSelectedIds(prev => prev.filter(x => x !== id));
            onRefresh();
        } catch (e) {
            console.error('Erro ao restaurar:', e);
            toast.error('Erro ao restaurar processo');
        }
    };

    // Ações em lote
    const deletarSelecionados = async () => {
        if (selectedIds.length === 0) {
            toast.warning('Selecione pelo menos um processo');
            return;
        }
        
        const msg = isLixeira 
            ? `Tem certeza que deseja EXCLUIR PERMANENTEMENTE ${selectedIds.length} processo(s)? Esta ação NÃO pode ser desfeita.`
            : `Deseja mover ${selectedIds.length} processo(s) para a lixeira?`;
        
        if (!window.confirm(msg)) {
            return;
        }
        
        try {
            if (isLixeira) {
                await axios.post(`${API_URL}/api/lixeira/deletar-permanente-multiplos`, { ids: selectedIds });
                toast.success(`${selectedIds.length} processo(s) excluído(s) permanentemente`);
            } else {
                await axios.post(`${API_URL}/api/minutas/deletar-multiplos`, { ids: selectedIds });
                toast.success(`${selectedIds.length} processo(s) movido(s) para a lixeira`);
            }
            setSelectedIds([]);
            onRefresh();
        } catch (e) {
            console.error('Erro ao deletar múltiplos:', e);
            toast.error('Erro ao remover processos');
        }
    };

    const restaurarSelecionados = async () => {
        if (selectedIds.length === 0) {
            toast.warning('Selecione pelo menos um processo');
            return;
        }
        
        try {
            await axios.post(`${API_URL}/api/lixeira/restaurar-multiplos`, { ids: selectedIds });
            toast.success(`${selectedIds.length} processo(s) restaurado(s)`);
            setSelectedIds([]);
            onRefresh();
        } catch (e) {
            console.error('Erro ao restaurar múltiplos:', e);
            toast.error('Erro ao restaurar processos');
        }
    };

    const enviarParaGClick = async (processoId) => {
        if (!window.confirm('Deseja enviar os dados desta empresa para o GClick?')) {
            return;
        }
        
        setEnviandoGClick(processoId);
        try {
            const response = await axios.post(`${API_URL}/api/gclick/enviar-empresa`, {
                minuta_id: processoId
            });
            
            if (response.data.success) {
                toast.success('Empresa enviada com sucesso para o GClick!');
                onRefresh();
            } else {
                toast.error(response.data.message || 'Erro ao enviar para GClick');
            }
        } catch (e) {
            console.error('Erro ao enviar para GClick:', e);
            const errorMsg = e.response?.data?.detail || 'Erro ao enviar para GClick';
            toast.error(errorMsg);
        } finally {
            setEnviandoGClick(null);
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

    const getTitulo = () => {
        if (isLixeira) return 'Lixeira';
        if (tipoProcesso === 'constituicao') return 'Constituições de Empresas';
        if (tipoProcesso === 'alteracao') return 'Alterações Contratuais';
        if (tipoProcesso === 'baixa') return 'Baixas de Empresas';
        return 'Processos';
    };

    return (
        <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            {isLixeira ? (
                                <Trash2 className="w-5 h-5 text-red-500" />
                            ) : (
                                <FileText className="w-5 h-5 text-red-500" />
                            )}
                            {getTitulo()}
                            {minutas.length > 0 && (
                                <span className="text-sm font-normal text-zinc-500">
                                    ({minutas.length})
                                </span>
                            )}
                        </h2>
                        
                        {/* Barra de ações em lote */}
                        {minutas.length > 0 && (
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={selectAll}
                                    className="border-zinc-700 h-8"
                                >
                                    {selectedIds.length === minutas.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                </Button>
                                
                                {selectedIds.length > 0 && (
                                    <>
                                        <span className="text-sm text-zinc-400">
                                            {selectedIds.length} selecionado(s)
                                        </span>
                                        
                                        {isLixeira && (
                                            <Button 
                                                size="sm" 
                                                onClick={restaurarSelecionados}
                                                className="bg-green-600 hover:bg-green-700 h-8"
                                            >
                                                <Undo2 className="w-4 h-4 mr-1" />
                                                Restaurar
                                            </Button>
                                        )}
                                        
                                        <Button 
                                            size="sm" 
                                            onClick={deletarSelecionados}
                                            className="bg-red-600 hover:bg-red-700 h-8"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            {isLixeira ? 'Excluir Permanente' : 'Mover para Lixeira'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {isLixeira && minutas.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Os itens na lixeira podem ser restaurados ou excluídos permanentemente.
                        </p>
                    )}
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" />
                    </div>
                ) : minutas.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        {isLixeira ? (
                            <>
                                <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="font-medium">Lixeira vazia</p>
                                <p className="text-sm mt-1">Nenhum processo na lixeira</p>
                            </>
                        ) : (
                            <>
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="font-medium">{emptyMessage}</p>
                                <p className="text-sm mt-1">{emptyDescription}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {processosAgrupados.map(cliente => (
                            <ClienteCard 
                                key={cliente.key}
                                cliente={cliente}
                                onView={viewProcesso}
                                onEdit={onEdit}
                                onDownloadWord={downloadWord}
                                onDownloadPDF={downloadPDF}
                                onDelete={deleteProcesso}
                                onEnviarGClick={enviarParaGClick}
                                selectedIds={selectedIds}
                                onToggleSelect={toggleSelect}
                                isLixeira={isLixeira}
                                onRestore={restaurarProcesso}
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
