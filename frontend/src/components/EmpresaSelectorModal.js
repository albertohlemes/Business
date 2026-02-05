import { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { Building2, Calendar, Check, Search } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmpresaSelectorModal = ({ open, onOpenChange }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [competenciaInput, setCompetenciaInput] = useState('');
  const { empresaSelecionada, competencia, selecionarEmpresa } = useEmpresa();

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      setSelectedEmpresa(empresaSelecionada);
      // Format competencia for input (MMYYYY)
      const compFormatted = competencia.replace('/', '');
      setCompetenciaInput(compFormatted);
    }
  }, [open, empresaSelecionada, competencia]);

  const fetchEmpresas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clientes`);
      setEmpresas(response.data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedEmpresa) return;
    
    // Parse competencia input (MMYYYY -> MM/YYYY)
    let comp = competencia;
    if (competenciaInput && competenciaInput.length >= 6) {
      const mes = competenciaInput.slice(0, 2);
      const ano = competenciaInput.slice(2, 6);
      comp = `${mes}/${ano}`;
    }
    
    selecionarEmpresa(selectedEmpresa, comp);
    onOpenChange(false);
  };

  const filteredEmpresas = empresas.filter(e =>
    e.razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cnpj?.includes(searchTerm)
  );

  const generateCode = (id) => {
    // Generate a short code from the ID
    return `#${id.slice(0, 4).toUpperCase()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl">Selecione a Empresa</DialogTitle>
              <p className="text-sm text-slate-500">Escolha a empresa e competência para trabalhar</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              data-testid="search-empresa-modal"
              placeholder="Buscar por nome ou CNPJ..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Empresas List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Building2 size={14} />
              Empresa
            </p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton h-20 rounded-lg" />
                ))}
              </div>
            ) : filteredEmpresas.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredEmpresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    data-testid={`empresa-option-${empresa.id}`}
                    onClick={() => setSelectedEmpresa(empresa)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedEmpresa?.id === empresa.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        selectedEmpresa?.id === empresa.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {generateCode(empresa.id)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {empresa.nome_fantasia || empresa.razao_social}
                        </p>
                        <p className="text-sm text-slate-500 font-mono">{empresa.cnpj}</p>
                        {empresa.endereco && (
                          <p className="text-xs text-slate-400 truncate">{empresa.endereco}</p>
                        )}
                      </div>
                      {selectedEmpresa?.id === empresa.id && (
                        <Check className="text-indigo-600 flex-shrink-0" size={20} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
                <p>Nenhuma empresa encontrada</p>
              </div>
            )}
          </div>

          {/* Competência */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Calendar size={14} />
              Competência (Mês/Ano)
            </p>
            <Input
              data-testid="competencia-input"
              placeholder="MMAAAA (ex: 022026)"
              value={competenciaInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCompetenciaInput(value);
              }}
              className="text-center text-lg font-mono tracking-wider"
            />
            <p className="text-xs text-slate-400 text-center">
              Digite apenas números (ex: 122025 → 12/2025)
            </p>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="flex-shrink-0 pt-4">
          <Button
            onClick={handleConfirm}
            disabled={!selectedEmpresa}
            data-testid="confirm-empresa-btn"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold"
          >
            Confirmar e Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaSelectorModal;
