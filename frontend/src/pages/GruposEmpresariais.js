import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Building2, Plus, Trash2, Edit, Users, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, DollarSign, FileText, Eye, X,
  CheckCircle, AlertTriangle, Link2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const GruposEmpresariais = ({ user, onLogout }) => {
  const { selectedCompetencia } = useAppContext();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empresas, setEmpresas] = useState([]);
  
  // Modal de criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    matriz_id: '',
    filiais_ids: []
  });
  
  // Modal de consolidado
  const [showConsolidado, setShowConsolidado] = useState(false);
  const [consolidadoData, setConsolidadoData] = useState(null);
  const [loadingConsolidado, setLoadingConsolidado] = useState(false);
  
  // Grupo expandido
  const [expandedGrupo, setExpandedGrupo] = useState(null);

  useEffect(() => {
    fetchGrupos();
    fetchEmpresas();
  }, []);

  const fetchGrupos = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/grupos-empresariais`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGrupos(response.data.grupos || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome || !formData.matriz_id) {
      alert('Nome e empresa matriz são obrigatórios');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/grupos-empresariais`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({ nome: '', descricao: '', matriz_id: '', filiais_ids: [] });
      fetchGrupos();
      alert('Grupo criado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar grupo');
    }
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/grupos-empresariais/${editingGrupo.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setEditingGrupo(null);
      setFormData({ nome: '', descricao: '', matriz_id: '', filiais_ids: [] });
      fetchGrupos();
      alert('Grupo atualizado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao atualizar grupo');
    }
  };

  const handleDelete = async (grupoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/grupos-empresariais/${grupoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGrupos();
      alert('Grupo excluído com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir grupo');
    }
  };

  const openEditModal = (grupo) => {
    setEditingGrupo(grupo);
    setFormData({
      nome: grupo.nome,
      descricao: grupo.descricao || '',
      matriz_id: grupo.matriz_id,
      filiais_ids: grupo.filiais_ids || []
    });
    setShowModal(true);
  };

  const viewConsolidado = async (grupoId) => {
    setLoadingConsolidado(true);
    setShowConsolidado(true);
    try {
      const token = localStorage.getItem('token');
      const competencia = selectedCompetencia || '01/2026';
      const response = await axios.get(
        `${API}/grupos-empresariais/${grupoId}/consolidado?competencia=${competencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConsolidadoData(response.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao carregar consolidado');
      setShowConsolidado(false);
    } finally {
      setLoadingConsolidado(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const toggleFilial = (empresaId) => {
    if (formData.filiais_ids.includes(empresaId)) {
      setFormData({
        ...formData,
        filiais_ids: formData.filiais_ids.filter(id => id !== empresaId)
      });
    } else {
      setFormData({
        ...formData,
        filiais_ids: [...formData.filiais_ids, empresaId]
      });
    }
  };

  // Verifica se é admin
  if (user?.role !== 'admin' && user?.role !== 'super_admin' && user?.role !== 'master') {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[#A1A1AA]">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Acesso restrito a administradores</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="grupos-empresariais-page" className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#C8A951]" />
              Grupos Empresariais
            </h1>
            <p className="text-[#A1A1AA]">
              Gerencie holdings, matrizes e filiais • {grupos.length} grupo(s)
            </p>
          </div>
          
          <button
            onClick={() => {
              setEditingGrupo(null);
              setFormData({ nome: '', descricao: '', matriz_id: '', filiais_ids: [] });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#b39642] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Grupo
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C8A951]"></div>
          </div>
        ) : grupos.length === 0 ? (
          <div className="bg-[#141414] rounded-xl p-8 text-center border border-[#2A2A2A]">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-[#A1A1AA] opacity-50" />
            <p className="text-[#A1A1AA] mb-4">Nenhum grupo empresarial cadastrado</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#b39642]"
            >
              Criar Primeiro Grupo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <div key={grupo.id} className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
                {/* Header do grupo */}
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A]"
                  onClick={() => setExpandedGrupo(expandedGrupo === grupo.id ? null : grupo.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#C8A951]/20 rounded-lg">
                      <Building2 className="w-6 h-6 text-[#C8A951]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{grupo.nome}</h3>
                      <p className="text-sm text-[#A1A1AA]">
                        {grupo.total_empresas} empresa(s) • Matriz: {grupo.matriz?.razao_social || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); viewConsolidado(grupo.id); }}
                      className="p-2 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg text-blue-400"
                      title="Ver consolidado"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(grupo); }}
                      className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(grupo.id); }}
                      className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedGrupo === grupo.id ? (
                      <ChevronUp className="w-5 h-5 text-[#A1A1AA]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#A1A1AA]" />
                    )}
                  </div>
                </div>
                
                {/* Detalhes expandidos */}
                {expandedGrupo === grupo.id && (
                  <div className="px-6 pb-4 border-t border-[#2A2A2A]">
                    <div className="pt-4 space-y-3">
                      {/* Matriz */}
                      <div className="flex items-center gap-3 p-3 bg-[#C8A951]/10 rounded-lg border border-[#C8A951]/30">
                        <CheckCircle className="w-5 h-5 text-[#C8A951]" />
                        <div>
                          <p className="text-sm text-[#C8A951] font-medium">MATRIZ</p>
                          <p className="text-white">{grupo.matriz?.razao_social}</p>
                          <p className="text-xs text-[#A1A1AA]">{grupo.matriz?.cnpj} • {grupo.matriz?.uf}</p>
                        </div>
                      </div>
                      
                      {/* Filiais */}
                      {grupo.filiais?.length > 0 ? (
                        grupo.filiais.map((filial, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-[#0C0C0C] rounded-lg">
                            <Link2 className="w-5 h-5 text-[#A1A1AA]" />
                            <div>
                              <p className="text-sm text-[#A1A1AA]">FILIAL</p>
                              <p className="text-white">{filial.razao_social}</p>
                              <p className="text-xs text-[#A1A1AA]">{filial.cnpj} • {filial.uf}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#A1A1AA] text-sm text-center py-2">Nenhuma filial cadastrada</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal de Criação/Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#141414] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#2A2A2A]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingGrupo ? 'Editar Grupo' : 'Novo Grupo Empresarial'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-[#A1A1AA] hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Nome do Grupo *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: Grupo Comercial ABC"
                    className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Descrição</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                    placeholder="Descrição opcional do grupo..."
                    className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white resize-none h-20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Empresa Matriz *</label>
                  <select
                    value={formData.matriz_id}
                    onChange={(e) => setFormData({...formData, matriz_id: e.target.value})}
                    className="w-full px-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white"
                  >
                    <option value="">Selecione a matriz...</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.razao_social} ({emp.cnpj})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-2">Filiais</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 bg-[#0C0C0C] rounded-lg p-3 border border-[#2A2A2A]">
                    {empresas
                      .filter(emp => emp.id !== formData.matriz_id)
                      .map(emp => (
                        <label 
                          key={emp.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[#1A1A1A] ${
                            formData.filiais_ids.includes(emp.id) ? 'bg-[#C8A951]/10 border border-[#C8A951]/30' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.filiais_ids.includes(emp.id)}
                            onChange={() => toggleFilial(emp.id)}
                            className="w-4 h-4 rounded border-[#2A2A2A] bg-[#0C0C0C]"
                          />
                          <div>
                            <p className="text-white text-sm">{emp.razao_social}</p>
                            <p className="text-xs text-[#A1A1AA]">{emp.cnpj} • {emp.uf}</p>
                          </div>
                        </label>
                      ))
                    }
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    {formData.filiais_ids.length} filial(is) selecionada(s)
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A]"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingGrupo ? handleUpdate : handleCreate}
                  className="px-4 py-2 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#b39642]"
                >
                  {editingGrupo ? 'Salvar Alterações' : 'Criar Grupo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal do Consolidado */}
        {showConsolidado && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#141414] rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#2A2A2A]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  Dashboard Consolidado - {consolidadoData?.grupo_nome}
                </h2>
                <button onClick={() => setShowConsolidado(false)} className="text-[#A1A1AA] hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {loadingConsolidado ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C8A951]"></div>
                </div>
              ) : consolidadoData && (
                <div className="space-y-6">
                  {/* Cards de Resumo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-[#A1A1AA]">Empresas</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{consolidadoData.total_empresas}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-[#A1A1AA]">Total Entradas</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{formatCurrency(consolidadoData.resumo?.total_entradas)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-[#A1A1AA]">Total Saídas</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{formatCurrency(consolidadoData.resumo?.total_saidas)}</p>
                    </div>
                    <div className="bg-[#0C0C0C] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-[#C8A951]" />
                        <span className="text-sm text-[#A1A1AA]">Total Impostos</span>
                      </div>
                      <p className="text-2xl font-bold text-[#C8A951]">{formatCurrency(consolidadoData.total_impostos)}</p>
                    </div>
                  </div>
                  
                  {/* Tabela por Empresa */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Detalhamento por Empresa</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[#A1A1AA] bg-[#0C0C0C]">
                            <th className="text-left px-4 py-2">Empresa</th>
                            <th className="text-right px-4 py-2">Entradas</th>
                            <th className="text-right px-4 py-2">Saídas</th>
                            <th className="text-right px-4 py-2">ICMS Débito</th>
                            <th className="text-right px-4 py-2">ICMS Crédito</th>
                            <th className="text-right px-4 py-2">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consolidadoData.empresas?.map((emp, idx) => (
                            <tr key={idx} className="border-b border-[#2A2A2A]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {emp.is_matriz && (
                                    <span className="px-1.5 py-0.5 bg-[#C8A951]/20 text-[#C8A951] text-xs rounded">
                                      MATRIZ
                                    </span>
                                  )}
                                  <span className="text-white">{emp.razao_social}</span>
                                </div>
                                <p className="text-xs text-[#A1A1AA]">{emp.cnpj}</p>
                              </td>
                              <td className="px-4 py-3 text-right text-green-400">{formatCurrency(emp.entradas)}</td>
                              <td className="px-4 py-3 text-right text-red-400">{formatCurrency(emp.saidas)}</td>
                              <td className="px-4 py-3 text-right text-white">{formatCurrency(emp.icms_debito)}</td>
                              <td className="px-4 py-3 text-right text-white">{formatCurrency(emp.icms_credito)}</td>
                              <td className={`px-4 py-3 text-right font-medium ${emp.icms_saldo >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatCurrency(emp.icms_saldo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#0C0C0C] font-semibold">
                            <td className="px-4 py-3 text-white">TOTAL CONSOLIDADO</td>
                            <td className="px-4 py-3 text-right text-green-400">{formatCurrency(consolidadoData.resumo?.total_entradas)}</td>
                            <td className="px-4 py-3 text-right text-red-400">{formatCurrency(consolidadoData.resumo?.total_saidas)}</td>
                            <td className="px-4 py-3 text-right text-white">{formatCurrency(consolidadoData.icms?.debito)}</td>
                            <td className="px-4 py-3 text-right text-white">{formatCurrency(consolidadoData.icms?.credito)}</td>
                            <td className={`px-4 py-3 text-right ${consolidadoData.icms?.saldo >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {formatCurrency(consolidadoData.icms?.saldo)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default GruposEmpresariais;
