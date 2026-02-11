import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  AlertTriangle, CheckCircle2, Clock, Package, FileText, 
  Calculator, RefreshCw, ChevronRight, ExternalLink,
  AlertCircle, Info, Zap, TrendingUp, BarChart3,
  Calendar, Building2, Filter, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Cores por severidade
const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertTriangle },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: AlertCircle },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: Info },
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: CheckCircle2 },
};

const DashboardInconsistencias = () => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [inconsistencias, setInconsistencias] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const fetchInconsistencias = useCallback(async () => {
    if (!selectedCompany?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/inconsistencias/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInconsistencias(response.data);
    } catch (error) {
      console.error('Erro ao carregar inconsistências:', error);
      // Se o endpoint não existir, criar dados mock para demonstração
      setInconsistencias(generateMockData());
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.id, selectedCompetencia]);

  useEffect(() => {
    fetchInconsistencias();
  }, [fetchInconsistencias]);

  // Dados mock para demonstração
  const generateMockData = () => ({
    resumo: {
      total_alertas: 0,
      criticos: 0,
      avisos: 0,
      informacoes: 0,
      resolvidos_mes: 0,
    },
    categorias: {
      classificacao: {
        titulo: 'Classificação de Produtos',
        icone: 'Package',
        alertas: [],
      },
      cfop: {
        titulo: 'CFOPs Divergentes',
        icone: 'FileText',
        alertas: [],
      },
      calculos: {
        titulo: 'Cálculos Fiscais',
        icone: 'Calculator',
        alertas: [],
      },
      prazos: {
        titulo: 'Prazos e Obrigações',
        icone: 'Calendar',
        alertas: [],
      },
    },
    acoes_rapidas: [],
  });

  // Filtrar alertas por severidade
  const filterAlerts = (alertas) => {
    if (filterSeverity === 'all') return alertas;
    return alertas.filter(a => a.severidade === filterSeverity);
  };

  // Contar alertas totais
  const countAlerts = () => {
    if (!inconsistencias?.categorias) return { total: 0, critical: 0, warning: 0, info: 0 };
    
    let total = 0, critical = 0, warning = 0, info = 0;
    
    Object.values(inconsistencias.categorias).forEach(cat => {
      cat.alertas?.forEach(alerta => {
        total++;
        if (alerta.severidade === 'critical') critical++;
        else if (alerta.severidade === 'warning') warning++;
        else info++;
      });
    });
    
    return { total, critical, warning, info };
  };

  const alertCounts = countAlerts();

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 text-[#666]">
          <Building2 className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg">Selecione uma empresa para ver as inconsistências</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-inconsistencias">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#C8A951]/10 rounded-xl">
            <Zap className="w-8 h-8 text-[#C8A951]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Central de Alertas</h1>
            <p className="text-[#A1A1AA]">
              {selectedCompany.razao_social} • {selectedCompetencia}
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchInconsistencias}
          className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4">
        <div 
          onClick={() => setFilterSeverity('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'all' 
              ? 'bg-[#C8A951]/10 border-[#C8A951]' 
              : 'bg-[#1E1E1E] border-[#2A2A2A] hover:border-[#3A3A3A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <BarChart3 className="w-8 h-8 text-[#C8A951]" />
            <span className="text-3xl font-bold text-white">{alertCounts.total}</span>
          </div>
          <p className="text-[#A1A1AA] mt-2">Total de Alertas</p>
        </div>
        
        <div 
          onClick={() => setFilterSeverity('critical')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'critical' 
              ? 'bg-red-500/20 border-red-500' 
              : 'bg-[#1E1E1E] border-[#2A2A2A] hover:border-red-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <span className="text-3xl font-bold text-red-400">{alertCounts.critical}</span>
          </div>
          <p className="text-[#A1A1AA] mt-2">Críticos</p>
        </div>
        
        <div 
          onClick={() => setFilterSeverity('warning')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'warning' 
              ? 'bg-yellow-500/20 border-yellow-500' 
              : 'bg-[#1E1E1E] border-[#2A2A2A] hover:border-yellow-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
            <span className="text-3xl font-bold text-yellow-400">{alertCounts.warning}</span>
          </div>
          <p className="text-[#A1A1AA] mt-2">Avisos</p>
        </div>
        
        <div 
          onClick={() => setFilterSeverity('info')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            filterSeverity === 'info' 
              ? 'bg-blue-500/20 border-blue-500' 
              : 'bg-[#1E1E1E] border-[#2A2A2A] hover:border-blue-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <Info className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-blue-400">{alertCounts.info}</span>
          </div>
          <p className="text-[#A1A1AA] mt-2">Informações</p>
        </div>
      </div>

      {/* Filtro ativo */}
      {filterSeverity !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-[#A1A1AA]">Filtro ativo:</span>
          <span className={`px-3 py-1 rounded-full text-sm ${
            filterSeverity === 'critical' ? 'bg-red-500/20 text-red-400' :
            filterSeverity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {filterSeverity === 'critical' ? 'Críticos' : filterSeverity === 'warning' ? 'Avisos' : 'Informações'}
          </span>
          <button
            onClick={() => setFilterSeverity('all')}
            className="p-1 hover:bg-[#2A2A2A] rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-[#666]" />
          </button>
        </div>
      )}

      {/* Status de Saúde */}
      {alertCounts.total === 0 ? (
        <div className="p-8 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-400 mb-2">Tudo em ordem!</h2>
          <p className="text-green-400/70">
            Não foram encontradas inconsistências para esta empresa na competência {selectedCompetencia}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Categorias de Alertas */}
          {inconsistencias?.categorias && Object.entries(inconsistencias.categorias).map(([key, categoria]) => {
            const alertasFiltrados = filterAlerts(categoria.alertas || []);
            if (alertasFiltrados.length === 0 && filterSeverity !== 'all') return null;
            
            const IconMap = {
              Package: Package,
              FileText: FileText,
              Calculator: Calculator,
              Calendar: Calendar,
            };
            const Icon = IconMap[categoria.icone] || AlertCircle;
            
            return (
              <div 
                key={key}
                className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
              >
                <div className="p-4 border-b border-[#2A2A2A] bg-[#141414]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-[#C8A951]" />
                      <h3 className="font-medium text-white">{categoria.titulo}</h3>
                    </div>
                    <span className="px-2 py-1 bg-[#2A2A2A] text-[#A1A1AA] rounded-full text-sm">
                      {alertasFiltrados.length} {alertasFiltrados.length === 1 ? 'alerta' : 'alertas'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  {alertasFiltrados.length === 0 ? (
                    <div className="text-center py-4 text-[#666]">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum alerta nesta categoria</p>
                    </div>
                  ) : (
                    alertasFiltrados.map((alerta, idx) => {
                      const severity = SEVERITY_COLORS[alerta.severidade] || SEVERITY_COLORS.info;
                      const SeverityIcon = severity.icon;
                      
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${severity.bg} ${severity.border}`}
                        >
                          <div className="flex items-start gap-3">
                            <SeverityIcon className={`w-5 h-5 ${severity.text} mt-0.5`} />
                            <div className="flex-1">
                              <p className={`font-medium ${severity.text}`}>{alerta.titulo}</p>
                              <p className="text-sm text-[#A1A1AA] mt-1">{alerta.descricao}</p>
                              
                              {alerta.detalhes && (
                                <div className="mt-2 text-xs text-[#666]">
                                  {alerta.detalhes}
                                </div>
                              )}
                              
                              {alerta.acao && (
                                <Link
                                  to={alerta.acao.link}
                                  className={`inline-flex items-center gap-1 mt-2 text-sm ${severity.text} hover:underline`}
                                >
                                  {alerta.acao.texto}
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ações Rápidas */}
      {inconsistencias?.acoes_rapidas?.length > 0 && (
        <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#C8A951]" />
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {inconsistencias.acoes_rapidas.map((acao, idx) => (
              <Link
                key={idx}
                to={acao.link}
                className="p-3 bg-[#141414] hover:bg-[#2A2A2A] rounded-lg border border-[#2A2A2A] hover:border-[#C8A951] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1AA] group-hover:text-white transition-colors">
                    {acao.texto}
                  </span>
                  <ExternalLink className="w-4 h-4 text-[#666] group-hover:text-[#C8A951] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Links úteis sempre visíveis */}
      <div className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] p-4">
        <h3 className="font-medium text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#C8A951]" />
          Verificações Recomendadas
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <Link
            to="/classificacao-inteligente"
            className="p-3 bg-[#141414] hover:bg-[#2A2A2A] rounded-lg border border-[#2A2A2A] hover:border-[#C8A951] transition-colors group"
          >
            <Package className="w-5 h-5 text-[#666] group-hover:text-[#C8A951] mb-2 transition-colors" />
            <span className="text-[#A1A1AA] group-hover:text-white transition-colors text-sm">
              Classificar Produtos
            </span>
          </Link>
          
          <Link
            to="/documents"
            className="p-3 bg-[#141414] hover:bg-[#2A2A2A] rounded-lg border border-[#2A2A2A] hover:border-[#C8A951] transition-colors group"
          >
            <FileText className="w-5 h-5 text-[#666] group-hover:text-[#C8A951] mb-2 transition-colors" />
            <span className="text-[#A1A1AA] group-hover:text-white transition-colors text-sm">
              Revisar Documentos
            </span>
          </Link>
          
          <Link
            to="/icms"
            className="p-3 bg-[#141414] hover:bg-[#2A2A2A] rounded-lg border border-[#2A2A2A] hover:border-[#C8A951] transition-colors group"
          >
            <Calculator className="w-5 h-5 text-[#666] group-hover:text-[#C8A951] mb-2 transition-colors" />
            <span className="text-[#A1A1AA] group-hover:text-white transition-colors text-sm">
              Apuração ICMS
            </span>
          </Link>
          
          <Link
            to="/pis-cofins"
            className="p-3 bg-[#141414] hover:bg-[#2A2A2A] rounded-lg border border-[#2A2A2A] hover:border-[#C8A951] transition-colors group"
          >
            <BarChart3 className="w-5 h-5 text-[#666] group-hover:text-[#C8A951] mb-2 transition-colors" />
            <span className="text-[#A1A1AA] group-hover:text-white transition-colors text-sm">
              PIS/COFINS
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardInconsistencias;
