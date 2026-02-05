import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import ListaProcessos from '../components/processos/ListaProcessos';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Lixeira = () => {
    const [processos, setProcessos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [esvaziarDialogOpen, setEsvaziarDialogOpen] = useState(false);
    const [esvaziando, setEsvaziando] = useState(false);

    const carregarLixeira = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/lixeira`);
            setProcessos(response.data.processos || []);
        } catch (error) {
            console.error('Erro ao carregar lixeira:', error);
            toast.error('Erro ao carregar lixeira');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        carregarLixeira();
    }, [carregarLixeira]);

    const esvaziarLixeira = async () => {
        setEsvaziando(true);
        try {
            const response = await axios.post(`${API_URL}/api/lixeira/esvaziar`);
            toast.success(response.data.message);
            setProcessos([]);
            setEsvaziarDialogOpen(false);
        } catch (error) {
            console.error('Erro ao esvaziar lixeira:', error);
            toast.error('Erro ao esvaziar lixeira');
        } finally {
            setEsvaziando(false);
        }
    };

    return (
        <div className="p-8 space-y-6" data-testid="lixeira-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Trash2 className="w-7 h-7 text-red-500" />
                        Lixeira
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Processos excluídos que podem ser restaurados ou removidos permanentemente
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={carregarLixeira}
                        className="border-zinc-700"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    
                    {processos.length > 0 && (
                        <Button 
                            onClick={() => setEsvaziarDialogOpen(true)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Esvaziar Lixeira
                        </Button>
                    )}
                </div>
            </div>

            {/* Aviso */}
            {processos.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-amber-200 font-medium">Atenção</p>
                        <p className="text-amber-300/80 text-sm">
                            Os processos na lixeira serão excluídos permanentemente após 30 dias. 
                            Restaure os processos que deseja manter.
                        </p>
                    </div>
                </div>
            )}

            {/* Lista de processos na lixeira */}
            <ListaProcessos 
                minutas={processos}
                loading={loading}
                onRefresh={carregarLixeira}
                onEdit={() => {}}
                isLixeira={true}
                emptyMessage="Lixeira vazia"
                emptyDescription="Nenhum processo na lixeira"
            />

            {/* Dialog de confirmação para esvaziar */}
            <Dialog open={esvaziarDialogOpen} onOpenChange={setEsvaziarDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Esvaziar Lixeira
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Esta ação irá excluir permanentemente <strong className="text-white">{processos.length} processo(s)</strong> da lixeira.
                            <br /><br />
                            <span className="text-red-400">Esta ação NÃO pode ser desfeita.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setEsvaziarDialogOpen(false)}
                            className="border-zinc-700"
                            disabled={esvaziando}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={esvaziarLixeira}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={esvaziando}
                        >
                            {esvaziando ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Esvaziar Lixeira
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Lixeira;
