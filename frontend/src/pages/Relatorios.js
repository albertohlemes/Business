import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Users, FileText, ClipboardCheck, Loader2 } from 'lucide-react';
import { useEmpresa } from '../contexts/EmpresaContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Relatorios = () => {
  const [downloading, setDownloading] = useState({});
  const [selectedCliente, setSelectedCliente] = useState('all');
  const [clientes, setClientes] = useState([]);
  const { empresaSelecionada } = useEmpresa();

  useState(() => {
    const fetchClientes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/clientes`);
        setClientes(response.data);
      } catch (error) {
        console.error('Erro ao carregar clientes');
      }
    };
    fetchClientes();
  }, []);

  const handleDownload = async (tipo) => {
    setDownloading(prev => ({ ...prev, [tipo]: true }));
    try {
      const clienteParam = selectedCliente !== 'all' ? `?cliente_id=${selectedCliente}` : '';
      const response = await axios.get(`${API_URL}/api/relatorios/${tipo}/excel${clienteParam}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Relatório de ${tipo} baixado com sucesso!`);
    } catch (error) {
      toast.error(`Erro ao baixar relatório de ${tipo}`);
    } finally {
      setDownloading(prev => ({ ...prev, [tipo]: false }));
    }
  };

  const relatorios = [
    {
      id: 'colaboradores',
      titulo: 'Colaboradores',
      descricao: 'Lista completa de funcionários com dados cadastrais, documentos e informações contratuais',
      icon: Users,
      color: 'indigo',
      campos: ['Nome', 'CPF', 'Cargo', 'Departamento', 'Salário', 'Data Admissão', 'PIS', 'Email', 'Telefone']
    },
    {
      id: 'dissidios',
      titulo: 'Dissídios',
      descricao: 'Histórico de reajustes salariais por convenção coletiva com valores e status',
      icon: FileText,
      color: 'emerald',
      campos: ['Empresa', 'Sindicato', 'Percentual', 'Data-Base', 'Colaboradores', 'Valor Total', 'Status']
    },
    {
      id: 'validacoes',
      titulo: 'Validações de Folha',
      descricao: 'Histórico de validações realizadas com quantidade de erros e divergências encontradas',
      icon: ClipboardCheck,
      color: 'amber',
      campos: ['Empresa', 'Mês/Ano', 'Tipo', 'Itens Verificados', 'Erros', 'Status', 'Data']
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      indigo: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: 'text-red-500',
        button: 'bg-red-600 hover:bg-red-700'
      },
      emerald: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: 'text-emerald-600',
        button: 'bg-emerald-600 hover:bg-emerald-700'
      },
      amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        button: 'bg-amber-600 hover:bg-amber-700'
      }
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div data-testid="relatorios-page" className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-slate-500 mt-1">Exporte dados em Excel para análise e conferência</p>
        </div>
      </div>

      {/* Filtro de Empresa */}
      <Card className="border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label className="mb-2 block">Filtrar por Empresa</Label>
              <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                <SelectTrigger data-testid="select-cliente-relatorios">
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_fantasia || c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-slate-500">
              {selectedCliente === 'all' 
                ? 'Exportando dados de todas as empresas' 
                : `Filtrando por: ${clientes.find(c => c.id === selectedCliente)?.nome_fantasia || clientes.find(c => c.id === selectedCliente)?.razao_social || ''}`
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatorios.map((relatorio) => {
          const colors = getColorClasses(relatorio.color);
          const Icon = relatorio.icon;
          const isDownloading = downloading[relatorio.id];
          
          return (
            <Card key={relatorio.id} className={`border-2 ${colors.border} ${colors.bg}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon className={colors.icon} size={24} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-white">
                      {relatorio.titulo}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">{relatorio.descricao}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Campos incluídos:</p>
                  <div className="flex flex-wrap gap-1">
                    {relatorio.campos.map((campo, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 bg-slate-900 rounded text-xs text-slate-600 border border-slate-700">
                        {campo}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(relatorio.id)}
                  disabled={isDownloading}
                  className={`w-full ${colors.button}`}
                  data-testid={`download-${relatorio.id}`}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      Baixar Excel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Sobre os Relatórios</h3>
              <p className="text-sm text-slate-600">
                Os relatórios são gerados em formato <strong>Excel (.xlsx)</strong> compatível com Microsoft Excel, 
                Google Sheets e LibreOffice Calc. Os dados são formatados automaticamente com cabeçalhos, 
                bordas e formatação de moeda brasileira.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Use o filtro de empresa para exportar dados específicos ou deixe em "Todas as empresas" 
                para um relatório consolidado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;
