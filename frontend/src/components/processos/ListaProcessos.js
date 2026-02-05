import { useState, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { 
    FileText, Trash2, Eye, Building2, FileDown, FileType, RefreshCw, Copy, Edit, Send, CheckCircle, Undo2, AlertTriangle, Calendar, MoreHorizontal
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '../ui/dropdown-menu';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatusBadge = ({ status }) => {
    const config = {
        pendente: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Pendente' },
        em_analise: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Em Análise' },
        concluida: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Concluída' }
    };
    const c = config[status] || config.pendente;
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${c.bg} ${c.text} border ${c.border}`}>
            {c.label}
        </span>
    );
};

const TipoBadge = ({ tipo }) => {
    const config = {
        constituicao: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Constituição' },
        alteracao: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Alteração' },
        baixa: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Baixa' }
    };
    const c = config[tipo] || config.alteracao;
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    );
};

const ProcessoRow = ({ processo, isSelected, onToggleSelect, onView, onEdit, onDownloadWord, onDownloadPDF, onDelete, onEnviarGClick, isLixeira, onRestore }) => {
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    return (
        <tr 
            className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${isSelected ? 'bg-red-950/20' : ''}`}
            data-testid={`processo-${processo.id}`}
        >
            {/* Checkbox */}
            <td className="px-3 py-3 w-10">
                <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(processo.id)}
                    className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
            </td>
            
            {/* Número */}
            <td className="px-3 py-3 w-16">
                <span className="text-red-500 font-mono font-bold text-sm">
                    #{processo.numero_alteracao || '-'}
                </span>
            </td>
            
            {/* Tipo */}
            <td className="px-3 py-3 w-28">
                <TipoBadge tipo={processo.tipo_processo || processo.tipo_alteracao} />
            </td>
            
            {/* Empresa */}
            <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate max-w-[300px]">
                            {processo.razao_social || 'Empresa não identificada'}
                        </p>
                        <p className="text-zinc-500 text-xs font-mono">
                            {processo.cnpj || 'CNPJ não informado'}
                        </p>
                    </div>
                </div>
            </td>
            
            {/* Data */}
            <td className="px-3 py-3 w-24">
                <div className="flex items-center gap-1 text-zinc-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    {formatDate(processo.created_at)}
                </div>
                {isLixeira && processo.deleted_at && (
                    <div className="text-red-400 text-xs mt-0.5">
                        Excl: {formatDate(processo.deleted_at)}
                    </div>
                )}
            </td>
            
            {/* Status */}
            <td className="px-3 py-3 w-28">
                <StatusBadge status={processo.status} />
            </td>
            
            {/* Ações */}
            <td className="px-3 py-3 w-32 text-right">
                {isLixeira ? (
                    <div className="flex items-center justify-end gap-1">
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onRestore(processo.id)} 
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            title="Restaurar"
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onDelete(processo.id)} 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Excluir Permanentemente"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-1">
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onView(processo)} 
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                            title="Visualizar"
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => onEdit(processo)} 
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10"
                            title="Editar"
                        >
                            <Edit className="w-4 h-4" />
                        </Button>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
                                {processo.conteudo_gerado && (
                                    <>
                                        <DropdownMenuItem onClick={() => onDownloadWord(processo.id)} className="text-zinc-300 hover:text-white cursor-pointer">
                                            <FileType className="w-4 h-4 mr-2" />
                                            Baixar Word
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDownloadPDF(processo.id)} className="text-zinc-300 hover:text-white cursor-pointer">
                                            <FileDown className="w-4 h-4 mr-2" />
                                            Baixar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-zinc-700" />
                                    </>
                                )}
                                {processo.status === 'concluida' && (
                                    <>
                                        <DropdownMenuItem 
                                            onClick={() => onEnviarGClick(processo.id)} 
                                            className={`cursor-pointer ${processo.gclick_enviado ? 'text-green-400' : 'text-zinc-300 hover:text-white'}`}
                                        >
                                            {processo.gclick_enviado ? <CheckCircle className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                            {processo.gclick_enviado ? 'Enviado ao GClick' : 'Enviar ao GClick'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-zinc-700" />
                                    </>
                                )}
                                <DropdownMenuItem onClick={() => onDelete(processo.id)} className="text-red-400 hover:text-red-300 cursor-pointer">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Mover para Lixeira
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </td>
        </tr>
    );
};

