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
  const { token, selectedCompany, selectedCompetencia } = useAppContext();
  
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

  const competencia = competenciaSelecionada || (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  })();

  const fetchData = useCallback(async () => {
    if (!companyId || !token) return;
    
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
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Erro ao reprocessar');
      }
      
      const result = await response.json();
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
        <span className="ml-2 text-gray-600">Carregando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800">Erro ao carregar dados</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="ml-auto px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
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
            className="p-2 hover:bg-gray-100 rounded-lg"
            data-testid="btn-voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Monofásicos</h1>
            <p className="text-sm text-gray-500">
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
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500">Total Monofásico Ativo</div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(data?.resumo?.total_monofasico_ativo)}
          </div>
          <div className="text-xs text-gray-400">Excluído do cálculo DAS</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500">Total Removido pelo Usuário</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(data?.resumo?.total_monofasico_excluido)}
          </div>
          <div className="text-xs text-gray-400">Volta para tributação</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500">NCMs Monofásicos</div>
          <div className="text-2xl font-bold text-blue-600">
            {data?.resumo?.qtd_ncms_ativos || 0}
            <span className="text-sm text-gray-400 ml-1">/ {data?.resumo?.qtd_ncms || 0}</span>
          </div>
          <div className="text-xs text-gray-400">{data?.resumo?.qtd_ncms_excluidos || 0} excluídos</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-sm text-gray-500">Produtos Monofásicos</div>
          <div className="text-2xl font-bold text-purple-600">
            {data?.resumo?.qtd_produtos || 0}
          </div>
          <div className="text-xs text-gray-400">Na competência</div>
        </div>
      </div>

      {/* Alerta informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Como funciona:</strong> Produtos monofásicos são excluídos do cálculo do DAS pois o PIS/COFINS já foi recolhido na origem (fabricante/importador).
          Se você identificar que algum produto NÃO deveria ser monofásico, remova-o da lista e reprocesse o cálculo.
        </div>
      </div>

      {/* Tabs e Filtros */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('ncm'); clearSelection(); }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                activeTab === 'ncm' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
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
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="tab-produtos"
            >
              <Package className="w-4 h-4" />
              Por Produto ({filteredProdutos.length})
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64"
                data-testid="input-search"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
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
          <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b">
            <span className="text-sm text-blue-700">
              {selectedItems.size} item(ns) selecionado(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(activeTab === 'ncm' ? 'excluir_lote' : 'excluir_produto', Array.from(selectedItems))}
                disabled={processing}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 flex items-center gap-1"
                data-testid="btn-excluir-lote"
              >
                <Trash2 className="w-4 h-4" />
                Remover da lista
              </button>
              <button
                onClick={() => handleAction(activeTab === 'ncm' ? 'restaurar_lote' : 'restaurar_produto', Array.from(selectedItems))}
                disabled={processing}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 flex items-center gap-1"
                data-testid="btn-restaurar-lote"
              >
                <Plus className="w-4 h-4" />
                Restaurar como monofásico
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={selectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedItems.size === filteredNcms.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredNcms.map((item) => (
                  <tr 
                    key={item.ncm} 
                    className={`hover:bg-gray-50 ${item.status === 'excluido' ? 'bg-gray-100 opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelectItem(item.ncm)}>
                        {selectedItems.has(item.ncm) ? 
                          <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                          <Square className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">{item.ncm}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.tipo === 'COMBUSTÍVEL' ? 'bg-yellow-100 text-yellow-800' :
                        item.tipo === 'MEDICAMENTO' ? 'bg-red-100 text-red-800' :
                        item.tipo === 'COSMÉTICOS' ? 'bg-pink-100 text-pink-800' :
                        item.tipo === 'BEBIDA FRIA' ? 'bg-blue-100 text-blue-800' :
                        item.tipo === 'VEÍCULO' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{item.motivo}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.valor_total)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.qtd_produtos}</td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'excluido' ? (
                        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">Excluído</span>
                      ) : item.status === 'incluido_manual' ? (
                        <span className="px-2 py-1 bg-blue-200 text-blue-700 rounded-full text-xs">Manual</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-200 text-green-700 rounded-full text-xs">Ativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.status === 'excluido' ? (
                        <button
                          onClick={() => handleAction('restaurar_ncm', [item.ncm])}
                          disabled={processing}
                          className="text-green-600 hover:text-green-800"
                          title="Restaurar como monofásico"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('excluir_ncm', [item.ncm])}
                          disabled={processing}
                          className="text-red-600 hover:text-red-800"
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={selectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedItems.size === filteredProdutos.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCM</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Origem</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProdutos.slice(0, 100).map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 ${item.is_excluido ? 'bg-gray-100 opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelectItem(item.id)}>
                        {selectedItems.has(item.id) ? 
                          <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                          <Square className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{item.codigo || '-'}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate" title={item.descricao}>{item.descricao}</td>
                    <td className="px-4 py-3 font-mono text-sm">{item.ncm}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.origem === 'sistema' ? 'bg-blue-100 text-blue-700' :
                        item.origem === 'incluido_usuario' ? 'bg-purple-100 text-purple-700' :
                        item.origem === 'excluido_usuario' ? 'bg-gray-200 text-gray-700' :
                        'bg-gray-100 text-gray-600'
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
                          className="text-green-600 hover:text-green-800"
                          title="Restaurar"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction('excluir_produto', [item.id])}
                          disabled={processing}
                          className="text-red-600 hover:text-red-800"
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
              <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                Mostrando 100 de {filteredProdutos.length} produtos. Use os filtros para refinar a busca.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
