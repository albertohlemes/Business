import { Button } from './ui/button';
import { 
    FileText, Trash2, Eye, Building2, Hash, FileDown, FileType 
} from 'lucide-react';

const ClienteMinutas = ({ cliente, onView, onDownloadWord, onDownloadPDF, onDelete, getStatus }) => {
    return (
        <div className="p-4" data-testid={`cliente-${cliente.key}`}>
            {/* Cabeçalho do Cliente */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-red-500" />
                    <div>
                        <p className="font-medium text-white">
                            {cliente.razao_social || 'Empresa não identificada'}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">
                            {cliente.cnpj || 'CNPJ não informado'}
                        </p>
                    </div>
                </div>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                    {cliente.alteracoes.length} alteraç{cliente.alteracoes.length === 1 ? 'ão' : 'ões'}
                </span>
            </div>
            
            {/* Lista de Alterações do Cliente */}
            <div className="ml-8 space-y-2">
                {cliente.alteracoes.map(m => (
                    <div 
                        key={m.id} 
                        className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-3 hover:border-zinc-700 transition-colors"
                        data-testid={`minuta-${m.id}`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-red-500 font-mono font-medium text-sm">
                                <Hash className="w-3 h-3" />
                                {m.numero_alteracao || '-'}
                            </span>
                            <span className="text-zinc-300">
                                {m.tipo_alteracao || 'Minuta'}
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

export default ClienteMinutas;
