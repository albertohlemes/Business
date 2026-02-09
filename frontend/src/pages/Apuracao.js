import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  RefreshCw, Building2, FileText, ArrowDownCircle, ArrowUpCircle,
  ChevronUp, ChevronDown, ChevronsUpDown, Download, Package
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Apuracao = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [activeTab, setActiveTab] = useState('entradas');
  
  // Estados de ordenação
  const [sortConfig, setSortConfig] = useState({ key: 'cfop', direction: 'asc' });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(
        `${API}/apuracao-movimento/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers }
      );
      
      setDados(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Função de ordenação
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Componente de header ordenável
  const SortableHeader = ({ label, sortKey, className = '' }) => {
    const isActive = sortConfig.key === sortKey;
    
    return (
      <th 
        className={`px-4 py-3 text-[#A1A1AA] font-medium cursor-pointer hover:bg-[#1A1A1A] transition-colors select-none ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          <span className="text-[#666]">
            {isActive ? (
              sortConfig.direction === 'asc' ? (
                <ChevronUp className="w-4 h-4 text-[#C8A951]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#C8A951]" />
              )
            ) : (
              <ChevronsUpDown className="w-3 h-3" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!dados) return [];
    
    const dataToSort = activeTab === 'entradas' 
      ? dados.entradas?.por_cfop || []
      : dados.saidas?.por_cfop || [];
    
    return [...dataToSort].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Ordenação numérica ou string
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [dados, activeTab, sortConfig]);

  // Totais ativos
  const totais = useMemo(() => {
    if (!dados) return null;
    return activeTab === 'entradas' ? dados.entradas?.totais : dados.saidas?.totais;
  }, [dados, activeTab]);

  // Exportar para Excel
  const exportarExcel = async () => {
    if (!dados) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/relatorio-consolidado/${selectedCompany.id}/exportar?competencia=${encodeURIComponent(selectedCompetencia)}&secoes=resumo`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `apuracao_${selectedCompany.cnpj}_${selectedCompetencia.replace('/', '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  if (!selectedCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a apuração</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6 pb-8" data-testid="apuracao-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-[#C8A951]" />
              Apuração - Resumo do Movimento
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              Movimento do período agrupado por CFOP
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
              data-testid="btn-atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={exportarExcel}
              disabled={!dados}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8A951] text-black rounded-lg hover:bg-[#B8993D] transition-colors font-medium disabled:opacity-50"
              data-testid="btn-exportar"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Info da Empresa */}
        {dados && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-[#C8A951]" />
                <div>
                  <p className="text-white font-semibold">{dados.empresa?.razao_social}</p>
                  <p className="text-[#A1A1AA] text-sm">
                    CNPJ: {dados.empresa?.cnpj} | Competência: {dados.competencia} |
                    Regime: <span className="text-[#C8A951]">{dados.empresa?.regime_tributario?.replace('_', ' ')?.toUpperCase()}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2A2A2A] pb-3">
          <button
            onClick={() => setActiveTab('entradas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'entradas'
                ? 'bg-blue-600 text-white'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-entradas"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Entradas
            {dados?.entradas?.totais && (
              <span className="bg-blue-500/30 text-xs px-2 py-0.5 rounded-full">
                {dados.entradas.totais.qtd_docs} docs
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('saidas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'saidas'
                ? 'bg-green-600 text-white'
                : 'bg-[#2A2A2A] text-[#A1A1AA] hover:bg-[#333]'
            }`}
            data-testid="tab-saidas"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Saídas
            {dados?.saidas?.totais && (
              <span className="bg-green-500/30 text-xs px-2 py-0.5 rounded-full">
                {dados.saidas.totais.qtd_docs} docs
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : dados ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
            {/* Cards de Resumo */}
            {totais && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-[#0C0C0C] border-b border-[#2A2A2A]">
                <div className="bg-[#141414] rounded-lg p-3">
                  <p className="text-[#666] text-xs mb-1">Documentos</p>
                  <p className="text-white font-bold text-lg">{totais.qtd_docs}</p>
                </div>
                <div className="bg-[#141414] rounded-lg p-3">
                  <p className="text-[#666] text-xs mb-1">Produtos</p>
                  <p className="text-white font-bold text-lg">{totais.qtd_produtos}</p>
                </div>
                <div className="bg-[#141414] rounded-lg p-3">
                  <p className="text-[#666] text-xs mb-1">Valor Total</p>
                  <p className={`font-bold text-lg ${activeTab === 'entradas' ? 'text-blue-400' : 'text-green-400'}`}>
                    {formatCurrency(totais.valor_total)}
                  </p>
                </div>
                <div className="bg-[#141414] rounded-lg p-3">
                  <p className="text-[#666] text-xs mb-1">ICMS</p>
                  <p className="text-[#C8A951] font-bold text-lg">{formatCurrency(totais.valor_icms)}</p>
                </div>
                <div className="bg-[#141414] rounded-lg p-3">
                  <p className="text-[#666] text-xs mb-1">PIS + COFINS</p>
                  <p className="text-purple-400 font-bold text-lg">
                    {formatCurrency((totais.valor_pis || 0) + (totais.valor_cofins || 0))}
                  </p>
                </div>
                <div className="bg-[#141414] rounded-lg p-3">
                  <p className="text-[#666] text-xs mb-1">IPI</p>
                  <p className="text-orange-400 font-bold text-lg">{formatCurrency(totais.valor_ipi)}</p>
                </div>
              </div>
            )}

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="tabela-apuracao">
                <thead className="bg-[#0C0C0C]">
                  <tr>
                    <SortableHeader label="CFOP" sortKey="cfop" className="text-left" />
                    <SortableHeader label="Descrição" sortKey="descricao" className="text-left" />
                    <SortableHeader label="Docs" sortKey="qtd_docs" className="text-right" />
                    <SortableHeader label="Produtos" sortKey="qtd_produtos" className="text-right" />
                    <SortableHeader label="Valor Total" sortKey="valor_total" className="text-right" />
                    <SortableHeader label="BC ICMS" sortKey="bc_icms" className="text-right" />
                    <SortableHeader label="ICMS" sortKey="valor_icms" className="text-right" />
                    <SortableHeader label="PIS" sortKey="valor_pis" className="text-right" />
                    <SortableHeader label="COFINS" sortKey="valor_cofins" className="text-right" />
                    <SortableHeader label="IPI" sortKey="valor_ipi" className="text-right" />
                    <SortableHeader label="ICMS-ST" sortKey="icms_st" className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A2A]">
                  {sortedData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#1A1A1A]" data-testid={`row-cfop-${item.cfop}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[#C8A951] font-semibold">{item.cfop}</span>
                      </td>
                      <td className="px-4 py-3 text-white max-w-xs truncate" title={item.descricao}>
                        {item.descricao}
                      </td>
                      <td className="px-4 py-3 text-right text-[#A1A1AA]">{item.qtd_docs}</td>
                      <td className="px-4 py-3 text-right text-[#A1A1AA]">{item.qtd_produtos}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(item.valor_total)}</td>
                      <td className="px-4 py-3 text-right text-[#A1A1AA]">{formatCurrency(item.bc_icms)}</td>
                      <td className="px-4 py-3 text-right text-[#C8A951] font-medium">{formatCurrency(item.valor_icms)}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(item.valor_pis)}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(item.valor_cofins)}</td>
                      <td className="px-4 py-3 text-right text-orange-400">{formatCurrency(item.valor_ipi)}</td>
                      <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(item.icms_st)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer com totais */}
                {totais && (
                  <tfoot className="bg-[#0C0C0C] border-t-2 border-[#C8A951]">
                    <tr>
                      <td className="px-4 py-3 text-[#C8A951] font-bold">TOTAL</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-white font-bold">{totais.qtd_docs}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{totais.qtd_produtos}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{formatCurrency(totais.valor_total)}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{formatCurrency(totais.bc_icms)}</td>
                      <td className="px-4 py-3 text-right text-[#C8A951] font-bold">{formatCurrency(totais.valor_icms)}</td>
                      <td className="px-4 py-3 text-right text-purple-400 font-bold">{formatCurrency(totais.valor_pis)}</td>
                      <td className="px-4 py-3 text-right text-purple-400 font-bold">{formatCurrency(totais.valor_cofins)}</td>
                      <td className="px-4 py-3 text-right text-orange-400 font-bold">{formatCurrency(totais.valor_ipi)}</td>
                      <td className="px-4 py-3 text-right text-blue-400 font-bold">{formatCurrency(totais.icms_st)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            
            {sortedData.length === 0 && (
              <div className="text-center py-12 text-[#A1A1AA]">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum documento encontrado para esta competência</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-[#A1A1AA]">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Selecione uma competência para visualizar a apuração</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Apuracao;
