import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, FolderOpen, CheckCircle, XCircle, AlertTriangle, 
  Loader2, Download, Clock, Building2, FileText, RefreshCw,
  Settings, Link2, ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '../components/Layout';

const API = process.env.REACT_APP_BACKEND_URL;

const BatchImport = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [empresas, setEmpresas] = useState({ com_codigo: [], sem_codigo: [] });
  const [selectedFile, setSelectedFile] = useState(null);
  const [competencia, setCompetencia] = useState('');
  const [skipAi, setSkipAi] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [editingCodigo, setEditingCodigo] = useState(null);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [showErrorReport, setShowErrorReport] = useState(false);
  
  // Estado do progresso persistente
  const [activeImport, setActiveImport] = useState(null);
  const [realProgress, setRealProgress] = useState(null);

  // Verificar importações ativas ao carregar
  const checkActiveImports = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/batch-import/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const active = response.data.active_imports || [];
      if (active.length > 0) {
        setActiveImport(active[0]);
        setUploading(true);
      } else {
        setActiveImport(null);
        setUploading(false);
      }
    } catch (err) {
      console.error('Erro ao verificar importações ativas:', err);
    }
  }, []);

  // Polling do progresso
  useEffect(() => {
    let interval;
    if (activeImport && activeImport.import_id) {
      interval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `${API}/api/batch-import/progress/${activeImport.import_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.data.status === 'completed' || response.data.status === 'error') {
            // Importação finalizada
            setActiveImport(null);
            setUploading(false);
            setRealProgress(null);
            loadHistory();
            
            if (response.data.status === 'completed') {
              // Buscar resultado completo
              const fullResult = await axios.get(
                `${API}/api/batch-import/status/${activeImport.import_id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              setResult({
                ...fullResult.data,
                total_empresas: fullResult.data.total_empresas || 0,
                total_arquivos: fullResult.data.total_arquivos || 0,
                total_importados: fullResult.data.total_importados || 0,
                total_duplicados: fullResult.data.total_duplicados || 0,
                total_erros: fullResult.data.total_erros || 0,
                empresas_processadas: fullResult.data.empresas_processadas || [],
                erros: fullResult.data.erros || []
              });
            }
          } else {
            setRealProgress(response.data.progress);
          }
        } catch (err) {
          console.error('Erro ao buscar progresso:', err);
        }
      }, 1000); // Poll a cada 1 segundo
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeImport, loadHistory]);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/batch-import/historico`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  }, []);

  // Carregar mapeamento de empresas
  const loadEmpresas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/batch-import/empresas-mapeamento`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(response.data);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadEmpresas();
    checkActiveImports();
  }, [loadHistory, loadEmpresas, checkActiveImports]);

  // Upload de arquivo
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);
    setRealProgress(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (competencia) formData.append('competencia', competencia);
      formData.append('skip_ai', skipAi.toString());

      const response = await axios.post(
        `${API}/api/batch-import/upload-estrutura`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 600000 // 10 minutos
        }
      );

      clearInterval(progressInterval);
      setUploadProgress({ phase: 'Concluído!', percent: 100, detail: '' });
      setResult(response.data);
      loadHistory();
      setSelectedFile(null);
      
      // Se tiver erros, mostrar o relatório automaticamente
      if (response.data.total_erros > 0) {
        setShowErrorReport(true);
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      setUploadProgress({ phase: 'Erro!', percent: 0, detail: '' });
      setResult({
        error: err.response?.data?.detail || 'Erro ao processar arquivo'
      });
    } finally {
      setUploading(false);
    }
  };

  // Atualizar código da empresa
  const handleUpdateCodigo = async (companyId) => {
    if (!novoCodigo.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/batch-import/atualizar-codigo/${companyId}`,
        { codigo: novoCodigo },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCodigo(null);
      setNovoCodigo('');
      loadEmpresas();
    } catch (err) {
      console.error('Erro ao atualizar código:', err);
    }
  };

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="min-h-full bg-[#0C0C0C] text-white p-6">
        <div className="max-w-6xl mx-auto pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <FolderOpen className="w-7 h-7 text-purple-400" />
            Importação em Lote
          </h1>
          <p className="text-[#A1A1AA]">
            Importe XMLs de múltiplas empresas automaticamente a partir de uma estrutura de pastas
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2A2A2A]">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload ZIP
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Histórico
          </button>
          <button
            onClick={() => setActiveTab('mapeamento')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mapeamento'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4 inline mr-2" />
            Mapeamento
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuração
          </button>
        </div>

        {/* Tab: Upload */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Instruções */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Estrutura do ZIP
              </h3>
              <div className="bg-[#0C0C0C] rounded-lg p-4 font-mono text-sm text-[#A1A1AA]">
                <pre>{`arquivo.zip/
├── 0175 - BUSINESS CONTABILIDADE/
│   └── 2026/
│       └── 002 - FISCAL/
│           └── 01/  ← Mês (competência)
│               ├── nota1.xml
│               └── nota2.xml
├── 0042 - OUTRA EMPRESA/
│   └── 2026/
│       └── 002 - FISCAL/
│           └── 01/
│               └── notas.xml`}</pre>
              </div>
              <p className="text-sm text-[#666] mt-3">
                O sistema identifica a empresa pelo código no início do nome da pasta (ex: "0175").
                A competência é extraída do caminho (ano/mês).
              </p>
            </div>

            {/* Upload Area */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Upload de Arquivo</h3>
              
              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  selectedFile 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file?.name.endsWith('.zip')) {
                    setSelectedFile(file);
                  }
                }}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 text-purple-400 mx-auto" />
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-[#666] text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-400 text-sm hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-[#666] mx-auto" />
                    <p className="text-[#A1A1AA]">
                      Arraste um arquivo ZIP ou{' '}
                      <label className="text-purple-400 cursor-pointer hover:underline">
                        clique para selecionar
                        <input
                          type="file"
                          accept=".zip"
                          className="hidden"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                        />
                      </label>
                    </p>
                  </div>
                )}
              </div>

              {/* Opções */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">
                    Competência Padrão (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YYYY (ex: 01/2026)"
                    value={competencia}
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="w-full bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipAi}
                      onChange={(e) => setSkipAi(e.target.checked)}
                      className="rounded border-[#2A2A2A]"
                    />
                    <span className="text-sm text-[#A1A1AA]">
                      Importação Rápida (pular IA)
                    </span>
                  </label>
                </div>
              </div>

              {/* Botão Upload */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-[#2A2A2A] disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importar
                  </>
                )}
              </button>

              {/* Barra de Progresso */}
              {uploading && (
                <div className="mt-4 bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-purple-300 font-medium">{uploadProgress.phase}</span>
                    <span className="text-sm text-[#A1A1AA]">{Math.round(uploadProgress.percent)}%</span>
                  </div>
                  <div className="h-2 bg-[#0C0C0C] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  {uploadProgress.detail && (
                    <p className="text-xs text-[#666] mt-2">{uploadProgress.detail}</p>
                  )}
                </div>
              )}
            </div>

            {/* Resultado */}
            {result && (
              <div className={`bg-[#141414] border rounded-xl p-6 ${
                result.error ? 'border-red-500/50' : 'border-emerald-500/50'
              }`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {result.error ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                  Resultado da Importação
                </h3>
                
                {result.error ? (
                  <p className="text-red-400">{result.error}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-white">{result.total_empresas}</p>
                        <p className="text-sm text-[#666]">Empresas</p>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-white">{result.total_arquivos}</p>
                        <p className="text-sm text-[#666]">Arquivos</p>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{result.total_importados}</p>
                        <p className="text-sm text-[#666]">Importados</p>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-amber-400">{result.total_duplicados}</p>
                        <p className="text-sm text-[#666]">Duplicados</p>
                      </div>
                      <div className="bg-[#0C0C0C] rounded-lg p-4 text-center cursor-pointer hover:bg-[#1A1A1A] transition-colors"
                           onClick={() => result.total_erros > 0 && setShowErrorReport(!showErrorReport)}>
                        <p className="text-2xl font-bold text-red-400">{result.total_erros}</p>
                        <p className="text-sm text-[#666]">Erros {result.total_erros > 0 && '▼'}</p>
                      </div>
                    </div>

                    {/* Resumo por Empresa */}
                    {result.empresas_processadas && result.empresas_processadas.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-[#A1A1AA]">Detalhes por Empresa:</h4>
                        <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
                          {result.empresas_processadas.map((emp, idx) => (
                            <div key={idx} className="bg-[#0C0C0C] rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#666]" />
                                <span className="text-sm text-white truncate max-w-[300px]">{emp.razao_social}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-emerald-400">{emp.importados} novos</span>
                                <span className="text-amber-400">{emp.duplicados} dup.</span>
                                <span className="text-red-400">{emp.erros} erros</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Relatório de Erros */}
                    {showErrorReport && result.erros && result.erros.length > 0 && (
                      <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Relatório de Erros ({result.erros.length})
                          </h4>
                          <button 
                            onClick={() => setShowErrorReport(false)}
                            className="text-[#666] hover:text-white text-sm"
                          >
                            Fechar
                          </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
                          {result.erros.map((erro, idx) => (
                            <div key={idx} className="bg-[#0C0C0C] rounded-lg p-3 text-sm">
                              <div className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium truncate">{erro.arquivo || erro.file || 'Arquivo desconhecido'}</p>
                                  <p className="text-red-300 text-xs mt-1">{erro.erro || erro.error || 'Erro desconhecido'}</p>
                                  {erro.empresa && (
                                    <p className="text-[#666] text-xs mt-1">Empresa: {erro.empresa}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {result.empresas_nao_encontradas > 0 && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-sm">
                      ⚠️ {result.empresas_nao_encontradas} empresas não foram encontradas no sistema.
                      Verifique o mapeamento de códigos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Histórico */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Histórico de Importações</h3>
              <button
                onClick={loadHistory}
                className="text-[#A1A1AA] hover:text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
                <Clock className="w-12 h-12 text-[#666] mx-auto mb-3" />
                <p className="text-[#A1A1AA]">Nenhuma importação em lote realizada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.import_id}
                    className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden"
                  >
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A]"
                      onClick={() => setExpandedHistory(
                        expandedHistory === item.import_id ? null : item.import_id
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          item.status === 'completed' ? 'bg-emerald-500' :
                          item.status === 'error' ? 'bg-red-500' :
                          'bg-amber-500 animate-pulse'
                        }`} />
                        <div>
                          <p className="font-medium">{item.filename || 'Importação em lote'}</p>
                          <p className="text-sm text-[#666]">{formatDate(item.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm">
                            <span className="text-emerald-400">{item.total_importados || 0}</span>
                            {' / '}
                            <span className="text-[#A1A1AA]">{item.total_arquivos || 0}</span>
                          </p>
                          <p className="text-xs text-[#666]">importados</p>
                        </div>
                        {expandedHistory === item.import_id ? (
                          <ChevronUp className="w-5 h-5 text-[#666]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#666]" />
                        )}
                      </div>
                    </div>

                    {expandedHistory === item.import_id && (
                      <div className="border-t border-[#2A2A2A] p-4 bg-[#0C0C0C]">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <p className="text-xl font-bold">{item.total_empresas || 0}</p>
                            <p className="text-xs text-[#666]">Empresas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-emerald-400">{item.total_importados || 0}</p>
                            <p className="text-xs text-[#666]">Importados</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-amber-400">{item.total_duplicados || 0}</p>
                            <p className="text-xs text-[#666]">Duplicados</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-bold text-red-400">{item.total_erros || 0}</p>
                            <p className="text-xs text-[#666]">Erros</p>
                          </div>
                        </div>

                        {item.empresas_nao_encontradas?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-amber-400 mb-2">
                              Empresas não encontradas ({item.empresas_nao_encontradas.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.empresas_nao_encontradas.map((emp, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs"
                                >
                                  {emp.codigo || emp} - {emp.nome_pasta || ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Mapeamento */}
        {activeTab === 'mapeamento' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Mapeamento de Empresas</h3>
              <button
                onClick={loadEmpresas}
                className="text-[#A1A1AA] hover:text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Empresas sem código */}
            {empresas.sem_codigo?.length > 0 && (
              <div className="bg-[#141414] border border-amber-500/30 rounded-xl p-4">
                <h4 className="font-medium text-amber-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Empresas sem código ({empresas.sem_codigo.length})
                </h4>
                <p className="text-sm text-[#A1A1AA] mb-4">
                  Essas empresas não serão reconhecidas na importação em lote. 
                  Defina o código correspondente à pasta de cada uma.
                </p>
                <div className="space-y-2">
                  {empresas.sem_codigo.map((empresa) => (
                    <div
                      key={empresa.id}
                      className="flex items-center justify-between bg-[#0C0C0C] rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium">{empresa.razao_social}</p>
                        <p className="text-sm text-[#666]">{empresa.cnpj}</p>
                      </div>
                      {editingCodigo === empresa.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="0175"
                            value={novoCodigo}
                            onChange={(e) => setNovoCodigo(e.target.value)}
                            className="w-24 bg-[#141414] border border-[#2A2A2A] rounded px-2 py-1 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateCodigo(empresa.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingCodigo(null)}
                            className="px-2 py-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCodigo(empresa.id);
                            setNovoCodigo('');
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                        >
                          Definir Código
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empresas com código */}
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
              <h4 className="font-medium text-emerald-400 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Empresas mapeadas ({empresas.com_codigo?.length || 0})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {empresas.com_codigo?.map((empresa) => (
                  <div
                    key={empresa.id}
                    className="flex items-center justify-between bg-[#0C0C0C] rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-mono text-sm">
                        {empresa.codigo_empresa}
                      </span>
                      <div>
                        <p className="font-medium">{empresa.razao_social}</p>
                        <p className="text-sm text-[#666]">{empresa.cnpj}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingCodigo(empresa.id);
                        setNovoCodigo(empresa.codigo_empresa);
                      }}
                      className="text-[#666] hover:text-white text-sm"
                    >
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Configuração */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Script para Servidor Local
              </h3>
              <p className="text-[#A1A1AA] mb-4">
                Para importar XMLs diretamente de um servidor local (onde o share está montado),
                você pode usar o script Python abaixo:
              </p>
              
              <div className="bg-[#0C0C0C] rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-[#A1A1AA]">{`# Instalar dependências
pip install aiohttp

# Executar importação
python batch_import.py \\
  --path "/Volumes/SHARE/Operacional/Clientes/Ativos" \\
  --api-url "${API}" \\
  --email "seu@email.com" \\
  --password "suasenha" \\
  --output "/tmp/relatorio.txt"

# Para agendar no cron (01:00 da manhã):
# crontab -e
# 0 1 * * * /usr/bin/python3 /caminho/batch_import.py --path "..." --api-url "..." --email "..." --password "..."
`}</pre>
              </div>

              <div className="mt-4 flex gap-4">
                <a
                  href={`${API}/api/batch-import/download-script`}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center gap-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Script
                </a>
              </div>
            </div>

            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Notificações por Email</h3>
              <p className="text-[#666] text-sm">
                Em breve: Configure um email para receber o relatório após cada importação automática.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </Layout>
  );
};

export default BatchImport;
