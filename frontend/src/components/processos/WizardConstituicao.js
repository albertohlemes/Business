import { useState } from 'react';
import { Button } from '../ui/button';
import { 
    Building2, ChevronLeft
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

const WizardConstituicao = ({ open, onClose, onComplete }) => {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-red-500" />
                        Nova Constituição de Empresa
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 text-center">
                    <Building2 className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                    <h3 className="text-xl font-semibold text-white mb-3">
                        Funcionalidade em Desenvolvimento
                    </h3>
                    <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                        O wizard de constituição de empresas está sendo implementado. 
                        Em breve você poderá criar contratos sociais completos com:
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-left max-w-md mx-auto mb-6">
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                            <p className="text-sm text-white font-medium">Entrada Híbrida</p>
                            <p className="text-xs text-zinc-500">Digitar ou anexar documentos</p>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                            <p className="text-sm text-white font-medium">Qualificação de Sócios</p>
                            <p className="text-xs text-zinc-500">CNH, RG, comprovantes</p>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                            <p className="text-sm text-white font-medium">Tabela de Participação</p>
                            <p className="text-xs text-zinc-500">Capital social automático</p>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                            <p className="text-sm text-white font-medium">Objeto Social via CNAEs</p>
                            <p className="text-xs text-zinc-500">Geração automática por IA</p>
                        </div>
                    </div>

                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Disponível em breve
                    </span>
                </div>

                <div className="border-t border-zinc-800 p-4 flex justify-end">
                    <Button 
                        variant="outline" 
                        onClick={onClose}
                        className="border-zinc-700"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Voltar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WizardConstituicao;
