import React, { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, DollarSign, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

/**
 * Componente de Painel Dinâmico para Grupos Empresariais
 * Exibe dados da Matriz, Filiais e Consolidado quando a empresa é matriz de um grupo
 */
const GrupoEmpresarialPanel = ({ 
  companyId, 
  competencia, 
  token,
  tipoImposto = 'pis_cofins', // 'pis_cofins', 'irpj_csll', 'todos'
  onDataLoaded
}) => {
  const [grupoData, setGrupoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFiliais, setExpandedFiliais] = useState(false);
  const [activeTab, setActiveTab] = useState('consolidado'); // 'matriz', 'filiais', 'consolidado'

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchGrupoData = async () => {
      if (!companyId || !competencia || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/empresa/${companyId}/impostos-grupo?competencia=${competencia}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );

        if (!response.ok) {
          throw new Error('Erro ao buscar dados do grupo');
        }

        const data = await response.json();
        setGrupoData(data);
        
        if (onDataLoaded) {
          onDataLoaded(data);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do grupo:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrupoData();
  }, [companyId, competencia, token, API_URL, onDataLoaded]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-[#2A2A2A] rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-[#2A2A2A] rounded"></div>
          <div className="h-24 bg-[#2A2A2A] rounded"></div>
          <div className="h-24 bg-[#2A2A2A] rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !grupoData?.is_grupo) {
    return null; // Não exibir nada se não for grupo
  }

  const { matriz, filiais, consolidado, grupo_nome } = grupoData;

  // Card de empresa individual
  const EmpresaCard = ({ empresa, isMatriz = false, isConsolidado = false }) => (
    <div className={`bg-[#0C0C0C] rounded-lg p-4 border ${
      isConsolidado 
        ? 'border-[#C8A951]/50 bg-gradient-to-r from-[#0C0C0C] to-[#1A1A1A]' 
        : isMatriz 
          ? 'border-blue-500/30' 
          : 'border-[#2A2A2A]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isConsolidado ? (
            <div className="w-8 h-8 rounded-lg bg-[#C8A951]/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#C8A951]" />
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-lg ${isMatriz ? 'bg-blue-500/20' : 'bg-[#2A2A2A]'} flex items-center justify-center`}>
              <Building2 className={`w-4 h-4 ${isMatriz ? 'text-blue-400' : 'text-[#A1A1AA]'}`} />
            </div>
          )}
          <div>
            <h4 className={`font-semibold ${isConsolidado ? 'text-[#C8A951]' : 'text-white'}`}>
              {isConsolidado ? 'CONSOLIDADO' : empresa?.razao_social}
            </h4>
            {!isConsolidado && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isMatriz ? 'bg-blue-500/20 text-blue-400' : 'bg-[#2A2A2A] text-[#A1A1AA]'
              }`}>
                {isMatriz ? 'MATRIZ' : 'FILIAL'}
              </span>
            )}
          </div>
        </div>
        {!isConsolidado && (
          <span className="text-sm text-[#A1A1AA]">{formatCurrency(empresa?.faturamento)}</span>
        )}
      </div>

      {/* Valores dos impostos */}
      <div className="space-y-2">
        {(tipoImposto === 'pis_cofins' || tipoImposto === 'todos') && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A1AA]">PIS a pagar:</span>
              <span className="text-blue-400 font-medium">
                {formatCurrency(isConsolidado ? consolidado?.pis?.a_pagar : empresa?.pis?.a_pagar)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A1AA]">COFINS a pagar:</span>
              <span className="text-blue-400 font-medium">
                {formatCurrency(isConsolidado ? consolidado?.cofins?.a_pagar : empresa?.cofins?.a_pagar)}
              </span>
            </div>
          </>
        )}
        
        {(tipoImposto === 'irpj_csll' || tipoImposto === 'todos') && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A1AA]">IRPJ:</span>
              <span className="text-purple-400 font-medium">
                {formatCurrency(isConsolidado ? consolidado?.irpj?.total : empresa?.irpj?.total)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A1AA]">CSLL:</span>
              <span className="text-purple-400 font-medium">
                {formatCurrency(isConsolidado ? consolidado?.csll?.devido : empresa?.csll?.devido)}
              </span>
            </div>
          </>
        )}

        <div className="flex justify-between text-sm pt-2 border-t border-[#2A2A2A]">
          <span className="text-white font-medium">Total Federal:</span>
          <span className={`font-bold ${isConsolidado ? 'text-[#C8A951]' : 'text-white'}`}>
            {formatCurrency(isConsolidado ? consolidado?.total_federal : empresa?.total_federal)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#141414] border border-[#C8A951]/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C8A951]/10 to-transparent p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#C8A951]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#C8A951]" />
            </div>
            <div>
              <h3 className="font-bold text-white">{grupo_nome}</h3>
              <p className="text-sm text-[#A1A1AA]">
                {1 + filiais.length} empresas • Competência {competencia}
              </p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 bg-[#0C0C0C] rounded-lg p-1">
            {['consolidado', 'matriz', 'filiais'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-[#C8A951] text-black'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {tab === 'consolidado' ? 'Consolidado' : tab === 'matriz' ? 'Matriz' : `Filiais (${filiais.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'consolidado' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EmpresaCard empresa={matriz} isMatriz />
            {filiais.length > 0 && (
              <div className="space-y-2">
                {filiais.slice(0, 2).map((filial) => (
                  <EmpresaCard key={filial.id} empresa={filial} />
                ))}
                {filiais.length > 2 && (
                  <button 
                    onClick={() => setActiveTab('filiais')}
                    className="w-full text-center text-sm text-[#C8A951] hover:underline"
                  >
                    +{filiais.length - 2} filiais
                  </button>
                )}
              </div>
            )}
            <EmpresaCard isConsolidado />
          </div>
        )}

        {activeTab === 'matriz' && (
          <EmpresaCard empresa={matriz} isMatriz />
        )}

        {activeTab === 'filiais' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filiais.map((filial) => (
              <EmpresaCard key={filial.id} empresa={filial} />
            ))}
            {filiais.length === 0 && (
              <div className="col-span-2 text-center py-8 text-[#A1A1AA]">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p>Este grupo não possui filiais cadastradas</p>
              </div>
            )}
          </div>
        )}

        {/* Resumo do consolidado sempre visível */}
        {activeTab !== 'consolidado' && (
          <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#A1A1AA]">Total Federal Consolidado:</span>
              <span className="text-lg font-bold text-[#C8A951]">
                {formatCurrency(consolidado?.total_federal)}
                <span className="text-sm text-[#A1A1AA] ml-2">
                  ({consolidado?.percentual}% do faturamento)
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrupoEmpresarialPanel;
