import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search, AlertTriangle, CheckCircle, Edit2, Save, Sparkles, Check, CheckCheck, X, Filter, Layers, FileText, Package, Info } from 'lucide-react';
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
  
  // Modo de visualização: 'nf' ou 'produto'
  const [viewMode, setViewMode] = useState('nf');
  
  // Estado para aprovação em lote
  const [approvedProducts, setApprovedProducts] = useState({});
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  
  // Seleção para modo produto
  const [selectedProductCodes, setSelectedProductCodes] = useState([]);
  
  // Mensagem de sucesso
  const [successMessage, setSuccessMessage] = useState('');
  
  // Estado para reclassificação manual
  const [reclassifyingProduct, setReclassifyingProduct] = useState(null); // {docId, productIndex, product}
  const [newCategoria, setNewCategoria] = useState('');
  const [reclassifyMotivo, setReclassifyMotivo] = useState('');

  // Mostrar mensagem de sucesso por 3 segundos
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
      
      // Filtrar apenas documentos de entrada (saída não precisa validação de CFOP)
      const entradas = docsRes.data.filter(d => d.tipo === 'entrada');
      setDocuments(entradas);
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

  // Agrupar produtos por código
  const groupedProducts = useMemo(() => {
    const groups = {};
    
    documents.forEach(doc => {
      (doc.produtos || []).forEach(prod => {
        const code = prod.codigo || 'SEM_CODIGO';
        if (!groups[code]) {
          groups[code] = {
            codigo: code,
            descricao: prod.descricao,
            ncm: prod.ncm,
            categoria: prod.categoria_classificada,
            cfop: prod.cfop,
            cfop_sugerido: prod.cfop_sugerido,
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
          cfop_sugerido: prod.cfop_sugerido
        });
        groups[code].quantidade_total += prod.quantidade || 0;
        groups[code].valor_total += prod.valor_total || 0;
      });
    });
    
    return Object.values(groups).sort((a, b) => a.descricao?.localeCompare(b.descricao || ''));
  }, [documents]);

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
      showSuccess('Produto validado com sucesso!');
    }
    
    setApprovedProducts(newApprovals);
    saveApprovals(newApprovals);
  };

  // Aprovar produto em todas as NFs (modo produto)
  const toggleApproveProductAll = (productCode) => {
    const newApprovals = { ...approvedProducts };
    const product = groupedProducts.find(p => p.codigo === productCode);
    
    if (!product) return;
    
    // Verificar se todas as ocorrências já estão aprovadas
    const allApproved = product.ocorrencias.every(occ => {
      const key = `${occ.doc_id}_${productCode}`;
      return !!newApprovals[key];
    });
    
    // Se todas aprovadas, remover aprovação; senão, aprovar todas
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

  const saveApprovals = (approvals) => {
    if (selectedCompany && selectedCompetencia) {
      localStorage.setItem(
        `approvals_${selectedCompany.id}_${selectedCompetencia}`,
        JSON.stringify(approvals)
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
    saveApprovals(newApprovals);
    showSuccess(`${doc.produtos.length} produtos validados com sucesso!`);
  };

  // Remover aprovação de todos do documento
  const unapproveAllInDocument = (doc) => {
    const newApprovals = { ...approvedProducts };
    
    doc.produtos.forEach(product => {
      const key = `${doc.id}_${product.codigo}`;
      delete newApprovals[key];
    });
    
    setApprovedProducts(newApprovals);
    saveApprovals(newApprovals);
  };

  // Selecionar/deselecionar todos os produtos (modo produto)
  const toggleSelectAllProducts = () => {
    if (selectedProductCodes.length === groupedProducts.length) {
      setSelectedProductCodes([]);
    } else {
      setSelectedProductCodes(groupedProducts.map(p => p.codigo));
    }
  };

  // Aprovar todos os produtos selecionados (modo produto)
  const approveSelectedProducts = () => {
    const newApprovals = { ...approvedProducts };
    let totalAprovados = 0;
    
    selectedProductCodes.forEach(code => {
      const product = groupedProducts.find(p => p.codigo === code);
      if (product) {
        product.ocorrencias.forEach(occ => {
          const key = `${occ.doc_id}_${code}`;
          newApprovals[key] = { approved: true, date: new Date().toISOString() };
          totalAprovados++;
        });
      }
    });
    
    setApprovedProducts(newApprovals);
    saveApprovals(newApprovals);
    setSelectedProductCodes([]);
    showSuccess(`${totalAprovados} ocorrências validadas com sucesso!`);
  };

  // Verificar se produto está aprovado
  const isProductApproved = (docId, productCode) => {
    const key = `${docId}_${productCode}`;
    return !!approvedProducts[key];
  };

  // Contar aprovações do produto (modo produto)
  const countProductApprovals = (productCode) => {
    const product = groupedProducts.find(p => p.codigo === productCode);
    if (!product) return { approved: 0, total: 0 };
    
    const approved = product.ocorrencias.filter(occ => 
      isProductApproved(occ.doc_id, productCode)
    ).length;
    
    return { approved, total: product.ocorrencias.length };
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

  const getCategoryBadge = (categoria) => {
    const badges = {
      'revenda': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'REVENDA' },
      'insumo': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'INSUMO' },
      'despesa': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'DESPESA' },
      'combustivel': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'COMBUSTÍVEL' },
    };
    const badge = badges[categoria] || { bg: 'bg-gray-100', text: 'text-gray-800', label: categoria?.toUpperCase() || 'N/A' };
    return (
      <span className={'px-2 py-0.5 rounded-full text-xs font-bold ' + badge.bg + ' ' + badge.text}>
        {badge.label}
      </span>
    );
  };

  // Calcular estatísticas - filtrar apenas aprovações de documentos que ainda existem
  const totalProducts = documents.reduce((acc, doc) => acc + doc.produtos.length, 0);
  
  // Contar aprovações válidas (apenas de documentos que ainda existem)
  const validApprovedKeys = new Set();
  documents.forEach(doc => {
    doc.produtos.forEach(prod => {
      const key = `${doc.id}_${prod.codigo}`;
      if (approvedProducts[key]) {
        validApprovedKeys.add(key);
      }
    });
  });
  const totalApproved = validApprovedKeys.size;
  const totalPending = Math.max(0, totalProducts - totalApproved);

  // Componente: Item de documento na lista
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
            <p className="text-xs text-gray-500 mt-1">{approved}/{total} aprovados</p>
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

  // Componente: Item de produto na lista (modo NF)
  const ProductItem = ({ product, index }) => {
    const exception = exceptions.find(e => e.product_code === product.codigo);
    const isEditing = editingProduct === index;
    const categoria = product.categoria_classificada;
    const cfopSugerido = product.cfop_sugerido;
    const isApproved = isProductApproved(selectedDoc.id, product.codigo);
    
    if (showOnlyPending && isApproved) return null;
    
    return (
      <div key={index} className={'p-4 ' + (isApproved ? 'bg-green-50' : 'bg-white')}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleApproveProduct(selectedDoc.id, product.codigo)}
            className={'w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ' +
              (isApproved 
                ? 'bg-green-600 border-green-600 text-white' 
                : 'border-gray-300 hover:border-green-500'
              )
            }
            title={isApproved ? 'Remover aprovação' : 'Aprovar'}
          >
            {isApproved && <Check className="w-5 h-5" />}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{product.descricao}</p>
                {categoria && getCategoryBadge(categoria)}
                {isApproved && <span className="text-xs text-green-600 font-medium">✓ Aprovado</span>}
              </div>
              <p className="font-semibold text-gray-900">
                R$ {product.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              Código: {product.codigo} | NCM: {product.ncm} | Qtd: {product.quantidade} {product.unidade}
            </p>
            
            {/* Justificativa da IA */}
            {product.justificativa_ia && (
              <div className="mb-2 flex items-center gap-2 text-xs">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded">{product.justificativa_ia}</span>
              </div>
            )}

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
                onClick={() => { setEditingProduct(null); setNewCfop(''); setMotivo(''); }}
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

  // Componente: Item de produto agrupado (modo produto)
  const GroupedProductItem = ({ product }) => {
    const { approved, total } = countProductApprovals(product.codigo);
    const allApproved = approved === total;
    const isSelected = selectedProductCodes.includes(product.codigo);
    
    if (showOnlyPending && allApproved) return null;
    
    return (
      <div className={'p-4 border-b ' + (allApproved ? 'bg-green-50' : 'bg-white')}>
        <div className="flex items-start gap-3">
          {/* Checkbox de seleção */}
          <button
            onClick={() => {
              if (isSelected) {
                setSelectedProductCodes(prev => prev.filter(c => c !== product.codigo));
              } else {
                setSelectedProductCodes(prev => [...prev, product.codigo]);
              }
            }}
            className={'w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ' +
              (isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-blue-500')
            }
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
          
          {/* Checkbox de aprovação */}
          <button
            onClick={() => toggleApproveProductAll(product.codigo)}
            className={'w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ' +
              (allApproved 
                ? 'bg-green-600 border-green-600 text-white' 
                : approved > 0 
                  ? 'bg-yellow-100 border-yellow-400'
                  : 'border-gray-300 hover:border-green-500'
              )
            }
            title={allApproved ? 'Remover aprovação' : 'Aprovar em todas as NFs'}
          >
            {allApproved ? <Check className="w-5 h-5" /> : approved > 0 ? <span className="text-xs font-bold text-yellow-700">{approved}</span> : null}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{product.descricao}</p>
                {product.categoria && getCategoryBadge(product.categoria)}
                {allApproved && <span className="text-xs text-green-600 font-medium">✓ Aprovado</span>}
              </div>
              <p className="font-semibold text-gray-900">
                R$ {product.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              Código: {product.codigo} | NCM: {product.ncm} | Qtd Total: {product.quantidade_total?.toFixed(2)}
            </p>
            
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-sm text-gray-600">CFOP:</span>
              <span className="px-3 py-1 rounded-lg font-mono font-semibold bg-gray-100 text-gray-800">
                {product.cfop}
              </span>
              {product.cfop_sugerido && product.cfop_sugerido !== product.cfop && (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="px-3 py-1 rounded-lg font-mono font-semibold bg-purple-100 text-purple-800">
                    {product.cfop_sugerido}
                  </span>
                </div>
              )}
            </div>
            
            {/* Lista de ocorrências */}
            <div className="text-xs text-gray-500">
              <span className="font-medium">Aparece em {product.ocorrencias.length} NF(s):</span>
              <span className="ml-2">
                {product.ocorrencias.slice(0, 3).map(o => o.numero_nfe).join(', ')}
                {product.ocorrencias.length > 3 && ` e mais ${product.ocorrencias.length - 3}...`}
              </span>
              <span className="ml-2 text-green-600">({approved}/{total} aprovadas)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="validation-page" className="space-y-6">
        {/* Mensagem de Sucesso */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="w-7 h-7" />
                Validação de Classificações
              </h1>
              <p className="text-green-100 mt-1">
                Revise e aprove as classificações de CFOP dos produtos de entrada
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

        {/* Explicação + Controles */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-900">Como funciona?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Apenas notas de <strong>entrada</strong> precisam de validação de CFOP.
                  <br />
                  <strong>✓ Aprovar</strong> = Você concorda com a classificação
                  <strong className="ml-3">Alterar</strong> = Você quer mudar o CFOP
                </p>
              </div>
            </div>
            
            {/* Modo de visualização */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('nf')}
                className={'px-4 py-2 rounded-lg font-medium flex items-center gap-2 ' +
                  (viewMode === 'nf' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300')
                }
              >
                <FileText className="w-4 h-4" />
                Por NF-e
              </button>
              <button
                onClick={() => setViewMode('produto')}
                className={'px-4 py-2 rounded-lg font-medium flex items-center gap-2 ' +
                  (viewMode === 'produto' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300')
                }
              >
                <Package className="w-4 h-4" />
                Por Produto
              </button>
            </div>
          </div>
        </div>

        {/* Info empresa + Filtro */}
        {selectedCompany && (
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-600">Validando</p>
              <p className="font-bold text-gray-900">{selectedCompany.razao_social}</p>
              <p className="text-sm text-gray-500">Competência: {selectedCompetencia}</p>
            </div>
            
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

        {/* Conteúdo baseado no modo */}
        {viewMode === 'nf' ? (
          /* MODO NF-e */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Documentos */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">NF-e de Entrada ({documents.length})</h2>
                </div>
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      {selectedCompany ? 'Nenhuma NF-e de entrada nesta competência' : 'Selecione uma empresa no header'}
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

                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Produtos ({selectedDoc.produtos.length})</h3>
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
                  <p className="text-gray-600">Clique em uma NF-e à esquerda para revisar</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO PRODUTO */
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
              <h3 className="font-semibold text-gray-900">
                Produtos Agrupados ({groupedProducts.length})
              </h3>
              
              <div className="flex gap-2">
                <button
                  onClick={toggleSelectAllProducts}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  {selectedProductCodes.length === groupedProducts.length ? 'Limpar Seleção' : 'Selecionar Todos'}
                </button>
                {selectedProductCodes.length > 0 && (
                  <button
                    onClick={approveSelectedProducts}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Aprovar {selectedProductCodes.length} Selecionados
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                </div>
              ) : groupedProducts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  {selectedCompany ? 'Nenhum produto encontrado' : 'Selecione uma empresa no header'}
                </div>
              ) : (
                groupedProducts.map((product) => (
                  <GroupedProductItem key={product.codigo} product={product} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ValidationPage;
