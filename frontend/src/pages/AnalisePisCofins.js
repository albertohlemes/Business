import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  AlertTriangle, CheckCircle, RefreshCw, XCircle,
  Download, ChevronDown, DollarSign, AlertCircle,
  Search, TrendingUp, TrendingDown, FileText, Package
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnalisePisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtroProblema, setFiltroProblema] = useState('todos');
  const [busca, setBusca] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/analise-pis-cofins-completa/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDados(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedCompetencia]);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
    }
  }, [selectedCompany, selectedCompetencia, fetchData]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // Classificar problemas de forma mais clara
  const classificarProblema = (prod) => {
    const temPisXml = (prod.v_pis_atual || 0) > 0;
    const temCofinsXml = (prod.v_cofins_atual || 0) > 0;
    const deveriaTerPis = (prod.v_pis_correto || 0) > 0;
    const deveriaTerCofins = (prod.v_cofins_correto || 0) > 0;
    
    // CST errado
    const cstPisErrado = prod.cst_pis_atual !== prod.cst_pis_correto;
    const cstCofinsErrado = prod.cst_cofins_atual !== prod.cst_cofins_correto;
    
    // Destacou indevidamente (pagou a mais)
    const destacouIndevidamentePis = temPisXml && !deveriaTerPis;
    const destacouIndevidamenteCofins = temCofinsXml && !deveriaTerCofins;
    
    // Não destacou quando deveria (pagou a menos)
    const naoDestacouPis = !temPisXml && deveriaTerPis;
    const naoDestacouCofins = !temCofinsXml && deveriaTerCofins;
    
    // Alíquota incorreta (tem valor mas diferente do correto)
    const aliqIncorretaPis = temPisXml && deveriaTerPis && Math.abs((prod.v_pis_atual || 0) - (prod.v_pis_correto || 0)) > 0.01;
    const aliqIncorretaCofins = temCofinsXml && deveriaTerCofins && Math.abs((prod.v_cofins_atual || 0) - (prod.v_cofins_correto || 0)) > 0.01;
    
    return {
      cstErrado: cstPisErrado || cstCofinsErrado,
      destacouIndevidamente: destacouIndevidamentePis || destacouIndevidamenteCofins,
      naoDestacou: naoDestacouPis || naoDestacouCofins,
      aliqIncorreta: aliqIncorretaPis || aliqIncorretaCofins,
      impactoPis: (prod.v_pis_atual || 0) - (prod.v_pis_correto || 0),
      impactoCofins: (prod.v_cofins_atual || 0) - (prod.v_cofins_correto || 0),
      impactoTotal: ((prod.v_pis_atual || 0) - (prod.v_pis_correto || 0)) + ((prod.v_cofins_atual || 0) - (prod.v_cofins_correto || 0))
    };
  };

  // Lista processada de problemas
  const problemas = useMemo(() => {
    if (!dados?.divergencias) return [];
    
    let lista = [];
    dados.divergencias.forEach(doc => {
      doc.produtos.forEach(prod => {
        if (prod.divergente !== false) {
          const classificacao = classificarProblema(prod);
          lista.push({
            ...prod,
            numero_nfe: doc.numero_nfe,
            cliente: doc.cliente,
            ...classificacao,
            // Determinar tipo principal do problema
            tipoProblema: classificacao.destacouIndevidamente ? 'DESTACOU_INDEVIDO' :
                          classificacao.naoDestacou ? 'NAO_DESTACOU' :
                          classificacao.cstErrado ? 'CST_ERRADO' :
                          classificacao.aliqIncorreta ? 'ALIQ_INCORRETA' : 'OUTRO'
          });
        }
      });
    });
    
    // Filtrar por tipo de problema
    if (filtroProblema !== 'todos') {
      lista = lista.filter(p => p.tipoProblema === filtroProblema);
    }
    
    // Filtrar por busca
    if (busca) {
      const s = busca.toLowerCase();
      lista = lista.filter(p => 
        p.descricao?.toLowerCase().includes(s) || 
        p.ncm?.includes(busca) ||
        p.numero_nfe?.includes(busca)
      );
    }
    
    // Ordenar por impacto (maior primeiro)
    return lista.sort((a, b) => Math.abs(b.impactoTotal) - Math.abs(a.impactoTotal));
  }, [dados, filtroProblema, busca]);

  // Contadores por tipo
  const contadores = useMemo(() => {
    if (!dados?.divergencias) return { destacouIndevido: 0, naoDestacou: 0, cstErrado: 0, aliqIncorreta: 0 };
    
    let cont = { destacouIndevido: 0, naoDestacou: 0, cstErrado: 0, aliqIncorreta: 0 };
    dados.divergencias.forEach(doc => {
      doc.produtos.forEach(prod => {
        if (prod.divergente !== false) {
          const c = classificarProblema(prod);
          if (c.destacouIndevidamente) cont.destacouIndevido++;
          else if (c.naoDestacou) cont.naoDestacou++;
          else if (c.cstErrado) cont.cstErrado++;
          else if (c.aliqIncorreta) cont.aliqIncorreta++;
        }
      });
    });
    return cont;
  }, [dados]);

  const exportCSV = () => {
    if (!problemas.length) return;
    const headers = ['NF', 'Produto', 'NCM', 'Valor', 'Problema', 'CST PIS XML', 'CST PIS Correto', 'PIS XML', 'PIS Correto', 'CST COF XML', 'CST COF Correto', 'COF XML', 'COF Correto', 'Impacto'];
    const rows = problemas.map(p => [
      p.numero_nfe, p.descricao, p.ncm, p.valor_produto,
      p.tipoProblema, p.cst_pis_atual, p.cst_pis_correto, p.v_pis_atual, p.v_pis_correto,
      p.cst_cofins_atual, p.cst_cofins_correto, p.v_cofins_atual, p.v_cofins_correto, p.impactoTotal
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_pis_cofins_${selectedCompetencia.replace('/', '-')}.csv`;
    link.click();
  };

  const toggleExpand = (idx) => {
    setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Componente de Card de Problema
  const ProblemaCard = ({ item, idx }) => {
    const isExpanded = expandedItems[idx];
    const impactoPositivo = item.impactoTotal > 0; // Pagou a mais (crédito a recuperar)
    
    // Ícone e cor baseado no tipo de problema
    const getProblemaStyle = () => {
      switch(item.tipoProblema) {
        case 'DESTACOU_INDEVIDO':
          return { 
            icon: <TrendingUp className="w-5 h-5" />, 
            bg: 'bg-green-50 border-green-300', 
            iconBg: 'bg-green-500',
            label: 'Destacou Indevidamente',
            sublabel: 'Pagou a mais - Crédito a recuperar'
          };
        case 'NAO_DESTACOU':
          return { 
            icon: <TrendingDown className="w-5 h-5" />, 
            bg: 'bg-red-50 border-red-300', 
            iconBg: 'bg-red-500',
            label: 'Não Destacou',
            sublabel: 'Pagou a menos - Passivo tributário'
          };
        case 'CST_ERRADO':
          return { 
            icon: <XCircle className="w-5 h-5" />, 
            bg: 'bg-orange-50 border-orange-300', 
            iconBg: 'bg-orange-500',
            label: 'CST Incorreto',
            sublabel: 'Código de situação tributária errado'
          };
        case 'ALIQ_INCORRETA':
          return { 
            icon: <AlertCircle className="w-5 h-5" />, 
            bg: 'bg-amber-500/10 border-yellow-300', 
            iconBg: 'bg-amber-500/100',
            label: 'Alíquota Incorreta',
            sublabel: 'Valor calculado diferente do esperado'
          };
        default:
          return { 
            icon: <AlertTriangle className="w-5 h-5" />, 
            bg: 'bg-[#0C0C0C] border-[#333333]', 
            iconBg: 'bg-[#0C0C0C]0',
            label: 'Outro',
            sublabel: 'Divergência identificada'
          };
      }
    };
    
    const style = getProblemaStyle();
    
    return (
      <div className={`rounded-lg border-2 ${style.bg} overflow-hidden transition-all`}>
        {/* Header do card - sempre visível */}
        <div 
          className="p-3 cursor-pointer hover:bg-[#141414]/50 transition-colors"
          onClick={() => toggleExpand(idx)}
        >
          <div className="flex items-start gap-3">
            {/* Ícone do tipo de problema */}
            <div className={`${style.iconBg} text-white p-2 rounded-lg shrink-0`}>
              {style.icon}
            </div>
            
            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white">{item.descricao?.substring(0, 40)}{item.descricao?.length > 40 ? '...' : ''}</span>
                <span className="text-xs font-mono bg-[#2A2A2A] px-1.5 py-0.5 rounded">{item.ncm}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-[#A1A1AA]">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  NF {item.numero_nfe}
                </span>
                <span>•</span>
                <span className="font-semibold">{style.label}</span>
              </div>
            </div>
            
            {/* Impacto */}
            <div className="text-right shrink-0">
              <div className={`text-lg font-bold ${impactoPositivo ? 'text-green-600' : 'text-[#C8A951]'}`}>
                {impactoPositivo ? '+' : ''}{formatCurrency(item.impactoTotal)}
              </div>
              <div className="text-xs text-[#A1A1AA]">{style.sublabel}</div>
            </div>
            
            {/* Chevron */}
            <ChevronDown className={`w-5 h-5 text-[#666666] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
        
        {/* Detalhes expandidos */}
        {isExpanded && (
          <div className="border-t bg-[#141414] p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PIS */}
              <div className="space-y-2">
                <h4 className="font-semibold text-[#E0E0E0] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  PIS
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-xs text-[#C8A951] font-medium">No XML</p>
                    <p className="font-mono">CST: {item.cst_pis_atual || '-'}</p>
                    <p className="font-bold">{formatCurrency(item.v_pis_atual)}</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs text-green-600 font-medium">Correto</p>
                    <p className="font-mono">CST: {item.cst_pis_correto || '-'}</p>
                    <p className="font-bold">{formatCurrency(item.v_pis_correto)}</p>
                  </div>
                </div>
                {item.impactoPis !== 0 && (
                  <div className={`text-sm font-medium ${item.impactoPis > 0 ? 'text-green-600' : 'text-[#C8A951]'}`}>
                    Diferença: {item.impactoPis > 0 ? '+' : ''}{formatCurrency(item.impactoPis)}
                  </div>
                )}
              </div>
              
              {/* COFINS */}
              <div className="space-y-2">
                <h4 className="font-semibold text-[#E0E0E0] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  COFINS
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-xs text-[#C8A951] font-medium">No XML</p>
                    <p className="font-mono">CST: {item.cst_cofins_atual || '-'}</p>
                    <p className="font-bold">{formatCurrency(item.v_cofins_atual)}</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs text-green-600 font-medium">Correto</p>
                    <p className="font-mono">CST: {item.cst_cofins_correto || '-'}</p>
                    <p className="font-bold">{formatCurrency(item.v_cofins_correto)}</p>
                  </div>
                </div>
                {item.impactoCofins !== 0 && (
                  <div className={`text-sm font-medium ${item.impactoCofins > 0 ? 'text-green-600' : 'text-[#C8A951]'}`}>
                    Diferença: {item.impactoCofins > 0 ? '+' : ''}{formatCurrency(item.impactoCofins)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Info adicional */}
            <div className="mt-3 pt-3 border-t text-sm text-[#A1A1AA] flex items-center gap-4">
              <span>Valor do Produto: <strong>{formatCurrency(item.valor_produto)}</strong></span>
              <span>CFOP: <strong>{item.cfop}</strong></span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!selectedCompany || !selectedCompetencia) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#E0E0E0]">Selecione uma empresa e competência</h2>
          </div>
        </div>
      </Layout>
    );
  }

  const diferenca = dados?.resumo?.diferenca_total || 0;
  const pagoAMais = diferenca > 0 ? diferenca : 0;
  const pagoAMenos = diferenca < 0 ? Math.abs(diferenca) : 0;

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="analise-pis-cofins-page" className="flex flex-col h-[calc(100vh-80px)]">
        {/* Header Fixo */}
        <div className="flex-shrink-0 space-y-4 pb-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-700 to-red-800 rounded-lg p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <DollarSign className="w-6 h-6" /> Auditoria de PIS/COFINS
                </h1>
                <p className="text-[#A1A1AA] text-sm mt-1">
                  Competência {selectedCompetencia} • Regime: {dados?.regime_tributario || '-'}
                  {dados?.aliquotas_regime && ` (PIS ${dados.aliquotas_regime.pis}% / COFINS ${dados.aliquotas_regime.cofins}%)`}
                </p>
              </div>
              <button onClick={fetchData} disabled={loading} className="px-3 py-2 bg-[#141414]/20 hover:bg-[#141414]/30 rounded-lg flex items-center gap-2 text-sm">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C8A951]" />
            </div>
          ) : dados ? (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#141414] rounded-lg p-4 border shadow-sm">
                  <p className="text-xs text-[#A1A1AA] uppercase font-medium">Total Analisado</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(dados.resumo?.total_valor_saidas)}</p>
                  <p className="text-xs text-[#666666] mt-1">{dados.total_documentos} NFs • {dados.total_produtos} itens</p>
                </div>
                
                <div className="bg-[#141414] rounded-lg p-4 border shadow-sm">
                  <p className="text-xs text-[#A1A1AA] uppercase font-medium">Divergências</p>
                  <p className="text-2xl font-bold text-amber-600">{dados.total_divergentes}</p>
                  <p className="text-xs text-[#666666] mt-1">itens com problema</p>
                </div>
              
              <div className={`rounded-lg p-4 border shadow-sm ${pagoAMais > 0 ? 'bg-green-50 border-green-200' : 'bg-[#141414]'}`}>
                <p className="text-xs text-green-700 uppercase font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Crédito a Recuperar
                </p>
                <p className={`text-2xl font-bold ${pagoAMais > 0 ? 'text-green-600' : 'text-[#666666]'}`}>
                  {formatCurrency(pagoAMais)}
                </p>
                <p className="text-xs text-green-600 mt-1">Pagou a mais</p>
              </div>
              
              <div className={`rounded-lg p-4 border shadow-sm ${pagoAMenos > 0 ? 'bg-red-50 border-red-200' : 'bg-[#141414]'}`}>
                <p className="text-xs text-red-700 uppercase font-medium flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Passivo Tributário
                </p>
                <p className={`text-2xl font-bold ${pagoAMenos > 0 ? 'text-[#C8A951]' : 'text-[#666666]'}`}>
                  {formatCurrency(pagoAMenos)}
                </p>
                <p className="text-xs text-[#C8A951] mt-1">Pagou a menos</p>
              </div>
            </div>

            {/* Filtros por Tipo de Problema */}
            {dados.total_divergentes > 0 && (
              <div className="bg-[#141414] rounded-lg p-4 border shadow-sm">
                <p className="text-xs text-[#A1A1AA] uppercase font-medium mb-3">Filtrar por Tipo de Problema</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setFiltroProblema('todos')} 
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filtroProblema === 'todos' 
                        ? 'bg-gray-800 text-white shadow' 
                        : 'bg-[#1A1A1A] text-[#E0E0E0] hover:bg-[#2A2A2A]'
                    }`}
                  >
                    Todos ({dados.total_divergentes})
                  </button>
                  
                  {contadores.destacouIndevido > 0 && (
                    <button 
                      onClick={() => setFiltroProblema(filtroProblema === 'DESTACOU_INDEVIDO' ? 'todos' : 'DESTACOU_INDEVIDO')} 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        filtroProblema === 'DESTACOU_INDEVIDO' 
                          ? 'bg-green-600 text-white shadow' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Destacou Indevidamente ({contadores.destacouIndevido})
                    </button>
                  )}
                  
                  {contadores.naoDestacou > 0 && (
                    <button 
                      onClick={() => setFiltroProblema(filtroProblema === 'NAO_DESTACOU' ? 'todos' : 'NAO_DESTACOU')} 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        filtroProblema === 'NAO_DESTACOU' 
                          ? 'bg-[#C8A951] text-white shadow' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" />
                      Não Destacou ({contadores.naoDestacou})
                    </button>
                  )}
                  
                  {contadores.cstErrado > 0 && (
                    <button 
                      onClick={() => setFiltroProblema(filtroProblema === 'CST_ERRADO' ? 'todos' : 'CST_ERRADO')} 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        filtroProblema === 'CST_ERRADO' 
                          ? 'bg-orange-600 text-white shadow' 
                          : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      CST Incorreto ({contadores.cstErrado})
                    </button>
                  )}
                  
                  {contadores.aliqIncorreta > 0 && (
                    <button 
                      onClick={() => setFiltroProblema(filtroProblema === 'ALIQ_INCORRETA' ? 'todos' : 'ALIQ_INCORRETA')} 
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        filtroProblema === 'ALIQ_INCORRETA' 
                          ? 'bg-yellow-600 text-white shadow' 
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Alíquota Incorreta ({contadores.aliqIncorreta})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Busca e Export */}
            {dados.total_divergentes > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                  <input 
                    type="text" 
                    placeholder="Buscar por produto, NCM ou NF..." 
                    value={busca} 
                    onChange={(e) => setBusca(e.target.value)} 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <button 
                  onClick={exportCSV} 
                  disabled={!problemas.length} 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Exportar CSV
                </button>
              </div>
            )}

            {/* Lista de Problemas */}
            {problemas.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[#A1A1AA]">
                  Mostrando {problemas.length} {problemas.length === 1 ? 'problema' : 'problemas'}
                  {filtroProblema !== 'todos' && ' (filtrado)'}
                  . Clique para expandir e ver detalhes.
                </p>
                {problemas.map((item, idx) => (
                  <ProblemaCard key={idx} item={item} idx={idx} />
                ))}
              </div>
            ) : dados.total_divergentes === 0 ? (
              <div className="bg-[#141414] rounded-lg p-10 border text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white">Tudo certo!</h2>
                <p className="text-[#A1A1AA] mt-2">Nenhuma divergência de PIS/COFINS identificada nesta competência.</p>
              </div>
            ) : (
              <div className="bg-[#141414] rounded-lg p-10 border text-center">
                <Package className="w-16 h-16 text-[#666666] mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-[#E0E0E0]">Nenhum resultado</h2>
                <p className="text-[#A1A1AA] mt-2">Tente alterar os filtros ou a busca.</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
};

export default AnalisePisCofins;
