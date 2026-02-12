import React, { useState, useEffect, useCallback } from 'react';
import { Cloud, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Clock, FileText, X } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const BackgroundJobsIndicator = () => {
  const [jobs, setJobs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Buscar jobs do backend
  const fetchJobs = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get(`${API}/xml/jobs?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data?.jobs) {
        setJobs(response.data.jobs);
      }
    } catch (err) {
      console.error('Erro ao buscar jobs:', err);
    }
  }, []);

  // Buscar status detalhado de um job
  const fetchJobStatus = useCallback(async (jobId) => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const response = await axios.get(`${API}/xml/job-status/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (err) {
      console.error('Erro ao buscar status do job:', err);
      return null;
    }
  }, []);

  // Atualizar jobs em processamento
  const updateProcessingJobs = useCallback(async () => {
    const processingJobs = jobs.filter(j => j.status === 'processing' || j.status === 'queued');
    
    if (processingJobs.length === 0) return;

    const updatedJobs = await Promise.all(
      jobs.map(async (job) => {
        if (job.status === 'processing' || job.status === 'queued') {
          const status = await fetchJobStatus(job.job_id);
          if (status) {
            return { ...job, ...status };
          }
        }
        return job;
      })
    );

    setJobs(updatedJobs);
  }, [jobs, fetchJobStatus]);

  // Polling inicial e para jobs em andamento
  useEffect(() => {
    fetchJobs();
    
    // Polling a cada 5 segundos
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Atualizar jobs em processamento mais frequentemente
  useEffect(() => {
    const processingJobs = jobs.filter(j => j.status === 'processing' || j.status === 'queued');
    
    if (processingJobs.length > 0) {
      const interval = setInterval(updateProcessingJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [jobs, updateProcessingJobs]);

  // Contar jobs por status
  const processingCount = jobs.filter(j => j.status === 'processing' || j.status === 'queued').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;

  // Se não há jobs, não mostrar nada
  if (jobs.length === 0) return null;

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Ícone de status
  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'processing':
      case 'queued':
        return <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-[#666]" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {/* Botão principal */}
      <div 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
          processingCount > 0 
            ? 'bg-purple-500/20 border border-purple-500/50 hover:bg-purple-500/30' 
            : 'bg-[#141414] border border-[#2A2A2A] hover:bg-[#1A1A1A]'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {processingCount > 0 ? (
          <>
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="text-purple-300 font-medium">
              {processingCount} importação{processingCount > 1 ? 'ões' : ''} em background
            </span>
          </>
        ) : (
          <>
            <Cloud className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-[#A1A1AA]">
              Jobs recentes
            </span>
          </>
        )}
        
        {/* Badges */}
        <div className="flex items-center gap-1 ml-2">
          {completedCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
              {completedCount} ✓
            </span>
          )}
          {errorCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              {errorCount} ✗
            </span>
          )}
        </div>
        
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[#666]" />
        ) : (
          <ChevronUp className="w-4 h-4 text-[#666]" />
        )}
      </div>

      {/* Lista de jobs expandida */}
      {expanded && (
        <div className="absolute bottom-full left-0 mb-2 w-96 bg-[#141414] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[#2A2A2A] bg-[#0C0C0C]">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Cloud className="w-4 h-4 text-purple-400" />
              Importações em Background
            </h3>
            <button 
              onClick={() => setExpanded(false)}
              className="p-1 text-[#666] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {jobs.length === 0 ? (
              <div className="p-4 text-center text-[#666]">
                Nenhum job recente
              </div>
            ) : (
              jobs.map((job) => (
                <div 
                  key={job.job_id}
                  className={`p-3 border-b border-[#2A2A2A] last:border-b-0 ${
                    job.status === 'processing' ? 'bg-purple-500/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={job.status} />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {job.total_files?.toLocaleString('pt-BR')} XMLs
                        </p>
                        <p className="text-[#666] text-xs">
                          {job.company_name || job.competencia}
                        </p>
                      </div>
                    </div>
                    <span className="text-[#666] text-xs">
                      {formatDate(job.created_at)}
                    </span>
                  </div>

                  {/* Progresso para jobs em andamento */}
                  {(job.status === 'processing' || job.status === 'queued') && job.progress && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-purple-300">{job.progress.status}</span>
                        <span className="text-purple-400">
                          {job.progress.current?.toLocaleString('pt-BR')}/{job.progress.total?.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${(job.progress.current / job.progress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Resultado para jobs concluídos */}
                  {job.status === 'completed' && (
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="text-emerald-400">
                        ✓ {job.importados?.toLocaleString('pt-BR')} importados
                      </span>
                      {job.duplicados > 0 && (
                        <span className="text-amber-400">
                          ⚠ {job.duplicados} duplicados
                        </span>
                      )}
                      {job.erros > 0 && (
                        <span className="text-red-400">
                          ✗ {job.erros} erros
                        </span>
                      )}
                    </div>
                  )}

                  {/* Erro */}
                  {job.status === 'error' && (
                    <p className="mt-1 text-xs text-red-400 truncate">
                      {job.error || 'Erro no processamento'}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[#2A2A2A] bg-[#0C0C0C]">
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="w-full py-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'Atualizar'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundJobsIndicator;
