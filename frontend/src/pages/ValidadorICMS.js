import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Search, AlertTriangle, CheckCircle, XCircle, 
  Plus, Trash2, Edit2, Save, X, 
  Package, FileText, RefreshCw, Download,
  AlertCircle, Info, ChevronDown, ChevronUp
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ValidadorICMS = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('produto'); // produto, ncm, regras
  const [dadosPorProduto, setDadosPorProduto] = useState(null);
  const [dadosPorNCM, setDadosPorNCM] = useState(null);
  const [regras, setRegras] = useState([]);
  const [sugestoes, setSugestoes] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos'); // todos, ok, alerta, divergente, sem_regra
  
  // Modal para edição/criação de regra
  const [modalRegra, setModalRegra] = useState(null);
  const [novaRegra, setNovaRegra] = useState({
    tipo: 'ncm',
    chave: '',
    descricao: '',
    aliquota_interna: 18,
    aliquota_interestadual_sul_sudeste: 12,
    aliquota_interestadual_outros: 7,
    aliquota_st: 0,
    excecoes: [],
    base_legal: '',
    aplica_st: false
  });
  const [novaExcecao, setNovaExcecao] = useState({ chave: '', descricao: '', aliquota: 0, condicao: '' });

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar dados em paralelo
      const [produtoRes, ncmRes, regrasRes, sugestoesRes] = await Promise.all([
        axios.get(`${API}/validador-icms/${selectedCompany.id}/por-produto?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/validador-icms/${selectedCompany.id}/por-ncm?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/validador-icms/${selectedCompany.id}/regras`, { headers }),
        axios.get(`${API}/validador-icms/${selectedCompany.id}/sugestoes?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers })
      ]);
      
      setDadosPorProduto(produtoRes.data);
      setDadosPorNCM(ncmRes.data);
      setRegras(regrasRes.data.regras || []);
      setSugestoes(sugestoesRes.data);
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

  const handleSalvarRegra = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (modalRegra?.id) {
        // Atualizar
        await axios.put(`${API}/validador-icms/${selectedCompany.id}/regras/${modalRegra.id}`, novaRegra, { headers });
      } else {
        // Criar nova
        await axios.post(`${API}/validador-icms/${selectedCompany.id}/regras`, novaRegra, { headers });
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
      await axios.delete(`${API}/validador-icms/${selectedCompany.id}/regras/${regraId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir regra:', err);
    }
  };

  const handleCriarRegraRapida = (item, tipo) => {
    setNovaRegra({
      tipo: tipo,
      chave: tipo === 'ncm' ? item.ncm : item.codigo,
      descricao: tipo === 'ncm' ? `NCM ${item.ncm}` : item.descricao,
      aliquota_interna: item.aliquota_praticada || 18,
      aliquota_interestadual_sul_sudeste: 12,
      aliquota_interestadual_outros: 7,
      aliquota_st: 0,
      excecoes: [],
      base_legal: '',
      aplica_st: item.is_st || false
    });
    setModalRegra({});
    setActiveTab('regras');
  };

  const handleAdicionarExcecao = () => {
    if (!novaExcecao.chave || !novaExcecao.aliquota) return;
    setNovaRegra({
      ...novaRegra,
      excecoes: [...(novaRegra.excecoes || []), { ...novaExcecao }]
    });
    setNovaExcecao({ chave: '', descricao: '', aliquota: 0, condicao: '' });
  };

  const handleRemoverExcecao = (index) => {
    setNovaRegra({
      ...novaRegra,
      excecoes: novaRegra.excecoes.filter((_, i) => i !== index)
    });
  };

  const [inicializando, setInicializando] = useState(false);
  
  const handleInicializarRegras = async () => {
    if (!window.confirm('Isso criará regras de ICMS automaticamente baseadas nos NCMs encontrados nas suas vendas e no Regulamento ICMS do seu estado. Deseja continuar?')) {
      return;
    }
    
    setInicializando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/validador-icms/${selectedCompany.id}/inicializar-regras?competencia=${encodeURIComponent(selectedCompetencia)}`,
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

  // Filtrar dados
  const filtrarDados = (dados) => {
    if (!dados) return [];
    return dados.filter(item => {
      const matchSearch = searchTerm === '' || 
        (item.descricao?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.ncm?.includes(searchTerm)) ||
        (item.codigo?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
      
      return matchSearch && matchStatus;
    });
  };

  // Cards de estatísticas
  const EstatisticasCard = ({ dados }) => {
    if (!dados?.estatisticas) return null;
    const stats = dados.estatisticas;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-[#A1A1AA]">Total</p>
        </div>
        <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.ok}</p>
          <p className="text-sm text-green-400/70">OK</p>
        </div>
        <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.alerta}</p>
          <p className="text-sm text-yellow-400/70">Alerta</p>
        </div>
        <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.divergentes}</p>
          <p className="text-sm text-red-400/70">Divergente</p>
        </div>
        <div className="bg-gray-600/10 border border-gray-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.sem_regra}</p>
          <p className="text-sm text-gray-400/70">Sem Regra</p>
        </div>
      </div>
    );
  };

  // Tab Por Produto
  const TabPorProduto = () => {
    const dadosFiltrados = filtrarDados(dadosPorProduto?.produtos);
    
    return (
      <div className="space-y-4">
        <EstatisticasCard dados={dadosPorProduto} />
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Produto</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">NCM</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Qtd</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Valor</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Alíq. Praticada</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Alíq. Esperada</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Divergência</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Status</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item, idx) => (
                  <tr key={idx} className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] ${item.status === 'divergente' ? 'bg-red-900/10' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="max-w-[200px]">
                        <p className="text-white text-sm truncate" title={item.descricao}>{item.descricao}</p>
                        <p className="text-xs text-[#666]">{item.codigo}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#C8A951]">{item.ncm}</td>
                    <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.quantidade}</td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_total)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-white">{item.aliquota_praticada}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.aliquota_esperada !== null ? (
                        <span className="text-blue-400">{item.aliquota_esperada}%</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.divergencia > 0 ? (
                        <span className={`font-semibold ${item.divergencia > 1 ? 'text-red-400' : 'text-yellow-400'}`}>
                          {item.divergencia}%
                        </span>
                      ) : (
                        <span className="text-green-400">0%</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'sem_regra' && (
                        <button
                          onClick={() => handleCriarRegraRapida(item, 'produto')}
                          className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30"
                          title="Criar regra para este produto"
                        >
                          + Regra
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {dadosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-[#666]">
                      Nenhum produto encontrado com os filtros aplicados
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

  // Tab Por NCM
  const TabPorNCM = () => {
    const dadosFiltrados = filtrarDados(dadosPorNCM?.ncms);
    
    return (
      <div className="space-y-4">
        <EstatisticasCard dados={dadosPorNCM} />
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">NCM</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Exemplos de Produtos</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Qtd Itens</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Valor Total</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Alíq. Praticada</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Alíq. Esperada</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Status</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item, idx) => (
                  <tr key={idx} className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] ${item.status === 'divergente' ? 'bg-red-900/10' : ''}`}>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#C8A951] font-semibold">{item.ncm}</span>
                      {item.ncms_completos?.length > 1 && (
                        <p className="text-xs text-[#666]">+{item.ncms_completos.length - 1} variações</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-[250px]">
                        {item.produtos_exemplo?.slice(0, 2).map((p, i) => (
                          <p key={i} className="text-white text-sm truncate">{p}</p>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.quantidade}</td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_total)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-white">{item.aliquota_praticada}%</span>
                      {item.aliquotas_encontradas?.length > 1 && (
                        <p className="text-xs text-[#666]">
                          ({item.aliquotas_encontradas.join('%, ')}%)
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.aliquota_esperada !== null ? (
                        <span className="text-blue-400">{item.aliquota_esperada}%</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'sem_regra' && (
                        <button
                          onClick={() => handleCriarRegraRapida(item, 'ncm')}
                          className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30"
                        >
                          + Regra
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {dadosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-[#666]">
                      Nenhum NCM encontrado com os filtros aplicados
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

  // Tab Regras
  const TabRegras = () => {
    return (
      <div className="space-y-6">
        {/* Sugestões de Regras */}
        {sugestoes?.sugestoes?.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Sugestões de Regras
            </h3>
            <p className="text-sm text-[#A1A1AA] mb-3">
              NCMs frequentes nas vendas que ainda não possuem regra configurada:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sugestoes.sugestoes.slice(0, 6).map((s, idx) => (
                <div key={idx} className="bg-[#0C0C0C] rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-[#C8A951]">{s.ncm}</p>
                      <p className="text-xs text-[#666] truncate" title={s.descricao_exemplo}>
                        Ex: {s.descricao_exemplo}
                      </p>
                      <p className="text-xs text-blue-400">{s.quantidade_itens} itens</p>
                    </div>
                    <button
                      onClick={() => {
                        setNovaRegra({
                          tipo: 'ncm',
                          chave: s.ncm,
                          descricao: `NCM ${s.ncm} - ${s.descricao_exemplo}`,
                          aliquota_esperada: s.aliquota_sugerida,
                          aliquota_reduzida: null,
                          condicao_reducao: '',
                          base_legal: ''
                        });
                        setModalRegra({});
                      }}
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão Nova Regra */}
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">Regras Configuradas ({regras.length})</h3>
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
              Pré-carregar do Regulamento
            </button>
            <button
              onClick={() => {
                setNovaRegra({
                  tipo: 'ncm',
                  chave: '',
                  descricao: '',
                  aliquota_interna: 18,
                  aliquota_interestadual_sul_sudeste: 12,
                  aliquota_interestadual_outros: 7,
                  aliquota_st: 0,
                  excecoes: [],
                  base_legal: '',
                  aplica_st: false
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

        {/* Lista de Regras */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {regras.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Tipo</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Chave</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Descrição</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Alíq. Interna</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Alíq. Interest.</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Base Legal</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Status</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {regras.map((regra, idx) => (
                  <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${regra.tipo === 'ncm' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                        {regra.tipo === 'ncm' ? 'NCM' : 'Produto'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#C8A951]">{regra.chave}</td>
                    <td className="py-3 px-4 text-white max-w-[200px] truncate" title={regra.descricao}>
                      {regra.descricao}
                    </td>
                    <td className="py-3 px-4 text-center text-white font-semibold">{regra.aliquota_interna}%</td>
                    <td className="py-3 px-4 text-center text-green-400">
                      {regra.aliquota_interestadual_sul_sudeste ? `${regra.aliquota_interestadual_sul_sudeste}%` : '-'}
                    </td>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] text-xs max-w-[150px] truncate" title={regra.base_legal}>
                      {regra.base_legal || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {regra.ativo ? (
                        <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">Ativo</span>
                      ) : (
                        <span className="text-xs bg-gray-600/20 text-gray-400 px-2 py-0.5 rounded">Inativo</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setNovaRegra({
                              tipo: regra.tipo,
                              chave: regra.chave,
                              descricao: regra.descricao,
                              aliquota_interna: regra.aliquota_interna,
                              aliquota_interestadual_sul_sudeste: regra.aliquota_interestadual_sul_sudeste || 12,
                              aliquota_interestadual_outros: regra.aliquota_interestadual_outros || 7,
                              aliquota_st: regra.aliquota_st || 0,
                              excecoes: regra.excecoes || [],
                              base_legal: regra.base_legal || '',
                              aplica_st: regra.aplica_st || false
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
          ) : (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
              <p className="text-white font-medium mb-2">Nenhuma regra configurada</p>
              <p className="text-[#A1A1AA] text-sm mb-4">
                Configure regras para validar as alíquotas de ICMS das suas vendas
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Modal de Regra
  const ModalRegra = () => {
    if (modalRegra === null) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">
              {modalRegra.id ? 'Editar Regra' : 'Nova Regra de ICMS'}
            </h3>
            <button onClick={() => setModalRegra(null)} className="text-[#A1A1AA] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Tipo e Chave */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Tipo</label>
                <select
                  value={novaRegra.tipo}
                  onChange={(e) => setNovaRegra({...novaRegra, tipo: e.target.value})}
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                >
                  <option value="ncm">NCM</option>
                  <option value="produto">Produto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">
                  {novaRegra.tipo === 'ncm' ? 'NCM' : 'Código/Descrição'}
                </label>
                <input
                  type="text"
                  value={novaRegra.chave}
                  onChange={(e) => setNovaRegra({...novaRegra, chave: e.target.value})}
                  placeholder={novaRegra.tipo === 'ncm' ? 'Ex: 2208' : 'Ex: CERVEJA'}
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            
            {/* Descrição */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Descrição</label>
              <input
                type="text"
                value={novaRegra.descricao}
                onChange={(e) => setNovaRegra({...novaRegra, descricao: e.target.value})}
                placeholder="Ex: Bebidas alcoólicas destiladas"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            {/* Alíquotas por tipo de operação */}
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Alíquotas por Tipo de Operação</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Interna (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquota_interna}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_interna: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Interestadual S/SE (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquota_interestadual_sul_sudeste}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_interestadual_sul_sudeste: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">Interestadual Outros (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquota_interestadual_outros}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_interestadual_outros: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] mb-1">ST (se aplicável)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaRegra.aliquota_st}
                    onChange={(e) => setNovaRegra({...novaRegra, aliquota_st: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={novaRegra.aplica_st}
                  onChange={(e) => setNovaRegra({...novaRegra, aplica_st: e.target.checked})}
                  className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C]"
                />
                <span className="text-sm text-[#A1A1AA]">Produto com ST (espera 0% na saída para atacado/varejo)</span>
              </label>
            </div>
            
            {/* Exceções */}
            <div className="bg-[#0C0C0C] rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Exceções (opcional)</h4>
              <p className="text-xs text-[#666] mb-3">
                Ex: Bebidas destiladas 25%, mas Cachaça/Aguardente 18%
              </p>
              
              {/* Lista de exceções */}
              {novaRegra.excecoes?.length > 0 && (
                <div className="mb-3 space-y-2">
                  {novaRegra.excecoes.map((exc, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#141414] rounded px-3 py-2">
                      <span className="text-white text-sm flex-1">
                        <span className="text-[#C8A951]">{exc.chave}</span>: {exc.aliquota}%
                        {exc.descricao && <span className="text-[#666] ml-2">({exc.descricao})</span>}
                      </span>
                      <button
                        onClick={() => handleRemoverExcecao(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Adicionar exceção */}
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Chave (ex: cachaca)"
                  value={novaExcecao.chave}
                  onChange={(e) => setNovaExcecao({...novaExcecao, chave: e.target.value})}
                  className="bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                />
                <input
                  type="text"
                  placeholder="Descrição"
                  value={novaExcecao.descricao}
                  onChange={(e) => setNovaExcecao({...novaExcecao, descricao: e.target.value})}
                  className="bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                />
                <input
                  type="number"
                  placeholder="Alíq %"
                  step="0.01"
                  value={novaExcecao.aliquota || ''}
                  onChange={(e) => setNovaExcecao({...novaExcecao, aliquota: parseFloat(e.target.value) || 0})}
                  className="bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1.5 text-white text-sm"
                />
                <button
                  onClick={handleAdicionarExcecao}
                  className="bg-blue-600/20 text-blue-400 rounded px-2 py-1.5 text-sm hover:bg-blue-600/30"
                >
                  + Add
                </button>
              </div>
            </div>
            
            {/* Base Legal */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Base Legal</label>
              <input
                type="text"
                value={novaRegra.base_legal}
                onChange={(e) => setNovaRegra({...novaRegra, base_legal: e.target.value})}
                placeholder="Ex: RICMS SP Art. 54"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
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
            <h1 className="text-2xl font-bold text-white">Validador de Alíquota ICMS</h1>
            <p className="text-[#A1A1AA] text-sm">
              Compare as alíquotas praticadas com as regras configuradas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {regras.length === 0 && (
              <button
                onClick={handleInicializarRegras}
                disabled={inicializando || loading}
                className="flex items-center gap-2 bg-[#C8A951] text-black px-4 py-2 rounded-lg hover:bg-[#B89841] font-medium disabled:opacity-50"
              >
                {inicializando ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Carregar Regras do Regulamento
              </button>
            )}
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
              placeholder="Buscar por produto, NCM ou código..."
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

        {/* Tabs */}
        <div className="flex border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('produto')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'produto'
                ? 'text-[#C8A951] border-b-2 border-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Por Produto
          </button>
          <button
            onClick={() => setActiveTab('ncm')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'ncm'
                ? 'text-[#C8A951] border-b-2 border-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Por NCM
          </button>
          <button
            onClick={() => setActiveTab('regras')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'regras'
                ? 'text-[#C8A951] border-b-2 border-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Regras ({regras.length})
          </button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C8A951]" />
          </div>
        ) : (
          <>
            {activeTab === 'produto' && <TabPorProduto />}
            {activeTab === 'ncm' && <TabPorNCM />}
            {activeTab === 'regras' && <TabRegras />}
          </>
        )}

        {/* Modal */}
        <ModalRegra />
      </div>
    </Layout>
  );
};

export default ValidadorICMS;
