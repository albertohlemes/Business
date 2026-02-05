import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Brain, CheckCircle, Search, Edit2, Save, Sparkles, Check, CheckCheck, X, 
  Filter, Layers, FileText, Package, Info, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw, ChevronDown, ChevronRight, Send, BookOpen, Trash2, AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const ClassificacaoPage = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modo de visualização
  const [viewMode, setViewMode] = useState('produto'); // 'nf' ou 'produto'
  const [displayMode, setDisplayMode] = useState('agrupado'); // 'agrupado' ou 'lista'
  const [expandedCategoria, setExpandedCategoria] = useState(null);
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  
  // Aprovações
  const [approvedProducts, setApprovedProducts] = useState({});
  const [selectedProductCodes, setSelectedProductCodes] = useState([]);
  
  // Ordenação
  const [sortConfig, setSortConfig] = useState({ field: 'descricao', direction: 'asc' });
  
  // Mensagens
  const [successMessage, setSuccessMessage] = useState('');
  
  // Reclassificação manual
  const [reclassifyingProduct, setReclassifyingProduct] = useState(null);
  const [newCategoria, setNewCategoria] = useState('');
  const [reclassifyMotivo, setReclassifyMotivo] = useState('');
  
  // IA
  const [aiCommand, setAiCommand] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [learnedRules, setLearnedRules] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleEdit, setRuleEdit] = useState({ categoria: '', cfop: '' });
  const [selectedRules, setSelectedRules] = useState([]); // Para exclusão em lote

  // Funções de ordenação
  const toggleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Carregar dados quando empresa/competência mudar
  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
      fetchLearnedRules();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchData = async () => {
    if (!selectedCompany) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const docsRes = await axios.get(
        `${API}/xml/documents?company_id=${selectedCompany.id}&competencia=${selectedCompetencia}`,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      
      // Filtrar apenas documentos de entrada
      const entradas = docsRes.data.filter(d => d.tipo === 'entrada');
      setDocuments(entradas);
      
      // Carregar aprovações salvas
      const savedApprovals = localStorage.getItem(`approvals_${selectedCompany.id}_${selectedCompetencia}`);
      if (savedApprovals) {
        setApprovedProducts(JSON.parse(savedApprovals));
      } else {
        setApprovedProducts({});
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLearnedRules = async () => {
    if (!selectedCompany) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/learned-rules/${selectedCompany.id}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setLearnedRules(response.data);
    } catch (err) {
      console.error('Erro ao carregar regras:', err);
    }
  };

  // Agrupar produtos
  const groupedProducts = useMemo(() => {
    const groups = {};
    
    documents.forEach(doc => {
      (doc.produtos || []).forEach((prod, prodIndex) => {
        const code = prod.codigo || 'SEM_CODIGO';
        if (!groups[code]) {
          groups[code] = {
            codigo: code,
            descricao: prod.descricao,
            ncm: prod.ncm,
            categoria: prod.categoria_classificada || 'não classificado',
            cfop: prod.cfop,
            ocorrencias: [],
            quantidade_total: 0,
            valor_total: 0
          };
        }
        groups[code].ocorrencias.push({
          doc_id: doc.id,
          numero_nfe: doc.numero_nfe,
          emitente: doc.emitente_nome,
          quantidade: prod.quantidade,
          valor: prod.valor_total,
          cfop: prod.cfop,
          product_index: prodIndex
        });
        groups[code].quantidade_total += prod.quantidade || 0;
        groups[code].valor_total += prod.valor_total || 0;
        if (prod.categoria_classificada) {
          groups[code].categoria = prod.categoria_classificada;
        }
      });
    });
    
    return Object.values(groups);
  }, [documents]);

  // Produtos ordenados
  const sortedProducts = useMemo(() => {
    const sorted = [...groupedProducts];
    
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.field) {
        case 'descricao':
          aVal = a.descricao || '';
          bVal = b.descricao || '';
          break;
        case 'categoria':
          aVal = a.categoria || 'zzz';
          bVal = b.categoria || 'zzz';
          break;
        case 'cfop':
          aVal = a.cfop || '';
          bVal = b.cfop || '';
          break;
        case 'valor':
          aVal = a.valor_total || 0;
          bVal = b.valor_total || 0;
          break;
        case 'ocorrencias':
          aVal = a.ocorrencias?.length || 0;
          bVal = b.ocorrencias?.length || 0;
          break;
        default:
          aVal = a.descricao || '';
          bVal = b.descricao || '';
      }
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sorted;
  }, [groupedProducts, sortConfig]);

  // Agrupar produtos por categoria para visualização agrupada
  const productsByCategoria = useMemo(() => {
    const grupos = {
      'REVENDA': { produtos: [], cor: 'bg-green-500', corFundo: 'bg-green-50', icon: '🛒' },
      'INSUMO': { produtos: [], cor: 'bg-blue-500', corFundo: 'bg-blue-50', icon: '⚙️' },
      'DESPESA': { produtos: [], cor: 'bg-orange-500', corFundo: 'bg-orange-50', icon: '📋' },
      'ATIVO_IMOBILIZADO': { produtos: [], cor: 'bg-purple-500', corFundo: 'bg-purple-50', icon: '🏭' },
      'COMBUSTIVEL': { produtos: [], cor: 'bg-gray-700', corFundo: 'bg-gray-50', icon: '⛽' },
      'PENDENTE': { produtos: [], cor: 'bg-red-500', corFundo: 'bg-red-50', icon: '⚠️' },
    };
    
    sortedProducts.forEach(prod => {
      const cat = (prod.categoria || '').toUpperCase();
      if (cat.includes('REVENDA')) {
        grupos['REVENDA'].produtos.push(prod);
      } else if (cat.includes('INSUMO')) {
        grupos['INSUMO'].produtos.push(prod);
      } else if (cat.includes('DESPESA')) {
        grupos['DESPESA'].produtos.push(prod);
      } else if (cat.includes('ATIVO') || cat.includes('IMOBILIZADO')) {
        grupos['ATIVO_IMOBILIZADO'].produtos.push(prod);
      } else if (cat.includes('COMBUSTIVEL') || cat.includes('COMBUSTÍVEL')) {
        grupos['COMBUSTIVEL'].produtos.push(prod);
      } else {
        grupos['PENDENTE'].produtos.push(prod);
      }
    });
    
    return grupos;
  }, [sortedProducts]);

  // Funções de aprovação
  const isProductApproved = (docId, productCode) => {
    return !!approvedProducts[`${docId}_${productCode}`];
  };

  const saveApprovals = (approvals) => {
    if (selectedCompany && selectedCompetencia) {
      localStorage.setItem(`approvals_${selectedCompany.id}_${selectedCompetencia}`, JSON.stringify(approvals));
    }
  };

  const toggleApproveProductAll = (productCode) => {
    const newApprovals = { ...approvedProducts };
    const product = groupedProducts.find(p => p.codigo === productCode);
    if (!product) return;
    
    const allApproved = product.ocorrencias.every(occ => !!newApprovals[`${occ.doc_id}_${productCode}`]);
    
    product.ocorrencias.forEach(occ => {
      const key = `${occ.doc_id}_${productCode}`;
      if (allApproved) {
        delete newApprovals[key];
      } else {
        newApprovals[key] = { approved: true, date: new Date().toISOString() };
      }
    });
    
    if (!allApproved) {
      showSuccess(`Produto validado em ${product.ocorrencias.length} NF(s)!`);
    }
    
    setApprovedProducts(newApprovals);
    saveApprovals(newApprovals);
  };

  const countProductApprovals = (productCode) => {
    const product = groupedProducts.find(p => p.codigo === productCode);
    if (!product) return { approved: 0, total: 0 };
    
    const approved = product.ocorrencias.filter(occ => isProductApproved(occ.doc_id, productCode)).length;
    return { approved, total: product.ocorrencias.length };
  };

  const approveSelectedProducts = () => {
    const newApprovals = { ...approvedProducts };
    let totalAprovados = 0;
    
    selectedProductCodes.forEach(code => {
      const product = groupedProducts.find(p => p.codigo === code);
      if (product) {
        product.ocorrencias.forEach(occ => {
          newApprovals[`${occ.doc_id}_${code}`] = { approved: true, date: new Date().toISOString() };
          totalAprovados++;
        });
      }
    });
    
    setApprovedProducts(newApprovals);
    saveApprovals(newApprovals);
    setSelectedProductCodes([]);
    showSuccess(`${totalAprovados} ocorrências validadas!`);
  };

  // Reclassificação manual
  const handleReclassifyProduct = async () => {
    if (!reclassifyingProduct || !newCategoria) {
      alert('Selecione uma categoria');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      // Reclassificar todas as ocorrências
      for (const occ of reclassifyingProduct.occurrences) {
        await axios.post(`${API}/products/reclassify-manual`, {
          document_id: occ.doc_id,
          product_index: occ.product_index,
          nova_categoria: newCategoria,
          motivo: reclassifyMotivo || `Reclassificado para ${newCategoria.toUpperCase()}`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      showSuccess(`${reclassifyingProduct.occurrences.length} ocorrência(s) reclassificada(s)!`);
      setReclassifyingProduct(null);
      setNewCategoria('');
      setReclassifyMotivo('');
      fetchData();
      fetchLearnedRules();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao reclassificar');
    }
  };

  // IA - Processar comando (usa o novo endpoint inteligente)
  const processAICommand = async () => {
    if (!aiCommand.trim()) {
      alert('Digite uma instrução para a IA');
      return;
    }

    setAiProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      // Usar o novo endpoint de reclassificação inteligente
      const response = await axios.post(`${API}/ai/smart-reclassify`, {
        company_id: selectedCompany.id,
        competencia: selectedCompetencia,
        comando: aiCommand,
        aplicar: true,
        sobrepor_regras: true
      }, {
        headers: { Authorization: 'Bearer ' + token }
      });
      
      setAiResult(response.data);
      if (response.data.success) {
        fetchData();
        fetchLearnedRules();
        setAiCommand('');
        showSuccess(`${response.data.total_produtos_encontrados} produtos encontrados e reclassificados!`);
      }
    } catch (err) {
      // Fallback para o endpoint antigo se o novo falhar
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API}/ai/reclassify`, {
          company_id: selectedCompany.id,
          competencia: selectedCompetencia,
          product_ids: selectedProductCodes.length > 0 ? selectedProductCodes : [],
          instrucao_usuario: aiCommand,
          aplicar_em_lote: true
        }, {
          headers: { Authorization: 'Bearer ' + token }
        });
        
        setAiResult(response.data);
        if (response.data.success) {
          fetchData();
          fetchLearnedRules();
          setAiCommand('');
        }
      } catch (err2) {
        alert(err2.response?.data?.detail || 'Erro na análise com IA');
      }
    } finally {
      setAiProcessing(false);
    }
  };

  // Regras aprendidas - Calcular CFOP automaticamente ao mudar categoria
  const getCfopForCategoria = (categoria, isInterestadual = false) => {
    const prefix = isInterestadual ? '2' : '1';
    const cfops = {
      'revenda': prefix + '102',
      'REVENDA': prefix + '102',
      'revenda_st': prefix + '403',
      'REVENDA_ST': prefix + '403',
      'insumo': prefix + '101',
      'INSUMO': prefix + '101',
      'insumo_st': prefix + '401',
      'INSUMO_ST': prefix + '401',
      'despesa': prefix + '556',
      'DESPESA': prefix + '556',
      'despesa_st': prefix + '407',
      'DESPESA_ST': prefix + '407',
      'ativo_imobilizado': prefix + '551',
      'ATIVO_IMOBILIZADO': prefix + '551',
      'ativo_imobilizado_st': prefix + '406',
      'ATIVO_IMOBILIZADO_ST': prefix + '406',
      'combustivel': prefix + '653',
      'COMBUSTIVEL': prefix + '653',
    };
    return cfops[categoria] || prefix + '102';
  };

  const handleCategoriaChange = (newCategoria) => {
    // Detectar se é interestadual pelo CFOP atual
    const isInterestadual = ruleEdit.cfop?.startsWith('2');
    const newCfop = getCfopForCategoria(newCategoria, isInterestadual);
    setRuleEdit({ categoria: newCategoria, cfop: newCfop });
  };

  const handleSaveRule = async (ruleId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/ai/learned-rules/${ruleId}?categoria=${ruleEdit.categoria}&cfop=${ruleEdit.cfop}`,
        {},
        { headers: { Authorization: 'Bearer ' + token } }
      );
      setEditingRule(null);
      fetchLearnedRules();
      showSuccess('Regra atualizada!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao atualizar regra');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Excluir esta regra?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/ai/learned-rules/${ruleId}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      fetchLearnedRules();
      showSuccess('Regra excluída!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir');
    }
  };

  // Excluir regras selecionadas em lote
  const handleDeleteSelectedRules = async () => {
    if (selectedRules.length === 0) return;
    if (!window.confirm(`Excluir ${selectedRules.length} regra(s) selecionada(s)?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      let deleted = 0;
      
      for (const ruleId of selectedRules) {
        try {
          await axios.delete(`${API}/ai/learned-rules/${ruleId}`, {
            headers: { Authorization: 'Bearer ' + token }
          });
          deleted++;
        } catch (err) {
          console.error('Erro ao excluir regra:', ruleId, err);
        }
      }
      
      setSelectedRules([]);
      fetchLearnedRules();
      showSuccess(`${deleted} regra(s) excluída(s)!`);
    } catch (err) {
      alert('Erro ao excluir regras');
    }
  };

  // Excluir todas as regras
  const handleDeleteAllRules = async () => {
    if (!window.confirm(`Excluir TODAS as ${learnedRules.length} regras da memória da IA?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/ai/learned-rules/company/${selectedCompany.id}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setSelectedRules([]);
      fetchLearnedRules();
      showSuccess('Todas as regras foram excluídas!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir regras');
    }
  };

  // Estatísticas
  const totalProducts = documents.reduce((acc, doc) => acc + doc.produtos.length, 0);
  const validApprovedKeys = new Set();
  documents.forEach(doc => {
    doc.produtos.forEach(prod => {
      const key = `${doc.id}_${prod.codigo}`;
      if (approvedProducts[key]) validApprovedKeys.add(key);
    });
  });
  const totalApproved = validApprovedKeys.size;
  const totalPending = Math.max(0, totalProducts - totalApproved);

  // Helpers
  const getCategoryBadge = (categoria) => {
    const badges = {
      'revenda': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'REVENDA' },
      'insumo': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'INSUMO' },
      'despesa': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'DESPESA' },
      'ativo_imobilizado': { bg: 'bg-green-100', text: 'text-green-800', label: 'ATIVO IMOB.' },
      'combustivel': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'COMBUSTÍVEL' },
    };
    const badge = badges[categoria?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', label: categoria?.toUpperCase() || 'N/A' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Componente de produto agrupado
  const GroupedProductItem = ({ product }) => {
    const { approved, total } = countProductApprovals(product.codigo);
    const allApproved = approved === total;
    const isSelected = selectedProductCodes.includes(product.codigo);
    
    if (showOnlyPending && allApproved) return null;
    
    return (
      <div className={`grid grid-cols-12 gap-2 items-center px-4 py-3 border-b hover:bg-gray-50 transition-colors ${allApproved ? 'bg-green-50' : ''}`}>
        {/* Checkbox + Aprovação */}
        <div className="col-span-1 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              if (isSelected) {
                setSelectedProductCodes(prev => prev.filter(c => c !== product.codigo));
              } else {
                setSelectedProductCodes(prev => [...prev, product.codigo]);
              }
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
          
          <button
            onClick={() => toggleApproveProductAll(product.codigo)}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              allApproved 
                ? 'bg-green-600 border-green-600 text-white' 
                : approved > 0 
                  ? 'bg-yellow-100 border-yellow-400'
                  : 'border-gray-300 hover:border-green-500'
            }`}
            title={allApproved ? 'Remover aprovação' : 'Aprovar em todas as NFs'}
          >
            {allApproved ? <Check className="w-4 h-4" /> : approved > 0 ? <span className="text-xs font-bold text-yellow-700">{approved}</span> : null}
          </button>
        </div>
        
        {/* Produto */}
        <div className="col-span-4">
          <p className="font-semibold text-gray-900 text-sm truncate" title={product.descricao}>
            {product.descricao}
          </p>
          <p className="text-xs text-gray-500">
            Cód: {product.codigo} | NCM: {product.ncm}
          </p>
        </div>
        
        {/* Classificação */}
        <div className="col-span-2 flex items-center gap-2">
          {getCategoryBadge(product.categoria)}
          {!allApproved && (
            <button
              onClick={() => {
                setReclassifyingProduct({
                  product: product,
                  occurrences: product.ocorrencias
                });
                setNewCategoria(product.categoria || '');
              }}
              className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
              title="Reclassificar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* CFOP */}
        <div className="col-span-1">
          <span className="px-2 py-1 rounded font-mono text-sm font-semibold bg-gray-100 text-gray-800">
            {product.cfop}
          </span>
        </div>
        
        {/* Valor */}
        <div className="col-span-2 text-right">
          <p className="font-semibold text-gray-900">
            R$ {product.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        {/* Ocorrências */}
        <div className="col-span-2 text-right">
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            {product.ocorrencias?.length || 0} NF(s)
          </span>
          {allApproved && <span className="ml-2 text-green-600 text-xs">✓</span>}
        </div>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="classificacao-page" className="space-y-6">
        {/* Mensagem de Sucesso */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-7 h-7" />
                Validação & Classificação IA
              </h1>
              <p className="text-purple-100 mt-1">
                Valide, reclassifique e ensine a IA com suas correções
              </p>
            </div>
            
            {/* Estatísticas */}
            <div className="flex gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <p className="text-2xl font-bold">{totalApproved}</p>
                <p className="text-xs text-purple-100">Aprovados</p>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-xs text-purple-100">Pendentes</p>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <p className="text-2xl font-bold">{learnedRules.length}</p>
                <p className="text-xs text-purple-100">Regras IA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Comando IA */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900">Comando para IA</h3>
            <button
              onClick={() => setShowRules(!showRules)}
              className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <BookOpen className="w-4 h-4" />
              Memória ({learnedRules.length})
            </button>
          </div>
          
          <div className="flex gap-2 mb-3 flex-wrap">
            <button 
              onClick={() => setAiCommand('Reclassifique produtos de limpeza como DESPESA')}
              className="text-xs px-2 py-1 bg-white text-gray-700 rounded hover:bg-gray-100 border"
            >
              "limpeza → DESPESA"
            </button>
            <button 
              onClick={() => setAiCommand('Produtos com NCM 30* são medicamentos - classificar como DESPESA')}
              className="text-xs px-2 py-1 bg-white text-gray-700 rounded hover:bg-gray-100 border"
            >
              "NCM 30* → DESPESA"
            </button>
            <button 
              onClick={() => setAiCommand('Material de escritório é DESPESA (CFOP 1556)')}
              className="text-xs px-2 py-1 bg-white text-gray-700 rounded hover:bg-gray-100 border"
            >
              "escritório → DESPESA"
            </button>
          </div>

          <div className="flex gap-3">
            <textarea
              data-testid="ai-command-input"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              className="flex-1 px-4 py-3 border border-purple-300 rounded-lg resize-none"
              rows="2"
              placeholder="Ex: 'Produtos de limpeza são despesa' ou 'Alimentos são revenda'"
            />
            <button
              data-testid="process-ai-btn"
              onClick={processAICommand}
              disabled={aiProcessing || !aiCommand.trim() || !selectedCompany}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {aiProcessing ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Processando...</>
              ) : (
                <><Send className="w-5 h-5" /> Processar</>
              )}
            </button>
          </div>
          
          {selectedProductCodes.length > 0 && (
            <p className="text-sm text-purple-600 mt-2">
              {selectedProductCodes.length} produto(s) selecionado(s) - a IA focará neles
            </p>
          )}
        </div>

        {/* Resultado da IA */}
        {aiResult && (
          <div className={`rounded-xl p-4 border-2 ${aiResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <h3 className={`font-bold mb-2 ${aiResult.success ? 'text-green-900' : 'text-red-900'}`}>
              {aiResult.success ? '✓ Processamento Concluído' : '✗ Erro'}
            </h3>
            <p className="text-sm">{aiResult.mensagem || aiResult.error}</p>
            {aiResult.regras_aprendidas?.length > 0 && (
              <p className="text-sm text-green-700 mt-2">
                📚 {aiResult.regras_aprendidas.length} nova(s) regra(s) memorizada(s)
              </p>
            )}
          </div>
        )}

        {/* Regras Aprendidas */}
        {showRules && learnedRules.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Memória da IA ({learnedRules.length} regras)
              </h3>
              <div className="flex gap-2">
                {selectedRules.length > 0 && (
                  <button
                    onClick={handleDeleteSelectedRules}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir {selectedRules.length}
                  </button>
                )}
                <button
                  onClick={handleDeleteAllRules}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Tudo
                </button>
              </div>
            </div>
            
            {/* Selecionar todas */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-200">
              <input
                type="checkbox"
                checked={selectedRules.length === learnedRules.length && learnedRules.length > 0}
                onChange={() => {
                  if (selectedRules.length === learnedRules.length) {
                    setSelectedRules([]);
                  } else {
                    setSelectedRules(learnedRules.map(r => r.id));
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-purple-700 font-medium">Selecionar todas</span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {learnedRules.map((rule) => (
                <div key={rule.id} className="bg-white p-3 rounded-lg border border-purple-100 flex items-center gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => {
                      if (selectedRules.includes(rule.id)) {
                        setSelectedRules(prev => prev.filter(id => id !== rule.id));
                      } else {
                        setSelectedRules(prev => [...prev, rule.id]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  
                  {editingRule === rule.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm truncate max-w-[200px]">{rule.produto_descricao}</span>
                      <select
                        value={ruleEdit.categoria}
                        onChange={(e) => handleCategoriaChange(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="REVENDA">REVENDA</option>
                        <option value="REVENDA_ST">REVENDA (ST)</option>
                        <option value="INSUMO">INSUMO</option>
                        <option value="INSUMO_ST">INSUMO (ST)</option>
                        <option value="DESPESA">DESPESA</option>
                        <option value="DESPESA_ST">DESPESA (ST)</option>
                        <option value="ATIVO_IMOBILIZADO">ATIVO IMOB.</option>
                        <option value="ATIVO_IMOBILIZADO_ST">ATIVO IMOB. (ST)</option>
                        <option value="COMBUSTIVEL">COMBUSTÍVEL</option>
                      </select>
                      <input
                        type="text"
                        value={ruleEdit.cfop}
                        onChange={(e) => setRuleEdit({ ...ruleEdit, cfop: e.target.value })}
                        className="w-16 px-2 py-1 border rounded text-sm font-mono"
                        placeholder="CFOP"
                      />
                      <button onClick={() => handleSaveRule(rule.id)} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingRule(null)} className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm flex-1">
                        <span className="font-medium">{rule.produto_descricao}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        {getCategoryBadge(rule.categoria_correta || rule.categoria)}
                        <span className="text-gray-500 ml-2 font-mono">CFOP {rule.cfop_correto || rule.cfop}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingRule(rule.id);
                            setRuleEdit({ categoria: rule.categoria_correta || rule.categoria, cfop: rule.cfop_correto || rule.cfop });
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRule(rule.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles */}
        {selectedCompany && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-600">Validando entradas de</p>
              <p className="font-bold text-gray-900">{selectedCompany.razao_social}</p>
              <p className="text-sm text-gray-500">Competência: {selectedCompetencia}</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowOnlyPending(!showOnlyPending)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  showOnlyPending ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                {showOnlyPending ? 'Só pendentes' : 'Todos'}
              </button>
              
              {selectedProductCodes.length > 0 && (
                <button
                  onClick={approveSelectedProducts}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  Aprovar {selectedProductCodes.length}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista de Produtos */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900">
              Produtos de Entrada ({sortedProducts.length})
            </h3>
            
            <div className="flex items-center gap-2">
              {/* Toggle Agrupado/Lista */}
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setDisplayMode('agrupado')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    displayMode === 'agrupado' 
                      ? 'bg-white text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Layers className="w-4 h-4 inline mr-1" />
                  Agrupado
                </button>
                <button
                  onClick={() => setDisplayMode('lista')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    displayMode === 'lista' 
                      ? 'bg-white text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Lista
                </button>
              </div>
              
              <button
                onClick={() => setSelectedProductCodes(
                  selectedProductCodes.length === groupedProducts.length ? [] : groupedProducts.map(p => p.codigo)
                )}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
              >
                {selectedProductCodes.length === groupedProducts.length ? 'Limpar' : 'Selecionar Todos'}
              </button>
            </div>
          </div>
          
          {/* Visualização Agrupada por Categoria */}
          {displayMode === 'agrupado' && (
            <div className="divide-y divide-gray-200">
              {Object.entries(productsByCategoria).map(([categoria, { produtos, cor, corFundo, icon }]) => (
                produtos.length > 0 && (
                  <div key={categoria}>
                    <button
                      onClick={() => setExpandedCategoria(expandedCategoria === categoria ? null : categoria)}
                      className={`w-full px-4 py-4 flex items-center justify-between ${corFundo} hover:brightness-95 transition-colors`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-lg ${cor} text-white flex items-center justify-center text-xl`}>
                          {icon}
                        </span>
                        <div className="text-left">
                          <p className="font-bold text-gray-900">{categoria.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600">{produtos.length} produto(s) • {produtos.reduce((s, p) => s + p.ocorrencias.length, 0)} ocorrência(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Valor Total</p>
                          <p className="font-bold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              produtos.reduce((s, p) => s + p.valor_total, 0)
                            )}
                          </p>
                        </div>
                        {expandedCategoria === categoria ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </button>
                    
                    {/* Lista de produtos expandida */}
                    {expandedCategoria === categoria && (
                      <div className="bg-white">
                        {produtos.map((product) => (
                          <ProductRow 
                            key={product.codigo} 
                            product={product} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
          
          {/* Visualização em Lista */}
          {displayMode === 'lista' && (
            <>
              {/* Cabeçalho ordenável */}
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 grid grid-cols-12 gap-2 items-center text-sm font-semibold text-gray-700">
                <div className="col-span-1 text-center">
                  <input 
                    type="checkbox"
                    checked={selectedProductCodes.length === groupedProducts.length && groupedProducts.length > 0}
                    onChange={() => setSelectedProductCodes(
                      selectedProductCodes.length === groupedProducts.length ? [] : groupedProducts.map(p => p.codigo)
                    )}
                    className="rounded border-gray-300"
                  />
            </div>
            
            <button onClick={() => toggleSort('descricao')} className="col-span-4 flex items-center gap-1 hover:text-purple-700">
              Produto
              {sortConfig.field === 'descricao' ? (
                sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
              ) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
            </button>
            
            <button onClick={() => toggleSort('categoria')} className="col-span-2 flex items-center gap-1 hover:text-purple-700">
              Classificação
              {sortConfig.field === 'categoria' ? (
                sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
              ) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
            </button>
            
            <button onClick={() => toggleSort('cfop')} className="col-span-1 flex items-center gap-1 hover:text-purple-700">
              CFOP
            </button>
            
            <button onClick={() => toggleSort('valor')} className="col-span-2 flex items-center gap-1 hover:text-purple-700 justify-end">
              Valor
              {sortConfig.field === 'valor' ? (
                sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
              ) : <ArrowUpDown className="w-4 h-4 text-gray-400" />}
            </button>
            
            <button onClick={() => toggleSort('ocorrencias')} className="col-span-2 flex items-center gap-1 hover:text-purple-700 justify-end">
              NFs
            </button>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-600">
                  {selectedCompany ? 'Nenhuma NF-e de entrada nesta competência' : 'Selecione uma empresa no header'}
                </p>
              </div>
            ) : (
              sortedProducts.map((product) => (
                <GroupedProductItem key={product.codigo} product={product} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Reclassificação */}
      {reclassifyingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Reclassificar Produto
              </h3>
              <p className="text-purple-100 text-sm">
                Aplicar em {reclassifyingProduct.occurrences.length} ocorrência(s)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{reclassifyingProduct.product.descricao}</p>
                <p className="text-sm text-gray-600">
                  Código: {reclassifyingProduct.product.codigo} | NCM: {reclassifyingProduct.product.ncm}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nova Categoria</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'revenda', label: 'REVENDA', desc: 'Comercialização' },
                    { id: 'insumo', label: 'INSUMO', desc: 'Produção' },
                    { id: 'despesa', label: 'DESPESA', desc: 'Uso e consumo' },
                    { id: 'ativo_imobilizado', label: 'ATIVO IMOB.', desc: 'Bens permanentes' },
                    { id: 'combustivel', label: 'COMBUSTÍVEL', desc: 'Energia' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCategoria(cat.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        newCategoria === cat.id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`font-bold text-sm ${newCategoria === cat.id ? 'text-purple-700' : 'text-gray-800'}`}>
                        {cat.label}
                      </span>
                      <p className="text-xs text-gray-500">{cat.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Justificativa (opcional)</label>
                <textarea
                  value={reclassifyMotivo}
                  onChange={(e) => setReclassifyMotivo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  rows="2"
                  placeholder="Ex: Produto usado na produção"
                />
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>A IA vai memorizar esta classificação para futuras importações.</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setReclassifyingProduct(null);
                  setNewCategoria('');
                  setReclassifyMotivo('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleReclassifyProduct}
                disabled={!newCategoria}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar ({reclassifyingProduct.occurrences.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ClassificacaoPage;
