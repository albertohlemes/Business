import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, CheckCircle, TrendingUp, Info, RefreshCw,
  ArrowUpCircle, Filter, Download, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnaliseAliquotasSaida = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtroAlerta, setFiltroAlerta] = useState('todos');
  const [grouped, setGrouped] = useState(false);
  
  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchAnalise();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchAnalise = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analise-aliquotas-saida/${selectedCompany.id}?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalise(response.data);
    } catch (err) {
      console.error('Erro ao carregar análise:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getAlertColor = (tipo) => {
    switch (tipo) {
      case 'atencao': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'erro': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Função de ordenação
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtrar, Agrupar e Ordenar produtos
  const sortedProducts = useMemo(() => {
    let list = analise?.produtos || [];

    // 1. Agrupamento
    if (grouped) {
      const groups = {};
      list.forEach(p => {
        const key = `${p.codigo}|${p.ncm}`;
        if (!groups[key]) {
          groups[key] = {
            ...p,
            valor_total: 0,
            valores: { icms: 0, pis: 0, cofins: 0 },
            alertas: [],
            documento: 'Vários',
            count: 0
          };
        }
        const g = groups[key];
        g.count += 1;
        g.valor_total += p.valor_total || 0;
        g.valores.icms += p.valores?.icms || 0;
        g.valores.pis += p.valores?.pis || 0;
        g.valores.cofins += p.valores?.cofins || 0;
        
        // Unificar alertas
        p.alertas.forEach(a => {
          if (!g.alertas.some(ea => ea.mensagem === a.mensagem && ea.imposto === a.imposto)) {
            g.alertas.push(a);
          }
        });
      });
      list = Object.values(groups);
    }

    // 2. Filtro
    list = list.filter(p => {
      if (filtroAlerta === 'com_alerta') return p.alertas.length > 0;
      if (filtroAlerta === 'sem_alerta') return p.alertas.length === 0;
      return true;
    });

    // 3. Ordenação
    if (sortConfig.key) {
      list.sort((a, b) => {
        let aVal, bVal;
        
        // Acessar valores aninhados
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aVal = a[keys[0]]?.[keys[1]] ?? 0;
          bVal = b[keys[0]]?.[keys[1]] ?? 0;
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }
        
        // Tratar strings
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal, 'pt-BR')
            : bVal.localeCompare(aVal, 'pt-BR');
        }
        
        // Tratar números
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
        
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return list;
  }, [analise?.produtos, filtroAlerta, sortConfig, grouped]);

  // Componente de cabeçalho ordenável
  const SortableHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <th 
        className={`px-3 py-2 text-left cursor-pointer hover:bg-gray-100 select-none ${className}`}
        onClick={() => requestSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          <span className="text-gray-600 text-xs font-medium">{label}</span>
          <div className="flex flex-col">
            <ChevronUp className={`w-3 h-3 -mb-1 ${isActive && sortConfig.direction === 'asc' ? 'text-red-600' : 'text-gray-300'}`} />
            <ChevronDown className={`w-3 h-3 ${isActive && sortConfig.direction === 'desc' ? 'text-red-600' : 'text-gray-300'}`} />
          </div>
        </div>
      </th>
    );
  };

  const exportToCSV = () => {
    if (!analise || !sortedProducts.length) return;
    
    const headers = 'NF-e,Código,NCM,Descrição,Valor Total,ICMS %,PIS %,COFINS %,ICMS R$,PIS R$,COFINS R$,Alíq Zero,Alertas\n';
    const rows = sortedProducts.map(p => {
      const alertasText = p.alertas.map(a => a.mensagem).join('; ');
      return [
        p.documento,
        p.codigo,
        p.ncm,
        `"${(p.descricao || '').replace(/"/g, '""')}"`,
        p.valor_total?.toFixed(2),
        p.aliquotas?.icms?.toFixed(2),
        p.aliquotas?.pis?.toFixed(2),
        p.aliquotas?.cofins?.toFixed(2),
        p.valores?.icms?.toFixed(2),
        p.valores?.pis?.toFixed(2),
        p.valores?.cofins?.toFixed(2),
        p.ncm_aliq_zero ? 'Sim' : 'Não',
        `"${alertasText}"`
      ].join(',');
    }).join('\n');
    
    const BOM = '\uFEFF';
    const csv = BOM + headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analise_aliquotas_saida_${selectedCompetencia.replace('/', '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-aliquotas-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ArrowUpCircle className="w-7 h-7" />
                Análise de Alíquotas - NFs de Saída
              </h1>
              <p className="text-orange-100 mt-1">
                Verificação de ICMS, PIS e COFINS nas notas de saída
              </p>
            </div>
            
            <button
              onClick={fetchAnalise}
              disabled={loading || !selectedCompany}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {!selectedCompany ? (
          <div className="bg-yellow-50 rounded-xl p-8 text-center border border-yellow-200">
            <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-yellow-900 mb-2">Selecione uma Empresa</h3>
            <p className="text-yellow-700">
              Clique no botão no header para selecionar a empresa e competência
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-gray-600">Analisando alíquotas...</p>
          </div>
        ) : analise ? (
          <>
            {/* Info empresa */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-600">Analisando</p>
                  <p className="font-bold text-gray-900">{analise.empresa}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500">Competência: {analise.competencia}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      analise.regime_tributario === 'lucro_real' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {analise.regime_tributario === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'}
                    </span>
                    <span className="text-sm text-gray-500">UF: {analise.uf}</span>
                  </div>
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={sortedProducts.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Alíquotas Esperadas */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Alíquotas Esperadas ({analise.regime_tributario === 'lucro_real' ? 'Lucro Real' : 'Lucro Presumido'} - {analise.uf}):</p>
                  <div className="flex gap-6">
                    <span>• ICMS: <strong>{analise.aliquotas_esperadas?.icms}%</strong></span>
                    <span>• PIS: <strong>{analise.aliquotas_esperadas?.pis}%</strong></span>
                    <span>• COFINS: <strong>{analise.aliquotas_esperadas?.cofins}%</strong></span>
                  </div>
                  <p className="mt-1 text-blue-600">
                    Alíquotas zeradas de NCM com regime especial (monofásico/alíq. zero) não geram alerta.
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-600">Documentos de Saída</p>
                <p className="text-2xl font-bold text-gray-900">{analise.total_documentos_saida}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-600">Total de Produtos</p>
                <p className="text-2xl font-bold text-gray-900">{analise.total_produtos}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-600">Produtos OK</p>
                <p className="text-2xl font-bold text-green-600">
                  {analise.total_produtos - analise.produtos_com_alerta}
                </p>
              </div>
              <div className={`rounded-xl p-4 shadow-sm border ${analise.produtos_com_alerta > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                <p className="text-sm text-gray-600">Com Alertas</p>
                <p className={`text-2xl font-bold ${analise.produtos_com_alerta > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {analise.produtos_com_alerta}
                </p>
              </div>
            </div>

            {/* Resumo de Alertas por Imposto */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Alertas por Imposto</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{analise.resumo_alertas?.total || 0}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{analise.resumo_alertas?.icms || 0}</p>
                  <p className="text-sm text-blue-700">ICMS</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{analise.resumo_alertas?.pis || 0}</p>
                  <p className="text-sm text-purple-700">PIS</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <p className="text-2xl font-bold text-pink-600">{analise.resumo_alertas?.cofins || 0}</p>
                  <p className="text-sm text-pink-700">COFINS</p>
                </div>
              </div>
            </div>

            {/* Filtro + Lista de Produtos */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
                <h3 className="font-semibold text-gray-900">
                  Produtos Analisados ({sortedProducts.length})
                </h3>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltroAlerta('todos')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtroAlerta === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroAlerta('com_alerta')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtroAlerta === 'com_alerta' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Com Alertas
                  </button>
                  <button
                    onClick={() => setFiltroAlerta('sem_alerta')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      filtroAlerta === 'sem_alerta' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    OK
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto">
                  {sortedProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {analise.total_produtos === 0 
                        ? 'Nenhuma NF de saída na competência selecionada'
                        : 'Nenhum produto com o filtro selecionado'
                      }
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <SortableHeader label="NF-e" sortKey="documento" />
                          <SortableHeader label="Código" sortKey="codigo" />
                          <SortableHeader label="NCM" sortKey="ncm" />
                          <SortableHeader label="Descrição" sortKey="descricao" className="min-w-[200px]" />
                          <SortableHeader label="Valor" sortKey="valor_total" />
                          <SortableHeader label="ICMS %" sortKey="aliquotas.icms" />
                          <SortableHeader label="PIS %" sortKey="aliquotas.pis" />
                          <SortableHeader label="COFINS %" sortKey="aliquotas.cofins" />
                          <th className="px-3 py-2 text-center text-gray-600 text-xs font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedProducts.map((produto, idx) => (
                          <tr key={idx} className={produto.alertas.length > 0 ? 'bg-orange-50/50' : ''}>
                            <td className="px-3 py-2 text-gray-900 font-medium">{produto.documento}</td>
                            <td className="px-3 py-2 text-gray-700 font-mono text-xs">{produto.codigo}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-700 font-mono text-xs">{produto.ncm}</span>
                                {produto.ncm_aliq_zero && (
                                  <span className="px-1 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-medium" title="NCM com alíquota zero">
                                    AZ
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <p className="text-gray-900 truncate max-w-[200px]" title={produto.descricao}>
                                {produto.descricao}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {formatCurrency(produto.valor_total)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                produto.aliquotas?.icms === 0 ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {formatPercent(produto.aliquotas?.icms)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                produto.aliquotas?.pis === 0 
                                  ? (produto.ncm_aliq_zero ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {formatPercent(produto.aliquotas?.pis)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                produto.aliquotas?.cofins === 0 
                                  ? (produto.ncm_aliq_zero ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')
                                  : 'bg-pink-100 text-pink-800'
                              }`}>
                                {formatPercent(produto.aliquotas?.cofins)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {produto.alertas.length === 0 ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <div className="relative group">
                                  <AlertTriangle className="w-5 h-5 text-orange-500 mx-auto cursor-help" />
                                  <div className="absolute right-0 top-6 z-10 hidden group-hover:block w-72 p-2 bg-white border rounded-lg shadow-lg">
                                    {produto.alertas.map((alerta, i) => (
                                      <div key={i} className={`p-2 mb-1 rounded text-xs border ${getAlertColor(alerta.tipo)}`}>
                                        <strong>{alerta.imposto}:</strong> {alerta.mensagem}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default AnaliseAliquotasSaida;
