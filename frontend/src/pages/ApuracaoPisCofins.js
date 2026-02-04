import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Receipt, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  FileText,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  ArrowRightLeft
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const ApuracaoPisCofins = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('cst'); // 'cfop', 'ncm' ou 'cst'
  const [expandedSections, setExpandedSections] = useState({
    creditoComCredito: true,
    creditoAliqZero: false,
    debitoComDebito: true,
    debitoAliqZero: false,
    transferenciasEntrada: false,
    transferenciasSaida: false
  });

  useEffect(() => {
    if (selectedCompany && selectedCompetencia) {
      fetchApuracao();
    }
  }, [selectedCompany, selectedCompetencia]);

  const fetchApuracao = async () => {
    if (!selectedCompany || !selectedCompetencia) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/apuracao-pis-cofins/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response.data);
    } catch (err) {
      console.error('Erro ao carregar apuração:', err);
      setError('Erro ao carregar dados da apuração');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportCSV = () => {
    if (!data) return;

    let csv = '\uFEFF'; // BOM UTF-8
    csv += 'APURAÇÃO PIS/COFINS - ' + data.empresa.razao_social + '\n';
    csv += 'Competência: ' + data.competencia + '\n';
    csv += 'Regime: ' + data.empresa.regime_tributario + '\n\n';
    
    // Créditos
    csv += 'CRÉDITOS - OPERAÇÕES COM DIREITO A CRÉDITO\n';
    csv += 'Código;Valor;PIS;COFINS;Qtd\n';
    const creditoItems = viewMode === 'cfop' ? data.creditos.com_credito.por_cfop : data.creditos.com_credito.por_ncm;
    creditoItems.forEach(item => {
      csv += `${item.codigo};${item.valor};${item.pis};${item.cofins};${item.qtd}\n`;
    });
    csv += `TOTAL;${data.creditos.com_credito.valor_operacoes};${data.creditos.com_credito.pis};${data.creditos.com_credito.cofins};\n\n`;
    
    // Créditos alíquota zero
    csv += 'CRÉDITOS - OPERAÇÕES ALÍQUOTA ZERO (SEM CRÉDITO)\n';
    csv += 'Código;Valor;Qtd\n';
    const creditoZeroItems = viewMode === 'cfop' ? data.creditos.aliquota_zero.por_cfop : data.creditos.aliquota_zero.por_ncm;
    creditoZeroItems.forEach(item => {
      csv += `${item.codigo};${item.valor};${item.qtd}\n`;
    });
    csv += `TOTAL;${data.creditos.aliquota_zero.valor_operacoes};\n\n`;
    
    // Débitos
    csv += 'DÉBITOS - OPERAÇÕES COM DÉBITO\n';
    csv += 'Código;Valor;PIS;COFINS;Qtd\n';
    const debitoItems = viewMode === 'cfop' ? data.debitos.com_debito.por_cfop : data.debitos.com_debito.por_ncm;
    debitoItems.forEach(item => {
      csv += `${item.codigo};${item.valor};${item.pis};${item.cofins};${item.qtd}\n`;
    });
    csv += `TOTAL;${data.debitos.com_debito.valor_operacoes};${data.debitos.com_debito.pis};${data.debitos.com_debito.cofins};\n\n`;
    
    // Apuração
    csv += 'APURAÇÃO\n';
    csv += `;Crédito;Débito;Saldo;A Pagar\n`;
    csv += `PIS;${data.apuracao.pis.credito};${data.apuracao.pis.debito};${data.apuracao.pis.saldo};${data.apuracao.pis.a_pagar}\n`;
    csv += `COFINS;${data.apuracao.cofins.credito};${data.apuracao.cofins.debito};${data.apuracao.cofins.saldo};${data.apuracao.cofins.a_pagar}\n`;
    csv += `TOTAL;;;${data.apuracao.total_a_pagar}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apuracao_pis_cofins_${data.competencia.replace('/', '-')}_${data.empresa.cnpj}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Componente de tabela
  const DataTable = ({ items, showTaxes = true, title }) => {
    const columnLabel = viewMode === 'cfop' ? 'CFOP' : viewMode === 'ncm' ? 'NCM' : 'CST';
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">{columnLabel}</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Valor</th>
              {showTaxes && (
                <>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">PIS</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">COFINS</th>
                </>
              )}
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Qtd</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={showTaxes ? 5 : 3} className="px-4 py-8 text-center text-gray-500">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{item.codigo}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.valor)}</td>
                  {showTaxes && (
                    <>
                      <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(item.pis)}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(item.cofins)}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right text-gray-500">{item.qtd}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Componente de seção expansível
  const ExpandableSection = ({ title, subtitle, icon: Icon, color, isExpanded, onToggle, children, badge }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between ${color} text-white`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6" />
          <div className="text-left">
            <h3 className="font-bold">{title}</h3>
            <p className="text-sm opacity-80">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {badge && (
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
              {badge}
            </span>
          )}
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </button>
      {isExpanded && <div className="p-4">{children}</div>}
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="apuracao-pis-cofins-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Receipt className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Apuração PIS/COFINS</h1>
                {selectedCompany ? (
                  <div>
                    <p className="text-blue-100">
                      {selectedCompany.razao_social} - Competência: {selectedCompetencia}
                    </p>
                    {data && (
                      <p className="text-sm text-blue-200">
                        Regime: {data.empresa.regime_tributario === 'lucro_real' ? 'Lucro Real (não-cumulativo)' : 'Lucro Presumido (cumulativo)'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-blue-100">Selecione uma empresa no header</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Toggle CST/CFOP/NCM */}
              {data && (
                <div className="bg-white/20 rounded-lg p-1 flex">
                  <button
                    onClick={() => setViewMode('cst')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'cst' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Por CST
                  </button>
                  <button
                    onClick={() => setViewMode('cfop')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'cfop' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Por CFOP
                  </button>
                  <button
                    onClick={() => setViewMode('ncm')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'ncm' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Por NCM
                  </button>
                </div>
              )}
              
              {data && (
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
              )}
            </div>
          </div>
        </div>

        {!selectedCompany ? (
          <div className="bg-yellow-50 rounded-xl p-8 text-center border border-yellow-200">
            <FileText className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-yellow-900 mb-2">Selecione uma Empresa</h3>
            <p className="text-yellow-700">
              Clique no botão "Selecionar Empresa" no header para escolher a empresa e competência.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando apuração...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-xl p-8 text-center border border-red-200">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchApuracao}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Resumo da Apuração */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
              <h2 className="text-lg font-bold mb-4">Resultado da Apuração</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PIS */}
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="text-blue-300 font-semibold mb-3">PIS</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Crédito:</span>
                      <span className="text-green-400 font-medium">{formatCurrency(data.apuracao.pis.credito)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Débito:</span>
                      <span className="text-red-400 font-medium">{formatCurrency(data.apuracao.pis.debito)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/20 pt-2">
                      <span className="text-white font-semibold">A Pagar:</span>
                      <span className={`font-bold ${data.apuracao.pis.a_pagar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(data.apuracao.pis.a_pagar)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* COFINS */}
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="text-purple-300 font-semibold mb-3">COFINS</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Crédito:</span>
                      <span className="text-green-400 font-medium">{formatCurrency(data.apuracao.cofins.credito)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Débito:</span>
                      <span className="text-red-400 font-medium">{formatCurrency(data.apuracao.cofins.debito)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/20 pt-2">
                      <span className="text-white font-semibold">A Pagar:</span>
                      <span className={`font-bold ${data.apuracao.cofins.a_pagar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(data.apuracao.cofins.a_pagar)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Total */}
              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                <span className="text-lg font-bold">Total PIS/COFINS a Pagar:</span>
                <span className={`text-2xl font-bold ${data.apuracao.total_a_pagar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(data.apuracao.total_a_pagar)}
                </span>
              </div>
            </div>

            {/* Alerta para Lucro Presumido */}
            {data.empresa.regime_tributario !== 'lucro_real' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Empresa do Lucro Presumido</h4>
                  <p className="text-sm text-amber-700">
                    No regime cumulativo (Lucro Presumido), não há direito a créditos de PIS/COFINS.
                    Os valores de crédito mostrados são apenas informativos.
                  </p>
                </div>
              </div>
            )}

            {/* CRÉDITOS */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowDownCircle className="w-6 h-6 text-blue-600" />
                Créditos (Entradas)
              </h2>
              
              {/* Operações com direito a crédito */}
              <ExpandableSection
                title={`Operações com Direito a Crédito (CST ${data.creditos.com_credito.cst})`}
                subtitle={`${(viewMode === 'cst' ? data.creditos.com_credito.por_cst : viewMode === 'cfop' ? data.creditos.com_credito.por_cfop : data.creditos.com_credito.por_ncm).length} registro(s)`}
                icon={CheckCircle}
                color="bg-green-600"
                isExpanded={expandedSections.creditoComCredito}
                onToggle={() => toggleSection('creditoComCredito')}
                badge={formatCurrency(data.creditos.com_credito.valor_operacoes)}
              >
                <div className="mb-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Valor Operações</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(data.creditos.com_credito.valor_operacoes)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-600">Crédito PIS</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(data.creditos.com_credito.pis)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm text-purple-600">Crédito COFINS</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(data.creditos.com_credito.cofins)}</p>
                  </div>
                </div>
                <DataTable 
                  items={viewMode === 'cst' ? data.creditos.com_credito.por_cst : viewMode === 'cfop' ? data.creditos.com_credito.por_cfop : data.creditos.com_credito.por_ncm}
                  showTaxes={true}
                />
              </ExpandableSection>
              
              {/* Operações sem crédito (alíquota zero) */}
              <ExpandableSection
                title={`Operações Alíquota Zero / Sem Crédito (CST ${data.creditos.aliquota_zero.cst})`}
                subtitle={`${(viewMode === 'cst' ? data.creditos.aliquota_zero.por_cst : viewMode === 'cfop' ? data.creditos.aliquota_zero.por_cfop : data.creditos.aliquota_zero.por_ncm).length} registro(s)`}
                icon={AlertCircle}
                color="bg-gray-500"
                isExpanded={expandedSections.creditoAliqZero}
                onToggle={() => toggleSection('creditoAliqZero')}
                badge={formatCurrency(data.creditos.aliquota_zero.valor_operacoes)}
              >
                <DataTable 
                  items={viewMode === 'cst' ? data.creditos.aliquota_zero.por_cst : viewMode === 'cfop' ? data.creditos.aliquota_zero.por_cfop : data.creditos.aliquota_zero.por_ncm}
                  showTaxes={false}
                />
              </ExpandableSection>
            </div>

            {/* DÉBITOS */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowUpCircle className="w-6 h-6 text-green-600" />
                Débitos (Saídas)
              </h2>
              
              {/* Operações com débito */}
              <ExpandableSection
                title={`Operações com Débito (CST ${data.debitos.com_debito.cst})`}
                subtitle={`${(viewMode === 'cst' ? data.debitos.com_debito.por_cst : viewMode === 'cfop' ? data.debitos.com_debito.por_cfop : data.debitos.com_debito.por_ncm).length} registro(s)`}
                icon={CheckCircle}
                color="bg-red-600"
                isExpanded={expandedSections.debitoComDebito}
                onToggle={() => toggleSection('debitoComDebito')}
                badge={formatCurrency(data.debitos.com_debito.valor_operacoes)}
              >
                <div className="mb-4 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Valor Operações</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(data.debitos.com_debito.valor_operacoes)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-600">Débito PIS</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(data.debitos.com_debito.pis)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-sm text-purple-600">Débito COFINS</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(data.debitos.com_debito.cofins)}</p>
                  </div>
                </div>
                <DataTable 
                  items={viewMode === 'cst' ? data.debitos.com_debito.por_cst : viewMode === 'cfop' ? data.debitos.com_debito.por_cfop : data.debitos.com_debito.por_ncm}
                  showTaxes={true}
                />
              </ExpandableSection>
              
              {/* Operações sem débito (alíquota zero) */}
              <ExpandableSection
                title={`Operações Alíquota Zero / Sem Débito (CST ${data.debitos.aliquota_zero.cst})`}
                subtitle={`${(viewMode === 'cst' ? data.debitos.aliquota_zero.por_cst : viewMode === 'cfop' ? data.debitos.aliquota_zero.por_cfop : data.debitos.aliquota_zero.por_ncm).length} registro(s)`}
                icon={AlertCircle}
                color="bg-gray-500"
                isExpanded={expandedSections.debitoAliqZero}
                onToggle={() => toggleSection('debitoAliqZero')}
                badge={formatCurrency(data.debitos.aliquota_zero.valor_operacoes)}
              >
                <DataTable 
                  items={viewMode === 'cst' ? data.debitos.aliquota_zero.por_cst : viewMode === 'cfop' ? data.debitos.aliquota_zero.por_cfop : data.debitos.aliquota_zero.por_ncm}
                  showTaxes={false}
                />
              </ExpandableSection>
            </div>

            {/* TRANSFERÊNCIAS */}
            {data.transferencias && data.transferencias.total > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-6 h-6 text-amber-600" />
                  Transferências (Não Geram Crédito/Débito)
                </h2>
                
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-800">Operações de Transferência</h4>
                    <p className="text-sm text-amber-700">
                      CFOPs de transferência entre estabelecimentos não geram direito a crédito nem obrigação de débito de PIS/COFINS.
                      São exibidos separadamente para fins de conferência.
                    </p>
                  </div>
                </div>

                {/* Transferências de Entrada */}
                {data.transferencias.entrada.valor_operacoes > 0 && (
                  <ExpandableSection
                    title="Transferências de Entrada"
                    subtitle={`${(viewMode === 'cfop' ? data.transferencias.entrada.por_cfop : data.transferencias.entrada.por_ncm).length} registro(s)`}
                    icon={ArrowDownCircle}
                    color="bg-amber-500"
                    isExpanded={expandedSections.transferenciasEntrada}
                    onToggle={() => toggleSection('transferenciasEntrada')}
                    badge={formatCurrency(data.transferencias.entrada.valor_operacoes)}
                  >
                    <DataTable 
                      items={viewMode === 'cfop' ? data.transferencias.entrada.por_cfop : data.transferencias.entrada.por_ncm}
                      showTaxes={false}
                    />
                  </ExpandableSection>
                )}
                
                {/* Transferências de Saída */}
                {data.transferencias.saida.valor_operacoes > 0 && (
                  <ExpandableSection
                    title="Transferências de Saída"
                    subtitle={`${(viewMode === 'cfop' ? data.transferencias.saida.por_cfop : data.transferencias.saida.por_ncm).length} registro(s)`}
                    icon={ArrowUpCircle}
                    color="bg-amber-600"
                    isExpanded={expandedSections.transferenciasSaida}
                    onToggle={() => toggleSection('transferenciasSaida')}
                    badge={formatCurrency(data.transferencias.saida.valor_operacoes)}
                  >
                    <DataTable 
                      items={viewMode === 'cfop' ? data.transferencias.saida.por_cfop : data.transferencias.saida.por_ncm}
                      showTaxes={false}
                    />
                  </ExpandableSection>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoPisCofins;
