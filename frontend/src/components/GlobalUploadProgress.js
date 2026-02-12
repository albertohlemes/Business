import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, FileText, Upload, Coffee, XCircle } from 'lucide-react';
import CoffeeProgress from './CoffeeProgress';

// Mini xícara de café animada para o progresso minimizado
const MiniCoffee = ({ progress }) => {
  const coffeeLevel = 100 - progress;
  const isComplete = progress >= 100;
  
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      {/* Xícara */}
      <div className="relative w-6 h-5 bg-white rounded-b-md border-2 border-white/80 overflow-hidden">
        {/* Café */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#3D2314] to-[#6B4423] transition-all duration-300"
          style={{ height: `${coffeeLevel}%` }}
        />
      </div>
      {/* Alça */}
      <div className="absolute right-0 top-1.5 w-1.5 h-2.5 border-2 border-white/80 rounded-r-full" />
      {/* Vapor */}
      {!isComplete && coffeeLevel > 20 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-0.5 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-0.5 h-2.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-0.5 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};

const GlobalUploadProgress = () => {
  const location = useLocation();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const {
    isUploading,
    progress,
    currentFile,
    uploadResults,
    uploadError,
    uploadInfo,
    minimized,
    cancelUpload,
    clearResults,
    toggleMinimize
  } = useUpload();

  // Função para exportar relatório de importação
  const exportarRelatorio = (formato) => {
    if (!uploadResults) return;
    
    const resumo = uploadResults.resumo || {};
    const dataAtual = new Date().toLocaleString('pt-BR');
    
    // Montar conteúdo do relatório
    let conteudo = `RELATÓRIO DE IMPORTAÇÃO DE NOTAS FISCAIS\n`;
    conteudo += `==========================================\n\n`;
    conteudo += `Empresa: ${uploadInfo.empresa || 'N/A'}\n`;
    conteudo += `Competência: ${uploadInfo.competencia || 'N/A'}\n`;
    conteudo += `Data/Hora: ${dataAtual}\n\n`;
    
    conteudo += `RESUMO\n`;
    conteudo += `------\n`;
    conteudo += `Total de Arquivos: ${resumo.total_arquivos || 0}\n`;
    conteudo += `Importados com Sucesso: ${resumo.importados || uploadResults.success?.length || 0}\n`;
    conteudo += `Duplicados (já existiam): ${resumo.duplicados || uploadResults.duplicadas?.length || 0}\n`;
    conteudo += `Erros: ${resumo.erros || uploadResults.errors?.length || 0}\n`;
    conteudo += `Rejeitados por CNPJ: ${resumo.rejeitados_cnpj || 0}\n`;
    conteudo += `Devoluções de Fornecedor: ${resumo.desconsideradas_devolucao || 0}\n\n`;
    
    // Detalhes de erros
    if (uploadResults.errors && uploadResults.errors.length > 0) {
      conteudo += `ERROS DETALHADOS\n`;
      conteudo += `----------------\n`;
      uploadResults.errors.forEach((err, idx) => {
        const filename = typeof err === 'string' ? err : (err.filename || 'Arquivo');
        const error = typeof err === 'object' ? (err.error || err.motivo || '') : '';
        conteudo += `${idx + 1}. ${filename}: ${error}\n`;
      });
      conteudo += `\n`;
    }
    
    // Detalhes de rejeitados
    if (uploadResults.rejeitadas_cnpj && uploadResults.rejeitadas_cnpj.length > 0) {
      conteudo += `REJEITADOS POR CNPJ\n`;
      conteudo += `-------------------\n`;
      uploadResults.rejeitadas_cnpj.forEach((rej, idx) => {
        conteudo += `${idx + 1}. NF ${rej.numero_nfe || 'N/A'}: ${rej.motivo || ''}\n`;
      });
      conteudo += `\n`;
    }
    
    // Devoluções
    if (uploadResults.notas_desconsideradas_devolucao && uploadResults.notas_desconsideradas_devolucao.length > 0) {
      conteudo += `DEVOLUÇÕES DO FORNECEDOR\n`;
      conteudo += `------------------------\n`;
      uploadResults.notas_desconsideradas_devolucao.forEach((dev, idx) => {
        conteudo += `${idx + 1}. NF ${dev.numero_nfe || 'N/A'} - ${dev.emitente || ''}\n`;
        conteudo += `   Motivo: ${dev.motivo || ''}\n`;
      });
      conteudo += `\n`;
    }
    
    if (formato === 'word') {
      // Criar arquivo .txt que pode ser aberto no Word
      const blob = new Blob([conteudo], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_importacao_${uploadInfo.competencia?.replace('/', '-') || 'upload'}_${Date.now()}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // PDF - abrir em nova janela para imprimir com tema escuro
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
        <head>
          <title>Relatório de Importação</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #0C0C0C; color: #fff; }
            h1 { color: #C8A951; border-bottom: 2px solid #C8A951; padding-bottom: 10px; }
            h2 { color: #A1A1AA; margin-top: 20px; }
            pre { background: #141414; padding: 15px; border-radius: 5px; white-space: pre-wrap; border: 1px solid #2A2A2A; }
            .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
            .resumo-item { background: #141414; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #2A2A2A; }
            .resumo-item.success { border-color: #22c55e; }
            .resumo-item.warning { border-color: #f59e0b; }
            .resumo-item.error { border-color: #ef4444; }
            .numero { font-size: 24px; font-weight: bold; }
            .success .numero { color: #22c55e; }
            .warning .numero { color: #f59e0b; }
            .error .numero { color: #ef4444; }
            @media print { body { background: #fff; color: #000; } pre { background: #f5f5f5; border-color: #ddd; } }
          </style>
        </head>
        <body>
          <h1>Relatório de Importação de Notas Fiscais</h1>
          <p><strong>Empresa:</strong> ${uploadInfo.empresa || 'N/A'}</p>
          <p><strong>Competência:</strong> ${uploadInfo.competencia || 'N/A'}</p>
          <p><strong>Data/Hora:</strong> ${dataAtual}</p>
          
          <div class="resumo">
            <div class="resumo-item success">
              <div class="numero">${resumo.importados || uploadResults.success?.length || 0}</div>
              <div>Importados</div>
            </div>
            <div class="resumo-item warning">
              <div class="numero">${resumo.duplicados || uploadResults.duplicadas?.length || 0}</div>
              <div>Duplicados</div>
            </div>
            <div class="resumo-item error">
              <div class="numero">${resumo.erros || uploadResults.errors?.length || 0}</div>
              <div>Erros</div>
            </div>
          </div>
          
          <pre>${conteudo}</pre>
          
          <script>window.print();</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Não mostrar se não há nada acontecendo
  if (!isUploading && !uploadResults && !uploadError) {
    return null;
  }
  
  // Na página de upload, mostrar apenas se minimizado ou concluído
  const isOnUploadPage = location.pathname === '/upload';
  if (isOnUploadPage && isUploading && !minimized) {
    // Mostrar apenas a dica para minimizar
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleMinimize}
          className="bg-[#141414] text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 hover:bg-[#1E1E1E] transition-colors border border-[#2A2A2A]"
        >
          <ChevronDown className="w-4 h-4" />
          Minimizar progresso
        </button>
      </div>
    );
  }

  // Versão minimizada - Mini xícara de café
  if (minimized && isUploading) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-[#141414] text-white rounded-full shadow-2xl cursor-pointer hover:scale-105 transition-transform border-2 border-[#C8A951]"
        onClick={toggleMinimize}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <MiniCoffee progress={progress.percent} />
          <span className="font-bold text-[#C8A951]">{progress.percent}%</span>
          <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-[#0C0C0C] rounded-xl shadow-2xl border border-[#2A2A2A] overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        uploadError ? 'bg-red-900/50 border-b border-red-500/30' : 
        uploadResults ? 'bg-green-900/50 border-b border-green-500/30' : 
        'bg-[#141414] border-b border-[#2A2A2A]'
      } text-white`}>
        <div className="flex items-center gap-3">
          {isUploading ? (
            <MiniCoffee progress={progress.percent} />
          ) : uploadResults ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : uploadError ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Upload className="w-5 h-5 text-[#C8A951]" />
          )}
          <div>
            <span className="font-semibold text-sm">
              {isUploading ? 'Contador importando...' : 
               uploadResults ? 'Importação Concluída' : 
               'Erro na Importação'}
            </span>
            {isUploading && (
              <p className="text-xs text-[#C8A951]">{progress.percent}% - Café esfriando...</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isUploading && (
            <button 
              onClick={toggleMinimize}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Minimizar"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {!isUploading && (
            <button 
              onClick={clearResults}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info da empresa */}
      {uploadInfo.empresa && (
        <div className="px-4 py-2 bg-[#141414] border-b border-[#2A2A2A] text-xs text-[#A1A1AA]">
          <span className="font-medium text-white">{uploadInfo.empresa}</span>
          <span className="mx-2">•</span>
          <span>{uploadInfo.competencia}</span>
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-4 bg-[#0C0C0C]">
        {/* Upload em andamento - Contador tomando café */}
        {isUploading && (
          <div>
            {/* Animação do contador tomando café */}
            <CoffeeProgress 
              progress={progress.percent} 
              message={`Importando ${currentFile || 'arquivos'}...`}
              showPercentage={false}
            />
            
            {/* Barra de progresso */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#A1A1AA]">Progresso</span>
                <span className="font-bold text-[#C8A951]">{progress.percent}%</span>
              </div>
              <div className="w-full h-3 bg-[#1E1E1E] rounded-full overflow-hidden border border-[#2A2A2A]">
                <div 
                  className="h-full bg-gradient-to-r from-[#C8A951] to-[#D4B962] rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ width: `${progress.percent}%` }}
                >
                  {/* Efeito de brilho animado */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
            
            {/* Status atual com ícone animado */}
            <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
              <FileText className="w-4 h-4 animate-pulse" />
              <span className="truncate flex-1">{currentFile}</span>
              <span className="text-xs text-emerald-400 animate-pulse">●</span>
            </div>
            
            {/* Contador de arquivos com progresso visual */}
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-[#666]">
                <span className="text-white font-medium">{progress.current.toLocaleString('pt-BR')}</span> de <span className="text-white font-medium">{progress.total.toLocaleString('pt-BR')}</span> arquivos
              </span>
              {progress.total > 100 && (
                <span className="text-[#C8A951]">
                  ~{Math.ceil((progress.total - progress.current) / 10)} segundos restantes
                </span>
              )}
            </div>
            
            {/* Indicador de processamento ativo */}
            {progress.total > 50 && (
              <div className="mt-2 p-2 bg-[#141414] rounded-lg border border-[#2A2A2A]">
                <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                  <span>Processando em background. Você pode navegar em outras páginas.</span>
                </div>
              </div>
            )}

            {/* Botão cancelar */}
            <button
              onClick={cancelUpload}
              className="mt-3 w-full py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/30"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Resultado do upload */}
        {uploadResults && !isUploading && (
          <div>
            {/* Linha 1: Importados, Duplicados, Rejeit. CNPJ */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <p className="text-xl font-bold text-green-400">
                  {uploadResults.resumo?.importados || uploadResults.success?.length || 0}
                </p>
                <p className="text-[10px] text-green-300">Importados</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                <p className="text-xl font-bold text-amber-400">
                  {uploadResults.resumo?.duplicados || uploadResults.duplicadas?.length || 0}
                </p>
                <p className="text-[10px] text-amber-300">Duplicados</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                <p className="text-xl font-bold text-orange-400">
                  {uploadResults.resumo?.rejeitados_cnpj || uploadResults.rejeitadas_cnpj?.length || 0}
                </p>
                <p className="text-[10px] text-orange-300">Rejeit. CNPJ</p>
              </div>
            </div>
            
            {/* Linha 2: Erros, Canceladas, Devoluções (se houver algum) */}
            {((uploadResults.resumo?.erros || uploadResults.errors?.length || 0) > 0 ||
              (uploadResults.resumo?.notas_canceladas || uploadResults.notas_canceladas?.length || 0) > 0 || 
              (uploadResults.resumo?.desconsideradas_devolucao || uploadResults.notas_desconsideradas_devolucao?.length || 0) > 0) && (
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  <p className="text-lg font-bold text-red-400">
                    {uploadResults.resumo?.erros || uploadResults.errors?.length || 0}
                  </p>
                  <p className="text-[10px] text-red-300">Erros</p>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-400">
                    {uploadResults.resumo?.notas_canceladas || uploadResults.notas_canceladas?.length || 0}
                  </p>
                  <p className="text-[10px] text-gray-300">Canceladas</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                  <p className="text-lg font-bold text-purple-400">
                    {uploadResults.resumo?.desconsideradas_devolucao || uploadResults.notas_desconsideradas_devolucao?.length || 0}
                  </p>
                  <p className="text-[10px] text-purple-300">Devoluções</p>
                </div>
              </div>
            )}

            {/* Métricas de Performance (se disponível) */}
            {uploadResults.performance?.tempo_total_segundos && (
              <div className="mt-2 p-2 bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#666]">Tempo:</span>
                  <span className="text-emerald-400 font-medium">
                    {uploadResults.performance.tempo_total_segundos < 60 
                      ? `${uploadResults.performance.tempo_total_segundos}s`
                      : `${Math.floor(uploadResults.performance.tempo_total_segundos / 60)}m ${Math.round(uploadResults.performance.tempo_total_segundos % 60)}s`
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-[#666]">Velocidade:</span>
                  <span className="text-[#C8A951] font-medium">
                    {uploadResults.performance.arquivos_por_segundo} XMLs/seg
                  </span>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowDetailModal(true)}
                className="flex-1 py-2 text-sm text-center bg-[#C8A951] text-black rounded-lg hover:bg-[#D4B962] transition-colors font-medium"
              >
                Ver Detalhes
              </button>
              <button
                onClick={() => exportarRelatorio('word')}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Exportar Word"
              >
                📄
              </button>
              <button
                onClick={() => exportarRelatorio('pdf')}
                className="px-3 py-2 text-sm bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors"
                title="Exportar PDF"
              >
                📋
              </button>
            </div>
            {/* Botão para fechar/limpar */}
            <button
              onClick={clearResults}
              className="mt-2 w-full py-2 text-sm text-[#A1A1AA] hover:bg-[#1E1E1E] rounded-lg transition-colors border border-[#2A2A2A]"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Erro */}
        {uploadError && !uploadResults && (
          <div className="text-center">
            <p className="text-red-400 text-sm">{uploadError}</p>
            <button
              onClick={clearResults}
              className="mt-3 px-4 py-2 text-sm bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white rounded-lg transition-colors border border-[#2A2A2A]"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Modal de Detalhes do Upload - TEMA ESCURO */}
    {showDetailModal && uploadResults && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-[#0C0C0C] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[#2A2A2A]">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#C8A951]/20 to-[#C8A951]/5 border-b border-[#2A2A2A] text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-[#C8A951]">Relatório de Importação</h2>
                <p className="text-[#A1A1AA] mt-1">
                  {uploadInfo.empresa} | Competência: {uploadInfo.competencia}
                </p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Resumo - Linha 1 */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-white">{uploadResults.resumo?.total_arquivos || 0}</p>
                <p className="text-[10px] text-[#A1A1AA]">Total</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-green-400">{uploadResults.resumo?.importados || uploadResults.success?.length || 0}</p>
                <p className="text-[10px] text-green-300">Importados</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-amber-400">{uploadResults.resumo?.duplicados || uploadResults.duplicadas?.length || 0}</p>
                <p className="text-[10px] text-amber-300">Duplicados</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-orange-400">{uploadResults.resumo?.rejeitados_cnpj || uploadResults.rejeitadas_cnpj?.length || 0}</p>
                <p className="text-[10px] text-orange-300">Rejeit. CNPJ</p>
              </div>
            </div>
            
            {/* Resumo - Linha 2 */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-red-400">{uploadResults.resumo?.erros || uploadResults.errors?.length || 0}</p>
                <p className="text-[10px] text-red-300">Erros</p>
              </div>
              <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-gray-400">{uploadResults.resumo?.notas_canceladas || uploadResults.notas_canceladas?.length || 0}</p>
                <p className="text-[10px] text-gray-300">Canceladas</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-purple-400">{uploadResults.resumo?.desconsideradas_devolucao || uploadResults.notas_desconsideradas_devolucao?.length || 0}</p>
                <p className="text-[10px] text-purple-300">Devoluções</p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 text-center">
                <p className="text-xl font-bold text-cyan-400">{uploadResults.resumo?.alertas_cfop || 0}</p>
                <p className="text-[10px] text-cyan-300">Alertas CFOP</p>
              </div>
            </div>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6 overflow-y-auto max-h-[50vh] bg-[#0C0C0C]">
            {/* Notas Importadas */}
            {uploadResults.success && uploadResults.success.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Notas Importadas ({uploadResults.success.length})
                </h3>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {uploadResults.success.slice(0, 50).map((nota, idx) => (
                      <div key={idx} className="bg-[#141414] rounded px-2 py-1 border border-green-500/20 text-green-300">
                        NF {nota.nfe || nota.numero_nfe || idx + 1}
                      </div>
                    ))}
                    {uploadResults.success.length > 50 && (
                      <div className="col-span-4 text-center text-green-400 py-2">
                        ... e mais {uploadResults.success.length - 50} notas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Duplicadas */}
            {uploadResults.duplicadas && uploadResults.duplicadas.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Notas Duplicadas ({uploadResults.duplicadas.length})
                </h3>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.duplicadas.slice(0, 20).map((dup, idx) => (
                    <div key={idx} className="text-sm text-amber-300 py-1 border-b border-amber-500/20 last:border-0">
                      {typeof dup === 'string' ? dup : (dup.filename || dup.numero_nfe || `Duplicada ${idx + 1}`)}
                    </div>
                  ))}
                  {uploadResults.duplicadas.length > 20 && (
                    <div className="text-center text-amber-400 py-2">
                      ... e mais {uploadResults.duplicadas.length - 20} duplicadas
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas Canceladas */}
            {uploadResults.notas_canceladas && uploadResults.notas_canceladas.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Notas Canceladas ({uploadResults.notas_canceladas.length})
                </h3>
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-600">
                        <th className="text-left py-2">NF</th>
                        <th className="text-left py-2">Emitente</th>
                        <th className="text-right py-2">Valor</th>
                        <th className="text-left py-2 pl-4">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResults.notas_canceladas.slice(0, 30).map((nota, idx) => (
                        <tr key={idx} className="text-gray-300 border-b border-gray-700 last:border-0">
                          <td className="py-2 font-medium">{nota.numero_nfe}</td>
                          <td className="py-2 truncate max-w-[150px]">{nota.emitente}</td>
                          <td className="py-2 text-right">R$ {(nota.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                          <td className="py-2 pl-4 text-gray-400 truncate max-w-[200px]">{nota.motivo || 'Cancelada'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadResults.notas_canceladas.length > 30 && (
                    <div className="text-center text-gray-400 py-2 border-t border-gray-600 mt-2">
                      ... e mais {uploadResults.notas_canceladas.length - 30} notas canceladas
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Erros */}
            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Erros ({uploadResults.errors.length})
                </h3>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.errors.slice(0, 20).map((err, idx) => (
                    <div key={idx} className="text-sm text-red-300 py-2 border-b border-red-500/20 last:border-0">
                      <span className="font-medium">{typeof err === 'string' ? err : (err.filename || `Arquivo ${idx + 1}`)}</span>
                      {typeof err === 'object' && err.error && (
                        <span className="text-red-400 ml-2">- {err.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejeitados por CNPJ */}
            {uploadResults.rejeitadas_cnpj && uploadResults.rejeitadas_cnpj.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-orange-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Rejeitadas por CNPJ ({uploadResults.rejeitadas_cnpj.length})
                </h3>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.rejeitadas_cnpj.map((rej, idx) => (
                    <div key={idx} className="text-sm text-orange-300 py-2 border-b border-orange-500/20 last:border-0">
                      <span className="font-medium">NF {rej.numero_nfe || idx + 1}</span>
                      <span className="text-orange-400 ml-2">- {rej.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Devoluções do Fornecedor */}
            {uploadResults.notas_desconsideradas_devolucao && uploadResults.notas_desconsideradas_devolucao.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Devoluções do Fornecedor ({uploadResults.notas_desconsideradas_devolucao.length})
                </h3>
                <p className="text-xs text-purple-300/70 mb-3">
                  Notas de devolução emitidas pelo fornecedor foram desconsideradas da apuração
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {uploadResults.notas_desconsideradas_devolucao.slice(0, 20).map((dev, idx) => (
                    <div key={idx} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Coluna Esquerda - NF de Devolução */}
                        <div className="border-r border-purple-500/30 pr-4">
                          <div className="text-[10px] text-purple-400 uppercase tracking-wider mb-1">NF Devolução (Desconsiderada)</div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-600/40 text-purple-200 px-2 py-0.5 rounded font-bold text-sm">
                              NF {dev.numero_nfe || '-'}
                            </span>
                            {dev.cfop && (
                              <span className="text-purple-300 text-xs">CFOP {dev.cfop}</span>
                            )}
                          </div>
                          <div className="text-xs text-purple-200 space-y-1">
                            <div className="truncate" title={dev.emitente}>
                              <span className="text-purple-400">Emitente:</span> {dev.emitente || '-'}
                            </div>
                            <div>
                              <span className="text-purple-400">Data:</span> {dev.data_emissao ? new Date(dev.data_emissao).toLocaleDateString('pt-BR') : '-'}
                            </div>
                            <div className="font-medium text-purple-100">
                              <span className="text-purple-400">Valor:</span> R$ {(dev.valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </div>
                          </div>
                        </div>
                        
                        {/* Coluna Direita - NF Original */}
                        <div className="pl-2">
                          <div className="text-[10px] text-green-400 uppercase tracking-wider mb-1">NF Original Vinculada</div>
                          {dev.nf_referenciada ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-green-600/40 text-green-200 px-2 py-0.5 rounded font-bold text-sm">
                                  NF {dev.nf_referenciada}
                                </span>
                                <span className="text-green-400 text-[10px]">✓ Relacionada</span>
                              </div>
                              <div className="text-xs text-green-200/70">
                                A nota de entrada original permanece na apuração. A devolução acima foi desconsiderada para evitar duplicidade.
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="bg-yellow-600/30 text-yellow-300 px-2 py-0.5 rounded text-sm">
                                Não identificada
                              </span>
                              <span className="text-yellow-400/70 text-xs">Referência não encontrada no XML</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {uploadResults.notas_desconsideradas_devolucao.length > 20 && (
                  <div className="text-center text-purple-300 py-2 border-t border-purple-500/30 mt-3">
                    ... e mais {uploadResults.notas_desconsideradas_devolucao.length - 20} devoluções
                  </div>
                )}
              </div>
            )}

            {/* Conversões de CFOP */}
            {uploadResults.relatorio_conversoes && uploadResults.relatorio_conversoes.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Conversões de CFOP ({uploadResults.total_conversoes || uploadResults.relatorio_conversoes.length})
                </h3>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.relatorio_conversoes.slice(0, 20).map((conv, idx) => (
                    <div key={idx} className="text-sm text-blue-300 py-1">
                      <span className="font-medium">NF {conv.nfe}</span>
                      <span className="text-blue-400 ml-2">
                        {conv.conversoes?.map(c => `${c.cfop_original}→${c.cfop_convertido}`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-[#141414] px-6 py-4 border-t border-[#2A2A2A] flex justify-between items-center">
            <p className="text-sm text-[#666]">
              Gerado em: {new Date().toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => exportarRelatorio('word')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                📄 Exportar Word
              </button>
              <button
                onClick={() => exportarRelatorio('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-[#333] text-white rounded-lg hover:bg-[#444] transition-colors text-sm font-medium"
              >
                📋 Imprimir/PDF
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  clearResults();
                }}
                className="px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#333] transition-colors text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default GlobalUploadProgress;
