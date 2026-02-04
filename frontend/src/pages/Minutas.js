import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { 
    FileText, Upload, Download, Trash2, 
    Clock, CheckCircle2, RefreshCw, 
    ChevronRight, ChevronLeft, Eye, Copy, Building2,
    Users, MapPin, Briefcase, DollarSign, FileSearch, X,
    Calendar, FileDown
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIPOS_ALTERACAO = [
    { id: 'socios', label: 'Alteração de Sócios', icon: Users },
    { id: 'endereco', label: 'Alteração de Endereço', icon: MapPin },
    { id: 'atividade', label: 'Alteração de Atividades', icon: Briefcase },
    { id: 'capital', label: 'Alteração de Capital', icon: DollarSign },
    { id: 'nome', label: 'Alteração de Nome', icon: Building2 },
    { id: 'administracao', label: 'Alteração de Administração', icon: Users },
];

const Minutas = () => {
    const [minutas, setMinutas] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Wizard state
    const [wizardOpen, setWizardOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [processing, setProcessing] = useState(false);
    
    // Step 1 - Contrato
    const [contratoFile, setContratoFile] = useState(null);
    const [dadosExtraidos, setDadosExtraidos] = useState(null);
    
    // Step 2 - Alterações
    const [alteracoesSelecionadas, setAlteracoesSelecionadas] = useState([]);
    
    // Step 3 - Detalhes
    const [descricaoAlteracao, setDescricaoAlteracao] = useState('');
    const [docsApoio, setDocsApoio] = useState([]);
    const [dataAlteracao, setDataAlteracao] = useState(new Date().toISOString().split('T')[0]);
    
    // Step 4 - Preview
    const [minutaGerada, setMinutaGerada] = useState('');
    const [minutaId, setMinutaId] = useState(null);
    
    // Refs
    const contratoInputRef = useRef(null);
    const docsInputRef = useRef(null);
    
    // View minuta
    const [viewOpen, setViewOpen] = useState(false);
    const [viewContent, setViewContent] = useState('');

    useEffect(() => {
        fetchMinutas();
    }, []);

    const fetchMinutas = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/minutas`);
            setMinutas(res.data);
        } catch (e) {
            toast.error('Erro ao carregar');
        } finally {
            setLoading(false);
        }
    };

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

    const openWizard = () => {
        resetWizard();
        setWizardOpen(true);
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
            // Upload contrato
            const formData = new FormData();
            formData.append('file', file);
            formData.append('tipo_alteracao', 'analise_inicial');
            formData.append('descricao', 'Análise inicial do contrato');
            
            const uploadRes = await axios.post(`${API_URL}/api/minutas/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setMinutaId(uploadRes.data.id);
            
            // Solicitar extração de dados via chat
            const chatRes = await axios.post(`${API_URL}/api/minutas/${uploadRes.data.id}/chat`, {
                message: `Analise o contrato social anexado e extraia as seguintes informações em formato estruturado:

1. RAZÃO SOCIAL: (nome completo da empresa)
2. CNPJ: (número do CNPJ)
3. ENDEREÇO: (endereço completo da sede)
4. CAPITAL SOCIAL: (valor e forma de integralização)
5. QUADRO SOCIETÁRIO (QSA): Liste cada sócio com:
   - Nome completo
   - CPF
   - Participação (%)
   - Se é administrador
6. ATIVIDADES/OBJETO SOCIAL: Liste os CNAEs ou descrição das atividades

Formate de forma clara e organizada.`,
                minuta_id: uploadRes.data.id
            });
            
            setDadosExtraidos(chatRes.data.response);
            toast.success('Contrato analisado!');
        } catch (e) {
            toast.error('Erro ao analisar contrato');
            console.error(e);
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
            
            // Formatar data
            const dataFormatada = new Date(dataAlteracao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long', 
                year: 'numeric'
            });
            
            // Montar prompt com alterações
            const tiposStr = alteracoesSelecionadas.map(id => 
                TIPOS_ALTERACAO.find(t => t.id === id)?.label
            ).join(', ');
            
            const prompt = `Com base no contrato social analisado e nos documentos de apoio anexados, gere uma MINUTA DE ALTERAÇÃO CONTRATUAL completa.

DATA DA ALTERAÇÃO: ${dataFormatada}

ALTERAÇÕES SOLICITADAS: ${tiposStr}

DESCRIÇÃO DAS ALTERAÇÕES:
${descricaoAlteracao}

INSTRUÇÕES:
1. Extraia os dados necessários dos documentos de apoio (CNH, comprovantes, etc.)
2. Use a data "${dataFormatada}" como data da alteração em todo o documento
3. Gere a minuta no formato padrão:
   - PREÂMBULO (dados da empresa e sócios atuais)
   - CLÁUSULAS DE ALTERAÇÃO (cada alteração em cláusula separada)
   - CONSOLIDAÇÃO DO CONTRATO SOCIAL (texto consolidado com as alterações)
   - ENCERRAMENTO E ASSINATURAS

Use linguagem jurídica formal e precisa. Inclua todos os dados extraídos dos documentos.`;

            const chatRes = await axios.post(`${API_URL}/api/minutas/${minutaId}/chat`, {
                message: prompt,
                minuta_id: minutaId
            });
            
            setMinutaGerada(chatRes.data.response);
            
            // Atualizar tipo
            await axios.post(`${API_URL}/api/minutas/${minutaId}/gerar`);
            
            toast.success('Minuta gerada!');
            setStep(4);
            fetchMinutas();
        } catch (e) {
            toast.error('Erro ao gerar minuta');
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(minutaGerada);
        toast.success('Copiado!');
    };

    const exportarTxt = () => {
        const blob = new Blob([minutaGerada], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `minuta_alteracao_${dataAlteracao}.txt`);
        toast.success('TXT exportado!');
    };

    const exportarWord = async () => {
        try {
            const linhas = minutaGerada.split('\n');
            const paragrafos = linhas.map(linha => {
                const isTitle = linha.trim().toUpperCase() === linha.trim() && linha.trim().length > 3;
                return new Paragraph({
                    children: [
                        new TextRun({
                            text: linha,
                            bold: isTitle,
                            size: isTitle ? 28 : 24,
                        })
                    ],
                    alignment: isTitle ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
                    spacing: { after: 200 },
                });
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: 'ALTERAÇÃO CONTRATUAL', bold: true, size: 32 })],
                            heading: HeadingLevel.TITLE,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 },
                        }),
                        ...paragrafos
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `minuta_alteracao_${dataAlteracao}.docx`);
            toast.success('Word exportado!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao exportar Word');
        }
    };

    const deleteMinuta = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/minutas/${id}`);
            toast.success('Removida');
            setMinutas(minutas.filter(m => m.id !== id));
        } catch (e) {
            toast.error('Erro');
        }
    };

    const viewMinuta = async (minuta) => {
        try {
            const res = await axios.get(`${API_URL}/api/minutas/${minuta.id}`);
            if (res.data.conteudo_gerado) {
                setViewContent(res.data.conteudo_gerado);
            } else {
                const msgs = res.data.mensagens || [];
                const lastAi = msgs.filter(m => m.assistant).pop();
                setViewContent(lastAi?.assistant || 'Sem conteúdo');
            }
            setViewOpen(true);
        } catch (e) {
            toast.error('Erro');
        }
    };

    const getStatus = (s) => {
        const cfg = { pendente: 'badge-pending', em_analise: 'badge-warning', concluida: 'badge-success' };
        const lbl = { pendente: 'Pendente', em_analise: 'Em Análise', concluida: 'Concluída' };
        return <span className={`badge ${cfg[s] || 'badge-pending'}`}>{lbl[s] || s}</span>;
    };

    return (
        <div className="p-8 fade-in" data-testid="minutas-page">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Minutas Contratuais</h1>
                    <p className="text-zinc-500">Crie minutas de alteração com auxílio de IA</p>
                </div>
                <Button onClick={openWizard} className="bg-red-600 hover:bg-red-700 btn-business" data-testid="nova-minuta-btn">
                    <FileText className="w-4 h-4 mr-2" />
                    Nova Minuta
                </Button>
            </div>

            {/* Lista de Minutas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded">
                <div className="p-6 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-red-500" />
                        Histórico
                    </h2>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" />
                    </div>
                ) : minutas.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma minuta</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800">
                        {minutas.map(m => (
                            <div key={m.id} className="p-4 hover:bg-zinc-800/50 flex items-center justify-between" data-testid={`minuta-${m.id}`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-medium">{m.tipo_alteracao || 'Minuta'}</span>
                                        {getStatus(m.status)}
                                    </div>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(m.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => viewMinuta(m)} className="border-zinc-700">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => deleteMinuta(m.id)} className="border-zinc-700 hover:border-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Wizard Dialog */}
            <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-500" />
                            Nova Minuta de Alteração
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
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileSearch className="w-5 h-5 text-red-500" />
                                            <h4 className="font-semibold text-white">Dados Extraídos</h4>
                                        </div>
                                        <pre className="text-sm text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                            {dadosExtraidos}
                                        </pre>
                                    </div>
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
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h3 className="text-lg font-semibold text-white">Minuta Gerada</h3>
                                    <div className="flex gap-2 flex-wrap">
                                        <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-zinc-700">
                                            <Copy className="w-4 h-4 mr-1" /> Copiar
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={exportarTxt} className="border-zinc-700">
                                            <FileDown className="w-4 h-4 mr-1" /> TXT
                                        </Button>
                                        <Button size="sm" onClick={exportarWord} className="bg-red-600 hover:bg-red-700">
                                            <Download className="w-4 h-4 mr-1" /> Word
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
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
                            onClick={() => step > 1 ? setStep(step - 1) : setWizardOpen(false)}
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
                            <Button onClick={() => setWizardOpen(false)} className="bg-red-600 hover:bg-red-700">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Concluir
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl max-h-[80vh] overflow-auto">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <DialogTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-500" />
                            Visualizar Minuta
                        </DialogTitle>
                    </DialogHeader>
                    <pre className="p-4 whitespace-pre-wrap text-sm text-zinc-300 font-mono bg-zinc-950 rounded border border-zinc-800 m-4">
                        {viewContent}
                    </pre>
                    <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                        <Button variant="outline" onClick={() => setViewOpen(false)} className="border-zinc-700">
                            Fechar
                        </Button>
                        <Button onClick={() => { navigator.clipboard.writeText(viewContent); toast.success('Copiado!'); }}
                            className="bg-red-600 hover:bg-red-700">
                            <Copy className="w-4 h-4 mr-2" /> Copiar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Minutas;
