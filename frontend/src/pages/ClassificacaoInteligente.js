import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Brain, CheckCircle, Search, Edit2, Edit3, Save, Sparkles, Check, CheckCheck, X, 
  Filter, Layers, FileText, Package, Info, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw, ChevronDown, ChevronRight, ChevronUp, Send, BookOpen, Trash2, AlertTriangle,
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
  
  // NOVO: Aba de classificação (novos, classificados, todos)
  const [classificacaoTab, setClassificacaoTab] = useState('novos'); // 'novos', 'classificados', 'todos'
  
  // NOVO: Estados para ordenação por coluna
  const [sortColumn, setSortColumn] = useState('descricao'); // descricao, ncm, cfop, valor, quantidade
  const [sortDirection, setSortDirection] = useState('asc');
  
  // NOVO: Estados para seleção em lote
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  
  // NOVO: Estado para visualização (agrupado ou lista)
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' ou 'list'
  
  // Estados compartilhados
  const [comandoIA, setComandoIA] = useState('');
  const [processandoIA, setProcessandoIA] = useState(false);
  
  // Estado para edição de produto individual
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  
  // NOVO: Estado para edição de CFOP individual por produto
  const [editingCfopProduto, setEditingCfopProduto] = useState({}); // { `${cfop}_${docId}_${prodIdx}`: { cfop: '', saving: false } }
  
  // Estados para Memória IA
  const [showMemoriaIA, setShowMemoriaIA] = useState(false);
  const [memoriaData, setMemoriaData] = useState([]);
  const [memoriaLoading, setMemoriaLoading] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [memoriaSearch, setMemoriaSearch] = useState('');
  
  // Filtrar regras pela busca
  const memoriaFiltrada = memoriaData.filter(rule => {
    if (!memoriaSearch) return true;
    const termo = memoriaSearch.toLowerCase();
    return (
      (rule.produto_descricao || rule.descricao_produto || rule.padrao || '').toLowerCase().includes(termo) ||
      (rule.ncm || '').includes(termo) ||
      (rule.categoria || rule.categoria_correta || '').toLowerCase().includes(termo) ||
      (rule.cfop || rule.cfop_correto || '').includes(termo)
    );
  });
  
  // Estados para seleção em lote de regras
  const [selectedRules, setSelectedRules] = useState(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [batchCategory, setBatchCategory] = useState('');
  
  // Toggle seleção de regra
  const toggleRuleSelection = (ruleId) => {
    setSelectedRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };
  
  // Selecionar todas as regras filtradas
  const selectAllRules = () => {
    if (selectedRules.size === memoriaFiltrada.length) {
      setSelectedRules(new Set());
    } else {
      setSelectedRules(new Set(memoriaFiltrada.map(r => r.id)));
    }
  };
  
  // Excluir regras em lote
  const deleteBatchRules = async () => {
    if (selectedRules.size === 0) return;
    
    setBatchDeleting(true);
    try {
      const token = localStorage.getItem('token');
      let deleted = 0;
      
      for (const ruleId of selectedRules) {
        try {
          await axios.delete(
            `${API}/ai/learned-rules/${ruleId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          deleted++;
        } catch (err) {
          console.error(`Erro ao excluir regra ${ruleId}:`, err);
        }
      }
      
      toast.success(`${deleted} regra(s) excluída(s) com sucesso`);
      setSelectedRules(new Set());
      fetchMemoriaIA();
    } catch (err) {
      console.error('Erro ao excluir regras em lote:', err);
      toast.error('Erro ao excluir regras');
    } finally {
      setBatchDeleting(false);
    }
  };
  
  // Alterar categoria em lote
  const updateBatchCategory = async (newCategory) => {
    if (selectedRules.size === 0 || !newCategory) return;
    
    setBatchUpdating(true);
    try {
      const token = localStorage.getItem('token');
      let updated = 0;
      
      for (const ruleId of selectedRules) {
        try {
          await axios.put(
            `${API}/ai/learned-rules/${ruleId}?categoria=${newCategory}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          updated++;
        } catch (err) {
          console.error(`Erro ao atualizar regra ${ruleId}:`, err);
        }
      }
      
      toast.success(`${updated} regra(s) atualizada(s) para ${newCategory.toUpperCase()}`);
      setSelectedRules(new Set());
      setBatchCategory('');
      fetchMemoriaIA();
    } catch (err) {
      console.error('Erro ao atualizar regras em lote:', err);
      toast.error('Erro ao atualizar regras');
    } finally {
      setBatchUpdating(false);
    }
  };

  // Carregar dados
  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchAlertas();
      fetchValidacao();
    }
  }, [selectedCompany, selectedCompetencia]);
  
  // Carregar regras de memória IA
  const fetchMemoriaIA = async () => {
    if (!selectedCompany) return;
    
    setMemoriaLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/learned-rules/${selectedCompany.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMemoriaData(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar memória IA:', err);
      toast.error('Erro ao carregar regras aprendidas');
    } finally {
      setMemoriaLoading(false);
    }
  };
  
  // Abrir modal de memória IA
  const openMemoriaIA = () => {
    setShowMemoriaIA(true);
    fetchMemoriaIA();
  };
  
  // Excluir regra
  const deleteRule = async (ruleId) => {
    setDeletingRule(ruleId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/ai/learned-rules/${ruleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Regra excluída com sucesso');
      fetchMemoriaIA();
    } catch (err) {
      console.error('Erro ao excluir regra:', err);
      toast.error('Erro ao excluir regra');
    } finally {
      setDeletingRule(null);
    }
  };
  
  // Atualizar regra
  const updateRule = async (ruleId, newCategoria, newCfop) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API}/ai/learned-rules/${ruleId}?categoria=${newCategoria}${newCfop ? `&cfop=${newCfop}` : ''}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Mostrar o novo CFOP calculado se foi alterado
      if (response.data?.cfop) {
        toast.success(`Regra atualizada! Novo CFOP: ${response.data.cfop}`);
      } else {
        toast.success('Regra atualizada com sucesso');
      }
      
      setEditingRule(null);
      fetchMemoriaIA();
    } catch (err) {
      console.error('Erro ao atualizar regra:', err);
      toast.error('Erro ao atualizar regra');
    }
  };

  const fetchAlertas = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setAlertasLoading(true);
    setAlertasError('');
    
    try {
      const token = localStorage.getItem('token');
      // Usar endpoint agrupado por CFOP
      const response = await axios.get(
        `${API}/alertas-cfop/${selectedCompany.id}/agrupado?competencia=${encodeURIComponent(selectedCompetencia)}`,
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
      // Usar endpoint V2 que separa novos vs já classificados
      const response = await axios.get(
        `${API}/classification/suggestions-v2/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setValidacaoData(response.data);
      
      // Se houve classificações automáticas, notificar o usuário
      if (response.data?.resumo?.classificacoes_aplicadas_automaticamente > 0) {
        toast.success(
          `${response.data.resumo.classificacoes_aplicadas_automaticamente} classificações aplicadas automaticamente!`,
          { duration: 5000 }
        );
      }
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

  // Resolver alerta de CFOP individualmente
  const resolverAlertaIndividual = async (documentoId, produtoIdx, novoCfop) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/alertas-cfop/resolver-individual?documento_id=${documentoId}&produto_idx=${produtoIdx}&novo_cfop=${novoCfop}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('CFOP atualizado com sucesso!');
        fetchAlertas(); // Recarregar alertas
      } else {
        toast.error(response.data.message || 'Erro ao atualizar CFOP');
      }
    } catch (err) {
      console.error('Erro ao resolver alerta:', err);
      toast.error('Erro ao resolver alerta de CFOP');
    }
  };

  // Resolver alertas de um grupo inteiro (por CFOP)
  const [resolvingGroup, setResolvingGroup] = useState(null);
  const [editingCfop, setEditingCfop] = useState({});

  const resolverGrupoCfop = async (cfopAtual, novoCfop, salvarRegra = false, categoria = null) => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setResolvingGroup(cfopAtual);
    
    try {
      const token = localStorage.getItem('token');
      let url = `${API}/alertas-cfop/resolver-grupo?company_id=${selectedCompany.id}&competencia=${encodeURIComponent(selectedCompetencia)}&cfop_atual=${cfopAtual}&novo_cfop=${novoCfop}&salvar_regra=${salvarRegra}`;
      
      // Adicionar categoria se informada
      if (categoria) {
        url += `&categoria=${categoria}`;
      }
      
      const response = await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const categoriaMsg = response.data.categoria_atribuida 
          ? ` → Classificados como "${response.data.categoria_atribuida}"`
          : '';
        toast.success(response.data.message + categoriaMsg);
        fetchAlertas(); // Recarregar alertas
        fetchValidacao(); // Atualizar grupos validados
      } else {
        toast.error(response.data.message || 'Erro ao processar grupo');
      }
    } catch (err) {
      console.error('Erro ao resolver grupo:', err);
      toast.error('Erro ao resolver grupo de CFOPs');
    } finally {
      setResolvingGroup(null);
      setEditingCfop(prev => ({ ...prev, [cfopAtual]: false }));
    }
  };

  // NOVO: Função para resolver CFOP de produto individual
  const resolverCfopProdutoIndividual = async (cfopGrupo, prod, novoCfop, categoria = null) => {
    const prodKey = `${cfopGrupo}_${prod.documento_id}_${prod.produto_idx}`;
    
    // Validar CFOP
    if (!novoCfop || !/^\d{4}$/.test(novoCfop)) {
      toast.error('CFOP deve ter 4 dígitos');
      return;
    }
    
    setEditingCfopProduto(prev => ({
      ...prev,
      [prodKey]: { ...prev[prodKey], saving: true }
    }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/alertas-cfop/resolver-individual`,
        {
          company_id: selectedCompany.id,
          competencia: selectedCompetencia,
          documento_id: prod.documento_id,
          produto_idx: prod.produto_idx,
          novo_cfop: novoCfop,
          categoria_destino: categoria
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(`Produto atualizado para CFOP ${novoCfop}`);
        fetchAlertas();
        setEditingCfopProduto(prev => {
          const newState = { ...prev };
          delete newState[prodKey];
          return newState;
        });
      } else {
        toast.error(response.data.message || 'Erro ao atualizar produto');
      }
    } catch (err) {
      console.error('Erro ao resolver CFOP individual:', err);
      toast.error('Erro ao atualizar CFOP do produto');
    } finally {
      setEditingCfopProduto(prev => ({
        ...prev,
        [prodKey]: { ...prev[prodKey], saving: false }
      }));
    }
  };

  // Função para enviar comando de IA
  const enviarComandoIA = async () => {
    if (!comandoIA.trim() || processandoIA) return;
    
    setProcessandoIA(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/classification/ia-command/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}&comando=${encodeURIComponent(comandoIA)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const totalAlteracoes = response.data.total_alteracoes || 0;
        
        if (totalAlteracoes > 0) {
          toast.success(`✨ ${totalAlteracoes} produto(s) classificado(s) com sucesso!`);
          
          // Mostrar detalhes das alterações
          response.data.alteracoes?.slice(0, 3).forEach(alt => {
            toast.info(`${alt.produto?.substring(0, 30)}... → ${alt.categoria_nova}`);
          });
          
          if (response.data.regra_salva) {
            toast.success('📝 Regra salva na memória para uso futuro');
          }
          
          // Recarregar dados
          fetchValidacao();
          setComandoIA('');
        } else {
          toast.warning(response.data.message || 'Nenhum produto correspondeu ao comando');
        }
      } else {
        toast.error(response.data.message || 'Erro ao processar comando');
      }
    } catch (err) {
      console.error('Erro ao enviar comando IA:', err);
      toast.error('Erro ao processar comando de IA');
    } finally {
      setProcessandoIA(false);
    }
  };

  // Salvar alteração de produto individual
  const salvarAlteracaoProduto = async (novaCategoria) => {
    if (!editingProduct || savingProduct) return;
    
    setSavingProduct(true);
    
    try {
      const token = localStorage.getItem('token');
      const prod = editingProduct.prod;
      
      // Usar as ocorrências para atualizar todos os documentos que têm esse produto
      if (prod.ocorrencias && prod.ocorrencias.length > 0) {
        // Atualizar cada ocorrência do produto
        for (const ocorrencia of prod.ocorrencias) {
          await axios.post(
            `${API}/products/classify-single`,
            {
              document_id: ocorrencia.doc_id,
              product_idx: ocorrencia.produto_idx,
              nova_categoria: novaCategoria,
              salvar_regra: true
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        
        toast.success(`Produto "${prod.descricao?.substring(0, 30)}..." reclassificado para ${categoriasConfig[novaCategoria]?.label || novaCategoria}`);
        fetchValidacao(); // Recarregar dados
      } else {
        toast.error('Não foi possível identificar as ocorrências do produto');
      }
    } catch (err) {
      console.error('Erro ao salvar alteração:', err);
      toast.error('Erro ao reclassificar produto');
    } finally {
      setSavingProduct(false);
      setEditingProduct(null);
    }
  };

  // NOVO: Função para ordenar por coluna
  const handleColumnSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // NOVO: Função para selecionar/deselecionar produto
  const toggleProductSelection = (productKey) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productKey)) {
      newSelected.delete(productKey);
    } else {
      newSelected.add(productKey);
    }
    setSelectedProducts(newSelected);
    setShowBatchActions(newSelected.size > 0);
  };

  // NOVO: Selecionar todos os produtos de uma categoria
  const selectAllInCategory = (categoria, produtos) => {
    const newSelected = new Set(selectedProducts);
    produtos.forEach(p => {
      const key = `${categoria}_${p.codigo}_${p.descricao}`;
      newSelected.add(key);
    });
    setSelectedProducts(newSelected);
    setShowBatchActions(newSelected.size > 0);
  };

  // NOVO: Desselecionar todos
  const clearSelection = () => {
    setSelectedProducts(new Set());
    setShowBatchActions(false);
  };

  // NOVO: Reclassificar em lote
  const reclassificarEmLote = async (novaCategoria) => {
    if (selectedProducts.size === 0) return;
    
    setProcessandoIA(true);
    const token = localStorage.getItem('token');
    let sucessos = 0;
    let erros = 0;

    // Encontrar os produtos selecionados
    const produtosParaReclassificar = [];
    Object.entries(produtosAgrupados).forEach(([categoria, grupo]) => {
      grupo.produtos.forEach(prod => {
        const key = `${categoria}_${prod.codigo}_${prod.descricao}`;
        if (selectedProducts.has(key)) {
          produtosParaReclassificar.push({ ...prod, categoriaOriginal: categoria });
        }
      });
    });

    for (const prod of produtosParaReclassificar) {
      try {
        if (prod.ocorrencias && prod.ocorrencias.length > 0) {
          for (const ocorrencia of prod.ocorrencias) {
            await axios.post(
              `${API}/products/classify-single`,
              {
                document_id: ocorrencia.doc_id,
                product_idx: ocorrencia.produto_idx,
                nova_categoria: novaCategoria,
                salvar_regra: false
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
          sucessos++;
        }
      } catch (err) {
        erros++;
      }
    }

    setProcessandoIA(false);
    clearSelection();
    
    if (sucessos > 0) {
      toast.success(`${sucessos} produto(s) reclassificado(s) como ${categoriasConfig[novaCategoria]?.label || novaCategoria}`);
      fetchValidacao();
    }
    if (erros > 0) {
      toast.error(`${erros} produto(s) não puderam ser reclassificados`);
    }
  };

  // Configuração das categorias de classificação
  const categoriasConfig = {
    revenda: { label: 'Compra para Revenda', color: 'blue', icon: '🛒' },
    produto: { label: 'Compra para Revenda', color: 'blue', icon: '🛒' },
    insumo: { label: 'Compra para Industrialização', color: 'green', icon: '⚙️' },
    despesa: { label: 'Uso e Consumo', color: 'red', icon: '📋' },
    ativo_imobilizado: { label: 'Ativo Imobilizado', color: 'amber', icon: '🏭' },
    combustivel: { label: 'Combustível', color: 'cyan', icon: '⛽' },
    bonificacao: { label: 'Bonificação/Doação', color: 'teal', icon: '🎁' },
    amostra_gratis: { label: 'Amostra Grátis', color: 'cyan', icon: '🧪' },
    energia_eletrica: { label: 'Energia Elétrica', color: 'amber', icon: '⚡' },
    servico_tomado: { label: 'Serviço Tomado', color: 'slate', icon: '🔧' },
    servico_aplicacao: { label: 'Aplicação em Serviços', color: 'slate', icon: '🛠️' },
    aplicacao_servico: { label: 'Aplicação em Serviços', color: 'slate', icon: '🛠️' },
    servico_comunicacao: { label: 'Serviço de Comunicação', color: 'blue', icon: '📡' },
    servico_transporte: { label: 'Serviço de Transporte', color: 'blue', icon: '🚚' },
    servico_issqn: { label: 'Serviço (ISSQN)', color: 'slate', icon: '📄' },
    conserto_reparo: { label: 'Conserto/Reparo', color: 'orange', icon: '🔨' },
    retorno_demonstracao: { label: 'Retorno de Demonstração', color: 'gray', icon: '↩️' },
    retorno_exposicao: { label: 'Retorno de Exposição', color: 'gray', icon: '🎪' },
    entrada_mercadoria_devolucao: { label: 'Devolução de Mercadoria', color: 'orange', icon: '↩️' },
    retorno_industrializacao: { label: 'Retorno de Industrialização', color: 'green', icon: '🏭' },
    compra_industrializacao_futura: { label: 'Industrialização Futura', color: 'green', icon: '📆' },
    devolucao_simples_remessa: { label: 'Devolução Simples Remessa', color: 'gray', icon: '↩️' },
    entrada_embalagem: { label: 'Embalagem/Vasilhame', color: 'gray', icon: '📦' },
    entrada_armazem_deposito: { label: 'Armazém/Depósito', color: 'gray', icon: '🏢' },
    retorno_merc_remetida_consig: { label: 'Retorno de Consignação', color: 'gray', icon: '🔄' },
    devolucao: { label: 'Devolução', color: 'orange', icon: '↩️' },
    operacao_distinta: { label: 'Operação Distinta', color: 'orange', icon: '⚠️' },
    outros: { label: 'Outras Entradas', color: 'gray', icon: '📦' },
    outras_entradas: { label: 'Outras Entradas', color: 'gray', icon: '📦' },
    pendente: { label: 'Pendente de Classificação', color: 'gray', icon: '❓' }
  };

  // Determinar qual lista usar baseado na aba selecionada
  const produtosAtuais = useMemo(() => {
    if (!validacaoData) return [];
    
    switch (classificacaoTab) {
      case 'novos':
        return validacaoData.produtos_novos || [];
      case 'classificados':
        return validacaoData.produtos_ja_classificados || [];
      case 'todos':
        return validacaoData.todos || [];
      default:
        return validacaoData.produtos_novos || [];
    }
  }, [validacaoData, classificacaoTab]);

  // Agrupar produtos por classificação
  const produtosAgrupados = useMemo(() => {
    if (!produtosAtuais || produtosAtuais.length === 0) return {};
    
    let filtered = produtosAtuais;
    
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
      // IMPORTANTE: Normalizar categoria para minúsculas (backend pode enviar em maiúsculas)
      const categoriaRaw = prod.categoria_atual || 'pendente';
      const categoria = categoriaRaw.toLowerCase();
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
  }, [produtosAtuais, searchTerm, filterStatus, sortOrder]);

  // Ordem de exibição das categorias (com as novas categorias)
  const ordemCategorias = [
    'revenda', 'produto', 'insumo', 'despesa', 'ativo_imobilizado', 'combustivel',
    'devolucao', 'bonificacao', 'amostra_gratis', 'conserto_reparo', 'retorno_demonstracao',
    'retorno_exposicao', 'entrada_mercadoria_devolucao', 'retorno_industrializacao',
    'devolucao_simples_remessa', 'entrada_embalagem', 'retorno_merc_remetida_consig',
    'energia_eletrica', 'servico_tomado', 'servico_aplicacao', 
    'aplicacao_servico', 'servico_comunicacao', 'servico_transporte', 'servico_issqn',
    'operacao_distinta', 'outros', 'outras_entradas', 'pendente'
  ];
  
  // Nomes amigáveis para exibição
  const nomesCategoria = {
    'revenda': 'Compra para Revenda',
    'produto': 'Compra para Revenda',
    'insumo': 'Compra para Industrialização',
    'despesa': 'Uso e Consumo',
    'ativo_imobilizado': 'Ativo Imobilizado',
    'combustivel': 'Combustível',
    'bonificacao': 'Bonificação/Doação',
    'amostra_gratis': 'Amostra Grátis',
    'conserto_reparo': 'Conserto/Reparo',
    'retorno_demonstracao': 'Retorno de Demonstração',
    'retorno_exposicao': 'Retorno de Exposição',
    'entrada_mercadoria_devolucao': 'Devolução de Mercadoria',
    'retorno_industrializacao': 'Retorno de Industrialização',
    'compra_industrializacao_futura': 'Industrialização Futura',
    'devolucao_simples_remessa': 'Devolução Simples Remessa',
    'entrada_embalagem': 'Embalagem/Vasilhame',
    'entrada_armazem_deposito': 'Armazém/Depósito',
    'retorno_merc_remetida_consig': 'Retorno de Consignação',
    'devolucao': 'Devolução',
    'operacao_distinta': 'Operação Distinta',
    'energia_eletrica': 'Energia Elétrica',
    'servico_tomado': 'Serviço Tomado',
    'servico_aplicacao': 'Aplicação em Serviços',
    'servico_comunicacao': 'Serviço de Comunicação',
    'servico_transporte': 'Serviço de Transporte',
    'servico_issqn': 'Serviço (ISSQN)',
    'outros': 'Outras Operações',
    'pendente': 'Pendente de Classificação'
  };

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
      <div className="min-h-full pb-20">
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
          
          <div className="flex items-center gap-3">
            <button
              onClick={openMemoriaIA}
              className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-900/50 hover:text-purple-200 transition-colors"
              data-testid="btn-memoria-ia"
            >
              <BookOpen className="w-4 h-4" />
              Memória IA
              {memoriaData.length > 0 && (
                <span className="bg-purple-500/30 text-purple-200 text-xs px-1.5 py-0.5 rounded-full">
                  {memoriaData.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => { fetchAlertas(); fetchValidacao(); }}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ========== BARRA DE COMANDO IA ========== */}
        <div className="bg-gradient-to-r from-[#C8A951]/10 to-purple-500/10 border border-[#C8A951]/30 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#C8A951]" />
            <span className="text-white text-sm font-medium">Comando de IA</span>
            <div className="flex-1 relative ml-2">
              <input
                type="text"
                value={comandoIA}
                onChange={(e) => setComandoIA(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarComandoIA()}
                placeholder="Ex: classificar etanol e gasolina como combustível..."
                className="w-full px-3 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-[#666] focus:border-[#C8A951] focus:outline-none focus:ring-1 focus:ring-[#C8A951]/50"
                disabled={processandoIA}
              />
              {processandoIA && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2A2A2A] rounded-b-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#C8A951] via-[#D4B962] to-[#C8A951] animate-pulse" 
                       style={{ 
                         width: '100%',
                         animation: 'progressPulse 1.5s ease-in-out infinite'
                       }} 
                  />
                </div>
              )}
            </div>
            <button
              id="btn-processar-comando"
              onClick={enviarComandoIA}
              disabled={!comandoIA.trim() || processandoIA}
              className="px-4 py-2 bg-[#C8A951] hover:bg-[#D4B962] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processandoIA ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Processando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Executar</span>
                </>
              )}
            </button>
          </div>
          
          {/* Barra de progresso detalhada quando IA está processando */}
          {processandoIA && (
            <div className="mt-2 p-2 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-4 h-4 text-[#C8A951] animate-spin" />
                <span className="text-white text-sm">Analisando produtos...</span>
              </div>
              <div className="w-full bg-[#0C0C0C] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#C8A951] to-[#D4B962] rounded-full transition-all duration-300"
                  style={{ 
                    width: '100%',
                    animation: 'progressWave 2s ease-in-out infinite'
                  }}
                />
              </div>
              <style>{`
                @keyframes progressWave {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
                @keyframes progressPulse {
                  0%, 100% { opacity: 0.5; }
                  50% { opacity: 1; }
                }
              `}</style>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-[#666]">Sugestões:</span>
            {[
              { cmd: 'classificar todos produtos de limpeza como despesa', label: 'limpeza → despesa' },
              { cmd: 'todo etanol, gasolina e diesel são combustível', label: 'combustíveis' },
              { cmd: 'classificar embalagens e caixas como insumo', label: 'embalagens → insumo' },
              { cmd: 'papel, caneta e material de escritório são despesa', label: 'escritório → despesa' }
            ].map((s, i) => (
              <button 
                key={i}
                onClick={() => setComandoIA(s.cmd)}
                className="text-xs px-2 py-0.5 bg-[#1A1A1A] text-[#A1A1AA] rounded hover:bg-[#2A2A2A] hover:text-white transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========== SEÇÃO DE ALERTAS - COMPACTA ========== */}
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="p-3 border-b border-[#2A2A2A] bg-gradient-to-r from-amber-900/20 to-amber-950/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-white">Alertas de CFOP</h2>
                {alertasData?.total_produtos_pendentes > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                    {alertasData.total_produtos_pendentes}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-2">
            {alertasLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#C8A951] animate-spin" />
              </div>
            ) : alertasError ? (
              <div className="text-center py-4 text-red-400 text-sm">{alertasError}</div>
            ) : alertasData?.grupos?.length > 0 ? (
              <div className="space-y-2">
                {alertasData.grupos.map((grupo, idx) => {
                  // Verificar se é CFOP de SAÍDA (original do emissor) - estes não têm "manter"
                  const cfopOriginal = grupo.cfop_original || '';
                  const isCfopSaida = cfopOriginal.startsWith('5') || cfopOriginal.startsWith('6') || cfopOriginal.startsWith('7');
                  
                  // Flag do backend indica se o CFOP de entrada equivalente é inválido
                  const cfopManterInvalido = grupo.sugestao_manter?.cfop_invalido === true;
                  
                  // O CFOP atual já é de entrada (1xxx, 2xxx) - pode ser mantido SE for válido
                  const cfopAtual = grupo.cfop || '';
                  // Apenas 1929/2929 (ECF) são inválidos como entrada - 1949/2949 EXISTEM e são válidos
                  const isEntradaValida = (cfopAtual.startsWith('1') || cfopAtual.startsWith('2')) && 
                                          !['1929', '2929'].includes(cfopAtual) && 
                                          !cfopManterInvalido;
                  
                  // Mostrar botão "Manter" APENAS se:
                  // 1. O CFOP atual é de entrada válido (1xxx, 2xxx que não seja genérico demais)
                  // 2. O backend não marcou como inválido
                  const mostrarBotaoManter = isEntradaValida;
                  
                  return (
                    <div 
                      key={grupo.cfop || idx}
                      className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden"
                    >
                      {/* Header compacto do grupo CFOP */}
                      <div className="p-2 px-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold font-mono text-amber-400 bg-amber-500/20 px-2 py-1 rounded">{grupo.cfop}</span>
                            <div className="flex flex-col">
                              <span className="text-white text-sm font-medium">{grupo.descricao}</span>
                              <span className="text-xs text-[#666]">
                                {grupo.quantidade} prod. • {formatCurrency(grupo.valor_total)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Botões de ação compactos */}
                          <div className="flex items-center gap-1.5">
                            {/* Botão "Manter Natureza" - só se CFOP de entrada for válido */}
                            {mostrarBotaoManter && (
                              <button
                                onClick={() => resolverGrupoCfop(grupo.cfop, grupo.sugestao_manter.cfop, true)}
                                disabled={resolvingGroup === grupo.cfop}
                                className="px-2 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-medium flex items-center gap-1 hover:bg-blue-500/30 disabled:opacity-50"
                              >
                                {resolvingGroup === grupo.cfop ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                                → {grupo.sugestao_manter.cfop}
                              </button>
                            )}
                            
                            {/* Botão Converter para Compra */}
                            <button
                              onClick={() => resolverGrupoCfop(grupo.cfop, grupo.sugestao_compra.cfop, true)}
                              disabled={resolvingGroup === grupo.cfop}
                              className="px-2 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-medium flex items-center gap-1 hover:bg-green-500/30 disabled:opacity-50"
                            >
                              <ArrowRight className="w-3 h-3" />
                              → {grupo.sugestao_compra.cfop}
                              <span className="px-1 bg-green-500/30 rounded text-[10px]">
                                {grupo.sugestao_compra.categoria_nome || 'Revenda'}
                              </span>
                            </button>
                            
                            {/* Botão Outro CFOP */}
                            <button
                              onClick={() => setEditingCfop(prev => ({ ...prev, [grupo.cfop]: !prev[grupo.cfop] }))}
                              className="px-2 py-1.5 bg-[#2A2A2A] text-[#A1A1AA] border border-[#333] rounded text-xs hover:bg-[#333] hover:text-white"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            
                            {/* Expandir */}
                            <button
                              onClick={() => toggleAlert(grupo.cfop)}
                              className="p-1.5 bg-[#2A2A2A] text-[#A1A1AA] border border-[#333] rounded hover:bg-[#333] hover:text-white"
                            >
                              {expandedAlerts[grupo.cfop] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        
                        {/* Aviso para CFOP de saída sem entrada equivalente */}
                        {isCfopSaida && !mostrarBotaoManter && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            <span>CFOP de saída sem entrada equivalente. Escolha um CFOP de entrada válido.</span>
                          </div>
                        )}
                        
                        {/* Campo de edição manual compacto */}
                        {editingCfop[grupo.cfop] && (
                          <div className="mt-2 p-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              id={`cfop-manual-${grupo.cfop}`}
                              placeholder="CFOP"
                              maxLength={4}
                              className="w-16 px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-white font-mono text-center text-sm focus:border-[#C8A951] outline-none"
                            />
                            <select
                              id={`categoria-manual-${grupo.cfop}`}
                              className="px-2 py-1 bg-[#141414] border border-[#2A2A2A] rounded text-white text-xs focus:border-[#C8A951] outline-none"
                            >
                              <option value="">Auto</option>
                              <option value="revenda">Revenda</option>
                              <option value="insumo">Insumo</option>
                              <option value="despesa">Despesa</option>
                              <option value="ativo_imobilizado">Ativo</option>
                              <option value="combustivel">Combustível</option>
                              <option value="bonificacao">Bonificação</option>
                            </select>
                            <button
                              onClick={() => {
                                const inputCfop = document.getElementById(`cfop-manual-${grupo.cfop}`);
                                const selectCategoria = document.getElementById(`categoria-manual-${grupo.cfop}`);
                                const novoCfop = inputCfop?.value?.trim();
                                const categoria = selectCategoria?.value || null;
                                if (novoCfop && /^\d{4}$/.test(novoCfop)) {
                                  resolverGrupoCfop(grupo.cfop, novoCfop, true, categoria);
                                } else {
                                  toast.error('CFOP deve ter 4 dígitos');
                                }
                              }}
                              disabled={resolvingGroup === grupo.cfop}
                              className="px-2 py-1 bg-[#C8A951]/20 text-[#C8A951] border border-[#C8A951]/30 rounded text-xs hover:bg-[#C8A951]/30 disabled:opacity-50"
                            >
                              Aplicar
                            </button>
                          </div>
                        )}
                      </div>
                    
                    {/* Lista de produtos (expandida) - Compacta */}
                    {expandedAlerts[grupo.cfop] && grupo.produtos && (
                      <div className="border-t border-[#2A2A2A]">
                        <div className="max-h-[200px] overflow-y-auto">
                          {grupo.produtos.map((prod, prodIdx) => (
                            <div 
                              key={prodIdx}
                              className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b border-[#1A1A1A] hover:bg-[#1A1A1A]"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="font-mono text-amber-400 shrink-0">{prod.numero_nfe}</span>
                                <span className="text-[#A1A1AA] truncate">{prod.produto_descricao}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[#666] font-mono">{prod.ncm}</span>
                                <span className="text-[#C8A951]">{formatCurrency(prod.valor)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-[#A1A1AA]">
                <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm">Nenhum alerta - CFOPs corretos</span>
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
                  <h2 className="text-lg font-semibold text-white">Classificação de Produtos</h2>
                  <p className="text-sm text-[#A1A1AA]">Produtos agrupados por classificação</p>
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
                  title={sortOrder === 'desc' ? 'Maior valor primeiro' : 'Menor valor primeiro'}
                >
                  {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Abas: Novos | Já Classificados | Todos */}
            <div className="mt-4 flex items-center gap-1 border-b border-[#2A2A2A]">
              <button
                onClick={() => setClassificacaoTab('novos')}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  classificacaoTab === 'novos'
                    ? 'bg-[#C8A951]/20 text-[#C8A951] border-b-2 border-[#C8A951]'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Novos Produtos
                {validacaoData?.resumo?.novos > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    classificacaoTab === 'novos' ? 'bg-[#C8A951] text-black' : 'bg-[#2A2A2A] text-[#A1A1AA]'
                  }`}>
                    {validacaoData.resumo.novos}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setClassificacaoTab('classificados')}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  classificacaoTab === 'classificados'
                    ? 'bg-green-500/20 text-green-400 border-b-2 border-green-400'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Já Classificados
                {validacaoData?.resumo?.ja_classificados > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    classificacaoTab === 'classificados' ? 'bg-green-500 text-black' : 'bg-[#2A2A2A] text-[#A1A1AA]'
                  }`}>
                    {validacaoData.resumo.ja_classificados}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setClassificacaoTab('todos')}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  classificacaoTab === 'todos'
                    ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Layers className="w-4 h-4" />
                Todos do Mês
                {validacaoData?.resumo?.total_produtos > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    classificacaoTab === 'todos' ? 'bg-blue-500 text-black' : 'bg-[#2A2A2A] text-[#A1A1AA]'
                  }`}>
                    {validacaoData.resumo.total_produtos}
                  </span>
                )}
              </button>
              
              {/* Info sobre classificações automáticas */}
              {validacaoData?.resumo?.classificacoes_aplicadas_automaticamente > 0 && (
                <div className="ml-auto flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
                  <CheckCheck className="w-4 h-4" />
                  <span>{validacaoData.resumo.classificacoes_aplicadas_automaticamente} classificações aplicadas automaticamente</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-3">
            {/* Barra de Ações em Lote - Compacta */}
            {showBatchActions && selectedProducts.size > 0 && (
              <div className="mb-3 p-2 bg-[#C8A951]/10 border border-[#C8A951]/30 rounded-lg">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-[#C8A951] text-sm font-medium">
                    {selectedProducts.size} selecionado(s)
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-[#A1A1AA] hover:text-white text-xs underline"
                  >
                    Limpar
                  </button>
                  <span className="text-[#666]">|</span>
                  <span className="text-[#A1A1AA] text-xs">Reclassificar:</span>
                  {[
                    { key: 'revenda', label: 'Revenda', icon: '🛒' },
                    { key: 'insumo', label: 'Insumo', icon: '⚙️' },
                    { key: 'despesa', label: 'Despesa', icon: '📋' },
                    { key: 'ativo_imobilizado', label: 'Ativo', icon: '🏭' },
                    { key: 'combustivel', label: 'Combust.', icon: '⛽' },
                    { key: 'servico_aplicacao', label: 'Serviço', icon: '🛠️' }
                  ].map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => reclassificarEmLote(cat.key)}
                      disabled={processandoIA}
                      className="px-2 py-1 bg-[#2A2A2A] hover:bg-[#333] text-white text-xs rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {validacaoLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#C8A951] animate-spin" />
              </div>
            ) : validacaoError ? (
              <div className="text-center py-8 text-red-400">{validacaoError}</div>
            ) : Object.keys(produtosAgrupados).length > 0 ? (
              <div className="space-y-3">
                {/* Resumo - Compacto em linha */}
                <div className="flex flex-wrap items-center gap-3 mb-3 p-2 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{validacaoData?.resumo?.total_produtos || 0}</span>
                    <span className="text-xs text-[#A1A1AA]">Total</span>
                  </div>
                  <div className="w-px h-6 bg-[#2A2A2A]"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-green-400">{validacaoData?.resumo?.validados || 0}</span>
                    <span className="text-xs text-[#A1A1AA]">Classificados</span>
                  </div>
                  <div className="w-px h-6 bg-[#2A2A2A]"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-400">{validacaoData?.resumo?.pendentes || 0}</span>
                    <span className="text-xs text-[#A1A1AA]">Pendentes</span>
                    {validacaoData?.resumo?.pendentes > 0 && (
                      <button
                        onClick={() => {
                          setComandoIA('classificar todos os produtos pendentes como compra para revenda');
                          setTimeout(() => document.querySelector('#btn-processar-comando')?.click(), 100);
                        }}
                        className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors"
                      >
                        Resolver
                      </button>
                    )}
                  </div>
                  <div className="w-px h-6 bg-[#2A2A2A]"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#C8A951]">{formatCurrency(validacaoData?.resumo?.valor_total)}</span>
                    <span className="text-xs text-[#A1A1AA]">Valor Total</span>
                  </div>
                </div>

                {/* Grupos por Classificação */}
                <div className="space-y-3">
                  {ordemCategorias.map(categoria => {
                    const grupo = produtosAgrupados[categoria];
                    if (!grupo || grupo.produtos.length === 0) return null;
                    
                    const config = categoriasConfig[categoria] || categoriasConfig.revenda;
                    const isExpanded = expandedGroups[categoria];
                    
                    const colorClasses = {
                      blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                      green: 'bg-green-500/10 border-green-500/30 text-green-400',
                      red: 'bg-red-500/10 border-red-500/30 text-red-400',
                      amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                      orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                      purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
                      gray: 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    };
                    
                    const headerColor = colorClasses[config.color] || colorClasses.gray;
                    
                    return (
                      <div key={categoria} className="bg-[#141414] border border-[#2A2A2A] rounded-lg overflow-hidden">
                        {/* Cabeçalho do Grupo - Clicável */}
                        <div
                          onClick={() => toggleGroup(categoria)}
                          className={`w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors cursor-pointer ${headerColor.split(' ')[0]}`}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-[#A1A1AA]" />
                            )}
                            <span className="text-xl">{config.icon}</span>
                            <div className="text-left">
                              <span className={`font-semibold ${headerColor.split(' ')[2]}`}>
                                {config.label}
                              </span>
                              <span className="text-[#A1A1AA] text-sm ml-2">
                                ({grupo.quantidade} {grupo.quantidade === 1 ? 'produto' : 'produtos'})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Botão Selecionar Todos */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllInCategory(categoria, grupo.produtos);
                              }}
                              className="px-2 py-1 text-xs bg-[#2A2A2A] text-[#A1A1AA] rounded hover:bg-[#333] hover:text-white transition-colors"
                              title="Selecionar todos desta categoria"
                            >
                              Selecionar
                            </button>
                            <span className="text-white font-bold text-lg">
                              {formatCurrency(grupo.valor_total)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Lista de Produtos Expandida */}
                        {isExpanded && (
                          <div className="border-t border-[#2A2A2A]">
                            <div className="max-h-[500px] overflow-y-auto scroll-smooth">
                              <table className="w-full">
                                <thead className="bg-[#0C0C0C] sticky top-0 z-10">
                                  <tr>
                                    <th className="w-8 px-2 py-2">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            selectAllInCategory(categoria, grupo.produtos);
                                          } else {
                                            grupo.produtos.forEach(p => {
                                              const key = `${categoria}_${p.codigo}_${p.descricao}`;
                                              selectedProducts.delete(key);
                                            });
                                            setSelectedProducts(new Set(selectedProducts));
                                          }
                                        }}
                                      />
                                    </th>
                                    <th 
                                      className="text-left px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase cursor-pointer hover:text-white transition-colors"
                                      onClick={() => handleColumnSort('descricao')}
                                    >
                                      <div className="flex items-center gap-1">
                                        Produto
                                        {sortColumn === 'descricao' && (
                                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="text-left px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase w-28 cursor-pointer hover:text-white transition-colors"
                                      onClick={() => handleColumnSort('ncm')}
                                    >
                                      <div className="flex items-center gap-1">
                                        NCM
                                        {sortColumn === 'ncm' && (
                                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="text-left px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase w-20 cursor-pointer hover:text-white transition-colors"
                                      onClick={() => handleColumnSort('cfop')}
                                    >
                                      <div className="flex items-center gap-1">
                                        CFOP
                                        {sortColumn === 'cfop' && (
                                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="text-right px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase w-20 cursor-pointer hover:text-white transition-colors"
                                      onClick={() => handleColumnSort('quantidade')}
                                    >
                                      <div className="flex items-center justify-end gap-1">
                                        Qtd
                                        {sortColumn === 'quantidade' && (
                                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                        )}
                                      </div>
                                    </th>
                                    <th 
                                      className="text-right px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase w-28 cursor-pointer hover:text-white transition-colors"
                                      onClick={() => handleColumnSort('valor')}
                                    >
                                      <div className="flex items-center justify-end gap-1">
                                        Valor
                                        {sortColumn === 'valor' && (
                                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                        )}
                                      </div>
                                    </th>
                                    <th className="text-center px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase w-24">NFs</th>
                                    <th className="text-center px-4 py-2 text-xs font-medium text-[#A1A1AA] uppercase w-20">Ações</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2A2A2A]">
                                  {[...grupo.produtos]
                                    .sort((a, b) => {
                                      let aVal, bVal;
                                      switch (sortColumn) {
                                        case 'descricao':
                                          aVal = (a.descricao || '').toLowerCase();
                                          bVal = (b.descricao || '').toLowerCase();
                                          break;
                                        case 'ncm':
                                          aVal = a.ncm || '';
                                          bVal = b.ncm || '';
                                          break;
                                        case 'cfop':
                                          aVal = a.cfop_atual || '';
                                          bVal = b.cfop_atual || '';
                                          break;
                                        case 'quantidade':
                                          aVal = a.quantidade || 0;
                                          bVal = b.quantidade || 0;
                                          break;
                                        case 'valor':
                                          aVal = a.valor_total || 0;
                                          bVal = b.valor_total || 0;
                                          break;
                                        default:
                                          aVal = (a.descricao || '').toLowerCase();
                                          bVal = (b.descricao || '').toLowerCase();
                                      }
                                      if (sortDirection === 'asc') {
                                        return aVal > bVal ? 1 : -1;
                                      } else {
                                        return aVal < bVal ? 1 : -1;
                                      }
                                    })
                                    .map((prod, idx) => {
                                      const productKey = `${categoria}_${prod.codigo}_${prod.descricao}`;
                                      const isSelected = selectedProducts.has(productKey);
                                      
                                      return (
                                        <tr 
                                          key={productKey} 
                                          className={`hover:bg-white/5 group ${isSelected ? 'bg-[#C8A951]/10' : ''}`}
                                        >
                                          <td className="px-2 py-3">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleProductSelection(productKey)}
                                              className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C] text-[#C8A951] focus:ring-[#C8A951]"
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                          </td>
                                          <td className="px-4 py-3">
                                            <p className="text-white text-sm truncate max-w-[300px] group-hover:text-[#C8A951]" title={prod.descricao}>
                                              {prod.descricao}
                                            </p>
                                            {prod.codigo && (
                                              <p className="text-[#666] text-xs mt-0.5">Cód: {prod.codigo}</p>
                                            )}
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-[#A1A1AA] font-mono text-xs">{prod.ncm || '-'}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-[#2A2A2A] text-[#A1A1AA] rounded text-xs font-mono">
                                              {prod.cfop_atual || '-'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-[#A1A1AA] text-sm">{prod.quantidade?.toFixed(0) || 0}</span>
                                          </td>
                                          <td className="px-4 py-3 text-right">
                                            <span className="text-[#C8A951] font-medium text-sm">{formatCurrency(prod.valor_total)}</span>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {prod.ocorrencias && prod.ocorrencias.length > 0 ? (
                                              <NFsList ocorrencias={prod.ocorrencias} maxVisible={2} />
                                            ) : (
                                              <span className="text-[#666] text-xs">0</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // Fazer cópia profunda do produto para evitar problemas de referência
                                                const prodCopy = JSON.parse(JSON.stringify(prod));
                                                setEditingProduct({ 
                                                  categoria, 
                                                  idx, 
                                                  prod: prodCopy,
                                                  novaCategoria: categoria 
                                                });
                                              }}
                                              className="p-1.5 text-[#666] hover:text-[#C8A951] hover:bg-[#C8A951]/10 rounded transition-colors"
                                              title="Reclassificar produto"
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#A1A1AA]">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-medium">Nenhum produto encontrado</p>
                <p className="text-sm">Importe documentos para começar</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Edição de Produto */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-lg overflow-hidden">
              <div className="p-4 border-b border-[#2A2A2A]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit3 className="w-5 h-5 text-[#C8A951]" />
                    <h3 className="text-lg font-semibold text-white">Reclassificar Produto</h3>
                  </div>
                  <button 
                    onClick={() => setEditingProduct(null)}
                    className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Info do Produto */}
                <div className="bg-[#0C0C0C] rounded-lg p-4 border border-[#2A2A2A]">
                  <p className="text-white font-medium">{editingProduct.prod?.descricao}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#A1A1AA]">
                    <span className="font-mono">NCM: {editingProduct.prod?.ncm || '-'}</span>
                    <span className="font-mono">CFOP: {editingProduct.prod?.cfop_atual || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-[#666]">Categoria atual:</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      editingProduct.categoria === 'pendente' ? 'bg-gray-500/20 text-gray-400' : 'bg-[#C8A951]/20 text-[#C8A951]'
                    }`}>
                      {categoriasConfig[editingProduct.categoria]?.label || editingProduct.categoria}
                    </span>
                  </div>
                  {editingProduct.prod?.ocorrencias && (
                    <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                      <span className="text-xs text-[#666]">Presente em {editingProduct.prod.ocorrencias.length} NF(s): </span>
                      <NFsList ocorrencias={editingProduct.prod.ocorrencias} maxVisible={5} />
                    </div>
                  )}
                </div>
                
                {/* Seleção de Nova Categoria */}
                <div className="space-y-2">
                  <label className="text-sm text-[#A1A1AA] block">Nova classificação:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'revenda', cfop: 'X102' },
                      { key: 'insumo', cfop: 'X101' },
                      { key: 'despesa', cfop: 'X556' },
                      { key: 'ativo_imobilizado', cfop: 'X551' },
                      { key: 'combustivel', cfop: 'X653' },
                      { key: 'servico', cfop: 'X933' }
                    ].map(cat => {
                      const config = categoriasConfig[cat.key] || { label: cat.key, icon: '📦' };
                      const isSelected = editingProduct.novaCategoria === cat.key;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => setEditingProduct(prev => ({ ...prev, novaCategoria: cat.key }))}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isSelected 
                              ? 'border-[#C8A951] bg-[#C8A951]/10 text-[#C8A951]' 
                              : 'border-[#2A2A2A] hover:border-[#3A3A3A] text-[#A1A1AA] hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span className="text-sm font-medium">{config.label}</span>
                          </span>
                          <span className="text-xs font-mono opacity-60">CFOP {cat.cfop}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#666] mt-1">* X = prefixo do CFOP original (1=estadual, 2=interestadual)</p>
                </div>
              </div>
              
              <div className="p-4 border-t border-[#2A2A2A] flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-[#A1A1AA] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => salvarAlteracaoProduto(editingProduct.novaCategoria)}
                  disabled={savingProduct || editingProduct.novaCategoria === editingProduct.categoria}
                  className="flex items-center gap-2 px-4 py-2 bg-[#C8A951] text-black font-medium rounded-lg hover:bg-[#D4B85C] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingProduct ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Memória IA */}
        {showMemoriaIA && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowMemoriaIA(false)}>
            <div 
              className="bg-[#141414] border border-[#2A2A2A] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="p-4 border-b border-[#2A2A2A] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-semibold text-white">Memória IA - Regras Aprendidas</h2>
                  <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                    {memoriaFiltrada.length} de {memoriaData.length} regra(s)
                  </span>
                </div>
                <button
                  onClick={() => setShowMemoriaIA(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#A1A1AA]" />
                </button>
              </div>
              
              {/* Barra de Pesquisa e Ações em Lote */}
              <div className="p-4 border-b border-[#2A2A2A] space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                  <input
                    type="text"
                    placeholder="Buscar por produto, NCM, categoria ou CFOP..."
                    value={memoriaSearch}
                    onChange={(e) => setMemoriaSearch(e.target.value)}
                    className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-[#666] focus:border-purple-500 focus:outline-none"
                  />
                </div>
                
                {/* Ações em lote */}
                {memoriaFiltrada.length > 0 && (
                  <div className="flex items-center justify-between bg-[#0C0C0C] rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRules.size === memoriaFiltrada.length && memoriaFiltrada.length > 0}
                          onChange={selectAllRules}
                          className="w-4 h-4 rounded border-[#2A2A2A] bg-[#1A1A1A] text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-sm text-[#A1A1AA]">
                          Selecionar todas ({memoriaFiltrada.length})
                        </span>
                      </label>
                      {selectedRules.size > 0 && (
                        <span className="text-sm text-purple-400">
                          {selectedRules.size} selecionada(s)
                        </span>
                      )}
                    </div>
                    
                    {selectedRules.size > 0 && (
                      <div className="flex items-center gap-2">
                        {/* Alterar categoria em lote */}
                        <select
                          value={batchCategory}
                          onChange={(e) => {
                            setBatchCategory(e.target.value);
                            if (e.target.value) {
                              updateBatchCategory(e.target.value);
                            }
                          }}
                          disabled={batchUpdating}
                          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                        >
                          <option value="">Alterar categoria...</option>
                          <option value="revenda">Revenda</option>
                          <option value="insumo">Insumo</option>
                          <option value="despesa">Despesa</option>
                          <option value="combustivel">Combustível</option>
                          <option value="ativo_imobilizado">Ativo Imobilizado</option>
                        </select>
                        
                        {/* Excluir em lote */}
                        <button
                          onClick={deleteBatchRules}
                          disabled={batchDeleting}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                        >
                          {batchDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Excluir ({selectedRules.size})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Conteúdo */}
              <div className="p-4 overflow-y-auto max-h-[55vh]">
                {memoriaLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : memoriaFiltrada.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-[#2A2A2A] mx-auto mb-3" />
                    <p className="text-[#A1A1AA]">
                      {memoriaSearch ? 'Nenhuma regra encontrada para a busca' : 'Nenhuma regra aprendida ainda'}
                    </p>
                    <p className="text-sm text-[#666] mt-1">
                      {memoriaSearch ? 'Tente outro termo' : 'Use comandos de IA ou reclassifique produtos para criar regras'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memoriaFiltrada.map((rule) => (
                      <div 
                        key={rule.id} 
                        className={`bg-[#0C0C0C] border rounded-lg p-4 transition-colors ${
                          selectedRules.has(rule.id) 
                            ? 'border-purple-500/50 bg-purple-500/5' 
                            : 'border-[#2A2A2A] hover:border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox de seleção */}
                          <input
                            type="checkbox"
                            checked={selectedRules.has(rule.id)}
                            onChange={() => toggleRuleSelection(rule.id)}
                            className="mt-1 w-4 h-4 rounded border-[#2A2A2A] bg-[#1A1A1A] text-purple-500 focus:ring-purple-500"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-medium truncate">
                                {rule.produto_descricao || rule.descricao_produto || rule.padrao || 'Produto sem descrição'}
                              </span>
                              {rule.ncm && (
                                <span className="text-xs bg-[#1A1A1A] text-[#A1A1AA] px-2 py-0.5 rounded font-mono">
                                  NCM: {rule.ncm}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="text-[#A1A1AA]">Categoria:</span>
                              {editingRule === rule.id ? (
                                <select
                                  defaultValue={rule.categoria || rule.categoria_correta}
                                  onChange={(e) => updateRule(rule.id, e.target.value, rule.cfop || rule.cfop_correto)}
                                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm"
                                >
                                  <option value="revenda">Revenda</option>
                                  <option value="insumo">Insumo</option>
                                  <option value="despesa">Despesa</option>
                                  <option value="ativo_imobilizado">Ativo Imobilizado</option>
                                  <option value="combustivel">Combustível</option>
                                </select>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  (rule.categoria || rule.categoria_correta) === 'revenda' ? 'bg-blue-500/20 text-blue-400' :
                                  (rule.categoria || rule.categoria_correta) === 'insumo' ? 'bg-green-500/20 text-green-400' :
                                  (rule.categoria || rule.categoria_correta) === 'despesa' ? 'bg-orange-500/20 text-orange-400' :
                                  (rule.categoria || rule.categoria_correta) === 'combustivel' ? 'bg-red-500/20 text-red-400' :
                                  'bg-purple-500/20 text-purple-400'
                                }`}>
                                  {(rule.categoria || rule.categoria_correta || 'N/A').toUpperCase()}
                                </span>
                              )}
                              
                              {(rule.cfop || rule.cfop_correto) && (
                                <>
                                  <span className="text-[#666]">|</span>
                                  <span className="text-[#A1A1AA]">CFOP:</span>
                                  <span className="font-mono text-[#C8A951]">{rule.cfop || rule.cfop_correto}</span>
                                </>
                              )}
                              
                              {rule.created_at && (
                                <>
                                  <span className="text-[#666]">|</span>
                                  <span className="text-[#666] text-xs">
                                    {new Date(rule.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {rule.motivo && (
                              <p className="text-xs text-[#666] mt-2 italic">
                                "{rule.motivo}"
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {editingRule === rule.id ? (
                              <button
                                onClick={() => setEditingRule(null)}
                                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4 text-[#A1A1AA]" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingRule(rule.id)}
                                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                                title="Editar regra"
                              >
                                <Edit2 className="w-4 h-4 text-[#A1A1AA] hover:text-white" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteRule(rule.id)}
                              disabled={deletingRule === rule.id}
                              className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Excluir regra"
                            >
                              {deletingRule === rule.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-[#2A2A2A] flex items-center justify-between">
                <p className="text-xs text-[#666]">
                  As regras são aplicadas automaticamente ao classificar novos produtos
                </p>
                <button
                  onClick={() => setShowMemoriaIA(false)}
                  className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default ClassificacaoInteligente;
