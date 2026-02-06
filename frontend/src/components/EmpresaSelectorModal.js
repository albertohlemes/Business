import { useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useEmpresa } from '../contexts/EmpresaContext';
import { Building2, Calendar, Check, Search, ChevronRight } from 'lucide-react';

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
    return `#${id.slice(0, 4).toUpperCase()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-slate-900 border-slate-800 text-white">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Building2 className="text-white" size={28} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Selecionar Contexto</DialogTitle>
              <p className="text-sm text-slate-400 mt-1">Empresa e competência para trabalhar</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 mt-6 modal-scroll">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <Input
              data-testid="search-empresa-modal"
              placeholder="Buscar por nome ou CNPJ..."
              className="pl-11 h-12 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Empresas List */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={14} />
              Empresa
            </p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-800 h-20 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredEmpresas.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-2 modal-scroll">
                {filteredEmpresas.map((empresa) => (
                  <div
                    key={empresa.id}
                    data-testid={`empresa-option-${empresa.id}`}
                    onClick={() => setSelectedEmpresa(empresa)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedEmpresa?.id === empresa.id
                        ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedEmpresa?.id === empresa.id
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        <Building2 size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">
                          {empresa.nome_fantasia || empresa.razao_social}
                        </p>
                        <p className="text-sm text-slate-500 font-mono">{empresa.cnpj}</p>
                      </div>
                      {selectedEmpresa?.id === empresa.id ? (
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <Check className="text-white" size={16} />
                        </div>
                      ) : (
                        <ChevronRight className="text-slate-600" size={20} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl bg-slate-800/50 border border-slate-700">
                <Building2 className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-500">Nenhuma empresa encontrada</p>
              </div>
            )}
          </div>

          {/* Competência */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} />
              Competência
            </p>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <Input
                data-testid="competencia-input"
                placeholder="MMAAAA"
                value={competenciaInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCompetenciaInput(value);
                }}
                className="text-center text-2xl font-mono tracking-[0.5em] h-14 bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-red-500"
              />
              <p className="text-xs text-slate-500 text-center mt-2">
                Mês e ano (ex: 022026 → Fevereiro/2026)
              </p>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="flex-shrink-0 pt-6">
          <Button
            onClick={handleConfirm}
            disabled={!selectedEmpresa}
            data-testid="confirm-empresa-btn"
            className="w-full h-14 bg-red-600 hover:bg-red-700 text-lg font-semibold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 disabled:bg-slate-700 disabled:shadow-none"
          >
            Confirmar e Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaSelectorModal;
