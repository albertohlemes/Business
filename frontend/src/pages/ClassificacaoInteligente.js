import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Brain, CheckCircle, Search, Edit2, Save, Sparkles, Check, CheckCheck, X, 
  Filter, Layers, FileText, Package, Info, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw, ChevronDown, ChevronRight, Send, BookOpen, Trash2, AlertTriangle,
  Loader2, Wand2, CheckCircle2, BarChart3, ArrowRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

// Componente para renderizar lista de NFs com links
const NFsList = ({ ocorrencias, maxVisible = 999 }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMore = ocorrencias.length > maxVisible && !expanded;
  const visibleNFs = expanded ? ocorrencias : ocorrencias.slice(0, maxVisible);
  
  return (
    <span className="text-xs">
      {visibleNFs.map((o, idx) => (
        <span key={idx}>
          <Link
            to={`/documents?doc=${o.doc_id}`}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/documents?highlight=${o.doc_id}`;
            }}
            className="text-[#C8A951] hover:text-[#D4B962] hover:underline font-medium"
          >
            {o.nf || o.numero_nfe || '?'}
          </Link>
          {idx < visibleNFs.length - 1 && <span className="text-[#666]">, </span>}
        </span>
      ))}
      {hasMore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="ml-1 text-[#C8A951] hover:text-[#D4B962] font-medium"
        >
          +{ocorrencias.length - maxVisible} mais
        </button>
      )}
    </span>
  );
};

const ClassificacaoInteligente = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  
  // Estados para Alertas
  const [alertasLoading, setAlertasLoading] = useState(false);
  const [alertasData, setAlertasData] = useState(null);
  const [alertasError, setAlertasError] = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState({});
  
  // Estados para Validação
  const [validacaoLoading, setValidacaoLoading] = useState(false);
  const [validacaoData, setValidacaoData] = useState(null);
  const [validacaoError, setValidacaoError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Estados compartilhados
  const [comandoIA, setComandoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);

  // Carregar dados
  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchAlertas();
      fetchValidacao();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchAlertas = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setAlertasLoading(true);
    setAlertasError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/alertas-cfop/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlertasData(response.data);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
      setAlertasError('Erro ao carregar alertas de CFOP');
    } finally {
      setAlertasLoading(false);
    }
  };

  const fetchValidacao = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setValidacaoLoading(true);
    setValidacaoError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/classification/suggestions/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setValidacaoData(response.data);
    } catch (err) {
      console.error('Erro ao carregar validação:', err);
      setValidacaoError('Erro ao carregar validação');
    } finally {
      setValidacaoLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const toggleAlert = (key) => {
    setExpandedAlerts(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Configuração das categorias de classificação
  const categoriasConfig = {
    revenda: { label: 'Revenda', color: 'blue', icon: '🛒' },
    insumo: { label: 'Insumo', color: 'green', icon: '⚙️' },
    despesa: { label: 'Despesa', color: 'red', icon: '📋' },
    ativo_imobilizado: { label: 'Ativo Imobilizado', color: 'amber', icon: '🏭' },
    combustivel: { label: 'Combustível', color: 'purple', icon: '⛽' },
    pendente: { label: 'Pendente de Classificação', color: 'gray', icon: '❓' }
  };

  // Agrupar produtos por classificação
  const produtosAgrupados = useMemo(() => {
    if (!validacaoData?.sugestoes) return {};
    
    let filtered = validacaoData.sugestoes;
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.descricao?.toLowerCase().includes(term) ||
        s.ncm?.includes(term) ||
        s.cfop_atual?.includes(term)
      );
    }
    
    // Filtrar por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => {
        if (filterStatus === 'pending') return !s.classificado;
        if (filterStatus === 'done') return s.classificado;
        return true;
      });
    }
    
    // Agrupar por categoria
    const grupos = {};
    filtered.forEach(prod => {
      const categoria = prod.categoria_atual || 'pendente';
      if (!grupos[categoria]) {
        grupos[categoria] = {
          produtos: [],
          valor_total: 0,
          quantidade: 0
        };
      }
      grupos[categoria].produtos.push(prod);
      grupos[categoria].valor_total += prod.valor_total || 0;
      grupos[categoria].quantidade += 1;
    });
    
    // Ordenar produtos dentro de cada grupo por valor
    Object.keys(grupos).forEach(cat => {
      grupos[cat].produtos.sort((a, b) => {
        const valA = a.valor_total || 0;
        const valB = b.valor_total || 0;
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
    });
    
    return grupos;
  }, [validacaoData, searchTerm, filterStatus, sortOrder]);

  // Ordem de exibição das categorias
  const ordemCategorias = ['revenda', 'insumo', 'despesa', 'ativo_imobilizado', 'combustivel', 'pendente'];

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center h-64 text-[#A1A1AA]">
          <Brain className="w-16 h-16 mb-4 text-[#333]" />
          <p>Selecione uma empresa para visualizar a classificação inteligente</p>
        </div>
      </Layout>
    );
  }

  const isLoading = alertasLoading || validacaoLoading;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Brain className="w-7 h-7 text-[#C8A951]" />
              Classificação Inteligente
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Alertas de CFOP e Validação de Produtos
            </p>
          </div>
          
          <button
            onClick={() => { fetchAlertas(); fetchValidacao(); }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {/* ========== SEÇÃO DE ALERTAS ========== */}
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] bg-gradient-to-r from-amber-900/20 to-amber-950/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Alertas de CFOP</h2>
                <p className="text-sm text-[#A1A1AA]">CFOPs que precisam de atenção ou correção</p>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {alertasLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#C8A951] animate-spin" />
              </div>
            ) : alertasError ? (
              <div className="text-center py-8 text-red-400">{alertasError}</div>
            ) : alertasData?.alertas?.length > 0 ? (
              <div className="space-y-3">
                {alertasData.alertas.map((alerta, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleAlert(idx)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedAlerts[idx] ? (
                          <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[#A1A1AA]" />
                        )}
                        <span className={`px-3 py-1 rounded text-sm font-mono ${
                          alerta.tipo === 'erro' ? 'bg-red-500/20 text-red-400' :
                          alerta.tipo === 'atencao' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          CFOP {alerta.cfop}
                        </span>
                        <span className="text-white font-medium">{alerta.descricao}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[#A1A1AA] text-sm">{alerta.quantidade} ocorrências</span>
                        <span className="text-white font-semibold">{formatCurrency(alerta.valor_total)}</span>
                      </div>
                    </button>
                    
                    {expandedAlerts[idx] && (
                      <div className="px-4 pb-4 border-t border-[#2A2A2A]">
                        <div className="pt-4">
                          <p className="text-sm text-[#A1A1AA] mb-2">{alerta.mensagem}</p>
                          {alerta.ocorrencias && (
                            <div className="text-xs text-[#666]">
                              NFs: <NFsList ocorrencias={alerta.ocorrencias} maxVisible={10} />
                            </div>
                          )}
                          {alerta.sugestao && (
                            <div className="mt-3 p-3 bg-[#C8A951]/10 border border-[#C8A951]/30 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Wand2 className="w-4 h-4 text-[#C8A951] mt-0.5" />
                                <div>
                                  <span className="text-[#C8A951] font-medium text-sm">Sugestão: </span>
                                  <span className="text-white text-sm">{alerta.sugestao}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#A1A1AA]">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-medium">Nenhum alerta encontrado</p>
                <p className="text-sm">Todos os CFOPs estão corretos</p>
              </div>
            )}
          </div>
        </div>

        {/* ========== SEÇÃO DE VALIDAÇÃO ========== */}
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A] bg-gradient-to-r from-purple-900/20 to-purple-950/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Validação de Produtos</h2>
                  <p className="text-sm text-[#A1A1AA]">Classificação e validação assistida por IA</p>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                  <input
                    type="text"
                    placeholder="Buscar produto ou NCM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-[#666] focus:border-[#C8A951] focus:outline-none w-64"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-white text-sm focus:border-[#C8A951] focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendentes</option>
                  <option value="done">Validados</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="p-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] transition-colors"
                >
                  {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {validacaoLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#C8A951] animate-spin" />
              </div>
            ) : validacaoError ? (
              <div className="text-center py-8 text-red-400">{validacaoError}</div>
            ) : filteredSuggestions.length > 0 ? (
              <div className="space-y-3">
                {/* Resumo */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-[#141414] rounded-lg p-4 border border-[#2A2A2A]">
                    <div className="text-2xl font-bold text-white">{validacaoData?.resumo?.total_produtos || 0}</div>
                    <div className="text-sm text-[#A1A1AA]">Total de Produtos</div>
                  </div>
                  <div className="bg-[#141414] rounded-lg p-4 border border-green-500/30">
                    <div className="text-2xl font-bold text-green-400">{validacaoData?.resumo?.validados || 0}</div>
                    <div className="text-sm text-[#A1A1AA]">Validados</div>
                  </div>
                  <div className="bg-[#141414] rounded-lg p-4 border border-amber-500/30">
                    <div className="text-2xl font-bold text-amber-400">{validacaoData?.resumo?.pendentes || 0}</div>
                    <div className="text-sm text-[#A1A1AA]">Pendentes</div>
                  </div>
                  <div className="bg-[#141414] rounded-lg p-4 border border-[#C8A951]/30">
                    <div className="text-2xl font-bold text-[#C8A951]">{formatCurrency(validacaoData?.resumo?.valor_total)}</div>
                    <div className="text-sm text-[#A1A1AA]">Valor Total</div>
                  </div>
                </div>

                {/* Lista de Sugestões */}
                <div className="space-y-2">
                  {filteredSuggestions.slice(0, 20).map((sugestao, idx) => (
                    <div 
                      key={idx}
                      className={`bg-[#141414] border rounded-lg p-4 ${
                        sugestao.classificado ? 'border-green-500/30' : 'border-[#2A2A2A]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-[#A1A1AA]" />
                          <div>
                            <p className="text-white font-medium">{sugestao.descricao}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[#666]">
                              <span>NCM: {sugestao.ncm || 'N/A'}</span>
                              <span>CFOP: {sugestao.cfop_atual}</span>
                              <span>{sugestao.quantidade} unid.</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-white font-semibold">{formatCurrency(sugestao.valor_total)}</span>
                          {sugestao.classificado ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-amber-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredSuggestions.length > 20 && (
                  <p className="text-center text-[#666] text-sm pt-4">
                    Mostrando 20 de {filteredSuggestions.length} produtos
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#A1A1AA]">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-medium">Nenhum produto pendente</p>
                <p className="text-sm">Todos os produtos foram validados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClassificacaoInteligente;
