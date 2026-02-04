import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search, AlertTriangle, CheckCircle, Edit2, Save, Sparkles, Check, CheckCheck, X, Filter, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const ValidationPage = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [cfopRules, setCfopRules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCfop, setNewCfop] = useState('');
  const [motivo, setMotivo] = useState('');
  
  // Estado para aprovação em lote
  const [approvedProducts, setApprovedProducts] = useState({});
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
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
      const rulesRes = await axios.get(API + '/cfop/rules', {
        headers: { Authorization: 'Bearer ' + token }
      });
      setDocuments(docsRes.data);
      setCfopRules(rulesRes.data);
      
      // Carregar aprovações salvas do localStorage
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

  const selectDocument = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const docRes = await axios.get(API + '/xml/documents/' + docId, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const exceptionsRes = await axios.get(API + '/exceptions?document_id=' + docId, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setSelectedDoc(docRes.data);
      setExceptions(exceptionsRes.data);
    } catch (err) {
      console.error('Erro ao carregar documento:', err);
    }
  };

  // Aprovar/desaprovar produto
  const toggleApproveProduct = (docId, productCode) => {
    const key = `${docId}_${productCode}`;
    const newApprovals = { ...approvedProducts };
    
    if (newApprovals[key]) {
      delete newApprovals[key];
    } else {
      newApprovals[key] = { approved: true, date: new Date().toISOString() };
    }
    
    setApprovedProducts(newApprovals);
    
    // Salvar no localStorage
    if (selectedCompany && selectedCompetencia) {
      localStorage.setItem(
        `approvals_${selectedCompany.id}_${selectedCompetencia}`,
        JSON.stringify(newApprovals)
      );
    }
  };

  // Aprovar todos os produtos do documento
  const approveAllInDocument = (doc) => {
    const newApprovals = { ...approvedProducts };
    
    doc.produtos.forEach(product => {
      const key = `${doc.id}_${product.codigo}`;
      newApprovals[key] = { approved: true, date: new Date().toISOString() };
    });
    
    setApprovedProducts(newApprovals);
    
    if (selectedCompany && selectedCompetencia) {
      localStorage.setItem(
        `approvals_${selectedCompany.id}_${selectedCompetencia}`,
        JSON.stringify(newApprovals)
      );
    }
  };

  // Remover aprovação de todos do documento
  const unapproveAllInDocument = (doc) => {
    const newApprovals = { ...approvedProducts };
    
    doc.produtos.forEach(product => {
      const key = `${doc.id}_${product.codigo}`;
      delete newApprovals[key];
    });
    
    setApprovedProducts(newApprovals);
    
    if (selectedCompany && selectedCompetencia) {
      localStorage.setItem(
        `approvals_${selectedCompany.id}_${selectedCompetencia}`,
        JSON.stringify(newApprovals)
      );
    }
  };

  // Verificar se produto está aprovado
  const isProductApproved = (docId, productCode) => {
    const key = `${docId}_${productCode}`;
    return !!approvedProducts[key];
  };

  // Contar aprovações do documento
  const countApprovedInDoc = (doc) => {
    return doc.produtos.filter(p => isProductApproved(doc.id, p.codigo)).length;
  };

  const handleCreateException = async (product) => {
    if (!newCfop || !motivo) {
      alert('Preencha o novo CFOP e o motivo');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(API + '/exceptions', {
        xml_document_id: selectedDoc.id,
        product_code: product.codigo,
        cfop_original: product.cfop,
        cfop_corrigido: newCfop,
        motivo: motivo,
        aplicado_em_lote: false
      }, {
        headers: { Authorization: 'Bearer ' + token }
      });
      
      setEditingProduct(null);
      setNewCfop('');
      setMotivo('');
      selectDocument(selectedDoc.id);
      alert('Correção salva com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar exceção');
    }
  };

  const validateCfop = (cfop, tipo) => {
    const rule = cfopRules.find(r => r.cfop === cfop);
    if (!rule) return { valid: false, message: 'CFOP não cadastrado' };
    if (rule.tipo_operacao !== tipo) {
      return { valid: false, message: 'CFOP de ' + rule.tipo_operacao + ', documento é de ' + tipo };
    }
    return { valid: true, message: 'Válido' };
  };

  const getCategoryBadge = (categoria) => {
    const badges = {
      'revenda': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'REVENDA' },
      'insumo': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'INSUMO' },
      'despesa': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'DESPESA' },
      'combustivel': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'COMBUSTÍVEL' },
      'revenda_st': { bg: 'bg-purple-200', text: 'text-purple-900', label: 'REVENDA (ST)' },
      'insumo_st': { bg: 'bg-blue-200', text: 'text-blue-900', label: 'INSUMO (ST)' },
      'despesa_st': { bg: 'bg-orange-200', text: 'text-orange-900', label: 'DESPESA (ST)' },
    };
    const badge = badges[categoria] || { bg: 'bg-gray-100', text: 'text-gray-800', label: categoria?.toUpperCase() || 'N/A' };
    return (
      <span className={'px-3 py-1 rounded-full text-xs font-bold ' + badge.bg + ' ' + badge.text}>
        {badge.label}
      </span>
    );
  };

  // Calcular estatísticas
  const totalProducts = documents.reduce((acc, doc) => acc + doc.produtos.length, 0);
  const totalApproved = Object.keys(approvedProducts).length;
  const totalPending = totalProducts - totalApproved;

  const DocumentListItem = ({ doc }) => {
    const approved = countApprovedInDoc(doc);
    const total = doc.produtos.length;
    const allApproved = approved === total;
    
    return (
      <button
        key={doc.id}
        data-testid={'select-document-' + doc.id}
        onClick={() => selectDocument(doc.id)}
        className={'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ' + (selectedDoc?.id === doc.id ? 'bg-red-50 border-l-4 border-red-600' : '')}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">NF-e {doc.numero_nfe}</p>
            <p className="text-xs text-gray-600 truncate">{doc.emitente_nome}</p>
            <p className="text-xs text-gray-500 mt-1">
              {approved}/{total} aprovados
            </p>
          </div>
          {allApproved ? (
            <CheckCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : approved > 0 ? (
            <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-yellow-700">{approved}</span>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-100 flex-shrink-0"></div>
          )}
        </div>
      </button>
    );
  };

  const ProductItem = ({ product, index }) => {
    const exception = exceptions.find(e => e.product_code === product.codigo);
    const isEditing = editingProduct === index;
    const categoria = product.categoria_classificada;
    const cfopSugerido = product.cfop_sugerido;
    const isApproved = isProductApproved(selectedDoc.id, product.codigo);
    
    // Se mostrar apenas pendentes e produto está aprovado, não mostrar
    if (showOnlyPending && isApproved) return null;
    
    return (
      <div key={index} className={'p-4 ' + (isApproved ? 'bg-green-50' : 'bg-white')}>
        <div className="flex items-start gap-3">
          {/* Checkbox de aprovação */}
          <button
            onClick={() => toggleApproveProduct(selectedDoc.id, product.codigo)}
            className={'w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ' +
              (isApproved 
                ? 'bg-green-600 border-green-600 text-white' 
                : 'border-gray-300 hover:border-green-500'
              )
            }
            title={isApproved ? 'Clique para remover aprovação' : 'Clique para aprovar classificação'}
          >
            {isApproved && <Check className="w-5 h-5" />}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{product.descricao}</p>
                {categoria && getCategoryBadge(categoria)}
                {isApproved && (
                  <span className="text-xs text-green-600 font-medium">✓ Aprovado</span>
                )}
              </div>
              <p className="font-semibold text-gray-900">
                R$ {product.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              Código: {product.codigo} | NCM: {product.ncm} | Qtd: {product.quantidade} {product.unidade}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">CFOP:</span>
                <span className="px-3 py-1 rounded-lg font-mono font-semibold bg-gray-100 text-gray-800">
                  {product.cfop}
                </span>
              </div>
              
              {cfopSugerido && cfopSugerido !== product.cfop && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-purple-700 font-medium flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Sugestão:
                  </span>
                  <span className="px-3 py-1 rounded-lg font-mono font-semibold bg-purple-100 text-purple-800">
                    {cfopSugerido}
                  </span>
                </div>
              )}
              
              {exception && (
                <span className="text-sm text-red-600 font-medium">
                  Corrigido para: {exception.cfop_corrigido}
                </span>
              )}

              {!isApproved && !exception && (
                <button
                  data-testid={'edit-cfop-button-' + index}
                  onClick={() => {
                    setEditingProduct(index);
                    setNewCfop(cfopSugerido || product.cfop);
                    setMotivo('');
                  }}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Alterar
                </button>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3 ml-11">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Novo CFOP</label>
              <input
                data-testid="new-cfop-input"
                type="text"
                value={newCfop}
                onChange={(e) => setNewCfop(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Ex: 1102"
                maxLength="4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <textarea
                data-testid="exception-reason-input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="2"
                placeholder="Ex: Produto utilizado como matéria-prima"
              />
            </div>
            <div className="flex gap-3">
              <button
                data-testid="save-exception-button"
                onClick={() => handleCreateException(product)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setNewCfop('');
                  setMotivo('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="validation-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="w-7 h-7" />
                Validação de Classificações
              </h1>
              <p className="text-green-100 mt-1">
                Revise e aprove as classificações de CFOP dos produtos importados
              </p>
            </div>
            
            {/* Estatísticas */}
            <div className="flex gap-4">
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <p className="text-2xl font-bold">{totalApproved}</p>
                <p className="text-xs text-green-100">Aprovados</p>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-xs text-green-100">Pendentes</p>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
                <p className="text-2xl font-bold">{totalProducts}</p>
                <p className="text-xs text-green-100">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Explicação */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900">Como funciona?</h3>
              <p className="text-sm text-blue-700 mt-1">
                Após importar as notas fiscais, a IA classifica automaticamente os produtos (REVENDA, INSUMO, DESPESA).
                <br />
                <strong>✓ Aprovar</strong> = Você concorda com a classificação
                <br />
                <strong>Alterar</strong> = Você quer mudar o CFOP/classificação
              </p>
            </div>
          </div>
        </div>

        {/* Informação da empresa selecionada */}
        {selectedCompany && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-600">Validando</p>
              <p className="font-bold text-gray-900">{selectedCompany.razao_social}</p>
              <p className="text-sm text-gray-500">Competência: {selectedCompetencia}</p>
            </div>
            
            {/* Filtro */}
            <button
              onClick={() => setShowOnlyPending(!showOnlyPending)}
              className={'px-4 py-2 rounded-lg font-medium flex items-center gap-2 ' +
                (showOnlyPending ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')
              }
            >
              <Filter className="w-4 h-4" />
              {showOnlyPending ? 'Mostrando só pendentes' : 'Mostrar todos'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Documentos */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Documentos ({documents.length})</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    {selectedCompany ? 'Nenhum documento nesta competência' : 'Selecione uma empresa no header'}
                  </div>
                ) : (
                  documents.map((doc) => <DocumentListItem key={doc.id} doc={doc} />)
                )}
              </div>
            </div>
          </div>

          {/* Detalhe do Documento */}
          <div className="lg:col-span-2">
            {selectedDoc ? (
              <div className="space-y-4">
                {/* Cabeçalho do documento */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">NF-e {selectedDoc.numero_nfe}</h2>
                      <p className="text-sm text-gray-600">{selectedDoc.emitente_nome}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedDoc.data_emissao).toLocaleDateString('pt-BR')} • 
                        R$ {selectedDoc.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    {/* Botões de aprovação em lote */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveAllInDocument(selectedDoc)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Aprovar Todos
                      </button>
                      <button
                        onClick={() => unapproveAllInDocument(selectedDoc)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de produtos */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      Produtos ({selectedDoc.produtos.length})
                    </h3>
                    <span className="text-sm text-gray-600">
                      {countApprovedInDoc(selectedDoc)}/{selectedDoc.produtos.length} aprovados
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {selectedDoc.produtos.map((product, index) => (
                      <ProductItem key={index} product={product} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-md border border-gray-100 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Selecione um documento</h3>
                <p className="text-gray-600">
                  Clique em uma NF-e à esquerda para revisar e aprovar as classificações
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidationPage;
