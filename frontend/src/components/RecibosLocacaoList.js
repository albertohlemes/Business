import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Receipt, Eye, Trash2, CheckCircle, XCircle, Ban, 
  Upload, Search, Filter, Download, Loader2, 
  Building2, Calendar, DollarSign, FileText, AlertTriangle, 
  MoreVertical, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatCurrency = (value) => {
  const numValue = parseFloat(value) || 0;
  return numValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
};

const RecibosLocacaoList = ({ 
  companyId, 
  competencia, 
  onUploadClick,
  onRefresh
}) => {
  const [recibos, setRecibos] = useState([]);
  const [resumo, setResumo] = useState({ total: 0, ativos: 0, cancelados: 0, valor_total_ativos: 0 });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos', 'ativo', 'cancelado'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregar recibos
  const fetchRecibos = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (competencia) params.append('competencia', competencia);
      if (filterStatus !== 'todos') params.append('status', filterStatus);
      
      const res = await axios.get(`${API}/recibos-locacao/${companyId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRecibos(res.data.recibos || []);
      setResumo(res.data.resumo || { total: 0, ativos: 0, cancelados: 0, valor_total_ativos: 0 });
    } catch (err) {
      console.error('Erro ao carregar recibos:', err);
      toast.error('Erro ao carregar recibos de locação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecibos();
  }, [companyId, competencia, filterStatus]);

  // Atualizar status do recibo
  const handleUpdateStatus = async (recibo, newStatus) => {
    if (newStatus === 'cancelado' && !cancelMotivo.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('status', newStatus);
      if (newStatus === 'cancelado' && cancelMotivo) {
        params.append('motivo_cancelamento', cancelMotivo);
      }
      
      await axios.put(
        `${API}/recibos-locacao/${companyId}/${recibo.id}/status?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Recibo ${newStatus === 'cancelado' ? 'cancelado' : 'reativado'} com sucesso`);
      setShowCancelModal(false);
      setCancelMotivo('');
      setSelectedRecibo(null);
      fetchRecibos();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status do recibo');
    } finally {
      setProcessing(false);
    }
  };

  // Excluir recibo
  const handleDelete = async (recibo) => {
    if (!window.confirm(`Deseja excluir permanentemente o recibo ${recibo.numero_nfe}?`)) {
      return;
    }
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/recibos-locacao/${companyId}/${recibo.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Recibo excluído com sucesso');
      fetchRecibos();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Erro ao excluir recibo:', err);
      toast.error('Erro ao excluir recibo');
    } finally {
      setProcessing(false);
    }
  };

  // Filtrar por busca
  const filteredRecibos = recibos.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.numero_nfe || '').toLowerCase().includes(term) ||
      (r.emitente_nome || '').toLowerCase().includes(term) ||
      (r.destinatario_nome || '').toLowerCase().includes(term) ||
      (r.bem_locado?.descricao || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs">Total</p>
              <p className="text-white text-xl font-semibold">{resumo.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs">Ativos</p>
              <p className="text-emerald-400 text-xl font-semibold">{resumo.ativos}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs">Cancelados</p>
              <p className="text-red-400 text-xl font-semibold">{resumo.cancelados}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C8A951]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#C8A951]" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs">Valor Total (Ativos)</p>
              <p className="text-[#C8A951] text-lg font-semibold">{formatCurrency(resumo.valor_total_ativos)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 items-center">
          {/* Filtro de Status */}
          <div className="flex bg-[#141414] border border-[#2A2A2A] rounded-lg p-1">
            {['todos', 'ativo', 'cancelado'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  filterStatus === status
                    ? 'bg-[#C8A951] text-black'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {status === 'todos' ? 'Todos' : status === 'ativo' ? 'Ativos' : 'Cancelados'}
              </button>
            ))}
          </div>
          
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Buscar recibo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-[#666] focus:border-[#C8A951] outline-none w-64"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchRecibos}
            className="flex items-center gap-2 px-3 py-2 bg-[#141414] border border-[#2A2A2A] rounded-lg text-[#A1A1AA] hover:text-white hover:border-[#3A3A3A] transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Lista de Recibos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#C8A951] animate-spin" />
        </div>
      ) : filteredRecibos.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-[#2A2A2A] rounded-xl">
          <Receipt className="w-16 h-16 text-[#333] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum recibo encontrado</h3>
          <p className="text-[#A1A1AA] text-sm mb-6">
            {filterStatus !== 'todos' 
              ? `Não há recibos ${filterStatus === 'ativo' ? 'ativos' : 'cancelados'} para esta competência`
              : 'Importe recibos de locação para começar'}
          </p>
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8A951] text-black font-medium rounded-lg hover:bg-[#D4B75C] transition-all"
            >
              <Upload className="w-4 h-4" />
              Importar Recibos
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
              <tr>
                <th className="text-left p-4 text-[#A1A1AA] font-medium">Nº Recibo</th>
                <th className="text-left p-4 text-[#A1A1AA] font-medium">Data</th>
                <th className="text-left p-4 text-[#A1A1AA] font-medium">Locatário</th>
                <th className="text-left p-4 text-[#A1A1AA] font-medium">Bem Locado</th>
                <th className="text-right p-4 text-[#A1A1AA] font-medium">Valor</th>
                <th className="text-center p-4 text-[#A1A1AA] font-medium">Status</th>
                <th className="text-center p-4 text-[#A1A1AA] font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A]">
              {filteredRecibos.map((recibo) => (
                <tr 
                  key={recibo.id} 
                  className={`hover:bg-white/5 transition-colors ${
                    recibo.status === 'cancelado' ? 'opacity-60' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#C8A951]" />
                      <span className="text-white font-medium">{recibo.numero_nfe || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-[#A1A1AA]">
                    {formatDate(recibo.data_emissao)}
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-white truncate max-w-[200px]">{recibo.destinatario_nome || '-'}</p>
                      <p className="text-[#666] text-xs">{recibo.destinatario_cnpj || ''}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-[#A1A1AA] truncate max-w-[200px]">
                      {recibo.bem_locado?.descricao || recibo.bem_locado?.identificacao || '-'}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-[#C8A951] font-medium">
                      {formatCurrency(recibo.valor_total)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {recibo.status === 'cancelado' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                        <Ban className="w-3 h-3" />
                        Cancelado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1 relative" ref={menuOpen === recibo.id ? menuRef : null}>
                      <button
                        onClick={() => {
                          setSelectedRecibo(recibo);
                          setShowDetailModal(true);
                        }}
                        className="p-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded transition-all"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => setMenuOpen(menuOpen === recibo.id ? null : recibo.id)}
                        className="p-1.5 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {menuOpen === recibo.id && (
                        <div className="absolute right-0 top-full mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl z-50 min-w-[160px]">
                          {recibo.status === 'ativo' ? (
                            <button
                              onClick={() => {
                                setSelectedRecibo(recibo);
                                setShowCancelModal(true);
                                setMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Ban className="w-4 h-4" />
                              Marcar como Cancelado
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                handleUpdateStatus(recibo, 'ativo');
                                setMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Reativar Recibo
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleDelete(recibo);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-red-500/10 transition-all border-t border-[#2A2A2A]"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir Permanentemente
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetailModal && selectedRecibo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141414] border-b border-[#2A2A2A] p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#C8A951]" />
                Recibo de Locação
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRecibo(null);
                }}
                className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1">Número do Recibo</p>
                  <p className="text-white font-medium">{selectedRecibo.numero_nfe || '-'}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1">Status</p>
                  {selectedRecibo.status === 'cancelado' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                      <Ban className="w-3 h-3" />
                      Cancelado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Ativo
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1">Data de Emissão</p>
                  <p className="text-white">{formatDate(selectedRecibo.data_emissao)}</p>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs mb-1">Data de Vencimento</p>
                  <p className="text-white">{formatDate(selectedRecibo.data_vencimento)}</p>
                </div>
              </div>

              {/* Locador */}
              <div className="bg-[#0A0A0A] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#C8A951] mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Locador
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#666]">Razão Social</p>
                    <p className="text-white">{selectedRecibo.emitente_nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[#666]">CNPJ</p>
                    <p className="text-white">{selectedRecibo.emitente_cnpj || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Locatário */}
              <div className="bg-[#0A0A0A] rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Locatário
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#666]">Razão Social</p>
                    <p className="text-white">{selectedRecibo.destinatario_nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[#666]">CNPJ</p>
                    <p className="text-white">{selectedRecibo.destinatario_cnpj || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Bem Locado */}
              {selectedRecibo.bem_locado && (
                <div className="bg-[#0A0A0A] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-emerald-400 mb-3">Bem Locado</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[#666]">Descrição</p>
                      <p className="text-white">{selectedRecibo.bem_locado.descricao || '-'}</p>
                    </div>
                    {selectedRecibo.bem_locado.local_utilizacao && (
                      <div>
                        <p className="text-[#666]">Local de Utilização</p>
                        <p className="text-white">{selectedRecibo.bem_locado.local_utilizacao}</p>
                      </div>
                    )}
                    {selectedRecibo.bem_locado.identificacao && (
                      <div>
                        <p className="text-[#666]">Identificação</p>
                        <p className="text-white">{selectedRecibo.bem_locado.identificacao}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Valores */}
              <div className="bg-[#0A0A0A] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#C8A951] mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Valores
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[#666]">Valor Bruto</p>
                    <p className="text-white">{formatCurrency(selectedRecibo.valor_bruto)}</p>
                  </div>
                  <div>
                    <p className="text-[#666]">Descontos</p>
                    <p className="text-red-400">{formatCurrency(selectedRecibo.valor_descontos)}</p>
                  </div>
                  <div>
                    <p className="text-[#666]">Valor Líquido</p>
                    <p className="text-white">{formatCurrency(selectedRecibo.valor_liquido)}</p>
                  </div>
                  <div>
                    <p className="text-[#666]">IR Retido</p>
                    <p className="text-orange-400">{formatCurrency(selectedRecibo.valor_ir_retido)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                  <div className="flex justify-between items-center">
                    <p className="text-[#A1A1AA] font-medium">Valor Total</p>
                    <p className="text-[#C8A951] text-xl font-bold">{formatCurrency(selectedRecibo.valor_total)}</p>
                  </div>
                </div>
              </div>

              {/* Tributação */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-400 mb-2">Tributação</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">PIS</span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">COFINS</span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">IRPJ</span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">CSLL</span>
                  <span className="px-2 py-1 bg-[#333] text-[#666] rounded text-xs line-through">ISS</span>
                  <span className="px-2 py-1 bg-[#333] text-[#666] rounded text-xs line-through">ICMS</span>
                </div>
                <p className="text-xs text-[#A1A1AA] mt-2">
                  Locação de bens não tem incidência de ISS/ICMS
                </p>
              </div>

              {/* Período e Observações */}
              {(selectedRecibo.periodo_locacao || selectedRecibo.observacoes) && (
                <div className="space-y-3">
                  {selectedRecibo.periodo_locacao && (
                    <div>
                      <p className="text-[#A1A1AA] text-xs mb-1">Período de Locação</p>
                      <p className="text-white text-sm">{selectedRecibo.periodo_locacao}</p>
                    </div>
                  )}
                  {selectedRecibo.observacoes && (
                    <div>
                      <p className="text-[#A1A1AA] text-xs mb-1">Observações</p>
                      <p className="text-white text-sm">{selectedRecibo.observacoes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo do cancelamento */}
              {selectedRecibo.status === 'cancelado' && selectedRecibo.motivo_cancelamento && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Motivo do Cancelamento
                  </h3>
                  <p className="text-white text-sm">{selectedRecibo.motivo_cancelamento}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento */}
      {showCancelModal && selectedRecibo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-[#2A2A2A]">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" />
                Cancelar Recibo
              </h2>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-[#A1A1AA] text-sm">
                Você está prestes a marcar o recibo <strong className="text-white">{selectedRecibo.numero_nfe}</strong> como cancelado.
              </p>
              
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-2">
                  Motivo do Cancelamento <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:border-[#C8A951] outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-[#2A2A2A] flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedRecibo(null);
                  setCancelMotivo('');
                }}
                className="px-4 py-2 text-[#A1A1AA] hover:text-white transition-all"
              >
                Voltar
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedRecibo, 'cancelado')}
                disabled={processing || !cancelMotivo.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecibosLocacaoList;
