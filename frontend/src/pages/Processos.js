import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { 
    FileText, RefreshCw, Settings, Type, CheckCircle2,
    Plus, FileEdit, Building2, XCircle
} from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../components/ui/tabs';
import ConfiguracaoFormatacao from '../components/ConfiguracaoFormatacao';
import ListaProcessos from '../components/processos/ListaProcessos';
import WizardAlteracao from '../components/processos/WizardAlteracao';
import WizardConstituicao from '../components/processos/WizardConstituicao';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Processos = () => {
    const [minutas, setMinutas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('constituicao');
    
    // Templates
    const [templates, setTemplates] = useState([]);
    
    // Formatação
    const [formatacaoOpen, setFormatacaoOpen] = useState(false);
    const [formatacaoSalva, setFormatacaoSalva] = useState(null);
    
    // Wizards
    const [wizardAlteracaoOpen, setWizardAlteracaoOpen] = useState(false);
    const [wizardConstituicaoOpen, setWizardConstituicaoOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);
    
    const fetchData = async () => {
        try {
            const [minutasRes, templatesRes, formatacaoRes] = await Promise.all([
                axios.get(`${API_URL}/api/minutas`),
                axios.get(`${API_URL}/api/templates`),
                axios.get(`${API_URL}/api/formatacao`).catch(() => ({ data: null }))
            ]);
            setMinutas(minutasRes.data);
            setTemplates(templatesRes.data);
            if (formatacaoRes.data && formatacaoRes.data.secoes && formatacaoRes.data.secoes.length > 0) {
                setFormatacaoSalva(formatacaoRes.data);
            }
        } catch (e) {
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };
    
    // Salvar formatação manual
    const handleSalvarFormatacao = async (config) => {
        try {
            // Se tem logo, fazer upload primeiro
            if (config.logo) {
                const formData = new FormData();
                formData.append('file', config.logo);
                await axios.post(`${API_URL}/api/formatacao/logo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            
            // Salvar configuração
            await axios.post(`${API_URL}/api/formatacao/salvar`, {
                secoes: config.secoes,
                margens: config.margens,
                espacamento: config.espacamento,
                logoBase64: config.logoPreview || null,
                organizacaoInteligente: config.organizacaoInteligente !== false
            });
            
            setFormatacaoSalva(config);
            toast.success('Formatação salva com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar formatação');
            console.error(e);
        }
    };

    const handleNovoProcesso = () => {
        if (activeTab === 'constituicao') {
            setWizardConstituicaoOpen(true);
        } else if (activeTab === 'alteracao') {
            setWizardAlteracaoOpen(true);
        } else {
            toast.info('Funcionalidade de Baixa em desenvolvimento');
        }
    };

    const handleMinutaCriada = () => {
        fetchData();
    };

    // Filtrar processos por tipo
    const minutasAlteracao = minutas.filter(m => 
        !m.tipo_processo || m.tipo_processo === 'alteracao'
    );
    const minutasConstituicao = minutas.filter(m => 
        m.tipo_processo === 'constituicao'
    );
    const minutasBaixa = minutas.filter(m => 
        m.tipo_processo === 'baixa'
    );

    const getButtonLabel = () => {
        switch (activeTab) {
            case 'constituicao': return 'Nova Constituição';
            case 'alteracao': return 'Nova Alteração';
            case 'baixa': return 'Nova Baixa';
            default: return 'Novo Processo';
        }
    };

    const getButtonIcon = () => {
        switch (activeTab) {
            case 'constituicao': return Building2;
            case 'alteracao': return FileEdit;
            case 'baixa': return XCircle;
            default: return Plus;
        }
    };

    const ButtonIcon = getButtonIcon();

    return (
        <div className="p-8 fade-in" data-testid="processos-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Processos Societários</h1>
                    <p className="text-zinc-500">Gerencie alterações, constituições e baixas de empresas</p>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => setFormatacaoOpen(true)} 
                        className={`border-zinc-700 ${formatacaoSalva ? 'text-green-500 border-green-700' : ''}`}
                        data-testid="formatacao-btn"
                    >
                        <Type className="w-4 h-4 mr-2" />
                        Formatação
                        {formatacaoSalva && <CheckCircle2 className="w-3 h-3 ml-1" />}
                    </Button>
                    <Button 
                        onClick={handleNovoProcesso} 
                        className="bg-red-600 hover:bg-red-700 btn-business" 
                        data-testid="novo-processo-btn"
                    >
                        <ButtonIcon className="w-4 h-4 mr-2" />
                        {getButtonLabel()}
                    </Button>
                </div>
            </div>

            {/* Tabs de Processos */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
                    <TabsTrigger 
                        value="constituicao"
                        className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                        data-testid="tab-constituicao"
                    >
                        <Building2 className="w-4 h-4 mr-2" />
                        Constituição
                        {minutasConstituicao.length > 0 && (
                            <span className="ml-2 bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                                {minutasConstituicao.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="alteracao" 
                        className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                        data-testid="tab-alteracao"
                    >
                        <FileEdit className="w-4 h-4 mr-2" />
                        Alteração
                        {minutasAlteracao.length > 0 && (
                            <span className="ml-2 bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                                {minutasAlteracao.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="baixa"
                        className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                        data-testid="tab-baixa"
                    >
                        <XCircle className="w-4 h-4 mr-2" />
                        Baixa
                        {minutasBaixa.length > 0 && (
                            <span className="ml-2 bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                                {minutasBaixa.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Conteúdo de Constituição */}
                <TabsContent value="constituicao" className="mt-6">
                    <ListaProcessos 
                        minutas={minutasConstituicao}
                        loading={loading}
                        tipoProcesso="constituicao"
                        onRefresh={fetchData}
                        emptyMessage="Nenhuma constituição criada"
                        emptyDescription="Clique em 'Nova Constituição' para criar um contrato social"
                    />
                </TabsContent>

                {/* Conteúdo de Alteração */}
                <TabsContent value="alteracao" className="mt-6">
                    <ListaProcessos 
                        minutas={minutasAlteracao}
                        loading={loading}
                        tipoProcesso="alteracao"
                        onRefresh={fetchData}
                        emptyMessage="Nenhuma alteração contratual criada"
                        emptyDescription="Clique em 'Nova Alteração' para criar um processo de alteração contratual"
                    />
                </TabsContent>

                {/* Conteúdo de Baixa */}
                <TabsContent value="baixa" className="mt-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                        <XCircle className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                        <h3 className="text-lg font-medium text-white mb-2">Baixa de Empresas</h3>
                        <p className="text-zinc-500 text-sm mb-4">
                            Funcionalidade em desenvolvimento. Em breve você poderá gerar documentos de baixa/encerramento.
                        </p>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Em breve
                        </span>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal de Configuração de Formatação */}
            <ConfiguracaoFormatacao 
                open={formatacaoOpen}
                onClose={() => setFormatacaoOpen(false)}
                onSave={handleSalvarFormatacao}
                configuracaoAtual={formatacaoSalva?.secoes}
            />

            {/* Wizard de Alteração */}
            <WizardAlteracao 
                open={wizardAlteracaoOpen}
                onClose={() => setWizardAlteracaoOpen(false)}
                onComplete={handleMinutaCriada}
            />

            {/* Wizard de Constituição */}
            <WizardConstituicao
                open={wizardConstituicaoOpen}
                onClose={() => setWizardConstituicaoOpen(false)}
                onComplete={handleMinutaCriada}
            />
        </div>
    );
};

export default Processos;
