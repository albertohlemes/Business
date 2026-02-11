import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import Layout from '../components/Layout';
import { AlertTriangle, FileSpreadsheet, FileText, Search, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function NotasAusentes({ user, onLogout }) {
  const { selectedCompany, selectedCompetencia } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dados, setDados] = useState(null);
  const [error, setError] = useState(null);
  const [serie, setSerie] = useState('1');
  const [filtroCompetencia, setFiltroCompetencia] = useState('');

  useEffect(() => {
    if (selectedCompetencia) {
      setFiltroCompetencia(selectedCompetencia);
    }
  }, [selectedCompetencia]);

  const buscarNotasAusentes = async () => {
    if (!selectedCompany) {
      setError('Selecione uma empresa primeiro');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filtroCompetencia) params.append('competencia', filtroCompetencia);
      if (serie) params.append('serie', serie);

      // selectedCompany pode ser um objeto ou string ID
      const companyId = typeof selectedCompany === 'object' ? selectedCompany.id : selectedCompany;
      
      const response = await axios.get(
        `${API}/notas-ausentes/${companyId}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDados(response.data);
    } catch (err) {
      console.error('Erro ao buscar notas ausentes:', err);
      setError(err.response?.data?.detail || 'Erro ao buscar notas ausentes');
    } finally {
      setLoading(false);
    }
  };

  const exportar = async (formato) => {
    if (!selectedCompany || !dados) return;

    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('formato', formato);
      if (filtroCompetencia) params.append('competencia', filtroCompetencia);
      if (serie) params.append('serie', serie);

      // selectedCompany pode ser um objeto ou string ID
      const companyId = typeof selectedCompany === 'object' ? selectedCompany.id : selectedCompany;

      const response = await axios.get(
        `${API}/notas-ausentes/${companyId}/exportar?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `notas_ausentes.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=([^;]+)/);
        if (match) filename = match[1].replace(/"/g, '');
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar relatório');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div data-testid="notas-ausentes-page" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" />
              Alerta de Notas Fiscais Ausentes
            </h1>
            <p className="text-gray-400 mt-1">
              Detecta quebras na sequência numérica de notas fiscais de saída
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#333]">
          <h2 className="text-lg font-semibold text-white mb-4">Filtros de Pesquisa</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Competência (Mês/Ano)
              </label>
              <input
                type="text"
                value={filtroCompetencia}
                onChange={(e) => setFiltroCompetencia(e.target.value)}
                placeholder="Ex: 02/2026 ou deixe vazio para todas"
                className="w-full px-4 py-2 bg-[#0d0d0d] border border-[#333] rounded-lg text-white focus:ring-2 focus:ring-[#C8A951] focus:border-transparent"
                data-testid="competencia-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Série da NF-e
              </label>
              <input
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Ex: 1"
                className="w-full px-4 py-2 bg-[#0d0d0d] border border-[#333] rounded-lg text-white focus:ring-2 focus:ring-[#C8A951] focus:border-transparent"
                data-testid="serie-input"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={buscarNotasAusentes}
                disabled={loading || !selectedCompany}
                className="w-full px-6 py-2 bg-[#C8A951] hover:bg-[#B09240] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="buscar-btn"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analisar Sequência
                  </>
                )}
              </button>
            </div>
          </div>

          {!selectedCompany && (
            <p className="text-yellow-500 text-sm mt-4">
              ⚠️ Selecione uma empresa no topo da página para continuar
            </p>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Resultados */}
        {dados && (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                <p className="text-gray-400 text-sm">Total de Notas Emitidas</p>
                <p className="text-2xl font-bold text-white">{dados.total_notas.toLocaleString('pt-BR')}</p>
              </div>
              
              <div className={`rounded-lg p-4 border ${dados.total_ausentes > 0 ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
                <p className={`text-sm ${dados.total_ausentes > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  Notas Ausentes
                </p>
                <p className={`text-2xl font-bold ${dados.total_ausentes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {dados.total_ausentes.toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                <p className="text-gray-400 text-sm">Competência</p>
                <p className="text-xl font-semibold text-white">{dados.competencia}</p>
              </div>
              
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                <p className="text-gray-400 text-sm">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {dados.total_ausentes === 0 ? (
                    <>
                      <CheckCircle className="text-green-500" />
                      <span className="text-green-500 font-semibold">Sequência OK</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="text-red-500" />
                      <span className="text-red-500 font-semibold">Gaps Detectados</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Botões de Exportação */}
            {dados.total_ausentes > 0 && (
              <div className="flex gap-4">
                <button
                  onClick={() => exportar('excel')}
                  disabled={exporting}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  data-testid="export-excel-btn"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Exportar Excel
                </button>
                
                <button
                  onClick={() => exportar('pdf')}
                  disabled={exporting}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  data-testid="export-pdf-btn"
                >
                  <FileText className="w-5 h-5" />
                  Exportar PDF
                </button>

                {exporting && (
                  <span className="flex items-center text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Gerando arquivo...
                  </span>
                )}
              </div>
            )}

            {/* Resumo por Série */}
            {dados.sequencias_analisadas && dados.sequencias_analisadas.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#333]">
                <h3 className="text-lg font-semibold text-white mb-4">Resumo por Série</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-[#333]">
                        <th className="pb-3 px-4">Série</th>
                        <th className="pb-3 px-4 text-right">Primeiro Nº</th>
                        <th className="pb-3 px-4 text-right">Último Nº</th>
                        <th className="pb-3 px-4 text-right">Total Emitidas</th>
                        <th className="pb-3 px-4 text-right">Total Esperado</th>
                        <th className="pb-3 px-4 text-right">Ausentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.sequencias_analisadas.map((seq, idx) => {
                        const ausentes = seq.total_esperado - seq.total_notas;
                        return (
                          <tr key={idx} className="border-b border-[#222] hover:bg-[#222]">
                            <td className="py-3 px-4 text-white font-medium">Série {seq.serie}</td>
                            <td className="py-3 px-4 text-right text-gray-300">{seq.primeiro_numero.toLocaleString('pt-BR')}</td>
                            <td className="py-3 px-4 text-right text-gray-300">{seq.ultimo_numero.toLocaleString('pt-BR')}</td>
                            <td className="py-3 px-4 text-right text-gray-300">{seq.total_notas.toLocaleString('pt-BR')}</td>
                            <td className="py-3 px-4 text-right text-gray-300">{seq.total_esperado.toLocaleString('pt-BR')}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${ausentes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {ausentes.toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Lista de Notas Ausentes */}
            {dados.notas_ausentes && dados.notas_ausentes.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#333]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-yellow-500" />
                  Detalhamento das Notas Ausentes ({dados.notas_ausentes.length})
                </h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#1a1a1a]">
                      <tr className="text-left text-gray-400 border-b border-[#333]">
                        <th className="pb-3 px-4">Nº Ausente</th>
                        <th className="pb-3 px-4">Série</th>
                        <th className="pb-3 px-4">Nota Anterior</th>
                        <th className="pb-3 px-4">Data Anterior</th>
                        <th className="pb-3 px-4">Nota Posterior</th>
                        <th className="pb-3 px-4">Data Posterior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.notas_ausentes.slice(0, 100).map((nota, idx) => (
                        <tr key={idx} className="border-b border-[#222] hover:bg-[#222]">
                          <td className="py-3 px-4">
                            <span className="bg-red-900/50 text-red-400 px-3 py-1 rounded font-mono font-bold">
                              {nota.numero.toLocaleString('pt-BR')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{nota.serie}</td>
                          <td className="py-3 px-4 text-gray-300 font-mono">
                            {nota.nota_anterior ? nota.nota_anterior.numero.toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {nota.nota_anterior?.data_emissao?.substring(0, 10) || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-300 font-mono">
                            {nota.nota_posterior ? nota.nota_posterior.numero.toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {nota.nota_posterior?.data_emissao?.substring(0, 10) || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dados.notas_ausentes.length > 100 && (
                    <p className="text-center text-gray-400 py-4">
                      Exibindo 100 de {dados.notas_ausentes.length} registros. Exporte para ver todos.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mensagem de sucesso quando não há notas ausentes */}
            {dados.total_ausentes === 0 && dados.total_notas > 0 && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-500 mb-2">Sequência Numérica OK!</h3>
                <p className="text-gray-400">
                  Não foram encontradas quebras na sequência das {dados.total_notas.toLocaleString('pt-BR')} notas fiscais analisadas.
                </p>
              </div>
            )}
          </>
        )}

        {/* Estado inicial */}
        {!dados && !loading && !error && (
          <div className="bg-[#1a1a1a] rounded-lg p-12 border border-[#333] text-center">
            <AlertTriangle className="w-16 h-16 text-[#C8A951] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Verificação de Sequência Numérica</h3>
            <p className="text-gray-400 max-w-lg mx-auto">
              Este relatório analisa as notas fiscais de saída e detecta números faltantes na sequência.
              Selecione os filtros desejados e clique em "Analisar Sequência" para começar.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
