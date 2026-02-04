import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { 
    Type, AlignLeft, AlignCenter, AlignJustify,
    Bold, Italic, Upload, Save, X, Eye
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

const FONTES = [
    'Times New Roman',
    'Arial',
    'Calibri',
    'Verdana',
    'Georgia',
    'Courier New'
];

const TAMANHOS = ['10', '11', '12', '13', '14', '16', '18', '20', '24'];

const ALINHAMENTOS = [
    { value: 'left', label: 'Esquerda', icon: AlignLeft },
    { value: 'center', label: 'Centro', icon: AlignCenter },
    { value: 'justify', label: 'Justificado', icon: AlignJustify },
];

const SECOES_PADRAO = [
    {
        id: 'titulo',
        nome: 'Título Principal',
        descricao: 'Ex: "ALTERAÇÃO DO CONTRATO SOCIAL"',
        exemplo: 'ALTERAÇÃO DO CONTRATO SOCIAL',
        fonte: 'Times New Roman',
        tamanho: '14',
        negrito: true,
        italico: false,
        alinhamento: 'center'
    },
    {
        id: 'preambulo',
        nome: 'Preâmbulo',
        descricao: 'Texto introdutório do documento',
        exemplo: 'Pelo presente instrumento particular, os sócios abaixo qualificados...',
        fonte: 'Times New Roman',
        tamanho: '12',
        negrito: false,
        italico: false,
        alinhamento: 'justify'
    },
    {
        id: 'socios',
        nome: 'Qualificação dos Sócios',
        descricao: 'Nome do sócio em negrito, qualificação normal',
        exemplo: 'JOÃO DA SILVA, brasileiro, casado, empresário, portador do RG...',
        fonte: 'Times New Roman',
        tamanho: '12',
        negrito: false,
        italico: false,
        alinhamento: 'justify',
        nomeNegrito: true
    },
    {
        id: 'clausula_titulo',
        nome: 'Título das Cláusulas',
        descricao: 'Ex: "CLÁUSULA PRIMEIRA - OBJETO"',
        exemplo: 'CLÁUSULA PRIMEIRA - DO OBJETO SOCIAL',
        fonte: 'Times New Roman',
        tamanho: '12',
        negrito: true,
        italico: false,
        alinhamento: 'justify'
    },
    {
        id: 'clausula_texto',
        nome: 'Texto das Cláusulas',
        descricao: 'Corpo/conteúdo das cláusulas',
        exemplo: 'O objeto social da empresa passa a ser...',
        fonte: 'Times New Roman',
        tamanho: '12',
        negrito: false,
        italico: false,
        alinhamento: 'justify'
    },
    {
        id: 'assinatura',
        nome: 'Assinaturas',
        descricao: 'Área de assinaturas e encerramento',
        exemplo: '________________________________\nJOÃO DA SILVA\nCPF: 000.000.000-00',
        fonte: 'Times New Roman',
        tamanho: '12',
        negrito: false,
        italico: false,
        alinhamento: 'center'
    },
    {
        id: 'rodape',
        nome: 'Rodapé',
        descricao: 'Texto que aparece em todas as páginas',
        exemplo: 'Documento gerado pelo Portal Societário - Business Contabilidade',
        fonte: 'Times New Roman',
        tamanho: '9',
        negrito: false,
        italico: true,
        alinhamento: 'center'
    }
];

const SecaoConfig = ({ secao, onChange }) => {
    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium text-white">{secao.nome}</h4>
                    <p className="text-xs text-zinc-500">{secao.descricao}</p>
                </div>
            </div>

            {/* Exemplo */}
            <div>
                <Label className="text-xs text-zinc-400 mb-1 block">Cole um exemplo:</Label>
                <textarea
                    value={secao.exemplo}
                    onChange={(e) => onChange({ ...secao, exemplo: e.target.value })}
                    placeholder="Cole aqui um exemplo de como deve ficar..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded p-3 text-sm text-zinc-300 min-h-[60px] resize-none focus:border-red-600 focus:outline-none"
                    style={{
                        fontFamily: secao.fonte,
                        fontSize: `${Math.min(parseInt(secao.tamanho), 14)}px`,
                        fontWeight: secao.negrito ? 'bold' : 'normal',
                        fontStyle: secao.italico ? 'italic' : 'normal',
                        textAlign: secao.alinhamento
                    }}
                />
            </div>

            {/* Configurações */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Fonte */}
                <div>
                    <Label className="text-xs text-zinc-500 mb-1 block">Fonte</Label>
                    <Select value={secao.fonte} onValueChange={(v) => onChange({ ...secao, fonte: v })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            {FONTES.map(f => (
                                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Tamanho */}
                <div>
                    <Label className="text-xs text-zinc-500 mb-1 block">Tamanho</Label>
                    <Select value={secao.tamanho} onValueChange={(v) => onChange({ ...secao, tamanho: v })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            {TAMANHOS.map(t => (
                                <SelectItem key={t} value={t} className="text-xs">{t}pt</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Alinhamento */}
                <div>
                    <Label className="text-xs text-zinc-500 mb-1 block">Alinhamento</Label>
                    <Select value={secao.alinhamento} onValueChange={(v) => onChange({ ...secao, alinhamento: v })}>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700">
                            {ALINHAMENTOS.map(a => (
                                <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Estilo */}
                <div>
                    <Label className="text-xs text-zinc-500 mb-1 block">Estilo</Label>
                    <div className="flex items-center gap-2 h-9">
                        <button
                            type="button"
                            onClick={() => onChange({ ...secao, negrito: !secao.negrito })}
                            className={`p-2 rounded border ${secao.negrito ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
                            title="Negrito"
                        >
                            <Bold className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ ...secao, italico: !secao.italico })}
                            className={`p-2 rounded border ${secao.italico ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400'}`}
                            title="Itálico"
                        >
                            <Italic className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Opção especial para sócios */}
            {secao.id === 'socios' && (
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <Checkbox 
                        checked={secao.nomeNegrito} 
                        onCheckedChange={(v) => onChange({ ...secao, nomeNegrito: v })}
                        className="border-zinc-600"
                    />
                    <span className="text-sm text-zinc-400">Nome do sócio em <strong>negrito</strong></span>
                </div>
            )}
        </div>
    );
};

const ConfiguracaoFormatacao = ({ open, onClose, onSave, configuracaoAtual }) => {
    const [secoes, setSecoes] = useState(configuracaoAtual || SECOES_PADRAO);
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [margens, setMargens] = useState({
        superior: '2.5',
        inferior: '2.5',
        esquerda: '3.0',
        direita: '2.0'
    });
    const [espacamento, setEspacamento] = useState('1.5');

    const handleSecaoChange = (index, novaSecao) => {
        const novasSecoes = [...secoes];
        novasSecoes[index] = novaSecao;
        setSecoes(novasSecoes);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogo(file);
            const reader = new FileReader();
            reader.onload = (e) => setLogoPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSave({
            secoes,
            logo,
            logoPreview,
            margens,
            espacamento
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-zinc-800 pb-4">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Type className="w-5 h-5 text-red-500" />
                        Configurar Formatação do Documento
                    </DialogTitle>
                    <p className="text-sm text-zinc-500">
                        Cole exemplos de cada parte e ajuste a formatação. O documento será gerado exatamente como você configurar.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    {/* Logo */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="font-medium text-white">Logo (opcional)</h4>
                                <p className="text-xs text-zinc-500">Aparecerá no cabeçalho do documento</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {logoPreview ? (
                                <div className="relative">
                                    <img src={logoPreview} alt="Logo" className="h-16 object-contain bg-white rounded p-2" />
                                    <button 
                                        onClick={() => { setLogo(null); setLogoPreview(null); }}
                                        className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded cursor-pointer hover:border-red-600 transition-colors">
                                    <Upload className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm text-zinc-400">Fazer upload</span>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Margens e Espaçamento */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-3">Margens e Espaçamento</h4>
                        <div className="grid grid-cols-5 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-500 mb-1 block">Superior (cm)</Label>
                                <Input 
                                    type="number" 
                                    step="0.5"
                                    value={margens.superior}
                                    onChange={(e) => setMargens({...margens, superior: e.target.value})}
                                    className="bg-zinc-900 border-zinc-700 h-9 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500 mb-1 block">Inferior (cm)</Label>
                                <Input 
                                    type="number"
                                    step="0.5"
                                    value={margens.inferior}
                                    onChange={(e) => setMargens({...margens, inferior: e.target.value})}
                                    className="bg-zinc-900 border-zinc-700 h-9 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500 mb-1 block">Esquerda (cm)</Label>
                                <Input 
                                    type="number"
                                    step="0.5"
                                    value={margens.esquerda}
                                    onChange={(e) => setMargens({...margens, esquerda: e.target.value})}
                                    className="bg-zinc-900 border-zinc-700 h-9 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500 mb-1 block">Direita (cm)</Label>
                                <Input 
                                    type="number"
                                    step="0.5"
                                    value={margens.direita}
                                    onChange={(e) => setMargens({...margens, direita: e.target.value})}
                                    className="bg-zinc-900 border-zinc-700 h-9 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500 mb-1 block">Entre linhas</Label>
                                <Select value={espacamento} onValueChange={setEspacamento}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700">
                                        <SelectItem value="1.0">Simples (1.0)</SelectItem>
                                        <SelectItem value="1.5">1.5 linhas</SelectItem>
                                        <SelectItem value="2.0">Duplo (2.0)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Seções */}
                    {secoes.map((secao, index) => (
                        <SecaoConfig 
                            key={secao.id}
                            secao={secao}
                            onChange={(novaSecao) => handleSecaoChange(index, novaSecao)}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-800 pt-4 flex justify-between">
                    <Button variant="outline" onClick={onClose} className="border-zinc-700">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Configuração
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ConfiguracaoFormatacao;
