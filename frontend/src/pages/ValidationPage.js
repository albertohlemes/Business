import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search, AlertTriangle, CheckCircle, Edit2, Save } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ValidationPage = ({ user, onLogout }) => {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [cfopRules, setCfopRules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCfop, setNewCfop] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && documents.length > 0) {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        selectDocument(doc.id);
      }
    }
  }, [searchParams, documents]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [docsRes, rulesRes] = await Promise.all([
        axios.get(`${API}/xml/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/cfop/rules`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setDocuments(docsRes.data);
      setCfopRules(rulesRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectDocument = async (docId) => {
    try {
      const token = localStorage.getItem('token');
      const [docRes, exceptionsRes] = await Promise.all([
        axios.get(`${API}/xml/documents/${docId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/exceptions?document_id=${docId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSelectedDoc(docRes.data);
      setExceptions(exceptionsRes.data);
    } catch (err) {
      console.error('Erro ao carregar documento:', err);
    }
  };

  const handleCreateException = async (product) => {
    if (!newCfop || !motivo) {
      alert('Preencha o novo CFOP e o motivo');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/exceptions`, {
        xml_document_id: selectedDoc.id,
        product_code: product.codigo,
        cfop_original: product.cfop,
        cfop_corrigido: newCfop,
        motivo: motivo,
        aplicado_em_lote: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEditingProduct(null);
      setNewCfop('');
      setMotivo('');
      selectDocument(selectedDoc.id);
      alert('Exceção criada com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar exceção');
    }
  };

  const validateCfop = (cfop, tipo) => {
    const rule = cfopRules.find(r => r.cfop === cfop);
    if (!rule) return { valid: false, message: 'CFOP não cadastrado' };
    if (rule.tipo_operacao !== tipo) {
      return { valid: false, message: `CFOP de ${rule.tipo_operacao}, documento é de ${tipo}` };
    }
    return { valid: true, message: 'Válido' };
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="validation-page" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Validação de CFOPs</h1>
          <p className="text-gray-600">Revise e corrija os códigos fiscais dos documentos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documents List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Documentos</h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Nenhum documento encontrado
                  </div>
                ) : (
                  documents.map((doc) => {
                    const validation = doc.produtos.map(p => validateCfop(p.cfop, doc.tipo));
                    const hasErrors = validation.some(v => !v.valid);
                    
                    return (
                      <button
                        key={doc.id}
                        data-testid={`select-document-${doc.id}`}
                        onClick={() => selectDocument(doc.id)}
                        className={`w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedDoc?.id === doc.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">NF-e {doc.numero_nfe}</p>
                            <p className="text-xs text-gray-600 truncate">{doc.emitente_nome}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.produtos.length} produto(s)
                            </p>
                          </div>
                          {hasErrors ? (
                            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Document Details */}
          <div className="lg:col-span-2">
            {selectedDoc ? (
              <div className="space-y-6">
                {/* Document Info */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Documento {selectedDoc.numero_nfe}</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Emitente</p>
                      <p className="font-semibold text-gray-900">{selectedDoc.emitente_nome}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tipo</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDoc.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Data Emissão</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(selectedDoc.data_emissao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Valor Total</p>
                      <p className="font-semibold text-gray-900">
                        R$ {selectedDoc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Produtos e CFOPs</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {selectedDoc.produtos.map((product, index) => {
                      const validation = validateCfop(product.cfop, selectedDoc.tipo);
                      const exception = exceptions.find(e => e.product_code === product.codigo);
                      const isEditing = editingProduct === index;
                      
                      return (
                        <div key={index} className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{product.descricao}</p>
                              <p className="text-sm text-gray-600">Código: {product.codigo} | NCM: {product.ncm}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                R$ {product.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-sm text-gray-600">
                                {product.quantidade} {product.unidade}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 mb-1">CFOP</p>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-lg font-mono font-semibold ${
                                  validation.valid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {product.cfop}
                                </span>
                                {!validation.valid && (
                                  <span className="text-sm text-orange-600 flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    {validation.message}
                                  </span>
                                )}
                                {exception && (
                                  <span className="text-sm text-blue-600 font-medium">
                                    Exceção aplicada: {exception.cfop_corrigido}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!validation.valid && !exception && (
                              <button
                                data-testid={`edit-cfop-button-${index}`}
                                onClick={() => {
                                  setEditingProduct(index);
                                  setNewCfop('');
                                  setMotivo('');
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Corrigir
                              </button>
                            )}
                          </div>

                          {isEditing && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Novo CFOP</label>
                                <input
                                  data-testid="new-cfop-input"
                                  type="text"
                                  value={newCfop}
                                  onChange={(e) => setNewCfop(e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  placeholder="Ex: 5102"
                                  maxLength="4"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo da Correção</label>
                                <textarea
                                  data-testid="exception-reason-input"
                                  value={motivo}
                                  onChange={(e) => setMotivo(e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                  rows="2"
                                  placeholder="Descreva o motivo da correção..."
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

                          {exception && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm text-blue-900">
                                <span className="font-semibold">Exceção:</span> {exception.motivo}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-md border border-gray-100 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Selecione um documento para validar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ValidationPage;