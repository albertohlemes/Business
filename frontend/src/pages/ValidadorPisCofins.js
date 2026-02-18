import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Search, AlertTriangle, CheckCircle, XCircle, 
  Plus, Trash2, Edit2, Save, X, 
  Package, FileText, RefreshCw, ArrowDown, ArrowUp,
  AlertCircle, Info, DollarSign
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ValidadorPisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cfop'); // cfop, ncm, regras
  const [dadosPorCfop, setDadosPorCfop] = useState(null);
  const [dadosPorNCM, setDadosPorNCM] = useState(null);
  const [regras, setRegras] = useState([]);
  const [sugestoes, setSugestoes] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // todos, entrada, saida
  
  // Modal para edição/criação de regra
  const [modalRegra, setModalRegra] = useState(null);
  const [novaRegra, setNovaRegra] = useState({
    tipo: 'cfop',
    chave: '',
    descricao: '',
    aliquota_pis: 1.65,
    aliquota_cofins: 7.6,
    gera_credito: true,
    gera_debito: true,
    cst_esperado_entrada: '',
    cst_esperado_saida: '',
    base_legal: '',
    observacao: ''
  });

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [cfopRes, ncmRes, regrasRes, sugestoesRes] = await Promise.all([
        axios.get(`${API}/validador-pis-cofins/${selectedCompany.id}/por-cfop?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/validador-pis-cofins/${selectedCompany.id}/por-ncm?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers }),
        axios.get(`${API}/validador-pis-cofins/${selectedCompany.id}/regras`, { headers }),
        axios.get(`${API}/validador-pis-cofins/${selectedCompany.id}/sugestoes?competencia=${encodeURIComponent(selectedCompetencia)}`, { headers })
      ]);
      
      setDadosPorCfop(cfopRes.data);
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

  const handleCriarRegraRapida = (item, tipo) => {
    if (tipo === 'cfop') {
      setNovaRegra({
        tipo: 'cfop',
        chave: item.cfop,
        descricao: item.descricao || `CFOP ${item.cfop}`,
        aliquota_pis: 1.65,
        aliquota_cofins: 7.6,
        gera_credito: item.tipo === 'entrada',
        gera_debito: item.tipo === 'saida',
        cst_esperado_entrada: '',
        cst_esperado_saida: '',
        base_legal: '',
        observacao: ''
      });
    } else {
      setNovaRegra({
        tipo: 'ncm',
        chave: item.ncm,
        descricao: `NCM ${item.ncm}`,
        aliquota_pis: item.aliquota_pis_praticada || 1.65,
        aliquota_cofins: item.aliquota_cofins_praticada || 7.6,
        gera_credito: true,
        gera_debito: true,
        cst_esperado_entrada: '',
        cst_esperado_saida: '',
        base_legal: '',
        observacao: ''
      });
    }
    setModalRegra({});
    setActiveTab('regras');
  };

  // Cards de estatísticas
  const EstatisticasCard = ({ dados }) => {
    if (!dados?.estatisticas) return null;
    const stats = dados.estatisticas;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-[#A1A1AA]">Total</p>
        </div>
        <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.ok}</p>
          <p className="text-sm text-green-400/70">OK</p>
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

  // Tab Por CFOP
  const TabPorCfop = () => {
    const entradas = (dadosPorCfop?.entradas || []).filter(item => {
      const matchSearch = searchTerm === '' || item.cfop.includes(searchTerm) || item.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
      return matchSearch && matchStatus;
    });
    
    const saidas = (dadosPorCfop?.saidas || []).filter(item => {
      const matchSearch = searchTerm === '' || item.cfop.includes(searchTerm) || item.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
      return matchSearch && matchStatus;
    });
    
    const CfopTable = ({ dados, titulo, tipoOp }) => (
      <div className="mb-6">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          {tipoOp === 'entrada' ? <ArrowDown className="w-4 h-4 text-green-400" /> : <ArrowUp className="w-4 h-4 text-red-400" />}
          {titulo} ({dados.length})
        </h3>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">CFOP</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Descrição</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Qtd</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Valor Total</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">PIS</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">COFINS</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">CST</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Gera {tipoOp === 'entrada' ? 'Crédito' : 'Débito'}?</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Esperado</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Status</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((item, idx) => (
                  <tr key={idx} className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] ${item.status === 'divergente' ? 'bg-red-900/10' : ''}`}>
                    <td className="py-3 px-4 font-mono text-[#C8A951] font-semibold">{item.cfop}</td>
                    <td className="py-3 px-4 text-white max-w-[200px] truncate" title={item.descricao}>{item.descricao}</td>
                    <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.quantidade}</td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_total)}</td>
                    <td className="py-3 px-4 text-right text-blue-400">{formatCurrency(item.valor_pis)}</td>
                    <td className="py-3 px-4 text-right text-teal-400">{formatCurrency(item.valor_cofins)}</td>
                    <td className="py-3 px-4 text-center text-[#A1A1AA]">{item.cst_mais_comum || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      {item.gera_credito_debito_praticado ? (
                        <span className="text-green-400">Sim</span>
                      ) : (
                        <span className="text-gray-400">Não</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.gera_credito_debito_esperado !== null ? (
                        item.gera_credito_debito_esperado ? (
                          <span className="text-blue-400">Sim</span>
                        ) : (
                          <span className="text-gray-400">Não</span>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'sem_regra' && (
                        <button
                          onClick={() => handleCriarRegraRapida(item, 'cfop')}
                          className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30"
                        >
                          + Regra
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {dados.length === 0 && (
                  <tr>
                    <td colSpan="11" className="py-8 text-center text-[#666]">
                      Nenhum CFOP encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
    
    return (
      <div className="space-y-4">
        <EstatisticasCard dados={dadosPorCfop} />
        
        {(filtroTipo === 'todos' || filtroTipo === 'entrada') && (
          <CfopTable dados={entradas} titulo="Entradas (Créditos)" tipoOp="entrada" />
        )}
        
        {(filtroTipo === 'todos' || filtroTipo === 'saida') && (
          <CfopTable dados={saidas} titulo="Saídas (Débitos)" tipoOp="saida" />
        )}
      </div>
    );
  };

  // Tab Por NCM
  const TabPorNCM = () => {
    const dadosFiltrados = (dadosPorNCM?.ncms || []).filter(item => {
      const matchSearch = searchTerm === '' || item.ncm.includes(searchTerm) || item.produtos_exemplo?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
      return matchSearch && matchStatus;
    });
    
    return (
      <div className="space-y-4">
        <EstatisticasCard dados={dadosPorNCM} />
        
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0C0C0C]">
                <tr>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">NCM</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA]">Exemplos</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">E/S</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA]">Valor</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">PIS Prat.</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">PIS Esp.</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">COFINS Prat.</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">COFINS Esp.</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">CST</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Status</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((item, idx) => (
                  <tr key={idx} className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A] ${item.status === 'divergente' ? 'bg-red-900/10' : ''}`}>
                    <td className="py-3 px-4 font-mono text-[#C8A951] font-semibold">{item.ncm}</td>
                    <td className="py-3 px-4">
                      <div className="max-w-[200px]">
                        {item.produtos_exemplo?.slice(0, 2).map((p, i) => (
                          <p key={i} className="text-white text-xs truncate">{p}</p>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[#A1A1AA]">
                      <span className="text-green-400">{item.entradas}</span>/<span className="text-red-400">{item.saidas}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_total)}</td>
                    <td className="py-3 px-4 text-center text-white">{item.aliquota_pis_praticada}%</td>
                    <td className="py-3 px-4 text-center text-blue-400">
                      {item.aliquota_pis_esperada !== null ? `${item.aliquota_pis_esperada}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center text-white">{item.aliquota_cofins_praticada}%</td>
                    <td className="py-3 px-4 text-center text-teal-400">
                      {item.aliquota_cofins_esperada !== null ? `${item.aliquota_cofins_esperada}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center text-[#A1A1AA]">{item.cst_mais_comum || '-'}</td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(item.status)}</td>
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
                    <td colSpan="11" className="py-8 text-center text-[#666]">
                      Nenhum NCM encontrado
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
        {/* Sugestões */}
        {(sugestoes?.sugestoes_ncm?.length > 0 || sugestoes?.sugestoes_cfop?.length > 0) && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Sugestões de Regras
            </h3>
            
            {sugestoes?.sugestoes_ncm?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-[#A1A1AA] mb-2">NCMs frequentes sem regra:</p>
                <div className="flex flex-wrap gap-2">
                  {sugestoes.sugestoes_ncm.slice(0, 5).map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setNovaRegra({
                          tipo: 'ncm',
                          chave: s.chave,
                          descricao: s.descricao,
                          aliquota_pis: s.aliquota_pis_sugerida,
                          aliquota_cofins: s.aliquota_cofins_sugerida,
                          gera_credito: true,
                          gera_debito: true,
                          cst_esperado_entrada: '',
                          cst_esperado_saida: '',
                          base_legal: '',
                          observacao: ''
                        });
                        setModalRegra({});
                      }}
                      className="bg-[#0C0C0C] rounded-lg px-3 py-2 text-sm hover:bg-[#1A1A1A]"
                    >
                      <span className="font-mono text-[#C8A951]">{s.chave}</span>
                      <span className="text-[#666] ml-2">({s.quantidade} itens)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {sugestoes?.sugestoes_cfop?.length > 0 && (
              <div>
                <p className="text-sm text-[#A1A1AA] mb-2">CFOPs sem regra personalizada:</p>
                <div className="flex flex-wrap gap-2">
                  {sugestoes.sugestoes_cfop.slice(0, 5).map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setNovaRegra({
                          tipo: 'cfop',
                          chave: s.chave,
                          descricao: s.descricao,
                          aliquota_pis: 1.65,
                          aliquota_cofins: 7.6,
                          gera_credito: s.gera_credito_sugerido,
                          gera_debito: s.gera_debito_sugerido,
                          cst_esperado_entrada: '',
                          cst_esperado_saida: '',
                          base_legal: '',
                          observacao: ''
                        });
                        setModalRegra({});
                      }}
                      className="bg-[#0C0C0C] rounded-lg px-3 py-2 text-sm hover:bg-[#1A1A1A]"
                    >
                      <span className="font-mono text-[#C8A951]">{s.chave}</span>
                      <span className="text-[#666] ml-2">({s.quantidade} docs)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botão Nova Regra */}
        <div className="flex justify-between items-center">
          <h3 className="text-white font-semibold">Regras Configuradas ({regras.length})</h3>
          <button
            onClick={() => {
              setNovaRegra({
                tipo: 'cfop',
                chave: '',
                descricao: '',
                aliquota_pis: 1.65,
                aliquota_cofins: 7.6,
                gera_credito: true,
                gera_debito: true,
                cst_esperado_entrada: '',
                cst_esperado_saida: '',
                base_legal: '',
                observacao: ''
              });
              setModalRegra({});
            }}
            className="flex items-center gap-2 bg-[#C8A951] text-black px-4 py-2 rounded-lg hover:bg-[#B89841] font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Regra
          </button>
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
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">PIS</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">COFINS</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Crédito</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Débito</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Status</th>
                  <th className="text-center py-3 px-4 text-[#A1A1AA]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {regras.map((regra, idx) => (
                  <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${regra.tipo === 'ncm' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                        {regra.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#C8A951]">{regra.chave}</td>
                    <td className="py-3 px-4 text-white max-w-[200px] truncate">{regra.descricao}</td>
                    <td className="py-3 px-4 text-center text-white">{regra.aliquota_pis}%</td>
                    <td className="py-3 px-4 text-center text-white">{regra.aliquota_cofins}%</td>
                    <td className="py-3 px-4 text-center">
                      {regra.gera_credito ? <span className="text-green-400">Sim</span> : <span className="text-gray-400">Não</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {regra.gera_debito ? <span className="text-green-400">Sim</span> : <span className="text-gray-400">Não</span>}
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
                              aliquota_pis: regra.aliquota_pis,
                              aliquota_cofins: regra.aliquota_cofins,
                              gera_credito: regra.gera_credito,
                              gera_debito: regra.gera_debito,
                              cst_esperado_entrada: regra.cst_esperado_entrada || '',
                              cst_esperado_saida: regra.cst_esperado_saida || '',
                              base_legal: regra.base_legal || '',
                              observacao: regra.observacao || ''
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
              <p className="text-[#A1A1AA] text-sm">
                Configure regras para validar PIS/COFINS automaticamente
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
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
            <h3 className="text-white font-semibold">
              {modalRegra.id ? 'Editar Regra' : 'Nova Regra de PIS/COFINS'}
            </h3>
            <button onClick={() => setModalRegra(null)} className="text-[#A1A1AA] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Tipo</label>
              <select
                value={novaRegra.tipo}
                onChange={(e) => setNovaRegra({...novaRegra, tipo: e.target.value})}
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              >
                <option value="cfop">CFOP</option>
                <option value="ncm">NCM</option>
              </select>
            </div>
            
            {/* Chave */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">
                {novaRegra.tipo === 'cfop' ? 'CFOP' : 'NCM (pode ser prefixo)'}
              </label>
              <input
                type="text"
                value={novaRegra.chave}
                onChange={(e) => setNovaRegra({...novaRegra, chave: e.target.value})}
                placeholder={novaRegra.tipo === 'cfop' ? 'Ex: 5102' : 'Ex: 1905'}
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
                placeholder="Ex: Venda de mercadoria adquirida"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            {/* Alíquotas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Alíquota PIS (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={novaRegra.aliquota_pis}
                  onChange={(e) => setNovaRegra({...novaRegra, aliquota_pis: parseFloat(e.target.value)})}
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Alíquota COFINS (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={novaRegra.aliquota_cofins}
                  onChange={(e) => setNovaRegra({...novaRegra, aliquota_cofins: parseFloat(e.target.value)})}
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            
            {/* Gera Crédito/Débito */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={novaRegra.gera_credito}
                  onChange={(e) => setNovaRegra({...novaRegra, gera_credito: e.target.checked})}
                  className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C]"
                />
                <span className="text-white">Gera Crédito (entradas)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={novaRegra.gera_debito}
                  onChange={(e) => setNovaRegra({...novaRegra, gera_debito: e.target.checked})}
                  className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C]"
                />
                <span className="text-white">Gera Débito (saídas)</span>
              </label>
            </div>
            
            {/* CSTs Esperados */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">CST Esperado Entrada</label>
                <input
                  type="text"
                  value={novaRegra.cst_esperado_entrada}
                  onChange={(e) => setNovaRegra({...novaRegra, cst_esperado_entrada: e.target.value})}
                  placeholder="Ex: 50, 60"
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">CST Esperado Saída</label>
                <input
                  type="text"
                  value={novaRegra.cst_esperado_saida}
                  onChange={(e) => setNovaRegra({...novaRegra, cst_esperado_saida: e.target.value})}
                  placeholder="Ex: 01, 02"
                  className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            
            {/* Base Legal */}
            <div>
              <label className="block text-sm text-[#A1A1AA] mb-1">Base Legal</label>
              <input
                type="text"
                value={novaRegra.base_legal}
                onChange={(e) => setNovaRegra({...novaRegra, base_legal: e.target.value})}
                placeholder="Ex: Lei 10.833/2003 Art. 3"
                className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
              />
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
              Compare CFOPs e NCMs com as regras configuradas
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
              placeholder="Buscar por CFOP, NCM ou descrição..."
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
            <option value="divergente">Divergente</option>
            <option value="sem_regra">Sem Regra</option>
          </select>
          {activeTab === 'cfop' && (
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-[#141414] border border-[#2A2A2A] rounded-lg px-4 py-2 text-white"
            >
              <option value="todos">Entradas e Saídas</option>
              <option value="entrada">Apenas Entradas</option>
              <option value="saida">Apenas Saídas</option>
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('cfop')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'cfop'
                ? 'text-[#C8A951] border-b-2 border-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Por CFOP
          </button>
          <button
            onClick={() => setActiveTab('ncm')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'ncm'
                ? 'text-[#C8A951] border-b-2 border-[#C8A951]'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
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
            <FileText className="w-4 h-4" />
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
            {activeTab === 'cfop' && <TabPorCfop />}
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

export default ValidadorPisCofins;