const ListaProcessos = ({ minutas, loading, tipoProcesso, onRefresh, onEdit, emptyMessage, emptyDescription, isLixeira = false }) => {
    const [viewOpen, setViewOpen] = useState(false);
    const [viewContent, setViewContent] = useState('');
    const [viewProcessoId, setViewProcessoId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

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
        
        if (!window.confirm(msg)) return;
        
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
            toast.error('Erro ao remover processo');
        }
    };

    const restaurarProcesso = async (id) => {
        try {
            await axios.post(`${API_URL}/api/lixeira/${id}/restaurar`);
            toast.success('Processo restaurado!');
            setSelectedIds(prev => prev.filter(x => x !== id));
            onRefresh();
        } catch (e) {
            toast.error('Erro ao restaurar processo');
        }
    };

    const deletarSelecionados = async () => {
        if (selectedIds.length === 0) {
            toast.warning('Selecione pelo menos um processo');
            return;
        }
        
        const msg = isLixeira 
            ? `Excluir PERMANENTEMENTE ${selectedIds.length} processo(s)?`
            : `Mover ${selectedIds.length} processo(s) para a lixeira?`;
        
        if (!window.confirm(msg)) return;
        
        try {
            if (isLixeira) {
                await axios.post(`${API_URL}/api/lixeira/deletar-permanente-multiplos`, { ids: selectedIds });
                toast.success(`${selectedIds.length} processo(s) excluído(s)`);
            } else {
                await axios.post(`${API_URL}/api/minutas/deletar-multiplos`, { ids: selectedIds });
                toast.success(`${selectedIds.length} processo(s) na lixeira`);
            }
            setSelectedIds([]);
            onRefresh();
        } catch (e) {
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
            toast.error('Erro ao restaurar processos');
        }
    };

    const enviarParaGClick = async (processoId) => {
        if (!window.confirm('Enviar dados para o GClick?')) return;
        
        try {
            const response = await axios.post(`${API_URL}/api/gclick/enviar-empresa`, { minuta_id: processoId });
            if (response.data.success) {
                toast.success('Enviado para o GClick!');
                onRefresh();
            } else {
                toast.error(response.data.message || 'Erro ao enviar');
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Erro ao enviar para GClick');
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
        if (tipoProcesso === 'constituicao') return 'Constituições';
        if (tipoProcesso === 'alteracao') return 'Alterações';
        if (tipoProcesso === 'baixa') return 'Baixas';
        return 'Processos';
    };

    return (
        <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isLixeira ? (
                            <Trash2 className="w-5 h-5 text-red-500" />
                        ) : (
                            <FileText className="w-5 h-5 text-red-500" />
                        )}
                        <h2 className="text-base font-semibold text-white">
                            {getTitulo()}
                        </h2>
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                            {minutas.length}
                        </span>
                    </div>
                    
                    {minutas.length > 0 && (
                        <div className="flex items-center gap-2">
                            {selectedIds.length > 0 && (
                                <>
                                    <span className="text-xs text-zinc-400 mr-2">
                                        {selectedIds.length} selecionado(s)
                                    </span>
                                    {isLixeira && (
                                        <Button 
                                            size="sm" 
                                            onClick={restaurarSelecionados}
                                            className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                                        >
                                            <Undo2 className="w-3 h-3 mr-1" />
                                            Restaurar
                                        </Button>
                                    )}
                                    <Button 
                                        size="sm" 
                                        onClick={deletarSelecionados}
                                        className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        {isLixeira ? 'Excluir' : 'Lixeira'}
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin mx-auto" />
                    </div>
                ) : minutas.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                        {isLixeira ? (
                            <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        ) : (
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        )}
                        <p className="text-sm">{emptyMessage || 'Nenhum processo'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-800/50 text-xs text-zinc-400 uppercase tracking-wider">
                                    <th className="px-3 py-2 text-left w-10">
                                        <Checkbox 
                                            checked={selectedIds.length === minutas.length && minutas.length > 0}
                                            onCheckedChange={selectAll}
                                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                        />
                                    </th>
                                    <th className="px-3 py-2 text-left w-16">Nº</th>
                                    <th className="px-3 py-2 text-left w-28">Tipo</th>
                                    <th className="px-3 py-2 text-left">Empresa</th>
                                    <th className="px-3 py-2 text-left w-24">Data</th>
                                    <th className="px-3 py-2 text-left w-28">Status</th>
                                    <th className="px-3 py-2 text-right w-32">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {minutas.map(processo => (
                                    <ProcessoRow 
                                        key={processo.id}
                                        processo={processo}
                                        isSelected={selectedIds.includes(processo.id)}
                                        onToggleSelect={toggleSelect}
                                        onView={viewProcesso}
                                        onEdit={onEdit}
                                        onDownloadWord={downloadWord}
                                        onDownloadPDF={downloadPDF}
                                        onDelete={deleteProcesso}
                                        onEnviarGClick={enviarParaGClick}
                                        isLixeira={isLixeira}
                                        onRestore={restaurarProcesso}
                                    />
                                ))}
                            </tbody>
                        </table>
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
                                <Button size="sm" onClick={() => downloadWord(viewProcessoId)} className="bg-blue-600 hover:bg-blue-700">
                                    <FileType className="w-4 h-4 mr-1" /> Word
                                </Button>
                                <Button size="sm" onClick={() => downloadPDF(viewProcessoId)} className="bg-red-600 hover:bg-red-700">
                                    <FileDown className="w-4 h-4 mr-1" /> PDF
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(viewContent); toast.success('Copiado!'); }} className="border-zinc-700">
                                    <Copy className="w-4 h-4 mr-1" /> Copiar
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
