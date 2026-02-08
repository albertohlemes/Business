import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  DollarSign, FileText, ChevronDown, ChevronUp,
  Download, RefreshCw, Building2, Users, 
  Briefcase, CreditCard, CheckCircle, AlertCircle,
  Percent
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ApuracaoISS = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    servicos: true,
    tomadores: false
  });

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/apuracao-iss/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDados(response.data);
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

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Card de Resumo
  const ResumoCard = ({ titulo, valor, subtitulo, icon: Icon, corIcone = 'bg-[#C8A951]', corValor = 'text-white', isPercent = false }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[#A1A1AA] text-sm">{titulo}</p>
          <p className={`text-xl font-bold ${corValor}`}>
            {isPercent ? formatPercent(valor) : formatCurrency(valor)}
          </p>
          {subtitulo && <p className="text-xs text-[#666]">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  // Render principal
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-[#C8A951]" />
              Apuração ISS
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Imposto sobre Serviços de Qualquer Natureza
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#333] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              data-testid="btn-atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              className="flex items-center gap-2 bg-[#C8A951] hover:bg-[#B8993D] text-black px-4 py-2 rounded-lg transition-colors font-medium"
              data-testid="btn-exportar"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Info da Empresa */}
        {selectedCompany && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-[#C8A951]" />
              <div className="flex-1">
                <h2 className="text-white font-semibold">{selectedCompany.razao_social}</h2>
                <p className="text-[#A1A1AA] text-sm">
                  CNPJ: {selectedCompany.cnpj} | Competência: {selectedCompetencia} | 
                  Município: <span className="text-[#C8A951]">{selectedCompany.municipio || 'N/D'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Building2 className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a apuração de ISS</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : dados ? (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <ResumoCard
                titulo="Serviços Prestados"
                valor={dados.resumo?.valor_servicos}
                subtitulo={`${dados.resumo?.qtd_notas || 0} nota(s)`}
                icon={Briefcase}
                corIcone="bg-blue-600"
                corValor="text-blue-400"
              />
              <ResumoCard
                titulo="Base de Cálculo"
                valor={dados.resumo?.base_calculo}
                icon={FileText}
                corIcone="bg-purple-600"
                corValor="text-purple-400"
              />
              <ResumoCard
                titulo="ISS Devido"
                valor={dados.resumo?.iss_devido}
                subtitulo={`Alíquota média: ${formatPercent(dados.resumo?.aliquota_media)}`}
                icon={DollarSign}
                corIcone="bg-amber-600"
                corValor="text-amber-400"
              />
              <ResumoCard
                titulo="ISS Retido"
                valor={dados.resumo?.iss_retido}
                subtitulo="Retenção na fonte"
                icon={CreditCard}
                corIcone="bg-green-600"
                corValor="text-green-400"
              />
              <div className={`rounded-xl p-4 border-2 ${
                dados.situacao === 'A_PAGAR' 
                  ? 'bg-red-500/10 border-red-500/50' 
                  : dados.situacao === 'COMPENSADO'
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-[#141414] border-[#2A2A2A]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    dados.situacao === 'A_PAGAR' 
                      ? 'bg-red-600' 
                      : dados.situacao === 'COMPENSADO'
                      ? 'bg-green-600'
                      : 'bg-[#C8A951]'
                  }`}>
                    {dados.situacao === 'A_PAGAR' ? (
                      <AlertCircle className="w-5 h-5 text-white" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">ISS a Pagar</p>
                    <p className={`text-xl font-bold ${
                      dados.situacao === 'A_PAGAR' 
                        ? 'text-red-400' 
                        : 'text-green-400'
                    }`}>
                      {formatCurrency(dados.resumo?.iss_a_pagar)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demonstrativo de Cálculo */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C8A951]" />
                Demonstrativo de Apuração
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                  <p className="text-[#A1A1AA] text-sm mb-1">Valor dos Serviços</p>
                  <p className="text-white text-2xl font-bold">{formatCurrency(dados.resumo?.valor_servicos)}</p>
                </div>
                <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                  <p className="text-[#A1A1AA] text-sm mb-1">ISS Devido</p>
                  <p className="text-amber-400 text-2xl font-bold">{formatCurrency(dados.resumo?.iss_devido)}</p>
                  <p className="text-[#666] text-xs mt-1 flex items-center justify-center gap-1">
                    <Percent className="w-3 h-3" />
                    Alíq. média: {formatPercent(dados.resumo?.aliquota_media)}
                  </p>
                </div>
                <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                  <p className="text-[#A1A1AA] text-sm mb-1">(-) ISS Retido</p>
                  <p className="text-green-400 text-2xl font-bold">{formatCurrency(dados.resumo?.iss_retido)}</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${
                  dados.situacao === 'A_PAGAR' 
                    ? 'bg-red-500/10' 
                    : 'bg-green-500/10'
                }`}>
                  <p className="text-[#A1A1AA] text-sm mb-1">(=) ISS a Pagar</p>
                  <p className={`text-2xl font-bold ${
                    dados.situacao === 'A_PAGAR' 
                      ? 'text-red-400' 
                      : 'text-green-400'
                  }`}>
                    {formatCurrency(dados.resumo?.iss_a_pagar)}
                  </p>
                </div>
              </div>
            </div>

            {/* Serviços por Código */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('servicos')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                data-testid="toggle-servicos"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-semibold">Serviços por Código</span>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.por_codigo_servico?.length || 0} código(s) de serviço
                    </p>
                  </div>
                </div>
                {expandedSections.servicos ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
              </button>
              {expandedSections.servicos && (
                <div className="border-t border-[#2A2A2A]">
                  {dados.por_codigo_servico?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Código</th>
                            <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Descrição</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Qtd</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Serviços</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">BC ISS</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ISS Devido</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ISS Retido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.por_codigo_servico.map((item, idx) => (
                            <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                              <td className="py-3 px-4">
                                <span className="font-mono text-white bg-[#2A2A2A] px-2 py-1 rounded text-sm">
                                  {item.codigo}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-white text-sm max-w-[200px] truncate">{item.descricao}</td>
                              <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.qtd}</td>
                              <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_servicos)}</td>
                              <td className="py-3 px-4 text-right text-white">{formatCurrency(item.bc_iss)}</td>
                              <td className="py-3 px-4 text-right text-amber-400 font-semibold">{formatCurrency(item.iss_devido)}</td>
                              <td className="py-3 px-4 text-right text-green-400">{formatCurrency(item.iss_retido)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[#666]">
                      Nenhum serviço encontrado nesta competência
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Serviços por Tomador */}
            {dados.por_tomador?.length > 0 && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('tomadores')}
                  className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                  data-testid="toggle-tomadores"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-white font-semibold">Serviços por Tomador</span>
                      <p className="text-[#A1A1AA] text-sm">
                        {dados.por_tomador?.length || 0} tomador(es)
                      </p>
                    </div>
                  </div>
                  {expandedSections.tomadores ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
                </button>
                {expandedSections.tomadores && (
                  <div className="border-t border-[#2A2A2A]">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2A2A2A]">
                            <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">Tomador</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Qtd</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Serviços</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ISS Devido</th>
                            <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">ISS Retido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dados.por_tomador.map((item, idx) => (
                            <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                              <td className="py-3 px-4 text-white text-sm max-w-[300px] truncate">{item.tomador}</td>
                              <td className="py-3 px-4 text-right text-[#A1A1AA]">{item.qtd}</td>
                              <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_servicos)}</td>
                              <td className="py-3 px-4 text-right text-amber-400 font-semibold">{formatCurrency(item.iss_devido)}</td>
                              <td className="py-3 px-4 text-right text-green-400">{formatCurrency(item.iss_retido)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mensagem quando não há dados */}
            {dados.resumo?.qtd_notas === 0 && (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
                <Briefcase className="w-12 h-12 text-[#666] mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg">Nenhum serviço encontrado</h3>
                <p className="text-[#A1A1AA]">
                  Não foram encontradas notas de serviço (NFSe) para esta competência.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoISS;
