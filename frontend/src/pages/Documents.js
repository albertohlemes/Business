import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FileText, Eye, Filter, Trash2, CheckCircle2, XCircle, Shield, X, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Documents = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia } = useAppContext();
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedIntegridade, setSelectedIntegridade] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  
  // Ordenação
  const [sortField, setSortField] = useState('numero_nfe');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Modal de detalhamento
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchData();
  }, [ctxCompany]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const companyParam = ctxCompany ? `?company_id=${ctxCompany.id}` : '';
      const [companiesRes, documentsRes] = await Promise.all([
        axios.get(`${API}/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/xml/documents${companyParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCompanies(companiesRes.data);
      setDocuments(documentsRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentDetail = async (docId) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/xml/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedDocument(res.data);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReprocessBatch = async () => {
    if (!ctxCompany || !selectedCompetencia) {
      alert('Selecione uma empresa e competência');
      return;
    }
    
    if (!window.confirm(`Re-processar todos os XMLs da competência ${selectedCompetencia}?\n\nIsso irá extrair novamente os campos de ICMS-ST, endereços e outros dados dos XMLs originais.`)) {
      return;
    }
    
    setReprocessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/xml/reprocess-batch/${ctxCompany.id}/${selectedCompetencia}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success !== false) {
        alert(`Re-processamento concluído!\n\nTotal: ${res.data.total}\nSucesso: ${res.data.success}\nCom ICMS-ST: ${res.data.with_st}\nErros: ${res.data.errors}`);
        fetchData();
      } else {
        alert('Erro: ' + res.data.error);
      }
    } catch (err) {
      console.error('Erro ao re-processar:', err);
      alert(err.response?.data?.detail || 'Erro ao re-processar documentos');
    } finally {
      setReprocessing(false);
    }
  };

  const handleDeleteDocument = async (docId, numeroNfe) => {
    if (!window.confirm(`Tem certeza que deseja apagar a NF-e ${numeroNfe}?`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Documento apagado com sucesso!');
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar documento:', err);
      alert(err.response?.data?.detail || 'Erro ao apagar documento');
    }
  };

  const handleDeleteAllCompetencia = async () => {
    if (!ctxCompany || !selectedCompetencia) {
      alert('Selecione uma empresa e competência');
      return;
    }
    
    let tipoLabel = '';
    if (selectedTipo === 'entrada') tipoLabel = ' de ENTRADA';
    else if (selectedTipo === 'saida') tipoLabel = ' de SAÍDA';
    
    let statusLabel = '';
    if (selectedStatus === 'pendente') statusLabel = ' PENDENTES';
    else if (selectedStatus === 'validado') statusLabel = ' VALIDADOS';
    else if (selectedStatus === 'com_excecao') statusLabel = ' com EXCEÇÃO';
    
    const docsToDelete = sortedAndFilteredDocuments.length;
    
    if (!window.confirm(`Tem certeza que deseja apagar ${docsToDelete} documento(s)${tipoLabel}${statusLabel} da competência ${selectedCompetencia}?\n\nEssa ação não pode ser desfeita.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/documents/competencia/${ctxCompany.id}/${selectedCompetencia}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          tipo: selectedTipo || undefined,
          status: selectedStatus || undefined
        }
      });
      alert('Documentos apagados com sucesso!');
      fetchData();
    } catch (err) {
      console.error('Erro ao apagar documentos:', err);
      alert(err.response?.data?.detail || 'Erro ao apagar documentos');
    } finally {
      setDeleting(false);
    }
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.razao_social : companyId;
  };

  const getStatusBadge = (status) => {
    const styles = {
      'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'validado': 'bg-green-100 text-green-800 border-green-200',
      'com_excecao': 'bg-red-100 text-red-800 border-red-200'
    };
    const labels = {
      'pendente': 'Pendente',
      'validado': 'Validado',
      'com_excecao': 'Com Exceção'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Função para calcular totalizadores por CFOP (inclui ICMS-ST)
  const calculateCFOPTotals = (produtos) => {
    const totals = {};
    (produtos || []).forEach(prod => {
      const cfop = prod.cfop || 'N/A';
      if (!totals[cfop]) {
        totals[cfop] = { count: 0, valor: 0, bc_icms: 0, v_icms: 0, bc_st: 0, v_st: 0, v_ipi: 0, v_pis: 0, v_cofins: 0 };
      }
      totals[cfop].count++;
      totals[cfop].valor += parseFloat(prod.valor_total || 0);
      totals[cfop].bc_icms += parseFloat(prod.v_bc_icms || 0);
      totals[cfop].v_icms += parseFloat(prod.v_icms || 0);
      totals[cfop].bc_st += parseFloat(prod.v_bc_icms_st || prod.v_bc_st || 0);
      totals[cfop].v_st += parseFloat(prod.v_icms_st || prod.v_st || 0);
      totals[cfop].v_ipi += parseFloat(prod.v_ipi || 0);
      totals[cfop].v_pis += parseFloat(prod.v_pis || 0);
      totals[cfop].v_cofins += parseFloat(prod.v_cofins || 0);
    });
    return totals;
  };

  // Função para calcular soma dos itens (inclui ICMS-ST)
  const calculateItemsSum = (produtos) => {
    return (produtos || []).reduce((sum, prod) => ({
      valor: sum.valor + parseFloat(prod.valor_total || 0),
      bc_icms: sum.bc_icms + parseFloat(prod.v_bc_icms || 0),
      v_icms: sum.v_icms + parseFloat(prod.v_icms || 0),
      bc_st: sum.bc_st + parseFloat(prod.v_bc_icms_st || prod.v_bc_st || 0),
      v_st: sum.v_st + parseFloat(prod.v_icms_st || prod.v_st || 0),
      v_ipi: sum.v_ipi + parseFloat(prod.v_ipi || 0),
      v_pis: sum.v_pis + parseFloat(prod.v_pis || 0),
      v_cofins: sum.v_cofins + parseFloat(prod.v_cofins || 0),
      qtd: sum.qtd + parseFloat(prod.quantidade || 0)
    }), { valor: 0, bc_icms: 0, v_icms: 0, bc_st: 0, v_st: 0, v_ipi: 0, v_pis: 0, v_cofins: 0, qtd: 0 });
  };

  // Verificar integridade do documento - Compara soma dos itens com totais da NF
  const checkDocIntegrity = (doc) => {
    if (!doc || !doc.produtos || doc.produtos.length === 0) return { valid: true, errors: [], fieldStatus: {} };
    
    const itemsSum = calculateItemsSum(doc.produtos);
    const errors = [];
    const fieldStatus = {};
    const tolerance = 0.02;
    
    const totaisNF = {
      valor: parseFloat(doc.valor_total || 0),
      v_ipi: parseFloat(doc.total_ipi || 0),
      v_st: parseFloat(doc.total_icms_st || 0),
      v_frete: parseFloat(doc.total_frete || 0),
      v_seg: parseFloat(doc.total_seguro || 0),
      v_outro: parseFloat(doc.total_outras_despesas || 0)
    };
    
    const valorProdutosEsperado = totaisNF.valor - totaisNF.v_ipi - totaisNF.v_st - totaisNF.v_frete - totaisNF.v_seg - totaisNF.v_outro;
    
    if (Math.abs(valorProdutosEsperado - itemsSum.valor) > tolerance && valorProdutosEsperado > 0) {
      errors.push({
        campo: 'Valor Produtos',
        nf: valorProdutosEsperado,
        soma: itemsSum.valor,
        diferenca: valorProdutosEsperado - itemsSum.valor
      });
      fieldStatus.valor = 'error';
    } else {
      fieldStatus.valor = 'ok';
    }
    
    if (Math.abs(totaisNF.v_ipi - itemsSum.v_ipi) > tolerance) {
      errors.push({
        campo: 'IPI',
        nf: totaisNF.v_ipi,
        soma: itemsSum.v_ipi,
        diferenca: totaisNF.v_ipi - itemsSum.v_ipi
      });
      fieldStatus.v_ipi = 'error';
    } else {
      fieldStatus.v_ipi = 'ok';
    }
    
    if (Math.abs(totaisNF.v_st - itemsSum.v_st) > tolerance) {
      errors.push({
        campo: 'ICMS-ST',
        nf: totaisNF.v_st,
        soma: itemsSum.v_st,
        diferenca: totaisNF.v_st - itemsSum.v_st
      });
      fieldStatus.v_st = 'error';
    } else {
      fieldStatus.v_st = 'ok';
    }
    
    fieldStatus.bc_icms = 'ok';
    fieldStatus.v_icms = 'ok';
    fieldStatus.bc_st = 'ok';
    fieldStatus.v_pis = 'ok';
    fieldStatus.v_cofins = 'ok';
    
    return { valid: errors.length === 0, errors, fieldStatus };
  };

  const quickCheckIntegrity = (doc) => {
    if (!doc.produtos || doc.produtos.length === 0) return null;
    return checkDocIntegrity(doc);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Handler de ordenação
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ícone de ordenação
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-red-600" />
      : <ArrowDown className="w-3 h-3 text-red-600" />;
  };

  // Filtrar e ordenar documentos
  const sortedAndFilteredDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      if (ctxCompany && doc.company_id !== ctxCompany.id) return false;
      if (selectedCompetencia && doc.competencia !== selectedCompetencia) return false;
      if (selectedStatus && doc.status_validacao !== selectedStatus) return false;
      if (selectedTipo && doc.tipo !== selectedTipo) return false;
      
      // Filtro de integridade
      if (selectedIntegridade) {
        const check = quickCheckIntegrity(doc);
        if (selectedIntegridade === 'ok' && (check === null || !check.valid)) return false;
        if (selectedIntegridade === 'divergente' && (check === null || check.valid)) return false;
        if (selectedIntegridade === 'sem_produtos' && check !== null) return false;
      }
      
      return true;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let valA, valB;
      
      switch (sortField) {
        case 'numero_nfe':
          valA = parseInt(a.numero_nfe) || 0;
          valB = parseInt(b.numero_nfe) || 0;
          break;
        case 'valor_total':
          valA = a.valor_total || 0;
          valB = b.valor_total || 0;
          break;
        case 'data_emissao':
          valA = new Date(a.data_emissao).getTime();
          valB = new Date(b.data_emissao).getTime();
          break;
        case 'emitente_nome':
          valA = (a.emitente_nome || '').toLowerCase();
          valB = (b.emitente_nome || '').toLowerCase();
          break;
        case 'integridade':
          const checkA = quickCheckIntegrity(a);
          const checkB = quickCheckIntegrity(b);
          valA = checkA === null ? 2 : (checkA.valid ? 0 : 1);
          valB = checkB === null ? 2 : (checkB.valid ? 0 : 1);
          break;
        default:
          valA = a[sortField] || '';
          valB = b[sortField] || '';
      }
      
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return filtered;
  }, [documents, ctxCompany, selectedCompetencia, selectedStatus, selectedTipo, selectedIntegridade, sortField, sortDirection]);

  // Calcular resumo de integridade
  const integritySummary = useMemo(() => {
    return sortedAndFilteredDocuments.reduce((acc, doc) => {
      const check = quickCheckIntegrity(doc);
      if (check === null) {
        acc.semProdutos++;
      } else if (check.valid) {
        acc.validos++;
      } else {
        acc.divergentes++;
      }
      acc.total++;
      return acc;
    }, { total: 0, validos: 0, divergentes: 0, semProdutos: 0 });
  }, [sortedAndFilteredDocuments]);

  // Modal de detalhamento do documento
  const DocumentDetailModal = () => {
    if (!selectedDocument) return null;
    
    const produtos = selectedDocument.produtos || [];
    const cfopTotals = calculateCFOPTotals(produtos);
    const itemsSum = calculateItemsSum(produtos);
    const integrity = checkDocIntegrity(selectedDocument);
    
    const getFieldClass = (field, defaultClass = '') => {
      if (integrity.fieldStatus[field] === 'error') return 'text-red-600 bg-red-50';
      if (integrity.fieldStatus[field] === 'ok') return 'text-green-700 bg-green-50';
      return defaultClass;
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">NF-e {selectedDocument.numero_nfe}</h2>
              <p className="text-red-100 text-sm">
                {selectedDocument.emitente_nome} • {new Date(selectedDocument.data_emissao).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                integrity.valid ? 'bg-green-500/20 text-green-100' : 'bg-red-500/30 text-red-100'
              }`}>
                {integrity.valid ? (
                  <><CheckCircle2 className="w-5 h-5" /> Valores OK</>
                ) : (
                  <><XCircle className="w-5 h-5" /> {integrity.errors.length} Divergência(s)</>
                )}
              </div>
              <button onClick={() => setSelectedDocument(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Resumo da NF com cores indicando status */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className={`p-3 rounded-lg border ${getFieldClass('valor', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">Valor Produtos</p>
                  <p className="font-bold">{formatCurrency(itemsSum.valor)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">Valor NF</p>
                  <p className="font-bold text-gray-900">{formatCurrency(selectedDocument.valor_total)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${getFieldClass('bc_icms', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">BC ICMS</p>
                  <p className="font-semibold">{formatCurrency(itemsSum.bc_icms)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${getFieldClass('v_icms', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">ICMS</p>
                  <p className="font-semibold text-blue-600">{formatCurrency(itemsSum.v_icms)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${getFieldClass('bc_st', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">BC ST</p>
                  <p className="font-semibold">{formatCurrency(itemsSum.bc_st)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${getFieldClass('v_st', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">ICMS-ST</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(itemsSum.v_st)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${getFieldClass('v_ipi', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">IPI</p>
                  <p className="font-semibold text-purple-600">{formatCurrency(itemsSum.v_ipi)}</p>
                </div>
                <div className={`p-3 rounded-lg border ${getFieldClass('v_pis', 'bg-gray-50')}`}>
                  <p className="text-xs text-gray-500 mb-1">PIS/COFINS</p>
                  <p className="font-semibold text-teal-600">{formatCurrency(itemsSum.v_pis + itemsSum.v_cofins)}</p>
                </div>
              </div>
              
              {/* Erro de integridade se houver */}
              {!integrity.valid && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800">Divergências detectadas entre totais da NF e soma dos itens:</p>
                      <div className="mt-2 space-y-1">
                        {integrity.errors.map((err, i) => (
                          <p key={i} className="text-sm text-red-700">
                            <span className="font-medium">{err.campo}:</span> NF {formatCurrency(err.nf)} ≠ Soma {formatCurrency(err.soma)} 
                            <span className="font-semibold ml-1">(Dif: {formatCurrency(err.diferenca)})</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Totalizador por CFOP */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Totalizador por CFOP
                </h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">CFOP</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Qtd</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">BC ICMS</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">ICMS</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">BC ST</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">ICMS-ST</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">IPI</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">PIS</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">COFINS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(cfopTotals).map(([cfop, totals]) => (
                        <tr key={cfop} className="hover:bg-gray-100">
                          <td className="px-3 py-2 font-mono font-medium">{cfop}</td>
                          <td className="px-3 py-2 text-center">{totals.count}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.valor)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.bc_icms)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.v_icms)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.bc_st)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.v_st)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.v_ipi)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.v_pis)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.v_cofins)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-200 font-semibold">
                      <tr>
                        <td className="px-3 py-2">TOTAL</td>
                        <td className="px-3 py-2 text-center">{produtos.length}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.valor)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.bc_icms)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.v_icms)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.bc_st)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.v_st)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.v_ipi)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.v_pis)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.v_cofins)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              {/* Lista de Itens */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Itens da NF ({produtos.length} produtos)
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 w-8">#</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Produto</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 w-20">NCM</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-700 w-14">CFOP</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12">CST</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-14">Qtd</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">Valor</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">ICMS</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">BC ST</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">ICMS-ST</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-16">IPI</th>
                          <th className="px-2 py-2 text-right font-semibold text-gray-700 w-20">PIS/COF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {produtos.map((prod, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-2 py-2 text-gray-500">{idx + 1}</td>
                            <td className="px-2 py-2">
                              <p className="font-medium text-gray-900 truncate max-w-[180px]" title={prod.descricao}>
                                {prod.descricao}
                              </p>
                              <p className="text-xs text-gray-500">Cód: {prod.codigo}</p>
                            </td>
                            <td className="px-2 py-2 font-mono text-xs">{prod.ncm}</td>
                            <td className="px-2 py-2 font-mono font-medium">{prod.cfop}</td>
                            <td className="px-2 py-2 text-center">
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                                {prod.cst || '-'}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right text-xs">{parseFloat(prod.quantidade || 0).toFixed(2)}</td>
                            <td className="px-2 py-2 text-right font-medium text-xs">{formatCurrency(prod.valor_total)}</td>
                            <td className="px-2 py-2 text-right text-blue-600 text-xs">{formatCurrency(prod.v_icms)}</td>
                            <td className="px-2 py-2 text-right text-xs">{formatCurrency(prod.v_bc_icms_st || prod.v_bc_st)}</td>
                            <td className="px-2 py-2 text-right text-orange-600 text-xs">{formatCurrency(prod.v_icms_st || prod.v_st)}</td>
                            <td className="px-2 py-2 text-right text-purple-600 text-xs">{formatCurrency(prod.v_ipi)}</td>
                            <td className="px-2 py-2 text-right text-teal-600 text-xs">
                              {formatCurrency((parseFloat(prod.v_pis || 0) + parseFloat(prod.v_cofins || 0)))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
            <button
              onClick={() => setSelectedDocument(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Header de coluna clicável para ordenação
  const SortableHeader = ({ field, children, className = '' }) => (
    <th 
      className={`px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="documents-page" className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Documentos Fiscais</h1>
            <p className="text-gray-600">Gerencie e valide os XMLs importados</p>
          </div>
          <Link
            data-testid="go-to-upload-button"
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Novo Upload
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Filtros</h2>
            </div>
            
            <div className="flex items-center gap-2">
              {ctxCompany && selectedCompetencia && (
                <button
                  onClick={handleReprocessBatch}
                  disabled={reprocessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  title="Re-processar XMLs para extrair campos faltantes (ICMS-ST, endereços, etc.)"
                >
                  <RefreshCw className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
                  {reprocessing ? 'Re-processando...' : 'Re-processar XMLs'}
                </button>
              )}
              
              {ctxCompany && selectedCompetencia && user.role === 'admin' && (
                <button
                  data-testid="btn-apagar-lote"
                  onClick={handleDeleteAllCompetencia}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Apagando...' : 'Apagar em Lote'}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                data-testid="filter-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="validado">Validado</option>
                <option value="com_excecao">Com Exceção</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                data-testid="filter-tipo-select"
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Integridade</label>
              <select
                data-testid="filter-integridade-select"
                value={selectedIntegridade}
                onChange={(e) => setSelectedIntegridade(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todos</option>
                <option value="ok">✓ Validadas</option>
                <option value="divergente">✗ Divergentes</option>
              </select>
            </div>
            <div className="flex items-end">
              <p className="text-sm text-gray-600">
                <span className="font-medium">{sortedAndFilteredDocuments.length}</span> documentos
              </p>
            </div>
          </div>
        </div>

        {/* Card de Integridade */}
        {sortedAndFilteredDocuments.length > 0 && integritySummary.total > integritySummary.semProdutos && (
          <div className={`rounded-lg p-4 flex items-center justify-between ${
            integritySummary.divergentes > 0 
              ? 'bg-amber-50 border border-amber-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${
                integritySummary.divergentes > 0 ? 'text-amber-600' : 'text-green-600'
              }`} />
              <div>
                <span className="font-medium text-gray-900">Validação de Integridade: </span>
                {integritySummary.divergentes > 0 ? (
                  <span className="text-amber-700">
                    {integritySummary.validos} de {integritySummary.total - integritySummary.semProdutos} notas OK 
                    <span className="text-amber-600 font-medium ml-1">
                      ({integritySummary.divergentes} com divergência)
                    </span>
                  </span>
                ) : (
                  <span className="text-green-700">
                    Todas as {integritySummary.validos} notas com valores íntegros ✓
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Documents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : sortedAndFilteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortableHeader field="integridade" className="w-10">✓</SortableHeader>
                    <SortableHeader field="numero_nfe">NF-e</SortableHeader>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                    <SortableHeader field="emitente_nome">Emitente</SortableHeader>
                    <SortableHeader field="valor_total">Valor</SortableHeader>
                    <SortableHeader field="data_emissao">Data</SortableHeader>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAndFilteredDocuments.map((doc) => {
                    const integrityCheck = quickCheckIntegrity(doc);
                    return (
                      <tr key={doc.id} data-testid={`document-row-${doc.id}`} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          {integrityCheck === null ? (
                            <span className="text-gray-400" title="Sem itens para validar">-</span>
                          ) : integrityCheck.valid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" title="Valores OK" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" title={`${integrityCheck.errors.length} divergência(s)`} />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => fetchDocumentDetail(doc.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                          >
                            {doc.numero_nfe}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{getCompanyName(doc.company_id)}</td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            doc.tipo === 'entrada' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {doc.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={doc.emitente_nome}>
                          {doc.emitente_nome}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(doc.valor_total)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(doc.data_emissao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(doc.status_validacao)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchDocumentDetail(doc.id)}
                              className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.numero_nfe)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Apagar documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {!loading && sortedAndFilteredDocuments.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total de Documentos</p>
                <p className="text-2xl font-bold text-gray-900">{sortedAndFilteredDocuments.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(sortedAndFilteredDocuments.reduce((sum, doc) => sum + doc.valor_total, 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Entradas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {sortedAndFilteredDocuments.filter(d => d.tipo === 'entrada').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Saídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {sortedAndFilteredDocuments.filter(d => d.tipo === 'saida').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Detalhamento */}
      <DocumentDetailModal />
    </Layout>
  );
};

export default Documents;
