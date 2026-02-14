import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Calculator, CheckCircle, XCircle, Lock, Unlock, Download,
  TrendingUp, TrendingDown, FileText, Calendar, AlertTriangle,
  DollarSign, Building2, Clock, ChevronDown, ChevronUp
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const FechamentoMensal = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [historico, setHistorico] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchData();
      fetchHistorico();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchData = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/fechamento-mensal/${selectedCompany.id}?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
      setObservacoes(response.data.observacoes || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async () => {
    if (!selectedCompany) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/fechamento-mensal/${selectedCompany.id}/historico`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistorico(response.data.fechamentos || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const handleFechar = async () => {
    if (!window.confirm(`Confirma o fechamento da competência ${selectedCompetencia}?\n\nApós o fechamento, alterações em documentos desta competência serão bloqueadas.`)) {
      return;
    }
    
    setFechando(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/fechamento-mensal/${selectedCompany.id}`,
        { competencia: selectedCompetencia, observacoes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
      await fetchHistorico();
      alert('Competência fechada com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao fechar competência');
    } finally {
      setFechando(false);
    }
  };

  const handleReabrir = async () => {
    if (!window.confirm(`Confirma a reabertura da competência ${selectedCompetencia}?\n\nIsso permitirá novas alterações em documentos.`)) {
      return;
    }
    
    setReabrindo(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/fechamento-mensal/${selectedCompany.id}/${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
      await fetchHistorico();
      alert('Competência reaberta com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao reabrir competência');
    } finally {
      setReabrindo(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (!selectedCompany || !selectedCompetencia) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[#A1A1AA]">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Selecione uma empresa e competência para visualizar o fechamento mensal</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="fechamento-mensal-page" className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-white">Fechamento Mensal</h1>
            <p className="text-[#A1A1AA]">
              {selectedCompany?.razao_social} • {selectedCompetencia}
            </p>
          </div>
          
          {data && (
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              data.status === 'fechado' 
                ? 'bg-green-900/30 border border-green-700 text-green-400' 
                : 'bg-yellow-900/30 border border-yellow-700 text-yellow-400'
            }`}>
              {data.status === 'fechado' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              <span className="font-medium">
                {data.status === 'fechado' ? 'Competência Fechada' : 'Competência Aberta'}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#C8A951]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400">
            {error}
          </div>
        ) : data && (
          <>
            {/* Resumo de Documentos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">Total Documentos</p>
                    <p className="text-xl font-bold text-white">{data.resumo?.qtd_documentos || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">Total Entradas</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(data.resumo?.total_entradas)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-900/30 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">Total Saídas</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(data.resumo?.total_saidas)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#141414] rounded-xl p-4 border border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#C8A951]/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-[#C8A951]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#A1A1AA]">Total Impostos</p>
                    <p className="text-xl font-bold text-[#C8A951]">{formatCurrency(data.total_impostos?.a_pagar)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de Impostos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ICMS */}
              <div className="bg-[#141414] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-400" />
                    ICMS
                  </h3>
                  {data.icms?.a_pagar > 0 ? (
                    <span className="text-red-400 text-sm">A Pagar</span>
                  ) : (
                    <span className="text-green-400 text-sm">Crédito</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Débito</span>
                    <span className="text-white">{formatCurrency(data.icms?.debito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Crédito</span>
                    <span className="text-white">{formatCurrency(data.icms?.credito)}</span>
                  </div>
                  <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-semibold">
                    <span className="text-[#A1A1AA]">Saldo</span>
                    <span className={data.icms?.saldo >= 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatCurrency(data.icms?.saldo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* PIS */}
              <div className="bg-[#141414] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-slate-400" />
                    PIS
                  </h3>
                  {data.pis?.a_pagar > 0 ? (
                    <span className="text-red-400 text-sm">A Pagar</span>
                  ) : (
                    <span className="text-green-400 text-sm">Crédito</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Débito</span>
                    <span className="text-white">{formatCurrency(data.pis?.debito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Crédito</span>
                    <span className="text-white">{formatCurrency(data.pis?.credito)}</span>
                  </div>
                  <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-semibold">
                    <span className="text-[#A1A1AA]">Saldo</span>
                    <span className={data.pis?.saldo >= 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatCurrency(data.pis?.saldo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* COFINS */}
              <div className="bg-[#141414] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-orange-400" />
                    COFINS
                  </h3>
                  {data.cofins?.a_pagar > 0 ? (
                    <span className="text-red-400 text-sm">A Pagar</span>
                  ) : (
                    <span className="text-green-400 text-sm">Crédito</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Débito</span>
                    <span className="text-white">{formatCurrency(data.cofins?.debito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Crédito</span>
                    <span className="text-white">{formatCurrency(data.cofins?.credito)}</span>
                  </div>
                  <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-semibold">
                    <span className="text-[#A1A1AA]">Saldo</span>
                    <span className={data.cofins?.saldo >= 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatCurrency(data.cofins?.saldo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ISS */}
              {data.tipo_atividade !== 'comercio' && (
                <div className="bg-[#141414] rounded-xl p-5 border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-teal-400" />
                      ISS
                    </h3>
                    <span className="text-red-400 text-sm">A Pagar</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#A1A1AA]">Total</span>
                      <span className="text-white">{formatCurrency(data.iss?.total)}</span>
                    </div>
                    <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-semibold">
                      <span className="text-[#A1A1AA]">A Pagar</span>
                      <span className="text-red-400">{formatCurrency(data.iss?.a_pagar)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* IPI */}
              <div className="bg-[#141414] rounded-xl p-5 border border-[#2A2A2A]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-pink-400" />
                    IPI
                  </h3>
                  {data.ipi?.a_pagar > 0 ? (
                    <span className="text-red-400 text-sm">A Pagar</span>
                  ) : (
                    <span className="text-green-400 text-sm">Crédito</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Débito</span>
                    <span className="text-white">{formatCurrency(data.ipi?.debito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A1A1AA]">Crédito</span>
                    <span className="text-white">{formatCurrency(data.ipi?.credito)}</span>
                  </div>
                  <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-semibold">
                    <span className="text-[#A1A1AA]">Saldo</span>
                    <span className={data.ipi?.saldo >= 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatCurrency(data.ipi?.saldo)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Consolidado */}
            <div className="bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/10 rounded-xl p-6 border border-[#C8A951]/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Total de Impostos a Pagar</h3>
                  <p className="text-[#A1A1AA] text-sm">Competência {selectedCompetencia}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-[#C8A951]">
                    {formatCurrency(data.total_impostos?.a_pagar)}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-[#A1A1AA]">
                    <span>ICMS: {formatCurrency(data.total_impostos?.icms)}</span>
                    <span>PIS: {formatCurrency(data.total_impostos?.pis)}</span>
                    <span>COFINS: {formatCurrency(data.total_impostos?.cofins)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações e Ações */}
            <div className="bg-[#141414] rounded-xl p-6 border border-[#2A2A2A]">
              <h3 className="text-lg font-semibold text-white mb-4">Observações do Fechamento</h3>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={data.status === 'fechado'}
                placeholder="Adicione observações sobre este fechamento..."
                className="w-full px-4 py-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white placeholder-[#A1A1AA] resize-none h-24 disabled:opacity-50"
              />
              
              <div className="flex justify-between items-center mt-4">
                {data.data_fechamento && (
                  <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                    <Clock className="w-4 h-4" />
                    <span>Fechado em: {new Date(data.data_fechamento).toLocaleString('pt-BR')}</span>
                  </div>
                )}
                
                <div className="flex gap-3">
                  {data.status === 'fechado' ? (
                    <button
                      onClick={handleReabrir}
                      disabled={reabrindo || user?.role === 'operacional'}
                      className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {reabrindo ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      Reabrir Competência
                    </button>
                  ) : (
                    <button
                      onClick={handleFechar}
                      disabled={fechando}
                      className="px-6 py-2 bg-[#C8A951] hover:bg-[#b39642] text-black rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      {fechando ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      Fechar Competência
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Histórico de Fechamentos */}
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A]">
              <button
                onClick={() => setShowHistorico(!showHistorico)}
                className="w-full px-6 py-4 flex items-center justify-between text-white hover:bg-[#1A1A1A]"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#C8A951]" />
                  Histórico de Fechamentos ({historico.length})
                </h3>
                {showHistorico ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {showHistorico && historico.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#A1A1AA] border-b border-[#2A2A2A]">
                          <th className="text-left py-2">Competência</th>
                          <th className="text-right py-2">ICMS</th>
                          <th className="text-right py-2">PIS</th>
                          <th className="text-right py-2">COFINS</th>
                          <th className="text-right py-2">Total</th>
                          <th className="text-left py-2">Data</th>
                          <th className="text-left py-2">Usuário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historico.map((item, idx) => (
                          <tr key={idx} className="border-b border-[#2A2A2A] text-white">
                            <td className="py-2 font-medium">{item.competencia}</td>
                            <td className="py-2 text-right">{formatCurrency(item.total_impostos?.icms)}</td>
                            <td className="py-2 text-right">{formatCurrency(item.total_impostos?.pis)}</td>
                            <td className="py-2 text-right">{formatCurrency(item.total_impostos?.cofins)}</td>
                            <td className="py-2 text-right font-semibold text-[#C8A951]">
                              {formatCurrency(item.total_impostos?.a_pagar)}
                            </td>
                            <td className="py-2 text-[#A1A1AA]">
                              {new Date(item.data_fechamento).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-2 text-[#A1A1AA]">{item.usuario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default FechamentoMensal;
