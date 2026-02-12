import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, 
  ArrowLeft, Download, RefreshCw, Coffee, Package, Clock,
  FileCheck, FileX, Copy, ChevronDown, ChevronUp
} from 'lucide-react';

const ImportacaoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, completed, error
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
  const [currentStep, setCurrentStep] = useState('Aguardando...');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDetails, setShowDetails] = useState({
    success: false,
    duplicates: false,
    errors: false,
    rejected: false
  });
  
  const eventSourceRef = useRef(null);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;
  
  // Dados do upload passados via state
  const uploadData = location.state || {};
  const { files, companyId, companyName, competencia, tipo, uploadId: existingUploadId } = uploadData;

  // Timer para mostrar tempo decorrido
  useEffect(() => {
    if (status === 'uploading' || status === 'processing') {
      timerRef.current = setInterval(() => {
        if (startTime) {
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, startTime]);

  // Formatar tempo decorrido
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Iniciar upload quando a página carrega
  useEffect(() => {
    if (!files?.length && !existingUploadId) {
      // Sem arquivos e sem uploadId - voltar
      navigate('/documents');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticação não encontrado');
      setStatus('error');
      return;
    }

    // Se já temos um uploadId, só fazer polling do status
    if (existingUploadId) {
      setStatus('processing');
      setStartTime(Date.now());
      startPolling(existingUploadId, token);
      return;
    }

    // Iniciar novo upload
    startUpload(token);
    
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startUpload = async (token) => {
    setStatus('uploading');
    setStartTime(Date.now());
    setProgress({ current: 0, total: files.length, percent: 0 });
    setCurrentStep('Iniciando envio dos arquivos...');

    try {
      // 1. Inicializar upload
      const initFormData = new FormData();
      initFormData.append('company_id', companyId);
      initFormData.append('competencia', competencia);
      initFormData.append('tipo', tipo || 'entrada');
      initFormData.append('total_files', files.length.toString());

      const initResponse = await fetch(`${API}/xml/upload-init`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: initFormData
      });

      if (!initResponse.ok) {
        const errData = await initResponse.json().catch(() => ({}));
        throw new Error(errData.detail || 'Falha ao inicializar upload');
      }

      const { upload_id } = await initResponse.json();
      setCurrentStep('Enviando arquivos para o servidor...');

      // 2. Enviar arquivos em lotes usando upload-stream
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(files.length / BATCH_SIZE);

      for (let i = 0; i < totalBatches; i++) {
        const batch = files.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const batchFormData = new FormData();
        batchFormData.append('upload_id', upload_id);

        batch.forEach(file => {
          batchFormData.append('files', file);
        });

        const batchResponse = await fetch(`${API}/xml/upload-stream`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: batchFormData
        });

        if (!batchResponse.ok) {
          console.warn(`Erro no lote ${i + 1}, continuando...`);
        }

        // Atualizar progresso do envio
        const sentFiles = Math.min((i + 1) * BATCH_SIZE, files.length);
        const uploadPercent = Math.round((sentFiles / files.length) * 30); // 30% para upload
        setProgress({ 
          current: sentFiles, 
          total: files.length, 
          percent: uploadPercent 
        });
        setCurrentStep(`Enviando arquivos... ${sentFiles}/${files.length}`);
      }

      // 3. Aguardar processamento via SSE
      setStatus('processing');
      setCurrentStep('Processando documentos fiscais...');
      
      const processResponse = await fetch(`${API}/xml/upload-process/${upload_id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!processResponse.ok) {
        throw new Error('Erro ao iniciar processamento');
      }

      // 4. Conectar SSE para progresso
      connectSSE(upload_id, token);

    } catch (err) {
      console.error('Erro no upload:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  const connectSSE = (uploadId, token) => {
    const eventSource = new EventSource(`${API}/xml/upload-progress/${uploadId}`);
    eventSourceRef.current = eventSource;
    
    let lastEventTime = Date.now();

    eventSource.onmessage = (event) => {
      try {
        lastEventTime = Date.now();
        const data = JSON.parse(event.data);
        
        if (data.completed === true && data.results) {
          setProgress({ current: data.total_files, total: data.total_files, percent: 100 });
          setCurrentStep('Importação concluída!');
          setResults(data.results);
          setStatus('completed');
          eventSource.close();
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (data.error) {
          setError(data.error);
          setStatus('error');
          eventSource.close();
        } else {
          const processed = data.processed_files || 0;
          const total = data.total_files || 1;
          // Progresso de 30% a 100% (30% foi o upload)
          const processPercent = 30 + Math.round((processed / total) * 70);
          
          setProgress({ current: processed, total, percent: processPercent });
          setCurrentStep(data.current_file || `Processando ${processed}/${total}...`);
        }
      } catch (e) {
        console.error('Erro ao processar SSE:', e);
      }
    };

    eventSource.onerror = () => {
      console.log('SSE desconectado, iniciando polling...');
      eventSource.close();
      startPolling(uploadId, token);
    };

    // Fallback: se não receber eventos por 10s, iniciar polling
    setTimeout(() => {
      if (Date.now() - lastEventTime > 10000 && status === 'processing') {
        console.log('SSE sem eventos, iniciando polling...');
        eventSource.close();
        startPolling(uploadId, token);
      }
    }, 15000);
  };

  const startPolling = (uploadId, token) => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API}/xml/upload-status/${uploadId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();

        if (data.completed === true && data.results) {
          setProgress({ current: data.total_files, total: data.total_files, percent: 100 });
          setCurrentStep('Importação concluída!');
          setResults(data.results);
          setStatus('completed');
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        } else if (data.error) {
          setError(data.error);
          setStatus('error');
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        } else {
          const processed = data.processed_files || 0;
          const total = data.total_files || 1;
          const processPercent = 30 + Math.round((processed / total) * 70);
          
          setProgress({ current: processed, total, percent: processPercent });
          setCurrentStep(data.current_file || `Processando ${processed}/${total}...`);
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 2000);
  };

  // Exportar relatório
  const exportarRelatorio = () => {
    if (!results) return;

    const resumo = results.resumo || {};
    const dataAtual = new Date().toLocaleString('pt-BR');

    let conteudo = `RELATÓRIO DE IMPORTAÇÃO DE DOCUMENTOS FISCAIS\n`;
    conteudo += `=============================================\n\n`;
    conteudo += `Empresa: ${companyName || 'N/A'}\n`;
    conteudo += `Competência: ${competencia || 'N/A'}\n`;
    conteudo += `Tipo: ${tipo === 'saida' ? 'Saída' : 'Entrada'}\n`;
    conteudo += `Data/Hora: ${dataAtual}\n`;
    conteudo += `Tempo de processamento: ${formatTime(elapsedTime)}\n\n`;

    conteudo += `RESUMO\n`;
    conteudo += `------\n`;
    conteudo += `Total de Arquivos: ${resumo.total_arquivos || progress.total || 0}\n`;
    conteudo += `Importados com Sucesso: ${resumo.importados || results.success?.length || 0}\n`;
    conteudo += `Duplicados: ${resumo.duplicados || results.duplicadas?.length || 0}\n`;
    conteudo += `Erros: ${resumo.erros || results.errors?.length || 0}\n`;
    conteudo += `Rejeitados por CNPJ: ${resumo.rejeitados_cnpj || results.rejeitadas_cnpj?.length || 0}\n\n`;

    // Erros detalhados
    if (results.errors?.length > 0) {
      conteudo += `ERROS\n-----\n`;
      results.errors.forEach((err, idx) => {
        const filename = typeof err === 'string' ? err : (err.filename || err.arquivo || 'Arquivo');
        const error = typeof err === 'object' ? (err.error || err.motivo || '') : '';
        conteudo += `${idx + 1}. ${filename}: ${error}\n`;
      });
      conteudo += `\n`;
    }

    // Criar e baixar arquivo
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_importacao_${competencia?.replace('/', '-') || 'atual'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Voltar para documentos
  const voltarParaDocumentos = () => {
    navigate('/documents');
  };

  // Renderizar conteúdo baseado no status
  const renderContent = () => {
    if (status === 'idle') {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-[#C8A951] mx-auto animate-spin" />
          <p className="text-[#A1A1AA] mt-4">Preparando importação...</p>
        </div>
      );
    }

    if (status === 'uploading' || status === 'processing') {
      return (
        <div className="space-y-8">
          {/* Cabeçalho */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#C8A951]/20 rounded-full mb-4">
              <Coffee className="w-10 h-10 text-[#C8A951] animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {status === 'uploading' ? 'Enviando Arquivos...' : 'Processando Documentos...'}
            </h2>
            <p className="text-[#A1A1AA]">{currentStep}</p>
          </div>

          {/* Barra de Progresso Principal */}
          <div className="bg-[#141414] rounded-xl p-6 border border-[#2A2A2A]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-medium">Progresso</span>
              <span className="text-[#C8A951] font-bold text-xl">{progress.percent}%</span>
            </div>
            
            <div className="h-4 bg-[#0C0C0C] rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-[#C8A951] to-[#E8D48A] transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <Package className="w-5 h-5 text-[#C8A951] mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{progress.current.toLocaleString()}</p>
                <p className="text-xs text-[#666]">Processados</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{progress.total.toLocaleString()}</p>
                <p className="text-xs text-[#666]">Total</p>
              </div>
              <div className="bg-[#0C0C0C] rounded-lg p-3">
                <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{formatTime(elapsedTime)}</p>
                <p className="text-xs text-[#666]">Tempo</p>
              </div>
            </div>
          </div>

          {/* Dica */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-400 font-medium">Importação em andamento</p>
              <p className="text-sm text-blue-300/70">
                Você pode sair desta página. A importação continuará em segundo plano.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (status === 'completed' && results) {
      const resumo = results.resumo || {};
      const totalArquivos = resumo.total_arquivos || progress.total || 0;
      const importados = resumo.importados || results.success?.length || 0;
      const duplicados = resumo.duplicados || results.duplicadas?.length || 0;
      const erros = resumo.erros || results.errors?.length || 0;
      const rejeitados = resumo.rejeitados_cnpj || results.rejeitadas_cnpj?.length || 0;

      return (
        <div className="space-y-6">
          {/* Cabeçalho de Sucesso */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Importação Concluída!</h2>
            <p className="text-[#A1A1AA]">
              Tempo total: {formatTime(elapsedTime)} • {totalArquivos.toLocaleString()} arquivos processados
            </p>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <FileCheck className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-400">{importados.toLocaleString()}</p>
              <p className="text-sm text-green-300/70">Importados</p>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
              <Copy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-yellow-400">{duplicados.toLocaleString()}</p>
              <p className="text-sm text-yellow-300/70">Duplicados</p>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <FileX className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-400">{erros.toLocaleString()}</p>
              <p className="text-sm text-red-300/70">Erros</p>
            </div>
            
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-orange-400">{rejeitados.toLocaleString()}</p>
              <p className="text-sm text-orange-300/70">Rejeitados</p>
            </div>
          </div>

          {/* Detalhes Expansíveis */}
          {results.success?.length > 0 && (
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <button
                onClick={() => setShowDetails(prev => ({ ...prev, success: !prev.success }))}
                className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-white font-medium">
                    Importados com Sucesso ({results.success.length})
                  </span>
                </div>
                {showDetails.success ? (
                  <ChevronUp className="w-5 h-5 text-[#666]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#666]" />
                )}
              </button>
              {showDetails.success && (
                <div className="border-t border-[#2A2A2A] max-h-60 overflow-y-auto">
                  {results.success.slice(0, 100).map((item, idx) => (
                    <div key={idx} className="px-4 py-2 border-b border-[#2A2A2A] last:border-0 text-sm">
                      <span className="text-[#A1A1AA]">{item.filename || item.arquivo || item}</span>
                    </div>
                  ))}
                  {results.success.length > 100 && (
                    <div className="px-4 py-2 text-sm text-[#666]">
                      ... e mais {results.success.length - 100} arquivos
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {results.duplicadas?.length > 0 && (
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <button
                onClick={() => setShowDetails(prev => ({ ...prev, duplicates: !prev.duplicates }))}
                className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Copy className="w-5 h-5 text-yellow-500" />
                  <span className="text-white font-medium">
                    Duplicados - Já existiam ({results.duplicadas.length})
                  </span>
                </div>
                {showDetails.duplicates ? (
                  <ChevronUp className="w-5 h-5 text-[#666]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#666]" />
                )}
              </button>
              {showDetails.duplicates && (
                <div className="border-t border-[#2A2A2A] max-h-60 overflow-y-auto">
                  {results.duplicadas.slice(0, 100).map((item, idx) => (
                    <div key={idx} className="px-4 py-2 border-b border-[#2A2A2A] last:border-0 text-sm">
                      <span className="text-[#A1A1AA]">{item.filename || item.arquivo || item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.errors?.length > 0 && (
            <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
              <button
                onClick={() => setShowDetails(prev => ({ ...prev, errors: !prev.errors }))}
                className="w-full flex items-center justify-between p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-white font-medium">
                    Erros ({results.errors.length})
                  </span>
                </div>
                {showDetails.errors ? (
                  <ChevronUp className="w-5 h-5 text-[#666]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#666]" />
                )}
              </button>
              {showDetails.errors && (
                <div className="border-t border-[#2A2A2A] max-h-60 overflow-y-auto">
                  {results.errors.map((err, idx) => (
                    <div key={idx} className="px-4 py-2 border-b border-[#2A2A2A] last:border-0 text-sm">
                      <span className="text-red-400 font-medium">
                        {typeof err === 'string' ? err : (err.filename || err.arquivo || 'Arquivo')}
                      </span>
                      {typeof err === 'object' && (err.error || err.motivo) && (
                        <p className="text-[#666] text-xs mt-1">{err.error || err.motivo}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={voltarParaDocumentos}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#C8A951] hover:bg-[#D4B962] text-black font-medium rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5" />
              Ver Documentos
            </button>
            <button
              onClick={exportarRelatorio}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#141414] hover:bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Exportar Relatório
            </button>
          </div>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Erro na Importação</h2>
            <p className="text-red-400">{error}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={voltarParaDocumentos}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#141414] hover:bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#C8A951] hover:bg-[#D4B962] text-black font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0C0C0C] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header com info da empresa */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Importação de Documentos</h1>
          {companyName && (
            <p className="text-[#A1A1AA]">
              {companyName} • {competencia} • {tipo === 'saida' ? 'Saída' : 'Entrada'}
            </p>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-2xl p-8">
          {renderContent()}
        </div>

        {/* Link para voltar */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="mt-6 text-center">
            <button
              onClick={voltarParaDocumentos}
              className="text-[#666] hover:text-[#A1A1AA] text-sm flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para documentos (a importação continua em segundo plano)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportacaoPage;
