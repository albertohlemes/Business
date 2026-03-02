import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Check, 
  X, 
  RefreshCw,
  AlertTriangle,
  Package,
  Hash,
  Download,
  Upload,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MonofasicosManager() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { selectedCompany, selectedCompetencia } = useAppContext();
  
  // Obter token diretamente do localStorage para garantir disponibilidade
  const token = localStorage.getItem('token');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ncm'); // 'ncm' ou 'produtos'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos'); // 'todos', 'ativos', 'excluidos'
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [ncmsDisponiveis, setNcmsDisponiveis] = useState([]);

  const competencia = selectedCompetencia || localStorage.getItem('selectedCompetencia') || (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  })();

  const fetchData = useCallback(async () => {
    // Verificar token e companyId
    if (!companyId) {
      setError('ID da empresa não encontrado na URL');
      setLoading(false);
      return;
    }
    
    if (!token) {
      setError('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API}/api/simples-nacional/${companyId}/monofasicos?competencia=${encodeURIComponent(competencia)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Erro ao carregar dados');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, token, competencia]);

  const fetchNcmsDisponiveis = useCallback(async () => {
    if (!companyId || !token) return;
    
    try {
      const response = await fetch(
        `${API}/api/simples-nacional/${companyId}/monofasicos/ncms-disponiveis`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const result = await response.json();
        setNcmsDisponiveis(result.ncms || []);
      }
    } catch (err) {
      console.error('Erro ao carregar NCMs disponíveis:', err);
    }
  }, [companyId, token]);

  useEffect(() => {
    fetchData();
    fetchNcmsDisponiveis();
  }, [fetchData, fetchNcmsDisponiveis]);

  const handleAction = async (acao, items) => {
    setProcessing(true);
    try {
      const isNcm = activeTab === 'ncm';
      const body = {
        acao,
        ncms: isNcm ? items : [],
        produtos: !isNcm ? items : [],
        motivo: `Ação ${acao} via interface`
      };
      
      const response = await fetch(
        `${API}/api/simples-nacional/${companyId}/monofasicos/excecoes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Erro ao processar ação');
      }
      
      // Recarregar dados
      await fetchData();
      setSelectedItems(new Set());
      
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReprocessar = async () => {
    setProcessing(true);
    try {
      const response = await fetch(
        `${API}/api/simples-nacional/${companyId}/monofasicos/reprocessar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ competencia })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Erro ao reprocessar');
      }
      
      alert(`Cálculo reprocessado!\n\nFaturamento: R$ ${result.faturamento?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      
    } catch (err) {
      alert(`Erro: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const items = activeTab === 'ncm' ? filteredNcms : filteredProdutos;
    setSelectedItems(new Set(items.map(i => activeTab === 'ncm' ? i.ncm : i.id)));
  };

  const clearSelection = () => setSelectedItems(new Set());

  // Filtrar dados
  const filteredNcms = data?.agrupamento_ncm?.filter(item => {
    const matchSearch = !searchTerm || 
      item.ncm.includes(searchTerm) ||
      item.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.motivo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'todos' ||
      (filterStatus === 'ativos' && item.status === 'ativo') ||
      (filterStatus === 'excluidos' && item.status === 'excluido');
    
    return matchSearch && matchStatus;
  }) || [];

  const filteredProdutos = data?.agrupamento_produtos?.filter(item => {
    const matchSearch = !searchTerm ||
      item.ncm.includes(searchTerm) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'todos' ||
      (filterStatus === 'ativos' && !item.is_excluido) ||
      (filterStatus === 'excluidos' && item.is_excluido);
    
    return matchSearch && matchStatus;
  }) || [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-400">Erro ao carregar dados</h3>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="ml-auto px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="monofasicos-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400"
            data-testid="btn-voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Gestão de Monofásicos</h1>
            <p className="text-sm text-gray-400">
              {data?.empresa?.razao_social} - Competência {competencia}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleReprocessar}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          data-testid="btn-reprocessar"
        >
          <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
          Reprocessar Cálculo
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">Total Monofásico Ativo</div>
          <div className="text-2xl font-bold text-orange-500">
            {formatCurrency(data?.resumo?.total_monofasico_ativo)}
          </div>
          <div className="text-xs text-gray-500">Excluído do cálculo DAS</div>
        </div>
        
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">Total Removido pelo Usuário</div>
          <div className="text-2xl font-bold text-green-500">
            {formatCurrency(data?.resumo?.total_monofasico_excluido)}
          </div>
          <div className="text-xs text-gray-500">Volta para tributação</div>
        </div>
        
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">NCMs Monofásicos</div>
          <div className="text-2xl font-bold text-blue-500">
            {data?.resumo?.qtd_ncms_ativos || 0}
            <span className="text-sm text-gray-500 ml-1">/ {data?.resumo?.qtd_ncms || 0}</span>
          </div>
          <div className="text-xs text-gray-500">{data?.resumo?.qtd_ncms_excluidos || 0} excluídos</div>
        </div>
        
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] p-4">
          <div className="text-sm text-gray-400">Produtos Monofásicos</div>
          <div className="text-2xl font-bold text-purple-500">
            {data?.resumo?.qtd_produtos || 0}
          </div>
          <div className="text-xs text-gray-500">Na competência</div>
        </div>
      </div>

      {/* Alerta informativo */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
        <div className="text-sm text-blue-300">
          <strong>Como funciona:</strong> Produtos monofásicos são excluídos do cálculo do DAS pois o PIS/COFINS já foi recolhido na origem (fabricante/importador).
          Se você identificar que algum produto NÃO deveria ser monofásico, remova-o da lista e reprocesse o cálculo.
        </div>
      </div>

      {/* Tabs e Filtros */}
      <div className="bg-[#141414] rounded-xl border border-[#2A2A2A]">
        <div className="border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('ncm'); clearSelection(); }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'ncm' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:bg-[#2A2A2A]'
              }`}
              data-testid="tab-ncm"
            >
              <Hash className="w-4 h-4" />
              Por NCM ({filteredNcms.length})
            </button>
            <button
              onClick={() => { setActiveTab('produtos'); clearSelection(); }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'produtos' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:bg-[#2A2A2A]'
              }`}
              data-testid="tab-produtos"
            >
              <Package className="w-4 h-4" />
              Por Produto ({filteredProdutos.length})
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm w-64 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                data-testid="input-search"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              data-testid="select-filter"
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos (monofásicos)</option>
              <option value="excluidos">Excluídos pelo usuário</option>
            </select>
          </div>
        </div>

        {/* Barra de Ações */}
        {selectedItems.size > 0 && (
          <div className="bg-blue-600/10 px-4 py-3 flex items-center justify-between border-b border-[#2A2A2A]">
            <span className="text-sm text-blue-400">
              {selectedItems.size} item(ns) selecionado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(activeTab === 'ncm' ? 'excluir_lote' : 'excluir_produto', Array.from(selectedItems))}
                disabled={processing}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 flex items-center gap-1"
                data-testid="btn-excluir-lote"
              >
                <Trash2 className="w-4 h-4" />
                Remover da lista
              </button>
              <button
                onClick={() => handleAction(activeTab === 'ncm' ? 'restaurar_lote' : 'restaurar_produto', Array.from(selectedItems))}
                disabled={processing}
                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 flex items-center gap-1"
                data-testid="btn-restaurar-lote"
              >
                <Plus className="w-4 h-4" />
                Restaurar como monofásico
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-[#2A2A2A] text-gray-300 rounded-lg text-sm hover:bg-[#333]"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        )}

        {/* Tabela NCMs */}
        {activeTab === 'ncm' && (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-ncm">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={selectAll} className="text-gray-500 hover:text-gray-300">
                      {selectedItems.size === filteredNcms.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">NCM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Motivo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Valor Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Qtd</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredNcms.map((item) => (
                  <tr 
                    key={item.ncm} 
                    className={`hover:bg-[#1A1A1A] ${item.status === 'excluido' ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelectItem(item.ncm)}>
                        {selectedItems.has(item.ncm) ? 
                          <CheckSquare className="w-4 h-4 text-blue-500" /> : 
                          <Square className="w-4 h-4 text-gray-500" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-white">{item.ncm}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.tipo === 'COMBUSTÍVEL' ? 'bg-yellow-500/20 text-yellow-400' :
                        item.tipo === 'MEDICAMENTO' ? 'bg-red-500/20 text-red-400' :
                        item.tipo === 'COSMÉTICOS' ? 'bg-pink-500/20 text-pink-400' :
                        item.tipo === 'BEBIDA FRIA' ? 'bg-blue-500/20 text-blue-400' :
                        item.tipo === 'VEÍCULO' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">{item.motivo}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{formatCurrency(item.valor_total)}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{item.qtd_produtos}</td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'excluido' ? (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">Excluído</span>
                      ) : item.status === 'incluido_manual' ? (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Manual</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'excluido' ? (
                        <button
                          onClick={() => handleAction('restaurar_ncm', [item.ncm])}
                          disabled={processing}
                          className="text-green-400 hover:text-green-300"
                          title="Restaurar como monofásico"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('excluir_ncm', [item.ncm])}
                          disabled={processing}
                          className="text-red-400 hover:text-red-300"
                          title="Remover da lista de monofásicos"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredNcms.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      Nenhum NCM encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela Produtos */}
        {activeTab === 'produtos' && (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-produtos">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={selectAll} className="text-gray-500 hover:text-gray-300">
                      {selectedItems.size === filteredProdutos.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">NCM</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Origem</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredProdutos.slice(0, 100).map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-[#1A1A1A] ${item.is_excluido ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelectItem(item.id)}>
                        {selectedItems.has(item.id) ? 
                          <CheckSquare className="w-4 h-4 text-blue-500" /> : 
                          <Square className="w-4 h-4 text-gray-500" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-300">{item.codigo || '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate text-white" title={item.descricao}>{item.descricao}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-300">{item.ncm}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{formatCurrency(item.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.origem === 'sistema' ? 'bg-blue-500/20 text-blue-400' :
                        item.origem === 'incluido_usuario' ? 'bg-purple-500/20 text-purple-400' :
                        item.origem === 'excluido_usuario' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.origem === 'sistema' ? 'Sistema' :
                         item.origem === 'incluido_usuario' ? 'Manual' :
                         item.origem === 'excluido_usuario' ? 'Excluído' : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.is_excluido ? (
                        <button
                          onClick={() => handleAction('restaurar_produto', [item.id])}
                          disabled={processing}
                          className="text-green-400 hover:text-green-300"
                          title="Restaurar"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('excluir_produto', [item.id])}
                          disabled={processing}
                          className="text-red-400 hover:text-red-300"
                          title="Excluir"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredProdutos.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      Nenhum produto encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredProdutos.length > 100 && (
              <div className="px-4 py-3 bg-[#0A0A0A] text-center text-sm text-gray-500">
                Mostrando 100 de {filteredProdutos.length} produtos. Use os filtros para refinar a busca.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
