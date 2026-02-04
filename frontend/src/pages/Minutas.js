import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { 
    FileText, Upload, Trash2, 
    Clock, CheckCircle2, RefreshCw, 
    ChevronRight, ChevronLeft, Eye, Copy, Building2,
    Users, MapPin, Briefcase, DollarSign, X,
    Calendar, Hash, FileDown
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import DadosExtraidos from '../components/DadosExtraidos';
import { gerarPDFBlobUrl, baixarPDF, TEMPLATE_MINUTA } from '../utils/pdfGenerator';

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
            
            // Usar novo endpoint para extração estruturada
            const extractRes = await axios.post(`${API_URL}/api/minutas/${uploadRes.data.id}/extrair-dados`);
            
            if (extractRes.data.success && extractRes.data.dados) {
                setDadosExtraidos(extractRes.data.dados);
                toast.success('Contrato analisado com sucesso!');
            } else {
                // Fallback para chat se extração falhar
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
            
            // Extrair dados da empresa para o template
            const empresa = dadosExtraidos?.empresa || {};
            const socios = dadosExtraidos?.socios || [];
            
            const prompt = `Com base no contrato social analisado e nos documentos de apoio anexados, gere uma MINUTA DE ALTERAÇÃO CONTRATUAL completa.

DADOS DA EMPRESA:
- Razão Social: ${empresa.razao_social || '[A IDENTIFICAR]'}
- CNPJ: ${empresa.cnpj || '[A IDENTIFICAR]'}
- Endereço: ${empresa.endereco || '[A IDENTIFICAR]'}
- Capital Social: ${empresa.capital_social || '[A IDENTIFICAR]'}

SÓCIOS ATUAIS:
${socios.map(s => `- ${s.nome}, CPF ${s.cpf || 'N/A'}, ${s.participacao || 'N/A'} das quotas${s.administrador ? ' (Administrador)' : ''}`).join('\n') || '[A IDENTIFICAR DO CONTRATO]'}

DATA DA ALTERAÇÃO: ${dataFormatada}

ALTERAÇÕES SOLICITADAS: ${tiposStr}

DESCRIÇÃO DAS ALTERAÇÕES:
${descricaoAlteracao}

INSTRUÇÕES OBRIGATÓRIAS:
1. Use o seguinte FORMATO PADRÃO para a minuta:

${TEMPLATE_MINUTA}

2. Substitua todos os campos entre colchetes com os dados reais
3. Extraia informações dos documentos de apoio (CNH, comprovantes) quando necessário
4. Use a data "${dataFormatada}" em todo o documento
5. Linguagem jurídica formal e precisa
6. Inclua a CONSOLIDAÇÃO completa do contrato social
7. Deixe espaço para assinaturas no final`;

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
        toast.success('Texto copiado para área de transferência!');
    };

    const forcarDownload = (blob, nomeArquivo) => {
        // Método 1: file-saver
        try {
            saveAs(blob, nomeArquivo);
        } catch (e) {
            // Método 2: link manual
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nomeArquivo;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        }
    };

    const exportarTxt = () => {
        try {
            const blob = new Blob([minutaGerada], { type: 'text/plain;charset=utf-8' });
            forcarDownload(blob, `minuta_alteracao_${dataAlteracao}.txt`);
            toast.success('Arquivo TXT salvo na pasta Downloads!');
        } catch (e) {
            // Fallback: copiar para clipboard
            navigator.clipboard.writeText(minutaGerada);
            toast.info('Não foi possível baixar. Texto copiado para clipboard!');
        }
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
            forcarDownload(blob, `minuta_alteracao_${dataAlteracao}.docx`);
            toast.success('Arquivo Word salvo na pasta Downloads!');
        } catch (e) {
            console.error(e);
            toast.error('Erro ao gerar Word. Use a opção Copiar.');
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
                        Histórico de Alterações
                    </h2>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto" />
                    </div>
                ) : minutas.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma minuta criada</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-20">Nº</th>
                                    <th>CNPJ</th>
                                    <th>Razão Social</th>
                                    <th>Tipo de Alteração</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                    <th className="text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {minutas.map(m => (
                                    <tr key={m.id} data-testid={`minuta-${m.id}`}>
                                        <td>
                                            <span className="flex items-center gap-1 text-red-500 font-mono font-medium">
                                                <Hash className="w-3 h-3" />
                                                {m.numero_alteracao || '-'}
                                            </span>
                                        </td>
                                        <td className="font-mono text-sm">
                                            {m.cnpj || '-'}
                                        </td>
                                        <td className="max-w-[200px] truncate">
                                            {m.razao_social || '-'}
                                        </td>
                                        <td>
                                            {m.tipo_alteracao || 'Minuta'}
                                        </td>
                                        <td>{getStatus(m.status)}</td>
                                        <td className="text-xs text-zinc-500">
                                            {new Date(m.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => viewMinuta(m)} className="border-zinc-700">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => deleteMinuta(m.id)} className="border-zinc-700 hover:border-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                            onClick={() => {
                                                const empresa = dadosExtraidos?.empresa || {};
                                                visualizarPDF(minutaGerada, empresa, dataAlteracao);
                                            }}
                                            className="bg-red-600 hover:bg-red-700"
                                            data-testid="visualizar-pdf-btn"
                                        >
                                            <Eye className="w-4 h-4 mr-2" /> Visualizar PDF
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => {
                                                const empresa = dadosExtraidos?.empresa || {};
                                                baixarPDF(minutaGerada, empresa, dataAlteracao);
                                                toast.success('PDF baixado!');
                                            }}
                                            className="border-zinc-700"
                                            data-testid="baixar-pdf-btn"
                                        >
                                            <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={copyToClipboard}
                                            className="border-zinc-700"
                                        >
                                            <Copy className="w-4 h-4 mr-2" /> Copiar
                                        </Button>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-zinc-500">
                                    Clique em "Visualizar PDF" para ver o documento formatado e salvar onde quiser, ou "Baixar PDF" para download direto.
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
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-zinc-800 pb-4">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-red-500" />
                                Visualizar Minuta
                            </DialogTitle>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    onClick={() => {
                                        visualizarPDF(viewContent, {}, null);
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <Eye className="w-4 h-4 mr-2" /> Ver PDF
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        baixarPDF(viewContent, {}, null);
                                        toast.success('PDF baixado!');
                                    }}
                                    className="border-zinc-700"
                                >
                                    <FileDown className="w-4 h-4 mr-2" /> Baixar
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
                        <p className="text-xs text-zinc-500 mt-2">
                            Use "Ver PDF" para visualizar formatado e salvar, ou "Baixar" para download direto
                        </p>
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
        </div>
    );
};

export default Minutas;
