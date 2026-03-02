import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Search, 
  X, 
  RefreshCw,
  AlertTriangle,
  Package,
  Hash,
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
  const { selectedCompetencia } = useAppContext();
  
  const token = localStorage.getItem('token');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ncm');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [processing, setProcessing] = useState(false);

  const competencia = selectedCompetencia || localStorage.getItem('selectedCompetencia') || (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  })();

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setError('ID da empresa não encontrado');
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
      const response = await axios.get(
        `${API}/api/simples-nacional/${companyId}/monofasicos`,
        {
          params: { competencia },
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
      
      setData(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao carregar dados';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [companyId, competencia, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      
      await axios.post(
        `${API}/api/simples-nacional/${companyId}/monofasicos/excecoes`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Recarregar dados e reprocessar automaticamente
      await fetchData();
      await handleReprocessar(true); // Silencioso
      setSelectedItems(new Set());
      
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao processar ação';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReprocessar = async (silencioso = false) => {
    if (!silencioso) setProcessing(true);
    try {
      const response = await axios.post(
        `${API}/api/simples-nacional/${companyId}/monofasicos/reprocessar`,
        { competencia },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = response.data;
      
      if (!silencioso) {
        alert(`Cálculo reprocessado!\n\nFaturamento: R$ ${result.faturamento?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      }
      
      // Recarregar dados para mostrar valores atualizados
      await fetchData();
      
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Erro ao reprocessar';
      if (!silencioso) {
        alert(`Erro: ${errorMessage}`);
      }
    } finally {
      if (!silencioso) setProcessing(false);
    }
  };

  // Filtrar dados
  const getFilteredItems = () => {
    if (!data) return [];
    
    const items = activeTab === 'ncm' 
      ? (data.ncms_monofasicos || [])
      : (data.produtos_monofasicos || []);
    
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        (item.ncm && item.ncm.includes(searchTerm)) ||
        (item.descricao && item.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.produto && item.produto.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterStatus === 'todos' ||
        (filterStatus === 'incluidos' && item.incluido) ||
        (filterStatus === 'excluidos' && !item.incluido);
      
      return matchesSearch && matchesFilter;
    });
  };

  const filteredItems = getFilteredItems();

  const toggleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.ncm || item.produto)));
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center" data-testid="monofasicos-loading">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin mx-auto mb-4" />
          <p className="text-white">Carregando dados de monofásicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6" data-testid="monofasicos-error">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-red-400 font-medium">Erro ao carregar dados</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 space-y-6" data-testid="monofasicos-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Gerenciamento de Monofásicos</h1>
            <p className="text-gray-400 text-sm">
              {data?.empresa || 'Empresa'} - Competência {competencia}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => handleReprocessar(false)}
          disabled={processing}
          className="px-4 py-2 bg-[#C8A951] hover:bg-[#B89841] text-black font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
          Reprocessar Cálculo
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Monofásico</p>
          <p className="text-2xl font-bold text-[#C8A951]">
            {formatCurrency(data?.total_monofasico || 0)}
          </p>
          <p className="text-gray-500 text-xs">Excluído do DAS</p>
        </div>
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Removido pelo Usuário</p>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(data?.total_removido_usuario || 0)}
          </p>
          <p className="text-gray-500 text-xs">Volta para tributação</p>
        </div>
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-gray-400 text-sm">NCMs Monofásicos</p>
          <p className="text-2xl font-bold text-blue-400">
            {data?.ncms_monofasicos?.length || 0}
            <span className="text-sm font-normal text-gray-500"> / {data?.total_ncms_excluidos || 0}</span>
          </p>
          <p className="text-gray-500 text-xs">{data?.total_ncms_excluidos || 0} excluídos</p>
        </div>
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-4">
          <p className="text-gray-400 text-sm">Produtos Monofásicos</p>
          <p className="text-2xl font-bold text-purple-400">
            {data?.produtos_monofasicos?.length || 0}
          </p>
          <p className="text-gray-500 text-xs">Na competência</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-300 text-sm">
          Os monofásicos são excluídos do cálculo do DAS pois o PIS/COFINS já foi recolhido na origem (fabricante/importador). 
          Se você identificar que algum produto NÃO deveria ser monofásico, remova-o da lista e o cálculo será recalculado automaticamente.
        </p>
      </div>

      {/* Tabs e Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ncm')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'ncm' 
                ? 'bg-[#C8A951] text-black' 
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
          >
            <Hash className="w-4 h-4" />
            Por NCM ({data?.ncms_monofasicos?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('produto')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'produto' 
                ? 'bg-[#C8A951] text-black' 
                : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
            }`}
          >
            <Package className="w-4 h-4" />
            Por Produto ({data?.produtos_monofasicos?.length || 0})
          </button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder:text-gray-500 focus:border-[#C8A951] focus:outline-none"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#C8A951] focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="incluidos">Incluídos</option>
            <option value="excluidos">Excluídos pelo usuário</option>
          </select>
        </div>
      </div>

      {/* Ações em massa */}
      {selectedItems.size > 0 && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 flex items-center justify-between">
          <p className="text-white">
            {selectedItems.size} item(ns) selecionado(s)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('remover', Array.from(selectedItems))}
              disabled={processing}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Voltar para Tributação
            </button>
            <button
              onClick={() => handleAction('adicionar', Array.from(selectedItems))}
              disabled={processing}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Marcar como Monofásico
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1A1A1A]">
            <tr>
              <th className="px-4 py-3 text-left">
                <button 
                  onClick={toggleSelectAll}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">
                {activeTab === 'ncm' ? 'NCM' : 'PRODUTO'}
              </th>
              <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">TIPO</th>
              <th className="px-4 py-3 text-left text-gray-400 text-sm font-medium">MOTIVO</th>
              <th className="px-4 py-3 text-right text-gray-400 text-sm font-medium">VALOR TOTAL</th>
              <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">QTD</th>
              <th className="px-4 py-3 text-center text-gray-400 text-sm font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                  Nenhum {activeTab === 'ncm' ? 'NCM' : 'produto'} encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const id = item.ncm || item.produto;
                const isSelected = selectedItems.has(id);
                
                return (
                  <tr 
                    key={index} 
                    className={`border-t border-[#2A2A2A] ${isSelected ? 'bg-[#C8A951]/10' : 'hover:bg-[#1A1A1A]'}`}
                  >
                    <td className="px-4 py-3">
                      <button 
                        onClick={() => toggleSelectItem(id)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#C8A951]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-mono">{item.ncm || '-'}</p>
                        <p className="text-gray-500 text-sm truncate max-w-xs">
                          {item.descricao || item.produto || '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.tipo === 'COMBUSTIVEIS' ? 'bg-orange-500/20 text-orange-400' :
                        item.tipo === 'BEBIDAS' ? 'bg-blue-500/20 text-blue-400' :
                        item.tipo === 'AUTOPECAS' ? 'bg-purple-500/20 text-purple-400' :
                        item.tipo === 'FARMACIA' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.tipo || 'GERAL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {item.motivo || 'Classificação por NCM'}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {formatCurrency(item.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {item.quantidade || 1}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.incluido !== false ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          Monofásico
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          Tributado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-[#0A0A0A] text-center text-sm text-gray-500">
          Mostrando {filteredItems.length} de {
            activeTab === 'ncm' 
              ? (data?.ncms_monofasicos?.length || 0)
              : (data?.produtos_monofasicos?.length || 0)
          } itens
        </div>
      </div>
    </div>
  );
}
