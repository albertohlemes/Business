import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  TrendingUp, TrendingDown, DollarSign, FileText,
  ChevronDown, ChevronUp, Download, RefreshCw, 
  Building2, Package, Hash, BarChart3, ArrowRight,
  ArrowLeftRight, Minus, Factory, ArrowUp, ArrowDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ApuracaoIPI = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    entradas: true,
    saidas: true
  });

  const fetchData = useCallback(async () => {
    if (!selectedCompany?.id || !selectedCompetencia) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/apuracao-ipi/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
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

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Card de Resumo
  const ResumoCard = ({ titulo, valor, subtitulo, icon: Icon, corIcone = 'bg-[#C8A951]', corValor = 'text-white' }) => (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`${corIcone} p-2 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[#A1A1AA] text-sm">{titulo}</p>
          <p className={`text-xl font-bold ${corValor}`}>{formatCurrency(valor)}</p>
          {subtitulo && <p className="text-xs text-[#666]">{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  // Tabela de CFOP
  const TabelaCFOP = ({ dados, tipo }) => {
    if (!dados || dados.length === 0) {
      return (
        <div className="text-center py-8 text-[#666]">
          Nenhum registro encontrado
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A2A2A]">
              <th className="text-left py-3 px-4 text-[#A1A1AA] font-medium">CFOP</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Qtd</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor Total</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">BC IPI</th>
              <th className="text-right py-3 px-4 text-[#A1A1AA] font-medium">Valor IPI</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((item, idx) => (
              <tr key={idx} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A]">
                <td className="py-3 px-4">
                  <span className="font-mono text-white bg-[#2A2A2A] px-2 py-1 rounded">
                    {item.cfop}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-[#A1A1AA]">{formatNumber(item.qtd)}</td>
                <td className="py-3 px-4 text-right text-white">{formatCurrency(item.valor_total)}</td>
                <td className="py-3 px-4 text-right text-white">{formatCurrency(item.bc_ipi)}</td>
                <td className={`py-3 px-4 text-right font-semibold ${tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(item.valor_ipi)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Card Top 10
  const Top10Card = ({ titulo, dados, tipo, icon: Icon }) => {
    const [expanded, setExpanded] = useState(false);
    const isCredito = tipo === 'credito';
    
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`${isCredito ? 'bg-green-600' : 'bg-red-600'} p-2 rounded-lg`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">{titulo}</span>
            {dados?.length > 0 && (
              <span className="bg-[#2A2A2A] text-[#A1A1AA] text-xs px-2 py-0.5 rounded-full">
                {dados.length} item(s)
              </span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
        </button>
        
        {expanded && (
          <div className="border-t border-[#2A2A2A] p-4">
            {dados?.length > 0 ? (
              <div className="space-y-2">
                {dados.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#0C0C0C] rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#C8A951] font-bold text-sm">#{idx + 1}</span>
                        <span className="text-white text-sm truncate">{item.descricao || item.ncm}</span>
                      </div>
                      {item.ncm && item.descricao && (
                        <span className="text-xs text-[#666] font-mono">NCM: {item.ncm}</span>
                      )}
                      {item.produtos && (
                        <span className="text-xs text-[#666]">Ex: {item.produtos.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-bold ${isCredito ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(item.valor_ipi)}
                      </p>
                      <p className="text-xs text-[#666]">{item.qtd} ocorrência(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#666] py-4">Nenhum registro encontrado</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render principal
  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Factory className="w-7 h-7 text-[#C8A951]" />
              Apuração IPI
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-1">
              Imposto sobre Produtos Industrializados
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
              <Factory className="w-8 h-8 text-[#C8A951]" />
              <div className="flex-1">
                <h2 className="text-white font-semibold">{selectedCompany.razao_social}</h2>
                <p className="text-[#A1A1AA] text-sm">
                  CNPJ: {selectedCompany.cnpj} | Competência: {selectedCompetencia} | 
                  Tipo: <span className="text-[#C8A951]">{selectedCompany.tipo_atividade || 'N/D'}</span>
                  {selectedCompany.equiparado_industria && (
                    <span className="ml-2 bg-amber-600/20 text-amber-400 text-xs px-2 py-0.5 rounded">EQUIPARADO A INDÚSTRIA</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        {!selectedCompany ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Factory className="w-16 h-16 text-[#666] mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Selecione uma empresa</h3>
            <p className="text-[#A1A1AA]">Escolha uma empresa para visualizar a apuração de IPI</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#C8A951] animate-spin" />
          </div>
        ) : dados ? (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ResumoCard
                titulo="Crédito IPI"
                valor={dados.apuracao?.credito_ipi}
                subtitulo={`${dados.entradas?.totais?.qtd_documentos || 0} doc(s) | ${dados.entradas?.totais?.qtd_itens || 0} item(s)`}
                icon={TrendingUp}
                corIcone="bg-green-600"
                corValor="text-green-400"
              />
              <ResumoCard
                titulo="Débito IPI"
                valor={dados.apuracao?.debito_ipi}
                subtitulo={`${dados.saidas?.totais?.qtd_documentos || 0} doc(s) | ${dados.saidas?.totais?.qtd_itens || 0} item(s)`}
                icon={TrendingDown}
                corIcone="bg-red-600"
                corValor="text-red-400"
              />
              <ResumoCard
                titulo="Saldo"
                valor={Math.abs(dados.apuracao?.saldo || 0)}
                subtitulo={dados.apuracao?.situacao === 'A_PAGAR' ? 'Imposto a pagar' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'Crédito a recuperar' : 'Zerado'}
                icon={ArrowLeftRight}
                corIcone="bg-blue-600"
                corValor={dados.apuracao?.situacao === 'A_PAGAR' ? 'text-red-400' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'text-green-400' : 'text-white'}
              />
              <div className={`rounded-xl p-4 border-2 ${
                dados.apuracao?.situacao === 'A_PAGAR' 
                  ? 'bg-red-500/10 border-red-500/50' 
                  : dados.apuracao?.situacao === 'A_RECUPERAR'
                  ? 'bg-green-500/10 border-green-500/50'
                  : 'bg-[#141414] border-[#2A2A2A]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    dados.apuracao?.situacao === 'A_PAGAR' 
                      ? 'bg-red-600' 
                      : dados.apuracao?.situacao === 'A_RECUPERAR'
                      ? 'bg-green-600'
                      : 'bg-[#C8A951]'
                  }`}>
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.apuracao?.situacao === 'A_PAGAR' ? 'IPI a Pagar' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'IPI a Recuperar' : 'Situação'}
                    </p>
                    <p className={`text-xl font-bold ${
                      dados.apuracao?.situacao === 'A_PAGAR' 
                        ? 'text-red-400' 
                        : dados.apuracao?.situacao === 'A_RECUPERAR'
                        ? 'text-green-400'
                        : 'text-white'
                    }`}>
                      {formatCurrency(Math.abs(dados.apuracao?.saldo || 0))}
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
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30 min-w-[180px]">
                  <p className="text-green-400 text-2xl font-bold">{formatCurrency(dados.apuracao?.credito_ipi)}</p>
                  <p className="text-[#A1A1AA] text-sm">Crédito (Entradas)</p>
                </div>
                <Minus className="w-6 h-6 text-[#666]" />
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30 min-w-[180px]">
                  <p className="text-red-400 text-2xl font-bold">{formatCurrency(dados.apuracao?.debito_ipi)}</p>
                  <p className="text-[#A1A1AA] text-sm">Débito (Saídas)</p>
                </div>
                <ArrowRight className="w-6 h-6 text-[#C8A951]" />
                <div className={`text-center p-4 rounded-lg border min-w-[180px] ${
                  dados.apuracao?.situacao === 'A_PAGAR' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : dados.apuracao?.situacao === 'A_RECUPERAR'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-[#2A2A2A] border-[#333]'
                }`}>
                  <p className={`text-2xl font-bold ${
                    dados.apuracao?.situacao === 'A_PAGAR' 
                      ? 'text-red-400' 
                      : dados.apuracao?.situacao === 'A_RECUPERAR'
                      ? 'text-green-400'
                      : 'text-white'
                  }`}>
                    {dados.apuracao?.situacao === 'A_RECUPERAR' ? '(' : ''}{formatCurrency(Math.abs(dados.apuracao?.saldo || 0))}{dados.apuracao?.situacao === 'A_RECUPERAR' ? ')' : ''}
                  </p>
                  <p className="text-[#A1A1AA] text-sm">
                    {dados.apuracao?.situacao === 'A_PAGAR' ? 'A Pagar' : dados.apuracao?.situacao === 'A_RECUPERAR' ? 'A Recuperar' : 'Zerado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seção de Entradas */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('entradas')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                data-testid="toggle-entradas"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-semibold">ENTRADAS (Créditos)</span>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.entradas?.totais?.qtd_documentos || 0} documentos | {dados.entradas?.totais?.qtd_itens || 0} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{formatCurrency(dados.entradas?.totais?.valor_ipi)}</p>
                    <p className="text-[#666] text-xs">BC: {formatCurrency(dados.entradas?.totais?.bc_ipi)}</p>
                  </div>
                  {expandedSections.entradas ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
                </div>
              </button>
              {expandedSections.entradas && (
                <div className="border-t border-[#2A2A2A]">
                  <TabelaCFOP dados={dados.entradas?.por_cfop} tipo="entrada" />
                  <div className="bg-[#0C0C0C] p-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">TOTAL ENTRADAS</span>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Valor Total</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.entradas?.totais?.valor_total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">BC IPI</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.entradas?.totais?.bc_ipi)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Crédito IPI</p>
                          <p className="text-green-400 font-bold text-lg">{formatCurrency(dados.entradas?.totais?.valor_ipi)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Saídas */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('saidas')}
                className="w-full p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors"
                data-testid="toggle-saidas"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 p-2 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white font-semibold">SAÍDAS (Débitos)</span>
                    <p className="text-[#A1A1AA] text-sm">
                      {dados.saidas?.totais?.qtd_documentos || 0} documentos | {dados.saidas?.totais?.qtd_itens || 0} itens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{formatCurrency(dados.saidas?.totais?.valor_ipi)}</p>
                    <p className="text-[#666] text-xs">BC: {formatCurrency(dados.saidas?.totais?.bc_ipi)}</p>
                  </div>
                  {expandedSections.saidas ? <ChevronUp className="w-5 h-5 text-[#666]" /> : <ChevronDown className="w-5 h-5 text-[#666]" />}
                </div>
              </button>
              {expandedSections.saidas && (
                <div className="border-t border-[#2A2A2A]">
                  <TabelaCFOP dados={dados.saidas?.por_cfop} tipo="saida" />
                  <div className="bg-[#0C0C0C] p-4 border-t border-[#2A2A2A]">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">TOTAL SAÍDAS</span>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Valor Total</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.saidas?.totais?.valor_total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">BC IPI</p>
                          <p className="text-white font-semibold">{formatCurrency(dados.saidas?.totais?.bc_ipi)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#666] text-xs">Débito IPI</p>
                          <p className="text-red-400 font-bold text-lg">{formatCurrency(dados.saidas?.totais?.valor_ipi)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top 10 Rankings */}
            <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#C8A951]" />
                Rankings - Maiores Geradores de IPI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Top10Card
                  titulo="Top 10 Produtos - Crédito"
                  dados={dados.top_10?.produtos_credito}
                  tipo="credito"
                  icon={Package}
                />
                <Top10Card
                  titulo="Top 10 Produtos - Débito"
                  dados={dados.top_10?.produtos_debito}
                  tipo="debito"
                  icon={Package}
                />
                <Top10Card
                  titulo="Top 10 NCMs - Crédito"
                  dados={dados.top_10?.ncms_credito}
                  tipo="credito"
                  icon={Hash}
                />
                <Top10Card
                  titulo="Top 10 NCMs - Débito"
                  dados={dados.top_10?.ncms_debito}
                  tipo="debito"
                  icon={Hash}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoIPI;
