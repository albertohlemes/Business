import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  FileText, Download, Building2, User, DollarSign, AlertTriangle,
  Search, RefreshCw, FileSpreadsheet, Loader2, ArrowRight, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImpostosRetidos = ({ user, onLogout }) => {
  const { selectedCompany: ctxCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tomados'); // 'tomados' ou 'prestados'
  const [searchTerm, setSearchTerm] = useState('');

  // Determinar se a empresa tem atividade de serviços
  const temAtividadeServicos = ctxCompany?.tipo_atividade === 'servicos' || ctxCompany?.tipo_atividade === 'mista';

  useEffect(() => {
    if (ctxCompany?.id && selectedCompetencia) {
      fetchDados();
    }
  }, [ctxCompany?.id, selectedCompetencia]);

  const fetchDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/impostos-retidos/${ctxCompany.id}?competencia=${selectedCompetencia}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDados(response.data);
    } catch (err) {
      console.error('Erro ao buscar impostos retidos:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Filtrar detalhes por termo de busca
  const filtrarDetalhes = (detalhes) => {
    if (!searchTerm) return detalhes;
    const term = searchTerm.toLowerCase();
    return detalhes.filter(item => 
      item.numero_nf?.toLowerCase().includes(term) ||
      item.prestador?.toLowerCase().includes(term) ||
      item.tomador?.toLowerCase().includes(term) ||
      item.cnpj?.includes(term)
    );
  };

  // Exportar para Excel
  const exportarExcel = () => {
    if (!dados) return;
    
    const dadosTomados = dados.servicos_tomados?.detalhes?.map(item => ({
      'Número NF': item.numero_nf,
      'Data Emissão': formatDate(item.data_emissao),
      'Prestador': item.prestador,
      'CNPJ': item.cnpj,
      'Valor Serviços': item.valor_servicos,
      'ISS Retido': item.retencoes?.iss || 0,
      'IR Retido': item.retencoes?.ir || 0,
      'PIS Retido': item.retencoes?.pis || 0,
      'COFINS Retido': item.retencoes?.cofins || 0,
      'CSLL Retido': item.retencoes?.csll || 0,
      'INSS Retido': item.retencoes?.inss || 0,
      'Total Retido': item.total_retido
    })) || [];
    
    const dadosPrestados = dados.servicos_prestados?.detalhes?.map(item => ({
      'Número NF': item.numero_nf,
      'Data Emissão': formatDate(item.data_emissao),
      'Tomador': item.tomador,
      'CNPJ': item.cnpj,
      'Valor Serviços': item.valor_servicos,
      'ISS Retido': item.retencoes?.iss || 0,
      'IR Retido': item.retencoes?.ir || 0,
      'PIS Retido': item.retencoes?.pis || 0,
      'COFINS Retido': item.retencoes?.cofins || 0,
      'CSLL Retido': item.retencoes?.csll || 0,
      'INSS Retido': item.retencoes?.inss || 0,
      'Total Retido': item.total_retido
    })) || [];
    
    const wb = XLSX.utils.book_new();
    
    if (dadosTomados.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(dadosTomados);
      XLSX.utils.book_append_sheet(wb, ws1, 'Serviços Tomados');
    }
    
    if (temAtividadeServicos && dadosPrestados.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(dadosPrestados);
      XLSX.utils.book_append_sheet(wb, ws2, 'Serviços Prestados');
    }
    
    // Resumo
    const resumo = [
      { 'Descrição': 'Total Retido como Tomador', 'Valor': dados.resumo?.total_retido_como_tomador || 0 },
      { 'Descrição': 'Total Retido como Prestador', 'Valor': dados.resumo?.total_retido_como_prestador || 0 },
      { 'Descrição': 'Líquido', 'Valor': dados.resumo?.liquido || 0 }
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    
    XLSX.writeFile(wb, `impostos_retidos_${ctxCompany?.razao_social?.substring(0, 20)}_${selectedCompetencia?.replace('/', '-')}.xlsx`);
  };

  // Componente de Card de Imposto
  const ImpostoCard = ({ label, valor, color = 'blue' }) => {
    if (!valor || valor === 0) return null;
    const colors = {
      blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      green: 'bg-green-500/10 border-green-500/30 text-green-400',
      amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      red: 'bg-red-500/10 border-red-500/30 text-red-400'
    };
    return (
      <div className={`rounded-lg p-3 border ${colors[color]}`}>
        <p className="text-xs text-[#A1A1AA]">{label}</p>
        <p className={`text-lg font-bold ${colors[color].split(' ')[2]}`}>{formatCurrency(valor)}</p>
      </div>
    );
  };

  // Componente de Tabela de Detalhes
  const TabelaDetalhes = ({ detalhes, tipo }) => {
    const detalhesFiltrados = filtrarDetalhes(detalhes || []);
    
    if (detalhesFiltrados.length === 0) {
      return (
        <div className="text-center py-8 text-[#A1A1AA]">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum documento com retenção encontrado</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">NF</th>
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Data</th>
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">{tipo === 'tomados' ? 'Prestador' : 'Tomador'}</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Serviços</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ISS</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">IR</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">PIS</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">COFINS</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">CSLL</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">INSS</th>
              <th className="text-right py-3 px-4 text-[#C8A951] font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {detalhesFiltrados.map((item, idx) => (
              <tr key={idx} className="border-b border-[#2A2A2A]/50 hover:bg-white/5">
                <td className="py-3 px-4 text-white font-medium">{item.numero_nf}</td>
                <td className="py-3 px-4 text-[#A1A1AA]">{formatDate(item.data_emissao)}</td>
                <td className="py-3 px-4">
                  <p className="text-white truncate max-w-[200px]">{item.prestador || item.tomador || '-'}</p>
                  <p className="text-xs text-[#666]">{item.cnpj || '-'}</p>
                </td>
                <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_servicos)}</td>
                <td className="py-3 px-4 text-right text-blue-400">{item.retencoes?.iss > 0 ? formatCurrency(item.retencoes.iss) : '-'}</td>
                <td className="py-3 px-4 text-right text-green-400">{item.retencoes?.ir > 0 ? formatCurrency(item.retencoes.ir) : '-'}</td>
                <td className="py-3 px-4 text-right text-purple-400">{item.retencoes?.pis > 0 ? formatCurrency(item.retencoes.pis) : '-'}</td>
                <td className="py-3 px-4 text-right text-amber-400">{item.retencoes?.cofins > 0 ? formatCurrency(item.retencoes.cofins) : '-'}</td>
                <td className="py-3 px-4 text-right text-cyan-400">{item.retencoes?.csll > 0 ? formatCurrency(item.retencoes.csll) : '-'}</td>
                <td className="py-3 px-4 text-right text-red-400">{item.retencoes?.inss > 0 ? formatCurrency(item.retencoes.inss) : '-'}</td>
                <td className="py-3 px-4 text-right text-[#C8A951] font-bold">{formatCurrency(item.total_retido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!ctxCompany) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-[#C8A951] mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-white mb-2">Selecione uma Empresa</h2>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar os impostos retidos</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <DollarSign className="w-7 h-7 text-[#C8A951]" />
              Impostos Retidos
            </h1>
            <p className="text-[#A1A1AA] mt-1">
              {ctxCompany.razao_social} • Competência {selectedCompetencia}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDados}
              disabled={loading}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            
            <button
              onClick={exportarExcel}
              disabled={!dados || loading}
              className="px-4 py-2 bg-[#C8A951] text-black rounded-lg hover:bg-[#D4B85C] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-[#C8A951] animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        {dados && !loading && (
          <>
            {/* Resumo Geral */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A] p-6">
              <h2 className="text-white font-medium mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#C8A951]" />
                Resumo da Competência
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-sm text-amber-300">Retido como Tomador</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(dados.resumo?.total_retido_como_tomador)}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Obrigação de recolhimento
                  </p>
                </div>
                
                {temAtividadeServicos && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300">Retido como Prestador</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatCurrency(dados.resumo?.total_retido_como_prestador)}
                    </p>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Já retido na fonte
                    </p>
                  </div>
                )}
                
                <div className={`rounded-lg p-4 border ${
                  (dados.resumo?.liquido || 0) > 0 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-green-500/10 border-green-500/30'
                }`}>
                  <p className={`text-sm ${(dados.resumo?.liquido || 0) > 0 ? 'text-red-300' : 'text-green-300'}`}>
                    Líquido
                  </p>
                  <p className={`text-2xl font-bold ${(dados.resumo?.liquido || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(Math.abs(dados.resumo?.liquido || 0))}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    {(dados.resumo?.liquido || 0) > 0 ? 'A recolher' : 'Já compensado'}
                  </p>
                </div>
              </div>
              
              {dados.resumo?.orientacao && (
                <div className="mt-4 p-3 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg">
                  <p className="text-sm text-[#A1A1AA]">{dados.resumo.orientacao}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-[#141414] rounded-lg border border-[#2A2A2A]">
              <div className="flex border-b border-[#2A2A2A]">
                <button
                  onClick={() => setActiveTab('tomados')}
                  className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
                    activeTab === 'tomados'
                      ? 'text-[#C8A951] border-b-2 border-[#C8A951] bg-[#C8A951]/5'
                      : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-5 h-5" />
                    Serviços Tomados
                    {dados.servicos_tomados?.qtd_documentos > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                        {dados.servicos_tomados.qtd_documentos}
                      </span>
                    )}
                  </div>
                </button>
                
                {temAtividadeServicos && (
                  <button
                    onClick={() => setActiveTab('prestados')}
                    className={`flex-1 py-4 px-6 text-center font-medium transition-all ${
                      activeTab === 'prestados'
                        ? 'text-[#C8A951] border-b-2 border-[#C8A951] bg-[#C8A951]/5'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Serviços Prestados
                      {dados.servicos_prestados?.qtd_documentos > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {dados.servicos_prestados.qtd_documentos}
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>

              {/* Content Area */}
              <div className="p-6">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                    <input
                      type="text"
                      placeholder="Buscar por NF, prestador, tomador ou CNPJ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#C8A951]"
                    />
                  </div>
                </div>

                {/* Cards de Totais por Imposto */}
                {activeTab === 'tomados' && dados.servicos_tomados && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                      <ImpostoCard label="ISS" valor={dados.servicos_tomados.retencoes?.iss} color="blue" />
                      <ImpostoCard label="IR" valor={dados.servicos_tomados.retencoes?.ir} color="green" />
                      <ImpostoCard label="PIS" valor={dados.servicos_tomados.retencoes?.pis} color="purple" />
                      <ImpostoCard label="COFINS" valor={dados.servicos_tomados.retencoes?.cofins} color="amber" />
                      <ImpostoCard label="CSLL" valor={dados.servicos_tomados.retencoes?.csll} color="cyan" />
                      <ImpostoCard label="INSS" valor={dados.servicos_tomados.retencoes?.inss} color="red" />
                    </div>
                    <TabelaDetalhes detalhes={dados.servicos_tomados.detalhes} tipo="tomados" />
                  </>
                )}

                {activeTab === 'prestados' && temAtividadeServicos && dados.servicos_prestados && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                      <ImpostoCard label="ISS" valor={dados.servicos_prestados.retencoes?.iss} color="blue" />
                      <ImpostoCard label="IR" valor={dados.servicos_prestados.retencoes?.ir} color="green" />
                      <ImpostoCard label="PIS" valor={dados.servicos_prestados.retencoes?.pis} color="purple" />
                      <ImpostoCard label="COFINS" valor={dados.servicos_prestados.retencoes?.cofins} color="amber" />
                      <ImpostoCard label="CSLL" valor={dados.servicos_prestados.retencoes?.csll} color="cyan" />
                      <ImpostoCard label="INSS" valor={dados.servicos_prestados.retencoes?.inss} color="red" />
                    </div>
                    <TabelaDetalhes detalhes={dados.servicos_prestados.detalhes} tipo="prestados" />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default ImpostosRetidos;
