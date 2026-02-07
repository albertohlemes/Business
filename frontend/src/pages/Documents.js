import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { FileText, Eye, Filter, Trash2, CheckCircle2, XCircle, Shield, X, ArrowUpDown, ArrowUp, ArrowDown, Search, Download, FileSpreadsheet, AlertTriangle, FileDown } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Documents = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia } = useAppContext();
  const [searchParams] = useSearchParams();
  const highlightDocId = searchParams.get('highlight');
  
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedIntegridade, setSelectedIntegridade] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Busca
  
  // Ordenação
  const [sortField, setSortField] = useState('numero_nfe');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Modal de detalhamento
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Relatório de Devoluções do Fornecedor
  const [relatorioDevolucoes, setRelatorioDevolucoes] = useState(null);
  const [loadingDevolucoes, setLoadingDevolucoes] = useState(false);
  const [showRelatorioDevolucoes, setShowRelatorioDevolucoes] = useState(false);
  
  // Relatório de Notas Canceladas
  const [relatorioCanceladas, setRelatorioCanceladas] = useState(null);
  const [loadingCanceladas, setLoadingCanceladas] = useState(false);
  const [showRelatorioCanceladas, setShowRelatorioCanceladas] = useState(false);

  useEffect(() => {
    if (ctxCompany) {
      fetchData();
    }
  }, [ctxCompany]);
  
  // Auto-abrir documento se highlight estiver na URL
  useEffect(() => {
    if (highlightDocId && documents.length > 0) {
      const docToOpen = documents.find(d => d.id === highlightDocId);
      if (docToOpen) {
        fetchDocumentDetail(highlightDocId);
      }
    }
  }, [highlightDocId, documents]);

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
      await axios.delete(`${API}/documents/${ctxCompany.id}/competencia/${encodeURIComponent(selectedCompetencia)}`, {
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
        totals[cfop] = { count: 0, valor_total: 0, bc_icms: 0, v_icms: 0, bc_st: 0, v_st: 0, v_ipi: 0, v_pis: 0, v_cofins: 0 };
      }
      totals[cfop].count++;
      totals[cfop].valor_total += parseFloat(prod.valor_total || 0);
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
      // valor_total já inclui ST, IPI, frete, etc
      valor_total: sum.valor_total + parseFloat(prod.valor_total || 0),
      // valor_produto é o vProd puro (sem ST, IPI, etc)
      valor_produto: sum.valor_produto + parseFloat(prod.valor_produto || prod.valor_total || 0),
      bc_icms: sum.bc_icms + parseFloat(prod.v_bc_icms || 0),
      v_icms: sum.v_icms + parseFloat(prod.v_icms || 0),
      bc_st: sum.bc_st + parseFloat(prod.v_bc_icms_st || prod.v_bc_st || 0),
      v_st: sum.v_st + parseFloat(prod.v_icms_st || prod.v_st || 0),
      v_ipi: sum.v_ipi + parseFloat(prod.v_ipi || 0),
      v_frete: sum.v_frete + parseFloat(prod.v_frete || 0),
      v_seguro: sum.v_seguro + parseFloat(prod.v_seguro || 0),
      v_outras: sum.v_outras + parseFloat(prod.v_outras_despesas || 0),
      v_desconto: sum.v_desconto + parseFloat(prod.v_desconto || 0),
      v_pis: sum.v_pis + parseFloat(prod.v_pis || 0),
      v_cofins: sum.v_cofins + parseFloat(prod.v_cofins || 0),
      qtd: sum.qtd + parseFloat(prod.quantidade || 0)
    }), { valor_total: 0, valor_produto: 0, bc_icms: 0, v_icms: 0, bc_st: 0, v_st: 0, v_ipi: 0, v_frete: 0, v_seguro: 0, v_outras: 0, v_desconto: 0, v_pis: 0, v_cofins: 0, qtd: 0 });
  };

  // Verificar integridade do documento - Compara soma dos itens com totais da NF
  const checkDocIntegrity = (doc) => {
    if (!doc || !doc.produtos || doc.produtos.length === 0) return { valid: true, errors: [], fieldStatus: {} };
    
    const itemsSum = calculateItemsSum(doc.produtos);
    const errors = [];
    const fieldStatus = {};
    const tolerance = 0.05; // Tolerância maior para arredondamentos
    
    const totaisNF = {
      valor: parseFloat(doc.valor_total || 0),
      v_ipi: parseFloat(doc.total_ipi || 0),
      v_st: parseFloat(doc.total_icms_st || 0),
      v_frete: parseFloat(doc.total_frete || 0),
      v_seg: parseFloat(doc.total_seguro || 0),
      v_outro: parseFloat(doc.total_outras_despesas || 0),
      v_desc: parseFloat(doc.total_desconto || 0)
    };
    
    // Método 1: Verificar se soma de valor_total dos produtos = Valor NF
    // (valor_total do produto já inclui ST, IPI, frete rateado, etc)
    const diffValorTotal = Math.abs(totaisNF.valor - itemsSum.valor_total);
    
    // Método 2: Verificar se soma de valor_produto + ST + IPI + frete + seg + outros - desc = Valor NF
    const valorCalculado = itemsSum.valor_produto + itemsSum.v_st + itemsSum.v_ipi + 
                          itemsSum.v_frete + itemsSum.v_seguro + itemsSum.v_outras - itemsSum.v_desconto;
    const diffValorCalculado = Math.abs(totaisNF.valor - valorCalculado);
    
    // Se nenhum dos métodos bater, há divergência
    if (diffValorTotal > tolerance && diffValorCalculado > tolerance) {
      // Verificar qual é a menor diferença para reportar
      if (diffValorTotal <= diffValorCalculado) {
        errors.push({
          campo: 'Valor Total',
          nf: totaisNF.valor,
          soma: itemsSum.valor_total,
          diferenca: totaisNF.valor - itemsSum.valor_total
        });
      } else {
        errors.push({
          campo: 'Valor Calculado',
          nf: totaisNF.valor,
          soma: valorCalculado,
          diferenca: totaisNF.valor - valorCalculado
        });
      }
      fieldStatus.valor = 'error';
    } else {
      fieldStatus.valor = 'ok';
    }
    
    // Verificar ICMS-ST
    if (totaisNF.v_st > 0 && Math.abs(totaisNF.v_st - itemsSum.v_st) > tolerance) {
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
    
    // Verificar IPI
    if (totaisNF.v_ipi > 0 && Math.abs(totaisNF.v_ipi - itemsSum.v_ipi) > tolerance) {
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

  // Função de exportação para Excel
  const exportToExcel = () => {
    console.log('exportToExcel chamada, docs:', sortedAndFilteredDocuments.length);
    
    if (sortedAndFilteredDocuments.length === 0) {
      alert('Não há documentos para exportar');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
    const empresa = ctxCompany?.razao_social || 'Todas';
    const competencia = selectedCompetencia || 'Todas';

    // Formatar data
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
      } catch {
        return dateStr.split('T')[0] || dateStr;
      }
    };

    // Preparar dados das notas
    const notasData = sortedAndFilteredDocuments.map(doc => ({
      'NF': doc.numero_nfe,
      'Série': doc.serie || '',
      'Data Emissão': formatDate(doc.data_emissao),
      'Tipo': doc.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA',
      'Emitente': doc.emitente_nome || '',
      'CNPJ Emitente': doc.emitente_cnpj || '',
      'Destinatário': doc.destinatario_nome || '',
      'CNPJ Destinatário': doc.destinatario_cnpj || '',
      'Valor NF': doc.valor_total || 0,
      'Qtd Produtos': doc.produtos?.length || 0,
      'Status': doc.status_validacao === 'validado' ? 'Validado' : doc.status_validacao === 'com_excecao' ? 'Com Exceção' : 'Pendente',
      'Chave': doc.chave_nfe || ''
    }));

    // Criar planilha de notas
    const wsNotas = XLSX.utils.json_to_sheet(notasData);
    wsNotas['!cols'] = [
      { wch: 10 }, // NF
      { wch: 6 },  // Série
      { wch: 12 }, // Data
      { wch: 10 }, // Tipo
      { wch: 40 }, // Emitente
      { wch: 18 }, // CNPJ Emit
      { wch: 40 }, // Destinatário
      { wch: 18 }, // CNPJ Dest
      { wch: 14 }, // Valor
      { wch: 10 }, // Qtd
      { wch: 12 }, // Status
      { wch: 50 }  // Chave
    ];
    XLSX.utils.book_append_sheet(wb, wsNotas, 'Notas Fiscais');

    // Preparar dados dos produtos (detalhamento)
    const produtosData = [];
    sortedAndFilteredDocuments.forEach(doc => {
      (doc.produtos || []).forEach(prod => {
        produtosData.push({
          'NF': doc.numero_nfe,
          'Tipo': doc.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA',
          'Data': formatDate(doc.data_emissao),
          'Código': prod.codigo || '',
          'Descrição': prod.descricao || '',
          'NCM': prod.ncm || '',
          'CFOP': prod.cfop || '',
          'CST': prod.cst || '',
          'Qtd': prod.quantidade || 0,
          'Vlr Unit': prod.valor_unitario || 0,
          'Vlr Produto': prod.valor_produto || 0,
          'Vlr Total': prod.valor_total || 0,
          'BC ICMS': prod.v_bc_icms || 0,
          'ICMS': prod.v_icms || 0,
          'BC ST': prod.v_bc_icms_st || 0,
          'ICMS ST': prod.v_icms_st || 0,
          'IPI': prod.v_ipi || 0,
          'PIS': prod.v_pis || 0,
          'COFINS': prod.v_cofins || 0
        });
      });
    });

    if (produtosData.length > 0) {
      const wsProdutos = XLSX.utils.json_to_sheet(produtosData);
      wsProdutos['!cols'] = [
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 40 },
        { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, wsProdutos, 'Produtos');
    }

    // Resumo
    const totalEntradas = sortedAndFilteredDocuments.filter(d => d.tipo === 'entrada').reduce((sum, d) => sum + (d.valor_total || 0), 0);
    const totalSaidas = sortedAndFilteredDocuments.filter(d => d.tipo === 'saida').reduce((sum, d) => sum + (d.valor_total || 0), 0);
    const qtdEntradas = sortedAndFilteredDocuments.filter(d => d.tipo === 'entrada').length;
    const qtdSaidas = sortedAndFilteredDocuments.filter(d => d.tipo === 'saida').length;

    const resumoData = [
      { 'Descrição': 'RESUMO DA EXPORTAÇÃO', 'Quantidade': '', 'Valor': '' },
      { 'Descrição': '', 'Quantidade': '', 'Valor': '' },
      { 'Descrição': 'Empresa', 'Quantidade': '', 'Valor': empresa },
      { 'Descrição': 'Competência', 'Quantidade': '', 'Valor': competencia },
      { 'Descrição': '', 'Quantidade': '', 'Valor': '' },
      { 'Descrição': 'Notas de Entrada', 'Quantidade': qtdEntradas, 'Valor': totalEntradas },
      { 'Descrição': 'Notas de Saída', 'Quantidade': qtdSaidas, 'Valor': totalSaidas },
      { 'Descrição': '', 'Quantidade': '', 'Valor': '' },
      { 'Descrição': 'TOTAL DE NOTAS', 'Quantidade': sortedAndFilteredDocuments.length, 'Valor': totalEntradas + totalSaidas }
    ];

    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Gerar nome do arquivo
    const tipoFiltro = selectedTipo ? `_${selectedTipo.toUpperCase()}` : '';
    const statusFiltro = selectedStatus ? `_${selectedStatus}` : '';
    const fileName = `Notas_${empresa.substring(0, 15)}${tipoFiltro}${statusFiltro}_${competencia.replace('/', '-')}.xlsx`;

    console.log('Gerando arquivo:', fileName);
    
    // Usar método alternativo de download para garantir compatibilidade
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Criar link de download e clicar
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    console.log('Arquivo gerado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar: ' + error.message);
    }
  };

  // ======= RELATÓRIO DE DEVOLUÇÕES DO FORNECEDOR =======
  const fetchRelatorioDevolucoes = async () => {
    if (!ctxCompany) return;
    
    setLoadingDevolucoes(true);
    try {
      const token = localStorage.getItem('token');
      const compParam = selectedCompetencia ? `?competencia=${selectedCompetencia}` : '';
      const res = await axios.get(`${API}/relatorio-devolucoes-fornecedor/${ctxCompany.id}${compParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRelatorioDevolucoes(res.data);
      setShowRelatorioDevolucoes(true);
    } catch (err) {
      console.error('Erro ao buscar relatório de devoluções:', err);
      alert('Erro ao buscar relatório de devoluções');
    } finally {
      setLoadingDevolucoes(false);
    }
  };

  const exportarRelatorioDevolucoes = async (formato) => {
    if (!ctxCompany) return;
    
    try {
      const token = localStorage.getItem('token');
      const compParam = selectedCompetencia ? `competencia=${selectedCompetencia}&` : '';
      const response = await axios.get(
        `${API}/relatorio-devolucoes-fornecedor/${ctxCompany.id}/exportar?${compParam}formato=${formato}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Criar link para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = formato === 'excel' ? 'xlsx' : 'docx';
      link.setAttribute('download', `devolucoes_fornecedor_${ctxCompany.razao_social?.substring(0, 15) || ctxCompany.id}_${selectedCompetencia || 'todas'}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
      alert('Erro ao exportar relatório');
    }
  };

  // ======= RELATÓRIO DE NOTAS CANCELADAS =======
  const fetchRelatorioCanceladas = async () => {
    if (!ctxCompany) return;
    
    setLoadingCanceladas(true);
    try {
      const token = localStorage.getItem('token');
      const compParam = selectedCompetencia ? `?competencia=${selectedCompetencia}` : '';
      const res = await axios.get(`${API}/relatorio-notas-canceladas/${ctxCompany.id}${compParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRelatorioCanceladas(res.data);
      setShowRelatorioCanceladas(true);
    } catch (err) {
      console.error('Erro ao buscar relatório de canceladas:', err);
      alert('Erro ao buscar relatório de notas canceladas');
    } finally {
      setLoadingCanceladas(false);
    }
  };

  const exportarRelatorioCanceladas = async (formato) => {
    if (!ctxCompany) return;
    
    try {
      const token = localStorage.getItem('token');
      const compParam = selectedCompetencia ? `competencia=${selectedCompetencia}&` : '';
      const response = await axios.get(
        `${API}/relatorio-notas-canceladas/${ctxCompany.id}/exportar?${compParam}formato=${formato}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Criar link para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = formato === 'excel' ? 'xlsx' : 'docx';
      link.setAttribute('download', `notas_canceladas_${ctxCompany.razao_social?.substring(0, 15) || ctxCompany.id}_${selectedCompetencia || 'todas'}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar relatório:', err);
      alert('Erro ao exportar relatório de canceladas');
    }
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

  // Ícone de ordenação - usando render function ao invés de componente
  const renderSortIcon = (field) => {
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
      
      // Filtro de busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchNF = doc.numero_nfe?.toLowerCase().includes(term);
        const matchEmitente = doc.emitente_nome?.toLowerCase().includes(term);
        const matchCNPJ = doc.emitente_cnpj?.includes(term);
        const matchChave = doc.chave_nfe?.includes(term);
        const matchProduto = doc.produtos?.some(p => 
          p.descricao?.toLowerCase().includes(term) ||
          p.ncm?.includes(term) ||
          p.codigo?.toLowerCase().includes(term)
        );
        if (!matchNF && !matchEmitente && !matchCNPJ && !matchChave && !matchProduto) return false;
      }
      
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
  }, [documents, ctxCompany, selectedCompetencia, selectedStatus, selectedTipo, selectedIntegridade, searchTerm, sortField, sortDirection]);

  // Calcular resumo de integridade - Usa TODOS os documentos, não apenas os filtrados
  const integritySummary = useMemo(() => {
    return documents.reduce((acc, doc) => {
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
  }, [documents]);

  // Modal de detalhamento do documento - usando função de render
  const renderDocumentDetailModal = () => {
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
                  <p className="font-bold">{formatCurrency(itemsSum.valor_total)}</p>
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
                          <td className="px-3 py-2 text-right">{formatCurrency(totals.valor_total)}</td>
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
                        <td className="px-3 py-2 text-right">{formatCurrency(itemsSum.valor_total)}</td>
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

  // Header de coluna clicável para ordenação - usando render function
  const renderSortableHeader = (field, children, className = '') => (
    <th 
      className={`px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {renderSortIcon(field)}
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
              {/* Botão de Exportar */}
              {sortedAndFilteredDocuments.length > 0 && (
                <button
                  data-testid="btn-exportar-notas"
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar ({sortedAndFilteredDocuments.length})
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
          
          {/* Campo de Busca */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                data-testid="search-documents"
                placeholder="Buscar por NF, emitente, CNPJ, chave, produto, NCM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
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
                    {renderSortableHeader("integridade", "✓", "w-10")}
                    {renderSortableHeader("numero_nfe", "NF-e")}
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Empresa</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                    {renderSortableHeader("emitente_nome", "Emitente")}
                    {renderSortableHeader("valor_total", "Valor")}
                    {renderSortableHeader("data_emissao", "Data")}
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedAndFilteredDocuments.map((doc) => {
                    const integrityCheck = quickCheckIntegrity(doc);
                    const hasError = integrityCheck && !integrityCheck.valid;
                    return (
                      <tr 
                        key={doc.id} 
                        data-testid={`document-row-${doc.id}`} 
                        className={`hover:bg-gray-50 ${hasError ? 'bg-red-50 hover:bg-red-100' : ''}`}
                      >
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
                            className={`text-sm font-medium hover:underline ${hasError ? 'text-red-700 hover:text-red-900' : 'text-red-600 hover:text-red-800'}`}
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
                  {formatCurrency(documents.reduce((sum, doc) => sum + doc.valor_total, 0))}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Entradas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {documents.filter(d => d.tipo === 'entrada').length}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Saídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {documents.filter(d => d.tipo === 'saida').length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO: Relatórios Especiais */}
        {ctxCompany && (
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl shadow-md p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Relatórios Especiais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Relatório de Devoluções do Fornecedor */}
              <div className="bg-white/10 rounded-lg p-5 hover:bg-white/20 transition-colors flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-white font-semibold">
                    Devoluções do Fornecedor
                  </h4>
                </div>
                <p className="text-slate-300 text-sm mb-4 flex-grow">
                  Notas de devolução emitidas por fornecedores e suas respectivas notas de saída originais, excluídas das apurações fiscais.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={fetchRelatorioDevolucoes}
                    disabled={loadingDevolucoes}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {loadingDevolucoes ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Visualizar
                  </button>
                  <button
                    onClick={() => exportarRelatorioDevolucoes('excel')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportarRelatorioDevolucoes('word')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <FileDown className="w-4 h-4" />
                    Word
                  </button>
                </div>
              </div>

              {/* Relatório de Notas Canceladas */}
              <div className="bg-white/10 rounded-lg p-5 hover:bg-white/20 transition-colors flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-white font-semibold">
                    Notas Canceladas
                  </h4>
                </div>
                <p className="text-slate-300 text-sm mb-4 flex-grow">
                  Todas as notas fiscais canceladas por evento fiscal ou detecção automática, excluídas das apurações.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={fetchRelatorioCanceladas}
                    disabled={loadingCanceladas}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {loadingCanceladas ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Visualizar
                  </button>
                  <button
                    onClick={() => exportarRelatorioCanceladas('excel')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportarRelatorioCanceladas('word')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <FileDown className="w-4 h-4" />
                    Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal do Relatório de Devoluções */}
      {showRelatorioDevolucoes && relatorioDevolucoes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{relatorioDevolucoes.titulo}</h2>
                  <p className="text-slate-300 mt-1">
                    {relatorioDevolucoes.empresa?.razao_social} | Competência: {relatorioDevolucoes.competencia}
                  </p>
                </div>
                <button 
                  onClick={() => setShowRelatorioDevolucoes(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Resumo */}
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-3xl font-bold">{relatorioDevolucoes.resumo?.total_pares || 0}</p>
                  <p className="text-xs text-slate-300">Pares de Notas</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">
                    R$ {(relatorioDevolucoes.resumo?.valor_total_devolucoes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-300">Total Devoluções</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">
                    R$ {(relatorioDevolucoes.resumo?.valor_total_originais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-300">Total Originais</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-3xl font-bold text-amber-400">{relatorioDevolucoes.resumo?.pares_sem_vinculo || 0}</p>
                  <p className="text-xs text-slate-300">Sem Vínculo</p>
                </div>
              </div>
            </div>
            
            {/* Descrição */}
            <div className="px-6 py-4 bg-slate-50 border-b">
              <p className="text-sm text-slate-600">{relatorioDevolucoes.descricao}</p>
            </div>
            
            {/* Lista de Pares */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {relatorioDevolucoes.pares?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhuma nota de devolução do fornecedor encontrada nesta competência.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {relatorioDevolucoes.pares?.map((par, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Cabeçalho do Par */}
                      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-gray-800">Fornecedor: </span>
                          <span className="text-gray-700">{par.fornecedor}</span>
                          <span className="text-gray-500 text-sm ml-2">({par.fornecedor_cnpj})</span>
                        </div>
                        {par.status_vinculo === 'nao_encontrada' && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            ⚠ Original não encontrada
                          </span>
                        )}
                      </div>
                      
                      {/* Grid com as duas notas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                        {/* Nota de Devolução */}
                        <div className="p-4 bg-red-50">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">DEVOLUÇÃO</span>
                            <span className="text-gray-600 text-sm">(Entrada)</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Número:</span>
                              <span className="font-semibold">{par.devolucao?.numero}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Data:</span>
                              <span className="font-semibold">{par.devolucao?.data}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Valor:</span>
                              <span className="font-bold text-red-700">
                                R$ {(par.devolucao?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">CFOPs:</span>
                              <span className="text-xs">{par.devolucao?.cfops?.join(', ')}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Nota Original */}
                        <div className={`p-4 ${par.nota_original?.tipo === 'NÃO ENCONTRADA' ? 'bg-amber-50' : 'bg-green-50'}`}>
                          {par.nota_original?.tipo === 'NÃO ENCONTRADA' ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded">NÃO ENCONTRADA</span>
                              </div>
                              <div className="p-3 bg-amber-100 rounded-lg">
                                <p className="text-amber-800 text-sm">
                                  {par.nota_original?.mensagem}
                                </p>
                                <p className="text-amber-700 text-xs mt-2 break-all">
                                  Chave: {par.nota_original?.chave}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">ORIGINAL</span>
                                <span className="text-gray-600 text-sm">(Saída)</span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Número:</span>
                                  <span className="font-semibold">{par.nota_original?.numero}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Data:</span>
                                  <span className="font-semibold">{par.nota_original?.data}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Valor:</span>
                                  <span className="font-bold text-green-700">
                                    R$ {(par.nota_original?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Destinatário:</span>
                                  <span className="text-xs truncate max-w-32">{par.nota_original?.destinatario}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer com botões de exportação */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Gerado em: {new Date(relatorioDevolucoes.data_geracao).toLocaleString('pt-BR')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarRelatorioDevolucoes('excel')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar Excel
                </button>
                <button
                  onClick={() => exportarRelatorioDevolucoes('word')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar Word
                </button>
                <button
                  onClick={() => setShowRelatorioDevolucoes(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Relatório de Notas Canceladas */}
      {showRelatorioCanceladas && relatorioCanceladas && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{relatorioCanceladas.titulo}</h2>
                  <p className="text-red-200 mt-1">
                    {relatorioCanceladas.empresa?.razao_social} | Competência: {relatorioCanceladas.competencia}
                  </p>
                </div>
                <button 
                  onClick={() => setShowRelatorioCanceladas(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Resumo */}
              <div className="grid grid-cols-5 gap-4 mt-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-3xl font-bold">{relatorioCanceladas.resumo?.total_notas || 0}</p>
                  <p className="text-xs text-red-200">Total Canceladas</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-300">{relatorioCanceladas.resumo?.total_entradas || 0}</p>
                  <p className="text-xs text-red-200">Entradas</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-300">{relatorioCanceladas.resumo?.total_saidas || 0}</p>
                  <p className="text-xs text-red-200">Saídas</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">
                    R$ {(relatorioCanceladas.resumo?.valor_total_entradas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-red-200">Valor Entradas</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">
                    R$ {(relatorioCanceladas.resumo?.valor_total_saidas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-red-200">Valor Saídas</p>
                </div>
              </div>
            </div>
            
            {/* Descrição */}
            <div className="px-6 py-4 bg-red-50 border-b">
              <p className="text-sm text-red-800">{relatorioCanceladas.descricao}</p>
            </div>
            
            {/* Lista de Notas */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {relatorioCanceladas.notas?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <XCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Nenhuma nota cancelada encontrada nesta competência.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatorioCanceladas.notas?.map((nota, idx) => (
                    <div 
                      key={idx} 
                      className={`border rounded-lg overflow-hidden ${
                        nota.tipo === 'ENTRADA' 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className={`px-4 py-2 flex items-center justify-between ${
                        nota.tipo === 'ENTRADA' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            nota.tipo === 'ENTRADA' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-green-600 text-white'
                          }`}>
                            {nota.tipo}
                          </span>
                          <span className="font-bold text-gray-800">NF-e {nota.numero}</span>
                          {nota.serie && <span className="text-gray-500 text-sm">Série {nota.serie}</span>}
                        </div>
                        <span className="font-bold text-red-700">
                          R$ {(nota.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 block">Data Emissão</span>
                          <span className="font-medium">{nota.data_emissao || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Data Cancelamento</span>
                          <span className="font-medium text-red-600">{nota.data_cancelamento || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">{nota.tipo === 'ENTRADA' ? 'Emitente' : 'Destinatário'}</span>
                          <span className="font-medium truncate block" title={nota.tipo === 'ENTRADA' ? nota.emitente : nota.destinatario}>
                            {(nota.tipo === 'ENTRADA' ? nota.emitente : nota.destinatario)?.substring(0, 25) || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Competência</span>
                          <span className="font-medium">{nota.competencia || '-'}</span>
                        </div>
                      </div>
                      
                      {nota.justificativa && (
                        <div className="px-4 py-2 bg-white/50 border-t">
                          <span className="text-gray-500 text-xs">Justificativa: </span>
                          <span className="text-gray-700 text-sm">{nota.justificativa}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer com botões de exportação */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Gerado em: {new Date(relatorioCanceladas.data_geracao).toLocaleString('pt-BR')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarRelatorioCanceladas('excel')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar Excel
                </button>
                <button
                  onClick={() => exportarRelatorioCanceladas('word')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar Word
                </button>
                <button
                  onClick={() => setShowRelatorioCanceladas(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Detalhamento */}
      {renderDocumentDetailModal()}
    </Layout>
  );
};

export default Documents;
