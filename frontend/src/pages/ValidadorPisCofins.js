import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Search, AlertTriangle, CheckCircle, XCircle, 
  Plus, Trash2, Edit2, Save, X, 
  Package, RefreshCw, ArrowDown, ArrowUp,
  AlertCircle, Info, ChevronUp, ChevronDown, Download,
  List, Settings
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
    aliquota_pis: null,
    aliquota_cofins: null,
    gera_credito: true,
    gera_debito: true,
    descricao_tipo: 'Alíquota específica por NCM'
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
  
  // Abas: 'ncms' ou 'regras'
  const [activeTab, setActiveTab] = useState('ncms');
  
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
      
      alert(`${response.data.regras_criadas} regras foram criadas! Você pode editá-las na aba "Regras".`);
      fetchData();
      setActiveTab('regras');
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

  // Estado para aplicação de regras (Rever CST)
  const [aplicandoRegras, setAplicandoRegras] = useState(false);

  const handleAplicarRegras = async (tipoOperacao) => {
    const msgConfirm = tipoOperacao === 'entrada' 
      ? 'Isso aplicará as regras de PIS/COFINS nos CSTs de ENTRADA de todos os documentos. Deseja continuar?'
      : tipoOperacao === 'saida'
      ? 'Isso aplicará as regras de PIS/COFINS nos CSTs de SAÍDA de todos os documentos. Deseja continuar?'
      : 'Isso aplicará as regras de PIS/COFINS nos CSTs de ENTRADA e SAÍDA de todos os documentos. Deseja continuar?';
    
    if (!window.confirm(msgConfirm)) return;
    
    setAplicandoRegras(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/validador-pis-cofins/${selectedCompany.id}/aplicar-regras?competencia=${encodeURIComponent(selectedCompetencia)}&tipo_operacao=${tipoOperacao}`,
        {},
        { headers }
      );
      
      const { total_processados, total_alterados, novas_regras_criadas } = response.data;
      
      let mensagem = `Processamento concluído!\n\n`;
      mensagem += `• ${total_processados} produtos analisados\n`;
      mensagem += `• ${total_alterados} CSTs atualizados\n`;
      
      if (novas_regras_criadas > 0) {
        mensagem += `\n${novas_regras_criadas} novas regras foram criadas automaticamente e estão disponíveis na aba "Regras" para auditoria.`;
      }
      
      alert(mensagem);
      fetchData();
    } catch (err) {
      console.error('Erro ao aplicar regras:', err);
      alert('Erro ao aplicar regras: ' + (err.response?.data?.detail || err.message));
    } finally {
      setAplicandoRegras(false);
    }
  };

  // Salvar regra diretamente ao editar um NCM na listagem
  const handleSalvarRegraRapida = async (ncm, tipoRegra, descricao) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(
        `${API}/validador-pis-cofins/${selectedCompany.id}/criar-regra-ncm`,
        {
          ncm,
          tipo_regra: tipoRegra,
          descricao
        },
        { headers }
      );
      
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar regra:', err);
    }
  };

  const handleCriarRegraNcm = (item) => {
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

  // CFOPs de Exceção - Compacto (uma linha por CFOP)
  const SecaoCfopsExcecao = () => {
    const cfopsEntrada = dados?.cfops_excecao?.entradas || [];
    const cfopsSaida = dados?.cfops_excecao?.saidas || [];
    const stats = dados?.cfops_excecao?.estatisticas || {};

    if (cfopsEntrada.length === 0 && cfopsSaida.length === 0) {
      return null;
    }

    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            CFOPs de Exceção (sem crédito/débito)
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-400">{stats.ok || 0} OK</span>
            <span className="text-red-400">{stats.divergentes || 0} Diverg.</span>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-3">
          {/* Entradas - CST fixo 98 */}
          <div>
            <p className="text-xs text-green-400 mb-1 flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              Entradas (CST 98 esperado) - {cfopsEntrada.length} CFOPs
            </p>
            <div className="flex flex-wrap gap-1">
              {cfopsEntrada.map((cfop, idx) => (
                <span 
                  key={idx}
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    cfop.status === 'ok' 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-red-600/20 text-red-400'
                  }`}
                  title={`${cfop.descricao} | ${cfop.quantidade} itens | ${formatCurrency(cfop.valor_total)}`}
                >
                  {cfop.cfop}
                </span>
              ))}
            </div>
          </div>

          {/* Saídas - CST fixo 49 */}
          <div>
            <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              Saídas (CST 49 esperado) - {cfopsSaida.length} CFOPs
            </p>
            <div className="flex flex-wrap gap-1">
              {cfopsSaida.map((cfop, idx) => (
                <span 
                  key={idx}
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    cfop.status === 'ok' 
                      ? 'bg-green-600/20 text-green-400' 
                      : 'bg-red-600/20 text-red-400'
                  }`}
                  title={`${cfop.descricao} | ${cfop.quantidade} itens | ${formatCurrency(cfop.valor_total)}`}
                >
                  {cfop.cfop}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Seção de NCMs (apenas produtos em CFOPs normais)
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
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aVal.localeCompare(bVal);
        }
        return bVal.localeCompare(aVal);
      });
    }

    const ContadorFiltro = ({ valor, label, status, cor, corBg, corBorder }) => {
      const isAtivo = filtroStatus === status;
      return (
        <button
          onClick={() => setFiltroStatus(isAtivo ? 'todos' : status)}
          className={`${corBg} ${corBorder} rounded-lg p-3 text-center transition-all cursor-pointer hover:scale-105 ${
            isAtivo ? 'ring-2 ring-offset-1 ring-offset-[#0C0C0C]' : ''
          }`}
          data-testid={`filter-${status}`}
        >
          <p className={`text-xl font-bold ${cor}`}>{valor}</p>
          <p className={`text-xs ${cor.replace('400', '400/70')}`}>{label}</p>
        </button>
      );
    };

    return (
      <div>
        {/* Estatísticas - Botões de Filtro */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`bg-[#141414] border border-[#2A2A2A] rounded-lg p-3 text-center transition-all cursor-pointer hover:scale-105 ${
              filtroStatus === 'todos' ? 'ring-2 ring-offset-1 ring-offset-[#0C0C0C] ring-white' : ''
            }`}
            data-testid="filter-todos"
          >
            <p className="text-xl font-bold text-white">{stats.total || 0}</p>
            <p className="text-xs text-[#A1A1AA]">Total</p>
          </button>
          <ContadorFiltro valor={stats.ok || 0} label="OK" status="ok" cor="text-green-400" corBg="bg-green-600/10" corBorder="border border-green-600/30" />
          <ContadorFiltro valor={stats.alerta || 0} label="Alerta" status="alerta" cor="text-yellow-400" corBg="bg-yellow-600/10" corBorder="border border-yellow-600/30" />
          <ContadorFiltro valor={stats.divergentes || 0} label="Diverg." status="divergente" cor="text-red-400" corBg="bg-red-600/10" corBorder="border border-red-600/30" />
          <ContadorFiltro valor={stats.sem_regra || 0} label="S/ Regra" status="sem_regra" cor="text-gray-400" corBg="bg-gray-600/10" corBorder="border border-gray-600/30" />
        </div>

        {/* Tabela de NCMs */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSort('ncm')}>
                    <div className="flex items-center gap-1">NCM {getSortIcon('ncm')}</div>
                  </th>
                  <th className="text-left py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSort('descricao')}>
                    <div className="flex items-center gap-1">Descrição {getSortIcon('descricao')}</div>
                  </th>
                  <th className="text-center py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSort('entradas')}>
                    <div className="flex items-center justify-center gap-1">E/S {getSortIcon('entradas')}</div>
                  </th>
                  <th className="text-right py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSort('valor_total')}>
                    <div className="flex items-center justify-end gap-1">Valor {getSortIcon('valor_total')}</div>
                  </th>
                  <th className="text-center py-2 px-3 text-[#A1A1AA]">PIS</th>
                  <th className="text-center py-2 px-3 text-[#A1A1AA]">COFINS</th>
                  <th className="text-center py-2 px-3 text-[#A1A1AA]">CST E/S</th>
                  <th className="text-center py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center gap-1">Status {getSortIcon('status')}</div>
                  </th>
                  <th className="text-center py-2 px-3 text-[#A1A1AA]">Ações</th>
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
                    <td className="py-2 px-3 font-mono text-[#C8A951] font-semibold text-xs">{item.ncm}</td>
                    <td className="py-2 px-3">
                      <div className="max-w-[180px]">
                        {item.descricao && <p className="text-white text-xs font-medium truncate">{item.descricao}</p>}
                        {item.produtos_exemplo?.slice(0, 1).map((p, i) => (
                          <p key={i} className="text-[#666] text-xs truncate">{p}</p>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-xs">
                      <span className="text-green-400">{item.entradas}</span>/<span className="text-red-400">{item.saidas}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-white text-xs">{formatCurrency(item.valor_total)}</td>
                    <td className="py-2 px-3 text-center text-xs">
                      <span className="text-white">{item.aliquota_pis_praticada}%</span>
                      {item.aliquota_pis_esperada !== null && item.aliquota_pis_esperada !== undefined && (
                        <span className={`block text-[10px] ${
                          Math.abs(item.aliquota_pis_praticada - item.aliquota_pis_esperada) <= 0.1 ? 'text-green-400' : 'text-red-400'
                        }`}>esp: {item.aliquota_pis_esperada}%</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-xs">
                      <span className="text-white">{item.aliquota_cofins_praticada}%</span>
                      {item.aliquota_cofins_esperada !== null && item.aliquota_cofins_esperada !== undefined && (
                        <span className={`block text-[10px] ${
                          Math.abs(item.aliquota_cofins_praticada - item.aliquota_cofins_esperada) <= 0.1 ? 'text-green-400' : 'text-red-400'
                        }`}>esp: {item.aliquota_cofins_esperada}%</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-xs">
                      <span className="text-[#A1A1AA]">{item.cst_praticado_entrada || '-'}/{item.cst_praticado || '-'}</span>
                      {(item.cst_esperado_entrada || item.cst_esperado) && (
                        <span className="block text-[10px] text-blue-400">esp: {item.cst_esperado_entrada || '-'}/{item.cst_esperado || '-'}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">{getStatusBadge(item.status)}</td>
                    <td className="py-2 px-3 text-center">
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
                          className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-600/30"
                        >
                          + Regra
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {ncmsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-6 text-center text-[#666] text-sm">
                      {filtroStatus !== 'todos' ? `Nenhum NCM com status "${filtroStatus}"` : 'Nenhum NCM encontrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Aba de Regras separada
  const [sortRegras, setSortRegras] = useState({ key: 'tipo_regra', direction: 'asc' });
  const [filtroTipoRegra, setFiltroTipoRegra] = useState('todos');
  
  const handleSortRegras = (key) => {
    setSortRegras(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIconRegras = (key) => {
    if (sortRegras.key !== key) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortRegras.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-[#C8A951]" /> 
      : <ChevronDown className="w-3 h-3 text-[#C8A951]" />;
  };

  // Ordem dos tipos para classificação
  const ORDEM_TIPOS = {
    'aliquota_zero': 1,
    'monofasico': 2,
    'aliquota_diferenciada': 3,
    'tributado': 4,
    'tributado_presumido': 5
  };

  const SecaoRegras = () => {
    // Contar regras por tipo
    const contagemPorTipo = {};
    regras.forEach(r => {
      const tipo = r.tipo_regra || 'tributado';
      contagemPorTipo[tipo] = (contagemPorTipo[tipo] || 0) + 1;
    });

    // Expandir regras com exceções
    let regrasExpandidas = [];
    regras.forEach(regra => {
      regrasExpandidas.push({ ...regra, isExcecao: false });
      if (regra.excecoes?.length > 0) {
        regra.excecoes.forEach((exc, idx) => {
          regrasExpandidas.push({
            id: `${regra.id}_exc_${idx}`,
            parent_id: regra.id,
            parent_chave: regra.chave,
            parent_descricao: regra.descricao,
            tipo_regra: regra.tipo_regra,
            tipo: 'excecao',
            chave: exc.chave,
            descricao: exc.descricao || `Exceção: ${exc.chave}`,
            cst_esperado_entrada: exc.cst_entrada,
            cst_esperado_saida: exc.cst_saida,
            aliquota_pis: exc.aliquota_pis,
            aliquota_cofins: exc.aliquota_cofins,
            isExcecao: true,
            excecaoIndex: idx
          });
        });
      }
    });

    // Filtrar por tipo
    if (filtroTipoRegra !== 'todos') {
      regrasExpandidas = regrasExpandidas.filter(r => r.tipo_regra === filtroTipoRegra);
    }

    // Ordenar
    regrasExpandidas = [...regrasExpandidas].sort((a, b) => {
      // Manter exceções logo após sua regra pai
      if (a.isExcecao && !b.isExcecao && a.parent_id === b.id) return 1;
      if (b.isExcecao && !a.isExcecao && b.parent_id === a.id) return -1;
      
      let aVal, bVal;
      
      if (sortRegras.key === 'tipo_regra') {
        aVal = ORDEM_TIPOS[a.tipo_regra] || 99;
        bVal = ORDEM_TIPOS[b.tipo_regra] || 99;
      } else if (sortRegras.key === 'aliquota_pis' || sortRegras.key === 'aliquota_cofins') {
        aVal = a[sortRegras.key] || 0;
        bVal = b[sortRegras.key] || 0;
      } else {
        aVal = String(a[sortRegras.key] || '').toLowerCase();
        bVal = String(b[sortRegras.key] || '').toLowerCase();
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortRegras.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (sortRegras.direction === 'asc') {
        return String(aVal).localeCompare(String(bVal));
      }
      return String(bVal).localeCompare(String(aVal));
    });

    // Badges de filtro por tipo
    const TipoFiltro = ({ tipo, label, cor }) => {
      const count = contagemPorTipo[tipo] || 0;
      const isAtivo = filtroTipoRegra === tipo;
      return (
        <button
          onClick={() => setFiltroTipoRegra(isAtivo ? 'todos' : tipo)}
          className={`text-xs px-2 py-1 rounded transition-all ${
            isAtivo 
              ? `${cor} ring-1 ring-offset-1 ring-offset-[#0C0C0C]` 
              : 'bg-[#1A1A1A] text-[#A1A1AA] hover:bg-[#2A2A2A]'
          }`}
        >
          {label} ({count})
        </button>
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Regras Configuradas ({regras.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleInicializarRegras} disabled={inicializando || loading}
              className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] text-white px-3 py-1.5 rounded-lg hover:bg-[#1A1A1A] disabled:opacity-50 text-xs">
              {inicializando ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Pré-carregar
            </button>
            <button
              onClick={() => {
                setTipoRegraSelect('tributado');
                const config = TIPOS_REGRA['tributado'];
                setNovaRegra({
                  tipo: 'ncm', chave: '', descricao: '', tipo_regra: 'tributado',
                  aliquota_pis: config.aliquota_pis, aliquota_cofins: config.aliquota_cofins,
                  gera_credito: config.gera_credito, gera_debito: config.gera_debito,
                  cst_esperado_entrada: config.cst_entrada, cst_esperado_saida: config.cst_saida,
                  base_legal: '', observacao: '', excecoes: []
                });
                setModalRegra({});
              }}
              className="flex items-center gap-2 bg-[#C8A951] text-black px-3 py-1.5 rounded-lg hover:bg-[#B89841] font-medium text-xs"
            >
              <Plus className="w-3 h-3" /> Nova Regra
            </button>
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-[#666]">Filtrar:</span>
          <button
            onClick={() => setFiltroTipoRegra('todos')}
            className={`text-xs px-2 py-1 rounded transition-all ${
              filtroTipoRegra === 'todos' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#A1A1AA] hover:bg-[#2A2A2A]'
            }`}
          >
            Todos ({regras.length})
          </button>
          <TipoFiltro tipo="aliquota_zero" label="Alíq. Zero" cor="bg-green-600/30 text-green-400" />
          <TipoFiltro tipo="monofasico" label="Monofásico" cor="bg-blue-600/30 text-blue-400" />
          <TipoFiltro tipo="aliquota_diferenciada" label="Alíq. Difer." cor="bg-yellow-600/30 text-yellow-400" />
          <TipoFiltro tipo="tributado" label="Tributado" cor="bg-purple-600/30 text-purple-400" />
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0C0C0C]">
              <tr>
                <th className="text-left py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSortRegras('chave')}>
                  <div className="flex items-center gap-1">NCM {getSortIconRegras('chave')}</div>
                </th>
                <th className="text-left py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSortRegras('descricao')}>
                  <div className="flex items-center gap-1">Descrição {getSortIconRegras('descricao')}</div>
                </th>
                <th className="text-center py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSortRegras('tipo_regra')}>
                  <div className="flex items-center justify-center gap-1">Tipo {getSortIconRegras('tipo_regra')}</div>
                </th>
                <th className="text-center py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSortRegras('aliquota_pis')}>
                  <div className="flex items-center justify-center gap-1">PIS {getSortIconRegras('aliquota_pis')}</div>
                </th>
                <th className="text-center py-2 px-3 text-[#A1A1AA] cursor-pointer hover:text-white select-none" onClick={() => handleSortRegras('aliquota_cofins')}>
                  <div className="flex items-center justify-center gap-1">COFINS {getSortIconRegras('aliquota_cofins')}</div>
                </th>
                <th className="text-center py-2 px-3 text-[#A1A1AA]">CST E/S</th>
                <th className="text-center py-2 px-3 text-[#A1A1AA]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {regrasExpandidas.map((item, idx) => (
                <tr 
                  key={item.id || idx} 
                  className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] ${
                    item.isExcecao ? 'bg-orange-900/10' : ''
                  }`}
                >
                  <td className="py-2 px-3">
                    {item.isExcecao ? (
                      <div className="flex items-center gap-2">
                        <span className="text-orange-400 text-xs">↳</span>
                        <span className="font-mono text-orange-400 text-xs">{item.chave}</span>
                        <span className="text-[#666] text-xs">(NCM {item.parent_chave})</span>
                      </div>
                    ) : (
                      <span className="font-mono text-[#C8A951] text-xs">{item.chave}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-white text-xs max-w-[200px] truncate">{item.descricao}</td>
                  <td className="py-2 px-3 text-center">
                    {item.isExcecao ? (
                      <span className="text-xs bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded">Exceção</span>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        item.tipo_regra === 'aliquota_zero' ? 'bg-green-600/20 text-green-400' :
                        item.tipo_regra === 'monofasico' ? 'bg-blue-600/20 text-blue-400' :
                        item.tipo_regra === 'aliquota_diferenciada' ? 'bg-yellow-600/20 text-yellow-400' :
                        item.tipo_regra === 'isento' ? 'bg-gray-600/20 text-gray-400' :
                        'bg-purple-600/20 text-purple-400'
                      }`}>
                        {item.tipo_regra === 'aliquota_zero' ? 'Alíq. Zero' :
                         item.tipo_regra === 'monofasico' ? 'Monofásico' :
                         item.tipo_regra === 'aliquota_diferenciada' ? 'Alíq. Difer.' :
                         item.tipo_regra === 'isento' ? 'Isento' :
                         item.tipo_regra === 'suspensao' ? 'Suspensão' :
                         'Tributado'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-white text-xs">{item.aliquota_pis}%</td>
                  <td className="py-2 px-3 text-center text-white text-xs">{item.aliquota_cofins}%</td>
                  <td className="py-2 px-3 text-center text-[#A1A1AA] text-xs">
                    {item.cst_esperado_entrada || '-'}/{item.cst_esperado_saida || '-'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {!item.isExcecao && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setTipoRegraSelect(item.tipo_regra || 'tributado');
                            setNovaRegra({
                              tipo: item.tipo, chave: item.chave, descricao: item.descricao,
                              tipo_regra: item.tipo_regra || 'tributado',
                              aliquota_pis: item.aliquota_pis, aliquota_cofins: item.aliquota_cofins,
                              gera_credito: item.gera_credito, gera_debito: item.gera_debito,
                              cst_esperado_entrada: item.cst_esperado_entrada || '',
                              cst_esperado_saida: item.cst_esperado_saida || '',
                              base_legal: item.base_legal || '', observacao: item.observacao || '',
                              excecoes: item.excecoes || []
                            });
                            setModalRegra(item);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleExcluirRegra(item.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {regrasExpandidas.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-[#666]">
                    {filtroTipoRegra !== 'todos' 
                      ? `Nenhuma regra do tipo "${filtroTipoRegra}"` 
                      : 'Nenhuma regra configurada. Clique em "Pré-carregar" para criar regras automaticamente.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            {/* Tipo de Regra */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1 font-semibold">Tipo de Tributação *</label>
              <select
                value={tipoRegraSelect}
                onChange={(e) => handleTipoRegraChange(e.target.value)}
                className="w-full bg-[#0C0C0C] border border-[#C8A951] rounded-lg px-3 py-2 text-white"
              >
                {Object.entries(TIPOS_REGRA).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              {tipoConfig && <p className="text-xs text-[#666] mt-1">{tipoConfig.descricao_tipo}</p>}
            </div>

            {/* Preview automático */}
            <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-3">
              <div className="grid grid-cols-4 gap-4 text-center text-xs">
                <div><p className="text-[#666]">CST Ent.</p><p className="text-white font-mono">{novaRegra.cst_esperado_entrada || '-'}</p></div>
                <div><p className="text-[#666]">CST Saí.</p><p className="text-white font-mono">{novaRegra.cst_esperado_saida || '-'}</p></div>
                <div><p className="text-[#666]">PIS</p><p className="text-white">{novaRegra.aliquota_pis}%</p></div>
                <div><p className="text-[#666]">COFINS</p><p className="text-white">{novaRegra.aliquota_cofins}%</p></div>
              </div>
            </div>
            
            {/* NCM e Descrição */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">NCM (prefixo ou completo)</label>
                <input
                  type="text"
                  value={novaRegra.chave}
                  onChange={(e) => setNovaRegra({...novaRegra, chave: e.target.value})}
                  placeholder="Ex: 1905 ou 19059090"
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Descrição</label>
                <input
                  type="text"
                  value={novaRegra.descricao}
                  onChange={(e) => setNovaRegra({...novaRegra, descricao: e.target.value})}
                  placeholder="Ex: Pães e produtos de padaria"
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
            
            {/* Alíquotas - Apenas se for Alíquota Diferenciada */}
            {isAliquotaDiferenciada && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Alíquota PIS (%)</label>
                  <input type="number" step="0.01" value={novaRegra.aliquota_pis}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_pis: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Alíquota COFINS (%)</label>
                  <input type="number" step="0.01" value={novaRegra.aliquota_cofins}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_cofins: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm" />
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
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            {/* EXCEÇÕES */}
            <div className="border border-[#2A2A2A] rounded-lg p-3">
              <h4 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Exceções (palavra-chave + NCM que NÃO seguem esta regra)
              </h4>
              
              {novaRegra.excecoes?.length > 0 && (
                <div className="space-y-1 mb-3">
                  {novaRegra.excecoes.map((exc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#0C0C0C] rounded p-2 text-xs">
                      <div>
                        <span className="text-orange-400 font-medium">{exc.chave}</span>
                        <span className="text-[#666] ml-2">→ CST {exc.cst_entrada}/{exc.cst_saida} | PIS {exc.aliquota_pis}% | COFINS {exc.aliquota_cofins}%</span>
                      </div>
                      <button onClick={() => handleRemoverExcecao(idx)} className="text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-6 gap-2">
                <input type="text" value={novaExcecao.chave} onChange={(e) => setNovaExcecao({...novaExcecao, chave: e.target.value})}
                  placeholder="Palavra-chave" className="col-span-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-xs" />
                <input type="text" value={novaExcecao.cst_entrada} onChange={(e) => setNovaExcecao({...novaExcecao, cst_entrada: e.target.value})}
                  placeholder="CST E" className="bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-xs" />
                <input type="text" value={novaExcecao.cst_saida} onChange={(e) => setNovaExcecao({...novaExcecao, cst_saida: e.target.value})}
                  placeholder="CST S" className="bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-xs" />
                <input type="number" step="0.01" value={novaExcecao.aliquota_pis} onChange={(e) => setNovaExcecao({...novaExcecao, aliquota_pis: parseFloat(e.target.value) || 0})}
                  placeholder="PIS%" className="bg-[#0C0C0C] border border-[#2A2A2A] rounded px-2 py-1 text-white text-xs" />
                <button onClick={handleAdicionarExcecao} className="bg-orange-600 text-white rounded px-2 py-1 text-xs hover:bg-orange-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-4 border-t border-[#2A2A2A]">
            <button onClick={() => setModalRegra(null)} className="px-4 py-2 text-[#A1A1AA] hover:text-white text-sm">Cancelar</button>
            <button onClick={handleSalvarRegra} className="flex items-center gap-2 bg-[#C8A951] text-black px-4 py-2 rounded-lg hover:bg-[#B89841] font-medium text-sm">
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Validador de PIS/COFINS</h1>
            <p className="text-[#A1A1AA] text-xs">Audite alíquotas e CSTs - CFOPs exceção tratados automaticamente</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => handleAplicarRegras('entrada')} 
              disabled={aplicandoRegras || loading}
              className="flex items-center gap-2 bg-blue-600/20 border border-blue-600/40 text-blue-400 px-3 py-2 rounded-lg hover:bg-blue-600/30 text-sm disabled:opacity-50"
              title="Aplicar regras nos CSTs de entrada dos documentos"
            >
              <ArrowDown className="w-4 h-4" /> Rever CST Entrada
            </button>
            <button 
              onClick={() => handleAplicarRegras('saida')} 
              disabled={aplicandoRegras || loading}
              className="flex items-center gap-2 bg-green-600/20 border border-green-600/40 text-green-400 px-3 py-2 rounded-lg hover:bg-green-600/30 text-sm disabled:opacity-50"
              title="Aplicar regras nos CSTs de saída dos documentos"
            >
              <ArrowUp className="w-4 h-4" /> Rever CST Saída
            </button>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] text-white px-3 py-2 rounded-lg hover:bg-[#1A1A1A] text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('ncms')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ncms' 
                ? 'text-[#C8A951] border-[#C8A951]' 
                : 'text-[#A1A1AA] border-transparent hover:text-white'
            }`}
          >
            <List className="w-4 h-4" /> NCMs
          </button>
          <button
            onClick={() => setActiveTab('regras')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'regras' 
                ? 'text-[#C8A951] border-[#C8A951]' 
                : 'text-[#A1A1AA] border-transparent hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" /> Regras ({regras.length})
          </button>
        </div>

        {/* Filtro de busca - apenas na aba NCMs */}
        {activeTab === 'ncms' && (
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
              <input type="text" placeholder="Buscar por NCM, descrição ou produto..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#141414] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-white placeholder-[#666] text-sm" />
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C8A951]" />
          </div>
        ) : (
          <>
            {activeTab === 'ncms' && (
              <>
                <SecaoCfopsExcecao />
                <SecaoNcms />
              </>
            )}
            {activeTab === 'regras' && <SecaoRegras />}
          </>
        )}

        <ModalRegra />
      </div>
    </Layout>
  );
};

export default ValidadorPisCofins;
