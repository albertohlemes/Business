import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, FileText, Search, CheckCircle2, XCircle, AlertTriangle, 
  Upload, FileSpreadsheet, Loader2, Ban, Check
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NfseCancellationModal = ({ 
  isOpen, 
  onClose, 
  files, 
  companyId, 
  competencia,
  tipo,
  onImportComplete 
}) => {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [notas, setNotas] = useState([]);
  const [selectedCanceladas, setSelectedCanceladas] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingReport, setUploadingReport] = useState(false);
  const [showReportOption, setShowReportOption] = useState(false);
  const [error, setError] = useState(null);

  // Carregar preview das notas
  useEffect(() => {
    if (isOpen && files && files.length > 0) {
      loadPreview();
    }
  }, [isOpen, files]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('company_id', companyId);
      
      for (const file of files) {
        formData.append('files', file);
      }
      
      const response = await axios.post(`${API}/nfse/preview`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setNotas(response.data.notas || []);
    } catch (err) {
      console.error('Erro ao carregar preview:', err);
      setError(err.response?.data?.detail || 'Erro ao processar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCancelada = (numero) => {
    setSelectedCanceladas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(numero)) {
        newSet.delete(numero);
      } else {
        newSet.add(numero);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const notasDisponiveis = notas.filter(n => !n.ja_importada);
    if (selectedCanceladas.size === notasDisponiveis.length) {
      setSelectedCanceladas(new Set());
    } else {
      setSelectedCanceladas(new Set(notasDisponiveis.map(n => n.numero)));
    }
  };

  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingReport(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('company_id', companyId);
      formData.append('report_file', file);
      
      const response = await axios.post(`${API}/nfse/import-cancellation-report`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Marcar automaticamente as notas encontradas no relatório
      const numerosRelatorio = new Set(response.data.numeros_cancelados || []);
      const notasParaMarcar = notas
        .filter(n => numerosRelatorio.has(n.numero) && !n.ja_importada)
        .map(n => n.numero);
      
      setSelectedCanceladas(new Set(notasParaMarcar));
      setShowReportOption(false);
      
    } catch (err) {
      console.error('Erro ao processar relatório:', err);
      alert(err.response?.data?.detail || 'Erro ao processar relatório de cancelamento');
    } finally {
      setUploadingReport(false);
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    setImporting(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('company_id', companyId);
      formData.append('competencia', competencia);
      formData.append('tipo', tipo);
      formData.append('notas_canceladas', JSON.stringify(Array.from(selectedCanceladas)));
      
      for (const file of files) {
        formData.append('files', file);
      }
      
      const response = await axios.post(`${API}/nfse/import-with-cancellations`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      onImportComplete(response.data);
      onClose();
      
    } catch (err) {
      console.error('Erro na importação:', err);
      setError(err.response?.data?.detail || 'Erro ao importar notas');
    } finally {
      setImporting(false);
    }
  };

  const handleSkipCancellation = async () => {
    // Importar sem marcar nenhuma como cancelada
    setSelectedCanceladas(new Set());
    await handleImport();
  };

  // Filtrar notas
  const notasFiltradas = notas.filter(nota => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      nota.numero.toLowerCase().includes(term) ||
      nota.tomador_nome?.toLowerCase().includes(term) ||
      nota.tomador_cnpj?.includes(term)
    );
  });

  const notasDisponiveis = notasFiltradas.filter(n => !n.ja_importada);
  const notasJaImportadas = notasFiltradas.filter(n => n.ja_importada);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Ban className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">
                Importação de NFS-e - Notas Canceladas
              </h2>
              <p className="text-sm text-[#A1A1AA]">
                Marque as notas fiscais que estão canceladas antes de importar
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={importing}
            className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#C8A951] animate-spin mx-auto mb-4" />
              <p className="text-white">Processando arquivos...</p>
              <p className="text-sm text-[#A1A1AA]">Extraindo informações das notas fiscais</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white mb-2">Erro ao processar arquivos</p>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#333]"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-[#2A2A2A] space-y-3">
              {/* Opções de marcação */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#A1A1AA]">
                    {notas.length} notas encontradas • {notasDisponiveis.length} disponíveis para importação
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReportOption(!showReportOption)}
                    className="px-3 py-1.5 text-sm text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Importar Relatório
                  </button>
                  
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20"
                  >
                    {selectedCanceladas.size === notasDisponiveis.length ? 'Desmarcar Todas' : 'Marcar Todas Canceladas'}
                  </button>
                </div>
              </div>

              {/* Upload de relatório */}
              {showReportOption && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-sm text-purple-300 mb-2">
                    Faça upload de um arquivo Excel, CSV ou TXT contendo os números das notas canceladas:
                  </p>
                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700 transition-all">
                    {uploadingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Selecionar Arquivo
                      </>
                    )}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleReportUpload}
                      disabled={uploadingReport}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Barra de pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <input
                  type="text"
                  placeholder="Buscar por número, tomador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#C8A951]"
                />
              </div>

              {/* Resumo de seleção */}
              {selectedCanceladas.size > 0 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-amber-300">
                    {selectedCanceladas.size} nota(s) marcada(s) como cancelada(s) - serão importadas com valor zerado
                  </span>
                </div>
              )}
            </div>

            {/* Lista de Notas */}
            <div className="flex-1 overflow-y-auto p-4">
              {notasDisponiveis.length === 0 && notasJaImportadas.length === 0 ? (
                <div className="text-center py-8 text-[#A1A1AA]">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma nota encontrada nos arquivos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Notas disponíveis */}
                  {notasDisponiveis.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Notas para Importação ({notasDisponiveis.length})
                      </h3>
                      <div className="space-y-1">
                        {notasDisponiveis.map((nota, idx) => {
                          const isCancelada = selectedCanceladas.has(nota.numero);
                          return (
                            <div 
                              key={`${nota.numero}-${idx}`}
                              onClick={() => handleToggleCancelada(nota.numero)}
                              className={`
                                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                                ${isCancelada 
                                  ? 'bg-amber-500/10 border border-amber-500/30' 
                                  : 'bg-[#0C0C0C] border border-[#2A2A2A] hover:border-[#3A3A3A]'
                                }
                              `}
                            >
                              {/* Checkbox */}
                              <div className={`
                                w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                                ${isCancelada 
                                  ? 'bg-amber-500 text-black' 
                                  : 'bg-[#2A2A2A] border border-[#3A3A3A]'
                                }
                              `}>
                                {isCancelada && <Check className="w-3 h-3" />}
                              </div>

                              {/* Número e Data */}
                              <div className="w-24 flex-shrink-0">
                                <p className={`font-medium ${isCancelada ? 'text-amber-300' : 'text-white'}`}>
                                  Nº {nota.numero}
                                </p>
                                <p className="text-xs text-[#A1A1AA]">
                                  {formatDate(nota.data_emissao)}
                                </p>
                              </div>

                              {/* Tomador */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${isCancelada ? 'text-amber-200' : 'text-white'}`}>
                                  {nota.tomador_nome || 'Tomador não informado'}
                                </p>
                                <p className="text-xs text-[#A1A1AA]">
                                  {nota.tomador_cnpj || '-'}
                                </p>
                              </div>

                              {/* Valor */}
                              <div className="text-right flex-shrink-0">
                                <p className={`font-medium ${isCancelada ? 'text-amber-400 line-through' : 'text-[#C8A951]'}`}>
                                  {formatCurrency(nota.valor)}
                                </p>
                                {isCancelada && (
                                  <p className="text-xs text-amber-400">
                                    Cancelada
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notas já importadas */}
                  {notasJaImportadas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-[#A1A1AA] mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Já Importadas ({notasJaImportadas.length})
                      </h3>
                      <div className="space-y-1 opacity-60">
                        {notasJaImportadas.map((nota, idx) => (
                          <div 
                            key={`ja-${nota.numero}-${idx}`}
                            className="flex items-center gap-3 p-3 bg-[#0C0C0C]/50 border border-[#2A2A2A] rounded-lg"
                          >
                            <div className="w-5 h-5 rounded bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-[#A1A1AA]" />
                            </div>
                            <div className="w-24 flex-shrink-0">
                              <p className="font-medium text-[#A1A1AA]">Nº {nota.numero}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#A1A1AA] truncate">{nota.tomador_nome || '-'}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-medium text-[#A1A1AA]">{formatCurrency(nota.valor)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2A2A2A] flex gap-3">
              <button
                onClick={handleSkipCancellation}
                disabled={importing || notasDisponiveis.length === 0}
                className="flex-1 py-2.5 bg-[#2A2A2A] text-white rounded-lg font-medium hover:bg-[#333] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Importar Todas como Ativas
              </button>
              
              <button
                onClick={handleImport}
                disabled={importing || notasDisponiveis.length === 0}
                className="flex-1 py-2.5 bg-[#C8A951] text-black rounded-lg font-medium hover:bg-[#D4B85C] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar {selectedCanceladas.size > 0 ? `(${selectedCanceladas.size} canceladas)` : ''}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NfseCancellationModal;
