import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Search, AlertTriangle, CheckCircle, XCircle, 
  Plus, Trash2, Edit2, Save, X, 
  Package, RefreshCw, ArrowDown, ArrowUp,
  AlertCircle, Info, ChevronUp, ChevronDown, Download
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Tipos de regra pré-definidos com CSTs e alíquotas automáticas
const TIPOS_REGRA = {
  tributado: {
    label: 'Tributado (Padrão)',
    cst_entrada: '50',
    cst_saida: '01',
    aliquota_pis: 1.65,
    aliquota_cofins: 7.6,
    gera_credito: true,
    gera_debito: true,
    descricao_tipo: 'Tributação normal com alíquotas básicas'
  },
  tributado_presumido: {
    label: 'Tributado (Lucro Presumido)',
    cst_entrada: '70',
    cst_saida: '01',
    aliquota_pis: 0.65,
    aliquota_cofins: 3.0,
    gera_credito: false,
    gera_debito: true,
    descricao_tipo: 'Regime cumulativo - Lucro Presumido'
  },
  aliquota_zero: {
    label: 'Alíquota Zero',
    cst_entrada: '73',
    cst_saida: '06',
    aliquota_pis: 0,
    aliquota_cofins: 0,
    gera_credito: false,
    gera_debito: false,
    descricao_tipo: 'Produtos com alíquota zero (Lei 10.925/2004)'
  },
  monofasico: {
    label: 'Monofásico',
    cst_entrada: '70',
    cst_saida: '04',
    aliquota_pis: 0,
    aliquota_cofins: 0,
    gera_credito: false,
    gera_debito: false,
    descricao_tipo: 'Tributação concentrada na indústria'
  },
  aliquota_diferenciada: {
    label: 'Alíquota Diferenciada',
    cst_entrada: '51',
    cst_saida: '02',
    aliquota_pis: null, // Usuário define
    aliquota_cofins: null, // Usuário define
    gera_credito: true,
    gera_debito: true,
    descricao_tipo: 'Alíquota específica por NCM'
  },
  isento: {
    label: 'Isento',
    cst_entrada: '73',
    cst_saida: '08',
    aliquota_pis: 0,
    aliquota_cofins: 0,
    gera_credito: false,
    gera_debito: false,
    descricao_tipo: 'Operação isenta de PIS/COFINS'
  },
  suspensao: {
    label: 'Suspensão',
    cst_entrada: '70',
    cst_saida: '09',
    aliquota_pis: 0,
    aliquota_cofins: 0,
    gera_credito: false,
    gera_debito: false,
    descricao_tipo: 'Operação com suspensão'
  }
};

const ValidadorPisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [inicializando, setInicializando] = useState(false);
  const [dados, setDados] = useState(null);
  const [regras, setRegras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  
  // Ordenação
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Modal para edição/criação de regra
  const [modalRegra, setModalRegra] = useState(null);
  const [tipoRegraSelect, setTipoRegraSelect] = useState('tributado');
  const [novaRegra, setNovaRegra] = useState({
    tipo: 'ncm',
    chave: '',
    descricao: '',
    tipo_regra: 'tributado',
    aliquota_pis: 1.65,
    aliquota_cofins: 7.6,
    gera_credito: true,
    gera_debito: true,
    cst_esperado_entrada: '50',
    cst_esperado_saida: '01',
    base_legal: '',
    observacao: '',
    excecoes: []
  });
  const [novaExcecao, setNovaExcecao] = useState({ chave: '', descricao: '', cst_entrada: '', cst_saida: '', aliquota_pis: 0, aliquota_cofins: 0 });

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dadosRes, regrasRes] = await Promise.all([
        axios.get(`${API}/validador-pis-cofins/${selectedCompany.id}/dados?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/validador-pis-cofins/${selectedCompany.id}/regras`, { headers })
      ]);
      
      setDados(dadosRes.data);
      setRegras(regrasRes.data.regras || []);
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

  // Inicializar regras automaticamente
  const handleInicializarRegras = async () => {
    if (!window.confirm('Isso criará regras de PIS/COFINS automaticamente baseadas nos NCMs encontrados nos seus documentos e na legislação padrão. Deseja continuar?')) {
      return;
    }
    
    setInicializando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/validador-pis-cofins/${selectedCompany.id}/inicializar-regras?competencia=${encodeURIComponent(selectedCompetencia)}`,
        {},
        { headers }
      );
      
      alert(`${response.data.regras_criadas} regras foram criadas! Você pode editá-las abaixo.`);
      fetchData();
    } catch (err) {
      console.error('Erro ao inicializar regras:', err);
      alert('Erro ao inicializar regras: ' + (err.response?.data?.detail || err.message));
    } finally {
      setInicializando(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ok':
        return <span className="flex items-center gap-1 text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />OK</span>;
      case 'alerta':
        return <span className="flex items-center gap-1 text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />Alerta</span>;
      case 'divergente':
        return <span className="flex items-center gap-1 text-xs bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />Divergente</span>;
      default:
        return <span className="flex items-center gap-1 text-xs bg-gray-600/20 text-gray-400 px-2 py-0.5 rounded-full"><Info className="w-3 h-3" />Sem Regra</span>;
    }
  };

  // Quando seleciona o tipo de regra, preenche automaticamente os campos
  const handleTipoRegraChange = (tipo) => {
    setTipoRegraSelect(tipo);
    const config = TIPOS_REGRA[tipo];
    if (config) {
      setNovaRegra(prev => ({
        ...prev,
        tipo_regra: tipo,
        cst_esperado_entrada: config.cst_entrada,
        cst_esperado_saida: config.cst_saida,
        aliquota_pis: config.aliquota_pis !== null ? config.aliquota_pis : prev.aliquota_pis,
        aliquota_cofins: config.aliquota_cofins !== null ? config.aliquota_cofins : prev.aliquota_cofins,
        gera_credito: config.gera_credito,
        gera_debito: config.gera_debito
      }));
    }
  };

  const handleSalvarRegra = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (modalRegra?.id) {
        await axios.put(`${API}/validador-pis-cofins/${selectedCompany.id}/regras/${modalRegra.id}`, novaRegra, { headers });
      } else {
        await axios.post(`${API}/validador-pis-cofins/${selectedCompany.id}/regras`, novaRegra, { headers });
      }
      
      setModalRegra(null);
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar regra:', err);
      alert('Erro ao salvar regra');
    }
  };

  const handleExcluirRegra = async (regraId) => {
    if (!window.confirm('Deseja realmente excluir esta regra?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/validador-pis-cofins/${selectedCompany.id}/regras/${regraId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir regra:', err);
    }
  };

  const handleCriarRegraNcm = (item) => {
    // Determinar o tipo de regra baseado nos dados praticados
    let tipoInicial = 'tributado';
    if (item.aliquota_pis_praticada === 0 && item.aliquota_cofins_praticada === 0) {
      tipoInicial = 'aliquota_zero';
    }
    
    const config = TIPOS_REGRA[tipoInicial];
    setTipoRegraSelect(tipoInicial);
    setNovaRegra({
      tipo: 'ncm',
      chave: item.ncm,
      descricao: item.descricao || `NCM ${item.ncm}`,
      tipo_regra: tipoInicial,
      aliquota_pis: item.aliquota_pis_praticada || config.aliquota_pis || 1.65,
      aliquota_cofins: item.aliquota_cofins_praticada || config.aliquota_cofins || 7.6,
      gera_credito: config.gera_credito,
      gera_debito: config.gera_debito,
      cst_esperado_entrada: config.cst_entrada,
      cst_esperado_saida: config.cst_saida,
      base_legal: '',
      observacao: '',
      excecoes: []
    });
    setModalRegra({});
  };

  // Adicionar exceção
  const handleAdicionarExcecao = () => {
    if (!novaExcecao.chave) return;
    setNovaRegra(prev => ({
      ...prev,
      excecoes: [...(prev.excecoes || []), { ...novaExcecao }]
    }));
    setNovaExcecao({ chave: '', descricao: '', cst_entrada: '', cst_saida: '', aliquota_pis: 0, aliquota_cofins: 0 });
  };

  const handleRemoverExcecao = (index) => {
    setNovaRegra(prev => ({
      ...prev,
      excecoes: prev.excecoes.filter((_, i) => i !== index)
    }));
  };

  // Ordenação
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-[#C8A951]" /> 
      : <ChevronDown className="w-3 h-3 text-[#C8A951]" />;
  };

  // Seção de CFOPs de Exceção
  const SecaoCfopsExcecao = () => {
    const cfopsEntrada = dados?.cfops_excecao?.entradas || [];
    const cfopsSaida = dados?.cfops_excecao?.saidas || [];
    const stats = dados?.cfops_excecao?.estatisticas || {};

    if (cfopsEntrada.length === 0 && cfopsSaida.length === 0) {
      return null;
    }

    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            CFOPs de Exceção (Não geram crédito/débito)
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400">{stats.ok || 0} OK</span>
            <span className="text-red-400">{stats.divergentes || 0} Divergentes</span>
          </div>
        </div>
        
        <p className="text-[#A1A1AA] text-sm mb-4">
          Itens em CFOPs abaixo devem ter CST 70/98 (entradas) ou 49/99 (saídas) - sem crédito/débito.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Entradas */}
          {cfopsEntrada.length > 0 && (
            <div>
              <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <ArrowDown className="w-4 h-4" />
                Entradas - Sem Crédito ({cfopsEntrada.length})
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cfopsEntrada.map((cfop, idx) => (
                  <div 
                    key={idx} 
                    className={`bg-[#0C0C0C] rounded-lg p-3 ${cfop.status === 'divergente' ? 'border border-red-500/30' : 'border border-[#2A2A2A]'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[#C8A951] font-semibold">{cfop.cfop}</span>
                      {getStatusBadge(cfop.status)}
                    </div>
                    <p className="text-sm text-[#A1A1AA] mb-2">{cfop.descricao}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#666]">{cfop.quantidade} itens</span>
                      <span className="text-white">{formatCurrency(cfop.valor_total)}</span>
                    </div>
                    {cfop.status === 'divergente' && (
                      <div className="mt-2 text-xs text-red-400">
                        CST esperado: {cfop.cst_esperado} | Encontrado: {cfop.cst_mais_comum || 'N/A'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saídas */}
          {cfopsSaida.length > 0 && (
            <div>
              <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                <ArrowUp className="w-4 h-4" />
                Saídas - Sem Débito ({cfopsSaida.length})
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cfopsSaida.map((cfop, idx) => (
                  <div 
                    key={idx} 
                    className={`bg-[#0C0C0C] rounded-lg p-3 ${cfop.status === 'divergente' ? 'border border-red-500/30' : 'border border-[#2A2A2A]'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[#C8A951] font-semibold">{cfop.cfop}</span>
                      {getStatusBadge(cfop.status)}
                    </div>
                    <p className="text-sm text-[#A1A1AA] mb-2">{cfop.descricao}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#666]">{cfop.quantidade} itens</span>
                      <span className="text-white">{formatCurrency(cfop.valor_total)}</span>
                    </div>
                    {cfop.status === 'divergente' && (
                      <div className="mt-2 text-xs text-red-400">
                        CST esperado: {cfop.cst_esperado} | Encontrado: {cfop.cst_mais_comum || 'N/A'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Seção de NCMs com Regras
  const SecaoNcms = () => {
    const ncmsLista = dados?.ncms?.lista || [];
    const stats = dados?.ncms?.estatisticas || {};

    // Filtrar
    let ncmsFiltrados = ncmsLista.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.ncm.includes(searchTerm) || 
        item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.produtos_exemplo?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
      return matchSearch && matchStatus;
    });

    // Ordenar
    if (sortConfig.key) {
      ncmsFiltrados = [...ncmsFiltrados].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Tratar valores numéricos
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Tratar strings
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aVal.localeCompare(bVal);
        }
        return bVal.localeCompare(aVal);
      });
    }

    // Componente de contador clicável
    const ContadorFiltro = ({ valor, label, status, cor, corBg, corBorder }) => {
      const isAtivo = filtroStatus === status;
      return (
        <button
          onClick={() => setFiltroStatus(isAtivo ? 'todos' : status)}
          className={`${corBg} ${corBorder} rounded-xl p-4 text-center transition-all cursor-pointer hover:scale-105 ${
            isAtivo ? 'ring-2 ring-offset-2 ring-offset-[#0C0C0C] ring-' + cor.replace('text-', '') : ''
          }`}
          data-testid={`filter-${status}`}
        >
          <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
          <p className={`text-sm ${cor.replace('400', '400/70')}`}>{label}</p>
          {isAtivo && <p className="text-xs mt-1 text-white">Clique para limpar</p>}
        </button>
      );
    };

    return (
      <div>
        {/* Estatísticas - Botões de Filtro */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setFiltroStatus(filtroStatus === 'todos' ? 'todos' : 'todos')}
            className={`bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center transition-all cursor-pointer hover:scale-105 ${
              filtroStatus === 'todos' ? 'ring-2 ring-offset-2 ring-offset-[#0C0C0C] ring-white' : ''
            }`}
            data-testid="filter-todos"
          >
            <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
            <p className="text-sm text-[#A1A1AA]">Total NCMs</p>
          </button>
          <ContadorFiltro 
            valor={stats.ok || 0} 
            label="OK" 
            status="ok"
            cor="text-green-400"
            corBg="bg-green-600/10"
            corBorder="border border-green-600/30"
          />
          <ContadorFiltro 
            valor={stats.alerta || 0} 
            label="Alerta" 
            status="alerta"
            cor="text-yellow-400"
            corBg="bg-yellow-600/10"
            corBorder="border border-yellow-600/30"
          />
          <ContadorFiltro 
            valor={stats.divergentes || 0} 
            label="Divergente" 
            status="divergente"
            cor="text-red-400"
            corBg="bg-red-600/10"
            corBorder="border border-red-600/30"
          />
          <ContadorFiltro 
            valor={stats.sem_regra || 0} 
            label="Sem Regra" 
            status="sem_regra"
            cor="text-gray-400"
            corBg="bg-gray-600/10"
            corBorder="border border-gray-600/30"
          />
        </div>

        {/* Header da seção */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-[#C8A951]" />
            Regras por NCM (CFOPs Normais)
            {filtroStatus !== 'todos' && (
              <span className="ml-2 text-xs bg-[#C8A951]/20 text-[#C8A951] px-2 py-0.5 rounded">
                Filtrado: {filtroStatus.replace('_', ' ')}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleInicializarRegras}
              disabled={inicializando || loading}
              className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] text-white px-4 py-2 rounded-lg hover:bg-[#1A1A1A] disabled:opacity-50"
            >
              {inicializando ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Pré-carregar Regras
            </button>
            <button
              onClick={() => {
                setTipoRegraSelect('tributado');
                const config = TIPOS_REGRA['tributado'];
                setNovaRegra({
                  tipo: 'ncm',
                  chave: '',
                  descricao: '',
                  tipo_regra: 'tributado',
                  aliquota_pis: config.aliquota_pis,
                  aliquota_cofins: config.aliquota_cofins,
                  gera_credito: config.gera_credito,
                  gera_debito: config.gera_debito,
                  cst_esperado_entrada: config.cst_entrada,
                  cst_esperado_saida: config.cst_saida,
                  base_legal: '',
                  observacao: '',
                  excecoes: []
                });
                setModalRegra({});
              }}
              className="flex items-center gap-2 bg-[#C8A951] text-black px-4 py-2 rounded-lg hover:bg-[#B89841] font-medium"
            >
              <Plus className="w-4 h-4" />
              Nova Regra
            </button>
          </div>
        </div>

        <p className="text-[#A1A1AA] text-sm mb-4">
          Produtos em CFOPs normais (não exceção) usam as regras abaixo para determinar alíquotas e CST. Clique nos cabeçalhos para ordenar.
        </p>

        {/* Tabela de NCMs */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th 
                    className="text-left py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('ncm')}
                  >
                    <div className="flex items-center gap-1">NCM {getSortIcon('ncm')}</div>
                  </th>
                  <th 
                    className="text-left py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('descricao')}
                  >
                    <div className="flex items-center gap-1">Descrição/Exemplos {getSortIcon('descricao')}</div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('entradas')}
                  >
                    <div className="flex items-center justify-end gap-1">E/S {getSortIcon('entradas')}</div>
                  </th>
                  <th 
                    className="text-right py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('valor_total')}
                  >
                    <div className="flex items-center justify-end gap-1">Valor {getSortIcon('valor_total')}</div>
                  </th>
                  <th 
                    className="text-center py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('aliquota_pis_praticada')}
                  >
                    <div className="flex items-center justify-center gap-1">PIS {getSortIcon('aliquota_pis_praticada')}</div>
                  </th>
                  <th 
                    className="text-center py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('aliquota_cofins_praticada')}
                  >
                    <div className="flex items-center justify-center gap-1">COFINS {getSortIcon('aliquota_cofins_praticada')}</div>
                  </th>
                  <th 
                    className="text-center py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('cst_praticado')}
                  >
                    <div className="flex items-center justify-center gap-1">CST {getSortIcon('cst_praticado')}</div>
                  </th>
                  <th 
                    className="text-center py-3 px-4 text-[#A1A1AA] cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1">Status {getSortIcon('status')}</div>
                  </th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ncmsFiltrados.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] ${
                      item.status === 'divergente' ? 'bg-red-900/10' : 
                      item.status === 'alerta' ? 'bg-yellow-900/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-[#C8A951] font-semibold">{item.ncm}</td>
                    <td className="py-3 px-4">
                      <div className="max-w-[200px]">
                        {item.descricao && <p className="text-white text-xs font-medium">{item.descricao}</p>}
                        {item.produtos_exemplo?.slice(0, 2).map((p, i) => (
                          <p key={i} className="text-[#A1A1AA] text-xs truncate">{p}</p>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[#A1A1AA]">
                      <span className="text-green-400">{item.entradas}</span>/<span className="text-red-400">{item.saidas}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_total)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-white">{item.aliquota_pis_praticada}%</span>
                        {item.aliquota_pis_esperada !== null && (
                          <span className={`text-xs ${
                            Math.abs(item.aliquota_pis_praticada - item.aliquota_pis_esperada) <= 0.1 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            (esp: {item.aliquota_pis_esperada}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-white">{item.aliquota_cofins_praticada}%</span>
                        {item.aliquota_cofins_esperada !== null && (
                          <span className={`text-xs ${
                            Math.abs(item.aliquota_cofins_praticada - item.aliquota_cofins_esperada) <= 0.1 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            (esp: {item.aliquota_cofins_esperada}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[#A1A1AA]">{item.cst_praticado || '-'}</span>
                        {item.cst_esperado && (
                          <span className="text-xs text-blue-400">(esp: {item.cst_esperado})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.regra_id ? (
                          <button
                            onClick={() => {
                              const regra = regras.find(r => r.id === item.regra_id);
                              if (regra) {
                                setTipoRegraSelect(regra.tipo_regra || 'tributado');
                                setNovaRegra({
                                  tipo: regra.tipo,
                                  chave: regra.chave,
                                  descricao: regra.descricao,
                                  tipo_regra: regra.tipo_regra || 'tributado',
                                  aliquota_pis: regra.aliquota_pis,
                                  aliquota_cofins: regra.aliquota_cofins,
                                  gera_credito: regra.gera_credito,
                                  gera_debito: regra.gera_debito,
                                  cst_esperado_entrada: regra.cst_esperado_entrada || '',
                                  cst_esperado_saida: regra.cst_esperado_saida || '',
                                  base_legal: regra.base_legal || '',
                                  observacao: regra.observacao || '',
                                  excecoes: regra.excecoes || []
                                });
                                setModalRegra(regra);
                              }
                            }}
                            className="text-blue-400 hover:text-blue-300"
                            title="Editar regra"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCriarRegraNcm(item)}
                            className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30"
                          >
                            + Regra
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {ncmsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-[#666]">
                      {filtroStatus !== 'todos' 
                        ? `Nenhum NCM encontrado com status "${filtroStatus.replace('_', ' ')}"` 
                        : 'Nenhum NCM encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Regras configuradas */}
        {regras.length > 0 && (
          <div className="mt-6">
            <h4 className="text-white font-semibold mb-3">Regras Personalizadas da Empresa ({regras.length})</h4>
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0C0C0C]">
                  <tr>
                    <th className="text-left py-3 px-4 text-[#A1A1AA]">NCM</th>
                    <th className="text-left py-3 px-4 text-[#A1A1AA]">Descrição</th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA]">Tipo</th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA]">PIS</th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA]">COFINS</th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA]">CST E/S</th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA]">Exceções</th>
                    <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {regras.map((regra, idx) => (
                    <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                      <td className="py-3 px-4 font-mono text-[#C8A951]">{regra.chave}</td>
                      <td className="py-3 px-4 text-white max-w-[200px] truncate">{regra.descricao}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">
                          {TIPOS_REGRA[regra.tipo_regra]?.label || 'Tributado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-white">{regra.aliquota_pis}%</td>
                      <td className="py-3 px-4 text-center text-white">{regra.aliquota_cofins}%</td>
                      <td className="py-3 px-4 text-center text-[#A1A1AA]">
                        {regra.cst_esperado_entrada || '-'}/{regra.cst_esperado_saida || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {regra.excecoes?.length > 0 ? (
                          <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded">
                            {regra.excecoes.length} exceção(ões)
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setTipoRegraSelect(regra.tipo_regra || 'tributado');
                              setNovaRegra({
                                tipo: regra.tipo,
                                chave: regra.chave,
                                descricao: regra.descricao,
                                tipo_regra: regra.tipo_regra || 'tributado',
                                aliquota_pis: regra.aliquota_pis,
                                aliquota_cofins: regra.aliquota_cofins,
                                gera_credito: regra.gera_credito,
                                gera_debito: regra.gera_debito,
                                cst_esperado_entrada: regra.cst_esperado_entrada || '',
                                cst_esperado_saida: regra.cst_esperado_saida || '',
                                base_legal: regra.base_legal || '',
                                observacao: regra.observacao || '',
                                excecoes: regra.excecoes || []
                              });
                              setModalRegra(regra);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExcluirRegra(regra.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Modal de Regra
  const ModalRegra = () => {
    if (modalRegra === null) return null;
    
    const tipoConfig = TIPOS_REGRA[tipoRegraSelect];
    const isAliquotaDiferenciada = tipoRegraSelect === 'aliquota_diferenciada';
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">
              {modalRegra.id ? 'Editar Regra' : 'Nova Regra de PIS/COFINS'}
            </h3>
            <button onClick={() => setModalRegra(null)} className="text-[#A1A1AA] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Tipo de Regra - SELECT PRINCIPAL */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1 font-semibold">
                Tipo de Tributação *
              </label>
              <select
                value={tipoRegraSelect}
                onChange={(e) => handleTipoRegraChange(e.target.value)}
                className="w-full bg-[#0C0C0C] border border-[#C8A951] rounded-lg px-3 py-3 text-white font-medium"
              >
                {Object.entries(TIPOS_REGRA).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              {tipoConfig && (
                <p className="text-xs text-[#A1A1AA] mt-1">{tipoConfig.descricao_tipo}</p>
              )}
            </div>

            {/* Preview do CST e Alíquotas selecionados */}
            <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-3">
              <p className="text-xs text-[#A1A1AA] mb-2">Configuração automática:</p>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[#666] text-xs">CST Entrada</p>
                  <p className="text-white font-mono font-semibold">{novaRegra.cst_esperado_entrada || '-'}</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">CST Saída</p>
                  <p className="text-white font-mono font-semibold">{novaRegra.cst_esperado_saida || '-'}</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">PIS</p>
                  <p className="text-white font-semibold">{novaRegra.aliquota_pis}%</p>
                </div>
                <div>
                  <p className="text-[#666] text-xs">COFINS</p>
                  <p className="text-white font-semibold">{novaRegra.aliquota_cofins}%</p>
                </div>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs">
                <span className={novaRegra.gera_credito ? 'text-green-400' : 'text-gray-500'}>
                  {novaRegra.gera_credito ? '✓ Gera Crédito' : '✗ Não gera crédito'}
                </span>
                <span className={novaRegra.gera_debito ? 'text-green-400' : 'text-gray-500'}>
                  {novaRegra.gera_debito ? '✓ Gera Débito' : '✗ Não gera débito'}
                </span>
              </div>
            </div>
            
            {/* NCM */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">
                NCM (pode ser prefixo - ex: 1905 para todos os pães)
              </label>
              <input
                type="text"
                value={novaRegra.chave}
                onChange={(e) => setNovaRegra({...novaRegra, chave: e.target.value})}
                placeholder="Ex: 1905 ou 19059090"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            {/* Descrição */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Descrição</label>
              <input
                type="text"
                value={novaRegra.descricao}
                onChange={(e) => setNovaRegra({...novaRegra, descricao: e.target.value})}
                placeholder="Ex: Pães e produtos de padaria"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            {/* Alíquotas - Apenas se for Alíquota Diferenciada */}
            {isAliquotaDiferenciada && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Alíquota PIS (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquota_pis}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_pis: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Alíquota COFINS (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquota_cofins}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_cofins: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}
            
            {/* Base Legal */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Base Legal</label>
              <input
                type="text"
                value={novaRegra.base_legal}
                onChange={(e) => setNovaRegra({...novaRegra, base_legal: e.target.value})}
                placeholder="Ex: Lei 10.925/2004 Art. 1"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>

            {/* EXCEÇÕES */}
            <div className="border border-[#2A2A2A] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Exceções (produtos que NÃO seguem esta regra)
              </h4>
              <p className="text-xs text-[#A1A1AA] mb-3">
                Adicione palavras-chave de produtos que devem ter tratamento diferente dentro deste NCM.
              </p>
              
              {/* Lista de exceções existentes */}
              {novaRegra.excecoes?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {novaRegra.excecoes.map((exc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#0C0C0C] rounded p-2">
                      <div>
                        <span className="text-orange-400 font-medium">{exc.chave}</span>
                        {exc.descricao && <span className="text-[#A1A1AA] text-xs ml-2">({exc.descricao})</span>}
                        <span className="text-xs text-[#666] ml-2">
                          → CST {exc.cst_entrada}/{exc.cst_saida} | PIS {exc.aliquota_pis}% | COFINS {exc.aliquota_cofins}%
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRemoverExcecao(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Form para nova exceção */}
              <div className="grid grid-cols-6 gap-2">
                <input
                  type="text"
                  value={novaExcecao.chave}
                  onChange={(e) => setNovaExcecao({...novaExcecao, chave: e.target.value})}
                  placeholder="Palavra-chave (ex: CACHACA)"
                  className="col-span-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="text"
                  value={novaExcecao.cst_entrada}
                  onChange={(e) => setNovaExcecao({...novaExcecao, cst_entrada: e.target.value})}
                  placeholder="CST Ent"
                  className="bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="text"
                  value={novaExcecao.cst_saida}
                  onChange={(e) => setNovaExcecao({...novaExcecao, cst_saida: e.target.value})}
                  placeholder="CST Saí"
                  className="bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={novaExcecao.aliquota_pis}
                  onChange={(e) => setNovaExcecao({...novaExcecao, aliquota_pis: parseFloat(e.target.value) || 0})}
                  placeholder="PIS %"
                  className="bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-sm"
                />
                <button
                  onClick={handleAdicionarExcecao}
                  className="bg-orange-600 text-white rounded px-2 py-1 text-sm hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Observação */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Observação</label>
              <textarea
                value={novaRegra.observacao}
                onChange={(e) => setNovaRegra({...novaRegra, observacao: e.target.value})}
                placeholder="Observações adicionais..."
                rows={2}
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white resize-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-4 border-t border-[#2A2A2A]">
            <button
              onClick={() => setModalRegra(null)}
              className="px-4 py-2 text-[#A1A1AA] hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvarRegra}
              className="flex items-center gap-2 bg-[#C8A951] text-black px-4 py-2 rounded-lg hover:bg-[#B89841] font-medium"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Validador de PIS/COFINS</h1>
            <p className="text-[#A1A1AA] text-sm">
              Audite as alíquotas e CSTs dos itens - CFOPs exceção tratados automaticamente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] text-white px-4 py-2 rounded-lg hover:bg-[#1A1A1A]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Buscar por NCM, descrição ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white placeholder-[#666]"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
          >
            <option value="todos">Todos os Status</option>
            <option value="ok">OK</option>
            <option value="alerta">Alerta</option>
            <option value="divergente">Divergente</option>
            <option value="sem_regra">Sem Regra</option>
          </select>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C8A951]" />
          </div>
        ) : (
          <>
            {/* CFOPs de Exceção no topo */}
            <SecaoCfopsExcecao />
            
            {/* NCMs abaixo */}
            <SecaoNcms />
          </>
        )}

        {/* Modal */}
        <ModalRegra />
      </div>
    </Layout>
  );
};

export default ValidadorPisCofins;
