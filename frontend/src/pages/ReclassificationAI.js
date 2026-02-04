import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Brain, 
  RefreshCw, 
  FileText, 
  Package, 
  ChevronDown, 
  ChevronRight,
  Check,
  AlertTriangle,
  Send,
  Sparkles,
  Calendar,
  Filter,
  Eye,
  Edit3,
  Save,
  BookOpen
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const ReclassificationAI = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia: ctxCompetencia } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [tipo, setTipo] = useState('');
  const [viewMode, setViewMode] = useState('documentos'); // 'documentos' ou 'produtos'
  const [documents, setDocuments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [aiCommand, setAiCommand] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [learnedRules, setLearnedRules] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [taxValidation, setTaxValidation] = useState(null);
  const [validatingTaxes, setValidatingTaxes] = useState(false);

  // Estado para edição manual
  const [editingProduct, setEditingProduct] = useState(null);
  const [manualEdit, setManualEdit] = useState({
    cfop: '',
    categoria: '',
    motivo: ''
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Auto-preencher com empresa/competência do contexto global
  useEffect(() => {
    if (ctxCompany && !selectedCompany) {
      setSelectedCompany(ctxCompany.id);
    }
    if (ctxCompetencia && !competencia) {
      setCompetencia(ctxCompetencia);
    } else if (!competencia) {
      // Fallback para data atual se não houver contexto
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      setCompetencia(month + '/' + year);
    }
  }, [ctxCompany, ctxCompetencia]);

  useEffect(() => {
    if (selectedCompany) {
      fetchLearnedRules();
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/companies', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const fetchLearnedRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API + '/learned-rules/' + selectedCompany, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setLearnedRules(response.data);
    } catch (err) {
      console.error('Erro ao carregar regras:', err);
    }
  };

  const fetchData = async () => {
    if (!selectedCompany || !competencia) {
      alert('Selecione empresa e competência');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        competencia: competencia
      });
      if (tipo) params.append('tipo', tipo);

      if (viewMode === 'documentos') {
        const response = await axios.get(
          API + '/reclassification/documents/' + selectedCompany + '?' + params.toString(),
          { headers: { Authorization: 'Bearer ' + token } }
        );
        setDocuments(response.data.documentos);
        setProducts([]);
      } else {
        const response = await axios.get(
          API + '/reclassification/products/' + selectedCompany + '?' + params.toString(),
          { headers: { Authorization: 'Bearer ' + token } }
        );
        setProducts(response.data.produtos);
        setDocuments([]);
      }
      setSelectedItems([]);
      setAiResult(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleDocExpand = (docId) => {
    setExpandedDocs(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (viewMode === 'documentos') {
      const allIds = documents.flatMap(doc => 
        doc.produtos.map(p => p.id_unico)
      );
      setSelectedItems(allIds);
    } else {
      const allIds = products.map(p => p.produtos_ids[0]);
      setSelectedItems(allIds);
    }
  };

  const clearSelection = () => setSelectedItems([]);

  const processAIReclassification = async () => {
    if (!aiCommand.trim()) {
      alert('Digite uma instrução para a IA');
      return;
    }

    setAiProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      // Se não houver itens selecionados, enviar array vazio para a IA analisar todos
      // A IA vai entender pela instrução do usuário quais produtos alterar
      const productIds = selectedItems.length > 0 ? selectedItems : [];
      
      const response = await axios.post(
        API + '/ai/reclassify',
        {
          company_id: selectedCompany,
          competencia: competencia,
          product_ids: productIds,  // Array vazio = IA decide pela instrução
          instrucao_usuario: aiCommand,
          aplicar_em_lote: true
        },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      setAiResult(response.data);
      if (response.data.success) {
        fetchData(); // Recarregar dados
        fetchLearnedRules(); // Atualizar regras aprendidas
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro na análise com IA');
    } finally {
      setAiProcessing(false);
    }
  };

  const validateTaxes = async () => {
    setValidatingTaxes(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        API + '/ai/validate-taxes',
        {
          company_id: selectedCompany,
          competencia: competencia,
          document_ids: [],
          validar_pis: true,
          validar_cofins: true,
          validar_icms: true
        },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      setTaxValidation(response.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro na validação de impostos');
    } finally {
      setValidatingTaxes(false);
    }
  };

  const startManualEdit = (product, docId) => {
    setEditingProduct({ ...product, doc_id: docId });
    setManualEdit({
      cfop: product.cfop || '',
      categoria: product.categoria_classificada || '',
      motivo: ''
    });
  };

  const saveManualEdit = async () => {
    if (!editingProduct) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        API + '/manual-reclassify',
        null,
        {
          params: {
            doc_id: editingProduct.doc_id,
            produto_codigo: editingProduct.codigo,
            novo_cfop: manualEdit.cfop,
            nova_categoria: manualEdit.categoria,
            motivo: manualEdit.motivo,
            salvar_regra: true
          },
          headers: { Authorization: 'Bearer ' + token }
        }
      );
      alert('Produto reclassificado e regra salva!');
      setEditingProduct(null);
      fetchData();
      fetchLearnedRules();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar');
    }
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      'revenda': 'bg-purple-100 text-purple-800',
      'insumo': 'bg-blue-100 text-blue-800',
      'despesa': 'bg-orange-100 text-orange-800',
      'combustivel': 'bg-yellow-100 text-yellow-800',
      'revenda_st': 'bg-purple-200 text-purple-900',
      'insumo_st': 'bg-blue-200 text-blue-900',
      'despesa_st': 'bg-orange-200 text-orange-900'
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="reclassification-ai-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-purple-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Reclassificação com IA</h1>
          </div>
          <p className="text-red-100">
            Analise, reclassifique e ensine a IA com suas correções. Todas as mudanças são memorizadas.
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
              <select
                data-testid="company-select"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Selecione...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.razao_social}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competência</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  data-testid="competencia-input"
                  type="text"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="MM/AAAA"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                data-testid="tipo-select"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visualização</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('documentos')}
                  className={'flex-1 px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ' +
                    (viewMode === 'documentos' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700')}
                >
                  <FileText className="w-4 h-4" /> NF-e
                </button>
                <button
                  onClick={() => setViewMode('produtos')}
                  className={'flex-1 px-3 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ' +
                    (viewMode === 'produtos' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700')}
                >
                  <Package className="w-4 h-4" /> Produtos
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              data-testid="load-data-btn"
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Carregar Dados
            </button>

            <button
              onClick={() => setShowRules(!showRules)}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium flex items-center gap-2"
              title="A IA memoriza suas correções para aplicar automaticamente no futuro"
            >
              <BookOpen className="w-4 h-4" />
              Memória da IA ({learnedRules.length})
            </button>

            <button
              onClick={validateTaxes}
              disabled={validatingTaxes || !selectedCompany || !competencia}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {validatingTaxes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Validar PIS/COFINS/ICMS
            </button>
          </div>
        </div>

        {/* Regras Aprendidas (Memória da IA) */}
        {showRules && learnedRules.length > 0 && (
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Memória da IA - Correções Aprendidas
            </h3>
            <p className="text-sm text-purple-700 mb-3">
              Quando você corrige uma classificação, a IA memoriza para aplicar automaticamente em importações futuras.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {learnedRules.map((rule, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-purple-100 text-sm">
                  <span className="font-medium">{rule.produto_descricao}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className={'px-2 py-0.5 rounded ' + getCategoriaColor(rule.categoria_correta)}>
                    {rule.categoria_correta}
                  </span>
                  <span className="text-gray-500 ml-2">CFOP {rule.cfop_correto}</span>
                  <span className="text-gray-400 text-xs ml-3">({rule.aprendido_de})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validação de Impostos */}
        {taxValidation && taxValidation.success && (
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Resultado da Validação de Impostos
            </h3>
            {taxValidation.resumo && (
              <div className="mb-3 text-sm">
                <p>Total analisados: {taxValidation.resumo.total_analisados || taxValidation.total_produtos_analisados}</p>
                <p>Com inconsistências: {taxValidation.resumo.com_inconsistencias || 0}</p>
              </div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {taxValidation.analise?.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-green-100">
                  <p className="font-medium">{item.produto_descricao} ({item.produto_codigo})</p>
                  {item.inconsistencias?.length > 0 ? (
                    <div className="mt-2">
                      {item.inconsistencias.map((inc, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-orange-700">
                          <AlertTriangle className="w-4 h-4" />
                          {inc.tipo}: {inc.descricao}
                        </div>
                      ))}
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Base Legal:</strong> {item.base_legal?.join(', ')}
                      </p>
                      {item.sugestao_correcao && (
                        <p className="text-xs text-blue-600 mt-1">
                          <strong>Sugestão:</strong> {item.sugestao_correcao}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600">✓ Sem inconsistências</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Área de Comando IA */}
        {(documents.length > 0 || products.length > 0) && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-900">Comando para IA</h3>
              {selectedItems.length > 0 ? (
                <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  {selectedItems.length} itens selecionados
                </span>
              ) : (
                <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                  ✓ A IA vai identificar os produtos pela descrição
                </span>
              )}
            </div>
            
            <div className="flex gap-2 mb-3">
              <button onClick={selectAll} className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Selecionar Todos
              </button>
              <button onClick={clearSelection} className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                Limpar Seleção
              </button>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-200 mb-3">
              <p className="text-sm text-gray-600 mb-2">
                <strong>💡 Dica:</strong> Você não precisa selecionar itens! Basta descrever o que quer e a IA vai entender:
              </p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setAiCommand('Reclassifique todos os produtos de limpeza como DESPESA (CFOP 1556)')}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  "produtos de limpeza → DESPESA"
                </button>
                <button 
                  onClick={() => setAiCommand('Produtos com NCM que começa com 30 são medicamentos e devem ser DESPESA')}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  "NCM 30* → medicamentos"
                </button>
                <button 
                  onClick={() => setAiCommand('Material de escritório deve ser classificado como DESPESA (CFOP 1556)')}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  "material escritório → DESPESA"
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <textarea
                data-testid="ai-command-input"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                className="flex-1 px-4 py-3 border border-purple-300 rounded-lg resize-none"
                rows="2"
                placeholder="Digite o que deseja reclassificar. Ex: 'Produtos de limpeza são despesa' ou 'Itens com código X, Y, Z são insumos'"
              />
              <button
                data-testid="process-ai-btn"
                onClick={processAIReclassification}
                disabled={aiProcessing || !aiCommand.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {aiProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Processar com IA
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Resultado da IA */}
        {aiResult && (
          <div className={'rounded-xl p-4 border-2 ' + (aiResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')}>
            <h3 className={'font-bold mb-2 ' + (aiResult.success ? 'text-green-900' : 'text-red-900')}>
              {aiResult.success ? '✓ Processamento Concluído' : '✗ Erro no Processamento'}
            </h3>
            <p className="text-sm mb-3">{aiResult.mensagem || aiResult.error}</p>
            
            {aiResult.reclassificacoes?.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {aiResult.reclassificacoes.map((r, idx) => (
                  <div key={idx} className="bg-white p-2 rounded text-sm flex items-center gap-3">
                    <span className="font-medium flex-1">{r.produto_id}</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-mono">
                      → {r.cfop_novo}
                    </span>
                    <span className={'px-2 py-1 rounded ' + getCategoriaColor(r.categoria_nova)}>
                      {r.categoria_nova}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {aiResult.regras_aprendidas?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">
                  📚 {aiResult.regras_aprendidas.length} novas regras aprendidas
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lista de Documentos */}
        {viewMode === 'documentos' && documents.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                Notas Fiscais ({documents.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white">
                  <div 
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleDocExpand(doc.id)}
                  >
                    {expandedDocs[doc.id] ? 
                      <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                    <span className="w-10 h-10 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-bold">
                      #{doc.numero_sequencial}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">NF-e {doc.numero_nfe}</p>
                      <p className="text-sm text-gray-500">
                        {doc.emitente_nome} • {doc.data_emissao?.substring(0, 10)}
                      </p>
                    </div>
                    <span className={'px-3 py-1 rounded-full text-sm font-medium ' + 
                      (doc.tipo === 'entrada' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')}>
                      {doc.tipo}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      R$ {doc.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {expandedDocs[doc.id] && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600">
                            <th className="py-2 px-2 w-8"></th>
                            <th className="py-2 px-2 w-12">#</th>
                            <th className="py-2 px-2">Código</th>
                            <th className="py-2 px-2">Descrição</th>
                            <th className="py-2 px-2">NCM</th>
                            <th className="py-2 px-2">CFOP</th>
                            <th className="py-2 px-2">Categoria</th>
                            <th className="py-2 px-2 text-right">Valor</th>
                            <th className="py-2 px-2 w-16"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {doc.produtos?.map((prod, idx) => (
                            <tr key={idx} className="border-t border-gray-200 hover:bg-white">
                              <td className="py-2 px-2">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.includes(prod.id_unico)}
                                  onChange={() => toggleSelectItem(prod.id_unico)}
                                  className="w-4 h-4 text-red-600 rounded"
                                />
                              </td>
                              <td className="py-2 px-2 text-gray-500">{prod.numero_sequencial}</td>
                              <td className="py-2 px-2 font-mono text-xs">{prod.codigo}</td>
                              <td className="py-2 px-2 max-w-xs truncate">{prod.descricao}</td>
                              <td className="py-2 px-2 font-mono text-xs">{prod.ncm}</td>
                              <td className="py-2 px-2">
                                <span className="px-2 py-1 bg-gray-100 rounded font-mono font-bold">
                                  {prod.cfop}
                                </span>
                                {prod.cfop_original && prod.cfop_original !== prod.cfop && (
                                  <span className="ml-1 text-xs text-gray-400">
                                    (era {prod.cfop_original})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <span className={'px-2 py-1 rounded text-xs font-medium ' + 
                                  getCategoriaColor(prod.categoria_classificada)}>
                                  {prod.categoria_classificada || '-'}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-medium">
                                R$ {prod.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-2">
                                <button
                                  onClick={() => startManualEdit(prod, doc.id)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  title="Editar manualmente"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Produtos Agrupados */}
        {viewMode === 'produtos' && products.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                Produtos Agrupados ({products.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="py-3 px-4 w-8"></th>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">NCM</th>
                    <th className="py-3 px-4">CFOP</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Ocorrências</th>
                    <th className="py-3 px-4 text-right">Qtd Total</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((prod) => (
                    <tr key={prod.codigo} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(prod.produtos_ids[0])}
                          onChange={() => toggleSelectItem(prod.produtos_ids[0])}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="w-8 h-8 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-bold text-xs">
                          {prod.numero_sequencial}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{prod.codigo}</td>
                      <td className="py-3 px-4 max-w-xs truncate font-medium">{prod.descricao}</td>
                      <td className="py-3 px-4 font-mono text-xs">{prod.ncm}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 rounded font-mono font-bold">
                          {prod.cfop_atual}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={'px-2 py-1 rounded text-xs font-medium ' + 
                          getCategoriaColor(prod.categoria_atual)}>
                          {prod.categoria_atual || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {prod.ocorrencias} NF-e(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {prod.quantidade_total?.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        R$ {prod.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Edição Manual */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-red-600" />
                Reclassificar Produto
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Produto:</p>
                <p className="font-medium">{editingProduct.descricao}</p>
                <p className="text-xs text-gray-500">Código: {editingProduct.codigo}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Novo CFOP</label>
                  <input
                    type="text"
                    value={manualEdit.cfop}
                    onChange={(e) => setManualEdit({...manualEdit, cfop: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ex: 1102"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Categoria</label>
                  <select
                    value={manualEdit.categoria}
                    onChange={(e) => setManualEdit({...manualEdit, categoria: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    <option value="revenda">REVENDA</option>
                    <option value="insumo">INSUMO</option>
                    <option value="despesa">DESPESA</option>
                    <option value="combustivel">COMBUSTÍVEL</option>
                    <option value="revenda_st">REVENDA (ST)</option>
                    <option value="insumo_st">INSUMO (ST)</option>
                    <option value="despesa_st">DESPESA (ST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Correção</label>
                  <textarea
                    value={manualEdit.motivo}
                    onChange={(e) => setManualEdit({...manualEdit, motivo: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows="2"
                    placeholder="Ex: Produto utilizado como matéria-prima na produção"
                  />
                </div>

                <p className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                  ✓ Esta correção será salva como regra aprendida para próximas importações
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveManualEdit}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar e Aprender
                </button>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!loading && documents.length === 0 && products.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center shadow-md">
            <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum dado carregado</h3>
            <p className="text-gray-600">
              Selecione uma empresa, competência e clique em "Carregar Dados"
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReclassificationAI;
