import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAppContext } from '../context/AppContext';
import { 
  Calculator, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  FileText,
  Download,
  Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const ApuracaoPeriodo = ({ user, onLogout }) => {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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
        `${API}/apuracao-periodo/${selectedCompany.id}?competencia=${encodeURIComponent(selectedCompetencia)}`,
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

  const exportCSV = () => {
    if (!data) return;

    let csv = '\uFEFF'; // BOM UTF-8
    csv += 'APURAÇÃO DO PERÍODO - ' + data.empresa.razao_social + '\n';
    csv += 'Competência: ' + data.competencia + '\n\n';
    
    // Entradas
    csv += 'ENTRADAS\n';
    csv += 'CFOP;CST;Valor;BC ICMS;ICMS;PIS;COFINS\n';
    data.entradas.itens.forEach(item => {
      csv += `${item.cfop};${item.cst || ''};${item.valor};${item.bc_icms};${item.v_icms};${item.v_pis};${item.v_cofins}\n`;
    });
    csv += `SUBTOTAL ENTRADAS;;${data.entradas.subtotal.valor};${data.entradas.subtotal.bc_icms};${data.entradas.subtotal.v_icms};${data.entradas.subtotal.v_pis};${data.entradas.subtotal.v_cofins}\n\n`;
    
    // Saídas
    csv += 'SAÍDAS\n';
    csv += 'CFOP;CST;Valor;BC ICMS;ICMS;PIS;COFINS\n';
    data.saidas.itens.forEach(item => {
      csv += `${item.cfop};${item.cst || ''};${item.valor};${item.bc_icms};${item.v_icms};${item.v_pis};${item.v_cofins}\n`;
    });
    csv += `SUBTOTAL SAÍDAS;;${data.saidas.subtotal.valor};${data.saidas.subtotal.bc_icms};${data.saidas.subtotal.v_icms};${data.saidas.subtotal.v_pis};${data.saidas.subtotal.v_cofins}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apuracao_${data.competencia.replace('/', '-')}_${data.empresa.cnpj}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Componente de tabela de CFOPs
  const CFOPTable = ({ items, subtotal, tipo }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`${tipo === 'entrada' ? 'bg-blue-50' : 'bg-green-50'}`}>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">CFOP</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">CST</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">Valor</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">BC ICMS</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">ICMS</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">PIS</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700">COFINS</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                Nenhum registro encontrado
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-gray-900">{item.cfop}</td>
                <td className="px-4 py-3 text-center font-mono text-gray-600">{item.cst || '-'}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.valor)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.bc_icms)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.v_icms)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.v_pis)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.v_cofins)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className={`${tipo === 'entrada' ? 'bg-blue-100' : 'bg-green-100'} font-bold`}>
            <td className="px-4 py-3 text-gray-800">SUBTOTAL</td>
            <td className="px-4 py-3 text-center text-gray-600">-</td>
            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(subtotal.valor)}</td>
            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(subtotal.bc_icms)}</td>
            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(subtotal.v_icms)}</td>
            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(subtotal.v_pis)}</td>
            <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(subtotal.v_cofins)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="apuracao-periodo-page" className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Calculator className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Apuração do Período</h1>
                {selectedCompany ? (
                  <p className="text-indigo-100">
                    {selectedCompany.razao_social} - Competência: {selectedCompetencia}
                  </p>
                ) : (
                  <p className="text-indigo-100">Selecione uma empresa no header</p>
                )}
              </div>
            </div>
            
            {data && (
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
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
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
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
            {/* Seção de Entradas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4 flex items-center gap-3">
                <ArrowDownCircle className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">Entradas</h2>
                  <p className="text-blue-100 text-sm">
                    {data.entradas.itens.length} CFOP(s) • {data.entradas.subtotal.qtd_itens} itens
                  </p>
                </div>
              </div>
              <CFOPTable 
                items={data.entradas.itens} 
                subtotal={data.entradas.subtotal}
                tipo="entrada"
              />
            </div>

            {/* Seção de Saídas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-green-600 text-white px-6 py-4 flex items-center gap-3">
                <ArrowUpCircle className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">Saídas</h2>
                  <p className="text-green-100 text-sm">
                    {data.saidas.itens.length} CFOP(s) • {data.saidas.subtotal.qtd_itens} itens
                  </p>
                </div>
              </div>
              <CFOPTable 
                items={data.saidas.itens} 
                subtotal={data.saidas.subtotal}
                tipo="saida"
              />
            </div>

            {/* Resumo Final */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Resumo da Apuração</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Entradas</p>
                  <p className="text-xl font-bold text-blue-400">{formatCurrency(data.entradas.subtotal.valor)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Saídas</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(data.saidas.subtotal.valor)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">ICMS Crédito</p>
                  <p className="text-xl font-bold text-blue-400">{formatCurrency(data.entradas.subtotal.v_icms)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">ICMS Débito</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(data.saidas.subtotal.v_icms)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">PIS Crédito</p>
                  <p className="text-xl font-bold text-blue-400">{formatCurrency(data.entradas.subtotal.v_pis)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">PIS Débito</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(data.saidas.subtotal.v_pis)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ApuracaoPeriodo;
