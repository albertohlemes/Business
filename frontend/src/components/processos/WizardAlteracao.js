import { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { 
    FileText, Upload, X, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft,
    Users, MapPin, Briefcase, DollarSign, Building2, Calendar, FileDown, Copy
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import DadosExtraidos from '../DadosExtraidos';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIPOS_ALTERACAO = [
    { id: 'socios', label: 'Alteração de Sócios', icon: Users },
    { id: 'endereco', label: 'Alteração de Endereço', icon: MapPin },
    { id: 'atividade', label: 'Alteração de Atividades', icon: Briefcase },
    { id: 'capital', label: 'Alteração de Capital', icon: DollarSign },
    { id: 'nome', label: 'Alteração de Nome', icon: Building2 },
    { id: 'administracao', label: 'Alteração de Administração', icon: Users },
];

const WizardAlteracao = ({ open, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    
    // Step 1 - Contrato
    const [contratoFile, setContratoFile] = useState(null);
    const [dadosExtraidos, setDadosExtraidos] = useState(null);
    const [minutaId, setMinutaId] = useState(null);
    
    // Step 2 - Alterações
    const [alteracoesSelecionadas, setAlteracoesSelecionadas] = useState([]);
    
    // Step 3 - Detalhes
    const [descricaoAlteracao, setDescricaoAlteracao] = useState('');
    const [docsApoio, setDocsApoio] = useState([]);
    const [dataAlteracao, setDataAlteracao] = useState(new Date().toISOString().split('T')[0]);
    
    // Step 4 - Preview
    const [minutaGerada, setMinutaGerada] = useState('');
    
    // Refs
    const contratoInputRef = useRef(null);
    const docsInputRef = useRef(null);

    const resetWizard = () => {
        setStep(1);
        setContratoFile(null);
        setDadosExtraidos(null);
        setAlteracoesSelecionadas([]);
        setDescricaoAlteracao('');
        setDocsApoio([]);
        setDataAlteracao(new Date().toISOString().split('T')[0]);
        setMinutaGerada('');
        setMinutaId(null);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    // Step 1: Upload e análise do contrato
    const handleContratoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            toast.error('Use PDF, JPG ou PNG');
            return;
        }
        
        setContratoFile(file);
        setProcessing(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tipo_alteracao', 'analise_inicial');
            formData.append('descricao', 'Análise inicial do contrato');
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setMinutaId(uploadRes.data.id);
            
            // Extração estruturada
            const extractRes = await axios.post(`${API_URL}/api/minutas/${uploadRes.data.id}/extrair-dados`);
            
            if (extractRes.data.success && extractRes.data.dados) {
                setDadosExtraidos(extractRes.data.dados);
                toast.success('Contrato analisado com sucesso!');
            } else {
                // Fallback
                const chatRes = await axios.post(`${API_URL}/api/minutas/${uploadRes.data.id}/chat`, {
                    message: `Analise o contrato social anexado e extraia as informações em formato estruturado.`,
                    minuta_id: uploadRes.data.id
                });
                setDadosExtraidos({ raw_text: chatRes.data.response });
                toast.success('Contrato analisado!');
            }
        } catch (e) {
            console.error('Erro ao analisar:', e);
            toast.error('Erro ao analisar contrato');
        } finally {
            setProcessing(false);
        }
    };

    // Step 2: Toggle alteração
    const toggleAlteracao = (id) => {
        setAlteracoesSelecionadas(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Step 3: Upload docs apoio
    const handleDocsApoio = (e) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(f => 
            ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)
        );
        setDocsApoio(prev => [...prev, ...validFiles.map(f => ({ file: f, id: Date.now() + Math.random() }))]);
        if (docsInputRef.current) docsInputRef.current.value = '';
    };

    const removeDocApoio = (id) => {
        setDocsApoio(prev => prev.filter(d => d.id !== id));
    };

    // Step 4: Gerar minuta
    const gerarMinutaFinal = async () => {
        if (!minutaId) return;
        
        setProcessing(true);
        try {
            // Upload docs de apoio
            for (const doc of docsApoio) {
                const fd = new FormData();
                fd.append('file', doc.file);
                fd.append('tipo_documento', 'apoio');
                await axios.post(`${API_URL}/api/minutas/${minutaId}/documentos`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            const dataFormatada = new Date(dataAlteracao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long', 
                year: 'numeric'
            });
            
            const tiposStr = alteracoesSelecionadas.map(id => 
                TIPOS_ALTERACAO.find(t => t.id === id)?.label
            ).join(', ');
            
            const empresa = dadosExtraidos?.empresa || {};
            const socios = dadosExtraidos?.socios || [];

            const prompt = `GERE UMA MINUTA DE ALTERAÇÃO CONTRATUAL seguindo EXATAMENTE este formato:

================================================================================
                    ALTERAÇÃO DO CONTRATO SOCIAL
                    
${empresa.razao_social || '[RAZÃO SOCIAL]'}
CNPJ: ${empresa.cnpj || '[CNPJ]'}
================================================================================

Pelo presente instrumento particular, os sócios abaixo qualificados:

QUADRO SOCIETÁRIO ATUAL:
${socios.map((s, i) => `${i+1}. ${s.nome}, ${s.nacionalidade || 'brasileiro(a)'}, ${s.estado_civil || ''}, ${s.profissao || ''}, portador(a) do RG nº ${s.rg || 'XXXXX'} e CPF nº ${s.cpf || 'XXX.XXX.XXX-XX'}, residente e domiciliado(a) em [ENDEREÇO], titular de ${s.participacao || 'XX%'} das quotas do capital social${s.administrador ? ', ADMINISTRADOR(A)' : ''}.`).join('\n\n') || '[LISTAR SÓCIOS DO CONTRATO ORIGINAL]'}

Únicos sócios da empresa ${empresa.razao_social || '[RAZÃO SOCIAL]'}, inscrita no CNPJ sob nº ${empresa.cnpj || '[CNPJ]'}, com sede em ${empresa.endereco || '[ENDEREÇO]'}, resolvem, de comum acordo, proceder às seguintes alterações:

--------------------------------------------------------------------------------
                         CLÁUSULAS DE ALTERAÇÃO
--------------------------------------------------------------------------------

DATA DA ALTERAÇÃO: ${dataFormatada}
TIPO DE ALTERAÇÃO: ${tiposStr}

DESCRIÇÃO DA ALTERAÇÃO SOLICITADA:
${descricaoAlteracao}

INSTRUÇÕES IMPORTANTES:
1. Gere APENAS as cláusulas de alteração para: ${tiposStr}
2. MANTENHA todas as outras cláusulas do contrato original SEM MODIFICAÇÃO
3. Use os dados dos documentos de apoio anexados (CNH, comprovantes) se houver
4. Na CONSOLIDAÇÃO, reproduza o contrato original INTEGRALMENTE, alterando APENAS os campos especificados acima
5. Use linguagem jurídica formal

Estrutura obrigatória:
- CLÁUSULA PRIMEIRA - [tipo da alteração]: Detalhe da alteração
- CONSOLIDAÇÃO DO CONTRATO SOCIAL: Contrato completo com a alteração aplicada
- ENCERRAMENTO: Assinaturas dos sócios

================================================================================`;

            const chatRes = await axios.post(`${API_URL}/api/minutas/${minutaId}/chat`, {
                message: prompt,
                minuta_id: minutaId
            });
            
            setMinutaGerada(chatRes.data.response);
            
            await axios.post(`${API_URL}/api/minutas/${minutaId}/gerar`);
            
            toast.success('Minuta gerada!');
            setStep(4);
            onComplete();
        } catch (e) {
            toast.error('Erro ao gerar minuta');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(minutaGerada);
        toast.success('Texto copiado!');
    };

    const downloadPDF = async () => {
        if (!minutaId) return;
        try {
            const response = await axios.get(`${API_URL}/api/minutas/${minutaId}/download/pdf`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `alteracao_${dataAlteracao}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('PDF baixado!');
        } catch (e) {
            toast.error('Erro ao baixar PDF');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-500" />
                        Nova Alteração Contratual
                    </DialogTitle>
                    {/* Progress */}
                    <div className="flex items-center gap-2 mt-4">
                        {[1,2,3,4].map(s => (
                            <div key={s} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    step >= s ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'
                                }`}>
                                    {s}
                                </div>
                                {s < 4 && <div className={`w-12 h-1 ${step > s ? 'bg-red-600' : 'bg-zinc-800'}`} />}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                        <span>Contrato</span>
                        <span>Alterações</span>
                        <span>Detalhes</span>
                        <span>Resultado</span>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Upload Contrato */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Upload do Contrato Atual</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Envie o contrato social atual. A IA irá extrair automaticamente os dados.
                                </p>
                                
                                <div 
                                    className={`drop-zone rounded-lg p-8 text-center cursor-pointer ${contratoFile ? 'active' : ''}`}
                                    onClick={() => contratoInputRef.current?.click()}
                                >
                                    <input ref={contratoInputRef} type="file" onChange={handleContratoUpload}
                                        accept=".pdf,.jpg,.jpeg,.png" className="hidden" data-testid="contrato-input" />
                                    
                                    {processing ? (
                                        <div className="text-red-500">
                                            <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin" />
                                            <p>Analisando contrato...</p>
                                        </div>
                                    ) : contratoFile ? (
                                        <div className="text-red-500">
                                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
                                            <p className="font-medium">{contratoFile.name}</p>
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500">
                                            <Upload className="w-10 h-10 mx-auto mb-3" />
                                            <p className="font-medium">Arraste ou clique</p>
                                            <p className="text-xs mt-1">PDF ou Imagem</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {dadosExtraidos && (
                                <DadosExtraidos dados={dadosExtraidos} />
                            )}
                        </div>
                    )}

                    {/* Step 2: Seleção de Alterações */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Selecione as Alterações</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Marque todas as alterações que deseja realizar no contrato.
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {TIPOS_ALTERACAO.map(tipo => {
                                        const Icon = tipo.icon;
                                        const selected = alteracoesSelecionadas.includes(tipo.id);
                                        return (
                                            <div
                                                key={tipo.id}
                                                onClick={() => toggleAlteracao(tipo.id)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                    selected 
                                                        ? 'border-red-600 bg-red-600/10' 
                                                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                                                }`}
                                                data-testid={`alt-${tipo.id}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Checkbox checked={selected} className="border-zinc-600" />
                                                    <Icon className={`w-5 h-5 ${selected ? 'text-red-500' : 'text-zinc-500'}`} />
                                                    <span className={selected ? 'text-white' : 'text-zinc-400'}>
                                                        {tipo.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Detalhes e Docs */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Detalhes da Alteração</h3>
                                <p className="text-sm text-zinc-500 mb-4">
                                    Descreva as alterações e envie os documentos de apoio.
                                </p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Data da Alteração
                                        </Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <Input
                                                type="date"
                                                value={dataAlteracao}
                                                onChange={(e) => setDataAlteracao(e.target.value)}
                                                className="bg-zinc-950 border-zinc-800 pl-10"
                                                data-testid="data-alteracao"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-zinc-400 text-xs uppercase mb-2 block">
                                            Descreva as alterações
                                        </Label>
                                        <Textarea
                                            value={descricaoAlteracao}
                                            onChange={(e) => setDescricaoAlteracao(e.target.value)}
                                            placeholder={`Ex:\n- Entrada do sócio João Silva, CPF 000.000.000-00, com 30% das quotas\n- Saída do sócio Maria Santos\n- Novo endereço: Rua ABC, 123, São Paulo/SP`}
                                            className="bg-zinc-950 border-zinc-800 min-h-[120px]"
                                            data-testid="descricao-alteracao"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-zinc-400 text-xs uppercase">
                                                Documentos de Apoio
                                            </Label>
                                            <button onClick={() => docsInputRef.current?.click()}
                                                className="text-xs text-red-500 hover:text-red-400">
                                                + Adicionar
                                            </button>
                                        </div>
                                        <input ref={docsInputRef} type="file" multiple onChange={handleDocsApoio}
                                            accept=".pdf,.jpg,.jpeg,.png" className="hidden" data-testid="docs-input" />
                                        
                                        {docsApoio.length === 0 ? (
                                            <div 
                                                className="border border-dashed border-zinc-800 rounded-lg p-6 text-center cursor-pointer hover:border-red-600/50"
                                                onClick={() => docsInputRef.current?.click()}
                                            >
                                                <Upload className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                                                <p className="text-sm text-zinc-500">CNH, Comprovante, CNAEs, etc.</p>
                                                <p className="text-xs text-zinc-600 mt-1">A IA vai extrair os dados automaticamente</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {docsApoio.map(doc => (
                                                    <div key={doc.id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded p-2">
                                                        <FileText className="w-4 h-4 text-red-500" />
                                                        <span className="text-sm text-zinc-300 flex-1 truncate">{doc.file.name}</span>
                                                        <button onClick={() => removeDocApoio(doc.id)} className="text-zinc-500 hover:text-red-500">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => docsInputRef.current?.click()}
                                                    className="w-full border border-dashed border-zinc-800 rounded p-2 text-xs text-zinc-500 hover:border-red-600/50">
                                                    + Mais documentos
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Resultado */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">Minuta Gerada</h3>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        onClick={downloadPDF}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid="baixar-pdf-btn"
                                    >
                                        <FileDown className="w-4 h-4 mr-2" /> Salvar PDF
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={copyToClipboard}
                                        className="border-zinc-700"
                                    >
                                        <Copy className="w-4 h-4 mr-2" /> Copiar Texto
                                    </Button>
                                </div>
                            </div>
                            
                            <p className="text-xs text-zinc-500">
                                Clique em "Salvar PDF" para baixar o documento formatado.
                            </p>
                            
                            <div className="bg-white text-black rounded-lg p-6 max-h-[450px] overflow-y-auto border">
                                <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed" style={{fontFamily: 'Times New Roman, serif'}}>
                                    {minutaGerada}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 p-4 flex justify-between">
                    <Button 
                        variant="outline" 
                        onClick={() => step > 1 ? setStep(step - 1) : handleClose()}
                        className="border-zinc-700"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {step === 1 ? 'Cancelar' : 'Voltar'}
                    </Button>
                    
                    {step < 4 ? (
                        <Button 
                            onClick={() => {
                                if (step === 3) {
                                    gerarMinutaFinal();
                                } else {
                                    setStep(step + 1);
                                }
                            }}
                            disabled={
                                (step === 1 && !dadosExtraidos) ||
                                (step === 2 && alteracoesSelecionadas.length === 0) ||
                                (step === 3 && !descricaoAlteracao) ||
                                processing
                            }
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="next-btn"
                        >
                            {processing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                    Processando...
                                </>
                            ) : step === 3 ? (
                                <>
                                    Gerar Minuta
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            ) : (
                                <>
                                    Próximo
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Concluir
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WizardAlteracao;
