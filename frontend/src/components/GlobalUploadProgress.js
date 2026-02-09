import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, FileText, Upload, Coffee } from 'lucide-react';

// Mini xícara de café animada para o progresso
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
      // PDF - abrir em nova janela para imprimir
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
        <head>
          <title>Relatório de Importação</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #e53e3e; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 20px; }
            pre { background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
            .resumo { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0; }
            .resumo-item { background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center; }
            .resumo-item.success { background: #d4edda; }
            .resumo-item.warning { background: #fff3cd; }
            .resumo-item.error { background: #f8d7da; }
            .numero { font-size: 24px; font-weight: bold; }
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
          className="bg-slate-700 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 hover:bg-slate-600 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Minimizar progresso
        </button>
      </div>
    );
  }

  // Versão minimizada
  if (minimized && isUploading) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-2xl cursor-pointer hover:scale-105 transition-transform"
        onClick={toggleMinimize}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">{progress.percent}%</span>
          <ChevronUp className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        uploadError ? 'bg-red-600' : 
        uploadResults ? 'bg-green-600' : 
        'bg-gradient-to-r from-red-600 to-red-700'
      } text-white`}>
        <div className="flex items-center gap-2">
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : uploadResults ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : uploadError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Upload className="w-5 h-5" />
          )}
          <span className="font-semibold text-sm">
            {isUploading ? 'Importando XMLs...' : 
             uploadResults ? 'Importação Concluída' : 
             'Erro na Importação'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isUploading && (
            <button 
              onClick={toggleMinimize}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Minimizar"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {!isUploading && (
            <button 
              onClick={clearResults}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Info da empresa */}
      {uploadInfo.empresa && (
        <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-600">
          <span className="font-medium">{uploadInfo.empresa}</span>
          <span className="mx-2">•</span>
          <span>{uploadInfo.competencia}</span>
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-4">
        {/* Upload em andamento */}
        {isUploading && (
          <div>
            {/* Barra de progresso */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progresso</span>
                <span className="font-bold text-red-600">{progress.percent}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
            
            {/* Status atual */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-4 h-4" />
              <span className="truncate">{currentFile}</span>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              {progress.current} de {progress.total} arquivos processados
            </p>

            {/* Botão cancelar */}
            <button
              onClick={cancelUpload}
              className="mt-3 w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Resultado do upload */}
        {uploadResults && !isUploading && (
          <div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xl font-bold text-green-600">
                  {uploadResults.resumo?.importados || uploadResults.success?.length || 0}
                </p>
                <p className="text-xs text-green-700">Importados</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <p className="text-xl font-bold text-amber-600">
                  {uploadResults.resumo?.duplicados || uploadResults.duplicadas?.length || 0}
                </p>
                <p className="text-xs text-amber-700">Duplicados</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xl font-bold text-red-600">
                  {uploadResults.resumo?.erros || uploadResults.errors?.length || 0}
                </p>
                <p className="text-xs text-red-700">Erros</p>
              </div>
            </div>
            
            {uploadResults.resumo?.desconsideradas_devolucao > 0 && (
              <div className="mt-2 bg-slate-100 rounded-lg p-2 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {uploadResults.resumo.desconsideradas_devolucao} devoluções de fornecedor
                </p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowDetailModal(true)}
                className="flex-1 py-2 text-sm text-center bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
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
                className="px-3 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                title="Exportar PDF"
              >
                📋
              </button>
            </div>
          </div>
        )}

        {/* Erro */}
        {uploadError && !uploadResults && (
          <div className="text-center">
            <p className="text-red-600 text-sm">{uploadError}</p>
            <button
              onClick={clearResults}
              className="mt-3 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Modal de Detalhes do Upload */}
    {showDetailModal && uploadResults && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Relatório de Importação</h2>
                <p className="text-red-200 mt-1">
                  {uploadInfo.empresa} | Competência: {uploadInfo.competencia}
                </p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Resumo */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-3xl font-bold">{uploadResults.resumo?.total_arquivos || 0}</p>
                <p className="text-xs text-red-200">Total Arquivos</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-3xl font-bold text-green-300">{uploadResults.resumo?.importados || uploadResults.success?.length || 0}</p>
                <p className="text-xs text-red-200">Importados</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-3xl font-bold text-amber-300">{uploadResults.resumo?.duplicados || uploadResults.duplicadas?.length || 0}</p>
                <p className="text-xs text-red-200">Duplicados</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-3xl font-bold text-red-300">{uploadResults.resumo?.erros || uploadResults.errors?.length || 0}</p>
                <p className="text-xs text-red-200">Erros</p>
              </div>
            </div>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {/* Notas Importadas */}
            {uploadResults.success && uploadResults.success.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Notas Importadas ({uploadResults.success.length})
                </h3>
                <div className="bg-green-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {uploadResults.success.slice(0, 50).map((nota, idx) => (
                      <div key={idx} className="bg-white rounded px-2 py-1 border border-green-200">
                        NF {nota.nfe || nota.numero_nfe || idx + 1}
                      </div>
                    ))}
                    {uploadResults.success.length > 50 && (
                      <div className="col-span-4 text-center text-green-700 py-2">
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
                <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Notas Duplicadas ({uploadResults.duplicadas.length})
                </h3>
                <div className="bg-amber-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.duplicadas.slice(0, 20).map((dup, idx) => (
                    <div key={idx} className="text-sm text-amber-800 py-1 border-b border-amber-200 last:border-0">
                      {typeof dup === 'string' ? dup : (dup.filename || dup.numero_nfe || `Duplicada ${idx + 1}`)}
                    </div>
                  ))}
                  {uploadResults.duplicadas.length > 20 && (
                    <div className="text-center text-amber-700 py-2">
                      ... e mais {uploadResults.duplicadas.length - 20} duplicadas
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Erros */}
            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Erros ({uploadResults.errors.length})
                </h3>
                <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.errors.slice(0, 20).map((err, idx) => (
                    <div key={idx} className="text-sm text-red-800 py-2 border-b border-red-200 last:border-0">
                      <span className="font-medium">{typeof err === 'string' ? err : (err.filename || `Arquivo ${idx + 1}`)}</span>
                      {typeof err === 'object' && err.error && (
                        <span className="text-red-600 ml-2">- {err.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejeitados por CNPJ */}
            {uploadResults.rejeitadas_cnpj && uploadResults.rejeitadas_cnpj.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Rejeitadas por CNPJ ({uploadResults.rejeitadas_cnpj.length})
                </h3>
                <div className="bg-orange-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.rejeitadas_cnpj.map((rej, idx) => (
                    <div key={idx} className="text-sm text-orange-800 py-2 border-b border-orange-200 last:border-0">
                      <span className="font-medium">NF {rej.numero_nfe || idx + 1}</span>
                      <span className="text-orange-600 ml-2">- {rej.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Devoluções do Fornecedor */}
            {uploadResults.notas_desconsideradas_devolucao && uploadResults.notas_desconsideradas_devolucao.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Devoluções do Fornecedor ({uploadResults.notas_desconsideradas_devolucao.length})
                </h3>
                <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.notas_desconsideradas_devolucao.map((dev, idx) => (
                    <div key={idx} className="text-sm text-slate-800 py-2 border-b border-slate-200 last:border-0">
                      <span className="font-medium">NF {dev.numero_nfe || idx + 1}</span>
                      <span className="text-slate-600 ml-2">- {dev.emitente || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversões de CFOP */}
            {uploadResults.relatorio_conversoes && uploadResults.relatorio_conversoes.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Conversões de CFOP ({uploadResults.total_conversoes || uploadResults.relatorio_conversoes.length})
                </h3>
                <div className="bg-blue-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {uploadResults.relatorio_conversoes.slice(0, 20).map((conv, idx) => (
                    <div key={idx} className="text-sm text-blue-800 py-1">
                      <span className="font-medium">NF {conv.nfe}</span>
                      <span className="text-blue-600 ml-2">
                        {conv.conversoes?.map(c => `${c.cfop_original}→${c.cfop_convertido}`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <p className="text-sm text-gray-500">
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
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                📋 Imprimir/PDF
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  clearResults();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
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
