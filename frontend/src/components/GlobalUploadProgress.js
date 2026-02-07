import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUpload } from '../context/UploadContext';
import { X, ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

const GlobalUploadProgress = () => {
  const location = useLocation();
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
        {uploadResults && (
          <div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xl font-bold text-green-600">
                  {uploadResults.resumo?.importados || 0}
                </p>
                <p className="text-xs text-green-700">Importados</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <p className="text-xl font-bold text-amber-600">
                  {uploadResults.resumo?.duplicados || 0}
                </p>
                <p className="text-xs text-amber-700">Duplicados</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xl font-bold text-red-600">
                  {uploadResults.resumo?.erros || 0}
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

            <p className="text-xs text-gray-500 mt-3 text-center">
              Clique no X para fechar ou vá para Upload XML para ver detalhes
            </p>
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
  );
};

export default GlobalUploadProgress;
